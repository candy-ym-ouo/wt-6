import { GameState, GameSettings, DialogueState, DayNightCycleState, TaskState, ShipDamageState, SeaEventState, SaveSlotInfo, SaveSlotsMetadata, Chapter, GatheringState, RuinsState, ScoreState, ReplayState, ConstellationStoryState, WaypointExplorationState, CheckpointType, CheckpointInfo, CheckpointMetadata } from '../types';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';

const SAVE_KEY = 'celestial_voyage_save';
const SAVE_METADATA_KEY = 'celestial_voyage_save_metadata';
const CHECKPOINT_KEY = 'celestial_voyage_checkpoint';
const CHECKPOINT_METADATA_KEY = 'celestial_voyage_checkpoint_metadata';
const QUICK_SAVE_KEY = 'celestial_voyage_quicksave';
const AUTO_SAVE_INTERVAL = 30000;
const MAX_SAVE_SLOTS = 10;
const MAX_CHECKPOINTS = 20;

export interface SupplyState {
  consumptionHistory: Array<{ amount: number; reason: string; timestamp: number }>;
  recoveryHistory: Array<{ amount: number; reason: string; timestamp: number }>;
}

export interface SaveData {
  version: string;
  timestamp: number;
  state: Partial<GameState>;
  dialogueState?: DialogueState;
  dayNightState?: DayNightCycleState;
  taskState?: TaskState;
  shipDamageState?: ShipDamageState;
  seaEventState?: SeaEventState;
  gatheringState?: GatheringState;
  ruinsState?: RuinsState;
  scoreState?: ScoreState;
  replayState?: ReplayState;
  constellationStoryState?: ConstellationStoryState;
  waypointExplorationState?: WaypointExplorationState;
  supplyState?: SupplyState;
}

