import { Chapter, Star, Constellation, Route, RoutePoint, WeatherEventConfig, Objective } from '../types';
import { chapters as defaultChapters } from '../data/chapters';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface EditorState {
  currentChapter: Chapter | null;
  isDirty: boolean;
  validationErrors: ValidationError[];
  activeTab: EditorTab;
  previewMode: boolean;
}

export type EditorTab = 'basic' | 'stars' | 'constellations' | 'routes' | 'waypoints' | 'weather' | 'objectives';

export class ChapterEditorModule {
  private static instance: ChapterEditorModule;
  private state: EditorState;
  private chapters: Chapter[];

  private constructor() {
    this.state = {
      currentChapter: null,
      isDirty: false,
      validationErrors: [],
      activeTab: 'basic',
      previewMode: false,
    };
    this.chapters = JSON.parse(JSON.stringify(defaultChapters));
  }

  public static getInstance(): ChapterEditorModule {
    if (!ChapterEditorModule.instance) {
      ChapterEditorModule.instance = new ChapterEditorModule();
    }
    return ChapterEditorModule.instance;
  }

  public getState(): EditorState {
    return { ...this.state };
  }

  public getChapters(): Chapter[] {
    return this.chapters;
  }

  public setActiveTab(tab: EditorTab): void {
    this.state.activeTab = tab;
  }

  public togglePreviewMode(): boolean {
    this.state.previewMode = !this.state.previewMode;
    return this.state.previewMode;
  }

  public loadChapter(chapterId: string): Chapter | null {
    const chapter = this.chapters.find(c => c.id === chapterId);
    if (chapter) {
      this.state.currentChapter = JSON.parse(JSON.stringify(chapter));
      this.state.isDirty = false;
      this.validateCurrentChapter();
      return this.state.currentChapter;
    }
    return null;
  }

  public createNewChapter(): Chapter {
    const newNumber = this.chapters.length + 1;
    const newChapter: Chapter = {
      id: `chapter-${newNumber}`,
      number: newNumber,
      name: `第${newNumber}章`,
      description: '请输入章节描述',
      intro: '请输入章节介绍文字',
      mapBounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
      startingPosition: { x: 0, y: 0, z: 50 },
      unlocked: false,
      stars: [],
      constellations: [],
      routes: [],
      routePoints: [],
      weatherEvents: [],
      objectives: [],
      starsToDiscover: 0,
      constellationsToDiscover: 0,
    };
    this.chapters.push(newChapter);
    this.state.currentChapter = JSON.parse(JSON.stringify(newChapter));
    this.state.isDirty = true;
    return newChapter;
  }

  public saveCurrentChapter(): boolean {
    if (!this.state.currentChapter) return false;

    const errors = this.validateCurrentChapter();
    const hasErrors = errors.some(e => e.severity === 'error');
    if (hasErrors) return false;

    const index = this.chapters.findIndex(c => c.id === this.state.currentChapter!.id);
    if (index !== -1) {
      this.chapters[index] = JSON.parse(JSON.stringify(this.state.currentChapter));
      this.state.isDirty = false;
      return true;
    }
    return false;
  }

  public deleteChapter(chapterId: string): boolean {
    const index = this.chapters.findIndex(c => c.id === chapterId);
    if (index !== -1) {
      this.chapters.splice(index, 1);
      if (this.state.currentChapter?.id === chapterId) {
        this.state.currentChapter = null;
        this.state.isDirty = false;
      }
      return true;
    }
    return false;
  }

  public updateBasicInfo(data: Partial<Chapter>): void {
    if (!this.state.currentChapter) return;
    Object.assign(this.state.currentChapter, data);
    this.state.isDirty = true;
    this.validateCurrentChapter();
  }

