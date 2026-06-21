export interface Star {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  size: number;
  color: string;
  brightness: number;
  constellationId?: string;
  isClickable: boolean;
  hidden?: boolean;
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
  explorationRewards?: WaypointReward[];
}

export interface WaypointReward {
  type: 'gold' | 'supplies' | 'exp' | 'codex_entry' | 'star' | 'constellation' | 'clue';
  amount: number;
  value?: string;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  name?: string;
}

export interface WaypointExplorationState {
  exploredWaypoints: Record<string, boolean>;
  claimedRewards: Record<string, boolean>;
  totalExplored: number;
  totalRewardsClaimed: number;
}

export interface CompletionStats {
  chapterProgress: { completed: number; total: number; percentage: number };
  starDiscovery: { discovered: number; total: number; percentage: number };
  constellationUnlock: { unlocked: number; total: number; percentage: number };
  hiddenStars: { discovered: number; total: number; percentage: number };
  totalPlayTime: number;
  overallPercentage: number;
}

export type RouteBranchType = 'main' | 'alternative' | 'secret' | 'optional';

export interface RouteBranchCondition {
  type: 'objective_completed' | 'stars_discovered' | 'constellations_discovered' | 'points_visited' | 'flag' | 'min_play_time';
  targetId?: string;
  value?: number | string | boolean;
  operator?: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
}

export interface Route {
  id: string;
  name: string;
  points: string[];
  requiredStars?: string[];
  requiredConstellations?: string[];
  branchType?: RouteBranchType;
  branchGroup?: string;
  isDefault?: boolean;
  unlockConditions?: RouteBranchCondition[];
  lockedDescription?: string;
  branchDescription?: string;
  color?: string;
  order?: number;
  completionReward?: {
    gold?: number;
    supplies?: number;
    exp?: number;
    achievementId?: string;
  };
}

export interface BranchRouteProgress {
  routeId: string;
  unlocked: boolean;
  unlockedAt?: number;
  selected: boolean;
  completed: boolean;
  completedAt?: number;
  overallProgress: number;
  currentPointIndex: number;
  visitedPoints: string[];
}

