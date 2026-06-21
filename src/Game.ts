import * as THREE from 'three';
import { GameEngine } from './core/GameEngine';
import { GameStateManager } from './core/GameStateManager';
import { StarMapModule } from './modules/StarMapModule';
import { RouteModule } from './modules/RouteModule';
import { WeatherModule } from './modules/WeatherModule';
import { ChapterModule } from './modules/ChapterModule';
import { AudioModule } from './modules/AudioModule';
import { SaveModule } from './modules/SaveModule';
import { UIModule } from './modules/UIModule';
import { CrewModule } from './modules/CrewModule';
import { TradeModule } from './modules/TradeModule';
import { VoyageLogModule } from './modules/VoyageLogModule';
import { AchievementModule } from './modules/AchievementModule';
import { CodexModule } from './modules/CodexModule';
import { DialogueModule } from './modules/DialogueModule';
import { DayNightCycleModule } from './modules/DayNightCycleModule';
import { TaskModule } from './modules/TaskModule';
import { FogOfWarModule } from './modules/FogOfWarModule';
import { ShipDamageModule } from './modules/ShipDamageModule';
import { NavigationDashboardModule } from './modules/NavigationDashboardModule';
import { SeaEventModule } from './modules/SeaEventModule';
import { TutorialModule } from './modules/TutorialModule';
import { AmbientSoundModule } from './modules/AmbientSoundModule';
import { ResourceGatheringModule } from './modules/ResourceGatheringModule';
import { HiddenRuinsModule } from './modules/HiddenRuinsModule';
import { VoyageScoringModule } from './modules/VoyageScoringModule';
import { WorldEventBroadcastModule } from './modules/WorldEventBroadcastModule';
import { ChapterReplayModule } from './modules/ChapterReplayModule';
import { ConstellationStoryModule } from './modules/ConstellationStoryModule';
import { WaypointExplorationModule } from './modules/WaypointExplorationModule';
import { SupplyModule } from './modules/SupplyModule';
import { VoyageEventModule } from './modules/VoyageEventModule';
import { eventBus } from './utils/EventBus';
import { chapters } from './data/chapters';
import { dialogues } from './data/dialogues';
import { Chapter, GameScreen } from './types';

export class Game {
  private engine: GameEngine;
  private stateManager: GameStateManager;
  private starMapModule: StarMapModule;
  private routeModule: RouteModule;
  private weatherModule: WeatherModule;
  private chapterModule: ChapterModule;
  private audioModule: AudioModule;
  private saveModule: SaveModule;
  private uiModule: UIModule;
  private crewModule: CrewModule;
  private tradeModule: TradeModule;
  private voyageLogModule: VoyageLogModule;
  private achievementModule: AchievementModule;
  private codexModule: CodexModule;
  private dialogueModule: DialogueModule;
  private dayNightCycleModule: DayNightCycleModule;
  private taskModule: TaskModule;
  private fogOfWarModule: FogOfWarModule;
  private shipDamageModule: ShipDamageModule;
  private navigationDashboardModule: NavigationDashboardModule;
  private seaEventModule: SeaEventModule;
  private tutorialModule: TutorialModule;
  private ambientSoundModule: AmbientSoundModule;
  private resourceGatheringModule: ResourceGatheringModule;
  private hiddenRuinsModule: HiddenRuinsModule;
  private scoringModule: VoyageScoringModule;
  private broadcastModule: WorldEventBroadcastModule;
  private replayModule: ChapterReplayModule;
  private constellationStoryModule: ConstellationStoryModule;
  private waypointExplorationModule: WaypointExplorationModule;
  private supplyModule: SupplyModule;
  private voyageEventModule: VoyageEventModule;
  private mapGroup: THREE.Group;
  private isGameRunning: boolean = false;

