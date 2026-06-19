import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { WeatherType, DynamicTask, TaskProgress } from '../types';
import { TaskModule } from './TaskModule';
import { ShipDamageModule } from './ShipDamageModule';

export interface DashboardState {
  heading: number;
  speed: number;
  supplies: number;
  maxSupplies: number;
  health: number;
  maxHealth: number;
  activeWeather: WeatherType | null;
  weatherWarning: string | null;
  activeTasks: Array<{ task: DynamicTask; progress: TaskProgress }>;
}

export class NavigationDashboardModule {
  private static instance: NavigationDashboardModule;
  private stateManager: GameStateManager;
  private taskModule: TaskModule;
  private damageModule: ShipDamageModule;
  private dashboardElement: HTMLElement | null = null;
  private isVisible: boolean = false;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 500;
  private uiLayer: HTMLElement | null = null;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.taskModule = TaskModule.getInstance();
    this.damageModule = ShipDamageModule.getInstance();
    this.uiLayer = document.getElementById('ui-layer');
  }

  public static getInstance(): NavigationDashboardModule {
    if (!NavigationDashboardModule.instance) {
      NavigationDashboardModule.instance = new NavigationDashboardModule();
    }
    return NavigationDashboardModule.instance;
  }

  public initialize(): void {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('ship:updated', this.onShipUpdated.bind(this));
    eventBus.on('weather:changed', this.onWeatherChanged.bind(this));
    eventBus.on('tasks:updated', this.onTasksUpdated.bind(this));
    eventBus.on('task:accepted', this.onTaskUpdated.bind(this));
    eventBus.on('task:completed', this.onTaskUpdated.bind(this));
    eventBus.on('task:expired', this.onTaskUpdated.bind(this));
    eventBus.on('ship:damage_applied', this.onDamageUpdated.bind(this));
    eventBus.on('ship:repaired', this.onDamageUpdated.bind(this));
  }

  public show(): void {
    if (this.isVisible) return;
    this.isVisible = true;
    this.renderDashboard();
  }

  public hide(): void {
    this.isVisible = false;
    if (this.dashboardElement) {
      this.dashboardElement.remove();
      this.dashboardElement = null;
    }
  }

  private renderDashboard(): void {
    if (!this.uiLayer || !this.isVisible) return;

    if (this.dashboardElement) {
      this.dashboardElement.remove();
    }

    const dashboard = document.createElement('div');
    dashboard.className = 'navigation-dashboard';
    dashboard.id = 'navigation-dashboard';

    dashboard.innerHTML = `
      <div class="dashboard-header">
        <span class="dashboard-icon">🧭</span>
        <span class="dashboard-title">导航仪表盘</span>
        <button class="dashboard-toggle" id="dashboard-minimize" title="最小化">−</button>
      </div>
      
      <div class="dashboard-content" id="dashboard-content">
        <div class="dashboard-section">
          <div class="section-title">航行状态</div>
          <div class="gauge-row">
            <div class="gauge-item">
              <div class="gauge-label">航向</div>
              <div class="gauge-value" id="gauge-heading">0°</div>
              <div class="compass-container">
                <div class="compass">
                  <div class="compass-needle" id="compass-needle"></div>
                  <div class="compass-n">N</div>
                  <div class="compass-e">E</div>
                  <div class="compass-s">S</div>
                  <div class="compass-w">W</div>
                </div>
              </div>
            </div>
            <div class="gauge-item">
              <div class="gauge-label">航速</div>
              <div class="gauge-value" id="gauge-speed">0 节</div>
              <div class="speed-bar">
                <div class="speed-bar-fill" id="speed-bar-fill"></div>
              </div>
              <div class="gauge-subtext" id="gauge-speed-status">停泊中</div>
            </div>
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-title">资源状态</div>
          <div class="resource-item">
            <div class="resource-header">
              <span class="resource-icon">📦</span>
              <span class="resource-name">物资补给</span>
              <span class="resource-value" id="resource-supplies">0/0</span>
            </div>
            <div class="resource-bar">
              <div class="resource-bar-fill supplies-fill" id="supplies-bar-fill"></div>
            </div>
          </div>
          <div class="resource-item">
            <div class="resource-header">
              <span class="resource-icon">❤️</span>
              <span class="resource-name">船体耐久</span>
              <span class="resource-value" id="resource-health">0/0</span>
            </div>
            <div class="resource-bar">
              <div class="resource-bar-fill health-fill" id="health-bar-fill"></div>
            </div>
            <div class="health-status" id="health-status">完好</div>
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-title">
            <span>天气预警</span>
            <span class="weather-status-badge" id="weather-badge">晴朗</span>
          </div>
          <div class="weather-panel" id="weather-panel">
            <div class="weather-icon-large" id="weather-icon">☀️</div>
            <div class="weather-info">
              <div class="weather-name" id="weather-name">晴朗</div>
              <div class="weather-desc" id="weather-desc">航行条件良好</div>
            </div>
            <div class="weather-effects" id="weather-effects">
              <div class="weather-effect-item">
                <span class="effect-label">能见度</span>
                <div class="effect-bar">
                  <div class="effect-bar-fill visibility-fill" id="effect-visibility" style="width: 100%"></div>
                </div>
              </div>
              <div class="weather-effect-item">
                <span class="effect-label">航速影响</span>
                <div class="effect-bar">
                  <div class="effect-bar-fill speed-effect-fill" id="effect-speed" style="width: 100%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="dashboard-section">
          <div class="section-title">
            <span>任务状态</span>
            <span class="task-count-badge" id="task-count">0</span>
          </div>
          <div class="task-mini-list" id="task-mini-list">
            <div class="task-empty">暂无进行中的任务</div>
          </div>
        </div>
      </div>
    `;

    this.uiLayer.appendChild(dashboard);
    this.dashboardElement = dashboard;

    const minimizeBtn = document.getElementById('dashboard-minimize');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        const content = document.getElementById('dashboard-content');
        if (content) {
          const isMinimized = content.style.display === 'none';
          content.style.display = isMinimized ? 'block' : 'none';
          minimizeBtn.textContent = isMinimized ? '−' : '+';
        }
        eventBus.emit('sound:play', 'button_click');
      });
    }

    this.refreshDashboard();
  }

  private getDashboardState(): DashboardState {
    const state = this.stateManager.getState();
    const activeTasks = this.taskModule.getActiveTasksWithInfo();

    let weatherWarning: string | null = null;
    if (state.activeWeather) {
      const intensity = state.activeWeather.intensity;
      if (intensity >= 0.7) {
        weatherWarning = '危险天气，注意安全！';
      } else if (intensity >= 0.4) {
        weatherWarning = '天气不佳，谨慎航行';
      }
    }

    return {
      heading: state.ship.heading,
      speed: state.ship.speed,
      supplies: state.ship.supplies,
      maxSupplies: state.ship.maxSupplies,
      health: state.ship.health,
      maxHealth: state.ship.maxHealth,
      activeWeather: state.activeWeather,
      weatherWarning,
      activeTasks,
    };
  }

  private refreshDashboard(): void {
    if (!this.isVisible || !this.dashboardElement) return;

    const state = this.getDashboardState();

    this.updateHeading(state.heading);
    this.updateSpeed(state.speed);
    this.updateSupplies(state.supplies, state.maxSupplies);
    this.updateHealth(state.health, state.maxHealth);
    this.updateWeather(state.activeWeather, state.weatherWarning);
    this.updateTasks(state.activeTasks);
  }

  private updateHeading(heading: number): void {
    const headingEl = document.getElementById('gauge-heading');
    const needleEl = document.getElementById('compass-needle');

    if (headingEl) {
      const degrees = Math.round(((heading * 180) / Math.PI + 360) % 360);
      headingEl.textContent = `${degrees}°`;
    }

    if (needleEl) {
      const degrees = ((heading * 180) / Math.PI + 360) % 360;
      needleEl.style.transform = `translateX(-50%) rotate(${degrees}deg)`;
    }
  }

  private updateSpeed(speed: number): void {
    const speedEl = document.getElementById('gauge-speed');
    const barFill = document.getElementById('speed-bar-fill');
    const statusEl = document.getElementById('gauge-speed-status');

    const state = this.stateManager.getState();
    const maxSpeed = state.ship.maxSpeed || 15;
    const speedPercent = Math.min((speed / maxSpeed) * 100, 100);

    if (speedEl) {
      speedEl.textContent = `${Math.round(speed)} 节`;
    }

    if (barFill) {
      barFill.style.width = `${speedPercent}%`;
    }

    if (statusEl) {
      if (speed < 0.5) {
        statusEl.textContent = '停泊中';
        statusEl.style.color = '#888';
      } else if (speed < maxSpeed * 0.3) {
        statusEl.textContent = '慢速航行';
        statusEl.style.color = '#a0a0d0';
      } else if (speed < maxSpeed * 0.7) {
        statusEl.textContent = '正常航行';
        statusEl.style.color = '#90ee90';
      } else {
        statusEl.textContent = '全速前进';
        statusEl.style.color = '#ffd700';
      }
    }
  }

  private updateSupplies(supplies: number, maxSupplies: number): void {
    const valueEl = document.getElementById('resource-supplies');
    const barFill = document.getElementById('supplies-bar-fill');

    const percent = Math.max(0, Math.min((supplies / maxSupplies) * 100, 100));

    if (valueEl) {
      valueEl.textContent = `${Math.round(supplies)}/${maxSupplies}`;
    }

    if (barFill) {
      barFill.style.width = `${percent}%`;
      if (percent <= 20) {
        barFill.classList.add('critical');
      } else if (percent <= 40) {
        barFill.classList.add('low');
        barFill.classList.remove('critical');
      } else {
        barFill.classList.remove('critical', 'low');
      }
    }
  }

  private updateHealth(health: number, maxHealth: number): void {
    const valueEl = document.getElementById('resource-health');
    const barFill = document.getElementById('health-bar-fill');
    const statusEl = document.getElementById('health-status');

    const percent = Math.max(0, Math.min((health / maxHealth) * 100, 100));
    const healthStatus = this.damageModule.getHealthStatus();

    if (valueEl) {
      valueEl.textContent = `${Math.round(health)}/${maxHealth}`;
    }

    if (barFill) {
      barFill.style.width = `${percent}%`;
    }

    if (statusEl) {
      statusEl.textContent = healthStatus.status;
      let color = '#2ecc71';
      if (healthStatus.ratio <= 0.2) color = '#e74c3c';
      else if (healthStatus.ratio <= 0.4) color = '#e67e22';
      else if (healthStatus.ratio <= 0.6) color = '#f39c12';
      else if (healthStatus.ratio <= 0.8) color = '#f1c40f';
      statusEl.style.color = color;
    }
  }

  private updateWeather(weather: WeatherType | null, warning: string | null): void {
    const badgeEl = document.getElementById('weather-badge');
    const iconEl = document.getElementById('weather-icon');
    const nameEl = document.getElementById('weather-name');
    const descEl = document.getElementById('weather-desc');
    const visibilityBar = document.getElementById('effect-visibility');
    const speedBar = document.getElementById('effect-speed');

    const weatherIcons: Record<string, string> = {
      storm: '⛈️',
      fog: '🌫️',
      meteor: '☄️',
      clear: '☀️',
    };

    const weatherDescs: Record<string, string> = {
      storm: '暴风雨来袭，注意防护',
      fog: '浓雾弥漫，能见度低',
      meteor: '流星雨，小心陨石',
      clear: '天气晴朗，适合航行',
    };

    if (weather) {
      const type = this.getWeatherTypeFromId(weather.id);
      if (badgeEl) {
        badgeEl.textContent = weather.name;
        badgeEl.className = 'weather-status-badge';
        if (weather.intensity >= 0.7) {
          badgeEl.classList.add('danger');
        } else if (weather.intensity >= 0.4) {
          badgeEl.classList.add('warning');
        }
      }

      if (iconEl) {
        iconEl.textContent = weatherIcons[type] || '🌤️';
      }

      if (nameEl) {
        nameEl.textContent = weather.name;
      }

      if (descEl) {
        descEl.textContent = warning || weatherDescs[type] || '正常天气';
      }

      if (visibilityBar) {
        visibilityBar.style.width = `${weather.effects.visibility * 100}%`;
      }

      if (speedBar) {
        speedBar.style.width = `${weather.effects.speedModifier * 100}%`;
      }
    } else {
      if (badgeEl) {
        badgeEl.textContent = '晴朗';
        badgeEl.className = 'weather-status-badge';
      }

      if (iconEl) {
        iconEl.textContent = '☀️';
      }

      if (nameEl) {
        nameEl.textContent = '晴朗';
      }

      if (descEl) {
        descEl.textContent = '航行条件良好';
      }

      if (visibilityBar) {
        visibilityBar.style.width = '100%';
      }

      if (speedBar) {
        speedBar.style.width = '100%';
      }
    }
  }

  private getWeatherTypeFromId(id: string): string {
    if (id.includes('storm')) return 'storm';
    if (id.includes('fog')) return 'fog';
    if (id.includes('meteor')) return 'meteor';
    return 'clear';
  }

  private updateTasks(tasks: Array<{ task: DynamicTask; progress: TaskProgress }>): void {
    const countEl = document.getElementById('task-count');
    const listEl = document.getElementById('task-mini-list');

    if (countEl) {
      countEl.textContent = tasks.length.toString();
    }

    if (listEl) {
      if (tasks.length === 0) {
        listEl.innerHTML = '<div class="task-empty">暂无进行中的任务</div>';
        return;
      }

      const sortedTasks = [...tasks].sort((a, b) => {
        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.task.priority] - priorityOrder[b.task.priority];
      }).slice(0, 3);

      listEl.innerHTML = sortedTasks.map(({ task, progress }) => {
        const pct = task.total > 0 ? Math.min(Math.round((progress.progress / task.total) * 100), 100) : 0;
        const priorityClass = `priority-${task.priority}`;
        const expiresIn = progress.expiresAt ? Math.max(0, Math.round((progress.expiresAt - Date.now()) / 1000)) : null;
        const expiryText = expiresIn !== null && expiresIn > 0 ? `⏱ ${expiresIn}s` : '';

        return `
          <div class="task-mini-item ${priorityClass}">
            <div class="task-mini-header">
              <span class="task-mini-name">${task.name}</span>
              <span class="task-mini-expiry">${expiryText}</span>
            </div>
            <div class="task-mini-progress">
              <div class="task-mini-progress-bar">
                <div class="task-mini-progress-fill" style="width: ${pct}%"></div>
              </div>
              <span class="task-mini-progress-text">${progress.progress}/${task.total}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  private onShipUpdated(): void {
    this.scheduleRefresh();
  }

  private onWeatherChanged(): void {
    this.scheduleRefresh();
  }

  private onTasksUpdated(): void {
    this.scheduleRefresh();
  }

  private onTaskUpdated(): void {
    this.scheduleRefresh();
  }

  private onDamageUpdated(): void {
    this.scheduleRefresh();
  }

  private scheduleRefresh(): void {
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }
    this.lastUpdateTime = now;
    requestAnimationFrame(() => this.refreshDashboard());
  }

  public setUpdateInterval(ms: number): void {
    this.updateInterval = Math.max(100, ms);
  }

  public dispose(): void {
    this.hide();
    eventBus.off('ship:updated', this.onShipUpdated.bind(this));
    eventBus.off('weather:changed', this.onWeatherChanged.bind(this));
    eventBus.off('tasks:updated', this.onTasksUpdated.bind(this));
    eventBus.off('task:accepted', this.onTaskUpdated.bind(this));
    eventBus.off('task:completed', this.onTaskUpdated.bind(this));
    eventBus.off('task:expired', this.onTaskUpdated.bind(this));
    eventBus.off('ship:damage_applied', this.onDamageUpdated.bind(this));
    eventBus.off('ship:repaired', this.onDamageUpdated.bind(this));
  }
}