export interface ChapterBranchState {
  chapterId: string;
  branchGroupStates: Record<string, {
    selectedRouteId: string | null;
    completedRouteIds: string[];
  }>;
  routeProgress: Record<string, BranchRouteProgress>;
  branchFlags: Record<string, unknown>;
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
    taskProgressModifier: number;
    supplyConsumptionModifier: number;
    collisionChanceModifier: number;
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

export type GameScreen = 'menu' | 'chapterSelect' | 'game' | 'settings' | 'achievements' | 'codex' | 'dialog' | 'editor' | 'saveManager';

export interface SaveSlotInfo {
  slotName: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
  chapterName: string;
  chapterId: string;
  playTime: number;
  discoveredStars: number;
  discoveredConstellations: number;
  visitedPoints: number;
  completedObjectives: number;
  shipHealth: number;
  shipMaxHealth: number;
  shipSupplies: number;
  shipMaxSupplies: number;
  crewCount: number;
  gold: number;
  thumbnail?: string;
}

export interface SaveData {
  version: string;
  timestamp: number;
  state: Partial<GameState>;
  dialogueState?: DialogueState;
  dayNightState?: DayNightCycleState;
  taskState?: TaskState;
  shipDamageState?: ShipDamageState;
  seaEventState?: SeaEventState;
}

export interface SaveSlotsMetadata {
  slots: Record<string, SaveSlotInfo>;
}

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

export type CodexCategory = 'stars' | 'constellations' | 'waypoints' | 'chapters' | 'constellationStories';

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

export type SeaEventType = 'meteor_shower' | 'reef' | 'fog_zone' | 'lost_ruins';

export type VoyageEventType =
  | 'weather_sudden'
  | 'starmap_anomaly'
  | 'objective_bonus'
  | 'navigational_hint';

export type SeaEventRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface VoyageEventChoice {
  id: string;
  text: string;
  description?: string;
  icon?: string;
  action: 'accept' | 'decline' | 'dismiss' | 'investigate';
  requiresConfirmation?: boolean;
}

export interface VoyageEventEffect {
  type:
    | 'trigger_weather'
    | 'modify_weather'
    | 'reveal_stars'
    | 'highlight_constellation'
    | 'starmap_distort'
    | 'starmap_clarify'
    | 'add_objective'
    | 'grant_reward'
    | 'modify_speed'
    | 'modify_progress'
    | 'unlock_route'
    | 'show_hint';
  weatherType?: 'storm' | 'fog' | 'meteor' | 'clear';
  weatherIntensity?: number;
  weatherDuration?: number;
  starIds?: string[];
  constellationId?: string;
  objective?: {
    id: string;
    type: 'visit' | 'discover_star' | 'discover_constellation' | 'survive_weather';
    targetId: string;
    description: string;
    total: number;
    rewards?: Array<{ type: 'gold' | 'supplies' | 'exp'; value: number }>;
  };
  rewardItems?: Array<{ type: 'gold' | 'supplies' | 'exp'; amount: number }>;
  speedModifier?: number;
  progressDelta?: number;
  routeId?: string;
  hintText?: string;
  hintIcon?: string;
  durationMs?: number;
}

export interface VoyageEventConfig {
  id: string;
  type: VoyageEventType;
  name: string;
  description: string;
  icon: string;
  rarity: SeaEventRarity;
  chapterIds?: string[];
  minChapter?: number;
  trigger: {
    minProgress?: number;
    maxProgress?: number;
    atExactProgress?: number;
    requireMoving?: boolean;
    probabilityWeight?: number;
    cooldown?: number;
    maxOccurrences?: number;
    onlyOncePerRoute?: boolean;
    routeTypes?: RouteBranchType[];
    weatherCondition?: WeatherCondition;
    timeOfDayCondition?: TimeOfDay;
    minStarsDiscovered?: number;
    flagCondition?: { key: string; value?: unknown };
  };
  choices: VoyageEventChoice[];
  effects: VoyageEventEffect[];
  successEffects?: VoyageEventEffect[];
  failEffects?: VoyageEventEffect[];
  narrativeText?: {
    intro?: string;
    accept?: string;
    decline?: string;
    success?: string;
    fail?: string;
  };
  autoResolveAfterMs?: number;
  allowContinueVoyage: boolean;
}

export interface VoyageEventState {
  activeEventId: string | null;
  activeEventStartTime: number | null;
  isPausedForEvent: boolean;
  eventHistory: Array<{
    eventId: string;
    routeId: string;
    progressAtTrigger: number;
    timestamp: number;
    choiceId?: string;
  }>;
  cooldowns: Record<string, number>;
  occurrencesPerRoute: Record<string, Record<string, number>>;
  flags: Record<string, unknown>;
}

export interface VoyageEventTriggerContext {
  routeId: string;
  routeType: RouteBranchType;
  progress: number;
  currentPointIndex: number;
  currentWeather: WeatherType | null;
  currentTimeOfDay: TimeOfDay;
  starsDiscoveredInChapter: number;
}

declare module './index' {
  interface GameState {
    voyageEvents?: VoyageEventState;
  }
}

export interface SeaEventReward {
  type: 'gold' | 'supplies' | 'health' | 'exp' | 'star' | 'constellation' | 'chapter_unlock' | 'codex_entry';
  value: number | string;
  amount?: number;
}

export interface SeaEventChoice {
  id: string;
  text: string;
  description?: string;
  condition?: {
    minGold?: number;
    minSupplies?: number;
    minHealth?: number;
    requiredCrewRole?: CrewRole;
    requiredChapter?: number;
    minStarsDiscovered?: number;
    flag?: string;
    flagValue?: unknown;
  };
  successRate?: number;
  rewards?: SeaEventReward[];
  penalties?: {
    type: 'gold' | 'supplies' | 'health' | 'morale';
    amount: number;
  }[];
  effects?: DialogueEffect[];
  nextEventId?: string;
  resultText?: string;
  failText?: string;
}

export interface SeaEventConfig {
  id: string;
  type: SeaEventType;
  name: string;
  description: string;
  rarity: SeaEventRarity;
  icon?: string;
  chapterIds?: string[];
  minChapter?: number;
  maxOccurrences?: number;
  cooldown?: number;
  triggerCondition?: {
    minDistanceTraveled?: number;
    minStarsDiscovered?: number;
    weatherType?: WeatherCondition;
    timeOfDay?: TimeOfDay;
    specificRegion?: { minX: number; maxX: number; minZ: number; maxZ: number };
    flag?: string;
    flagValue?: unknown;
  };
  choices: SeaEventChoice[];
  rewards?: SeaEventReward[];
  codexEntry?: {
    id: string;
    category: CodexCategory;
    name: string;
    description: string;
  };
}

export interface SeaEventState {
  activeEventId: string | null;
  eventHistory: Array<{
    eventId: string;
    timestamp: number;
    choiceId?: string;
    result: 'success' | 'fail' | 'neutral';
    rewards?: SeaEventReward[];
  }>;
  eventCooldowns: Record<string, number>;
  eventOccurrences: Record<string, number>;
  discoveredEventIds: string[];
  flags: Record<string, unknown>;
  pendingNextEventId: string | null;
}

export interface SeaEventTriggerResult {
  event: SeaEventConfig;
  triggeredAt: number;
}

export type GatheringPointType = 'fishing' | 'foraging' | 'mining' | 'exploration' | 'trade_ruins';

export type GatheringRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface GatheringReward {
  type: 'supplies' | 'gold' | 'health' | 'codex_entry' | 'clue' | 'star' | 'constellation' | 'exp';
  value: number | string;
  amount?: number;
  rarity?: GatheringRarity;
}

export interface GatheringPointConfig {
  id: string;
  routePointId: string;
  name: string;
  description: string;
  type: GatheringPointType;
  icon: string;
  gatherTime: number;
  cooldown: number;
  rewards: GatheringReward[];
  successRate: number;
  requiredSupplies?: number;
  requiredCrewRole?: CrewRole;
  maxGatherCount?: number;
  chapterIds?: string[];
  unlockCondition?: {
    minStarsDiscovered?: number;
    minConstellationsDiscovered?: number;
    minPointsVisited?: number;
    flag?: string;
  };
  clueId?: string;
  dialogueId?: string;
}

export interface GatheringProgress {
  pointId: string;
  isGathering: boolean;
  startTime: number;
  progress: number;
  gatherTime: number;
}

export interface GatheringState {
  availablePoints: string[];
  gatheringProgress: GatheringProgress | null;
  gatheredPoints: Record<string, number>;
  cooldowns: Record<string, number>;
  discoveredClues: string[];
  flags: Record<string, unknown>;
  totalGatherCount: number;
}

export interface GatheringResult {
  success: boolean;
  pointId: string;
  rewards: GatheringReward[];
  duration: number;
  timestamp: number;
  message?: string;
}

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string;
  targetPosition?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  highlightType?: 'element' | 'area' | 'none';
  canSkip?: boolean;
  triggerEvent?: string;
  autoAdvance?: boolean;
  advanceDelay?: number;
  icon?: string;
}

