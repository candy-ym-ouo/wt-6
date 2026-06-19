import { GameStateManager } from '../core/GameStateManager';
import { ChapterModule } from './ChapterModule';
import { CrewModule } from './CrewModule';
import { TradeModule } from './TradeModule';
import { VoyageLogModule } from './VoyageLogModule';
import { AchievementModule } from './AchievementModule';
import { CodexModule } from './CodexModule';
import { DialogueModule } from './DialogueModule';
import { TaskModule } from './TaskModule';
import { FogOfWarModule } from './FogOfWarModule';
import { ShipDamageModule } from './ShipDamageModule';
import { ChapterEditorUIModule } from './ChapterEditorUIModule';
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
  TradeItem,
  VoyageLogCategory,
  VoyageLogEntry,
  Achievement,
  AchievementCategory,
  CodexEntry,
  CodexCategory,
  DialogueNode,
  DynamicTask,
  TaskProgress,
} from '../types';

export class UIModule {
  private stateManager: GameStateManager;
  private chapterModule: ChapterModule | null = null;
  private crewModule: CrewModule;
  private tradeModule: TradeModule;
  private voyageLogModule: VoyageLogModule;
  private achievementModule: AchievementModule;
  private codexModule: CodexModule;
  private damageModule: ShipDamageModule;
  private chapterEditorModule: ChapterEditorUIModule;
  private uiLayer: HTMLElement;
  private currentScreen: GameScreen = 'menu';
  private toastTimer: number | null = null;
  private crewPanelOpen: boolean = false;
  private tradePanelOpen: boolean = false;
  private voyageLogPanelOpen: boolean = false;
  private achievementPanelOpen: boolean = false;
  private codexPanelOpen: boolean = false;
  private activeLogCategory: VoyageLogCategory | 'all' = 'all';
  private logSearchKeyword: string = '';
  private activeAchievementCategory: AchievementCategory | 'all' = 'all';
  private activeCodexCategory: CodexCategory = 'stars';
  private dialogueModule: DialogueModule;
  private taskModule: TaskModule;
  private dynamicTaskLastRender: number = 0;
  private typewriterTimer: number | null = null;
  private typewriterText: string = '';
  private typewriterIndex: number = 0;
  private typewriterComplete: boolean = false;
  private dialogueOverlayEl: HTMLElement | null = null;
  private fogOfWarModule: FogOfWarModule;
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapContext: CanvasRenderingContext2D | null = null;
  private minimapAnimationId: number | null = null;
  private minimapFogCanvas: HTMLCanvasElement | null = null;

  constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.crewModule = CrewModule.getInstance();
    this.tradeModule = TradeModule.getInstance();
    this.voyageLogModule = VoyageLogModule.getInstance();
    this.achievementModule = AchievementModule.getInstance();
    this.codexModule = CodexModule.getInstance();
    this.dialogueModule = DialogueModule.getInstance();
    this.taskModule = TaskModule.getInstance();
    this.fogOfWarModule = FogOfWarModule.getInstance();
    this.damageModule = ShipDamageModule.getInstance();
    this.chapterEditorModule = new ChapterEditorUIModule();
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
    eventBus.on('ship:damage_applied', () => {
      this.updateShipHUD(this.stateManager.getState().ship);
      if (this.tradePanelOpen) this.renderTradePanel();
    });
    eventBus.on('ship:repaired', () => {
      this.updateShipHUD(this.stateManager.getState().ship);
      if (this.tradePanelOpen) this.renderTradePanel();
    });
    eventBus.on('port:repair_stopped', () => {
      if (this.tradePanelOpen) this.renderTradePanel();
    });
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
    eventBus.on('voyageLog:entryAdded', () => {
      if (this.voyageLogPanelOpen) {
        this.renderVoyageLogPanel();
      }
    });
    eventBus.on('voyageLog:cleared', () => {
      if (this.voyageLogPanelOpen) {
        this.renderVoyageLogPanel();
      }
    });
    eventBus.on('achievement:unlocked', (data: any) => {
      this.showAchievementPopup(data.achievement);
      if (this.achievementPanelOpen) {
        this.renderAchievementPanel();
      }
    });
    eventBus.on('codex:entryDiscovered', () => {
      if (this.codexPanelOpen) {
        this.renderCodexPanel();
      }
    });
    eventBus.on('dialogue:node', this.onDialogueNode.bind(this));
    eventBus.on('dialogue:ended', this.onDialogueEnded.bind(this));
    eventBus.on('daynight:tick', this.updateDayNightHUD.bind(this));
    eventBus.on('tasks:updated', this.updateDynamicTaskPanel.bind(this));
    eventBus.on('task:accepted', (task: DynamicTask) => {
      this.renderDynamicTaskPanel();
    });
    eventBus.on('task:completed', (task: DynamicTask) => {
      this.renderDynamicTaskPanel();
    });
    eventBus.on('task:expired', () => {
      this.renderDynamicTaskPanel();
    });
    eventBus.on('minimap:fogUpdated', (fogCanvas: HTMLCanvasElement) => {
      this.minimapFogCanvas = fogCanvas;
    });
    eventBus.on('fog:initialized', () => {
      if (this.currentScreen === 'game') {
        this.startMinimapRendering();
      }
    });
  }

  public showScreen(screen: GameScreen): void {
    if (this.currentScreen === 'game' && screen !== 'game') {
      this.stopMinimapRendering();
    }
    
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
      case 'achievements':
        this.renderAchievementsScreen();
        break;
      case 'codex':
        this.renderCodexScreen();
        break;
      case 'dialog':
        this.renderDialogueScreen();
        break;
      case 'editor':
        this.renderEditorScreen();
        break;
    }
  }

  private renderMainMenu(): void {
    const menu = document.createElement('div');
    menu.className = 'menu-screen';
    
    const achievementProgress = this.achievementModule.getOverallProgress();
    const codexProgress = this.codexModule.getOverallProgress();
    
    menu.innerHTML = `
      <h1 class="game-title">观星航路</h1>
      <p class="game-subtitle">CELESTIAL VOYAGE</p>
      <div class="menu-buttons">
        <button class="menu-btn" data-action="newGame">开始新航程</button>
        <button class="menu-btn" data-action="continue">继续航程</button>
        <button class="menu-btn" data-action="chapterSelect">选择章节</button>
        <button class="menu-btn" data-action="achievements">
          🏆 成就殿堂 <span class="menu-badge">${achievementProgress.unlocked}/${achievementProgress.total}</span>
        </button>
        <button class="menu-btn" data-action="codex">
          📖 图鉴 <span class="menu-badge">${codexProgress.discovered}/${codexProgress.total}</span>
        </button>
        <button class="menu-btn" data-action="editor">📝 章节编辑器</button>
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
        if (action === 'achievements') {
          this.showScreen('achievements');
        } else if (action === 'codex') {
          this.showScreen('codex');
        } else if (action === 'editor') {
          this.showScreen('editor');
        } else {
          eventBus.emit('menu:action', action);
        }
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
          <div class="hud-item">
            <span class="hud-label" id="hud-daynight-icon">🌙</span>
            <span class="hud-value" id="hud-daynight">深夜</span>
            <span class="hud-label" style="margin-left: 0.3rem;" id="hud-daynight-time">21:00</span>
          </div>
          <div class="hud-item" id="hud-ship-health-item">
            <span class="hud-label">❤️ 船体:</span>
            <span class="hud-value" id="hud-ship-health">100/100</span>
            <span class="hud-label" id="hud-ship-status" style="margin-left: 0.3rem; color: #2ecc71;">完好</span>
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
      
      <div class="dynamic-task-panel" id="dynamic-task-panel">
        <div class="dynamic-task-header">
          <span class="dynamic-task-header-icon">📋</span>
          <span class="dynamic-task-header-title">动态任务</span>
        </div>
        <div class="dynamic-task-list" id="dynamic-task-list"></div>
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

      <button class="menu-btn voyage-log-btn" id="btn-voyage-log">
        📜 日志
      </button>

      <button class="menu-btn achievement-btn" id="btn-achievements">
        🏆 成就
      </button>

      <button class="menu-btn codex-btn" id="btn-codex">
        📖 图鉴
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

    document.getElementById('btn-voyage-log')?.addEventListener('click', () => {
      this.toggleVoyageLogPanel();
      eventBus.emit('sound:play', 'button_click');
    });

    document.getElementById('btn-achievements')?.addEventListener('click', () => {
      this.toggleAchievementPanel();
      eventBus.emit('sound:play', 'button_click');
    });

    document.getElementById('btn-codex')?.addEventListener('click', () => {
      this.toggleCodexPanel();
      eventBus.emit('sound:play', 'button_click');
    });
    
    this.updateHUD();
    this.renderDynamicTaskPanel();
    this.initMinimap();
    this.startMinimapRendering();
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

    const healthEl = document.getElementById('hud-ship-health');
    const statusEl = document.getElementById('hud-ship-status');
    if (healthEl && statusEl) {
      healthEl.textContent = `${Math.round(ship.health)}/${ship.maxHealth}`;
      const healthStatus = this.damageModule.getHealthStatus();
      statusEl.textContent = healthStatus.status;

      let color = '#2ecc71';
      if (healthStatus.ratio <= 0.2) color = '#e74c3c';
      else if (healthStatus.ratio <= 0.4) color = '#e67e22';
      else if (healthStatus.ratio <= 0.6) color = '#f39c12';
      else if (healthStatus.ratio <= 0.8) color = '#f1c40f';
      statusEl.style.color = color;
    }
  }

  private updateWeatherHUD(weather: any): void {
    const weatherEl = document.getElementById('hud-weather');
    if (weatherEl) {
      weatherEl.textContent = weather?.name || '晴朗';
    }
  }

  private updateDayNightHUD(data: any): void {
    if (!data) return;
    const iconEl = document.getElementById('hud-daynight-icon');
    const labelEl = document.getElementById('hud-daynight');
    const timeEl = document.getElementById('hud-daynight-time');

    const icons: Record<string, string> = {
      dawn: '🌅',
      day: '☀️',
      dusk: '🌇',
      night: '🌙',
    };

    if (iconEl && data.timeOfDay) {
      iconEl.textContent = icons[data.timeOfDay] || '🌙';
    }
    if (labelEl && data.label) {
      labelEl.textContent = data.label;
    }
    if (timeEl && data.currentTime !== undefined) {
      const hours = Math.floor(data.currentTime);
      const minutes = Math.floor((data.currentTime - hours) * 60);
      timeEl.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  private updateHUD(): void {
    const state = this.stateManager.getState();
    const chapter = this.chapterModule?.getCurrentChapter();
    
    if (chapter) {
      const totalStars = chapter.stars.filter(s => s.isClickable).length;
      const totalConstellations = chapter.constellations.length;
      
      const starsEl = document.getElementById('hud-stars');
      if (starsEl) {
        starsEl.textContent = `${state.discoveredStars.length}/${totalStars}`;
      }
      
      const constellationsEl = document.getElementById('hud-constellations');
      if (constellationsEl) {
        constellationsEl.textContent = `${state.discoveredConstellations.length}/${totalConstellations}`;
      }
    }
    
    const timeEl = document.getElementById('hud-time');
    if (timeEl) {
      timeEl.textContent = this.formatTime(state.playTime);
    }
    
    this.updateCrewHUD();
    this.updateDynamicTaskPanel();
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private renderDynamicTaskPanel(): void {
    const listEl = document.getElementById('dynamic-task-list');
    if (!listEl) return;

    const activeTasks = this.taskModule.getActiveTasksWithInfo();

    if (activeTasks.length === 0) {
      listEl.innerHTML = `<div class="dynamic-task-empty">暂无动态任务，继续探索以触发新任务</div>`;
      return;
    }

    const sortedTasks = [...activeTasks].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.task.priority] - priorityOrder[b.task.priority];
    });

    listEl.innerHTML = sortedTasks.map(({ task, progress }) => {
      const pct = task.total > 0 ? Math.min(Math.round((progress.progress / task.total) * 100), 100) : 0;
      const priorityClass = `priority-${task.priority}`;
      const expiresIn = progress.expiresAt ? Math.max(0, Math.round((progress.expiresAt - Date.now()) / 1000)) : null;
      const expiryText = expiresIn !== null && expiresIn > 0 ? `⏱ ${expiresIn}s` : '';
      const rewardIcons = task.rewards.map(r => {
        switch (r.type) {
          case 'gold': return '💰';
          case 'supplies': return '📦';
          case 'exp': return '⭐';
          case 'unlock_chapter': return '🔓';
          default: return '';
        }
      }).join(' ');

      return `
        <div class="dynamic-task-item ${priorityClass}">
          <div class="dynamic-task-name">${task.name}</div>
          <div class="dynamic-task-desc">${task.description}</div>
          <div class="dynamic-task-progress-bar">
            <div class="dynamic-task-progress-fill" style="width: ${pct}%"></div>
          </div>
          <div class="dynamic-task-meta">
            <span class="dynamic-task-progress-text">${progress.progress}/${task.total}</span>
            <span class="dynamic-task-rewards">${rewardIcons}</span>
            <span class="dynamic-task-expiry">${expiryText}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  private updateDynamicTaskPanel(): void {
    const now = Date.now();
    if (now - this.dynamicTaskLastRender < 1000) return;
    this.dynamicTaskLastRender = now;
    this.renderDynamicTaskPanel();
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
        <button class="trade-tab ${activeTab === 'repair' ? 'active' : ''}" data-tab="repair">🔧 维修船体</button>
        <button class="trade-tab ${activeTab === 'special' ? 'active' : ''}" data-tab="special">特殊物品</button>
        <button class="trade-tab ${activeTab === 'inventory' ? 'active' : ''}" data-tab="inventory">背包</button>
      </div>

      <div class="trade-tab-content" id="trade-tab-content">
        ${activeTab === 'buy' ? this.renderBuyTab(portItems, crew.gold, ship.supplies) : ''}
        ${activeTab === 'sell' ? this.renderSellTab(trade.inventory, portItems) : ''}
        ${activeTab === 'repair' ? this.renderRepairTab(port, crew.gold, ship.supplies, ship.health, ship.maxHealth) : ''}
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

  private renderRepairTab(port: Port, gold: number, supplies: number, health: number, maxHealth: number): string {
    const healthNeeded = maxHealth - health;
    const healthPercent = (health / maxHealth) * 100;
    const isRepairing = this.damageModule.isCurrentlyRepairing();
    const config = this.damageModule.getPortRepairConfig();

    const gradualCost = this.damageModule.calculateRepairCost(Math.min(config.repairRate, healthNeeded), false);
    const instantCost = this.damageModule.calculateRepairCost(healthNeeded, true);

    const canGradual = healthNeeded > 0 && gold >= gradualCost.gold && supplies >= gradualCost.supplies && !isRepairing;
    const canInstant = healthNeeded > 0 && gold >= instantCost.gold && supplies >= instantCost.supplies;

    let healthColor = '#2ecc71';
    if (healthPercent <= 20) healthColor = '#e74c3c';
    else if (healthPercent <= 40) healthColor = '#e67e22';
    else if (healthPercent <= 60) healthColor = '#f39c12';
    else if (healthPercent <= 80) healthColor = '#f1c40f';

    return `
      <div class="repair-panel">
        <div class="repair-status">
          <div class="repair-status-header">
            <span class="repair-status-label">船体状态</span>
            <span class="repair-status-value" style="color: ${healthColor}">${Math.round(health)}/${maxHealth}</span>
          </div>
          <div class="repair-progress-bar">
            <div class="repair-progress-fill" style="width: ${healthPercent}%; background: ${healthColor}"></div>
          </div>
          <div class="repair-status-desc">
            ${healthNeeded <= 0 ? '✅ 船体状态完好，无需维修' : `需要修复 ${healthNeeded} 点耐久`}
          </div>
        </div>

        <div class="repair-options">
          <div class="repair-option-card">
            <div class="repair-option-header">
              <span class="repair-option-icon">🔧</span>
              <span class="repair-option-name">渐进维修</span>
              ${isRepairing ? '<span class="repair-active-tag">维修中</span>' : ''}
            </div>
            <div class="repair-option-desc">
              每秒修复 ${config.repairRate} 点耐久<br>
              消耗：每秒 ${gradualCost.gold}💰 ${gradualCost.supplies}📦
            </div>
            <div class="repair-option-actions">
              ${isRepairing ? `
                <button class="menu-btn repair-stop-btn" data-port-id="${port.id}" data-port-name="${port.name}">
                  ⏹ 停止维修
                </button>
              ` : `
                <button class="menu-btn repair-start-btn" data-port-id="${port.id}" data-port-name="${port.name}" ${!canGradual ? 'disabled' : ''}>
                  ▶ 开始维修
                </button>
              `}
            </div>
          </div>

          <div class="repair-option-card">
            <div class="repair-option-header">
              <span class="repair-option-icon">⚡</span>
              <span class="repair-option-name">紧急维修</span>
            </div>
            <div class="repair-option-desc">
              立即修复全部耐久<br>
              消耗：${instantCost.gold}💰 ${instantCost.supplies}📦
            </div>
            <div class="repair-option-actions">
              <button class="menu-btn repair-instant-btn" data-port-id="${port.id}" data-port-name="${port.name}" ${!canInstant ? 'disabled' : ''}>
                立即修复
              </button>
            </div>
          </div>
        </div>

        <div class="repair-history">
          <div class="repair-history-title">📋 最近维修记录</div>
          <div class="repair-history-list">
            ${this.damageModule.getRepairRecords().length === 0 ? 
              '<div class="repair-history-empty">暂无维修记录</div>' :
              this.damageModule.getRepairRecords().slice(-5).reverse().map(record => `
                <div class="repair-history-item">
                  <span class="repair-history-amount">+${record.amount}</span>
                  <span class="repair-history-location">${record.location}</span>
                  <span class="repair-history-time">${new Date(record.timestamp).toLocaleTimeString()}</span>
                </div>
              `).join('')
            }
          </div>
        </div>
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

    panel.querySelectorAll('.repair-start-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const portId = target.dataset.portId;
        const portName = target.dataset.portName;
        if (portId && portName) {
          eventBus.emit('port:repair_start', { portId, portName });
          eventBus.emit('sound:play', 'button_click');
        }
      });
    });

    panel.querySelectorAll('.repair-stop-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        eventBus.emit('port:repair_stop');
        eventBus.emit('sound:play', 'button_click');
      });
    });

    panel.querySelectorAll('.repair-instant-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const portId = target.dataset.portId;
        const portName = target.dataset.portName;
        if (portId && portName) {
          eventBus.emit('port:repair_instant', { portId, portName });
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

  private toggleVoyageLogPanel(): void {
    this.voyageLogPanelOpen = !this.voyageLogPanelOpen;
    const existingPanel = document.getElementById('voyage-log-panel');

    if (this.voyageLogPanelOpen) {
      this.renderVoyageLogPanel();
    } else {
      existingPanel?.remove();
    }
  }

  private renderVoyageLogPanel(): void {
    document.getElementById('voyage-log-panel')?.remove();

    const stats = this.voyageLogModule.getStats();
    const totalEntries = stats.chapter + stats.star + stats.weather + stats.event;

    const categories: Array<{ key: VoyageLogCategory | 'all'; label: string; icon: string; count: number }> = [
      { key: 'all', label: '全部', icon: '📋', count: totalEntries },
      { key: 'chapter', label: '章节推进', icon: '📖', count: stats.chapter },
      { key: 'star', label: '星辰发现', icon: '⭐', count: stats.star },
      { key: 'weather', label: '天气经历', icon: '🌦️', count: stats.weather },
      { key: 'event', label: '关键事件', icon: '⚓', count: stats.event },
    ];

    const entries = this.voyageLogModule.getEntries({
      category: this.activeLogCategory === 'all' ? undefined : this.activeLogCategory,
      keyword: this.logSearchKeyword || undefined,
    }).sort((a, b) => b.timestamp - a.timestamp);

    const panel = document.createElement('div');
    panel.id = 'voyage-log-panel';
    panel.className = 'voyage-log-panel';

    panel.innerHTML = `
      <div class="voyage-log-panel-header">
        <h3 class="voyage-log-panel-title">📜 航海日志</h3>
        <button class="voyage-log-panel-close" id="voyage-log-close-btn">×</button>
      </div>

      <div class="voyage-log-stats">
        ${categories.map(cat => `
          <div class="voyage-log-stat-item">
            <span class="voyage-log-stat-label">${cat.icon} ${cat.label}</span>
            <span class="voyage-log-stat-value">${cat.count}</span>
          </div>
        `).join('')}
      </div>

      <div class="voyage-log-toolbar">
        <div class="voyage-log-search">
          <span style="color: #888;">🔍</span>
          <input 
            type="text" 
            class="voyage-log-search-input" 
            id="voyage-log-search-input"
            placeholder="搜索日志内容..."
            value="${this.logSearchKeyword}"
          >
        </div>
        <button class="voyage-log-clear-btn" id="voyage-log-clear-btn" ${totalEntries === 0 ? 'disabled' : ''} style="${totalEntries === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
          🗑️ 清空日志
        </button>
      </div>

      <div class="voyage-log-categories">
        ${categories.map(cat => `
          <button class="voyage-log-category-tab ${this.activeLogCategory === cat.key ? 'active' : ''}" 
                  data-category="${cat.key}">
            <span class="voyage-log-category-icon">${cat.icon}</span>
            <span>${cat.label}</span>
            <span class="voyage-log-category-count">${cat.count}</span>
          </button>
        `).join('')}
      </div>

      <div class="voyage-log-list" id="voyage-log-list">
        ${entries.length === 0 ? this.renderVoyageLogEmpty(this.activeLogCategory) : 
          entries.map(entry => this.renderVoyageLogEntry(entry)).join('')}
      </div>
    `;

    this.uiLayer.appendChild(panel);

    document.getElementById('voyage-log-close-btn')?.addEventListener('click', () => {
      this.voyageLogPanelOpen = false;
      panel.remove();
      eventBus.emit('sound:play', 'button_click');
    });

    const searchInput = document.getElementById('voyage-log-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.logSearchKeyword = (e.target as HTMLInputElement).value;
      this.renderVoyageLogPanel();
    });

    document.getElementById('voyage-log-clear-btn')?.addEventListener('click', () => {
      if (entries.length === 0) return;
      if (confirm('确定要清空所有航海日志吗？此操作不可撤销。')) {
        this.voyageLogModule.clearEntries();
        eventBus.emit('sound:play', 'button_click');
        this.showToast({ message: '航海日志已清空' });
        this.renderVoyageLogPanel();
      }
    });

    panel.querySelectorAll('.voyage-log-category-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const category = (e.currentTarget as HTMLElement).dataset.category as VoyageLogCategory | 'all';
        this.activeLogCategory = category;
        this.renderVoyageLogPanel();
        eventBus.emit('sound:play', 'button_click');
      });
    });
  }

  private renderVoyageLogEmpty(category: VoyageLogCategory | 'all'): string {
    const categoryNames: Record<string, string> = {
      all: '日志',
      chapter: '章节推进记录',
      star: '星辰发现记录',
      weather: '天气经历记录',
      event: '关键事件记录',
    };
    const name = categoryNames[category] || '日志';

    return `
      <div class="voyage-log-empty">
        <div class="voyage-log-empty-icon">📜</div>
        <div class="voyage-log-empty-text">暂无${name}</div>
        <div class="voyage-log-empty-hint">
          ${category === 'all' ? '探索星图、推进章节，你的航海经历会自动记录在这里' : '继续探索以积累更多这类记录'}
        </div>
      </div>
    `;
  }

  private renderVoyageLogEntry(entry: VoyageLogEntry): string {
    const categoryIcons: Record<VoyageLogCategory, string> = {
      chapter: '📖',
      star: '⭐',
      weather: '🌦️',
      event: '⚓',
    };
    const categoryLabels: Record<VoyageLogCategory, string> = {
      chapter: '章节推进',
      star: '星辰发现',
      weather: '天气经历',
      event: '关键事件',
    };
    const icon = categoryIcons[entry.category];
    const label = categoryLabels[entry.category];
    const timestamp = this.formatLogTimestamp(entry.timestamp);

    const metaItems: string[] = [];
    if (entry.chapterId) {
      metaItems.push(`章节: ${entry.chapterId}`);
    }
    if (entry.metadata && typeof entry.metadata === 'object') {
      Object.entries(entry.metadata).forEach(([key, value]) => {
        if (key !== 'chapterNumber' && value !== undefined && value !== null && value !== '') {
          metaItems.push(`${key}: ${String(value)}`);
        }
      });
    }

    return `
      <div class="voyage-log-entry category-${entry.category}">
        <div class="voyage-log-entry-header">
          <div class="voyage-log-entry-title">
            <span class="voyage-log-entry-category-badge category-${entry.category}">
              ${icon} ${label}
            </span>
            ${entry.title}
          </div>
          <div class="voyage-log-entry-timestamp">${timestamp}</div>
        </div>
        <div class="voyage-log-entry-description">${entry.description}</div>
        ${metaItems.length > 0 ? `
          <div class="voyage-log-entry-meta">
            ${metaItems.map(m => `<span class="voyage-log-entry-meta-item">${m}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  private formatLogTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
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

  private showAchievementPopup(achievement: Achievement): void {
    const popup = document.createElement('div');
    popup.className = 'achievement-popup';
    
    const rarityColors: Record<string, string> = {
      common: '#aaaaaa',
      uncommon: '#4ade80',
      rare: '#60a5fa',
      epic: '#c084fc',
      legendary: '#fbbf24'
    };
    
    const rarityLabels: Record<string, string> = {
      common: '普通',
      uncommon: '优秀',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说'
    };
    
    const color = rarityColors[achievement.rarity] || '#ffffff';
    const label = rarityLabels[achievement.rarity] || '未知';
    
    popup.innerHTML = `
      <div class="achievement-popup-content" style="border-color: ${color}">
        <div class="achievement-popup-icon">${achievement.icon}</div>
        <div class="achievement-popup-info">
          <div class="achievement-popup-title" style="color: ${color}">🏆 成就解锁！</div>
          <div class="achievement-popup-name">${achievement.name}</div>
          <div class="achievement-popup-desc">${achievement.description}</div>
          <div class="achievement-popup-rarity" style="color: ${color}">
            ${label}成就
            ${achievement.reward ? ` · 奖励: ${achievement.reward.value}${achievement.reward.type === 'gold' ? '💰' : achievement.reward.type === 'supplies' ? '📦' : '⭐'}` : ''}
          </div>
        </div>
      </div>
    `;
    
    this.uiLayer.appendChild(popup);
    
    setTimeout(() => {
      popup.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 500);
    }, 4000);
  }

  private toggleAchievementPanel(): void {
    this.achievementPanelOpen = !this.achievementPanelOpen;
    const existingPanel = document.getElementById('achievement-panel');
    
    if (this.achievementPanelOpen) {
      this.renderAchievementPanel();
    } else {
      existingPanel?.remove();
    }
  }

  private renderAchievementPanel(): void {
    document.getElementById('achievement-panel')?.remove();

    const progress = this.achievementModule.getOverallProgress();
    const panel = document.createElement('div');
    panel.id = 'achievement-panel';
    panel.className = 'achievement-panel';

    const activeTab = this.activeAchievementCategory;
    (panel.dataset as any).tab = activeTab;

    const categories = [
      { key: 'all' as const, label: '全部', icon: '🏆' },
      { key: 'star' as const, label: '星辰', icon: '⭐' },
      { key: 'constellation' as const, label: '星座', icon: '🔯' },
      { key: 'waypoint' as const, label: '航点', icon: '⚓' },
      { key: 'chapter' as const, label: '章节', icon: '📖' },
      { key: 'collection' as const, label: '收集', icon: '📚' },
      { key: 'special' as const, label: '特殊', icon: '✨' }
    ];

    const achievements = activeTab === 'all' 
      ? this.achievementModule.getAchievementsWithProgress()
      : this.achievementModule.getAchievementsByCategory(activeTab);

    panel.innerHTML = `
      <div class="achievement-panel-header">
        <h3 class="achievement-panel-title">🏆 成就殿堂</h3>
        <div class="achievement-panel-stats">
          <span>已解锁: <strong>${progress.unlocked}</strong>/${progress.total}</span>
          <div class="achievement-progress-bar">
            <div class="achievement-progress-fill" style="width: ${progress.percentage}%"></div>
          </div>
          <span>${progress.percentage}%</span>
        </div>
        <button class="achievement-panel-close" id="achievement-close-btn">×</button>
      </div>

      <div class="achievement-tabs">
        ${categories.map(cat => `
          <button class="achievement-tab ${activeTab === cat.key ? 'active' : ''}" data-category="${cat.key}">
            <span>${cat.icon}</span>
            <span>${cat.label}</span>
          </button>
        `).join('')}
      </div>

      <div class="achievement-list" id="achievement-list">
        ${achievements.length === 0 ? this.renderAchievementEmpty() : 
          achievements.map(ach => this.renderAchievementCard(ach)).join('')}
      </div>
    `;

    this.uiLayer.appendChild(panel);

    document.getElementById('achievement-close-btn')?.addEventListener('click', () => {
      this.achievementPanelOpen = false;
      panel.remove();
      eventBus.emit('sound:play', 'button_click');
    });

    panel.querySelectorAll('.achievement-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const category = (e.currentTarget as HTMLElement).dataset.category as AchievementCategory | 'all';
        this.activeAchievementCategory = category;
        this.renderAchievementPanel();
        eventBus.emit('sound:play', 'button_click');
      });
    });
  }

  private renderAchievementEmpty(): string {
    return `
      <div class="achievement-empty">
        <div class="achievement-empty-icon">🏆</div>
        <div class="achievement-empty-text">该分类暂无成就</div>
        <div class="achievement-empty-hint">继续探索以解锁更多成就</div>
      </div>
    `;
  }

  private renderAchievementCard(achievement: Achievement & { progress: number; unlocked: boolean; unlockedAt?: number }): string {
    const rarityColors: Record<string, string> = {
      common: '#aaaaaa',
      uncommon: '#4ade80',
      rare: '#60a5fa',
      epic: '#c084fc',
      legendary: '#fbbf24'
    };

    const rarityLabels: Record<string, string> = {
      common: '普通',
      uncommon: '优秀',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说'
    };

    const color = rarityColors[achievement.rarity] || '#ffffff';
    const label = rarityLabels[achievement.rarity] || '未知';
    const progressPct = Math.min(100, Math.round((achievement.progress / achievement.targetCount) * 100));

    return `
      <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}" 
           style="border-left-color: ${color}">
        <div class="achievement-card-icon">${achievement.unlocked ? achievement.icon : '🔒'}</div>
        <div class="achievement-card-info">
          <div class="achievement-card-header">
            <span class="achievement-card-name" style="color: ${achievement.unlocked ? color : '#666'}">
              ${achievement.unlocked ? achievement.name : '???'}
            </span>
            <span class="achievement-card-rarity" style="color: ${color}">${label}</span>
          </div>
          <div class="achievement-card-desc">
            ${achievement.unlocked ? achievement.description : '完成特定条件以解锁此成就'}
          </div>
          <div class="achievement-card-progress">
            <div class="achievement-card-progress-bar">
              <div class="achievement-card-progress-fill" 
                   style="width: ${progressPct}%; background: ${color}"></div>
            </div>
            <span class="achievement-card-progress-text">
              ${achievement.progress}/${achievement.targetCount}
            </span>
          </div>
          ${achievement.unlocked && achievement.unlockedAt ? `
            <div class="achievement-card-unlock-time">
              解锁于: ${new Date(achievement.unlockedAt).toLocaleDateString('zh-CN')}
            </div>
          ` : ''}
          ${achievement.reward ? `
            <div class="achievement-card-reward">
              奖励: ${achievement.reward.value}${achievement.reward.type === 'gold' ? '💰' : achievement.reward.type === 'supplies' ? '📦' : '⭐'}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  private renderAchievementsScreen(): void {
    const menu = document.createElement('div');
    menu.className = 'menu-screen';
    
    const progress = this.achievementModule.getOverallProgress();
    
    menu.innerHTML = `
      <h2 style="color: #ffd700; margin-bottom: 0.5rem; letter-spacing: 0.3em;">🏆 成就殿堂</h2>
      <p style="color: #888; margin-bottom: 1.5rem;">
        已解锁: <strong>${progress.unlocked}</strong>/${progress.total} (${progress.percentage}%)
      </p>
      <div id="achievements-screen-content" style="width: 100%; max-width: 900px; max-height: 60vh; overflow-y: auto;">
        ${this.renderAchievementsScreenContent()}
      </div>
      <button class="menu-btn" style="margin-top: 2rem;" data-action="back">返回主菜单</button>
    `;
    
    this.uiLayer.appendChild(menu);
    
    menu.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.showScreen('menu');
      eventBus.emit('sound:play', 'button_click');
    });
  }

  private renderAchievementsScreenContent(): string {
    const categories = [
      { key: 'star' as const, label: '星辰成就', icon: '⭐' },
      { key: 'constellation' as const, label: '星座成就', icon: '🔯' },
      { key: 'waypoint' as const, label: '航点成就', icon: '⚓' },
      { key: 'chapter' as const, label: '章节成就', icon: '📖' },
      { key: 'collection' as const, label: '收集成就', icon: '📚' },
      { key: 'special' as const, label: '特殊成就', icon: '✨' }
    ];

    return categories.map(cat => {
      const achievements = this.achievementModule.getAchievementsByCategory(cat.key);
      const catProgress = {
        unlocked: achievements.filter(a => a.unlocked).length,
        total: achievements.length,
        percentage: achievements.length > 0 
          ? Math.round((achievements.filter(a => a.unlocked).length / achievements.length) * 100) 
          : 0
      };

      return `
        <div class="achievement-category-section">
          <div class="achievement-category-header">
            <h3>${cat.icon} ${cat.label}</h3>
            <span>${catProgress.unlocked}/${catProgress.total} (${catProgress.percentage}%)</span>
          </div>
          <div class="achievement-category-grid">
            ${achievements.map(ach => this.renderAchievementCard(ach)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  private toggleCodexPanel(): void {
    this.codexPanelOpen = !this.codexPanelOpen;
    const existingPanel = document.getElementById('codex-panel');
    
    if (this.codexPanelOpen) {
      this.renderCodexPanel();
    } else {
      existingPanel?.remove();
    }
  }

  private renderCodexPanel(): void {
    document.getElementById('codex-panel')?.remove();

    const progress = this.codexModule.getOverallProgress();
    const panel = document.createElement('div');
    panel.id = 'codex-panel';
    panel.className = 'codex-panel';

    const activeTab = this.activeCodexCategory;
    (panel.dataset as any).tab = activeTab;

    const categories = [
      { key: 'stars' as const, label: '星辰图鉴', icon: '⭐' },
      { key: 'constellations' as const, label: '星座图鉴', icon: '🔯' },
      { key: 'waypoints' as const, label: '航点图鉴', icon: '⚓' },
      { key: 'chapters' as const, label: '章节图鉴', icon: '📖' }
    ];

    const entries = this.codexModule.getEntriesByCategory(activeTab);

    panel.innerHTML = `
      <div class="codex-panel-header">
        <h3 class="codex-panel-title">📖 图鉴</h3>
        <div class="codex-panel-stats">
          <span>已发现: <strong>${progress.discovered}</strong>/${progress.total}</span>
          <div class="codex-progress-bar">
            <div class="codex-progress-fill" style="width: ${progress.percentage}%"></div>
          </div>
          <span>${progress.percentage}%</span>
        </div>
        <button class="codex-panel-close" id="codex-close-btn">×</button>
      </div>

      <div class="codex-tabs">
        ${categories.map(cat => {
          const catProgress = this.codexModule.getCategoryProgress(cat.key);
          return `
            <button class="codex-tab ${activeTab === cat.key ? 'active' : ''}" data-category="${cat.key}">
              <span>${cat.icon}</span>
              <span>${cat.label}</span>
              <span class="codex-tab-count">${catProgress.discovered}/${catProgress.total}</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="codex-list" id="codex-list">
        ${entries.length === 0 ? this.renderCodexEmpty() : 
          entries.map(entry => this.renderCodexEntry(entry)).join('')}
      </div>
    `;

    this.uiLayer.appendChild(panel);

    document.getElementById('codex-close-btn')?.addEventListener('click', () => {
      this.codexPanelOpen = false;
      panel.remove();
      eventBus.emit('sound:play', 'button_click');
    });

    panel.querySelectorAll('.codex-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const category = (e.currentTarget as HTMLElement).dataset.category as CodexCategory;
        this.activeCodexCategory = category;
        this.renderCodexPanel();
        eventBus.emit('sound:play', 'button_click');
      });
    });
  }

  private renderCodexEmpty(): string {
    return `
      <div class="codex-empty">
        <div class="codex-empty-icon">📖</div>
        <div class="codex-empty-text">该分类暂无条目</div>
        <div class="codex-empty-hint">探索星图、发现新地点以解锁图鉴</div>
      </div>
    `;
  }

  private renderCodexEntry(entry: CodexEntry): string {
    const categoryIcons: Record<string, string> = {
      stars: '⭐',
      constellations: '🔯',
      waypoints: '⚓',
      chapters: '📖'
    };

    const icon = categoryIcons[entry.category] || '📄';

    return `
      <div class="codex-entry ${entry.discovered ? 'discovered' : 'undiscovered'}">
        <div class="codex-entry-icon">${entry.discovered ? icon : '❓'}</div>
        <div class="codex-entry-info">
          <div class="codex-entry-name">
            ${entry.discovered ? entry.name : '???'}
          </div>
          <div class="codex-entry-desc">
            ${entry.discovered ? entry.description : '尚未发现，继续探索以解锁此条目'}
          </div>
          ${entry.discovered && entry.discoveredAt ? `
            <div class="codex-entry-time">
              发现于: ${new Date(entry.discoveredAt).toLocaleDateString('zh-CN')}
            </div>
          ` : ''}
          ${entry.discovered && entry.metadata ? this.renderCodexMetadata(entry) : ''}
        </div>
      </div>
    `;
  }

  private renderCodexMetadata(entry: CodexEntry): string {
    if (!entry.metadata) return '';

    const metaItems: string[] = [];

    if (entry.category === 'stars') {
      if (entry.metadata.color) metaItems.push(`颜色: <span style="color: ${entry.metadata.color}">●</span> ${entry.metadata.color}`);
      if (entry.metadata.brightness !== undefined) metaItems.push(`亮度: ${Math.round(Number(entry.metadata.brightness) * 100)}%`);
      if (entry.metadata.size !== undefined) metaItems.push(`大小: ${entry.metadata.size}`);
    } else if (entry.category === 'constellations') {
      if (entry.metadata.starCount !== undefined) metaItems.push(`星数: ${entry.metadata.starCount}颗`);
    } else if (entry.category === 'waypoints') {
      if (entry.metadata.type) {
        const typeLabels: Record<string, string> = {
          start: '起始港口',
          waypoint: '航路点',
          landmark: '标志性地点',
          end: '目的地港口'
        };
        metaItems.push(`类型: ${typeLabels[String(entry.metadata.type)] || entry.metadata.type}`);
      }
    } else if (entry.category === 'chapters') {
      if (entry.metadata.starCount !== undefined) metaItems.push(`星辰: ${entry.metadata.starCount}颗`);
      if (entry.metadata.constellationCount !== undefined) metaItems.push(`星座: ${entry.metadata.constellationCount}个`);
      if (entry.metadata.waypointCount !== undefined) metaItems.push(`航点: ${entry.metadata.waypointCount}个`);
    }

    if (metaItems.length === 0) return '';

    return `
      <div class="codex-entry-metadata">
        ${metaItems.map(item => `<span class="codex-meta-item">${item}</span>`).join('')}
      </div>
    `;
  }

  private renderCodexScreen(): void {
    const menu = document.createElement('div');
    menu.className = 'menu-screen';
    
    const progress = this.codexModule.getOverallProgress();
    
    menu.innerHTML = `
      <h2 style="color: #ffd700; margin-bottom: 0.5rem; letter-spacing: 0.3em;">📖 航海图鉴</h2>
      <p style="color: #888; margin-bottom: 1.5rem;">
        已发现: <strong>${progress.discovered}</strong>/${progress.total} (${progress.percentage}%)
      </p>
      <div id="codex-screen-content" style="width: 100%; max-width: 900px; max-height: 60vh; overflow-y: auto;">
        ${this.renderCodexScreenContent()}
      </div>
      <button class="menu-btn" style="margin-top: 2rem;" data-action="back">返回主菜单</button>
    `;
    
    this.uiLayer.appendChild(menu);
    
    menu.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.showScreen('menu');
      eventBus.emit('sound:play', 'button_click');
    });
  }

  private renderCodexScreenContent(): string {
    const categories = [
      { key: 'stars' as const, label: '星辰图鉴', icon: '⭐' },
      { key: 'constellations' as const, label: '星座图鉴', icon: '🔯' },
      { key: 'waypoints' as const, label: '航点图鉴', icon: '⚓' },
      { key: 'chapters' as const, label: '章节图鉴', icon: '📖' }
    ];

    return categories.map(cat => {
      const entries = this.codexModule.getEntriesByCategory(cat.key);
      const catProgress = this.codexModule.getCategoryProgress(cat.key);

      return `
        <div class="codex-category-section">
          <div class="codex-category-header">
            <h3>${cat.icon} ${cat.label}</h3>
            <span>${catProgress.discovered}/${catProgress.total} (${catProgress.percentage}%)</span>
          </div>
          <div class="codex-category-grid">
            ${entries.map(entry => this.renderCodexEntry(entry)).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  private onDialogueNode(node: DialogueNode): void {
    if (!this.dialogueOverlayEl) {
      this.dialogueOverlayEl = document.createElement('div');
      this.dialogueOverlayEl.className = 'dialogue-overlay';
      this.dialogueOverlayEl.innerHTML = `
        <div class="dialogue-container">
          <div class="dialogue-portrait" id="dialogue-portrait"></div>
          <div class="dialogue-content">
            <div class="dialogue-speaker">
              <span class="dialogue-speaker-name" id="dialogue-speaker-name"></span>
              <span class="dialogue-speaker-title" id="dialogue-speaker-title"></span>
            </div>
            <div class="dialogue-text" id="dialogue-text"></div>
            <div class="dialogue-choices" id="dialogue-choices"></div>
            <div class="dialogue-indicator" id="dialogue-indicator" style="display: none;">▼ 点击继续</div>
          </div>
          <button class="dialogue-skip-btn" id="dialogue-skip-btn">跳过</button>
        </div>
      `;
      this.uiLayer.appendChild(this.dialogueOverlayEl);
    }

    const nameEl = document.getElementById('dialogue-speaker-name');
    const titleEl = document.getElementById('dialogue-speaker-title');
    const textEl = document.getElementById('dialogue-text');
    const choicesEl = document.getElementById('dialogue-choices');
    const indicatorEl = document.getElementById('dialogue-indicator');
    const portraitEl = document.getElementById('dialogue-portrait');

    if (nameEl) nameEl.textContent = node.speaker;
    if (titleEl) titleEl.textContent = node.speakerTitle || '';
    if (portraitEl) portraitEl.textContent = node.portrait || '';
    if (choicesEl) choicesEl.innerHTML = '';
    if (indicatorEl) indicatorEl.style.display = 'none';

    this.startTypewriter(node.text || '', textEl!, () => {
      if (node.choices && node.choices.length > 0) {
        this.renderDialogueChoices(node.choices, choicesEl!);
      } else {
        if (indicatorEl) indicatorEl.style.display = 'block';
      }
    });

    const overlay = this.dialogueOverlayEl;
    const clickHandler = () => {
      if (!this.typewriterComplete) {
        this.completeTypewriter(textEl!);
        return;
      }
      if (node.choices && node.choices.length > 0) return;
      overlay.removeEventListener('click', clickHandler);
      eventBus.emit('dialogue:next');
    };
    overlay.onclick = clickHandler;

    const skipBtn = document.getElementById('dialogue-skip-btn');
    if (skipBtn) {
      skipBtn.onclick = () => {
        this.clearTypewriter();
        overlay.removeEventListener('click', clickHandler);
        eventBus.emit('dialogue:skip');
      };
    }
  }

  private startTypewriter(text: string, el: HTMLElement, onComplete: () => void): void {
    this.clearTypewriter();
    this.typewriterText = text;
    this.typewriterIndex = 0;
    this.typewriterComplete = false;
    el.textContent = '';

    const type = () => {
      if (this.typewriterIndex < this.typewriterText.length) {
        el.textContent = this.typewriterText.substring(0, this.typewriterIndex + 1);
        this.typewriterIndex++;
        this.typewriterTimer = window.setTimeout(type, 35);
      } else {
        this.typewriterComplete = true;
        this.typewriterTimer = null;
        onComplete();
      }
    };
    type();
  }

  private completeTypewriter(el: HTMLElement): void {
    this.clearTypewriter();
    el.textContent = this.typewriterText;
    this.typewriterComplete = true;

    const node = this.dialogueModule.getCurrentNode();
    if (node?.choices && node.choices.length > 0) {
      const choicesEl = document.getElementById('dialogue-choices');
      if (choicesEl) this.renderDialogueChoices(node.choices, choicesEl);
    } else {
      const indicatorEl = document.getElementById('dialogue-indicator');
      if (indicatorEl) indicatorEl.style.display = 'block';
    }
  }

  private clearTypewriter(): void {
    if (this.typewriterTimer !== null) {
      clearTimeout(this.typewriterTimer);
      this.typewriterTimer = null;
    }
  }

  private renderDialogueChoices(choices: DialogueNode['choices'], container: HTMLElement): void {
    if (!choices) return;
    const state = this.stateManager.getState();

    container.innerHTML = choices.map(choice => {
      let disabled = false;
      let reason = '';
      if (choice.condition) {
        if (choice.condition.minGold !== undefined && state.crew.gold < choice.condition.minGold) {
          disabled = true;
          reason = ' (金币不足)';
        }
        if (choice.condition.minSupplies !== undefined && state.ship.supplies < choice.condition.minSupplies) {
          disabled = true;
          reason = ' (物资不足)';
        }
        if (choice.condition.flag !== undefined) {
          const flagVal = this.dialogueModule.getFlag(choice.condition.flag);
          if (flagVal !== choice.condition.flagValue) {
            disabled = true;
            reason = ' (条件未满足)';
          }
        }
      }
      return `
        <button class="dialogue-choice-btn ${disabled ? 'disabled' : ''}" 
                data-choice-id="${choice.id}"
                ${disabled ? 'disabled' : ''}>
          ${choice.text}${reason}
        </button>
      `;
    }).join('');

    container.querySelectorAll('.dialogue-choice-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const choiceId = (e.currentTarget as HTMLElement).dataset.choiceId!;
        eventBus.emit('sound:play', 'button_click');
        eventBus.emit('dialogue:choice', choiceId);
      });
    });
  }

  private onDialogueEnded(): void {
    this.clearTypewriter();
    this.dialogueOverlayEl?.remove();
    this.dialogueOverlayEl = null;
  }

  private renderDialogueScreen(): void {
    const node = this.dialogueModule.getCurrentNode();
    if (node) {
      this.onDialogueNode(node);
    }
  }

  private initMinimap(): void {
    this.minimapCanvas = document.getElementById('minimap-canvas') as HTMLCanvasElement;
    if (!this.minimapCanvas) return;

    this.minimapCanvas.width = 256;
    this.minimapCanvas.height = 256;
    this.minimapContext = this.minimapCanvas.getContext('2d');

    const settings = this.stateManager.getState().settings;
    const minimapContainer = document.getElementById('minimap-container');
    if (minimapContainer) {
      minimapContainer.style.display = settings.showMinimap ? 'block' : 'none';
    }
  }

  private startMinimapRendering(): void {
    this.stopMinimapRendering();
    this.minimapFogCanvas = this.fogOfWarModule.getMinimapFogCanvas();
    this.renderMinimap();
  }

  private stopMinimapRendering(): void {
    if (this.minimapAnimationId !== null) {
      cancelAnimationFrame(this.minimapAnimationId);
      this.minimapAnimationId = null;
    }
  }

  private renderMinimap(): void {
    if (!this.minimapContext || !this.minimapCanvas) {
      this.minimapAnimationId = requestAnimationFrame(() => this.renderMinimap());
      return;
    }

    const ctx = this.minimapContext;
    const width = this.minimapCanvas.width;
    const height = this.minimapCanvas.height;

    ctx.clearRect(0, 0, width, height);

    if (this.minimapFogCanvas) {
      ctx.drawImage(this.minimapFogCanvas, 0, 0, width, height);
    } else {
      ctx.fillStyle = 'rgba(10, 10, 30, 0.95)';
      ctx.fillRect(0, 0, width, height);
    }

    const state = this.stateManager.getState();
    const chapter = this.chapterModule?.getCurrentChapter();
    
    if (!chapter || !state.currentChapterId) {
      this.minimapAnimationId = requestAnimationFrame(() => this.renderMinimap());
      return;
    }

    const { mapBounds, routePoints, routes } = chapter;
    const mapWidth = mapBounds.maxX - mapBounds.minX;
    const mapHeight = mapBounds.maxZ - mapBounds.minZ;

    const toMapX = (worldX: number) => ((worldX - mapBounds.minX) / mapWidth) * width;
    const toMapZ = (worldZ: number) => ((worldZ - mapBounds.minZ) / mapHeight) * height;

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
    ctx.lineWidth = 1;
    routes.forEach(route => {
      ctx.beginPath();
      route.points.forEach((pointId, index) => {
        const point = routePoints.find(p => p.id === pointId);
        if (!point) return;
        
        const isVisible = this.stateManager.isPointVisited(pointId) || 
          this.stateManager.isPositionExplored(point.position.x, point.position.z);
        
        if (!isVisible) return;

        const mx = toMapX(point.position.x);
        const mz = toMapZ(point.position.z);
        
        if (index === 0) {
          ctx.moveTo(mx, mz);
        } else {
          ctx.lineTo(mx, mz);
        }
      });
      ctx.stroke();
    });

    routePoints.forEach(point => {
      const isVisited = this.stateManager.isPointVisited(point.id);
      const isExplored = this.stateManager.isPositionExplored(point.position.x, point.position.z);
      
      if (!isVisited && !isExplored) return;

      const mx = toMapX(point.position.x);
      const mz = toMapZ(point.position.z);
      
      let color = '#d4af37';
      let size = 3;
      
      if (point.type === 'start') color = '#90ee90';
      if (point.type === 'end') color = '#ff6b6b';
      if (point.type === 'landmark') color = '#6bcbff';
      
      if (isVisited) {
        size = 4;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(mx, mz, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(mx, mz, size + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(mx, mz, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    });

    if (state.currentPosition) {
      const shipX = toMapX(state.currentPosition.x);
      const shipZ = toMapZ(state.currentPosition.z);
      
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(shipX, shipZ, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(shipX, shipZ, 7, 0, Math.PI * 2);
      ctx.stroke();
      
      const heading = state.ship.heading;
      if (heading !== undefined) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(shipX, shipZ);
        ctx.lineTo(
          shipX + Math.sin(heading) * 10,
          shipZ + Math.cos(heading) * 10
        );
        ctx.stroke();
      }
      
      const crewBonus = state.crew.efficiencyBonuses.starVision || 0;
      const viewRadius = (20 * (1 + crewBonus) / Math.min(mapWidth, mapHeight)) * Math.min(width, height);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(shipX, shipZ, viewRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const progress = this.fogOfWarModule.getExplorationProgress();
    ctx.fillStyle = 'rgba(212, 175, 55, 0.8)';
    ctx.font = '10px Georgia';
    ctx.textAlign = 'right';
    ctx.fillText(`探索: ${Math.round(progress * 100)}%`, width - 5, height - 5);

    this.minimapAnimationId = requestAnimationFrame(() => this.renderMinimap());
  }

  private renderEditorScreen(): void {
    const container = document.createElement('div');
    container.id = 'editor-container';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';

    const backBtn = document.createElement('button');
    backBtn.className = 'editor-btn editor-open-btn';
    backBtn.textContent = '← 返回主菜单';
    backBtn.addEventListener('click', () => {
      this.showScreen('menu');
      eventBus.emit('sound:play', 'button_click');
    });
    container.appendChild(backBtn);

    const editorContainer = document.createElement('div');
    editorContainer.style.width = '100%';
    editorContainer.style.height = '100%';
    container.appendChild(editorContainer);

    this.uiLayer.appendChild(container);

    requestAnimationFrame(() => {
      this.chapterEditorModule.show(editorContainer);
    });

    eventBus.emit('music:play', 'menu');
  }

  public dispose(): void {
    this.clearTypewriter();
    this.dialogueOverlayEl?.remove();
    this.dialogueOverlayEl = null;
    this.uiLayer.innerHTML = '';
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.stopMinimapRendering();
    this.minimapCanvas = null;
    this.minimapContext = null;
    this.minimapFogCanvas = null;
  }
}
