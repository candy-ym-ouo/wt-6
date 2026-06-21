import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { Chapter, Objective, ConstellationMatchResult, ConstellationAttemptEvent, FailureReason, RetryOptions, DEFAULT_RETRY_OPTIONS, ChapterRetryState, ChapterFailureState } from '../types';

export class ChapterModule {
  private stateManager: GameStateManager;
  private chapters: Chapter[] = [];
  private currentChapter: Chapter | null = null;
  private currentObjectives: Objective[] = [];

  constructor() {
    this.stateManager = GameStateManager.getInstance();
    
    eventBus.on('star:discovered', this.onStarDiscovered.bind(this));
    eventBus.on('constellation:discovered', this.onConstellationDiscovered.bind(this));
    eventBus.on('point:visited', this.onPointVisited.bind(this));
    eventBus.on('weather:changed', this.onWeatherChanged.bind(this));
    eventBus.on('route:completed', this.onRouteCompleted.bind(this));
    
    eventBus.on('ship:destroyed', () => this.triggerFailure('ship_destroyed', '船只在航行中损毁'));
    eventBus.on('supplies:depleted', () => this.triggerFailure('supplies_depleted', '补给已完全耗尽'));
    eventBus.on('weather:catastrophe', () => this.triggerFailure('weather_catastrophe', '遭遇灾难性天气'));
    eventBus.on('crew:abandoned', () => this.triggerFailure('crew_abandoned', '船员弃船而去'));
    eventBus.on('navigation:lost', () => this.triggerFailure('navigation_lost', '在茫茫大海中迷失航向'));
    
    eventBus.on('retry:start', (options: { chapterId: string; retryOptions?: Partial<RetryOptions> }) => {
      this.startRetry(options.chapterId, options.retryOptions || {});
    });
    eventBus.on('retry:abandon', () => this.abandonRetry());
    eventBus.on('retry:loadCheckpoint', (checkpointId: string) => this.loadCheckpointForRetry(checkpointId));
    
    eventBus.on('chapter:completed', (chapter: Chapter) => {
      const retryState = this.stateManager.getRetryState();
      if (retryState.isRetrying && retryState.retryChapterId === chapter.id) {
        this.stateManager.completeRetry(chapter.id, true);
      }
    });
  }

  public loadChapters(chapters: Chapter[]): void {
    this.chapters = chapters.map(chapter => ({
      ...chapter,
      unlocked: chapter.number === 1 || this.stateManager.isChapterCompleted(chapters[chapter.number - 2]?.id)
    }));
  }

  public getChapters(): Chapter[] {
    return this.chapters.map(chapter => ({
      ...chapter,
      completed: this.stateManager.isChapterCompleted(chapter.id)
    }));
  }

  public startChapter(chapterId: string): void {
    const chapter = this.chapters.find(c => c.id === chapterId);
    if (!chapter || !chapter.unlocked) {
      eventBus.emit('toast:show', { message: '章节未解锁' });
      return;
    }

    this.currentChapter = chapter;
    this.currentObjectives = chapter.objectives.map(obj => ({ ...obj }));
    
    this.stateManager.setState({
      currentChapterId: chapterId,
      currentPosition: { ...chapter.startingPosition }
    });

    this.stateManager.setChapterStartTime(this.stateManager.getState().playTime);
    
    this.stateManager.updateShip({ speed: 10 });

    if (chapter.routes && chapter.routes.length > 0) {
      this.stateManager.initChapterBranchState(chapterId, chapter.routes);
      this.checkBranchUnlocks();
    }
    
    eventBus.emit('chapter:started', chapter);
    eventBus.emit('objectives:updated', this.currentObjectives);
  }

  private onStarDiscovered(starId: string): void {
    this.updateObjectives('discover_star', starId);
    this.checkBranchUnlocks();
  }

  private onConstellationDiscovered(constellationId: string): void {
    this.updateObjectives('discover_constellation', constellationId);
    this.checkBranchUnlocks();
  }

  private onPointVisited(pointId: string): void {
    this.updateObjectives('visit', pointId);
    this.checkBranchUnlocks();
  }

  private onWeatherChanged(weather: any): void {
    if (weather === null) {
      this.updateObjectives('survive_weather', 'any');
    }
  }

  private onRouteCompleted(routeId: string): void {
    if (this.currentChapter) {
      const endPointId = this.currentChapter.routePoints.find(p => p.type === 'end')?.id;
      if (endPointId) {
        this.updateObjectives('reach_destination', endPointId);
      }
    }
  }

