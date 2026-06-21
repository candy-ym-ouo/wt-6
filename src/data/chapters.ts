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
      { id: 'star-1-h1', name: '隐星·紫宸', position: { x: -35, y: 70, z: -70 }, size: 1.5, color: '#9966ff', brightness: 0.6, isClickable: true, hidden: true },
      { id: 'star-1-h2', name: '隐星·玄渊', position: { x: 55, y: 30, z: -30 }, size: 1.3, color: '#66ffcc', brightness: 0.55, isClickable: true, hidden: true },
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
      { id: 'point-start', name: '起航港', position: { x: 0, y: 0, z: 50 }, type: 'start',
        landmark: {
          title: '🌅 起航港',
          description: '晨曦号的母港，一切冒险从这里开始。码头上弥漫着海风和松木的气息，船员们正在忙碌地准备启航。',
          icon: '⚓',
          ambientSound: 'ocean',
          narrative: '"欢迎登上晨曦号。今晚的夜空格外晴朗，正是学习观星的好时机。"',
          objectiveHint: '先熟悉航行操作，然后前往观星台'
        }
      },
      { id: 'point-1', name: '观星台', position: { x: -30, y: 0, z: 0 }, type: 'waypoint', explorationRewards: [
        { type: 'gold', amount: 50, rarity: 'common' },
        { type: 'supplies', amount: 20, rarity: 'common' },
      ], landmark: {
          title: '🔭 观星台',
          description: '一座古老的观星台矗立在海边的悬崖之上。据说这里曾是古代航海士观星辨位的圣地，台壁上刻满了星座的图案。',
          icon: '🔭',
          ambientSound: 'wind',
          ambientSoundDuration: 8000,
          narrative: '"你来了。仔细看北方的天空——七颗明亮的星星组成了一个斗勺的形状，那就是北斗七星。"',
          objectiveHint: '发现北辰、玄枢等星辰，尝试连接北斗七星'
        }
      },
      { id: 'point-2', name: '北斗湾', position: { x: 0, y: 0, z: -30 }, type: 'landmark', explorationRewards: [
        { type: 'gold', amount: 100, rarity: 'uncommon' },
        { type: 'exp', amount: 30, rarity: 'uncommon' },
      ], landmark: {
          title: '🌊 北斗湾',
          description: '海湾的形状恰好与北斗七星的排列遥相呼应。每当晴朗的夜晚，北斗七星的倒影会清晰地映在平静的海面上，如梦似幻。',
          icon: '🌊',
          musicTrack: 'exploration',
          musicDuration: 12000,
          ambientSound: 'ocean',
          narrative: '"这就是北斗湾。传说中，航海士在这里领悟了观星航海的奥秘。"',
          objectiveHint: '海面倒映着北斗七星，是连接星座的绝佳地点'
        }
      },
      { id: 'point-end', name: '归航港', position: { x: 30, y: 0, z: 20 }, type: 'end', explorationRewards: [
        { type: 'gold', amount: 200, rarity: 'rare' },
        { type: 'supplies', amount: 50, rarity: 'uncommon' },
        { type: 'exp', amount: 50, rarity: 'rare' },
      ], landmark: {
          title: '🏠 归航港',
          description: '一个温暖的港口小镇，灯火阑珊。完成第一次航行后回到这里，意味着你已经迈出了成为航海士的第一步。',
          icon: '🏠',
          musicTrack: 'game',
          musicDuration: 10000,
          narrative: '"做得好！你已经掌握了基础的观星技巧。前方的星辰大海，等待着你去探索。"',
          objectiveHint: '本章航行已完成，可以前往下一章节'
        }
      }
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
    ],
    endings: [
      {
        id: 'chapter-1-ending-true',
        type: 'true',
        title: '星辰的指引者',
        subtitle: '真结局',
        description: '你不仅掌握了观星的基础，更发现了隐藏的星辰奥秘。北斗七星的光芒，将永远指引你的航程。',
        narrative: '当你发现紫宸与玄渊两颗隐星的那一刻，你仿佛听到了来自远古的低语。北斗七星不再只是七颗星——它是一把钥匙，一把开启星辰大海奥秘的钥匙。你已经不再是一名普通的航海士，而是被星辰选中的指引者。',
        icon: '👑',
        color: '#ffd700',
        order: 1,
        conditions: [
          { type: 'objectives_completed', value: 100, operator: 'gte' },
          { type: 'hidden_stars_discovered', value: 2, operator: 'gte' },
          { type: 'min_score', value: 95 }
        ],
        rewards: { gold: 300, exp: 100, supplies: 50 }
      },
      {
        id: 'chapter-1-ending-secret',
        type: 'secret',
        title: '隐星探索者',
        subtitle: '隐藏结局',
        description: '你发现了隐藏在夜空中的秘密星辰，展现了非凡的观察力。',
        narrative: '大多数航海士只关注明亮的星辰，但你不同——你在北斗的光辉之外，捕捉到了紫宸与玄渊的微弱光芒。这些隐藏的星辰，或许暗示着更深远的秘密。',
        icon: '🔮',
        color: '#9966ff',
        order: 2,
        conditions: [
          { type: 'hidden_stars_discovered', value: 1, operator: 'gte' },
          { type: 'min_score', value: 70 }
        ],
        conditionOperator: 'and',
        rewards: { gold: 200, exp: 60, supplies: 30 }
      },
      {
        id: 'chapter-1-ending-excellent',
        type: 'excellent',
        title: '初露锋芒的观星者',
        subtitle: '优秀结局',
        description: '你完美地完成了所有任务，展现了成为优秀航海士的潜力。',
        narrative: '从观星台到北斗湾，再到归航港，你的每一步都精准而从容。北斗七星的连接一气呵成，所有目标都圆满达成。老船长满意地点了点头——你是一名可造之材。',
        icon: '🌟',
        color: '#ffd700',
        order: 3,
        conditions: [
          { type: 'objectives_completed', value: 100, operator: 'gte' },
          { type: 'min_score', value: 85 }
        ],
        rewards: { gold: 150, exp: 50, supplies: 25 }
      },
      {
        id: 'chapter-1-ending-good',
        type: 'good',
        title: '顺利的初次航行',
        subtitle: '良好结局',
        description: '你成功完成了初次航行，掌握了观星的基础技巧。',
        narrative: '虽然还有一些星辰未能发现，但你已经学会了如何通过北斗七星辨别方向。归航港的灯火在远处闪烁，你的航海士之路，才刚刚开始。',
        icon: '⭐',
        color: '#4ecdc4',
        order: 4,
        conditions: [
          { type: 'objectives_completed', value: 60, operator: 'gte' },
          { type: 'min_score', value: 50 }
        ],
        rewards: { gold: 80, exp: 30, supplies: 15 }
      },
      {
        id: 'chapter-1-ending-normal',
        type: 'normal',
        title: '勉强度过的首航',
        subtitle: '普通结局',
        description: '你勉强完成了航行，还需要更多的练习。',
        narrative: '初次航行并不轻松。浓雾、迷航...你遇到了不少麻烦。但最终，你还是回到了归航港。记住每一次失败，它们将成为你成长的基石。',
        icon: '⛵',
        color: '#96ceb4',
        order: 5,
        conditions: [
          { type: 'objectives_completed', value: 0, operator: 'gte' }
        ]
      }
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
      { id: 'star-2-h1', name: '隐星·雾隐', position: { x: 0, y: 80, z: -80 }, size: 1.6, color: '#aaddff', brightness: 0.5, isClickable: true, hidden: true },
      { id: 'star-2-h2', name: '隐星·霜华', position: { x: -70, y: 50, z: -30 }, size: 1.4, color: '#ddeeff', brightness: 0.55, isClickable: true, hidden: true },
      { id: 'star-2-h3', name: '隐星·流萤', position: { x: 70, y: 30, z: -50 }, size: 1.2, color: '#ccffcc', brightness: 0.45, isClickable: true, hidden: true },
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
        requiredConstellations: ['cons-2-1', 'cons-2-2'],
        branchType: 'main',
        branchGroup: 'chapter-2-main',
        isDefault: true,
        order: 1,
        branchDescription: '穿越天琴礁石与猎户湾的传统航线，适合初次探索',
      },
      {
        id: 'route-2-alt',
        name: '北方绕行线',
        points: ['point-2-start', 'point-2-north-1', 'point-2-north-2', 'point-2-end'],
        requiredStars: ['star-2-1'],
        requiredConstellations: ['cons-2-1'],
        branchType: 'alternative',
        branchGroup: 'chapter-2-main',
        order: 2,
        branchDescription: '绕过浓雾核心区的北方航线，距离较短但需发现天琴座',
        unlockConditions: [
          {
            type: 'constellations_discovered',
            value: 1,
            operator: 'gte',
          }
        ],
        lockedDescription: '需要先发现至少1个星座',
        completionReward: {
          gold: 100,
          supplies: 20,
        }
      },
      {
        id: 'route-2-secret',
        name: '隐秘古航道',
        points: ['point-2-start', 'point-2-secret-1', 'point-2-secret-2', 'point-2-secret-3', 'point-2-end'],
        requiredStars: ['star-2-1', 'star-2-2', 'star-2-7'],
        requiredConstellations: ['cons-2-1', 'cons-2-2'],
        branchType: 'secret',
        branchGroup: 'chapter-2-optional',
        order: 3,
        branchDescription: '传说中的古代航海士留下的神秘航线，隐藏着珍贵的宝藏',
        unlockConditions: [
          {
            type: 'stars_discovered',
            value: 5,
            operator: 'gte',
          },
          {
            type: 'points_visited',
            value: 3,
            operator: 'gte',
          }
        ],
        lockedDescription: '需要发现5颗以上星辰并访问3个以上航点',
        color: '#ff6bcb',
        completionReward: {
          gold: 300,
          exp: 50,
          supplies: 50,
        }
      },
      {
        id: 'route-2-south',
        name: '南方探索线',
        points: ['point-2-start', 'point-2-south-1', 'point-2-south-2', 'point-2-3', 'point-2-end'],
        branchType: 'optional',
        branchGroup: 'chapter-2-optional',
        order: 4,
        branchDescription: '途经南方暗礁区的探索航线，有机会发现特殊资源',
        completionReward: {
          gold: 150,
        }
      }
    ],
    routePoints: [
      { id: 'point-2-start', name: '雾港', position: { x: 0, y: 0, z: 60 }, type: 'start',
        landmark: {
          title: '🌫️ 雾港',
          description: '终年笼罩在薄雾中的港口，是进入北方雾海的唯一门户。码头上的灯塔发出昏黄的光芒，在浓雾中若隐若现。',
          icon: '🌫️',
          ambientSound: 'wind',
          narrative: '"欢迎来到雾港。前方的海域终年被浓雾笼罩，只有能够识别隐藏星座的航海士，才能找到通往星之岛的道路。"',
          objectiveHint: '在浓雾中寻找天琴座和猎户座的星光'
        }
      },
      { id: 'point-2-1', name: '第一浮标', position: { x: -40, y: 0, z: 30 }, type: 'waypoint', explorationRewards: [
        { type: 'gold', amount: 80, rarity: 'common' },
        { type: 'supplies', amount: 30, rarity: 'common' },
      ], landmark: {
          title: '📍 第一浮标',
          description: '雾海中的第一个航标。古老的浮标上刻着模糊的星座符号，似乎在指引着什么方向。',
          icon: '📍',
          ambientSound: 'ocean',
          narrative: '"这是雾海航线上的第一个浮标。仔细看——上面刻着天琴座的符号。"',
          objectiveHint: '在雾气中寻找织女星的光芒'
        }
      },
      { id: 'point-2-2', name: '天琴礁石', position: { x: -30, y: 0, z: -20 }, type: 'landmark', explorationRewards: [
        { type: 'gold', amount: 150, rarity: 'uncommon' },
        { type: 'exp', amount: 40, rarity: 'uncommon' },
        { type: 'codex_entry', amount: 1, value: 'codex-waypoint-2-2', rarity: 'uncommon', name: '天琴礁石记载' },
      ], landmark: {
          title: '🎵 天琴礁石',
          description: '一片形似竖琴的礁石群。传说每当海风吹过礁石的缝隙，就会传来如天琴般悠扬的乐声。',
          icon: '🎵',
          musicTrack: 'game',
          musicDuration: 10000,
          ambientSound: 'wind',
          narrative: '"这就是天琴礁石。看那最高的礁石——织女星就在它的正上方。传说中，织女星与牵牛星隔银河相望。"',
          objectiveHint: '发现天琴座的星辰，尝试连接它们'
        }
      },
      { id: 'point-2-3', name: '猎户湾', position: { x: 40, y: 0, z: -30 }, type: 'landmark', explorationRewards: [
        { type: 'gold', amount: 150, rarity: 'uncommon' },
        { type: 'supplies', amount: 40, rarity: 'uncommon' },
      ], landmark: {
          title: '🏹 猎户湾',
          description: '海湾的轮廓宛如一位威武的猎人。夜空中，猎户座的光辉与海湾的灯火交相辉映，构成一幅壮丽的画面。',
          icon: '🏹',
          ambientSound: 'ocean',
          ambientSoundDuration: 10000,
          narrative: '"猎户湾到了。在这片海域，猎户座的七颗星格外明亮。仔细辨认参宿四和参宿七——它们是猎人的肩膀和膝盖。"',
          objectiveHint: '连接猎户座的星辰，完成星座识别'
        }
      },
      { id: 'point-2-end', name: '星之岛', position: { x: 0, y: 0, z: -60 }, type: 'end', explorationRewards: [
        { type: 'gold', amount: 300, rarity: 'rare' },
        { type: 'supplies', amount: 80, rarity: 'rare' },
        { type: 'exp', amount: 80, rarity: 'rare' },
      ], landmark: {
          title: '⭐ 星之岛',
          description: '传说中的神秘岛屿，每到夜晚就会被无数星光所笼罩。只有真正的观星航海士才能找到它的所在。',
          icon: '⭐',
          musicTrack: 'game',
          musicDuration: 15000,
          narrative: '"你做到了！星之岛就在眼前。穿过浓雾的考验，你已经证明了自己作为航海士的能力。"',
          objectiveHint: '本章完成，准备迎接更危险的风暴之海'
        }
      },
      { id: 'point-2-north-1', name: '北雾灯塔', position: { x: -50, y: 0, z: 20 }, type: 'waypoint', explorationRewards: [
        { type: 'gold', amount: 60, rarity: 'common' },
        { type: 'supplies', amount: 25, rarity: 'common' },
      ], landmark: {
          title: '🗼 北雾灯塔',
          description: '雾海北方的一座古老灯塔。它的光芒在浓雾中几乎不可见，但据说能为真正的航海士指引方向。',
          icon: '🗼',
          ambientSound: 'wind',
          narrative: '"北雾灯塔。虽然它的光无法穿透浓雾，但有经验的航海士知道，跟着它的方向走，可以绕过雾海最危险的核心区域。"',
          objectiveHint: '这是北方绕行线的起点，可以避开浓雾核心区'
        }
      },
      { id: 'point-2-north-2', name: '极光海峡', position: { x: -30, y: 0, z: -40 }, type: 'landmark', explorationRewards: [
        { type: 'gold', amount: 120, rarity: 'uncommon' },
        { type: 'exp', amount: 35, rarity: 'uncommon' },
        { type: 'clue', amount: 1, value: 'clue-north-passage', rarity: 'rare', name: '北方航道线索' },
      ], landmark: {
          title: '🌌 极光海峡',
          description: '北方海域的一道美丽海峡。即使是在浓雾天气，这里偶尔也能看到淡淡的极光在天边舞动。',
          icon: '🌌',
          musicTrack: 'exploration',
          musicDuration: 12000,
          narrative: '"极光海峡！看天边——那是极光。传说中，只有被星辰眷顾的航海士才能在这里看到它。你发现了北方航道的线索。"',
          objectiveHint: '获得了北方航道的线索，可能隐藏着秘密通道'
        }
      },
      { id: 'point-2-secret-1', name: '迷雾入口', position: { x: 30, y: 0, z: 40 }, type: 'waypoint', explorationRewards: [
        { type: 'gold', amount: 100, rarity: 'uncommon' },
      ], landmark: {
          title: '🔮 迷雾入口',
          description: '一片异常浓郁的迷雾区域，似乎隐藏着通往某处秘密地点的通道。只有勇敢的航海士才敢进入。',
          icon: '🔮',
          ambientSound: 'wind',
          narrative: '"这里的雾气格外浓郁...古代航海士的日志中提到过一条隐秘的古航道，入口就在这附近。"',
          objectiveHint: '进入隐秘古航道，探索古代遗迹'
        }
      },
      { id: 'point-2-secret-2', name: '古航遗迹', position: { x: 60, y: 0, z: 0 }, type: 'landmark', explorationRewards: [
        { type: 'gold', amount: 200, rarity: 'rare' },
        { type: 'codex_entry', amount: 1, value: 'codex-ruins-ancient', rarity: 'rare', name: '古代航海遗迹' },
        { type: 'exp', amount: 60, rarity: 'rare' },
      ], landmark: {
          title: '🏛️ 古航遗迹',
          description: '古代航海文明留下的神秘遗迹。残破的石柱和星图雕刻诉说着一个失落文明的辉煌。',
          icon: '🏛️',
          musicTrack: 'game',
          musicDuration: 15000,
          narrative: '"不可思议...这是上古航海文明的遗迹。看那些星图——古人对星辰的理解，远超我们的想象。"',
          objectiveHint: '发现了古代航海遗迹，获得了珍贵的记载'
        }
      },
      { id: 'point-2-secret-3', name: '星尘峡谷', position: { x: 30, y: 0, z: -50 }, type: 'landmark', explorationRewards: [
        { type: 'gold', amount: 250, rarity: 'rare' },
        { type: 'supplies', amount: 60, rarity: 'rare' },
        { type: 'exp', amount: 70, rarity: 'rare' },
      ], landmark: {
          title: '✨ 星尘峡谷',
          description: '一道深邃的海峡，夜晚时分，星光在这里汇聚，仿佛整条银河都倾泻入海中。',
          icon: '✨',
          musicTrack: 'exploration',
          musicDuration: 12000,
          narrative: '"星尘峡谷...你看，星光在这里汇聚成河。传说古代航海士会在这里祈祷，请求星辰的庇佑。"',
          objectiveHint: '隐秘航线的终点，蕴含着丰厚的宝藏'
        }
      },
      { id: 'point-2-south-1', name: '南风岬', position: { x: 45, y: 0, z: 20 }, type: 'waypoint', explorationRewards: [
        { type: 'gold', amount: 70, rarity: 'common' },
        { type: 'supplies', amount: 35, rarity: 'common' },
      ], landmark: {
          title: '🌬️ 南风岬',
          description: '温暖的南风从这里吹来，与北方的冷雾相遇，形成独特的气候。据说这片海域蕴藏着特殊的资源。',
          icon: '🌬️',
          ambientSound: 'wind',
          narrative: '"南风岬。这里的风和雾海其他地方的不太一样——温暖而带着咸味。也许能找到些特别的东西。"',
          objectiveHint: '南方探索线的起点，有机会发现特殊资源'
        }
      },
      { id: 'point-2-south-2', name: '暗礁群', position: { x: 55, y: 0, z: -10 }, type: 'landmark', explorationRewards: [
        { type: 'gold', amount: 130, rarity: 'uncommon' },
        { type: 'exp', amount: 45, rarity: 'uncommon' },
      ], landmark: {
          title: '🪨 暗礁群',
          description: '南方海域的一片危险礁石区。在雾气的笼罩下，暗礁若隐若现，对航行构成巨大威胁，但也可能藏有惊喜。',
          icon: '🪨',
          ambientSound: 'ocean',
          narrative: '"小心！这里是暗礁群。虽然危险，但据说暗礁之间生长着珍贵的海洋资源。"',
          objectiveHint: '危险的暗礁区域，谨慎航行可能发现特殊资源'
        }
      },
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
    ],
    endings: [
      {
        id: 'chapter-2-ending-true',
        type: 'true',
        title: '古航道的继承者',
        subtitle: '真结局',
        description: '你找到了传说中的隐秘古航道，发现了失落文明的秘密。雾海的真相，终于大白于天下。',
        narrative: '当你踏上星尘峡谷的那一刻，所有的星辰都为你闪耀。古航遗迹中的星图记载，雾隐、霜华、流萤三颗隐星的光芒，共同指向了一条被遗忘千年的古航道。你不仅是一名航海士，更是古代航海文明的继承者。',
        icon: '🏛️',
        color: '#ff6bcb',
        order: 1,
        conditions: [
          { type: 'route_completed', targetId: 'route-2-secret' },
          { type: 'hidden_stars_discovered', value: 3, operator: 'gte' },
          { type: 'objectives_completed', value: 100, operator: 'gte' },
          { type: 'min_score', value: 90 }
        ],
        rewards: { gold: 500, exp: 200, supplies: 100 }
      },
      {
        id: 'chapter-2-ending-secret',
        type: 'secret',
        title: '隐秘航道的开拓者',
        subtitle: '隐藏结局',
        description: '你发现并完成了隐秘古航道，揭开了雾海的一角神秘面纱。',
        narrative: '迷雾入口、古航遗迹、星尘峡谷...你走过了古人留下的足迹。虽然还有隐星未能发现，但你已经证明了自己——只有真正的航海士，才能找到这条道路。',
        icon: '🗺️',
        color: '#ff6bcb',
        order: 2,
        conditions: [
          { type: 'route_completed', targetId: 'route-2-secret' },
          { type: 'min_score', value: 70 }
        ],
        rewards: { gold: 300, exp: 120, supplies: 60 }
      },
      {
        id: 'chapter-2-ending-excellent',
        type: 'excellent',
        title: '雾海的征服者',
        subtitle: '优秀结局',
        description: '你在浓雾中找到了方向，发现了所有隐藏的星辰，展现了卓越的航海才能。',
        narrative: '浓雾无法阻挡你的视线。织女星、牵牛星、猎户座...还有雾隐、霜华、流萤三颗隐星，都被你一一发现。星之岛的灯火为你而亮，你是真正的雾海征服者。',
        icon: '🌟',
        color: '#ffd700',
        order: 3,
        conditions: [
          { type: 'hidden_stars_discovered', value: 2, operator: 'gte' },
          { type: 'objectives_completed', value: 100, operator: 'gte' },
          { type: 'min_score', value: 85 }
        ],
        rewards: { gold: 250, exp: 100, supplies: 50 }
      },
      {
        id: 'chapter-2-ending-alt-route',
        type: 'good',
        title: '北方绕行的智者',
        subtitle: '北方航线结局',
        description: '你选择了北方绕行线，避开了浓雾的核心区域，展现了航海的智慧。',
        narrative: '你没有选择硬碰浓雾，而是沿着北方灯塔的指引，绕过了雾海最危险的区域。极光海峡的美景，北方航道的线索...有时候，智慧比勇气更重要。',
        icon: '🧭',
        color: '#6bcbff',
        order: 4,
        conditions: [
          { type: 'route_type', value: 'alternative' },
          { type: 'min_score', value: 60 }
        ],
        rewards: { gold: 180, exp: 70, supplies: 40 }
      },
      {
        id: 'chapter-2-ending-good',
        type: 'good',
        title: '穿越迷雾的航海士',
        subtitle: '良好结局',
        description: '你成功穿越了雾海，抵达了传说中的星之岛。',
        narrative: '浓雾、暴风雨、未知的海域...你一一克服了这些挑战。天琴座与猎户座的星光，指引你来到了星之岛。虽然还有秘密未能发现，但这已经是一次成功的航行。',
        icon: '⭐',
        color: '#4ecdc4',
        order: 5,
        conditions: [
          { type: 'objectives_completed', value: 60, operator: 'gte' },
          { type: 'min_score', value: 50 }
        ],
        rewards: { gold: 120, exp: 50, supplies: 30 }
      },
      {
        id: 'chapter-2-ending-normal',
        type: 'normal',
        title: '雾海中的幸存者',
        subtitle: '普通结局',
        description: '你在浓雾中艰难前行，最终勉强抵达了目的地。',
        narrative: '这是一次艰难的航行。浓雾遮蔽了视线，暴风雨考验着意志。你迷失过方向，也错过了不少风景。但最终，你还是到达了星之岛。活着，就是最大的胜利。',
        icon: '⛵',
        color: '#96ceb4',
        order: 6,
        conditions: [
          { type: 'objectives_completed', value: 0, operator: 'gte' }
        ]
      }
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
      { id: 'star-3-h1', name: '隐星·风暴之眼', position: { x: 0, y: 20, z: -100 }, size: 1.8, color: '#ffaa44', brightness: 0.5, isClickable: true, hidden: true },
      { id: 'star-3-h2', name: '隐星·南极辉', position: { x: 40, y: 25, z: -90 }, size: 1.5, color: '#88ffff', brightness: 0.55, isClickable: true, hidden: true },
      { id: 'star-3-h3', name: '隐星·幽冥', position: { x: -60, y: 30, z: -70 }, size: 1.3, color: '#aa88ff', brightness: 0.45, isClickable: true, hidden: true },
      { id: 'star-3-h4', name: '隐星·烬灭', position: { x: 70, y: 45, z: -20 }, size: 1.4, color: '#ff6688', brightness: 0.5, isClickable: true, hidden: true },
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
      { id: 'point-3-start', name: '风暴港', position: { x: 0, y: 0, z: 80 }, type: 'start',
        landmark: {
          title: '⛈️ 风暴港',
          description: '南方海域最危险的港口，以狂暴的风暴而闻名。即使是最有经验的航海士，在出发前也会在这里祈福。',
          icon: '⛈️',
          ambientSound: 'ocean',
          musicTrack: 'game',
          musicDuration: 8000,
          narrative: '"欢迎来到风暴港。前方的海域以狂暴著称。传说在风暴的尽头，有一颗能够指引所有航海士回家的星星——南十字星。"',
          objectiveHint: '准备好迎接风暴的考验，寻找南十字星'
        }
      },
      { id: 'point-3-1', name: '前哨站', position: { x: -50, y: 0, z: 50 }, type: 'waypoint', explorationRewards: [
        { type: 'gold', amount: 100, rarity: 'common' },
        { type: 'supplies', amount: 40, rarity: 'common' },
      ], landmark: {
          title: '🏕️ 前哨站',
          description: '进入风暴海域前的最后一个补给站。在这里可以补充物资，为接下来的危险旅程做准备。',
          icon: '🏕️',
          ambientSound: 'wind',
          narrative: '"这是风暴前哨站。过了这里，就正式进入风暴之海了。检查好你的补给——接下来的航程不会轻松。"',
          objectiveHint: '最后补给点，之后将进入危险的风暴海域'
        }
      },
      { id: 'point-3-2', name: '避风湾', position: { x: -60, y: 0, z: 0 }, type: 'landmark', explorationRewards: [
        { type: 'gold', amount: 180, rarity: 'uncommon' },
        { type: 'supplies', amount: 60, rarity: 'uncommon' },
        { type: 'exp', amount: 50, rarity: 'uncommon' },
      ], landmark: {
          title: '🏖️ 避风湾',
          description: '风暴之海中罕见的安全港湾。四周的岩石天然阻挡了狂风巨浪，是躲避风暴的绝佳地点。',
          icon: '🏖️',
          musicTrack: 'exploration',
          musicDuration: 10000,
          ambientSound: 'ocean',
          narrative: '"谢天谢地，找到了避风湾！这里的岩石天然形成了屏障，风暴无法侵袭。趁这个机会休整一下吧。"',
          objectiveHint: '在风暴中找到安全港湾，可以在这里躲避恶劣天气'
        }
      },
      { id: 'point-3-3', name: '十字礁', position: { x: 0, y: 0, z: -50 }, type: 'landmark', explorationRewards: [
        { type: 'gold', amount: 200, rarity: 'rare' },
        { type: 'exp', amount: 70, rarity: 'rare' },
        { type: 'codex_entry', amount: 1, value: 'codex-southern-cross', rarity: 'rare', name: '南十字礁记载' },
      ], landmark: {
          title: '✝️ 十字礁',
          description: '一片呈十字形排列的礁石群。每当风暴平息的夜晚，南十字座就会恰好出现在礁石的正上方。',
          icon: '✝️',
          musicTrack: 'game',
          musicDuration: 12000,
          narrative: '"十字礁到了！看正上方——南十字座就在那里。自古以来，它就是航海家在南半球航行时最重要的导航标志。"',
          objectiveHint: '发现南十字座，连接它的五颗星辰'
        }
      },
      { id: 'point-3-4', name: '天狼角', position: { x: 50, y: 0, z: -20 }, type: 'landmark', explorationRewards: [
        { type: 'gold', amount: 180, rarity: 'uncommon' },
        { type: 'supplies', amount: 50, rarity: 'uncommon' },
      ], landmark: {
          title: '🐺 天狼角',
          description: '一处伸向海中的险峻海岬。夜空中，夜空中最明亮的天狼星照耀着这里，据说能为航海士带来好运。',
          icon: '🐺',
          ambientSound: 'wind',
          ambientSoundDuration: 8000,
          narrative: '"天狼角。看那天空中最亮的星星——那就是天狼星，大犬座的主星。传说跟随它的光芒，就能找到回家的路。"',
          objectiveHint: '天狼星是天空中最亮的恒星，注意识别大犬座'
        }
      },
      { id: 'point-3-end', name: '归航港', position: { x: 30, y: 0, z: 40 }, type: 'end', explorationRewards: [
        { type: 'gold', amount: 400, rarity: 'rare' },
        { type: 'supplies', amount: 100, rarity: 'rare' },
        { type: 'exp', amount: 100, rarity: 'rare' },
      ], landmark: {
          title: '🏠 归航港',
          description: '风暴之海南缘的温暖港口。平安抵达这里意味着你征服了最危险的海域，成为了真正的航海士。',
          icon: '🏠',
          musicTrack: 'game',
          musicDuration: 15000,
          narrative: '"你做到了！穿越了整个风暴之海，平安归来。南十字星、天狼星、大犬座、御夫座...这些星辰将永远指引你的航程。"',
          objectiveHint: '本章完成！你已成为真正的观星航海士'
        }
      }
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
    ],
    endings: [
      {
        id: 'chapter-3-ending-true',
        type: 'true',
        title: '风暴的主宰',
        subtitle: '真结局',
        description: '你不仅穿越了风暴之海，更洞悉了风暴的本质。四颗隐星揭示了风暴的起源，你成为了真正掌控风暴的航海士。',
        narrative: '当风暴之眼、南极辉、幽冥、烬灭——当四颗隐星在你面前排列成阵，风暴不再是敌人，而是你的盟友。你终于明白，风暴之海并非危险的考验，而是星辰赠予勇敢者的礼物。你是风暴的主宰，所有航海士传说中的存在。',
        icon: '⚡',
        color: '#ff6b6b',
        order: 1,
        conditions: [
          { type: 'hidden_stars_discovered', value: 4, operator: 'gte' },
          { type: 'objectives_completed', value: 100, operator: 'gte' },
          { type: 'min_score', value: 95 }
        ],
        rewards: { gold: 800, exp: 300, supplies: 150 }
      },
      {
        id: 'chapter-3-ending-secret',
        type: 'secret',
        title: '风暴中的隐星猎人',
        subtitle: '隐藏结局',
        description: '你在狂暴的风暴中，发现了隐藏的星辰，展现了非凡的洞察力。',
        narrative: '风暴遮蔽了大多数星辰的光芒，但你却能透过云层，捕捉到了隐星的微光。风暴之眼、南极辉、幽冥...每一颗隐星的发现，都是你勇气与智慧的证明。',
        icon: '✨',
        color: '#ff6b6b',
        order: 2,
        conditions: [
          { type: 'hidden_stars_discovered', value: 2, operator: 'gte' },
          { type: 'min_score', value: 75 }
        ],
        rewards: { gold: 400, exp: 150, supplies: 80 }
      },
      {
        id: 'chapter-3-ending-excellent',
        type: 'excellent',
        title: '风暴征服者',
        subtitle: '优秀结局',
        description: '你完美地穿越了风暴之海，发现了南十字座、大犬座和御夫座，成为了传奇航海士。',
        narrative: '南十字座指引方向，大犬座照亮前路，御夫座守护平安。你在风暴中如鱼得水，所有目标全部达成。风暴之海在你面前，也不过如此。',
        icon: '🌟',
        color: '#ffd700',
        order: 3,
        conditions: [
          { type: 'constellations_discovered', value: 3, operator: 'gte' },
          { type: 'objectives_completed', value: 100, operator: 'gte' },
          { type: 'min_score', value: 85 }
        ],
        rewards: { gold: 350, exp: 120, supplies: 70 }
      },
      {
        id: 'chapter-3-ending-good',
        type: 'good',
        title: '风暴穿越者',
        subtitle: '良好结局',
        description: '你成功穿越了风暴之海，带着宝贵的经验和故事满载而归。',
        narrative: '风暴、巨浪、雷电...你一一挺了过来。虽然还有隐星未能发现，还有星座未能连接，但你已经证明了自己——你是一名真正的航海士。',
        icon: '⭐',
        color: '#4ecdc4',
        order: 4,
        conditions: [
          { type: 'objectives_completed', value: 60, operator: 'gte' },
          { type: 'min_score', value: 50 }
        ],
        rewards: { gold: 200, exp: 80, supplies: 40 }
      },
      {
        id: 'chapter-3-ending-normal',
        type: 'normal',
        title: '风暴中的生还者',
        subtitle: '普通结局',
        description: '你在风暴之海中艰难求生，最终平安归来。',
        narrative: '这是你经历过最艰难的航行。风暴一次又一次地考验着你的意志，你几乎要放弃了...但你没有。活着回来，就是最大的成就。',
        icon: '⛵',
        color: '#96ceb4',
        order: 5,
        conditions: [
          { type: 'objectives_completed', value: 0, operator: 'gte' }
        ]
      }
    ]
  }
];
