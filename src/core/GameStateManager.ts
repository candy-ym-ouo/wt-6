import { GameState, GameSettings, ShipState, CrewState, CrewEventBonus, TradeState, AchievementState, CodexState, TaskState, FogOfWarState, FogCell, DEFAULT_FOG_CONFIG, ShipDamageState, GatheringState, RuinsState, ChapterBranchState, BranchRouteProgress, Route, RouteBranchCondition, WaypointExplorationState, CompletionStats, Chapter, WeatherWarningState, ChapterFailureState, ChapterRetryState, DEFAULT_FAILURE_STATE, DEFAULT_RETRY_STATE, PreservedProgress, FailureContext, RetryOptions, DEFAULT_RETRY_OPTIONS, FailureReason } from '../types';
import { eventBus } from '../utils/EventBus';

type UpdateCallback = (delta: number) => void;

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.7,
  musicVolume: 0.5,
  sfxVolume: 0.6,
  ambientVolume: 0.4,
  starDensity: 1.0,
  weatherEffects: true,
  showLabels: true,
  showMinimap: true
};

const DEFAULT_DAMAGE_STATE: ShipDamageState = {
  damageRecords: [],
  repairRecords: [],
  damageThreshold: {
    critical: 0.2,
    severe: 0.4,
    moderate: 0.6,
    minor: 0.8,
  },
  lastDamageTime: 0,
  lastRepairTime: 0,
  wearAccumulator: 0,
};

const DEFAULT_SHIP: ShipState = {
  speed: 0,
  maxSpeed: 15,
  health: 100,
  maxHealth: 100,
  supplies: 100,
  maxSupplies: 100,
  heading: 0,
  damage: { ...DEFAULT_DAMAGE_STATE }
};

const DEFAULT_CREW: CrewState = {
  members: [],
  recruits: [],
  maxCrew: 8,
  gold: 500,
  efficiencyBonuses: {
    speed: 0,
    weatherResist: 0,
    healthRegen: 0,
    supplySave: 0,
    moraleBoost: 0,
    starVision: 0,
  },
};

const DEFAULT_TRADE: TradeState = {
  currentPortId: null,
  portPrices: {},
  lastRefreshTime: {},
  priceHistory: {},
  inventory: {},
  unlockedChapterItems: []
};

const DEFAULT_ACHIEVEMENTS: AchievementState = {
  achievements: [],
  totalUnlocked: 0,
  totalAchievements: 0
};

const DEFAULT_CODEX: CodexState = {
  entries: {},
  totalDiscovered: 0,
  totalEntries: 0
};

const DEFAULT_TASKS: TaskState = {
  activeTasks: [],
  completedTaskIds: [],
  explorationStats: {
    totalDistanceTraveled: 0,
    sessionDistanceTraveled: 0,
    sessionStarsDiscovered: 0,
    positionsVisited: [],
    lastPosition: { x: 0, y: 0, z: 0 },
  },
  weatherSurvivalStats: {},
  dynamicTaskHistory: [],
};

const DEFAULT_FOG_OF_WAR: FogOfWarState = {
  gridSize: DEFAULT_FOG_CONFIG.gridSize,
  cellSize: DEFAULT_FOG_CONFIG.cellSize,
  cells: {},
  mapBounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
  baseViewRadius: DEFAULT_FOG_CONFIG.baseViewRadius,
  waypointBonusRadius: DEFAULT_FOG_CONFIG.waypointBonusRadius,
};

const DEFAULT_GATHERING: GatheringState = {
  availablePoints: [],
  gatheringProgress: null,
  gatheredPoints: {},
  cooldowns: {},
  discoveredClues: [],
  flags: {},
  totalGatherCount: 0,
};

const DEFAULT_RUINS: RuinsState = {
  ruinsId: null,
  status: 'locked',
  unlockedRuinsIds: [],
  completedRuinsIds: [],
  exploration: {
    currentRoomId: null,
    visitedRoomIds: [],
    roomStates: {},
    totalRoomsCompleted: 0,
    enteredAt: null,
  },
  earnedRewards: [],
  settlementSnapshot: null,
  flags: {},
};

const DEFAULT_WAYPOINT_EXPLORATION: WaypointExplorationState = {
  exploredWaypoints: {},
  claimedRewards: {},
  totalExplored: 0,
  totalRewardsClaimed: 0,
};

const DEFAULT_WEATHER_WARNING: WeatherWarningState = {
  activeWarning: null,
  phase: 'idle',
  acknowledgedWarnings: [],
  warningHistory: [],
};

