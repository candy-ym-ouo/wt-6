import * as THREE from 'three';
import { GameEngine } from '../core/GameEngine';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import { FogOfWarConfig, DEFAULT_FOG_CONFIG, RoutePoint } from '../types';
import { DayNightCycleModule } from './DayNightCycleModule';

export class FogOfWarModule {
  private static instance: FogOfWarModule;
  private engine: GameEngine;
  private stateManager: GameStateManager;
  private dayNightModule: DayNightCycleModule;
  private config: FogOfWarConfig;
  private fogGroup: THREE.Group;
  private fogMesh: THREE.Mesh | null = null;
  private fogCanvas: HTMLCanvasElement | null = null;
  private fogTexture: THREE.CanvasTexture | null = null;
  private minimapFogCanvas: HTMLCanvasElement | null = null;
  private lastShipPosition: THREE.Vector3 = new THREE.Vector3();
  private explorationUpdateTimer: number = 0;
  private readonly EXPLORATION_UPDATE_INTERVAL: number = 0.2;
  private waypoints: Map<string, RoutePoint> = new Map();

  private constructor() {
    this.engine = GameEngine.getInstance();
    this.stateManager = GameStateManager.getInstance();
    this.dayNightModule = DayNightCycleModule.getInstance();
    this.config = { ...DEFAULT_FOG_CONFIG };

    this.fogGroup = new THREE.Group();
    this.fogGroup.name = 'fogOfWar';

    this.engine.scene.add(this.fogGroup);
    this.engine.onUpdate(this.update.bind(this));

    this.setupEventListeners();
  }

  public static getInstance(): FogOfWarModule {
    if (!FogOfWarModule.instance) {
      FogOfWarModule.instance = new FogOfWarModule();
    }
    return FogOfWarModule.instance;
  }

  private setupEventListeners(): void {
    eventBus.on('point:reached', this.onPointReached.bind(this));
    eventBus.on('point:visited', this.onPointVisited.bind(this));
    eventBus.on('ship:updated', this.onShipUpdated.bind(this));
    eventBus.on('fog:areaExplored', this.onAreaExplored.bind(this));
    eventBus.on('weather:changed', this.onWeatherChanged.bind(this));
  }

  public loadChapterFog(
    mapBounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    waypoints: RoutePoint[]
  ): void {
    this.clearFog();
    this.ensureInScene();
    this.stateManager.initFogOfWar(mapBounds);
    this.waypoints.clear();
    waypoints.forEach(wp => this.waypoints.set(wp.id, wp));
    this.createFogLayer(mapBounds);
    this.createMinimapFogCanvas();
    
    const state = this.stateManager.getState();
    if (state.currentPosition) {
      this.exploreAroundPosition(
        state.currentPosition.x,
        state.currentPosition.z,
        this.config.baseViewRadius
      );
    }

    waypoints.forEach(wp => {
      if (this.stateManager.isPointVisited(wp.id)) {
        this.exploreAroundPosition(
          wp.position.x,
          wp.position.z,
          this.config.waypointBonusRadius
        );
      }
    });

    this.updateFogTexture();
  }

  private createFogLayer(mapBounds: { minX: number; maxX: number; minZ: number; maxZ: number }): void {
    const width = mapBounds.maxX - mapBounds.minX;
    const height = mapBounds.maxZ - mapBounds.minZ;
    const centerX = (mapBounds.minX + mapBounds.maxX) / 2;
    const centerZ = (mapBounds.minZ + mapBounds.maxZ) / 2;

    const canvasWidth = Math.ceil(width / this.config.cellSize) * 4;
    const canvasHeight = Math.ceil(height / this.config.cellSize) * 4;

    this.fogCanvas = document.createElement('canvas');
    this.fogCanvas.width = canvasWidth;
    this.fogCanvas.height = canvasHeight;
    this.clearFogCanvas();

    this.fogTexture = new THREE.CanvasTexture(this.fogCanvas);
    this.fogTexture.magFilter = THREE.LinearFilter;
    this.fogTexture.minFilter = THREE.LinearFilter;
    this.fogTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.fogTexture.wrapT = THREE.ClampToEdgeWrapping;

    const geometry = new THREE.PlaneGeometry(width, height, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: this.fogTexture,
      transparent: true,
      opacity: this.config.fogOpacity,
      depthWrite: false,
    });

    this.fogMesh = new THREE.Mesh(geometry, material);
    this.fogMesh.rotation.x = -Math.PI / 2;
    this.fogMesh.position.set(centerX, 0.1, centerZ);
    this.fogMesh.name = 'fogMesh';
    
