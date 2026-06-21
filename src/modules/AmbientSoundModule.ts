import { Howl } from 'howler';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import {
  SoundLayerType,
  NavigationPhase,
  LayerSoundConfig,
  ActiveLayerSound,
  SoundConditions,
  TimeOfDay,
  WeatherType,
  GameScreen,
} from '../types';

const DEFAULT_FADE_STRATEGY = {
  fadeInDuration: 2000,
  fadeOutDuration: 2000,
  crossfade: true,
};

const BASE_SOUNDS: LayerSoundConfig[] = [
  {
    id: 'base_ocean_day',
    layer: 'base',
    trackId: 'ocean',
    baseVolume: 0.4,
    priority: 10,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 3000, fadeOutDuration: 3000 },
    conditions: {
      timeOfDay: ['dawn', 'day', 'dusk'],
      navigationPhases: ['sailing', 'arriving', 'storm_sailing'],
      screens: ['game'],
    },
  },
  {
    id: 'base_ocean_night',
    layer: 'base',
    trackId: 'ocean',
    baseVolume: 0.25,
    priority: 10,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 3000, fadeOutDuration: 3000 },
    conditions: {
      timeOfDay: ['night'],
      navigationPhases: ['sailing', 'arriving', 'storm_sailing'],
      screens: ['game'],
    },
  },
  {
    id: 'base_wind_day',
    layer: 'base',
    trackId: 'wind',
    baseVolume: 0.2,
    priority: 5,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 4000, fadeOutDuration: 4000 },
    conditions: {
      timeOfDay: ['day'],
      navigationPhases: ['sailing', 'arriving', 'storm_sailing'],
      screens: ['game'],
    },
  },
  {
    id: 'base_night_crickets',
    layer: 'base',
    trackId: 'night',
    baseVolume: 0.15,
    priority: 5,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 2000, fadeOutDuration: 2000 },
    conditions: {
      timeOfDay: ['night'],
      navigationPhases: ['docked', 'sailing', 'arriving'],
      screens: ['game'],
    },
  },
  {
    id: 'base_dawn',
    layer: 'base',
    trackId: 'dawn',
    baseVolume: 0.2,
    priority: 8,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 3000, fadeOutDuration: 2000 },
    conditions: {
      timeOfDay: ['dawn'],
      navigationPhases: ['docked', 'sailing', 'arriving'],
      screens: ['game'],
    },
  },
  {
    id: 'base_dusk',
    layer: 'base',
    trackId: 'dusk',
    baseVolume: 0.2,
    priority: 8,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 3000, fadeOutDuration: 2000 },
    conditions: {
      timeOfDay: ['dusk'],
      navigationPhases: ['docked', 'sailing', 'arriving'],
      screens: ['game'],
    },
  },
];

const WEATHER_SOUNDS: LayerSoundConfig[] = [
  {
    id: 'weather_storm_light',
    layer: 'weather',
    trackId: 'storm',
    baseVolume: 0.3,
    priority: 20,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 1500, fadeOutDuration: 2000 },
    conditions: {
      weatherTypes: ['storm'],
      weatherMinIntensity: 0.2,
      screens: ['game'],
    },
  },
  {
    id: 'weather_storm_heavy',
    layer: 'weather',
    trackId: 'storm',
    baseVolume: 0.6,
    priority: 30,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 1000, fadeOutDuration: 1500 },
    conditions: {
      weatherTypes: ['storm'],
      weatherMinIntensity: 0.6,
      screens: ['game'],
    },
  },
  {
    id: 'weather_fog',
    layer: 'weather',
    trackId: 'wind',
    baseVolume: 0.1,
    priority: 15,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 3000, fadeOutDuration: 3000 },
    conditions: {
      weatherTypes: ['fog'],
      weatherMinIntensity: 0.3,
      screens: ['game'],
    },
  },
  {
    id: 'weather_meteor',
    layer: 'weather',
    trackId: 'storm',
    baseVolume: 0.2,
    priority: 25,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 500, fadeOutDuration: 1000 },
    conditions: {
      weatherTypes: ['meteor'],
      screens: ['game'],
    },
  },
];

const EVENT_SOUNDS: LayerSoundConfig[] = [
  {
    id: 'event_storm_ambient',
    layer: 'event',
    trackId: 'storm',
    baseVolume: 0.5,
    priority: 35,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 800, fadeOutDuration: 1200 },
    conditions: {
      weatherTypes: ['storm'],
      weatherMinIntensity: 0.7,
      navigationPhases: ['sailing', 'storm_sailing'],
      screens: ['game'],
    },
  },
];

const MUSIC_SOUNDS: LayerSoundConfig[] = [
  {
    id: 'music_menu',
    layer: 'music',
    trackId: 'menu',
    baseVolume: 0.5,
    priority: 10,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 2000, fadeOutDuration: 1500 },
    conditions: {
      screens: ['menu', 'chapterSelect', 'settings', 'achievements', 'codex', 'saveManager'],
    },
  },
  {
    id: 'music_exploration',
    layer: 'music',
    trackId: 'exploration',
    baseVolume: 0.3,
    priority: 10,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 3000, fadeOutDuration: 2000 },
    conditions: {
      navigationPhases: ['sailing', 'arriving'],
      screens: ['game'],
    },
  },
  {
    id: 'music_chapter_start',
    layer: 'music',
    trackId: 'game',
    baseVolume: 0.4,
    priority: 20,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 1500, fadeOutDuration: 2000 },
    conditions: {
      eventTypes: ['chapter_start'],
      screens: ['game'],
    },
  },
];