export interface TutorialState {
  active: boolean;
  currentStepId: string | null;
  completedStepIds: string[];
  tutorialCompleted: boolean;
}

export type SoundLayerType = 'base' | 'weather' | 'event' | 'music';

export type NavigationPhase = 'docked' | 'sailing' | 'arriving' | 'storm_sailing';

export interface FadeStrategy {
  fadeInDuration: number;
  fadeOutDuration: number;
  crossfade: boolean;
}

export interface LayerSoundConfig {
  id: string;
  layer: SoundLayerType;
  trackId: string;
  baseVolume: number;
  priority: number;
  fadeStrategy: FadeStrategy;
  conditions: SoundConditions;
}

export interface SoundConditions {
  weatherTypes?: string[];
  weatherMinIntensity?: number;
  timeOfDay?: TimeOfDay[];
  chapters?: string[];
  navigationPhases?: NavigationPhase[];
  eventTypes?: string[];
  screens?: GameScreen[];
  minStarsDiscovered?: number;
  flags?: Record<string, unknown>;
}

export interface ActiveLayerSound {
  config: LayerSoundConfig;
  currentVolume: number;
  targetVolume: number;
  isFadingIn: boolean;
  isFadingOut: boolean;
  fadeStartTime: number;
  howlId?: number;
}

