import { ChapterEditorModule, EditorTab, ValidationError } from './ChapterEditorModule';
import { Chapter, Star, Constellation, Route, RoutePoint, WeatherEventConfig, Objective } from '../types';
import { eventBus } from '../utils/EventBus';

const TAB_INFO: { key: EditorTab; label: string; icon: string }[] = [
  { key: 'basic', label: '基本信息', icon: '📋' },
  { key: 'stars', label: '星图', icon: '⭐' },
  { key: 'constellations', label: '星座', icon: '✨' },
  { key: 'waypoints', label: '航点', icon: '📍' },
  { key: 'routes', label: '航线', icon: '🧭' },
  { key: 'weather', label: '天气', icon: '🌤️' },
  { key: 'objectives', label: '目标', icon: '🎯' },
];

export class ChapterEditorUIModule {
  private editor: ChapterEditorModule;
  private container: HTMLElement | null = null;
  private editingItemId: string | null = null;
  private previewCanvas: HTMLCanvasElement | null = null;
  private previewContext: CanvasRenderingContext2D | null = null;

  constructor() {
    this.editor = ChapterEditorModule.getInstance();
  }

  public show(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  public hide(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  private render(): void {
    if (!this.container) return;

    const state = this.editor.getState();
    const chapters = this.editor.getChapters();

    this.container.innerHTML = `
      <div class="chapter-editor">
        <div class="editor-sidebar">
          <div class="editor-header">
            <h2 class="editor-title">📝 章节编辑器</h2>
            <div class="editor-actions">
              <button class="editor-btn primary" id="btn-new-chapter">+ 新建章节</button>
              <button class="editor-btn" id="btn-import">📥 导入</button>
              <button class="editor-btn" id="btn-export-all">📤 导出全部</button>
            </div>
          </div>
          
          <div class="chapter-list">
            <h3 class="sidebar-title">章节列表</h3>
            <div class="chapter-list-items" id="chapter-list">
              ${chapters.map(ch => `
                <div class="chapter-list-item ${state.currentChapter?.id === ch.id ? 'active' : ''}" data-chapter-id="${ch.id}">
                  <div class="chapter-list-number">${ch.number}</div>
                  <div class="chapter-list-info">
                    <div class="chapter-list-name">${ch.name}</div>
                    <div class="chapter-list-desc">${ch.description}</div>
                  </div>
                  <div class="chapter-list-status">
                    ${ch.unlocked ? '🔓' : '🔒'}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <input type="file" id="import-file" accept=".json" style="display: none;">
        </div>

        <div class="editor-main">
          ${state.currentChapter ? this.renderEditorContent() : this.renderEmptyState()}
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderEmptyState(): string {
    return `
      <div class="editor-empty">
        <div class="editor-empty-icon">📝</div>
        <h3 class="editor-empty-title">选择或创建一个章节</h3>
        <p class="editor-empty-desc">从左侧列表选择一个章节进行编辑，或点击"新建章节"创建新章节</p>
      </div>
    `;
  }

  private renderEditorContent(): string {
    const state = this.editor.getState();
    const chapter = state.currentChapter!;
    const errors = state.validationErrors;
    const errorCount = errors.filter(e => e.severity === 'error').length;
    const warningCount = errors.filter(e => e.severity === 'warning').length;

    return `
      <div class="editor-content">
        <div class="editor-toolbar">
          <div class="editor-toolbar-left">
            <h2 class="editor-chapter-title">${chapter.name}</h2>
            ${state.isDirty ? '<span class="dirty-indicator">● 未保存</span>' : ''}
          </div>
          <div class="editor-toolbar-right">
            <div class="validation-summary">
              ${errorCount > 0 ? `<span class="validation-error">❌ ${errorCount} 错误</span>` : ''}
              ${warningCount > 0 ? `<span class="validation-warning">⚠️ ${warningCount} 警告</span>` : ''}
              ${errorCount === 0 && warningCount === 0 ? `<span class="validation-success">✓ 验证通过</span>` : ''}
            </div>
            <button class="editor-btn" id="btn-preview">👁️ ${state.previewMode ? '关闭预览' : '预览'}</button>
            <button class="editor-btn" id="btn-export">📤 导出</button>
            <button class="editor-btn danger" id="btn-delete">🗑️ 删除</button>
            <button class="editor-btn primary" id="btn-save" ${errorCount > 0 ? 'disabled' : ''}>💾 保存</button>
          </div>
        </div>

        <div class="editor-tabs">
          ${TAB_INFO.map(tab => `
            <button class="editor-tab ${state.activeTab === tab.key ? 'active' : ''}" data-tab="${tab.key}">
              <span class="tab-icon">${tab.icon}</span>
              <span class="tab-label">${tab.label}</span>
            </button>
          `).join('')}
        </div>

        <div class="editor-tab-content">
          ${state.previewMode ? this.renderPreview() : this.renderTabContent(state.activeTab)}
        </div>

        ${errors.length > 0 ? this.renderValidationErrors(errors) : ''}
      </div>
    `;
  }

  private renderTabContent(tab: EditorTab): string {
    switch (tab) {
      case 'basic': return this.renderBasicTab();
      case 'stars': return this.renderStarsTab();
      case 'constellations': return this.renderConstellationsTab();
      case 'waypoints': return this.renderWaypointsTab();
      case 'routes': return this.renderRoutesTab();
      case 'weather': return this.renderWeatherTab();
      case 'objectives': return this.renderObjectivesTab();
      default: return '';
    }
  }

  private renderBasicTab(): string {
    const chapter = this.editor.getState().currentChapter!;
    return `
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">章节ID</label>
          <input type="text" class="form-input" id="field-id" value="${chapter.id}" placeholder="chapter-x">
        </div>
        <div class="form-group">
          <label class="form-label">章节编号</label>
          <input type="number" class="form-input" id="field-number" value="${chapter.number}" min="1">
        </div>
        <div class="form-group full-width">
          <label class="form-label">章节名称</label>
          <input type="text" class="form-input" id="field-name" value="${chapter.name}" placeholder="输入章节名称">
        </div>
        <div class="form-group full-width">
          <label class="form-label">章节描述</label>
          <input type="text" class="form-input" id="field-description" value="${chapter.description}" placeholder="简短描述章节内容">
        </div>
        <div class="form-group full-width">
          <label class="form-label">章节介绍</label>
          <textarea class="form-textarea" id="field-intro" rows="4" placeholder="章节开始时显示的介绍文字">${chapter.intro}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">地图最小X</label>
          <input type="number" class="form-input" id="field-minX" value="${chapter.mapBounds.minX}">
        </div>
        <div class="form-group">
          <label class="form-label">地图最大X</label>
          <input type="number" class="form-input" id="field-maxX" value="${chapter.mapBounds.maxX}">
        </div>
        <div class="form-group">
          <label class="form-label">地图最小Z</label>
          <input type="number" class="form-input" id="field-minZ" value="${chapter.mapBounds.minZ}">
        </div>
        <div class="form-group">
          <label class="form-label">地图最大Z</label>
          <input type="number" class="form-input" id="field-maxZ" value="${chapter.mapBounds.maxZ}">
        </div>
        <div class="form-group">
          <label class="form-label">起始位置 X</label>
          <input type="number" class="form-input" id="field-startX" value="${chapter.startingPosition.x}" step="0.1">
        </div>
        <div class="form-group">
          <label class="form-label">起始位置 Y</label>
          <input type="number" class="form-input" id="field-startY" value="${chapter.startingPosition.y}" step="0.1">
        </div>
        <div class="form-group">
          <label class="form-label">起始位置 Z</label>
          <input type="number" class="form-input" id="field-startZ" value="${chapter.startingPosition.z}" step="0.1">
        </div>
        <div class="form-group">
          <label class="form-label">需要发现星辰数</label>
          <input type="number" class="form-input" id="field-starsToDiscover" value="${chapter.starsToDiscover || 0}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">需要发现星座数</label>
          <input type="number" class="form-input" id="field-constellationsToDiscover" value="${chapter.constellationsToDiscover || 0}" min="0">
        </div>
        <div class="form-group">
          <label class="form-label">解锁状态</label>
          <div class="toggle-btn ${chapter.unlocked ? 'active' : ''}" id="field-unlocked"></div>
        </div>
      </div>
    `;
  }

  private renderStarsTab(): string {
    const chapter = this.editor.getState().currentChapter!;
    return `
      <div class="list-header">
        <h3 class="list-title">星辰列表 (${chapter.stars.length})</h3>
        <button class="editor-btn primary" id="btn-add-star">+ 添加星辰</button>
      </div>
      <div class="item-grid">
        ${chapter.stars.length === 0 ? '<div class="empty-list">暂无星辰，点击上方按钮添加</div>' : ''}
        ${chapter.stars.map(star => `
          <div class="item-card star-card" data-item-id="${star.id}">
            <div class="item-card-header">
              <div class="item-icon" style="color: ${star.color}; font-size: 1.5rem;">★</div>
              <div class="item-info">
                <div class="item-name">${star.name}</div>
                <div class="item-subtitle">${star.id}</div>
              </div>
              <div class="item-actions">
                <button class="item-action-btn edit" data-action="edit" data-item-id="${star.id}">✏️</button>
                <button class="item-action-btn delete" data-action="delete" data-item-id="${star.id}">🗑️</button>
              </div>
            </div>
            <div class="item-details">
              <span class="detail-tag">位置: (${star.position.x.toFixed(1)}, ${star.position.y.toFixed(1)}, ${star.position.z.toFixed(1)})</span>
              <span class="detail-tag">大小: ${star.size}</span>
              <span class="detail-tag">亮度: ${star.brightness}</span>
              ${star.constellationId ? `<span class="detail-tag">星座: ${star.constellationId}</span>` : ''}
              <span class="detail-tag ${star.isClickable ? 'tag-success' : 'tag-warning'}">${star.isClickable ? '可点击' : '不可点击'}</span>
            </div>
          </div>
        `).join('')}
      </div>

      ${this.editingItemId ? this.renderStarEditor(this.editingItemId === 'new' ? this.editor.getDefaultStar() : (chapter.stars.find(s => s.id === this.editingItemId) || this.editor.getDefaultStar())) : ''}
    `;
  }

  private renderStarEditor(star: Star): string {
    const chapter = this.editor.getState().currentChapter!;
    const constellationOptions = chapter.constellations.map(c => 
      `<option value="${c.id}" ${star.constellationId === c.id ? 'selected' : ''}>${c.name}</option>`
    ).join('');

    return `
      <div class="edit-modal-overlay" id="edit-modal">
        <div class="edit-modal">
          <div class="edit-modal-header">
            <h3>${star.id ? '编辑星辰' : '添加星辰'}</h3>
            <button class="modal-close-btn" id="btn-close-modal">×</button>
          </div>
          <div class="edit-modal-content">
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label">星辰名称</label>
                <input type="text" class="form-input" id="edit-star-name" value="${star.name}" placeholder="输入星辰名称">
              </div>
              <div class="form-group">
                <label class="form-label">位置 X</label>
                <input type="number" class="form-input" id="edit-star-x" value="${star.position.x}" step="0.1">
              </div>
              <div class="form-group">
                <label class="form-label">位置 Y</label>
                <input type="number" class="form-input" id="edit-star-y" value="${star.position.y}" step="0.1">
              </div>
              <div class="form-group">
                <label class="form-label">位置 Z</label>
                <input type="number" class="form-input" id="edit-star-z" value="${star.position.z}" step="0.1">
              </div>
              <div class="form-group">
                <label class="form-label">大小</label>
                <input type="number" class="form-input" id="edit-star-size" value="${star.size}" step="0.1" min="0.1">
              </div>
              <div class="form-group">
                <label class="form-label">亮度</label>
                <input type="number" class="form-input" id="edit-star-brightness" value="${star.brightness}" step="0.1" min="0" max="1">
              </div>
              <div class="form-group">
                <label class="form-label">颜色</label>
                <input type="color" class="form-input color-input" id="edit-star-color" value="${star.color}">
              </div>
              <div class="form-group">
                <label class="form-label">所属星座</label>
                <select class="form-input" id="edit-star-constellation">
                  <option value="">无</option>
                  ${constellationOptions}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">可点击</label>
                <div class="toggle-btn ${star.isClickable ? 'active' : ''}" id="edit-star-clickable"></div>
              </div>
            </div>
          </div>
          <div class="edit-modal-footer">
            <button class="editor-btn" id="btn-cancel-edit">取消</button>
            <button class="editor-btn primary" id="btn-save-edit">保存</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderConstellationsTab(): string {
    const chapter = this.editor.getState().currentChapter!;
    return `
      <div class="list-header">
        <h3 class="list-title">星座列表 (${chapter.constellations.length})</h3>
        <button class="editor-btn primary" id="btn-add-constellation">+ 添加星座</button>
      </div>
      <div class="item-grid">
        ${chapter.constellations.length === 0 ? '<div class="empty-list">暂无星座，点击上方按钮添加</div>' : ''}
        ${chapter.constellations.map(cons => `
          <div class="item-card constellation-card" data-item-id="${cons.id}">
            <div class="item-card-header">
              <div class="item-icon">✨</div>
              <div class="item-info">
                <div class="item-name">${cons.name}</div>
                <div class="item-subtitle">${cons.stars.length} 颗星辰</div>
              </div>
              <div class="item-actions">
                <button class="item-action-btn edit" data-action="edit" data-item-id="${cons.id}">✏️</button>
                <button class="item-action-btn delete" data-action="delete" data-item-id="${cons.id}">🗑️</button>
              </div>
            </div>
            <div class="item-details">
              <span class="detail-tag">${cons.stars.length} 颗星辰</span>
              <span class="detail-tag">${cons.connections.length} 条连线</span>
            </div>
            <div class="item-desc">${cons.description}</div>
          </div>
        `).join('')}
      </div>

      ${this.editingItemId ? this.renderConstellationEditor(this.editingItemId === 'new' ? this.editor.getDefaultConstellation() : (chapter.constellations.find(c => c.id === this.editingItemId) || this.editor.getDefaultConstellation())) : ''}
    `;
  }

  private renderConstellationEditor(constellation: Constellation): string {
    const chapter = this.editor.getState().currentChapter!;
    const availableStars = chapter.stars;
    
    return `
      <div class="edit-modal-overlay" id="edit-modal">
        <div class="edit-modal large">
          <div class="edit-modal-header">
            <h3>${constellation.id ? '编辑星座' : '添加星座'}</h3>
            <button class="modal-close-btn" id="btn-close-modal">×</button>
          </div>
          <div class="edit-modal-content">
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label">星座名称</label>
                <input type="text" class="form-input" id="edit-cons-name" value="${constellation.name}" placeholder="输入星座名称">
              </div>
              <div class="form-group full-width">
                <label class="form-label">星座描述</label>
                <textarea class="form-textarea" id="edit-cons-desc" rows="3" placeholder="描述星座的故事和特点">${constellation.description}</textarea>
              </div>
              <div class="form-group full-width">
                <label class="form-label">包含的星辰 (${constellation.stars.length} 已选)</label>
                <div class="checkbox-grid">
                  ${availableStars.map(star => `
                    <label class="checkbox-item">
                      <input type="checkbox" value="${star.id}" ${constellation.stars.includes(star.id) ? 'checked' : ''} class="star-checkbox">
                      <span style="color: ${star.color}">★</span>
                      <span>${star.name}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
          <div class="edit-modal-footer">
            <button class="editor-btn" id="btn-cancel-edit">取消</button>
            <button class="editor-btn primary" id="btn-save-cons-edit">保存</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderWaypointsTab(): string {
    const chapter = this.editor.getState().currentChapter!;
    const typeLabels: Record<string, string> = {
      start: '起点',
      waypoint: '航点',
      landmark: '地标',
      end: '终点'
    };
    return `
      <div class="list-header">
        <h3 class="list-title">航点列表 (${chapter.routePoints.length})</h3>
        <button class="editor-btn primary" id="btn-add-waypoint">+ 添加航点</button>
      </div>
      <div class="item-grid">
        ${chapter.routePoints.length === 0 ? '<div class="empty-list">暂无航点，点击上方按钮添加</div>' : ''}
        ${chapter.routePoints.map(point => `
          <div class="item-card waypoint-card" data-item-id="${point.id}">
            <div class="item-card-header">
              <div class="item-icon">${point.type === 'start' ? '🚀' : point.type === 'end' ? '🏁' : point.type === 'landmark' ? '🏛️' : '📍'}</div>
              <div class="item-info">
                <div class="item-name">${point.name}</div>
                <div class="item-subtitle">${typeLabels[point.type]} · ${point.id}</div>
              </div>
              <div class="item-actions">
                <button class="item-action-btn edit" data-action="edit" data-item-id="${point.id}">✏️</button>
                <button class="item-action-btn delete" data-action="delete" data-item-id="${point.id}">🗑️</button>
              </div>
            </div>
            <div class="item-details">
              <span class="detail-tag">位置: (${point.position.x.toFixed(1)}, ${point.position.y.toFixed(1)}, ${point.position.z.toFixed(1)})</span>
              <span class="detail-tag tag-type-${point.type}">${typeLabels[point.type]}</span>
              ${point.discovered ? '<span class="detail-tag tag-success">已发现</span>' : ''}
              ${point.visited ? '<span class="detail-tag tag-info">已访问</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>

      ${this.editingItemId ? this.renderWaypointEditor(this.editingItemId === 'new' ? this.editor.getDefaultRoutePoint() : (chapter.routePoints.find(p => p.id === this.editingItemId) || this.editor.getDefaultRoutePoint())) : ''}
    `;
  }

  private renderWaypointEditor(point: RoutePoint): string {
    return `
      <div class="edit-modal-overlay" id="edit-modal">
        <div class="edit-modal">
          <div class="edit-modal-header">
            <h3>${point.id ? '编辑航点' : '添加航点'}</h3>
            <button class="modal-close-btn" id="btn-close-modal">×</button>
          </div>
          <div class="edit-modal-content">
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label">航点名称</label>
                <input type="text" class="form-input" id="edit-point-name" value="${point.name}" placeholder="输入航点名称">
              </div>
              <div class="form-group">
                <label class="form-label">位置 X</label>
                <input type="number" class="form-input" id="edit-point-x" value="${point.position.x}" step="0.1">
              </div>
              <div class="form-group">
                <label class="form-label">位置 Y</label>
                <input type="number" class="form-input" id="edit-point-y" value="${point.position.y}" step="0.1">
              </div>
              <div class="form-group">
                <label class="form-label">位置 Z</label>
                <input type="number" class="form-input" id="edit-point-z" value="${point.position.z}" step="0.1">
              </div>
              <div class="form-group">
                <label class="form-label">航点类型</label>
                <select class="form-input" id="edit-point-type">
                  <option value="start" ${point.type === 'start' ? 'selected' : ''}>起点</option>
                  <option value="waypoint" ${point.type === 'waypoint' ? 'selected' : ''}>航点</option>
                  <option value="landmark" ${point.type === 'landmark' ? 'selected' : ''}>地标</option>
                  <option value="end" ${point.type === 'end' ? 'selected' : ''}>终点</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">已发现</label>
                <div class="toggle-btn ${point.discovered ? 'active' : ''}" id="edit-point-discovered"></div>
              </div>
              <div class="form-group">
                <label class="form-label">已访问</label>
                <div class="toggle-btn ${point.visited ? 'active' : ''}" id="edit-point-visited"></div>
              </div>
            </div>
          </div>
          <div class="edit-modal-footer">
            <button class="editor-btn" id="btn-cancel-edit">取消</button>
            <button class="editor-btn primary" id="btn-save-point-edit">保存</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderRoutesTab(): string {
    const chapter = this.editor.getState().currentChapter!;
    return `
      <div class="list-header">
        <h3 class="list-title">航线列表 (${chapter.routes.length})</h3>
        <button class="editor-btn primary" id="btn-add-route">+ 添加航线</button>
      </div>
      <div class="item-grid">
        ${chapter.routes.length === 0 ? '<div class="empty-list">暂无航线，点击上方按钮添加</div>' : ''}
        ${chapter.routes.map(route => `
          <div class="item-card route-card" data-item-id="${route.id}">
            <div class="item-card-header">
              <div class="item-icon">🧭</div>
              <div class="item-info">
                <div class="item-name">${route.name}</div>
                <div class="item-subtitle">${route.points.length} 个航点</div>
              </div>
              <div class="item-actions">
                <button class="item-action-btn edit" data-action="edit" data-item-id="${route.id}">✏️</button>
                <button class="item-action-btn delete" data-action="delete" data-item-id="${route.id}">🗑️</button>
              </div>
            </div>
            <div class="item-details">
              <span class="detail-tag">${route.points.length} 个航点</span>
              ${route.requiredStars ? `<span class="detail-tag">需要星辰: ${route.requiredStars.length}</span>` : ''}
              ${route.requiredConstellations ? `<span class="detail-tag">需要星座: ${route.requiredConstellations.length}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      ${this.editingItemId ? this.renderRouteEditor(this.editingItemId === 'new' ? this.editor.getDefaultRoute() : (chapter.routes.find(r => r.id === this.editingItemId) || this.editor.getDefaultRoute())) : ''}
    `;
  }

  private renderRouteEditor(route: Route): string {
    const chapter = this.editor.getState().currentChapter!;
    const availablePoints = chapter.routePoints;
    const availableStars = chapter.stars;
    const availableCons = chapter.constellations;

    return `
      <div class="edit-modal-overlay" id="edit-modal">
        <div class="edit-modal large">
          <div class="edit-modal-header">
            <h3>${route.id ? '编辑航线' : '添加航线'}</h3>
            <button class="modal-close-btn" id="btn-close-modal">×</button>
          </div>
          <div class="edit-modal-content">
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label">航线名称</label>
                <input type="text" class="form-input" id="edit-route-name" value="${route.name}" placeholder="输入航线名称">
              </div>
              <div class="form-group full-width">
                <label class="form-label">包含的航点 (按顺序选择)</label>
                <div class="checkbox-grid">
                  ${availablePoints.map(point => `
                    <label class="checkbox-item">
                      <input type="checkbox" value="${point.id}" ${route.points.includes(point.id) ? 'checked' : ''} class="point-checkbox">
                      <span>${point.type === 'start' ? '🚀' : point.type === 'end' ? '🏁' : '📍'}</span>
                      <span>${point.name}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
              <div class="form-group full-width">
                <label class="form-label">解锁需要的星辰</label>
                <div class="checkbox-grid">
                  ${availableStars.map(star => `
                    <label class="checkbox-item">
                      <input type="checkbox" value="${star.id}" ${route.requiredStars?.includes(star.id) ? 'checked' : ''} class="req-star-checkbox">
                      <span style="color: ${star.color}">★</span>
                      <span>${star.name}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
              <div class="form-group full-width">
                <label class="form-label">解锁需要的星座</label>
                <div class="checkbox-grid">
                  ${availableCons.map(cons => `
                    <label class="checkbox-item">
                      <input type="checkbox" value="${cons.id}" ${route.requiredConstellations?.includes(cons.id) ? 'checked' : ''} class="req-cons-checkbox">
                      <span>✨</span>
                      <span>${cons.name}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
          <div class="edit-modal-footer">
            <button class="editor-btn" id="btn-cancel-edit">取消</button>
            <button class="editor-btn primary" id="btn-save-route-edit">保存</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderWeatherTab(): string {
    const chapter = this.editor.getState().currentChapter!;
    const typeLabels: Record<string, string> = {
      storm: '暴风雨',
      fog: '浓雾',
      meteor: '流星雨',
      clear: '晴朗'
    };
    const typeIcons: Record<string, string> = {
      storm: '🌧️',
      fog: '🌫️',
      meteor: '☄️',
      clear: '☀️'
    };
    return `
      <div class="list-header">
        <h3 class="list-title">天气事件列表 (${chapter.weatherEvents.length})</h3>
        <button class="editor-btn primary" id="btn-add-weather">+ 添加天气事件</button>
      </div>
      <div class="item-grid">
        ${chapter.weatherEvents.length === 0 ? '<div class="empty-list">暂无天气事件，点击上方按钮添加</div>' : ''}
        ${chapter.weatherEvents.map(event => `
          <div class="item-card weather-card" data-item-id="${event.id}">
            <div class="item-card-header">
              <div class="item-icon">${typeIcons[event.type]}</div>
              <div class="item-info">
                <div class="item-name">${event.name}</div>
                <div class="item-subtitle">${typeLabels[event.type]} · 开始: ${event.startTime}s · 持续: ${event.duration}s</div>
              </div>
              <div class="item-actions">
                <button class="item-action-btn edit" data-action="edit" data-item-id="${event.id}">✏️</button>
                <button class="item-action-btn delete" data-action="delete" data-item-id="${event.id}">🗑️</button>
              </div>
            </div>
            <div class="item-details">
              <span class="detail-tag">开始时间: ${event.startTime}s</span>
              <span class="detail-tag">持续时间: ${event.duration}s</span>
              <span class="detail-tag">强度: ${(event.intensity * 100).toFixed(0)}%</span>
              ${event.trigger ? `<span class="detail-tag tag-info">触发: ${event.trigger}</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      ${this.editingItemId ? this.renderWeatherEditor(this.editingItemId === 'new' ? this.editor.getDefaultWeatherEvent() : (chapter.weatherEvents.find(e => e.id === this.editingItemId) || this.editor.getDefaultWeatherEvent())) : ''}
    `;
  }

  private renderWeatherEditor(event: WeatherEventConfig): string {
    return `
      <div class="edit-modal-overlay" id="edit-modal">
        <div class="edit-modal">
          <div class="edit-modal-header">
            <h3>${event.id ? '编辑天气事件' : '添加天气事件'}</h3>
            <button class="modal-close-btn" id="btn-close-modal">×</button>
          </div>
          <div class="edit-modal-content">
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label">事件名称</label>
                <input type="text" class="form-input" id="edit-weather-name" value="${event.name}" placeholder="输入天气事件名称">
              </div>
              <div class="form-group">
                <label class="form-label">天气类型</label>
                <select class="form-input" id="edit-weather-type">
                  <option value="storm" ${event.type === 'storm' ? 'selected' : ''}>暴风雨</option>
                  <option value="fog" ${event.type === 'fog' ? 'selected' : ''}>浓雾</option>
                  <option value="meteor" ${event.type === 'meteor' ? 'selected' : ''}>流星雨</option>
                  <option value="clear" ${event.type === 'clear' ? 'selected' : ''}>晴朗</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">开始时间 (秒)</label>
                <input type="number" class="form-input" id="edit-weather-start" value="${event.startTime}" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">持续时间 (秒)</label>
                <input type="number" class="form-input" id="edit-weather-duration" value="${event.duration}" min="1">
              </div>
              <div class="form-group full-width">
                <label class="form-label">强度 (${(event.intensity * 100).toFixed(0)}%)</label>
                <input type="range" class="form-slider" id="edit-weather-intensity" value="${event.intensity * 100}" min="0" max="100">
              </div>
              <div class="form-group full-width">
                <label class="form-label">触发条件 (可选)</label>
                <input type="text" class="form-input" id="edit-weather-trigger" value="${event.trigger || ''}" placeholder="例如: minStarsDiscovered=5">
              </div>
            </div>
          </div>
          <div class="edit-modal-footer">
            <button class="editor-btn" id="btn-cancel-edit">取消</button>
            <button class="editor-btn primary" id="btn-save-weather-edit">保存</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderObjectivesTab(): string {
    const chapter = this.editor.getState().currentChapter!;
    const typeLabels: Record<string, string> = {
      visit: '访问航点',
      discover_star: '发现星辰',
      discover_constellation: '发现星座',
      connect_stars: '连接星座',
      survive_weather: '在天气中生存',
      reach_destination: '到达目的地'
    };
    const typeIcons: Record<string, string> = {
      visit: '📍',
      discover_star: '⭐',
      discover_constellation: '✨',
      connect_stars: '🔗',
      survive_weather: '🌤️',
      reach_destination: '🏁'
    };
    return `
      <div class="list-header">
        <h3 class="list-title">目标列表 (${chapter.objectives.length})</h3>
        <button class="editor-btn primary" id="btn-add-objective">+ 添加目标</button>
      </div>
      <div class="item-grid">
        ${chapter.objectives.length === 0 ? '<div class="empty-list">暂无目标，点击上方按钮添加</div>' : ''}
        ${chapter.objectives.map(obj => `
          <div class="item-card objective-card ${obj.completed ? 'completed' : ''}" data-item-id="${obj.id}">
            <div class="item-card-header">
              <div class="item-icon">${typeIcons[obj.type]}</div>
              <div class="item-info">
                <div class="item-name">${obj.description}</div>
                <div class="item-subtitle">${typeLabels[obj.type]} · ${obj.progress}/${obj.total}</div>
              </div>
              <div class="item-actions">
                <button class="item-action-btn edit" data-action="edit" data-item-id="${obj.id}">✏️</button>
                <button class="item-action-btn delete" data-action="delete" data-item-id="${obj.id}">🗑️</button>
              </div>
            </div>
            <div class="item-details">
              <span class="detail-tag">类型: ${typeLabels[obj.type]}</span>
              <span class="detail-tag">目标: ${obj.targetId}</span>
              <span class="detail-tag">进度: ${obj.progress}/${obj.total}</span>
              ${obj.completed ? '<span class="detail-tag tag-success">已完成</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>

      ${this.editingItemId ? this.renderObjectiveEditor((this.editingItemId === 'new' || this.editingItemId === 'new-reload') ? this.editor.getDefaultObjective() : (chapter.objectives.find(o => o.id === this.editingItemId) || this.editor.getDefaultObjective())) : ''}
    `;
  }

  private renderObjectiveEditor(objective: Objective): string {
    const chapter = this.editor.getState().currentChapter!;
    const stars = chapter.stars;
    const constellations = chapter.constellations;
    const points = chapter.routePoints;

    let targetOptions = '<option value="any">任意</option>';
    
    if (objective.type === 'discover_star') {
      targetOptions += stars.map(s => `<option value="${s.id}" ${objective.targetId === s.id ? 'selected' : ''}>${s.name}</option>`).join('');
    } else if (objective.type === 'discover_constellation' || objective.type === 'connect_stars') {
      targetOptions += constellations.map(c => `<option value="${c.id}" ${objective.targetId === c.id ? 'selected' : ''}>${c.name}</option>`).join('');
    } else if (objective.type === 'visit' || objective.type === 'reach_destination') {
      targetOptions += points.map(p => `<option value="${p.id}" ${objective.targetId === p.id ? 'selected' : ''}>${p.name}</option>`).join('');
    }

    return `
      <div class="edit-modal-overlay" id="edit-modal">
        <div class="edit-modal">
          <div class="edit-modal-header">
            <h3>${objective.id ? '编辑目标' : '添加目标'}</h3>
            <button class="modal-close-btn" id="btn-close-modal">×</button>
          </div>
          <div class="edit-modal-content">
            <div class="form-grid">
              <div class="form-group full-width">
                <label class="form-label">目标描述</label>
                <input type="text" class="form-input" id="edit-obj-desc" value="${objective.description}" placeholder="输入目标描述">
              </div>
              <div class="form-group">
                <label class="form-label">目标类型</label>
                <select class="form-input" id="edit-obj-type">
                  <option value="visit" ${objective.type === 'visit' ? 'selected' : ''}>访问航点</option>
                  <option value="discover_star" ${objective.type === 'discover_star' ? 'selected' : ''}>发现星辰</option>
                  <option value="discover_constellation" ${objective.type === 'discover_constellation' ? 'selected' : ''}>发现星座</option>
                  <option value="connect_stars" ${objective.type === 'connect_stars' ? 'selected' : ''}>连接星座</option>
                  <option value="survive_weather" ${objective.type === 'survive_weather' ? 'selected' : ''}>在天气中生存</option>
                  <option value="reach_destination" ${objective.type === 'reach_destination' ? 'selected' : ''}>到达目的地</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">目标ID</label>
                <select class="form-input" id="edit-obj-target">
                  ${targetOptions}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">需要完成次数</label>
                <input type="number" class="form-input" id="edit-obj-total" value="${objective.total}" min="1">
              </div>
              <div class="form-group">
                <label class="form-label">已完成次数</label>
                <input type="number" class="form-input" id="edit-obj-progress" value="${objective.progress}" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">已完成</label>
                <div class="toggle-btn ${objective.completed ? 'active' : ''}" id="edit-obj-completed"></div>
              </div>
            </div>
          </div>
          <div class="edit-modal-footer">
            <button class="editor-btn" id="btn-cancel-edit">取消</button>
            <button class="editor-btn primary" id="btn-save-obj-edit">保存</button>
          </div>
        </div>
      </div>
    `;
  }

  private renderPreview(): string {
    return `
      <div class="preview-container">
        <div class="preview-header">
          <h3>🗺️ 章节预览</h3>
          <p class="preview-hint">预览当前章节的星图、航点和航线布局</p>
        </div>
        <canvas class="preview-canvas" id="preview-canvas" width="800" height="600"></canvas>
        <div class="preview-legend">
          <div class="legend-item"><span class="legend-star">★</span> 星辰</div>
          <div class="legend-item"><span class="legend-constellation">✦</span> 星座连线</div>
          <div class="legend-item"><span class="legend-waypoint">●</span> 航点</div>
          <div class="legend-item"><span class="legend-route">─</span> 航线</div>
        </div>
      </div>
    `;
  }

  private renderValidationErrors(errors: ValidationError[]): string {
    return `
      <div class="validation-panel">
        <div class="validation-header">
          <h4>⚠️ 验证结果</h4>
        </div>
        <div class="validation-list">
          ${errors.map(error => `
            <div class="validation-item ${error.severity}">
              <span class="validation-icon">${error.severity === 'error' ? '❌' : '⚠️'}</span>
              <span class="validation-field">${error.field}</span>
              <span class="validation-message">${error.message}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    if (!this.container) return;

    this.container.querySelectorAll('[data-chapter-id]').forEach(item => {
      item.addEventListener('click', () => {
        const chapterId = (item as HTMLElement).dataset.chapterId!;
        this.editor.loadChapter(chapterId);
        this.editingItemId = null;
        this.render();
      });
    });

    const btnNewChapter = document.getElementById('btn-new-chapter');
    btnNewChapter?.addEventListener('click', () => {
      this.editor.createNewChapter();
      this.editingItemId = null;
      this.render();
    });

    const btnSave = document.getElementById('btn-save');
    btnSave?.addEventListener('click', () => {
      if (this.editor.saveCurrentChapter()) {
        eventBus.emit('toast:show', { message: '✅ 章节保存成功' });
        this.render();
      } else {
        eventBus.emit('toast:show', { message: '❌ 保存失败，请检查错误' });
      }
    });

    const btnDelete = document.getElementById('btn-delete');
    btnDelete?.addEventListener('click', () => {
      const chapter = this.editor.getState().currentChapter;
      if (chapter && confirm(`确定要删除章节 "${chapter.name}" 吗？`)) {
        this.editor.deleteChapter(chapter.id);
        eventBus.emit('toast:show', { message: '章节已删除' });
        this.render();
      }
    });

    const btnPreview = document.getElementById('btn-preview');
    btnPreview?.addEventListener('click', () => {
      const previewMode = this.editor.togglePreviewMode();
      if (previewMode) {
        setTimeout(() => this.initPreviewCanvas(), 50);
      }
      this.render();
    });

    const btnExport = document.getElementById('btn-export');
    btnExport?.addEventListener('click', () => {
      const chapter = this.editor.getState().currentChapter;
      if (chapter) {
        const json = this.editor.exportChapter(chapter.id);
        this.downloadFile(json, `${chapter.id}.json`);
      }
    });

    const btnExportAll = document.getElementById('btn-export-all');
    btnExportAll?.addEventListener('click', () => {
      const json = this.editor.exportAllChapters();
      this.downloadFile(json, 'chapters.json');
    });

    const btnImport = document.getElementById('btn-import');
    btnImport?.addEventListener('click', () => {
      document.getElementById('import-file')?.click();
    });

    const importFile = document.getElementById('import-file') as HTMLInputElement;
    importFile?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const content = ev.target?.result as string;
            const chapter = this.editor.importChapter(content);
            eventBus.emit('toast:show', { message: `✅ 成功导入章节: ${chapter.name}` });
            this.render();
          } catch (error) {
            eventBus.emit('toast:show', { message: `❌ 导入失败: ${error instanceof Error ? error.message : '未知错误'}` });
          }
        };
        reader.readAsText(file);
      }
      importFile.value = '';
    });

    this.container.querySelectorAll('.editor-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabKey = (tab as HTMLElement).dataset.tab as EditorTab;
        this.editor.setActiveTab(tabKey);
        this.editingItemId = null;
        this.render();
      });
    });

    this.bindBasicTabEvents();
    this.bindListTabEvents();

    const btnCloseModal = document.getElementById('btn-close-modal');
    btnCloseModal?.addEventListener('click', () => {
      this.editingItemId = null;
      this.render();
    });

    const btnCancelEdit = document.getElementById('btn-cancel-edit');
    btnCancelEdit?.addEventListener('click', () => {
      this.editingItemId = null;
      this.render();
    });

    const editModal = document.getElementById('edit-modal');
    editModal?.addEventListener('click', (e) => {
      if (e.target === editModal) {
        this.editingItemId = null;
        this.render();
      }
    });
  }

  private bindBasicTabEvents(): void {
    const state = this.editor.getState();
    if (state.activeTab !== 'basic' || state.previewMode) return;

    const fields = ['id', 'number', 'name', 'description', 'intro', 'minX', 'maxX', 'minZ', 'maxZ', 'startX', 'startY', 'startZ', 'starsToDiscover', 'constellationsToDiscover'];
    
    fields.forEach(field => {
      const el = document.getElementById(`field-${field}`) as HTMLInputElement;
      if (el) {
        el.addEventListener('change', () => {
          const value = el.type === 'number' ? Number(el.value) : el.value;
          const data: Partial<Chapter> = {};
          
          if (field === 'minX' || field === 'maxX' || field === 'minZ' || field === 'maxZ') {
            data.mapBounds = {
              ...state.currentChapter!.mapBounds,
              [field]: Number(value)
            };
          } else if (field === 'startX' || field === 'startY' || field === 'startZ') {
            const posKey = field.replace('start', '').toLowerCase() as 'x' | 'y' | 'z';
            data.startingPosition = {
              ...state.currentChapter!.startingPosition,
              [posKey]: Number(value)
            };
          } else {
            (data as any)[field] = value;
          }
          
          this.editor.updateBasicInfo(data);
          this.render();
        });
      }
    });

    const unlockedToggle = document.getElementById('field-unlocked');
    unlockedToggle?.addEventListener('click', () => {
      const isActive = unlockedToggle.classList.toggle('active');
      this.editor.updateBasicInfo({ unlocked: isActive });
      this.render();
    });

    this.bindEditFormEvents();
  }

  private bindListTabEvents(): void {
    const state = this.editor.getState();
    if (state.previewMode) return;

    const tab = state.activeTab;
    const addButtonId = `btn-add-${tab === 'waypoints' ? 'waypoint' : tab === 'weather' ? 'weather' : tab === 'objectives' ? 'objective' : tab.slice(0, -1)}`;
    const btnAdd = document.getElementById(addButtonId);

    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        if (tab === 'stars') {
          this.editingItemId = 'new';
          this.render();
        } else if (tab === 'constellations') {
          this.editingItemId = 'new';
          this.render();
        } else if (tab === 'waypoints') {
          this.editingItemId = 'new';
          this.render();
        } else if (tab === 'routes') {
          this.editingItemId = 'new';
          this.render();
        } else if (tab === 'weather') {
          this.editingItemId = 'new';
          this.render();
        } else if (tab === 'objectives') {
          this.editingItemId = 'new';
          this.render();
        }
      });
    }

    this.container?.querySelectorAll('.item-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (btn as HTMLElement).dataset.action;
        const itemId = (btn as HTMLElement).dataset.itemId!;

        if (action === 'edit') {
          this.editingItemId = itemId;
          this.render();
        } else if (action === 'delete') {
          if (confirm('确定要删除此项吗？')) {
            this.deleteItem(tab, itemId);
          }
        }
      });
    });

    this.bindEditFormEvents();
  }

  private bindEditFormEvents(): void {
    const state = this.editor.getState();
    const tab = state.activeTab;

    if (tab === 'stars' && this.editingItemId) {
      const btnSave = document.getElementById('btn-save-edit');
      btnSave?.addEventListener('click', () => this.saveStarEdit());

      const clickableToggle = document.getElementById('edit-star-clickable');
      clickableToggle?.addEventListener('click', () => {
        clickableToggle.classList.toggle('active');
      });
    }

    if (tab === 'constellations' && this.editingItemId) {
      const btnSave = document.getElementById('btn-save-cons-edit');
      btnSave?.addEventListener('click', () => this.saveConstellationEdit());
    }

    if (tab === 'waypoints' && this.editingItemId) {
      const btnSave = document.getElementById('btn-save-point-edit');
      btnSave?.addEventListener('click', () => this.saveWaypointEdit());

      ['discovered', 'visited'].forEach(field => {
        const toggle = document.getElementById(`edit-point-${field}`);
        toggle?.addEventListener('click', () => toggle.classList.toggle('active'));
      });
    }

    if (tab === 'routes' && this.editingItemId) {
      const btnSave = document.getElementById('btn-save-route-edit');
      btnSave?.addEventListener('click', () => this.saveRouteEdit());
    }

    if (tab === 'weather' && this.editingItemId) {
      const btnSave = document.getElementById('btn-save-weather-edit');
      btnSave?.addEventListener('click', () => this.saveWeatherEdit());

      const intensitySlider = document.getElementById('edit-weather-intensity') as HTMLInputElement;
      intensitySlider?.addEventListener('input', () => {
        const label = intensitySlider.parentElement?.querySelector('.form-label');
        if (label) {
          label.textContent = `强度 (${intensitySlider.value}%)`;
        }
      });
    }

    if (tab === 'objectives' && this.editingItemId) {
      const btnSave = document.getElementById('btn-save-obj-edit');
      btnSave?.addEventListener('click', () => this.saveObjectiveEdit());

      const completedToggle = document.getElementById('edit-obj-completed');
      completedToggle?.addEventListener('click', () => completedToggle.classList.toggle('active'));

      const typeSelect = document.getElementById('edit-obj-type') as HTMLSelectElement;
      typeSelect?.addEventListener('change', () => {
        const type = typeSelect.value as Objective['type'];
        let targetId = 'any';
        const chapter = this.editor.getState().currentChapter;
        if (chapter) {
          if (type === 'discover_star' && chapter.stars.length > 0) {
            targetId = chapter.stars[0].id;
          } else if ((type === 'discover_constellation' || type === 'connect_stars') && chapter.constellations.length > 0) {
            targetId = chapter.constellations[0].id;
          } else if ((type === 'visit' || type === 'reach_destination') && chapter.routePoints.length > 0) {
            targetId = chapter.routePoints[0].id;
          }
        }
        if (this.editingItemId === 'new' || this.editingItemId === 'new-reload') {
          this.editor.addObjective({
            ...this.editor.getDefaultObjective(),
            type,
            targetId,
          });
        } else if (this.editingItemId) {
          this.editor.updateObjective(this.editingItemId, { type, targetId });
        }
        this.render();
      });
    }
  }

  private deleteItem(tab: EditorTab, itemId: string): void {
    if (tab === 'stars') {
      this.editor.deleteStar(itemId);
    } else if (tab === 'constellations') {
      this.editor.deleteConstellation(itemId);
    } else if (tab === 'waypoints') {
      this.editor.deleteRoutePoint(itemId);
    } else if (tab === 'routes') {
      this.editor.deleteRoute(itemId);
    } else if (tab === 'weather') {
      this.editor.deleteWeatherEvent(itemId);
    } else if (tab === 'objectives') {
      this.editor.deleteObjective(itemId);
    }
    eventBus.emit('toast:show', { message: '已删除' });
    this.render();
  }

  private saveStarEdit(): void {
    const name = (document.getElementById('edit-star-name') as HTMLInputElement).value;
    const x = Number((document.getElementById('edit-star-x') as HTMLInputElement).value);
    const y = Number((document.getElementById('edit-star-y') as HTMLInputElement).value);
    const z = Number((document.getElementById('edit-star-z') as HTMLInputElement).value);
    const size = Number((document.getElementById('edit-star-size') as HTMLInputElement).value);
    const brightness = Number((document.getElementById('edit-star-brightness') as HTMLInputElement).value);
    const color = (document.getElementById('edit-star-color') as HTMLInputElement).value;
    const constellationId = (document.getElementById('edit-star-constellation') as HTMLSelectElement).value || undefined;
    const isClickable = document.getElementById('edit-star-clickable')?.classList.contains('active') ?? true;

    const starData = {
      name,
      position: { x, y, z },
      size,
      brightness,
      color,
      constellationId,
      isClickable,
      discovered: false,
    };

    if (this.editingItemId === 'new') {
      this.editor.addStar(starData);
    } else {
      this.editor.updateStar(this.editingItemId!, starData);
    }

    this.editingItemId = null;
    eventBus.emit('toast:show', { message: '✅ 星辰已保存' });
    this.render();
  }

  private saveConstellationEdit(): void {
    const name = (document.getElementById('edit-cons-name') as HTMLInputElement).value;
    const description = (document.getElementById('edit-cons-desc') as HTMLTextAreaElement).value;
    const starCheckboxes = document.querySelectorAll('.star-checkbox:checked') as NodeListOf<HTMLInputElement>;
    const stars = Array.from(starCheckboxes).map(cb => cb.value);
    
    const connections: [number, number][] = [];
    for (let i = 0; i < stars.length - 1; i++) {
      connections.push([i, i + 1]);
    }

    const consData = {
      name,
      description,
      stars,
      connections,
      discovered: false,
    };

    if (this.editingItemId === 'new') {
      this.editor.addConstellation(consData);
    } else {
      this.editor.updateConstellation(this.editingItemId!, consData);
    }

    this.editingItemId = null;
    eventBus.emit('toast:show', { message: '✅ 星座已保存' });
    this.render();
  }

  private saveWaypointEdit(): void {
    const name = (document.getElementById('edit-point-name') as HTMLInputElement).value;
    const x = Number((document.getElementById('edit-point-x') as HTMLInputElement).value);
    const y = Number((document.getElementById('edit-point-y') as HTMLInputElement).value);
    const z = Number((document.getElementById('edit-point-z') as HTMLInputElement).value);
    const type = (document.getElementById('edit-point-type') as HTMLSelectElement).value as RoutePoint['type'];
    const discovered = document.getElementById('edit-point-discovered')?.classList.contains('active') ?? false;
    const visited = document.getElementById('edit-point-visited')?.classList.contains('active') ?? false;

    const pointData = {
      name,
      position: { x, y, z },
      type,
      discovered,
      visited,
    };

    if (this.editingItemId === 'new') {
      this.editor.addRoutePoint(pointData);
    } else {
      this.editor.updateRoutePoint(this.editingItemId!, pointData);
    }

    this.editingItemId = null;
    eventBus.emit('toast:show', { message: '✅ 航点已保存' });
    this.render();
  }

  private saveRouteEdit(): void {
    const name = (document.getElementById('edit-route-name') as HTMLInputElement).value;
    const pointCheckboxes = document.querySelectorAll('.point-checkbox:checked') as NodeListOf<HTMLInputElement>;
    const points = Array.from(pointCheckboxes).map(cb => cb.value);
    
    const starCheckboxes = document.querySelectorAll('.req-star-checkbox:checked') as NodeListOf<HTMLInputElement>;
    const requiredStars = Array.from(starCheckboxes).map(cb => cb.value);
    
    const consCheckboxes = document.querySelectorAll('.req-cons-checkbox:checked') as NodeListOf<HTMLInputElement>;
    const requiredConstellations = Array.from(consCheckboxes).map(cb => cb.value);

    const routeData = {
      name,
      points,
      requiredStars: requiredStars.length > 0 ? requiredStars : undefined,
      requiredConstellations: requiredConstellations.length > 0 ? requiredConstellations : undefined,
    };

    if (this.editingItemId === 'new') {
      this.editor.addRoute(routeData);
    } else {
      this.editor.updateRoute(this.editingItemId!, routeData);
    }

    this.editingItemId = null;
    eventBus.emit('toast:show', { message: '✅ 航线已保存' });
    this.render();
  }

  private saveWeatherEdit(): void {
    const name = (document.getElementById('edit-weather-name') as HTMLInputElement).value;
    const type = (document.getElementById('edit-weather-type') as HTMLSelectElement).value as WeatherEventConfig['type'];
    const startTime = Number((document.getElementById('edit-weather-start') as HTMLInputElement).value);
    const duration = Number((document.getElementById('edit-weather-duration') as HTMLInputElement).value);
    const intensity = Number((document.getElementById('edit-weather-intensity') as HTMLInputElement).value) / 100;
    const trigger = (document.getElementById('edit-weather-trigger') as HTMLInputElement).value || undefined;

    const eventData = {
      name,
      type,
      startTime,
      duration,
      intensity,
      trigger,
    };

    if (this.editingItemId === 'new') {
      this.editor.addWeatherEvent(eventData);
    } else {
      this.editor.updateWeatherEvent(this.editingItemId!, eventData);
    }

    this.editingItemId = null;
    eventBus.emit('toast:show', { message: '✅ 天气事件已保存' });
    this.render();
  }

  private saveObjectiveEdit(): void {
    const description = (document.getElementById('edit-obj-desc') as HTMLInputElement).value;
    const type = (document.getElementById('edit-obj-type') as HTMLSelectElement).value as Objective['type'];
    const targetId = (document.getElementById('edit-obj-target') as HTMLSelectElement).value;
    const total = Number((document.getElementById('edit-obj-total') as HTMLInputElement).value);
    const progress = Number((document.getElementById('edit-obj-progress') as HTMLInputElement).value);
    const completed = document.getElementById('edit-obj-completed')?.classList.contains('active') ?? false;

    const objData = {
      type,
      targetId,
      description,
      completed,
      progress,
      total,
    };

    if (this.editingItemId === 'new' || this.editingItemId === 'new-reload') {
      this.editor.addObjective(objData);
    } else {
      this.editor.updateObjective(this.editingItemId!, objData);
    }

    this.editingItemId = null;
    eventBus.emit('toast:show', { message: '✅ 目标已保存' });
    this.render();
  }

  private initPreviewCanvas(): void {
    this.previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
    if (!this.previewCanvas) return;

    this.previewContext = this.previewCanvas.getContext('2d');
    if (!this.previewContext) return;

    this.drawPreview();
  }

  private drawPreview(): void {
    if (!this.previewContext || !this.previewCanvas) return;

    const previewData = this.editor.getPreviewData();
    if (!previewData) return;

    const ctx = this.previewContext;
    const width = this.previewCanvas.width;
    const height = this.previewCanvas.height;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 50;
    for (let x = 0; x <= width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const { mapBounds, stars, constellations, routePoints, routes } = previewData;
    const scaleX = width / (mapBounds.maxX - mapBounds.minX);
    const scaleZ = height / (mapBounds.maxZ - mapBounds.minZ);
    const scale = Math.min(scaleX, scaleZ) * 0.8;
    const offsetX = width / 2;
    const offsetY = height / 2;

    const toCanvasX = (x: number) => offsetX + x * scale;
    const toCanvasY = (z: number) => offsetY + z * scale;

    const starPositions: Record<string, { x: number; y: number }> = {};
    stars.forEach(star => {
      const cx = toCanvasX(star.position.x);
      const cy = toCanvasY(star.position.z);
      starPositions[star.id] = { x: cx, y: cy };

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, star.size * scale * 2);
      gradient.addColorStop(0, star.color);
      gradient.addColorStop(0.5, star.color + '80');
      gradient.addColorStop(1, 'transparent');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, star.size * scale * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = star.color;
      ctx.beginPath();
      ctx.arc(cx, cy, star.size * scale, 0, Math.PI * 2);
      ctx.fill();

      if (star.name) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.font = '10px sans-serif';
        ctx.fillText(star.name, cx + 8, cy - 8);
      }
    });

    constellations.forEach(constellation => {
      const consStars = constellation.stars.map(id => starPositions[id]).filter(Boolean);
      if (consStars.length < 2) return;

      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      consStars.forEach((pos, index) => {
        if (index === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      });
      ctx.stroke();

      const midX = consStars.reduce((sum, p) => sum + p.x, 0) / consStars.length;
      const midY = consStars.reduce((sum, p) => sum + p.y, 0) / consStars.length;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
      ctx.font = '11px sans-serif';
      ctx.fillText(constellation.name, midX, midY);
    });

    const pointPositions: Record<string, { x: number; y: number }> = {};
    routePoints.forEach(point => {
      const cx = toCanvasX(point.position.x);
      const cy = toCanvasY(point.position.z);
      pointPositions[point.id] = { x: cx, y: cy };

      let color = '#d4af37';
      if (point.type === 'start') color = '#2ecc71';
      else if (point.type === 'end') color = '#e74c3c';
      else if (point.type === 'landmark') color = '#9b59b6';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.font = '10px sans-serif';
      ctx.fillText(point.name, cx + 12, cy + 4);
    });

    routes.forEach(route => {
      const routePointsList = route.points.map(id => pointPositions[id]).filter(Boolean);
      if (routePointsList.length < 2) return;

      ctx.strokeStyle = 'rgba(52, 152, 219, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      routePointsList.forEach((pos, index) => {
        if (index === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);

      const midX = routePointsList.reduce((sum, p) => sum + p.x, 0) / routePointsList.length;
      const midY = routePointsList.reduce((sum, p) => sum + p.y, 0) / routePointsList.length;
      ctx.fillStyle = 'rgba(52, 152, 219, 0.7)';
      ctx.font = '10px sans-serif';
      ctx.fillText(route.name, midX, midY - 10);
    });
  }

  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}