const CHAPTER_MUSIC: LayerSoundConfig[] = [
  {
    id: 'music_ch1_calm',
    layer: 'music',
    trackId: 'exploration',
    baseVolume: 0.25,
    priority: 8,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 4000, fadeOutDuration: 3000 },
    conditions: {
      chapters: ['chapter-1'],
      navigationPhases: ['sailing', 'arriving', 'docked'],
      screens: ['game'],
    },
  },
  {
    id: 'music_ch2_mystery',
    layer: 'music',
    trackId: 'game',
    baseVolume: 0.2,
    priority: 8,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 4000, fadeOutDuration: 3000 },
    conditions: {
      chapters: ['chapter-2'],
      navigationPhases: ['sailing', 'arriving', 'docked'],
      screens: ['game'],
    },
  },
  {
    id: 'music_ch3_epic',
    layer: 'music',
    trackId: 'game',
    baseVolume: 0.3,
    priority: 8,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 3000, fadeOutDuration: 2500 },
    conditions: {
      chapters: ['chapter-3'],
      navigationPhases: ['sailing', 'arriving', 'storm_sailing'],
      screens: ['game'],
    },
  },
];

const CHAPTER_AMBIENT: LayerSoundConfig[] = [
  {
    id: 'ambient_ch1_ocean_calm',
    layer: 'base',
    trackId: 'ocean',
    baseVolume: 0.35,
    priority: 12,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 3000, fadeOutDuration: 3000 },
    conditions: {
      chapters: ['chapter-1'],
      screens: ['game'],
    },
  },
  {
    id: 'ambient_ch2_fog_muffle',
    layer: 'base',
    trackId: 'wind',
    baseVolume: 0.12,
    priority: 12,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 4000, fadeOutDuration: 4000 },
    conditions: {
      chapters: ['chapter-2'],
      timeOfDay: ['dawn', 'night', 'dusk'],
      screens: ['game'],
    },
  },
  {
    id: 'ambient_ch3_storm_surf',
    layer: 'base',
    trackId: 'ocean',
    baseVolume: 0.45,
    priority: 12,
    fadeStrategy: { ...DEFAULT_FADE_STRATEGY, fadeInDuration: 2000, fadeOutDuration: 3000 },
    conditions: {
      chapters: ['chapter-3'],
      navigationPhases: ['sailing', 'storm_sailing'],
      screens: ['game'],
    },
  },
];

const ALL_SOUND_CONFIGS: LayerSoundConfig[] = [
  ...BASE_SOUNDS,
  ...WEATHER_SOUNDS,
  ...EVENT_SOUNDS,
  ...MUSIC_SOUNDS,
  ...CHAPTER_MUSIC,
  ...CHAPTER_AMBIENT,
];

interface TrackCache {
  howl: Howl;
  trackId: string;
  layer: SoundLayerType;
  playing: boolean;
  volume: number;
}

const TRACK_PATHS: Record<string, string> = {
  ocean: 'assets/audio/ambient/ocean.mp3',
  wind: 'assets/audio/ambient/wind.mp3',
  night: 'assets/audio/ambient/night.mp3',
  dawn: 'assets/audio/ambient/dawn.mp3',
  dusk: 'assets/audio/ambient/dusk.mp3',
  storm: 'assets/audio/sfx/storm.mp3',
  exploration: 'assets/audio/music/exploration.mp3',
  game: 'assets/audio/music/game.mp3',
  menu: 'assets/audio/music/menu.mp3',
  tension: 'assets/audio/music/exploration.mp3',
};

export class AmbientSoundModule {
  private static instance: AmbientSoundModule;
  private stateManager: GameStateManager;
  private initialized: boolean = false;

  private trackCache: Map<string, TrackCache> = new Map();
  private activeSounds: Map<SoundLayerType, ActiveLayerSound[]> = new Map();

  private currentNavigationPhase: NavigationPhase = 'docked';
  private currentTimeOfDay: TimeOfDay = 'night';
  private currentWeather: WeatherType | null = null;
  private currentChapterId: string | null = null;
  private currentEventId: string | null = null;
  private currentEventType: string | null = null;
  private currentScreen: GameScreen = 'menu';
  private isFailedState: boolean = false;
  private isRetrying: boolean = false;

  private masterEnabled: boolean = true;
  private layerVolumes: Record<SoundLayerType, number> = {
    base: 1.0,
    weather: 1.0,
    event: 1.0,
    music: 1.0,
  };

  private ducking: {
    enabled: boolean;
    targetLayer: SoundLayerType;
    duckingLayers: SoundLayerType[];
    duckAmount: number;
    fadeDuration: number;
    isActive: boolean;
    currentDuck: number;
  } = {
    enabled: true,
    targetLayer: 'event',
    duckingLayers: ['music', 'base'],
    duckAmount: 0.4,
    fadeDuration: 300,
    isActive: false,
    currentDuck: 0,
  };

