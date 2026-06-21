import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { MathUtils } from '../utils/MathUtils';
import {
  VoyageEventConfig,
  VoyageEventState,
  VoyageEventTriggerContext,
  VoyageEventChoice,
  VoyageEventEffect,
  VoyageEventType,
  RouteBranchType,
  WeatherType,
  WeatherCondition,
  TimeOfDay,
  Objective,
  RewardItem,
  RewardGrantedEvent,
} from '../types';
import {
  voyageEvents,
  getVoyageEventById,
  getVoyageEventsByChapter,
} from '../data/voyageEvents';
import { WeatherModule } from './WeatherModule';
import { DayNightCycleModule } from './DayNightCycleModule';
import { ChapterModule } from './ChapterModule';
import { TaskModule } from './TaskModule';

const DEFAULT_VOYAGE_EVENT_STATE: VoyageEventState = {
  activeEventId: null,
  activeEventStartTime: null,
  isPausedForEvent: false,
  eventHistory: [],
  cooldowns: {},
  occurrencesPerRoute: {},
  flags: {},
};

const EVENT_TRIGGER_CHECK_INTERVAL = 5;
const BASE_TRIGGER_CHANCE_PER_CHECK = 0.18;

export class VoyageEventModule {
  private static instance: VoyageEventModule;
  private stateManager: GameStateManager;
  private weatherModule: WeatherModule;
  private dayNightModule: DayNightCycleModule;
  private chapterModule: ChapterModule;
  private taskModule: TaskModule;

  private eventOverlay: HTMLElement | null = null;
  private eventPanel: HTMLElement | null = null;

  private activeEvent: VoyageEventConfig | null = null;
  private activeContext: VoyageEventTriggerContext | null = null;
  private lastTriggerCheck: number = 0;
  private lastProgressSnapshot: number = 0;
  private currentChapterId: string | null = null;
  private autoResolveTimer: number | null = null;
  private temporarySpeedModifiers: Map<string, { modifier: number; expiresAt: number }> = new Map();
  private temporaryProgressModifiers: number = 0;
  private starmapDistortUntil: number = 0;

  private eventHandlerRefs: Array<{ event: string; handler: (...args: any[]) => void }> = [];
  private initialized: boolean = false;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.weatherModule = new WeatherModule();
    this.dayNightModule = DayNightCycleModule.getInstance();
    this.chapterModule = new ChapterModule();
    this.taskModule = TaskModule.getInstance();

