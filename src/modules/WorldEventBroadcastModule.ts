import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { WorldBroadcastEvent, BroadcastCategory, BroadcastPriority, BroadcastState } from '../types';

const MAX_VISIBLE = 5;
const DEFAULT_DURATION: Record<BroadcastCategory, number> = {
  chapter: 6000,
  weather: 5000,
  task: 4500,
  reward: 5000,
  achievement: 7000,
  system: 3000,
};

const PRIORITY_ORDER: Record<BroadcastPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

const CATEGORY_CONFIG: Record<BroadcastCategory, { icon: string; color: string; label: string }> = {
  chapter: { icon: '📖', color: '#3498db', label: '章节' },
  weather: { icon: '⛈', color: '#9b59b6', label: '天气' },
  task: { icon: '📋', color: '#f39c12', label: '任务' },
  reward: { icon: '🎁', color: '#2ecc71', label: '奖励' },
  achievement: { icon: '🏆', color: '#e67e22', label: '成就' },
  system: { icon: '📢', color: '#95a5a6', label: '系统' },
};

export class WorldEventBroadcastModule {
  private static instance: WorldEventBroadcastModule;
  private stateManager: GameStateManager;
  private queue: WorldBroadcastEvent[] = [];
  private visibleEvents: WorldBroadcastEvent[] = [];
  private timers: Map<string, number> = new Map();
  private container: HTMLElement | null = null;
  private historyPanelOpen: boolean = false;
  private state: BroadcastState = {
    history: [],
    maxHistory: 100,
  };
  private isInitialized: boolean = false;
  private eventIdCounter: number = 0;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
  }

  public static getInstance(): WorldEventBroadcastModule {
    if (!WorldEventBroadcastModule.instance) {
      WorldEventBroadcastModule.instance = new WorldEventBroadcastModule();
    }
    return WorldEventBroadcastModule.instance;
  }

  public initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.createContainer();
    this.setupEventListeners();
  }

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.className = 'broadcast-center';
    this.container.id = 'broadcast-center';

    const header = document.createElement('div');
    header.className = 'broadcast-center-header';
    header.innerHTML = `
      <span class="broadcast-center-icon">📢</span>
      <span class="broadcast-center-title">世界播报</span>
      <span class="broadcast-center-count" id="broadcast-count">0</span>
      <span class="broadcast-center-toggle">▶</span>
    `;

    header.addEventListener('click', () => {
      this.toggleHistoryPanel();
      eventBus.emit('sound:play', 'button_click');
    });

    const feed = document.createElement('div');
    feed.className = 'broadcast-feed';
    feed.id = 'broadcast-feed';

    this.container.appendChild(header);
    this.container.appendChild(feed);

    const uiLayer = document.getElementById('ui-layer');
    if (uiLayer) {
      uiLayer.appendChild(this.container);
    }
  }

  private toggleHistoryPanel(): void {
    this.historyPanelOpen = !this.historyPanelOpen;
    const toggle = this.container?.querySelector('.broadcast-center-toggle');
    if (toggle) {
      toggle.textContent = this.historyPanelOpen ? '▼' : '▶';
    }

    if (this.historyPanelOpen) {
      this.renderHistoryPanel();
    } else {
      document.getElementById('broadcast-history-panel')?.remove();
    }
  }

  private renderHistoryPanel(): void {
    document.getElementById('broadcast-history-panel')?.remove();

    const panel = document.createElement('div');
    panel.id = 'broadcast-history-panel';
    panel.className = 'broadcast-history-panel';

    const categories: BroadcastCategory[] = ['chapter', 'weather', 'task', 'reward', 'achievement', 'system'];
    const tabsHtml = categories.map(cat => {
      const config = CATEGORY_CONFIG[cat];
      const count = this.state.history.filter(e => e.category === cat).length;
      return `<button class="broadcast-history-tab" data-category="${cat}">
        ${config.icon} ${config.label} <span class="broadcast-tab-count">${count}</span>
      </button>`;
    }).join('');

    const entriesHtml = [...this.state.history].reverse().slice(0, 50).map(event => {
      const config = CATEGORY_CONFIG[event.category];
      const time = new Date(event.timestamp);
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
      return `
        <div class="broadcast-history-entry category-${event.category}">
          <div class="broadcast-history-entry-header">
            <span class="broadcast-history-entry-icon">${event.icon}</span>
            <span class="broadcast-history-entry-title">${event.title}</span>
            <span class="broadcast-history-entry-time">${timeStr}</span>
          </div>
          <div class="broadcast-history-entry-message">${event.message}</div>
        </div>
      `;
    }).join('');

    panel.innerHTML = `
      <div class="broadcast-history-tabs">
        <button class="broadcast-history-tab active" data-category="all">全部 <span class="broadcast-tab-count">${this.state.history.length}</span></button>
        ${tabsHtml}
      </div>
      <div class="broadcast-history-list" id="broadcast-history-list">
        ${entriesHtml || '<div class="broadcast-history-empty">暂无播报记录</div>'}
      </div>
    `;

    this.container?.appendChild(panel);

    panel.querySelectorAll('.broadcast-history-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const category = (e.currentTarget as HTMLElement).dataset.category as string;
        panel.querySelectorAll('.broadcast-history-tab').forEach(t => t.classList.remove('active'));
        (e.currentTarget as HTMLElement).classList.add('active');
        this.filterHistory(category);
        eventBus.emit('sound:play', 'button_click');
      });
    });
  }

  private filterHistory(category: string): void {
    const list = document.getElementById('broadcast-history-list');
    if (!list) return;

    const filtered = category === 'all'
      ? [...this.state.history].reverse().slice(0, 50)
      : this.state.history.filter(e => e.category === category).reverse().slice(0, 50);

    if (filtered.length === 0) {
      list.innerHTML = '<div class="broadcast-history-empty">暂无播报记录</div>';
      return;
    }

    list.innerHTML = filtered.map(event => {
      const time = new Date(event.timestamp);
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
      return `
        <div class="broadcast-history-entry category-${event.category}">
          <div class="broadcast-history-entry-header">
            <span class="broadcast-history-entry-icon">${event.icon}</span>
            <span class="broadcast-history-entry-title">${event.title}</span>
            <span class="broadcast-history-entry-time">${timeStr}</span>
          </div>
          <div class="broadcast-history-entry-message">${event.message}</div>
        </div>
      `;
    }).join('');
  }

  private setupEventListeners(): void {
    eventBus.on('chapter:started', (chapter: any) => {
      if (chapter?.name) {
        this.broadcast({
          category: 'chapter',
          priority: 'high',
          title: '章节开始',
          message: `进入《${chapter.name}》`,
          icon: '📖',
        });
      }
    });

    eventBus.on('chapter:completed', (chapter: any) => {
      if (chapter?.name) {
        this.broadcast({
          category: 'chapter',
          priority: 'critical',
          title: '章节完成',
          message: `《${chapter.name}》已完成！`,
          icon: '⭐',
        });
      }
    });

    eventBus.on('chapter:unlocked', (chapter: any) => {
      if (chapter?.name) {
        this.broadcast({
          category: 'chapter',
          priority: 'high',
          title: '新章节解锁',
          message: `解锁了《${chapter.name}》`,
          icon: '🔓',
        });
      }
    });

    eventBus.on('weather:changed', (weather: any) => {
      if (weather) {
        const isSevere = weather.intensity >= 0.7;
        this.broadcast({
          category: 'weather',
          priority: isSevere ? 'critical' : 'high',
          title: isSevere ? '⚠️ 天气预警' : '天气变化',
          message: `${weather.name} 来袭！强度：${Math.round(weather.intensity * 100)}%`,
          icon: isSevere ? '⛈' : '🌤',
        });
      } else {
        this.broadcast({
          category: 'weather',
          priority: 'normal',
          title: '天气恢复',
          message: '天气已恢复正常，继续航行',
          icon: '☀️',
        });
      }
    });

    eventBus.on('objective:completed', (objectiveId: string) => {
      this.broadcast({
        category: 'task',
        priority: 'high',
        title: '目标完成',
        message: '一个航行目标已完成',
        icon: '✅',
      });
    });

    eventBus.on('task:accepted', (task: any) => {
      if (task?.name) {
        const priority: BroadcastPriority = task.priority === 'high' ? 'high' : task.priority === 'medium' ? 'normal' : 'low';
        this.broadcast({
          category: 'task',
          priority,
          title: '新任务',
          message: `接受任务：${task.name}`,
          icon: '📋',
        });
      }
    });

    eventBus.on('task:completed', (task: any) => {
      if (task?.name) {
        this.broadcast({
          category: 'task',
          priority: 'high',
          title: '任务完成',
          message: `完成任务：${task.name}`,
          icon: '🎉',
        });
      }
    });

    eventBus.on('task:expired', (taskId: string) => {
      this.broadcast({
        category: 'task',
        priority: 'normal',
        title: '任务过期',
        message: '一个任务已过期',
        icon: '⏰',
      });
    });

    eventBus.on('achievement:unlocked', (data: any) => {
      if (data?.achievement?.name) {
        const rarity = data.achievement.rarity || 'common';
        const priority: BroadcastPriority = rarity === 'legendary' ? 'critical' : rarity === 'epic' ? 'high' : 'normal';
        this.broadcast({
          category: 'achievement',
          priority,
          title: '成就解锁',
          message: `${data.achievement.name}`,
          icon: '🏆',
          metadata: { rarity, achievementId: data.achievement.id },
        });
      }
    });

    eventBus.on('star:discovered', () => {
      this.broadcast({
        category: 'reward',
        priority: 'low',
        title: '星辰发现',
        message: '发现了一颗新的星辰',
        icon: '⭐',
      });
    });

    eventBus.on('constellation:discovered', () => {
      this.broadcast({
        category: 'reward',
        priority: 'normal',
        title: '星座发现',
        message: '发现了一个新的星座',
        icon: '✨',
      });
    });

    eventBus.on('port:available', (port: any) => {
      if (port?.name) {
        this.broadcast({
          category: 'system',
          priority: 'normal',
          title: '到达港口',
          message: `发现港口：${port.name}`,
          icon: '🏪',
        });
      }
    });

    eventBus.on('meteor:hit', () => {
      this.broadcast({
        category: 'weather',
        priority: 'critical',
        title: '⚠️ 流星撞击',
        message: '流星击中了甲板！船体受损',
        icon: '☄️',
      });
    });

    eventBus.on('world:broadcast', (data: any) => {
      if (data) {
        this.broadcast({
          category: data.category || 'system',
          priority: data.priority || 'normal',
          title: data.title || '播报',
          message: data.message || '',
          icon: data.icon || '📢',
          duration: data.duration,
          metadata: data.metadata,
        });
      }
    });

    eventBus.on('screen:changed', (screen: string) => {
      if (screen === 'game') {
        this.show();
      } else {
        this.hide();
      }
    });

    eventBus.on('progress:reset', () => {
      this.reset();
    });
  }

  public broadcast(options: {
    category: BroadcastCategory;
    priority: BroadcastPriority;
    title: string;
    message: string;
    icon: string;
    duration?: number;
    metadata?: Record<string, unknown>;
  }): void {
    const event: WorldBroadcastEvent = {
      id: `broadcast_${Date.now()}_${this.eventIdCounter++}`,
      category: options.category,
      priority: options.priority,
      title: options.title,
      message: options.message,
      icon: options.icon,
      timestamp: Date.now(),
      duration: options.duration ?? DEFAULT_DURATION[options.category],
      metadata: options.metadata,
    };

    this.queue.push(event);
    this.queue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);

    this.state.history.push(event);
    if (this.state.history.length > this.state.maxHistory) {
      this.state.history = this.state.history.slice(-this.state.maxHistory);
    }

    this.updateCount();
    this.processQueue();
  }

  private processQueue(): void {
    while (this.visibleEvents.length < MAX_VISIBLE && this.queue.length > 0) {
      const event = this.queue.shift()!;
      this.visibleEvents.push(event);
      this.renderEvent(event);
      this.startTimer(event);
    }
  }

  private renderEvent(event: WorldBroadcastEvent): void {
    const feed = document.getElementById('broadcast-feed');
    if (!feed) return;

    const config = CATEGORY_CONFIG[event.category];
    const el = document.createElement('div');
    el.className = `broadcast-item category-${event.category} priority-${event.priority}`;
    el.id = `broadcast-${event.id}`;

    el.innerHTML = `
      <div class="broadcast-item-accent" style="background: ${config.color}"></div>
      <div class="broadcast-item-icon">${event.icon}</div>
      <div class="broadcast-item-content">
        <div class="broadcast-item-header">
          <span class="broadcast-item-title">${event.title}</span>
          <span class="broadcast-item-badge" style="background: ${config.color}20; color: ${config.color}; border-color: ${config.color}40">${config.label}</span>
        </div>
        <div class="broadcast-item-message">${event.message}</div>
      </div>
      <button class="broadcast-item-close" data-id="${event.id}">×</button>
    `;

    el.querySelector('.broadcast-item-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.dismissEvent(event.id);
    });

    feed.appendChild(el);

    requestAnimationFrame(() => {
      el.classList.add('broadcast-item-visible');
    });
  }

  private startTimer(event: WorldBroadcastEvent): void {
    const timer = window.setTimeout(() => {
      this.dismissEvent(event.id);
    }, event.duration);
    this.timers.set(event.id, timer);
  }

  private dismissEvent(eventId: string): void {
    const timer = this.timers.get(eventId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(eventId);
    }

    this.visibleEvents = this.visibleEvents.filter(e => e.id !== eventId);
    this.queue = this.queue.filter(e => e.id !== eventId);

    const el = document.getElementById(`broadcast-${eventId}`);
    if (el) {
      el.classList.add('broadcast-item-dismiss');
      setTimeout(() => el.remove(), 400);
    }

    this.updateCount();

    setTimeout(() => this.processQueue(), 450);
  }

  private updateCount(): void {
    const countEl = document.getElementById('broadcast-count');
    if (countEl) {
      const total = this.state.history.length;
      countEl.textContent = total > 99 ? '99+' : String(total);
      countEl.style.display = total > 0 ? 'inline-flex' : 'none';
    }
  }

  public show(): void {
    if (this.container) {
      this.container.style.display = '';
    }
  }

  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  private reset(): void {
    this.visibleEvents.forEach(e => {
      const timer = this.timers.get(e.id);
      if (timer) clearTimeout(timer);
    });
    this.timers.clear();
    this.visibleEvents = [];
    this.queue = [];
    this.state = { history: [], maxHistory: 100 };

    const feed = document.getElementById('broadcast-feed');
    if (feed) feed.innerHTML = '';

    this.updateCount();

    document.getElementById('broadcast-history-panel')?.remove();
    this.historyPanelOpen = false;
  }

  public getHistory(category?: BroadcastCategory): WorldBroadcastEvent[] {
    if (category) {
      return this.state.history.filter(e => e.category === category);
    }
    return [...this.state.history];
  }

  public getVisibleEvents(): WorldBroadcastEvent[] {
    return [...this.visibleEvents];
  }

  public dispose(): void {
    this.reset();
    this.container?.remove();
    this.container = null;
    this.isInitialized = false;
  }
}
