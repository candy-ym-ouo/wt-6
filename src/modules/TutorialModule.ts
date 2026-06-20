import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { TutorialStep, TutorialState } from '../types';
import { tutorialSteps, getTutorialStep, getNextTutorialStep, getFirstTutorialStep } from '../data/tutorialSteps';

const DEFAULT_TUTORIAL_STATE: TutorialState = {
  active: false,
  currentStepId: null,
  completedStepIds: [],
  tutorialCompleted: false,
};

export class TutorialModule {
  private static instance: TutorialModule;
  private stateManager: GameStateManager;
  private isInitialized: boolean = false;
  private tutorialOverlay: HTMLElement | null = null;
  private highlightElement: HTMLElement | null = null;
  private tooltipElement: HTMLElement | null = null;
  private autoAdvanceTimer: number | null = null;
  private retryFindTargetTimer: number | null = null;

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
  }

  public static getInstance(): TutorialModule {
    if (!TutorialModule.instance) {
      TutorialModule.instance = new TutorialModule();
    }
    return TutorialModule.instance;
  }

  public initialize(): void {
    if (this.isInitialized) return;
    this.ensureTutorialState();
    this.setupEventListeners();
    this.isInitialized = true;
  }

  private ensureTutorialState(): void {
    const state = this.stateManager.getState();
    if (!state.tutorial) {
      this.stateManager.setState({
        tutorial: { ...DEFAULT_TUTORIAL_STATE },
      });
    }
  }

  private getTutorialState(): TutorialState {
    const state = this.stateManager.getState();
    if (!state.tutorial) {
      this.ensureTutorialState();
      return { ...DEFAULT_TUTORIAL_STATE };
    }
    return {
      ...state.tutorial,
      completedStepIds: [...state.tutorial.completedStepIds],
    };
  }

  private updateTutorialState(partialState: Partial<TutorialState>): void {
    const currentState = this.getTutorialState();
    this.stateManager.setState({
      tutorial: { ...currentState, ...partialState },
    });
  }

  private setupEventListeners(): void {
    eventBus.on('tutorial:start', () => this.startTutorial());
    eventBus.on('tutorial:next', () => this.nextStep());
    eventBus.on('tutorial:prev', () => this.prevStep());
    eventBus.on('tutorial:skip', () => this.skipTutorial());
    eventBus.on('tutorial:close', () => this.closeTutorial());
    eventBus.on('tutorial:reset', () => this.resetTutorial());

    eventBus.on('tutorial:starDiscovered', () => {
      this.advanceIfTrigger('tutorial:starDiscovered');
    });
    eventBus.on('tutorial:connectMode', () => {
      this.advanceIfTrigger('tutorial:connectMode');
    });
    eventBus.on('tutorial:constellationDiscovered', () => {
      this.advanceIfTrigger('tutorial:constellationDiscovered');
    });
    eventBus.on('tutorial:newGame', () => {
      this.advanceIfTrigger('tutorial:newGame');
    });
    eventBus.on('tutorial:taskPanelOpened', () => {
      this.advanceIfTrigger('tutorial:taskPanelOpened');
    });
    eventBus.on('tutorial:dynamicTaskPanelOpened', () => {
      this.advanceIfTrigger('tutorial:dynamicTaskPanelOpened');
    });
    eventBus.on('tutorial:routeStarted', () => {
      this.advanceIfTrigger('tutorial:routeStarted');
    });

    eventBus.on('star:discovered', () => {
      const state = this.getTutorialState();
      if (state.active && state.currentStepId === 'star_click_intro') {
        eventBus.emit('tutorial:starDiscovered');
      }
    });

    eventBus.on('connectMode:toggle', (enabled: boolean) => {
      const state = this.getTutorialState();
      if (state.active && state.currentStepId === 'connect_mode_intro' && enabled) {
        eventBus.emit('tutorial:connectMode');
      }
    });

    eventBus.on('constellation:discovered', () => {
      const state = this.getTutorialState();
      if (state.active && state.currentStepId === 'constellation_connect') {
        eventBus.emit('tutorial:constellationDiscovered');
      }
    });

    eventBus.on('task:panelToggled', (isOpen: boolean) => {
      const state = this.getTutorialState();
      if (state.active && state.currentStepId === 'task_panel_intro' && isOpen) {
        eventBus.emit('tutorial:taskPanelOpened');
      }
    });

    eventBus.on('task:dynamicPanelToggled', (isOpen: boolean) => {
      const state = this.getTutorialState();
      if (state.active && state.currentStepId === 'dynamic_task_intro' && isOpen) {
        eventBus.emit('tutorial:dynamicTaskPanelOpened');
      }
    });

    eventBus.on('route:started', () => {
      const state = this.getTutorialState();
      if (state.active && state.currentStepId === 'route_intro') {
        eventBus.emit('tutorial:routeStarted');
      }
    });

    eventBus.on('screen:changed', (screen: string) => {
      this.handleScreenChange(screen);
    });
  }

  private handleScreenChange(screen: string): void {
    const state = this.getTutorialState();
    
    if (screen === 'menu' && !state.tutorialCompleted && !state.active) {
      setTimeout(() => {
        this.startTutorial();
      }, 500);
      return;
    }

    if (!state.active) return;

    if (screen === 'game') {
      if (state.currentStepId === 'main_menu_new_game') {
        setTimeout(() => {
          this.goToStep('game_hud_intro');
        }, 1000);
      }
    }

    this.updateTooltipPosition();
  }

  private advanceIfTrigger(triggerEvent: string): void {
    const state = this.getTutorialState();
    if (!state.active || !state.currentStepId) return;

    const currentStep = getTutorialStep(state.currentStepId);
    if (currentStep?.triggerEvent === triggerEvent) {
      this.markStepCompleted(state.currentStepId);
      this.nextStep();
    }
  }

  public startTutorial(): void {
    if (this.getTutorialState().tutorialCompleted) {
      return;
    }

    this.updateTutorialState({
      active: true,
      currentStepId: getFirstTutorialStep().id,
    });

    this.createOverlay();
    this.showStep(getFirstTutorialStep());

    eventBus.emit('sound:play', 'tutorial_step');
    eventBus.emit('tutorial:started');
  }

  public startTutorialIfNeeded(): void {
    const state = this.getTutorialState();
    if (!state.tutorialCompleted && !state.active) {
      setTimeout(() => {
        this.startTutorial();
      }, 500);
    }
  }

  private createOverlay(): void {
    this.removeOverlay();

    const overlay = document.createElement('div');
    overlay.className = 'tutorial-overlay';
    overlay.id = 'tutorial-overlay';

    const highlight = document.createElement('div');
    highlight.className = 'tutorial-highlight';
    highlight.id = 'tutorial-highlight';
    overlay.appendChild(highlight);
    this.highlightElement = highlight;

    const tooltip = document.createElement('div');
    tooltip.className = 'tutorial-tooltip';
    tooltip.id = 'tutorial-tooltip';
    overlay.appendChild(tooltip);
    this.tooltipElement = tooltip;

    document.body.appendChild(overlay);
    this.tutorialOverlay = overlay;

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === highlight) {
        eventBus.emit('sound:play', 'button_click');
      }
    });
  }

  private removeOverlay(): void {
    this.clearAutoAdvanceTimer();
    this.clearRetryFindTargetTimer();

    if (this.tutorialOverlay) {
      this.tutorialOverlay.remove();
      this.tutorialOverlay = null;
    }
    this.highlightElement = null;
    this.tooltipElement = null;
  }

  private showStep(step: TutorialStep): void {
    this.clearAutoAdvanceTimer();
    this.clearRetryFindTargetTimer();

    this.updateTooltipContent(step);

    if (step.highlightType === 'element' && step.target) {
      this.highlightTarget(step.target);
    } else if (step.highlightType === 'area' && step.target) {
      this.highlightArea(step.target);
    } else {
      this.hideHighlight();
      this.positionTooltipCenter();
    }

    if (step.autoAdvance && step.advanceDelay) {
      this.autoAdvanceTimer = window.setTimeout(() => {
        this.nextStep();
      }, step.advanceDelay);
    }

    eventBus.emit('tutorial:stepChanged', step);
  }

  private updateTooltipContent(step: TutorialStep): void {
    if (!this.tooltipElement) return;

    const state = this.getTutorialState();
    const currentIndex = tutorialSteps.findIndex(s => s.id === step.id);
    const totalSteps = tutorialSteps.length;

    this.tooltipElement.innerHTML = `
      <div class="tutorial-tooltip-header">
        ${step.icon ? `<span class="tutorial-tooltip-icon">${step.icon}</span>` : ''}
        <h3 class="tutorial-tooltip-title">${step.title}</h3>
      </div>
      <div class="tutorial-tooltip-content">${step.description}</div>
      <div class="tutorial-tooltip-footer">
        <div class="tutorial-progress">
          <span class="tutorial-progress-text">${currentIndex + 1} / ${totalSteps}</span>
          <div class="tutorial-progress-bar">
            <div class="tutorial-progress-fill" style="width: ${((currentIndex + 1) / totalSteps) * 100}%"></div>
          </div>
        </div>
        <div class="tutorial-actions">
          ${currentIndex > 0 ? `
            <button class="tutorial-btn tutorial-btn-prev" data-action="prev">上一步</button>
          ` : ''}
          <button class="tutorial-btn tutorial-btn-next" data-action="next">
            ${currentIndex === totalSteps - 1 ? '完成' : '下一步'}
          </button>
          ${step.canSkip ? `
            <button class="tutorial-btn tutorial-btn-skip" data-action="skip">跳过</button>
          ` : ''}
        </div>
      </div>
    `;

    this.tooltipElement.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = (e.currentTarget as HTMLElement).dataset.action;
        eventBus.emit('sound:play', 'tutorial_click');
        if (action === 'next') {
          this.nextStep();
        } else if (action === 'prev') {
          this.prevStep();
        } else if (action === 'skip') {
          this.skipTutorial();
        }
      });
    });

    if (step.targetPosition) {
      this.tooltipElement.dataset.position = step.targetPosition;
    }
  }

  private highlightTarget(selector: string): void {
    const targetElement = document.querySelector(selector) as HTMLElement;

    if (!targetElement) {
      this.clearRetryFindTargetTimer();
      this.retryFindTargetTimer = window.setTimeout(() => {
        const state = this.getTutorialState();
        if (state.active && state.currentStepId) {
          const step = getTutorialStep(state.currentStepId);
          if (step?.target) {
            this.highlightTarget(step.target);
          }
        }
      }, 200);
      return;
    }

    if (!this.highlightElement || !this.tooltipElement) return;

    const rect = targetElement.getBoundingClientRect();
    const padding = 8;

    this.highlightElement.style.display = 'block';
    this.highlightElement.style.left = `${rect.left - padding}px`;
    this.highlightElement.style.top = `${rect.top - padding}px`;
    this.highlightElement.style.width = `${rect.width + padding * 2}px`;
    this.highlightElement.style.height = `${rect.height + padding * 2}px`;
    this.highlightElement.classList.add('pulse');

    this.positionTooltip(rect);
  }

  private highlightArea(selector: string): void {
    const targetElement = document.querySelector(selector) as HTMLElement;

    if (!targetElement) {
      this.clearRetryFindTargetTimer();
      this.retryFindTargetTimer = window.setTimeout(() => {
        const state = this.getTutorialState();
        if (state.active && state.currentStepId) {
          const step = getTutorialStep(state.currentStepId);
          if (step?.target) {
            this.highlightArea(step.target);
          }
        }
      }, 200);
      return;
    }

    if (!this.highlightElement || !this.tooltipElement) return;

    const rect = targetElement.getBoundingClientRect();

    this.highlightElement.style.display = 'block';
    this.highlightElement.style.left = `${rect.left}px`;
    this.highlightElement.style.top = `${rect.top}px`;
    this.highlightElement.style.width = `${rect.width}px`;
    this.highlightElement.style.height = `${rect.height}px`;
    this.highlightElement.classList.add('area-highlight');

    this.positionTooltip(rect);
  }

  private positionTooltip(targetRect: DOMRect): void {
    if (!this.tooltipElement) return;

    const tooltip = this.tooltipElement;
    const position = tooltip.dataset.position as string || 'bottom';

    tooltip.style.visibility = 'hidden';
    tooltip.style.left = '0';
    tooltip.style.top = '0';

    requestAnimationFrame(() => {
      if (!tooltip) return;

      const tooltipRect = tooltip.getBoundingClientRect();
      let left = 0;
      let top = 0;
      const offset = 16;

      switch (position) {
        case 'top':
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          top = targetRect.top - tooltipRect.height - offset;
          break;
        case 'bottom':
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          top = targetRect.bottom + offset;
          break;
        case 'left':
          left = targetRect.left - tooltipRect.width - offset;
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
          break;
        case 'right':
          left = targetRect.right + offset;
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
          break;
        case 'top-left':
          left = targetRect.left - tooltipRect.width;
          top = targetRect.top - tooltipRect.height - offset;
          break;
        case 'top-right':
          left = targetRect.right;
          top = targetRect.top - tooltipRect.height - offset;
          break;
        case 'bottom-left':
          left = targetRect.left - tooltipRect.width;
          top = targetRect.bottom + offset;
          break;
        case 'bottom-right':
          left = targetRect.right;
          top = targetRect.bottom + offset;
          break;
        default:
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          top = targetRect.bottom + offset;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 20;

      left = Math.max(margin, Math.min(left, viewportWidth - tooltipRect.width - margin));
      top = Math.max(margin, Math.min(top, viewportHeight - tooltipRect.height - margin));

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
      tooltip.style.visibility = 'visible';
    });
  }

  private positionTooltipCenter(): void {
    if (!this.tooltipElement) return;

    const tooltip = this.tooltipElement;
    tooltip.style.visibility = 'hidden';
    tooltip.style.left = '50%';
    tooltip.style.top = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    tooltip.style.visibility = 'visible';
  }

  private hideHighlight(): void {
    if (this.highlightElement) {
      this.highlightElement.style.display = 'none';
      this.highlightElement.classList.remove('pulse', 'area-highlight');
    }
  }

  private updateTooltipPosition(): void {
    const state = this.getTutorialState();
    if (!state.active || !state.currentStepId) return;

    const step = getTutorialStep(state.currentStepId);
    if (step) {
      this.showStep(step);
    }
  }

  private markStepCompleted(stepId: string): void {
    const state = this.getTutorialState();
    if (!state.completedStepIds.includes(stepId)) {
      this.updateTutorialState({
        completedStepIds: [...state.completedStepIds, stepId],
      });
    }
  }

  public nextStep(): void {
    const state = this.getTutorialState();
    if (!state.active || !state.currentStepId) return;

    this.markStepCompleted(state.currentStepId);
    eventBus.emit('sound:play', 'tutorial_click');

    const nextStep = getNextTutorialStep(state.currentStepId);

    if (nextStep) {
      this.updateTutorialState({
        currentStepId: nextStep.id,
      });
      this.showStep(nextStep);
    } else {
      this.completeTutorial();
    }
  }

  public prevStep(): void {
    const state = this.getTutorialState();
    if (!state.active || !state.currentStepId) return;

    const currentIndex = tutorialSteps.findIndex(s => s.id === state.currentStepId);
    if (currentIndex > 0) {
      eventBus.emit('sound:play', 'tutorial_click');
      const prevStep = tutorialSteps[currentIndex - 1];
      this.updateTutorialState({
        currentStepId: prevStep.id,
      });
      this.showStep(prevStep);
    }
  }

  public goToStep(stepId: string): void {
    const step = getTutorialStep(stepId);
    if (step) {
      this.updateTutorialState({
        currentStepId: stepId,
        active: true,
      });

      if (!this.tutorialOverlay) {
        this.createOverlay();
      }

      this.showStep(step);
    }
  }

  public skipTutorial(): void {
    if (confirm('确定要跳过新手引导吗？')) {
      this.completeTutorial();
    }
  }

  private completeTutorial(): void {
    this.updateTutorialState({
      active: false,
      currentStepId: null,
      tutorialCompleted: true,
    });

    this.removeOverlay();

    eventBus.emit('toast:show', {
      message: '🎉 新手引导完成！',
      duration: 3000,
    });
    eventBus.emit('sound:play', 'tutorial_complete');
    eventBus.emit('tutorial:completed');
  }

  public closeTutorial(): void {
    this.updateTutorialState({
      active: false,
    });

    this.removeOverlay();
    eventBus.emit('tutorial:closed');
  }

  public resetTutorial(): void {
    this.updateTutorialState({
      active: false,
      currentStepId: null,
      completedStepIds: [],
      tutorialCompleted: false,
    });

    this.removeOverlay();
    eventBus.emit('tutorial:reset');
  }

  public isTutorialCompleted(): boolean {
    return this.getTutorialState().tutorialCompleted;
  }

  public isTutorialActive(): boolean {
    return this.getTutorialState().active;
  }

  private clearAutoAdvanceTimer(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }
  }

  private clearRetryFindTargetTimer(): void {
    if (this.retryFindTargetTimer) {
      clearTimeout(this.retryFindTargetTimer);
      this.retryFindTargetTimer = null;
    }
  }

  public getSerializableState(): TutorialState {
    return this.getTutorialState();
  }

  public loadState(savedState: TutorialState): void {
    this.updateTutorialState(savedState);
  }

  public dispose(): void {
    this.removeOverlay();
  }
}
