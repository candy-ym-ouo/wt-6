import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import {
  Chapter,
  ChapterScore,
  ScoreCategory,
  ScoreGrade,
  ScoreState,
  TaskState,
  RuinsState,
  SeaEventState,
  CodexEntry,
} from '../types';
import { getRuinsForChapter } from '../data/hiddenRuins';
import { getTasksForChapter } from '../data/dynamicTasks';

const DEFAULT_SCORE_STATE: ScoreState = {
  chapterScores: {},
  overallScore: 0,
  totalPlayTime: 0,
  unlockedGrades: [],
};

const GRADE_THRESHOLDS: Record<ScoreGrade, number> = {
  S: 95,
  A: 85,
  B: 70,
  C: 50,
  D: 0,
};

const GRADE_REWARDS: Record<ScoreGrade, { gold: number; exp: number; supplies: number }> = {
  S: { gold: 500, exp: 200, supplies: 100 },
  A: { gold: 300, exp: 150, supplies: 60 },
  B: { gold: 200, exp: 100, supplies: 40 },
  C: { gold: 100, exp: 50, supplies: 20 },
  D: { gold: 50, exp: 20, supplies: 10 },
};

const CATEGORY_WEIGHTS = {
  exploration: 0.30,
  tasks: 0.30,
  weather: 0.20,
  hidden: 0.20,
};

