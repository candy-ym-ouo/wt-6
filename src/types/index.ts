export interface Star {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  size: number;
  color: string;
  brightness: number;
  constellationId?: string;
  isClickable: boolean;
  discovered?: boolean;
}

export interface Constellation {
  id: string;
  name: string;
  stars: string[];
  connections: [number, number][];
  description: string;
  discovered?: boolean;
}

export interface RoutePoint {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  type: 'start' | 'waypoint' | 'end' | 'landmark';
  discovered?: boolean;
  visited?: boolean;
}

export interface Route {
  id: string;
  name: string;
  points: string[];
  requiredStars?: string[];
  requiredConstellations?: string[];
}

export interface WeatherType {
  id: string;
  name: string;
  duration: number;
  intensity: number;
  effects: {
    visibility: number;
    speedModifier: number;
    starVisibility: number;
  };
}

export interface Objective {
  id: string;
  type: 'visit' | 'discover_star' | 'discover_constellation' | 'connect_stars' | 'survive_weather' | 'reach_destination';
  targetId: string;
  description: string;
  completed: boolean;
  progress: number;
  total: number;
}

export interface Chapter {
  id: string;
  number: number;
  name: string;
  description: string;
  intro: string;
  mapBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  stars: Star[];
  constellations: Constellation[];
  routes: Route[];
  routePoints: RoutePoint[];
  weatherEvents: WeatherEventConfig[];
  objectives: Objective[];
  startingPosition: { x: number; y: number; z: number };
  unlocked: boolean;
  completed?: boolean;
  starsToDiscover?: number;
  constellationsToDiscover?: number;
}

export interface WeatherEventConfig {
  id: string;
  type: 'storm' | 'fog' | 'meteor' | 'clear';
  name: string;
  startTime: number;
  duration: number;
  intensity: number;
  trigger?: string;
}

export interface GameState {
  currentChapterId: string | null;
  currentPosition: { x: number; y: number; z: number };
  currentRoute: string | null;
  currentRouteProgress: number;
  discoveredStars: string[];
  discoveredConstellations: string[];
  visitedPoints: string[];
  completedObjectives: string[];
  completedChapters: string[];
  activeWeather: WeatherType | null;
  playTime: number;
  settings: GameSettings;
  ship: ShipState;
  crew: CrewState;
  activeCrewBonuses: CrewEventBonus[];
  trade: TradeState;
  achievements: AchievementState;
  codex: CodexState;
}

export type DamageType = 'collision' | 'weather' | 'wear' | 'meteor';

export interface DamageRecord {
  id: string;
  type: DamageType;
  amount: number;
  timestamp: number;
  description: string;
  location?: string;
}

export interface RepairRecord {
  id: string;
  amount: number;
  cost: { gold?: number; supplies?: number };
  timestamp: number;
  location: string;
  isPortRepair: boolean;
}

export interface PortRepairConfig {
  repairRate: number;
  goldPerHealth: number;
  suppliesPerHealth: number;
  instantRepairMultiplier: number;
}

export interface ShipDamageState {
  damageRecords: DamageRecord[];
  repairRecords: RepairRecord[];
  damageThreshold: {
    critical: number;
    severe: number;
    moderate: number;
    minor: number;
  };
  lastDamageTime: number;
  lastRepairTime: number;
  wearAccumulator: number;
}

export interface ShipState {
  speed: number;
  maxSpeed: number;
  health: number;
  maxHealth: number;
  supplies: number;
  maxSupplies: number;
  heading: number;
  damage?: ShipDamageState;
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  starDensity: number;
  weatherEffects: boolean;
  showLabels: boolean;
  showMinimap: boolean;
}

export type GameScreen = 'menu' | 'chapterSelect' | 'game' | 'settings' | 'achievements' | 'codex' | 'dialog';

export interface GameEvent {
  type: string;
  data?: unknown;
}

export type CrewRole = 'captain' | 'navigator' | 'sailor' | 'cook' | 'doctor' | 'engineer' | 'lookout' | 'idle';

export type CrewRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface CrewSkill {
  id: string;
  name: string;
  description: string;
  type: 'speed' | 'weather_resist' | 'health' | 'supply_save' | 'morale' | 'star_vision';
  value: number;
}

export interface CrewMember {
  id: string;
  name: string;
  role: CrewRole;
  rarity: CrewRarity;
  level: number;
  exp: number;
  maxExp: number;
  fatigue: number;
  maxFatigue: number;
  morale: number;
  maxMorale: number;
  health: number;
  maxHealth: number;
  skills: CrewSkill[];
  traits: string[];
  avatar: string;
  description: string;
  hiredAt: number;
  activeEvents: string[];
}