const DEFAULT_STATE: GameState = {
  currentChapterId: null,
  currentPosition: { x: 0, y: 0, z: 0 },
  currentRoute: null,
  currentRouteProgress: 0,
  discoveredStars: [],
  discoveredConstellations: [],
  visitedPoints: [],
  completedObjectives: [],
  completedChapters: [],
  activeWeather: null,
  playTime: 0,
  chapterStartTime: null,
  settings: { ...DEFAULT_SETTINGS },
  ship: { ...DEFAULT_SHIP },
  crew: { ...DEFAULT_CREW },
  activeCrewBonuses: [],
  trade: { ...DEFAULT_TRADE },
  achievements: { ...DEFAULT_ACHIEVEMENTS },
  codex: { ...DEFAULT_CODEX },
  tasks: { ...DEFAULT_TASKS, explorationStats: { ...DEFAULT_TASKS.explorationStats } },
  fogOfWar: { ...DEFAULT_FOG_OF_WAR, cells: {} },
  gathering: { ...DEFAULT_GATHERING },
  ruins: { ...DEFAULT_RUINS, unlockedRuinsIds: [], completedRuinsIds: [], earnedRewards: [], exploration: { ...DEFAULT_RUINS.exploration, visitedRoomIds: [], roomStates: {} } },
  chapterBranches: {},
  selectedBranchRoute: null,
  unlockedBranchRoutes: [],
  waypointExploration: { ...DEFAULT_WAYPOINT_EXPLORATION },
  weatherWarning: { ...DEFAULT_WEATHER_WARNING },
  failure: { ...DEFAULT_FAILURE_STATE },
  retry: { ...DEFAULT_RETRY_STATE },
};

export class GameStateManager {
  private static instance: GameStateManager;
  private state: GameState;
  private updateCallbacks: UpdateCallback[] = [];

  private constructor() {
    this.state = { ...DEFAULT_STATE };
  }

  public onUpdate(callback: UpdateCallback): void {
    this.updateCallbacks.push(callback);
  }

  public triggerUpdate(delta: number): void {
    this.updateCallbacks.forEach(callback => callback(delta));
  }

  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  public getState(): GameState {
    return { ...this.state };
  }

  public setState(partialState: Partial<GameState>): void {
    this.state = { ...this.state, ...partialState };
    eventBus.emit('state:changed', this.state);
  }

  public updateShip(partialShip: Partial<ShipState>): void {
    this.state.ship = { ...this.state.ship, ...partialShip };
    eventBus.emit('ship:updated', this.state.ship);
  }

  public updateSettings(partialSettings: Partial<GameSettings>): void {
    this.state.settings = { ...this.state.settings, ...partialSettings };
    eventBus.emit('settings:updated', this.state.settings);
  }

  public resetShip(): void {
    this.state.ship = { ...DEFAULT_SHIP, damage: { ...DEFAULT_DAMAGE_STATE, damageRecords: [], repairRecords: [] } };
    eventBus.emit('ship:updated', this.state.ship);
  }

  public reset(): void {
    this.state = { 
      ...DEFAULT_STATE, 
      settings: { ...this.state.settings },
      achievements: { ...DEFAULT_ACHIEVEMENTS },
      codex: { ...DEFAULT_CODEX },
      tasks: { ...DEFAULT_TASKS, explorationStats: { ...DEFAULT_TASKS.explorationStats } },
      fogOfWar: { ...DEFAULT_FOG_OF_WAR, cells: {} },
      gathering: { ...DEFAULT_GATHERING },
      ruins: { ...DEFAULT_RUINS, unlockedRuinsIds: [], completedRuinsIds: [], earnedRewards: [], exploration: { ...DEFAULT_RUINS.exploration, visitedRoomIds: [], roomStates: {} } },
      waypointExploration: { ...DEFAULT_WAYPOINT_EXPLORATION },
      failure: { ...DEFAULT_FAILURE_STATE },
      retry: { ...DEFAULT_RETRY_STATE }
    };
    this.updateCallbacks = [];
    eventBus.emit('state:reset', this.state);
  }

  public addDiscoveredStar(starId: string): void {
    if (!this.state.discoveredStars.includes(starId)) {
      this.state.discoveredStars.push(starId);
      eventBus.emit('star:discovered', starId);
      eventBus.emit('state:changed', this.state);
    }
  }

  public addDiscoveredConstellation(constellationId: string): void {
    if (!this.state.discoveredConstellations.includes(constellationId)) {
      this.state.discoveredConstellations.push(constellationId);
      eventBus.emit('constellation:discovered', constellationId);
      eventBus.emit('state:changed', this.state);
    }
  }

  public addVisitedPoint(pointId: string): void {
    if (!this.state.visitedPoints.includes(pointId)) {
      this.state.visitedPoints.push(pointId);
      eventBus.emit('point:visited', pointId);
      eventBus.emit('state:changed', this.state);
    }
  }

  public addCompletedObjective(objectiveId: string): void {
    if (!this.state.completedObjectives.includes(objectiveId)) {
      this.state.completedObjectives.push(objectiveId);
      eventBus.emit('objective:completed', objectiveId);
      eventBus.emit('state:changed', this.state);
    }
  }

  public addCompletedChapter(chapterId: string): void {
    if (!this.state.completedChapters.includes(chapterId)) {
      this.state.completedChapters.push(chapterId);
      eventBus.emit('chapter:completed', chapterId);
      eventBus.emit('state:changed', this.state);
    }
  }

  public isStarDiscovered(starId: string): boolean {
    return this.state.discoveredStars.includes(starId);
  }

  public isConstellationDiscovered(constellationId: string): boolean {
    return this.state.discoveredConstellations.includes(constellationId);
  }

  public isPointVisited(pointId: string): boolean {
    return this.state.visitedPoints.includes(pointId);
  }

  public isObjectiveCompleted(objectiveId: string): boolean {
    return this.state.completedObjectives.includes(objectiveId);
  }

  public isChapterCompleted(chapterId: string): boolean {
    return this.state.completedChapters.includes(chapterId);
  }

