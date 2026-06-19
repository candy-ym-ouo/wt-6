import { GameState, GameSettings, ShipState, CrewState, CrewEventBonus, TradeState, AchievementState, CodexState } from '../types';
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

const DEFAULT_SHIP: ShipState = {
  speed: 0,
  maxSpeed: 15,
  health: 100,
  maxHealth: 100,
  supplies: 100,
  maxSupplies: 100,
  heading: 0
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
  codex: { ...DEFAULT_CODEX }
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
    this.state.ship = { ...DEFAULT_SHIP };
    eventBus.emit('ship:updated', this.state.ship);
  }

  public reset(): void {
    this.state = { 
      ...DEFAULT_STATE, 
      settings: { ...this.state.settings },
      achievements: { ...DEFAULT_ACHIEVEMENTS },
      codex: { ...DEFAULT_CODEX }
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
}