export interface CrewRecruitCandidate {
  id: string;
  crew: Omit<CrewMember, 'id'>;
  cost: {
    supplies?: number;
    gold?: number;
  };
  expiresAt: number;
  location?: string;
}

export interface CrewState {
  members: CrewMember[];
  recruits: CrewRecruitCandidate[];
  maxCrew: number;
  gold: number;
  efficiencyBonuses: {
    speed: number;
    weatherResist: number;
    healthRegen: number;
    supplySave: number;
    moraleBoost: number;
    starVision: number;
  };
}

export interface CrewEventBonus {
  eventId: string;
  eventName: string;
  bonusType: 'speed' | 'weather_resist' | 'morale' | 'fatigue_reduce' | 'exp_boost';
  value: number;
  expiresAt?: number;
  crewIds?: string[];
}

export type TradeItemCategory = 'supply' | 'material' | 'special' | 'chapter_unlock';

export interface TradeItem {
  id: string;
  name: string;
  description: string;
  category: TradeItemCategory;
  basePrice: number;
  priceCurrency: 'gold' | 'supplies';
  icon: string;
  maxStock?: number;
  unlockChapter?: string;
  effects?: {
    type: 'supplies' | 'health' | 'morale' | 'speed' | 'chapter_unlock' | 'gold';
    value: number;
  };
}

export interface PortTradeItem extends TradeItem {
  currentPrice: number;
  currentStock: number;
  priceTrend: 'up' | 'down' | 'stable';
}

export interface Port {
  id: string;
  name: string;
  description: string;
  routePointId: string;
  type: 'small' | 'medium' | 'large';
  items: string[];
  specialItems?: string[];
  priceModifier: number;
  refreshInterval: number;
}

export interface TradeState {
  currentPortId: string | null;
  portPrices: Record<string, PortTradeItem[]>;
  lastRefreshTime: Record<string, number>;
  priceHistory: Record<string, number[]>;
  inventory: Record<string, number>;
  unlockedChapterItems: string[];
}

export interface TradeTransaction {
  itemId: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: number;
  portId: string;
}

export type VoyageLogCategory = 'chapter' | 'star' | 'weather' | 'event';

export interface VoyageLogEntry {
  id: string;
  category: VoyageLogCategory;
  title: string;
  description: string;
  timestamp: number;
  chapterId: string | null;
  metadata: Record<string, unknown>;
}

export interface VoyageLogFilter {
  category?: VoyageLogCategory;
  chapterId?: string;
  startTime?: number;
  endTime?: number;
  keyword?: string;
}

export type AchievementCategory = 'star' | 'constellation' | 'waypoint' | 'chapter' | 'collection' | 'special';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  targetId?: string;
  targetCount: number;
  reward?: {
    type: 'gold' | 'supplies' | 'exp';
    value: number;
  };
  unlocked?: boolean;
  unlockedAt?: number;
  progress?: number;
}

export interface AchievementProgress {
  achievementId: string;
  progress: number;
  unlocked: boolean;
  unlockedAt?: number;
}

export interface AchievementState {
  achievements: AchievementProgress[];
  totalUnlocked: number;
  totalAchievements: number;
}

export type CodexCategory = 'stars' | 'constellations' | 'waypoints' | 'chapters';

export interface CodexEntry {
  id: string;
  category: CodexCategory;
  name: string;
  description: string;
  discovered: boolean;
  discoveredAt?: number;
  chapterId?: string;
  metadata?: Record<string, unknown>;
}

export type DialogueTrigger = 'chapter_open' | 'event_insert' | 'branch_choice' | 'objective_complete' | 'weather_change' | 'port_arrive';

export interface DialogueEffect {
  type: 'ship' | 'crew' | 'trade' | 'chapter' | 'flag';
  key: string;
  value: unknown;
}

export interface DialogueChoice {
  id: string;
  text: string;
  nextNodeId: string | null;
  effects?: DialogueEffect[];
  condition?: {
    flag?: string;
    flagValue?: unknown;
    minGold?: number;
    minSupplies?: number;
  };
}

export interface DialogueNode {
  id: string;
  speaker: string;
  speakerTitle?: string;
  text: string;
  portrait?: string;
  nextNodeId?: string | null;
  choices?: DialogueChoice[];
  effects?: DialogueEffect[];
  audio?: {
    sfx?: string;
    music?: string;
    ambient?: string;
  };
}

export interface DialogueSequence {
  id: string;
  trigger: DialogueTrigger;
  triggerTarget?: string;
  priority: number;
  repeatable: boolean;
  condition?: {
    flag?: string;
    flagValue?: unknown;
    minChapter?: number;
  };
  startNodeId: string;
  nodes: DialogueNode[];
}