  public addStar(star: Omit<Star, 'id'>): Star {
    if (!this.state.currentChapter) {
      throw new Error('No chapter loaded');
    }
    const newStar: Star = {
      ...star,
      id: `star-${Date.now()}`,
    };
    this.state.currentChapter.stars.push(newStar);
    this.state.isDirty = true;
    this.validateCurrentChapter();
    return newStar;
  }

  public updateStar(starId: string, data: Partial<Star>): void {
    if (!this.state.currentChapter) return;
    const star = this.state.currentChapter.stars.find(s => s.id === starId);
    if (star) {
      Object.assign(star, data);
      this.state.isDirty = true;
      this.validateCurrentChapter();
    }
  }

  public deleteStar(starId: string): void {
    if (!this.state.currentChapter) return;
    const index = this.state.currentChapter.stars.findIndex(s => s.id === starId);
    if (index !== -1) {
      this.state.currentChapter.stars.splice(index, 1);
      this.state.currentChapter.constellations.forEach(c => {
        c.stars = c.stars.filter(id => id !== starId);
      });
      this.state.currentChapter.routes.forEach(r => {
        if (r.requiredStars) {
          r.requiredStars = r.requiredStars.filter(id => id !== starId);
        }
      });
      this.state.isDirty = true;
      this.validateCurrentChapter();
    }
  }

  public addConstellation(constellation: Omit<Constellation, 'id'>): Constellation {
    if (!this.state.currentChapter) {
      throw new Error('No chapter loaded');
    }
    const newConstellation: Constellation = {
      ...constellation,
      id: `cons-${Date.now()}`,
    };
    this.state.currentChapter.constellations.push(newConstellation);
    this.state.isDirty = true;
    this.validateCurrentChapter();
    return newConstellation;
  }

  public updateConstellation(constellationId: string, data: Partial<Constellation>): void {
    if (!this.state.currentChapter) return;
    const constellation = this.state.currentChapter.constellations.find(c => c.id === constellationId);
    if (constellation) {
      Object.assign(constellation, data);
      this.state.isDirty = true;
      this.validateCurrentChapter();
    }
  }

  public deleteConstellation(constellationId: string): void {
    if (!this.state.currentChapter) return;
    const index = this.state.currentChapter.constellations.findIndex(c => c.id === constellationId);
    if (index !== -1) {
      this.state.currentChapter.constellations.splice(index, 1);
      this.state.currentChapter.stars.forEach(s => {
        if (s.constellationId === constellationId) {
          delete s.constellationId;
        }
      });
      this.state.currentChapter.routes.forEach(r => {
        if (r.requiredConstellations) {
          r.requiredConstellations = r.requiredConstellations.filter(id => id !== constellationId);
        }
      });
      this.state.isDirty = true;
      this.validateCurrentChapter();
    }
  }

  public addRoutePoint(point: Omit<RoutePoint, 'id'>): RoutePoint {
    if (!this.state.currentChapter) {
      throw new Error('No chapter loaded');
    }
    const newPoint: RoutePoint = {
      ...point,
      id: `point-${Date.now()}`,
    };
    this.state.currentChapter.routePoints.push(newPoint);
    this.state.isDirty = true;
    this.validateCurrentChapter();
    return newPoint;
  }

  public updateRoutePoint(pointId: string, data: Partial<RoutePoint>): void {
    if (!this.state.currentChapter) return;
    const point = this.state.currentChapter.routePoints.find(p => p.id === pointId);
    if (point) {
      Object.assign(point, data);
      this.state.isDirty = true;
      this.validateCurrentChapter();
    }
  }

  public deleteRoutePoint(pointId: string): void {
    if (!this.state.currentChapter) return;
    const index = this.state.currentChapter.routePoints.findIndex(p => p.id === pointId);
    if (index !== -1) {
      this.state.currentChapter.routePoints.splice(index, 1);
      this.state.currentChapter.routes.forEach(r => {
        r.points = r.points.filter(id => id !== pointId);
      });
      this.state.currentChapter.objectives.forEach(o => {
        if (o.targetId === pointId) {
          o.targetId = 'any';
        }
      });
      this.state.isDirty = true;
      this.validateCurrentChapter();
    }
  }

