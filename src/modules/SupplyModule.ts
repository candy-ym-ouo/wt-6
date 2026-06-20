import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { GameEngine } from '../core/GameEngine';
import { CrewModule } from './CrewModule';
import { SaveModule } from './SaveModule';
import { WeatherType, ShipState } from '../types';

const BASE_CONSUMPTION_PER_SECOND = 0.3;
const BASE_RECOVERY_PER_SECOND = 0.5;
const SPEED_CONSUMPTION_FACTOR = 0.02;
const LOW_SUPPLY_THRESHOLD = 0.3;
const CRITICAL_SUPPLY_THRESHOLD = 0.1;
const DAMAGE_PER_SECOND_WHEN_EMPTY = 2;
const PORT_RECOVERY_MULTIPLIER = 2;
const DAMAGE_CONSUMPTION_MULTIPLIER = 0.5;

export interface SupplyState {
  currentSupplies: number;
  maxSupplies: number;
  consumptionRate: number;
  recoveryRate: number;
  isLow: boolean;
  isCritical: boolean;
  lastConsumptionTime: number;
  lastRecoveryTime: number;
  totalConsumed: number;
  totalRecovered: number;
}

export interface SupplyConsumptionEvent {
  amount: number;
  reason: 'sailing' | 'weather' | 'damage' | 'crew_rest' | 'repair' | 'trade' | 'crew_recruit';
  timestamp: number;
}

export interface SupplyRecoveryEvent {
  amount: number;
  reason: 'docked' | 'port' | 'trade' | 'gathering' | 'reward';
  timestamp: number;
}

