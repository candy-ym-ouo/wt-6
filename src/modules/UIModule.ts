import { GameStateManager } from '../core/GameStateManager';
import { ChapterModule } from './ChapterModule';
import { CrewModule } from './CrewModule';
import { TradeModule } from './TradeModule';
import { eventBus } from '../utils/EventBus';
import {
  GameScreen,
  Objective,
  Chapter,
  ShipState,
  GameSettings,
  CrewMember,
  CrewRole,
  CrewRecruitCandidate,
  PortTradeItem,
  Port,
  TradeItem
} from '../types';

export class UIModule {
  private stateManager: GameStateManager;
  private chapterModule: ChapterModule | null = null;
  private crewModule: CrewModule;
  private tradeModule: TradeModule;
  private uiLayer: HTMLElement;
  private currentScreen: GameScreen = 'menu';
  private toastTimer: number | null = null;
  private crewPanelOpen: boolean = false;
  private tradePanelOpen: boolean = false;

  constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.crewModule = CrewModule.getInstance();
    this.tradeModule = TradeModule.getInstance();
    this.uiLayer = document.getElementById('ui-layer')!;
    
    this.setupEventListeners();
  }

  public setChapterModule(chapterModule: ChapterModule): void {
    this.chapterModule = chapterModule;
  }

  public setTradeModule(tradeModule: TradeModule): void {
    this.tradeModule = tradeModule;
  }

  private setupEventListeners(): void {
    eventBus.on('toast:show', this.showToast.bind(this));
    eventBus.on('chapter:started', this.onChapterStarted.bind(this));
    eventBus.on('chapter:completed', this.onChapterCompleted.bind(this));
    eventBus.on('objectives:updated', this.updateObjectives.bind(this));
    eventBus.on('ship:updated', this.updateShipHUD.bind(this));
    eventBus.on('weather:changed', this.updateWeatherHUD.bind(this));
    eventBus.on('state:changed', this.updateHUD.bind(this));
    eventBus.on('crew:updated', () => this.updateCrewHUD());
    eventBus.on('crew:bonuses_updated', () => this.updateCrewHUD());
    eventBus.on('port:available', this.onPortAvailable.bind(this));
    eventBus.on('port:opened', this.onPortOpened.bind(this));
    eventBus.on('port:closed', this.onPortClosed.bind(this));
    eventBus.on('port:prices_updated', this.onPortPricesUpdated.bind(this));
    eventBus.on('trade:updated', () => {
      if (this.tradePanelOpen) {
        this.renderTradePanel();
      }
    });
  }

  public showScreen(screen: GameScreen): void {
    this.currentScreen = screen;
    this.uiLayer.innerHTML = '';
    
    switch (screen) {
      case 'menu':
        this.renderMainMenu();
        break;
      case 'chapterSelect':
        this.renderChapterSelect();
        break;
      case 'game':
        this.renderGameUI();
        break;
      case 'settings':
        this.renderSettings();
        break;
      case 'dialog':
        break;
    }
  }

  private renderMainMenu(): void {
    const menu = document.createElement('div');
    menu.className = 'menu-screen';
    menu.innerHTML = `
      <h1 class="game-title">观星航路</h1>
      <p class="game-subtitle">CELESTIAL VOYAGE</p>
      <div class="menu-buttons">
        <button class="menu-btn" data-action="newGame">开始新航程</button>
        <button class="menu-btn" data-action="continue">继续航程</button>
        <button class="menu-btn" data-action="chapterSelect">选择章节</button>
        <button class="menu-btn" data-action="settings">设置</button>
      </div>
      <p style="margin-top: 2rem; color: #888; font-size: 0.8rem;">
        古地图观星航路 · 点击星辰 · 连接星座 · 探索未知
      </p>
    `;
    
    this.uiLayer.appendChild(menu);
    
    menu.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).dataset.action;
        eventBus.emit('menu:action', action);
        eventBus.emit('sound:play', 'button_click');
      });
    });
    
    eventBus.emit('music:play', 'menu');
  }

  private renderChapterSelect(): void {
    const chapters = this.chapterModule?.getChapters() || [];
    
    const menu = document.createElement('div');
    menu.className = 'menu-screen';
    menu.innerHTML = `
      <h2 style="color: #ffd700; margin-bottom: 1rem; letter-spacing: 0.3em;">选择章节</h2>
      <div class="chapter-select">
        ${chapters.map(chapter => `
          <div class="chapter-card ${!chapter.unlocked ? 'locked' : ''}" data-chapter-id="${chapter.id}">
            <div class="chapter-status">
              ${chapter.completed ? '⭐' : chapter.unlocked ? '⚓' : '🔒'}
            </div>
            <div class="chapter-number">第 ${chapter.number} 章</div>
            <div class="chapter-name">${chapter.name}</div>
            <div class="chapter-desc">${chapter.description}</div>
          </div>
        `).join('')}
      </div>
      <button class="menu-btn" style="margin-top: 2rem;" data-action="back">返回主菜单</button>
    `;
    
    this.uiLayer.appendChild(menu);
    
    menu.querySelectorAll('.chapter-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const chapterId = (e.currentTarget as HTMLElement).dataset.chapterId;
        const chapter = chapters.find(c => c.id === chapterId);
        
        if (chapter?.unlocked) {
          eventBus.emit('chapter:start', chapterId);
          eventBus.emit('sound:play', 'button_click');
        } else {
          this.showToast('章节未解锁，请先完成前置章节');
        }
      });
    });
    
    menu.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.showScreen('menu');
      eventBus.emit('sound:play', 'button_click');
    });
  }

  private renderGameUI(): void {
    const gameUI = document.createElement('div');
    gameUI.innerHTML = `
      <div class="hud">
        <div class="hud-left">
          <div class="hud-item">
            <span class="hud-label">章节:</span>
            <span class="hud-value" id="hud-chapter">-</span>
          </div>
          <div class="hud-item">
            <span class="hud-label">航速:</span>
            <span class="hud-value" id="hud-speed">0</span> 节
          </div>
          <div class="hud-item">
            <span class="hud-label">天气:</span>
            <span class="hud-value" id="hud-weather">晴朗</span>
          </div>
          <div class="hud-item" id="hud-crew-item" style="display: none;">
            <span class="hud-label">船员:</span>
            <span class="hud-value" id="hud-crew">0/0</span>
          </div>
          <div class="hud-item" id="hud-gold-item" style="display: none;">
            <span class="hud-label">💰</span>
            <span class="hud-value" id="hud-gold">0</span>
          </div>
        </div>
        <div class="hud-right">
          <div class="hud-item">
            <span class="hud-label">已发现星辰:</span>
            <span class="hud-value" id="hud-stars">0/0</span>
          </div>
          <div class="hud-item">
            <span class="hud-label">已发现星座:</span>
            <span class="hud-value" id="hud-constellations">0/0</span>
          </div>
          <div class="hud-item">
            <span class="hud-label">航行时间:</span>
            <span class="hud-value" id="hud-time">00:00:00</span>
          </div>
          <div class="hud-item" id="hud-bonuses-item" style="display: none;">
            <span class="hud-label">效率加成:</span>
            <span class="hud-value" id="hud-bonuses">-</span>
          </div>
        </div>
      </div>
      
      <div class="task-panel">
        <div class="task-title" id="task-title">当前任务</div>
        <div class="task-desc" id="task-desc">探索星图，发现隐藏的秘密</div>
        <div class="task-objectives" id="task-objectives"></div>
      </div>
      
      <div class="interaction-hint" id="interaction-hint" style="display: none;">
        点击星辰发现它们，连接星辰组成星座
      </div>
      
      <div class="minimap" id="minimap-container">
        <canvas class="minimap-canvas" id="minimap-canvas"></canvas>
      </div>
      
      <button class="menu-btn" style="position: absolute; top: 1rem; right: 1rem; min-width: auto; padding: 0.5rem 1rem;" 
              id="btn-pause">
        ⏸ 暂停
      </button>
      
      <button class="menu-btn" style="position: absolute; top: 1rem; right: 8rem; min-width: auto; padding: 0.5rem 1rem;" 
              id="btn-connect-mode">
        ✨ 连接模式
      </button>

      <button class="menu-btn crew-panel-btn" id="btn-crew">
        👥 船员
      </button>

      <button class="menu-btn trade-panel-btn" id="btn-trade" style="display: none;">
        🏪 交易
      </button>
    `;
    
    this.uiLayer.appendChild(gameUI);
    
    document.getElementById('btn-pause')?.addEventListener('click', () => {
      eventBus.emit('game:pause');
      this.showPauseMenu();
      eventBus.emit('sound:play', 'button_click');
    });
    
    document.getElementById('btn-connect-mode')?.addEventListener('click', (e) => {
      const btn = e.target as HTMLButtonElement;
      const isActive = btn.classList.toggle('active');
      eventBus.emit('connectMode:toggle', isActive);
      eventBus.emit('sound:play', 'button_click');
      
      const hint = document.getElementById('interaction-hint');
      if (hint) {
        hint.style.display = isActive ? 'block' : 'none';
      }
    });

    document.getElementById('btn-crew')?.addEventListener('click', () => {
      this.toggleCrewPanel();
      eventBus.emit('sound:play', 'button_click');
    });

    document.getElementById('btn-trade')?.addEventListener('click', () => {
      this.toggleTradePanel();
      eventBus.emit('sound:play', 'button_click');
    });
    
    this.updateHUD();
    eventBus.emit('music:play', 'game');
    eventBus.emit('ambient:play', 'ocean');
  }

  private showPauseMenu(): void {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog">
        <h3 class="dialog-title">游戏暂停</h3>
        <div class="dialog-actions">
          <button class="menu-btn" data-action="resume">继续游戏</button>
          <button class="menu-btn" data-action="save">保存游戏</button>
          <button class="menu-btn" data-action="settings">设置</button>
          <button class="menu-btn" data-action="menu">返回主菜单</button>
        </div>
      </div>
    `;
    
    this.uiLayer.appendChild(overlay);
    
    overlay.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = (e.target as HTMLElement).dataset.action;
        
        switch (action) {
          case 'resume':
            overlay.remove();
            eventBus.emit('game:resume');
            break;
          case 'save':
            eventBus.emit('game:save');
            this.showToast('游戏已保存');
            break;
          case 'settings':
            overlay.remove();
            this.showSettingsFromPause();
            break;
          case 'menu':
            overlay.remove();
            eventBus.emit('game:stop');
            this.showScreen('menu');
            break;
        }
        eventBus.emit('sound:play', 'button_click');
      });
    });
  }

  private showSettingsFromPause(): void {
    const settings = this.stateManager.getState().settings;
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="settings-panel">
        <h3 class="settings-title">设置</h3>
        ${this.renderSettingsContent(settings)}
        <div class="settings-actions">
          <button class="menu-btn" data-action="close">关闭</button>
        </div>
      </div>
    `;
    
    this.uiLayer.appendChild(overlay);
    this.bindSettingsEvents(overlay, settings);
    
    overlay.querySelector('[data-action="close"]')?.addEventListener('click', () => {
      overlay.remove();
      this.showPauseMenu();
      eventBus.emit('sound:play', 'button_click');
    });
  }

  private renderSettings(): void {
    const settings = this.stateManager.getState().settings;
    
    const menu = document.createElement('div');
    menu.className = 'menu-screen';
    menu.innerHTML = `
      <div class="settings-panel">
        <h3 class="settings-title">游戏设置</h3>
        ${this.renderSettingsContent(settings)}
        <div class="settings-actions">
          <button class="menu-btn" data-action="save">保存设置</button>
          <button class="menu-btn" data-action="reset">重置进度</button>
          <button class="menu-btn" data-action="back">返回</button>
        </div>
      </div>
    `;
    
    this.uiLayer.appendChild(menu);
    this.bindSettingsEvents(menu, settings);
    
    menu.querySelector('[data-action="save"]')?.addEventListener('click', () => {
      eventBus.emit('settings:save');
      this.showToast('设置已保存');
      eventBus.emit('sound:play', 'button_click');
    });
    
    menu.querySelector('[data-action="reset"]')?.addEventListener('click', () => {
      if (confirm('确定要重置所有游戏进度吗？此操作不可撤销。')) {
        eventBus.emit('progress:reset');
        this.showToast('进度已重置');
      }
      eventBus.emit('sound:play', 'button_click');
    });
    
    menu.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.showScreen('menu');
      eventBus.emit('sound:play', 'button_click');
    });
  }

  private renderSettingsContent(settings: GameSettings): string {
    return `
      <div class="setting-item">
        <span class="setting-label">主音量</span>
        <div class="setting-control">
          <input type="range" class="setting-slider" id="setting-masterVolume" 
                 min="0" max="100" value="${Math.round(settings.masterVolume * 100)}">
          <span class="setting-value" id="value-masterVolume">${Math.round(settings.masterVolume * 100)}%</span>
        </div>
      </div>
      <div class="setting-item">
        <span class="setting-label">音乐音量</span>
        <div class="setting-control">
          <input type="range" class="setting-slider" id="setting-musicVolume" 
                 min="0" max="100" value="${Math.round(settings.musicVolume * 100)}">
          <span class="setting-value" id="value-musicVolume">${Math.round(settings.musicVolume * 100)}%</span>
        </div>
      </div>
      <div class="setting-item">
        <span class="setting-label">音效音量</span>
        <div class="setting-control">
          <input type="range" class="setting-slider" id="setting-sfxVolume" 
                 min="0" max="100" value="${Math.round(settings.sfxVolume * 100)}">
          <span class="setting-value" id="value-sfxVolume">${Math.round(settings.sfxVolume * 100)}%</span>
        </div>
      </div>
      <div class="setting-item">
        <span class="setting-label">环境音量</span>
        <div class="setting-control">
          <input type="range" class="setting-slider" id="setting-ambientVolume" 
                 min="0" max="100" value="${Math.round(settings.ambientVolume * 100)}">
          <span class="setting-value" id="value-ambientVolume">${Math.round(settings.ambientVolume * 100)}%</span>
        </div>
      </div>
      <div class="setting-item">
        <span class="setting-label">星辰密度</span>
        <div class="setting-control">
          <input type="range" class="setting-slider" id="setting-starDensity" 
                 min="50" max="150" value="${Math.round(settings.starDensity * 100)}">
          <span class="setting-value" id="value-starDensity">${Math.round(settings.starDensity * 100)}%</span>
        </div>
      </div>
      <div class="setting-item">
        <span class="setting-label">天气效果</span>
        <div class="setting-control">
          <div class="toggle-btn ${settings.weatherEffects ? 'active' : ''}" id="setting-weatherEffects"></div>
        </div>
      </div>
      <div class="setting-item">
        <span class="setting-label">显示标签</span>
        <div class="setting-control">
          <div class="toggle-btn ${settings.showLabels ? 'active' : ''}" id="setting-showLabels"></div>
        </div>
      </div>
      <div class="setting-item">
        <span class="setting-label">显示小地图</span>
        <div class="setting-control">
          <div class="toggle-btn ${settings.showMinimap ? 'active' : ''}" id="setting-showMinimap"></div>
        </div>
      </div>
    `;
  }

  private bindSettingsEvents(container: HTMLElement, settings: GameSettings): void {
    const volumeSettings = ['masterVolume', 'musicVolume', 'sfxVolume', 'ambientVolume', 'starDensity'];
    
    volumeSettings.forEach(key => {
      const slider = container.querySelector(`#setting-${key}`) as HTMLInputElement;
      const valueSpan = container.querySelector(`#value-${key}`) as HTMLElement;
      
      slider?.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value) / 100;
        valueSpan.textContent = `${Math.round(value * 100)}%`;
        this.stateManager.updateSettings({ [key]: value });
      });
    });
    
    const toggleSettings = ['weatherEffects', 'showLabels', 'showMinimap'];
    
    toggleSettings.forEach(key => {
      const toggle = container.querySelector(`#setting-${key}`) as HTMLElement;
      
      toggle?.addEventListener('click', () => {
        const isActive = toggle.classList.toggle('active');
        this.stateManager.updateSettings({ [key]: isActive });
        
        if (key === 'showMinimap') {
          const minimap = document.getElementById('minimap-container');
          if (minimap) {
            minimap.style.display = isActive ? 'block' : 'none';
          }
        }
      });
    });
  }

  private onChapterStarted(chapter: Chapter): void {
    document.getElementById('hud-chapter')!.textContent = chapter.name;
    document.getElementById('task-title')!.textContent = chapter.name;
    document.getElementById('task-desc')!.textContent = chapter.intro;
    this.updateObjectives(chapter.objectives);
  }

  private onChapterCompleted(chapter: Chapter): void {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog">
        <h3 class="dialog-title">🎉 章节完成！</h3>
        <div class="dialog-content">
          恭喜你完成了《${chapter.name}》！<br>
          你已经解锁了下一章节。
        </div>
        <div class="dialog-actions">
          <button class="menu-btn" data-action="next">继续下一章</button>
          <button class="menu-btn" data-action="menu">返回主菜单</button>
        </div>
      </div>
    `;
    
    this.uiLayer.appendChild(overlay);
    
    overlay.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      overlay.remove();
      eventBus.emit('chapter:next');
      eventBus.emit('sound:play', 'button_click');
    });
    
    overlay.querySelector('[data-action="menu"]')?.addEventListener('click', () => {
      overlay.remove();
      eventBus.emit('game:stop');
      this.showScreen('menu');
      eventBus.emit('sound:play', 'button_click');
    });
  }

  private updateObjectives(objectives: Objective[]): void {
    const container = document.getElementById('task-objectives');
    if (!container) return;
    
    container.innerHTML = objectives.map(obj => `
      <div class="objective ${obj.completed ? 'completed' : ''}">
        ${obj.description} (${obj.progress}/${obj.total})
      </div>
    `).join('');
  }

  private updateShipHUD(ship: ShipState): void {
    const speedEl = document.getElementById('hud-speed');
    if (speedEl) {
      speedEl.textContent = Math.round(ship.speed).toString();
    }
  }

  private updateWeatherHUD(weather: any): void {
    const weatherEl = document.getElementById('hud-weather');
    if (weatherEl) {
      weatherEl.textContent = weather?.name || '晴朗';
    }
  }

  private updateHUD(): void {
    const state = this.stateManager.getState();
    const chapter = this.chapterModule?.getCurrentChapter();
    
    if (chapter) {
      const totalStars = chapter.stars.filter(s => s.isClickable).length;
      const totalConstellations = chapter.constellations.length;
      
      document.getElementById('hud-stars')!.textContent = 
        `${state.discoveredStars.length}/${totalStars}`;
      document.getElementById('hud-constellations')!.textContent = 
        `${state.discoveredConstellations.length}/${totalConstellations}`;
    }
    
    document.getElementById('hud-time')!.textContent = 
      this.formatTime(state.playTime);
    
    this.updateCrewHUD();
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private showToast(data: any): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      const existingToast = document.querySelector('.toast');
      existingToast?.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = data.message;
    
    this.uiLayer.appendChild(toast);
    
    this.toastTimer = window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
      this.toastTimer = null;
    }, 2000);
  }

  private onPortAvailable(port: Port): void {
    const tradeBtn = document.getElementById('btn-trade');
    if (tradeBtn) {
      tradeBtn.style.display = '';
    }
    eventBus.emit('toast:show', { message: `🏪 到达港口：${port.name}` });
  }

  private onPortOpened(port: Port): void {
    this.tradePanelOpen = true;
    this.renderTradePanel();
  }

  private onPortClosed(): void {
    this.tradePanelOpen = false;
    document.getElementById('trade-panel')?.remove();
  }

  private onPortPricesUpdated(data: { portId: string; items: PortTradeItem[] }): void {
    if (this.tradePanelOpen) {
      this.renderTradePanel();
    }
  }

  private toggleTradePanel(): void {
    const state = this.stateManager.getState();
    const currentPortId = state.trade.currentPortId;

    if (this.tradePanelOpen) {
      this.tradePanelOpen = false;
      this.tradeModule.closePort();
      return;
    }

    if (currentPortId) {
      this.tradeModule.openPort(currentPortId);
    } else {
      const currentPosition = state.currentPosition;
      const allPorts = this.tradeModule.getAllPorts();
      let nearestPortId: string | null = null;
      let minDist = Infinity;

      for (const port of allPorts) {
        const chapter = this.chapterModule?.getChapter(state.currentChapterId || '');
        const routePoint = chapter?.routePoints.find(p => p.id === port.routePointId);
        if (routePoint) {
          const dist = Math.sqrt(
            Math.pow(routePoint.position.x - currentPosition.x, 2) +
            Math.pow(routePoint.position.z - currentPosition.z, 2)
          );
          if (dist < minDist && dist < 30) {
            minDist = dist;
            nearestPortId = port.id;
          }
        }
      }

      if (nearestPortId) {
        this.tradeModule.openPort(nearestPortId);
      } else {
        eventBus.emit('toast:show', { message: '附近没有港口' });
      }
    }
  }

  private renderTradePanel(): void {
    document.getElementById('trade-panel')?.remove();

    const state = this.stateManager.getState();
    const port = this.tradeModule.getCurrentPort();
    const trade = state.trade;
    const crew = state.crew;
    const ship = state.ship;

    if (!port) return;

    const panel = document.createElement('div');
    panel.id = 'trade-panel';
    panel.className = 'trade-panel';

    const activeTab = (panel.dataset as any).tab || 'buy';
    (panel.dataset as any).tab = activeTab;

    const portItems = trade.portPrices[port.id] || [];

    panel.innerHTML = `
      <div class="trade-panel-header">
        <h3 class="trade-panel-title">🏪 ${port.name}</h3>
        <p class="trade-panel-desc">${port.description}</p>
        <button class="trade-panel-close" id="trade-close-btn">×</button>
      </div>
      
      <div class="trade-panel-stats">
        <div class="trade-stat-item">
          <span class="trade-stat-label">💰 金币</span>
          <span class="trade-stat-value gold-value">${crew.gold}</span>
        </div>
        <div class="trade-stat-item">
          <span class="trade-stat-label">📦 物资</span>
          <span class="trade-stat-value">${Math.round(ship.supplies)}/${ship.maxSupplies}</span>
        </div>
        <div class="trade-stat-item">
          <span class="trade-stat-label">❤️ 船体</span>
          <span class="trade-stat-value">${Math.round(ship.health)}/${ship.maxHealth}</span>
        </div>
      </div>

      <div class="trade-tabs">
        <button class="trade-tab ${activeTab === 'buy' ? 'active' : ''}" data-tab="buy">购买补给</button>
        <button class="trade-tab ${activeTab === 'sell' ? 'active' : ''}" data-tab="sell">出售物资</button>
        <button class="trade-tab ${activeTab === 'special' ? 'active' : ''}" data-tab="special">特殊物品</button>
        <button class="trade-tab ${activeTab === 'inventory' ? 'active' : ''}" data-tab="inventory">背包</button>
      </div>

      <div class="trade-tab-content" id="trade-tab-content">
        ${activeTab === 'buy' ? this.renderBuyTab(portItems, crew.gold, ship.supplies) : ''}
        ${activeTab === 'sell' ? this.renderSellTab(trade.inventory, portItems) : ''}
        ${activeTab === 'special' ? this.renderSpecialTab(portItems, crew.gold) : ''}
        ${activeTab === 'inventory' ? this.renderInventoryTab(trade.inventory) : ''}
      </div>

      <div class="trade-panel-footer">
        <button class="menu-btn" id="refresh-prices-btn">🔄 刷新价格</button>
      </div>
    `;

    this.uiLayer.appendChild(panel);

    document.getElementById('trade-close-btn')?.addEventListener('click', () => {
      this.tradePanelOpen = false;
      this.tradeModule.closePort();
      eventBus.emit('sound:play', 'button_click');
    });

    panel.querySelectorAll('.trade-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).dataset.tab as string;
        (panel.dataset as any).tab = tab;
        this.renderTradePanel();
        eventBus.emit('sound:play', 'button_click');
      });
    });

    document.getElementById('refresh-prices-btn')?.addEventListener('click', () => {
      this.tradeModule.refreshPortPrices(port.id);
      eventBus.emit('sound:play', 'button_click');
      eventBus.emit('toast:show', { message: '价格已刷新' });
    });

    this.bindTradePanelEvents(panel, activeTab);
  }

  private renderBuyTab(items: PortTradeItem[], gold: number, supplies: number): string {
    const buyItems = items.filter(i => i.category !== 'chapter_unlock');
    
    if (buyItems.length === 0) {
      return `<div class="trade-empty">暂无商品</div>`;
    }

    return `
      <div class="trade-items-grid">
        ${buyItems.map(item => this.renderTradeItemCard(item, gold, supplies, 'buy')).join('')}
      </div>
    `;
  }

  private renderSellTab(inventory: Record<string, number>, portItems: PortTradeItem[]): string {
    const inventoryItems = Object.entries(inventory).filter(([_, count]) => count > 0);
    
    if (inventoryItems.length === 0) {
      return `<div class="trade-empty">背包中没有可出售的物品</div>`;
    }

    return `
      <div class="trade-items-grid">
        ${inventoryItems.map(([itemId, count]) => {
          const item = this.tradeModule.getTradeItem(itemId);
          const portItem = portItems.find(p => p.id === itemId);
          if (!item) return '';
          
          const sellPrice = portItem ? Math.round(portItem.currentPrice * 0.6) : Math.round(item.basePrice * 0.5);
          const combinedItem: PortTradeItem = {
            ...item,
            currentPrice: sellPrice,
            currentStock: count,
            priceTrend: 'stable'
          };
          
          return this.renderTradeItemCard(combinedItem, 999999, 999999, 'sell');
        }).join('')}
      </div>
    `;
  }

  private renderSpecialTab(items: PortTradeItem[], gold: number): string {
    const specialItems = items.filter(i => i.category === 'special' || i.category === 'chapter_unlock');
    
    if (specialItems.length === 0) {
      return `<div class="trade-empty">暂无特殊物品</div>`;
    }

    return `
      <div class="trade-items-grid">
        ${specialItems.map(item => this.renderTradeItemCard(item, gold, 999999, 'buy')).join('')}
      </div>
    `;
  }

  private renderInventoryTab(inventory: Record<string, number>): string {
    const inventoryItems = Object.entries(inventory).filter(([_, count]) => count > 0);
    
    if (inventoryItems.length === 0) {
      return `<div class="trade-empty">背包是空的</div>`;
    }

    return `
      <div class="inventory-grid">
        ${inventoryItems.map(([itemId, count]) => {
          const item = this.tradeModule.getTradeItem(itemId);
          if (!item) return '';
          
          return `
            <div class="inventory-item" data-item-id="${itemId}">
              <div class="inventory-item-icon">${item.icon}</div>
              <div class="inventory-item-info">
                <div class="inventory-item-name">${item.name}</div>
                <div class="inventory-item-count">x${count}</div>
              </div>
              ${item.effects && item.effects.type !== 'chapter_unlock' ? `
                <button class="inventory-use-btn" data-item-id="${itemId}">使用</button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  private renderTradeItemCard(item: PortTradeItem, gold: number, supplies: number, mode: 'buy' | 'sell'): string {
    const canAfford = item.priceCurrency === 'gold' 
      ? gold >= item.currentPrice 
      : supplies >= item.currentPrice;
    const inStock = item.currentStock > 0;
    const canTrade = mode === 'buy' ? (canAfford && inStock) : inStock;

    const trendIcon = item.priceTrend === 'up' ? '📈' : item.priceTrend === 'down' ? '📉' : '➡️';
    const trendClass = `trend-${item.priceTrend}`;

    return `
      <div class="trade-item-card ${item.category}" data-item-id="${item.id}">
        <div class="trade-item-header">
          <span class="trade-item-icon">${item.icon}</span>
          <span class="trade-item-name">${item.name}</span>
          <span class="trade-item-trend ${trendClass}">${trendIcon}</span>
        </div>
        <div class="trade-item-desc">${item.description}</div>
        <div class="trade-item-stats">
          <div class="trade-item-price">
            <span class="price-label">价格:</span>
            <span class="price-value ${item.priceCurrency === 'gold' ? 'gold-value' : ''}">
              ${item.currentPrice} ${item.priceCurrency === 'gold' ? '💰' : '📦'}
            </span>
          </div>
          <div class="trade-item-stock">
            <span class="stock-label">${mode === 'buy' ? '库存' : '数量'}:</span>
            <span class="stock-value">${item.currentStock}</span>
          </div>
        </div>
        <div class="trade-item-actions">
          <div class="quantity-control">
            <button class="qty-btn" data-action="decrease" data-item-id="${item.id}">-</button>
            <input type="number" class="qty-input" value="1" min="1" max="${item.currentStock}" 
                   data-item-id="${item.id}" id="qty-${item.id}">
            <button class="qty-btn" data-action="increase" data-item-id="${item.id}">+</button>
          </div>
          <button class="trade-action-btn ${mode === 'buy' ? 'buy-btn' : 'sell-btn'}" 
                  data-item-id="${item.id}" 
                  data-mode="${mode}"
                  ${!canTrade ? 'disabled' : ''}>
            ${mode === 'buy' ? '购买' : '出售'}
          </button>
        </div>
      </div>
    `;
  }

  private bindTradePanelEvents(panel: HTMLElement, activeTab: string): void {
    panel.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const itemId = target.dataset.itemId;
        const action = target.dataset.action;
        const input = document.getElementById(`qty-${itemId}`) as HTMLInputElement;
        
        if (input && itemId) {
          let value = parseInt(input.value) || 1;
          const max = parseInt(input.max) || 99;
          
          if (action === 'increase') {
            value = Math.min(max, value + 1);
          } else if (action === 'decrease') {
            value = Math.max(1, value - 1);
          }
          
          input.value = value.toString();
        }
      });
    });

    panel.querySelectorAll('.trade-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const itemId = target.dataset.itemId;
        const mode = target.dataset.mode as 'buy' | 'sell';
        const input = document.getElementById(`qty-${itemId}`) as HTMLInputElement;
        const quantity = parseInt(input?.value || '1');

        if (itemId && quantity > 0) {
          if (mode === 'buy') {
            eventBus.emit('port:buy', { itemId, quantity });
          } else {
            eventBus.emit('port:sell', { itemId, quantity });
          }
          eventBus.emit('sound:play', 'button_click');
        }
      });
    });

    panel.querySelectorAll('.inventory-use-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemId = (e.currentTarget as HTMLElement).dataset.itemId;
        if (itemId) {
          this.tradeModule.useItem(itemId);
          eventBus.emit('sound:play', 'button_click');
        }
      });
    });
  }

  private toggleCrewPanel(): void {
    this.crewPanelOpen = !this.crewPanelOpen;
    const existingPanel = document.getElementById('crew-panel');
    
    if (this.crewPanelOpen) {
      this.renderCrewPanel();
    } else {
      existingPanel?.remove();
    }
  }

  private renderCrewPanel(): void {
    document.getElementById('crew-panel')?.remove();

    const state = this.stateManager.getState();
    const crew = state.crew;
    const panel = document.createElement('div');
    panel.id = 'crew-panel';
    panel.className = 'crew-panel';

    const activeTab = (panel.dataset as any).tab || 'members';
    (panel.dataset as any).tab = activeTab;

    panel.innerHTML = `
      <div class="crew-panel-header">
        <h3 class="crew-panel-title">👥 船员管理</h3>
        <button class="crew-panel-close" id="crew-close-btn">×</button>
      </div>
      
      <div class="crew-panel-stats">
        <div class="crew-stat-item">
          <span class="crew-stat-label">船员数量</span>
          <span class="crew-stat-value">${crew.members.length}/${crew.maxCrew}</span>
        </div>
        <div class="crew-stat-item">
          <span class="crew-stat-label">💰 金币</span>
          <span class="crew-stat-value gold-value">${crew.gold}</span>
        </div>
        <div class="crew-stat-item">
          <span class="crew-stat-label">航行效率</span>
          <span class="crew-stat-value bonus-positive">+${Math.round((crew.efficiencyBonuses.speed || 0) * 100)}%</span>
        </div>
        <div class="crew-stat-item">
          <span class="crew-stat-label">天气抗性</span>
          <span class="crew-stat-value bonus-positive">+${Math.round((crew.efficiencyBonuses.weatherResist || 0) * 100)}%</span>
        </div>
      </div>

      <div class="crew-tabs">
        <button class="crew-tab ${activeTab === 'members' ? 'active' : ''}" data-tab="members">船员列表</button>
        <button class="crew-tab ${activeTab === 'recruit' ? 'active' : ''}" data-tab="recruit">招募大厅</button>
        <button class="crew-tab ${activeTab === 'actions' ? 'active' : ''}" data-tab="actions">管理操作</button>
      </div>

      <div class="crew-tab-content" id="crew-tab-content">
        ${activeTab === 'members' ? this.renderMembersTab(crew.members) : ''}
        ${activeTab === 'recruit' ? this.renderRecruitTab(crew.recruits, crew.gold, state.ship.supplies) : ''}
        ${activeTab === 'actions' ? this.renderActionsTab() : ''}
      </div>
    `;

    this.uiLayer.appendChild(panel);

    document.getElementById('crew-close-btn')?.addEventListener('click', () => {
      this.crewPanelOpen = false;
      panel.remove();
      eventBus.emit('sound:play', 'button_click');
    });

    panel.querySelectorAll('.crew-tab').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).dataset.tab as string;
        (panel.dataset as any).tab = tab;
        this.renderCrewPanel();
        eventBus.emit('sound:play', 'button_click');
      });
    });

    this.bindCrewPanelEvents(panel);
  }

  private renderMembersTab(members: CrewMember[]): string {
    if (members.length === 0) {
      return `<div class="crew-empty">暂无船员，请前往招募大厅招募</div>`;
    }

    return `
      <div class="crew-members-grid">
        ${members.map(member => this.renderCrewCard(member)).join('')}
      </div>
    `;
  }

  private renderCrewCard(member: CrewMember): string {
    const rarityConfig = this.crewModule.getRarityConfig(member.rarity);
    const roleName = this.crewModule.getRoleName(member.role);
    const healthPct = (member.health / member.maxHealth) * 100;
    const fatiguePct = (member.fatigue / member.maxFatigue) * 100;
    const moralePct = (member.morale / member.maxMorale) * 100;
    const expPct = (member.exp / member.maxExp) * 100;

    const roleOptions: CrewRole[] = ['captain', 'navigator', 'sailor', 'cook', 'doctor', 'engineer', 'lookout', 'idle'];

    return `
      <div class="crew-card rarity-${member.rarity}" style="border-color: ${rarityConfig.color}">
        <div class="crew-card-header">
          <div class="crew-avatar" style="background: ${member.avatar}">
            ${member.name.charAt(0)}
          </div>
          <div class="crew-card-info">
            <div class="crew-card-name" style="color: ${rarityConfig.color}">${member.name}</div>
            <div class="crew-card-subtitle">
              Lv.${member.level} ${this.getRarityLabel(member.rarity)} · ${roleName}
            </div>
          </div>
        </div>

        <div class="crew-card-desc">${member.description}</div>

        <div class="crew-stat-bars">
          <div class="crew-stat-bar">
            <div class="stat-bar-label">
              <span>❤️ 生命</span>
              <span>${Math.round(member.health)}/${member.maxHealth}</span>
            </div>
            <div class="stat-bar-bg">
              <div class="stat-bar-fill health-bar" style="width: ${healthPct}%"></div>
            </div>
          </div>
          <div class="crew-stat-bar">
            <div class="stat-bar-label">
              <span>😴 疲劳</span>
              <span>${Math.round(member.fatigue)}/${member.maxFatigue}</span>
            </div>
            <div class="stat-bar-bg">
              <div class="stat-bar-fill fatigue-bar" style="width: ${fatiguePct}%"></div>
            </div>
          </div>
          <div class="crew-stat-bar">
            <div class="stat-bar-label">
              <span>😊 士气</span>
              <span>${Math.round(member.morale)}/${member.maxMorale}</span>
            </div>
            <div class="stat-bar-bg">
              <div class="stat-bar-fill morale-bar" style="width: ${moralePct}%"></div>
            </div>
          </div>
          <div class="crew-stat-bar">
            <div class="stat-bar-label">
              <span>⭐ 经验</span>
              <span>${Math.round(member.exp)}/${member.maxExp}</span>
            </div>
            <div class="stat-bar-bg">
              <div class="stat-bar-fill exp-bar" style="width: ${expPct}%"></div>
            </div>
          </div>
        </div>

        <div class="crew-card-traits">
          ${member.traits.map(t => `<span class="trait-tag">${t}</span>`).join('')}
        </div>

        <div class="crew-card-skills">
          ${member.skills.map(skill => `
            <div class="skill-item" title="${skill.description}">
              <span class="skill-name">${skill.name}</span>
              <span class="skill-value">+${Math.round(skill.value * 100)}%</span>
            </div>
          `).join('')}
        </div>

        <div class="crew-card-actions">
          <select class="crew-role-select" data-crew-id="${member.id}">
            ${roleOptions.map(r => `
              <option value="${r}" ${member.role === r ? 'selected' : ''}>
                ${this.crewModule.getRoleName(r)}
              </option>
            `).join('')}
          </select>
          <button class="crew-action-btn train-btn" data-action="train" data-crew-id="${member.id}">
            训练 (${50 * member.level}💰)
          </button>
          ${member.role !== 'captain' ? `
            <button class="crew-action-btn dismiss-btn" data-action="dismiss" data-crew-id="${member.id}">
              解雇
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private getRarityLabel(rarity: string): string {
    const labels: Record<string, string> = {
      common: '普通',
      uncommon: '优秀',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说',
    };
    return labels[rarity] || '未知';
  }

  private renderRecruitTab(recruits: CrewRecruitCandidate[], gold: number, supplies: number): string {
    if (recruits.length === 0) {
      return `
        <div class="crew-empty">
          <p>暂无招募候选人</p>
          <button class="menu-btn" id="refresh-recruits-btn">刷新列表</button>
          <p style="margin-top: 1rem; color: #888; font-size: 0.85rem;">候选人每5分钟自动刷新</p>
        </div>
      `;
    }

    return `
      <div class="recruit-header">
        <div class="recruit-info">
          💰 当前金币: <span class="gold-value">${gold}</span> 
          | 📦 当前物资: <span class="gold-value">${Math.round(supplies)}</span>
        </div>
        <button class="menu-btn" id="refresh-recruits-btn" style="min-width: auto; padding: 0.3rem 0.8rem; font-size: 0.85rem;">
          🔄 刷新
        </button>
      </div>
      <div class="crew-members-grid">
        ${recruits.map(recruit => this.renderRecruitCard(recruit, gold, supplies)).join('')}
      </div>
    `;
  }

  private renderRecruitCard(recruit: CrewRecruitCandidate, gold: number, supplies: number): string {
    const crew = recruit.crew;
    const rarityConfig = this.crewModule.getRarityConfig(crew.rarity);
    const roleName = this.crewModule.getRoleName(crew.role);
    const canAfford = (!recruit.cost.gold || gold >= recruit.cost.gold) && 
                      (!recruit.cost.supplies || supplies >= recruit.cost.supplies);
    const timeLeft = Math.max(0, Math.ceil((recruit.expiresAt - Date.now()) / 60000));

    return `
      <div class="crew-card recruit-card rarity-${crew.rarity}" style="border-color: ${rarityConfig.color}">
        <div class="crew-card-header">
          <div class="crew-avatar" style="background: ${crew.avatar}">
            ${crew.name.charAt(0)}
          </div>
          <div class="crew-card-info">
            <div class="crew-card-name" style="color: ${rarityConfig.color}">${crew.name}</div>
            <div class="crew-card-subtitle">
              Lv.${crew.level} ${this.getRarityLabel(crew.rarity)} · ${roleName}
            </div>
          </div>
        </div>

        <div class="recruit-time-left">⏰ 剩余时间: ${timeLeft} 分钟</div>

        <div class="crew-card-desc">${crew.description}</div>

        <div class="crew-card-traits">
          ${crew.traits.map(t => `<span class="trait-tag">${t}</span>`).join('')}
        </div>

        <div class="crew-card-skills">
          ${crew.skills.map(skill => `
            <div class="skill-item" title="${skill.description}">
              <span class="skill-name">${skill.name}</span>
              <span class="skill-value">+${Math.round(skill.value * 100)}%</span>
            </div>
          `).join('')}
        </div>

        <div class="recruit-cost">
          ${recruit.cost.gold ? `<div class="cost-item ${gold < recruit.cost.gold ? 'insufficient' : ''}">💰 ${recruit.cost.gold}</div>` : ''}
          ${recruit.cost.supplies ? `<div class="cost-item ${supplies < recruit.cost.supplies ? 'insufficient' : ''}">📦 ${recruit.cost.supplies}</div>` : ''}
        </div>

        <div class="crew-card-actions">
          <button class="crew-action-btn recruit-btn" 
                  data-recruit-id="${recruit.id}" 
                  ${!canAfford ? 'disabled' : ''}>
            ${canAfford ? '✅ 招募' : '❌ 资源不足'}
          </button>
        </div>
      </div>
    `;
  }

  private renderActionsTab(): string {
    const state = this.stateManager.getState();
    const crew = state.crew;
    const avgHealth = crew.members.length > 0
      ? crew.members.reduce((sum, m) => sum + (m.health / m.maxHealth), 0) / crew.members.length * 100
      : 0;
    const avgFatigue = crew.members.length > 0
      ? crew.members.reduce((sum, m) => sum + (m.fatigue / m.maxFatigue), 0) / crew.members.length * 100
      : 0;
    const avgMorale = crew.members.length > 0
      ? crew.members.reduce((sum, m) => sum + (m.morale / m.maxMorale), 0) / crew.members.length * 100
      : 0;

    const bonuses = crew.efficiencyBonuses;

    return `
      <div class="crew-actions-container">
        <div class="crew-overview-section">
          <h4>📊 团队概况</h4>
          <div class="overview-stats">
            <div class="overview-item">
              <div class="overview-label">平均生命</div>
              <div class="overview-bar">
                <div class="overview-fill health-bar" style="width: ${avgHealth}%"></div>
              </div>
              <div class="overview-value">${Math.round(avgHealth)}%</div>
            </div>
            <div class="overview-item">
              <div class="overview-label">平均疲劳</div>
              <div class="overview-bar">
                <div class="overview-fill fatigue-bar" style="width: ${avgFatigue}%"></div>
              </div>
              <div class="overview-value">${Math.round(avgFatigue)}%</div>
            </div>
            <div class="overview-item">
              <div class="overview-label">平均士气</div>
              <div class="overview-bar">
                <div class="overview-fill morale-bar" style="width: ${avgMorale}%"></div>
              </div>
              <div class="overview-value">${Math.round(avgMorale)}%</div>
            </div>
          </div>
        </div>

        <div class="crew-overview-section">
          <h4>⚡ 效率加成</h4>
          <div class="bonuses-list">
            <div class="bonus-item">
              <span>🚢 航行速度</span>
              <span class="bonus-value bonus-positive">+${Math.round(bonuses.speed * 100)}%</span>
            </div>
            <div class="bonus-item">
              <span>🌦️ 天气抗性</span>
              <span class="bonus-value bonus-positive">+${Math.round(bonuses.weatherResist * 100)}%</span>
            </div>
            <div class="bonus-item">
              <span>❤️ 生命恢复</span>
              <span class="bonus-value bonus-positive">+${Math.round(bonuses.healthRegen * 100)}%</span>
            </div>
            <div class="bonus-item">
              <span>📦 物资节省</span>
              <span class="bonus-value bonus-positive">+${Math.round(bonuses.supplySave * 100)}%</span>
            </div>
            <div class="bonus-item">
              <span>😊 士气提升</span>
              <span class="bonus-value bonus-positive">+${Math.round(bonuses.moraleBoost * 100)}%</span>
            </div>
            <div class="bonus-item">
              <span>✨ 星辰视野</span>
              <span class="bonus-value bonus-positive">+${Math.round(bonuses.starVision * 100)}%</span>
            </div>
          </div>
        </div>

        <div class="crew-overview-section">
          <h4>👨‍✈️ 岗位分配</h4>
          <div class="roles-summary">
            ${(['captain', 'navigator', 'sailor', 'cook', 'doctor', 'engineer', 'lookout', 'idle'] as CrewRole[]).map(role => `
              <div class="role-summary-item">
                <span class="role-icon">${this.getRoleIcon(role)}</span>
                <span class="role-name">${this.crewModule.getRoleName(role)}</span>
                <span class="role-count">${crew.members.filter(m => m.role === role).length}人</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="crew-bulk-actions">
          <h4>🎯 批量操作</h4>
          <div class="bulk-actions-row">
            <button class="menu-btn bulk-action-btn" id="rest-all-btn">
              😴 全员休息<br>
              <span style="font-size: 0.75rem; color: #aaa;">消耗 ${crew.members.length * 5} 物资</span>
            </button>
            <button class="menu-btn bulk-action-btn" id="refresh-recruits-tab-btn">
              🔄 刷新招募<br>
              <span style="font-size: 0.75rem; color: #aaa;">立即刷新候选人</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private getRoleIcon(role: CrewRole): string {
    const icons: Record<CrewRole, string> = {
      captain: '👨‍✈️',
      navigator: '🧭',
      sailor: '⛵',
      cook: '🍳',
      doctor: '💊',
      engineer: '🔧',
      lookout: '👁️',
      idle: '💤',
    };
    return icons[role];
  }

  private bindCrewPanelEvents(panel: HTMLElement): void {
    panel.querySelectorAll('.crew-role-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const crewId = (e.target as HTMLElement).dataset.crewId as string;
        const role = (e.target as HTMLSelectElement).value as CrewRole;
        eventBus.emit('crew:assign_role', { crewId, role });
        eventBus.emit('sound:play', 'button_click');
        setTimeout(() => this.renderCrewPanel(), 100);
      });
    });

    panel.querySelectorAll('.crew-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const action = target.dataset.action;
        const crewId = target.dataset.crewId;
        const recruitId = target.dataset.recruitId;

        if (action === 'train' && crewId) {
          eventBus.emit('crew:train', { crewId });
          eventBus.emit('sound:play', 'button_click');
          setTimeout(() => this.renderCrewPanel(), 100);
        } else if (action === 'dismiss' && crewId) {
          if (confirm('确定要解雇这名船员吗？')) {
            eventBus.emit('crew:dismiss', { crewId });
            eventBus.emit('sound:play', 'button_click');
            setTimeout(() => this.renderCrewPanel(), 100);
          }
        } else if (recruitId) {
          eventBus.emit('crew:recruit', { recruitId });
          eventBus.emit('sound:play', 'objective_complete');
          setTimeout(() => this.renderCrewPanel(), 100);
        }
      });
    });

    const refreshBtn = document.getElementById('refresh-recruits-btn') || 
                        document.getElementById('refresh-recruits-tab-btn');
    refreshBtn?.addEventListener('click', () => {
      this.crewModule.refreshRecruits();
      eventBus.emit('sound:play', 'button_click');
      this.showToast({ message: '已刷新招募列表' });
      setTimeout(() => this.renderCrewPanel(), 100);
    });

    document.getElementById('rest-all-btn')?.addEventListener('click', () => {
      eventBus.emit('crew:rest', {});
      eventBus.emit('sound:play', 'button_click');
      setTimeout(() => this.renderCrewPanel(), 100);
    });
  }

  private updateCrewHUD(): void {
    const state = this.stateManager.getState();
    const crew = state.crew;

    const crewItem = document.getElementById('hud-crew-item');
    const goldItem = document.getElementById('hud-gold-item');
    const bonusesItem = document.getElementById('hud-bonuses-item');
    const crewEl = document.getElementById('hud-crew');
    const goldEl = document.getElementById('hud-gold');
    const bonusesEl = document.getElementById('hud-bonuses');

    if (crewItem && crewEl) {
      crewItem.style.display = '';
      crewEl.textContent = `${crew.members.length}/${crew.maxCrew}`;
    }
    if (goldItem && goldEl) {
      goldItem.style.display = '';
      goldEl.textContent = crew.gold.toString();
    }
    if (bonusesItem && bonusesEl) {
      bonusesItem.style.display = '';
      const speedBonus = Math.round((crew.efficiencyBonuses.speed || 0) * 100);
      const weatherBonus = Math.round((crew.efficiencyBonuses.weatherResist || 0) * 100);
      bonusesEl.textContent = `速+${speedBonus}% 抗+${weatherBonus}%`;
    }
  }

  public dispose(): void {
    this.uiLayer.innerHTML = '';
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }
}
