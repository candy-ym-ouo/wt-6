import * as THREE from 'three';
import { GameEngine } from '../core/GameEngine';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import { Route, RoutePoint, TimeOfDay, RouteBranchType } from '../types';
import { CrewModule } from './CrewModule';
import { DayNightCycleModule } from './DayNightCycleModule';
import { ShipDamageModule } from './ShipDamageModule';
import { SupplyModule } from './SupplyModule';
import { VoyageEventModule } from './VoyageEventModule';

const BRANCH_COLORS: Record<RouteBranchType, number> = {
  main: 0xd4af37,
  alternative: 0x6bcbff,
  secret: 0xff6bcb,
  optional: 0x90ee90,
};

export class RouteModule {
  private engine: GameEngine;
  private stateManager: GameStateManager;
  private dayNightModule: DayNightCycleModule;
  private damageModule: ShipDamageModule;
  private supplyModule: SupplyModule;
  private routeGroup: THREE.Group;
  private shipGroup: THREE.Group;
  private routeLines: Map<string, THREE.Line> = new Map();
  private routePointMarkers: Map<string, THREE.Mesh> = new Map();
  private routePointLabels: Map<string, { pointId: string; routeIds: string[] }> = new Map();
  private ship: THREE.Group | null = null;
  private currentRouteId: string | null = null;
  private currentRoutePoints: RoutePoint[] = [];
  private currentPointIndex: number = 0;
  private isMoving: boolean = false;
  private moveProgress: number = 0;
  private allRoutes: Route[] = [];
  private allRoutePoints: RoutePoint[] = [];
  private lastCollisionCheck: number = 0;
  private currentChapterId: string | null = null;
  private voyageEventModule: VoyageEventModule;

  constructor() {
    this.engine = GameEngine.getInstance();
    this.stateManager = GameStateManager.getInstance();
    this.dayNightModule = DayNightCycleModule.getInstance();
    this.damageModule = ShipDamageModule.getInstance();
    this.supplyModule = SupplyModule.getInstance();
    this.voyageEventModule = VoyageEventModule.getInstance();
    
    this.routeGroup = new THREE.Group();
    this.routeGroup.name = 'routes';
    this.shipGroup = new THREE.Group();
    this.shipGroup.name = 'shipGroup';
    
    this.engine.scene.add(this.routeGroup);
    this.engine.scene.add(this.shipGroup);
    
    this.engine.onUpdate(this.update.bind(this));
    
    eventBus.on('route:start', this.startRoute.bind(this));
    eventBus.on('route:stop', this.stopRoute.bind(this));
    eventBus.on('chapter:started', this.onChapterStarted.bind(this));
    eventBus.on('route:selected', this.onRouteSelected.bind(this));
    eventBus.on('route:unlocked', this.onRouteUnlocked.bind(this));
    eventBus.on('branches:loaded', this.onBranchesLoaded.bind(this));
  }

  private onChapterStarted(chapter: any): void {
    this.currentChapterId = chapter.id;
    this.loadChapterRoutes(chapter.routes || [], chapter.routePoints || []);
    
    const selectedRouteId = this.stateManager.getSelectedBranchRoute();
    if (selectedRouteId && this.allRoutes.length > 1) {
      this.updateRoutesVisualState(selectedRouteId);
    } else if (this.allRoutes.length === 1) {
      this.updateRoutesVisualState(this.allRoutes[0].id);
    }
  }

  private onRouteSelected(routeId: string): void {
    this.updateRoutesVisualState(routeId);
  }

  private onRouteUnlocked(route: Route): void {
    const line = this.routeLines.get(route.id);
    if (line) {
      line.visible = true;
      const material = line.material as THREE.LineDashedMaterial;
      material.opacity = 0.4;
    }
  }

  private onBranchesLoaded(branches: any): void {
    if (this.currentChapterId && branches[this.currentChapterId]) {
      const state = branches[this.currentChapterId];
      Object.entries(state.routeProgress).forEach(([routeId, progress]: [string, any]) => {
        const line = this.routeLines.get(routeId);
        if (!line) return;
        
        const material = line.material as THREE.LineDashedMaterial;
        if (progress.unlocked) {
          line.visible = true;
          material.opacity = progress.selected ? 0.8 : 0.4;
        } else {
          line.visible = false;
        }
      });
      
      const selectedRoute = Object.values(state.routeProgress).find((p: any) => p.selected) as any;
      if (selectedRoute) {
        this.updateRoutesVisualState(selectedRoute.routeId);
      }
    }
  }