export class SupplyModule {
  private static instance: SupplyModule;
  private stateManager: GameStateManager;
  private engine: GameEngine;
  private crewModule: CrewModule;
  private saveModule: SaveModule;
  private initialized: boolean = false;
  private updateUnsubscriber: (() => void) | null = null;
  private eventHandlerRefs: Array<{ event: string; handler: (...args: any[]) => void }> = [];
  private lastSuppliesState: number = 100;
  private consumptionHistory: SupplyConsumptionEvent[] = [];
  private recoveryHistory: SupplyRecoveryEvent[] = [];
  private currentPortId: string | null = null;
  private isPaused: boolean = false;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.engine = GameEngine.getInstance();
    this.crewModule = CrewModule.getInstance();
    this.saveModule = SaveModule.getInstance();
  }

  public static getInstance(): SupplyModule {
    if (!SupplyModule.instance) {
      SupplyModule.instance = new SupplyModule();
    }
    return SupplyModule.instance;
  }

  public initialize(): void {
    if (this.initialized) return;
    
    this.setupEventListeners();
    this.updateUnsubscriber = this.engine.onUpdate(this.update.bind(this));
    this.initialized = true;
    
    const state = this.stateManager.getState();
    this.lastSuppliesState = state.ship.supplies;

    this.saveModule.setSupplyStateProvider(() => this.serialize());
  }

  private setupEventListeners(): void {
    this.onceOn('route:started', this.onRouteStarted.bind(this));
    this.onceOn('route:stopped', this.onRouteStopped.bind(this));
    this.onceOn('route:completed', this.onRouteCompleted.bind(this));
    this.onceOn('weather:changed', this.onWeatherChanged.bind(this));
    this.onceOn('port:available', this.onPortAvailable.bind(this));
    this.onceOn('port:closed', this.onPortClosed.bind(this));
    this.onceOn('ship:damage_applied', this.onShipDamage.bind(this));
    this.onceOn('gathering:completed', this.onGatheringCompleted.bind(this));
    this.onceOn('reward:granted', this.onRewardGranted.bind(this));
    this.onceOn('game:pause', () => { this.isPaused = true; });
    this.onceOn('game:resume', () => { this.isPaused = false; });
    this.onceOn('supplies:load', this.deserialize.bind(this));
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
    if (this.isPaused) return;

    const state = this.stateManager.getState();
    const ship = state.ship;
    const isMoving = ship.speed > 0.1;

    if (isMoving) {
      this.consumeSupplies(delta);
    } else {
      this.recoverSupplies(delta);
    }

    this.checkSupplyEffects(delta);
    this.lastSuppliesState = ship.supplies;
  }

  private consumeSupplies(delta: number): void {
    const state = this.stateManager.getState();
    const ship = state.ship;
    const weather = state.activeWeather;

    const baseConsumption = BASE_CONSUMPTION_PER_SECOND * delta;
    const speedFactor = 1 + (ship.speed / ship.maxSpeed) * SPEED_CONSUMPTION_FACTOR * 10;
    const weatherFactor = weather ? weather.effects.supplyConsumptionModifier : 1;
    const supplySaveModifier = 1 - this.crewModule.getSupplySaveModifier();
    const healthRatio = ship.health / ship.maxHealth;
    const damageFactor = healthRatio < 0.5 ? 1 + (0.5 - healthRatio) * DAMAGE_CONSUMPTION_MULTIPLIER : 1;

    const totalConsumption = baseConsumption * speedFactor * weatherFactor * supplySaveModifier * damageFactor;

    if (totalConsumption > 0) {
      const newSupplies = Math.max(0, ship.supplies - totalConsumption);
      this.stateManager.updateShip({ supplies: newSupplies });

      this.consumptionHistory.push({
        amount: totalConsumption,
        reason: 'sailing',
        timestamp: Date.now(),
      });
      this.consumptionHistory = this.consumptionHistory.slice(-100);

      eventBus.emit('supplies:consumed', {
        amount: totalConsumption,
        current: newSupplies,
        max: ship.maxSupplies,
      });
    }
  }

  private recoverSupplies(delta: number): void {
    const state = this.stateManager.getState();
    const ship = state.ship;

    if (ship.supplies >= ship.maxSupplies) return;

    const baseRecovery = BASE_RECOVERY_PER_SECOND * delta;
    const portMultiplier = this.currentPortId ? PORT_RECOVERY_MULTIPLIER : 1;
    const totalRecovery = baseRecovery * portMultiplier;

    if (totalRecovery > 0) {
      const newSupplies = Math.min(ship.maxSupplies, ship.supplies + totalRecovery);
      this.stateManager.updateShip({ supplies: newSupplies });

      this.recoveryHistory.push({
        amount: totalRecovery,
        reason: this.currentPortId ? 'port' : 'docked',
        timestamp: Date.now(),
      });
      this.recoveryHistory = this.recoveryHistory.slice(-100);

      eventBus.emit('supplies:recovered', {
        amount: totalRecovery,
        current: newSupplies,
        max: ship.maxSupplies,
      });
    }
  }

  private checkSupplyEffects(delta: number): void {
    const state = this.stateManager.getState();
    const ship = state.ship;
    const supplyRatio = ship.supplies / ship.maxSupplies;
    const wasLow = this.lastSuppliesState / ship.maxSupplies > LOW_SUPPLY_THRESHOLD;
    const wasCritical = this.lastSuppliesState / ship.maxSupplies > CRITICAL_SUPPLY_THRESHOLD;

    if (supplyRatio <= CRITICAL_SUPPLY_THRESHOLD && wasCritical) {
      eventBus.emit('supplies:critical', {
        current: ship.supplies,
        max: ship.maxSupplies,
      });
      eventBus.emit('toast:show', { message: '⚠️ 补给严重不足！船体开始受损' });
    } else if (supplyRatio <= LOW_SUPPLY_THRESHOLD && wasLow) {
      eventBus.emit('supplies:low', {
        current: ship.supplies,
        max: ship.maxSupplies,
      });
      eventBus.emit('toast:show', { message: '⚡ 补给不足，航速下降' });
    }

    if (supplyRatio <= CRITICAL_SUPPLY_THRESHOLD && ship.supplies > 0) {
      eventBus.emit('ship:speed_modifier', { modifier: 0.5, reason: 'low_supplies' });
    } else if (supplyRatio <= LOW_SUPPLY_THRESHOLD) {
      eventBus.emit('ship:speed_modifier', { modifier: 0.8, reason: 'low_supplies' });
    }

    if (ship.supplies <= 0 && state.ship.speed > 0.1) {
      this.applyNoSupplyDamage(delta);
    }
  }

  private applyNoSupplyDamage(delta: number): void {
    const damage = DAMAGE_PER_SECOND_WHEN_EMPTY * delta;
    const state = this.stateManager.getState();
    const newHealth = Math.max(0, state.ship.health - damage);
    
    this.stateManager.updateShip({ health: newHealth });
    
    eventBus.emit('ship:damage_from_no_supplies', {
      amount: damage,
      currentHealth: newHealth,
    });
  }

  public addSupplies(amount: number, reason: SupplyRecoveryEvent['reason'] = 'trade'): void {
    const state = this.stateManager.getState();
    const ship = state.ship;
    const newSupplies = Math.min(ship.maxSupplies, ship.supplies + amount);
    const actualAmount = newSupplies - ship.supplies;

    if (actualAmount > 0) {
      this.stateManager.updateShip({ supplies: newSupplies });
      
      this.recoveryHistory.push({
        amount: actualAmount,
        reason,
        timestamp: Date.now(),
      });
      this.recoveryHistory = this.recoveryHistory.slice(-100);

      eventBus.emit('supplies:added', {
        amount: actualAmount,
        current: newSupplies,
        max: ship.maxSupplies,
        reason,
      });
    }
  }

  public consumeSuppliesManual(amount: number, reason: SupplyConsumptionEvent['reason'] = 'trade'): boolean {
    const state = this.stateManager.getState();
    const ship = state.ship;

    if (ship.supplies < amount) {
      eventBus.emit('toast:show', { message: '补给不足' });
      return false;
    }

    const newSupplies = Math.max(0, ship.supplies - amount);
    this.stateManager.updateShip({ supplies: newSupplies });

    this.consumptionHistory.push({
      amount,
      reason,
      timestamp: Date.now(),
    });
    this.consumptionHistory = this.consumptionHistory.slice(-100);

    eventBus.emit('supplies:consumed', {
      amount,
      current: newSupplies,
      max: ship.maxSupplies,
      reason,
    });

    return true;
  }

  public getSupplyState(): SupplyState {
    const state = this.stateManager.getState();
    const ship = state.ship;
    const weather = state.activeWeather;
    const isMoving = ship.speed > 0.1;

    const baseConsumption = BASE_CONSUMPTION_PER_SECOND;
    const speedFactor = 1 + (ship.speed / ship.maxSpeed) * SPEED_CONSUMPTION_FACTOR * 10;
    const weatherFactor = weather ? weather.effects.supplyConsumptionModifier : 1;
    const supplySaveModifier = 1 - this.crewModule.getSupplySaveModifier();
    const healthRatio = ship.health / ship.maxHealth;
    const damageFactor = healthRatio < 0.5 ? 1 + (0.5 - healthRatio) * DAMAGE_CONSUMPTION_MULTIPLIER : 1;

    const consumptionRate = isMoving ? baseConsumption * speedFactor * weatherFactor * supplySaveModifier * damageFactor : 0;
    const portMultiplier = this.currentPortId ? PORT_RECOVERY_MULTIPLIER : 1;
    const recoveryRate = !isMoving ? BASE_RECOVERY_PER_SECOND * portMultiplier : 0;

    const supplyRatio = ship.supplies / ship.maxSupplies;

    return {
      currentSupplies: ship.supplies,
      maxSupplies: ship.maxSupplies,
      consumptionRate,
      recoveryRate,
      isLow: supplyRatio <= LOW_SUPPLY_THRESHOLD && supplyRatio > CRITICAL_SUPPLY_THRESHOLD,
      isCritical: supplyRatio <= CRITICAL_SUPPLY_THRESHOLD,
      lastConsumptionTime: this.consumptionHistory.length > 0 ? this.consumptionHistory[this.consumptionHistory.length - 1].timestamp : 0,
      lastRecoveryTime: this.recoveryHistory.length > 0 ? this.recoveryHistory[this.recoveryHistory.length - 1].timestamp : 0,
      totalConsumed: this.consumptionHistory.reduce((sum, e) => sum + e.amount, 0),
      totalRecovered: this.recoveryHistory.reduce((sum, e) => sum + e.amount, 0),
    };
  }

  public getConsumptionHistory(): SupplyConsumptionEvent[] {
    return [...this.consumptionHistory];
  }

  public getRecoveryHistory(): SupplyRecoveryEvent[] {
    return [...this.recoveryHistory];
  }

  public getSupplyModifier(): number {
    const state = this.stateManager.getState();
    const ship = state.ship;
    const supplyRatio = ship.supplies / ship.maxSupplies;

    if (supplyRatio <= CRITICAL_SUPPLY_THRESHOLD) return 0.5;
    if (supplyRatio <= LOW_SUPPLY_THRESHOLD) return 0.8;
    return 1;
  }

  private onRouteStarted(): void {
    eventBus.emit('supplies:consumption_started');
  }

  private onRouteStopped(): void {
    eventBus.emit('supplies:consumption_stopped');
  }

  private onRouteCompleted(routeId: string): void {
    const state = this.stateManager.getState();
    const route = state.currentRoute;
    if (route) {
      const bonus = Math.floor(10 + Math.random() * 10);
      this.addSupplies(bonus, 'reward');
      eventBus.emit('toast:show', { message: `🎁 航线完成奖励：+${bonus} 补给` });
    }
  }

  private onWeatherChanged(weather: WeatherType | null): void {
    if (weather) {
      const modifier = weather.effects.supplyConsumptionModifier;
      if (modifier > 1) {
        eventBus.emit('toast:show', { 
          message: `🌤️ ${weather.name}导致补给消耗增加 ${Math.round((modifier - 1) * 100)}%` 
        });
      }
    }
  }

  private onPortAvailable(port: any): void {
    this.currentPortId = port.id;
    eventBus.emit('supplies:port_available', port);
  }

  private onPortClosed(): void {
    this.currentPortId = null;
    eventBus.emit('supplies:port_closed');
  }

  private onShipDamage(): void {
  }

  private onGatheringCompleted(result: any): void {
    if (result?.rewards) {
      result.rewards.forEach((reward: any) => {
        if (reward.type === 'supplies' && reward.amount) {
          this.addSupplies(reward.amount, 'gathering');
        }
      });
    }
  }

  private onRewardGranted(event: any): void {
    if (event?.rewards) {
      event.rewards.forEach((reward: any) => {
        if (reward.type === 'supplies' && reward.amount) {
          this.addSupplies(reward.amount, 'reward');
        }
      });
    }
  }

  public resetState(): void {
    const defaultShip: ShipState = {
      speed: 0,
      maxSpeed: 15,
      health: 100,
      maxHealth: 100,
      supplies: 100,
      maxSupplies: 100,
      heading: 0,
    };
    this.stateManager.updateShip(defaultShip);
    this.consumptionHistory = [];
    this.recoveryHistory = [];
    this.currentPortId = null;
    this.lastSuppliesState = 100;
  }

  public getSerializableState(): { consumptionHistory: SupplyConsumptionEvent[]; recoveryHistory: SupplyRecoveryEvent[] } {
    return {
      consumptionHistory: [...this.consumptionHistory],
      recoveryHistory: [...this.recoveryHistory],
    };
  }

  public loadSerializableState(data: { consumptionHistory?: SupplyConsumptionEvent[]; recoveryHistory?: SupplyRecoveryEvent[] }): void {
    if (data.consumptionHistory) {
      this.consumptionHistory = [...data.consumptionHistory];
    }
    if (data.recoveryHistory) {
      this.recoveryHistory = [...data.recoveryHistory];
    }
  }

  public serialize(): { consumptionHistory: SupplyConsumptionEvent[]; recoveryHistory: SupplyRecoveryEvent[] } {
    return this.getSerializableState();
  }

  public deserialize(data: { consumptionHistory?: SupplyConsumptionEvent[]; recoveryHistory?: SupplyRecoveryEvent[] }): void {
    this.loadSerializableState(data);
    const state = this.stateManager.getState();
    this.lastSuppliesState = state.ship.supplies;
    eventBus.emit('toast:show', { message: '📦 补给状态已加载' });
  }

  public dispose(): void {
    if (this.updateUnsubscriber) {
      this.updateUnsubscriber();
      this.updateUnsubscriber = null;
    }
    this.clearAllEventListeners();
    this.initialized = false;
  }
}
