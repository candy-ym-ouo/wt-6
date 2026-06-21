import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import {
  WaypointExplorationState,
  WaypointReward,
  RoutePoint,
  RewardItem,
  RewardGrantedEvent,
  BroadcastPriority,
  LandmarkReachedEvent,
} from '../types';
import { ChapterModule } from './ChapterModule';
import { CrewModule } from './CrewModule';
import { CodexModule } from './CodexModule';
import { SaveModule } from './SaveModule';

const DEFAULT_STATE: WaypointExplorationState = {
  exploredWaypoints: {},
  claimedRewards: {},
  totalExplored: 0,
  totalRewardsClaimed: 0,
};

export class WaypointExplorationModule {
  private static instance: WaypointExplorationModule;
  private stateManager: GameStateManager;
  private chapterModule: ChapterModule | null = null;
  private crewModule: CrewModule;
  private codexModule: CodexModule;
  private saveModule: SaveModule;
  private isInitialized: boolean = false;
  private currentChapterId: string | null = null;
  private currentRoutePoints: RoutePoint[] = [];

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.crewModule = CrewModule.getInstance();
    this.codexModule = CodexModule.getInstance();
    this.saveModule = SaveModule.getInstance();
  }

  public static getInstance(): WaypointExplorationModule {
    if (!WaypointExplorationModule.instance) {
      WaypointExplorationModule.instance = new WaypointExplorationModule();
    }
    return WaypointExplorationModule.instance;
  }

  public setChapterModule(module: ChapterModule): void {
    this.chapterModule = module;
  }

  public initialize(): void {
    this.ensureState();
    if (!this.isInitialized) {
      this.setupEventListeners();
      this.isInitialized = true;
    }
  }

  private ensureState(): void {
    const state = this.stateManager.getState();
    if (!state.waypointExploration) {
      this.stateManager.setWaypointExplorationState({ ...DEFAULT_STATE });
    }
  }

  private getState(): WaypointExplorationState {
    const state = this.stateManager.getState();
    if (!state.waypointExploration) {
      this.ensureState();
      return { ...DEFAULT_STATE };
    }
    return {
      ...state.waypointExploration,
      exploredWaypoints: { ...state.waypointExploration.exploredWaypoints },
      claimedRewards: { ...state.waypointExploration.claimedRewards },
    };
  }

  private updateState(newState: WaypointExplorationState): void {
    this.stateManager.setWaypointExplorationState(newState);
  }

  private setupEventListeners(): void {
    eventBus.on('point:reached', (pointId: string) => {
      this.onPointReached(pointId);
    });

    eventBus.on('chapter:started', (chapter: any) => {
      this.onChapterStarted(chapter);
    });

    eventBus.on('progress:reset', () => {
      this.resetState();
    });

    eventBus.on('waypoint:load', (savedState: WaypointExplorationState) => {
      if (savedState) {
        this.loadState(savedState);
      }
    });
  }

  private onChapterStarted(chapter: any): void {
    this.currentChapterId = chapter.id;
    this.currentRoutePoints = chapter.routePoints || [];

    const startPoint = this.currentRoutePoints.find(p => p.type === 'start');
    if (startPoint) {
      this.tryTriggerLandmarkForPoint(startPoint);
    }
  }

  private tryTriggerLandmarkForPoint(point: RoutePoint): void {
    const state = this.getState();
    const isFirstVisit = !state.exploredWaypoints[point.id];

    if (isFirstVisit) {
      this.stateManager.addExploredWaypoint(point.id);
      this.stateManager.addVisitedPoint(point.id);

      eventBus.emit('toast:show', {
        message: `📍 发现新航点：${point.name}`,
        duration: 3000,
      });

      if (point.landmark) {
        const landmarkEvent: LandmarkReachedEvent = {
          pointId: point.id,
          point: point,
          chapterId: this.currentChapterId || '',
          isFirstVisit: true,
          timestamp: Date.now(),
        };
        eventBus.emit('landmark:reached', landmarkEvent);
      }

      if (point.explorationRewards && point.explorationRewards.length > 0) {
        this.grantWaypointRewards(point);
      }
    }
  }

  private onPointReached(pointId: string): void {
    const point = this.getRoutePoint(pointId);
    if (!point) return;

    this.tryTriggerLandmarkForPoint(point);
  }

  private getRoutePoint(pointId: string): RoutePoint | undefined {
    return this.currentRoutePoints.find(p => p.id === pointId);
  }

  private grantWaypointRewards(point: RoutePoint): void {
    if (!point.explorationRewards || point.explorationRewards.length === 0) return;

    const rewards = point.explorationRewards;
    const rewardItems: RewardItem[] = [];
    const gameState = this.stateManager.getState();

    rewards.forEach(reward => {
      const amount = reward.amount || 1;

      switch (reward.type) {
        case 'gold':
          this.stateManager.updateCrew({
            gold: gameState.crew.gold + amount,
          });
          rewardItems.push({
            type: 'gold',
            amount,
            rarity: reward.rarity,
            name: reward.name,
          });
          break;

        case 'supplies':
          this.stateManager.updateShip({
            supplies: Math.min(
              gameState.ship.supplies + amount,
              gameState.ship.maxSupplies
            ),
          });
          rewardItems.push({
            type: 'supplies',
            amount,
            rarity: reward.rarity,
            name: reward.name,
          });
          break;

        case 'exp':
          const updatedMembers = gameState.crew.members.map(member => {
            let newExp = member.exp + amount;
            let newLevel = member.level;
            let newMaxExp = member.maxExp;
            while (newExp >= newMaxExp) {
              newExp -= newMaxExp;
              newLevel++;
              newMaxExp = Math.floor(newMaxExp * 1.5);
            }
            return { ...member, exp: newExp, level: newLevel, maxExp: newMaxExp };
          });
          this.stateManager.updateCrew({ members: updatedMembers });
          rewardItems.push({
            type: 'exp',
            amount,
            rarity: reward.rarity,
            name: reward.name,
          });
          break;

        case 'star':
          if (typeof reward.value === 'string') {
            this.stateManager.addDiscoveredStar(reward.value);
            rewardItems.push({
              type: 'star',
              amount: 1,
              rarity: reward.rarity,
              value: reward.value,
              name: reward.name,
            });
          }
          break;

        case 'constellation':
          if (typeof reward.value === 'string') {
            this.stateManager.addDiscoveredConstellation(reward.value);
            rewardItems.push({
              type: 'constellation',
              amount: 1,
              rarity: reward.rarity,
              value: reward.value,
              name: reward.name,
            });
          }
          break;

        case 'codex_entry':
          if (typeof reward.value === 'string') {
            this.codexModule.discoverEntry(reward.value);
            rewardItems.push({
              type: 'codex_entry',
              amount: 1,
              rarity: reward.rarity,
              value: reward.value,
              name: reward.name,
            });
          }
          break;

        case 'clue':
          if (typeof reward.value === 'string') {
            const gatheringState = this.stateManager.getState().gathering;
            if (gatheringState && !gatheringState.discoveredClues.includes(reward.value)) {
              gatheringState.discoveredClues.push(reward.value);
              this.stateManager.setState({ gathering: gatheringState });
              eventBus.emit('gathering:clueDiscovered', reward.value);
            }
            rewardItems.push({
              type: 'clue',
              amount: 1,
              rarity: reward.rarity,
              value: reward.value,
              name: reward.name,
            });
          }
          break;
      }
    });

    this.stateManager.claimWaypointRewards(point.id);

    if (rewardItems.length > 0) {
      const event: RewardGrantedEvent = {
        source: 'waypoint_exploration',
        sourceId: point.id,
        sourceName: point.name,
        rewards: rewardItems,
        title: `航点探索奖励：${point.name}`,
        priority: this.getRewardPriority(rewardItems),
        timestamp: Date.now(),
      };
      eventBus.emit('reward:granted', event);

      eventBus.emit('toast:show', {
        message: `🎁 探索奖励：${point.name}`,
        duration: 3000,
      });
    }

    this.saveModule.saveGame('autosave');
  }

  private getRewardPriority(rewards: RewardItem[]): BroadcastPriority {
    const hasRare = rewards.some(
      r => r.rarity === 'epic' || r.rarity === 'legendary'
    );
    if (hasRare) return 'high';

    const hasUncommon = rewards.some(r => r.rarity === 'rare');
    if (hasUncommon) return 'normal';

    return 'normal';
  }

  public hasExploredWaypoint(waypointId: string): boolean {
    const state = this.getState();
    return state.exploredWaypoints[waypointId] === true;
  }

  public hasClaimedRewards(waypointId: string): boolean {
    const state = this.getState();
    return state.claimedRewards[waypointId] === true;
  }

  public getExploredWaypoints(): string[] {
    const state = this.getState();
    return Object.keys(state.exploredWaypoints).filter(
      id => state.exploredWaypoints[id]
    );
  }

  public getTotalExplored(): number {
    const state = this.getState();
    return state.totalExplored;
  }

  public getTotalRewardsClaimed(): number {
    const state = this.getState();
    return state.totalRewardsClaimed;
  }

  public getSerializableState(): WaypointExplorationState {
    return this.getState();
  }

  public loadState(savedState: WaypointExplorationState): void {
    this.stateManager.setWaypointExplorationState({
      ...savedState,
      exploredWaypoints: { ...savedState.exploredWaypoints },
      claimedRewards: { ...savedState.claimedRewards },
    });
  }

  private resetState(): void {
    this.stateManager.setWaypointExplorationState({ ...DEFAULT_STATE });
    this.currentChapterId = null;
    this.currentRoutePoints = [];
  }

  public dispose(): void {}
}