export interface AmbientSoundState {
  activeSounds: Map<SoundLayerType, ActiveLayerSound[]>;
  currentNavigationPhase: NavigationPhase;
  currentTimeOfDay: TimeOfDay;
  currentWeather: WeatherType | null;
  currentChapterId: string | null;
  currentEventId: string | null;
  masterEnabled: boolean;
}

export type RuinsPuzzleType = 'constellation_match' | 'star_order' | 'route_trace' | 'weather_resonance';

export interface RuinsPuzzle {
  id: string;
  type: RuinsPuzzleType;
  name: string;
  description: string;
  requiredConstellationIds: string[];
  requiredRouteIds?: string[];
  requiredWeatherType?: WeatherCondition;
  solution: string[];
  attempts: number;
  maxAttempts: number;
  timeLimit?: number;
}

export interface RuinsRoom {
  id: string;
  name: string;
  description: string;
  position: { x: number; y: number; z: number };
  puzzle: RuinsPuzzle;
  rewardIds: string[];
  nextRoomIds: string[];
  isEntrance: boolean;
  isExit: boolean;
}

export interface RuinsReward {
  id: string;
  type: 'gold' | 'supplies' | 'health' | 'exp' | 'star' | 'constellation' | 'codex_entry' | 'chapter_unlock' | 'crew_upgrade' | 'artifact';
  name: string;
  value: number | string;
  amount?: number;
  rarity: GatheringRarity;
  description: string;
}

export interface RuinsUnlockCondition {
  chapterId: string;
  requiredConstellationIds: string[];
  requiredRouteId?: string;
  requiredWeatherSurvived?: WeatherCondition;
  minStarsDiscovered?: number;
}

export interface RuinsConfig {
  id: string;
  name: string;
  description: string;
  chapterId: string;
  unlockConditions: RuinsUnlockCondition[];
  rooms: RuinsRoom[];
  rewards: RuinsReward[];
  mapBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  entrancePosition: { x: number; y: number; z: number };
  difficulty: 'normal' | 'hard' | 'legendary';
  timeLimit?: number;
}

export type RuinsRoomStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'failed';

export interface RuinsRoomState {
  roomId: string;
  status: RuinsRoomStatus;
  attemptsUsed: number;
  puzzleStartTime: number | null;
  completedAt: number | null;
  rewardsClaimed: string[];
}

export interface RuinsExplorationState {
  currentRoomId: string | null;
  visitedRoomIds: string[];
  roomStates: Record<string, RuinsRoomState>;
  totalRoomsCompleted: number;
  enteredAt: number | null;
}

export type RuinsStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed' | 'abandoned';

export interface RuinsState {
  ruinsId: string | null;
  status: RuinsStatus;
  unlockedRuinsIds: string[];
  completedRuinsIds: string[];
  exploration: RuinsExplorationState;
  earnedRewards: string[];
  settlementSnapshot: {
    healthBefore: number;
    suppliesBefore: number;
    goldBefore: number;
    healthAfter: number;
    suppliesAfter: number;
    goldAfter: number;
    roomsCompleted: number;
    totalRooms: number;
    timeSpent: number;
    rewardsEarned: string[];
  } | null;
  flags: Record<string, unknown>;
}

export interface SaveData {
  version: string;
  timestamp: number;
  state: Partial<GameState>;
  dialogueState?: DialogueState;
  dayNightState?: DayNightCycleState;
  taskState?: TaskState;
  shipDamageState?: ShipDamageState;
  seaEventState?: SeaEventState;
  gatheringState?: GatheringState;
  ruinsState?: RuinsState;
  scoreState?: ScoreState;
}

