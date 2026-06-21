import * as THREE from 'three';
import { GameEngine } from '../core/GameEngine';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import { 
  WeatherEventConfig, 
  WeatherType, 
  DayNightWeatherWeights,
  WeatherWarning,
  WeatherWarningPhase,
  WeatherWarningState
} from '../types';
import { CrewModule } from './CrewModule';
import { DayNightCycleModule } from './DayNightCycleModule';

const DEFAULT_WARNING_TIME = 15;
const WARNING_ICONS: Record<string, string> = {
  storm: '⛈️',
  fog: '🌫️',
  meteor: '☄️',
  clear: '☀️'
};

export class WeatherModule {
  private engine: GameEngine;
  private stateManager: GameStateManager;
  private weatherGroup: THREE.Group;
  private weatherOverlay: HTMLElement | null = null;
  private activeWeather: WeatherType | null = null;
  private weatherEvents: WeatherEventConfig[] = [];
  private weatherParticles: THREE.Points | null = null;
  private lightningMesh: THREE.Mesh | null = null;
  private fog: THREE.FogExp2 | null = null;
  private eventTimers: Map<string, number> = new Map();
  private chapterStartTime: number = 0;
  private dayNightModule: DayNightCycleModule;
  private currentWeatherWeights: DayNightWeatherWeights = { storm: 1, fog: 1, meteor: 1, clear: 1 };
  
  private warningState: WeatherWarningState = {
    activeWarning: null,
    phase: 'idle',
    acknowledgedWarnings: [],
    warningHistory: []
  };
  private warningUpdateInterval: number | null = null;
  private warningBeatInterval: number | null = null;

  constructor() {
    this.engine = GameEngine.getInstance();
    this.stateManager = GameStateManager.getInstance();
    this.dayNightModule = DayNightCycleModule.getInstance();
    
    this.weatherGroup = new THREE.Group();
    this.weatherGroup.name = 'weather';
    this.engine.scene.add(this.weatherGroup);
    
    this.createWeatherOverlay();
    
    this.engine.onUpdate(this.update.bind(this));

    eventBus.on('daynight:changed', this.onDayNightChanged.bind(this));
    eventBus.on('weather:warning:acknowledge', this.acknowledgeWarning.bind(this));
    
    this.initializeWarningState();
  }

  private initializeWarningState(): void {
    this.stateManager.setState({
      weatherWarning: { ...this.warningState }
    });
  }

  private createWeatherOverlay(): void {
    this.weatherOverlay = document.createElement('div');
    this.weatherOverlay.className = 'weather-overlay';
    document.getElementById('ui-layer')!.appendChild(this.weatherOverlay);
  }

  public loadChapterWeather(weatherEvents: WeatherEventConfig[]): void {
    this.clearWeather();
    this.weatherEvents = [...weatherEvents];
    this.chapterStartTime = this.engine.getElapsedTime();
    this.currentWeatherWeights = this.dayNightModule.getWeatherWeights();
    this.scheduleWeatherEvents();
  }

