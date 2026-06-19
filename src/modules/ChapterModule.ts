import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { Chapter, Objective } from '../types';

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
    
    this.stateManager.updateShip({ speed: 10 });
    
    eventBus.emit('chapter:started', chapter);
    eventBus.emit('objectives:updated', this.currentObjectives);
  }

  private onStarDiscovered(starId: string): void {
    this.updateObjectives('discover_star', starId);
  }

  private onConstellationDiscovered(constellationId: string): void {
    this.updateObjectives('discover_constellation', constellationId);
  }

  private onPointVisited(pointId: string): void {
    this.updateObjectives('visit', pointId);
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
      this.checkChapterCompletion();
    }
  }

  public checkConstellationConnection(starIds: string[]): void {
    if (!this.currentChapter) return;
    
    this.currentChapter.constellations.forEach(constellation => {
      if (this.stateManager.isConstellationDiscovered(constellation.id)) return;
      
      const allStarsConnected = constellation.stars.every(starId => 
        starIds.includes(starId)
      );
      
      if (allStarsConnected) {
        eventBus.emit('constellation:connect', constellation.id);
        this.updateObjectives('connect_stars', constellation.id);
      }
    });
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

  public getCurrentObjectives(): Objective[] {
    return [...this.currentObjectives];
  }

  public getProgress(): { stars: number; constellations: number; objectives: number } {
    if (!this.currentChapter) {
      return { stars: 0, constellations: 0, objectives: 0 };
    }
    
    const totalStars = this.currentChapter.stars.filter(s => s.isClickable).length;
    const totalConstellations = this.currentChapter.constellations.length;
    const totalObjectives = this.currentObjectives.length;
    
    const discoveredStars = this.currentChapter.stars
      .filter(s => s.isClickable && this.stateManager.isStarDiscovered(s.id)).length;
    const discoveredConstellations = this.currentChapter.constellations
      .filter(c => this.stateManager.isConstellationDiscovered(c.id)).length;
    const completedObjectives = this.currentObjectives.filter(o => o.completed).length;
    
    return {
      stars: totalStars > 0 ? discoveredStars / totalStars : 0,
      constellations: totalConstellations > 0 ? discoveredConstellations / totalConstellations : 0,
      objectives: totalObjectives > 0 ? completedObjectives / totalObjectives : 0
    };
  }

  public resetProgress(): void {
    this.currentChapter = null;
    this.currentObjectives = [];
  }

  public dispose(): void {
    this.resetProgress();
    this.chapters = [];
  }
}