export type ScoreGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface ScoreCategory {
  name: string;
  score: number;
  maxScore: number;
  percentage: number;
  details: Record<string, number>;
}

export interface ChapterScore {
  chapterId: string;
  chapterName: string;
  chapterNumber: number;
  totalScore: number;
  maxTotalScore: number;
  grade: ScoreGrade;
  percentage: number;
  categories: {
    exploration: ScoreCategory;
    tasks: ScoreCategory;
    weather: ScoreCategory;
    hidden: ScoreCategory;
  };
  playTime: number;
  completedAt: number;
  rewards: {
    gold: number;
    exp: number;
    supplies: number;
  };
  achievements: string[];
}

export interface ScoreState {
  chapterScores: Record<string, ChapterScore>;
  overallScore: number;
  totalPlayTime: number;
  unlockedGrades: ScoreGrade[];
}

export type BroadcastCategory = 'chapter' | 'weather' | 'task' | 'reward' | 'achievement' | 'system';

export type BroadcastPriority = 'critical' | 'high' | 'normal' | 'low';

export interface WorldBroadcastEvent {
  id: string;
  category: BroadcastCategory;
  priority: BroadcastPriority;
  title: string;
  message: string;
  icon: string;
  timestamp: number;
  duration: number;
  metadata?: Record<string, unknown>;
}

export interface BroadcastState {
  history: WorldBroadcastEvent[];
  maxHistory: number;
}

export type RewardType = 'gold' | 'supplies' | 'exp' | 'health' | 'star' | 'constellation' | 'codex_entry' | 'clue' | 'unlock_chapter' | 'chapter_unlock' | 'morale';

export type RewardSource = 'task' | 'chapter_score' | 'achievement' | 'gathering' | 'ruins' | 'sea_event' | 'trade' | 'system' | 'level_up' | 'waypoint_exploration';

export interface RewardItem {
  type: RewardType;
  amount: number;
  value?: number | string;
  rarity?: string;
  name?: string;
}

export interface RewardGrantedEvent {
  source: RewardSource;
  sourceId?: string;
  sourceName?: string;
  rewards: RewardItem[];
  title?: string;
  priority?: BroadcastPriority;
  timestamp: number;
}

export type ChallengeType =
  | 'time_limit'
  | 'no_damage'
  | 'limited_supplies'
  | 'speed_run'
  | 'perfect_score'
  | 'hard_mode'
  | 'low_visibility'
  | 'no_constellation_hint';

export interface ChallengeCondition {
  type: ChallengeType;
  name: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  value?: number;
  rewardMultiplier: number;
}

export type InheritType =
  | 'stars'
  | 'constellations'
  | 'visited_points'
  | 'crew_levels'
  | 'gold'
  | 'supplies'
  | 'codex'
  | 'achievements';

export interface InheritOption {
  type: InheritType;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  impactScore: boolean;
}

export interface ReplayReward {
  type: 'gold' | 'supplies' | 'exp' | 'codex_entry' | 'achievement' | 'special_item';
  amount: number;
  value?: string;
  rarity?: string;
  condition?: {
    minGrade?: ScoreGrade;
    challengeTypes?: ChallengeType[];
    allChallenges?: boolean;
  };
}

export interface ChapterReplayConfig {
  chapterId: string;
  canReplay: boolean;
  maxReplayCount: number;
  inheritOptions: InheritOption[];
  challenges: ChallengeCondition[];
  replayRewards: ReplayReward[];
  firstClearRewards: ReplayReward[];
  scoreBonusPerReplay: number;
}

