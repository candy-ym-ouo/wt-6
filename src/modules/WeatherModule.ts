import * as THREE from 'three';
import { GameEngine } from '../core/GameEngine';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import { WeatherEventConfig, WeatherType } from '../types';

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

  constructor() {
    this.engine = GameEngine.getInstance();
    this.stateManager = GameStateManager.getInstance();
    
    this.weatherGroup = new THREE.Group();
    this.weatherGroup.name = 'weather';
    this.engine.scene.add(this.weatherGroup);
    
    this.createWeatherOverlay();
    
    this.engine.onUpdate(this.update.bind(this));
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
    this.scheduleWeatherEvents();
  }

  private scheduleWeatherEvents(): void {
    this.weatherEvents.forEach(event => {
      const delay = event.startTime * 1000;
      
      const timer = window.setTimeout(() => {
        this.triggerWeather(event);
      }, delay);
      
      this.eventTimers.set(event.id, timer);
    });
  }

  private triggerWeather(eventConfig: WeatherEventConfig): void {
    const weatherType: WeatherType = {
      id: eventConfig.id,
      name: eventConfig.name,
      duration: eventConfig.duration,
      intensity: eventConfig.intensity,
      effects: this.getWeatherEffects(eventConfig.type, eventConfig.intensity)
    };
    
    this.activeWeather = weatherType;
    this.stateManager.setState({ activeWeather: weatherType });
    eventBus.emit('weather:changed', weatherType);
    eventBus.emit('toast:show', { message: `${eventConfig.name} 来袭！` });
    
    this.applyWeatherVisuals(eventConfig.type, eventConfig.intensity);
    
    const duration = eventConfig.duration * 1000;
    const endTimer = window.setTimeout(() => {
      this.endWeather();
    }, duration);
    
    this.eventTimers.set(`${eventConfig.id}_end`, endTimer);
  }

  private getWeatherEffects(type: string, intensity: number): WeatherType['effects'] {
    const baseEffects = {
      storm: {
        visibility: 1 - intensity * 0.5,
        speedModifier: 1 - intensity * 0.6,
        starVisibility: 1 - intensity * 0.8
      },
      fog: {
        visibility: 1 - intensity * 0.7,
        speedModifier: 1 - intensity * 0.3,
        starVisibility: 1 - intensity * 0.9
      },
      meteor: {
        visibility: 1,
        speedModifier: 1,
        starVisibility: 0.8
      },
      clear: {
        visibility: 1,
        speedModifier: 1,
        starVisibility: 1
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
    
    meteor.position.set(
      MathUtils.randomRange(-80, 80),
      MathUtils.randomRange(60, 100),
      MathUtils.randomRange(-80, 80)
    );
    
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
    
    const animateMeteor = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress < 1) {
        meteor.position.add(direction.clone().multiplyScalar(speed * 0.016));
        material.opacity = 1 - progress;
        trailMaterial.opacity = 0.5 * (1 - progress);
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
    this.activeWeather = null;
    this.stateManager.setState({ activeWeather: null });
    eventBus.emit('weather:changed', null);
    eventBus.emit('toast:show', { message: '天气恢复正常' });
    
    this.clearWeatherVisuals();
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
    const event: WeatherEventConfig = {
      id: `manual_${Date.now()}`,
      type,
      name: this.getWeatherName(type),
      startTime: 0,
      duration,
      intensity
    };
    
    this.triggerWeather(event);
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

  public clearWeather(): void {
    this.eventTimers.forEach(timer => clearTimeout(timer));
    this.eventTimers.clear();
    this.clearWeatherVisuals();
    this.activeWeather = null;
    this.weatherEvents = [];
  }

  public dispose(): void {
    this.clearWeather();
    if (this.weatherOverlay) {
      this.weatherOverlay.remove();
      this.weatherOverlay = null;
    }
  }
}