  public restoreChapterWeather(
    weatherEvents: WeatherEventConfig[],
    chapterElapsedSeconds: number,
    savedActiveWeather: WeatherType | null
  ): void {
    this.eventTimers.forEach(timer => clearTimeout(timer));
    this.eventTimers.clear();
    this.clearWeatherVisuals();
    
    this.stopWarningUpdateLoop();
    this.stopWarningBeat();
    this.warningState = {
      activeWarning: null,
      phase: 'idle',
      acknowledgedWarnings: [],
      warningHistory: []
    };

    this.weatherEvents = [...weatherEvents];
    this.chapterStartTime = this.engine.getElapsedTime() - chapterElapsedSeconds;
    this.currentWeatherWeights = this.dayNightModule.getWeatherWeights();

    let weatherRestored = false;
    let warningRestored = false;

    weatherEvents.forEach(event => {
      const eventStart = event.startTime;
      const eventEnd = event.startTime + event.duration;
      const warningTime = event.warningTime ?? DEFAULT_WARNING_TIME;
      const warningStart = eventStart - warningTime;

      if (eventEnd <= chapterElapsedSeconds) {
        return;
      }

      if (warningStart <= chapterElapsedSeconds && chapterElapsedSeconds < eventStart) {
        const remainingWarningSeconds = eventStart - chapterElapsedSeconds;
        
        const warning: WeatherWarning = {
          id: `warning_${event.id}_${Date.now()}`,
          eventId: event.id,
          type: event.type,
          name: event.name,
          startTime: event.startTime,
          warningStartTime: Date.now() - (chapterElapsedSeconds - warningStart) * 1000,
          remainingSeconds: Math.ceil(remainingWarningSeconds),
          totalWarningSeconds: warningTime,
          intensity: event.intensity,
          isActive: true,
          acknowledged: false
        };

        this.warningState.activeWarning = warning;
        this.warningState.phase = 'warning';
        this.warningState.warningHistory.push({
          eventId: event.id,
          warningStart: Date.now() - (chapterElapsedSeconds - warningStart) * 1000,
          weatherStart: this.chapterStartTime + event.startTime,
          acknowledged: false
        });

        this.startWarningUpdateLoop(warning);
        this.startWarningBeat(warning);
        
        warningRestored = true;
        
        const delayMs = remainingWarningSeconds * 1000;
        const timer = window.setTimeout(() => {
          this.triggerWeather(event);
        }, delayMs);
        this.eventTimers.set(event.id, timer);
        
        eventBus.emit('weather:warning:started', {
          warning,
          eventConfig: event
        });
        
        return;
      }

      if (eventStart <= chapterElapsedSeconds && chapterElapsedSeconds < eventEnd) {
        if (savedActiveWeather && savedActiveWeather.id === event.id) {
          const remainingSeconds = eventEnd - chapterElapsedSeconds;
          const remainingMs = remainingSeconds * 1000;

          this.activeWeather = { ...savedActiveWeather };
          this.warningState.phase = 'active';
          this.stateManager.setState({ 
            activeWeather: { ...savedActiveWeather },
            weatherWarning: { ...this.warningState }
          });

          const type = this.getWeatherTypeFromId(event.id);
          const crewModule = CrewModule.getInstance();
          const resistModifier = crewModule.getWeatherResistModifier();
          const effectiveIntensity = event.intensity * resistModifier;
          this.applyWeatherVisuals(type, effectiveIntensity);

          const endTimer = window.setTimeout(() => {
            this.endWeather();
          }, remainingMs);
          this.eventTimers.set(`${event.id}_end`, endTimer);

          eventBus.emit('weather:changed', this.activeWeather);
          weatherRestored = true;
        }
        return;
      }

      if (eventStart > chapterElapsedSeconds) {
        const warningDelaySeconds = eventStart - warningTime - chapterElapsedSeconds;
        if (warningDelaySeconds > 0) {
          const warningDelayMs = warningDelaySeconds * 1000;
          const warningTimer = window.setTimeout(() => {
            this.startWarning(event);
          }, warningDelayMs);
          this.eventTimers.set(`${event.id}_warning`, warningTimer);
        }

        const delaySeconds = eventStart - chapterElapsedSeconds;
        const delayMs = delaySeconds * 1000;

        const timer = window.setTimeout(() => {
          this.triggerWeather(event);
        }, delayMs);
        this.eventTimers.set(event.id, timer);
      }
    });

    this.stateManager.setState({
      weatherWarning: { ...this.warningState }
    });

    if (!weatherRestored && !warningRestored && savedActiveWeather) {
      this.activeWeather = { ...savedActiveWeather };
      this.warningState.phase = 'active';
      this.stateManager.setState({ 
        activeWeather: { ...savedActiveWeather },
        weatherWarning: { ...this.warningState }
      });

      const type = this.getWeatherTypeFromId(savedActiveWeather.id);
      const crewModule = CrewModule.getInstance();
      const resistModifier = crewModule.getWeatherResistModifier();
      const effectiveIntensity = savedActiveWeather.intensity * resistModifier;
      this.applyWeatherVisuals(type, effectiveIntensity);

      const remainingMs = savedActiveWeather.duration * 1000;
      const endTimer = window.setTimeout(() => {
        this.endWeather();
      }, remainingMs);
      this.eventTimers.set(`${savedActiveWeather.id}_end`, endTimer);

      eventBus.emit('weather:changed', this.activeWeather);
    }
  }