    this.createEventUI();
  }

  public static getInstance(): VoyageEventModule {
    if (!VoyageEventModule.instance) {
      VoyageEventModule.instance = new VoyageEventModule();
    }
    return VoyageEventModule.instance;
  }

  public setChapterModule(module: ChapterModule): void {
    this.chapterModule = module;
  }

  public initialize(): void {
    if (this.initialized) return;
    this.ensureStateExists();
    this.setupEventListeners();
    this.initialized = true;
  }

  private ensureStateExists(): void {
    const state = this.stateManager.getState();
    if (!state.voyageEvents) {
      this.stateManager.setState({
        voyageEvents: { ...DEFAULT_VOYAGE_EVENT_STATE },
      });
    }
  }

  private setupEventListeners(): void {
    this.onceOn('chapter:started', this.onChapterStarted.bind(this));
    this.onceOn('route:started', this.onRouteStarted.bind(this));
    this.onceOn('route:completed', this.onRouteCompleted.bind(this));
    this.onceOn('route:stopped', this.onRouteStopped.bind(this));
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
    this.eventOverlay.className = 'voyage-event-overlay';
    this.eventOverlay.style.display = 'none';
    this.eventOverlay.innerHTML = `
      <div class="voyage-event-panel">
        <div class="voyage-event-header">
          <span class="voyage-event-icon" id="voyage-event-icon">✨</span>
          <div class="voyage-event-title-wrap">
            <h2 class="voyage-event-title" id="voyage-event-title">航段事件</h2>
            <span class="voyage-event-type" id="voyage-event-type">提示</span>
          </div>
          <span class="voyage-event-rarity" id="voyage-event-rarity">普通</span>
        </div>
        <div class="voyage-event-narrative" id="voyage-event-narrative"></div>
        <div class="voyage-event-description" id="voyage-event-description">
          事件描述
        </div>
        <div class="voyage-event-choices" id="voyage-event-choices"></div>
        <div class="voyage-event-result" id="voyage-event-result" style="display: none;">
          <p id="voyage-event-result-text"></p>
          <div class="voyage-event-rewards" id="voyage-event-rewards"></div>
          <button class="voyage-event-continue-btn" id="voyage-event-continue-btn">
            继续航行
          </button>
        </div>
        <div class="voyage-event-progress-bar">
          <div class="voyage-event-progress-fill" id="voyage-event-progress-fill"></div>
        </div>
      </div>
    `;

    uiLayer.appendChild(this.eventOverlay);

    const continueBtn = document.getElementById('voyage-event-continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => this.closeEvent());
    }
  }

  private onChapterStarted(chapter: any): void {
    this.currentChapterId = chapter?.id || null;
    this.clearAutoResolveTimer();
    this.resetPerChapterState();
  }

  private onRouteStarted(routeId: string): void {
    this.lastProgressSnapshot = 0;
    this.lastTriggerCheck = 0;
  }

  private onRouteCompleted(routeId: string): void {
    this.clearAutoResolveTimer();
    if (this.activeEvent && this.activeEvent.allowContinueVoyage) {
      this.closeEvent();
    }
  }

  private onRouteStopped(): void {
    this.clearAutoResolveTimer();
  }

  private resetPerChapterState(): void {
    const state = this.getEventState();
    state.occurrencesPerRoute = {};
    this.updateEventState(state);
  }

  private update(delta: number): void {
    if (!this.currentChapterId) return;

    this.updateCooldowns(delta);
    this.cleanupExpiredModifiers();

    const gameState = this.stateManager.getState();
    if (!gameState.currentRoute || this.activeEvent) return;

    const currentProgress = gameState.currentRouteProgress;
    const progressDelta = currentProgress - this.lastProgressSnapshot;

    this.lastTriggerCheck += delta;

    if (this.lastTriggerCheck >= EVENT_TRIGGER_CHECK_INTERVAL && progressDelta > 0) {
      this.lastTriggerCheck = 0;
      this.lastProgressSnapshot = currentProgress;
      this.attemptTriggerEvent(currentProgress);
    }
  }

  private updateCooldowns(delta: number): void {
    const state = this.getEventState();
    let hasChanges = false;

    Object.keys(state.cooldowns).forEach(eventId => {
      if (state.cooldowns[eventId] > 0) {
        state.cooldowns[eventId] = Math.max(0, state.cooldowns[eventId] - delta);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.updateEventState(state);
    }
  }

  private cleanupExpiredModifiers(): void {
    const now = Date.now();
    let hasChanges = false;

    this.temporarySpeedModifiers.forEach((value, key) => {
      if (now > value.expiresAt) {
        this.temporarySpeedModifiers.delete(key);
        hasChanges = true;
      }
    });
  }

  private getEventState(): VoyageEventState {
    const state = this.stateManager.getState();
    return state.voyageEvents
      ? {
          ...state.voyageEvents,
          eventHistory: [...state.voyageEvents.eventHistory],
          cooldowns: { ...state.voyageEvents.cooldowns },
          occurrencesPerRoute: this.deepCopyOccurrences(state.voyageEvents.occurrencesPerRoute),
          flags: { ...state.voyageEvents.flags },
        }
      : { ...DEFAULT_VOYAGE_EVENT_STATE };
  }

  private deepCopyOccurrences(
    obj: Record<string, Record<string, number>>
  ): Record<string, Record<string, number>> {
    const result: Record<string, Record<string, number>> = {};
    Object.entries(obj).forEach(([k, v]) => {
      result[k] = { ...v };
    });
    return result;
  }

  private updateEventState(state: VoyageEventState): void {
    this.stateManager.setState({ voyageEvents: state });
  }

  private attemptTriggerEvent(currentProgress: number): void {
    const gameState = this.stateManager.getState();
    const routeId = gameState.currentRoute!;
    const route = this.findRouteById(routeId);
    if (!route) return;

    const context: VoyageEventTriggerContext = {
      routeId,
      routeType: (route.branchType as RouteBranchType) || 'main',
      progress: currentProgress,
      currentPointIndex: this.getCurrentPointIndex(),
      currentWeather: gameState.activeWeather,
      currentTimeOfDay: this.dayNightModule.getCycleInfo().timeOfDay,
      starsDiscoveredInChapter: this.getStarsDiscoveredInChapter(),
    };

    const availableEvents = this.getAvailableEvents(context);
    if (availableEvents.length === 0) return;

    const weightedEvents = availableEvents.map(event => ({
      event,
      weight: (event.trigger.probabilityWeight || 10) * this.getRarityWeight(event.rarity),
    }));

    const totalWeight = weightedEvents.reduce((sum, we) => sum + we.weight, 0);
    const chanceRoll = Math.random();

    if (chanceRoll > BASE_TRIGGER_CHANCE_PER_CHECK) return;

    let roll = Math.random() * totalWeight;
    let selectedEvent: VoyageEventConfig | null = null;

    for (const we of weightedEvents) {
      roll -= we.weight;
      if (roll <= 0) {
        selectedEvent = we.event;
        break;
      }
    }

    if (selectedEvent) {
      this.triggerEvent(selectedEvent, context);
    }
  }

  private getRarityWeight(rarity: string): number {
    const weights: Record<string, number> = {
      common: 50,
      uncommon: 30,
      rare: 15,
      epic: 4,
      legendary: 1,
    };
    return weights[rarity] || 10;
  }

  private getAvailableEvents(context: VoyageEventTriggerContext): VoyageEventConfig[] {
    const state = this.getEventState();
    const chapter = this.chapterModule.getCurrentChapter();
    const flags = state.flags;
    const routeOccurrences = state.occurrencesPerRoute[context.routeId] || {};

    let candidateEvents = this.currentChapterId
      ? getVoyageEventsByChapter(this.currentChapterId)
      : [...voyageEvents];

    candidateEvents = candidateEvents.filter(event => {
      if (event.minChapter && chapter && chapter.number < event.minChapter) {
        return false;
      }

      if (state.cooldowns[event.id] && state.cooldowns[event.id] > 0) {
        return false;
      }

      if (event.trigger.minProgress !== undefined && context.progress < event.trigger.minProgress) {
        return false;
      }

      if (event.trigger.maxProgress !== undefined && context.progress > event.trigger.maxProgress) {
        return false;
      }

      if (event.trigger.requireMoving && !this.isShipMoving()) {
        return false;
      }

      if (event.trigger.routeTypes && !event.trigger.routeTypes.includes(context.routeType)) {
        return false;
      }

      if (event.trigger.timeOfDayCondition && context.currentTimeOfDay !== event.trigger.timeOfDayCondition) {
        return false;
      }

      if (event.trigger.weatherCondition) {
        if (!this.matchWeatherCondition(event.trigger.weatherCondition, context.currentWeather)) {
          return false;
        }
      }

      if (event.trigger.minStarsDiscovered !== undefined) {
        if (context.starsDiscoveredInChapter < event.trigger.minStarsDiscovered) {
          return false;
        }
      }

      if (event.trigger.flagCondition) {
        const { key, value } = event.trigger.flagCondition;
        if (value !== undefined) {
          if (flags[key] !== value) return false;
        } else {
          if (!flags[key]) return false;
        }
      }

      if (event.trigger.onlyOncePerRoute) {
        const occurrences = routeOccurrences[event.id] || 0;
        if (occurrences > 0) return false;
      }

      if (event.trigger.maxOccurrences !== undefined) {
        const totalOccurrences = state.eventHistory.filter(h => h.eventId === event.id).length;
        if (totalOccurrences >= event.trigger.maxOccurrences) return false;
      }

      return true;
    });

    return candidateEvents;
  }

  private matchWeatherCondition(condition: WeatherCondition, weather: WeatherType | null): boolean {
    const weatherTypeId = weather ? this.extractWeatherTypeId(weather.id) : 'clear';

    switch (condition) {
      case 'any':
        return true;
      case 'any_adverse':
        return weatherTypeId === 'storm' || weatherTypeId === 'fog';
      case 'clear':
        return weatherTypeId === 'clear' || weatherTypeId === 'meteor';
      default:
        return weatherTypeId === condition;
    }
  }

  private extractWeatherTypeId(id: string): string {
    if (id.includes('storm')) return 'storm';
    if (id.includes('fog')) return 'fog';
    if (id.includes('meteor')) return 'meteor';
    return 'clear';
  }

  private isShipMoving(): boolean {
    return !!this.stateManager.getState().currentRoute;
  }

  private findRouteById(routeId: string): any {
    const chapter = this.chapterModule.getCurrentChapter();
    return chapter?.routes?.find((r: any) => r.id === routeId) || null;
  }

  private getCurrentPointIndex(): number {
    const state = this.stateManager.getState();
    if (!this.currentChapterId || !state.currentRoute) return 0;
    const progress = this.stateManager.getBranchRouteProgress(
      this.currentChapterId,
      state.currentRoute
    );
    return progress?.currentPointIndex || 0;
  }

  private getStarsDiscoveredInChapter(): number {
    const state = this.stateManager.getState();
    const chapter = this.chapterModule.getCurrentChapter();
    if (!chapter) return state.discoveredStars.length;

    const normalStarIds = chapter.stars
      .filter(s => s.isClickable && !s.hidden)
      .map(s => s.id);
    return state.discoveredStars.filter(id => normalStarIds.includes(id)).length;
  }

  public triggerEvent(event: VoyageEventConfig, context: VoyageEventTriggerContext): void {
    const state = this.getEventState();

    this.activeEvent = event;
    this.activeContext = context;

    state.activeEventId = event.id;
    state.activeEventStartTime = Date.now();
    state.isPausedForEvent = true;

    state.eventHistory.push({
      eventId: event.id,
      routeId: context.routeId,
      progressAtTrigger: context.progress,
      timestamp: Date.now(),
    });

    state.cooldowns[event.id] = event.trigger.cooldown || 60;

    if (!state.occurrencesPerRoute[context.routeId]) {
      state.occurrencesPerRoute[context.routeId] = {};
    }
    state.occurrencesPerRoute[context.routeId][event.id] =
      (state.occurrencesPerRoute[context.routeId][event.id] || 0) + 1;

    this.updateEventState(state);

    this.showEventUI(event);
    this.scheduleAutoResolve(event);

    eventBus.emit('voyageevent:triggered', { event, context });
    eventBus.emit('sound:play', 'event_trigger');
  }

  private showEventUI(event: VoyageEventConfig): void {
    if (!this.eventOverlay) return;

    const iconEl = document.getElementById('voyage-event-icon');
    const titleEl = document.getElementById('voyage-event-title');
    const typeEl = document.getElementById('voyage-event-type');
    const rarityEl = document.getElementById('voyage-event-rarity');
    const narrativeEl = document.getElementById('voyage-event-narrative');
    const descEl = document.getElementById('voyage-event-description');
    const choicesEl = document.getElementById('voyage-event-choices');
    const resultEl = document.getElementById('voyage-event-result');

    if (iconEl) iconEl.textContent = event.icon || '✨';
    if (titleEl) titleEl.textContent = event.name;
    if (typeEl) {
      typeEl.textContent = this.getEventTypeText(event.type);
      typeEl.className = `voyage-event-type type-${event.type}`;
    }
    if (rarityEl) {
      rarityEl.textContent = this.getRarityText(event.rarity);
      rarityEl.className = `voyage-event-rarity rarity-${event.rarity}`;
    }
    if (narrativeEl) {
      narrativeEl.textContent = event.narrativeText?.intro || '';
      narrativeEl.style.display = event.narrativeText?.intro ? 'block' : 'none';
    }
    if (descEl) descEl.textContent = event.description;
    if (resultEl) resultEl.style.display = 'none';

    if (choicesEl) {
      choicesEl.innerHTML = '';
      choicesEl.style.display = 'grid';

      event.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'voyage-event-choice-btn';
        btn.innerHTML = `
          <span class="choice-icon">${choice.icon || ''}</span>
          <span class="choice-body">
            <span class="choice-text">${choice.text}</span>
            ${choice.description ? `<span class="choice-desc">${choice.description}</span>` : ''}
          </span>
        `;

        btn.addEventListener('click', () => this.makeChoice(choice));
        choicesEl.appendChild(btn);
      });
    }

    this.eventOverlay.style.display = 'flex';
  }

  private scheduleAutoResolve(event: VoyageEventConfig): void {
    this.clearAutoResolveTimer();
    if (!event.autoResolveAfterMs) return;

    this.updateAutoResolveProgress(event.autoResolveAfterMs);

    this.autoResolveTimer = window.setTimeout(() => {
      if (this.activeEvent) {
        const defaultChoice = this.activeEvent.choices.find(c => c.action === 'accept')
          || this.activeEvent.choices[0];
        if (defaultChoice) {
          this.makeChoice(defaultChoice);
        }
      }
    }, event.autoResolveAfterMs);
  }

  private updateAutoResolveProgress(totalMs: number): void {
    const progressFill = document.getElementById('voyage-event-progress-fill');
    if (!progressFill) return;

    const startTime = Date.now();
    const updateProgress = () => {
      if (!this.activeEvent) {
        progressFill.style.width = '0%';
        return;
      }
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / totalMs);
      progressFill.style.width = `${progress * 100}%`;

      if (progress < 1) {
        requestAnimationFrame(updateProgress);
      }
    };
    requestAnimationFrame(updateProgress);
  }

  private clearAutoResolveTimer(): void {
    if (this.autoResolveTimer !== null) {
      clearTimeout(this.autoResolveTimer);
      this.autoResolveTimer = null;
    }
    const progressFill = document.getElementById('voyage-event-progress-fill');
    if (progressFill) progressFill.style.width = '0%';
  }

  private makeChoice(choice: VoyageEventChoice): void {
    if (!this.activeEvent) return;

    this.clearAutoResolveTimer();

    const event = this.activeEvent;
    const isInvestigate = choice.action === 'investigate';
    const isAccept = choice.action === 'accept';
    const isDecline = choice.action === 'decline';

    const successRate = isInvestigate ? 0.65 : isAccept ? 0.9 : 1;
    const isSuccess = isDecline ? true : Math.random() < successRate;

    let effectsToApply: VoyageEventEffect[] = [...(event.effects || [])];
    const outcomeEffects = isSuccess
      ? (event.successEffects || [])
      : (event.failEffects || []);
    effectsToApply = effectsToApply.concat(outcomeEffects);

    const rewardsGranted = this.applyEffects(effectsToApply);

    let narrativeText = '';
    if (event.narrativeText) {
      if (isAccept && event.narrativeText.accept) {
        narrativeText = event.narrativeText.accept;
      } else if (isDecline && event.narrativeText.decline) {
        narrativeText = event.narrativeText.decline;
      }
      if (isSuccess && event.narrativeText.success) {
        narrativeText = event.narrativeText.success;
      } else if (!isSuccess && event.narrativeText.fail) {
        narrativeText = event.narrativeText.fail;
      }
    }

    this.recordChoice(choice, isSuccess ? 'success' : 'fail');

    this.showResult(narrativeText, choice, isSuccess, rewardsGranted);

    eventBus.emit('voyageevent:choice_made', {
      event,
      choice,
      success: isSuccess,
      effects: effectsToApply,
      rewards: rewardsGranted,
    });
  }

  private applyEffects(effects: VoyageEventEffect[]): RewardItem[] {
    const rewards: RewardItem[] = [];
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const ship = { ...state.ship };

    effects.forEach(effect => {
      switch (effect.type) {
        case 'trigger_weather':
          if (effect.weatherType) {
            this.weatherModule.triggerManualWeather(
              effect.weatherType,
              effect.weatherIntensity || 0.5,
              effect.weatherDuration || 30
            );
          }
          break;

        case 'modify_weather':
          break;

        case 'reveal_stars':
          eventBus.emit('voyageevent:reveal_stars', {
            count: effect.revealCount || 2,
            permanent: effect.permanentReveal || false,
          });
          break;

        case 'highlight_constellation':
          eventBus.emit('voyageevent:highlight_constellation');
          break;

        case 'starmap_distort':
          this.starmapDistortUntil = Date.now() + (effect.durationMs || 30000);
          eventBus.emit('voyageevent:starmap_distort', { duration: effect.durationMs });
          break;

        case 'starmap_clarify':
          this.starmapDistortUntil = 0;
          eventBus.emit('voyageevent:starmap_clarify');
          break;

        case 'add_objective':
          if (effect.objective) {
            this.addBonusObjective(effect.objective);
          }
          break;

        case 'grant_reward':
          if (effect.rewardItems) {
            effect.rewardItems.forEach(item => {
              switch (item.type) {
                case 'gold':
                  crew.gold += item.amount;
                  rewards.push({ type: 'gold', amount: item.amount });
                  break;
                case 'supplies':
                  ship.supplies = Math.min(ship.maxSupplies, ship.supplies + item.amount);
                  rewards.push({ type: 'supplies', amount: item.amount });
                  break;
                case 'exp':
                  rewards.push({ type: 'exp', amount: item.amount });
                  this.grantCrewExp(item.amount);
                  break;
              }
            });
          }
          break;

        case 'modify_speed':
          if (effect.speedModifier) {
            const key = `speed_${Date.now()}_${Math.random()}`;
            this.temporarySpeedModifiers.set(key, {
              modifier: effect.speedModifier,
              expiresAt: Date.now() + (effect.durationMs || 30000),
            });
          }
          break;

        case 'modify_progress':
          if (effect.progressDelta) {
            this.temporaryProgressModifiers += effect.progressDelta;
            this.applyProgressDelta(effect.progressDelta);
          }
          break;

        case 'unlock_route':
          eventBus.emit('voyageevent:unlock_route');
          break;

        case 'show_hint':
          if (effect.hintText) {
            const msg = effect.hintIcon ? `${effect.hintIcon} ${effect.hintText}` : effect.hintText;
            setTimeout(() => {
              eventBus.emit('toast:show', {
                message: msg,
                duration: effect.durationMs || 5000,
              });
            }, 500);
          }
          break;
      }
    });

    this.stateManager.updateCrew(crew);
    this.stateManager.updateShip(ship);

    if (rewards.length > 0 && this.activeEvent) {
      const event: RewardGrantedEvent = {
        source: 'sea_event',
        sourceId: this.activeEvent.id,
        sourceName: this.activeEvent.name,
        rewards,
        title: `航段事件：${this.activeEvent.name}`,
        priority: 'normal',
        timestamp: Date.now(),
      };
      eventBus.emit('reward:granted', event);
    }

    return rewards;
  }

  private grantCrewExp(amount: number): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const expPerMember = Math.floor(amount / Math.max(1, crew.members.length));

    crew.members = crew.members.map(member => {
      let newExp = member.exp + expPerMember;
      let newLevel = member.level;
      let newMaxExp = member.maxExp;

      while (newExp >= newMaxExp) {
        newExp -= newMaxExp;
        newLevel++;
        newMaxExp = Math.floor(newMaxExp * 1.5);
      }

      return { ...member, exp: newExp, level: newLevel, maxExp: newMaxExp };
    });

    this.stateManager.updateCrew(crew);
  }

  private addBonusObjective(objectiveConfig: {
    id: string;
    type: 'visit' | 'discover_star' | 'discover_constellation' | 'survive_weather';
    targetId: string;
    description: string;
    total: number;
    rewards?: Array<{ type: 'gold' | 'supplies' | 'exp'; value: number }>;
  }): void {
    const typeMap: Record<string, import('../types').TaskType> = {
      'visit': 'visit_points',
      'discover_star': 'discover_stars',
      'discover_constellation': 'discover_constellation',
      'survive_weather': 'survive_weather',
    };

    const taskType = typeMap[objectiveConfig.type] || 'visit_points';

    const task: import('../types').DynamicTask = {
      id: `voyage_${objectiveConfig.id}_${Date.now()}`,
      name: `【追加目标】${objectiveConfig.description.slice(0, 12)}`,
      description: objectiveConfig.description,
      type: taskType,
      target: objectiveConfig.targetId,
      total: objectiveConfig.total || 1,
      trigger: {
        source: 'chapter_progress',
        chapterProgress: { minObjectivesCompleted: 0 },
        cooldown: 0,
        maxOccurrences: 1,
      },
      rewards: (objectiveConfig.rewards || []).map(r => ({
        type: r.type as 'gold' | 'supplies' | 'exp',
        value: r.value,
      })),
      hints: [
        {
          text: `🎯 追加目标：${objectiveConfig.description}`,
          icon: '📌',
          duration: 6000,
        },
      ],
      priority: 'high',
      repeatable: false,
      chapterId: this.currentChapterId || undefined,
    };

    this.taskModule.addEventTask(task);
  }

  private applyProgressDelta(delta: number): void {
    const state = this.stateManager.getState();
    if (!state.currentRoute) return;

    const newProgress = Math.max(0, Math.min(0.98, state.currentRouteProgress + delta));

    this.stateManager.setState({ currentRouteProgress: newProgress });

    if (this.currentChapterId && state.currentRoute) {
      this.stateManager.updateBranchRouteProgress(
        this.currentChapterId,
        state.currentRoute,
        { overallProgress: newProgress }
      );
    }

    eventBus.emit('voyageevent:progress_modified', { delta, newProgress });
  }

  private recordChoice(choice: VoyageEventChoice, result: 'success' | 'fail' | 'neutral'): void {
    const state = this.getEventState();
    const lastEntry = state.eventHistory[state.eventHistory.length - 1];

    if (lastEntry && lastEntry.eventId === this.activeEvent?.id) {
      lastEntry.choiceId = choice.id;
    }

    if (choice.action === 'investigate') {
      state.flags[`${this.activeEvent?.id}_investigated`] = true;
    }

    this.updateEventState(state);
  }

  private showResult(
    narrativeText: string,
    choice: VoyageEventChoice,
    isSuccess: boolean,
    rewards: RewardItem[]
  ): void {
    const resultEl = document.getElementById('voyage-event-result');
    const resultTextEl = document.getElementById('voyage-event-result-text');
    const rewardsEl = document.getElementById('voyage-event-rewards');
    const choicesEl = document.getElementById('voyage-event-choices');
    const narrativeEl = document.getElementById('voyage-event-narrative');

    if (!resultEl || !resultTextEl || !rewardsEl || !choicesEl) return;

    choicesEl.style.display = 'none';
    resultEl.style.display = 'block';

    let fullText = '';
    if (narrativeText) {
      fullText = narrativeText;
    } else {
      fullText = isSuccess ? '操作完成！' : '似乎出现了一些意外……';
    }
    resultTextEl.textContent = fullText;
    resultTextEl.className = `voyage-event-result-text ${isSuccess ? 'success' : 'fail'}`;

    if (narrativeEl && narrativeText) {
      narrativeEl.style.display = 'none';
    }

    rewardsEl.innerHTML = '';
    rewards.forEach(reward => {
      const item = document.createElement('div');
      item.className = 'reward-item reward-gain';
      const icon = this.getRewardIcon(reward.type);
      const label = this.getRewardLabel(reward.type, reward.amount);
      item.innerHTML = `${icon} +${label}`;
      rewardsEl.appendChild(item);
    });

    if (rewards.length === 0) {
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

  private getEventTypeText(type: VoyageEventType): string {
    const texts: Record<VoyageEventType, string> = {
      weather_sudden: '🌤️ 天气突变',
      starmap_anomaly: '🌌 星图异常',
      objective_bonus: '🎯 目标追加',
      navigational_hint: '🧭 提示交互',
    };
    return texts[type] || '未知事件';
  }

  private getRarityText(rarity: string): string {
    const texts: Record<string, string> = {
      common: '普通',
      uncommon: '稀有',
      rare: '珍贵',
      epic: '史诗',
      legendary: '传说',
    };
    return texts[rarity] || '普通';
  }

  public closeEvent(): void {
    this.clearAutoResolveTimer();

    if (this.eventOverlay) {
      this.eventOverlay.style.display = 'none';
    }

    const state = this.getEventState();
    state.activeEventId = null;
    state.activeEventStartTime = null;
    state.isPausedForEvent = false;
    this.updateEventState(state);

    this.activeEvent = null;
    this.activeContext = null;

    eventBus.emit('voyageevent:closed');
  }

  public getActiveEvent(): VoyageEventConfig | null {
    return this.activeEvent;
  }

  public getCombinedSpeedModifier(): number {
    let modifier = 1;
    const now = Date.now();
    this.temporarySpeedModifiers.forEach((value) => {
      if (now < value.expiresAt) {
        modifier *= value.modifier;
      }
    });
    return modifier;
  }

  public getAndClearPendingProgressDelta(): number {
    const delta = this.temporaryProgressModifiers;
    this.temporaryProgressModifiers = 0;
    return delta;
  }

  public isStarmapDistorted(): boolean {
    return Date.now() < this.starmapDistortUntil;
  }

  public getFlags(): Record<string, unknown> {
    return { ...this.getEventState().flags };
  }

  public setFlag(key: string, value: unknown): void {
    const state = this.getEventState();
    state.flags[key] = value;
    this.updateEventState(state);
  }

  public getEventHistory(): VoyageEventState['eventHistory'] {
    return [...this.getEventState().eventHistory];
  }

  public triggerManualEvent(eventId: string): boolean {
    const event = getVoyageEventById(eventId);
    if (!event) return false;

    const gameState = this.stateManager.getState();
    const context: VoyageEventTriggerContext = {
      routeId: gameState.currentRoute || 'manual',
      routeType: 'main',
      progress: gameState.currentRouteProgress || 0.5,
      currentPointIndex: 0,
      currentWeather: gameState.activeWeather,
      currentTimeOfDay: this.dayNightModule.getCycleInfo().timeOfDay,
      starsDiscoveredInChapter: this.getStarsDiscoveredInChapter(),
    };

    this.triggerEvent(event, context);
    return true;
  }

  public resetState(): void {
    this.clearAutoResolveTimer();
    this.activeEvent = null;
    this.activeContext = null;
    this.temporarySpeedModifiers.clear();
    this.temporaryProgressModifiers = 0;
    this.starmapDistortUntil = 0;

    this.stateManager.setState({
      voyageEvents: { ...DEFAULT_VOYAGE_EVENT_STATE },
    });

    if (this.eventOverlay) {
      this.eventOverlay.style.display = 'none';
    }
  }

  public dispose(): void {
    this.clearAllEventListeners();
    this.clearAutoResolveTimer();
    this.initialized = false;

    if (this.eventOverlay) {
      this.eventOverlay.remove();
      this.eventOverlay = null;
    }
  }
}