export interface ChapterReplayProgress {
  chapterId: string;
  replayCount: number;
  bestScore: number;
  bestGrade: ScoreGrade;
  bestPlayTime: number;
  completedChallenges: ChallengeType[];
  totalRewardsEarned: {
    gold: number;
    exp: number;
    supplies: number;
  };
  currentReplay: {
    isReplaying: boolean;
    startedAt: number | null;
    inheritedTypes: InheritType[];
    activeChallenges: ChallengeType[];
    startSnapshot: {
      health: number;
      supplies: number;
      gold: number;
    };
  };
  challengeRecords: Array<{
    challengeType: ChallengeType;
    completedAt: number;
    score: number;
    grade: ScoreGrade;
  }>;
}

export interface ReplayState {
  replayProgress: Record<string, ChapterReplayProgress>;
  totalReplays: number;
  unlockedChallenges: ChallengeType[];
  replayHistory: Array<{
    chapterId: string;
    replayNumber: number;
    completedAt: number;
    score: number;
    grade: ScoreGrade;
    challenges: ChallengeType[];
    rewards: ReplayReward[];
  }>;
}

export interface ReplayStartOptions {
  chapterId: string;
  inheritTypes: InheritType[];
  challenges: ChallengeType[];
}

export interface ReplayResult {
  chapterId: string;
  replayNumber: number;
  score: number;
  grade: ScoreGrade;
  playTime: number;
  completedChallenges: ChallengeType[];
  failedChallenges: ChallengeType[];
  rewards: ReplayReward[];
  isNewBest: boolean;
  isNewChallengeRecord: boolean;
}

export interface ConstellationStoryNode {
  id: string;
  speaker: string;
  speakerTitle?: string;
  text: string;
  portrait?: string;
  nextNodeId?: string | null;
  choices?: ConstellationStoryChoice[];
  audio?: {
    sfx?: string;
    music?: string;
    ambient?: string;
  };
  visual?: {
    background?: string;
    constellationHighlight?: boolean;
    starEffect?: string;
  };
}

export interface ConstellationStoryChoice {
  id: string;
  text: string;
  nextNodeId: string | null;
}

export interface ConstellationStorySequence {
  id: string;
  constellationId: string;
  constellationName: string;
  chapterId: string;
  title: string;
  subtitle?: string;
  icon: string;
  repeatable: boolean;
  startNodeId: string;
  nodes: ConstellationStoryNode[];
  unlockCondition?: {
    minStarsDiscovered?: number;
    requiredConstellationIds?: string[];
  };
}

export interface ConstellationStoryState {
  unlockedStories: string[];
  viewedStories: string[];
  replayCount: Record<string, number>;
  lastViewedAt: Record<string, number>;
  choiceHistory: Array<{
    storyId: string;
    nodeId: string;
    choiceId: string;
    timestamp: number;
  }>;
  flags: Record<string, unknown>;
}

export type CheckpointType = 'chapter_start' | 'weather_change' | 'route_complete' | 'objective_complete' | 'manual';

export interface CheckpointInfo {
  id: string;
  type: CheckpointType;
  name: string;
  description: string;
  timestamp: number;
  chapterId: string;
  chapterName: string;
  playTime: number;
  slotName: string;
}

export interface CheckpointMetadata {
  checkpoints: CheckpointInfo[];
  maxCheckpoints: number;
}

export interface ConstellationMatchResult {
  constellationId: string;
  constellationName: string;
  matchedStarIds: string[];
  missingStarIds: string[];
  wrongStarIds: string[];
  matchPercentage: number;
  isComplete: boolean;
  isWrong: boolean;
}

export interface ConstellationAttemptEvent {
  starIds: string[];
  matchResults: ConstellationMatchResult[];
  bestMatch: ConstellationMatchResult | null;
  timestamp: number;
}

declare module './index' {
  interface GameState {
    tasks?: TaskState;
    fogOfWar?: FogOfWarState;
    seaEvents?: SeaEventState;
    tutorial?: TutorialState;
    gathering?: GatheringState;
    ruins?: RuinsState;
    scores?: ScoreState;
    replay?: ReplayState;
    chapterBranches?: Record<string, ChapterBranchState>;
    selectedBranchRoute?: string | null;
    unlockedBranchRoutes?: string[];
    constellationStories?: ConstellationStoryState;
    waypointExploration?: WaypointExplorationState;
  }
}