  private scheduleWeatherEvents(): void {
    this.weatherEvents.forEach(event => {
      const warningTime = event.warningTime ?? DEFAULT_WARNING_TIME;
      const warningDelay = Math.max(0, (event.startTime - warningTime) * 1000);
      
      if (warningDelay > 0) {
        const warningTimer = window.setTimeout(() => {
          this.startWarning(event);
        }, warningDelay);
        this.eventTimers.set(`${event.id}_warning`, warningTimer);
      }
      
      const delay = event.startTime * 1000;
      const timer = window.setTimeout(() => {
        this.triggerWeather(event);
      }, delay);
      
      this.eventTimers.set(event.id, timer);
    });
  }

  private startWarning(eventConfig: WeatherEventConfig): void {
    const warningTime = eventConfig.warningTime ?? DEFAULT_WARNING_TIME;
    const warning: WeatherWarning = {
      id: `warning_${eventConfig.id}_${Date.now()}`,
      eventId: eventConfig.id,
      type: eventConfig.type,
      name: eventConfig.name,
      startTime: eventConfig.startTime,
      warningStartTime: Date.now(),
      remainingSeconds: warningTime,
      totalWarningSeconds: warningTime,
      intensity: eventConfig.intensity,
      isActive: true,
      acknowledged: false
    };

    this.warningState.activeWarning = warning;
    this.warningState.phase = 'warning';
    this.warningState.warningHistory.push({
      eventId: eventConfig.id,
      warningStart: Date.now(),
      weatherStart: this.chapterStartTime + eventConfig.startTime,
      acknowledged: false
    });

    this.stateManager.setState({
      weatherWarning: { ...this.warningState }
    });

    eventBus.emit('weather:warning:started', {
      warning,
      eventConfig
    });

    this.showWarningNotification(warning);
    this.startWarningUpdateLoop(warning);
    this.startWarningBeat(warning);
  }

  private startWarningUpdateLoop(warning: WeatherWarning): void {
    if (this.warningUpdateInterval) {
      clearInterval(this.warningUpdateInterval);
    }

    this.warningUpdateInterval = window.setInterval(() => {
      if (!this.warningState.activeWarning || !this.warningState.activeWarning.isActive) {
        this.stopWarningUpdateLoop();
        return;
      }

      const elapsed = (Date.now() - warning.warningStartTime) / 1000;
      const remaining = Math.max(0, warning.totalWarningSeconds - elapsed);
      
      this.warningState.activeWarning.remainingSeconds = Math.ceil(remaining);
      
      this.stateManager.setState({
        weatherWarning: { ...this.warningState }
      });

      eventBus.emit('weather:warning:tick', {
        warning: this.warningState.activeWarning,
        remainingSeconds: this.warningState.activeWarning.remainingSeconds
      });

      if (remaining <= 0) {
        this.stopWarningUpdateLoop();
      }
    }, 1000);
  }

  private stopWarningUpdateLoop(): void {
    if (this.warningUpdateInterval) {
      clearInterval(this.warningUpdateInterval);
      this.warningUpdateInterval = null;
    }
  }

  private startWarningBeat(warning: WeatherWarning): void {
    if (this.warningBeatInterval) {
      clearInterval(this.warningBeatInterval);
    }

    const baseInterval = 2000;
    const intensity = warning.intensity;
    const interval = Math.max(500, baseInterval - intensity * 1500);

    this.warningBeatInterval = window.setInterval(() => {
      if (!this.warningState.activeWarning?.isActive) {
        this.stopWarningBeat();
        return;
      }

      const remaining = this.warningState.activeWarning.remainingSeconds;
      const urgency = 1 - (remaining / warning.totalWarningSeconds);
      const dynamicInterval = Math.max(300, interval - urgency * 1200);

      if (dynamicInterval !== interval) {
        this.stopWarningBeat();
        this.startWarningBeat(warning);
        return;
      }

      eventBus.emit('weather:warning:beat', {
        warning: this.warningState.activeWarning,
        urgency,
        remaining
      });
    }, interval);
  }