  public addRoute(route: Omit<Route, 'id'>): Route {
    if (!this.state.currentChapter) {
      throw new Error('No chapter loaded');
    }
    const newRoute: Route = {
      ...route,
      id: `route-${Date.now()}`,
    };
    this.state.currentChapter.routes.push(newRoute);
    this.state.isDirty = true;
    this.validateCurrentChapter();
    return newRoute;
  }

  public updateRoute(routeId: string, data: Partial<Route>): void {
    if (!this.state.currentChapter) return;
    const route = this.state.currentChapter.routes.find(r => r.id === routeId);
    if (route) {
      Object.assign(route, data);
      this.state.isDirty = true;
      this.validateCurrentChapter();
    }
  }

  public deleteRoute(routeId: string): void {
    if (!this.state.currentChapter) return;
    const index = this.state.currentChapter.routes.findIndex(r => r.id === routeId);
    if (index !== -1) {
      this.state.currentChapter.routes.splice(index, 1);
      this.state.isDirty = true;
      this.validateCurrentChapter();
    }
  }

  public addWeatherEvent(event: Omit<WeatherEventConfig, 'id'>): WeatherEventConfig {
    if (!this.state.currentChapter) {
      throw new Error('No chapter loaded');
    }
    const newEvent: WeatherEventConfig = {
      ...event,
      id: `weather-${Date.now()}`,
    };
    this.state.currentChapter.weatherEvents.push(newEvent);
    this.state.isDirty = true;
    this.validateCurrentChapter();
    return newEvent;
  }

  public updateWeatherEvent(eventId: string, data: Partial<WeatherEventConfig>): void {
    if (!this.state.currentChapter) return;
    const event = this.state.currentChapter.weatherEvents.find(e => e.id === eventId);
    if (event) {
      Object.assign(event, data);
      this.state.isDirty = true;
      this.validateCurrentChapter();
    }
  }

  public deleteWeatherEvent(eventId: string): void {
    if (!this.state.currentChapter) return;
    const index = this.state.currentChapter.weatherEvents.findIndex(e => e.id === eventId);
    if (index !== -1) {
      this.state.currentChapter.weatherEvents.splice(index, 1);
      this.state.isDirty = true;
      this.validateCurrentChapter();
    }
  }

  public addObjective(objective: Omit<Objective, 'id'>): Objective {
    if (!this.state.currentChapter) {
      throw new Error('No chapter loaded');
    }
    const newObjective: Objective = {
      ...objective,
      id: `obj-${Date.now()}`,
    };
    this.state.currentChapter.objectives.push(newObjective);
    this.state.isDirty = true;
    this.validateCurrentChapter();
    return newObjective;
  }

  public updateObjective(objectiveId: string, data: Partial<Objective>): void {
    if (!this.state.currentChapter) return;
    const objective = this.state.currentChapter.objectives.find(o => o.id === objectiveId);
    if (objective) {
      Object.assign(objective, data);
      this.state.isDirty = true;
      this.validateCurrentChapter();
    }
  }

  public deleteObjective(objectiveId: string): void {
    if (!this.state.currentChapter) return;
    const index = this.state.currentChapter.objectives.findIndex(o => o.id === objectiveId);
    if (index !== -1) {
      this.state.currentChapter.objectives.splice(index, 1);
      this.state.isDirty = true;
      this.validateCurrentChapter();
    }
  }

