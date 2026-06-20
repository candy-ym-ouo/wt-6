import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import {
  GatheringPointConfig,
  GatheringState,
  GatheringProgress,
  GatheringResult,
  GatheringReward,
  GatheringRarity,
} from '../types';
import {
  getGatheringPointById,
  getGatheringPointsForChapter,
  getGatheringPointsForRoutePoint,
  getAllGatheringPoints,
} from '../data/gatheringPoints';
import { ChapterModule } from './ChapterModule';
import { CrewModule } from './CrewModule';
import { DayNightCycleModule } from './DayNightCycleModule';
import { SaveModule } from './SaveModule';
import { TaskModule } from './TaskModule';
import { CodexModule } from './CodexModule';

const DEFAULT_GATHERING_STATE: GatheringState = {
  availablePoints: [],
  gatheringProgress: null,
  gatheredPoints: {},
  cooldowns: {},
  discoveredClues: [],
  flags: {},
  totalGatherCount: 0,
};

const RARITY_COLORS: Record<GatheringRarity, string> = {
  common: '#95a5a6',
  uncommon: '#2ecc71',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f1c40f',
};

const RARITY_NAMES: Record<GatheringRarity, string> = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export class ResourceGatheringModule {
  private static instance: ResourceGatheringModule;
  private stateManager: GameStateManager;
  private chapterModule: ChapterModule | null = null;
  private crewModule: CrewModule;
  private dayNightModule: DayNightCycleModule;
  private saveModule: SaveModule;
  private taskModule: TaskModule;
  private codexModule: CodexModule;
  private isInitialized: boolean = false;
  private currentChapterId: string | null = null;
  private currentRoutePointId: string | null = null;
  private nearbyGatheringPoints: GatheringPointConfig[] = [];

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.crewModule = CrewModule.getInstance();
    this.dayNightModule = DayNightCycleModule.getInstance();
    this.saveModule = SaveModule.getInstance();
    this.taskModule = TaskModule.getInstance();
    this.codexModule = CodexModule.getInstance();
  }

  public static getInstance(): ResourceGatheringModule {
    if (!ResourceGatheringModule.instance) {
      ResourceGatheringModule.instance = new ResourceGatheringModule();
    }
    return ResourceGatheringModule.instance;
  }

  public setChapterModule(module: ChapterModule): void {
    this.chapterModule = module;
  }

  public initialize(): void {
    this.ensureGatheringState();
    if (!this.isInitialized) {
      this.setupEventListeners();
      this.isInitialized = true;
    }
    this.updateAvailablePoints();
  }

  private ensureGatheringState(): void {
    const state = this.stateManager.getState();
    if (!state.gathering) {
      this.stateManager.setState({
        gathering: { ...DEFAULT_GATHERING_STATE },
      });
    }
  }

  private getGatheringState(): GatheringState {
    const state = this.stateManager.getState();
    if (!state.gathering) {
      this.ensureGatheringState();
      return { ...DEFAULT_GATHERING_STATE };
    }
    return {
      ...state.gathering,
      gatheringProgress: state.gathering.gatheringProgress 
        ? { ...state.gathering.gatheringProgress } 
        : null,
      gatheredPoints: { ...state.gathering.gatheredPoints },
      cooldowns: { ...state.gathering.cooldowns },
      discoveredClues: [...state.gathering.discoveredClues],
      flags: { ...state.gathering.flags },
    };
  }

  private updateGatheringState(gatheringState: GatheringState): void {
    this.stateManager.setState({ gathering: gatheringState });
  }

  private setupEventListeners(): void {
    eventBus.on('point:reached', (pointId: string) => {
      this.onRoutePointReached(pointId);
    });

    eventBus.on('point:visited', (pointId: string) => {
      this.updateNearbyPoints(pointId);
    });

    eventBus.on('chapter:started', (chapterId: string) => {
      this.currentChapterId = chapterId;
      this.updateAvailablePoints();
    });

    eventBus.on('route:started', () => {
      this.cancelGathering();
    });

    eventBus.on('game:pause', () => {
      const state = this.getGatheringState();
      if (state.gatheringProgress?.isGathering) {
        this.pauseGathering();
      }
    });

    eventBus.on('game:resume', () => {
      const state = this.getGatheringState();
      if (state.gatheringProgress && !state.gatheringProgress.isGathering) {
        this.resumeGathering();
      }
    });

    eventBus.on('progress:reset', () => {
      this.resetState();
    });

    eventBus.on('gathering:load', (savedState: GatheringState) => {
      if (savedState) {
        this.loadState(savedState);
      }
    });

    this.stateManager.onUpdate((delta: number) => {
      this.update(delta);
    });
  }

  private onRoutePointReached(pointId: string): void {
    this.currentRoutePointId = pointId;
    this.updateNearbyPoints(pointId);
    eventBus.emit('gathering:pointReached', pointId);
  }

  private updateNearbyPoints(pointId: string): void {
    this.nearbyGatheringPoints = getGatheringPointsForRoutePoint(pointId);
    eventBus.emit('gathering:nearbyPointsUpdated', this.nearbyGatheringPoints);
  }

  private updateAvailablePoints(): void {
    const state = this.getGatheringState();
    const chapterId = this.currentChapterId || this.stateManager.getState().currentChapterId;
    
    if (chapterId) {
      const chapterPoints = getGatheringPointsForChapter(chapterId);
      state.availablePoints = chapterPoints
        .filter(p => this.isPointUnlocked(p))
        .map(p => p.id);
      this.updateGatheringState(state);
    }
  }

  private isPointUnlocked(point: GatheringPointConfig): boolean {
    if (!point.unlockCondition) return true;

    const state = this.stateManager.getState();
    const condition = point.unlockCondition;

    if (condition.minStarsDiscovered !== undefined) {
      const discoveredCount = state.discoveredStars.length;
      if (discoveredCount < condition.minStarsDiscovered) return false;
    }

    if (condition.minConstellationsDiscovered !== undefined) {
      const discoveredCount = state.discoveredConstellations.length;
      if (discoveredCount < condition.minConstellationsDiscovered) return false;
    }

    if (condition.minPointsVisited !== undefined) {
      const visitedCount = state.visitedPoints.length;
      if (visitedCount < condition.minPointsVisited) return false;
    }

    if (condition.flag !== undefined) {
      const gatheringState = this.getGatheringState();
      if (gatheringState.flags[condition.flag] !== true) return false;
    }

    return true;
  }

  public canGather(pointId: string): { canGather: boolean; reason?: string } {
    const point = getGatheringPointById(pointId);
    if (!point) {
      return { canGather: false, reason: '采集点不存在' };
    }

    const state = this.getGatheringState();
    const gameState = this.stateManager.getState();

    if (state.gatheringProgress?.isGathering) {
      return { canGather: false, reason: '正在进行其他采集' };
    }

    if (!this.isPointUnlocked(point)) {
      return { canGather: false, reason: '采集点未解锁' };
    }

    if (point.maxGatherCount !== undefined) {
      const gatheredCount = state.gatheredPoints[pointId] || 0;
      if (gatheredCount >= point.maxGatherCount) {
        return { canGather: false, reason: '该点已达最大采集次数' };
      }
    }

    const cooldownEnd = state.cooldowns[pointId] || 0;
    if (Date.now() < cooldownEnd) {
      const remainingSeconds = Math.ceil((cooldownEnd - Date.now()) / 1000);
      return { canGather: false, reason: `冷却中，还需 ${remainingSeconds} 秒` };
    }

    if (point.requiredSupplies !== undefined) {
      if (gameState.ship.supplies < point.requiredSupplies) {
        return { canGather: false, reason: `补给不足，需要 ${point.requiredSupplies} 补给` };
      }
    }

    if (point.requiredCrewRole !== undefined) {
      const hasCrew = gameState.crew.members.some(
        m => m.role === point.requiredCrewRole && m.health > 0
      );
      if (!hasCrew) {
        return { canGather: false, reason: `需要 ${this.getRoleName(point.requiredCrewRole)} 船员` };
      }
    }

    return { canGather: true };
  }

  private getRoleName(role: string): string {
    const roleNames: Record<string, string> = {
      captain: '船长',
      navigator: '航海士',
      sailor: '水手',
      cook: '厨师',
      doctor: '船医',
      engineer: '工程师',
      lookout: '瞭望员',
      idle: '空闲',
    };
    return roleNames[role] || role;
  }

  public startGathering(pointId: string): boolean {
    const checkResult = this.canGather(pointId);
    if (!checkResult.canGather) {
      eventBus.emit('toast:show', { message: `❌ ${checkResult.reason}` });
      return false;
    }

    const point = getGatheringPointById(pointId);
    if (!point) return false;

    const state = this.getGatheringState();
    const gameState = this.stateManager.getState();

    if (point.requiredSupplies !== undefined) {
      this.stateManager.updateShip({
        supplies: gameState.ship.supplies - point.requiredSupplies,
      });
    }

    const dayNightInfo = this.dayNightModule.getCycleInfo();
    let timeMultiplier = 1;
    if (dayNightInfo.timeOfDay === 'night') {
      timeMultiplier = 1.3;
    } else if (dayNightInfo.timeOfDay === 'day') {
      timeMultiplier = 0.9;
    }

    const adjustedGatherTime = point.gatherTime * timeMultiplier;

    const progress: GatheringProgress = {
      pointId,
      isGathering: true,
      startTime: Date.now(),
      progress: 0,
      gatherTime: adjustedGatherTime,
    };

    state.gatheringProgress = progress;
    this.updateGatheringState(state);

    eventBus.emit('gathering:started', { point, progress });
    eventBus.emit('toast:show', { 
      message: `${point.icon} 开始${this.getActionName(point.type)}：${point.name}`,
      duration: 3000,
    });

    return true;
  }

  private getActionName(type: string): string {
    const actionNames: Record<string, string> = {
      fishing: '捕鱼',
      foraging: '采集',
      mining: '采矿',
      exploration: '探索',
      trade_ruins: '搜刮',
    };
    return actionNames[type] || '采集';
  }

  private update(delta: number): void {
    const state = this.getGatheringState();
    if (!state.gatheringProgress?.isGathering) return;

    const progress = state.gatheringProgress;
    const elapsed = (Date.now() - progress.startTime) / 1000;
    const newProgress = Math.min(elapsed / progress.gatherTime, 1);

    progress.progress = newProgress;
    state.gatheringProgress = progress;
    this.updateGatheringState(state);

    eventBus.emit('gathering:progress', { progress: newProgress, pointId: progress.pointId });

    if (newProgress >= 1) {
      this.completeGathering(progress.pointId);
    }
  }

  private completeGathering(pointId: string): void {
    const point = getGatheringPointById(pointId);
    if (!point) return;

    const state = this.getGatheringState();
    const success = Math.random() < point.successRate;

    const result: GatheringResult = {
      success,
      pointId,
      rewards: [],
      duration: point.gatherTime,
      timestamp: Date.now(),
    };

    if (success) {
      result.rewards = this.rollRewards(point.rewards);
      this.grantRewards(result.rewards, point);

      state.gatheredPoints[pointId] = (state.gatheredPoints[pointId] || 0) + 1;
      state.totalGatherCount++;

      if (point.clueId && !state.discoveredClues.includes(point.clueId)) {
        state.discoveredClues.push(point.clueId);
        eventBus.emit('gathering:clueDiscovered', point.clueId);
      }

      if (point.cooldown > 0) {
        state.cooldowns[pointId] = Date.now() + point.cooldown * 1000;
      }

      result.message = `✅ ${point.name} 采集成功！`;
    } else {
      result.message = `❌ ${point.name} 采集失败...`;
    }

    state.gatheringProgress = null;
    this.updateGatheringState(state);

    eventBus.emit('gathering:completed', result);
    eventBus.emit('toast:show', { message: result.message, duration: 3000 });

    if (success && result.rewards.length > 0) {
      this.showRewardNotification(result.rewards);
    }

    this.saveModule.saveGame('autosave');
  }

  private rollRewards(rewards: GatheringReward[]): GatheringReward[] {
    const earnedRewards: GatheringReward[] = [];
    const rarityChances: Record<GatheringRarity, number> = {
      common: 0.7,
      uncommon: 0.5,
      rare: 0.3,
      epic: 0.15,
      legendary: 0.05,
    };

    const crewBonus = this.crewModule.getSupplySaveModifier();
    const dayNightInfo = this.dayNightModule.getCycleInfo();
    let dayNightBonus = 1;
    if (dayNightInfo.timeOfDay === 'night') {
      dayNightBonus = 1.2;
    }

    rewards.forEach(reward => {
      const rarity = reward.rarity || 'common';
      const chance = rarityChances[rarity];

      if (Math.random() < chance) {
        let amount = reward.amount || 1;
        
        if (reward.type === 'supplies' || reward.type === 'gold') {
          amount = Math.floor(amount * (1 + crewBonus) * dayNightBonus);
        }

        earnedRewards.push({
          ...reward,
          amount,
        });
      }
    });

    return earnedRewards;
  }

  private grantRewards(rewards: GatheringReward[], point: GatheringPointConfig): void {
    const state = this.stateManager.getState();

    rewards.forEach(reward => {
      const amount = reward.amount || 1;

      switch (reward.type) {
        case 'supplies':
          this.stateManager.updateShip({
            supplies: Math.min(state.ship.supplies + amount, state.ship.maxSupplies),
          });
          break;

        case 'gold':
          this.stateManager.updateCrew({
            gold: state.crew.gold + amount,
          });
          break;

        case 'health':
          this.stateManager.updateShip({
            health: Math.min(state.ship.health + amount, state.ship.maxHealth),
          });
          eventBus.emit('ship:repaired');
          break;

        case 'star':
          if (typeof reward.value === 'string') {
            this.stateManager.addDiscoveredStar(reward.value);
          }
          break;

        case 'constellation':
          if (typeof reward.value === 'string') {
            this.stateManager.addDiscoveredConstellation(reward.value);
          }
          break;

        case 'codex_entry':
          if (typeof reward.value === 'string') {
            this.codexModule.discoverEntry(reward.value);
          }
          break;

        case 'clue':
          if (typeof reward.value === 'string') {
            const gatheringState = this.getGatheringState();
            if (!gatheringState.discoveredClues.includes(reward.value)) {
              gatheringState.discoveredClues.push(reward.value);
              this.updateGatheringState(gatheringState);
              eventBus.emit('gathering:clueDiscovered', reward.value);
            }
          }
          break;

        case 'exp':
          const updatedMembers = state.crew.members.map(member => {
            let newExp = member.exp + amount;
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
          break;
      }
    });

    eventBus.emit('gathering:rewardsGranted', { rewards, pointId: point.id });
  }

  private showRewardNotification(rewards: GatheringReward[]): void {
    rewards.forEach((reward, index) => {
      setTimeout(() => {
        const rarity = reward.rarity || 'common';
        const amount = reward.amount || 1;
        const icon = this.getRewardIcon(reward.type);
        const name = this.getRewardName(reward);
        const color = RARITY_COLORS[rarity];
        const rarityName = RARITY_NAMES[rarity];

        let message = `${icon} 获得 ${name}`;
        if (reward.type !== 'codex_entry' && reward.type !== 'clue') {
          message += ` x${amount}`;
        }
        if (rarity !== 'common') {
          message += ` (${rarityName})`;
        }

        eventBus.emit('toast:show', {
          message,
          duration: 3000,
        });
      }, index * 800);
    });
  }

  private getRewardIcon(type: string): string {
    const icons: Record<string, string> = {
      supplies: '📦',
      gold: '💰',
      health: '❤️',
      star: '⭐',
      constellation: '✨',
      codex_entry: '📖',
      clue: '🔍',
      exp: '⭐',
    };
    return icons[type] || '🎁';
  }

  private getRewardName(reward: GatheringReward): string {
    if (reward.type === 'clue') return '线索';
    if (reward.type === 'exp') return '经验';
    
    const names: Record<string, string> = {
      supplies: '补给',
      gold: '金币',
      health: '船体修复',
      star: '星辰',
      constellation: '星座',
      codex_entry: '图鉴记录',
    };
    return names[reward.type] || '物品';
  }

  public cancelGathering(): void {
    const state = this.getGatheringState();
    if (state.gatheringProgress) {
      state.gatheringProgress = null;
      this.updateGatheringState(state);
      eventBus.emit('gathering:cancelled');
    }
  }

  private pauseGathering(): void {
    const state = this.getGatheringState();
    if (state.gatheringProgress) {
      state.gatheringProgress.isGathering = false;
      this.updateGatheringState(state);
    }
  }

  private resumeGathering(): void {
    const state = this.getGatheringState();
    if (state.gatheringProgress) {
      state.gatheringProgress.isGathering = true;
      state.gatheringProgress.startTime = Date.now() - (state.gatheringProgress.progress * state.gatheringProgress.gatherTime * 1000);
      this.updateGatheringState(state);
    }
  }

  public getNearbyGatheringPoints(): GatheringPointConfig[] {
    return [...this.nearbyGatheringPoints];
  }

  public getGatheringProgress(): GatheringProgress | null {
    const state = this.getGatheringState();
    return state.gatheringProgress ? { ...state.gatheringProgress } : null;
  }

  public getPointGatherCount(pointId: string): number {
    const state = this.getGatheringState();
    return state.gatheredPoints[pointId] || 0;
  }

  public getPointCooldown(pointId: string): number {
    const state = this.getGatheringState();
    const cooldownEnd = state.cooldowns[pointId] || 0;
    return Math.max(0, cooldownEnd - Date.now());
  }

  public isClueDiscovered(clueId: string): boolean {
    const state = this.getGatheringState();
    return state.discoveredClues.includes(clueId);
  }

  public getDiscoveredClues(): string[] {
    const state = this.getGatheringState();
    return [...state.discoveredClues];
  }

  public getSerializableState(): GatheringState {
    return this.getGatheringState();
  }

  public loadState(savedState: GatheringState): void {
    this.stateManager.setState({
      gathering: {
        ...savedState,
        gatheringProgress: savedState.gatheringProgress 
          ? { ...savedState.gatheringProgress } 
          : null,
        gatheredPoints: { ...savedState.gatheredPoints },
        cooldowns: { ...savedState.cooldowns },
        discoveredClues: [...savedState.discoveredClues],
        flags: { ...savedState.flags },
      },
    });
    this.updateAvailablePoints();
  }

  private resetState(): void {
    this.stateManager.setState({
      gathering: { ...DEFAULT_GATHERING_STATE },
    });
    this.currentChapterId = null;
    this.currentRoutePointId = null;
    this.nearbyGatheringPoints = [];
  }

  public getAllGatheringPoints(): GatheringPointConfig[] {
    return getAllGatheringPoints();
  }

  public getGatheringPoint(pointId: string): GatheringPointConfig | undefined {
    return getGatheringPointById(pointId);
  }

  public setFlag(key: string, value: unknown): void {
    const state = this.getGatheringState();
    state.flags[key] = value;
    this.updateGatheringState(state);
    this.updateAvailablePoints();
  }

  public getFlag(key: string): unknown {
    const state = this.getGatheringState();
    return state.flags[key];
  }

  public dispose(): void {
  }
}
