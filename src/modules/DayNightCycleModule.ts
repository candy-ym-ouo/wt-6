import * as THREE from 'three';
import { GameEngine } from '../core/GameEngine';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import {
  TimeOfDay,
  DayNightCycleState,
  DayNightLightConfig,
  DayNightWeatherWeights,
  DayNightStarVisibility,
} from '../types';

const LIGHT_PRESETS: Record<TimeOfDay, DayNightLightConfig> = {
  dawn: {
    ambientColor: 0x8b6b4a,
    ambientIntensity: 0.35,
    directionalColor: 0xffaa66,
    directionalIntensity: 0.5,
    fogColor: 0x2a1f3a,
    fogDensity: 0.007,
    backgroundColor: 0x1a1030,
    exposure: 1.0,
  },
  day: {
    ambientColor: 0x607090,
    ambientIntensity: 0.6,
    directionalColor: 0xffeedd,
    directionalIntensity: 0.9,
    fogColor: 0x1a2a4a,
    fogDensity: 0.006,
    backgroundColor: 0x14203a,
    exposure: 1.3,
  },
  dusk: {
    ambientColor: 0x7a4a3a,
    ambientIntensity: 0.3,
    directionalColor: 0xff6633,
    directionalIntensity: 0.4,
    fogColor: 0x201525,
    fogDensity: 0.008,
    backgroundColor: 0x150a20,
    exposure: 0.9,
  },
  night: {
    ambientColor: 0x303050,
    ambientIntensity: 0.2,
    directionalColor: 0xccccff,
    directionalIntensity: 0.3,
    fogColor: 0x0a0a1a,
    fogDensity: 0.01,
    backgroundColor: 0x0a0a1a,
    exposure: 0.8,
  },
};

const WEATHER_WEIGHTS: Record<TimeOfDay, DayNightWeatherWeights> = {
  dawn: { storm: 0.4, fog: 0.9, meteor: 0.1, clear: 0.7 },
  day: { storm: 0.7, fog: 0.3, meteor: 0.05, clear: 1.0 },
  dusk: { storm: 0.5, fog: 0.6, meteor: 0.3, clear: 0.6 },
  night: { storm: 0.3, fog: 0.5, meteor: 1.0, clear: 0.5 },
};

const STAR_VISIBILITY: Record<TimeOfDay, DayNightStarVisibility> = {
  dawn: { starBrightness: 0.4, backgroundStarOpacity: 0.3, constellationLineOpacity: 0.25 },
  day: { starBrightness: 0.1, backgroundStarOpacity: 0.05, constellationLineOpacity: 0.1 },
  dusk: { starBrightness: 0.5, backgroundStarOpacity: 0.4, constellationLineOpacity: 0.3 },
  night: { starBrightness: 1.0, backgroundStarOpacity: 1.0, constellationLineOpacity: 0.8 },
};

const AMBIENT_MAP: Record<TimeOfDay, string> = {
  dawn: 'dawn',
  day: 'wind',
  dusk: 'dusk',
  night: 'night',
};

const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  dawn: '黎明',
  day: '白昼',
  dusk: '黄昏',
  night: '深夜',
};

const DEFAULT_CYCLE_STATE: DayNightCycleState = {
  currentTime: 21,
  timeScale: 0.15,
  timeOfDay: 'night',
  dayCount: 1,
  cycleEnabled: true,
};

export class DayNightCycleModule {
  private static instance: DayNightCycleModule;
  private engine: GameEngine;
  private stateManager: GameStateManager;
  private cycleState: DayNightCycleState;
  private ambientLight: THREE.AmbientLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  private currentLightConfig: DayNightLightConfig;
  private targetLightConfig: DayNightLightConfig;
  private lightLerpSpeed: number = 2.0;
  private overlayEl: HTMLElement | null = null;
  private previousTimeOfDay: TimeOfDay | null = null;

  private constructor() {
    this.engine = GameEngine.getInstance();
    this.stateManager = GameStateManager.getInstance();
    this.cycleState = { ...DEFAULT_CYCLE_STATE };
    this.currentLightConfig = { ...LIGHT_PRESETS.night };
    this.targetLightConfig = { ...LIGHT_PRESETS.night };

    this.engine.onUpdate(this.update.bind(this));
    this.setupEventListeners();
  }

  public static getInstance(): DayNightCycleModule {
    if (!DayNightCycleModule.instance) {
      DayNightCycleModule.instance = new DayNightCycleModule();
    }
    return DayNightCycleModule.instance;
  }

  private setupEventListeners(): void {
    eventBus.on('daynight:reset', this.onReset.bind(this));
    eventBus.on('daynight:load', this.onLoadState.bind(this));
    eventBus.on('game:resume', () => {
      this.cycleState.cycleEnabled = true;
    });
    eventBus.on('game:pause', () => {
      this.cycleState.cycleEnabled = false;
    });
  }

