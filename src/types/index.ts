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
}

export interface ShipState {
  speed: number;
  maxSpeed: number;
  health: number;
  maxHealth: number;
  supplies: number;
  maxSupplies: number;
  heading: number;
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

export type GameScreen = 'menu' | 'chapterSelect' | 'game' | 'settings' | 'dialog';

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