  public loadChapterRoutes(routes: Route[], routePoints: RoutePoint[]): void {
    this.clearRoutes();
    this.allRoutes = routes;
    this.allRoutePoints = routePoints;
    
    this.createRouteLines(routes, routePoints);
    this.createRoutePointMarkers(routePoints, routes);
    this.createShip();
    
    if (this.currentChapterId) {
      const branchState = this.stateManager.getChapterBranchState(this.currentChapterId);
      if (branchState) {
        routes.forEach(route => {
          const progress = branchState.routeProgress[route.id];
          const line = this.routeLines.get(route.id);
          if (line) {
            if (progress && !progress.unlocked) {
              line.visible = false;
            }
          }
        });
      }
    }
  }

  private getRouteColor(route: Route): number {
    if (route.color) {
      return parseInt(route.color.replace('#', ''), 16);
    }
    const branchType: RouteBranchType = route.branchType || 'main';
    return BRANCH_COLORS[branchType] || BRANCH_COLORS.main;
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
        const color = this.getRouteColor(route);
        const material = new THREE.LineDashedMaterial({
          color,
          dashSize: 2,
          gapSize: 1,
          transparent: true,
          opacity: 0.4
        });
        
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        line.userData = { routeId: route.id, branchType: route.branchType || 'main' };
        this.routeLines.set(route.id, line);
        this.routeGroup.add(line);
      }
    });
  }

  public updateRoutesVisualState(selectedRouteId: string): void {
    this.routeLines.forEach((line, routeId) => {
      const material = line.material as THREE.LineDashedMaterial;
      const route = this.allRoutes.find(r => r.id === routeId);
      if (!route) return;

      if (this.currentChapterId) {
        const progress = this.stateManager.getBranchRouteProgress(this.currentChapterId, routeId);
        if (progress && !progress.unlocked) {
          line.visible = false;
          return;
        }
      }

      line.visible = true;
      if (routeId === selectedRouteId) {
        material.opacity = 0.85;
        material.dashSize = 3;
        material.gapSize = 0.5;
      } else {
        material.opacity = 0.25;
        material.dashSize = 2;
        material.gapSize = 1;
      }
    });
  }

  private createRoutePointMarkers(routePoints: RoutePoint[], routes: Route[]): void {
    const pointToRoutes = new Map<string, string[]>();
    routes.forEach(route => {
      route.points.forEach(pointId => {
        if (!pointToRoutes.has(pointId)) {
          pointToRoutes.set(pointId, []);
        }
        pointToRoutes.get(pointId)!.push(route.id);
      });
    });

    routePoints.forEach(point => {
      this.routePointLabels.set(point.id, {
        pointId: point.id,
        routeIds: pointToRoutes.get(point.id) || []
      });

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

    if (this.currentChapterId) {
      const progress = this.stateManager.getBranchRouteProgress(this.currentChapterId, routeId);
      if (progress && !progress.unlocked) {
        eventBus.emit('toast:show', { 
          message: route.lockedDescription || `航线「${route.name}」尚未解锁` 
        });
        return;
      }
    }

    const state = this.stateManager.getState();
    if (state.ship.supplies <= 0) {
      eventBus.emit('toast:show', { message: '⚠️ 补给耗尽，无法起航！请先补充物资。' });
      return;
    }

    if (state.ship.supplies < state.ship.maxSupplies * 0.1) {
      eventBus.emit('toast:show', { message: '⚠️ 补给严重不足，航行将很危险！' });
    }
    
    this.currentRouteId = routeId;
    this.currentRoutePoints = route.points
      .map(id => this.allRoutePoints.find(p => p.id === id))
      .filter(Boolean) as RoutePoint[];
    
    this.currentPointIndex = 0;
    this.moveProgress = 0;
    this.isMoving = true;

    if (this.currentChapterId) {
      this.stateManager.selectBranchRoute(this.currentChapterId, routeId);
      this.stateManager.updateBranchRouteProgress(this.currentChapterId, routeId, {
        selected: true,
        currentPointIndex: 0,
        overallProgress: 0,
      });
    }
    
    this.stateManager.setState({ currentRoute: routeId, currentRouteProgress: 0 });
    
    eventBus.emit('route:started', routeId);
  }

  public stopRoute(): void {
    this.isMoving = false;
    this.currentRouteId = null;
    this.stateManager.setState({ currentRoute: null, currentRouteProgress: 0 });
    eventBus.emit('route:stopped');
  }

  public restoreRouteState(routeId: string | null, overallProgress: number): void {
    if (!routeId) {
      this.stopRoute();
      return;
    }

    const route = this.allRoutes.find(r => r.id === routeId);
    if (!route) {
      this.stopRoute();
      return;
    }

    this.currentRouteId = routeId;
    this.currentRoutePoints = route.points
      .map(id => this.allRoutePoints.find(p => p.id === id))
      .filter(Boolean) as RoutePoint[];

    if (this.currentRoutePoints.length < 2) {
      this.stopRoute();
      return;
    }

    const totalSegments = this.currentRoutePoints.length - 1;
    const clampedProgress = Math.max(0, Math.min(1, overallProgress));
    const exactPosition = clampedProgress * totalSegments;
    this.currentPointIndex = Math.min(Math.floor(exactPosition), totalSegments - 1);
    this.moveProgress = exactPosition - this.currentPointIndex;

    const currentPoint = this.currentRoutePoints[this.currentPointIndex];
    const nextPoint = this.currentRoutePoints[this.currentPointIndex + 1];

    if (currentPoint && nextPoint) {
      const t = MathUtils.easeInOutQuad(this.moveProgress);
      const x = MathUtils.lerp(currentPoint.position.x, nextPoint.position.x, t);
      const z = MathUtils.lerp(currentPoint.position.z, nextPoint.position.z, t);
      const y = Math.sin(Date.now() * 0.002) * 0.5;

      this.setShipPosition(x, y, z);

      const dx = nextPoint.position.x - currentPoint.position.x;
      const dz = nextPoint.position.z - currentPoint.position.z;
      const heading = Math.atan2(dx, dz);
      if (this.ship) {
        this.ship.rotation.y = heading;
      }
      this.stateManager.updateShip({ heading });
    }

    this.isMoving = clampedProgress < 1;
    
    this.stateManager.setState({ 
      currentRoute: this.isMoving ? routeId : null, 
      currentRouteProgress: clampedProgress 
    });
    
    if (this.isMoving) {
      eventBus.emit('route:started', routeId);
    }
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

    const eventState = this.stateManager.getState().voyageEvents;
    if (eventState?.isPausedForEvent) return;

    const state = this.stateManager.getState();
    const speed = state.ship.speed || 10;
    const crewModule = CrewModule.getInstance();

    const crewSpeedModifier = crewModule.getSpeedModifier();
    const effectiveWeatherEffects = crewModule.getEffectiveWeatherEffects(state.activeWeather);
    const weatherModifier = effectiveWeatherEffects?.speedModifier ?? 1;
    const dayNightSpeedModifier = this.getDayNightSpeedModifier();
    const damageSpeedModifier = this.damageModule.getSpeedModifier();
    const supplySpeedModifier = this.supplyModule.getSupplyModifier();
    const voyageEventSpeedModifier = this.voyageEventModule.getCombinedSpeedModifier();

    const currentPoint = this.currentRoutePoints[this.currentPointIndex];
    const nextPoint = this.currentRoutePoints[this.currentPointIndex + 1];

    if (currentPoint && nextPoint) {
      const dx = nextPoint.position.x - currentPoint.position.x;
      const dz = nextPoint.position.z - currentPoint.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      const totalModifier = crewSpeedModifier * weatherModifier * dayNightSpeedModifier * damageSpeedModifier * supplySpeedModifier * voyageEventSpeedModifier;
      const moveAmount = (speed * totalModifier * delta) / distance;

      this.moveProgress += moveAmount;
      this.checkCollisions(delta);
      
      if (this.moveProgress >= 1) {
        this.currentPointIndex++;
        this.moveProgress = 0;
        
        this.stateManager.addVisitedPoint(nextPoint.id);
        this.stateManager.addVisitedPoint(currentPoint.id);

        if (this.currentChapterId && this.currentRouteId) {
          const routeProgress = this.stateManager.getBranchRouteProgress(this.currentChapterId, this.currentRouteId);
          const visitedPoints = routeProgress?.visitedPoints || [];
          if (!visitedPoints.includes(nextPoint.id)) {
            visitedPoints.push(nextPoint.id);
          }
          if (!visitedPoints.includes(currentPoint.id)) {
            visitedPoints.push(currentPoint.id);
          }
          this.stateManager.updateBranchRouteProgress(this.currentChapterId, this.currentRouteId, {
            currentPointIndex: this.currentPointIndex,
            visitedPoints,
          });
        }
        
        eventBus.emit('point:reached', nextPoint.id);
        
        if (this.currentPointIndex >= this.currentRoutePoints.length - 1) {
          const completedRouteId = this.currentRouteId;
          this.stopRoute();
          eventBus.emit('route:completed', completedRouteId);

          if (this.currentChapterId && completedRouteId) {
            this.stateManager.completeBranchRoute(this.currentChapterId, completedRouteId);
            const route = this.allRoutes.find(r => r.id === completedRouteId);
            if (route?.completionReward) {
              if (route.completionReward.gold) {
                const currentGold = this.stateManager.getState().crew.gold;
                this.stateManager.updateCrew({ gold: currentGold + route.completionReward.gold });
                eventBus.emit('toast:show', { message: `💰 航线奖励：${route.completionReward.gold} 金币` });
              }
            }
          }
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

      const totalSegments = this.currentRoutePoints.length - 1;
      const overallProgress = (this.currentPointIndex + this.moveProgress) / totalSegments;
      this.stateManager.setState({ currentRouteProgress: overallProgress });

      if (this.currentChapterId && this.currentRouteId) {
        this.stateManager.updateBranchRouteProgress(this.currentChapterId, this.currentRouteId, {
          overallProgress
        });
      }
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
    const collisionModifier = effectiveWeather?.collisionChanceModifier ?? 1;

    const baseChance = 0.02 * (1 - visibility);
    const collisionChance = baseChance * collisionModifier * delta;
    if (Math.random() < collisionChance) {
      const impactForce = MathUtils.randomRange(0.5, 1.5) * (1 + (1 - visibility) * 0.5);
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

  public getAvailableRoutes(): Route[] {
    if (!this.currentChapterId) return this.allRoutes;
    
    return this.allRoutes.filter(route => {
      const progress = this.stateManager.getBranchRouteProgress(this.currentChapterId!, route.id);
      return progress?.unlocked ?? true;
    });
  }

  public getCurrentRouteId(): string | null {
    return this.currentRouteId;
  }

  public getRoutesWithProgress(): Array<{ route: Route; progress: number; unlocked: boolean; selected: boolean; completed: boolean; visitedPoints: string[] }> {
    if (!this.currentChapterId) {
      return this.allRoutes.map(route => ({
        route,
        progress: this.currentRouteId === route.id ? this.stateManager.getState().currentRouteProgress : 0,
        unlocked: true,
        selected: this.currentRouteId === route.id,
        completed: false,
        visitedPoints: []
      }));
    }

    return this.allRoutes.map(route => {
      const branchProgress = this.stateManager.getBranchRouteProgress(this.currentChapterId!, route.id);
      return {
        route,
        progress: branchProgress?.overallProgress ?? 0,
        unlocked: branchProgress?.unlocked ?? true,
        selected: branchProgress?.selected ?? (this.currentRouteId === route.id),
        completed: branchProgress?.completed ?? false,
        visitedPoints: branchProgress?.visitedPoints ?? []
      };
    }).sort((a, b) => (a.route.order || 0) - (b.route.order || 0));
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
    this.routePointLabels.clear();
    
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
    this.currentChapterId = null;
  }

  public dispose(): void {
    this.clearRoutes();
  }
}