  public validateCurrentChapter(): ValidationError[] {
    const errors: ValidationError[] = [];
    const chapter = this.state.currentChapter;
    if (!chapter) return errors;

    if (!chapter.id || chapter.id.trim() === '') {
      errors.push({ field: 'id', message: '章节ID不能为空', severity: 'error' });
    }
    if (!chapter.name || chapter.name.trim() === '') {
      errors.push({ field: 'name', message: '章节名称不能为空', severity: 'error' });
    }
    if (chapter.number <= 0) {
      errors.push({ field: 'number', message: '章节编号必须大于0', severity: 'error' });
    }
    if (chapter.mapBounds.minX >= chapter.mapBounds.maxX) {
      errors.push({ field: 'mapBounds', message: '地图X轴范围无效', severity: 'error' });
    }
    if (chapter.mapBounds.minZ >= chapter.mapBounds.maxZ) {
      errors.push({ field: 'mapBounds', message: '地图Z轴范围无效', severity: 'error' });
    }

    const starIds = new Set<string>();
    chapter.stars.forEach((star, index) => {
      if (!star.id) {
        errors.push({ field: `stars[${index}].id`, message: `星辰${index + 1}ID不能为空`, severity: 'error' });
      } else if (starIds.has(star.id)) {
        errors.push({ field: `stars[${index}].id`, message: `星辰ID重复: ${star.id}`, severity: 'error' });
      } else {
        starIds.add(star.id);
      }
      if (!star.name || star.name.trim() === '') {
        errors.push({ field: `stars[${index}].name`, message: `星辰${index + 1}名称不能为空`, severity: 'error' });
      }
      if (star.size <= 0) {
        errors.push({ field: `stars[${index}].size`, message: `星辰${index + 1}大小必须大于0`, severity: 'warning' });
      }
      if (star.brightness < 0 || star.brightness > 1) {
        errors.push({ field: `stars[${index}].brightness`, message: `星辰${index + 1}亮度应在0-1之间`, severity: 'warning' });
      }
    });

    const constellationIds = new Set<string>();
    chapter.constellations.forEach((cons, index) => {
      if (!cons.id) {
        errors.push({ field: `constellations[${index}].id`, message: `星座${index + 1}ID不能为空`, severity: 'error' });
      } else if (constellationIds.has(cons.id)) {
        errors.push({ field: `constellations[${index}].id`, message: `星座ID重复: ${cons.id}`, severity: 'error' });
      } else {
        constellationIds.add(cons.id);
      }
      if (!cons.name || cons.name.trim() === '') {
        errors.push({ field: `constellations[${index}].name`, message: `星座${index + 1}名称不能为空`, severity: 'error' });
      }
      if (cons.stars.length < 2) {
        errors.push({ field: `constellations[${index}].stars`, message: `星座${cons.name}至少需要2颗星星`, severity: 'warning' });
      }
      cons.stars.forEach(starId => {
        if (!starIds.has(starId)) {
          errors.push({ field: `constellations[${index}].stars`, message: `星座${cons.name}引用不存在的星辰: ${starId}`, severity: 'error' });
        }
      });
    });

    const pointIds = new Set<string>();
    chapter.routePoints.forEach((point, index) => {
      if (!point.id) {
        errors.push({ field: `routePoints[${index}].id`, message: `航点${index + 1}ID不能为空`, severity: 'error' });
      } else if (pointIds.has(point.id)) {
        errors.push({ field: `routePoints[${index}].id`, message: `航点ID重复: ${point.id}`, severity: 'error' });
      } else {
        pointIds.add(point.id);
      }
      if (!point.name || point.name.trim() === '') {
        errors.push({ field: `routePoints[${index}].name`, message: `航点${index + 1}名称不能为空`, severity: 'error' });
      }
    });

    const hasStartPoint = chapter.routePoints.some(p => p.type === 'start');
    const hasEndPoint = chapter.routePoints.some(p => p.type === 'end');
    if (!hasStartPoint) {
      errors.push({ field: 'routePoints', message: '缺少起点航点', severity: 'warning' });
    }
    if (!hasEndPoint) {
      errors.push({ field: 'routePoints', message: '缺少终点航点', severity: 'warning' });
    }

    const routeIds = new Set<string>();
    chapter.routes.forEach((route, index) => {
      if (!route.id) {
        errors.push({ field: `routes[${index}].id`, message: `航线${index + 1}ID不能为空`, severity: 'error' });
      } else if (routeIds.has(route.id)) {
        errors.push({ field: `routes[${index}].id`, message: `航线ID重复: ${route.id}`, severity: 'error' });
      } else {
        routeIds.add(route.id);
      }
      if (!route.name || route.name.trim() === '') {
        errors.push({ field: `routes[${index}].name`, message: `航线${index + 1}名称不能为空`, severity: 'error' });
      }
      if (route.points.length < 2) {
        errors.push({ field: `routes[${index}].points`, message: `航线${route.name}至少需要2个航点`, severity: 'warning' });
      }
      route.points.forEach(pointId => {
        if (!pointIds.has(pointId)) {
          errors.push({ field: `routes[${index}].points`, message: `航线${route.name}引用不存在的航点: ${pointId}`, severity: 'error' });
        }
      });
    });

    const weatherIds = new Set<string>();
    chapter.weatherEvents.forEach((event, index) => {
      if (!event.id) {
        errors.push({ field: `weatherEvents[${index}].id`, message: `天气事件${index + 1}ID不能为空`, severity: 'error' });
      } else if (weatherIds.has(event.id)) {
        errors.push({ field: `weatherEvents[${index}].id`, message: `天气事件ID重复: ${event.id}`, severity: 'error' });
      } else {
        weatherIds.add(event.id);
      }
      if (!event.name || event.name.trim() === '') {
        errors.push({ field: `weatherEvents[${index}].name`, message: `天气事件${index + 1}名称不能为空`, severity: 'error' });
      }
      if (event.duration <= 0) {
        errors.push({ field: `weatherEvents[${index}].duration`, message: `天气事件${event.name}持续时间必须大于0`, severity: 'warning' });
      }
      if (event.intensity < 0 || event.intensity > 1) {
        errors.push({ field: `weatherEvents[${index}].intensity`, message: `天气事件${event.name}强度应在0-1之间`, severity: 'warning' });
      }
    });

    const objectiveIds = new Set<string>();
    chapter.objectives.forEach((obj, index) => {
      if (!obj.id) {
        errors.push({ field: `objectives[${index}].id`, message: `目标${index + 1}ID不能为空`, severity: 'error' });
      } else if (objectiveIds.has(obj.id)) {
        errors.push({ field: `objectives[${index}].id`, message: `目标ID重复: ${obj.id}`, severity: 'error' });
      } else {
        objectiveIds.add(obj.id);
      }
      if (!obj.description || obj.description.trim() === '') {
        errors.push({ field: `objectives[${index}].description`, message: `目标${index + 1}描述不能为空`, severity: 'error' });
      }
      if (obj.total <= 0) {
        errors.push({ field: `objectives[${index}].total`, message: `目标${obj.description}总数必须大于0`, severity: 'error' });
      }
      if (obj.targetId !== 'any') {
        if (obj.type === 'discover_star' && !starIds.has(obj.targetId)) {
          errors.push({ field: `objectives[${index}].targetId`, message: `目标引用不存在的星辰: ${obj.targetId}`, severity: 'error' });
        }
        if ((obj.type === 'visit' || obj.type === 'reach_destination') && !pointIds.has(obj.targetId)) {
          errors.push({ field: `objectives[${index}].targetId`, message: `目标引用不存在的航点: ${obj.targetId}`, severity: 'error' });
        }
        if (obj.type === 'connect_stars' && !constellationIds.has(obj.targetId)) {
          errors.push({ field: `objectives[${index}].targetId`, message: `目标引用不存在的星座: ${obj.targetId}`, severity: 'error' });
        }
      }
    });

    if (chapter.starsToDiscover !== undefined && chapter.starsToDiscover > 0) {
      const clickableStars = chapter.stars.filter(s => s.isClickable).length;
      if (chapter.starsToDiscover > clickableStars) {
        errors.push({ field: 'starsToDiscover', message: `需要发现的星辰数(${chapter.starsToDiscover})大于可点击星辰数(${clickableStars})`, severity: 'warning' });
      }
    }
    if (chapter.constellationsToDiscover !== undefined && chapter.constellationsToDiscover > 0) {
      if (chapter.constellationsToDiscover > chapter.constellations.length) {
        errors.push({ field: 'constellationsToDiscover', message: `需要发现的星座数(${chapter.constellationsToDiscover})大于实际星座数(${chapter.constellations.length})`, severity: 'warning' });
      }
    }

    this.state.validationErrors = errors;
    return errors;
  }

