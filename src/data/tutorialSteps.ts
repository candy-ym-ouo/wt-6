import { TutorialStep } from '../types';

export const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: '欢迎来到观星航路',
    description: '在这片神秘的海域中，你将驾驶船只，通过观察星辰来指引航向。让我们一起开始这段奇妙的旅程吧！',
    highlightType: 'none',
    canSkip: true,
    icon: '⛵',
  },
  {
    id: 'main_menu_new_game',
    title: '开始新航程',
    description: '点击"开始新航程"按钮，开启你的冒险之旅。',
    target: '[data-action="newGame"]',
    targetPosition: 'right',
    highlightType: 'element',
    canSkip: false,
    triggerEvent: 'tutorial:newGame',
    icon: '🚀',
  },
  {
    id: 'game_hud_intro',
    title: '游戏界面介绍',
    description: '这里是游戏的主界面。顶部显示当前的航行状态，包括章节、航速、天气和时间等信息。',
    target: '.hud',
    targetPosition: 'bottom',
    highlightType: 'area',
    canSkip: true,
    autoAdvance: true,
    advanceDelay: 5000,
    icon: '📊',
  },
  {
    id: 'star_click_intro',
    title: '发现星辰',
    description: '夜空中闪烁着无数星辰。点击那些若隐若现的星星，发现它们并记录在你的星图中。',
    target: '#game-canvas',
    targetPosition: 'top',
    highlightType: 'area',
    canSkip: false,
    triggerEvent: 'tutorial:starDiscovered',
    icon: '⭐',
  },
  {
    id: 'connect_mode_intro',
    title: '连接模式',
    description: '点击右上角的"连接模式"按钮，然后依次点击两颗星星来连接它们，组成星座。',
    target: '#btn-connect-mode',
    targetPosition: 'left',
    highlightType: 'element',
    canSkip: false,
    triggerEvent: 'tutorial:connectMode',
    icon: '🔗',
  },
  {
    id: 'constellation_connect',
    title: '连接星座',
    description: '现在进入了连接模式。请点击两颗相邻的星星来连接它们，看看会形成什么星座！',
    target: '#game-canvas',
    targetPosition: 'top',
    highlightType: 'area',
    canSkip: false,
    triggerEvent: 'tutorial:constellationDiscovered',
    icon: '✨',
  },
  {
    id: 'task_panel_intro',
    title: '任务面板',
    description: '屏幕下方的任务面板显示当前章节的目标。点击任务面板可以展开查看详细的任务列表。',
    target: '#task-panel',
    targetPosition: 'top',
    highlightType: 'element',
    canSkip: false,
    triggerEvent: 'tutorial:taskPanelOpened',
    icon: '�',
  },
  {
    id: 'dynamic_task_intro',
    title: '动态任务',
    description: '右侧的动态任务面板会显示探索过程中触发的临时任务，完成它们可以获得额外奖励。点击面板可以展开查看。',
    target: '#dynamic-task-panel',
    targetPosition: 'left',
    highlightType: 'element',
    canSkip: false,
    triggerEvent: 'tutorial:dynamicTaskPanelOpened',
    icon: '🎯',
  },
  {
    id: 'route_intro',
    title: '启动航线',
    description: '准备好了吗？点击左上角的"起航"按钮，让你的船只沿着航线开始航行吧！',
    target: '#btn-start-route',
    targetPosition: 'bottom',
    highlightType: 'element',
    canSkip: false,
    triggerEvent: 'tutorial:routeStarted',
    icon: '⛵',
  },
  {
    id: 'tutorial_complete',
    title: '引导完成！',
    description: '恭喜你完成了新手引导！现在你已经掌握了基本操作，尽情探索这片神秘的星海吧！',
    highlightType: 'none',
    canSkip: true,
    icon: '🎉',
  },
];

export const getTutorialStep = (stepId: string): TutorialStep | undefined => {
  return tutorialSteps.find(s => s.id === stepId);
};

export const getNextTutorialStep = (currentStepId: string): TutorialStep | undefined => {
  const currentIndex = tutorialSteps.findIndex(s => s.id === currentStepId);
  if (currentIndex >= 0 && currentIndex < tutorialSteps.length - 1) {
    return tutorialSteps[currentIndex + 1];
  }
  return undefined;
};

export const getFirstTutorialStep = (): TutorialStep => {
  return tutorialSteps[0];
};
