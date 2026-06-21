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
import { SaveModule } from './SaveModule';
import { ResourceGatheringModule } from './ResourceGatheringModule';
import { VoyageScoringModule } from './VoyageScoringModule';
import { ChapterReplayModule } from './ChapterReplayModule';
import { RouteModule } from './RouteModule';
import { ConstellationStoryModule } from './ConstellationStoryModule';
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
  SaveSlotInfo,
  SaveData,
  GatheringPointConfig,
  GatheringProgress,
  GatheringReward,
  InheritType,
  ChallengeType,
  ChallengeCondition,
  Route,
  RouteBranchType,
  ConstellationStoryNode,
  ConstellationStorySequence,
  StarDetail,
  Star,
  Constellation,
  FailureContext,
  PreservedProgress,
  RetryOptions,
  DEFAULT_RETRY_OPTIONS,
  FailureReason,
  ChapterFailedEvent,
  ChapterRetryStartedEvent,
} from '../types';

const BRANCH_TYPE_LABELS: Record<RouteBranchType, string> = {
  main: '主线',
  alternative: '替代',
  secret: '隐藏',
  optional: '可选',
};

const BRANCH_TYPE_COLORS: Record<RouteBranchType, string> = {
  main: '#d4af37',
  alternative: '#6bcbff',
  secret: '#ff6bcb',
  optional: '#90ee90',
};

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
  private routeModule: RouteModule | null = null;
  private uiLayer: HTMLElement;
  private currentScreen: GameScreen = 'menu';
  private toastTimer: number | null = null;
  private crewPanelOpen: boolean = false;
  private tradePanelOpen: boolean = false;
  private voyageLogPanelOpen: boolean = false;
  private achievementPanelOpen: boolean = false;
  private codexPanelOpen: boolean = false;
  private starDetailPanelOpen: boolean = false;
  private selectedStarId: string | null = null;
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
  private saveModule: SaveModule;
  private resourceGatheringModule: ResourceGatheringModule;
  private scoringModule: VoyageScoringModule;
  private saveManagerMode: 'menu' | 'pause' = 'menu';
  private selectedSlot: string | null = null;
  private renamingSlot: string | null = null;
  private gatheringPanelOpen: boolean = false;
  private nearbyGatheringPoints: GatheringPointConfig[] = [];
  private currentGatheringProgress: GatheringProgress | null = null;
  private gatheringProgressLastRender: number = 0;
  private replayModule: ChapterReplayModule;
  private replayConfigOpen: boolean = false;
  private selectedReplayChapterId: string | null = null;
  private selectedInheritTypes: InheritType[] = [];
  private selectedChallenges: ChallengeType[] = [];
  private replayHudLastUpdate: number = 0;
  private constellationStoryModule: ConstellationStoryModule;
  private constellationStoryOverlayEl: HTMLElement | null = null;
  private constellationStoryTypewriterTimer: number | null = null;
  private constellationStoryTypewriterText: string = '';
  private constellationStoryTypewriterIndex: number = 0;
  private constellationStoryTypewriterComplete: boolean = false;
  private constellationStoryPanelOpen: boolean = false;
  private voyageLogSummaryOpen: boolean = false;
  private voyageLogRefreshTimer: number | null = null;
  private chapterCompletePhaseTimers: number[] = [];
  private pendingSaveHint: { overlay: HTMLElement | null } = { overlay: null };
  private saveHintFallbackTimer: number | null = null;

  private failureOverlayOpen: boolean = false;
  private selectedRetryOptions: Partial<RetryOptions> = { ...DEFAULT_RETRY_OPTIONS };
  private latestFailureEvent: ChapterFailedEvent | null = null;

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
    this.saveModule = SaveModule.getInstance();
    this.resourceGatheringModule = ResourceGatheringModule.getInstance();
    this.scoringModule = VoyageScoringModule.getInstance();
    this.replayModule = ChapterReplayModule.getInstance();
    this.constellationStoryModule = ConstellationStoryModule.getInstance();
    this.uiLayer = document.getElementById('ui-layer')!;
    
    this.setupEventListeners();
  }

  public setChapterModule(chapterModule: ChapterModule): void {
    this.chapterModule = chapterModule;
  }

  public setRouteModule(routeModule: RouteModule): void {
    this.routeModule = routeModule;
  }

  public setTradeModule(tradeModule: TradeModule): void {
    this.tradeModule = tradeModule;
  }

  public setResourceGatheringModule(module: ResourceGatheringModule): void {
    this.resourceGatheringModule = module;
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
    eventBus.on('weather:warning:started', this.onWeatherWarningStarted.bind(this));
    eventBus.on('weather:warning:tick', this.onWeatherWarningTick.bind(this));
    eventBus.on('weather:warning:ended', this.onWeatherWarningEnded.bind(this));
    eventBus.on('weather:warning:beat', this.onWeatherWarningBeat.bind(this));
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
    eventBus.on('route:started', () => this.updateStartRouteButton(true));
    eventBus.on('route:stopped', () => this.updateStartRouteButton(false));
    eventBus.on('route:completed', () => this.updateStartRouteButton(false));
    eventBus.on('star:clicked', (starId: string) => this.onStarClicked(starId));
    eventBus.on('route:unlocked', () => this.updateBranchRoutesUI());
    eventBus.on('route:selected', () => this.updateBranchRoutesUI());
    eventBus.on('route:progress_updated', () => this.updateBranchRoutesUI());
    eventBus.on('branches:updated', () => this.updateBranchRoutesUI());
    eventBus.on('branches:initialized', () => this.updateBranchRoutesUI());
    eventBus.on('branches:loaded', () => this.updateBranchRoutesUI());
    eventBus.on('gathering:nearbyPointsUpdated', (points: GatheringPointConfig[]) => {
      this.nearbyGatheringPoints = points;
      this.updateGatheringButtonVisibility();
      if (this.gatheringPanelOpen) {
        this.renderGatheringPanel();
      }
    });
    eventBus.on('gathering:started', (data: { point: GatheringPointConfig; progress: GatheringProgress }) => {
      this.currentGatheringProgress = data.progress;
      this.updateGatheringProgressUI();
    });
    eventBus.on('gathering:progress', (data: { progress: number; pointId: string }) => {
      if (this.currentGatheringProgress) {
        this.currentGatheringProgress.progress = data.progress;
        this.updateGatheringProgressUI();
      }
    });
    eventBus.on('gathering:completed', () => {
      this.currentGatheringProgress = null;
      this.updateGatheringProgressUI();
      if (this.gatheringPanelOpen) {
        this.renderGatheringPanel();
      }
    });
    eventBus.on('gathering:cancelled', () => {
      this.currentGatheringProgress = null;
      this.updateGatheringProgressUI();
    });
    eventBus.on('gathering:clueDiscovered', (clueId: string) => {
      eventBus.emit('toast:show', { message: `🔍 发现新线索！` });
    });

    eventBus.on('hiddenStars:revealed', (starIds: string[]) => {
      if (starIds.length > 0) {
        eventBus.emit('toast:show', { 
          message: `🔮 天空中似乎浮现出了微弱的星光...有 ${starIds.length} 颗隐藏星点出现了！`, 
          duration: 5000 
        });
        this.updateHintSubtext(true);
      }
    });

    eventBus.on('constellation_story:unlocked', (data: any) => {
      eventBus.emit('toast:show', { 
        message: `📖 解锁星座传说：${data.constellationName} - 可在图鉴中查看` 
      });
    });

    eventBus.on('constellation_story:started', (data: any) => {
      eventBus.emit('sound:play', 'constellation_story_start');
    });

    eventBus.on('constellation_story:node', (data: { storyId: string; nodeId: string; node: ConstellationStoryNode }) => {
      this.onConstellationStoryNode(data.node);
    });

    eventBus.on('constellation_story:ended', () => {
      this.onConstellationStoryEnded();
    });

    eventBus.on('constellation_story:visual', (visual: any) => {
      this.onConstellationStoryVisual(visual);
    });

    eventBus.on('constellation_story:openReplay', (storyId: string) => {
      this.constellationStoryModule.replayStory(storyId);
    });

    eventBus.on('save:completed', this.onSaveCompleted.bind(this));
    eventBus.on('save:error', this.onSaveError.bind(this));
    
    eventBus.on('chapter:failed', this.onChapterFailed.bind(this));
    eventBus.on('retry:started', this.onRetryStarted.bind(this));
    eventBus.on('retry:abandoned', this.onRetryAbandoned.bind(this));
    eventBus.on('retry:completed', this.onRetryCompleted.bind(this));
  }

  public showScreen(screen: GameScreen): void {
    if (this.currentScreen === 'game' && screen !== 'game') {
      this.stopMinimapRendering();
    }
    
    this.currentScreen = screen;
    this.uiLayer.innerHTML = '';
    
    eventBus.emit('screen:changed', screen);
    
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
      case 'saveManager':
        this.renderSaveManagerScreen();
        break;
    }
  }

  public showSaveManager(mode: 'menu' | 'pause' = 'menu'): void {
    this.saveManagerMode = mode;
    this.selectedSlot = null;
    this.renamingSlot = null;
    this.showScreen('saveManager');
  }

  public showCheckpointManager(mode: 'menu' | 'pause' = 'menu'): void {
    this.saveManagerMode = mode;
    this.selectedSlot = null;
    this.renderCheckpointManager();
  }

  private renderCheckpointManager(): void {
    const checkpoints = this.saveModule.getCheckpoints();
    const formatTime = (timestamp: number): string => {
      const date = new Date(timestamp);
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    };

    const formatPlayTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) return `${hours}时${minutes}分`;
      return `${minutes}分`;
    };

    const checkpointTypeIcons: Record<string, string> = {
      chapter_start: '📜',
      weather_change: '🌤️',
      route_complete: '⛵',
      objective_complete: '🎯',
      manual: '✋'
    };

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content checkpoint-manager">
        <h2 style="color: #ffd700; margin-bottom: 1rem;">🔄 检查点管理</h2>
        <p style="color: #888; margin-bottom: 1rem; font-size: 0.9rem;">
          检查点会在关键节点自动保存（章节开始、天气变化、航线完成等），最多保留 ${this.saveModule.getCheckpointMetadata().maxCheckpoints} 个
        </p>
        <div class="checkpoint-list">
          ${checkpoints.length === 0 ? `
            <div class="no-checkpoints">
              <p style="color: #666; text-align: center; padding: 2rem;">
                暂无检查点<br>
                <span style="font-size: 0.8rem;">开始游戏后会在关键节点自动创建检查点</span>
              </p>
            </div>
          ` : checkpoints.map((cp, index) => `
            <div class="checkpoint-item" data-checkpoint-id="${cp.id}">
              <div class="checkpoint-icon">${checkpointTypeIcons[cp.type] || '📌'}</div>
              <div class="checkpoint-info">
                <div class="checkpoint-name">${cp.name}</div>
                <div class="checkpoint-desc">${cp.description}</div>
                <div class="checkpoint-meta">
                  <span>📜 ${cp.chapterName}</span>
                  <span>⏱ ${formatPlayTime(cp.playTime)}</span>
                  <span>🕐 ${formatTime(cp.timestamp)}</span>
                </div>
              </div>
              <div class="checkpoint-actions">
                <button class="menu-btn small" data-action="load-checkpoint" data-id="${cp.id}">恢复</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="checkpoint-actions-footer">
          ${checkpoints.length > 0 ? `
            <button class="menu-btn danger" data-action="clear-checkpoints">清除所有检查点</button>
          ` : ''}
          <button class="menu-btn" data-action="close-checkpoint-manager">关闭</button>
        </div>
      </div>
    `;

    this.uiLayer.appendChild(overlay);

    overlay.querySelectorAll('[data-action="load-checkpoint"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const checkpointId = (e.target as HTMLElement).dataset.id;
        if (checkpointId && confirm('确定要恢复到此检查点吗？当前进度将丢失。')) {
          eventBus.emit('checkpoint:load', checkpointId);
          overlay.remove();
          eventBus.emit('sound:play', 'button_click');
        }
      });
    });

    overlay.querySelector('[data-action="clear-checkpoints"]')?.addEventListener('click', () => {
      if (confirm('确定要清除所有检查点吗？此操作不可撤销。')) {
        this.saveModule.clearCheckpoints();
        overlay.remove();
        this.showCheckpointManager(this.saveManagerMode);
        this.showToast('检查点已清除');
        eventBus.emit('sound:play', 'button_click');
      }
    });

    overlay.querySelector('[data-action="close-checkpoint-manager"]')?.addEventListener('click', () => {
      overlay.remove();
      eventBus.emit('sound:play', 'button_click');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  private renderMainMenu(): void {
    const menu = document.createElement('div');
    menu.className = 'menu-screen';
    
    const achievementProgress = this.achievementModule.getOverallProgress();
    const codexProgress = this.codexModule.getOverallProgress();
    const saves = this.saveModule.getAllSaveSlots();
    const saveCount = saves.filter(s => s.slotName !== 'autosave').length;
    const checkpoints = this.saveModule.getCheckpoints();
    const hasCheckpoints = checkpoints.length > 0;
    const latestCheckpoint = hasCheckpoints ? checkpoints[0] : null;

    const validSaves = saves.filter(s => s.saveData !== null && s.slotInfo !== null);
    const hasContinue = validSaves.length > 0;
    let continueSlot = '';
    let continueStatsHtml = '';

    if (hasContinue) {
      const sortedSaves = validSaves
        .filter(s => s.slotInfo !== null)
        .sort((a, b) => (b.slotInfo?.updatedAt || 0) - (a.slotInfo?.updatedAt || 0));
      const latest = sortedSaves[0];
      continueSlot = latest.slotName;
      const info = latest.slotInfo!;

      const formatPlayTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}时${minutes}分`;
        return `${minutes}分`;
      };

      continueStatsHtml = `
        <div class="continue-stats">
          <div class="continue-stats-row">
            <span>📜 ${info.chapterName || '未知章节'}</span>
          </div>
          <div class="continue-stats-row">
            <span>⭐ ${info.discoveredStars} 星辰</span>
            <span>✨ ${info.discoveredConstellations} 星座</span>
            <span>⏱ ${formatPlayTime(info.playTime)}</span>
          </div>
        </div>
      `;
    }
    
    const formatTime = (timestamp: number): string => {
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    };

    const checkpointTypeIcons: Record<string, string> = {
      chapter_start: '📜',
      weather_change: '🌤️',
      route_complete: '⛵',
      objective_complete: '🎯',
      manual: '✋'
    };

    menu.innerHTML = `
      <h1 class="game-title">观星航路</h1>
      <p class="game-subtitle">CELESTIAL VOYAGE</p>
      <div class="menu-buttons">
        ${hasContinue ? `
          <button class="menu-btn continue-btn" data-action="continue" data-slot="${continueSlot}">
            ⛵ 继续航程
          </button>
          ${continueStatsHtml}
        ` : ''}
        ${hasCheckpoints && latestCheckpoint ? `
          <button class="menu-btn rollback-btn" data-action="rollback">
            ↩️ 恢复到检查点
          </button>
          <div class="checkpoint-preview">
            <span class="checkpoint-preview-icon">${checkpointTypeIcons[latestCheckpoint.type] || '📌'}</span>
            <span class="checkpoint-preview-name">${latestCheckpoint.name}</span>
            <span class="checkpoint-preview-time">${formatTime(latestCheckpoint.timestamp)}</span>
          </div>
        ` : ''}
        <button class="menu-btn" data-action="newGame">开始新航程</button>
        <button class="menu-btn" data-action="loadGame">
          📂 读取存档 <span class="menu-badge">${saveCount}</span>
        </button>
        <button class="menu-btn" data-action="saveManager">
          💾 存档管理 <span class="menu-badge">${saveCount}/10</span>
        </button>
        <button class="menu-btn" data-action="checkpointManager">
          🔄 检查点管理 <span class="menu-badge">${checkpoints.length}</span>
        </button>
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
        } else if (action === 'saveManager') {
          this.showSaveManager('menu');
        } else if (action === 'loadGame') {
          this.showSaveManager('menu');
        } else if (action === 'checkpointManager') {
          this.showCheckpointManager('menu');
        } else if (action === 'rollback') {
          if (confirm('确定要恢复到最近的检查点吗？当前进度将丢失。')) {
            eventBus.emit('checkpoint:rollback');
          }
        } else if (action === 'continue') {
          const slot = (e.target as HTMLElement).dataset.slot;
          if (slot) {
            eventBus.emit('menu:action', 'continueGame');
          }
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
    const stats = this.stateManager.getCompletionStats(chapters);
    const hasProgress = stats.chapterProgress.completed > 0 || stats.starDiscovery.discovered > 0 || stats.constellationUnlock.unlocked > 0;
    
    const formatPlayTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      if (hours > 0) return `${hours}时${minutes}分${secs}秒`;
      if (minutes > 0) return `${minutes}分${secs}秒`;
      return `${secs}秒`;
    };

    const renderStatBar = (label: string, current: number, total: number, percentage: number, icon: string, color: string): string => {
      return `
        <div class="completion-stat-item">
          <div class="completion-stat-header">
            <span class="completion-stat-icon">${icon}</span>
            <span class="completion-stat-label">${label}</span>
            <span class="completion-stat-value">${current}/${total}</span>
          </div>
          <div class="completion-stat-bar">
            <div class="completion-stat-fill" style="width: ${percentage}%; background: ${color};"></div>
          </div>
        </div>
      `;
    };
    
    const menu = document.createElement('div');
    menu.className = 'menu-screen';
    menu.innerHTML = `
      <h2 style="color: #ffd700; margin-bottom: 1rem; letter-spacing: 0.3em;">选择章节</h2>
      ${hasProgress ? `
        <div class="completion-stats-panel">
          <div class="completion-stats-header">
            <span class="completion-stats-title">📊 航程总览</span>
            <span class="completion-overall">${stats.overallPercentage}%</span>
          </div>
          <div class="completion-stats-body">
            ${renderStatBar('章节进度', stats.chapterProgress.completed, stats.chapterProgress.total, stats.chapterProgress.percentage, '📜', '#d4af37')}
            ${renderStatBar('星辰发现', stats.starDiscovery.discovered, stats.starDiscovery.total, stats.starDiscovery.percentage, '⭐', '#87ceeb')}
            ${renderStatBar('星座解锁', stats.constellationUnlock.unlocked, stats.constellationUnlock.total, stats.constellationUnlock.percentage, '✨', '#ff6bcb')}
            ${stats.hiddenStars.total > 0 ? renderStatBar('隐藏星点', stats.hiddenStars.discovered, stats.hiddenStars.total, stats.hiddenStars.percentage, '🔮', '#9966ff') : ''}
          </div>
          <div class="completion-stats-footer">
            <span class="completion-playtime">⏱ 总游玩时长: ${formatPlayTime(stats.totalPlayTime)}</span>
          </div>
        </div>
      ` : ''}
      <div class="chapter-select">
        ${chapters.map(chapter => {
          const canReplay = this.replayModule.canReplayChapter(chapter.id);
          const progress = this.replayModule.getChapterProgress(chapter.id);
          const clickableStars = chapter.stars.filter(s => s.isClickable);
          const normalStars = clickableStars.filter(s => !s.hidden);
          const hiddenStars = clickableStars.filter(s => s.hidden);
          const discoveredNormal = normalStars.filter(s => this.stateManager.isStarDiscovered(s.id)).length;
          const discoveredHidden = hiddenStars.filter(s => this.stateManager.isStarDiscovered(s.id)).length;
          const constellationTotal = chapter.constellations.length;
          const constellationDiscovered = chapter.constellations.filter(c => this.stateManager.isConstellationDiscovered(c.id)).length;
          const starPct = normalStars.length > 0 ? Math.round((discoveredNormal / normalStars.length) * 100) : 0;
          const consPct = constellationTotal > 0 ? Math.round((constellationDiscovered / constellationTotal) * 100) : 0;
          return `
            <div class="chapter-card ${!chapter.unlocked ? 'locked' : ''}" data-chapter-id="${chapter.id}">
              <div class="chapter-status">
                ${chapter.completed ? '⭐' : chapter.unlocked ? '⚓' : '🔒'}
              </div>
              <div class="chapter-number">第 ${chapter.number} 章</div>
              <div class="chapter-name">${chapter.name}</div>
              <div class="chapter-desc">${chapter.description}</div>
              ${chapter.unlocked ? `
                <div class="chapter-progress-info">
                  <div class="chapter-progress-row">
                    <span>⭐ ${discoveredNormal}/${normalStars.length}</span>
                    <div class="chapter-progress-mini-bar"><div class="chapter-progress-mini-fill" style="width: ${starPct}%; background: #87ceeb;"></div></div>
                  </div>
                  ${hiddenStars.length > 0 ? `
                    <div class="chapter-progress-row">
                      <span style="color: #9966ff;">🔮 ${discoveredHidden}/${hiddenStars.length} (隐藏)</span>
                    </div>
                  ` : ''}
                  <div class="chapter-progress-row">
                    <span>✨ ${constellationDiscovered}/${constellationTotal}</span>
                    <div class="chapter-progress-mini-bar"><div class="chapter-progress-mini-fill" style="width: ${consPct}%; background: #ff6bcb;"></div></div>
                  </div>
                </div>
              ` : ''}
              ${chapter.completed ? `
                <div class="chapter-replay-info">
                  <span>重玩: ${progress.replayCount}次</span>
                  <span>最佳: ${progress.bestGrade}</span>
                </div>
                <button class="replay-btn" data-replay-chapter="${chapter.id}" ${!canReplay ? 'disabled' : ''}>
                  🎮 ${canReplay ? '重玩章节' : '次数已满'}
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
      <button class="menu-btn" style="margin-top: 2rem;" data-action="back">返回主菜单</button>
    `;
    
    this.uiLayer.appendChild(menu);
    
    menu.querySelectorAll('.chapter-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('replay-btn') || target.closest('.replay-btn')) {
          return;
        }
        
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
    
    menu.querySelectorAll('.replay-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chapterId = (e.currentTarget as HTMLElement).dataset.replayChapter;
        if (chapterId && this.replayModule.canReplayChapter(chapterId)) {
          this.openReplayConfig(chapterId);
          eventBus.emit('sound:play', 'button_click');
        }
      });
    });
    
    menu.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.showScreen('menu');
      eventBus.emit('sound:play', 'button_click');
    });
  }

  private openReplayConfig(chapterId: string): void {
    this.selectedReplayChapterId = chapterId;
    const config = this.replayModule.getReplayConfig(chapterId);
    if (!config) return;

    this.selectedInheritTypes = config.inheritOptions
      .filter(opt => opt.enabled)
      .map(opt => opt.type);
    this.selectedChallenges = [];
    this.replayConfigOpen = true;

    this.renderReplayConfigPanel();
  }

  private closeReplayConfig(): void {
    this.replayConfigOpen = false;
    this.selectedReplayChapterId = null;
    this.selectedInheritTypes = [];
    this.selectedChallenges = [];
    
    const panel = document.getElementById('replay-config-panel');
    if (panel) {
      panel.remove();
    }
  }

  private renderReplayConfigPanel(): void {
    const chapterId = this.selectedReplayChapterId;
    if (!chapterId) return;

    const config = this.replayModule.getReplayConfig(chapterId);
    if (!config) return;

    const chapter = this.chapterModule?.getChapter(chapterId);
    const progress = this.replayModule.getChapterProgress(chapterId);

    const existingPanel = document.getElementById('replay-config-panel');
    if (existingPanel) {
      existingPanel.remove();
    }

    const panel = document.createElement('div');
    panel.id = 'replay-config-panel';
    panel.className = 'modal-overlay';
    panel.innerHTML = `
      <div class="modal-content replay-config">
        <h2 style="color: #ffd700; margin-bottom: 1rem;">🎮 章节重玩设置</h2>
        <h3 style="color: #87ceeb; margin: 1rem 0 0.5rem;">${chapter?.name || '未知章节'}</h3>
        <p style="color: #888; font-size: 0.9rem; margin-bottom: 1rem;">
          第 ${progress.replayCount + 1} 周目
        </p>

        <div class="replay-section">
          <h4>📦 继承收集</h4>
          <p class="section-desc">选择重玩时保留的收集进度</p>
          <div class="inherit-options">
            ${config.inheritOptions.map(opt => `
              <label class="inherit-option ${this.selectedInheritTypes.includes(opt.type) ? 'selected' : ''}">
                <input type="checkbox" data-inherit="${opt.type}" 
                  ${this.selectedInheritTypes.includes(opt.type) ? 'checked' : ''}>
                <span class="inherit-icon">${opt.icon}</span>
                <span class="inherit-name">${opt.name}</span>
                <span class="inherit-desc">${opt.description}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="replay-section">
          <h4>⚔️ 挑战条件</h4>
          <p class="section-desc">开启挑战可获得额外奖励</p>
          <div class="challenge-options">
            ${config.challenges.map(ch => `
              <label class="challenge-option ${this.selectedChallenges.includes(ch.type) ? 'selected' : ''}">
                <input type="checkbox" data-challenge="${ch.type}"
                  ${this.selectedChallenges.includes(ch.type) ? 'checked' : ''}>
                <span class="challenge-icon">${ch.icon}</span>
                <div class="challenge-info">
                  <span class="challenge-name">${ch.name}</span>
                  <span class="challenge-desc">${ch.description}</span>
                  <span class="challenge-reward">奖励 x${ch.rewardMultiplier}</span>
                </div>
                <span class="challenge-difficulty difficulty-${ch.difficulty}">${ch.difficulty}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="replay-actions">
          <button class="menu-btn secondary" data-action="cancel-replay">取消</button>
          <button class="menu-btn primary" data-action="confirm-replay">
            🚀 开始重玩
          </button>
        </div>
      </div>
    `;

    this.uiLayer.appendChild(panel);

    panel.querySelectorAll('[data-inherit]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const type = (e.target as HTMLInputElement).dataset.inherit as InheritType;
        const checked = (e.target as HTMLInputElement).checked;
        
        if (checked) {
          if (!this.selectedInheritTypes.includes(type)) {
            this.selectedInheritTypes.push(type);
          }
        } else {
          this.selectedInheritTypes = this.selectedInheritTypes.filter(t => t !== type);
        }
        
        const label = (e.target as HTMLElement).closest('.inherit-option');
        if (label) {
          label.classList.toggle('selected', checked);
        }
      });
    });

    panel.querySelectorAll('[data-challenge]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const type = (e.target as HTMLInputElement).dataset.challenge as ChallengeType;
        const checked = (e.target as HTMLInputElement).checked;
        
        if (checked) {
          if (!this.selectedChallenges.includes(type)) {
            this.selectedChallenges.push(type);
          }
        } else {
          this.selectedChallenges = this.selectedChallenges.filter(t => t !== type);
        }
        
        const label = (e.target as HTMLElement).closest('.challenge-option');
        if (label) {
          label.classList.toggle('selected', checked);
        }
      });
    });

    panel.querySelector('[data-action="cancel-replay"]')?.addEventListener('click', () => {
      this.closeReplayConfig();
      eventBus.emit('sound:play', 'button_click');
    });

    panel.querySelector('[data-action="confirm-replay"]')?.addEventListener('click', () => {
      if (this.selectedReplayChapterId) {
        eventBus.emit('replay:start', {
          chapterId: this.selectedReplayChapterId,
          inheritTypes: [...this.selectedInheritTypes],
          challenges: [...this.selectedChallenges],
        });
        this.closeReplayConfig();
      }
      eventBus.emit('sound:play', 'button_click');
    });

    panel.addEventListener('click', (e) => {
      if (e.target === panel) {
        this.closeReplayConfig();
      }
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
          <div class="hud-item weather-hud-item">
            <span class="hud-icon" id="hud-weather-icon">☀️</span>
            <span class="hud-value" id="hud-weather" style="color: #90ee90;">晴朗</span>
            <span class="hud-detail" id="hud-weather-detail" style="display: none; font-size: 0.75rem; color: #aaa; margin-left: 0.3rem;"></span>
          </div>
          <div class="hud-item weather-warning-hud-item" id="hud-weather-warning-item" style="display: none;">
            <span class="hud-icon" id="hud-weather-warning-icon">⚠️</span>
            <span class="hud-value" id="hud-weather-warning-text" style="color: #ff6b6b;"></span>
            <span class="hud-countdown" id="hud-weather-warning-countdown" style="color: #ffd700; font-weight: bold; margin-left: 0.3rem;"></span>
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
          <div class="hud-item" id="hud-replay-item" style="display: none;">
            <span class="hud-label">🎮 重玩挑战:</span>
            <span class="hud-value" id="hud-replay-challenges">-</span>
          </div>
          <div class="hud-item" id="hud-replay-time-item" style="display: none;">
            <span class="hud-label">⏰ 剩余时间:</span>
            <span class="hud-value" id="hud-replay-time">--:--</span>
          </div>
          <div class="hud-item" id="hud-bonuses-item" style="display: none;">
            <span class="hud-label">效率加成:</span>
            <span class="hud-value" id="hud-bonuses">-</span>
          </div>
        </div>
        <div class="hud-left-actions">
          <div class="route-selector-container" id="route-selector-container" style="position: relative;">
            <button class="menu-btn" id="btn-start-route" style="min-width: auto; padding: 0.4rem 1rem; font-size: 0.9rem;">
              ⛵ 起航
            </button>
            <button class="menu-btn" id="btn-route-select" style="min-width: auto; padding: 0.4rem 0.6rem; font-size: 0.85rem; margin-left: 0.3rem; display: none;">
              🧭 航线
            </button>
          </div>
        </div>
        
        <div class="route-selection-panel" id="route-selection-panel" style="display: none; position: absolute; top: 70px; left: 1rem; z-index: 100;">
          <div class="route-selection-content">
            <div class="route-selection-header">
              <span style="font-weight: bold; color: #87ceeb;">🧭 选择航线</span>
              <button class="menu-btn" id="btn-close-routes" style="min-width: auto; padding: 0.2rem 0.5rem; font-size: 0.8rem;">✕</button>
            </div>
            <div id="route-list-container" class="route-list-container"></div>
          </div>
        </div>
      </div>
      
      <div class="task-panel" id="task-panel">
        <div class="task-title" id="task-title">
          <span class="task-title-icon">📋</span>
          当前任务
          <span class="task-toggle-icon">▶</span>
        </div>
        <div class="task-content" id="task-content" style="display: none;">
          <div class="task-desc" id="task-desc">探索星图，发现隐藏的秘密</div>
          <div class="task-objectives" id="task-objectives"></div>
        </div>
      </div>
      
      <div class="dynamic-task-panel" id="dynamic-task-panel">
        <div class="dynamic-task-header">
          <span class="dynamic-task-header-icon">📋</span>
          <span class="dynamic-task-header-title">动态任务</span>
          <span class="dynamic-task-toggle-icon">▶</span>
        </div>
        <div class="dynamic-task-list" id="dynamic-task-list" style="display: none;"></div>
      </div>
      
      <div class="interaction-hint" id="interaction-hint" style="display: none;">
        点击星辰发现它们，连接星辰组成星座
        <div class="hint-subtext" id="hint-subtext" style="font-size: 0.8em; color: #9966ff; margin-top: 0.3rem; display: none;">
          🔮 发现更多星辰可能会揭示隐藏的星点...
        </div>
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

      <button class="menu-btn gathering-btn" id="btn-gathering" style="display: none;">
        🎣 采集
      </button>

      <div class="gathering-progress-container" id="gathering-progress-container" style="display: none;">
        <div class="gathering-progress-bar">
          <div class="gathering-progress-fill" id="gathering-progress-fill"></div>
        </div>
        <div class="gathering-progress-text" id="gathering-progress-text">采集中...</div>
        <button class="gathering-cancel-btn" id="btn-cancel-gathering">✕</button>
      </div>
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

    document.getElementById('btn-gathering')?.addEventListener('click', () => {
      this.toggleGatheringPanel();
      eventBus.emit('sound:play', 'button_click');
    });

    document.getElementById('btn-cancel-gathering')?.addEventListener('click', () => {
      this.resourceGatheringModule.cancelGathering();
      eventBus.emit('sound:play', 'button_click');
    });

    document.getElementById('btn-start-route')?.addEventListener('click', () => {
      const selectedRoute = this.stateManager.getSelectedBranchRoute() || 'route-1';
      eventBus.emit('route:start', selectedRoute);
      eventBus.emit('sound:play', 'button_click');
    });

    document.getElementById('btn-route-select')?.addEventListener('click', () => {
      this.toggleRouteSelectionPanel();
      eventBus.emit('sound:play', 'button_click');
    });

    document.getElementById('btn-close-routes')?.addEventListener('click', () => {
      this.toggleRouteSelectionPanel(false);
      eventBus.emit('sound:play', 'button_click');
    });

    const taskPanel = document.getElementById('task-panel');
    if (taskPanel) {
      taskPanel.addEventListener('click', () => {
        const content = document.getElementById('task-content');
        const toggleIcon = taskPanel.querySelector('.task-toggle-icon');
        if (content) {
          const isExpanded = content.style.display !== 'none';
          content.style.display = isExpanded ? 'none' : 'block';
          if (toggleIcon) {
            toggleIcon.textContent = isExpanded ? '▶' : '▼';
          }
          eventBus.emit('task:panelToggled', !isExpanded);
        }
        eventBus.emit('sound:play', 'button_click');
      });
    }

    const dynamicTaskPanel = document.getElementById('dynamic-task-panel');
    if (dynamicTaskPanel) {
      dynamicTaskPanel.addEventListener('click', () => {
        const list = document.getElementById('dynamic-task-list');
        const toggleIcon = dynamicTaskPanel.querySelector('.dynamic-task-toggle-icon');
        if (list) {
          const isExpanded = list.style.display !== 'none';
          list.style.display = isExpanded ? 'none' : 'block';
          if (toggleIcon) {
            toggleIcon.textContent = isExpanded ? '▶' : '◀';
          }
          eventBus.emit('task:dynamicPanelToggled', !isExpanded);
        }
        eventBus.emit('sound:play', 'button_click');
      });
    }
    
    this.updateHUD();
    this.renderDynamicTaskPanel();
    this.initMinimap();
    this.startMinimapRendering();
    eventBus.emit('music:play', 'game');
    eventBus.emit('ambient:play', 'ocean');
  }

  private showPauseMenu(): void {
    const hasCheckpoints = this.saveModule.hasCheckpoints();
    const hasQuickSave = this.saveModule.hasQuickSave();
    
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.innerHTML = `
      <div class="dialog">
        <h3 class="dialog-title">游戏暂停</h3>
        <div class="dialog-actions">
          <button class="menu-btn" data-action="resume">继续游戏</button>
          <button class="menu-btn" data-action="voyageLog">📜 航海日志</button>
          <button class="menu-btn" data-action="quickSave">💾 快速保存</button>
          <button class="menu-btn" data-action="quickLoad" ${!hasQuickSave ? 'disabled' : ''}>📂 快速读取</button>
          <button class="menu-btn" data-action="rollback" ${!hasCheckpoints ? 'disabled' : ''}>↩️ 恢复到检查点</button>
          <button class="menu-btn" data-action="saveManager">📁 存档管理</button>
          <button class="menu-btn" data-action="checkpointManager">🔄 检查点管理</button>
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
          case 'voyageLog':
            overlay.remove();
            this.showVoyageLogSummaryFromPause();
            break;
          case 'quickSave':
            this.saveModule.quickSave();
            this.showToast({ message: '💾 游戏已快速保存' });
            break;
          case 'quickLoad':
            if (confirm('确定要读取快速存档吗？当前进度将丢失。')) {
              eventBus.emit('quickload:start');
              overlay.remove();
            }
            break;
          case 'rollback':
            if (confirm('确定要恢复到最近的检查点吗？当前进度将丢失。')) {
              eventBus.emit('checkpoint:rollback');
              overlay.remove();
            }
            break;
          case 'saveManager':
            overlay.remove();
            this.showSaveManager('pause');
            break;
          case 'checkpointManager':
            overlay.remove();
            this.showCheckpointManager('pause');
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

  private showVoyageLogSummaryFromPause(): void {
    this.voyageLogSummaryOpen = true;

    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay';
    overlay.id = 'voyage-log-summary-overlay';
    overlay.innerHTML = `
      <div class="voyage-log-summary-panel">
        <div class="voyage-log-summary-header">
          <h3 class="voyage-log-summary-title">📜 航海日志</h3>
          <div class="voyage-log-summary-header-actions">
            <button class="voyage-log-refresh-btn" id="voyage-log-refresh-btn" title="刷新">
              🔄 刷新
            </button>
            <button class="voyage-log-summary-close" id="voyage-log-summary-close">×</button>
          </div>
        </div>
        <div class="voyage-log-summary-content" id="voyage-log-summary-content">
          ${this.renderVoyageLogSummaryContent()}
        </div>
        <div class="voyage-log-summary-footer">
          <button class="menu-btn" data-action="back">返回暂停菜单</button>
        </div>
      </div>
    `;
    
    this.uiLayer.appendChild(overlay);
    this.startVoyageLogAutoRefresh();
    
    document.getElementById('voyage-log-summary-close')?.addEventListener('click', () => {
      this.closeVoyageLogSummary();
      this.showPauseMenu();
      eventBus.emit('sound:play', 'button_click');
    });

    document.getElementById('voyage-log-refresh-btn')?.addEventListener('click', () => {
      this.refreshVoyageLogSummary();
      eventBus.emit('sound:play', 'button_click');
    });
    
    overlay.querySelector('[data-action="back"]')?.addEventListener('click', () => {
      this.closeVoyageLogSummary();
      this.showPauseMenu();
      eventBus.emit('sound:play', 'button_click');
    });
  }

  private closeVoyageLogSummary(): void {
    this.voyageLogSummaryOpen = false;
    this.stopVoyageLogAutoRefresh();
    document.getElementById('voyage-log-summary-overlay')?.remove();
  }

  private startVoyageLogAutoRefresh(): void {
    this.stopVoyageLogAutoRefresh();
    this.voyageLogRefreshTimer = window.setInterval(() => {
      if (this.voyageLogSummaryOpen) {
        this.refreshVoyageLogSummary();
      }
    }, 5000);
  }

  private stopVoyageLogAutoRefresh(): void {
    if (this.voyageLogRefreshTimer) {
      clearInterval(this.voyageLogRefreshTimer);
      this.voyageLogRefreshTimer = null;
    }
  }

  private refreshVoyageLogSummary(): void {
    const contentEl = document.getElementById('voyage-log-summary-content');
    if (contentEl) {
      contentEl.innerHTML = this.renderVoyageLogSummaryContent();
    }
  }

  private renderVoyageLogSummaryContent(): string {
    const state = this.stateManager.getState();
    const currentChapter = this.chapterModule?.getCurrentChapter() || null;
    const objectives = this.chapterModule?.getCurrentObjectives() || [];
    const progress = this.chapterModule?.getProgress() || { stars: 0, constellations: 0, objectives: 0, hiddenStars: 0, totalHiddenStars: 0 };

    const visitedPoints = state.visitedPoints || [];
    const waypointNames = this.getVisitedWaypointNames(currentChapter, visitedPoints);

    const weatherEntries = currentChapter?.id
      ? this.voyageLogModule.getEntriesByChapter(currentChapter.id).filter(e => e.category === 'weather')
      : [];
    const recentWeather = weatherEntries.slice(-5).reverse();

    const totalObjectives = objectives.length;
    const completedObjectives = objectives.filter(o => o.completed).length;
    const objectivePercentage = totalObjectives > 0 ? Math.round((completedObjectives / totalObjectives) * 100) : 0;

    const playTime = this.formatPlayTime(state.playTime);

    const isWaypointType = (type: string) => type === 'waypoint' || type === 'landmark' || type === 'end';
    const totalWaypoints = currentChapter?.routePoints?.filter(p => isWaypointType(p.type)).length || 0;
    const visitedWaypointCount = waypointNames.length;

    return `
      <div class="voyage-log-summary-grid">
        <div class="voyage-log-summary-section chapter-section">
          <div class="voyage-log-section-header">
            <span class="voyage-log-section-icon">📖</span>
            <span class="voyage-log-section-title">当前章节</span>
          </div>
          <div class="voyage-log-chapter-info">
            <div class="voyage-log-chapter-name">${currentChapter?.name || '未知章节'}</div>
            <div class="voyage-log-chapter-number">第 ${currentChapter?.number || '?'} 章</div>
            <div class="voyage-log-chapter-desc">${currentChapter?.description || '暂无描述'}</div>
          </div>
        </div>

        <div class="voyage-log-summary-section time-section">
          <div class="voyage-log-section-header">
            <span class="voyage-log-section-icon">⏱️</span>
            <span class="voyage-log-section-title">累计时间</span>
          </div>
          <div class="voyage-log-time-display">
            <span class="voyage-log-time-value">${playTime}</span>
            <span class="voyage-log-time-label">游戏时长</span>
          </div>
        </div>

        <div class="voyage-log-summary-section waypoints-section">
          <div class="voyage-log-section-header">
            <span class="voyage-log-section-icon">📍</span>
            <span class="voyage-log-section-title">已访航点</span>
            <span class="voyage-log-section-count">${visitedWaypointCount}/${totalWaypoints}</span>
          </div>
          <div class="voyage-log-waypoints-list">
            ${waypointNames.length === 0 ? 
              '<div class="voyage-log-empty-hint">暂无已访问的航点</div>' :
              waypointNames.map(name => `
                <div class="voyage-log-waypoint-item">
                  <span class="voyage-log-waypoint-icon">✓</span>
                  <span class="voyage-log-waypoint-name">${name}</span>
                </div>
              `).join('')
            }
          </div>
        </div>

        <div class="voyage-log-summary-section weather-section">
          <div class="voyage-log-section-header">
            <span class="voyage-log-section-icon">🌦️</span>
            <span class="voyage-log-section-title">天气变化</span>
            <span class="voyage-log-section-count">${weatherEntries.length} 次</span>
          </div>
          <div class="voyage-log-weather-list">
            ${recentWeather.length === 0 ?
              '<div class="voyage-log-empty-hint">暂无天气记录</div>' :
              recentWeather.map(entry => `
                <div class="voyage-log-weather-item">
                  <span class="voyage-log-weather-time">${this.formatLogTimestamp(entry.timestamp)}</span>
                  <span class="voyage-log-weather-title">${entry.title}</span>
                </div>
              `).join('')
            }
          </div>
        </div>

        <div class="voyage-log-summary-section objectives-section">
          <div class="voyage-log-section-header">
            <span class="voyage-log-section-icon">🎯</span>
            <span class="voyage-log-section-title">目标完成度</span>
            <span class="voyage-log-section-count">${completedObjectives}/${totalObjectives}</span>
          </div>
          <div class="voyage-log-objective-progress">
            <div class="voyage-log-progress-bar">
              <div class="voyage-log-progress-fill" style="width: ${objectivePercentage}%"></div>
            </div>
            <span class="voyage-log-progress-text">${objectivePercentage}%</span>
          </div>
          <div class="voyage-log-objectives-list">
            ${objectives.length === 0 ?
              '<div class="voyage-log-empty-hint">暂无目标</div>' :
              objectives.map(obj => `
                <div class="voyage-log-objective-item ${obj.completed ? 'completed' : ''}">
                  <span class="voyage-log-objective-icon">${obj.completed ? '✅' : '⬜'}</span>
                  <span class="voyage-log-objective-text">${obj.description}</span>
                  <span class="voyage-log-objective-progress">${obj.progress}/${obj.total}</span>
                </div>
              `).join('')
            }
          </div>
        </div>

        <div class="voyage-log-summary-section stats-section">
          <div class="voyage-log-section-header">
            <span class="voyage-log-section-icon">📊</span>
            <span class="voyage-log-section-title">探索进度</span>
          </div>
          <div class="voyage-log-stats-grid">
            <div class="voyage-log-stat-card">
              <div class="voyage-log-stat-icon">⭐</div>
              <div class="voyage-log-stat-label">星辰发现</div>
              <div class="voyage-log-stat-value">${Math.round(progress.stars * 100)}%</div>
            </div>
            <div class="voyage-log-stat-card">
              <div class="voyage-log-stat-icon">✨</div>
              <div class="voyage-log-stat-label">星座解锁</div>
              <div class="voyage-log-stat-value">${Math.round(progress.constellations * 100)}%</div>
            </div>
            <div class="voyage-log-stat-card">
              <div class="voyage-log-stat-icon">🌟</div>
              <div class="voyage-log-stat-label">隐藏星辰</div>
              <div class="voyage-log-stat-value">${progress.hiddenStars}/${progress.totalHiddenStars}</div>
            </div>
            <div class="voyage-log-stat-card">
              <div class="voyage-log-stat-icon">⚓</div>
              <div class="voyage-log-stat-label">日志条目</div>
              <div class="voyage-log-stat-value">${this.voyageLogModule.getEntryCount()}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private getVisitedWaypointNames(chapter: Chapter | null, visitedIds: string[]): string[] {
    if (!chapter || !chapter.routePoints) return [];
    return visitedIds
      .map(id => chapter.routePoints!.find(p => p.id === id))
      .filter(p => p && (p.type === 'waypoint' || p.type === 'landmark' || p.type === 'end'))
      .map(p => p!.name);
  }

  private formatPlayTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}小时 ${minutes}分 ${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分 ${secs}秒`;
    } else {
      return `${secs}秒`;
    }
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

  private clearChapterCompleteTimers(): void {
    this.chapterCompletePhaseTimers.forEach(t => clearTimeout(t));
    this.chapterCompletePhaseTimers = [];
    if (this.saveHintFallbackTimer !== null) {
      clearTimeout(this.saveHintFallbackTimer);
      this.saveHintFallbackTimer = null;
    }
  }

  private clearPendingSaveHint(): void {
    this.pendingSaveHint.overlay = null;
    if (this.saveHintFallbackTimer !== null) {
      clearTimeout(this.saveHintFallbackTimer);
      this.saveHintFallbackTimer = null;
    }
  }

  private renderSaveHint(hintEl: HTMLElement, state: 'saving' | 'success' | 'error'): void {
    const iconEl = hintEl.querySelector('.save-hint-icon');
    const textEl = hintEl.querySelector('.save-hint-text');
    if (!iconEl || !textEl) return;

    switch (state) {
      case 'saving':
        hintEl.className = 'chapter-complete-save-hint save-hint-saving';
        (iconEl as HTMLElement).textContent = '⏳';
        (textEl as HTMLElement).textContent = '正在保存进度...';
        break;
      case 'success':
        hintEl.className = 'chapter-complete-save-hint save-hint-success';
        (iconEl as HTMLElement).textContent = '💾';
        (textEl as HTMLElement).textContent = '进度已保存';
        break;
      case 'error':
        hintEl.className = 'chapter-complete-save-hint save-hint-error';
        (iconEl as HTMLElement).textContent = '⚠️';
        (textEl as HTMLElement).textContent = '保存失败，请手动保存';
        break;
    }
  }

  private onSaveCompleted(data: { slotName: string; timestamp: number }): void {
    const overlay = this.pendingSaveHint.overlay;
    if (!overlay) return;
    if (data.slotName !== 'default') return;

    const hintEl = overlay.querySelector<HTMLElement>('#chapter-save-hint');
    if (hintEl && hintEl.isConnected) {
      this.renderSaveHint(hintEl, 'success');
      hintEl.style.display = 'flex';
    }
    this.clearPendingSaveHint();
  }

  private onSaveError(_error: any): void {
    const overlay = this.pendingSaveHint.overlay;
    if (!overlay) return;

    const hintEl = overlay.querySelector<HTMLElement>('#chapter-save-hint');
    if (hintEl && hintEl.isConnected) {
      this.renderSaveHint(hintEl, 'error');
      hintEl.style.display = 'flex';
    }
    this.clearPendingSaveHint();
  }

  private onChapterCompleted(chapter: Chapter): void {
    this.clearChapterCompleteTimers();

    eventBus.emit('sound:play', 'chapter_complete');
    eventBus.emit('music:play', 'menu');

    const flashOverlay = document.createElement('div');
    flashOverlay.className = 'chapter-flash-overlay';
    this.uiLayer.appendChild(flashOverlay);

    const t1 = window.setTimeout(() => {
      flashOverlay.classList.add('flash-in');
    }, 100);
    this.chapterCompletePhaseTimers.push(t1);

    const t2 = window.setTimeout(() => {
      flashOverlay.classList.remove('flash-in');
      flashOverlay.classList.add('flash-hold');
    }, 800);
    this.chapterCompletePhaseTimers.push(t2);

    const t3 = window.setTimeout(() => {
      flashOverlay.remove();
      this.showChapterCompleteDialog(chapter);
    }, 1600);
    this.chapterCompletePhaseTimers.push(t3);
  }

  private showChapterCompleteDialog(chapter: Chapter): void {
    const score = this.scoringModule.calculateChapterScore(chapter);
    const gradeColor = this.scoringModule.getGradeColor(score.grade);
    const gradeDescription = this.scoringModule.getGradeDescription(score.grade);

    const formatTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const renderCategoryBar = (category: any): string => {
      const pct = category.percentage;
      let barColor = '#4ecdc4';
      if (pct >= 85) barColor = '#ffd700';
      else if (pct >= 70) barColor = '#ff6b6b';
      else if (pct >= 50) barColor = '#45b7d1';

      return `
        <div class="score-category">
          <div class="score-category-header">
            <span class="score-category-name">${category.name}</span>
            <span class="score-category-value">${category.score}/${category.maxScore}</span>
          </div>
          <div class="score-category-bar">
            <div class="score-category-fill" style="width: ${pct}%; background: ${barColor}"></div>
          </div>
        </div>
      `;
    };

    const allChapters = this.chapterModule?.getChapters() || [];
    const currentIndex = allChapters.findIndex(c => c.id === chapter.id);
    const nextChapter = currentIndex >= 0 && currentIndex + 1 < allChapters.length
      ? allChapters[currentIndex + 1]
      : null;
    const isLastChapter = nextChapter === null;

    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay chapter-complete-overlay';

    overlay.innerHTML = `
      <div class="chapter-complete-dialog">
        <div class="chapter-complete-header">
          <div class="chapter-complete-badge" style="color: ${gradeColor}">
            ${score.grade}
          </div>
          <h2 class="chapter-complete-title">章节完成！</h2>
          <p class="chapter-complete-chapter">《${chapter.name}》</p>
          <p class="chapter-complete-desc" style="color: ${gradeColor}">${gradeDescription}</p>
        </div>

        <div class="chapter-complete-score">
          <div class="total-score-display">
            <span class="total-score-value" style="color: ${gradeColor}">${score.percentage}%</span>
            <span class="total-score-label">综合评分</span>
          </div>
        </div>

        <div class="score-categories">
          ${renderCategoryBar(score.categories.exploration)}
          ${renderCategoryBar(score.categories.tasks)}
          ${renderCategoryBar(score.categories.weather)}
          ${renderCategoryBar(score.categories.hidden)}
        </div>

        <div class="score-details-grid">
          <div class="score-detail-item">
            <span class="score-detail-label">航行时间</span>
            <span class="score-detail-value">${formatTime(score.playTime)}</span>
          </div>
          <div class="score-detail-item">
            <span class="score-detail-label">发现星辰</span>
            <span class="score-detail-value">${score.categories.exploration.details.discoveredStars}/${score.categories.exploration.details.totalStars}</span>
          </div>
          <div class="score-detail-item">
            <span class="score-detail-label">发现星座</span>
            <span class="score-detail-value">${score.categories.exploration.details.discoveredConstellations}/${score.categories.exploration.details.totalConstellations}</span>
          </div>
          <div class="score-detail-item">
            <span class="score-detail-label">完成任务</span>
            <span class="score-detail-value">${score.categories.tasks.details.completedObjectives}/${score.categories.tasks.details.totalObjectives}</span>
          </div>
          <div class="score-detail-item">
            <span class="score-detail-label">天气应对</span>
            <span class="score-detail-value">${score.categories.weather.details.survivedAdverseWeather}/${score.categories.weather.details.totalAdverseWeather}</span>
          </div>
          <div class="score-detail-item">
            <span class="score-detail-label">隐藏遗迹</span>
            <span class="score-detail-value">${score.categories.hidden.details.completedRuins}/${score.categories.hidden.details.totalRuins}</span>
          </div>
        </div>

        <div class="score-rewards">
          <h4 class="score-rewards-title">🎁 获得奖励</h4>
          <div class="score-rewards-list">
            <span class="reward-item">💰 ${score.rewards.gold} 金币</span>
            <span class="reward-item">⭐ ${score.rewards.exp} 经验</span>
            <span class="reward-item">📦 ${score.rewards.supplies} 补给</span>
          </div>
        </div>

        ${score.achievements.length > 0 ? `
          <div class="score-achievements">
          <h4 class="score-achievements-title">🏆 解锁成就</h4>
          <div class="score-achievements-list">
            ${score.achievements.map(a => `<span class="achievement-item">${a}</span>`).join('')}
          </div>
        </div>
        ` : ''}

        <div class="chapter-complete-save-hint" id="chapter-save-hint" style="display: none;">
          <span class="save-hint-icon">💾</span>
          <span class="save-hint-text">进度已保存</span>
        </div>

        <div class="chapter-complete-actions">
          ${!isLastChapter
            ? `<button class="menu-btn chapter-next-btn" data-action="next">继续下一章</button>`
            : `<button class="menu-btn chapter-next-btn" data-action="finish">🎉 查看航程总结</button>`
          }
          <button class="menu-btn" data-action="menu">返回主菜单</button>
        </div>
      </div>
    `;

    this.uiLayer.appendChild(overlay);

    const badgeEl = overlay.querySelector('.chapter-complete-badge') as HTMLElement | null;
    if (badgeEl) {
      badgeEl.style.animation = 'none';
      setTimeout(() => {
        badgeEl.style.animation = 'badgePopIn 0.8s ease-out';
      }, 100);
    }

    const saveHintEl = overlay.querySelector<HTMLElement>('#chapter-save-hint');
    if (saveHintEl) {
      this.renderSaveHint(saveHintEl, 'saving');
      saveHintEl.style.display = 'flex';
    }

    this.clearPendingSaveHint();
    this.pendingSaveHint.overlay = overlay;

    this.saveHintFallbackTimer = window.setTimeout(() => {
      if (this.pendingSaveHint.overlay === overlay && saveHintEl && saveHintEl.isConnected) {
        const slotName = 'default';
        const saved = this.saveModule.saveGame(slotName);
        this.renderSaveHint(saveHintEl, saved ? 'success' : 'error');
      }
      this.clearPendingSaveHint();
    }, 5000);

    const proceedToNext = () => {
      overlay.remove();
      this.clearChapterCompleteTimers();
      this.clearPendingSaveHint();
      if (!isLastChapter && nextChapter) {
        this.showNextChapterUnlock(nextChapter);
      } else {
        this.showAllChaptersComplete(chapter);
      }
    };

    overlay.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      eventBus.emit('sound:play', 'button_click');
      proceedToNext();
    });

    overlay.querySelector('[data-action="finish"]')?.addEventListener('click', () => {
      eventBus.emit('sound:play', 'button_click');
      proceedToNext();
    });

    overlay.querySelector('[data-action="menu"]')?.addEventListener('click', () => {
      this.clearChapterCompleteTimers();
      this.clearPendingSaveHint();
      overlay.remove();
      eventBus.emit('game:stop');
      this.showScreen('menu');
      eventBus.emit('sound:play', 'button_click');
    });
  }

  private showNextChapterUnlock(nextChapter: Chapter): void {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay chapter-unlock-overlay';

    overlay.innerHTML = `
      <div class="chapter-unlock-card">
        <div class="unlock-sparkle"></div>
        <div class="unlock-icon">🔓</div>
        <div class="unlock-label">新章节已解锁</div>
        <div class="unlock-chapter-number">第 ${nextChapter.number} 章</div>
        <div class="unlock-chapter-name">${nextChapter.name}</div>
        <div class="unlock-chapter-desc">${nextChapter.description}</div>
        <div class="unlock-actions">
          <button class="menu-btn primary" data-action="start-next">⚓ 立即启航</button>
          <button class="menu-btn" data-action="back-menu">返回主菜单</button>
        </div>
      </div>
    `;

    this.uiLayer.appendChild(overlay);

    overlay.querySelector('[data-action="start-next"]')?.addEventListener('click', () => {
      this.clearChapterCompleteTimers();
      overlay.remove();
      eventBus.emit('chapter:next');
      eventBus.emit('sound:play', 'button_click');
    });

    overlay.querySelector('[data-action="back-menu"]')?.addEventListener('click', () => {
      this.clearChapterCompleteTimers();
      overlay.remove();
      eventBus.emit('game:stop');
      this.showScreen('menu');
      eventBus.emit('sound:play', 'button_click');
    });
  }

  private showAllChaptersComplete(_lastChapter: Chapter): void {
    const overlay = document.createElement('div');
    overlay.className = 'dialog-overlay chapter-unlock-overlay';

    const stats = this.stateManager.getCompletionStats(this.chapterModule?.getChapters() || []);

    overlay.innerHTML = `
      <div class="chapter-unlock-card all-complete-card">
        <div class="unlock-sparkle"></div>
        <div class="unlock-icon">🌟</div>
        <div class="unlock-label">航程圆满</div>
        <div class="all-complete-title">恭喜完成所有章节！</div>
        <div class="all-complete-stats">
          <div class="all-complete-stat-row">
            <span>📜 章节完成</span>
            <span>${stats.chapterProgress.completed}/${stats.chapterProgress.total}</span>
          </div>
          <div class="all-complete-stat-row">
            <span>⭐ 星辰发现</span>
            <span>${stats.starDiscovery.discovered}/${stats.starDiscovery.total}</span>
          </div>
          <div class="all-complete-stat-row">
            <span>✨ 星座解锁</span>
            <span>${stats.constellationUnlock.unlocked}/${stats.constellationUnlock.total}</span>
          </div>
        </div>
        <div class="all-complete-message">
          你已穿越所有星域，书写了属于自己的观星航路传奇。<br>
          海图上每一条航线，都见证了你的勇气与智慧。
        </div>
        <div class="unlock-actions">
          <button class="menu-btn primary" data-action="back-menu">返回主菜单</button>
        </div>
      </div>
    `;

    this.uiLayer.appendChild(overlay);

    overlay.querySelector('[data-action="back-menu"]')?.addEventListener('click', () => {
      this.clearChapterCompleteTimers();
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
    const weatherIconEl = document.getElementById('hud-weather-icon');
    const weatherDetailEl = document.getElementById('hud-weather-detail');
    
    const weatherIcons: Record<string, string> = {
      storm: '⛈️',
      fog: '🌫️',
      meteor: '☄️',
      clear: '☀️',
    };

    if (weather) {
      const type = this.getWeatherTypeFromId(weather.id);
      const icon = weatherIcons[type] || '🌤️';
      const intensity = weather.intensity;
      
      if (weatherEl) {
        weatherEl.textContent = weather.name;
        if (intensity >= 0.7) {
          weatherEl.style.color = '#ff6b6b';
        } else if (intensity >= 0.4) {
          weatherEl.style.color = '#f39c12';
        } else {
          weatherEl.style.color = '#87ceeb';
        }
      }
      
      if (weatherIconEl) {
        weatherIconEl.textContent = icon;
      }
      
      if (weatherDetailEl) {
        const speedPct = Math.round(weather.effects?.speedModifier * 100 || 100);
        const visPct = Math.round(weather.effects?.visibility * 100 || 100);
        weatherDetailEl.textContent = `航速${speedPct}% 能见度${visPct}%`;
        weatherDetailEl.style.display = 'block';
      }
    } else {
      if (weatherEl) {
        weatherEl.textContent = '晴朗';
        weatherEl.style.color = '#90ee90';
      }
      if (weatherIconEl) {
        weatherIconEl.textContent = '☀️';
      }
      if (weatherDetailEl) {
        weatherDetailEl.style.display = 'none';
      }
    }
  }

  private onWeatherWarningStarted(data: { warning: any; eventConfig: any }): void {
    const { warning } = data;
    this.updateWeatherWarningHUD(warning);
    
    const warningItem = document.getElementById('hud-weather-warning-item');
    if (warningItem) {
      warningItem.style.display = 'flex';
      warningItem.classList.add('pulse-animation');
    }
  }

  private onWeatherWarningTick(data: { warning: any; remainingSeconds: number }): void {
    const { warning, remainingSeconds } = data;
    this.updateWeatherWarningHUD(warning, remainingSeconds);
  }

  private onWeatherWarningEnded(data: { warning: any }): void {
    const warningItem = document.getElementById('hud-weather-warning-item');
    if (warningItem) {
      warningItem.style.display = 'none';
      warningItem.classList.remove('pulse-animation', 'urgent-pulse');
    }
  }

  private onWeatherWarningBeat(data: { warning: any; urgency: number; remaining: number }): void {
    const { warning, urgency, remaining } = data;
    const warningItem = document.getElementById('hud-weather-warning-item');
    
    if (warningItem) {
      if (urgency > 0.7) {
        warningItem.classList.add('urgent-pulse');
      } else {
        warningItem.classList.remove('urgent-pulse');
      }
    }
  }

  private updateWeatherWarningHUD(warning: any, remainingSeconds?: number): void {
    const warningItem = document.getElementById('hud-weather-warning-item');
    const warningIconEl = document.getElementById('hud-weather-warning-icon');
    const warningTextEl = document.getElementById('hud-weather-warning-text');
    const warningCountdownEl = document.getElementById('hud-weather-warning-countdown');
    
    if (!warningItem || !warningIconEl || !warningTextEl || !warningCountdownEl) return;

    const weatherIcons: Record<string, string> = {
      storm: '⛈️',
      fog: '🌫️',
      meteor: '☄️',
      clear: '☀️',
    };

    const icon = weatherIcons[warning.type] || '⚠️';
    const remaining = remainingSeconds ?? warning.remainingSeconds;
    
    warningIconEl.textContent = icon;
    warningTextEl.textContent = `${warning.name} 即将到来`;
    
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    if (minutes > 0) {
      warningCountdownEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
      warningCountdownEl.textContent = `${seconds}s`;
    }
    
    if (warning.intensity >= 0.7) {
      warningTextEl.style.color = '#ff6b6b';
      warningCountdownEl.style.color = '#ff6b6b';
    } else if (warning.intensity >= 0.4) {
      warningTextEl.style.color = '#f39c12';
      warningCountdownEl.style.color = '#f39c12';
    } else {
      warningTextEl.style.color = '#87ceeb';
      warningCountdownEl.style.color = '#ffd700';
    }
  }

  private getWeatherTypeFromId(id: string): string {
    if (id.includes('storm')) return 'storm';
    if (id.includes('fog')) return 'fog';
    if (id.includes('meteor')) return 'meteor';
    return 'clear';
  }

  private updateStartRouteButton(isActive: boolean): void {
    const btn = document.getElementById('btn-start-route') as HTMLButtonElement;
    if (btn) {
      const selectedRouteId = this.stateManager.getSelectedBranchRoute();
      const chapter = this.chapterModule?.getCurrentChapter();
      const route = chapter?.routes?.find(r => r.id === selectedRouteId);
      const routeName = route ? route.name : '';
      
      if (isActive) {
        btn.textContent = `⛵ 航行中${routeName ? ` - ${routeName}` : ''}`;
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
      } else {
        btn.textContent = `⛵ 起航${routeName && chapter && chapter.routes.length > 1 ? ` (${routeName})` : ''}`;
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
      }
    }

    this.updateBranchRoutesUI();
  }

  private updateBranchRoutesUI(): void {
    if (this.currentScreen !== 'game') return;
    
    const chapter = this.chapterModule?.getCurrentChapter();
    const routeSelectBtn = document.getElementById('btn-route-select') as HTMLButtonElement;
    
    if (!chapter || !chapter.routes || chapter.routes.length <= 1) {
      if (routeSelectBtn) routeSelectBtn.style.display = 'none';
      return;
    }

    if (routeSelectBtn) {
      routeSelectBtn.style.display = '';
    }

    this.renderRouteList();
  }

  private toggleRouteSelectionPanel(force?: boolean): void {
    const panel = document.getElementById('route-selection-panel');
    if (!panel) return;
    
    const shouldShow = force !== undefined ? force : panel.style.display === 'none';
    panel.style.display = shouldShow ? 'block' : 'none';
    
    if (shouldShow) {
      this.renderRouteList();
    }
  }

  private renderRouteList(): void {
    const container = document.getElementById('route-list-container');
    if (!container) return;

    const routesWithProgress = this.routeModule?.getRoutesWithProgress() || [];
    
    if (routesWithProgress.length === 0) {
      container.innerHTML = `<div style="padding: 1rem; color: #888;">暂无可用航线</div>`;
      return;
    }

    container.innerHTML = routesWithProgress.map(({ route, progress, unlocked, selected, completed, visitedPoints }) => {
      const branchType: RouteBranchType = route.branchType || 'main';
      const branchLabel = BRANCH_TYPE_LABELS[branchType];
      const branchColor = route.color || BRANCH_TYPE_COLORS[branchType];
      const progressPct = Math.round(progress * 100);
      const totalPoints = route.points.length;
      
      let statusIcon = '🔒';
      let statusClass = 'route-locked';
      if (completed) {
        statusIcon = '✅';
        statusClass = 'route-completed';
      } else if (selected) {
        statusIcon = '🎯';
        statusClass = 'route-selected';
      } else if (unlocked) {
        statusIcon = '⚓';
        statusClass = 'route-unlocked';
      }
      
      const conditionText = this.getRouteUnlockConditionText(route);

      return `
        <div class="route-card ${statusClass}" data-route-id="${route.id}" 
             style="border-left: 4px solid ${branchColor}; cursor: ${unlocked ? 'pointer' : 'not-allowed'};">
          <div class="route-card-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span style="font-size: 1.1rem;">${statusIcon}</span>
              <span class="route-name" style="font-weight: bold; color: ${branchColor};">${route.name}</span>
              <span class="route-type-badge" style="
                font-size: 0.7rem;
                padding: 0.15rem 0.4rem;
                border-radius: 0.25rem;
                background: ${branchColor}22;
                color: ${branchColor};
                border: 1px solid ${branchColor}55;
              ">${branchLabel}</span>
            </div>
            ${completed ? `<span style="color: #2ecc71; font-size: 0.8rem;">已完成</span>` : ''}
          </div>
          ${route.branchDescription ? `<div class="route-desc" style="font-size: 0.85rem; color: #aaa; margin: 0.3rem 0;">${route.branchDescription}</div>` : ''}
          <div class="route-progress-section" style="margin-top: 0.5rem;">
            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #888; margin-bottom: 0.25rem;">
              <span>进度: ${progressPct}%</span>
              <span>航点: ${visitedPoints.length}/${totalPoints}</span>
            </div>
            <div style="background: #1a1a2e; border-radius: 0.25rem; height: 6px; overflow: hidden;">
              <div style="height: 100%; width: ${progressPct}%; background: linear-gradient(90deg, ${branchColor}, ${branchColor}aa); transition: width 0.3s;"></div>
            </div>
          </div>
          ${route.completionReward && (route.completionReward.gold || route.completionReward.exp || route.completionReward.supplies) ? `
            <div class="route-rewards" style="margin-top: 0.4rem; font-size: 0.8rem; color: #ffd700;">
              奖励: 
              ${route.completionReward.gold ? `💰${route.completionReward.gold} ` : ''}
              ${route.completionReward.supplies ? `📦${route.completionReward.supplies} ` : ''}
              ${route.completionReward.exp ? `⭐${route.completionReward.exp}` : ''}
            </div>
          ` : ''}
          ${!unlocked ? `
            <div class="route-locked-info" style="margin-top: 0.4rem; font-size: 0.8rem; color: #ff6b6b;">
              🔒 ${route.lockedDescription || conditionText}
            </div>
          ` : ''}
          ${selected && !completed ? `
            <div style="margin-top: 0.4rem; font-size: 0.8rem; color: #87ceeb;">
              📍 当前选中航线
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    container.querySelectorAll('.route-card').forEach(card => {
      card.addEventListener('click', () => {
        const routeId = (card as HTMLElement).dataset.routeId;
        if (!routeId) return;
        
        const routeInfo = routesWithProgress.find(r => r.route.id === routeId);
        if (!routeInfo?.unlocked) {
          eventBus.emit('toast:show', { message: routeInfo?.route.lockedDescription || '该航线尚未解锁' });
          return;
        }

        const chapterId = this.chapterModule?.getCurrentChapter()?.id;
        if (chapterId) {
          this.stateManager.selectBranchRoute(chapterId, routeId);
        }
        
        this.toggleRouteSelectionPanel(false);
        eventBus.emit('sound:play', 'button_click');
      });
    });
  }

  private getRouteUnlockConditionText(route: Route): string {
    if (!route.unlockConditions || route.unlockConditions.length === 0) return '';
    
    const conditions: string[] = route.unlockConditions.map(cond => {
      switch (cond.type) {
        case 'stars_discovered':
          return `发现 ${cond.value} 颗星辰`;
        case 'constellations_discovered':
          return `发现 ${cond.value} 个星座`;
        case 'points_visited':
          return `到达 ${cond.value} 个航点`;
        case 'objective_completed':
          return `完成特定任务目标`;
        case 'min_play_time':
          return `航行时间达到 ${Math.floor((cond.value as number) / 60)} 分钟`;
        default:
          return '满足特定条件';
      }
    });

    return `解锁条件: ${conditions.join('、')}`;
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
      const clickableStars = chapter.stars.filter(s => s.isClickable);
      const normalStars = clickableStars.filter(s => !s.hidden);
      const hiddenStars = clickableStars.filter(s => s.hidden);
      const totalConstellations = chapter.constellations.length;
      
      const discoveredNormalStars = normalStars.filter(s => this.stateManager.isStarDiscovered(s.id)).length;
      const discoveredHiddenStars = hiddenStars.filter(s => this.stateManager.isStarDiscovered(s.id)).length;
      
      const starsEl = document.getElementById('hud-stars');
      if (starsEl) {
        starsEl.innerHTML = `${discoveredNormalStars}/${normalStars.length}`;
        if (hiddenStars.length > 0) {
          starsEl.innerHTML += ` <span style="color: #9966ff; font-size: 0.85em;">(隐 ${discoveredHiddenStars}/${hiddenStars.length})</span>`;
        }
      }
      
      const constellationsEl = document.getElementById('hud-constellations');
      if (constellationsEl) {
        constellationsEl.textContent = `${state.discoveredConstellations.length}/${totalConstellations}`;
      }
      
      if (hiddenStars.length > 0 && discoveredNormalStars >= normalStars.length * 0.3) {
        this.updateHintSubtext(true);
      }
    }
    
    const timeEl = document.getElementById('hud-time');
    if (timeEl) {
      timeEl.textContent = this.formatTime(state.playTime);
    }

    this.updateReplayHUD();
    
    this.updateCrewHUD();
    this.updateDynamicTaskPanel();
  }

  private updateHintSubtext(show: boolean): void {
    const subtextEl = document.getElementById('hint-subtext');
    if (subtextEl) {
      subtextEl.style.display = show ? 'block' : 'none';
    }
  }

  private updateReplayHUD(): void {
    const isReplaying = this.replayModule.isCurrentReplay();
    const replayItem = document.getElementById('hud-replay-item');
    const replayTimeItem = document.getElementById('hud-replay-time-item');

    if (!replayItem || !replayTimeItem) return;

    if (isReplaying) {
      replayItem.style.display = '';
      
      const challenges = this.replayModule.getCurrentReplayChallenges();
      const failedChallenges = this.replayModule.getFailedChallenges();
      const challengesEl = document.getElementById('hud-replay-challenges');
      
      if (challengesEl) {
        if (challenges.length === 0) {
          challengesEl.textContent = '无';
        } else {
          const activeCount = challenges.filter(c => !failedChallenges.includes(c)).length;
          challengesEl.textContent = `${activeCount}/${challenges.length}`;
        }
      }

      const timeRemaining = this.replayModule.getReplayTimeRemaining();
      if (timeRemaining !== null) {
        replayTimeItem.style.display = '';
        const timeEl = document.getElementById('hud-replay-time');
        if (timeEl) {
          const mins = Math.floor(timeRemaining / 60);
          const secs = Math.floor(timeRemaining % 60);
          timeEl.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
          timeEl.style.color = timeRemaining <= 30 ? '#ff6b6b' : '#ffd700';
        }
      } else {
        replayTimeItem.style.display = 'none';
      }
    } else {
      replayItem.style.display = 'none';
      replayTimeItem.style.display = 'none';
    }
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

      const displayName = this.taskModule.getTaskDisplayName(task, progress);
      const displayDesc = this.taskModule.getTaskDescription(task, progress);

      return `
        <div class="dynamic-task-item ${priorityClass}">
          <div class="dynamic-task-name">${displayName}</div>
          <div class="dynamic-task-desc">${displayDesc}</div>
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

    const allStories = this.constellationStoryModule.getAllStories();
    const storyProgress = this.constellationStoryModule.getAllStoryProgress();
    const storyUnlocked = allStories.filter(s => storyProgress[s.id]?.unlocked).length;
    const storyViewed = allStories.filter(s => storyProgress[s.id]?.viewed).length;

    const categories: Array<{ key: CodexCategory; label: string; icon: string; showCount?: string }> = [
      { key: 'stars', label: '星辰图鉴', icon: '⭐' },
      { key: 'constellations', label: '星座图鉴', icon: '🔯' },
      { key: 'waypoints', label: '航点图鉴', icon: '⚓' },
      { key: 'chapters', label: '章节图鉴', icon: '📖' },
      { key: 'constellationStories', label: '星座传说', icon: '📖', showCount: `${storyUnlocked}/${allStories.length}` }
    ];

    let listContent = '';

    if (activeTab === 'constellationStories') {
      listContent = this.renderConstellationStoriesList(allStories, storyProgress);
    } else {
      const entries = this.codexModule.getEntriesByCategory(activeTab);
      listContent = entries.length === 0 ? this.renderCodexEmpty() : 
        entries.map(entry => this.renderCodexEntry(entry)).join('');
    }

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
          let countDisplay = cat.showCount;
          if (!countDisplay) {
            if (cat.key !== 'constellationStories') {
              const catProgress = this.codexModule.getCategoryProgress(cat.key);
              countDisplay = `${catProgress.discovered}/${catProgress.total}`;
            }
          }
          return `
            <button class="codex-tab ${activeTab === cat.key ? 'active' : ''}" data-category="${cat.key}">
              <span>${cat.icon}</span>
              <span>${cat.label}</span>
              <span class="codex-tab-count">${countDisplay || '0/0'}</span>
            </button>
          `;
        }).join('')}
      </div>

      <div class="codex-list" id="codex-list">
        ${listContent}
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

    panel.querySelectorAll('[data-play-story]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const storyId = (e.currentTarget as HTMLElement).dataset.playStory!;
        const mode = (e.currentTarget as HTMLElement).dataset.playMode as 'play' | 'replay';
        if (mode === 'replay') {
          eventBus.emit('constellation_story:replay', storyId);
        } else {
          eventBus.emit('constellation_story:play', storyId);
        }
        eventBus.emit('sound:play', 'button_click');
        this.codexPanelOpen = false;
        panel.remove();
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

  private renderConstellationStoriesList(
    allStories: ConstellationStorySequence[], 
    storyProgress: Record<string, { viewed: boolean; replayCount: number; unlocked: boolean }>
  ): string {
    if (allStories.length === 0) {
      return this.renderCodexEmpty();
    }

    return allStories.map(story => {
      const progress = storyProgress[story.id] || { unlocked: false, viewed: false, replayCount: 0 };
      const isUnlocked = progress.unlocked;
      const isViewed = progress.viewed;
      const canPlay = this.constellationStoryModule.canPlayStory(story.id);
      const canReplay = isViewed && story.repeatable;

      return `
        <div class="codex-entry constellation-story-entry ${isUnlocked ? 'discovered' : 'undiscovered'}">
          <div class="codex-entry-icon">${isUnlocked ? story.icon : '🔒'}</div>
          <div class="codex-entry-info">
            <div class="codex-entry-name" style="color: ${isUnlocked ? '#ffd700' : ''}">
              ${isUnlocked ? story.title : '??? 未知传说'}
            </div>
            <div class="codex-entry-desc">
              ${isUnlocked 
                ? `${story.constellationName} · ${story.subtitle || '一段关于星辰的古老传说'}` 
                : '解锁对应星座以查看此传说'}
            </div>
            ${isUnlocked ? `
              <div class="codex-entry-time">
                ${isViewed ? `📖 已阅读 · 回放 ${progress.replayCount} 次` : '✨ 新解锁，点击查看'}
              </div>
              <div class="constellation-story-actions">
                ${canReplay ? `
                  <button class="menu-btn story-play-btn" 
                          data-play-story="${story.id}" 
                          data-play-mode="replay"
                          style="padding: 0.3rem 0.8rem; font-size: 0.85rem;">
                    🎬 再次观看
                  </button>
                ` : canPlay ? `
                  <button class="menu-btn story-play-btn primary" 
                          data-play-story="${story.id}" 
                          data-play-mode="play"
                          style="padding: 0.3rem 0.8rem; font-size: 0.85rem;">
                    📖 查看传说
                  </button>
                ` : `
                  <button class="menu-btn story-play-btn" disabled
                          style="padding: 0.3rem 0.8rem; font-size: 0.85rem; opacity: 0.5;">
                    不可重复
                  </button>
                `}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  private renderCodexEntry(entry: CodexEntry): string {
    const categoryIcons: Record<string, string> = {
      stars: '⭐',
      constellations: '🔯',
      waypoints: '⚓',
      chapters: '📖',
      constellationStories: '📖'
    };

    const icon = categoryIcons[entry.category] || '📄';
    let storyActionHtml = '';

    if (entry.category === 'constellations' && entry.discovered) {
      const story = this.constellationStoryModule.getStoryByConstellation(entry.id);
      if (story) {
        const progress = this.constellationStoryModule.getStoryProgress(story.id);
        const canReplay = progress.viewed && story.repeatable;
        const canPlay = this.constellationStoryModule.canPlayStory(story.id);

        if (progress.unlocked) {
          storyActionHtml = `
            <div class="constellation-story-actions">
              <span class="story-status-badge ${progress.viewed ? 'viewed' : 'new'}">
                ${progress.viewed ? `📖 已阅读 (${progress.replayCount}次)` : '✨ 新传说'}
              </span>
              ${canReplay ? `
                <button class="menu-btn story-play-btn" 
                        data-play-story="${story.id}" 
                        data-play-mode="replay"
                        style="padding: 0.25rem 0.7rem; font-size: 0.8rem;">
                  🎬 回放
                </button>
              ` : canPlay ? `
                <button class="menu-btn story-play-btn primary" 
                        data-play-story="${story.id}" 
                        data-play-mode="play"
                        style="padding: 0.25rem 0.7rem; font-size: 0.8rem;">
                  📖 查看
                </button>
              ` : ''}
            </div>
          `;
        }
      }
    }

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
          ${storyActionHtml}
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

  private onStarClicked(starId: string): void {
    if (!this.stateManager.isStarDiscovered(starId)) return;
    
    this.selectedStarId = starId;
    this.starDetailPanelOpen = true;
    this.renderStarDetailPanel();
    eventBus.emit('sound:play', 'button_click');
  }

  private getStarDetail(starId: string): StarDetail | null {
    const currentChapter = this.chapterModule?.getCurrentChapter();
    if (!currentChapter) return null;

    const star = currentChapter.stars.find(s => s.id === starId);
    if (!star) return null;

    const constellation = star.constellationId 
      ? currentChapter.constellations.find(c => c.id === star.constellationId) || null
      : null;

    const codexEntry = this.codexModule.getEntryById(starId) || null;

    const chapterStars = currentChapter.stars.filter(s => s.isClickable);
    const chapterDiscovered = chapterStars.filter(s => this.stateManager.isStarDiscovered(s.id)).length;
    
    const constellationStars = constellation 
      ? constellation.stars.map(id => currentChapter.stars.find(s => s.id === id)).filter(Boolean) as Star[]
      : [];
    const constellationDiscovered = constellationStars.filter(s => this.stateManager.isStarDiscovered(s.id)).length;

    const allChapters = this.chapterModule?.getChapters() || [];
    const allStars = allChapters.flatMap(c => c.stars.filter(s => s.isClickable));
    const overallDiscovered = allStars.filter(s => this.stateManager.isStarDiscovered(s.id)).length;

    const starPercentage = allStars.length > 0 ? (1 / allStars.length) * 100 : 0;

    return {
      star,
      constellation,
      chapter: currentChapter,
      codexEntry,
      progressContribution: {
        percentage: Math.round(starPercentage * 100) / 100,
        chapterStars: {
          total: chapterStars.length,
          discovered: chapterDiscovered
        },
        constellationStars: {
          total: constellationStars.length,
          discovered: constellationDiscovered
        },
        overallStars: {
          total: allStars.length,
          discovered: overallDiscovered
        }
      },
      discoveredAt: codexEntry?.discoveredAt
    };
  }

  private toggleStarDetailPanel(): void {
    this.starDetailPanelOpen = !this.starDetailPanelOpen;
    const existingPanel = document.getElementById('star-detail-panel');
    
    if (this.starDetailPanelOpen && this.selectedStarId) {
      this.renderStarDetailPanel();
    } else {
      existingPanel?.remove();
    }
  }

  private renderStarDetailPanel(): void {
    if (!this.selectedStarId) return;
    
    document.getElementById('star-detail-panel')?.remove();

    const detail = this.getStarDetail(this.selectedStarId);
    if (!detail) return;

    const panel = document.createElement('div');
    panel.id = 'star-detail-panel';
    panel.className = 'star-detail-panel';

    const { star, constellation, chapter, codexEntry, progressContribution, discoveredAt } = detail;

    panel.innerHTML = `
      <div class="star-detail-header">
        <div class="star-detail-icon" style="color: ${star.color};">
          ${star.hidden ? '🌟' : '⭐'}
        </div>
        <div class="star-detail-title">
          <h3 class="star-detail-name">${star.name}</h3>
          ${star.hidden ? '<span class="star-detail-badge hidden-star">隐藏星</span>' : ''}
        </div>
        <button class="star-detail-close" id="star-detail-close-btn">×</button>
      </div>

      <div class="star-detail-content">
        <div class="star-detail-section">
          <h4 class="star-detail-section-title">基本信息</h4>
          <div class="star-detail-info-grid">
            <div class="star-detail-info-item">
              <span class="star-detail-info-label">所属星座</span>
              <span class="star-detail-info-value">
                ${constellation ? `🔯 ${constellation.name}` : '未关联星座'}
              </span>
            </div>
            <div class="star-detail-info-item">
              <span class="star-detail-info-label">发现章节</span>
              <span class="star-detail-info-value">
                ${chapter ? `📖 第${chapter.number}章 · ${chapter.name}` : '未知章节'}
              </span>
            </div>
            <div class="star-detail-info-item">
              <span class="star-detail-info-label">星辰颜色</span>
              <span class="star-detail-info-value">
                <span class="star-color-dot" style="background-color: ${star.color};"></span>
                ${star.color}
              </span>
            </div>
            <div class="star-detail-info-item">
              <span class="star-detail-info-label">亮度</span>
              <span class="star-detail-info-value">${Math.round(star.brightness * 100)}%</span>
            </div>
            ${discoveredAt ? `
              <div class="star-detail-info-item">
                <span class="star-detail-info-label">发现时间</span>
                <span class="star-detail-info-value">${new Date(discoveredAt).toLocaleDateString('zh-CN')}</span>
              </div>
            ` : ''}
          </div>
        </div>

        ${codexEntry?.description ? `
          <div class="star-detail-section">
            <h4 class="star-detail-section-title">星辰描述</h4>
            <p class="star-detail-description">${codexEntry.description}</p>
          </div>
        ` : ''}

        <div class="star-detail-section">
          <h4 class="star-detail-section-title">进度贡献</h4>
          <div class="star-detail-progress-section">
            <div class="star-detail-progress-header">
              <span class="star-detail-progress-label">单星贡献</span>
              <span class="star-detail-progress-value">${progressContribution.percentage}%</span>
            </div>
            
            <div class="star-detail-progress-item">
              <div class="star-detail-progress-info">
                <span>章节星辰</span>
                <span>${progressContribution.chapterStars.discovered}/${progressContribution.chapterStars.total}</span>
              </div>
              <div class="star-detail-progress-bar">
                <div class="star-detail-progress-fill chapter" 
                     style="width: ${progressContribution.chapterStars.total > 0 ? (progressContribution.chapterStars.discovered / progressContribution.chapterStars.total) * 100 : 0}%"></div>
              </div>
            </div>

            ${constellation ? `
              <div class="star-detail-progress-item">
                <div class="star-detail-progress-info">
                  <span>星座星辰</span>
                  <span>${progressContribution.constellationStars.discovered}/${progressContribution.constellationStars.total}</span>
                </div>
                <div class="star-detail-progress-bar">
                  <div class="star-detail-progress-fill constellation" 
                       style="width: ${progressContribution.constellationStars.total > 0 ? (progressContribution.constellationStars.discovered / progressContribution.constellationStars.total) * 100 : 0}%"></div>
                </div>
              </div>
            ` : ''}

            <div class="star-detail-progress-item">
              <div class="star-detail-progress-info">
                <span>全部星辰</span>
                <span>${progressContribution.overallStars.discovered}/${progressContribution.overallStars.total}</span>
              </div>
              <div class="star-detail-progress-bar">
                <div class="star-detail-progress-fill overall" 
                     style="width: ${progressContribution.overallStars.total > 0 ? (progressContribution.overallStars.discovered / progressContribution.overallStars.total) * 100 : 0}%"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.uiLayer.appendChild(panel);

    document.getElementById('star-detail-close-btn')?.addEventListener('click', () => {
      this.starDetailPanelOpen = false;
      this.selectedStarId = null;
      panel.remove();
      eventBus.emit('sound:play', 'button_click');
    });

    panel.addEventListener('click', (e) => {
      if (e.target === panel) {
        this.starDetailPanelOpen = false;
        this.selectedStarId = null;
        panel.remove();
        eventBus.emit('sound:play', 'button_click');
      }
    });
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

    menu.querySelectorAll('[data-play-story]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const storyId = (e.currentTarget as HTMLElement).dataset.playStory!;
        const mode = (e.currentTarget as HTMLElement).dataset.playMode as 'play' | 'replay';
        if (mode === 'replay') {
          eventBus.emit('constellation_story:replay', storyId);
        } else {
          eventBus.emit('constellation_story:play', storyId);
        }
        eventBus.emit('sound:play', 'button_click');
      });
    });
  }

  private renderCodexScreenContent(): string {
    const allStories = this.constellationStoryModule.getAllStories();
    const storyProgress = this.constellationStoryModule.getAllStoryProgress();
    const storyUnlocked = allStories.filter(s => storyProgress[s.id]?.unlocked).length;

    const categories: Array<{ 
      key: CodexCategory | 'constellationStoriesSection'; 
      label: string; 
      icon: string;
      count?: string;
    }> = [
      { key: 'stars', label: '星辰图鉴', icon: '⭐' },
      { key: 'constellations', label: '星座图鉴', icon: '🔯' },
      { key: 'waypoints', label: '航点图鉴', icon: '⚓' },
      { key: 'chapters', label: '章节图鉴', icon: '📖' },
      { key: 'constellationStoriesSection', label: '星座传说', icon: '📖', count: `${storyUnlocked}/${allStories.length}` }
    ];

    return categories.map(cat => {
      if (cat.key === 'constellationStoriesSection') {
        return `
          <div class="codex-category-section">
            <div class="codex-category-header">
              <h3>${cat.icon} ${cat.label}</h3>
              <span>${cat.count || '0/0'}</span>
            </div>
            <div class="codex-category-grid">
              ${this.renderConstellationStoriesList(allStories, storyProgress)}
            </div>
          </div>
        `;
      }

      const entries = this.codexModule.getEntriesByCategory(cat.key as CodexCategory);
      const catProgress = this.codexModule.getCategoryProgress(cat.key as CodexCategory);

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

  private onConstellationStoryNode(node: ConstellationStoryNode): void {
    if (!this.constellationStoryOverlayEl) {
      this.constellationStoryOverlayEl = document.createElement('div');
      this.constellationStoryOverlayEl.className = 'constellation-story-overlay';
      this.constellationStoryOverlayEl.innerHTML = `
        <div class="constellation-story-container" id="constellation-story-container">
          <div class="constellation-story-header">
            <div class="constellation-story-icon" id="constellation-story-icon">✨</div>
            <div class="constellation-story-titles">
              <div class="constellation-story-title" id="constellation-story-title"></div>
              <div class="constellation-story-subtitle" id="constellation-story-subtitle"></div>
            </div>
            <button class="constellation-story-close-btn" id="constellation-story-close-btn">✕</button>
          </div>
          <div class="constellation-story-body">
            <div class="constellation-story-portrait" id="constellation-story-portrait"></div>
            <div class="constellation-story-content">
              <div class="constellation-story-speaker">
                <span class="constellation-story-speaker-name" id="constellation-story-speaker-name"></span>
                <span class="constellation-story-speaker-title" id="constellation-story-speaker-title"></span>
              </div>
              <div class="constellation-story-text" id="constellation-story-text"></div>
              <div class="constellation-story-choices" id="constellation-story-choices"></div>
              <div class="constellation-story-indicator" id="constellation-story-indicator" style="display: none;">▼ 点击继续</div>
            </div>
          </div>
          <div class="constellation-story-footer">
            <button class="constellation-story-skip-btn" id="constellation-story-skip-btn">⏭ 跳过</button>
          </div>
        </div>
      `;
      this.uiLayer.appendChild(this.constellationStoryOverlayEl);

      const currentStory = this.constellationStoryModule.getCurrentStory();
      if (currentStory) {
        const titleEl = document.getElementById('constellation-story-title');
        const subtitleEl = document.getElementById('constellation-story-subtitle');
        const iconEl = document.getElementById('constellation-story-icon');
        if (titleEl) titleEl.textContent = currentStory.title;
        if (subtitleEl) subtitleEl.textContent = currentStory.subtitle || currentStory.constellationName;
        if (iconEl) iconEl.textContent = currentStory.icon;
      }
    }

    const nameEl = document.getElementById('constellation-story-speaker-name');
    const titleEl = document.getElementById('constellation-story-speaker-title');
    const textEl = document.getElementById('constellation-story-text');
    const choicesEl = document.getElementById('constellation-story-choices');
    const indicatorEl = document.getElementById('constellation-story-indicator');
    const portraitEl = document.getElementById('constellation-story-portrait');

    if (nameEl) nameEl.textContent = node.speaker;
    if (titleEl) titleEl.textContent = node.speakerTitle || '';
    if (portraitEl) portraitEl.textContent = node.portrait || '🌟';
    if (choicesEl) choicesEl.innerHTML = '';
    if (indicatorEl) indicatorEl.style.display = 'none';

    eventBus.emit('sound:play', 'constellation_story_text');

    this.startConstellationStoryTypewriter(node.text || '', textEl!, () => {
      if (node.choices && node.choices.length > 0) {
        this.renderConstellationStoryChoices(node.choices, choicesEl!);
      } else {
        if (indicatorEl) indicatorEl.style.display = 'block';
      }
    });

    const overlay = this.constellationStoryOverlayEl;
    const clickHandler = () => {
      if (!this.constellationStoryTypewriterComplete) {
        this.completeConstellationStoryTypewriter(textEl!);
        return;
      }
      if (node.choices && node.choices.length > 0) return;
      overlay.removeEventListener('click', clickHandler);
      eventBus.emit('constellation_story:next');
    };
    overlay.onclick = clickHandler;

    const skipBtn = document.getElementById('constellation-story-skip-btn');
    if (skipBtn) {
      skipBtn.onclick = (e) => {
        e.stopPropagation();
        this.clearConstellationStoryTypewriter();
        overlay.removeEventListener('click', clickHandler);
        eventBus.emit('constellation_story:skip');
        eventBus.emit('sound:play', 'button_click');
      };
    }

    const closeBtn = document.getElementById('constellation-story-close-btn');
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        this.clearConstellationStoryTypewriter();
        overlay.removeEventListener('click', clickHandler);
        eventBus.emit('constellation_story:close');
        eventBus.emit('sound:play', 'button_click');
      };
    }
  }

  private startConstellationStoryTypewriter(text: string, el: HTMLElement, onComplete: () => void): void {
    this.clearConstellationStoryTypewriter();
    this.constellationStoryTypewriterText = text;
    this.constellationStoryTypewriterIndex = 0;
    this.constellationStoryTypewriterComplete = false;
    el.textContent = '';

    const type = () => {
      if (this.constellationStoryTypewriterIndex < this.constellationStoryTypewriterText.length) {
        el.textContent = this.constellationStoryTypewriterText.substring(0, this.constellationStoryTypewriterIndex + 1);
        this.constellationStoryTypewriterIndex++;
        this.constellationStoryTypewriterTimer = window.setTimeout(type, 35);
      } else {
        this.constellationStoryTypewriterComplete = true;
        this.constellationStoryTypewriterTimer = null;
        onComplete();
      }
    };
    type();
  }

  private completeConstellationStoryTypewriter(el: HTMLElement): void {
    this.clearConstellationStoryTypewriter();
    el.textContent = this.constellationStoryTypewriterText;
    this.constellationStoryTypewriterComplete = true;

    const node = this.constellationStoryModule.getCurrentNode();
    if (node?.choices && node.choices.length > 0) {
      const choicesEl = document.getElementById('constellation-story-choices');
      if (choicesEl) this.renderConstellationStoryChoices(node.choices, choicesEl);
    } else {
      const indicatorEl = document.getElementById('constellation-story-indicator');
      if (indicatorEl) indicatorEl.style.display = 'block';
    }
  }

  private clearConstellationStoryTypewriter(): void {
    if (this.constellationStoryTypewriterTimer !== null) {
      clearTimeout(this.constellationStoryTypewriterTimer);
      this.constellationStoryTypewriterTimer = null;
    }
  }

  private renderConstellationStoryChoices(choices: ConstellationStoryNode['choices'], container: HTMLElement): void {
    if (!choices) return;

    container.innerHTML = choices.map(choice => `
      <button class="constellation-story-choice-btn" data-choice-id="${choice.id}">
        ${choice.text}
      </button>
    `).join('');

    container.querySelectorAll('.constellation-story-choice-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const choiceId = (e.currentTarget as HTMLElement).dataset.choiceId!;
        eventBus.emit('sound:play', 'dialogue_choice');
        eventBus.emit('constellation_story:choice', choiceId);
      });
    });
  }

  private onConstellationStoryEnded(): void {
    this.clearConstellationStoryTypewriter();
    this.constellationStoryOverlayEl?.remove();
    this.constellationStoryOverlayEl = null;
  }

  private onConstellationStoryVisual(visual: { background?: string; constellationHighlight?: boolean; starEffect?: string }): void {
    if (!this.constellationStoryOverlayEl) return;

    const container = this.constellationStoryOverlayEl.querySelector('#constellation-story-container') as HTMLElement;
    if (container && visual.background) {
      container.style.setProperty('--story-bg', visual.background);
    }

    if (visual.constellationHighlight) {
      eventBus.emit('starmap:highlightConstellation', this.constellationStoryModule.getCurrentStory()?.constellationId);
    }

    if (visual.starEffect) {
      eventBus.emit('starmap:starEffect', visual.starEffect);
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

  private renderSaveManagerScreen(): void {
    const saves = this.saveModule.getAllSaveSlots();
    const metadata = this.saveModule.getSlotsMetadata();
    const currentState = this.stateManager.getState();
    const isInGame = currentState.currentChapterId !== null;

    const menu = document.createElement('div');
    menu.className = 'menu-screen save-manager-screen';
    
    const title = this.saveManagerMode === 'pause' ? '存档管理' : '读取存档';
    const subtitle = this.saveManagerMode === 'pause' ? '管理你的游戏存档' : '选择一个存档继续你的航程';
    
    menu.innerHTML = `
      <h2 style="color: #ffd700; margin-bottom: 0.5rem; letter-spacing: 0.3em;">📁 ${title}</h2>
      <p style="color: #888; margin-bottom: 1.5rem;">${subtitle}</p>
      
      <div class="save-manager-toolbar">
        ${isInGame || this.saveManagerMode === 'pause' ? `
          <button class="menu-btn save-action-btn" data-action="newSave">
            ➕ 新建存档
          </button>
        ` : ''}
        <span class="save-count-info">
          已保存 ${saves.filter(s => s.slotName !== 'autosave').length}/10 个存档
        </span>
      </div>
      
      <div class="save-slots-container" id="save-slots-container">
        ${saves.length === 0 ? this.renderEmptySaveSlots() : 
          saves.map(slot => this.renderSaveSlotCard(slot.slotName, slot.saveData, slot.slotInfo, this.selectedSlot === slot.slotName)).join('')
        }
      </div>
      
      <div class="save-manager-actions">
        <button class="menu-btn" data-action="back">
          ${this.saveManagerMode === 'pause' ? '返回暂停菜单' : '返回主菜单'}
        </button>
      </div>
    `;
    
    this.uiLayer.appendChild(menu);
    this.bindSaveManagerEvents(menu, saves);
    
    eventBus.emit('music:play', 'menu');
  }

  private renderEmptySaveSlots(): string {
    return `
      <div class="save-empty-container">
        <div class="save-empty-icon">💾</div>
        <div class="save-empty-text">暂无存档</div>
        <div class="save-empty-hint">开始新的航程以创建你的第一个存档</div>
      </div>
    `;
  }

  private renderSaveSlotCard(
    slotName: string, 
    saveData: SaveData | null, 
    slotInfo: SaveSlotInfo | null,
    isSelected: boolean
  ): string {
    const isAutoSave = slotName === 'autosave';
    const displayName = slotInfo?.displayName || this.saveModule['getDefaultDisplayName'](slotName);
    const timestamp = slotInfo?.updatedAt || saveData?.timestamp || 0;
    const dateStr = timestamp ? new Date(timestamp).toLocaleString('zh-CN') : '未知';
    const playTime = slotInfo?.playTime || saveData?.state?.playTime || 0;
    const playTimeStr = this.saveModule.formatPlayTime(playTime);
    const chapterName = slotInfo?.chapterName || '未知章节';
    const chapterId = slotInfo?.chapterId || '';
    
    const discoveredStars = slotInfo?.discoveredStars || saveData?.state?.discoveredStars?.length || 0;
    const discoveredConstellations = slotInfo?.discoveredConstellations || saveData?.state?.discoveredConstellations?.length || 0;
    const visitedPoints = slotInfo?.visitedPoints || saveData?.state?.visitedPoints?.length || 0;
    const completedObjectives = slotInfo?.completedObjectives || saveData?.state?.completedObjectives?.length || 0;
    const shipHealth = slotInfo?.shipHealth || saveData?.state?.ship?.health || 100;
    const shipMaxHealth = slotInfo?.shipMaxHealth || saveData?.state?.ship?.maxHealth || 100;
    const crewCount = slotInfo?.crewCount || saveData?.state?.crew?.members?.length || 0;
    const gold = slotInfo?.gold || saveData?.state?.crew?.gold || 0;
    
    const healthPercent = (shipHealth / shipMaxHealth) * 100;
    let healthColor = '#2ecc71';
    if (healthPercent <= 20) healthColor = '#e74c3c';
    else if (healthPercent <= 40) healthColor = '#e67e22';
    else if (healthPercent <= 60) healthColor = '#f39c12';
    else if (healthPercent <= 80) healthColor = '#f1c40f';

    const isRenaming = this.renamingSlot === slotName;

    return `
      <div class="save-slot-card ${isSelected ? 'selected' : ''} ${isAutoSave ? 'autosave' : ''}" 
           data-slot-name="${slotName}">
        <div class="save-slot-header">
          <div class="save-slot-type-badge ${isAutoSave ? 'autosave' : 'manual'}">
            ${isAutoSave ? '🔄 自动存档' : '📁 手动存档'}
          </div>
          ${this.renamingSlot === slotName ? `
            <input type="text" class="save-slot-rename-input" 
                   id="rename-input-${slotName}"
                   value="${displayName}" 
                   maxlength="20"
                   placeholder="输入存档名称">
          ` : `
            <div class="save-slot-name" data-slot-name="${slotName}">${displayName}</div>
          `}
          <div class="save-slot-date">${dateStr}</div>
        </div>
        
        <div class="save-slot-preview">
          <div class="save-preview-chapter">
            <span class="preview-label">📖 当前章节</span>
            <span class="preview-value">${chapterName}</span>
          </div>
          
          <div class="save-preview-stats">
            <div class="preview-stat">
              <span class="stat-label">⏱️ 游戏时间</span>
              <span class="stat-value">${playTimeStr}</span>
            </div>
            <div class="preview-stat">
              <span class="stat-label">⭐ 星辰</span>
              <span class="stat-value">${discoveredStars}</span>
            </div>
            <div class="preview-stat">
              <span class="stat-label">🔯 星座</span>
              <span class="stat-value">${discoveredConstellations}</span>
            </div>
            <div class="preview-stat">
              <span class="stat-label">⚓ 航点</span>
              <span class="stat-value">${visitedPoints}</span>
            </div>
            <div class="preview-stat">
              <span class="stat-label">🎯 目标</span>
              <span class="stat-value">${completedObjectives}</span>
            </div>
          </div>
          
          <div class="save-preview-ship">
            <div class="ship-health-preview">
              <span class="ship-health-label">❤️ 船体</span>
              <div class="ship-health-bar-container">
                <div class="ship-health-bar-fill" style="width: ${healthPercent}%; background: ${healthColor}"></div>
              </div>
              <span class="ship-health-value" style="color: ${healthColor}">${Math.round(shipHealth)}/${shipMaxHealth}</span>
            </div>
            <div class="ship-crew-preview">
              <span class="crew-count">👥 ${crewCount}人</span>
              <span class="gold-count">💰 ${gold}</span>
            </div>
          </div>
        </div>
        
        <div class="save-slot-actions">
          ${this.saveManagerMode === 'menu' ? `
            <button class="menu-btn save-slot-btn primary" data-action="load" data-slot-name="${slotName}">
              🚀 读取存档
            </button>
          ` : `
            <button class="menu-btn save-slot-btn" data-action="load" data-slot-name="${slotName}">
              🔄 读取此存档
            </button>
          `}
          
          ${!isAutoSave && (this.saveManagerMode === 'pause' || chapterId) ? `
            <button class="menu-btn save-slot-btn" data-action="overwrite" data-slot-name="${slotName}">
              💾 覆盖存档
            </button>
          ` : ''}
          
          ${!isAutoSave && !isRenaming ? `
            <button class="menu-btn save-slot-btn" data-action="rename" data-slot-name="${slotName}">
              ✏️ 重命名
            </button>
          ` : ''}
          
          ${isRenaming ? `
            <button class="menu-btn save-slot-btn primary" data-action="confirmRename" data-slot-name="${slotName}">
              ✅ 确认
            </button>
            <button class="menu-btn save-slot-btn" data-action="cancelRename" data-slot-name="${slotName}">
              ❌ 取消
            </button>
          ` : ''}
          
          ${!isAutoSave ? `
            <button class="menu-btn save-slot-btn danger" data-action="delete" data-slot-name="${slotName}">
              🗑️ 删除
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private bindSaveManagerEvents(container: HTMLElement, saves: Array<{ slotName: string; saveData: SaveData | null; slotInfo: SaveSlotInfo | null }>): void {
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const action = target.dataset.action;
        const slotName = target.dataset.slotName;
        
        eventBus.emit('sound:play', 'button_click');
        
        switch (action) {
          case 'newSave':
            this.handleNewSave();
            break;
          case 'load':
            if (slotName) this.handleLoadSave(slotName);
            break;
          case 'overwrite':
            if (slotName) this.handleOverwriteSave(slotName);
            break;
          case 'rename':
            if (slotName) this.handleStartRename(slotName);
            break;
          case 'confirmRename':
            if (slotName) this.handleConfirmRename(slotName);
            break;
          case 'cancelRename':
            this.handleCancelRename();
            break;
          case 'delete':
            if (slotName) this.handleDeleteSave(slotName);
            break;
          case 'back':
            this.handleBackFromSaveManager();
            break;
        }
      });
    });

    container.querySelectorAll('.save-slot-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('input')) return;
        
        const slotName = (card as HTMLElement).dataset.slotName;
        if (slotName) {
          this.selectedSlot = this.selectedSlot === slotName ? null : slotName;
          this.renderSaveManagerScreen();
        }
      });
    });

    const renameInput = container.querySelector('.save-slot-rename-input') as HTMLInputElement;
    if (renameInput) {
      setTimeout(() => {
        renameInput.focus();
        renameInput.select();
      }, 50);
      
      renameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const slotName = this.renamingSlot;
          if (slotName) this.handleConfirmRename(slotName);
        } else if (e.key === 'Escape') {
          this.handleCancelRename();
        }
      });
    }
  }

  private handleNewSave(): void {
    const input = prompt('请输入新存档的名称（可选）：', '');
    if (input !== null) {
      const slotName = this.saveModule.createNewSave(input.trim());
      if (slotName) {
        this.showToast({ message: `✅ 存档已创建：${this.saveModule.getSlotInfo(slotName)?.displayName || slotName}` });
        this.selectedSlot = slotName;
        this.renderSaveManagerScreen();
      } else {
        this.showToast({ message: '❌ 创建存档失败' });
      }
    }
  }

  private handleLoadSave(slotName: string): void {
    const slotInfo = this.saveModule.getSlotInfo(slotName);
    const displayName = slotInfo?.displayName || slotName;
    
    if (this.saveManagerMode === 'pause') {
      if (!confirm(`确定要读取存档「${displayName}」吗？当前未保存的进度将会丢失。`)) {
        return;
      }
    }
    
    const saveData = this.saveModule.loadGame(slotName);
    if (saveData) {
      this.showToast({ message: `✅ 已读取存档：${displayName}` });
      
      if (saveData.dialogueState) {
        eventBus.emit('dialogue:load', saveData.dialogueState);
      }
      if (saveData.dayNightState) {
        eventBus.emit('daynight:load', saveData.dayNightState);
      }
      
      const state = this.stateManager.getState();
      if (state.currentChapterId) {
        eventBus.emit('chapter:start', { chapterId: state.currentChapterId, isRestore: true });
      } else {
        this.showScreen('chapterSelect');
      }
    } else {
      this.showToast({ message: '❌ 读取存档失败' });
    }
  }

  private handleOverwriteSave(slotName: string): void {
    const slotInfo = this.saveModule.getSlotInfo(slotName);
    const displayName = slotInfo?.displayName || slotName;
    
    if (!confirm(`确定要覆盖存档「${displayName}」吗？此操作不可撤销。`)) {
      return;
    }
    
    const success = this.saveModule.overwriteSave(slotName);
    if (success) {
      this.showToast({ message: `✅ 存档已覆盖：${displayName}` });
      this.renderSaveManagerScreen();
    } else {
      this.showToast({ message: '❌ 覆盖存档失败' });
    }
  }

  private handleStartRename(slotName: string): void {
    this.renamingSlot = slotName;
    this.renderSaveManagerScreen();
  }

  private handleConfirmRename(slotName: string): void {
    const input = document.getElementById(`rename-input-${slotName}`) as HTMLInputElement;
    const newName = input?.value.trim();
    
    if (!newName) {
      this.showToast({ message: '❌ 存档名称不能为空' });
      return;
    }
    
    const success = this.saveModule.renameSave(slotName, newName);
    if (success) {
      this.showToast({ message: `✅ 存档已重命名为：${newName}` });
      this.renamingSlot = null;
      this.renderSaveManagerScreen();
    } else {
      this.showToast({ message: '❌ 重命名失败' });
    }
  }

  private handleCancelRename(): void {
    this.renamingSlot = null;
    this.renderSaveManagerScreen();
  }

  private handleDeleteSave(slotName: string): void {
    const slotInfo = this.saveModule.getSlotInfo(slotName);
    const displayName = slotInfo?.displayName || slotName;
    
    if (!confirm(`确定要删除存档「${displayName}」吗？此操作不可撤销。`)) {
      return;
    }
    
    const success = this.saveModule.deleteSave(slotName);
    if (success) {
      this.showToast({ message: `✅ 存档已删除：${displayName}` });
      if (this.selectedSlot === slotName) {
        this.selectedSlot = null;
      }
      this.renderSaveManagerScreen();
    } else {
      this.showToast({ message: '❌ 删除存档失败' });
    }
  }

  private handleBackFromSaveManager(): void {
    if (this.saveManagerMode === 'pause') {
      this.showPauseMenu();
    } else {
      this.showScreen('menu');
    }
  }

  private updateGatheringButtonVisibility(): void {
    const btn = document.getElementById('btn-gathering') as HTMLButtonElement;
    if (btn) {
      if (this.nearbyGatheringPoints.length > 0) {
        btn.style.display = '';
        const badge = btn.querySelector('.menu-badge');
        if (badge) {
          badge.textContent = this.nearbyGatheringPoints.length.toString();
        } else {
          btn.innerHTML = `🎣 采集 <span class="menu-badge">${this.nearbyGatheringPoints.length}</span>`;
        }
      } else {
        btn.style.display = 'none';
      }
    }
  }

  private toggleGatheringPanel(): void {
    if (this.gatheringPanelOpen) {
      this.gatheringPanelOpen = false;
      document.getElementById('gathering-panel')?.remove();
      return;
    }

    this.gatheringPanelOpen = true;
    this.renderGatheringPanel();
  }

  private renderGatheringPanel(): void {
    document.getElementById('gathering-panel')?.remove();

    const panel = document.createElement('div');
    panel.id = 'gathering-panel';
    panel.className = 'trade-panel';

    const state = this.stateManager.getState();
    const ship = state.ship;
    const crew = state.crew;

    panel.innerHTML = `
      <div class="trade-panel-header">
        <h3 class="trade-panel-title">🎣 资源采集</h3>
        <p class="trade-panel-desc">在当前位置进行资源采集</p>
        <button class="trade-panel-close" id="gathering-close-btn">×</button>
      </div>
      
      <div class="trade-panel-stats">
        <div class="trade-stat-item">
          <span class="trade-stat-label">📦 补给</span>
          <span class="trade-stat-value">${Math.round(ship.supplies)}/${ship.maxSupplies}</span>
        </div>
        <div class="trade-stat-item">
          <span class="trade-stat-label">💰 金币</span>
          <span class="trade-stat-value gold-value">${crew.gold}</span>
        </div>
        <div class="trade-stat-item">
          <span class="trade-stat-label">❤️ 船体</span>
          <span class="trade-stat-value">${Math.round(ship.health)}/${ship.maxHealth}</span>
        </div>
      </div>

      <div class="gathering-points-list" id="gathering-points-list">
        ${this.renderGatheringPointsList()}
      </div>
    `;

    this.uiLayer.appendChild(panel);

    document.getElementById('gathering-close-btn')?.addEventListener('click', () => {
      this.gatheringPanelOpen = false;
      panel.remove();
      eventBus.emit('sound:play', 'button_click');
    });

    this.bindGatheringPanelEvents(panel);
  }

  private renderGatheringPointsList(): string {
    if (this.nearbyGatheringPoints.length === 0) {
      return `<div class="trade-empty">当前位置没有可采集的资源点</div>`;
    }

    return `
      <div class="gathering-points-grid">
        ${this.nearbyGatheringPoints.map(point => {
          const checkResult = this.resourceGatheringModule.canGather(point.id);
          const gatherCount = this.resourceGatheringModule.getPointGatherCount(point.id);
          const cooldownMs = this.resourceGatheringModule.getPointCooldown(point.id);
          const cooldownSec = Math.ceil(cooldownMs / 1000);
          const isOnCooldown = cooldownMs > 0;
          const isMaxGathered = point.maxGatherCount !== undefined && gatherCount >= point.maxGatherCount;
          
          let statusText = '';
          let statusClass = '';
          
          if (!checkResult.canGather) {
            statusText = checkResult.reason || '不可采集';
            statusClass = 'disabled';
          } else if (isOnCooldown) {
            statusText = `冷却中 ${cooldownSec}s`;
            statusClass = 'cooldown';
          } else if (isMaxGathered) {
            statusText = '已达上限';
            statusClass = 'maxed';
          } else {
            statusText = `可采集 ${point.maxGatherCount !== undefined ? `(${gatherCount}/${point.maxGatherCount})` : ''}`;
            statusClass = 'available';
          }

          const typeLabels: Record<string, string> = {
            fishing: '捕鱼',
            foraging: '采集',
            mining: '采矿',
            exploration: '探索',
            trade_ruins: '搜刮',
          };

          const rarityColors: Record<string, string> = {
            common: '#95a5a6',
            uncommon: '#2ecc71',
            rare: '#3498db',
            epic: '#9b59b6',
            legendary: '#f1c40f',
          };

          return `
            <div class="gathering-point-card ${statusClass}" data-point-id="${point.id}">
              <div class="gathering-point-header">
                <span class="gathering-point-icon">${point.icon}</span>
                <span class="gathering-point-name">${point.name}</span>
                <span class="gathering-point-type">${typeLabels[point.type] || point.type}</span>
              </div>
              <div class="gathering-point-desc">${point.description}</div>
              <div class="gathering-point-info">
                <span>⏱ ${point.gatherTime}秒</span>
                ${point.requiredSupplies ? `<span>📦 -${point.requiredSupplies}</span>` : ''}
                ${point.requiredCrewRole ? `<span>👤 ${this.getRoleName(point.requiredCrewRole)}</span>` : ''}
                <span>🎯 ${Math.round(point.successRate * 100)}%</span>
              </div>
              <div class="gathering-point-rewards">
                <span class="gathering-rewards-label">可能获得:</span>
                ${point.rewards.map(r => {
                  const rarity = r.rarity || 'common';
                  const color = rarityColors[rarity];
                  const icon = this.getRewardIcon(r.type);
                  const amount = r.amount || 1;
                  return `<span class="gathering-reward" style="color: ${color};">${icon} ${amount}</span>`;
                }).join('')}
              </div>
              <div class="gathering-point-status ${statusClass}">
                ${statusText}
              </div>
              <button class="menu-btn gather-btn" data-point-id="${point.id}" ${!checkResult.canGather || isOnCooldown || isMaxGathered ? 'disabled' : ''}>
                ${this.getActionName(point.type)}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  private bindGatheringPanelEvents(panel: HTMLElement): void {
    panel.querySelectorAll('.gather-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pointId = (e.currentTarget as HTMLElement).dataset.pointId;
        if (pointId) {
          const success = this.resourceGatheringModule.startGathering(pointId);
          if (success) {
            this.gatheringPanelOpen = false;
            panel.remove();
          }
          eventBus.emit('sound:play', 'button_click');
        }
      });
    });
  }

  private updateGatheringProgressUI(): void {
    const container = document.getElementById('gathering-progress-container');
    const fill = document.getElementById('gathering-progress-fill');
    const text = document.getElementById('gathering-progress-text');

    if (!container || !fill || !text) return;

    if (this.currentGatheringProgress) {
      container.style.display = 'flex';
      const progress = this.currentGatheringProgress.progress;
      const percent = Math.min(Math.round(progress * 100), 100);
      fill.style.width = `${percent}%`;
      
      const point = this.resourceGatheringModule.getGatheringPoint(this.currentGatheringProgress.pointId);
      if (point) {
        text.textContent = `${point.icon} ${this.getActionName(point.type)}中... ${percent}%`;
      } else {
        text.textContent = `采集中... ${percent}%`;
      }
    } else {
      container.style.display = 'none';
    }
  }

  private getRoleName(role: string): string {
    const roleNames: Record<string, string> = {
      captain: '船长',
      navigator: '航海士',
      sailor: '水手',
      cook: '厨师',
      doctor: '船医',
      engineer: '工程师',
      lookout: '瞭望员',
      idle: '空闲',
    };
    return roleNames[role] || role;
  }

  private getActionName(type: string): string {
    const actionNames: Record<string, string> = {
      fishing: '捕鱼',
      foraging: '采集',
      mining: '采矿',
      exploration: '探索',
      trade_ruins: '搜刮',
    };
    return actionNames[type] || '采集';
  }

  private getRewardIcon(type: string): string {
    const icons: Record<string, string> = {
      supplies: '📦',
      gold: '💰',
      health: '❤️',
      star: '⭐',
      constellation: '✨',
      codex_entry: '📖',
      clue: '🔍',
      exp: '⭐',
    };
    return icons[type] || '🎁';
  }

  private getFailureReasonText(reason: FailureReason): string {
    const reasonTexts: Record<FailureReason, string> = {
      ship_destroyed: '船只损毁',
      supplies_depleted: '补给耗尽',
      time_out: '时间耗尽',
      weather_catastrophe: '天灾降临',
      crew_abandoned: '船员背弃',
      objective_failed: '任务失败',
      navigation_lost: '迷失航向',
      other: '未知原因'
    };
    return reasonTexts[reason] || '未知原因';
  }

  private getFailureReasonIcon(reason: FailureReason): string {
    const reasonIcons: Record<FailureReason, string> = {
      ship_destroyed: '💥',
      supplies_depleted: '📦',
      time_out: '⏰',
      weather_catastrophe: '🌪️',
      crew_abandoned: '👥',
      objective_failed: '❌',
      navigation_lost: '🧭',
      other: '⚠️'
    };
    return reasonIcons[reason] || '⚠️';
  }

  private onChapterFailed(event: ChapterFailedEvent): void {
    if (this.failureOverlayOpen) return;

    this.latestFailureEvent = event;
    this.selectedRetryOptions = { ...DEFAULT_RETRY_OPTIONS };
    this.failureOverlayOpen = true;

    setTimeout(() => {
      this.renderFailureOverlay(event);
    }, 1000);
  }

  private onRetryStarted(event: ChapterRetryStartedEvent): void {
    this.failureOverlayOpen = false;
    this.latestFailureEvent = null;
    this.closeFailureOverlay();
  }

  private onRetryAbandoned(): void {
    this.failureOverlayOpen = false;
    this.latestFailureEvent = null;
    this.closeFailureOverlay();
  }

  private onRetryCompleted(event: any): void {
    this.failureOverlayOpen = false;
    this.latestFailureEvent = null;
  }

  private renderFailureOverlay(event: ChapterFailedEvent): void {
    const { context, preservedProgress, availableOptions } = event;
    const failureState = this.stateManager.getFailureState();

    const overlay = document.createElement('div');
    overlay.id = 'failure-overlay';
    overlay.className = 'modal-overlay failure-overlay';

    const reasonText = this.getFailureReasonText(context.reason);
    const reasonIcon = this.getFailureReasonIcon(context.reason);

    const formatPlayTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      if (hours > 0) return `${hours}时${minutes}分`;
      return `${minutes}分`;
    };

    overlay.innerHTML = `
      <div class="modal-content failure-content">
        <div class="failure-header">
          <div class="failure-icon">${reasonIcon}</div>
          <h2 class="failure-title">航行中断</h2>
          <p class="failure-subtitle">${context.chapterName}</p>
        </div>

        <div class="failure-reason-section">
          <div class="failure-reason-title">失败原因</div>
          <div class="failure-reason-text">${reasonText}</div>
          <p class="failure-description">${context.reasonDescription}</p>
        </div>

        ${failureState.currentRetryCount > 0 ? `
          <div class="failure-retry-count">
            这是第 <span class="retry-count-number">${failureState.currentRetryCount}</span> 次失败
          </div>
        ` : ''}

        <div class="preserved-progress-section">
          <div class="preserved-progress-title">✨ 已保留的进度</div>
          <div class="preserved-progress-grid">
            ${this.renderPreservedProgressItem('⭐', '发现星辰', preservedProgress.discoveredStars.length, true)}
            ${this.renderPreservedProgressItem('🔯', '解锁星座', preservedProgress.discoveredConstellations.length, true)}
            ${this.renderPreservedProgressItem('⚓', '探索航点', preservedProgress.visitedPoints.length, true)}
            ${this.renderPreservedProgressItem('🎯', '完成目标', preservedProgress.completedObjectives.length, availableOptions.preserveCompletedObjectives)}
            ${this.renderPreservedProgressItem('🔮', '隐藏星点', preservedProgress.discoveredHiddenStars.length, true)}
            ${this.renderPreservedProgressItem('👥', '船员', preservedProgress.crewMembers.length, true)}
            ${this.renderPreservedProgressItem('💰', '金币', preservedProgress.gold, true)}
          </div>
        </div>

        ${failureState.canRetry ? `
          <div class="retry-options-section">
            <div class="retry-options-title">⚙️ 重试选项</div>
            <div class="retry-options-list">
              ${this.renderRetryOption(
                'preserveCompletedObjectives',
                '保留已完成目标',
                '已完成的目标状态将被保留，无需重新完成',
                availableOptions.preserveCompletedObjectives,
                this.selectedRetryOptions.preserveCompletedObjectives ?? true
              )}
              ${this.renderRetryOption(
                'resetShipSupplies',
                '重置补给量',
                '补给将重置为初始值的 80%',
                availableOptions.resetShipSupplies,
                this.selectedRetryOptions.resetShipSupplies ?? true
              )}
              ${this.renderRetryOption(
                'preserveCrew',
                '保留船员',
                '保留所有已招募的船员',
                availableOptions.preserveCrew,
                this.selectedRetryOptions.preserveCrew ?? true
              )}
              ${this.renderRetryOption(
                'resetShipHealth',
                '修复船体',
                '船体健康值恢复到 80%',
                availableOptions.resetShipHealth,
                this.selectedRetryOptions.resetShipHealth ?? true
              )}
            </div>
          </div>

          <div class="retry-actions">
            <button class="menu-btn primary retry-btn" data-action="start-retry">
              🔄 重新开始 (${failureState.currentRetryCount + 1}/${failureState.maxRetries})
            </button>
            <button class="menu-btn checkpoint-btn" data-action="load-checkpoint" ${!this.saveModule.hasFailureCheckpoints() ? 'disabled' : ''}>
              📂 加载最近检查点
            </button>
          </div>
        ` : `
          <div class="max-retries-reached">
            <div class="max-retries-icon">💔</div>
            <p class="max-retries-text">已达到最大重试次数</p>
            <p class="max-retries-hint">你可以选择加载检查点或返回主菜单</p>
          </div>
          <div class="retry-actions">
            <button class="menu-btn checkpoint-btn" data-action="load-checkpoint" ${!this.saveModule.hasFailureCheckpoints() ? 'disabled' : ''}>
              📂 加载最近检查点
            </button>
          </div>
        `}

        <div class="failure-actions-footer">
          <button class="menu-btn secondary abandon-btn" data-action="abandon-retry">
            🏠 放弃并返回主菜单
          </button>
        </div>
      </div>
    `;

    this.uiLayer.appendChild(overlay);
    this.bindFailureOverlayEvents(overlay);
  }

  private renderPreservedProgressItem(icon: string, label: string, value: number | string, preserved: boolean): string {
    return `
      <div class="preserved-item ${preserved ? '' : 'not-preserved'}">
        <div class="preserved-item-icon">${icon}</div>
        <div class="preserved-item-info">
          <div class="preserved-item-label">${label}</div>
          <div class="preserved-item-value">${value}${preserved ? '' : ' (不保留)'}</div>
        </div>
        ${preserved ? '<div class="preserved-item-check">✓</div>' : '<div class="preserved-item-cross">✗</div>'}
      </div>
    `;
  }

  private renderRetryOption(
    key: keyof RetryOptions,
    label: string,
    description: string,
    available: boolean,
    selected: boolean
  ): string {
    return `
      <label class="retry-option-item ${available ? '' : 'disabled'}">
        <input type="checkbox" 
               data-retry-option="${key}"
               ${available && selected ? 'checked' : ''}
               ${!available ? 'disabled' : ''}>
        <div class="retry-option-content">
          <div class="retry-option-label">${label}</div>
          <div class="retry-option-desc">${description}</div>
        </div>
        ${!available ? '<div class="retry-option-locked">🔒</div>' : ''}
      </label>
    `;
  }

  private bindFailureOverlayEvents(overlay: HTMLElement): void {
    overlay.querySelectorAll('[data-retry-option]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const optionKey = (e.target as HTMLElement).dataset.retryOption as keyof RetryOptions;
        const checked = (e.target as HTMLInputElement).checked;
        this.selectedRetryOptions[optionKey] = checked;
        eventBus.emit('sound:play', 'button_click');
      });
    });

    overlay.querySelector('[data-action="start-retry"]')?.addEventListener('click', () => {
      const chapterId = this.latestFailureEvent?.context.chapterId;
      if (chapterId) {
        eventBus.emit('retry:start', {
          chapterId,
          retryOptions: { ...this.selectedRetryOptions }
        });
        eventBus.emit('sound:play', 'button_click');
      }
    });

    overlay.querySelector('[data-action="load-checkpoint"]')?.addEventListener('click', () => {
      eventBus.emit('retry:loadCheckpoint', 'latest');
      eventBus.emit('sound:play', 'button_click');
    });

    overlay.querySelector('[data-action="abandon-retry"]')?.addEventListener('click', () => {
      if (confirm('确定要放弃重试吗？你可以稍后从主菜单加载失败存档。')) {
        eventBus.emit('retry:abandon');
        eventBus.emit('sound:play', 'button_click');
      }
    });
  }

  private closeFailureOverlay(): void {
    const overlay = document.getElementById('failure-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  private showRetryToast(message: string, duration: number = 3000): void {
    eventBus.emit('toast:show', { message, duration });
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
