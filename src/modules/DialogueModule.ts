import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import {
  DialogueSequence,
  DialogueNode,
  DialogueChoice,
  DialogueState,
  DialogueEffect,
  DialogueTrigger,
} from '../types';

export class DialogueModule {
  private static instance: DialogueModule;
  private stateManager: GameStateManager;
  private sequences: DialogueSequence[] = [];
  private state: DialogueState;
  private isPlaying: boolean = false;
  private pendingSequences: DialogueSequence[] = [];

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.state = {
      activeSequenceId: null,
      currentNodeId: null,
      flags: {},
      seenSequences: [],
      choiceHistory: [],
    };

    eventBus.on('chapter:started', this.onChapterStarted.bind(this));
    eventBus.on('weather:changed', this.onWeatherChanged.bind(this));
    eventBus.on('star:discovered', this.onStarDiscovered.bind(this));
    eventBus.on('constellation:discovered', this.onConstellationDiscovered.bind(this));
    eventBus.on('objective:completed', this.onObjectiveCompleted.bind(this));
    eventBus.on('port:available', this.onPortAvailable.bind(this));
    eventBus.on('dialogue:next', this.advance.bind(this));
    eventBus.on('dialogue:choice', this.onChoice.bind(this));
    eventBus.on('dialogue:skip', this.skipCurrent.bind(this));
  }

  public static getInstance(): DialogueModule {
    if (!DialogueModule.instance) {
      DialogueModule.instance = new DialogueModule();
    }
    return DialogueModule.instance;
  }

  public loadSequences(sequences: DialogueSequence[]): void {
    this.sequences = sequences;
  }

  public initialize(): void {
    this.state = {
      activeSequenceId: null,
      currentNodeId: null,
      flags: {},
      seenSequences: [],
      choiceHistory: [],
    };
  }

  public isActive(): boolean {
    return this.isPlaying;
  }

  public getState(): DialogueState {
    return { ...this.state };
  }

  public getFlag(key: string): unknown {
    return this.state.flags[key];
  }

  public setFlag(key: string, value: unknown): void {
    this.state.flags[key] = value;
  }

  public getCurrentNode(): DialogueNode | null {
    if (!this.state.activeSequenceId || !this.state.currentNodeId) return null;
    const seq = this.sequences.find(s => s.id === this.state.activeSequenceId);
    if (!seq) return null;
    return seq.nodes.find(n => n.id === this.state.currentNodeId) || null;
  }

  public getCurrentSequence(): DialogueSequence | null {
    if (!this.state.activeSequenceId) return null;
    return this.sequences.find(s => s.id === this.state.activeSequenceId) || null;
  }

  private onChapterStarted(chapter: any): void {
    this.trigger('chapter_open', chapter.id);
  }

  private onWeatherChanged(weather: any): void {
    if (!weather) return;
    const type = weather.type || (weather.id ? weather.id.split('_')[0] : null);
    if (type) {
      this.trigger('weather_change', type);
    }
  }

  private onStarDiscovered(_starId: string): void {
    this.trigger('event_insert', 'star_discovered');
  }

  private onConstellationDiscovered(_constellationId: string): void {
    this.trigger('event_insert', 'constellation_discovered');
  }

  private onObjectiveCompleted(_objectiveId: string): void {
    this.trigger('objective_complete', 'all');
  }

  private onPortAvailable(_port: any): void {
    this.trigger('port_arrive', _port.id);
  }

  public trigger(triggerType: DialogueTrigger, target?: string): void {
    const matching = this.sequences
      .filter(seq => {
        if (seq.trigger !== triggerType) return false;
        if (seq.triggerTarget && seq.triggerTarget !== target) return false;
        if (!seq.repeatable && this.state.seenSequences.includes(seq.id)) return false;
        if (seq.condition) {
          if (seq.condition.flag !== undefined) {
            const flagVal = this.state.flags[seq.condition.flag];
            if (flagVal !== seq.condition.flagValue) return false;
          }
          if (seq.condition.minChapter !== undefined) {
            const chId = this.stateManager.getState().currentChapterId;
            if (!chId) return false;
            const chNum = parseInt(chId.replace('chapter-', ''), 10);
            if (chNum < seq.condition.minChapter) return false;
          }
        }
        return true;
      })
      .sort((a, b) => b.priority - a.priority);

    if (matching.length === 0) return;

    if (this.isPlaying) {
      this.pendingSequences.push(...matching);
      return;
    }

    this.startSequence(matching[0]);
  }

  private startSequence(sequence: DialogueSequence): void {
    this.isPlaying = true;
    this.state.activeSequenceId = sequence.id;
    this.state.currentNodeId = sequence.startNodeId;

    if (!this.state.seenSequences.includes(sequence.id)) {
      this.state.seenSequences.push(sequence.id);
    }

    const node = this.getCurrentNode();
    if (node) {
      this.emitNode(node);
    }
  }

  private emitNode(node: DialogueNode): void {
    if (node.audio) {
      if (node.audio.sfx) {
        eventBus.emit('sound:play', node.audio.sfx);
      }
      if (node.audio.music) {
        eventBus.emit('music:play', node.audio.music);
      }
      if (node.audio.ambient) {
        eventBus.emit('ambient:play', node.audio.ambient);
      }
    }

    if (node.effects) {
      this.applyEffects(node.effects);
    }

    eventBus.emit('dialogue:node', node);
  }

  public advance(): void {
    if (!this.isPlaying) return;

    const node = this.getCurrentNode();
    if (!node) {
      this.endSequence();
      return;
    }

    if (node.choices && node.choices.length > 0) return;

    if (node.nextNodeId === null || node.nextNodeId === undefined) {
      this.endSequence();
      return;
    }

    this.state.currentNodeId = node.nextNodeId;
    const nextNode = this.getCurrentNode();
    if (nextNode) {
      this.emitNode(nextNode);
    } else {
      this.endSequence();
    }
  }

  public onChoice(choiceId: string): void {
    if (!this.isPlaying) return;

    const node = this.getCurrentNode();
    if (!node || !node.choices) return;

    const choice = node.choices.find(c => c.id === choiceId);
    if (!choice) return;

    this.state.choiceHistory.push({
      sequenceId: this.state.activeSequenceId!,
      nodeId: node.id,
      choiceId,
    });

    if (choice.effects) {
      this.applyEffects(choice.effects);
    }

    if (choice.nextNodeId === null || choice.nextNodeId === undefined) {
      this.endSequence();
      return;
    }

    this.state.currentNodeId = choice.nextNodeId;
    const nextNode = this.getCurrentNode();
    if (nextNode) {
      this.emitNode(nextNode);
    } else {
      this.endSequence();
    }
  }

  private applyEffects(effects: DialogueEffect[]): void {
    const state = this.stateManager;

    for (const effect of effects) {
      switch (effect.type) {
        case 'flag':
          this.state.flags[effect.key] = effect.value;
          eventBus.emit('dialogue:flag_set', { key: effect.key, value: effect.value });
          break;
        case 'ship': {
          const ship = state.getState().ship;
          const currentVal = ship[effect.key as keyof typeof ship] as number;
          const delta = effect.value as number;
          const key = effect.key as keyof typeof ship;
          if (key === 'health') {
            state.updateShip({ health: Math.min(ship.maxHealth, Math.max(0, currentVal + delta)) });
          } else if (key === 'supplies') {
            state.updateShip({ supplies: Math.min(ship.maxSupplies, Math.max(0, currentVal + delta)) });
          } else if (key === 'speed') {
            state.updateShip({ speed: Math.max(0, currentVal + delta) });
          }
          break;
        }
        case 'crew': {
          const crew = state.getState().crew;
          if (effect.key === 'gold') {
            state.updateCrew({ gold: Math.max(0, crew.gold + (effect.value as number)) });
          }
          break;
        }
        case 'trade':
          break;
        case 'chapter':
          if (effect.key === 'unlock') {
            eventBus.emit('chapter:unlock', effect.value as string);
          }
          break;
      }
    }
  }

  private endSequence(): void {
    this.isPlaying = false;
    const prevId = this.state.activeSequenceId;
    this.state.activeSequenceId = null;
    this.state.currentNodeId = null;

    eventBus.emit('dialogue:ended', { sequenceId: prevId });
    eventBus.emit('sound:play', 'dialogue_close');

    if (this.pendingSequences.length > 0) {
      const next = this.pendingSequences.shift()!;
      setTimeout(() => {
        if (!this.isPlaying) {
          this.startSequence(next);
        }
      }, 500);
    }
  }

  public skipCurrent(): void {
    if (!this.isPlaying) return;
    this.endSequence();
  }

  public resetState(): void {
    this.isPlaying = false;
    this.pendingSequences = [];
    this.state = {
      activeSequenceId: null,
      currentNodeId: null,
      flags: {},
      seenSequences: [],
      choiceHistory: [],
    };
  }

  public getSerializableState(): DialogueState {
    return { ...this.state };
  }

  public loadSerializableState(state: DialogueState): void {
    this.state = { ...state, flags: { ...state.flags }, seenSequences: [...state.seenSequences], choiceHistory: [...state.choiceHistory] };
  }

  public dispose(): void {
    this.resetState();
    this.sequences = [];
  }
}
