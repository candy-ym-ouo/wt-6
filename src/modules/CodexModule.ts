import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { chapters } from '../data/chapters';
import { CodexEntry, CodexCategory, CodexState, Star, Constellation, RoutePoint, Chapter } from '../types';

export class CodexModule {
  private static instance: CodexModule;
  private stateManager: GameStateManager;
  private isInitialized: boolean = false;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
  }

  public static getInstance(): CodexModule {
    if (!CodexModule.instance) {
      CodexModule.instance = new CodexModule();
    }
    return CodexModule.instance;
  }

  public initialize(): void {
    this.initializeCodex();
    
    if (!this.isInitialized) {
      this.setupEventListeners();
      this.isInitialized = true;
    }
    
    this.syncCodexWithState();
  }

  private initializeCodex(): void {
    const state = this.stateManager.getState();
    
    if (!state.codex || Object.keys(state.codex.entries).length === 0) {
      const entries: Record<string, CodexEntry> = {};
      
      chapters.forEach(chapter => {
        entries[chapter.id] = this.createChapterEntry(chapter);
        
        chapter.stars.forEach(star => {
          entries[star.id] = this.createStarEntry(star, chapter.id);
        });
        
        chapter.constellations.forEach(constellation => {
          entries[constellation.id] = this.createConstellationEntry(constellation, chapter.id);
        });
        
        chapter.routePoints.forEach(point => {
          entries[point.id] = this.createWaypointEntry(point, chapter.id);
        });
      });

      const initialDiscovered = Object.values(entries).filter(e => e.discovered).length;

      this.stateManager.setState({
        codex: {
          entries,
          totalDiscovered: initialDiscovered,
          totalEntries: Object.keys(entries).length
        }
      });
    }
  }

  private syncCodexWithState(): void {
    const state = this.stateManager.getState();
    const codexState = state.codex;
    
    if (!codexState) return;

    let discoveredCount = 0;
    const entries = { ...codexState.entries };

    state.discoveredStars.forEach(starId => {
      if (entries[starId] && !entries[starId].discovered) {
        entries[starId] = { ...entries[starId], discovered: true, discoveredAt: Date.now() };
      }
    });

    state.discoveredConstellations.forEach(constellationId => {
      if (entries[constellationId] && !entries[constellationId].discovered) {
        entries[constellationId] = { ...entries[constellationId], discovered: true, discoveredAt: Date.now() };
      }
    });

    state.visitedPoints.forEach(pointId => {
      if (entries[pointId] && !entries[pointId].discovered) {
        entries[pointId] = { ...entries[pointId], discovered: true, discoveredAt: Date.now() };
      }
    });

    const unlockedChapters = chapters.filter(ch => ch.unlocked);
    unlockedChapters.forEach(chapter => {
      if (entries[chapter.id] && !entries[chapter.id].discovered) {
        entries[chapter.id] = { ...entries[chapter.id], discovered: true, discoveredAt: Date.now() };
      }
    });

    discoveredCount = Object.values(entries).filter(e => e.discovered).length;

    if (discoveredCount !== codexState.totalDiscovered) {
      this.stateManager.setState({
        codex: {
          ...codexState,
          entries,
          totalDiscovered: discoveredCount
        }
      });
    }
  }

  private createStarEntry(star: Star, chapterId: string): CodexEntry {
    return {
      id: star.id,
      category: 'stars',
      name: star.name,
      description: `一颗位于${this.getConstellationName(star.constellationId, chapterId) || '未知星域'}的星辰。${this.getStarDescription(star)}`,
      discovered: false,
      chapterId,
      metadata: {
        position: star.position,
        size: star.size,
        color: star.color,
        brightness: star.brightness,
        constellationId: star.constellationId
      }
    };
  }

  private createConstellationEntry(constellation: Constellation, chapterId: string): CodexEntry {
    return {
      id: constellation.id,
      category: 'constellations',
      name: constellation.name,
      description: constellation.description,
      discovered: false,
      chapterId,
      metadata: {
        stars: constellation.stars,
        connections: constellation.connections,
        starCount: constellation.stars.length
      }
    };
  }

  private createWaypointEntry(point: RoutePoint, chapterId: string): CodexEntry {
    return {
      id: point.id,
      category: 'waypoints',
      name: point.name,
      description: `一个${this.getWaypointTypeDescription(point.type)}。位于海域的重要位置。`,
      discovered: false,
      chapterId,
      metadata: {
        type: point.type,
        position: point.position
      }
    };
  }

  private createChapterEntry(chapter: Chapter): CodexEntry {
    return {
      id: chapter.id,
      category: 'chapters',
      name: `第${chapter.number}章：${chapter.name}`,
      description: chapter.description,
      discovered: chapter.unlocked,
      metadata: {
        number: chapter.number,
        intro: chapter.intro,
        starCount: chapter.stars.length,
        constellationCount: chapter.constellations.length,
        waypointCount: chapter.routePoints.length
      }
    };
  }

  private getConstellationName(constellationId: string | undefined, chapterId: string): string | null {
    if (!constellationId) return null;
    const chapter = chapters.find(c => c.id === chapterId);
    const constellation = chapter?.constellations.find(c => c.id === constellationId);
    return constellation?.name || null;
  }

  private getStarDescription(star: Star): string {
    const brightnessDesc = star.brightness >= 0.9 ? '极其明亮' : 
                           star.brightness >= 0.7 ? '较为明亮' : 
                           star.brightness >= 0.5 ? '亮度适中' : '略显暗淡';
    return `${brightnessDesc}，呈现出${star.color}的光芒。`;
  }

  private getWaypointTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      'start': '起始港口',
      'waypoint': '航路点',
      'landmark': '标志性地点',
      'end': '目的地港口'
    };
    return descriptions[type] || '未知地点';
  }

  private setupEventListeners(): void {
    eventBus.on('star:discovered', (starId: string) => {
      this.discoverEntry(starId);
    });

    eventBus.on('constellation:discovered', (constellationId: string) => {
      this.discoverEntry(constellationId);
    });

    eventBus.on('point:visited', (pointId: string) => {
      this.discoverEntry(pointId);
    });

    eventBus.on('chapter:started', (chapter: any) => {
      if (chapter?.id) {
        this.discoverEntry(chapter.id);
      }
    });

    eventBus.on('chapter:unlock', (chapterId: string) => {
      this.discoverEntry(chapterId);
    });

    eventBus.on('progress:reset', () => {
      this.resetCodex();
    });
  }

  private discoverEntry(entryId: string): void {
    const state = this.stateManager.getState();
    const codexState = state.codex;
    
    if (!codexState) return;

    const entry = codexState.entries[entryId];
    if (!entry || entry.discovered) return;

    entry.discovered = true;
    entry.discoveredAt = Date.now();
    codexState.totalDiscovered++;

    codexState.entries[entryId] = { ...entry };

    this.stateManager.setState({
      codex: { ...codexState }
    });

    eventBus.emit('codex:entryDiscovered', {
      entry,
      discoveredAt: entry.discoveredAt
    });
  }

  public getCodexState(): CodexState | undefined {
    return this.stateManager.getState().codex;
  }

  public getEntriesByCategory(category: CodexCategory): CodexEntry[] {
    const state = this.stateManager.getState();
    const codexState = state.codex;
    
    if (!codexState) return [];

    return Object.values(codexState.entries)
      .filter(entry => entry.category === category)
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  public getEntryById(entryId: string): CodexEntry | undefined {
    const state = this.stateManager.getState();
    return state.codex?.entries[entryId];
  }

  public getChapterEntries(chapterId: string): CodexEntry[] {
    const state = this.stateManager.getState();
    const codexState = state.codex;
    
    if (!codexState) return [];

    return Object.values(codexState.entries)
      .filter(entry => entry.chapterId === chapterId);
  }

  public getOverallProgress(): { discovered: number; total: number; percentage: number } {
    const state = this.stateManager.getState();
    const codexState = state.codex;
    
    if (!codexState) {
      return { discovered: 0, total: 0, percentage: 0 };
    }

    return {
      discovered: codexState.totalDiscovered,
      total: codexState.totalEntries,
      percentage: codexState.totalEntries > 0 
        ? Math.round((codexState.totalDiscovered / codexState.totalEntries) * 100) 
        : 0
    };
  }

  public getCategoryProgress(category: CodexCategory): { discovered: number; total: number; percentage: number } {
    const entries = this.getEntriesByCategory(category);
    const discovered = entries.filter(e => e.discovered).length;
    const total = entries.length;

    return {
      discovered,
      total,
      percentage: total > 0 ? Math.round((discovered / total) * 100) : 0
    };
  }

  public resetCodex(): void {
    const state = this.stateManager.getState();
    if (state.codex) {
      const entries = { ...state.codex.entries };
      
      Object.values(entries).forEach(entry => {
        if (entry.category === 'chapters') {
          const chapter = chapters.find(ch => ch.id === entry.id);
          entries[entry.id] = {
            ...entry,
            discovered: chapter?.unlocked || false,
            discoveredAt: chapter?.unlocked ? Date.now() : undefined
          };
        } else {
          entries[entry.id] = {
            ...entry,
            discovered: false,
            discoveredAt: undefined
          };
        }
      });
      
      const initialDiscovered = Object.values(entries).filter(e => e.discovered).length;
      
      this.stateManager.setState({
        codex: {
          entries,
          totalDiscovered: initialDiscovered,
          totalEntries: Object.keys(entries).length
        }
      });
    }
  }

  public dispose(): void {
  }
}