  private updateObjectives(type: Objective['type'], targetId: string): void {
    let updated = false;
    
    this.currentObjectives.forEach(obj => {
      if (obj.type === type && !obj.completed) {
        if (obj.targetId === targetId || obj.targetId === 'any') {
          obj.progress++;
          if (obj.progress >= obj.total) {
            obj.completed = true;
            this.stateManager.addCompletedObjective(obj.id);
            eventBus.emit('toast:show', { message: `任务完成：${obj.description}` });
          }
          updated = true;
        }
      }
    });

    if (updated) {
      eventBus.emit('objectives:updated', [...this.currentObjectives]);
      this.checkBranchUnlocks();
      this.checkChapterCompletion();
    }
  }

  public checkBranchUnlocks(): void {
    if (!this.currentChapter || !this.currentChapter.routes) return;

    const newlyUnlocked = this.stateManager.checkAndUnlockBranchRoutes(
      this.currentChapter.id,
      this.currentChapter.routes
    );

    newlyUnlocked.forEach(routeId => {
      const route = this.currentChapter!.routes!.find(r => r.id === routeId);
      if (route) {
        eventBus.emit('toast:show', { 
          message: `🔓 解锁了新航线：${route.name}${route.branchDescription ? ' - ' + route.branchDescription : ''}` 
        });
      }
    });
  }

  public checkConstellationConnection(starIds: string[]): void {
    if (!this.currentChapter) return;

    const matchResults: ConstellationMatchResult[] = [];
    let completedConstellationId: string | null = null;

    this.currentChapter.constellations.forEach(constellation => {
      const isDiscovered = this.stateManager.isConstellationDiscovered(constellation.id);
      
      const matchedStarIds: string[] = [];
      const wrongStarIds: string[] = [];
      const missingStarIds: string[] = [];

      constellation.stars.forEach(starId => {
        if (starIds.includes(starId)) {
          matchedStarIds.push(starId);
        } else {
          missingStarIds.push(starId);
        }
      });

      starIds.forEach(starId => {
        if (!constellation.stars.includes(starId)) {
          wrongStarIds.push(starId);
        }
      });

      const matchPercentage = constellation.stars.length > 0
        ? matchedStarIds.length / constellation.stars.length
        : 0;

      const hasExactStars = matchedStarIds.length === starIds.length;
      const isComplete = !isDiscovered && matchedStarIds.length === constellation.stars.length && hasExactStars;
      const isWrong = wrongStarIds.length > 0 || (matchedStarIds.length > 0 && !isComplete && matchPercentage < 0.5);

      const result: ConstellationMatchResult = {
        constellationId: constellation.id,
        constellationName: constellation.name,
        matchedStarIds,
        missingStarIds,
        wrongStarIds,
        matchPercentage,
        isComplete,
        isWrong,
      };

      matchResults.push(result);

      if (isComplete) {
        completedConstellationId = constellation.id;
        eventBus.emit('constellation:connect', constellation.id);
        this.updateObjectives('connect_stars', constellation.id);
        eventBus.emit('constellation:discovered', constellation.id);
      }
    });

    const undiscoveredResults = matchResults.filter(r => 
      !this.stateManager.isConstellationDiscovered(r.constellationId)
    );

    let bestMatch: ConstellationMatchResult | null = null;
    if (undiscoveredResults.length > 0) {
      bestMatch = undiscoveredResults.reduce((best, current) => {
        if (!best) return current;
        const currentScore = current.matchPercentage - (current.wrongStarIds.length * 0.1);
        const bestScore = best.matchPercentage - (best.wrongStarIds.length * 0.1);
        return currentScore > bestScore ? current : best;
      }, null as ConstellationMatchResult | null);
    }

    const attemptEvent: ConstellationAttemptEvent = {
      starIds,
      matchResults,
      bestMatch,
      timestamp: Date.now(),
    };

    eventBus.emit('constellation:attempt', attemptEvent);

    if (completedConstellationId) {
      eventBus.emit('constellation:success', {
        constellationId: completedConstellationId,
        constellationName: this.currentChapter.constellations.find(c => c.id === completedConstellationId)?.name,
      });
    } else if (bestMatch && bestMatch.matchPercentage >= 0.5 && bestMatch.matchPercentage < 1) {
      const bestMatchId = bestMatch.constellationId;
      const targetConstellation = this.currentChapter.constellations.find(c => c.id === bestMatchId);
      eventBus.emit('constellation:partial', {
        constellationId: bestMatchId,
        constellationName: bestMatch.constellationName,
        matchedCount: bestMatch.matchedStarIds.length,
        totalCount: targetConstellation?.stars.length || 0,
        missingStarIds: bestMatch.missingStarIds,
      });
    } else {
      eventBus.emit('constellation:error', {
        starIds,
        bestMatch: bestMatch || undefined,
      });
    }
  }

