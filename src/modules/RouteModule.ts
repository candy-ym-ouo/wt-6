import * as THREE from 'three';
import { GameEngine } from '../core/GameEngine';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import { Route, RoutePoint, TimeOfDay } from '../types';
import { CrewModule } from './CrewModule';
import { DayNightCycleModule } from './DayNightCycleModule';
import { ShipDamageModule } from './ShipDamageModule';

export class RouteModule {
  private engine: GameEngine;
  private stateManager: GameStateManager;
  private dayNightModule: DayNightCycleModule;
  private damageModule: ShipDamageModule;
  private routeGroup: THREE.Group;
  private shipGroup: THREE.Group;
  private routeLines: Map<string, THREE.Line> = new Map();
  private routePointMarkers: Map<string, THREE.Mesh> = new Map();
  private ship: THREE.Group | null = null;
  private currentRouteId: string | null = null;
  private currentRoutePoints: RoutePoint[] = [];
  private currentPointIndex: number = 0;
  private isMoving: boolean = false;
  private moveProgress: number = 0;
  private allRoutes: Route[] = [];
  private allRoutePoints: RoutePoint[] = [];
  private lastCollisionCheck: number = 0;

  constructor() {
    this.engine = GameEngine.getInstance();
    this.stateManager = GameStateManager.getInstance();
    this.dayNightModule = DayNightCycleModule.getInstance();
    this.damageModule = ShipDamageModule.getInstance();
    
    this.routeGroup = new THREE.Group();
    this.routeGroup.name = 'routes';
    this.shipGroup = new THREE.Group();
    this.shipGroup.name = 'shipGroup';
    
    this.engine.scene.add(this.routeGroup);
    this.engine.scene.add(this.shipGroup);
    
    this.engine.onUpdate(this.update.bind(this));
    
    eventBus.on('route:start', this.startRoute.bind(this));
    eventBus.on('route:stop', this.stopRoute.bind(this));
  }

  public loadChapterRoutes(routes: Route[], routePoints: RoutePoint[]): void {
    this.clearRoutes();
    this.allRoutes = routes;
    this.allRoutePoints = routePoints;
    
    this.createRouteLines(routes, routePoints);
    this.createRoutePointMarkers(routePoints);
    this.createShip();
  }

  private createRouteLines(routes: Route[], routePoints: RoutePoint[]): void {
    const pointMap = new Map(routePoints.map(p => [p.id, p]));
    
    routes.forEach(route => {
      const points: THREE.Vector3[] = [];
      
      route.points.forEach(pointId => {
        const point = pointMap.get(pointId);
        if (point) {
          points.push(new THREE.Vector3(
            point.position.x,
            point.position.y,
            point.position.z
          ));
        }
      });
      
      if (points.length > 1) {
        const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
        const curvePoints = curve.getPoints(50);
        
        const geometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
        const material = new THREE.LineDashedMaterial({
          color: 0xd4af37,
          dashSize: 2,
          gapSize: 1,
          transparent: true,
          opacity: 0.6
        });
        
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        this.routeLines.set(route.id, line);
        this.routeGroup.add(line);
      }
    });
  }