  private stopWarningBeat(): void {
    if (this.warningBeatInterval) {
      clearInterval(this.warningBeatInterval);
      this.warningBeatInterval = null;
    }
  }

  private showWarningNotification(warning: WeatherWarning): void {
    const icon = WARNING_ICONS[warning.type] || '⚠️';
    const urgencyLevel = warning.intensity >= 0.7 ? '紧急' : warning.intensity >= 0.4 ? '注意' : '提示';
    const message = `${icon} 【${urgencyLevel}预警】${warning.name} 将在 ${warning.totalWarningSeconds} 秒后到达！强度: ${Math.round(warning.intensity * 100)}%`;
    
    eventBus.emit('toast:show', { 
      message, 
      duration: Math.min(10000, warning.totalWarningSeconds * 1000),
      type: 'warning'
    });

    eventBus.emit('world:broadcast', {
      category: 'weather',
      priority: warning.intensity >= 0.7 ? 'critical' : 'high',
      title: `${icon} ${warning.name} 预警`,
      message: this.getWarningAdvice(warning),
      icon,
      duration: warning.totalWarningSeconds * 1000,
      metadata: {
        type: 'weather_warning',
        warningId: warning.id,
        eventId: warning.eventId,
        remainingSeconds: warning.remainingSeconds,
        intensity: warning.intensity
      }
    });
  }

  private getWarningAdvice(warning: WeatherWarning): string {
    const advices: Record<string, string[]> = {
      storm: [
        '建议：寻找附近港口避风',
        '建议：降低航速，谨慎航行',
        '建议：检查船帆和索具',
        '建议：提醒船员做好准备'
      ],
      fog: [
        '建议：开启航行灯，使用雾号',
        '建议：降低航速，增加瞭望',
        '建议：使用星图和罗盘确认航向',
        '建议：避免陌生海域'
      ],
      meteor: [
        '建议：这是观测星辰的好时机！',
        '建议：注意躲避陨石撞击',
        '建议：可以尝试连接星座',
        '建议：流星雨期间有特殊星象'
      ],
      clear: [
        '天气转晴，适合航行',
        '视野良好，可以观测星辰'
      ]
    };

    const typeAdvices = advices[warning.type] || advices.clear;
    const count = Math.min(2, Math.ceil(warning.intensity * typeAdvices.length));
    
    return typeAdvices.slice(0, count).join('；');
  }

  private acknowledgeWarning(): void {
    if (!this.warningState.activeWarning) return;

    this.warningState.activeWarning.acknowledged = true;
    const historyEntry = this.warningState.warningHistory.find(
      h => h.eventId === this.warningState.activeWarning!.eventId
    );
    if (historyEntry) {
      historyEntry.acknowledged = true;
    }

    if (!this.warningState.acknowledgedWarnings.includes(this.warningState.activeWarning.eventId)) {
      this.warningState.acknowledgedWarnings.push(this.warningState.activeWarning.eventId);
    }

    this.stateManager.setState({
      weatherWarning: { ...this.warningState }
    });

    eventBus.emit('weather:warning:acknowledged', {
      warning: this.warningState.activeWarning
    });
  }

  private endWarning(): void {
    this.stopWarningUpdateLoop();
    this.stopWarningBeat();

    if (this.warningState.activeWarning) {
      this.warningState.activeWarning.isActive = false;
    }

    this.warningState.phase = 'active';

    this.stateManager.setState({
      weatherWarning: { ...this.warningState }
    });

    eventBus.emit('weather:warning:ended', {
      warning: this.warningState.activeWarning
    });
  }

