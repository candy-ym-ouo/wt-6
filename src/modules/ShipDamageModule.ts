import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import {
  ShipState,
  ShipDamageState,
  DamageRecord,
  RepairRecord,
  DamageType,
  PortRepairConfig,
  WeatherType,
  Port,
  RoutePoint,
} from '../types';
import { CrewModule } from './CrewModule';

const DEFAULT_DAMAGE_STATE: ShipDamageState = {
  damageRecords: [],
  repairRecords: [],
  damageThreshold: {
    critical: 0.2,
    severe: 0.4,
    moderate: 0.6,
    minor: 0.8,
  },
  lastDamageTime: 0,
  lastRepairTime: 0,
  wearAccumulator: 0,
};

const DEFAULT_PORT_REPAIR_CONFIG: PortRepairConfig = {
  repairRate: 5,
  goldPerHealth: 2,
  suppliesPerHealth: 0.5,
  instantRepairMultiplier: 3,
};

const WEAR_PER_SECOND = 0.02;
const COLLISION_BASE_DAMAGE = 15;
const METEOR_HIT_DAMAGE = 25;

export class ShipDamageModule {
  private static instance: ShipDamageModule;
  private stateManager: GameStateManager;
  private crewModule: CrewModule;
  private initialized: boolean = false;
  private lastHealthState: number = 100;
  private portRepairConfig: PortRepairConfig = { ...DEFAULT_PORT_REPAIR_CONFIG };
  private eventHandlerRefs: Array<{ event: string; handler: (...args: any[]) => void }> = [];
  private currentPortId: string | null = null;
  private isRepairingAtPort: boolean = false;
  private repairTimer: number | null = null;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.crewModule = CrewModule.getInstance();
  }

  public static getInstance(): ShipDamageModule {
    if (!ShipDamageModule.instance) {
      ShipDamageModule.instance = new ShipDamageModule();
    }
    return ShipDamageModule.instance;
  }

  public initialize(): void {
    if (this.initialized) return;
    this.ensureDamageStateExists();
    this.setupEventListeners();
    this.initialized = true;
    const state = this.stateManager.getState();
    this.lastHealthState = state.ship.health;
  }

  private ensureDamageStateExists(): void {
    const state = this.stateManager.getState();
    if (!state.ship.damage) {
      this.stateManager.updateShip({
        damage: { ...DEFAULT_DAMAGE_STATE, damageRecords: [], repairRecords: [] },
      });
    }
  }

  private setupEventListeners(): void {
    this.onceOn('weather:changed', this.onWeatherChanged.bind(this));
    this.onceOn('route:started', this.onRouteStarted.bind(this));
    this.onceOn('point:reached', this.onPointReached.bind(this));
    this.onceOn('ship:collision', this.onShipCollision.bind(this));
    this.onceOn('meteor:hit', this.onMeteorHit.bind(this));
    this.onceOn('port:available', this.onPortAvailable.bind(this));
    this.onceOn('port:closed', this.onPortClosed.bind(this));
    this.onceOn('port:repair_start', this.startPortRepair.bind(this));
    this.onceOn('port:repair_stop', this.stopPortRepair.bind(this));
    this.onceOn('port:repair_instant', this.instantPortRepair.bind(this));
    this.stateManager.onUpdate(this.update.bind(this));
  }

  private onceOn<T = unknown>(event: string, handler: (data: T) => void): void {
    this.eventHandlerRefs.push({ event, handler });
    eventBus.on(event, handler);
  }

  private clearAllEventListeners(): void {
    this.eventHandlerRefs.forEach(({ event, handler }) => {
      eventBus.off(event, handler);
    });
    this.eventHandlerRefs = [];
  }

  private update(delta: number): void {
    const state = this.stateManager.getState();
    const ship = state.ship;

    if (ship.speed > 0.1) {
      this.applyWear(delta);
    }

    this.updateSpeedBasedOnHealth();
    this.checkHealthThresholds();
    this.lastHealthState = ship.health;
  }

  private applyWear(delta: number): void {
    const state = this.stateManager.getState();
    if (!state.ship.damage) return;

    const damageState = { ...state.ship.damage };
    damageState.wearAccumulator += WEAR_PER_SECOND * delta;

    if (damageState.wearAccumulator >= 1) {
      const wearAmount = Math.floor(damageState.wearAccumulator);
      damageState.wearAccumulator -= wearAmount;
      this.applyDamage(wearAmount, 'wear', '船体航行损耗');
    } else {
      this.stateManager.updateShip({ damage: damageState });
    }
  }

  public applyDamage(amount: number, type: DamageType, description: string, location?: string): void {
    const state = this.stateManager.getState();
    const ship = state.ship;

    if (!ship.damage) {
      this.ensureDamageStateExists();
    }

    const resistModifier = this.crewModule.getWeatherResistModifier();
    const effectiveAmount = type === 'weather' || type === 'wear'
      ? Math.max(1, Math.round(amount * resistModifier))
      : amount;

    const newHealth = Math.max(0, ship.health - effectiveAmount);

    const record: DamageRecord = {
      id: `dmg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      amount: effectiveAmount,
      timestamp: Date.now(),
      description,
      location,
    };

    const damageState = { ...ship.damage! };
    damageState.damageRecords = [...damageState.damageRecords, record].slice(-50);
    damageState.lastDamageTime = Date.now();

    this.stateManager.updateShip({
      health: newHealth,
      damage: damageState,
    });

    eventBus.emit('ship:damage_applied', {
      record,
      newHealth,
      oldHealth: ship.health,
    });

    const severityMessage = this.getSeverityMessage(newHealth, ship.maxHealth);
    if (severityMessage && effectiveAmount >= 5) {
      eventBus.emit('toast:show', { message: `⚠️ ${description} -${effectiveAmount} 船体耐久` });
    }

    if (severityMessage?.critical) {
      eventBus.emit('ship:critical_damage', { health: newHealth, maxHealth: ship.maxHealth });
      eventBus.emit('sound:play', 'warning');
    }
  }

  public repairShip(amount: number, location: string, cost?: { gold?: number; supplies?: number }, isPortRepair: boolean = false): boolean {
    const state = this.stateManager.getState();
    const ship = state.ship;

    if (!ship.damage) {
      this.ensureDamageStateExists();
    }

    if (cost?.gold && state.crew.gold < cost.gold) {
      eventBus.emit('toast:show', { message: '金币不足，无法维修' });
      return false;
    }
    if (cost?.supplies && ship.supplies < cost.supplies) {
      eventBus.emit('toast:show', { message: '物资不足，无法维修' });
      return false;
    }

    if (cost?.gold) {
      const crew = { ...state.crew };
      crew.gold -= cost.gold;
      this.stateManager.setState({ crew });
      eventBus.emit('crew:updated', crew);
    }
    if (cost?.supplies) {
      this.stateManager.updateShip({
        supplies: Math.max(0, ship.supplies - cost.supplies),
      });
    }

    const actualRepair = Math.min(amount, ship.maxHealth - ship.health);
    if (actualRepair <= 0) {
      eventBus.emit('toast:show', { message: '船体已满耐久' });
      return false;
    }

    const newHealth = ship.health + actualRepair;

    const record: RepairRecord = {
      id: `rpr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      amount: actualRepair,
      cost: cost || {},
      timestamp: Date.now(),
      location,
      isPortRepair,
    };

    const damageState = { ...ship.damage! };
    damageState.repairRecords = [...damageState.repairRecords, record].slice(-50);
    damageState.lastRepairTime = Date.now();

    this.stateManager.updateShip({
      health: newHealth,
      damage: damageState,
    });

    eventBus.emit('ship:repaired', {
      record,
      newHealth,
      oldHealth: ship.health,
    });

    eventBus.emit('toast:show', { message: `🔧 维修完成 +${actualRepair} 船体耐久` });
    return true;
  }

  public startPortRepair(data: { portId: string; portName: string }): void {
    if (this.isRepairingAtPort) return;

    this.currentPortId = data.portId;
    this.isRepairingAtPort = true;
    eventBus.emit('toast:show', { message: `🏪 开始在 ${data.portName} 维修船体` });

    this.repairTimer = window.setInterval(() => {
      if (!this.isRepairingAtPort) return;

      const state = this.stateManager.getState();
      const ship = state.ship;

      if (ship.health >= ship.maxHealth) {
        this.stopPortRepair();
        eventBus.emit('toast:show', { message: '✅ 船体维修完成，已满耐久' });
        return;
      }

      const repairAmount = this.portRepairConfig.repairRate;
      const goldCost = Math.round(repairAmount * this.portRepairConfig.goldPerHealth);
      const suppliesCost = Math.round(repairAmount * this.portRepairConfig.suppliesPerHealth);

      const success = this.repairShip(
        repairAmount,
        data.portName,
        { gold: goldCost, supplies: suppliesCost },
        true
      );

      if (!success) {
        const state2 = this.stateManager.getState();
        if (state2.crew.gold < goldCost || state2.ship.supplies < suppliesCost) {
          this.stopPortRepair();
        }
      }
    }, 1000);
  }

  public stopPortRepair(): void {
    this.isRepairingAtPort = false;
    this.currentPortId = null;
    if (this.repairTimer !== null) {
      clearInterval(this.repairTimer);
      this.repairTimer = null;
    }
    eventBus.emit('port:repair_stopped');
  }

  public instantPortRepair(data: { portId: string; portName: string }): void {
    const state = this.stateManager.getState();
    const ship = state.ship;

    const healthNeeded = ship.maxHealth - ship.health;
    if (healthNeeded <= 0) {
      eventBus.emit('toast:show', { message: '船体已满耐久' });
      return;
    }

    const baseGoldCost = healthNeeded * this.portRepairConfig.goldPerHealth;
    const baseSuppliesCost = healthNeeded * this.portRepairConfig.suppliesPerHealth;
    const goldCost = Math.round(baseGoldCost * this.portRepairConfig.instantRepairMultiplier);
    const suppliesCost = Math.round(baseSuppliesCost * this.portRepairConfig.instantRepairMultiplier);

    const success = this.repairShip(
      healthNeeded,
      data.portName,
      { gold: goldCost, supplies: suppliesCost },
      true
    );

    if (success) {
      eventBus.emit('toast:show', { message: `⚡ 紧急维修完成！花费 ${goldCost}💰 ${suppliesCost}📦` });
      eventBus.emit('sound:play', 'objective_complete');
    }
  }

  public calculateRepairCost(healthToRepair: number, instant: boolean = false): { gold: number; supplies: number } {
    const multiplier = instant ? this.portRepairConfig.instantRepairMultiplier : 1;
    return {
      gold: Math.round(healthToRepair * this.portRepairConfig.goldPerHealth * multiplier),
      supplies: Math.round(healthToRepair * this.portRepairConfig.suppliesPerHealth * multiplier),
    };
  }

  private updateSpeedBasedOnHealth(): void {
    const state = this.stateManager.getState();
    const ship = state.ship;
    const healthRatio = ship.health / ship.maxHealth;

    let speedModifier = 1;
    if (healthRatio <= 0.2) {
      speedModifier = 0.4;
    } else if (healthRatio <= 0.4) {
      speedModifier = 0.6;
    } else if (healthRatio <= 0.6) {
      speedModifier = 0.8;
    } else if (healthRatio <= 0.8) {
      speedModifier = 0.9;
    }

    const baseSpeed = ship.speed;
    eventBus.emit('ship:speed_modifier', { modifier: speedModifier, healthRatio });
  }

  public getSpeedModifier(): number {
    const state = this.stateManager.getState();
    const ship = state.ship;
    const healthRatio = ship.health / ship.maxHealth;

    if (healthRatio <= 0.2) return 0.4;
    if (healthRatio <= 0.4) return 0.6;
    if (healthRatio <= 0.6) return 0.8;
    if (healthRatio <= 0.8) return 0.9;
    return 1;
  }

  private checkHealthThresholds(): void {
    const state = this.stateManager.getState();
    const ship = state.ship;
    const healthRatio = ship.health / ship.maxHealth;
    const lastHealthRatio = this.lastHealthState / ship.maxHealth;

    const thresholds = [
      { ratio: 0.2, event: 'ship:health_critical', message: '🔥 船体严重受损！' },
      { ratio: 0.4, event: 'ship:health_severe', message: '⚠️ 船体损坏严重' },
      { ratio: 0.6, event: 'ship:health_moderate', message: '船体出现中等损伤' },
      { ratio: 0.8, event: 'ship:health_minor', message: '船体出现轻微损伤' },
    ];

    for (const threshold of thresholds) {
      const wasAbove = lastHealthRatio > threshold.ratio;
      const isBelow = healthRatio <= threshold.ratio;
      if (wasAbove && isBelow) {
        eventBus.emit(threshold.event, { health: ship.health, maxHealth: ship.maxHealth });
        if (threshold.ratio <= 0.4) {
          eventBus.emit('toast:show', { message: threshold.message });
        }
        break;
      }
    }

    if (ship.health <= 0 && this.lastHealthState > 0) {
      eventBus.emit('ship:destroyed', {});
      eventBus.emit('toast:show', { message: '💀 船体损毁！游戏结束' });
    }
  }

  private getSeverityMessage(health: number, maxHealth: number): { critical: boolean; message: string } | null {
    const ratio = health / maxHealth;
    if (ratio <= 0.2) return { critical: true, message: '船体严重受损！' };
    if (ratio <= 0.4) return { critical: true, message: '船体损坏严重' };
    return null;
  }

  private onWeatherChanged(weather: WeatherType | null): void {
    if (!weather) return;

    const intensity = weather.intensity;
    if (weather.id.includes('storm') && intensity > 0.3) {
      const damageAmount = Math.round(intensity * 8);
      setTimeout(() => {
        this.applyDamage(damageAmount, 'weather', `暴风雨造成船体损伤`);
      }, 2000);
    }
  }

  private onShipCollision(data: { impactForce: number; location: string }): void {
    const baseDamage = COLLISION_BASE_DAMAGE * (data.impactForce || 1);
    const damageAmount = Math.max(5, Math.round(baseDamage));
    this.applyDamage(damageAmount, 'collision', `船体碰撞受损`, data.location);
    eventBus.emit('sound:play', 'collision');
  }

  private onMeteorHit(data?: { location?: string }): void {
    this.applyDamage(METEOR_HIT_DAMAGE, 'meteor', `流星撞击船体`, data?.location);
  }

  private onRouteStarted(): void {
    this.lastHealthState = this.stateManager.getState().ship.health;
  }

  private onPointReached(pointId: string): void {
    const state = this.stateManager.getState();
    if (state.ship.health < state.ship.maxHealth * 0.5) {
      eventBus.emit('toast:show', { message: '🔧 提示：船体受损，建议在港口进行维修' });
    }
  }

  private onPortAvailable(port: Port): void {
    this.currentPortId = port.id;
    const state = this.stateManager.getState();
    if (state.ship.health < state.ship.maxHealth * 0.8) {
      const healthNeeded = state.ship.maxHealth - state.ship.health;
      const cost = this.calculateRepairCost(healthNeeded, false);
      setTimeout(() => {
        eventBus.emit('toast:show', {
          message: `🏪 在 ${port.name} 可维修船体（每秒 ${this.portRepairConfig.repairRate}耐久，约 ${cost.gold}💰 ${cost.supplies}📦）`
        });
      }, 1500);
    }
  }

  private onPortClosed(): void {
    this.stopPortRepair();
    this.currentPortId = null;
  }

  public getDamageRecords(): DamageRecord[] {
    return this.stateManager.getState().ship.damage?.damageRecords || [];
  }

  public getRepairRecords(): RepairRecord[] {
    return this.stateManager.getState().ship.damage?.repairRecords || [];
  }

  public getHealthStatus(): { health: number; maxHealth: number; ratio: number; status: string } {
    const state = this.stateManager.getState();
    const ship = state.ship;
    const ratio = ship.health / ship.maxHealth;

    let status = '完好';
    if (ratio <= 0.2) status = '严重损毁';
    else if (ratio <= 0.4) status = '重度损坏';
    else if (ratio <= 0.6) status = '中度损坏';
    else if (ratio <= 0.8) status = '轻微损伤';

    return {
      health: ship.health,
      maxHealth: ship.maxHealth,
      ratio,
      status,
    };
  }

  public getPortRepairConfig(): PortRepairConfig {
    return { ...this.portRepairConfig };
  }

  public isCurrentlyRepairing(): boolean {
    return this.isRepairingAtPort;
  }

  public resetState(): void {
    this.stopPortRepair();
    this.stateManager.updateShip({
      damage: { ...DEFAULT_DAMAGE_STATE, damageRecords: [], repairRecords: [] },
    });
    this.lastHealthState = this.stateManager.getState().ship.health;
  }

  public getSerializableState(): ShipDamageState | undefined {
    const state = this.stateManager.getState();
    return state.ship.damage ? { ...state.ship.damage } : undefined;
  }

  public loadSerializableState(damageState: ShipDamageState): void {
    this.stateManager.updateShip({ damage: { ...damageState } });
  }

  public dispose(): void {
    this.clearAllEventListeners();
    this.stopPortRepair();
    this.initialized = false;
  }
}
