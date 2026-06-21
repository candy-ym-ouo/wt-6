import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { WorldBroadcastEvent, BroadcastCategory, BroadcastPriority, BroadcastState, RewardGrantedEvent, RewardItem } from '../types';

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

const REWARD_ICONS: Record<string, string> = {
  gold: '💰',
  supplies: '📦',
  exp: '⭐',
  health: '❤️',
  star: '🌟',
  constellation: '✨',
  codex_entry: '📖',
  clue: '🔍',
  unlock_chapter: '🔓',
  chapter_unlock: '🔓',
  morale: '😊',
};

const REWARD_NAMES: Record<string, string> = {
  gold: '金币',
  supplies: '补给',
  exp: '经验',
  health: '船体修复',
  star: '星辰',
  constellation: '星座',
  codex_entry: '图鉴记录',
  clue: '线索',
  unlock_chapter: '章节解锁',
  chapter_unlock: '章节解锁',
  morale: '士气',
};

const WARNING_ICONS: Record<string, string> = {
  storm: '⛈️',
  fog: '🌫️',
  meteor: '☄️',
  clear: '☀️'
};

const SOURCE_TITLES: Record<string, string> = {
  task: '任务奖励',
  chapter_score: '章节评分奖励',
  achievement: '成就奖励',
  gathering: '采集奖励',
  ruins: '遗迹奖励',
  sea_event: '海事事件',
  trade: '交易',
  system: '系统奖励',
  level_up: '升级奖励',
  waypoint_exploration: '航点探索奖励',
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
  private activeWarningBroadcastId: string | null = null;

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

    eventBus.on('chapter:completed', (ctx: any) => {
      const chapter = ctx.chapter || ctx;
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

    eventBus.on('weather:warning:started', (data: any) => {
      const { warning } = data;
      const isSevere = warning.intensity >= 0.7;
      const icon = WARNING_ICONS[warning.type] || '⚠️';
      
      const event = this.broadcastWarning({
        warning,
        icon,
        isSevere
      });
      
      if (event) {
        this.activeWarningBroadcastId = event.id;
      }
    });

    eventBus.on('weather:warning:tick', (data: any) => {
      const { warning, remainingSeconds } = data;
      const isUrgent = remainingSeconds <= 5;
      
      eventBus.emit('ui:warning:update', {
        warning,
        remainingSeconds,
        isUrgent
      });
      
      if (this.activeWarningBroadcastId) {
        this.updateWarningBroadcast(this.activeWarningBroadcastId, warning, remainingSeconds);
      }
    });

    eventBus.on('weather:warning:ended', (data: any) => {
      const { warning } = data;
      eventBus.emit('ui:warning:ended', { warning });
      
      if (this.activeWarningBroadcastId) {
        this.dismissEvent(this.activeWarningBroadcastId);
        this.activeWarningBroadcastId = null;
      }
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

    eventBus.on('reward:granted', (event: RewardGrantedEvent) => {
      this.handleRewardGranted(event);
    });

    eventBus.on('crew:level_up', (member: any) => {
      if (member?.name && member?.level) {
        this.broadcast({
          category: 'system',
          priority: 'high',
          title: '船员升级',
          message: `🎉 ${member.name} 升级到 ${member.level} 级！`,
          icon: '⬆️',
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
  }): WorldBroadcastEvent {
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
    
    return event;
  }

  private broadcastWarning(options: {
    warning: any;
    icon: string;
    isSevere: boolean;
  }): WorldBroadcastEvent {
    const { warning, icon, isSevere } = options;
    const advice = this.getWarningAdvice(warning);
    const countdownText = this.formatCountdown(warning.totalWarningSeconds);
    
    const event = this.broadcast({
      category: 'weather',
      priority: isSevere ? 'critical' : 'high',
      title: `${icon} ${warning.name} 预警`,
      message: `倒计时：${countdownText}｜${advice}`,
      icon,
      duration: warning.totalWarningSeconds * 1000 + 2000,
      metadata: {
        type: 'weather_warning',
        warningId: warning.id,
        eventId: warning.eventId,
        intensity: warning.intensity,
        totalWarningSeconds: warning.totalWarningSeconds
      }
    });
    
    setTimeout(() => {
      const el = document.getElementById(`broadcast-${event.id}`);
      if (el) {
        el.classList.add('warning-broadcast');
        if (isSevere) {
          el.classList.add('warning-severe');
        }
      }
    }, 50);
    
    return event;
  }

  private updateWarningBroadcast(eventId: string, warning: any, remainingSeconds: number): void {
    const el = document.getElementById(`broadcast-${eventId}`);
    if (!el) return;
    
    const messageEl = el.querySelector('.broadcast-item-message');
    if (!messageEl) return;
    
    const advice = this.getWarningAdvice(warning);
    const countdownText = this.formatCountdown(remainingSeconds);
    messageEl.textContent = `倒计时：${countdownText}｜${advice}`;
    
    const isUrgent = remainingSeconds <= 5;
    const isWarning = remainingSeconds <= 10;
    
    el.classList.toggle('warning-urgent', isUrgent);
    el.classList.toggle('warning-warning', isWarning && !isUrgent);
  }

  private formatCountdown(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins > 0) {
      return `${mins}分${secs.toString().padStart(2, '0')}秒`;
    }
    return `${secs}秒`;
  }

  private handleRewardGranted(event: RewardGrantedEvent): void {
    if (!event.rewards || event.rewards.length === 0) return;

    const title = event.title || SOURCE_TITLES[event.source] || '获得奖励';
    const priority = event.priority || this.getRewardPriority(event);
    const message = this.formatRewardMessage(event.rewards);
    const icon = this.getRewardIcon(event.rewards);

    this.broadcast({
      category: 'reward',
      priority,
      title,
      message,
      icon,
      metadata: {
        source: event.source,
        sourceId: event.sourceId,
        sourceName: event.sourceName,
        rewards: event.rewards,
      },
    });
  }

  private getRewardPriority(event: RewardGrantedEvent): BroadcastPriority {
    if (event.priority) return event.priority;

    const hasRare = event.rewards.some(r => r.rarity === 'epic' || r.rarity === 'legendary');
    if (hasRare) return 'high';

    if (event.source === 'achievement' || event.source === 'chapter_score') return 'high';
    if (event.source === 'task') return 'normal';

    return 'normal';
  }

  private getRewardIcon(rewards: RewardItem[]): string {
    if (rewards.length === 0) return '🎁';
    const firstType = rewards[0].type;
    return REWARD_ICONS[firstType] || '🎁';
  }

  private formatRewardMessage(rewards: RewardItem[]): string {
    if (rewards.length === 0) return '';

    if (rewards.length === 1) {
      const r = rewards[0];
      const name = r.name || REWARD_NAMES[r.type] || r.type;
      const icon = REWARD_ICONS[r.type] || '🎁';
      const amountStr = r.amount > 1 ? ` x${r.amount}` : '';
      const rarityStr = r.rarity && r.rarity !== 'common' ? `（${this.getRarityName(r.rarity)}）` : '';
      return `${icon} ${name}${amountStr}${rarityStr}`;
    }

    const parts = rewards.slice(0, 3).map(r => {
      const icon = REWARD_ICONS[r.type] || '🎁';
      return `${icon}${r.amount}`;
    });

    if (rewards.length > 3) {
      parts.push(`...+${rewards.length - 3}`);
    }

    return parts.join('  ');
  }

  private getRarityName(rarity: string): string {
    const names: Record<string, string> = {
      common: '普通',
      uncommon: '优秀',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说',
    };
    return names[rarity] || rarity;
  }

  private getWarningAdvice(warning: any): string {
    const advices: Record<string, string[]> = {
      storm: [
        '建议寻找附近港口避风',
        '建议降低航速，谨慎航行',
        '建议检查船帆和索具',
        '建议提醒船员做好准备'
      ],
      fog: [
        '建议开启航行灯，使用雾号',
        '建议降低航速，增加瞭望',
        '建议使用星图和罗盘确认航向',
        '建议避免陌生海域'
      ],
      meteor: [
        '这是观测星辰的好时机！',
        '注意躲避陨石撞击',
        '可以尝试连接星座',
        '流星雨期间有特殊星象'
      ],
      clear: [
        '天气转晴，适合航行',
        '视野良好，可以观测星辰'
      ]
    };

    const typeAdvices = advices[warning.type] || advices.clear;
    const count = Math.min(2, Math.ceil(warning.intensity * typeAdvices.length));
    
    return typeAdvices.slice(0, count).join('；');
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