    this.fogGroup.add(this.fogMesh);
  }

  private createMinimapFogCanvas(): void {
    this.minimapFogCanvas = document.createElement('canvas');
    this.minimapFogCanvas.width = 256;
    this.minimapFogCanvas.height = 256;
  }

  private clearFogCanvas(): void {
    if (!this.fogCanvas) return;
    const ctx = this.fogCanvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = `rgba(${this.getRgbFromHex(this.config.fogColor)}, 1)`;
    ctx.fillRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);
  }

  private getRgbFromHex(hex: number): string {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `${r}, ${g}, ${b}`;
  }

  private updateFogTexture(): void {
    if (!this.fogCanvas || !this.fogTexture) return;

    const ctx = this.fogCanvas.getContext('2d');
    if (!ctx) return;

    const fogState = this.stateManager.getFogOfWarState();
    if (!fogState) return;

    const { mapBounds, cellSize, cells } = fogState;
    const width = mapBounds.maxX - mapBounds.minX;
    const height = mapBounds.maxZ - mapBounds.minZ;
    const scaleX = this.fogCanvas.width / width;
    const scaleY = this.fogCanvas.height / height;

    this.clearFogCanvas();

    Object.values(cells).forEach(cell => {
      if (cell.explored && cell.visibility > 0) {
        const worldX = cell.x * cellSize - mapBounds.minX;
        const worldZ = cell.z * cellSize - mapBounds.minZ;
        const screenX = worldX * scaleX;
        const screenY = worldZ * scaleY;
        const cellScreenSize = cellSize * Math.max(scaleX, scaleY);
        
        const alpha = 1 - cell.visibility * 0.95;
        ctx.fillStyle = `rgba(${this.getRgbFromHex(this.config.fogColor)}, ${alpha})`;
        ctx.fillRect(
          screenX - cellScreenSize / 2,
          screenY - cellScreenSize / 2,
          cellScreenSize + 1,
          cellScreenSize + 1
        );
      }
    });

    this.fogTexture.needsUpdate = true;
    this.updateMinimapFogTexture();
  }

  private updateMinimapFogTexture(): void {
    if (!this.minimapFogCanvas) return;
    
    const ctx = this.minimapFogCanvas.getContext('2d');
    if (!ctx) return;

    const fogState = this.stateManager.getFogOfWarState();
    if (!fogState) return;

    const { mapBounds, cellSize, cells } = fogState;
    const width = mapBounds.maxX - mapBounds.minX;
    const height = mapBounds.maxZ - mapBounds.minZ;

    ctx.fillStyle = 'rgba(10, 10, 30, 0.95)';
    ctx.fillRect(0, 0, 256, 256);

    Object.values(cells).forEach(cell => {
      if (cell.explored && cell.visibility > 0.1) {
        const worldX = cell.x * cellSize - mapBounds.minX;
        const worldZ = cell.z * cellSize - mapBounds.minZ;
        const screenX = (worldX / width) * 256;
        const screenY = (worldZ / height) * 256;
        const cellScreenSize = (cellSize / Math.min(width, height)) * 256;
        
        const alpha = Math.min(1, cell.visibility * 1.2);
        ctx.fillStyle = `rgba(60, 80, 120, ${alpha})`;
        ctx.fillRect(
          screenX - cellScreenSize / 2,
          screenY - cellScreenSize / 2,
          cellScreenSize + 1,
          cellScreenSize + 1
        );
      }
    });

    eventBus.emit('minimap:fogUpdated', this.minimapFogCanvas);
  }

  private exploreAroundPosition(x: number, z: number, radius: number): void {
    this.stateManager.exploreArea(x, z, radius);
  }

  public ensureInScene(): void {
    if (!this.engine.scene.children.includes(this.fogGroup)) {
      this.engine.scene.add(this.fogGroup);
    }
  }

  private onPointReached(pointId: string): void {
    const waypoint = this.waypoints.get(pointId);
    if (waypoint) {
      this.animateWaypointExploration(waypoint);
    }
  }

  private onPointVisited(pointId: string): void {
    const waypoint = this.waypoints.get(pointId);
    if (waypoint) {
      this.exploreAroundPosition(
        waypoint.position.x,
        waypoint.position.z,
        this.config.waypointBonusRadius
      );
      this.updateFogTexture();
    }
  }

  private animateWaypointExploration(waypoint: RoutePoint): void {
    const duration = 1.5;
    let elapsed = 0;
    const startRadius = this.config.baseViewRadius;
    const endRadius = this.config.waypointBonusRadius;

    const animate = () => {
      elapsed += this.engine.getDeltaTime();
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = MathUtils.easeOutCubic(progress);
      const currentRadius = startRadius + (endRadius - startRadius) * easeProgress;
      
      this.exploreAroundPosition(
        waypoint.position.x,
        waypoint.position.z,
        currentRadius
      );
      this.updateFogTexture();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  private onShipUpdated(ship: any): void {
    const state = this.stateManager.getState();
    if (state.currentPosition) {
      this.lastShipPosition.set(
        state.currentPosition.x,
        state.currentPosition.y,
        state.currentPosition.z
      );
    }
  }

  private onAreaExplored(data: any): void {
    this.updateFogTexture();
  }

  private onWeatherChanged(weather: any): void {
    if (this.fogMesh) {
      const material = this.fogMesh.material as THREE.MeshBasicMaterial;
      const visibility = weather?.effects?.visibility ?? 1;
      material.opacity = this.config.fogOpacity * (0.5 + visibility * 0.5);
    }
  }

  private update(delta: number, elapsed: number): void {
    if (this.fogMesh && !this.engine.scene.children.includes(this.fogGroup)) {
      this.engine.scene.add(this.fogGroup);
    }

    this.explorationUpdateTimer += delta;
    
    if (this.explorationUpdateTimer >= this.EXPLORATION_UPDATE_INTERVAL) {
      this.explorationUpdateTimer = 0;
      
      const state = this.stateManager.getState();
      if (state.currentPosition && this.fogMesh) {
        const crewBonus = state.crew.efficiencyBonuses.starVision || 0;
        const weather = state.activeWeather;
        const weatherModifier = weather?.effects?.visibility ?? 1;
        const dayNightModifier = this.getDayNightVisibilityModifier();
        
        const effectiveRadius = this.config.baseViewRadius * 
          (1 + crewBonus) * 
          weatherModifier * 
          dayNightModifier;
        
        this.exploreAroundPosition(
          state.currentPosition.x,
          state.currentPosition.z,
          effectiveRadius
        );
        this.updateFogTexture();
      }
    }

    this.updateFogAnimation(elapsed);
  }

  private getDayNightVisibilityModifier(): number {
    const tod = this.dayNightModule.getCycleInfo().timeOfDay;
    const modifiers: Record<string, number> = {
      dawn: 0.9,
      day: 1.2,
      dusk: 0.85,
      night: 0.7,
    };
    return modifiers[tod] || 1;
  }

  private updateFogAnimation(elapsed: number): void {
    if (!this.fogMesh) return;
    
    const material = this.fogMesh.material as THREE.MeshBasicMaterial;
    const pulse = Math.sin(elapsed * 0.5) * 0.02 + 0.98;
    material.opacity = Math.min(0.95, this.config.fogOpacity * pulse);
  }

  public getMinimapFogCanvas(): HTMLCanvasElement | null {
    return this.minimapFogCanvas;
  }

  public getExplorationProgress(): number {
    const explored = this.stateManager.getExploredCellsCount();
    const total = this.stateManager.getTotalCellsCount();
    return total > 0 ? explored / total : 0;
  }

  public isPositionVisible(x: number, z: number): boolean {
    const state = this.stateManager.getState();
    if (!state.currentPosition) return false;
    
    const dx = x - state.currentPosition.x;
    const dz = z - state.currentPosition.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    return dist <= this.config.baseViewRadius && this.stateManager.isPositionExplored(x, z);
  }

  public setConfig(config: Partial<FogOfWarConfig>): void {
    this.config = { ...this.config, ...config };
  }

  private clearFog(): void {
    if (this.fogMesh) {
      this.fogMesh.geometry.dispose();
      (this.fogMesh.material as THREE.Material).dispose();
      if (this.fogTexture) {
        this.fogTexture.dispose();
      }
      this.fogGroup.remove(this.fogMesh);
      this.fogMesh = null;
    }

    while (this.fogGroup.children.length > 0) {
      this.fogGroup.remove(this.fogGroup.children[0]);
    }

    this.fogCanvas = null;
    this.fogTexture = null;
    this.minimapFogCanvas = null;
    this.waypoints.clear();
  }

  public dispose(): void {
    this.clearFog();
    this.engine.scene.remove(this.fogGroup);
  }
}
