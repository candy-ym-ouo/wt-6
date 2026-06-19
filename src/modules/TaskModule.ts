import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import {
  DynamicTask,
  TaskProgress,
  TaskState,
  ExplorationStats,
  TaskReward,
  TaskHint,
  ChapterProgressCondition,
  WeatherConditionConfig,
  ExplorationCondition,
  WeatherType,
  WeatherCondition,
  TaskType,
} from '../types';
import { dynamicTasks, getTasksForChapter, getTaskById } from '../data/dynamicTasks';
import { ChapterModule } from './ChapterModule';
import { SaveModule } from './SaveModule';

const DEFAULT_TASK_STATE: TaskState = {
  activeTasks: [],
  completedTaskIds: [],
  explorationStats: {
    totalDistanceTraveled: 0,
    sessionDistanceTraveled: 0,
    sessionStarsDiscovered: 0,
    positionsVisited: [],
    lastPosition: { x: 0, y: 0, z: 0 },
  },
  weatherSurvivalStats: {},
  dynamicTaskHistory: [],
};

export class TaskModule {
  private static instance: TaskModule;
  private stateManager: GameStateManager;
  private chapterModule: ChapterModule | null = null;
  private isInitialized: boolean = false;
  private currentWeather: WeatherType | null = null;
  private weatherStartTime: number = 0;
  private activeWeatherTaskIds: Set<string> = new Set();

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
  }

  public static getInstance(): TaskModule {
    if (!TaskModule.instance) {
      TaskModule.instance = new TaskModule();
    }
    return TaskModule.instance;
  }

  public setChapterModule(module: ChapterModule): void {
    this.chapterModule = module;
  }

  public initialize(): void {
    this.ensureTaskState();
    if (!this.isInitialized) {
      this.setupEventListeners();
      this.isInitialized = true;
    }
    this.checkTriggersOnStartup();
  }

  private ensureTaskState(): void {
    const state = this.stateManager.getState();
    if (!state.tasks) {
      this.stateManager.setState({
        tasks: { ...DEFAULT_TASK_STATE, explorationStats: { ...DEFAULT_TASK_STATE.explorationStats } },
      });
    }
  }

  private setupEventListeners(): void {
    eventBus.on('star:discovered', () => {
      const taskState = this.getTaskState();
      taskState.explorationStats.sessionStarsDiscovered++;
      this.updateTaskState(taskState);
      this.updateTaskProgress('discover_stars', 1);
      this.checkChapterProgressTriggers();
      this.checkExplorationTriggers();
    });

    eventBus.on('constellation:discovered', (constellationId: string) => {
      this.updateTaskProgress('discover_constellation', 1, constellationId);
      this.updateTaskProgress('connect_stars', 1, constellationId);
      this.checkChapterProgressTriggers();
    });

    eventBus.on('point:visited', (pointId: string) => {
      this.updateTaskProgress('visit_points', 1, pointId);
      this.checkChapterProgressTriggers();
      this.checkExplorationTriggers();
    });

    eventBus.on('weather:changed', (weather: WeatherType | null) => {
      if (weather) {
        this.currentWeather = weather;
        this.weatherStartTime = Date.now();
        this.recordWeatherStart(weather.id);
        this.checkWeatherTriggers(weather);
      } else {
        if (this.currentWeather) {
          this.recordWeatherSurvival(this.currentWeather);
          this.completeWeatherSurvivalTasks(this.currentWeather);
        }
        this.currentWeather = null;
        this.activeWeatherTaskIds.clear();
      }
    });

    eventBus.on('stars:connected', () => {
      this.updateTaskProgress('connect_stars', 1);
    });

    eventBus.on('route:completed', (routeId: string) => {
      this.updateTaskProgress('reach_destination', 1, routeId);
    });

    eventBus.on('chapter:started', () => {
      const taskState = this.getTaskState();
      taskState.explorationStats.sessionDistanceTraveled = 0;
      taskState.explorationStats.sessionStarsDiscovered = 0;
      this.updateTaskState(taskState);
      this.checkChapterProgressTriggers();
    });

    eventBus.on('progress:reset', () => {
      this.resetState();
    });

    this.stateManager.onUpdate((delta: number) => {
      this.trackExploration(delta);
      this.checkExpiredTasks();
    });
  }

  private getTaskState(): TaskState {
    const state = this.stateManager.getState();
    if (!state.tasks) {
      this.ensureTaskState();
      return { ...DEFAULT_TASK_STATE, explorationStats: { ...DEFAULT_TASK_STATE.explorationStats } };
    }
    return {
      ...state.tasks,
      activeTasks: state.tasks.activeTasks.map(t => ({ ...t })),
      explorationStats: { ...state.tasks.explorationStats },
      weatherSurvivalStats: { ...state.tasks.weatherSurvivalStats },
      dynamicTaskHistory: state.tasks.dynamicTaskHistory.map(h => ({ ...h })),
    };
  }

  private updateTaskState(taskState: TaskState): void {
    this.stateManager.setState({ tasks: taskState });
  }

  private trackExploration(delta: number): void {
    const state = this.stateManager.getState();
    const taskState = this.getTaskState();
    const currentPos = state.currentPosition;
    const lastPos = taskState.explorationStats.lastPosition;

    if (lastPos.x !== 0 || lastPos.y !== 0 || lastPos.z !== 0) {
      const dx = currentPos.x - lastPos.x;
      const dz = currentPos.z - lastPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance > 0.01) {
        taskState.explorationStats.totalDistanceTraveled += distance;
        taskState.explorationStats.sessionDistanceTraveled += distance;

        taskState.explorationStats.positionsVisited.push({
          x: currentPos.x,
          z: currentPos.z,
          timestamp: Date.now(),
        });

        if (taskState.explorationStats.positionsVisited.length > 100) {
          taskState.explorationStats.positionsVisited = taskState.explorationStats.positionsVisited.slice(-100);
        }

        this.updateTaskState(taskState);
        this.updateTaskProgress('travel_distance', distance);
        this.checkExplorationTriggers();
      }
    }

    taskState.explorationStats.lastPosition = { ...currentPos };
    this.updateTaskState(taskState);
  }

  private checkTriggersOnStartup(): void {
    this.checkChapterProgressTriggers();
    this.checkExplorationTriggers();
  }

  private checkChapterProgressTriggers(): void {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return;

    const chapterTasks = getTasksForChapter(currentChapterId);
    const progressTasks = chapterTasks.filter(t => t.trigger.source === 'chapter_progress');

    progressTasks.forEach(task => {
      if (task.trigger.chapterProgress && this.shouldTriggerTask(task) && this.checkChapterProgressCondition(task.trigger.chapterProgress)) {
        this.acceptTask(task);
      }
    });
  }

  private checkChapterProgressCondition(condition: ChapterProgressCondition): boolean {
    const state = this.stateManager.getState();

    if (condition.minStarsDiscovered !== undefined) {
      const chapterStars = this.getChapterStarsDiscoveredCount();
      if (chapterStars < condition.minStarsDiscovered) return false;
    }
    if (condition.minConstellationsDiscovered !== undefined) {
      const chapterCons = this.getChapterConstellationsDiscoveredCount();
      if (chapterCons < condition.minConstellationsDiscovered) return false;
    }
    if (condition.minPointsVisited !== undefined) {
      const chapterPoints = this.getChapterPointsVisitedCount();
      if (chapterPoints < condition.minPointsVisited) return false;
    }
    if (condition.minObjectivesCompleted !== undefined) {
      if (state.completedObjectives.length < condition.minObjectivesCompleted) return false;
    }
    if (condition.completedChapterIds) {
      const allCompleted = condition.completedChapterIds.every(id => state.completedChapters.includes(id));
      if (!allCompleted) return false;
    }

    return true;
  }

  private checkWeatherTriggers(weather: WeatherType): void {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return;

    const chapterTasks = getTasksForChapter(currentChapterId);
    const weatherTasks = chapterTasks.filter(t => t.trigger.source === 'weather');

    weatherTasks.forEach(task => {
      if (task.trigger.weather && this.shouldTriggerTask(task) && this.checkWeatherCondition(task.trigger.weather, weather)) {
        this.activeWeatherTaskIds.add(task.id);
        this.acceptTask(task);
      }
    });
  }

  private checkWeatherCondition(condition: WeatherConditionConfig, weather: WeatherType): boolean {
    if (condition.minIntensity !== undefined && weather.intensity < condition.minIntensity) {
      return false;
    }
    if (condition.minDuration !== undefined && weather.duration < condition.minDuration) {
      return false;
    }

    return this.matchWeatherType(condition.weatherType, weather);
  }

  private matchWeatherType(conditionType: WeatherCondition, weather: WeatherType): boolean {
    const weatherTypeId = this.extractWeatherTypeId(weather.id);

    switch (conditionType) {
      case 'any':
        return true;
      case 'any_adverse':
        return weatherTypeId === 'storm' || weatherTypeId === 'fog';
      default:
        return weatherTypeId === conditionType;
    }
  }

  private extractWeatherTypeId(id: string): string {
    if (id.includes('storm')) return 'storm';
    if (id.includes('fog')) return 'fog';
    if (id.includes('meteor')) return 'meteor';
    return 'clear';
  }

  private checkExplorationTriggers(): void {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return;

    const chapterTasks = getTasksForChapter(currentChapterId);
    const explorationTasks = chapterTasks.filter(t => t.trigger.source === 'exploration');

    explorationTasks.forEach(task => {
      if (task.trigger.exploration && this.shouldTriggerTask(task) && this.checkExplorationCondition(task.trigger.exploration)) {
        this.acceptTask(task);
      }
    });
  }

  private checkExplorationCondition(condition: ExplorationCondition): boolean {
    const taskState = this.getTaskState();
    const state = this.stateManager.getState();

    if (condition.minDistanceTraveled !== undefined) {
      if (taskState.explorationStats.totalDistanceTraveled < condition.minDistanceTraveled) return false;
    }
    if (condition.minUniquePointsVisited !== undefined) {
      const uniquePoints = state.visitedPoints.length;
      if (uniquePoints < condition.minUniquePointsVisited) return false;
    }
    if (condition.minStarsDiscoveredInSession !== undefined) {
      if (taskState.explorationStats.sessionStarsDiscovered < condition.minStarsDiscoveredInSession) return false;
    }
    if (condition.specificRegion) {
      const pos = state.currentPosition;
      const { minX, maxX, minZ, maxZ } = condition.specificRegion;
      if (pos.x < minX || pos.x > maxX || pos.z < minZ || pos.z > maxZ) return false;
    }

    return true;
  }

  private shouldTriggerTask(task: DynamicTask): boolean {
    const taskState = this.getTaskState();
    const now = Date.now();

    const existingProgress = taskState.activeTasks.find(t => t.taskId === task.id);
    if (existingProgress && !existingProgress.completed) {
      return false;
    }

    const isCompleted = taskState.completedTaskIds.includes(task.id);
    if (isCompleted && !task.repeatable) {
      return false;
    }

    if (task.trigger.maxOccurrences !== undefined) {
      const occurrenceCount = taskState.dynamicTaskHistory.filter(h => h.taskId === task.id).length;
      if (occurrenceCount >= task.trigger.maxOccurrences) {
        return false;
      }
    }

    if (task.trigger.cooldown !== undefined) {
      const lastTriggered = taskState.dynamicTaskHistory
        .filter(h => h.taskId === task.id)
        .sort((a, b) => b.completedAt - a.completedAt)[0];
      if (lastTriggered && now - lastTriggered.completedAt < task.trigger.cooldown) {
        return false;
      }
    }

    return true;
  }

  private acceptTask(task: DynamicTask): void {
    const taskState = this.getTaskState();
    const now = Date.now();

    const existing = taskState.activeTasks.find(t => t.taskId === task.id && !t.completed);
    if (existing) return;

    const progress: TaskProgress = {
      taskId: task.id,
      progress: this.getInitialProgress(task),
      completed: false,
      acceptedAt: now,
      triggerCount: 1,
      lastTriggeredAt: now,
      expiresAt: task.expiresAfter ? now + task.expiresAfter : undefined,
    };

    taskState.activeTasks.push(progress);
    this.updateTaskState(taskState);

    eventBus.emit('task:accepted', task);
    this.showTaskHints(task);

    if (progress.progress >= task.total) {
      this.completeTask(task.id);
    }

    eventBus.emit('tasks:updated', this.getActiveTasksWithInfo());
  }

  private getInitialProgress(task: DynamicTask): number {
    switch (task.type) {
      case 'discover_stars':
        return typeof task.target === 'number' ? Math.min(this.getChapterStarsDiscoveredCount(), task.total) : 0;
      case 'discover_constellation':
        return typeof task.target === 'number' ? Math.min(this.getChapterConstellationsDiscoveredCount(), task.total) : 0;
      case 'visit_points':
        if (typeof task.target === 'number') {
          return Math.min(this.getChapterPointsVisitedCount(), task.total);
        }
        return this.stateManager.isPointVisited(task.target as string) ? 1 : 0;
      case 'travel_distance':
        return typeof task.target === 'number' ? Math.min(Math.floor(this.getTaskState().explorationStats.totalDistanceTraveled), task.total) : 0;
      case 'survive_weather':
      case 'connect_stars':
      case 'reach_destination':
      case 'collect_supplies':
        return 0;
      default:
        return 0;
    }
  }

  private updateTaskProgress(type: TaskType, amount: number, targetId?: string): void {
    const taskState = this.getTaskState();
    let hasUpdates = false;

    taskState.activeTasks.forEach(progress => {
      if (progress.completed) return;

      const task = getTaskById(progress.taskId);
      if (!task || task.type !== type) return;

      if (targetId !== undefined) {
        if (task.target !== 'any' && task.target !== targetId) {
          if (type === 'survive_weather') {
            if (!this.matchWeatherSurvivalTarget(task.target as string, targetId)) {
              return;
            }
          } else {
            return;
          }
        }
      }

      progress.progress = Math.min(progress.progress + amount, task.total);
      hasUpdates = true;

      if (progress.progress >= task.total) {
        this.completeTask(task.id);
      }
    });

    if (hasUpdates) {
      this.updateTaskState(taskState);
      eventBus.emit('tasks:updated', this.getActiveTasksWithInfo());
    }
  }

  private matchWeatherSurvivalTarget(taskTarget: string, weatherId: string): boolean {
    if (taskTarget === 'any') return true;
    if (taskTarget === 'any_adverse') {
      return weatherId.includes('storm') || weatherId.includes('fog');
    }
    return weatherId.includes(taskTarget);
  }

  private recordWeatherStart(weatherId: string): void {
    const taskState = this.getTaskState();
    if (!taskState.weatherSurvivalStats[weatherId]) {
      taskState.weatherSurvivalStats[weatherId] = 0;
    }
    this.updateTaskState(taskState);
  }

  private recordWeatherSurvival(weather: WeatherType): void {
    const taskState = this.getTaskState();
    taskState.weatherSurvivalStats[weather.id] = (taskState.weatherSurvivalStats[weather.id] || 0) + 1;
    this.updateTaskState(taskState);
  }

  private completeWeatherSurvivalTasks(weather: WeatherType): void {
    const weatherTypeId = this.extractWeatherTypeId(weather.id);
    this.updateTaskProgress('survive_weather', 1, weatherTypeId);
    this.updateTaskProgress('survive_weather', 1, weather.id);
    if (weatherTypeId === 'storm' || weatherTypeId === 'fog') {
      this.updateTaskProgress('survive_weather', 1, 'any_adverse');
    }
  }

  private completeTask(taskId: string): void {
    const taskState = this.getTaskState();
    const progressIndex = taskState.activeTasks.findIndex(t => t.taskId === taskId);
    if (progressIndex === -1) return;

    const progress = taskState.activeTasks[progressIndex];
    if (progress.completed) return;

    const task = getTaskById(taskId);
    if (!task) return;

    progress.completed = true;
    progress.completedAt = Date.now();
    taskState.activeTasks[progressIndex] = progress;

    if (!taskState.completedTaskIds.includes(taskId)) {
      taskState.completedTaskIds.push(taskId);
    }

    taskState.dynamicTaskHistory.push({
      taskId,
      completedAt: Date.now(),
      rewardsGranted: true,
    });

    this.updateTaskState(taskState);

    this.grantRewards(task);

    eventBus.emit('task:completed', task);
    eventBus.emit('toast:show', {
      message: `🎉 任务完成：${task.name}`,
      duration: 4000,
    });

    eventBus.emit('tasks:updated', this.getActiveTasksWithInfo());

    SaveModule.getInstance().saveGame('autosave');
  }

  private grantRewards(task: DynamicTask): void {
    const state = this.stateManager.getState();

    task.rewards.forEach((reward: TaskReward) => {
      switch (reward.type) {
        case 'gold':
          this.stateManager.updateCrew({
            gold: state.crew.gold + reward.value,
          });
          eventBus.emit('toast:show', { message: `💰 获得金币 +${reward.value}` });
          break;
        case 'supplies':
          this.stateManager.updateShip({
            supplies: Math.min(state.ship.supplies + reward.value, state.ship.maxSupplies),
          });
          eventBus.emit('toast:show', { message: `📦 获得补给 +${reward.value}` });
          break;
        case 'exp':
          const updatedMembers = state.crew.members.map(member => {
            let newExp = member.exp + reward.value;
            let newLevel = member.level;
            let newMaxExp = member.maxExp;
            while (newExp >= newMaxExp) {
              newExp -= newMaxExp;
              newLevel++;
              newMaxExp = Math.floor(newMaxExp * 1.5);
            }
            return { ...member, exp: newExp, level: newLevel, maxExp: newMaxExp };
          });
          this.stateManager.updateCrew({ members: updatedMembers });
          eventBus.emit('toast:show', { message: `⭐ 船员获得经验 +${reward.value}` });
          break;
        case 'unlock_chapter':
          if (reward.chapterId && this.chapterModule) {
            this.chapterModule.unlockChapter(reward.chapterId);
          }
          break;
      }
    });
  }

  private showTaskHints(task: DynamicTask): void {
    if (task.hints.length === 0) return;

    task.hints.forEach((hint: TaskHint, index: number) => {
      setTimeout(() => {
        const message = hint.icon ? `${hint.icon} ${hint.text}` : hint.text;
        eventBus.emit('toast:show', {
          message,
          duration: hint.duration || 5000,
        });
      }, index * 1500 + 500);
    });
  }

  private checkExpiredTasks(): void {
    const taskState = this.getTaskState();
    const now = Date.now();
    let hasExpired = false;

    taskState.activeTasks = taskState.activeTasks.filter(progress => {
      if (progress.completed) return true;
      if (progress.expiresAt && now > progress.expiresAt) {
        hasExpired = true;
        eventBus.emit('task:expired', progress.taskId);
        return false;
      }
      return true;
    });

    if (hasExpired) {
      this.updateTaskState(taskState);
      eventBus.emit('tasks:updated', this.getActiveTasksWithInfo());
    }
  }

  private getChapterStarsDiscoveredCount(): number {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return state.discoveredStars.length;

    const chapterPrefix = currentChapterId.replace('chapter-', 'star-');
    return state.discoveredStars.filter(id => id.startsWith(chapterPrefix)).length;
  }

  private getChapterConstellationsDiscoveredCount(): number {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return state.discoveredConstellations.length;

    const chapterPrefix = currentChapterId.replace('chapter-', 'cons-');
    return state.discoveredConstellations.filter(id => id.startsWith(chapterPrefix)).length;
  }

  private getChapterPointsVisitedCount(): number {
    const state = this.stateManager.getState();
    const currentChapterId = state.currentChapterId;
    if (!currentChapterId) return state.visitedPoints.length;

    const chapterNum = currentChapterId.replace('chapter-', '');
    return state.visitedPoints.filter(id => {
      if (chapterNum === '1') return id.startsWith('point-') && !id.includes('2-') && !id.includes('3-');
      return id.startsWith(`point-${chapterNum}-`);
    }).length;
  }

  public getActiveTasksWithInfo(): Array<{ task: DynamicTask; progress: TaskProgress }> {
    const taskState = this.getTaskState();
    return taskState.activeTasks
      .filter(p => !p.completed)
      .map(progress => {
        const task = getTaskById(progress.taskId);
        return task ? { task, progress } : null;
      })
      .filter((item): item is { task: DynamicTask; progress: TaskProgress } => item !== null);
  }

  public getCompletedTasks(): DynamicTask[] {
    const taskState = this.getTaskState();
    return taskState.completedTaskIds
      .map(id => getTaskById(id))
      .filter((t): t is DynamicTask => t !== undefined);
  }

  public getTaskProgress(taskId: string): TaskProgress | undefined {
    const taskState = this.getTaskState();
    return taskState.activeTasks.find(t => t.taskId === taskId);
  }

  public getExplorationStats(): ExplorationStats {
    return { ...this.getTaskState().explorationStats };
  }

  public getAllTasks(): DynamicTask[] {
    return [...dynamicTasks];
  }

  private resetState(): void {
    this.stateManager.setState({
      tasks: { ...DEFAULT_TASK_STATE, explorationStats: { ...DEFAULT_TASK_STATE.explorationStats } },
    });
    this.currentWeather = null;
    this.activeWeatherTaskIds.clear();
  }

  public getSerializableState(): TaskState {
    return this.getTaskState();
  }

  public loadState(savedState: TaskState): void {
    this.stateManager.setState({
      tasks: {
        ...savedState,
        activeTasks: savedState.activeTasks.map(t => ({ ...t })),
        explorationStats: { ...savedState.explorationStats },
        weatherSurvivalStats: { ...savedState.weatherSurvivalStats },
        dynamicTaskHistory: savedState.dynamicTaskHistory.map(h => ({ ...h })),
      },
    });
  }

  public dispose(): void {
  }
}
