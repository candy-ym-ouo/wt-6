import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import {
  ConstellationStoryState,
  ConstellationStorySequence,
  ConstellationStoryNode,
  ConstellationStoryChoice,
} from '../types';
import {
  constellationStories,
  getConstellationStory,
  getStoriesByChapter,
  getAllConstellationStories,
} from '../data/constellationStories';

const DEFAULT_STORY_STATE: ConstellationStoryState = {
  unlockedStories: [],
  viewedStories: [],
  replayCount: {},
  lastViewedAt: {},
  choiceHistory: [],
  flags: {},
};

export class ConstellationStoryModule {
  private static instance: ConstellationStoryModule;
  private stateManager: GameStateManager;
  private isInitialized: boolean = false;
  private isPlaying: boolean = false;
  private currentStoryId: string | null = null;
  private currentNodeId: string | null = null;
  private pendingStoryQueue: string[] = [];

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
  }

  public static getInstance(): ConstellationStoryModule {
    if (!ConstellationStoryModule.instance) {
      ConstellationStoryModule.instance = new ConstellationStoryModule();
    }
    return ConstellationStoryModule.instance;
  }

  public initialize(): void {
    this.ensureStoryState();
    if (!this.isInitialized) {
      this.setupEventListeners();
      this.isInitialized = true;
    }
    this.autoUnlockStories();
  }

  private ensureStoryState(): void {
    const state = this.stateManager.getState();
    if (!state.constellationStories) {
      this.stateManager.setState({
        constellationStories: { ...DEFAULT_STORY_STATE },
      });
    }
  }

  private getStoryState(): ConstellationStoryState {
    const state = this.stateManager.getState();
    if (!state.constellationStories) {
      this.ensureStoryState();
      return { ...DEFAULT_STORY_STATE };
    }
    return {
      ...state.constellationStories,
      unlockedStories: [...state.constellationStories.unlockedStories],
      viewedStories: [...state.constellationStories.viewedStories],
      replayCount: { ...state.constellationStories.replayCount },
      lastViewedAt: { ...state.constellationStories.lastViewedAt },
      choiceHistory: state.constellationStories.choiceHistory.map(h => ({ ...h })),
      flags: { ...state.constellationStories.flags },
    };
  }

  private updateStoryState(storyState: ConstellationStoryState): void {
    this.stateManager.setState({ constellationStories: storyState });
  }

  private setupEventListeners(): void {
    eventBus.on('constellation:discovered', (constellationId: string) => {
      this.onConstellationDiscovered(constellationId);
    });

    eventBus.on('constellation_story:play', (storyId: string) => {
      this.playStory(storyId);
    });

    eventBus.on('constellation_story:next', () => {
      this.advance();
    });

    eventBus.on('constellation_story:choice', (choiceId: string) => {
      this.onChoice(choiceId);
    });

    eventBus.on('constellation_story:skip', () => {
      this.skipCurrent();
    });

    eventBus.on('constellation_story:close', () => {
      this.closeStory();
    });

    eventBus.on('constellation_story:replay', (storyId: string) => {
      this.replayStory(storyId);
    });

    eventBus.on('progress:reset', () => {
      this.resetState();
    });

    eventBus.on('star:discovered', () => {
      this.checkUnlockConditions();
    });
  }

  private autoUnlockStories(): void {
    const state = this.stateManager.getState();
    const discoveredConstellations = state.discoveredConstellations;

    discoveredConstellations.forEach(constellationId => {
      this.unlockStoryForConstellation(constellationId, false);
    });
  }

  private onConstellationDiscovered(constellationId: string): void {
    this.unlockStoryForConstellation(constellationId, true);
  }

  private unlockStoryForConstellation(constellationId: string, triggerAutoPlay: boolean): void {
    const story = getConstellationStory(constellationId);
    if (!story) return;

    const storyState = this.getStoryState();

    if (!storyState.unlockedStories.includes(story.id)) {
      storyState.unlockedStories.push(story.id);
      this.updateStoryState(storyState);
      eventBus.emit('constellation_story:unlocked', {
        storyId: story.id,
        constellationId: story.constellationId,
        constellationName: story.constellationName,
      });
    }

    if (triggerAutoPlay) {
      if (this.isPlaying) {
        if (!this.pendingStoryQueue.includes(story.id)) {
          this.pendingStoryQueue.push(story.id);
        }
      } else {
        setTimeout(() => {
          this.playStory(story.id);
        }, 1500);
      }
    }
  }

  private checkUnlockConditions(): void {
    const storyState = this.getStoryState();
    const state = this.stateManager.getState();
    const starsCount = state.discoveredStars.length;

    constellationStories.forEach(story => {
      if (storyState.unlockedStories.includes(story.id)) return;
      if (!story.unlockCondition) return;

      let canUnlock = true;

      if (story.unlockCondition.minStarsDiscovered !== undefined) {
        if (starsCount < story.unlockCondition.minStarsDiscovered) {
          canUnlock = false;
        }
      }

      if (story.unlockCondition.requiredConstellationIds) {
        const allRequired = story.unlockCondition.requiredConstellationIds.every(
          id => state.discoveredConstellations.includes(id)
        );
        if (!allRequired) {
          canUnlock = false;
        }
      }

      if (canUnlock) {
        const constellationDiscovered = state.discoveredConstellations.includes(story.constellationId);
        if (constellationDiscovered) {
          this.unlockStoryForConstellation(story.constellationId, false);
        }
      }
    });
  }

  public canPlayStory(storyId: string): boolean {
    const storyState = this.getStoryState();
    const story = constellationStories.find(s => s.id === storyId);

    if (!story) return false;
    if (!storyState.unlockedStories.includes(storyId)) return false;

    if (!story.repeatable && storyState.viewedStories.includes(storyId)) {
      return false;
    }

    return true;
  }

  public playStory(storyId: string): boolean {
    const story = constellationStories.find(s => s.id === storyId);
    if (!story) {
      eventBus.emit('toast:show', { message: '剧情不存在' });
      return false;
    }

    if (!this.canPlayStory(storyId)) {
      const storyState = this.getStoryState();
      if (!storyState.unlockedStories.includes(storyId)) {
        eventBus.emit('toast:show', { message: '该剧情尚未解锁' });
      } else if (!story.repeatable && storyState.viewedStories.includes(storyId)) {
        eventBus.emit('toast:show', { message: '该剧情已看过且不可重复' });
      }
      return false;
    }

    this.isPlaying = true;
    this.currentStoryId = storyId;
    this.currentNodeId = story.startNodeId;

    const storyState = this.getStoryState();
    if (!storyState.viewedStories.includes(storyId)) {
      storyState.viewedStories.push(storyId);
    }
    storyState.replayCount[storyId] = (storyState.replayCount[storyId] || 0) + 1;
    storyState.lastViewedAt[storyId] = Date.now();
    this.updateStoryState(storyState);

    const node = this.getCurrentNode();
    if (node) {
      this.emitNode(node);
    }

    eventBus.emit('constellation_story:started', {
      storyId,
      constellationId: story.constellationId,
      constellationName: story.constellationName,
      title: story.title,
      icon: story.icon,
    });

    return true;
  }

  public replayStory(storyId: string): boolean {
    const story = constellationStories.find(s => s.id === storyId);
    if (!story) return false;

    const storyState = this.getStoryState();
    if (!storyState.viewedStories.includes(storyId)) {
      eventBus.emit('toast:show', { message: '请先查看一次该剧情' });
      return false;
    }

    return this.playStory(storyId);
  }

  public getCurrentStory(): ConstellationStorySequence | null {
    if (!this.currentStoryId) return null;
    return constellationStories.find(s => s.id === this.currentStoryId) || null;
  }

  public getCurrentNode(): ConstellationStoryNode | null {
    if (!this.currentStoryId || !this.currentNodeId) return null;
    const story = this.getCurrentStory();
    if (!story) return null;
    return story.nodes.find(n => n.id === this.currentNodeId) || null;
  }

  private emitNode(node: ConstellationStoryNode): void {
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

    if (node.visual) {
      eventBus.emit('constellation_story:visual', node.visual);
    }

    eventBus.emit('constellation_story:node', {
      storyId: this.currentStoryId,
      nodeId: node.id,
      node,
    });
  }

  public advance(): void {
    if (!this.isPlaying) return;

    const node = this.getCurrentNode();
    if (!node) {
      this.endStory();
      return;
    }

    if (node.choices && node.choices.length > 0) return;

    if (node.nextNodeId === null || node.nextNodeId === undefined) {
      this.endStory();
      return;
    }

    this.currentNodeId = node.nextNodeId;
    const nextNode = this.getCurrentNode();
    if (nextNode) {
      this.emitNode(nextNode);
    } else {
      this.endStory();
    }
  }

  public onChoice(choiceId: string): void {
    if (!this.isPlaying) return;

    const node = this.getCurrentNode();
    if (!node || !node.choices) return;

    const choice = node.choices.find(c => c.id === choiceId);
    if (!choice) return;

    const storyState = this.getStoryState();
    storyState.choiceHistory.push({
      storyId: this.currentStoryId!,
      nodeId: node.id,
      choiceId,
      timestamp: Date.now(),
    });
    this.updateStoryState(storyState);

    eventBus.emit('constellation_story:choice_made', {
      storyId: this.currentStoryId,
      nodeId: node.id,
      choiceId,
    });

    eventBus.emit('sound:play', 'dialogue_choice');

    if (choice.nextNodeId === null || choice.nextNodeId === undefined) {
      this.endStory();
      return;
    }

    this.currentNodeId = choice.nextNodeId;
    const nextNode = this.getCurrentNode();
    if (nextNode) {
      this.emitNode(nextNode);
    } else {
      this.endStory();
    }
  }

  private endStory(): void {
    const prevStoryId = this.currentStoryId;
    const constellationId = this.getCurrentStory()?.constellationId;

    this.isPlaying = false;
    this.currentStoryId = null;
    this.currentNodeId = null;

    eventBus.emit('constellation_story:ended', {
      storyId: prevStoryId,
      constellationId,
    });

    eventBus.emit('sound:play', 'dialogue_close');

    if (this.pendingStoryQueue.length > 0) {
      const nextStoryId = this.pendingStoryQueue.shift()!;
      setTimeout(() => {
        if (!this.isPlaying) {
          this.playStory(nextStoryId);
        }
      }, 1000);
    }
  }

  public skipCurrent(): void {
    if (!this.isPlaying) return;
    this.endStory();
  }

  public closeStory(): void {
    this.pendingStoryQueue = [];
    this.endStory();
  }

  public isStoryPlaying(): boolean {
    return this.isPlaying;
  }

  public getStoryProgress(storyId: string): { viewed: boolean; replayCount: number; lastViewedAt: number | undefined; unlocked: boolean } {
    const storyState = this.getStoryState();
    return {
      unlocked: storyState.unlockedStories.includes(storyId),
      viewed: storyState.viewedStories.includes(storyId),
      replayCount: storyState.replayCount[storyId] || 0,
      lastViewedAt: storyState.lastViewedAt[storyId],
    };
  }

  public getAllStoryProgress(): Record<string, { viewed: boolean; replayCount: number; unlocked: boolean }> {
    const storyState = this.getStoryState();
    const result: Record<string, { viewed: boolean; replayCount: number; unlocked: boolean }> = {};

    constellationStories.forEach(story => {
      result[story.id] = {
        unlocked: storyState.unlockedStories.includes(story.id),
        viewed: storyState.viewedStories.includes(story.id),
        replayCount: storyState.replayCount[story.id] || 0,
      };
    });

    return result;
  }

  public getUnlockedStories(): ConstellationStorySequence[] {
    const storyState = this.getStoryState();
    return constellationStories.filter(s => storyState.unlockedStories.includes(s.id));
  }

  public getViewedStories(): ConstellationStorySequence[] {
    const storyState = this.getStoryState();
    return constellationStories.filter(s => storyState.viewedStories.includes(s.id));
  }

  public isStoryUnlocked(storyId: string): boolean {
    const storyState = this.getStoryState();
    return storyState.unlockedStories.includes(storyId);
  }

  public isStoryViewed(storyId: string): boolean {
    const storyState = this.getStoryState();
    return storyState.viewedStories.includes(storyId);
  }

  private resetState(): void {
    this.stateManager.setState({
      constellationStories: { ...DEFAULT_STORY_STATE },
    });
    this.isPlaying = false;
    this.currentStoryId = null;
    this.currentNodeId = null;
    this.pendingStoryQueue = [];
  }

  public getSerializableState(): ConstellationStoryState {
    return this.getStoryState();
  }

  public loadState(savedState: ConstellationStoryState): void {
    this.stateManager.setState({
      constellationStories: {
        ...savedState,
        unlockedStories: [...savedState.unlockedStories],
        viewedStories: [...savedState.viewedStories],
        replayCount: { ...savedState.replayCount },
        lastViewedAt: { ...savedState.lastViewedAt },
        choiceHistory: savedState.choiceHistory.map(h => ({ ...h })),
        flags: { ...savedState.flags },
      },
    });
  }

  public getStoriesByChapter(chapterId: string): ConstellationStorySequence[] {
    return getStoriesByChapter(chapterId);
  }

  public getAllStories(): ConstellationStorySequence[] {
    return getAllConstellationStories();
  }

  public getStoryByConstellation(constellationId: string): ConstellationStorySequence | undefined {
    return getConstellationStory(constellationId);
  }

  public getFlag(key: string): unknown {
    return this.getStoryState().flags[key];
  }

  public setFlag(key: string, value: unknown): void {
    const storyState = this.getStoryState();
    storyState.flags[key] = value;
    this.updateStoryState(storyState);
  }

  public dispose(): void {}
}