  private triggerWeather(eventConfig: WeatherEventConfig): void {
    this.endWarning();

    const finalType = this.applyDayNightWeights(eventConfig.type);
    const finalName = finalType === eventConfig.type
      ? eventConfig.name
      : this.getWeatherName(finalType);

    const baseEffects = this.getWeatherEffects(finalType, eventConfig.intensity);
    const crewModule = CrewModule.getInstance();
    const tempWeather: WeatherType = {
      id: eventConfig.id,
      name: finalName,
      duration: eventConfig.duration,
      intensity: eventConfig.intensity,
      effects: baseEffects,
    };
    const effectiveEffects = crewModule.getEffectiveWeatherEffects(tempWeather) || baseEffects;

    const weatherType: WeatherType = {
      id: eventConfig.id,
      name: finalName,
      duration: eventConfig.duration,
      intensity: eventConfig.intensity,
      effects: effectiveEffects,
    };

    this.activeWeather = weatherType;
    this.warningState.phase = 'active';
    this.stateManager.setState({ 
      activeWeather: weatherType,
      weatherWarning: { ...this.warningState }
    });
    eventBus.emit('weather:changed', weatherType);
    
    const intensity = eventConfig.intensity;
    let toastMessage = '';
    if (finalType === 'storm') {
      if (intensity >= 0.7) {
        toastMessage = `⛈️ 强暴风雨来袭！航速骤降，视野受阻，任务进度延缓，请谨慎航行！`;
      } else if (intensity >= 0.4) {
        toastMessage = `⛈️ 暴风雨来袭！航速下降，视野受限，注意航行安全`;
      } else {
        toastMessage = `⛈️ 小雨来临，轻微影响航行`;
      }
    } else if (finalType === 'fog') {
      if (intensity >= 0.7) {
        toastMessage = `🌫️ 浓雾弥漫！能见度极低，碰撞风险剧增，请减速慢行`;
      } else if (intensity >= 0.4) {
        toastMessage = `🌫️ 浓雾来袭！能见度下降，小心航行`;
      } else {
        toastMessage = `🌫️ 薄雾笼罩，轻微影响视野`;
      }
    } else if (finalType === 'meteor') {
      toastMessage = `☄️ 流星雨！小心陨石撞击，这是观测星辰的好时机`;
    } else {
      toastMessage = `☀️ 天气转晴，航行条件良好`;
    }
    eventBus.emit('toast:show', { message: toastMessage, duration: 5000 });

    const resistModifier = crewModule.getWeatherResistModifier();
    const effectiveIntensity = eventConfig.intensity * resistModifier;
    this.applyWeatherVisuals(finalType, effectiveIntensity);

    const duration = eventConfig.duration * 1000;
    const endTimer = window.setTimeout(() => {
      this.endWeather();
    }, duration);

    this.eventTimers.set(`${eventConfig.id}_end`, endTimer);
  }

  private applyDayNightWeights(originalType: 'storm' | 'fog' | 'meteor' | 'clear'): 'storm' | 'fog' | 'meteor' | 'clear' {
    const weights = this.currentWeatherWeights;
    const types: Array<'storm' | 'fog' | 'meteor' | 'clear'> = ['storm', 'fog', 'meteor', 'clear'];

    const originalWeight = weights[originalType];
    const totalWeight = types.reduce((sum, t) => sum + weights[t], 0);
    const probabilityThreshold = originalWeight / totalWeight;

    if (Math.random() < probabilityThreshold) {
      return originalType;
    }

    const altWeights = { ...weights };
    altWeights[originalType] = altWeights[originalType] * 0.2;
    const altTotal = types.reduce((sum, t) => sum + altWeights[t], 0);
    let roll = Math.random() * altTotal;
    let selected: 'storm' | 'fog' | 'meteor' | 'clear' = originalType;
    for (const t of types) {
      roll -= altWeights[t];
      if (roll <= 0) {
        selected = t;
        break;
      }
    }
    return selected;
  }

