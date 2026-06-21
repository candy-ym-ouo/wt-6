import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { VoyageLogEntry, VoyageLogCategory, VoyageLogFilter } from '../types';

const VOYAGE_LOG_KEY = 'celestial_voyage_log';
const MAX_ENTRIES = 2000;

export class VoyageLogModule {
  private static instance: VoyageLogModule;
  private stateManager: GameStateManager;
  private entries: VoyageLogEntry[] = [];

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
  }

  public static getInstance(): VoyageLogModule {
    if (!VoyageLogModule.instance) {
      VoyageLogModule.instance = new VoyageLogModule();
    }
    return VoyageLogModule.instance;
  }

  public initialize(): void {
    this.loadFromStorage();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('chapter:started', (chapter: any) => {
      this.addEntry({
        category: 'chapter',
        title: `启程：${chapter.name || '未知章节'}`,
        description: chapter.intro || chapter.description || '踏上了新的航程',
        chapterId: chapter.id || null,
        metadata: { chapterNumber: chapter.number, action: 'started' },
      });
    });

    eventBus.on('chapter:completed', (ctx: any) => {
      const chapter = ctx.chapter || ctx;
      this.addEntry({
        category: 'chapter',
        title: `完成：${chapter.name || '未知章节'}`,
        description: `成功完成了章节「${chapter.name || ''}」的所有目标`,
        chapterId: chapter.id || null,
        metadata: { chapterNumber: chapter.number, action: 'completed' },
      });
    });

    eventBus.on('chapter:unlocked', (chapter: any) => {
      this.addEntry({
        category: 'chapter',
        title: `解锁：${chapter.name || '新章节'}`,
        description: `新的航路已开启——「${chapter.name || ''}」`,
        chapterId: chapter.id || null,
        metadata: { chapterNumber: chapter.number, action: 'unlocked' },
      });
    });

    eventBus.on('star:discovered', (starId: string) => {
      this.addEntry({
        category: 'star',
        title: '发现新星',
        description: `在浩瀚星海中发现了一颗新的星辰：${starId}`,
        chapterId: this.stateManager.getState().currentChapterId,
        metadata: { starId, action: 'star_discovered' },
      });
    });

    eventBus.on('constellation:discovered', (constellationId: string) => {
      this.addEntry({
        category: 'star',
        title: '发现新星座',
        description: `星辰连线浮现——星座「${constellationId}」被揭示`,
        chapterId: this.stateManager.getState().currentChapterId,
        metadata: { constellationId, action: 'constellation_discovered' },
      });
    });

    eventBus.on('constellation:connect', (constellationId: string) => {
      this.addEntry({
        category: 'star',
        title: '星座连线',
        description: `成功连接星座「${constellationId}」的星图`,
        chapterId: this.stateManager.getState().currentChapterId,
        metadata: { constellationId, action: 'constellation_connected' },
      });
    });

    eventBus.on('weather:changed', (weather: any) => {
      if (weather === null) {
        this.addEntry({
          category: 'weather',
          title: '天气恢复',
          description: '风平浪静，天空重新放晴',
          chapterId: this.stateManager.getState().currentChapterId,
          metadata: { weatherType: 'clear', action: 'weather_cleared' },
        });
      } else {
        const typeMap: Record<string, string> = {
          storm: '暴风雨',
          fog: '浓雾',
          meteor: '流星雨',
          clear: '晴朗',
        };
        const typeName = typeMap[weather.id?.split('_')[0] || ''] || weather.name || '未知天气';
        this.addEntry({
          category: 'weather',
          title: `${typeName}来袭`,
          description: `遭遇${typeName}，强度：${weather.intensity?.toFixed(1) || '未知'}，持续约${weather.duration || '?'}秒`,
          chapterId: this.stateManager.getState().currentChapterId,
          metadata: {
            weatherId: weather.id,
            weatherName: weather.name,
            intensity: weather.intensity,
            duration: weather.duration,
            action: 'weather_started',
          },
        });
      }
    });

    eventBus.on('objective:completed', (objectiveId: string) => {
      this.addEntry({
        category: 'event',
        title: '目标达成',
        description: `成功完成了任务目标`,
        chapterId: this.stateManager.getState().currentChapterId,
        metadata: { objectiveId, action: 'objective_completed' },
      });
    });

    eventBus.on('route:completed', (routeId: string) => {
      this.addEntry({
        category: 'event',
        title: '航线完成',
        description: `顺利抵达了目的地`,
        chapterId: this.stateManager.getState().currentChapterId,
        metadata: { routeId, action: 'route_completed' },
      });
    });

    eventBus.on('point:visited', (pointId: string) => {
      this.addEntry({
        category: 'event',
        title: '抵达航点',
        description: `船只到达了新的航点`,
        chapterId: this.stateManager.getState().currentChapterId,
        metadata: { pointId, action: 'point_visited' },
      });
    });

    eventBus.on('ship:updated', (ship: any) => {
      if (ship.health !== undefined && ship.health <= 30 && ship.health > 0) {
        this.addEntry({
          category: 'event',
          title: '船只受损严重',
          description: `船体完整度降至 ${ship.health}%，急需修复！`,
          chapterId: this.stateManager.getState().currentChapterId,
          metadata: { health: ship.health, action: 'ship_critical' },
        });
      }
    });

    eventBus.on('state:reset', () => {
      this.clearEntries();
    });

    eventBus.on('progress:reset', () => {
      this.clearEntries();
    });
  }

  public addEntry(params: {
    category: VoyageLogCategory;
    title: string;
    description: string;
    chapterId: string | null;
    metadata?: Record<string, unknown>;
  }): VoyageLogEntry {
    const entry: VoyageLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      category: params.category,
      title: params.title,
      description: params.description,
      timestamp: Date.now(),
      chapterId: params.chapterId,
      metadata: params.metadata || {},
    };

    this.entries.push(entry);

    if (this.entries.length > MAX_ENTRIES) {
      this.entries = this.entries.slice(-MAX_ENTRIES);
    }

    this.saveToStorage();
    eventBus.emit('voyageLog:entryAdded', entry);

    return entry;
  }

  public getEntries(filter?: VoyageLogFilter): VoyageLogEntry[] {
    let result = [...this.entries];

    if (!filter) {
      return result;
    }

    if (filter.category) {
      result = result.filter(e => e.category === filter.category);
    }

    if (filter.chapterId) {
      result = result.filter(e => e.chapterId === filter.chapterId);
    }

    if (filter.startTime !== undefined) {
      result = result.filter(e => e.timestamp >= filter.startTime!);
    }

    if (filter.endTime !== undefined) {
      result = result.filter(e => e.timestamp <= filter.endTime!);
    }

    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      result = result.filter(
        e =>
          e.title.toLowerCase().includes(kw) ||
          e.description.toLowerCase().includes(kw)
      );
    }

    return result;
  }

  public getEntryById(id: string): VoyageLogEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  public getEntriesByCategory(category: VoyageLogCategory): VoyageLogEntry[] {
    return this.entries.filter(e => e.category === category);
  }

  public getEntriesByChapter(chapterId: string): VoyageLogEntry[] {
    return this.entries.filter(e => e.chapterId === chapterId);
  }

  public getRecentEntries(count: number = 20): VoyageLogEntry[] {
    return this.entries.slice(-count).reverse();
  }

  public getEntryCount(filter?: VoyageLogFilter): number {
    return this.getEntries(filter).length;
  }

  public getCategories(): VoyageLogCategory[] {
    return ['chapter', 'star', 'weather', 'event'];
  }

  public getCategoryLabel(category: VoyageLogCategory): string {
    const labels: Record<VoyageLogCategory, string> = {
      chapter: '章节推进',
      star: '星辰发现',
      weather: '天气经历',
      event: '关键事件',
    };
    return labels[category];
  }

  public getStats(): Record<VoyageLogCategory, number> {
    return {
      chapter: this.entries.filter(e => e.category === 'chapter').length,
      star: this.entries.filter(e => e.category === 'star').length,
      weather: this.entries.filter(e => e.category === 'weather').length,
      event: this.entries.filter(e => e.category === 'event').length,
    };
  }

  public searchEntries(keyword: string): VoyageLogEntry[] {
    return this.getEntries({ keyword });
  }

  public getEntriesInTimeRange(startTime: number, endTime: number): VoyageLogEntry[] {
    return this.getEntries({ startTime, endTime });
  }

  private saveToStorage(): void {
    try {
      const data = {
        version: '1.0.0',
        entries: this.entries,
        lastSaved: Date.now(),
      };
      localStorage.setItem(VOYAGE_LOG_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save voyage log:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(VOYAGE_LOG_KEY);
      if (!raw) {
        this.entries = [];
        return;
      }

      const data = JSON.parse(raw);
      if (data && Array.isArray(data.entries)) {
        this.entries = data.entries;
      } else {
        this.entries = [];
      }
    } catch (error) {
      console.error('Failed to load voyage log:', error);
      this.entries = [];
    }
  }

  public clearEntries(): void {
    this.entries = [];
    this.saveToStorage();
    eventBus.emit('voyageLog:cleared');
  }

  public exportLog(): string {
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: Date.now(),
      totalEntries: this.entries.length,
      entries: this.entries,
    }, null, 2);
  }

  public importLog(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data && Array.isArray(data.entries)) {
        this.entries = data.entries;
        this.saveToStorage();
        eventBus.emit('voyageLog:imported', { count: this.entries.length });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to import voyage log:', error);
      return false;
    }
  }

  public resetState(): void {
    this.clearEntries();
  }

  public dispose(): void {
    this.saveToStorage();
    this.entries = [];
  }
}
