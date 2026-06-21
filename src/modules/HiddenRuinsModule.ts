import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import {
  RuinsConfig,
  RuinsState,
  RuinsExplorationState,
  RuinsRoomState,
  RuinsRoomStatus,
  RuinsReward,
  RuinsUnlockCondition,
  WeatherCondition,
  GatheringRarity,
  RewardItem,
  RewardGrantedEvent,
} from '../types';
import {
  getRuinsById,
  getRuinsForChapter,
  getRuinsReward,
  hiddenRuins,
} from '../data/hiddenRuins';
import { ChapterModule } from './ChapterModule';
import { WeatherModule } from './WeatherModule';
import { CrewModule } from './CrewModule';
import { CodexModule } from './CodexModule';
import { SaveModule } from './SaveModule';

const DEFAULT_EXPLORATION: RuinsExplorationState = {
  currentRoomId: null,
  visitedRoomIds: [],
  roomStates: {},
  totalRoomsCompleted: 0,
  enteredAt: null,
};

const DEFAULT_RUINS_STATE: RuinsState = {
  ruinsId: null,
  status: 'locked',
  unlockedRuinsIds: [],
  completedRuinsIds: [],
  exploration: { ...DEFAULT_EXPLORATION },
  earnedRewards: [],
  settlementSnapshot: null,
  flags: {},
};