  constructor() {
    this.engine = GameEngine.getInstance('game-canvas');
    this.stateManager = GameStateManager.getInstance();
    this.starMapModule = new StarMapModule();
    this.routeModule = new RouteModule();
    this.weatherModule = new WeatherModule();
    this.chapterModule = new ChapterModule();
    this.audioModule = AudioModule.getInstance();
    this.saveModule = SaveModule.getInstance();
    this.uiModule = new UIModule();
    this.crewModule = CrewModule.getInstance();
    this.tradeModule = TradeModule.getInstance();
    this.voyageLogModule = VoyageLogModule.getInstance();
    
    this.mapGroup = new THREE.Group();
    this.mapGroup.name = 'map';
    this.engine.scene.add(this.mapGroup);
    
    this.audioModule.initialize();
    this.saveModule.initialize();
    this.voyageLogModule.initialize();
    this.crewModule.initialize();
    this.tradeModule.initialize();
    this.achievementModule = AchievementModule.getInstance();
    this.achievementModule.initialize();
    this.codexModule = CodexModule.getInstance();
    this.codexModule.initialize();
    this.dialogueModule = DialogueModule.getInstance();
    this.dialogueModule.loadSequences(dialogues);
    this.dayNightCycleModule = DayNightCycleModule.getInstance();
    this.dayNightCycleModule.initialize();
    this.taskModule = TaskModule.getInstance();
    this.taskModule.setChapterModule(this.chapterModule);
    this.taskModule.initialize();
    this.fogOfWarModule = FogOfWarModule.getInstance();
    this.shipDamageModule = ShipDamageModule.getInstance();
    this.shipDamageModule.initialize();
    this.navigationDashboardModule = NavigationDashboardModule.getInstance();
    this.navigationDashboardModule.initialize();
    this.seaEventModule = SeaEventModule.getInstance();
    this.seaEventModule.initialize();
    this.seaEventModule.setChapterModule(this.chapterModule);
    this.tutorialModule = TutorialModule.getInstance();
    this.tutorialModule.initialize();
    this.ambientSoundModule = AmbientSoundModule.getInstance();
    this.ambientSoundModule.initialize();
    this.resourceGatheringModule = ResourceGatheringModule.getInstance();
    this.resourceGatheringModule.setChapterModule(this.chapterModule);
    this.resourceGatheringModule.initialize();
    this.hiddenRuinsModule = HiddenRuinsModule.getInstance();
    this.hiddenRuinsModule.setChapterModule(this.chapterModule);
    this.hiddenRuinsModule.setWeatherModule(this.weatherModule);
    this.hiddenRuinsModule.initialize();
    this.scoringModule = VoyageScoringModule.getInstance();
    this.scoringModule.initialize();
    this.broadcastModule = WorldEventBroadcastModule.getInstance();
    this.broadcastModule.initialize();
    this.replayModule = ChapterReplayModule.getInstance();
    this.replayModule.setChapterModule(this.chapterModule);
    this.replayModule.setScoringModule(this.scoringModule);
    this.replayModule.initialize();
    this.constellationStoryModule = ConstellationStoryModule.getInstance();
    this.constellationStoryModule.initialize();
    this.waypointExplorationModule = WaypointExplorationModule.getInstance();
    this.waypointExplorationModule.setChapterModule(this.chapterModule);
    this.waypointExplorationModule.initialize();
    this.supplyModule = SupplyModule.getInstance();
    this.supplyModule.initialize();
    this.voyageEventModule = VoyageEventModule.getInstance();
    this.voyageEventModule.setChapterModule(this.chapterModule);
    this.voyageEventModule.initialize();
    this.chapterModule.loadChapters(chapters);
    this.saveModule.setDialogueStateProvider(() => this.dialogueModule.getSerializableState());
    this.saveModule.setDayNightStateProvider(() => this.dayNightCycleModule.getSerializableState());
    this.saveModule.setTaskStateProvider(() => this.taskModule.getSerializableState());
    this.saveModule.setShipDamageStateProvider(() => this.shipDamageModule.getSerializableState());
    this.saveModule.setSeaEventStateProvider(() => this.seaEventModule.getSerializableState());
    this.saveModule.setGatheringStateProvider(() => this.resourceGatheringModule.getSerializableState());
    this.saveModule.setRuinsStateProvider(() => this.hiddenRuinsModule.getSerializableState());
    this.saveModule.setScoreStateProvider(() => this.scoringModule.getSerializableState());
    this.saveModule.setReplayStateProvider(() => this.replayModule.getSerializableState());
    this.saveModule.setConstellationStoryStateProvider(() => this.constellationStoryModule.getSerializableState());
    this.saveModule.setWaypointExplorationStateProvider(() => this.waypointExplorationModule.getSerializableState());
    this.saveModule.setChapterProvider(() => this.chapterModule.getCurrentChapter() ?? undefined);
    this.saveModule.setChaptersProvider(() => this.chapterModule.getChapters());
    this.uiModule.setChapterModule(this.chapterModule);
    this.uiModule.setResourceGatheringModule(this.resourceGatheringModule);
    this.uiModule.setTradeModule(this.tradeModule);
    this.uiModule.setRouteModule(this.routeModule);
    
    this.setupEventListeners();
    this.createBackgroundMap();
    
    this.uiModule.showScreen('menu');
    this.engine.start();
    
    this.engine.onUpdate((delta) => {
      if (this.isGameRunning) {
        this.stateManager.updatePlayTime(delta);
        this.stateManager.triggerUpdate(delta);
        this.replayModule.update(delta);
      }
    });
  }