export class VoyageScoringModule {
  private static instance: VoyageScoringModule;
  private stateManager: GameStateManager;
  private isInitialized: boolean = false;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
  }

  public static getInstance(): VoyageScoringModule {
    if (!VoyageScoringModule.instance) {
      VoyageScoringModule.instance = new VoyageScoringModule();
    }
    return VoyageScoringModule.instance;
  }

  public initialize(): void {
    this.ensureScoreState();
    if (!this.isInitialized) {
      this.setupEventListeners();
      this.isInitialized = true;
    }
  }

  private ensureScoreState(): void {
    const state = this.stateManager.getState();
    if (!state.scores) {
      this.stateManager.setState({
        scores: { ...DEFAULT_SCORE_STATE },
      });
    }
  }

  private getScoreState(): ScoreState {
    const state = this.stateManager.getState();
    if (!state.scores) {
      this.ensureScoreState();
      return { ...DEFAULT_SCORE_STATE };
    }
    return {
      ...state.scores,
      chapterScores: { ...state.scores.chapterScores },
      unlockedGrades: [...state.scores.unlockedGrades],
    };
  }

  private updateScoreState(scoreState: ScoreState): void {
    this.stateManager.setState({ scores: scoreState });
  }

  private setupEventListeners(): void {
    eventBus.on('chapter:completed', (chapter: Chapter) => {
      this.calculateAndSaveChapterScore(chapter);
    });

    eventBus.on('progress:reset', () => {
      this.resetState();
    });
  }

  public calculateChapterScore(chapter: Chapter): ChapterScore {
    const state = this.stateManager.getState();
    
    const explorationScore = this.calculateExplorationScore(chapter, state);
    const tasksScore = this.calculateTasksScore(chapter, state);
    const weatherScore = this.calculateWeatherScore(chapter, state);
    const hiddenScore = this.calculateHiddenScore(chapter, state);

    const totalScore = 
      explorationScore.score * CATEGORY_WEIGHTS.exploration +
      tasksScore.score * CATEGORY_WEIGHTS.tasks +
      weatherScore.score * CATEGORY_WEIGHTS.weather +
      hiddenScore.score * CATEGORY_WEIGHTS.hidden;

    const maxTotalScore = 100;
    const percentage = Math.round((totalScore / maxTotalScore) * 100);
    const grade = this.calculateGrade(percentage);

    const rewards = this.calculateRewards(grade, chapter.number);

    return {
      chapterId: chapter.id,
      chapterName: chapter.name,
      chapterNumber: chapter.number,
      totalScore: Math.round(totalScore),
      maxTotalScore,
      grade,
      percentage,
      categories: {
        exploration: explorationScore,
        tasks: tasksScore,
        weather: weatherScore,
        hidden: hiddenScore,
      },
      playTime: state.playTime || 0,
      completedAt: Date.now(),
      rewards,
      achievements: this.getRelevantAchievements(chapter, grade),
    };
  }

  private calculateExplorationScore(chapter: Chapter, state: any): ScoreCategory {
    const details: Record<string, number> = {};
    
    const totalStars = chapter.stars.filter(s => s.isClickable).length;
    const discoveredStars = chapter.stars.filter(s => 
      s.isClickable && state.discoveredStars.includes(s.id)
    ).length;
    const starPercentage = totalStars > 0 ? discoveredStars / totalStars : 0;
    details['discoveredStars'] = discoveredStars;
    details['totalStars'] = totalStars;

    const totalConstellations = chapter.constellations.length;
    const discoveredConstellations = chapter.constellations.filter(c =>
      state.discoveredConstellations.includes(c.id)
    ).length;
    const constellationPercentage = totalConstellations > 0 ? discoveredConstellations / totalConstellations : 0;
    details['discoveredConstellations'] = discoveredConstellations;
    details['totalConstellations'] = totalConstellations;

    const totalPoints = chapter.routePoints.length;
    const visitedPoints = chapter.routePoints.filter(p =>
      state.visitedPoints.includes(p.id)
    ).length;
    const pointPercentage = totalPoints > 0 ? visitedPoints / totalPoints : 0;
    details['visitedPoints'] = visitedPoints;
    details['totalPoints'] = totalPoints;

    const score = (starPercentage * 40 + constellationPercentage * 35 + pointPercentage * 25);
    
    return {
      name: '探索率',
      score: Math.round(score),
      maxScore: 100,
      percentage: Math.round(score),
      details,
    };
  }

  private calculateTasksScore(chapter: Chapter, state: any): ScoreCategory {
    const details: Record<string, number> = {};
    
    const totalObjectives = chapter.objectives.length;
    const completedObjectives = chapter.objectives.filter(obj =>
      state.completedObjectives.includes(obj.id)
    ).length;
    const objectivePercentage = totalObjectives > 0 ? completedObjectives / totalObjectives : 0;
    details['completedObjectives'] = completedObjectives;
    details['totalObjectives'] = totalObjectives;

    const chapterTasks = getTasksForChapter(chapter.id);
    const taskState: TaskState | undefined = state.tasks;
    const completedDynamicTasks = taskState?.completedTaskIds?.filter(taskId =>
      chapterTasks.some(t => t.id === taskId)
    ).length || 0;
    const totalDynamicTasks = chapterTasks.length;
    const dynamicTaskPercentage = totalDynamicTasks > 0 ? completedDynamicTasks / totalDynamicTasks : 0;
    details['completedDynamicTasks'] = completedDynamicTasks;
    details['totalDynamicTasks'] = totalDynamicTasks;

    const score = (objectivePercentage * 60 + dynamicTaskPercentage * 40);

    return {
      name: '任务完成',
      score: Math.round(score),
      maxScore: 100,
      percentage: Math.round(score),
      details,
    };
  }

  private calculateWeatherScore(chapter: Chapter, state: any): ScoreCategory {
    const details: Record<string, number> = {};
    
    const taskState: TaskState | undefined = state.tasks;
    const weatherStats = taskState?.weatherSurvivalStats || {};
    
    const totalWeatherEvents = chapter.weatherEvents.filter(w => 
      w.type === 'storm' || w.type === 'fog'
    ).length;
    
    let survivedAdverseWeather = 0;
    Object.entries(weatherStats).forEach(([weatherId, count]) => {
      if ((weatherId.includes('storm') || weatherId.includes('fog')) && count > 0) {
        survivedAdverseWeather += count;
      }
    });
    details['survivedAdverseWeather'] = survivedAdverseWeather;
    details['totalAdverseWeather'] = totalWeatherEvents;

    const seaEventState: SeaEventState | undefined = state.seaEvents;
    const totalSeaEvents = seaEventState?.eventHistory?.length || 0;
    const successfulSeaEvents = seaEventState?.eventHistory?.filter(e => 
      e.result === 'success'
    ).length || 0;
    details['successfulSeaEvents'] = successfulSeaEvents;
    details['totalSeaEvents'] = totalSeaEvents;

    const shipHealth = state.ship?.health || 100;
    const shipMaxHealth = state.ship?.maxHealth || 100;
    const healthPercentage = shipMaxHealth > 0 ? shipHealth / shipMaxHealth : 1;
    details['shipHealth'] = Math.round(shipHealth);
    details['shipMaxHealth'] = shipMaxHealth;

    let weatherScore = 0;
    if (totalWeatherEvents > 0) {
      weatherScore += Math.min(survivedAdverseWeather / totalWeatherEvents, 1) * 50;
    } else {
      weatherScore += 50;
    }
    if (totalSeaEvents > 0) {
      weatherScore += (successfulSeaEvents / totalSeaEvents) * 25;
    } else {
      weatherScore += 25;
    }
    weatherScore += healthPercentage * 25;

    return {
      name: '天气应对',
      score: Math.round(weatherScore),
      maxScore: 100,
      percentage: Math.round(weatherScore),
      details,
    };
  }

  private calculateHiddenScore(chapter: Chapter, state: any): ScoreCategory {
    const details: Record<string, number> = {};
    
    const ruinsState: RuinsState | undefined = state.ruins;
    const chapterRuins = getRuinsForChapter(chapter.id);
    
    const totalRuins = chapterRuins.length;
    const completedRuins = chapterRuins.filter(r =>
      ruinsState?.completedRuinsIds?.includes(r.id)
    ).length;
    const ruinsPercentage = totalRuins > 0 ? completedRuins / totalRuins : 0;
    details['completedRuins'] = completedRuins;
    details['totalRuins'] = totalRuins;

    const gatheringState = state.gathering;
    const totalGatherCount = gatheringState?.totalGatherCount || 0;
    const discoveredClues = gatheringState?.discoveredClues?.length || 0;
    details['totalGatherCount'] = totalGatherCount;
    details['discoveredClues'] = discoveredClues;

    const hiddenStars = chapter.stars.filter(s => 
      s.isClickable && !s.constellationId
    ).length;
    const discoveredHiddenStars = chapter.stars.filter(s => 
      s.isClickable && !s.constellationId && state.discoveredStars.includes(s.id)
    ).length;
    const hiddenStarPercentage = hiddenStars > 0 ? discoveredHiddenStars / hiddenStars : 1;
    details['discoveredHiddenStars'] = discoveredHiddenStars;
    details['totalHiddenStars'] = hiddenStars;

    const codexState = state.codex;
    const chapterCodexEntries = codexState?.entries ? 
      (Object.values(codexState.entries) as CodexEntry[]).filter(e => e.chapterId === chapter.id) : [];
    const discoveredCodexEntries = chapterCodexEntries.filter(e => e.discovered).length;
    const totalCodexEntries = chapterCodexEntries.length;
    const codexPercentage = totalCodexEntries > 0 ? discoveredCodexEntries / totalCodexEntries : 1;
    details['discoveredCodexEntries'] = discoveredCodexEntries;
    details['totalCodexEntries'] = totalCodexEntries;

    let hiddenScore = 0;
    hiddenScore += ruinsPercentage * 40;
    hiddenScore += Math.min(totalGatherCount / 10, 1) * 20;
    hiddenScore += hiddenStarPercentage * 20;
    hiddenScore += codexPercentage * 20;

    return {
      name: '隐藏内容',
      score: Math.round(hiddenScore),
      maxScore: 100,
      percentage: Math.round(hiddenScore),
      details,
    };
  }

  private calculateGrade(percentage: number): ScoreGrade {
    if (percentage >= GRADE_THRESHOLDS.S) return 'S';
    if (percentage >= GRADE_THRESHOLDS.A) return 'A';
    if (percentage >= GRADE_THRESHOLDS.B) return 'B';
    if (percentage >= GRADE_THRESHOLDS.C) return 'C';
    return 'D';
  }

  private calculateRewards(grade: ScoreGrade, chapterNumber: number): { gold: number; exp: number; supplies: number } {
    const baseRewards = GRADE_REWARDS[grade];
    const chapterMultiplier = 1 + (chapterNumber - 1) * 0.3;
    
    return {
      gold: Math.round(baseRewards.gold * chapterMultiplier),
      exp: Math.round(baseRewards.exp * chapterMultiplier),
      supplies: Math.round(baseRewards.supplies * chapterMultiplier),
    };
  }

  private getRelevantAchievements(chapter: Chapter, grade: ScoreGrade): string[] {
    const achievements: string[] = [];
    
    if (grade === 'S') {
      achievements.push(`完美通关·${chapter.name}`);
    }
    if (grade === 'S' || grade === 'A') {
      achievements.push('优秀航海士');
    }
    
    return achievements;
  }

  public calculateAndSaveChapterScore(chapter: Chapter): ChapterScore {
    const score = this.calculateChapterScore(chapter);
    const scoreState = this.getScoreState();

    const existingScore = scoreState.chapterScores[chapter.id];
    if (!existingScore || score.percentage > existingScore.percentage) {
      scoreState.chapterScores[chapter.id] = score;
      
      if (!scoreState.unlockedGrades.includes(score.grade)) {
        scoreState.unlockedGrades.push(score.grade);
      }

      scoreState.overallScore = Object.values(scoreState.chapterScores).reduce(
        (sum, s) => sum + s.totalScore, 0
      );
      scoreState.totalPlayTime = Object.values(scoreState.chapterScores).reduce(
        (sum, s) => sum + s.playTime, 0
      );

      this.updateScoreState(scoreState);
      this.grantRewards(score);
      
      eventBus.emit('score:chapterCompleted', { chapter, score });
    }

    return score;
  }

  private grantRewards(score: ChapterScore): void {
    const state = this.stateManager.getState();
    
    this.stateManager.updateCrew({
      gold: (state.crew?.gold || 0) + score.rewards.gold,
    });

    if (state.crew?.members) {
      const updatedMembers = state.crew.members.map(member => {
        let newExp = member.exp + score.rewards.exp;
        let newLevel = member.level;
        let newMaxExp = member.maxExp;
        while (newExp >= newMaxExp) {
          newExp -= newMaxExp;
          newLevel++;
          newMaxExp = Math.floor(newMaxExp * 1.5);
        }
        return { ...member, exp: newExp, level: newLevel, maxExp: newMaxExp };
      });
      this.stateManager.updateCrew({ members: updatedMembers });
    }

    this.stateManager.updateShip({
      supplies: Math.min(
        (state.ship?.supplies || 0) + score.rewards.supplies,
        state.ship?.maxSupplies || 100
      ),
    });

    eventBus.emit('toast:show', {
      message: `🎉 获得奖励：💰${score.rewards.gold} ⭐${score.rewards.exp}EXP 📦${score.rewards.supplies}`,
      duration: 5000,
    });
  }

  public getChapterScore(chapterId: string): ChapterScore | null {
    const scoreState = this.getScoreState();
    return scoreState.chapterScores[chapterId] || null;
  }

  public getAllScores(): ScoreState {
    return this.getScoreState();
  }

  public getGradeColor(grade: ScoreGrade): string {
    const colors: Record<ScoreGrade, string> = {
      S: '#ffd700',
      A: '#ff6b6b',
      B: '#4ecdc4',
      C: '#45b7d1',
      D: '#96ceb4',
    };
    return colors[grade];
  }

  public getGradeDescription(grade: ScoreGrade): string {
    const descriptions: Record<ScoreGrade, string> = {
      S: '传奇航海士 - 完美的航行表现！',
      A: '资深航海士 - 出色的航行成绩！',
      B: '熟练航海士 - 良好的航行表现',
      C: '新晋航海士 - 合格的航行成绩',
      D: '见习航海士 - 继续努力吧',
    };
    return descriptions[grade];
  }

  public getSerializableState(): ScoreState {
    return this.getScoreState();
  }

  public loadState(savedState: ScoreState): void {
    this.stateManager.setState({
      scores: {
        ...savedState,
        chapterScores: { ...savedState.chapterScores },
        unlockedGrades: [...savedState.unlockedGrades],
      },
    });
  }

  private resetState(): void {
    this.stateManager.setState({
      scores: { ...DEFAULT_SCORE_STATE },
    });
  }

  public dispose(): void {
  }
}