export class SaveModule {
  private static instance: SaveModule;
  private stateManager: GameStateManager;
  private autoSaveTimer: number | null = null;
  private dialogueStateProvider: (() => DialogueState | undefined) | null = null;
  private dayNightStateProvider: (() => DayNightCycleState | undefined) | null = null;
  private taskStateProvider: (() => TaskState | undefined) | null = null;
  private shipDamageStateProvider: (() => ShipDamageState | undefined) | null = null;
  private seaEventStateProvider: (() => SeaEventState | undefined) | null = null;
  private gatheringStateProvider: (() => GatheringState | undefined) | null = null;
  private ruinsStateProvider: (() => RuinsState | undefined) | null = null;
  private scoreStateProvider: (() => ScoreState | undefined) | null = null;
  private replayStateProvider: (() => ReplayState | undefined) | null = null;
  private constellationStoryStateProvider: (() => ConstellationStoryState | undefined) | null = null;
  private waypointExplorationStateProvider: (() => WaypointExplorationState | undefined) | null = null;
  private supplyStateProvider: (() => SupplyState | undefined) | null = null;
  private chapterProvider: (() => Chapter | undefined) | null = null;
  private chaptersProvider: (() => Chapter[]) | null = null;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
  }

  public setChapterProvider(provider: () => Chapter | undefined): void {
    this.chapterProvider = provider;
  }

  public setChaptersProvider(provider: () => Chapter[]): void {
    this.chaptersProvider = provider;
  }

  public static getInstance(): SaveModule {
    if (!SaveModule.instance) {
      SaveModule.instance = new SaveModule();
    }
    return SaveModule.instance;
  }

  public setDialogueStateProvider(provider: () => DialogueState | undefined): void {
    this.dialogueStateProvider = provider;
  }

  public setDayNightStateProvider(provider: () => DayNightCycleState | undefined): void {
    this.dayNightStateProvider = provider;
  }

  public setTaskStateProvider(provider: () => TaskState | undefined): void {
    this.taskStateProvider = provider;
  }

  public setShipDamageStateProvider(provider: () => ShipDamageState | undefined): void {
    this.shipDamageStateProvider = provider;
  }

  public setSeaEventStateProvider(provider: () => SeaEventState | undefined): void {
    this.seaEventStateProvider = provider;
  }

  public setGatheringStateProvider(provider: () => GatheringState | undefined): void {
    this.gatheringStateProvider = provider;
  }

  public setRuinsStateProvider(provider: () => RuinsState | undefined): void {
    this.ruinsStateProvider = provider;
  }

  public setScoreStateProvider(provider: () => ScoreState | undefined): void {
    this.scoreStateProvider = provider;
  }

  public setReplayStateProvider(provider: () => ReplayState | undefined): void {
    this.replayStateProvider = provider;
  }

  public setConstellationStoryStateProvider(provider: () => ConstellationStoryState | undefined): void {
    this.constellationStoryStateProvider = provider;
  }

  public setWaypointExplorationStateProvider(provider: () => WaypointExplorationState | undefined): void {
    this.waypointExplorationStateProvider = provider;
  }

  public setSupplyStateProvider(provider: () => SupplyState | undefined): void {
    this.supplyStateProvider = provider;
  }

  public initialize(): void {
    this.startAutoSave();
    
    eventBus.on('chapter:completed', () => this.saveGame());
    eventBus.on('objective:completed', () => this.autoSave());
    
    eventBus.on('chapter:started', (chapter: Chapter) => {
      this.createCheckpoint('chapter_start', chapter);
    });
    eventBus.on('weather:changed', (weather: any) => {
      if (weather) {
        this.createCheckpoint('weather_change');
      }
    });
    eventBus.on('route:completed', () => {
      this.createCheckpoint('route_complete');
    });
  }

  private startAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    
    this.autoSaveTimer = window.setInterval(() => {
      this.autoSave();
    }, AUTO_SAVE_INTERVAL);
  }

  public saveGame(slotName: string = 'default', dialogueState?: DialogueState): boolean {
    try {
      const state = this.stateManager.getState();
      const ds = dialogueState ?? (this.dialogueStateProvider ? this.dialogueStateProvider() : undefined);
      const dns = this.dayNightStateProvider ? this.dayNightStateProvider() : undefined;
      const ts = this.taskStateProvider ? this.taskStateProvider() : undefined;
      const sds = this.shipDamageStateProvider ? this.shipDamageStateProvider() : undefined;
      const ses = this.seaEventStateProvider ? this.seaEventStateProvider() : undefined;
      const gs = this.gatheringStateProvider ? this.gatheringStateProvider() : undefined;
      const rs = this.ruinsStateProvider ? this.ruinsStateProvider() : undefined;
      const ss = this.scoreStateProvider ? this.scoreStateProvider() : undefined;
      const rps = this.replayStateProvider ? this.replayStateProvider() : undefined;
      const css = this.constellationStoryStateProvider ? this.constellationStoryStateProvider() : undefined;
      const wpes = this.waypointExplorationStateProvider ? this.waypointExplorationStateProvider() : undefined;
      const sus = this.supplyStateProvider ? this.supplyStateProvider() : undefined;
      const now = Date.now();
      const saveData: SaveData = {
        version: '1.0.0',
        timestamp: now,
        state: {
          discoveredStars: state.discoveredStars,
          discoveredConstellations: state.discoveredConstellations,
          visitedPoints: state.visitedPoints,
          completedObjectives: state.completedObjectives,
          completedChapters: state.completedChapters,
          playTime: state.playTime,
          settings: state.settings,
          currentChapterId: state.currentChapterId,
          currentPosition: state.currentPosition,
          currentRoute: state.currentRoute,
          currentRouteProgress: state.currentRouteProgress,
          ship: state.ship,
          crew: state.crew,
          activeCrewBonuses: state.activeCrewBonuses,
          trade: state.trade,
          achievements: state.achievements,
          codex: state.codex,
          tasks: state.tasks,
          seaEvents: state.seaEvents,
          tutorial: state.tutorial,
          gathering: state.gathering,
          ruins: state.ruins,
          scores: state.scores,
          replay: state.replay,
          chapterBranches: state.chapterBranches,
          selectedBranchRoute: state.selectedBranchRoute,
          unlockedBranchRoutes: state.unlockedBranchRoutes,
          constellationStories: state.constellationStories,
          waypointExploration: state.waypointExploration,
          activeWeather: state.activeWeather,
        },
        dialogueState: ds,
        dayNightState: dns,
        taskState: ts,
        shipDamageState: sds,
        seaEventState: ses,
        gatheringState: gs,
        ruinsState: rs,
        scoreState: ss,
        replayState: rps,
        constellationStoryState: css,
        waypointExplorationState: wpes,
        supplyState: sus,
      };
      
      const key = `${SAVE_KEY}_${slotName}`;
      localStorage.setItem(key, JSON.stringify(saveData));
      
      this.updateSlotMetadata(slotName, saveData, now);
      
      eventBus.emit('save:completed', { slotName, timestamp: saveData.timestamp });
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      eventBus.emit('save:error', error);
      return false;
    }
  }

  private updateSlotMetadata(slotName: string, saveData: SaveData, timestamp: number): void {
    try {
      const metadata = this.getSlotsMetadata();
      const state = saveData.state;
      const chapter = this.chapterProvider ? this.chapterProvider() : undefined;
      const chapters = this.chaptersProvider ? this.chaptersProvider() : [];
      let chapterName = '未知章节';
      let chapterId = state.currentChapterId || '';
      
      if (chapter) {
        chapterName = chapter.name;
        chapterId = chapter.id;
      } else if (state.currentChapterId) {
        const ch = chapters.find(c => c.id === state.currentChapterId);
        if (ch) {
          chapterName = ch.name;
        }
      }

      const existingSlot = metadata.slots[slotName];
      metadata.slots[slotName] = {
        slotName,
        displayName: existingSlot?.displayName || this.getDefaultDisplayName(slotName),
        createdAt: existingSlot?.createdAt || timestamp,
        updatedAt: timestamp,
        chapterName,
        chapterId,
        playTime: state.playTime || 0,
        discoveredStars: state.discoveredStars?.length || 0,
        discoveredConstellations: state.discoveredConstellations?.length || 0,
        visitedPoints: state.visitedPoints?.length || 0,
        completedObjectives: state.completedObjectives?.length || 0,
        shipHealth: state.ship?.health || 100,
        shipMaxHealth: state.ship?.maxHealth || 100,
        shipSupplies: state.ship?.supplies || 100,
        shipMaxSupplies: state.ship?.maxSupplies || 100,
        crewCount: state.crew?.members?.length || 0,
        gold: state.crew?.gold || 0,
      };

      this.saveSlotsMetadata(metadata);
    } catch (error) {
      console.error('Failed to update slot metadata:', error);
    }
  }

  private getDefaultDisplayName(slotName: string): string {
    if (slotName === 'autosave') return '自动存档';
    if (slotName === 'default') return '默认存档';
    const match = slotName.match(/^slot_(\d+)/);
    if (match) return `存档 ${match[1]}`;
    return slotName;
  }

  public getSlotsMetadata(): SaveSlotsMetadata {
    try {
      const data = localStorage.getItem(SAVE_METADATA_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return { slots: {} };
    } catch (error) {
      console.error('Failed to load slots metadata:', error);
      return { slots: {} };
    }
  }

  public saveSlotsMetadata(metadata: SaveSlotsMetadata): void {
    try {
      localStorage.setItem(SAVE_METADATA_KEY, JSON.stringify(metadata));
      eventBus.emit('saves:metadata_updated', metadata);
    } catch (error) {
      console.error('Failed to save slots metadata:', error);
    }
  }

  public getSlotInfo(slotName: string): SaveSlotInfo | null {
    const metadata = this.getSlotsMetadata();
    return metadata.slots[slotName] || null;
  }

  public getAllSaveSlots(): Array<{ slotName: string; saveData: SaveData | null; slotInfo: SaveSlotInfo | null }> {
    const metadata = this.getSlotsMetadata();
    const slots: Array<{ slotName: string; saveData: SaveData | null; slotInfo: SaveSlotInfo | null }> = [];
    
    const knownSlots = new Set<string>();
    Object.keys(metadata.slots).forEach(s => knownSlots.add(s));
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SAVE_KEY)) {
        const slotName = key.replace(SAVE_KEY + '_', '');
        knownSlots.add(slotName);
      }
    }

    let metadataChanged = false;
    knownSlots.forEach(slotName => {
      const saveData = this.getSaveInfo(slotName);
      if (!saveData) {
        if (metadata.slots[slotName]) {
          delete metadata.slots[slotName];
          metadataChanged = true;
        }
        return;
      }
      const slotInfo = metadata.slots[slotName];
      slots.push({ slotName, saveData, slotInfo });
    });

    if (metadataChanged) {
      this.saveSlotsMetadata(metadata);
    }

    return slots.sort((a, b) => {
      const aTime = a.slotInfo?.updatedAt || a.saveData?.timestamp || 0;
      const bTime = b.slotInfo?.updatedAt || b.saveData?.timestamp || 0;
      return bTime - aTime;
    });
  }

  public createNewSave(displayName: string): string | null {
    try {
      const metadata = this.getSlotsMetadata();
      const existingSlots = Object.keys(metadata.slots).filter(s => s !== 'autosave');
      
      if (existingSlots.length >= MAX_SAVE_SLOTS) {
        eventBus.emit('toast:show', { message: `存档位已满（最多${MAX_SAVE_SLOTS}个存档` });
        return null;
      }

      let slotNum = 1;
      let slotName: string;
      do {
        slotName = `slot_${slotNum}`;
        slotNum++;
      } while (metadata.slots[slotName] || this.hasSaveData(slotName));

      const success = this.saveGame(slotName);
      if (success) {
        if (displayName && displayName.trim()) {
          this.renameSave(slotName, displayName.trim());
        }
        return slotName;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to create new save:', error);
      return null;
    }
  }

  public renameSave(slotName: string, newDisplayName: string): boolean {
    try {
      if (slotName === 'autosave') {
        eventBus.emit('toast:show', { message: '自动存档不能重命名' });
        return false;
      }

      const metadata = this.getSlotsMetadata();
      if (!metadata.slots[slotName]) {
        return false;
      }

      metadata.slots[slotName].displayName = newDisplayName;
      this.saveSlotsMetadata(metadata);
      eventBus.emit('save:renamed', { slotName, newDisplayName });
      return true;
    } catch (error) {
      console.error('Failed to rename save:', error);
      return false;
    }
  }

  public overwriteSave(slotName: string): boolean {
    try {
      return this.saveGame(slotName);
    } catch (error) {
      console.error('Failed to overwrite save:', error);
      return false;
    }
  }

  private autoSave(): void {
    this.saveGame('autosave');
  }

  public loadGame(slotName: string = 'default'): SaveData | null {
    try {
      const key = `${SAVE_KEY}_${slotName}`;
      const saveDataStr = localStorage.getItem(key);
      
      if (!saveDataStr) {
        eventBus.emit('load:empty', { slotName });
        return null;
      }
      
      const saveData: SaveData = JSON.parse(saveDataStr);
      
      if (saveData.state.settings) {
        this.stateManager.updateSettings(saveData.state.settings);
      }
      
      if (saveData.state.discoveredStars) {
        saveData.state.discoveredStars.forEach(starId => {
          this.stateManager.addDiscoveredStar(starId);
        });
      }
      
      if (saveData.state.discoveredConstellations) {
        saveData.state.discoveredConstellations.forEach(constellationId => {
          this.stateManager.addDiscoveredConstellation(constellationId);
        });
      }
      
      if (saveData.state.visitedPoints) {
        saveData.state.visitedPoints.forEach(pointId => {
          this.stateManager.addVisitedPoint(pointId);
        });
      }
      
      if (saveData.state.completedObjectives) {
        saveData.state.completedObjectives.forEach(objectiveId => {
          this.stateManager.addCompletedObjective(objectiveId);
        });
      }
      
      if (saveData.state.completedChapters) {
        saveData.state.completedChapters.forEach(chapterId => {
          this.stateManager.addCompletedChapter(chapterId);
        });
      }
      
      if (saveData.state.playTime) {
        this.stateManager.setState({ playTime: saveData.state.playTime });
      }
      
      if (saveData.state.currentChapterId) {
        this.stateManager.setState({ currentChapterId: saveData.state.currentChapterId });
      }

      if (saveData.state.currentPosition) {
        this.stateManager.setCurrentPosition(
          saveData.state.currentPosition.x,
          saveData.state.currentPosition.y,
          saveData.state.currentPosition.z
        );
      }

      if (saveData.state.currentRoute !== undefined) {
        this.stateManager.setState({ currentRoute: saveData.state.currentRoute });
      }
      if (saveData.state.currentRouteProgress !== undefined) {
        this.stateManager.setState({ currentRouteProgress: saveData.state.currentRouteProgress });
      }

      if (saveData.state.ship) {
        this.stateManager.updateShip(saveData.state.ship);
      }

      if (saveData.state.crew) {
        this.stateManager.updateCrew(saveData.state.crew);
      }

      if (saveData.state.activeCrewBonuses) {
        this.stateManager.setActiveCrewBonuses(saveData.state.activeCrewBonuses);
      }

      if (saveData.state.trade) {
        this.stateManager.setState({ trade: saveData.state.trade });
      }

      if (saveData.state.achievements) {
        this.stateManager.setState({ achievements: saveData.state.achievements });
      }

      if (saveData.state.codex) {
        this.stateManager.setState({ codex: saveData.state.codex });
      }

      if (saveData.state.tasks) {
        this.stateManager.setState({ tasks: saveData.state.tasks });
      }

      if (saveData.state.seaEvents) {
        this.stateManager.setState({ seaEvents: saveData.state.seaEvents });
      }

      if (saveData.taskState) {
        eventBus.emit('tasks:load', saveData.taskState);
      }

      if (saveData.dayNightState) {
        eventBus.emit('daynight:load', saveData.dayNightState);
      }

      if (saveData.shipDamageState) {
        eventBus.emit('shipdamage:load', saveData.shipDamageState);
      }

      if (saveData.seaEventState) {
        eventBus.emit('seaevents:load', saveData.seaEventState);
      }

      if (saveData.state.gathering) {
        this.stateManager.setState({ gathering: saveData.state.gathering });
      }

      if (saveData.gatheringState) {
        eventBus.emit('gathering:load', saveData.gatheringState);
      }

      if (saveData.state.ruins) {
        this.stateManager.setState({ ruins: saveData.state.ruins });
      }

      if (saveData.ruinsState) {
        eventBus.emit('ruins:load', saveData.ruinsState);
      }

      if (saveData.state.scores) {
        this.stateManager.setState({ scores: saveData.state.scores });
      }

      if (saveData.scoreState) {
        eventBus.emit('scores:load', saveData.scoreState);
      }

      if (saveData.state.replay) {
        this.stateManager.setState({ replay: saveData.state.replay });
      }

      if (saveData.replayState) {
        eventBus.emit('replay:load', saveData.replayState);
      }

      if (saveData.state.chapterBranches) {
        this.stateManager.setChapterBranches(saveData.state.chapterBranches);
      }

      if (saveData.state.selectedBranchRoute !== undefined) {
        this.stateManager.setState({ selectedBranchRoute: saveData.state.selectedBranchRoute });
      }

      if (saveData.state.unlockedBranchRoutes) {
        this.stateManager.setState({ unlockedBranchRoutes: saveData.state.unlockedBranchRoutes });
      }

      if (saveData.state.constellationStories) {
        this.stateManager.setState({ constellationStories: saveData.state.constellationStories });
      }

      if (saveData.constellationStoryState) {
        eventBus.emit('constellation_story:load', saveData.constellationStoryState);
      }

      if (saveData.supplyState) {
        eventBus.emit('supplies:load', saveData.supplyState);
      }

      if (saveData.state.activeWeather !== undefined) {
        this.stateManager.setState({ activeWeather: saveData.state.activeWeather });
      }
      
      eventBus.emit('load:completed', { slotName, saveData });
      return saveData;
    } catch (error) {
      console.error('Failed to load game:', error);
      eventBus.emit('load:error', error);
      return null;
    }
  }

  public hasSaveData(slotName: string = 'default'): boolean {
    const key = `${SAVE_KEY}_${slotName}`;
    return localStorage.getItem(key) !== null;
  }

  public getSaveInfo(slotName: string = 'default'): SaveData | null {
    try {
      const key = `${SAVE_KEY}_${slotName}`;
      const saveDataStr = localStorage.getItem(key);
      
      if (!saveDataStr) return null;
      
      return JSON.parse(saveDataStr);
    } catch (error) {
      console.error('Failed to read save info:', error);
      return null;
    }
  }

  public getAllSaves(): Array<{ slotName: string; saveData: SaveData }> {
    const saves: Array<{ slotName: string; saveData: SaveData }> = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SAVE_KEY)) {
        const slotName = key.replace(SAVE_KEY + '_', '');
        const saveData = this.getSaveInfo(slotName);
        if (saveData) {
          saves.push({ slotName, saveData });
        }
      }
    }
    
    return saves.sort((a, b) => b.saveData.timestamp - a.saveData.timestamp);
  }

  public deleteSave(slotName: string): boolean {
    try {
      if (slotName === 'autosave') {
        eventBus.emit('toast:show', { message: '自动存档不能删除' });
        return false;
      }

      const key = `${SAVE_KEY}_${slotName}`;
      localStorage.removeItem(key);

      const metadata = this.getSlotsMetadata();
      delete metadata.slots[slotName];
      this.saveSlotsMetadata(metadata);

      eventBus.emit('save:deleted', { slotName });
      return true;
    } catch (error) {
      console.error('Failed to delete save:', error);
      return false;
    }
  }

  public exportSave(slotName: string = 'default'): string | null {
    const key = `${SAVE_KEY}_${slotName}`;
    return localStorage.getItem(key);
  }

  public importSave(data: string, slotName: string = 'default'): boolean {
    try {
      JSON.parse(data);
      const key = `${SAVE_KEY}_${slotName}`;
      localStorage.setItem(key, data);
      return true;
    } catch (error) {
      console.error('Failed to import save:', error);
      return false;
    }
  }

  public resetProgress(): void {
    this.stateManager.reset();
    this.deleteSave('default');
    this.deleteSave('autosave');
    
    const metadata = this.getSlotsMetadata();
    Object.keys(metadata.slots).forEach(slotName => {
      if (slotName !== 'autosave') {
        const key = `${SAVE_KEY}_${slotName}`;
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem(SAVE_METADATA_KEY);
    
    eventBus.emit('progress:reset');
  }

  public formatPlayTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  public createCheckpoint(type: CheckpointType, chapter?: Chapter): boolean {
    try {
      const now = Date.now();
      const checkpointId = `checkpoint_${now}`;
      const slotName = `${CHECKPOINT_KEY}_${checkpointId}`;
      
      const state = this.stateManager.getState();
      const chapterData = chapter || this.chapterProvider?.();
      const chapterName = chapterData?.name || '未知章节';
      const chapterId = chapterData?.id || state.currentChapterId || '';
      
      const checkpointNames: Record<CheckpointType, string> = {
        chapter_start: '章节开始',
        weather_change: '天气变化',
        route_complete: '航线完成',
        objective_complete: '目标完成',
        manual: '手动存档'
      };
      
      const checkpointDescriptions: Record<CheckpointType, string> = {
        chapter_start: `开始章节：${chapterName}`,
        weather_change: '天气发生了变化',
        route_complete: '完成了一段航线',
        objective_complete: '完成了一个目标',
        manual: '手动创建的检查点'
      };
      
      const success = this.saveGame(slotName);
      if (!success) return false;
      
      const checkpointInfo: CheckpointInfo = {
        id: checkpointId,
        type,
        name: checkpointNames[type],
        description: checkpointDescriptions[type],
        timestamp: now,
        chapterId,
        chapterName,
        playTime: state.playTime,
        slotName
      };
      
      this.addCheckpointMetadata(checkpointInfo);
      eventBus.emit('checkpoint:created', checkpointInfo);
      
      return true;
    } catch (error) {
      console.error('Failed to create checkpoint:', error);
      return false;
    }
  }
  
  private addCheckpointMetadata(checkpoint: CheckpointInfo): void {
    try {
      const metadata = this.getCheckpointMetadata();
      metadata.checkpoints.unshift(checkpoint);
      
      if (metadata.checkpoints.length > MAX_CHECKPOINTS) {
        const toRemove = metadata.checkpoints.splice(MAX_CHECKPOINTS);
        toRemove.forEach(cp => {
          const key = `${SAVE_KEY}_${cp.slotName}`;
          localStorage.removeItem(key);
        });
      }
      
      this.saveCheckpointMetadata(metadata);
    } catch (error) {
      console.error('Failed to add checkpoint metadata:', error);
    }
  }
  
  public getCheckpointMetadata(): CheckpointMetadata {
    try {
      const data = localStorage.getItem(CHECKPOINT_METADATA_KEY);
      if (data) {
        return JSON.parse(data);
      }
      return { checkpoints: [], maxCheckpoints: MAX_CHECKPOINTS };
    } catch (error) {
      console.error('Failed to load checkpoint metadata:', error);
      return { checkpoints: [], maxCheckpoints: MAX_CHECKPOINTS };
    }
  }
  
  public saveCheckpointMetadata(metadata: CheckpointMetadata): void {
    try {
      localStorage.setItem(CHECKPOINT_METADATA_KEY, JSON.stringify(metadata));
      eventBus.emit('checkpoints:updated', metadata);
    } catch (error) {
      console.error('Failed to save checkpoint metadata:', error);
    }
  }
  
  public getCheckpoints(): CheckpointInfo[] {
    return this.getCheckpointMetadata().checkpoints;
  }
  
  public getLatestCheckpoint(): CheckpointInfo | null {
    const checkpoints = this.getCheckpoints();
    return checkpoints.length > 0 ? checkpoints[0] : null;
  }
  
  public loadCheckpoint(checkpointId: string): SaveData | null {
    try {
      const metadata = this.getCheckpointMetadata();
      const checkpoint = metadata.checkpoints.find(cp => cp.id === checkpointId);
      if (!checkpoint) return null;
      
      const saveData = this.loadGame(checkpoint.slotName);
      if (saveData) {
        eventBus.emit('checkpoint:loaded', checkpoint);
      }
      return saveData;
    } catch (error) {
      console.error('Failed to load checkpoint:', error);
      return null;
    }
  }
  
  public rollbackToLastCheckpoint(): SaveData | null {
    const latest = this.getLatestCheckpoint();
    if (!latest) return null;
    return this.loadCheckpoint(latest.id);
  }
  
  public hasCheckpoints(): boolean {
    return this.getCheckpoints().length > 0;
  }
  
  public clearCheckpoints(): void {
    try {
      const metadata = this.getCheckpointMetadata();
      metadata.checkpoints.forEach(cp => {
        const key = `${SAVE_KEY}_${cp.slotName}`;
        localStorage.removeItem(key);
      });
      localStorage.removeItem(CHECKPOINT_METADATA_KEY);
      eventBus.emit('checkpoints:cleared');
    } catch (error) {
      console.error('Failed to clear checkpoints:', error);
    }
  }
  
  public quickSave(): boolean {
    try {
      const success = this.saveGame(QUICK_SAVE_KEY);
      if (success) {
        eventBus.emit('quicksave:created');
      }
      return success;
    } catch (error) {
      console.error('Failed to quick save:', error);
      return false;
    }
  }
  
  public quickLoad(): SaveData | null {
    try {
      const saveData = this.loadGame(QUICK_SAVE_KEY);
      if (saveData) {
        eventBus.emit('quickload:completed');
      }
      return saveData;
    } catch (error) {
      console.error('Failed to quick load:', error);
      return null;
    }
  }
  
  public hasQuickSave(): boolean {
    return this.hasSaveData(QUICK_SAVE_KEY);
  }
  
  public dispose(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
}
