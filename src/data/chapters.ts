import { Chapter } from '../types';

export const chapters: Chapter[] = [
  {
    id: 'chapter-1',
    number: 1,
    name: '星之初航',
    description: '学习基础的观星技巧，识别你的第一个星座',
    intro: '欢迎登上"晨曦号"。作为一名新晋的观星航海士，你的第一次航行将从这里开始。今晚的夜空格外晴朗，正是学习观星的好时机。',
    mapBounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 },
    startingPosition: { x: 0, y: 0, z: 50 },
    unlocked: true,
    starsToDiscover: 5,
    constellationsToDiscover: 1,
    stars: [
      { id: 'star-1-1', name: '北辰', position: { x: 0, y: 60, z: -50 }, size: 2.5, color: '#ffffff', brightness: 1, constellationId: 'cons-1', isClickable: true },
      { id: 'star-1-2', name: '玄枢', position: { x: -15, y: 55, z: -45 }, size: 2, color: '#ffddaa', brightness: 0.9, constellationId: 'cons-1', isClickable: true },
      { id: 'star-1-3', name: '天玑', position: { x: -25, y: 50, z: -40 }, size: 1.8, color: '#aaddff', brightness: 0.8, constellationId: 'cons-1', isClickable: true },
      { id: 'star-1-4', name: '天权', position: { x: -20, y: 45, z: -30 }, size: 1.5, color: '#ffffff', brightness: 0.7, constellationId: 'cons-1', isClickable: true },
      { id: 'star-1-5', name: '玉衡', position: { x: -10, y: 48, z: -25 }, size: 2.2, color: '#ffeecc', brightness: 0.85, constellationId: 'cons-1', isClickable: true },
      { id: 'star-1-6', name: '开阳', position: { x: 5, y: 52, z: -35 }, size: 1.9, color: '#ffffff', brightness: 0.75, constellationId: 'cons-1', isClickable: true },
      { id: 'star-1-7', name: '摇光', position: { x: 15, y: 58, z: -45 }, size: 2.1, color: '#ffddaa', brightness: 0.9, constellationId: 'cons-1', isClickable: true },
      { id: 'star-1-8', name: '客星一', position: { x: 40, y: 55, z: -60 }, size: 1.2, color: '#cccccc', brightness: 0.5, isClickable: true },
      { id: 'star-1-9', name: '客星二', position: { x: -50, y: 45, z: -20 }, size: 1, color: '#cccccc', brightness: 0.4, isClickable: true },
      { id: 'star-1-10', name: '客星三', position: { x: 30, y: 40, z: -10 }, size: 0.9, color: '#cccccc', brightness: 0.35, isClickable: true },
    ],
    constellations: [
      {
        id: 'cons-1',
        name: '北斗七星',
        stars: ['star-1-1', 'star-1-2', 'star-1-3', 'star-1-4', 'star-1-5', 'star-1-6', 'star-1-7'],
        connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
        description: '北斗七星是北方天空中最明亮的星座之一，由七颗亮星组成，形似斗勺，是古代航海的重要导航标志。'
      }
    ],
    routes: [
      {
        id: 'route-1',
        name: '启蒙航线',
        points: ['point-start', 'point-1', 'point-2', 'point-end'],
        requiredStars: ['star-1-1', 'star-1-2'],
        requiredConstellations: ['cons-1']
      }
    ],
    routePoints: [
      { id: 'point-start', name: '起航港', position: { x: 0, y: 0, z: 50 }, type: 'start' },
      { id: 'point-1', name: '观星台', position: { x: -30, y: 0, z: 0 }, type: 'waypoint' },
      { id: 'point-2', name: '北斗湾', position: { x: 0, y: 0, z: -30 }, type: 'landmark' },
      { id: 'point-end', name: '归航港', position: { x: 30, y: 0, z: 20 }, type: 'end' }
    ],
    weatherEvents: [
      { id: 'weather-1-1', type: 'meteor', name: '流星雨', startTime: 30, duration: 15, intensity: 0.5 },
      { id: 'weather-1-2', type: 'clear', name: '晴朗', startTime: 0, duration: 30, intensity: 0 }
    ],
    objectives: [
      { id: 'obj-1-1', type: 'discover_star', targetId: 'star-1-1', description: '发现北辰', completed: false, progress: 0, total: 1 },
      { id: 'obj-1-2', type: 'discover_star', targetId: 'any', description: '发现3颗星辰', completed: false, progress: 0, total: 3 },
      { id: 'obj-1-3', type: 'connect_stars', targetId: 'cons-1', description: '连接北斗七星', completed: false, progress: 0, total: 1 },
      { id: 'obj-1-4', type: 'visit', targetId: 'point-1', description: '到达观星台', completed: false, progress: 0, total: 1 },
      { id: 'obj-1-5', type: 'reach_destination', targetId: 'point-end', description: '抵达归航港', completed: false, progress: 0, total: 1 }
    ]
  },
  {
    id: 'chapter-2',
    number: 2,
    name: '雾海迷途',
    description: '在浓雾中寻找正确的航向，识别隐藏的星座',
    intro: '北方的海域终年笼罩在神秘的雾气之中。传说只有能够看穿迷雾、识别隐藏星座的航海士，才能找到通往传说中"星之岛"的航路。',
    mapBounds: { minX: -120, maxX: 120, minZ: -120, maxZ: 120 },
    startingPosition: { x: 0, y: 0, z: 60 },
    unlocked: false,
    starsToDiscover: 8,
    constellationsToDiscover: 2,
    stars: [
      { id: 'star-2-1', name: '织女星', position: { x: 20, y: 70, z: -60 }, size: 3, color: '#ffffff', brightness: 1, constellationId: 'cons-2-1', isClickable: true },
      { id: 'star-2-2', name: '牵牛星', position: { x: -20, y: 65, z: -55 }, size: 2.5, color: '#ffddaa', brightness: 0.95, constellationId: 'cons-2-1', isClickable: true },
      { id: 'star-2-3', name: '天津四', position: { x: 0, y: 75, z: -70 }, size: 2.8, color: '#ffffff', brightness: 0.9, constellationId: 'cons-2-1', isClickable: true },
      { id: 'star-2-4', name: '河鼓一', position: { x: -15, y: 60, z: -50 }, size: 1.5, color: '#aaddff', brightness: 0.7, constellationId: 'cons-2-1', isClickable: true },
      { id: 'star-2-5', name: '河鼓二', position: { x: -25, y: 58, z: -48 }, size: 1.8, color: '#ffeecc', brightness: 0.75, constellationId: 'cons-2-1', isClickable: true },
      { id: 'star-2-6', name: '牛郎星', position: { x: -30, y: 62, z: -52 }, size: 2, color: '#ffddaa', brightness: 0.85, constellationId: 'cons-2-1', isClickable: true },
      { id: 'star-2-7', name: '猎户α', position: { x: 50, y: 55, z: -40 }, size: 2.8, color: '#ff8844', brightness: 0.95, constellationId: 'cons-2-2', isClickable: true },
      { id: 'star-2-8', name: '猎户β', position: { x: 45, y: 50, z: -35 }, size: 2.2, color: '#ffffff', brightness: 0.85, constellationId: 'cons-2-2', isClickable: true },
      { id: 'star-2-9', name: '猎户γ', position: { x: 55, y: 48, z: -45 }, size: 2, color: '#ffffff', brightness: 0.8, constellationId: 'cons-2-2', isClickable: true },
      { id: 'star-2-10', name: '猎户δ', position: { x: 52, y: 45, z: -38 }, size: 1.5, color: '#aaddff', brightness: 0.7, constellationId: 'cons-2-2', isClickable: true },
      { id: 'star-2-11', name: '猎户ε', position: { x: 48, y: 42, z: -42 }, size: 1.6, color: '#ffffff', brightness: 0.72, constellationId: 'cons-2-2', isClickable: true },
      { id: 'star-2-12', name: '猎户ζ', position: { x: 58, y: 40, z: -40 }, size: 1.4, color: '#ffeecc', brightness: 0.68, constellationId: 'cons-2-2', isClickable: true },
      { id: 'star-2-13', name: '雾星一', position: { x: -60, y: 35, z: 0 }, size: 1, color: '#888888', brightness: 0.3, isClickable: true },
      { id: 'star-2-14', name: '雾星二', position: { x: 60, y: 40, z: 20 }, size: 0.9, color: '#888888', brightness: 0.25, isClickable: true },
    ],
    constellations: [
      {
        id: 'cons-2-1',
        name: '天琴座',
        stars: ['star-2-1', 'star-2-2', 'star-2-3', 'star-2-4', 'star-2-5', 'star-2-6'],
        connections: [[0, 2], [2, 1], [1, 3], [3, 4], [4, 5]],
        description: '天琴座是夏季夜空中最美丽的星座之一，织女星是其中最明亮的恒星。传说中，织女星与牵牛星隔银河相望。'
      },
      {
        id: 'cons-2-2',
        name: '猎户座',
        stars: ['star-2-7', 'star-2-8', 'star-2-9', 'star-2-10', 'star-2-11', 'star-2-12'],
        connections: [[0, 1], [1, 2], [0, 2], [1, 3], [3, 4], [2, 5], [4, 5]],
        description: '猎户座是冬季夜空中最壮观的星座，形如一位威武的猎人。猎户α星（参宿四）是一颗红超巨星，呈现出独特的橙红色。'
      }
    ],
    routes: [
      {
        id: 'route-2',
        name: '雾海航线',
        points: ['point-2-start', 'point-2-1', 'point-2-2', 'point-2-3', 'point-2-end'],
        requiredStars: ['star-2-1', 'star-2-7'],
        requiredConstellations: ['cons-2-1', 'cons-2-2']
      }
    ],
    routePoints: [
      { id: 'point-2-start', name: '雾港', position: { x: 0, y: 0, z: 60 }, type: 'start' },
      { id: 'point-2-1', name: '第一浮标', position: { x: -40, y: 0, z: 30 }, type: 'waypoint' },
      { id: 'point-2-2', name: '天琴礁石', position: { x: -30, y: 0, z: -20 }, type: 'landmark' },
      { id: 'point-2-3', name: '猎户湾', position: { x: 40, y: 0, z: -30 }, type: 'landmark' },
      { id: 'point-2-end', name: '星之岛', position: { x: 0, y: 0, z: -60 }, type: 'end' }
    ],
    weatherEvents: [
      { id: 'weather-2-1', type: 'fog', name: '浓雾', startTime: 0, duration: 45, intensity: 0.7 },
      { id: 'weather-2-2', type: 'clear', name: '云开雾散', startTime: 45, duration: 30, intensity: 0 },
      { id: 'weather-2-3', type: 'storm', name: '暴风雨', startTime: 75, duration: 20, intensity: 0.6 }
    ],
    objectives: [
      { id: 'obj-2-1', type: 'discover_star', targetId: 'any', description: '发现5颗星辰', completed: false, progress: 0, total: 5 },
      { id: 'obj-2-2', type: 'connect_stars', targetId: 'cons-2-1', description: '连接天琴座', completed: false, progress: 0, total: 1 },
      { id: 'obj-2-3', type: 'connect_stars', targetId: 'cons-2-2', description: '连接猎户座', completed: false, progress: 0, total: 1 },
      { id: 'obj-2-4', type: 'survive_weather', targetId: 'any', description: '在暴风雨中生存', completed: false, progress: 0, total: 1 },
      { id: 'obj-2-5', type: 'visit', targetId: 'point-2-2', description: '到达天琴礁石', completed: false, progress: 0, total: 1 },
      { id: 'obj-2-6', type: 'reach_destination', targetId: 'point-2-end', description: '抵达星之岛', completed: false, progress: 0, total: 1 }
    ]
  },
  {
    id: 'chapter-3',
    number: 3,
    name: '风暴之海',
    description: '穿越危险的风暴海域，寻找传说中的南十字星',
    intro: '南方的海域以其狂暴的风暴而闻名。传说在风暴的尽头，有一颗能够指引所有航海士回家的星星——南十字星。你的任务是找到它。',
    mapBounds: { minX: -150, maxX: 150, minZ: -150, maxZ: 150 },
    startingPosition: { x: 0, y: 0, z: 80 },
    unlocked: false,
    starsToDiscover: 10,
    constellationsToDiscover: 3,
    stars: [
      { id: 'star-3-1', name: '南十字α', position: { x: 0, y: 40, z: -80 }, size: 2.5, color: '#ffffff', brightness: 1, constellationId: 'cons-3-1', isClickable: true },
      { id: 'star-3-2', name: '南十字β', position: { x: -8, y: 35, z: -75 }, size: 2, color: '#ffdddd', brightness: 0.9, constellationId: 'cons-3-1', isClickable: true },
      { id: 'star-3-3', name: '南十字γ', position: { x: 8, y: 35, z: -75 }, size: 2.2, color: '#ddddff', brightness: 0.85, constellationId: 'cons-3-1', isClickable: true },
      { id: 'star-3-4', name: '南十字δ', position: { x: 0, y: 28, z: -70 }, size: 1.8, color: '#ffffff', brightness: 0.8, constellationId: 'cons-3-1', isClickable: true },
      { id: 'star-3-5', name: '南十字ε', position: { x: 0, y: 50, z: -85 }, size: 1.5, color: '#ffeecc', brightness: 0.7, constellationId: 'cons-3-1', isClickable: true },
      { id: 'star-3-6', name: '天狼星', position: { x: 60, y: 60, z: -50 }, size: 3.5, color: '#aaddff', brightness: 1, constellationId: 'cons-3-2', isClickable: true },
      { id: 'star-3-7', name: '老人星', position: { x: 55, y: 55, z: -55 }, size: 2.8, color: '#ffddaa', brightness: 0.95, constellationId: 'cons-3-2', isClickable: true },
      { id: 'star-3-8', name: '水委一', position: { x: 50, y: 50, z: -60 }, size: 2.4, color: '#ffffff', brightness: 0.9, constellationId: 'cons-3-2', isClickable: true },
      { id: 'star-3-9', name: '毕宿五', position: { x: -50, y: 55, z: -55 }, size: 2.6, color: '#ff8844', brightness: 0.9, constellationId: 'cons-3-3', isClickable: true },
      { id: 'star-3-10', name: '五车二', position: { x: -55, y: 50, z: -45 }, size: 2.2, color: '#ffffcc', brightness: 0.85, constellationId: 'cons-3-3', isClickable: true },
      { id: 'star-3-11', name: '大角星', position: { x: -45, y: 48, z: -50 }, size: 2, color: '#ffeecc', brightness: 0.8, constellationId: 'cons-3-3', isClickable: true },
      { id: 'star-3-12', name: '角宿一', position: { x: -52, y: 45, z: -58 }, size: 1.9, color: '#aaddff', brightness: 0.78, constellationId: 'cons-3-3', isClickable: true },
      { id: 'star-3-13', name: '心宿二', position: { x: 30, y: 40, z: -30 }, size: 1.7, color: '#ff6644', brightness: 0.75, isClickable: true },
      { id: 'star-3-14', name: '北落师门', position: { x: -30, y: 35, z: -40 }, size: 1.6, color: '#ffffff', brightness: 0.7, isClickable: true },
      { id: 'star-3-15', name: '北辰二', position: { x: 0, y: 80, z: 0 }, size: 1.4, color: '#cccccc', brightness: 0.6, isClickable: true },
    ],
    constellations: [
      {
        id: 'cons-3-1',
        name: '南十字座',
        stars: ['star-3-1', 'star-3-2', 'star-3-3', 'star-3-4', 'star-3-5'],
        connections: [[4, 0], [0, 1], [0, 2], [0, 3], [1, 3], [3, 2]],
        description: '南十字座是南半球最著名的星座，由五颗亮星组成一个十字形。自古以来，它就是航海家在南半球航行时最重要的导航标志。'
      },
      {
        id: 'cons-3-2',
        name: '大犬座',
        stars: ['star-3-6', 'star-3-7', 'star-3-8'],
        connections: [[0, 1], [1, 2]],
        description: '大犬座是冬季夜空中最亮的星座之一，其中的天狼星是夜空中最明亮的恒星。传说中大犬座是猎人奥利翁的忠实伙伴。'
      },
      {
        id: 'cons-3-3',
        name: '御夫座',
        stars: ['star-3-9', 'star-3-10', 'star-3-11', 'star-3-12'],
        connections: [[0, 1], [1, 2], [2, 3], [3, 0]],
        description: '御夫座是一个五边形的星座，在北半球的冬季夜空中非常显眼。传说中御夫是雅典王的儿子，掌管着天界的马车。'
      }
    ],
    routes: [
      {
        id: 'route-3',
        name: '风暴航线',
        points: ['point-3-start', 'point-3-1', 'point-3-2', 'point-3-3', 'point-3-4', 'point-3-end'],
        requiredStars: ['star-3-1', 'star-3-6'],
        requiredConstellations: ['cons-3-1', 'cons-3-2', 'cons-3-3']
      }
    ],
    routePoints: [
      { id: 'point-3-start', name: '风暴港', position: { x: 0, y: 0, z: 80 }, type: 'start' },
      { id: 'point-3-1', name: '前哨站', position: { x: -50, y: 0, z: 50 }, type: 'waypoint' },
      { id: 'point-3-2', name: '避风湾', position: { x: -60, y: 0, z: 0 }, type: 'landmark' },
      { id: 'point-3-3', name: '十字礁', position: { x: 0, y: 0, z: -50 }, type: 'landmark' },
      { id: 'point-3-4', name: '天狼角', position: { x: 50, y: 0, z: -20 }, type: 'landmark' },
      { id: 'point-3-end', name: '归航港', position: { x: 30, y: 0, z: 40 }, type: 'end' }
    ],
    weatherEvents: [
      { id: 'weather-3-1', type: 'storm', name: '大风暴', startTime: 20, duration: 40, intensity: 0.8 },
      { id: 'weather-3-2', type: 'meteor', name: '流星雨', startTime: 65, duration: 20, intensity: 0.7 },
      { id: 'weather-3-3', type: 'fog', name: '海雾', startTime: 90, duration: 25, intensity: 0.5 },
      { id: 'weather-3-4', type: 'storm', name: '强风暴', startTime: 120, duration: 30, intensity: 0.9 }
    ],
    objectives: [
      { id: 'obj-3-1', type: 'discover_star', targetId: 'any', description: '发现8颗星辰', completed: false, progress: 0, total: 8 },
      { id: 'obj-3-2', type: 'connect_stars', targetId: 'cons-3-1', description: '连接南十字座', completed: false, progress: 0, total: 1 },
      { id: 'obj-3-3', type: 'connect_stars', targetId: 'cons-3-2', description: '连接大犬座', completed: false, progress: 0, total: 1 },
      { id: 'obj-3-4', type: 'connect_stars', targetId: 'cons-3-3', description: '连接御夫座', completed: false, progress: 0, total: 1 },
      { id: 'obj-3-5', type: 'survive_weather', targetId: 'any', description: '在2次风暴中生存', completed: false, progress: 0, total: 2 },
      { id: 'obj-3-6', type: 'visit', targetId: 'point-3-3', description: '到达十字礁', completed: false, progress: 0, total: 1 },
      { id: 'obj-3-7', type: 'reach_destination', targetId: 'point-3-end', description: '平安归航', completed: false, progress: 0, total: 1 }
    ]
  }
];