export interface DialogueState {
  activeSequenceId: string | null;
  currentNodeId: string | null;
  flags: Record<string, unknown>;
  seenSequences: string[];
  choiceHistory: Array<{ sequenceId: string; nodeId: string; choiceId: string }>;
}

export interface CodexState {
  entries: Record<string, CodexEntry>;
  totalDiscovered: number;
  totalEntries: number;
}

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export interface DayNightCycleState {
  currentTime: number;
  timeScale: number;
  timeOfDay: TimeOfDay;
  dayCount: number;
  cycleEnabled: boolean;
}

export interface DayNightLightConfig {
  ambientColor: number;
  ambientIntensity: number;
  directionalColor: number;
  directionalIntensity: number;
  fogColor: number;
  fogDensity: number;
  backgroundColor: number;
  exposure: number;
}

export interface DayNightWeatherWeights {
  storm: number;
  fog: number;
  meteor: number;
  clear: number;
}

export interface DayNightStarVisibility {
  starBrightness: number;
  backgroundStarOpacity: number;
  constellationLineOpacity: number;
}

export type TaskTriggerSource = 'chapter_progress' | 'weather' | 'exploration';

export type TaskType =
  | 'discover_stars'
  | 'discover_constellation'
  | 'visit_points'
  | 'survive_weather'
  | 'travel_distance'
  | 'collect_supplies'
  | 'connect_stars'
  | 'reach_destination';

export type WeatherCondition = 'storm' | 'fog' | 'meteor' | 'clear' | 'any_adverse' | 'any';

export interface TaskReward {
  type: 'gold' | 'supplies' | 'exp' | 'unlock_chapter';
  value: number;
  chapterId?: string;
}

export interface TaskHint {
  text: string;
  icon?: string;
  duration?: number;
}

export interface ChapterProgressCondition {
  minStarsDiscovered?: number;
  minConstellationsDiscovered?: number;
  minPointsVisited?: number;
  minObjectivesCompleted?: number;
  completedChapterIds?: string[];
}

export interface WeatherConditionConfig {
  weatherType: WeatherCondition;
  minIntensity?: number;
  minDuration?: number;
}

export interface ExplorationCondition {
  minDistanceTraveled?: number;
  minUniquePointsVisited?: number;
  minStarsDiscoveredInSession?: number;
  specificRegion?: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export interface TaskTrigger {
  source: TaskTriggerSource;
  chapterProgress?: ChapterProgressCondition;
  weather?: WeatherConditionConfig;
  exploration?: ExplorationCondition;
  cooldown?: number;
  maxOccurrences?: number;
}

export interface DynamicTask {
  id: string;
  name: string;
  description: string;
  type: TaskType;
  target: string | number;
  total: number;
  trigger: TaskTrigger;
  rewards: TaskReward[];
  hints: TaskHint[];
  priority: 'low' | 'medium' | 'high';
  repeatable: boolean;
  chapterId?: string;
  expiresAfter?: number;
}

export interface TaskProgress {
  taskId: string;
  progress: number;
  completed: boolean;
  completedAt?: number;
  acceptedAt: number;
  expiresAt?: number;
  triggerCount: number;
  lastTriggeredAt?: number;
}

export interface ExplorationStats {
  totalDistanceTraveled: number;
  sessionDistanceTraveled: number;
  sessionStarsDiscovered: number;
  positionsVisited: Array<{ x: number; z: number; timestamp: number }>;
  lastPosition: { x: number; y: number; z: number };
}

export interface TaskState {
  activeTasks: TaskProgress[];
  completedTaskIds: string[];
  explorationStats: ExplorationStats;
  weatherSurvivalStats: Record<string, number>;
  dynamicTaskHistory: Array<{ taskId: string; completedAt: number; rewardsGranted: boolean }>;
}

export interface FogCell {
  x: number;
  z: number;
  explored: boolean;
  visibility: number;
  lastVisitedAt?: number;
}

export interface FogOfWarState {
  gridSize: number;
  cellSize: number;
  cells: Record<string, FogCell>;
  mapBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  baseViewRadius: number;
  waypointBonusRadius: number;
}

export interface FogOfWarConfig {
  gridSize: number;
  cellSize: number;
  baseViewRadius: number;
  waypointBonusRadius: number;
  fogColor: number;
  fogOpacity: number;
}

export const DEFAULT_FOG_CONFIG: FogOfWarConfig = {
  gridSize: 100,
  cellSize: 5,
  baseViewRadius: 20,
  waypointBonusRadius: 30,
  fogColor: 0x0a0a1a,
  fogOpacity: 0.9,
};

declare module './index' {
  interface GameState {
    tasks?: TaskState;
    fogOfWar?: FogOfWarState;
  }
}