  private getWeatherEffects(type: string, intensity: number): WeatherType['effects'] {
    const baseEffects = {
      storm: {
        visibility: 1 - intensity * 0.5,
        speedModifier: 1 - intensity * 0.6,
        starVisibility: 1 - intensity * 0.8,
        taskProgressModifier: 1 - intensity * 0.4,
        supplyConsumptionModifier: 1 + intensity * 0.5,
        collisionChanceModifier: 1 + intensity * 1.5
      },
      fog: {
        visibility: 1 - intensity * 0.7,
        speedModifier: 1 - intensity * 0.3,
        starVisibility: 1 - intensity * 0.9,
        taskProgressModifier: 1 - intensity * 0.2,
        supplyConsumptionModifier: 1 + intensity * 0.2,
        collisionChanceModifier: 1 + intensity * 2.0
      },
      meteor: {
        visibility: 1,
        speedModifier: 1,
        starVisibility: 0.8,
        taskProgressModifier: 1,
        supplyConsumptionModifier: 1,
        collisionChanceModifier: 1 + intensity * 0.5
      },
      clear: {
        visibility: 1,
        speedModifier: 1,
        starVisibility: 1,
        taskProgressModifier: 1,
        supplyConsumptionModifier: 1,
        collisionChanceModifier: 1
      }
    };
    
    return baseEffects[type as keyof typeof baseEffects] || baseEffects.clear;
  }

  private applyWeatherVisuals(type: string, intensity: number): void {
    this.clearWeatherVisuals();
    
    switch (type) {
      case 'storm':
        this.createStorm(intensity);
        this.createFog(intensity * 0.5);
        this.weatherOverlay?.classList.add('weather-storm');
        break;
      case 'fog':
        this.createFog(intensity);
        this.weatherOverlay?.classList.add('weather-fog');
        break;
      case 'meteor':
        this.createMeteorShower(intensity);
        break;
    }
  }