  private setupEventListeners(): void {
    eventBus.on('menu:action', this.handleMenuAction.bind(this));
    eventBus.on('chapter:start', (data: any) => {
      if (typeof data === 'string') {
        this.startChapter(data, false);
      } else if (data && typeof data === 'object' && data.chapterId) {
        this.startChapter(data.chapterId, data.isRestore || false);
      }
    });
    eventBus.on('chapter:next', this.startNextChapter.bind(this));
    eventBus.on('game:pause', () => this.engine.pause());
    eventBus.on('game:resume', () => this.engine.resume());
    eventBus.on('game:stop', this.stopGame.bind(this));
    eventBus.on('game:save', () => this.saveModule.saveGame());
    eventBus.on('checkpoint:rollback', () => this.handleCheckpointRollback());
    eventBus.on('checkpoint:load', (checkpointId: string) => this.handleCheckpointLoad(checkpointId));
    eventBus.on('quickload:start', () => this.handleQuickLoad());
    eventBus.on('connectMode:toggle', (enabled: any) => this.starMapModule.setConnectingMode(enabled));
    eventBus.on('stars:connected', (starIds: any) => this.chapterModule.checkConstellationConnection(starIds));
    eventBus.on('constellation:connect', (constellationId: any) => this.starMapModule.showConstellation(constellationId));
    eventBus.on('progress:reset', () => {
      this.stateManager.reset();
      this.saveModule.deleteSave('default');
      this.saveModule.deleteSave('autosave');
      this.stateManager.resetCrew();
      this.chapterModule.loadChapters(chapters);
      this.crewModule.recalculateBonuses();
      this.tradeModule.resetState();
      this.voyageLogModule.resetState();
      this.achievementModule.initialize();
      this.codexModule.initialize();
      this.dialogueModule.resetState();
      this.taskModule.initialize();
      this.fogOfWarModule.dispose();
      this.shipDamageModule.resetState();
      this.seaEventModule.resetState();
      this.voyageEventModule.resetState();
      this.tutorialModule.resetTutorial();
      this.constellationStoryModule.initialize();
      this.supplyModule.resetState();
      this.resourceGatheringModule.loadState({
        availablePoints: [],
        gatheringProgress: null,
        gatheredPoints: {},
        cooldowns: {},
        discoveredClues: [],
        flags: {},
        totalGatherCount: 0,
      });
      this.hiddenRuinsModule.loadState({
        ruinsId: null,
        status: 'locked',
        unlockedRuinsIds: [],
        completedRuinsIds: [],
        exploration: {
          currentRoomId: null,
          visitedRoomIds: [],
          roomStates: {},
          totalRoomsCompleted: 0,
          enteredAt: null,
        },
        earnedRewards: [],
        settlementSnapshot: null,
        flags: {},
      });
      eventBus.emit('sound:play', 'button_click');
    });
    eventBus.on('constellation_story:load', (storyState: any) => {
      if (storyState) {
        this.constellationStoryModule.loadState(storyState);
      }
    });
    eventBus.on('shipdamage:load', (damageState: any) => {
      if (damageState) {
        this.shipDamageModule.loadSerializableState(damageState);
      }
    });
    eventBus.on('seaevents:load', (seaEventState: any) => {
      if (seaEventState) {
        this.seaEventModule.loadSerializableState(seaEventState);
      }
    });
    eventBus.on('sound:play', (id: any) => this.audioModule.playSfx(id));
    eventBus.on('load:completed', (data: any) => {
      this.crewModule.recalculateBonuses();
      const slotName = data?.slotName;
      const saveData = data?.saveData;
      if (saveData?.taskState) {
        this.taskModule.loadState(saveData.taskState);
      } else if (slotName) {
        const saveInfo = this.saveModule.getSaveInfo(slotName);
        if (saveInfo?.taskState) {
          this.taskModule.loadState(saveInfo.taskState);
        }
      }
      if (saveData?.gatheringState) {
        this.resourceGatheringModule.loadState(saveData.gatheringState);
      } else if (slotName) {
        const saveInfo = this.saveModule.getSaveInfo(slotName);
        if (saveInfo?.gatheringState) {
          this.resourceGatheringModule.loadState(saveInfo.gatheringState);
        }
      }
      if (saveData?.ruinsState) {
        this.hiddenRuinsModule.loadState(saveData.ruinsState);
      } else if (slotName) {
        const saveInfo = this.saveModule.getSaveInfo(slotName);
        if (saveInfo?.ruinsState) {
          this.hiddenRuinsModule.loadState(saveInfo.ruinsState);
        }
      }
      if (saveData?.scoreState) {
        this.scoringModule.loadState(saveData.scoreState);
      } else if (slotName) {
        const saveInfo = this.saveModule.getSaveInfo(slotName);
        if (saveInfo?.scoreState) {
          this.scoringModule.loadState(saveInfo.scoreState);
        }
      }
      if (saveData?.replayState) {
        this.replayModule.loadState(saveData.replayState);
      } else if (slotName) {
        const saveInfo = this.saveModule.getSaveInfo(slotName);
        if (saveInfo?.replayState) {
          this.replayModule.loadState(saveInfo.replayState);
        }
      }
      if (saveData?.waypointExplorationState) {
        this.waypointExplorationModule.loadState(saveData.waypointExplorationState);
      } else if (slotName) {
        const saveInfo = this.saveModule.getSaveInfo(slotName);
        if (saveInfo?.waypointExplorationState) {
          this.waypointExplorationModule.loadState(saveInfo.waypointExplorationState);
        }
      }
    });
    eventBus.on('tasks:load', (taskState: any) => {
      if (taskState) {
        this.taskModule.loadState(taskState);
      }
    });
    eventBus.on('dialogue:load', (dialogueState: any) => {
      if (dialogueState) {
        this.dialogueModule.loadSerializableState(dialogueState);
      }
    });
    eventBus.on('daynight:load', (dayNightState: any) => {
      if (dayNightState) {
        this.dayNightCycleModule.loadState(dayNightState);
      }
    });
    eventBus.on('gathering:load', (gatheringState: any) => {
      if (gatheringState) {
        this.resourceGatheringModule.loadState(gatheringState);
      }
    });
    eventBus.on('ruins:load', (ruinsState: any) => {
      if (ruinsState) {
        this.hiddenRuinsModule.loadState(ruinsState);
      }
    });
    eventBus.on('replay:load', (replayState: any) => {
      if (replayState) {
        this.replayModule.loadState(replayState);
      }
    });
    eventBus.on('chapter:unlock', (chapterId: any) => {
      this.chapterModule.unlockChapter(chapterId);
    });
    eventBus.on('objective:completed', () => {
      this.ambientSoundModule.triggerTemporarySound(
        {
          trackId: 'game',
          layer: 'music',
          baseVolume: 0.35,
          priority: 50,
          fadeStrategy: {
            fadeInDuration: 800,
            fadeOutDuration: 1500,
            crossfade: true,
          },
        },
        3000
      );
    });
  }