  private createRoutePointMarkers(routePoints: RoutePoint[]): void {
    routePoints.forEach(point => {
      const geometry = new THREE.ConeGeometry(2, 4, 8);
      geometry.rotateX(Math.PI / 2);
      
      let color = 0xd4af37;
      if (point.type === 'start') color = 0x90ee90;
      if (point.type === 'end') color = 0xff6b6b;
      if (point.type === 'landmark') color = 0x6bcbff;
      
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8
      });
      
      const marker = new THREE.Mesh(geometry, material);
      marker.position.set(
        point.position.x,
        point.position.y + 5,
        point.position.z
      );
      marker.userData = { pointId: point.id, pointType: point.type };
      
      const ringGeometry = new THREE.RingGeometry(3, 4, 32);
      ringGeometry.rotateX(-Math.PI / 2);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.y = -2;
      marker.add(ring);
      
      this.routePointMarkers.set(point.id, marker);
      this.routeGroup.add(marker);
      
      if (!this.stateManager.isPointVisited(point.id)) {
        material.opacity = 0.3;
      }
    });
  }

  private createShip(): void {
    this.ship = new THREE.Group();
    
    const hullGeometry = new THREE.BoxGeometry(6, 2, 10);
    const hullMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const hull = new THREE.Mesh(hullGeometry, hullMaterial);
    this.ship.add(hull);
    
    const deckGeometry = new THREE.BoxGeometry(4, 1.5, 6);
    const deckMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 });
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.y = 1.5;
    deck.position.z = -1;
    this.ship.add(deck);
    
    const mastGeometry = new THREE.CylinderGeometry(0.3, 0.3, 8, 8);
    const mastMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
    const mast = new THREE.Mesh(mastGeometry, mastMaterial);
    mast.position.y = 5;
    this.ship.add(mast);
    
    const sailGeometry = new THREE.PlaneGeometry(6, 5);
    const sailMaterial = new THREE.MeshLambertMaterial({ 
      color: 0xf5deb3,
      side: THREE.DoubleSide
    });
    const sail = new THREE.Mesh(sailGeometry, sailMaterial);
    sail.position.set(0, 5, 0);
    sail.rotation.y = Math.PI / 2;
    this.ship.add(sail);
    
    const lanternGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const lanternMaterial = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const lantern = new THREE.Mesh(lanternGeometry, lanternMaterial);
    lantern.position.set(2, 3, 3);
    this.ship.add(lantern);
    
    const lanternLight = new THREE.PointLight(0xffd700, 1, 20);
    lanternLight.position.copy(lantern.position);
    this.ship.add(lanternLight);
    
    this.shipGroup.add(this.ship);
  }

  public setShipPosition(x: number, y: number, z: number): void {
    if (this.ship) {
      this.ship.position.set(x, y, z);
      this.stateManager.setCurrentPosition(x, y, z);
    }
  }

  public startRoute(routeId: string): void {
    const route = this.allRoutes.find(r => r.id === routeId);
    if (!route) return;
    
    this.currentRouteId = routeId;
    this.currentRoutePoints = route.points
      .map(id => this.allRoutePoints.find(p => p.id === id))
      .filter(Boolean) as RoutePoint[];
    
    this.currentPointIndex = 0;
    this.moveProgress = 0;
    this.isMoving = true;
    
    eventBus.emit('route:started', routeId);
  }

  public stopRoute(): void {
    this.isMoving = false;
    this.currentRouteId = null;
    eventBus.emit('route:stopped');
  }

  private update(delta: number, elapsed: number): void {
    this.updateMarkers(elapsed);
    this.updateShipMovement(delta);
    this.updateShipAnimation(delta, elapsed);
    this.updateRouteDayNightVisibility();
  }

  private updateRouteDayNightVisibility(): void {
    const tod = this.dayNightModule.getCycleInfo().timeOfDay;
    const visibility: Record<TimeOfDay, number> = {
      dawn: 0.85,
      day: 1.0,
      dusk: 0.75,
      night: 0.55,
    };
    const v = visibility[tod];

    this.routeLines.forEach(line => {
      const material = line.material as THREE.LineBasicMaterial;
      material.opacity = 0.4 * v;
    });
  }

  private updateMarkers(elapsed: number): void {
    const tod = this.dayNightModule.getCycleInfo().timeOfDay;
    const markerVisibility: Record<TimeOfDay, number> = {
      dawn: 0.9,
      day: 1.0,
      dusk: 0.8,
      night: 0.6,
    };
    const mv = markerVisibility[tod];

    this.routePointMarkers.forEach((marker, pointId) => {
      const visited = this.stateManager.isPointVisited(pointId);
      const material = marker.material as THREE.MeshBasicMaterial;
      
      if (visited) {
        material.opacity = (0.6 + Math.sin(elapsed * 2) * 0.2) * mv;
      }
      
      marker.rotation.y += 0.01;
      
      const ring = marker.children[0] as THREE.Mesh;
      if (ring) {
        const ringMat = ring.material as THREE.MeshBasicMaterial;
        ringMat.opacity = 0.5 * mv;
        ring.rotation.z += 0.02;
      }
    });
  }

  private updateShipMovement(delta: number): void {
    if (!this.isMoving || !this.ship || this.currentRoutePoints.length < 2) return;

    const state = this.stateManager.getState();
    const speed = state.ship.speed || 10;
    const crewModule = CrewModule.getInstance();

    const crewSpeedModifier = crewModule.getSpeedModifier();
    const effectiveWeatherEffects = crewModule.getEffectiveWeatherEffects(state.activeWeather);
    const weatherModifier = effectiveWeatherEffects?.speedModifier ?? 1;
    const dayNightSpeedModifier = this.getDayNightSpeedModifier();
    const damageSpeedModifier = this.damageModule.getSpeedModifier();

    const currentPoint = this.currentRoutePoints[this.currentPointIndex];
    const nextPoint = this.currentRoutePoints[this.currentPointIndex + 1];

    if (currentPoint && nextPoint) {
      const dx = nextPoint.position.x - currentPoint.position.x;
      const dz = nextPoint.position.z - currentPoint.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      const totalModifier = crewSpeedModifier * weatherModifier * dayNightSpeedModifier * damageSpeedModifier;
      const moveAmount = (speed * totalModifier * delta) / distance;

      this.moveProgress += moveAmount;
      this.checkCollisions(delta);
      
      if (this.moveProgress >= 1) {
        this.currentPointIndex++;
        this.moveProgress = 0;
        
        this.stateManager.addVisitedPoint(nextPoint.id);
        this.stateManager.addVisitedPoint(currentPoint.id);
        
        eventBus.emit('point:reached', nextPoint.id);
        
        if (this.currentPointIndex >= this.currentRoutePoints.length - 1) {
          this.stopRoute();
          eventBus.emit('route:completed', this.currentRouteId);
          return;
        }
      }
      
      const t = MathUtils.easeInOutQuad(this.moveProgress);
      const x = MathUtils.lerp(currentPoint.position.x, nextPoint.position.x, t);
      const z = MathUtils.lerp(currentPoint.position.z, nextPoint.position.z, t);
      
      this.ship.position.x = x;
      this.ship.position.z = z;
      this.ship.position.y = Math.sin(Date.now() * 0.002) * 0.5;
      
      const heading = Math.atan2(dx, dz);
      this.ship.rotation.y = heading;
      this.stateManager.updateShip({ heading });
      this.stateManager.setCurrentPosition(x, this.ship.position.y, z);
    }
  }

  private getDayNightSpeedModifier(): number {
    const tod = this.dayNightModule.getCycleInfo().timeOfDay;
    const modifiers: Record<TimeOfDay, number> = {
      dawn: 1.0,
      day: 1.15,
      dusk: 1.05,
      night: 0.85,
    };
    return modifiers[tod];
  }

  private checkCollisions(delta: number): void {
    this.lastCollisionCheck += delta;
    if (this.lastCollisionCheck < 2) return;
    this.lastCollisionCheck = 0;

    if (!this.ship) return;

    const state = this.stateManager.getState();
    const effectiveWeather = CrewModule.getInstance().getEffectiveWeatherEffects(state.activeWeather);
    const visibility = effectiveWeather?.visibility ?? 1;

    const collisionChance = 0.02 * (1 - visibility) * delta;
    if (Math.random() < collisionChance) {
      const impactForce = MathUtils.randomRange(0.5, 1.5);
      let location = '船首';
      const rand = Math.random();
      if (rand < 0.3) location = '左舷';
      else if (rand < 0.6) location = '右舷';
      else if (rand < 0.8) location = '船尾';

      eventBus.emit('ship:collision', { impactForce, location });
    }
  }

  private updateShipAnimation(delta: number, elapsed: number): void {
    if (!this.ship) return;
    
    const sail = this.ship.children[3] as THREE.Mesh;
    if (sail) {
      sail.rotation.y = Math.PI / 2 + Math.sin(elapsed * 0.5) * 0.2;
    }
    
    this.ship.rotation.z = Math.sin(elapsed * 2) * 0.05;
    this.ship.rotation.x = Math.sin(elapsed * 1.5) * 0.03;
  }

  public updateRouteVisibility(routeId: string, visible: boolean): void {
    const line = this.routeLines.get(routeId);
    if (line) {
      line.visible = visible;
    }
  }

  public getShipPosition(): THREE.Vector3 | null {
    return this.ship ? this.ship.position.clone() : null;
  }

  public clearRoutes(): void {
    this.routeLines.forEach(line => {
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.routeLines.clear();
    
    this.routePointMarkers.forEach(marker => {
      marker.geometry.dispose();
      (marker.material as THREE.Material).dispose();
    });
    this.routePointMarkers.clear();
    
    while (this.routeGroup.children.length > 0) {
      this.routeGroup.remove(this.routeGroup.children[0]);
    }
    
    if (this.ship) {
      this.ship.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.shipGroup.remove(this.ship);
      this.ship = null;
    }
    
    this.currentRouteId = null;
    this.currentRoutePoints = [];
    this.currentPointIndex = 0;
    this.isMoving = false;
    this.moveProgress = 0;
  }

  public dispose(): void {
    this.clearRoutes();
  }
}