  private checkChapterCompletion(): void {
    if (!this.currentChapter) return;
    
    const allCompleted = this.currentObjectives.every(obj => obj.completed);
    
    if (allCompleted && !this.stateManager.isChapterCompleted(this.currentChapter.id)) {
      this.stateManager.addCompletedChapter(this.currentChapter.id);
      
      const nextChapterIndex = this.chapters.findIndex(c => c.id === this.currentChapter!.id) + 1;
      if (nextChapterIndex < this.chapters.length) {
        this.chapters[nextChapterIndex].unlocked = true;
      }
      
      eventBus.emit('chapter:completed', this.currentChapter);
    }
  }

  public getCurrentChapter(): Chapter | null {
    return this.currentChapter;
  }

  public getChapter(chapterId: string): Chapter | undefined {
    return this.chapters.find(c => c.id === chapterId);
  }

  public unlockChapter(chapterId: string): void {
    const chapter = this.chapters.find(c => c.id === chapterId);
    if (chapter && !chapter.unlocked) {
      chapter.unlocked = true;
      eventBus.emit('chapter:unlocked', chapter);
      eventBus.emit('toast:show', { message: `🔓 解锁了新章节：${chapter.name}` });
    }
  }

  public getCurrentObjectives(): Objective[] {
    return [...this.currentObjectives];
  }

  public getProgress(): { stars: number; constellations: number; objectives: number; hiddenStars: number; totalHiddenStars: number } {
    if (!this.currentChapter) {
      return { stars: 0, constellations: 0, objectives: 0, hiddenStars: 0, totalHiddenStars: 0 };
    }
    
    const clickableStars = this.currentChapter.stars.filter(s => s.isClickable);
    const normalStars = clickableStars.filter(s => !s.hidden);
    const hiddenStars = clickableStars.filter(s => s.hidden);
    
    const totalStars = normalStars.length;
    const totalConstellations = this.currentChapter.constellations.length;
    const totalObjectives = this.currentObjectives.length;
    
    const discoveredStars = normalStars
      .filter(s => this.stateManager.isStarDiscovered(s.id)).length;
    const discoveredHiddenStars = hiddenStars
      .filter(s => this.stateManager.isStarDiscovered(s.id)).length;
    const discoveredConstellations = this.currentChapter.constellations
      .filter(c => this.stateManager.isConstellationDiscovered(c.id)).length;
    const completedObjectives = this.currentObjectives.filter(o => o.completed).length;
    
    return {
      stars: totalStars > 0 ? discoveredStars / totalStars : 0,
      constellations: totalConstellations > 0 ? discoveredConstellations / totalConstellations : 0,
      objectives: totalObjectives > 0 ? completedObjectives / totalObjectives : 0,
      hiddenStars: discoveredHiddenStars,
      totalHiddenStars: hiddenStars.length
    };
  }

  public restoreChapterProgress(chapterId: string, completedObjectiveIds: string[]): void {
    const chapter = this.chapters.find(c => c.id === chapterId);
    if (!chapter) return;

    this.currentChapter = chapter;
    this.currentObjectives = chapter.objectives.map(obj => {
      const isCompleted = completedObjectiveIds.includes(obj.id);
      return {
        ...obj,
        completed: isCompleted,
        progress: isCompleted ? obj.total : obj.progress,
      };
    });

    if (chapter.routes && chapter.routes.length > 0) {
      this.stateManager.initChapterBranchState(chapterId, chapter.routes);
      this.checkBranchUnlocks();
    }

    eventBus.emit('chapter:started', chapter);
    eventBus.emit('objectives:updated', this.currentObjectives);
  }

  public resetProgress(): void {
    this.stateManager.resetChapter();
    this.currentChapter = null;
    this.currentObjectives = [];
  }

  public triggerFailure(reason: FailureReason, description: string): void {
    if (!this.currentChapter) return;

    const failureState = this.stateManager.getFailureState();
    if (failureState.isFailed) return;

    this.stateManager.reportChapterFailure(this.currentChapter, reason, description);
  }

