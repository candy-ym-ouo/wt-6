import { GameState, GameSettings, ShipState, CrewState, CrewEventBonus, TradeState, AchievementState, CodexState, TaskState, FogOfWarState, FogCell, DEFAULT_FOG_CONFIG, ShipDamageState } from '../types';
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
  settings: { ...DEFAULT_SETTINGS },
  ship: { ...DEFAULT_SHIP },
  crew: { ...DEFAULT_CREW },
  activeCrewBonuses: [],
  trade: { ...DEFAULT_TRADE },
  achievements: { ...DEFAULT_ACHIEVEMENTS },
  codex: { ...DEFAULT_CODEX },
  tasks: { ...DEFAULT_TASKS, explorationStats: { ...DEFAULT_TASKS.explorationStats } },
  fogOfWar: { ...DEFAULT_FOG_OF_WAR, cells: {} }
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
      fogOfWar: { ...DEFAULT_FOG_OF_WAR, cells: {} }
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

  public updatePlayTime(delta: number): void {
    this.state.playTime += delta;
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
}