  private ensureWaypointExplorationState(): void {
    if (!this.state.waypointExploration) {
      this.state.waypointExploration = { ...DEFAULT_WAYPOINT_EXPLORATION };
    }
  }

  public addExploredWaypoint(waypointId: string): void {
    this.ensureWaypointExplorationState();
    if (!this.state.waypointExploration!.exploredWaypoints[waypointId]) {
      this.state.waypointExploration!.exploredWaypoints[waypointId] = true;
      this.state.waypointExploration!.totalExplored++;
      eventBus.emit('waypoint:explored', waypointId);
      eventBus.emit('state:changed', this.state);
    }
  }

  public isWaypointExplored(waypointId: string): boolean {
    this.ensureWaypointExplorationState();
    return this.state.waypointExploration!.exploredWaypoints[waypointId] === true;
  }

  public claimWaypointRewards(waypointId: string): void {
    this.ensureWaypointExplorationState();
    if (!this.state.waypointExploration!.claimedRewards[waypointId]) {
      this.state.waypointExploration!.claimedRewards[waypointId] = true;
      this.state.waypointExploration!.totalRewardsClaimed++;
      eventBus.emit('waypoint:rewardsClaimed', waypointId);
      eventBus.emit('state:changed', this.state);
    }
  }

  public areWaypointRewardsClaimed(waypointId: string): boolean {
    this.ensureWaypointExplorationState();
    return this.state.waypointExploration!.claimedRewards[waypointId] === true;
  }

  public getWaypointExplorationState(): WaypointExplorationState {
    this.ensureWaypointExplorationState();
    return {
      ...this.state.waypointExploration!,
      exploredWaypoints: { ...this.state.waypointExploration!.exploredWaypoints },
      claimedRewards: { ...this.state.waypointExploration!.claimedRewards },
    };
  }

  public setWaypointExplorationState(state: WaypointExplorationState): void {
    this.state.waypointExploration = {
      ...state,
      exploredWaypoints: { ...state.exploredWaypoints },
      claimedRewards: { ...state.claimedRewards },
    };
    eventBus.emit('state:changed', this.state);
  }

  public updatePlayTime(delta: number): void {
    this.state.playTime += delta;
  }

  public setChapterStartTime(time: number): void {
    this.state.chapterStartTime = time;
    eventBus.emit('state:changed', this.state);
  }

  public getChapterElapsedTime(): number {
    if (this.state.chapterStartTime === null) return 0;
    return Math.max(0, this.state.playTime - this.state.chapterStartTime);
  }

  public setCurrentPosition(x: number, y: number, z: number): void {
    this.state.currentPosition = { x, y, z };
  }

  public updateCrew(partialCrew: Partial<CrewState>): void {
    this.state.crew = { ...this.state.crew, ...partialCrew };
    eventBus.emit('crew:state_updated', this.state.crew);
    eventBus.emit('state:changed', this.state);
  }

  public setActiveCrewBonuses(bonuses: CrewEventBonus[]): void {
    this.state.activeCrewBonuses = [...bonuses];
    eventBus.emit('crew:bonuses_changed', bonuses);
    eventBus.emit('state:changed', this.state);
  }

  public resetCrew(): void {
    this.state.crew = { ...DEFAULT_CREW };
    this.state.activeCrewBonuses = [];
    eventBus.emit('crew:reset', this.state.crew);
    eventBus.emit('state:changed', this.state);
  }

  public initFogOfWar(mapBounds: { minX: number; maxX: number; minZ: number; maxZ: number }): void {
    this.state.fogOfWar = {
      ...DEFAULT_FOG_OF_WAR,
      mapBounds,
      cells: {},
    };
    eventBus.emit('fog:initialized', this.state.fogOfWar);
    eventBus.emit('state:changed', this.state);
  }

  public updateFogCell(cellX: number, cellZ: number, cellData: Partial<FogCell>): void {
    if (!this.state.fogOfWar) return;
    const key = `${cellX},${cellZ}`;
    const existingCell = this.state.fogOfWar.cells[key];
    this.state.fogOfWar.cells[key] = {
      x: cellX,
      z: cellZ,
      explored: existingCell?.explored ?? false,
      visibility: existingCell?.visibility ?? 0,
      lastVisitedAt: existingCell?.lastVisitedAt,
      ...cellData,
    };
    eventBus.emit('fog:cellUpdated', { cellX, cellZ, cell: this.state.fogOfWar.cells[key] });
    eventBus.emit('state:changed', this.state);
  }