  public exportChapter(chapterId: string): string {
    const chapter = this.chapters.find(c => c.id === chapterId);
    if (!chapter) throw new Error('Chapter not found');
    return JSON.stringify(chapter, null, 2);
  }

  public exportAllChapters(): string {
    return JSON.stringify(this.chapters, null, 2);
  }

  public importChapter(jsonString: string): Chapter {
    try {
      const chapter = JSON.parse(jsonString) as Chapter;
      const requiredFields: (keyof Chapter)[] = ['id', 'number', 'name', 'description', 'intro', 'mapBounds', 'startingPosition'];
      for (const field of requiredFields) {
        if (!(field in chapter)) {
          throw new Error(`缺少必填字段: ${field}`);
        }
      }

      const existingIndex = this.chapters.findIndex(c => c.id === chapter.id);
      if (existingIndex !== -1) {
        this.chapters[existingIndex] = chapter;
      } else {
        this.chapters.push(chapter);
      }

      this.state.currentChapter = JSON.parse(JSON.stringify(chapter));
      this.state.isDirty = false;
      this.validateCurrentChapter();

      return chapter;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('JSON格式错误: ' + error.message);
      }
      throw error;
    }
  }

  public getDefaultStar(): Star {
    return {
      id: '',
      name: '新星辰',
      position: { x: 0, y: 50, z: 0 },
      size: 2,
      color: '#ffffff',
      brightness: 0.8,
      isClickable: true,
      discovered: false,
    };
  }

  public getDefaultConstellation(): Constellation {
    return {
      id: '',
      name: '新星座',
      stars: [],
      connections: [],
      description: '请输入星座描述',
      discovered: false,
    };
  }

  public getDefaultRoutePoint(): RoutePoint {
    return {
      id: '',
      name: '新航点',
      position: { x: 0, y: 0, z: 0 },
      type: 'waypoint',
      discovered: false,
      visited: false,
    };
  }

  public getDefaultRoute(): Route {
    return {
      id: '',
      name: '新航线',
      points: [],
      requiredStars: [],
      requiredConstellations: [],
    };
  }

  public getDefaultWeatherEvent(): WeatherEventConfig {
    return {
      id: '',
      name: '新天气事件',
      type: 'clear',
      startTime: 0,
      duration: 60,
      intensity: 0.5,
    };
  }

  public getDefaultObjective(): Objective {
    return {
      id: '',
      type: 'discover_star',
      targetId: 'any',
      description: '请输入目标描述',
      completed: false,
      progress: 0,
      total: 1,
    };
  }

  public getPreviewData(): {
    stars: Star[];
    constellations: Constellation[];
    routePoints: RoutePoint[];
    routes: Route[];
    mapBounds: Chapter['mapBounds'];
  } | null {
    if (!this.state.currentChapter) return null;
    return {
      stars: this.state.currentChapter.stars,
      constellations: this.state.currentChapter.constellations,
      routePoints: this.state.currentChapter.routePoints,
      routes: this.state.currentChapter.routes,
      mapBounds: this.state.currentChapter.mapBounds,
    };
  }

  public dispose(): void {
    this.state.currentChapter = null;
    this.state.isDirty = false;
    this.state.validationErrors = [];
    this.chapters = [];
  }
}
