import { GameState, GameSettings, DialogueState, DayNightCycleState, TaskState, ShipDamageState, SeaEventState, SaveSlotInfo, SaveSlotsMetadata, Chapter } from '../types';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';

const SAVE_KEY = 'celestial_voyage_save';
const SAVE_METADATA_KEY = 'celestial_voyage_save_metadata';
const AUTO_SAVE_INTERVAL = 30000;
const MAX_SAVE_SLOTS = 10;

export interface SaveData {
  version: string;
  timestamp: number;
  state: Partial<GameState>;
  dialogueState?: DialogueState;
  dayNightState?: DayNightCycleState;
  taskState?: TaskState;
  shipDamageState?: ShipDamageState;
  seaEventState?: SeaEventState;
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

  public initialize(): void {
    this.startAutoSave();
    
    eventBus.on('chapter:completed', () => this.saveGame());
    eventBus.on('objective:completed', () => this.autoSave());
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
        },
        dialogueState: ds,
        dayNightState: dns,
        taskState: ts,
        shipDamageState: sds,
        seaEventState: ses,
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

  public dispose(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
}
