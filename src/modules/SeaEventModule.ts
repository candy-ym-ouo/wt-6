import * as THREE from 'three';
import { GameStateManager } from '../core/GameStateManager';
import { GameEngine } from '../core/GameEngine';
import { eventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import {
  SeaEventConfig,
  SeaEventState,
  SeaEventChoice,
  SeaEventReward,
  SeaEventType,
  SeaEventRarity,
  WeatherType,
  TimeOfDay,
  CrewRole,
  CodexEntry,
  CodexCategory,
} from '../types';
import { seaEvents, getSeaEventById } from '../data/seaEvents';
import { CrewModule } from './CrewModule';
import { ShipDamageModule } from './ShipDamageModule';
import { DayNightCycleModule } from './DayNightCycleModule';
import { CodexModule } from './CodexModule';
import { ChapterModule } from './ChapterModule';

const DEFAULT_SEA_EVENT_STATE: SeaEventState = {
  activeEventId: null,
  eventHistory: [],
  eventCooldowns: {},
  eventOccurrences: {},
  discoveredEventIds: [],
  flags: {},
  pendingNextEventId: null,
};

const RARITY_WEIGHTS: Record<SeaEventRarity, number> = {
  common: 40,
  uncommon: 30,
  rare: 20,
  epic: 8,
  legendary: 2,
};

const EVENT_TRIGGER_INTERVAL = 30;
const EVENT_TRIGGER_CHANCE = 0.3;

export class SeaEventModule {
  private static instance: SeaEventModule;
  private stateManager: GameStateManager;
  private engine: GameEngine;
  private crewModule: CrewModule;
  private shipDamageModule: ShipDamageModule;
  private dayNightModule: DayNightCycleModule;
  private codexModule: CodexModule;
  private chapterModule: ChapterModule;
  private initialized: boolean = false;
  private eventGroup: THREE.Group;
  private eventOverlay: HTMLElement | null = null;
  private eventPanel: HTMLElement | null = null;
  private activeEvent: SeaEventConfig | null = null;
  private eventTriggerTimer: number = 0;
  private currentChapterId: string | null = null;
  private eventHandlerRefs: Array<{ event: string; handler: (...args: any[]) => void }> = [];

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.engine = GameEngine.getInstance();
    this.crewModule = CrewModule.getInstance();
    this.shipDamageModule = ShipDamageModule.getInstance();
    this.dayNightModule = DayNightCycleModule.getInstance();
    this.codexModule = CodexModule.getInstance();
    this.chapterModule = new ChapterModule();

    this.eventGroup = new THREE.Group();
    this.eventGroup.name = 'seaEvents';
    this.engine.scene.add(this.eventGroup);

    this.createEventUI();
  }

  public static getInstance(): SeaEventModule {
    if (!SeaEventModule.instance) {
      SeaEventModule.instance = new SeaEventModule();
    }
    return SeaEventModule.instance;
  }

  public initialize(): void {
    if (this.initialized) return;
    this.ensureStateExists();
    this.setupEventListeners();
    this.initialized = true;
  }

  private ensureStateExists(): void {
    const state = this.stateManager.getState();
    if (!state.seaEvents) {
      this.stateManager.setState({
        seaEvents: { ...DEFAULT_SEA_EVENT_STATE, eventHistory: [], eventCooldowns: {}, eventOccurrences: {}, discoveredEventIds: [], flags: {}, pendingNextEventId: null },
      });
    } else {
      if (!state.seaEvents.flags) {
        this.stateManager.setState({
          seaEvents: { ...state.seaEvents, flags: {}, pendingNextEventId: state.seaEvents.pendingNextEventId ?? null },
        });
      }
    }
  }

  private setupEventListeners(): void {
    this.onceOn('chapter:started', this.onChapterStarted.bind(this));
    this.onceOn('weather:changed', this.onWeatherChanged.bind(this));
    this.onceOn('daynight:changed', this.onDayNightChanged.bind(this));
    this.onceOn('star:discovered', this.onStarDiscovered.bind(this));
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

  private createEventUI(): void {
    const uiLayer = document.getElementById('ui-layer');
    if (!uiLayer) return;

    this.eventOverlay = document.createElement('div');
    this.eventOverlay.className = 'sea-event-overlay';
    this.eventOverlay.style.display = 'none';
    this.eventOverlay.innerHTML = `
      <div class="sea-event-panel">
        <div class="sea-event-header">
          <span class="sea-event-icon" id="sea-event-icon">✨</span>
          <h2 class="sea-event-title" id="sea-event-title">海域事件</h2>
          <span class="sea-event-rarity" id="sea-event-rarity">普通</span>
        </div>
        <div class="sea-event-description" id="sea-event-description">
          事件描述
        </div>
        <div class="sea-event-choices" id="sea-event-choices">
        </div>
        <div class="sea-event-result" id="sea-event-result" style="display: none;">
          <p id="sea-event-result-text"></p>
          <div class="sea-event-rewards" id="sea-event-rewards"></div>
          <button class="sea-event-close-btn" id="sea-event-close-btn">确定</button>
        </div>
      </div>
    `;

    uiLayer.appendChild(this.eventOverlay);

    const closeBtn = document.getElementById('sea-event-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeEvent());
    }
  }

  private onChapterStarted(chapter: any): void {
    this.currentChapterId = chapter?.id || null;
    this.eventTriggerTimer = 0;
    this.clearEventVisuals();

    const state = this.stateManager.getState();
    if (state.seaEvents?.pendingNextEventId) {
      const nextId = state.seaEvents.pendingNextEventId;
      this.stateManager.setState({
        seaEvents: { ...state.seaEvents, pendingNextEventId: null },
      });
      const nextEvent = getSeaEventById(nextId);
      if (nextEvent) {
        setTimeout(() => this.triggerEvent(nextEvent), 1500);
      }
    }
  }

  private onWeatherChanged(weather: WeatherType | null): void {
  }

  private onDayNightChanged(data: any): void {
  }

  private onStarDiscovered(starId: string): void {
  }

  private update(delta: number): void {
    if (!this.currentChapterId || this.activeEvent) return;

    this.eventTriggerTimer += delta;
    this.updateCooldowns(delta);

    if (this.eventTriggerTimer >= EVENT_TRIGGER_INTERVAL) {
      this.eventTriggerTimer = 0;
      if (Math.random() < EVENT_TRIGGER_CHANCE) {
        this.tryTriggerRandomEvent();
      }
    }
  }

  private updateCooldowns(delta: number): void {
    const state = this.stateManager.getState();
    if (!state.seaEvents) return;

    const cooldowns = { ...state.seaEvents.eventCooldowns };
    let hasChanges = false;

    Object.keys(cooldowns).forEach(eventId => {
      if (cooldowns[eventId] > 0) {
        cooldowns[eventId] = Math.max(0, cooldowns[eventId] - delta);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.stateManager.setState({
        seaEvents: {
          ...state.seaEvents,
          eventCooldowns: cooldowns,
        },
      });
    }
  }

  public tryTriggerRandomEvent(): SeaEventConfig | null {
    const availableEvents = this.getAvailableEvents();
    if (availableEvents.length === 0) return null;

    const weightedEvents = availableEvents.map(event => ({
      event,
      weight: RARITY_WEIGHTS[event.rarity] || 10,
    }));

    const totalWeight = weightedEvents.reduce((sum, we) => sum + we.weight, 0);
    let roll = Math.random() * totalWeight;
    let selectedEvent: SeaEventConfig | null = null;

    for (const we of weightedEvents) {
      roll -= we.weight;
      if (roll <= 0) {
        selectedEvent = we.event;
        break;
      }
    }

    if (selectedEvent) {
      this.triggerEvent(selectedEvent);
    }

    return selectedEvent;
  }

  private getAvailableEvents(): SeaEventConfig[] {
    const state = this.stateManager.getState();
    const chapter = this.chapterModule.getCurrentChapter();
    const currentTime = this.dayNightModule.getCycleInfo().timeOfDay;
    const activeWeather = state.activeWeather;
    const discoveredStars = state.discoveredStars.length;
    const flags = state.seaEvents?.flags || {};

    return seaEvents.filter(event => {
      if (event.minChapter && chapter && chapter.number < event.minChapter) {
        return false;
      }

      if (state.seaEvents?.eventCooldowns[event.id] && state.seaEvents.eventCooldowns[event.id] > 0) {
        return false;
      }

      const occurrences = state.seaEvents?.eventOccurrences[event.id] || 0;
      if (event.maxOccurrences && occurrences >= event.maxOccurrences) {
        return false;
      }

      if (event.triggerCondition) {
        if (event.triggerCondition.minStarsDiscovered && discoveredStars < event.triggerCondition.minStarsDiscovered) {
          return false;
        }

        if (event.triggerCondition.timeOfDay && currentTime !== event.triggerCondition.timeOfDay) {
          return false;
        }

        if (event.triggerCondition.weatherType) {
          const weatherType = activeWeather?.id || 'clear';
          if (event.triggerCondition.weatherType === 'any_adverse') {
            if (weatherType === 'clear' || weatherType === 'meteor') {
              return false;
            }
          } else if (event.triggerCondition.weatherType !== 'any') {
            if (!weatherType.includes(event.triggerCondition.weatherType)) {
              return false;
            }
          }
        }

        if (event.triggerCondition.specificRegion && state.currentPosition) {
          const { minX, maxX, minZ, maxZ } = event.triggerCondition.specificRegion;
          if (state.currentPosition.x < minX || state.currentPosition.x > maxX ||
              state.currentPosition.z < minZ || state.currentPosition.z > maxZ) {
            return false;
          }
        }

        if (event.triggerCondition.flag) {
          const flagKey = event.triggerCondition.flag;
          const requiredValue = event.triggerCondition.flagValue;
          if (requiredValue !== undefined) {
            if (flags[flagKey] !== requiredValue) return false;
          } else {
            if (!flags[flagKey]) return false;
          }
        }
      }

      return true;
    });
  }

  public triggerEvent(event: SeaEventConfig): void {
    const state = this.stateManager.getState();
    if (!state.seaEvents) return;

    this.activeEvent = event;

    const occurrences = { ...state.seaEvents.eventOccurrences };
    occurrences[event.id] = (occurrences[event.id] || 0) + 1;

    const cooldowns = { ...state.seaEvents.eventCooldowns };
    cooldowns[event.id] = event.cooldown || 60;

    const discoveredIds = [...state.seaEvents.discoveredEventIds];
    if (!discoveredIds.includes(event.id)) {
      discoveredIds.push(event.id);
    }

    this.stateManager.setState({
      seaEvents: {
        ...state.seaEvents,
        activeEventId: event.id,
        eventOccurrences: occurrences,
        eventCooldowns: cooldowns,
        discoveredEventIds: discoveredIds,
      },
    });

    this.showEventUI(event);
    this.createEventVisuals(event);
    this.addVoyageLogEntry(event);

    eventBus.emit('seaevent:triggered', event);
    eventBus.emit('sound:play', 'event_trigger');
  }

  private showEventUI(event: SeaEventConfig): void {
    if (!this.eventOverlay) return;

    const iconEl = document.getElementById('sea-event-icon');
    const titleEl = document.getElementById('sea-event-title');
    const rarityEl = document.getElementById('sea-event-rarity');
    const descEl = document.getElementById('sea-event-description');
    const choicesEl = document.getElementById('sea-event-choices');
    const resultEl = document.getElementById('sea-event-result');

    if (iconEl) iconEl.textContent = event.icon || '✨';
    if (titleEl) titleEl.textContent = event.name;
    if (rarityEl) {
      rarityEl.textContent = this.getRarityText(event.rarity);
      rarityEl.className = `sea-event-rarity rarity-${event.rarity}`;
    }
    if (descEl) descEl.textContent = event.description;
    if (resultEl) resultEl.style.display = 'none';

    if (choicesEl) {
      choicesEl.innerHTML = '';
      choicesEl.style.display = 'grid';

      event.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'sea-event-choice-btn';
        btn.innerHTML = `
          <span class="choice-text">${choice.text}</span>
          ${choice.description ? `<span class="choice-desc">${choice.description}</span>` : ''}
        `;

        const canChoose = this.canMakeChoice(choice);
        if (!canChoose) {
          btn.disabled = true;
          btn.classList.add('disabled');
        }

        btn.addEventListener('click', () => {
          if (canChoose) {
            this.makeChoice(choice);
          }
        });

        choicesEl.appendChild(btn);
      });
    }

    this.eventOverlay.style.display = 'flex';
  }

  private canMakeChoice(choice: SeaEventChoice): boolean {
    const state = this.stateManager.getState();
    const ship = state.ship;
    const crew = state.crew;
    const flags = state.seaEvents?.flags || {};

    if (choice.condition) {
      if (choice.condition.minGold && crew.gold < choice.condition.minGold) {
        return false;
      }
      if (choice.condition.minSupplies && ship.supplies < choice.condition.minSupplies) {
        return false;
      }
      if (choice.condition.minHealth && ship.health < choice.condition.minHealth) {
        return false;
      }
      if (choice.condition.requiredCrewRole) {
        const hasRole = crew.members.some(m => m.role === choice.condition!.requiredCrewRole && m.health > 0);
        if (!hasRole) return false;
      }
      if (choice.condition.minStarsDiscovered) {
        if (state.discoveredStars.length < choice.condition.minStarsDiscovered) {
          return false;
        }
      }
      if (choice.condition.flag) {
        const flagKey = choice.condition.flag;
        const requiredValue = choice.condition.flagValue;
        if (requiredValue !== undefined) {
          if (flags[flagKey] !== requiredValue) return false;
        } else {
          if (!flags[flagKey]) return false;
        }
      }
    }

    return true;
  }

  private makeChoice(choice: SeaEventChoice): void {
    const successRate = choice.successRate ?? 1;
    const isSuccess = Math.random() < successRate;

    let rewards: SeaEventReward[] = [];
    let penalties: { type: string; amount: number }[] = [];

    if (isSuccess) {
      rewards = choice.rewards || [];
      if (choice.penalties && choice.penalties.length > 0) {
        const halfPenalties = choice.penalties.map(p => ({ ...p, amount: Math.floor(p.amount * 0.3) }));
        penalties = halfPenalties;
      }
    } else {
      penalties = choice.penalties || [];
      rewards = [];
    }

    this.applyRewards(rewards);
    this.applyPenalties(penalties);

    if (choice.effects) {
      this.applyEffects(choice.effects);
    }

    this.setEventFlag(`${this.activeEvent?.id}_choice`, choice.id);
    this.setEventFlag(`${this.activeEvent?.id}_result`, isSuccess ? 'success' : 'fail');

    if (choice.nextEventId) {
      const state = this.stateManager.getState();
      this.stateManager.setState({
        seaEvents: {
          ...state.seaEvents!,
          pendingNextEventId: choice.nextEventId,
        },
      });
    }

    this.showResult(isSuccess, choice, rewards, penalties);
    this.recordEventHistory(choice, isSuccess ? 'success' : 'fail', rewards);

    eventBus.emit('seaevent:choice_made', {
      event: this.activeEvent,
      choice,
      success: isSuccess,
      rewards,
      penalties,
    });
  }

  private applyRewards(rewards: SeaEventReward[]): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const ship = { ...state.ship };

    rewards.forEach(reward => {
      switch (reward.type) {
        case 'gold':
          crew.gold += (reward.amount as number) || 0;
          break;
        case 'supplies':
          ship.supplies = Math.min(ship.maxSupplies, ship.supplies + ((reward.amount as number) || 0));
          break;
        case 'health':
          ship.health = Math.min(ship.maxHealth, ship.health + ((reward.amount as number) || 0));
          break;
        case 'exp':
          this.grantCrewExp((reward.amount as number) || 0);
          break;
        case 'codex_entry':
          if (this.activeEvent?.codexEntry) {
            this.unlockCodexEntry(this.activeEvent.codexEntry);
          }
          break;
        case 'chapter_unlock':
          if (typeof reward.value === 'string') {
            eventBus.emit('chapter:unlock', reward.value);
          }
          break;
      }
    });

    this.stateManager.updateCrew(crew);
    this.stateManager.updateShip(ship);
  }

  private applyPenalties(penalties: { type: string; amount: number }[]): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const ship = { ...state.ship };

    penalties.forEach(penalty => {
      switch (penalty.type) {
        case 'gold':
          crew.gold = Math.max(0, crew.gold - penalty.amount);
          break;
        case 'supplies':
          ship.supplies = Math.max(0, ship.supplies - penalty.amount);
          break;
        case 'health':
          this.shipDamageModule.applyDamage(penalty.amount, 'weather', '海域事件造成的损伤');
          return;
        case 'morale':
          break;
      }
    });

    this.stateManager.updateCrew(crew);
    this.stateManager.updateShip(ship);
  }

  private applyEffects(effects: any[]): void {
    effects.forEach(effect => {
      if (effect.type === 'flag') {
        this.setEventFlag(effect.key, effect.value);
      } else if (effect.type === 'chapter' && effect.key === 'unlock') {
        eventBus.emit('chapter:unlock', effect.value as string);
      } else if (effect.type === 'ship' || effect.type === 'crew' || effect.type === 'trade') {
        eventBus.emit('dialogue:effect', effect);
      }
    });
  }

  private setEventFlag(key: string, value: unknown): void {
    const state = this.stateManager.getState();
    if (!state.seaEvents) return;

    const flags = { ...state.seaEvents.flags };
    flags[key] = value;

    this.stateManager.setState({
      seaEvents: {
        ...state.seaEvents,
        flags,
      },
    });

    eventBus.emit('seaevent:flag_set', { key, value });
  }

  public getFlag(key: string): unknown {
    const state = this.stateManager.getState();
    return state.seaEvents?.flags?.[key];
  }

  private grantCrewExp(amount: number): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const expPerMember = Math.floor(amount / Math.max(1, crew.members.length));

    crew.members = crew.members.map(member => {
      const newExp = member.exp + expPerMember;
      let level = member.level;
      let exp = newExp;
      let maxExp = member.maxExp;

      while (exp >= maxExp) {
        exp -= maxExp;
        level++;
        maxExp = Math.floor(maxExp * 1.5);
      }

      return { ...member, exp, level, maxExp };
    });

    this.stateManager.updateCrew(crew);
  }

  private unlockCodexEntry(codexData: { id: string; category: CodexCategory; name: string; description: string }): void {
    const state = this.stateManager.getState();
    if (!state.codex) return;

    const entries = { ...state.codex.entries };
    if (entries[codexData.id] && entries[codexData.id].discovered) {
      return;
    }

    entries[codexData.id] = {
      id: codexData.id,
      category: codexData.category,
      name: codexData.name,
      description: codexData.description,
      discovered: true,
      discoveredAt: Date.now(),
      chapterId: this.currentChapterId || undefined,
    };

    const totalDiscovered = Object.values(entries).filter(e => e.discovered).length;

    this.stateManager.setState({
      codex: {
        ...state.codex,
        entries,
        totalDiscovered,
      },
    });

    eventBus.emit('codex:entry_discovered', codexData.id);
  }

  private showResult(
    isSuccess: boolean,
    choice: SeaEventChoice,
    rewards: SeaEventReward[],
    penalties: { type: string; amount: number }[]
  ): void {
    const resultEl = document.getElementById('sea-event-result');
    const resultTextEl = document.getElementById('sea-event-result-text');
    const rewardsEl = document.getElementById('sea-event-rewards');
    const choicesEl = document.getElementById('sea-event-choices');

    if (!resultEl || !resultTextEl || !rewardsEl || !choicesEl) return;

    choicesEl.style.display = 'none';
    resultEl.style.display = 'block';

    const text = isSuccess ? (choice.resultText || '成功了！') : (choice.failText || '失败了...');
    resultTextEl.textContent = text;
    resultTextEl.className = `sea-event-result-text ${isSuccess ? 'success' : 'fail'}`;

    rewardsEl.innerHTML = '';

    rewards.forEach(reward => {
      const item = document.createElement('div');
      item.className = 'reward-item reward-gain';
      const icon = this.getRewardIcon(reward.type);
      const label = this.getRewardLabel(reward.type, reward.amount as number);
      item.innerHTML = `${icon} +${label}`;
      rewardsEl.appendChild(item);
    });

    penalties.forEach(penalty => {
      const item = document.createElement('div');
      item.className = 'reward-item reward-loss';
      const icon = this.getPenaltyIcon(penalty.type);
      const label = this.getPenaltyLabel(penalty.type, penalty.amount);
      item.innerHTML = `${icon} -${label}`;
      rewardsEl.appendChild(item);
    });

    if (rewards.length === 0 && penalties.length === 0) {
      rewardsEl.style.display = 'none';
    } else {
      rewardsEl.style.display = 'flex';
    }
  }

  private getRewardIcon(type: string): string {
    const icons: Record<string, string> = {
      gold: '💰',
      supplies: '📦',
      health: '❤️',
      exp: '⭐',
      codex_entry: '📖',
      chapter_unlock: '🔓',
    };
    return icons[type] || '🎁';
  }

  private getRewardLabel(type: string, amount: number): string {
    const labels: Record<string, string> = {
      gold: '金币',
      supplies: '物资',
      health: '船体耐久',
      exp: '经验',
      codex_entry: '图鉴条目',
      chapter_unlock: '章节',
    };
    const label = labels[type] || type;
    return amount ? `${amount} ${label}` : label;
  }

  private getPenaltyIcon(type: string): string {
    const icons: Record<string, string> = {
      gold: '💰',
      supplies: '📦',
      health: '❤️',
      morale: '😔',
    };
    return icons[type] || '💔';
  }

  private getPenaltyLabel(type: string, amount: number): string {
    const labels: Record<string, string> = {
      gold: '金币',
      supplies: '物资',
      health: '船体耐久',
      morale: '士气',
    };
    const label = labels[type] || type;
    return `${amount} ${label}`;
  }

  private recordEventHistory(
    choice: SeaEventChoice,
    result: 'success' | 'fail' | 'neutral',
    rewards: SeaEventReward[]
  ): void {
    const state = this.stateManager.getState();
    if (!state.seaEvents || !this.activeEvent) return;

    const history = [...state.seaEvents.eventHistory];
    history.push({
      eventId: this.activeEvent.id,
      timestamp: Date.now(),
      choiceId: choice.id,
      result,
      rewards,
    });

    this.stateManager.setState({
      seaEvents: {
        ...state.seaEvents,
        eventHistory: history.slice(-100),
      },
    });
  }

  private addVoyageLogEntry(event: SeaEventConfig): void {
    eventBus.emit('voyagelog:add', {
      category: 'event',
      title: event.name,
      description: event.description,
      metadata: { eventType: event.type, rarity: event.rarity },
    });
  }

  private closeEvent(): void {
    if (this.eventOverlay) {
      this.eventOverlay.style.display = 'none';
    }

    const state = this.stateManager.getState();
    if (state.seaEvents) {
      this.stateManager.setState({
        seaEvents: {
          ...state.seaEvents,
          activeEventId: null,
        },
      });
    }

    const pendingNextId = state.seaEvents?.pendingNextEventId;

    this.activeEvent = null;
    this.clearEventVisuals();
    this.eventTriggerTimer = 0;

    eventBus.emit('seaevent:closed');

    if (pendingNextId) {
      this.stateManager.setState({
        seaEvents: {
          ...this.stateManager.getState().seaEvents!,
          pendingNextEventId: null,
        },
      });
      const nextEvent = getSeaEventById(pendingNextId);
      if (nextEvent) {
        setTimeout(() => this.triggerEvent(nextEvent), 1000);
      }
    }
  }

  private createEventVisuals(event: SeaEventConfig): void {
    this.clearEventVisuals();

    switch (event.type) {
      case 'meteor_shower':
        this.createMeteorShowerVisuals();
        break;
      case 'reef':
        this.createReefVisuals();
        break;
      case 'fog_zone':
        this.createFogZoneVisuals();
        break;
      case 'lost_ruins':
        this.createLostRuinsVisuals();
        break;
    }
  }

  private createMeteorShowerVisuals(): void {
    const meteorCount = 15;

    for (let i = 0; i < meteorCount; i++) {
      setTimeout(() => {
        this.spawnEventMeteor();
      }, i * 300);
    }
  }

  private spawnEventMeteor(): void {
    const geometry = new THREE.ConeGeometry(0.3, 3, 6);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffdd88,
      transparent: true,
      opacity: 1,
    });

    const meteor = new THREE.Mesh(geometry, material);

    const startX = MathUtils.randomRange(-60, 60);
    const startY = MathUtils.randomRange(50, 80);
    const startZ = MathUtils.randomRange(-60, 60);
    meteor.position.set(startX, startY, startZ);

    const target = new THREE.Vector3(
      MathUtils.randomRange(-80, 80),
      0,
      MathUtils.randomRange(-80, 80)
    );

    const direction = target.clone().sub(meteor.position).normalize();
    meteor.lookAt(target);
    meteor.rotateX(Math.PI / 2);

    const trailGeometry = new THREE.ConeGeometry(0.2, 8, 6);
    const trailMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa44,
      transparent: true,
      opacity: 0.4,
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.position.z = 4;
    meteor.add(trail);

    this.eventGroup.add(meteor);

    const speed = 40;
    const startTime = Date.now();
    const duration = 2500;

    const animateMeteor = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        meteor.position.add(direction.clone().multiplyScalar(speed * 0.016));
        material.opacity = 1 - progress;
        trailMaterial.opacity = 0.4 * (1 - progress);
        requestAnimationFrame(animateMeteor);
      } else {
        meteor.geometry.dispose();
        material.dispose();
        trail.geometry.dispose();
        trail.material.dispose();
        this.eventGroup.remove(meteor);
      }
    };

    animateMeteor();
  }

  private createReefVisuals(): void {
    const reefCount = 8;

    for (let i = 0; i < reefCount; i++) {
      const geometry = new THREE.ConeGeometry(
        MathUtils.randomRange(2, 5),
        MathUtils.randomRange(3, 8),
        6
      );
      const material = new THREE.MeshLambertMaterial({
        color: 0x3d3d3d,
      });

      const reef = new THREE.Mesh(geometry, material);
      reef.position.set(
        MathUtils.randomRange(-40, 40),
        -1,
        MathUtils.randomRange(-40, 40)
      );
      reef.rotation.x = Math.PI;
      reef.userData = { type: 'reef' };

      this.eventGroup.add(reef);
    }
  }

  private createFogZoneVisuals(): void {
    const fogParticles = 30;

    for (let i = 0; i < fogParticles; i++) {
      const geometry = new THREE.SphereGeometry(MathUtils.randomRange(3, 8), 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0xaaaaaa,
        transparent: true,
        opacity: 0.15,
      });

      const fog = new THREE.Mesh(geometry, material);
      fog.position.set(
        MathUtils.randomRange(-50, 50),
        MathUtils.randomRange(1, 10),
        MathUtils.randomRange(-50, 50)
      );
      fog.userData = {
        type: 'fog',
        phase: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.3,
      };

      this.eventGroup.add(fog);
    }
  }

  private createLostRuinsVisuals(): void {
    const pillarCount = 4;

    for (let i = 0; i < pillarCount; i++) {
      const angle = (i / pillarCount) * Math.PI * 2;
      const radius = 12;

      const geometry = new THREE.CylinderGeometry(1, 1.2, 15, 8);
      const material = new THREE.MeshLambertMaterial({
        color: 0x8b7355,
      });

      const pillar = new THREE.Mesh(geometry, material);
      pillar.position.set(
        Math.cos(angle) * radius,
        6,
        Math.sin(angle) * radius
      );

      const capGeometry = new THREE.ConeGeometry(1.5, 2, 8);
      const cap = new THREE.Mesh(capGeometry, material);
      cap.position.y = 8.5;
      pillar.add(cap);

      this.eventGroup.add(pillar);
    }

    const starGeometry = new THREE.OctahedronGeometry(3, 0);
    const starMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffaa,
      transparent: true,
      opacity: 0.8,
    });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    star.position.set(0, 12, 0);
    star.userData = { type: 'ruin_star', phase: 0 };
    this.eventGroup.add(star);
  }

  private clearEventVisuals(): void {
    while (this.eventGroup.children.length > 0) {
      const child = this.eventGroup.children[0];
      this.eventGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }

  private getRarityText(rarity: SeaEventRarity): string {
    const texts: Record<SeaEventRarity, string> = {
      common: '普通',
      uncommon: '稀有',
      rare: '珍贵',
      epic: '史诗',
      legendary: '传说',
    };
    return texts[rarity] || '普通';
  }

  public getActiveEvent(): SeaEventConfig | null {
    return this.activeEvent;
  }

  public getEventState(): SeaEventState | undefined {
    const state = this.stateManager.getState();
    return state.seaEvents ? { ...state.seaEvents } : undefined;
  }

  public getEventHistory(): SeaEventState['eventHistory'] {
    return this.stateManager.getState().seaEvents?.eventHistory || [];
  }

  public getDiscoveredEvents(): string[] {
    return this.stateManager.getState().seaEvents?.discoveredEventIds || [];
  }

  public triggerManualEvent(eventId: string): boolean {
    const event = getSeaEventById(eventId);
    if (!event) return false;

    this.triggerEvent(event);
    return true;
  }

  public resetState(): void {
    this.activeEvent = null;
    this.currentChapterId = null;
    this.eventTriggerTimer = 0;
    this.clearEventVisuals();
    if (this.eventOverlay) {
      this.eventOverlay.style.display = 'none';
    }

    this.stateManager.setState({
      seaEvents: {
        ...DEFAULT_SEA_EVENT_STATE,
        eventHistory: [],
        eventCooldowns: {},
        eventOccurrences: {},
        discoveredEventIds: [],
        flags: {},
        pendingNextEventId: null,
      },
    });
  }

  public getSerializableState(): SeaEventState | undefined {
    const state = this.stateManager.getState();
    return state.seaEvents ? { ...state.seaEvents } : undefined;
  }

  public loadSerializableState(eventState: SeaEventState): void {
    const normalizedState: SeaEventState = {
      ...eventState,
      flags: eventState.flags || {},
      pendingNextEventId: eventState.pendingNextEventId || null,
    };
    this.stateManager.setState({ seaEvents: normalizedState });

    const state = this.stateManager.getState();
    if (state.currentChapterId) {
      this.currentChapterId = state.currentChapterId;
    }

    if (normalizedState.activeEventId) {
      const event = getSeaEventById(normalizedState.activeEventId);
      if (event) {
        this.activeEvent = event;
      } else {
        this.stateManager.setState({
          seaEvents: { ...normalizedState, activeEventId: null },
        });
      }
    }

    Object.entries(normalizedState.flags).forEach(([key, value]) => {
      eventBus.emit('seaevent:flag_set', { key, value });
    });
  }

  public dispose(): void {
    this.clearAllEventListeners();
    this.clearEventVisuals();
    this.initialized = false;

    if (this.eventOverlay) {
      this.eventOverlay.remove();
      this.eventOverlay = null;
    }

    if (this.eventGroup) {
      this.engine.scene.remove(this.eventGroup);
    }
  }

  public setChapterModule(module: ChapterModule): void {
    this.chapterModule = module;
  }
}
