import { GameStateManager } from '../core/GameStateManager';
import { ChapterModule } from './ChapterModule';
import { eventBus } from '../utils/EventBus';
import { GameScreen, Objective, Chapter, ShipState, GameSettings } from '../types';

export class UIModule {
  private stateManager: GameStateManager;
  private chapterModule: ChapterModule | null = null;
  private uiLayer: HTMLElement;
  private currentScreen: GameScreen = 'menu';
  private toastTimer: number | null = null;

  constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.uiLayer = document.getElementById('ui-layer')!;
    
    this.setupEventListeners();
  }

  public setChapterModule(chapterModule: ChapterModule): void {
    this.chapterModule = chapterModule;
  }

  private setupEventListeners(): void {
    eventBus.on('toast:show', this.showToast.bind(this));
    eventBus.on('chapter:started', this.onChapterStarted.bind(this));
    eventBus.on('chapter:completed', this.onChapterCompleted.bind(this));
    eventBus.on('objectives:updated', this.updateObjectives.bind(this));
    eventBus.on('ship:updated', this.updateShipHUD.bind(this));
    eventBus.on('weather:changed', this.updateWeatherHUD.bind(this));
    eventBus.on('state:changed', this.updateHUD.bind(this));
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

  public dispose(): void {
    this.uiLayer.innerHTML = '';
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
  }
}