  public initialize(): void {
    this.createOverlay();
    this.findLights();
    this.applyLightConfigImmediate(this.currentLightConfig);
    this.cycleState.timeOfDay = this.computeTimeOfDay(this.cycleState.currentTime);
    this.previousTimeOfDay = this.cycleState.timeOfDay;
    this.targetLightConfig = { ...LIGHT_PRESETS[this.cycleState.timeOfDay] };
    this.emitTimeOfDayChange();
  }

  private createOverlay(): void {
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'daynight-overlay';
    this.overlayEl.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      pointer-events: none;
      z-index: 1;
      transition: background-color 3s ease;
    `;
    this.updateOverlayColor(this.cycleState.timeOfDay);
    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
      uiLayer.appendChild(this.overlayEl);
    }
  }

  private updateOverlayColor(tod: TimeOfDay): void {
    if (!this.overlayEl) return;
    const colors: Record<TimeOfDay, string> = {
      dawn: 'rgba(180, 120, 60, 0.06)',
      day: 'rgba(200, 200, 255, 0.04)',
      dusk: 'rgba(200, 80, 40, 0.07)',
      night: 'rgba(0, 0, 20, 0.12)',
    };
    this.overlayEl.style.backgroundColor = colors[tod];
  }

  private findLights(): void {
    this.engine.scene.traverse((child) => {
      if (child instanceof THREE.AmbientLight) {
        this.ambientLight = child;
      }
      if (child instanceof THREE.DirectionalLight) {
        this.directionalLight = child;
      }
    });
  }

  private computeTimeOfDay(hour: number): TimeOfDay {
    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 17) return 'day';
    if (hour >= 17 && hour < 19) return 'dusk';
    return 'night';
  }

  private update(delta: number, _elapsed: number): void {
    if (!this.cycleState.cycleEnabled) return;

    this.cycleState.currentTime += delta * this.cycleState.timeScale;
    if (this.cycleState.currentTime >= 24) {
      this.cycleState.currentTime -= 24;
      this.cycleState.dayCount++;
      eventBus.emit('daynight:newday', { dayCount: this.cycleState.dayCount });
    }

    const newTOD = this.computeTimeOfDay(this.cycleState.currentTime);
    if (newTOD !== this.cycleState.timeOfDay) {
      this.cycleState.timeOfDay = newTOD;
      this.targetLightConfig = { ...LIGHT_PRESETS[newTOD] };
      this.updateOverlayColor(newTOD);
    }

    if (newTOD !== this.previousTimeOfDay) {
      this.previousTimeOfDay = newTOD;
      this.emitTimeOfDayChange();
    }

    this.interpolateLighting(delta);
    eventBus.emit('daynight:tick', this.getCycleInfo());
  }

  private interpolateLighting(delta: number): void {
    const t = Math.min(1, this.lightLerpSpeed * delta);
    this.currentLightConfig.ambientColor = this.lerpColor(
      this.currentLightConfig.ambientColor,
      this.targetLightConfig.ambientColor,
      t
    );
    this.currentLightConfig.ambientIntensity = MathUtils.lerp(
      this.currentLightConfig.ambientIntensity,
      this.targetLightConfig.ambientIntensity,
      t
    );
    this.currentLightConfig.directionalColor = this.lerpColor(
      this.currentLightConfig.directionalColor,
      this.targetLightConfig.directionalColor,
      t
    );
    this.currentLightConfig.directionalIntensity = MathUtils.lerp(
      this.currentLightConfig.directionalIntensity,
      this.targetLightConfig.directionalIntensity,
      t
    );
    this.currentLightConfig.fogColor = this.lerpColor(
      this.currentLightConfig.fogColor,
      this.targetLightConfig.fogColor,
      t
    );
    this.currentLightConfig.fogDensity = MathUtils.lerp(
      this.currentLightConfig.fogDensity,
      this.targetLightConfig.fogDensity,
      t
    );
    this.currentLightConfig.backgroundColor = this.lerpColor(
      this.currentLightConfig.backgroundColor,
      this.targetLightConfig.backgroundColor,
      t
    );
    this.currentLightConfig.exposure = MathUtils.lerp(
      this.currentLightConfig.exposure,
      this.targetLightConfig.exposure,
      t
    );

    this.applyLightConfig(this.currentLightConfig);
  }

  private applyLightConfig(config: DayNightLightConfig): void {
    if (this.ambientLight) {
      this.ambientLight.color.setHex(config.ambientColor);
      this.ambientLight.intensity = config.ambientIntensity;
    }
    if (this.directionalLight) {
      this.directionalLight.color.setHex(config.directionalColor);
      this.directionalLight.intensity = config.directionalIntensity;
    }
    const fog = this.engine.scene.fog as THREE.FogExp2 | null;
    if (fog) {
      fog.color.setHex(config.fogColor);
      fog.density = config.fogDensity;
    }
    (this.engine.scene.background as THREE.Color).setHex(config.backgroundColor);
    this.engine.renderer.toneMappingExposure = config.exposure;
  }

  private applyLightConfigImmediate(config: DayNightLightConfig): void {
    this.currentLightConfig = { ...config };
    this.targetLightConfig = { ...config };
    this.applyLightConfig(config);
  }

  private lerpColor(from: number, to: number, t: number): number {
    const fromC = new THREE.Color(from);
    const toC = new THREE.Color(to);
    fromC.lerp(toC, t);
    return fromC.getHex();
  }

  private emitTimeOfDayChange(): void {
    eventBus.emit('daynight:changed', {
      timeOfDay: this.cycleState.timeOfDay,
      currentTime: this.cycleState.currentTime,
      dayCount: this.cycleState.dayCount,
      lightConfig: LIGHT_PRESETS[this.cycleState.timeOfDay],
      weatherWeights: WEATHER_WEIGHTS[this.cycleState.timeOfDay],
      starVisibility: STAR_VISIBILITY[this.cycleState.timeOfDay],
      ambientTrack: AMBIENT_MAP[this.cycleState.timeOfDay],
      label: TIME_OF_DAY_LABELS[this.cycleState.timeOfDay],
    });
  }

  private onReset(): void {
    this.cycleState = { ...DEFAULT_CYCLE_STATE };
    this.applyLightConfigImmediate(LIGHT_PRESETS.night);
    this.updateOverlayColor('night');
    this.previousTimeOfDay = 'night';
    this.emitTimeOfDayChange();
  }

  private onLoadState(state: DayNightCycleState): void {
    this.loadState(state);
  }

  public getStarVisibility(): DayNightStarVisibility {
    const base = STAR_VISIBILITY[this.cycleState.timeOfDay];
    const blend = this.computeTransitionBlend();
    if (blend === null) return { ...base };
    const next = STAR_VISIBILITY[blend.next];
    return {
      starBrightness: MathUtils.lerp(base.starBrightness, next.starBrightness, blend.factor),
      backgroundStarOpacity: MathUtils.lerp(base.backgroundStarOpacity, next.backgroundStarOpacity, blend.factor),
      constellationLineOpacity: MathUtils.lerp(base.constellationLineOpacity, next.constellationLineOpacity, blend.factor),
    };
  }

  private computeTransitionBlend(): { next: TimeOfDay; factor: number } | null {
    const h = this.cycleState.currentTime;
    if (h >= 4.5 && h < 5) return { next: 'dawn', factor: (h - 4.5) / 0.5 };
    if (h >= 6.5 && h < 7) return { next: 'day', factor: (h - 6.5) / 0.5 };
    if (h >= 16.5 && h < 17) return { next: 'dusk', factor: (h - 16.5) / 0.5 };
    if (h >= 18.5 && h < 19) return { next: 'night', factor: (h - 18.5) / 0.5 };
    return null;
  }

  public getWeatherWeights(): DayNightWeatherWeights {
    return { ...WEATHER_WEIGHTS[this.cycleState.timeOfDay] };
  }

  public getCycleInfo(): DayNightCycleState & { label: string } {
    return {
      ...this.cycleState,
      label: TIME_OF_DAY_LABELS[this.cycleState.timeOfDay],
    };
  }

  public setCycleEnabled(enabled: boolean): void {
    this.cycleState.cycleEnabled = enabled;
  }

  public setTimeScale(scale: number): void {
    this.cycleState.timeScale = Math.max(0, scale);
  }

  public setCurrentTime(hour: number): void {
    this.cycleState.currentTime = ((hour % 24) + 24) % 24;
    const newTOD = this.computeTimeOfDay(this.cycleState.currentTime);
    if (newTOD !== this.cycleState.timeOfDay) {
      this.cycleState.timeOfDay = newTOD;
      this.targetLightConfig = { ...LIGHT_PRESETS[newTOD] };
      this.updateOverlayColor(newTOD);
    }
    if (newTOD !== this.previousTimeOfDay) {
      this.previousTimeOfDay = newTOD;
      this.emitTimeOfDayChange();
    }
  }

  public getSerializableState(): DayNightCycleState {
    return { ...this.cycleState };
  }

  public loadState(state: DayNightCycleState): void {
    this.cycleState = { ...state };
    const tod = this.computeTimeOfDay(this.cycleState.currentTime);
    this.cycleState.timeOfDay = tod;
    this.previousTimeOfDay = tod;
    this.applyLightConfigImmediate(LIGHT_PRESETS[tod]);
    this.updateOverlayColor(tod);
    this.emitTimeOfDayChange();
  }

  public reset(): void {
    this.onReset();
  }

  public dispose(): void {
    if (this.overlayEl) {
      this.overlayEl.remove();
      this.overlayEl = null;
    }
    this.cycleState = { ...DEFAULT_CYCLE_STATE };
  }
}
