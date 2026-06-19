import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { achievements, getAchievementById } from '../data/achievements';
import { Achievement, AchievementProgress, AchievementCategory } from '../types';

export class AchievementModule {
  private static instance: AchievementModule;
  private stateManager: GameStateManager;
  private stats: Record<string, number> = {};
  private isInitialized: boolean = false;
  private updateCallbackId: number | null = null;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
  }

  public static getInstance(): AchievementModule {
    if (!AchievementModule.instance) {
      AchievementModule.instance = new AchievementModule();
    }
    return AchievementModule.instance;
  }

  public initialize(): void {
    this.initializeAchievements();
    this.initializeStats();
    
    if (!this.isInitialized) {
      this.setupEventListeners();
      this.isInitialized = true;
    }
    
    this.syncAchievementsWithState();
  }

  private initializeAchievements(): void {
    const state = this.stateManager.getState();
    
    if (!state.achievements || state.achievements.achievements.length === 0) {
      const achievementProgress: AchievementProgress[] = achievements.map(ach => ({
        achievementId: ach.id,
        progress: 0,
        unlocked: false
      }));
      
      this.stateManager.setState({
        achievements: {
          achievements: achievementProgress,
          totalUnlocked: 0,
          totalAchievements: achievements.length
        }
      });
    }
  }

  private initializeStats(): void {
    const state = this.stateManager.getState();
    this.stats = {
      storm_survived: 0,
      meteor_watched: 0,
      max_speed: 0,
      max_gold: state.crew.gold,
      crew_max: state.crew.members.length
    };
  }

  private setupEventListeners(): void {
    eventBus.on('star:discovered', (starId: string) => {
      this.updateStarAchievements(starId);
      this.updateCollectionAchievements();
    });

    eventBus.on('constellation:discovered', (constellationId: string) => {
      this.updateConstellationAchievements(constellationId);
    });

    eventBus.on('point:visited', (pointId: string) => {
      this.updateWaypointAchievements();
    });

    eventBus.on('chapter:completed', (chapterId: string) => {
      this.updateChapterAchievements(chapterId);
    });

    eventBus.on('weather:changed', (weather: any) => {
      if (weather?.type === 'storm') {
        this.stats.storm_survived++;
        this.checkSpecialAchievements('storm_survived', this.stats.storm_survived);
      }
      if (weather?.type === 'meteor') {
        this.stats.meteor_watched++;
        this.checkSpecialAchievements('meteor_watched', this.stats.meteor_watched);
      }
    });

    eventBus.on('ship:updated', (ship: any) => {
      if (ship.speed > this.stats.max_speed) {
        this.stats.max_speed = ship.speed;
        this.checkSpecialAchievements('max_speed', Math.floor(ship.speed));
      }
    });

    eventBus.on('crew:state_updated', (crew: any) => {
      if (crew.gold > this.stats.max_gold) {
        this.stats.max_gold = crew.gold;
        this.checkSpecialAchievements('max_gold', crew.gold);
      }
      if (crew.members.length > this.stats.crew_max) {
        this.stats.crew_max = crew.members.length;
        this.checkSpecialAchievements('crew_max', crew.members.length);
      }
    });

    this.stateManager.onUpdate((delta: number) => {
      const state = this.stateManager.getState();
      this.checkSpecialAchievements('playtime', Math.floor(state.playTime));
    });

    eventBus.on('progress:reset', () => {
      this.resetAchievements();
    });
  }

  private syncAchievementsWithState(): void {
    const state = this.stateManager.getState();
    
    if (state.discoveredStars.length > 0) {
      state.discoveredStars.forEach(starId => {
        this.updateStarAchievements(starId);
      });
      this.updateCollectionAchievements();
    }
    
    if (state.discoveredConstellations.length > 0) {
      state.discoveredConstellations.forEach(constellationId => {
        this.updateConstellationAchievements(constellationId);
      });
    }
    
    if (state.visitedPoints.length > 0) {
      this.updateWaypointAchievements();
    }
    
    if (state.completedChapters.length > 0) {
      state.completedChapters.forEach(chapterId => {
        this.updateChapterAchievements(chapterId);
      });
    }
    
    if (state.playTime > 0) {
      this.checkSpecialAchievements('playtime', Math.floor(state.playTime));
    }
    
    if (state.ship && state.ship.speed > 0) {
      this.stats.max_speed = state.ship.speed;
      this.checkSpecialAchievements('max_speed', Math.floor(state.ship.speed));
    }
    
    if (state.crew && state.crew.gold > 0) {
      this.stats.max_gold = state.crew.gold;
      this.checkSpecialAchievements('max_gold', state.crew.gold);
    }
    
    if (state.crew && state.crew.members.length > 0) {
      this.stats.crew_max = state.crew.members.length;
      this.checkSpecialAchievements('crew_max', state.crew.members.length);
    }
  }

  private resetAchievements(): void {
    this.initializeAchievements();
    this.initializeStats();
  }

  private updateStarAchievements(starId: string): void {
    const state = this.stateManager.getState();
    const starCount = state.discoveredStars.length;

    const starAchievements = achievements.filter(a => 
      a.category === 'star' && !a.targetId
    );

    starAchievements.forEach(achievement => {
      this.updateAchievementProgress(achievement.id, starCount);
    });
  }

  private updateConstellationAchievements(constellationId: string): void {
    const state = this.stateManager.getState();
    const constellationCount = state.discoveredConstellations.length;

    const countAchievements = achievements.filter(a => 
      a.category === 'constellation' && !a.targetId
    );
    countAchievements.forEach(achievement => {
      this.updateAchievementProgress(achievement.id, constellationCount);
    });

    const specificAchievements = achievements.filter(a => 
      a.category === 'constellation' && a.targetId === constellationId
    );
    specificAchievements.forEach(achievement => {
      this.updateAchievementProgress(achievement.id, 1);
    });
  }

  private updateWaypointAchievements(): void {
    const state = this.stateManager.getState();
    const waypointCount = state.visitedPoints.length;

    const waypointAchievements = achievements.filter(a => 
      a.category === 'waypoint'
    );

    waypointAchievements.forEach(achievement => {
      this.updateAchievementProgress(achievement.id, waypointCount);
    });
  }

  private updateChapterAchievements(chapterId: string): void {
    const state = this.stateManager.getState();
    const chapterCount = state.completedChapters.length;

    const countAchievements = achievements.filter(a => 
      a.category === 'chapter' && !a.targetId
    );
    countAchievements.forEach(achievement => {
      this.updateAchievementProgress(achievement.id, chapterCount);
    });

    const specificAchievements = achievements.filter(a => 
      a.category === 'chapter' && a.targetId === chapterId
    );
    specificAchievements.forEach(achievement => {
      this.updateAchievementProgress(achievement.id, 1);
    });
  }

  private updateCollectionAchievements(): void {
    const state = this.stateManager.getState();
    
    const chapter1Stars = state.discoveredStars.filter(id => id.startsWith('star-1-')).length;
    const chapter2Stars = state.discoveredStars.filter(id => id.startsWith('star-2-')).length;
    const chapter3Stars = state.discoveredStars.filter(id => id.startsWith('star-3-')).length;

    this.updateAchievementProgress('ach_collection_starchapter1', chapter1Stars);
    this.updateAchievementProgress('ach_collection_starchapter2', chapter2Stars);
    this.updateAchievementProgress('ach_collection_starchapter3', chapter3Stars);
  }

  private checkSpecialAchievements(targetId: string, value: number): void {
    const specialAchievements = achievements.filter(a => 
      a.category === 'special' && a.targetId === targetId
    );

    specialAchievements.forEach(achievement => {
      this.updateAchievementProgress(achievement.id, value);
    });
  }

  private updateAchievementProgress(achievementId: string, progress: number): void {
    const state = this.stateManager.getState();
    const achievementState = state.achievements;
    
    if (!achievementState) return;

    const progressIndex = achievementState.achievements.findIndex(
      p => p.achievementId === achievementId
    );

    if (progressIndex === -1) return;

    const progressData = achievementState.achievements[progressIndex];
    const achievement = getAchievementById(achievementId);

    if (!achievement) return;

    if (progressData.unlocked) return;

    const newProgress = Math.min(progress, achievement.targetCount);
    
    if (newProgress <= progressData.progress) return;

    progressData.progress = newProgress;

    if (newProgress >= achievement.targetCount && !progressData.unlocked) {
      progressData.unlocked = true;
      progressData.unlockedAt = Date.now();
      achievementState.totalUnlocked++;
      
      this.grantReward(achievement);
      
      eventBus.emit('achievement:unlocked', {
        achievement,
        unlockedAt: progressData.unlockedAt
      });
    }

    achievementState.achievements[progressIndex] = { ...progressData };
    
    this.stateManager.setState({
      achievements: { ...achievementState }
    });
  }

  private grantReward(achievement: Achievement): void {
    if (!achievement.reward) return;

    const state = this.stateManager.getState();
    
    switch (achievement.reward.type) {
      case 'gold':
        this.stateManager.updateCrew({
          gold: state.crew.gold + achievement.reward.value
        });
        break;
      case 'supplies':
        this.stateManager.updateShip({
          supplies: Math.min(
            state.ship.supplies + achievement.reward.value,
            state.ship.maxSupplies
          )
        });
        break;
      case 'exp':
        const updatedMembers = state.crew.members.map(member => {
          let newExp = member.exp + achievement.reward!.value;
          let newLevel = member.level;
          let newMaxExp = member.maxExp;
          
          while (newExp >= newMaxExp) {
            newExp -= newMaxExp;
            newLevel++;
            newMaxExp = Math.floor(newMaxExp * 1.5);
          }
          
          return {
            ...member,
            exp: newExp,
            level: newLevel,
            maxExp: newMaxExp
          };
        });
        this.stateManager.updateCrew({ members: updatedMembers });
        break;
    }
  }

  public getAchievements(): Achievement[] {
    return achievements;
  }

  public getAchievementProgress(achievementId: string): AchievementProgress | undefined {
    const state = this.stateManager.getState();
    return state.achievements?.achievements.find(p => p.achievementId === achievementId);
  }

  public getAchievementsWithProgress(): Array<Achievement & { progress: number; unlocked: boolean; unlockedAt?: number }> {
    const state = this.stateManager.getState();
    const achievementState = state.achievements;
    
    if (!achievementState) return [];

    return achievements.map(ach => {
      const progress = achievementState.achievements.find(p => p.achievementId === ach.id);
      return {
        ...ach,
        progress: progress?.progress || 0,
        unlocked: progress?.unlocked || false,
        unlockedAt: progress?.unlockedAt
      };
    });
  }

  public getAchievementsByCategory(category: AchievementCategory): Array<Achievement & { progress: number; unlocked: boolean; unlockedAt?: number }> {
    return this.getAchievementsWithProgress().filter(a => a.category === category);
  }

  public getOverallProgress(): { unlocked: number; total: number; percentage: number } {
    const state = this.stateManager.getState();
    const achievementState = state.achievements;
    
    if (!achievementState) {
      return { unlocked: 0, total: achievements.length, percentage: 0 };
    }

    return {
      unlocked: achievementState.totalUnlocked,
      total: achievementState.totalAchievements,
      percentage: achievementState.totalAchievements > 0 
        ? Math.round((achievementState.totalUnlocked / achievementState.totalAchievements) * 100) 
        : 0
    };
  }

  public dispose(): void {
  }
}