  private createBackgroundMap(): void {
    const oceanGeometry = new THREE.PlaneGeometry(400, 400, 50, 50);
    const oceanMaterial = new THREE.MeshPhongMaterial({
      color: 0x0a1628,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      shininess: 100
    });
    
    const ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -2;
    ocean.name = 'ocean';
    this.mapGroup.add(ocean);
    
    const gridHelper = new THREE.GridHelper(400, 40, 0x1a2a4a, 0x0a1628);
    gridHelper.position.y = -1.9;
    this.mapGroup.add(gridHelper);
    
    this.addMapDecorations();
  }

  private addMapDecorations(): void {
    const islandPositions = [
      { x: -60, z: -40, scale: 8 },
      { x: 50, z: 30, scale: 6 },
      { x: 30, z: -60, scale: 5 },
      { x: -40, z: 50, scale: 7 }
    ];
    
    islandPositions.forEach(pos => {
      const islandGeometry = new THREE.ConeGeometry(pos.scale, pos.scale * 1.5, 8);
      const islandMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x2d4a3e 
      });
      const island = new THREE.Mesh(islandGeometry, islandMaterial);
      island.position.set(pos.x, -1 + pos.scale * 0.5, pos.z);
      island.rotation.x = Math.PI;
      this.mapGroup.add(island);
      
      const snowGeometry = new THREE.ConeGeometry(pos.scale * 0.3, pos.scale * 0.5, 8);
      const snowMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xffffff 
      });
      const snow = new THREE.Mesh(snowGeometry, snowMaterial);
      snow.position.set(pos.x, pos.scale * 0.8, pos.z);
      snow.rotation.x = Math.PI;
      this.mapGroup.add(snow);
    });
    
    for (let i = 0; i < 50; i++) {
      const waveGeometry = new THREE.RingGeometry(1, 1.5, 16);
      const waveMaterial = new THREE.MeshBasicMaterial({
        color: 0x3a5a8a,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      const wave = new THREE.Mesh(waveGeometry, waveMaterial);
      wave.rotation.x = -Math.PI / 2;
      wave.position.set(
        (Math.random() - 0.5) * 300,
        -1.8,
        (Math.random() - 0.5) * 300
      );
      wave.userData = { 
        originalScale: 1,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5
      };
      this.mapGroup.add(wave);
      
      this.engine.onUpdate((delta, elapsed) => {
        const scale = 1 + Math.sin(elapsed * wave.userData.speed + wave.userData.phase) * 0.3;
        wave.scale.setScalar(scale);
        (wave.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(elapsed * wave.userData.speed + wave.userData.phase) * 0.1;
      });
    }
  }

  private handleMenuAction(action: string): void {
    switch (action) {
      case 'newGame':
        this.saveModule.deleteSave('default');
        this.saveModule.deleteSave('autosave');
        this.stateManager.reset();
        this.chapterModule.loadChapters(chapters);
        this.crewModule.resetState();
        this.tradeModule.resetState();
        this.achievementModule.initialize();
        this.codexModule.initialize();
        this.dialogueModule.resetState();
        this.dayNightCycleModule.reset();
        this.taskModule.initialize();
        this.shipDamageModule.resetState();
        this.tutorialModule.resetTutorial();
        this.supplyModule.resetState();
        this.resourceGatheringModule.loadState({
          availablePoints: [],
          gatheringProgress: null,
          gatheredPoints: {},
          cooldowns: {},
          discoveredClues: [],
          flags: {},
          totalGatherCount: 0,
        });
        eventBus.emit('tutorial:newGame');
        this.startChapter(chapters[0].id);
        break;
      case 'continue':
      case 'continueGame': {
        const best = this.saveModule.findBestSaveSlot();
        if (best) {
          const saveData = this.saveModule.loadGame(best.slotName);
          if (saveData) {
            this.restoreFromSaveData(saveData);
            const source = best.slotName === 'autosave' ? '自动存档' : best.slotName;
            eventBus.emit('toast:show', { message: `📂 已从${source}恢复游戏` });
          } else {
            this.fallbackToNewGame();
          }
        } else {
          this.fallbackToNewGame();
        }
        break;
      }
      case 'chapterSelect':
        this.uiModule.showScreen('chapterSelect');
        break;
      case 'settings':
        this.uiModule.showScreen('settings');
        break;
      case 'achievements':
        this.uiModule.showScreen('achievements');
        break;
      case 'codex':
        this.uiModule.showScreen('codex');
        break;
    }
  }

  private startChapter(chapterId: string, isRestore: boolean = false): void {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter) return;
    
    const savedRestoreState = isRestore ? {
      currentPosition: { ...this.stateManager.getState().currentPosition },
      currentRoute: this.stateManager.getState().currentRoute,
      currentRouteProgress: this.stateManager.getState().currentRouteProgress,
      activeWeather: this.stateManager.getState().activeWeather,
      weatherWarning: { ...this.stateManager.getState().weatherWarning },
      completedObjectives: [...(this.stateManager.getState().completedObjectives || [])],
    } : null;
    
    this.engine.clearScene();
    this.mapGroup.clear();
    this.engine.scene.add(this.mapGroup);
    this.fogOfWarModule.ensureInScene();
    
    this.createBackgroundMap();
    
    this.starMapModule.loadChapterStars(chapter.stars, chapter.constellations, chapter);
    this.routeModule.loadChapterRoutes(chapter.routes, chapter.routePoints);

    if (isRestore && savedRestoreState) {
      const chapterElapsedSeconds = this.stateManager.getChapterElapsedTime();
      this.weatherModule.restoreChapterWeather(
        chapter.weatherEvents,
        chapterElapsedSeconds,
        savedRestoreState.activeWeather,
        savedRestoreState.weatherWarning
      );
    } else {
      this.weatherModule.loadChapterWeather(chapter.weatherEvents);
    }

    this.fogOfWarModule.loadChapterFog(chapter.mapBounds, chapter.routePoints);
    
    if (isRestore && savedRestoreState) {
      this.chapterModule.restoreChapterProgress(chapterId, savedRestoreState.completedObjectives);
    } else {
      this.chapterModule.startChapter(chapterId);
    }
    
    if (isRestore && savedRestoreState) {
      const partialState: any = {};
      if (savedRestoreState.currentPosition) {
        partialState.currentPosition = { ...savedRestoreState.currentPosition };
      }
      if (savedRestoreState.currentRoute !== undefined) {
        partialState.currentRoute = savedRestoreState.currentRoute;
      }
      if (savedRestoreState.currentRouteProgress !== undefined) {
        partialState.currentRouteProgress = savedRestoreState.currentRouteProgress;
      }
      if (savedRestoreState.activeWeather !== undefined) {
        partialState.activeWeather = savedRestoreState.activeWeather;
      }
      this.stateManager.setState(partialState);
    }
    
    const state = this.stateManager.getState();

    if (isRestore && state.currentPosition) {
      this.routeModule.setShipPosition(
        state.currentPosition.x,
        state.currentPosition.y,
        state.currentPosition.z
      );
      this.engine.setCameraPosition(
        state.currentPosition.x,
        80,
        state.currentPosition.z + 60
      );
      this.engine.lookAt(
        state.currentPosition.x,
        0,
        state.currentPosition.z
      );

      if (state.currentRoute) {
        this.routeModule.restoreRouteState(state.currentRoute, state.currentRouteProgress || 0);
      }

      if (state.waypointExploration) {
        this.waypointExplorationModule.loadState(state.waypointExploration);
      }
    } else {
      const startPoint = chapter.routePoints.find(p => p.type === 'start');
      if (startPoint) {
        this.routeModule.setShipPosition(
          startPoint.position.x,
          startPoint.position.y,
          startPoint.position.z
        );
        this.engine.setCameraPosition(
          startPoint.position.x,
          80,
          startPoint.position.z + 60
        );
        this.engine.lookAt(
          startPoint.position.x,
          0,
          startPoint.position.z
        );
      }
      
      if (chapter.routes.length > 0 && isRestore) {
        const selectedRouteId = this.stateManager.getSelectedBranchRoute() || chapter.routes[0].id;
        setTimeout(() => {
          eventBus.emit('route:start', selectedRouteId);
        }, 2000);
      }
    }
    
    this.isGameRunning = true;
    this.uiModule.showScreen('game');
    this.navigationDashboardModule.show();

    if (!isRestore) {
      setTimeout(() => {
        this.dialogueModule.trigger('chapter_open', chapterId);
      }, 500);
    }
  }

  private startNextChapter(): void {
    const currentChapter = this.chapterModule.getCurrentChapter();
    if (!currentChapter) return;
    
    const nextIndex = chapters.findIndex(c => c.id === currentChapter.id) + 1;
    if (nextIndex < chapters.length) {
      this.startChapter(chapters[nextIndex].id);
    } else {
      this.uiModule.showScreen('menu');
      eventBus.emit('toast:show', { message: '恭喜你完成了所有章节！' });
    }
  }

  private stopGame(): void {
    this.isGameRunning = false;
    this.navigationDashboardModule.hide();
    this.saveModule.saveGame();
    this.ambientSoundModule.dispose();
    this.chapterModule.resetProgress();
  }

  private handleCheckpointRollback(): void {
    const saveData = this.saveModule.rollbackToLastCheckpoint();
    if (saveData) {
      this.restoreFromSaveData(saveData);
      eventBus.emit('toast:show', { message: '↩️ 已恢复到最近的检查点' });
    } else {
      eventBus.emit('toast:show', { message: '没有可恢复的检查点' });
    }
  }

  private handleCheckpointLoad(checkpointId: string): void {
    const saveData = this.saveModule.loadCheckpoint(checkpointId);
    if (saveData) {
      this.restoreFromSaveData(saveData);
      eventBus.emit('toast:show', { message: '↩️ 已恢复到指定检查点' });
    } else {
      eventBus.emit('toast:show', { message: '恢复检查点失败' });
    }
  }

  private handleQuickLoad(): void {
    const saveData = this.saveModule.quickLoad();
    if (saveData) {
      this.restoreFromSaveData(saveData);
      eventBus.emit('toast:show', { message: '📂 已读取快速存档' });
    } else {
      eventBus.emit('toast:show', { message: '没有快速存档可读取' });
    }
  }

  private restoreFromSaveData(saveData: any): void {
    if (saveData.dialogueState) {
      this.dialogueModule.loadSerializableState(saveData.dialogueState);
    }
    if (saveData.dayNightState) {
      this.dayNightCycleModule.loadState(saveData.dayNightState);
    }
    const state = this.stateManager.getState();
    if (state.currentChapterId) {
      this.startChapter(state.currentChapterId, true);
    } else {
      this.uiModule.showScreen('chapterSelect');
    }
  }

  private fallbackToNewGame(): void {
    this.dialogueModule.resetState();
    this.dayNightCycleModule.reset();
    this.startChapter(chapters[0].id);
  }

  public dispose(): void {
    this.stopGame();
    this.starMapModule.dispose();
    this.routeModule.dispose();
    this.weatherModule.dispose();
    this.audioModule.dispose();
    this.saveModule.dispose();
    this.uiModule.dispose();
    this.crewModule.dispose();
    this.tradeModule.dispose();
    this.voyageLogModule.dispose();
    this.achievementModule.dispose();
    this.codexModule.dispose();
    this.dialogueModule.dispose();
    this.dayNightCycleModule.dispose();
    this.taskModule.dispose();
    this.fogOfWarModule.dispose();
    this.shipDamageModule.dispose();
    this.navigationDashboardModule.dispose();
    this.supplyModule.dispose();
    this.resourceGatheringModule.dispose();
    this.hiddenRuinsModule.dispose();
    this.broadcastModule.dispose();
    this.engine.dispose();
    eventBus.clear();
  }
}
