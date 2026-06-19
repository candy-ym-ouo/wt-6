import { GameState, GameSettings } from '../types';
import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';

const SAVE_KEY = 'celestial_voyage_save';
const AUTO_SAVE_INTERVAL = 30000;

export interface SaveData {
  version: string;
  timestamp: number;
  state: Partial<GameState>;
}

export class SaveModule {
  private static instance: SaveModule;
  private stateManager: GameStateManager;
  private autoSaveTimer: number | null = null;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
  }

  public static getInstance(): SaveModule {
    if (!SaveModule.instance) {
      SaveModule.instance = new SaveModule();
    }
    return SaveModule.instance;
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

  public saveGame(slotName: string = 'default'): boolean {
    try {
      const state = this.stateManager.getState();
      const saveData: SaveData = {
        version: '1.0.0',
        timestamp: Date.now(),
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
          ship: state.ship,
          crew: state.crew,
          activeCrewBonuses: state.activeCrewBonuses,
          trade: state.trade,
          achievements: state.achievements,
          codex: state.codex,
        }
      };
      
      const key = `${SAVE_KEY}_${slotName}`;
      localStorage.setItem(key, JSON.stringify(saveData));
      
      eventBus.emit('save:completed', { slotName, timestamp: saveData.timestamp });
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      eventBus.emit('save:error', error);
      return false;
    }
  }

  private autoSave(): void {
    this.saveGame('autosave');
  }

  public loadGame(slotName: string = 'default'): boolean {
    try {
      const key = `${SAVE_KEY}_${slotName}`;
      const saveDataStr = localStorage.getItem(key);
      
      if (!saveDataStr) {
        eventBus.emit('load:empty', { slotName });
        return false;
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
      
      eventBus.emit('load:completed', { slotName, saveData });
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      eventBus.emit('load:error', error);
      return false;
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
      const key = `${SAVE_KEY}_${slotName}`;
      localStorage.removeItem(key);
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