  private createStorm(intensity: number): void {
    const particleCount = Math.floor(intensity * 500);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = MathUtils.randomRange(-100, 100);
      positions[i3 + 1] = MathUtils.randomRange(20, 100);
      positions[i3 + 2] = MathUtils.randomRange(-100, 100);
      
      velocities[i3] = MathUtils.randomRange(-5, 5);
      velocities[i3 + 1] = MathUtils.randomRange(-20, -10);
      velocities[i3 + 2] = MathUtils.randomRange(-5, 5);
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0x6666ff,
      size: 0.3,
      transparent: true,
      opacity: 0.6
    });
    
    this.weatherParticles = new THREE.Points(geometry, material);
    this.weatherGroup.add(this.weatherParticles);
  }

  private createFog(intensity: number): void {
    this.fog = new THREE.FogExp2(0x8888aa, 0.005 + intensity * 0.01);
    this.engine.scene.fog = this.fog;
  }

  private createMeteorShower(intensity: number): void {
    const meteorCount = Math.floor(intensity * 20);
    
    for (let i = 0; i < meteorCount; i++) {
      setTimeout(() => {
        this.spawnMeteor();
      }, i * (500 / intensity));
    }
  }

  private spawnMeteor(): void {
    const geometry = new THREE.ConeGeometry(0.5, 4, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffdd88,
      transparent: true,
      opacity: 1
    });

    const meteor = new THREE.Mesh(geometry, material);

    const startX = MathUtils.randomRange(-80, 80);
    const startY = MathUtils.randomRange(60, 100);
    const startZ = MathUtils.randomRange(-80, 80);
    meteor.position.set(startX, startY, startZ);

    const target = new THREE.Vector3(
      MathUtils.randomRange(-100, 100),
      0,
      MathUtils.randomRange(-100, 100)
    );

    const direction = target.clone().sub(meteor.position).normalize();
    meteor.lookAt(target);
    meteor.rotateX(Math.PI / 2);

    const trailGeometry = new THREE.ConeGeometry(0.3, 10, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.5
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.z = 5;
    meteor.add(trail);

    this.weatherGroup.add(meteor);

    const speed = 50;
    const startTime = Date.now();
    const duration = 3000;
    let hasHitShip = false;

    const stateManager = GameStateManager.getInstance();

    const animateMeteor = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        meteor.position.add(direction.clone().multiplyScalar(speed * 0.016));
        material.opacity = 1 - progress;
        trailMaterial.opacity = 0.5 * (1 - progress);

        if (!hasHitShip && meteor.position.y < 10) {
          const state = stateManager.getState();
          const shipPos = state.currentPosition;
          const dist = Math.sqrt(
            Math.pow(meteor.position.x - shipPos.x, 2) +
            Math.pow(meteor.position.z - shipPos.z, 2)
          );

          if (dist < 15 && Math.random() < 0.3) {
            hasHitShip = true;
            eventBus.emit('meteor:hit', { location: '甲板' });
          }
        }

        requestAnimationFrame(animateMeteor);
      } else {
        meteor.geometry.dispose();
        material.dispose();
        trail.geometry.dispose();
        trailMaterial.dispose();
        this.weatherGroup.remove(meteor);
      }
    };

    animateMeteor();
  }

  private update(delta: number, elapsed: number): void {
    if (this.weatherParticles) {
      const positions = this.weatherParticles.geometry.attributes.position.array as Float32Array;
      const velocities = this.weatherParticles.geometry.attributes.velocity.array as Float32Array;
      
      for (let i = 0; i < positions.length / 3; i++) {
        const i3 = i * 3;
        positions[i3] += velocities[i3] * delta;
        positions[i3 + 1] += velocities[i3 + 1] * delta;
        positions[i3 + 2] += velocities[i3 + 2] * delta;
        
        if (positions[i3 + 1] < 0) {
          positions[i3] = MathUtils.randomRange(-100, 100);
          positions[i3 + 1] = 100;
          positions[i3 + 2] = MathUtils.randomRange(-100, 100);
        }
      }
      
      this.weatherParticles.geometry.attributes.position.needsUpdate = true;
    }
    
    this.updateLightning(elapsed);
  }

  private updateLightning(elapsed: number): void {
    if (this.activeWeather?.id.includes('storm') && Math.random() < 0.01) {
      this.flashLightning();
    }
  }

  private flashLightning(): void {
    if (!this.lightningMesh) {
      const geometry = new THREE.PlaneGeometry(200, 200);
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0
      });
      this.lightningMesh = new THREE.Mesh(geometry, material);
      this.lightningMesh.position.set(0, 50, 0);
      this.weatherGroup.add(this.lightningMesh);
    }
    
    const material = this.lightningMesh.material as THREE.MeshBasicMaterial;
    material.opacity = 0.8;
    
    setTimeout(() => {
      material.opacity = 0;
    }, 100);
  }

  private endWeather(): void {
    const oldWeather = this.activeWeather;
    this.activeWeather = null;
    
    this.warningState.phase = 'idle';
    this.warningState.activeWarning = null;
    
    this.stateManager.setState({ 
      activeWeather: null,
      weatherWarning: { ...this.warningState }
    });
    eventBus.emit('weather:changed', null);
    
    if (oldWeather) {
      const type = this.getWeatherTypeFromId(oldWeather.id);
      let endMessage = '';
      if (type === 'storm') {
        endMessage = '☀️ 暴风雨已过，天气转晴，航行恢复正常';
      } else if (type === 'fog') {
        endMessage = '☀️ 浓雾散去，视野恢复清晰';
      } else if (type === 'meteor') {
        endMessage = '✨ 流星雨结束，夜空恢复平静';
      } else {
        endMessage = '天气恢复正常';
      }
      eventBus.emit('toast:show', { message: endMessage, duration: 4000 });
      
      eventBus.emit('weather:ended', {
        weather: oldWeather,
        survived: true
      });
    }
    
    this.clearWeatherVisuals();
  }

  private getWeatherTypeFromId(id: string): string {
    if (id.includes('storm')) return 'storm';
    if (id.includes('fog')) return 'fog';
    if (id.includes('meteor')) return 'meteor';
    return 'clear';
  }

  private onDayNightChanged(data: any): void {
    if (data?.weatherWeights) {
      this.currentWeatherWeights = { ...data.weatherWeights };
    }
  }

  private clearWeatherVisuals(): void {
    this.weatherOverlay?.classList.remove('weather-storm', 'weather-fog');
    
    if (this.weatherParticles) {
      this.weatherParticles.geometry.dispose();
      (this.weatherParticles.material as THREE.Material).dispose();
      this.weatherGroup.remove(this.weatherParticles);
      this.weatherParticles = null;
    }
    
    if (this.lightningMesh) {
      this.lightningMesh.geometry.dispose();
      (this.lightningMesh.material as THREE.Material).dispose();
      this.weatherGroup.remove(this.lightningMesh);
      this.lightningMesh = null;
    }
    
    if (this.fog) {
      this.engine.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008);
      this.fog = null;
    }
    
    while (this.weatherGroup.children.length > 0) {
      const child = this.weatherGroup.children[0];
      this.weatherGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
  }

  public triggerManualWeather(type: 'storm' | 'fog' | 'meteor' | 'clear', intensity: number = 0.5, duration: number = 30): void {
    const crewModule = CrewModule.getInstance();
    const resistModifier = crewModule.getWeatherResistModifier();
    const effectiveIntensity = intensity * resistModifier;

    const event: WeatherEventConfig = {
      id: `manual_${Date.now()}`,
      type,
      name: this.getWeatherName(type),
      startTime: 0,
      duration,
      intensity: effectiveIntensity,
    };

    this.triggerWeather(event);
  }

  public triggerDayNightWeightedWeather(intensity: number = 0.5, duration: number = 30): void {
    const weights = this.currentWeatherWeights;
    const types: Array<'storm' | 'fog' | 'meteor' | 'clear'> = ['storm', 'fog', 'meteor', 'clear'];
    const weightValues = types.map(t => weights[t]);
    const totalWeight = weightValues.reduce((sum, w) => sum + w, 0);

    let roll = Math.random() * totalWeight;
    let selectedType: 'storm' | 'fog' | 'meteor' | 'clear' = 'clear';
    for (let i = 0; i < types.length; i++) {
      roll -= weightValues[i];
      if (roll <= 0) {
        selectedType = types[i];
        break;
      }
    }

    this.triggerManualWeather(selectedType, intensity, duration);
  }

  private getWeatherName(type: string): string {
    const names: Record<string, string> = {
      storm: '暴风雨',
      fog: '浓雾',
      meteor: '流星雨',
      clear: '晴朗'
    };
    return names[type] || '未知天气';
  }

  public getActiveWeather(): WeatherType | null {
    return this.activeWeather;
  }

  public loadState(weatherState: WeatherType | null): void {
    if (!weatherState) {
      this.clearWeather();
      return;
    }

    this.eventTimers.forEach(timer => clearTimeout(timer));
    this.eventTimers.clear();

    this.clearWeatherVisuals();
    this.activeWeather = { ...weatherState };
    this.stateManager.setState({ activeWeather: { ...weatherState } });

    const type = this.getWeatherTypeFromId(weatherState.id);
    const crewModule = CrewModule.getInstance();
    const resistModifier = crewModule.getWeatherResistModifier();
    const effectiveIntensity = weatherState.intensity * resistModifier;
    this.applyWeatherVisuals(type, effectiveIntensity);

    eventBus.emit('weather:changed', this.activeWeather);
  }

  public getWeatherWeights(): DayNightWeatherWeights {
    return { ...this.currentWeatherWeights };
  }

  public clearWeather(): void {
    this.eventTimers.forEach(timer => clearTimeout(timer));
    this.eventTimers.clear();
    this.clearWeatherVisuals();
    this.activeWeather = null;
    this.weatherEvents = [];
    
    this.stopWarningUpdateLoop();
    this.stopWarningBeat();
    this.warningState = {
      activeWarning: null,
      phase: 'idle',
      acknowledgedWarnings: [],
      warningHistory: []
    };
    this.stateManager.setState({
      weatherWarning: { ...this.warningState }
    });
  }

  public getWarningState(): WeatherWarningState {
    return { ...this.warningState };
  }

  public getActiveWarning(): WeatherWarning | null {
    return this.warningState.activeWarning ? { ...this.warningState.activeWarning } : null;
  }

  public dispose(): void {
    this.clearWeather();
    if (this.weatherOverlay) {
      this.weatherOverlay.remove();
      this.weatherOverlay = null;
    }
  }
}