  private animationFrameId: number | null = null;
  private lastUpdateTime: number = 0;
  private chapterStartTimer: ReturnType<typeof setTimeout> | null = null;
  private arrivingTimer: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.activeSounds.set('base', []);
    this.activeSounds.set('weather', []);
    this.activeSounds.set('event', []);
    this.activeSounds.set('music', []);
  }

  public static getInstance(): AmbientSoundModule {
    if (!AmbientSoundModule.instance) {
      AmbientSoundModule.instance = new AmbientSoundModule();
    }
    return AmbientSoundModule.instance;
  }

  public initialize(): void {
    if (this.initialized) return;

    this.setupEventListeners();
    this.startUpdateLoop();
    this.initialized = true;

    this.evaluateSoundConditions();
  }

  private setupEventListeners(): void {
    eventBus.on('weather:changed', this.onWeatherChanged.bind(this));
    eventBus.on('daynight:changed', this.onDayNightChanged.bind(this));
    eventBus.on('chapter:started', this.onChapterStarted.bind(this));
    eventBus.on('route:started', this.onRouteStarted.bind(this));
    eventBus.on('route:stopped', this.onRouteStopped.bind(this));
    eventBus.on('route:completed', this.onRouteCompleted.bind(this));
    eventBus.on('seaevent:triggered', this.onSeaEventTriggered.bind(this));
    eventBus.on('seaevent:closed', this.onSeaEventClosed.bind(this));
    eventBus.on('settings:updated', this.onSettingsUpdated.bind(this));
    eventBus.on('game:pause', this.onGamePause.bind(this));
    eventBus.on('game:resume', this.onGameResume.bind(this));
    eventBus.on('objective:completed', this.onObjectiveCompleted.bind(this));
    eventBus.on('meteor:hit', this.onMeteorHit.bind(this));
    eventBus.on('ship:collision', this.onShipCollision.bind(this));
    eventBus.on('chapter:completed', this.onChapterCompleted.bind(this));
    eventBus.on('screen:changed', this.onScreenChanged.bind(this));
    eventBus.on('music:play', this.onMusicPlay.bind(this));
    eventBus.on('ambient:play', this.onAmbientPlay.bind(this));
    eventBus.on('weather:warning:started', this.onWeatherWarningStarted.bind(this));
    eventBus.on('weather:warning:beat', this.onWeatherWarningBeat.bind(this));
    eventBus.on('weather:warning:ended', this.onWeatherWarningEnded.bind(this));
    
    eventBus.on('chapter:failed', this.onChapterFailed.bind(this));
    eventBus.on('retry:started', this.onRetryStarted.bind(this));
    eventBus.on('retry:abandoned', this.onRetryAbandoned.bind(this));
    eventBus.on('retry:completed', this.onRetryCompleted.bind(this));
  }

  private startUpdateLoop(): void {
    const update = (timestamp: number) => {
      if (!this.lastUpdateTime) this.lastUpdateTime = timestamp;
      const delta = (timestamp - this.lastUpdateTime) / 1000;
      this.lastUpdateTime = timestamp;

      this.updateFades(delta);

      this.animationFrameId = requestAnimationFrame(update);
    };
    this.animationFrameId = requestAnimationFrame(update);
  }

  private updateFades(delta: number): void {
    if (!this.masterEnabled) return;

    this.updateDucking(delta);

    this.activeSounds.forEach((sounds, layer) => {
      const updatedSounds: ActiveLayerSound[] = [];

      sounds.forEach(activeSound => {
        const config = activeSound.config;
        const fadeStrategy = config.fadeStrategy;

        let baseVolume = activeSound.targetVolume;
        if (this.ducking.enabled && this.ducking.duckingLayers.includes(layer) && this.ducking.isActive) {
          baseVolume *= (1 - this.ducking.currentDuck);
        }

        if (activeSound.isFadingIn) {
          const elapsed = (Date.now() - activeSound.fadeStartTime) / 1000;
          const fadeDuration = fadeStrategy.fadeInDuration / 1000;
          const progress = Math.min(1, elapsed / fadeDuration);

          activeSound.currentVolume = baseVolume * this.easeInOutCubic(progress);

          if (progress >= 1) {
            activeSound.isFadingIn = false;
            activeSound.currentVolume = baseVolume;
          }

          this.updateTrackVolume(config, activeSound.currentVolume);
        } else if (activeSound.isFadingOut) {
          const elapsed = (Date.now() - activeSound.fadeStartTime) / 1000;
          const fadeDuration = fadeStrategy.fadeOutDuration / 1000;
          const progress = Math.min(1, elapsed / fadeDuration);

          activeSound.currentVolume = activeSound.currentVolume * (1 - this.easeInOutCubic(progress));

          if (progress >= 1) {
            this.stopTrack(config);
            return;
          }

          this.updateTrackVolume(config, activeSound.currentVolume);
        } else {
          if (Math.abs(activeSound.currentVolume - baseVolume) > 0.001) {
            activeSound.currentVolume = baseVolume;
            this.updateTrackVolume(config, activeSound.currentVolume);
          }
        }

        updatedSounds.push(activeSound);
      });

      this.activeSounds.set(layer, updatedSounds);
    });
  }

  private updateDucking(delta: number): void {
    if (!this.ducking.enabled) return;

    const targetLayerSounds = this.activeSounds.get(this.ducking.targetLayer) || [];
    const hasActiveTarget = targetLayerSounds.some(s => !s.isFadingOut && s.currentVolume > 0.01);

    const duckSpeed = delta / (this.ducking.fadeDuration / 1000);

    if (hasActiveTarget && !this.ducking.isActive) {
      this.ducking.isActive = true;
    } else if (!hasActiveTarget && this.ducking.isActive) {
      this.ducking.isActive = false;
    }

    const targetDuck = this.ducking.isActive ? this.ducking.duckAmount : 0;

    if (Math.abs(this.ducking.currentDuck - targetDuck) > 0.001) {
      if (this.ducking.currentDuck < targetDuck) {
        this.ducking.currentDuck = Math.min(targetDuck, this.ducking.currentDuck + duckSpeed);
      } else {
        this.ducking.currentDuck = Math.max(targetDuck, this.ducking.currentDuck - duckSpeed);
      }
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private onWeatherChanged(weather: WeatherType | null): void {
    this.currentWeather = weather;
    this.updateNavigationPhase();
    this.evaluateSoundConditions();
  }

  private updateNavigationPhase(): void {
    const isSailing = this.currentNavigationPhase === 'sailing' ||
                      this.currentNavigationPhase === 'storm_sailing' ||
                      this.currentNavigationPhase === 'arriving';

    const isStorm = this.currentWeather?.id?.includes('storm') &&
                    (this.currentWeather?.intensity ?? 0) >= 0.4;

    if (isSailing && isStorm) {
      this.currentNavigationPhase = 'storm_sailing';
    } else if (this.currentNavigationPhase === 'storm_sailing' && !isStorm) {
      this.currentNavigationPhase = 'sailing';
    }
  }

  private onDayNightChanged(data: any): void {
    if (data?.timeOfDay) {
      this.currentTimeOfDay = data.timeOfDay;
      this.evaluateSoundConditions();
    }
  }

  private onChapterStarted(chapter: any): void {
    this.currentChapterId = chapter?.id || null;
    this.currentEventType = 'chapter_start';
    this.evaluateSoundConditions();

    if (this.chapterStartTimer) clearTimeout(this.chapterStartTimer);
    this.chapterStartTimer = setTimeout(() => {
      this.currentEventType = null;
      this.evaluateSoundConditions();
      this.chapterStartTimer = null;
    }, 5000);
  }

  private onRouteStarted(): void {
    this.currentNavigationPhase = 'sailing';
    this.updateNavigationPhase();
    this.evaluateSoundConditions();
  }

  private onRouteStopped(): void {
    this.currentNavigationPhase = 'docked';
    this.evaluateSoundConditions();
  }

  private onRouteCompleted(): void {
    this.currentNavigationPhase = 'arriving';
    this.evaluateSoundConditions();

    if (this.arrivingTimer) clearTimeout(this.arrivingTimer);
    this.arrivingTimer = setTimeout(() => {
      this.currentNavigationPhase = 'docked';
      this.evaluateSoundConditions();
      this.arrivingTimer = null;
    }, 3000);
  }

  private onSeaEventTriggered(event: any): void {
    this.currentEventId = event?.id || null;
    this.currentEventType = event?.type || null;
    this.evaluateSoundConditions();
  }

  private onSeaEventClosed(): void {
    this.currentEventId = null;
    this.currentEventType = null;
    this.evaluateSoundConditions();
  }

  private onObjectiveCompleted(): void {
    this.triggerTemporarySound(
      {
        trackId: 'game',
        layer: 'music',
        baseVolume: 0.35,
        priority: 50,
        fadeStrategy: {
          fadeInDuration: 800,
          fadeOutDuration: 1500,
          crossfade: true,
        },
      },
      3000
    );
  }

  private onMeteorHit(data: any): void {
    this.triggerTemporarySound(
      {
        trackId: 'storm',
        layer: 'event',
        baseVolume: 0.4,
        priority: 60,
        fadeStrategy: {
          fadeInDuration: 100,
          fadeOutDuration: 800,
          crossfade: false,
        },
      },
      1500
    );
  }

  private onShipCollision(data: any): void {
    const impactForce = data?.impactForce || 1;
    this.triggerTemporarySound(
      {
        trackId: 'storm',
        layer: 'event',
        baseVolume: Math.min(0.6, 0.2 + impactForce * 0.3),
        priority: 55,
        fadeStrategy: {
          fadeInDuration: 50,
          fadeOutDuration: 600,
          crossfade: false,
        },
      },
      1000
    );
  }

  private onScreenChanged(screen: GameScreen): void {
    if (this.currentScreen === screen) return;
    this.currentScreen = screen;

    if (screen !== 'game') {
      this.currentNavigationPhase = 'docked';
      this.currentWeather = null;
      this.currentEventType = null;
    }

    this.evaluateSoundConditions();
  }

  private onChapterCompleted(): void {
    this.currentNavigationPhase = 'docked';
    this.currentWeather = null;
    this.currentEventType = null;
    this.currentEventId = null;

    const layers: SoundLayerType[] = ['base', 'weather', 'event', 'music'];
    layers.forEach(layer => {
      const sounds = this.activeSounds.get(layer) || [];
      sounds.forEach(sound => {
        const isDirectMenuMusic =
          layer === 'music' &&
          (sound.config.trackId === 'menu');
        if (isDirectMenuMusic) return;

        if (!sound.isFadingOut) {
          sound.isFadingOut = true;
          sound.isFadingIn = false;
          sound.fadeStartTime = Date.now();
        }
      });
    });

    this.evaluateSoundConditions();
  }

  private onMusicPlay(trackId: string): void {
    this.playDirectTrack(trackId, 'music');
  }

  private onAmbientPlay(trackId: string): void {
    this.playDirectTrack(trackId, 'base');
  }

  private onWeatherWarningStarted(data: { warning: any; eventConfig: any }): void {
    const { warning } = data;
    const intensity = warning.intensity;
    
    this.setLayerVolume('music', Math.max(0.2, 1 - intensity * 0.5));
    this.setLayerVolume('base', Math.max(0.3, 1 - intensity * 0.3));
    
    this.triggerTemporarySound(
      {
        trackId: 'storm',
        layer: 'event',
        baseVolume: 0.3 + intensity * 0.3,
        priority: 40,
        fadeStrategy: {
          fadeInDuration: 500,
          fadeOutDuration: 1000,
          crossfade: true,
        },
      },
      2000
    );
    
    const baseInterval = 3000;
    const beatInterval = Math.max(500, baseInterval - intensity * 2500);
    this.startWarningSoundBeat(warning, beatInterval);
  }

  private onWeatherWarningBeat(data: { warning: any; urgency: number; remaining: number }): void {
    const { warning, urgency, remaining } = data;
    
    const volume = 0.2 + urgency * 0.4;
    const pitch = 1 + urgency * 0.5;
    
    this.triggerTemporarySound(
      {
        trackId: 'storm',
        layer: 'event',
        baseVolume: volume,
        priority: 45,
        fadeStrategy: {
          fadeInDuration: 100,
          fadeOutDuration: 500,
          crossfade: false,
        },
      },
      800
    );
    
    if (remaining <= 5) {
      this.setLayerVolume('weather', 0.8);
    }
  }

  private onWeatherWarningEnded(data: { warning: any }): void {
    this.stopWarningSoundBeat();
    
    this.setLayerVolume('music', 1.0);
    this.setLayerVolume('base', 1.0);
    this.setLayerVolume('weather', 1.0);
    
    this.evaluateSoundConditions();
  }

  private onChapterFailed(event: any): void {
    this.isFailedState = true;
    this.isRetrying = false;
    
    const layers: SoundLayerType[] = ['base', 'weather', 'event', 'music'];
    layers.forEach(layer => {
      const sounds = this.activeSounds.get(layer) || [];
      sounds.forEach(sound => {
        if (!sound.isFadingOut) {
          sound.isFadingOut = true;
          sound.isFadingIn = false;
          sound.fadeStartTime = Date.now();
        }
      });
    });

    setTimeout(() => {
      this.triggerTemporarySound(
        {
          trackId: 'tension',
          layer: 'music',
          baseVolume: 0.4,
          priority: 100,
          fadeStrategy: {
            fadeInDuration: 2000,
            fadeOutDuration: 3000,
            crossfade: true,
          },
        },
        15000
      );
      
      this.triggerTemporarySound(
        {
          trackId: 'storm',
          layer: 'base',
          baseVolume: 0.15,
          priority: 90,
          fadeStrategy: {
            fadeInDuration: 3000,
            fadeOutDuration: 4000,
            crossfade: true,
          },
        },
        20000
      );
    }, 500);

    this.setLayerVolume('music', 0.7);
    this.setLayerVolume('base', 0.6);
    this.setLayerVolume('weather', 0.5);
    this.setLayerVolume('event', 0.8);
  }

  private onRetryStarted(event: any): void {
    this.isFailedState = false;
    this.isRetrying = true;
    
    const layers: SoundLayerType[] = ['base', 'weather', 'event', 'music'];
    layers.forEach(layer => {
      const sounds = this.activeSounds.get(layer) || [];
      sounds.forEach(sound => {
        if (sound.config.id.startsWith('temp_') && !sound.isFadingOut) {
          sound.isFadingOut = true;
          sound.isFadingIn = false;
          sound.fadeStartTime = Date.now();
        }
      });
    });

    setTimeout(() => {
      this.setLayerVolume('music', 1.0);
      this.setLayerVolume('base', 1.0);
      this.setLayerVolume('weather', 1.0);
      this.setLayerVolume('event', 1.0);

      this.triggerTemporarySound(
        {
          trackId: 'exploration',
          layer: 'music',
          baseVolume: 0.35,
          priority: 80,
          fadeStrategy: {
            fadeInDuration: 2000,
            fadeOutDuration: 3000,
            crossfade: true,
          },
        },
        8000
      );

      this.evaluateSoundConditions();
    }, 1000);
  }

  private onRetryAbandoned(event: any): void {
    this.isFailedState = false;
    this.isRetrying = false;
    
    const layers: SoundLayerType[] = ['base', 'weather', 'event', 'music'];
    layers.forEach(layer => {
      const sounds = this.activeSounds.get(layer) || [];
      sounds.forEach(sound => {
        if (!sound.isFadingOut) {
          sound.isFadingOut = true;
          sound.isFadingIn = false;
          sound.fadeStartTime = Date.now();
        }
      });
    });

    setTimeout(() => {
      this.setLayerVolume('music', 1.0);
      this.setLayerVolume('base', 1.0);
      this.setLayerVolume('weather', 1.0);
      this.setLayerVolume('event', 1.0);
      this.evaluateSoundConditions();
    }, 500);
  }

  private onRetryCompleted(event: any): void {
    this.isFailedState = false;
    this.isRetrying = false;
    
    if (event.success) {
      setTimeout(() => {
        this.triggerTemporarySound(
          {
            trackId: 'game',
            layer: 'music',
            baseVolume: 0.4,
            priority: 70,
            fadeStrategy: {
              fadeInDuration: 1500,
              fadeOutDuration: 2500,
              crossfade: true,
            },
          },
          6000
        );
      }, 500);
    }

    this.setLayerVolume('music', 1.0);
    this.setLayerVolume('base', 1.0);
    this.setLayerVolume('weather', 1.0);
    this.setLayerVolume('event', 1.0);
    this.evaluateSoundConditions();
  }

  private warningBeatInterval: number | null = null;

  private startWarningSoundBeat(warning: any, interval: number): void {
    this.stopWarningSoundBeat();
    
    this.warningBeatInterval = window.setInterval(() => {
      if (!this.warningBeatInterval) return;
      
      this.triggerTemporarySound(
        {
          trackId: 'storm',
          layer: 'event',
          baseVolume: 0.2 + warning.intensity * 0.2,
          priority: 35,
          fadeStrategy: {
            fadeInDuration: 200,
            fadeOutDuration: 600,
            crossfade: false,
          },
        },
        1000
      );
    }, interval);
  }

  private stopWarningSoundBeat(): void {
    if (this.warningBeatInterval) {
      clearInterval(this.warningBeatInterval);
      this.warningBeatInterval = null;
    }
  }

  private playDirectTrack(trackId: string, layer: SoundLayerType): void {
    if (!TRACK_PATHS[trackId]) return;

    const config: LayerSoundConfig = {
      id: `direct_${trackId}_${layer}_${Date.now()}`,
      layer,
      trackId,
      baseVolume: layer === 'music' ? 0.4 : 0.3,
      priority: 5,
      fadeStrategy: {
        fadeInDuration: 2000,
        fadeOutDuration: 1500,
        crossfade: true,
      },
      conditions: {},
    };

    const existing = (this.activeSounds.get(layer) || []).filter(
      s => s.config.trackId === trackId && !s.isFadingOut
    );

    if (existing.length > 0) return;

    this.playSound(config);
  }

  private onSettingsUpdated(): void {
    this.applyVolumeSettings();
  }

  private onGamePause(): void {
    this.masterEnabled = false;
    this.muteAllSounds();
  }

  private onGameResume(): void {
    this.masterEnabled = true;
    this.unmuteAllSounds();
  }

  private evaluateSoundConditions(): void {
    if (!this.initialized) return;

    const matchingConfigs = ALL_SOUND_CONFIGS.filter(config =>
      this.checkConditions(config.conditions)
    );

    const layers: SoundLayerType[] = ['base', 'weather', 'event', 'music'];
    layers.forEach(layer => {
      const layerMatchingConfigs = matchingConfigs.filter(c => c.layer === layer);
      this.updateLayerSounds(layer, layerMatchingConfigs);
    });
  }

  private checkConditions(conditions: SoundConditions): boolean {
    if (conditions.screens && conditions.screens.length > 0) {
      if (!conditions.screens.includes(this.currentScreen)) return false;
    } else {
      if (this.currentScreen !== 'game') return false;
    }

    if (conditions.weatherTypes && conditions.weatherTypes.length > 0) {
      const weatherId = this.currentWeather?.id || 'clear';
      const hasWeather = conditions.weatherTypes.some(w => weatherId.includes(w));
      if (!hasWeather) return false;

      if (conditions.weatherMinIntensity !== undefined && this.currentWeather) {
        if (this.currentWeather.intensity < conditions.weatherMinIntensity) return false;
      }
    }

    if (conditions.timeOfDay && conditions.timeOfDay.length > 0) {
      if (!conditions.timeOfDay.includes(this.currentTimeOfDay)) return false;
    }

    if (conditions.chapters && conditions.chapters.length > 0) {
      if (!this.currentChapterId || !conditions.chapters.includes(this.currentChapterId)) return false;
    }

    if (conditions.navigationPhases && conditions.navigationPhases.length > 0) {
      if (!conditions.navigationPhases.includes(this.currentNavigationPhase)) return false;
    }

    if (conditions.eventTypes && conditions.eventTypes.length > 0) {
      if (!this.currentEventType || !conditions.eventTypes.includes(this.currentEventType)) return false;
    }

    if (conditions.minStarsDiscovered !== undefined) {
      const discoveredCount = this.stateManager.getState().discoveredStars?.length || 0;
      if (discoveredCount < conditions.minStarsDiscovered) return false;
    }

    return true;
  }

  private updateLayerSounds(layer: SoundLayerType, matchingConfigs: LayerSoundConfig[]): void {
    const currentActive = this.activeSounds.get(layer) || [];

    const highestPriority = Math.max(...matchingConfigs.map(c => c.priority), 0);
    const toPlayConfigs = matchingConfigs.filter(c => c.priority === highestPriority);

    const currentIds = new Set(currentActive.filter(s => !s.config.id.startsWith('direct_') && !s.config.id.startsWith('temp_')).map(s => s.config.id));
    const toPlayIds = new Set(toPlayConfigs.map(c => c.id));

    const toStop = currentActive.filter(s => {
      if (s.config.id.startsWith('direct_') || s.config.id.startsWith('temp_')) return false;
      if (s.isFadingOut) return false;
      return !toPlayIds.has(s.config.id);
    });

    const toStart = toPlayConfigs.filter(c => !currentIds.has(c.id));

    toStop.forEach(sound => {
      this.fadeOutSound(sound);
    });

    toStart.forEach(config => {
      this.playSound(config);
    });

    const stillActive = currentActive.filter(s => {
      if (s.config.id.startsWith('direct_') || s.config.id.startsWith('temp_')) return true;
      return toPlayIds.has(s.config.id);
    });

    stillActive.forEach(sound => {
      if (sound.config.id.startsWith('direct_') || sound.config.id.startsWith('temp_')) return;
      const targetVolume = this.calculateTargetVolume(sound.config);
      if (Math.abs(sound.targetVolume - targetVolume) > 0.01 && !sound.isFadingIn && !sound.isFadingOut) {
        sound.targetVolume = targetVolume;
        sound.isFadingIn = true;
        sound.fadeStartTime = Date.now();
        sound.currentVolume = sound.currentVolume || 0;
      }
    });
  }

  private calculateTargetVolume(config: LayerSoundConfig): number {
    let volume = config.baseVolume;

    if (this.currentWeather && config.conditions.weatherTypes?.includes('storm')) {
      const intensity = this.currentWeather.intensity;
      volume = config.baseVolume * (0.5 + intensity * 0.5);
    }

    volume *= this.layerVolumes[config.layer];

    const settings = this.stateManager.getState().settings;
    if (settings) {
      volume *= settings.masterVolume;
      if (config.layer === 'music') volume *= settings.musicVolume;
      if (config.layer === 'weather' || config.layer === 'event') volume *= settings.sfxVolume;
      if (config.layer === 'base') volume *= settings.ambientVolume;
    }

    return Math.max(0, Math.min(1, volume));
  }

  private playSound(config: LayerSoundConfig): void {
    if (!this.masterEnabled) return;

    const track = this.getOrCreateTrack(config);
    if (!track) return;

    const targetVolume = this.calculateTargetVolume(config);

    const activeSound: ActiveLayerSound = {
      config,
      currentVolume: 0,
      targetVolume,
      isFadingIn: true,
      isFadingOut: false,
      fadeStartTime: Date.now(),
    };

    track.howl.volume(0);
    track.howl.play();
    track.playing = true;

    const layerSounds = this.activeSounds.get(config.layer) || [];
    layerSounds.push(activeSound);
    this.activeSounds.set(config.layer, layerSounds);
  }

  private fadeOutSound(activeSound: ActiveLayerSound): void {
    if (activeSound.isFadingOut) return;

    activeSound.isFadingOut = true;
    activeSound.isFadingIn = false;
    activeSound.fadeStartTime = Date.now();
    activeSound.targetVolume = activeSound.currentVolume;
  }

  private stopTrack(config: LayerSoundConfig): void {
    const track = this.trackCache.get(config.id);
    if (track && track.howl) {
      track.howl.stop();
      track.playing = false;
      track.volume = 0;
    }
  }

  private updateTrackVolume(config: LayerSoundConfig, volume: number): void {
    const track = this.trackCache.get(config.id);
    if (track && track.howl) {
      track.howl.volume(Math.max(0, Math.min(1, volume)));
      track.volume = volume;
    }
  }

  private getOrCreateTrack(config: LayerSoundConfig): TrackCache | null {
    let track = this.trackCache.get(config.id);
    if (track) return track;

    const trackPath = TRACK_PATHS[config.trackId];
    if (!trackPath) return null;

    try {
      const howl = new Howl({
        src: [trackPath],
        loop: true,
        volume: 0,
        preload: true,
        onloaderror: () => {
        },
      });

      track = {
        howl,
        trackId: config.trackId,
        layer: config.layer,
        playing: false,
        volume: 0,
      };

      this.trackCache.set(config.id, track);
      return track;
    } catch (_e) {
      return null;
    }
  }

  private applyVolumeSettings(): void {
    this.activeSounds.forEach((sounds) => {
      sounds.forEach(activeSound => {
        if (!activeSound.isFadingIn && !activeSound.isFadingOut) {
          const targetVolume = this.calculateTargetVolume(activeSound.config);
          activeSound.targetVolume = targetVolume;
          activeSound.currentVolume = targetVolume;
          this.updateTrackVolume(activeSound.config, targetVolume);
        }
      });
    });
  }

  private muteAllSounds(): void {
    this.trackCache.forEach(track => {
      if (track.howl && track.playing) {
        track.howl.fade(track.howl.volume(), 0, 500);
      }
    });
  }

  private unmuteAllSounds(): void {
    this.activeSounds.forEach(sounds => {
      sounds.forEach(activeSound => {
        const track = this.trackCache.get(activeSound.config.id);
        if (track && track.howl) {
          track.howl.fade(0, activeSound.currentVolume, 500);
        }
      });
    });
  }

  public setLayerVolume(layer: SoundLayerType, volume: number): void {
    this.layerVolumes[layer] = Math.max(0, Math.min(1, volume));
    this.evaluateSoundConditions();
  }

  public getLayerVolume(layer: SoundLayerType): number {
    return this.layerVolumes[layer];
  }

  public getActiveSounds(): Map<SoundLayerType, ActiveLayerSound[]> {
    return new Map(this.activeSounds);
  }

  public getCurrentNavigationPhase(): NavigationPhase {
    return this.currentNavigationPhase;
  }

  public getCurrentScreen(): GameScreen {
    return this.currentScreen;
  }

  public triggerTemporarySound(config: Partial<LayerSoundConfig> & { trackId: string; layer: SoundLayerType }, duration: number = 3000): void {
    const fullConfig: LayerSoundConfig = {
      id: `temp_${Date.now()}`,
      layer: config.layer,
      trackId: config.trackId,
      baseVolume: config.baseVolume ?? 0.5,
      priority: config.priority ?? 100,
      fadeStrategy: config.fadeStrategy ?? {
        fadeInDuration: 300,
        fadeOutDuration: 500,
        crossfade: true,
      },
      conditions: config.conditions ?? {},
    };

    this.playSound(fullConfig);

    setTimeout(() => {
      const layerSounds = this.activeSounds.get(fullConfig.layer) || [];
      const sound = layerSounds.find(s => s.config.id === fullConfig.id);
      if (sound) {
        this.fadeOutSound(sound);
      }
    }, duration);
  }

  public addSoundConfig(config: LayerSoundConfig): void {
    ALL_SOUND_CONFIGS.push(config);
    this.evaluateSoundConditions();
  }

  public removeSoundConfig(id: string): void {
    const index = ALL_SOUND_CONFIGS.findIndex(c => c.id === id);
    if (index > -1) {
      ALL_SOUND_CONFIGS.splice(index, 1);

      const track = this.trackCache.get(id);
      if (track) {
        track.howl.unload();
        this.trackCache.delete(id);
      }

      const config = ALL_SOUND_CONFIGS[index];
      const layer = config?.layer;
      if (layer) {
        const layerSounds = this.activeSounds.get(layer) || [];
        const filtered = layerSounds.filter(s => s.config.id !== id);
        this.activeSounds.set(layer, filtered);
      }
    }
  }

  public setDuckingEnabled(enabled: boolean): void {
    this.ducking.enabled = enabled;
  }

  public setDuckingAmount(amount: number): void {
    this.ducking.duckAmount = Math.max(0, Math.min(1, amount));
  }

  public getDuckingAmount(): number {
    return this.ducking.currentDuck;
  }

  public getState(): {
    navigationPhase: NavigationPhase;
    timeOfDay: TimeOfDay;
    weather: WeatherType | null;
    chapterId: string | null;
    screen: GameScreen;
    activeLayers: Record<SoundLayerType, number>;
    duckingAmount: number;
    masterEnabled: boolean;
    isFailedState: boolean;
    isRetrying: boolean;
  } {
    const activeLayers: Record<SoundLayerType, number> = {
      base: 0,
      weather: 0,
      event: 0,
      music: 0,
    };

    this.activeSounds.forEach((sounds, layer) => {
      const totalVolume = sounds.reduce((sum, s) => sum + s.currentVolume, 0);
      activeLayers[layer] = totalVolume;
    });

    return {
      navigationPhase: this.currentNavigationPhase,
      timeOfDay: this.currentTimeOfDay,
      weather: this.currentWeather,
      chapterId: this.currentChapterId,
      screen: this.currentScreen,
      activeLayers,
      duckingAmount: this.ducking.currentDuck,
      masterEnabled: this.masterEnabled,
      isFailedState: this.isFailedState,
      isRetrying: this.isRetrying,
    };
  }

  public setMasterEnabled(enabled: boolean): void {
    if (this.masterEnabled === enabled) return;

    this.masterEnabled = enabled;

    if (enabled) {
      this.unmuteAllSounds();
    } else {
      this.muteAllSounds();
    }
  }

  public isMasterEnabled(): boolean {
    return this.masterEnabled;
  }

  public getAllSoundConfigs(): LayerSoundConfig[] {
    return [...ALL_SOUND_CONFIGS];
  }

  public triggerWeatherSound(type: string, intensity: number = 0.5, duration: number = 10000): void {
    const weatherTypes: Record<string, string> = {
      storm: 'storm',
      fog: 'fog',
      meteor: 'meteor',
      clear: 'clear',
    };

    const weatherId = weatherTypes[type] || type;
    const mockWeather: WeatherType = {
      id: weatherId,
      name: type,
      duration: duration / 1000,
      intensity,
      effects: {
        visibility: 1 - intensity * 0.5,
        speedModifier: 1 - intensity * 0.3,
        starVisibility: 1 - intensity * 0.5,
        taskProgressModifier: 1 - intensity * 0.2,
        supplyConsumptionModifier: 1 + intensity * 0.3,
        collisionChanceModifier: 1 + intensity * 1.0,
      },
    };

    this.onWeatherChanged(mockWeather);

    setTimeout(() => {
      if (this.currentWeather?.id === weatherId) {
        this.onWeatherChanged(null);
      }
    }, duration);
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.chapterStartTimer) {
      clearTimeout(this.chapterStartTimer);
      this.chapterStartTimer = null;
    }

    if (this.arrivingTimer) {
      clearTimeout(this.arrivingTimer);
      this.arrivingTimer = null;
    }

    this.trackCache.forEach(track => {
      if (track.howl) {
        track.howl.unload();
      }
    });
    this.trackCache.clear();
    this.activeSounds.clear();

    this.initialized = false;
  }
}