const RARITY_NAMES: Record<GatheringRarity, string> = {
  common: '普通',
  uncommon: '优秀',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

export class HiddenRuinsModule {
  private static instance: HiddenRuinsModule;
  private stateManager: GameStateManager;
  private chapterModule: ChapterModule | null = null;
  private weatherModule: WeatherModule | null = null;
  private crewModule: CrewModule;
  private codexModule: CodexModule;
  private saveModule: SaveModule;
  private isInitialized: boolean = false;
  private currentChapterId: string | null = null;
  private puzzleTimer: number | null = null;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.crewModule = CrewModule.getInstance();
    this.codexModule = CodexModule.getInstance();
    this.saveModule = SaveModule.getInstance();
  }

  public static getInstance(): HiddenRuinsModule {
    if (!HiddenRuinsModule.instance) {
      HiddenRuinsModule.instance = new HiddenRuinsModule();
    }
    return HiddenRuinsModule.instance;
  }

  public setChapterModule(module: ChapterModule): void {
    this.chapterModule = module;
  }

  public setWeatherModule(module: WeatherModule): void {
    this.weatherModule = module;
  }

  public initialize(): void {
    this.ensureRuinsState();
    if (!this.isInitialized) {
      this.setupEventListeners();
      this.isInitialized = true;
    }
    this.checkAllUnlockConditions();
  }

  private ensureRuinsState(): void {
    const state = this.stateManager.getState();
    if (!state.ruins) {
      this.stateManager.setState({
        ruins: { ...DEFAULT_RUINS_STATE, exploration: { ...DEFAULT_EXPLORATION } },
      });
    }
  }

  private getRuinsState(): RuinsState {
    const state = this.stateManager.getState();
    if (!state.ruins) {
      this.ensureRuinsState();
      return { ...DEFAULT_RUINS_STATE, exploration: { ...DEFAULT_EXPLORATION } };
    }
    return {
      ...state.ruins,
      unlockedRuinsIds: [...state.ruins.unlockedRuinsIds],
      completedRuinsIds: [...state.ruins.completedRuinsIds],
      exploration: {
        ...state.ruins.exploration,
        visitedRoomIds: [...state.ruins.exploration.visitedRoomIds],
        roomStates: { ...state.ruins.exploration.roomStates },
      },
      earnedRewards: [...state.ruins.earnedRewards],
      flags: { ...state.ruins.flags },
    };
  }

  private updateRuinsState(ruinsState: RuinsState): void {
    this.stateManager.setState({ ruins: ruinsState });
  }

  private setupEventListeners(): void {
    eventBus.on('constellation:discovered', (_constellationId: string) => {
      this.checkAllUnlockConditions();
    });

    eventBus.on('route:completed', (_routeId: string) => {
      this.checkAllUnlockConditions();
    });

    eventBus.on('chapter:started', (chapterId: string) => {
      this.currentChapterId = chapterId;
      this.checkAllUnlockConditions();
    });

    eventBus.on('chapter:completed', (_ctx: any) => {
      this.checkAllUnlockConditions();
    });

    eventBus.on('weather:changed', (weather: any) => {
      if (weather === null) {
        const ruinsState = this.getRuinsState();
        if (ruinsState.status === 'in_progress' && ruinsState.exploration.currentRoomId) {
          this.onWeatherClearedDuringExploration();
        }
      }
    });

    eventBus.on('star:discovered', (_starId: string) => {
      this.checkAllUnlockConditions();
    });

    eventBus.on('progress:reset', () => {
      this.resetState();
    });

    eventBus.on('ruins:load', (savedState: RuinsState) => {
      if (savedState) {
        this.loadState(savedState);
      }
    });

    this.stateManager.onUpdate((delta: number) => {
      this.update(delta);
    });
  }

  private onWeatherClearedDuringExploration(): void {
    const ruinsState = this.getRuinsState();
    if (ruinsState.status !== 'in_progress') return;

    const config = getRuinsById(ruinsState.ruinsId!);
    if (!config) return;

    const currentRoomId = ruinsState.exploration.currentRoomId;
    if (!currentRoomId) return;

    const room = config.rooms.find(r => r.id === currentRoomId);
    if (!room) return;

    if (room.puzzle.requiredWeatherType) {
      eventBus.emit('toast:show', {
        message: '⚠️ 天气已变化，当前谜题需要的天气条件不再满足',
        duration: 3000,
      });
    }
  }

  public checkAllUnlockConditions(): void {
    const gameState = this.stateManager.getState();
    const ruinsState = this.getRuinsState();
    const newlyUnlocked: string[] = [];

    hiddenRuins.forEach(ruinsConfig => {
      if (ruinsState.unlockedRuinsIds.includes(ruinsConfig.id)) return;
      if (ruinsState.completedRuinsIds.includes(ruinsConfig.id)) return;

      const isUnlocked = ruinsConfig.unlockConditions.some(condition =>
        this.evaluateUnlockCondition(condition, gameState)
      );

      if (isUnlocked) {
        newlyUnlocked.push(ruinsConfig.id);
      }
    });

    if (newlyUnlocked.length > 0) {
      ruinsState.unlockedRuinsIds = [
        ...ruinsState.unlockedRuinsIds,
        ...newlyUnlocked,
      ];
      this.updateRuinsState(ruinsState);

      newlyUnlocked.forEach(ruinsId => {
        const config = getRuinsById(ruinsId);
        if (config) {
          eventBus.emit('ruins:unlocked', { ruinsId, config });
          eventBus.emit('toast:show', {
            message: `🏛️ 发现隐藏遗迹：${config.name}`,
            duration: 4000,
          });
        }
      });
    }
  }

  private evaluateUnlockCondition(condition: RuinsUnlockCondition, gameState: any): boolean {
    const chapterCompleted = gameState.completedChapters.includes(condition.chapterId);
    if (!chapterCompleted && gameState.currentChapterId !== condition.chapterId) {
      return false;
    }

    if (condition.requiredConstellationIds && condition.requiredConstellationIds.length > 0) {
      const allConstellationsDiscovered = condition.requiredConstellationIds.every(cId =>
        gameState.discoveredConstellations.includes(cId)
      );
      if (!allConstellationsDiscovered) return false;
    }

    if (condition.minStarsDiscovered !== undefined) {
      if (gameState.discoveredStars.length < condition.minStarsDiscovered) return false;
    }

    if (condition.requiredRouteId) {
      const visitedPoints = gameState.visitedPoints || [];
      const chapterModule = this.chapterModule;
      if (!chapterModule) return false;

      const chapter = chapterModule.getChapter(condition.chapterId);
      if (!chapter) return false;

      const route = chapter.routes.find(r => r.id === condition.requiredRouteId);
      if (!route) return false;

      const allRoutePointsVisited = route.points.every(pId =>
        visitedPoints.includes(pId)
      );
      if (!allRoutePointsVisited) return false;
    }

    if (condition.requiredWeatherSurvived) {
      const taskState = gameState.tasks;
      if (!taskState) return false;
      const weatherStats = taskState.weatherSurvivalStats || {};
      const survivedCount = weatherStats[condition.requiredWeatherSurvived] || 0;
      if (survivedCount < 1) return false;
    }

    return true;
  }

  public canEnterRuins(ruinsId: string): { canEnter: boolean; reason?: string } {
    const ruinsState = this.getRuinsState();
    const config = getRuinsById(ruinsId);

    if (!config) {
      return { canEnter: false, reason: '遗迹不存在' };
    }

    if (!ruinsState.unlockedRuinsIds.includes(ruinsId)) {
      return { canEnter: false, reason: '遗迹尚未解锁' };
    }

    if (ruinsState.completedRuinsIds.includes(ruinsId)) {
      return { canEnter: false, reason: '遗迹已完成' };
    }

    if (ruinsState.status === 'in_progress') {
      return { canEnter: false, reason: '正在探索其他遗迹' };
    }

    const gameState = this.stateManager.getState();
    if (gameState.ship.health < 30) {
      return { canEnter: false, reason: '船体受损严重，无法深入探索' };
    }

    if (gameState.ship.supplies < 20) {
      return { canEnter: false, reason: '补给不足，无法支撑遗迹探索' };
    }

    return { canEnter: true };
  }

  public enterRuins(ruinsId: string): boolean {
    const checkResult = this.canEnterRuins(ruinsId);
    if (!checkResult.canEnter) {
      eventBus.emit('toast:show', { message: `❌ ${checkResult.reason}` });
      return false;
    }

    const config = getRuinsById(ruinsId);
    if (!config) return false;

    const ruinsState = this.getRuinsState();
    const gameState = this.stateManager.getState();

    const entranceRoom = config.rooms.find(r => r.isEntrance);
    if (!entranceRoom) return false;

    const initialRoomStates: Record<string, RuinsRoomState> = {};
    config.rooms.forEach(room => {
      const existingState = ruinsState.exploration.roomStates[room.id];
      if (existingState) {
        initialRoomStates[room.id] = { ...existingState };
      } else {
        initialRoomStates[room.id] = {
          roomId: room.id,
          status: room.isEntrance ? 'available' : 'locked',
          attemptsUsed: 0,
          puzzleStartTime: null,
          completedAt: null,
          rewardsClaimed: [],
        };
      }
    });

    ruinsState.ruinsId = ruinsId;
    ruinsState.status = 'in_progress';
    ruinsState.exploration = {
      currentRoomId: entranceRoom.id,
      visitedRoomIds: [entranceRoom.id],
      roomStates: initialRoomStates,
      totalRoomsCompleted: 0,
      enteredAt: Date.now(),
    };
    ruinsState.settlementSnapshot = {
      healthBefore: gameState.ship.health,
      suppliesBefore: gameState.ship.supplies,
      goldBefore: gameState.crew.gold,
      healthAfter: gameState.ship.health,
      suppliesAfter: gameState.ship.supplies,
      goldAfter: gameState.crew.gold,
      roomsCompleted: 0,
      totalRooms: config.rooms.length,
      timeSpent: 0,
      rewardsEarned: [],
    };

    this.updateRuinsState(ruinsState);

    if (config.timeLimit) {
      this.puzzleTimer = config.timeLimit * 1000;
    }

    eventBus.emit('ruins:entered', { ruinsId, config });
    eventBus.emit('toast:show', {
      message: `🏛️ 进入${config.name}：${entranceRoom.name}`,
      duration: 3000,
    });

    return true;
  }

  public canAttemptPuzzle(roomId: string): { canAttempt: boolean; reason?: string } {
    const ruinsState = this.getRuinsState();
    if (ruinsState.status !== 'in_progress' || !ruinsState.ruinsId) {
      return { canAttempt: false, reason: '未在遗迹探索中' };
    }

    const config = getRuinsById(ruinsState.ruinsId);
    if (!config) return { canAttempt: false, reason: '遗迹配置不存在' };

    const room = config.rooms.find(r => r.id === roomId);
    if (!room) return { canAttempt: false, reason: '房间不存在' };

    const roomState = ruinsState.exploration.roomStates[roomId];
    if (!roomState) return { canAttempt: false, reason: '房间状态不存在' };

    if (roomState.status === 'completed') {
      return { canAttempt: false, reason: '谜题已完成' };
    }

    if (roomState.status === 'failed' && roomState.attemptsUsed >= room.puzzle.maxAttempts) {
      return { canAttempt: false, reason: '尝试次数已用完' };
    }

    if (roomState.status === 'in_progress') {
      return { canAttempt: true };
    }

    if (roomState.status === 'locked') {
      return { canAttempt: false, reason: '房间已锁定' };
    }

    if (room.puzzle.requiredWeatherType) {
      const activeWeather = this.stateManager.getState().activeWeather;
      const currentWeatherType = activeWeather?.id?.includes(room.puzzle.requiredWeatherType)
        ? room.puzzle.requiredWeatherType
        : null;

      if (!currentWeatherType && room.puzzle.type === 'weather_resonance') {
        eventBus.emit('toast:show', {
          message: `💡 提示：此谜题需要${this.getWeatherName(room.puzzle.requiredWeatherType)}天气`,
          duration: 3000,
        });
      }
    }

    return { canAttempt: true };
  }

  public attemptPuzzle(roomId: string, playerAnswer: string[]): { success: boolean; message: string } {
    const checkResult = this.canAttemptPuzzle(roomId);
    if (!checkResult.canAttempt) {
      return { success: false, message: checkResult.reason || '无法尝试谜题' };
    }

    const ruinsState = this.getRuinsState();
    const config = getRuinsById(ruinsState.ruinsId!);
    if (!config) return { success: false, message: '遗迹配置不存在' };

    const room = config.rooms.find(r => r.id === roomId);
    if (!room) return { success: false, message: '房间不存在' };

    const roomState = ruinsState.exploration.roomStates[roomId];
    roomState.attemptsUsed++;
    roomState.status = 'in_progress';
    roomState.puzzleStartTime = Date.now();

    const isCorrect = this.validatePuzzleAnswer(room.puzzle.type, playerAnswer, room.puzzle.solution);

    if (isCorrect) {
      roomState.status = 'completed';
      roomState.completedAt = Date.now();
      ruinsState.exploration.totalRoomsCompleted++;

      this.unlockNextRooms(config, roomId, ruinsState);

      this.updateRuinsState(ruinsState);

      const isLastRoom = room.isExit;
      eventBus.emit('ruins:puzzleCompleted', {
        ruinsId: ruinsState.ruinsId,
        roomId,
        puzzleId: room.puzzle.id,
        isLastRoom,
      });

      eventBus.emit('toast:show', {
        message: `✅ ${room.puzzle.name} 完成！`,
        duration: 3000,
      });

      if (isLastRoom) {
        this.completeRuins(ruinsState.ruinsId!);
      }

      return { success: true, message: `谜题「${room.puzzle.name}」解开了！` };
    } else {
      if (roomState.attemptsUsed >= room.puzzle.maxAttempts) {
        roomState.status = 'failed';
        this.updateRuinsState(ruinsState);

        eventBus.emit('toast:show', {
          message: `❌ ${room.puzzle.name} 失败，尝试次数已用完`,
          duration: 3000,
        });

        this.checkRuinsFailure(ruinsState.ruinsId!);
        return { success: false, message: `谜题「${room.puzzle.name}」失败，尝试次数已用完` };
      }

      roomState.status = 'available';
      this.updateRuinsState(ruinsState);

      eventBus.emit('toast:show', {
        message: `❌ 答案不正确，还剩 ${room.puzzle.maxAttempts - roomState.attemptsUsed} 次机会`,
        duration: 3000,
      });

      return { success: false, message: '答案不正确，请再试一次' };
    }
  }

  private validatePuzzleAnswer(
    puzzleType: string,
    playerAnswer: string[],
    solution: string[]
  ): boolean {
    switch (puzzleType) {
      case 'constellation_match':
      case 'weather_resonance':
        return (
          playerAnswer.length === solution.length &&
          playerAnswer.every((val, idx) => val === solution[idx])
        );

      case 'star_order':
        return (
          playerAnswer.length === solution.length &&
          playerAnswer.every((val, idx) => val === solution[idx])
        );

      case 'route_trace':
        return (
          playerAnswer.length === solution.length &&
          playerAnswer.every((val, idx) => val === solution[idx])
        );

      default:
        return false;
    }
  }

  private unlockNextRooms(config: RuinsConfig, completedRoomId: string, ruinsState: RuinsState): void {
    const room = config.rooms.find(r => r.id === completedRoomId);
    if (!room) return;

    room.nextRoomIds.forEach(nextRoomId => {
      const nextRoomState = ruinsState.exploration.roomStates[nextRoomId];
      if (nextRoomState && nextRoomState.status === 'locked') {
        nextRoomState.status = 'available';
      }
    });
  }

  private checkRuinsFailure(ruinsId: string): void {
    const ruinsState = this.getRuinsState();
    const config = getRuinsById(ruinsId);
    if (!config) return;

    const allRoomsFailedOrCompleted = config.rooms.every(room => {
      const roomState = ruinsState.exploration.roomStates[room.id];
      if (!roomState) return false;
      return roomState.status === 'completed' || roomState.status === 'failed';
    });

    const hasFailedRoom = config.rooms.some(room => {
      const roomState = ruinsState.exploration.roomStates[room.id];
      return roomState && roomState.status === 'failed' && room.isExit;
    });

    if (hasFailedRoom || (allRoomsFailedOrCompleted && ruinsState.exploration.totalRoomsCompleted < config.rooms.length)) {
      this.abandonRuins();
    }
  }

  private completeRuins(ruinsId: string): void {
    const ruinsState = this.getRuinsState();
    const config = getRuinsById(ruinsId);
    if (!config) return;

    const gameState = this.stateManager.getState();

    ruinsState.status = 'completed';
    if (!ruinsState.completedRuinsIds.includes(ruinsId)) {
      ruinsState.completedRuinsIds.push(ruinsId);
    }

    const timeSpent = ruinsState.exploration.enteredAt
      ? (Date.now() - ruinsState.exploration.enteredAt) / 1000
      : 0;

    ruinsState.settlementSnapshot = {
      healthBefore: ruinsState.settlementSnapshot?.healthBefore ?? gameState.ship.health,
      suppliesBefore: ruinsState.settlementSnapshot?.suppliesBefore ?? gameState.ship.supplies,
      goldBefore: ruinsState.settlementSnapshot?.goldBefore ?? gameState.crew.gold,
      healthAfter: gameState.ship.health,
      suppliesAfter: gameState.ship.supplies,
      goldAfter: gameState.crew.gold,
      roomsCompleted: ruinsState.exploration.totalRoomsCompleted,
      totalRooms: config.rooms.length,
      timeSpent,
      rewardsEarned: [...ruinsState.earnedRewards],
    };

    this.grantRuinsRewards(config);

    this.updateRuinsState(ruinsState);

    eventBus.emit('ruins:completed', {
      ruinsId,
      config,
      settlement: ruinsState.settlementSnapshot,
    });

    eventBus.emit('toast:show', {
      message: `🎉 遗迹「${config.name}」探索完成！`,
      duration: 5000,
    });

    this.showSettlementReport(ruinsState.settlementSnapshot, config);

    this.saveModule.saveGame('autosave');
  }

  private grantRuinsRewards(config: RuinsConfig): void {
    const ruinsState = this.getRuinsState();
    const gameState = this.stateManager.getState();
    const rewardItems: RewardItem[] = [];

    config.rooms.forEach(room => {
      const roomState = ruinsState.exploration.roomStates[room.id];
      if (roomState?.status !== 'completed') return;

      room.rewardIds.forEach(rewardId => {
        if (ruinsState.earnedRewards.includes(rewardId)) return;
        if (roomState.rewardsClaimed.includes(rewardId)) return;

        const reward = getRuinsReward(rewardId);
        if (!reward) return;

        const item = this.grantSingleReward(reward);
        if (item) {
          rewardItems.push(item);
        }
        ruinsState.earnedRewards.push(rewardId);
        roomState.rewardsClaimed.push(rewardId);
      });
    });

    this.updateRuinsState(ruinsState);

    if (rewardItems.length > 0) {
      const event: RewardGrantedEvent = {
        source: 'ruins',
        sourceId: config.id,
        sourceName: config.name,
        rewards: rewardItems,
        title: `遗迹奖励：${config.name}`,
        priority: 'high',
        timestamp: Date.now(),
      };
      eventBus.emit('reward:granted', event);
    }
  }

  private grantSingleReward(reward: RuinsReward): RewardItem | null {
    const gameState = this.stateManager.getState();
    const amount = reward.amount || 1;
    const rewardItem: RewardItem = {
      type: reward.type as any,
      amount,
      rarity: reward.rarity,
      name: reward.name,
    };

    switch (reward.type) {
      case 'supplies':
        this.stateManager.updateShip({
          supplies: Math.min(gameState.ship.supplies + amount, gameState.ship.maxSupplies),
        });
        break;

      case 'gold':
        this.stateManager.updateCrew({
          gold: gameState.crew.gold + amount,
        });
        break;

      case 'health':
        this.stateManager.updateShip({
          health: Math.min(gameState.ship.health + amount, gameState.ship.maxHealth),
        });
        eventBus.emit('ship:repaired');
        break;

      case 'exp': {
        const updatedMembers = gameState.crew.members.map(member => {
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

      case 'star':
        if (typeof reward.value === 'string') {
          this.stateManager.addDiscoveredStar(reward.value);
          rewardItem.value = reward.value;
        }
        break;

      case 'constellation':
        if (typeof reward.value === 'string') {
          this.stateManager.addDiscoveredConstellation(reward.value);
          rewardItem.value = reward.value;
        }
        break;

      case 'codex_entry':
        if (typeof reward.value === 'string') {
          this.codexModule.discoverEntry(reward.value);
          rewardItem.value = reward.value;
        }
        break;

      case 'chapter_unlock':
        if (typeof reward.value === 'string') {
          eventBus.emit('chapter:unlock', reward.value);
          rewardItem.value = reward.value;
        }
        break;

      case 'artifact':
      case 'crew_upgrade':
        break;

      default:
        return null;
    }

    return rewardItem;
  }

  private getRewardIcon(type: string): string {
    const icons: Record<string, string> = {
      supplies: '📦',
      gold: '💰',
      health: '❤️',
      exp: '⭐',
      star: '⭐',
      constellation: '✨',
      codex_entry: '📖',
      chapter_unlock: '🔓',
      artifact: '🏺',
      crew_upgrade: '👤',
    };
    return icons[type] || '🎁';
  }

  private showSettlementReport(
    snapshot: NonNullable<RuinsState['settlementSnapshot']>,
    config: RuinsConfig
  ): void {
    const healthDiff = snapshot.healthAfter - snapshot.healthBefore;
    const suppliesDiff = snapshot.suppliesAfter - snapshot.suppliesBefore;
    const goldDiff = snapshot.goldAfter - snapshot.goldBefore;

    const lines: string[] = [
      `📋 遗迹「${config.name}」探索结算`,
      `─────────────────`,
      `房间完成：${snapshot.roomsCompleted}/${snapshot.totalRooms}`,
      `探索用时：${Math.floor(snapshot.timeSpent)}秒`,
      `─────────────────`,
      `❤️ 船体：${snapshot.healthBefore} → ${snapshot.healthAfter} (${healthDiff >= 0 ? '+' : ''}${healthDiff})`,
      `📦 补给：${snapshot.suppliesBefore} → ${snapshot.suppliesAfter} (${suppliesDiff >= 0 ? '+' : ''}${suppliesDiff})`,
      `💰 金币：${snapshot.goldBefore} → ${snapshot.goldAfter} (${goldDiff >= 0 ? '+' : ''}${goldDiff})`,
      `─────────────────`,
      `获得奖励：${snapshot.rewardsEarned.length}件`,
    ];

    snapshot.rewardsEarned.forEach(rewardId => {
      const reward = getRuinsReward(rewardId);
      if (reward) {
        lines.push(`  ${this.getRewardIcon(reward.type)} ${reward.name} (${RARITY_NAMES[reward.rarity]})`);
      }
    });

    eventBus.emit('ruins:settlement', {
      ruinsId: config.id,
      report: lines.join('\n'),
      snapshot,
    });
  }

  public abandonRuins(): void {
    const ruinsState = this.getRuinsState();
    if (ruinsState.status !== 'in_progress') return;

    const config = getRuinsById(ruinsState.ruinsId!);
    ruinsState.status = 'abandoned';
    ruinsState.exploration.currentRoomId = null;
    ruinsState.exploration.enteredAt = null;

    this.updateRuinsState(ruinsState);
    this.puzzleTimer = null;

    eventBus.emit('ruins:abandoned', { ruinsId: ruinsState.ruinsId });
    eventBus.emit('toast:show', {
      message: `🚪 退出了遗迹探索`,
      duration: 3000,
    });
  }

  public moveToRoom(roomId: string): boolean {
    const ruinsState = this.getRuinsState();
    if (ruinsState.status !== 'in_progress') return false;

    const config = getRuinsById(ruinsState.ruinsId!);
    if (!config) return false;

    const room = config.rooms.find(r => r.id === roomId);
    if (!room) return false;

    const roomState = ruinsState.exploration.roomStates[roomId];
    if (!roomState || roomState.status === 'locked') {
      eventBus.emit('toast:show', { message: '此房间尚未解锁' });
      return false;
    }

    ruinsState.exploration.currentRoomId = roomId;
    if (!ruinsState.exploration.visitedRoomIds.includes(roomId)) {
      ruinsState.exploration.visitedRoomIds.push(roomId);
    }

    this.updateRuinsState(ruinsState);

    eventBus.emit('ruins:roomEntered', {
      ruinsId: ruinsState.ruinsId,
      roomId,
      room,
      roomState,
    });

    return true;
  }

  public triggerWeatherForPuzzle(weatherType: WeatherCondition): void {
    if (!this.weatherModule) return;

    const ruinsState = this.getRuinsState();
    if (ruinsState.status !== 'in_progress') return;

    const config = getRuinsById(ruinsState.ruinsId!);
    if (!config) return;

    const currentRoomId = ruinsState.exploration.currentRoomId;
    if (!currentRoomId) return;

    const room = config.rooms.find(r => r.id === currentRoomId);
    if (!room) return;

    if (room.puzzle.requiredWeatherType === weatherType) {
      const intensityMap: Record<string, number> = {
        fog: 0.5,
        storm: 0.6,
        meteor: 0.4,
        clear: 0,
        any_adverse: 0.5,
        any: 0,
      };

      const weatherTypeMap: Record<string, 'storm' | 'fog' | 'meteor' | 'clear'> = {
        fog: 'fog',
        storm: 'storm',
        meteor: 'meteor',
        clear: 'clear',
        any_adverse: 'storm',
        any: 'clear',
      };

      const mappedType = weatherTypeMap[weatherType] || 'clear';
      const intensity = intensityMap[weatherType] || 0.5;

      this.weatherModule.triggerManualWeather(mappedType, intensity, 60);

      eventBus.emit('toast:show', {
        message: `🌀 遗迹力量引发了${this.getWeatherName(weatherType)}`,
        duration: 3000,
      });
    }
  }

  private getWeatherName(type: string): string {
    const names: Record<string, string> = {
      storm: '暴风雨',
      fog: '浓雾',
      meteor: '流星雨',
      clear: '晴朗',
      any_adverse: '恶劣天气',
      any: '任意天气',
    };
    return names[type] || '未知天气';
  }

  private update(delta: number): void {
    const ruinsState = this.getRuinsState();
    if (ruinsState.status !== 'in_progress') return;

    if (this.puzzleTimer !== null) {
      this.puzzleTimer -= delta * 1000;
      if (this.puzzleTimer <= 0) {
        this.puzzleTimer = null;
        eventBus.emit('ruins:timeUp', { ruinsId: ruinsState.ruinsId });
        eventBus.emit('toast:show', {
          message: '⏰ 遗迹探索时间已到！',
          duration: 3000,
        });
        this.abandonRuins();
      }
    }

    const currentRoomId = ruinsState.exploration.currentRoomId;
    if (currentRoomId) {
      const roomState = ruinsState.exploration.roomStates[currentRoomId];
      if (roomState?.status === 'in_progress' && roomState.puzzleStartTime) {
        const config = getRuinsById(ruinsState.ruinsId!);
        if (config) {
          const room = config.rooms.find(r => r.id === currentRoomId);
          if (room?.puzzle.timeLimit) {
            const elapsed = (Date.now() - roomState.puzzleStartTime) / 1000;
            if (elapsed >= room.puzzle.timeLimit) {
              roomState.attemptsUsed++;
              if (roomState.attemptsUsed >= room.puzzle.maxAttempts) {
                roomState.status = 'failed';
                this.updateRuinsState(ruinsState);
                eventBus.emit('toast:show', {
                  message: `⏰ 谜题「${room.puzzle.name}」超时，尝试次数已用完`,
                  duration: 3000,
                });
                this.checkRuinsFailure(ruinsState.ruinsId!);
              } else {
                roomState.status = 'available';
                roomState.puzzleStartTime = null;
                this.updateRuinsState(ruinsState);
                eventBus.emit('toast:show', {
                  message: `⏰ 谜题「${room.puzzle.name}」超时，还剩 ${room.puzzle.maxAttempts - roomState.attemptsUsed} 次机会`,
                  duration: 3000,
                });
              }
            }
          }
        }
      }
    }
  }

  public getUnlockedRuins(): RuinsConfig[] {
    const ruinsState = this.getRuinsState();
    return hiddenRuins.filter(r => ruinsState.unlockedRuinsIds.includes(r.id));
  }

  public getAvailableRuinsForChapter(chapterId: string): RuinsConfig[] {
    const ruinsState = this.getRuinsState();
    return getRuinsForChapter(chapterId).filter(
      r =>
        ruinsState.unlockedRuinsIds.includes(r.id) &&
        !ruinsState.completedRuinsIds.includes(r.id)
    );
  }

  public getRuinsStatus(ruinsId: string): RuinsState['status'] {
    const ruinsState = this.getRuinsState();
    if (ruinsState.completedRuinsIds.includes(ruinsId)) return 'completed';
    if (ruinsState.ruinsId === ruinsId && ruinsState.status === 'in_progress') return 'in_progress';
    if (ruinsState.unlockedRuinsIds.includes(ruinsId)) return 'unlocked';
    return 'locked';
  }

  public getCurrentExplorationRoom(): string | null {
    const ruinsState = this.getRuinsState();
    return ruinsState.exploration.currentRoomId;
  }

  public getRemainingTime(): number {
    return this.puzzleTimer !== null ? Math.max(0, this.puzzleTimer / 1000) : 0;
  }

  public getRoomState(roomId: string): RuinsRoomState | null {
    const ruinsState = this.getRuinsState();
    const roomState = ruinsState.exploration.roomStates[roomId];
    return roomState ? { ...roomState } : null;
  }

  public getSerializableState(): RuinsState {
    return this.getRuinsState();
  }

  public loadState(savedState: RuinsState): void {
    this.stateManager.setState({
      ruins: {
        ...savedState,
        unlockedRuinsIds: [...savedState.unlockedRuinsIds],
        completedRuinsIds: [...savedState.completedRuinsIds],
        exploration: {
          ...savedState.exploration,
          visitedRoomIds: [...savedState.exploration.visitedRoomIds],
          roomStates: { ...savedState.exploration.roomStates },
        },
        earnedRewards: [...savedState.earnedRewards],
        flags: { ...savedState.flags },
      },
    });
    this.checkAllUnlockConditions();
  }

  private resetState(): void {
    this.stateManager.setState({
      ruins: { ...DEFAULT_RUINS_STATE, exploration: { ...DEFAULT_EXPLORATION } },
    });
    this.currentChapterId = null;
    this.puzzleTimer = null;
  }

  public setFlag(key: string, value: unknown): void {
    const ruinsState = this.getRuinsState();
    ruinsState.flags[key] = value;
    this.updateRuinsState(ruinsState);
  }

  public getFlag(key: string): unknown {
    const ruinsState = this.getRuinsState();
    return ruinsState.flags[key];
  }

  public dispose(): void {
    this.puzzleTimer = null;
  }
}
