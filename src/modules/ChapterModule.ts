import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { Chapter, Objective, ConstellationMatchResult, ConstellationAttemptEvent } from '../types';

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

  public dispose(): void {
    this.resetProgress();
    this.chapters = [];
  }
}