  public exploreArea(centerX: number, centerZ: number, radius: number): void {
    if (!this.state.fogOfWar) return;
    const { cellSize, mapBounds } = this.state.fogOfWar;
    const cellRadius = Math.ceil(radius / cellSize);
    const centerCellX = Math.floor(centerX / cellSize);
    const centerCellZ = Math.floor(centerZ / cellSize);
    const updatedCells: Array<{ x: number; z: number }> = [];

    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dz = -cellRadius; dz <= cellRadius; dz++) {
        const cellX = centerCellX + dx;
        const cellZ = centerCellZ + dz;
        const worldX = cellX * cellSize;
        const worldZ = cellZ * cellSize;
        
        if (worldX < mapBounds.minX || worldX > mapBounds.maxX ||
            worldZ < mapBounds.minZ || worldZ > mapBounds.maxZ) {
          continue;
        }

        const dist = Math.sqrt(dx * dx + dz * dz) * cellSize;
        if (dist <= radius) {
          const visibility = Math.max(0, 1 - dist / radius);
          const key = `${cellX},${cellZ}`;
          const existingCell = this.state.fogOfWar.cells[key];
          
          if (!existingCell || !existingCell.explored || visibility > existingCell.visibility) {
            this.state.fogOfWar.cells[key] = {
              x: cellX,
              z: cellZ,
              explored: true,
              visibility: Math.max(existingCell?.visibility || 0, visibility),
              lastVisitedAt: Date.now(),
            };
            updatedCells.push({ x: cellX, z: cellZ });
          }
        }
      }
    }

    if (updatedCells.length > 0) {
      eventBus.emit('fog:areaExplored', { centerX, centerZ, radius, updatedCells });
      eventBus.emit('state:changed', this.state);
    }
  }

  public isCellExplored(cellX: number, cellZ: number): boolean {
    if (!this.state.fogOfWar) return false;
    const key = `${cellX},${cellZ}`;
    return this.state.fogOfWar.cells[key]?.explored || false;
  }

  public getCellVisibility(cellX: number, cellZ: number): number {
    if (!this.state.fogOfWar) return 0;
    const key = `${cellX},${cellZ}`;
    return this.state.fogOfWar.cells[key]?.visibility || 0;
  }

  public isPositionExplored(x: number, z: number): boolean {
    if (!this.state.fogOfWar) return false;
    const cellX = Math.floor(x / this.state.fogOfWar.cellSize);
    const cellZ = Math.floor(z / this.state.fogOfWar.cellSize);
    return this.isCellExplored(cellX, cellZ);
  }

  public getExploredCellsCount(): number {
    if (!this.state.fogOfWar) return 0;
    return Object.values(this.state.fogOfWar.cells).filter(c => c.explored).length;
  }

  public getTotalCellsCount(): number {
    if (!this.state.fogOfWar) return 0;
    const { mapBounds, cellSize } = this.state.fogOfWar;
    const width = Math.ceil((mapBounds.maxX - mapBounds.minX) / cellSize);
    const height = Math.ceil((mapBounds.maxZ - mapBounds.minZ) / cellSize);
    return width * height;
  }

  public getFogOfWarState(): FogOfWarState | undefined {
    return this.state.fogOfWar ? { ...this.state.fogOfWar } : undefined;
  }

  public setFogOfWarState(fogState: FogOfWarState): void {
    this.state.fogOfWar = { ...fogState };
    eventBus.emit('fog:loaded', this.state.fogOfWar);
    eventBus.emit('state:changed', this.state);
  }

  public initChapterBranchState(chapterId: string, routes: Route[]): void {
    if (!this.state.chapterBranches) {
      this.state.chapterBranches = {};
    }

    if (this.state.chapterBranches[chapterId]) {
      return;
    }

    const branchGroupStates: Record<string, { selectedRouteId: string | null; completedRouteIds: string[] }> = {};
    const routeProgress: Record<string, BranchRouteProgress> = {};

    const groups = new Set<string>();
    routes.forEach(route => {
      const group = route.branchGroup || 'default';
      groups.add(group);
    });

    groups.forEach(group => {
      const groupRoutes = routes.filter(r => (r.branchGroup || 'default') === group);
      const defaultRoute = groupRoutes.find(r => r.isDefault) || groupRoutes[0];
      branchGroupStates[group] = {
        selectedRouteId: defaultRoute ? defaultRoute.id : null,
        completedRouteIds: []
      };
    });

    routes.forEach(route => {
      const isDefault = route.isDefault || (!route.branchGroup && routes.indexOf(route) === 0);
      routeProgress[route.id] = {
        routeId: route.id,
        unlocked: isDefault || !route.unlockConditions || route.unlockConditions.length === 0,
        selected: isDefault,
        completed: false,
        overallProgress: 0,
        currentPointIndex: 0,
        visitedPoints: [],
      };
    });

    this.state.chapterBranches[chapterId] = {
      chapterId,
      branchGroupStates,
      routeProgress,
      branchFlags: {}
    };

    const unlockedRoutes = routes
      .filter(r => routeProgress[r.id].unlocked)
      .map(r => r.id);
    this.state.unlockedBranchRoutes = unlockedRoutes;

    const firstSelected = routes.find(r => routeProgress[r.id].selected);
    this.state.selectedBranchRoute = firstSelected ? firstSelected.id : (routes[0]?.id || null);

    eventBus.emit('branches:initialized', { chapterId, routes });
    eventBus.emit('state:changed', this.state);
  }

  public getChapterBranchState(chapterId: string): ChapterBranchState | undefined {
    return this.state.chapterBranches?.[chapterId];
  }

  public evaluateRouteCondition(condition: RouteBranchCondition): boolean {
    const { type, targetId, value, operator = 'eq' } = condition;
    let actualValue: unknown;

    switch (type) {
      case 'objective_completed':
        actualValue = targetId ? this.isObjectiveCompleted(targetId) : this.state.completedObjectives.length > 0;
        if (typeof value === 'boolean') {
          return actualValue === value;
        }
        return !!actualValue;

      case 'stars_discovered':
        actualValue = this.state.discoveredStars.length;
        return this.compareValues(actualValue as number, value as number, operator);

      case 'constellations_discovered':
        actualValue = this.state.discoveredConstellations.length;
        return this.compareValues(actualValue as number, value as number, operator);

      case 'points_visited':
        actualValue = this.state.visitedPoints.length;
        return this.compareValues(actualValue as number, value as number, operator);

      case 'flag':
        actualValue = this.state.chapterBranches?.[this.state.currentChapterId || '']?.branchFlags?.[targetId || ''];
        return actualValue === value;

      case 'min_play_time':
        actualValue = this.state.playTime;
        return this.compareValues(actualValue as number, value as number, operator);

      default:
        return false;
    }
  }

  private compareValues(actual: number, expected: number, operator: string): boolean {
    switch (operator) {
      case 'gte': return actual >= expected;
      case 'lte': return actual <= expected;
      case 'gt': return actual > expected;
      case 'lt': return actual < expected;
      case 'eq':
      default: return actual === expected;
    }
  }

  public checkAndUnlockBranchRoutes(chapterId: string, routes: Route[]): string[] {
    const branchState = this.getChapterBranchState(chapterId);
    if (!branchState) return [];

    const newlyUnlocked: string[] = [];

    routes.forEach(route => {
      const progress = branchState.routeProgress[route.id];
      if (!progress || progress.unlocked) return;

      if (!route.unlockConditions || route.unlockConditions.length === 0) {
        progress.unlocked = true;
        progress.unlockedAt = Date.now();
        newlyUnlocked.push(route.id);
        eventBus.emit('route:unlocked', route);
        return;
      }

      const allConditionsMet = route.unlockConditions.every(condition => 
        this.evaluateRouteCondition(condition)
      );

      if (allConditionsMet) {
        progress.unlocked = true;
        progress.unlockedAt = Date.now();
        newlyUnlocked.push(route.id);
        eventBus.emit('route:unlocked', route);
      }
    });

    if (newlyUnlocked.length > 0) {
      if (!this.state.unlockedBranchRoutes) {
        this.state.unlockedBranchRoutes = [];
      }
      newlyUnlocked.forEach(id => {
        if (!this.state.unlockedBranchRoutes!.includes(id)) {
          this.state.unlockedBranchRoutes!.push(id);
        }
      });
      eventBus.emit('branches:updated', branchState);
      eventBus.emit('state:changed', this.state);
    }

    return newlyUnlocked;
  }

  public selectBranchRoute(chapterId: string, routeId: string): boolean {
    const branchState = this.getChapterBranchState(chapterId);
    if (!branchState) return false;

    const progress = branchState.routeProgress[routeId];
    if (!progress || !progress.unlocked) return false;

    const route = Object.values(branchState.routeProgress).find(r => r.routeId === routeId);
    if (!route) return false;

    Object.entries(branchState.routeProgress).forEach(([id, p]) => {
      p.selected = (id === routeId);
    });

    this.state.selectedBranchRoute = routeId;
    eventBus.emit('route:selected', routeId);
    eventBus.emit('branches:updated', branchState);
    eventBus.emit('state:changed', this.state);
    return true;
  }

  public updateBranchRouteProgress(chapterId: string, routeId: string, progressData: Partial<BranchRouteProgress>): void {
    const branchState = this.getChapterBranchState(chapterId);
    if (!branchState || !branchState.routeProgress[routeId]) return;

    branchState.routeProgress[routeId] = {
      ...branchState.routeProgress[routeId],
      ...progressData
    };

    eventBus.emit('route:progress_updated', { routeId, progress: branchState.routeProgress[routeId] });
    eventBus.emit('branches:updated', branchState);
    eventBus.emit('state:changed', this.state);
  }

  public completeBranchRoute(chapterId: string, routeId: string): void {
    const branchState = this.getChapterBranchState(chapterId);
    if (!branchState || !branchState.routeProgress[routeId]) return;

    const progress = branchState.routeProgress[routeId];
    progress.completed = true;
    progress.completedAt = Date.now();
    progress.overallProgress = 1;

    const group = Object.keys(branchState.branchGroupStates).find(g => {
      const routesInGroup = branchState.branchGroupStates[g];
      return routesInGroup.selectedRouteId === routeId;
    });

    if (group && !branchState.branchGroupStates[group].completedRouteIds.includes(routeId)) {
      branchState.branchGroupStates[group].completedRouteIds.push(routeId);
    }

    eventBus.emit('route:completed_branch', { routeId, chapterId });
    eventBus.emit('branches:updated', branchState);
    eventBus.emit('state:changed', this.state);
  }

  public setBranchFlag(chapterId: string, flag: string, value: unknown): void {
    const branchState = this.getChapterBranchState(chapterId);
    if (!branchState) return;

    branchState.branchFlags[flag] = value;
    eventBus.emit('branch:flag_set', { chapterId, flag, value });
    eventBus.emit('branches:updated', branchState);
    eventBus.emit('state:changed', this.state);
  }

  public getBranchFlag(chapterId: string, flag: string): unknown {
    return this.getChapterBranchState(chapterId)?.branchFlags[flag];
  }

  public getSelectedBranchRoute(): string | null {
    return this.state.selectedBranchRoute || null;
  }

  public isBranchRouteUnlocked(routeId: string): boolean {
    return this.state.unlockedBranchRoutes?.includes(routeId) || false;
  }

  public getBranchRouteProgress(chapterId: string, routeId: string): BranchRouteProgress | undefined {
    return this.getChapterBranchState(chapterId)?.routeProgress[routeId];
  }

  public setChapterBranches(chapterBranches: Record<string, ChapterBranchState>): void {
    this.state.chapterBranches = { ...chapterBranches };
    eventBus.emit('branches:loaded', this.state.chapterBranches);
    eventBus.emit('state:changed', this.state);
  }

  public getChapterStarsStats(chapter: Chapter): { total: number; discovered: number; hidden: number; hiddenDiscovered: number; normal: number; normalDiscovered: number } {
    const stars = chapter.stars.filter(s => s.isClickable);
    const total = stars.length;
    const hidden = stars.filter(s => s.hidden).length;
    const normal = stars.filter(s => !s.hidden).length;
    
    const discovered = stars.filter(s => this.isStarDiscovered(s.id)).length;
    const hiddenDiscovered = stars.filter(s => s.hidden && this.isStarDiscovered(s.id)).length;
    const normalDiscovered = stars.filter(s => !s.hidden && this.isStarDiscovered(s.id)).length;
    
    return { total, discovered, hidden, hiddenDiscovered, normal, normalDiscovered };
  }

  public getHiddenStarRevealProgress(chapter: Chapter): number {
    const stats = this.getChapterStarsStats(chapter);
    if (stats.normal === 0) return 0;
    return stats.normalDiscovered / stats.normal;
  }

  public isHiddenStarRevealed(starId: string, chapter: Chapter): boolean {
    const star = chapter.stars.find(s => s.id === starId);
    if (!star || !star.hidden) return true;
    
    const revealProgress = this.getHiddenStarRevealProgress(chapter);
    return revealProgress >= 0.6;
  }

  public getCompletionStats(chapters: Chapter[]): CompletionStats {
    const completedChapters = this.state.completedChapters.length;
    const totalChapters = chapters.length;
    const chapterPercentage = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

    let totalStars = 0;
    let totalHiddenStars = 0;
    let totalConstellations = 0;
    chapters.forEach(ch => {
      totalStars += ch.stars.filter(s => s.isClickable && !s.hidden).length;
      totalHiddenStars += ch.stars.filter(s => s.isClickable && s.hidden).length;
      totalConstellations += ch.constellations.length;
    });

    const normalStarIds = new Set<string>();
    const hiddenStarIds = new Set<string>();
    chapters.forEach(ch => {
      ch.stars.forEach(s => {
        if (s.isClickable) {
          if (s.hidden) {
            hiddenStarIds.add(s.id);
          } else {
            normalStarIds.add(s.id);
          }
        }
      });
    });

    const discoveredNormalStars = this.state.discoveredStars.filter(id => normalStarIds.has(id)).length;
    const discoveredHiddenStars = this.state.discoveredStars.filter(id => hiddenStarIds.has(id)).length;
    const discoveredConstellations = this.state.discoveredConstellations.length;
    
    const starPercentage = totalStars > 0 ? Math.round((Math.min(discoveredNormalStars, totalStars) / totalStars) * 100) : 0;
    const hiddenStarPercentage = totalHiddenStars > 0 ? Math.round((Math.min(discoveredHiddenStars, totalHiddenStars) / totalHiddenStars) * 100) : 0;
    const constellationPercentage = totalConstellations > 0 ? Math.round((Math.min(discoveredConstellations, totalConstellations) / totalConstellations) * 100) : 0;

    const overallPercentage = totalChapters > 0
      ? Math.round((chapterPercentage * 0.3 + starPercentage * 0.35 + constellationPercentage * 0.35))
      : 0;

    return {
      chapterProgress: { completed: completedChapters, total: totalChapters, percentage: chapterPercentage },
      starDiscovery: { discovered: discoveredNormalStars, total: totalStars, percentage: starPercentage },
      constellationUnlock: { unlocked: discoveredConstellations, total: totalConstellations, percentage: constellationPercentage },
      hiddenStars: { discovered: discoveredHiddenStars, total: totalHiddenStars, percentage: hiddenStarPercentage },
      totalPlayTime: this.state.playTime,
      overallPercentage,
    };
  }

  public resetChapter(): void {
    const chapterId = this.state.currentChapterId;
    if (chapterId && this.state.chapterBranches) {
      delete this.state.chapterBranches[chapterId];
    }
    this.state.selectedBranchRoute = null;
    this.state.unlockedBranchRoutes = [];
    this.state.chapterStartTime = null;
  }

  private ensureFailureState(): void {
    if (!this.state.failure) {
      this.state.failure = { ...DEFAULT_FAILURE_STATE };
    }
  }

  private ensureRetryState(): void {
    if (!this.state.retry) {
      this.state.retry = { ...DEFAULT_RETRY_STATE };
    }
  }

  public getFailureState(): ChapterFailureState {
    this.ensureFailureState();
    return { ...this.state.failure! };
  }

  public getRetryState(): ChapterRetryState {
    this.ensureRetryState();
    return { ...this.state.retry! };
  }

  public setFailureState(failureState: Partial<ChapterFailureState>): void {
    this.ensureFailureState();
    this.state.failure = { ...this.state.failure!, ...failureState };
    eventBus.emit('failure:stateChanged', this.state.failure);
    eventBus.emit('state:changed', this.state);
  }

  public setRetryState(retryState: Partial<ChapterRetryState>): void {
    this.ensureRetryState();
    this.state.retry = { ...this.state.retry!, ...retryState };
    eventBus.emit('retry:stateChanged', this.state.retry);
    eventBus.emit('state:changed', this.state);
  }

  public createProgressSnapshot(chapter: Chapter): PreservedProgress {
    const chapterStarIds = chapter.stars.map(s => s.id);
    const chapterConstellationIds = chapter.constellations.map(c => c.id);
    const chapterPointIds = chapter.routePoints.map(p => p.id);
    const chapterObjectiveIds = chapter.objectives.map(o => o.id);

    const discoveredHiddenStars = chapter.stars
      .filter(s => s.hidden && this.isStarDiscovered(s.id))
      .map(s => s.id);

    const unlockedChapters = this.state.completedChapters
      .map(id => id)
      .filter(id => id !== chapter.id);

    if (this.state.currentChapterId) {
      const nextIndex = this.state.completedChapters.indexOf(this.state.currentChapterId) + 1;
      if (nextIndex > 0 && nextIndex < this.state.completedChapters.length) {
        const nextId = this.state.completedChapters[nextIndex];
        if (!unlockedChapters.includes(nextId)) {
          unlockedChapters.push(nextId);
        }
      }
    }

    const codexEntries = Object.entries(this.state.codex?.entries || {})
      .filter(([_, entry]) => entry.discovered)
      .map(([id]) => id);

    const achievements = (this.state.achievements?.achievements || [])
      .filter(a => a.unlocked)
      .map(a => a.achievementId);

    return {
      discoveredStars: this.state.discoveredStars.filter(id => chapterStarIds.includes(id)),
      discoveredConstellations: this.state.discoveredConstellations.filter(id => chapterConstellationIds.includes(id)),
      visitedPoints: this.state.visitedPoints.filter(id => chapterPointIds.includes(id)),
      completedObjectives: this.state.completedObjectives.filter(id => chapterObjectiveIds.includes(id)),
      completedChapters: [...this.state.completedChapters],
      unlockedChapters,
      unlockedBranchRoutes: [...(this.state.unlockedBranchRoutes || [])],
      discoveredHiddenStars,
      codexEntries,
      achievements,
      crewMembers: this.state.crew.members.map(m => ({ ...m })),
      gold: this.state.crew.gold,
      waypointExploration: this.getWaypointExplorationState(),
    };
  }

  public reportChapterFailure(
    chapter: Chapter,
    reason: FailureReason,
    reasonDescription: string
  ): FailureContext {
    this.ensureFailureState();
    const failureState = this.state.failure!;

    const currentRetryCount = failureState.currentRetryCount;
    const canRetry = currentRetryCount < failureState.maxRetries;

    const progress = this.createProgressSnapshot(chapter);

    const context: FailureContext = {
      chapterId: chapter.id,
      chapterName: chapter.name,
      reason,
      reasonDescription,
      timestamp: Date.now(),
      playTime: this.state.playTime,
      chapterPlayTime: this.getChapterElapsedTime(),
      shipHealth: this.state.ship.health,
      shipSupplies: this.state.ship.supplies,
      completedObjectivesCount: chapter.objectives.filter(o => this.isObjectiveCompleted(o.id)).length,
      totalObjectivesCount: chapter.objectives.length,
      discoveredStarsCount: chapter.stars.filter(s => this.isStarDiscovered(s.id)).length,
      totalStarsCount: chapter.stars.filter(s => s.isClickable).length,
      discoveredConstellationsCount: chapter.constellations.filter(c => this.isConstellationDiscovered(c.id)).length,
      totalConstellationsCount: chapter.constellations.length,
      currentPosition: { ...this.state.currentPosition },
      currentRouteId: this.state.currentRoute,
      activeWeatherId: this.state.activeWeather?.id || null,
      retryCount: currentRetryCount,
    };

    this.setFailureState({
      isFailed: true,
      failureContext: context,
      preservedProgress: progress,
      canRetry,
      retryOptions: { ...DEFAULT_RETRY_OPTIONS },
    });

    eventBus.emit('chapter:failed', {
      context,
      preservedProgress: progress,
      availableOptions: { ...DEFAULT_RETRY_OPTIONS },
    });

    return context;
  }

  public prepareForRetry(chapterId: string, options: Partial<RetryOptions>): RetryOptions {
    const failureState = this.getFailureState();
    if (!failureState.preservedProgress || !failureState.failureContext) {
      throw new Error('No failure state to retry from');
    }

    const retryOptions: RetryOptions = { ...DEFAULT_RETRY_OPTIONS, ...options };
    const newRetryCount = failureState.currentRetryCount + 1;

    this.setRetryState({
      isRetrying: true,
      retryChapterId: chapterId,
      retryStartTime: Date.now(),
      preservedProgress: failureState.preservedProgress,
      retryOptions,
      originalFailureContext: failureState.failureContext,
    });

    this.setFailureState({
      currentRetryCount: newRetryCount,
      canRetry: newRetryCount < failureState.maxRetries,
    });

    eventBus.emit('retry:prepared', {
      chapterId,
      retryOptions,
      preservedProgress: failureState.preservedProgress,
      retryCount: newRetryCount,
    });

    return retryOptions;
  }

  public applyPreservedProgress(progress: PreservedProgress, options: RetryOptions): void {
    if (options.preserveStars && progress.discoveredStars.length > 0) {
      this.state.discoveredStars = [
        ...new Set([...this.state.discoveredStars, ...progress.discoveredStars])
      ];
    }

    if (options.preserveConstellations && progress.discoveredConstellations.length > 0) {
      this.state.discoveredConstellations = [
        ...new Set([...this.state.discoveredConstellations, ...progress.discoveredConstellations])
      ];
    }

    if (options.preserveVisitedPoints && progress.visitedPoints.length > 0) {
      this.state.visitedPoints = [
        ...new Set([...this.state.visitedPoints, ...progress.visitedPoints])
      ];
    }

    if (options.preserveCompletedObjectives && progress.completedObjectives.length > 0) {
      this.state.completedObjectives = [
        ...new Set([...this.state.completedObjectives, ...progress.completedObjectives])
      ];
    }

    if (options.preserveCrew && progress.crewMembers.length > 0) {
      this.state.crew.members = progress.crewMembers.map(m => ({ ...m }));
    }

    if (options.preserveGold) {
      this.state.crew.gold = Math.max(this.state.crew.gold, progress.gold);
    }

    this.state.completedChapters = [
      ...new Set([...this.state.completedChapters, ...progress.completedChapters])
    ];

    this.state.unlockedBranchRoutes = [
      ...new Set([...(this.state.unlockedBranchRoutes || []), ...progress.unlockedBranchRoutes])
    ];

    if (options.preserveCodex && progress.codexEntries.length > 0 && this.state.codex) {
      progress.codexEntries.forEach(id => {
        if (this.state.codex!.entries[id]) {
          this.state.codex!.entries[id].discovered = true;
        }
      });
    }

    if (options.preserveAchievements && progress.achievements.length > 0 && this.state.achievements) {
      progress.achievements.forEach(achievementId => {
        const existing = this.state.achievements!.achievements.find(a => a.achievementId === achievementId);
        if (existing) {
          existing.unlocked = true;
        }
      });
    }

    this.setWaypointExplorationState(progress.waypointExploration);

    eventBus.emit('retry:progressApplied', { progress, options });
    eventBus.emit('state:changed', this.state);
  }

  public resetChapterForRetry(chapter: Chapter, options: RetryOptions): void {
    if (options.resetShipHealth) {
      this.updateShip({ health: this.state.ship.maxHealth });
    }
    if (options.resetShipSupplies) {
      this.updateShip({ supplies: this.state.ship.maxSupplies });
    }
    if (options.resetPosition) {
      this.setCurrentPosition(
        chapter.startingPosition.x,
        chapter.startingPosition.y,
        chapter.startingPosition.z
      );
    }
    if (options.resetWeather) {
      this.setState({ activeWeather: null });
      eventBus.emit('weather:changed', null);
    }

    this.state.currentRoute = null;
    this.state.currentRouteProgress = 0;
    this.state.currentChapterId = chapter.id;
    this.state.chapterStartTime = this.state.playTime;

    this.resetChapter();
    this.initChapterBranchState(chapter.id, chapter.routes);

    eventBus.emit('retry:chapterReset', { chapterId: chapter.id, options });
  }

  public completeRetry(chapterId: string, success: boolean): void {
    const retryState = this.getRetryState();
    const failureState = this.getFailureState();

    eventBus.emit('retry:completed', {
      chapterId,
      success,
      retryCount: failureState.currentRetryCount,
      totalPlayTime: this.state.playTime,
    });

    if (success) {
      this.setFailureState({
        isFailed: false,
        failureContext: null,
        preservedProgress: null,
        currentRetryCount: 0,
        canRetry: true,
      });
    }

    this.setRetryState({
      isRetrying: false,
      retryChapterId: null,
      retryStartTime: null,
      preservedProgress: null,
      retryOptions: null,
      originalFailureContext: null,
    });
  }

  public clearFailureState(): void {
    this.setFailureState({
      ...DEFAULT_FAILURE_STATE,
    });
    this.setRetryState({
      ...DEFAULT_RETRY_STATE,
    });
  }

  public incrementRetryCount(): number {
    const failureState = this.getFailureState();
    const newCount = failureState.currentRetryCount + 1;
    this.setFailureState({
      currentRetryCount: newCount,
      canRetry: newCount < failureState.maxRetries,
    });
    return newCount;
  }

  public canRetryChapter(): boolean {
    const failureState = this.getFailureState();
    return failureState.isFailed && failureState.canRetry;
  }

  public getFailureReasonText(reason: FailureReason): string {
    const reasonTexts: Record<FailureReason, string> = {
      ship_destroyed: '船只已损毁',
      supplies_depleted: '补给已耗尽',
      time_out: '航行超时',
      weather_catastrophe: '遭遇灾难性天气',
      crew_abandoned: '船员弃船',
      objective_failed: '关键目标失败',
      navigation_lost: '迷失航向',
      other: '发生未知故障',
    };
    return reasonTexts[reason] || '发生未知故障';
  }

  public setLastFailureCheckpoint(checkpointId: string): void {
    this.setFailureState({ lastCheckpointId: checkpointId });
  }

  public getLastFailureCheckpoint(): string | null {
    return this.getFailureState().lastCheckpointId;
  }
}