  public startRetry(chapterId: string, options: Partial<RetryOptions>): boolean {
    const chapter = this.chapters.find(c => c.id === chapterId);
    if (!chapter) return false;

    const failureState = this.stateManager.getFailureState();
    if (!failureState.isFailed || !failureState.preservedProgress) {
      eventBus.emit('toast:show', { message: '无可重试的失败记录' });
      return false;
    }

    if (!failureState.canRetry) {
      eventBus.emit('toast:show', { message: '已达到最大重试次数' });
      return false;
    }

    try {
      const retryOptions = this.stateManager.prepareForRetry(chapterId, options);
      const preservedProgress = failureState.preservedProgress;

      this.currentChapter = chapter;
      this.currentObjectives = chapter.objectives.map(obj => {
        const isCompleted = retryOptions.preserveCompletedObjectives &&
          preservedProgress.completedObjectives.includes(obj.id);
        return {
          ...obj,
          completed: isCompleted,
          progress: isCompleted ? obj.total : 0,
        };
      });

      this.stateManager.applyPreservedProgress(preservedProgress, retryOptions);
      this.stateManager.resetChapterForRetry(chapter, retryOptions);

      if (chapter.routes && chapter.routes.length > 0) {
        this.stateManager.initChapterBranchState(chapterId, chapter.routes);
        this.checkBranchUnlocks();
      }

      const retryState = this.stateManager.getRetryState();
      eventBus.emit('retry:started', {
        chapterId,
        retryOptions,
        preservedProgress,
        originalFailure: failureState.failureContext,
        retryCount: retryState.isRetrying ? failureState.currentRetryCount : 0,
      });

      eventBus.emit('chapter:started', chapter);
      eventBus.emit('objectives:updated', this.currentObjectives);
      eventBus.emit('toast:show', { 
        message: `🎯 第 ${failureState.currentRetryCount} 次重试开始！已保留探索进度`,
        duration: 4000 
      });

      return true;
    } catch (error) {
      console.error('Failed to start retry:', error);
      eventBus.emit('toast:show', { message: '重试启动失败' });
      return false;
    }
  }

  public abandonRetry(): void {
    const failureState = this.stateManager.getFailureState();
    if (!failureState.isFailed) return;

    const chapterId = failureState.failureContext?.chapterId;
    
    this.stateManager.clearFailureState();
    this.resetProgress();

    eventBus.emit('retry:abandoned', { chapterId });
    eventBus.emit('toast:show', { message: '已放弃重试，返回主菜单' });
    eventBus.emit('screen:changed', 'menu');
  }

  public loadCheckpointForRetry(checkpointId: string): boolean {
    const failureState = this.stateManager.getFailureState();
    if (!failureState.isFailed) return false;

    const checkpoint = this.stateManager.getLastFailureCheckpoint();
    if (!checkpoint) {
      eventBus.emit('toast:show', { message: '没有可用的检查点' });
      return false;
    }

    eventBus.emit('checkpoint:load', checkpointId);
    eventBus.emit('toast:show', { message: '正在加载检查点...' });
    return true;
  }

  public checkFailureConditions(): void {
    if (!this.currentChapter) return;

    const state = this.stateManager.getState();
    
    if (state.ship.health <= 0) {
      this.triggerFailure('ship_destroyed', '船只完全损毁');
      return;
    }

    if (state.ship.supplies <= 0) {
      this.triggerFailure('supplies_depleted', '补给完全耗尽，船员无法继续航行');
      return;
    }

    if (state.activeWeather && state.activeWeather.intensity >= 0.9) {
      const weatherDuration = state.activeWeather.duration;
      if (weatherDuration > 120) {
        this.triggerFailure('weather_catastrophe', '极端天气持续时间过长，船只无法承受');
        return;
      }
    }
  }

  public getFailureState(): ChapterFailureState {
    return this.stateManager.getFailureState();
  }

  public getRetryState(): ChapterRetryState {
    return this.stateManager.getRetryState();
  }

  public getPreservedProgressSummary(): {
    starsCount: number;
    constellationsCount: number;
    pointsCount: number;
    objectivesCount: number;
    hiddenStarsCount: number;
    crewCount: number;
    gold: number;
  } | null {
    const failureState = this.stateManager.getFailureState();
    if (!failureState.preservedProgress) return null;

    const progress = failureState.preservedProgress;
    return {
      starsCount: progress.discoveredStars.length,
      constellationsCount: progress.discoveredConstellations.length,
      pointsCount: progress.visitedPoints.length,
      objectivesCount: progress.completedObjectives.length,
      hiddenStarsCount: progress.discoveredHiddenStars.length,
      crewCount: progress.crewMembers.length,
      gold: progress.gold,
    };
  }

  public update(deltaTime: number): void {
    this.checkFailureConditions();
  }

  public dispose(): void {
    this.resetProgress();
    this.chapters = [];
  }
}
