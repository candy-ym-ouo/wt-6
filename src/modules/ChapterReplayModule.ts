import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import {
  Chapter,
  ReplayState,
  ChapterReplayProgress,
  ChallengeType,
  InheritType,
  ReplayStartOptions,
  ReplayResult,
  ReplayReward,
  ScoreGrade,
  ChapterScore,
  RewardItem,
  RewardGrantedEvent,
  ShipState,
  CrewState,
  ChallengeCondition,
} from '../types';
import { getReplayConfig, getChallengeByType, chapterReplayConfigs } from '../data/chapterReplay';
import { SaveModule } from './SaveModule';

const DEFAULT_REPLAY_STATE: ReplayState = {
  replayProgress: {},
  totalReplays: 0,
  unlockedChallenges: [],
  replayHistory: [],
};

export class ChapterReplayModule {
  private static instance: ChapterReplayModule;
  private stateManager: GameStateManager;
  private isInitialized: boolean = false;
  private chapterModule: any = null;
  private scoringModule: any = null;

  private failedChallenges: ChallengeType[] = [];
  private lastCheckTime: number = 0;
  private timeWarningShown: boolean = false;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
  }

  public static getInstance(): ChapterReplayModule {
    if (!ChapterReplayModule.instance) {
      ChapterReplayModule.instance = new ChapterReplayModule();
    }
    return ChapterReplayModule.instance;
  }

  public setChapterModule(module: any): void {
    this.chapterModule = module;
  }

  public setScoringModule(module: any): void {
    this.scoringModule = module;
  }

  public initialize(): void {
    this.ensureReplayState();
    if (!this.isInitialized) {
      this.setupEventListeners();
      this.isInitialized = true;
    }
    this.initializeAllChapterProgress();
  }

  private ensureReplayState(): void {
    const state = this.stateManager.getState();
    if (!state.replay) {
      this.stateManager.setState({
        replay: { ...DEFAULT_REPLAY_STATE, replayProgress: {} },
      });
    }
  }

  private getReplayState(): ReplayState {
    const state = this.stateManager.getState();
    if (!state.replay) {
      this.ensureReplayState();
      return { ...DEFAULT_REPLAY_STATE, replayProgress: {} };
    }
    return {
      ...state.replay,
      replayProgress: { ...state.replay.replayProgress },
      unlockedChallenges: [...state.replay.unlockedChallenges],
      replayHistory: state.replay.replayHistory.map(h => ({ ...h })),
    };
  }

  private updateReplayState(replayState: ReplayState): void {
    this.stateManager.setState({ replay: replayState });
  }

  private setupEventListeners(): void {
    eventBus.on('chapter:completed', (chapter: Chapter) => {
      this.handleChapterCompletion(chapter);
    });

    eventBus.on('ship:damaged', (damage: number) => {
      this.handleShipDamage(damage);
    });

    eventBus.on('progress:reset', () => {
      this.resetState();
    });

    eventBus.on('replay:start', (options: ReplayStartOptions) => {
      this.startReplay(options);
    });

    eventBus.on('replay:check_challenges', () => {
      this.checkActiveChallenges();
    });

    eventBus.on('chapter:started', (chapter: Chapter) => {
      this.onChapterStarted(chapter);
    });

    eventBus.on('ship:supplies_changed', () => {
      this.checkSuppliesChallenge();
    });

    eventBus.on('weather:changed', () => {
      this.checkWeatherChallenge();
    });
  }

  private initializeAllChapterProgress(): void {
    const replayState = this.getReplayState();
    let hasChanges = false;

    chapterReplayConfigs.forEach(config => {
      if (!replayState.replayProgress[config.chapterId]) {
        replayState.replayProgress[config.chapterId] = this.createDefaultProgress(config.chapterId);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.updateReplayState(replayState);
    }
  }

  private createDefaultProgress(chapterId: string): ChapterReplayProgress {
    return {
      chapterId,
      replayCount: 0,
      bestScore: 0,
      bestGrade: 'D' as ScoreGrade,
      bestPlayTime: Infinity,
      completedChallenges: [],
      totalRewardsEarned: {
        gold: 0,
        exp: 0,
        supplies: 0,
      },
      currentReplay: {
        isReplaying: false,
        startedAt: null,
        inheritedTypes: [],
        activeChallenges: [],
        startSnapshot: {
          health: 100,
          supplies: 100,
          gold: 0,
        },
      },
      challengeRecords: [],
    };
  }

  public canReplayChapter(chapterId: string): boolean {
    const config = getReplayConfig(chapterId);
    const state = this.stateManager.getState();
    const isCompleted = state.completedChapters.includes(chapterId);

    if (!config || !config.canReplay || !isCompleted) {
      return false;
    }

    const progress = this.getChapterProgress(chapterId);
    return progress.replayCount < config.maxReplayCount;
  }

  public getChapterProgress(chapterId: string): ChapterReplayProgress {
    const replayState = this.getReplayState();
    return replayState.replayProgress[chapterId] || this.createDefaultProgress(chapterId);
  }

  public getAllChapterProgress(): Record<string, ChapterReplayProgress> {
    return { ...this.getReplayState().replayProgress };
  }

  public getReplayConfig(chapterId: string) {
    return getReplayConfig(chapterId);
  }

  public startReplay(options: ReplayStartOptions): boolean {
    const { chapterId, inheritTypes, challenges } = options;
    const config = getReplayConfig(chapterId);
    const state = this.stateManager.getState();

    if (!config || !config.canReplay) {
      eventBus.emit('toast:show', { message: '该章节不支持重玩' });
      return false;
    }

    if (!state.completedChapters.includes(chapterId)) {
      eventBus.emit('toast:show', { message: '请先完成该章节' });
      return false;
    }

    const progress = this.getChapterProgress(chapterId);
    if (progress.replayCount >= config.maxReplayCount) {
      eventBus.emit('toast:show', { message: '已达到最大重玩次数' });
      return false;
    }

    const invalidChallenges = challenges.filter(
      c => !config.challenges.some(ch => ch.type === c)
    );
    if (invalidChallenges.length > 0) {
      eventBus.emit('toast:show', { message: '存在无效的挑战条件' });
      return false;
    }

    this.failedChallenges = [];
    this.timeWarningShown = false;

    this.resetChapterStateForReplay(chapterId, inheritTypes);

    const replayState = this.getReplayState();
    const chapterProgress = replayState.replayProgress[chapterId] || this.createDefaultProgress(chapterId);

    chapterProgress.currentReplay = {
      isReplaying: true,
      startedAt: Date.now(),
      inheritedTypes: [...inheritTypes],
      activeChallenges: [...challenges],
      startSnapshot: {
        health: state.ship.health,
        supplies: state.ship.supplies,
        gold: state.crew.gold,
      },
    };

    replayState.replayProgress[chapterId] = chapterProgress;
    this.updateReplayState(replayState);

    if (challenges.includes('limited_supplies')) {
      const challenge = getChallengeByType('limited_supplies');
      if (challenge?.value) {
        this.stateManager.updateShip({ supplies: challenge.value });
      }
    }

    if (challenges.includes('hard_mode')) {
      eventBus.emit('replay:hard_mode_enabled');
    }

    if (challenges.includes('low_visibility')) {
      eventBus.emit('replay:low_visibility_enabled');
    }

    eventBus.emit('replay:started', { chapterId, inheritTypes, challenges });
    eventBus.emit('toast:show', { message: `🎮 开始重玩：第${chapterProgress.replayCount + 1}周目` });

    eventBus.emit('chapter:start', chapterId);

    return true;
  }

  private onChapterStarted(chapter: Chapter): void {
    const progress = this.getChapterProgress(chapter.id);
    if (progress.currentReplay.isReplaying) {
      eventBus.emit('replay:chapter_started', {
        chapterId: chapter.id,
        challenges: progress.currentReplay.activeChallenges,
      });
    }
  }

  private resetChapterStateForReplay(chapterId: string, inheritTypes: InheritType[]): void {
    const state = this.stateManager.getState();
    const chapter: Chapter | undefined = this.chapterModule?.getChapter(chapterId);

    if (!chapter) return;

    if (!inheritTypes.includes('stars')) {
      const chapterStarIds = chapter.stars.map((s: { id: string }) => s.id);
      const remainingStars = state.discoveredStars.filter(
        (id: string) => !chapterStarIds.includes(id)
      );
      this.stateManager.setState({ discoveredStars: remainingStars });
    }

    if (!inheritTypes.includes('constellations')) {
      const chapterConsIds = chapter.constellations.map((c: { id: string }) => c.id);
      const remainingCons = state.discoveredConstellations.filter(
        (id: string) => !chapterConsIds.includes(id)
      );
      this.stateManager.setState({ discoveredConstellations: remainingCons });
    }

    if (!inheritTypes.includes('visited_points')) {
      const chapterPointIds = chapter.routePoints.map((p: { id: string }) => p.id);
      const remainingPoints = state.visitedPoints.filter(
        (id: string) => !chapterPointIds.includes(id)
      );
      this.stateManager.setState({ visitedPoints: remainingPoints });
    }

    const chapterObjectiveIds = chapter.objectives.map((o: { id: string }) => o.id);
    const remainingObjectives = state.completedObjectives.filter(
      (id: string) => !chapterObjectiveIds.includes(id)
    );
    this.stateManager.setState({ completedObjectives: remainingObjectives });

    if (!inheritTypes.includes('gold')) {
      this.stateManager.updateCrew({ gold: 0 });
    }

    if (!inheritTypes.includes('supplies')) {
      this.stateManager.updateShip({ supplies: 100 });
    }

    if (!inheritTypes.includes('crew_levels')) {
      const crew = state.crew;
      const resetMembers = crew.members.map(m => ({
        ...m,
        level: 1,
        exp: 0,
        maxExp: 100,
      }));
      this.stateManager.updateCrew({ members: resetMembers });
    }

    this.stateManager.resetShip();

    eventBus.emit('replay:state_reset', { chapterId, inheritTypes });
  }

  public update(deltaTime: number): void {
    if (!this.isCurrentReplay()) return;

    const now = Date.now();
    if (now - this.lastCheckTime < 500) return;
    this.lastCheckTime = now;

    this.checkTimeLimitChallenge();
    this.checkNoDamageChallenge();
    this.checkLimitedSuppliesChallenge();
    this.checkSpeedRunChallenge();
  }

  private checkTimeLimitChallenge(): void {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return;

    const progress = this.getChapterProgress(currentChapterId);
    if (!progress.currentReplay.isReplaying) return;
    if (!progress.currentReplay.activeChallenges.includes('time_limit')) return;
    if (this.failedChallenges.includes('time_limit')) return;

    const challenge = getChallengeByType('time_limit');
    if (!challenge || !challenge.value) return;

    const startedAt = progress.currentReplay.startedAt;
    if (!startedAt) return;

    const elapsed = (Date.now() - startedAt) / 1000;
    const remaining = challenge.value - elapsed;

    if (remaining <= 0) {
      this.failChallenge('time_limit', '时间耗尽');
    } else if (remaining <= 30 && !this.timeWarningShown) {
      this.timeWarningShown = true;
      eventBus.emit('toast:show', {
        message: `⏰ 限时挑战还剩 ${Math.ceil(remaining)} 秒！`,
        duration: 3000,
      });
    }

    eventBus.emit('replay:time_updated', { remaining, elapsed });
  }

  private checkNoDamageChallenge(): void {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return;

    const progress = this.getChapterProgress(currentChapterId);
    if (!progress.currentReplay.isReplaying) return;
    if (!progress.currentReplay.activeChallenges.includes('no_damage')) return;
    if (this.failedChallenges.includes('no_damage')) return;

    const startHealth = progress.currentReplay.startSnapshot.health;
    if (state.ship.health < startHealth) {
      this.failChallenge('no_damage', '受到了伤害');
    }
  }

  private checkLimitedSuppliesChallenge(): void {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return;

    const progress = this.getChapterProgress(currentChapterId);
    if (!progress.currentReplay.isReplaying) return;
    if (!progress.currentReplay.activeChallenges.includes('limited_supplies')) return;
    if (this.failedChallenges.includes('limited_supplies')) return;

    if (state.ship.supplies <= 0) {
      this.failChallenge('limited_supplies', '补给耗尽');
    }
  }

  private checkSuppliesChallenge(): void {
    this.checkLimitedSuppliesChallenge();
  }

  private checkSpeedRunChallenge(): void {
  }

  private checkWeatherChallenge(): void {
  }

  private failChallenge(challengeType: ChallengeType, reason: string): void {
    if (this.failedChallenges.includes(challengeType)) return;

    this.failedChallenges.push(challengeType);
    const challenge = getChallengeByType(challengeType);

    eventBus.emit('replay:challenge_failed', {
      challengeType,
      reason,
    });

    eventBus.emit('toast:show', {
      message: `❌「${challenge?.name || challengeType}」挑战失败：${reason}`,
      duration: 4000,
    });
  }

  private handleShipDamage(damage: number): void {
    const replayState = this.getReplayState();
    const currentChapterId = this.stateManager.getState().currentChapterId;

    if (!currentChapterId) return;

    const progress = replayState.replayProgress[currentChapterId];
    if (!progress?.currentReplay.isReplaying) return;

    if (progress.currentReplay.activeChallenges.includes('no_damage')) {
      if (!this.failedChallenges.includes('no_damage')) {
        this.failChallenge('no_damage', '船只受损');
      }
    }
  }

  public checkActiveChallenges(): void {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return;

    const progress = this.getChapterProgress(currentChapterId);
    if (!progress.currentReplay.isReplaying) return;
  }

  public isCurrentReplay(): boolean {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return false;

    const progress = this.getChapterProgress(currentChapterId);
    return progress.currentReplay.isReplaying;
  }

  public getCurrentReplayChallenges(): ChallengeType[] {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return [];

    const progress = this.getChapterProgress(currentChapterId);
    return progress.currentReplay.activeChallenges;
  }

  public getFailedChallenges(): ChallengeType[] {
    return [...this.failedChallenges];
  }

  public getReplayTimeRemaining(): number | null {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return null;

    const progress = this.getChapterProgress(currentChapterId);
    if (!progress.currentReplay.isReplaying) return null;
    if (!progress.currentReplay.activeChallenges.includes('time_limit')) return null;
    if (!progress.currentReplay.startedAt) return null;

    const challenge = getChallengeByType('time_limit');
    if (!challenge?.value) return null;

    const elapsed = (Date.now() - progress.currentReplay.startedAt) / 1000;
    return Math.max(0, challenge.value - elapsed);
  }

  public getReplayHistory(): ReplayState['replayHistory'] {
    return this.getReplayState().replayHistory;
  }

  public getTotalReplays(): number {
    return this.getReplayState().totalReplays;
  }

  private handleChapterCompletion(chapter: Chapter): void {
    const progress = this.getChapterProgress(chapter.id);

    if (!progress.currentReplay.isReplaying) {
      this.handleFirstCompletion(chapter);
      return;
    }

    this.handleReplayCompletion(chapter);
  }

  private handleFirstCompletion(chapter: Chapter): void {
    const config = getReplayConfig(chapter.id);
    if (!config) return;

    const replayState = this.getReplayState();
    const progress = replayState.replayProgress[chapter.id] || this.createDefaultProgress(chapter.id);

    progress.replayCount = 1;

    const score = this.scoringModule?.getChapterScore?.(chapter.id);
    if (score) {
      progress.bestScore = score.totalScore;
      progress.bestGrade = score.grade;
      progress.bestPlayTime = score.playTime;
    }

    this.grantRewards(config.firstClearRewards, 'first_clear', chapter.id);

    replayState.replayProgress[chapter.id] = progress;
    this.updateReplayState(replayState);

    eventBus.emit('replay:first_complete', { chapterId: chapter.id });
  }

  private handleReplayCompletion(chapter: Chapter): void {
    const config = getReplayConfig(chapter.id);
    if (!config) return;

    const replayState = this.getReplayState();
    const progress = replayState.replayProgress[chapter.id];

    if (!progress || !progress.currentReplay.isReplaying) return;

    const score = this.scoringModule?.calculateChapterScore?.(chapter);
    const playTime = progress.currentReplay.startedAt
      ? (Date.now() - progress.currentReplay.startedAt) / 1000
      : 0;

    const completedChallenges = this.verifyChallenges(
      progress.currentReplay.activeChallenges,
      chapter,
      score,
      playTime
    );

    const failedChallenges = progress.currentReplay.activeChallenges.filter(
      c => !completedChallenges.includes(c)
    );

    const rewards = this.calculateReplayRewards(
      config,
      score?.grade || 'D',
      completedChallenges
    );

    const isNewBest = score && score.totalScore > progress.bestScore;
    const isNewChallengeRecord = this.checkNewChallengeRecord(
      chapter.id,
      completedChallenges,
      score?.totalScore || 0
    );

    progress.replayCount++;
    if (isNewBest && score) {
      progress.bestScore = score.totalScore;
      progress.bestGrade = score.grade;
    }
    if (playTime < progress.bestPlayTime) {
      progress.bestPlayTime = playTime;
    }

    completedChallenges.forEach(challengeType => {
      if (!progress.completedChallenges.includes(challengeType)) {
        progress.completedChallenges.push(challengeType);
      }
      progress.challengeRecords.push({
        challengeType,
        completedAt: Date.now(),
        score: score?.totalScore || 0,
        grade: score?.grade || 'D',
      });
    });

    const rewardTotals = this.calculateRewardTotals(rewards);
    progress.totalRewardsEarned.gold += rewardTotals.gold;
    progress.totalRewardsEarned.exp += rewardTotals.exp;
    progress.totalRewardsEarned.supplies += rewardTotals.supplies;

    this.grantRewards(rewards, 'replay', chapter.id);

    const result: ReplayResult = {
      chapterId: chapter.id,
      replayNumber: progress.replayCount,
      score: score?.totalScore || 0,
      grade: score?.grade || 'D',
      playTime,
      completedChallenges,
      failedChallenges,
      rewards,
      isNewBest: !!isNewBest,
      isNewChallengeRecord,
    };

    replayState.totalReplays++;
    replayState.replayHistory.push({
      chapterId: chapter.id,
      replayNumber: progress.replayCount,
      completedAt: Date.now(),
      score: score?.totalScore || 0,
      grade: score?.grade || 'D',
      challenges: completedChallenges,
      rewards,
    });

    progress.currentReplay = {
      isReplaying: false,
      startedAt: null,
      inheritedTypes: [],
      activeChallenges: [],
      startSnapshot: { health: 100, supplies: 100, gold: 0 },
    };

    replayState.replayProgress[chapter.id] = progress;
    this.updateReplayState(replayState);

    this.failedChallenges = [];
    this.timeWarningShown = false;

    eventBus.emit('replay:completed', result);
    eventBus.emit('toast:show', {
      message: `🏆 重玩完成！获得${rewardTotals.gold}金币`,
      duration: 4000,
    });

    SaveModule.getInstance().saveGame('autosave');
  }

  private verifyChallenges(
    activeChallenges: ChallengeType[],
    chapter: Chapter,
    score: ChapterScore | undefined,
    playTime: number
  ): ChallengeType[] {
    const completed: ChallengeType[] = [];
    const state = this.stateManager.getState();

    activeChallenges.forEach(challengeType => {
      const challenge = getChallengeByType(challengeType);
      if (!challenge) return;

      if (this.failedChallenges.includes(challengeType)) {
        return;
      }

      let isCompleted = false;

      switch (challengeType) {
        case 'time_limit':
          isCompleted = playTime <= (challenge.value || 300);
          break;
        case 'no_damage':
          isCompleted = state.ship.health >= state.ship.maxHealth;
          break;
        case 'limited_supplies':
          isCompleted = state.ship.supplies > 0;
          break;
        case 'speed_run':
          const bestTime = this.getChapterProgress(chapter.id).bestPlayTime;
          isCompleted = bestTime === Infinity || playTime < bestTime;
          break;
        case 'perfect_score':
          isCompleted = score?.grade === 'S';
          break;
        case 'hard_mode':
          isCompleted = score?.percentage !== undefined && score.percentage >= 60;
          break;
        case 'low_visibility':
          isCompleted = score?.percentage !== undefined && score.percentage >= 50;
          break;
        case 'no_constellation_hint':
          isCompleted = score?.percentage !== undefined && score.percentage >= 40;
          break;
        default:
          isCompleted = true;
      }

      if (isCompleted) {
        completed.push(challengeType);
      }
    });

    return completed;
  }

  private calculateReplayRewards(
    config: { replayRewards: ReplayReward[] },
    grade: ScoreGrade,
    completedChallenges: ChallengeType[]
  ): ReplayReward[] {
    const eligibleRewards: ReplayReward[] = [];

    config.replayRewards.forEach(reward => {
      if (!reward.condition) {
        eligibleRewards.push(reward);
        return;
      }

      if (reward.condition.minGrade) {
        const gradeOrder: ScoreGrade[] = ['D', 'C', 'B', 'A', 'S'];
        const rewardGradeIndex = gradeOrder.indexOf(reward.condition.minGrade);
        const currentGradeIndex = gradeOrder.indexOf(grade);
        if (currentGradeIndex < rewardGradeIndex) return;
      }

      if (reward.condition.challengeTypes) {
        const allRequired = reward.condition.challengeTypes.every(c =>
          completedChallenges.includes(c)
        );
        if (!allRequired) return;
      }

      if (reward.condition.allChallenges) {
        if (completedChallenges.length === 0) return;
      }

      eligibleRewards.push(reward);
    });

    return eligibleRewards;
  }

  private calculateRewardTotals(rewards: ReplayReward[]): { gold: number; exp: number; supplies: number } {
    let gold = 0;
    let exp = 0;
    let supplies = 0;

    rewards.forEach(reward => {
      switch (reward.type) {
        case 'gold':
          gold += reward.amount;
          break;
        case 'exp':
          exp += reward.amount;
          break;
        case 'supplies':
          supplies += reward.amount;
          break;
      }
    });

    return { gold, exp, supplies };
  }

  private grantRewards(
    rewards: ReplayReward[],
    source: 'first_clear' | 'replay',
    chapterId: string
  ): void {
    const state = this.stateManager.getState();
    const rewardItems: RewardItem[] = [];

    rewards.forEach(reward => {
      switch (reward.type) {
        case 'gold':
          this.stateManager.updateCrew({
            gold: state.crew.gold + reward.amount,
          });
          rewardItems.push({ type: 'gold', amount: reward.amount, rarity: reward.rarity });
          break;
        case 'exp':
          if (state.crew.members.length > 0) {
            const updatedMembers = state.crew.members.map(member => {
              let newExp = member.exp + reward.amount;
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
          rewardItems.push({ type: 'exp', amount: reward.amount, rarity: reward.rarity });
          break;
        case 'supplies':
          this.stateManager.updateShip({
            supplies: Math.min(
              state.ship.supplies + reward.amount,
              state.ship.maxSupplies
            ),
          });
          rewardItems.push({ type: 'supplies', amount: reward.amount, rarity: reward.rarity });
          break;
      }
    });

    if (rewardItems.length > 0) {
      const event: RewardGrantedEvent = {
        source: source === 'first_clear' ? 'chapter_score' : 'task',
        sourceId: chapterId,
        sourceName: source === 'first_clear' ? '首次通关' : '章节重玩',
        rewards: rewardItems,
        title: source === 'first_clear' ? '🎉 首次通关奖励' : '🎮 重玩奖励',
        priority: 'high',
        timestamp: Date.now(),
      };
      eventBus.emit('reward:granted', event);
    }
  }

  private checkNewChallengeRecord(
    chapterId: string,
    completedChallenges: ChallengeType[],
    score: number
  ): boolean {
    const progress = this.getChapterProgress(chapterId);

    if (completedChallenges.length === 0) return false;

    const bestChallengeScore = progress.challengeRecords.reduce((max, record) => {
      const recordChallengeCount = progress.challengeRecords.filter(
        r => r.completedAt === record.completedAt
      ).length;
      return Math.max(max, recordChallengeCount);
    }, 0);

    return completedChallenges.length > bestChallengeScore;
  }

  private resetState(): void {
    this.stateManager.setState({
      replay: { ...DEFAULT_REPLAY_STATE, replayProgress: {} },
    });
    this.failedChallenges = [];
    this.timeWarningShown = false;
  }

  public getSerializableState(): ReplayState {
    return this.getReplayState();
  }

  public loadState(savedState: ReplayState): void {
    this.stateManager.setState({
      replay: {
        ...savedState,
        replayProgress: { ...savedState.replayProgress },
        unlockedChallenges: [...savedState.unlockedChallenges],
        replayHistory: savedState.replayHistory.map(h => ({ ...h })),
      },
    });
  }

  public dispose(): void {}
}
