import { SeaEventConfig } from '../types';

export const seaEvents: SeaEventConfig[] = [
  {
    id: 'meteor_shower_1',
    type: 'meteor_shower',
    name: '流星雨之夜',
    description: '夜空突然被璀璨的流星雨照亮，无数流星划过天际，仿佛在向你预示着什么。',
    rarity: 'uncommon',
    icon: '☄️',
    minChapter: 1,
    cooldown: 120,
    triggerCondition: {
      timeOfDay: 'night',
    },
    choices: [
      {
        id: 'wish',
        text: '许愿祈福',
        description: '对着流星许下心愿，也许会有好运降临。',
        successRate: 0.6,
        rewards: [
          { type: 'gold', value: 'gold', amount: 100 },
          { type: 'supplies', value: 'supplies', amount: 20 },
        ],
        effects: [
          { type: 'flag', key: 'meteor_wished', value: true },
        ],
        resultText: '你的诚心感动了星辰，获得了意外的收获！',
        failText: '流星转瞬即逝，愿望似乎未能传达。',
      },
      {
        id: 'observe',
        text: '仔细观测',
        description: '观测流星雨的轨迹，记录它们的运行规律。',
        condition: {
          requiredCrewRole: 'navigator',
        },
        successRate: 0.8,
        rewards: [
          { type: 'exp', value: 'exp', amount: 50 },
          { type: 'codex_entry', value: 'codex_meteor_1' },
        ],
        effects: [
          { type: 'flag', key: 'meteor_observed', value: true },
        ],
        nextEventId: 'meteor_shower_2',
        resultText: '你记录下了珍贵的观测数据，对星空的理解更深了。你注意到流星的轨迹似乎指向某个方向……',
        failText: '流星太快了，未能完整记录。',
      },
      {
        id: 'shelter',
        text: '寻找掩护',
        description: '流星雨可能带来危险，让船员进入船舱躲避。',
        rewards: [],
        effects: [
          { type: 'flag', key: 'meteor_sheltered', value: true },
        ],
        resultText: '你带领船员安全躲避，虽然没有收获，但确保了安全。',
      },
    ],
    codexEntry: {
      id: 'codex_meteor_1',
      category: 'chapters',
      name: '流星雨现象',
      description: '流星雨是夜空中常见的天象，成群的流星从空中划过。传说在流星雨时许愿会灵验。',
    },
  },
  {
    id: 'meteor_shower_2',
    type: 'meteor_shower',
    name: '火流星之灾',
    description: '一颗巨大的火流星正朝你所在的方向坠落，必须立刻做出选择！',
    rarity: 'rare',
    icon: '🔥',
    minChapter: 2,
    cooldown: 180,
    triggerCondition: {
      weatherType: 'meteor',
    },
    choices: [
      {
        id: 'evade',
        text: '紧急规避',
        description: '全速转向，尝试躲避流星的落点。',
        condition: {
          flag: 'meteor_observed',
        },
        successRate: 0.7,
        rewards: [
          { type: 'exp', value: 'exp', amount: 30 },
        ],
        penalties: [
          { type: 'health', amount: 20 },
        ],
        effects: [
          { type: 'flag', key: 'meteor_evaded', value: true },
        ],
        resultText: '之前的观测数据帮助了你，你成功预判了流星的轨迹并避开了！',
        failText: '躲避不及，流星击中了船只！',
      },
      {
        id: 'absorb',
        text: '加固船身',
        description: '让船员加固船体，准备承受冲击。',
        condition: {
          requiredCrewRole: 'engineer',
          minSupplies: 30,
        },
        successRate: 0.7,
        rewards: [
          { type: 'exp', value: 'exp', amount: 40 },
        ],
        penalties: [
          { type: 'supplies', amount: 20 },
          { type: 'health', amount: 10 },
        ],
        effects: [
          { type: 'flag', key: 'meteor_tanked', value: true },
        ],
        resultText: '加固措施有效，船只仅受到轻微损伤。',
        failText: '加固未能完全抵御冲击，船只受损严重。',
      },
      {
        id: 'meteor_mineral',
        text: '收集陨石',
        description: '冒险收集坠落在附近的陨石矿物。',
        condition: {
          minHealth: 50,
        },
        successRate: 0.4,
        rewards: [
          { type: 'gold', value: 'gold', amount: 200 },
          { type: 'codex_entry', value: 'codex_meteor_mineral' },
        ],
        penalties: [
          { type: 'health', amount: 30 },
        ],
        effects: [
          { type: 'flag', key: 'meteor_mineral_collected', value: true },
        ],
        nextEventId: 'lost_ruins_1',
        resultText: '你成功收集到了珍贵的陨石矿物，价值连城！矿物上的纹路似乎指向某处遗迹……',
        failText: '收集过程中发生意外，船只受损严重。',
      },
    ],
    codexEntry: {
      id: 'codex_meteor_mineral',
      category: 'chapters',
      name: '陨石矿物',
      description: '从天而降的陨石中蕴含着稀有的矿物，是珍贵的贸易品。',
    },
  },
  {
    id: 'reef_1',
    type: 'reef',
    name: '暗礁群',
    description: '前方海面上隐约可见危险的暗礁群，必须谨慎通过。',
    rarity: 'common',
    icon: '🪨',
    minChapter: 1,
    cooldown: 90,
    choices: [
      {
        id: 'careful',
        text: '小心绕行',
        description: '减速慢行，小心翼翼地绕过暗礁群。',
        successRate: 0.7,
        rewards: [],
        penalties: [
          { type: 'supplies', amount: 10 },
        ],
        effects: [
          { type: 'flag', key: 'reef_passed_carefully', value: true },
        ],
        resultText: '你谨慎地驾驶船只，安全通过了暗礁群。',
        failText: '尽管小心行驶，船体还是擦到了暗礁。',
      },
      {
        id: 'map',
        text: '查看海图',
        description: '让领航员仔细查看海图，寻找安全的航道。',
        condition: {
          requiredCrewRole: 'navigator',
        },
        successRate: 0.85,
        rewards: [
          { type: 'exp', value: 'exp', amount: 25 },
        ],
        effects: [
          { type: 'flag', key: 'reef_charted', value: true },
        ],
        nextEventId: 'reef_2',
        resultText: '领航员在海图上找到了安全航道，顺利通过。海图上标注了附近可能有沉船礁……',
        failText: '海图上没有标注这片暗礁，只能冒险前进。',
      },
      {
        id: 'sound',
        text: '测深探路',
        description: '用测深锤探测水深，缓慢前进。',
        successRate: 0.6,
        rewards: [
          { type: 'codex_entry', value: 'codex_reef_1' },
        ],
        penalties: [
          { type: 'supplies', amount: 15 },
        ],
        effects: [
          { type: 'flag', key: 'reef_sounded', value: true },
        ],
        resultText: '你记录下了这片暗礁的水文信息。',
        failText: '探测过程中船体触礁受损。',
      },
    ],
    codexEntry: {
      id: 'codex_reef_1',
      category: 'chapters',
      name: '海域暗礁',
      description: '海面下隐藏的暗礁是航海的大敌，只有经验丰富的航海士才能安全通过。',
    },
  },
  {
    id: 'reef_2',
    type: 'reef',
    name: '沉船礁',
    description: '这片海域遍布着古代沉船的残骸，据说其中藏有宝藏，但也充满了危险。',
    rarity: 'rare',
    icon: '⚓',
    minChapter: 2,
    cooldown: 150,
    triggerCondition: {
      minStarsDiscovered: 5,
    },
    choices: [
      {
        id: 'explore',
        text: '探索沉船',
        description: '派人下水探索沉船，寻找有价值的物品。',
        condition: {
          minHealth: 40,
          flag: 'reef_charted',
        },
        successRate: 0.65,
        rewards: [
          { type: 'gold', value: 'gold', amount: 300 },
          { type: 'supplies', value: 'supplies', amount: 30 },
        ],
        penalties: [
          { type: 'health', amount: 25 },
        ],
        effects: [
          { type: 'flag', key: 'shipwreck_explored', value: true },
          { type: 'flag', key: 'has_ancient_map', value: true },
        ],
        nextEventId: 'lost_ruins_1',
        resultText: '探索队从沉船中找到了不少珍贵物品，还有一张古老的航海图，上面标注着一座海底遗迹的位置！',
        failText: '探索过程中遇到危险，队员受伤返回。',
      },
      {
        id: 'salvage',
        text: '打捞物资',
        description: '在安全距离外打捞沉船遗物。',
        condition: {
          requiredCrewRole: 'sailor',
        },
        successRate: 0.7,
        rewards: [
          { type: 'gold', value: 'gold', amount: 150 },
          { type: 'supplies', value: 'supplies', amount: 25 },
        ],
        effects: [
          { type: 'flag', key: 'shipwreck_salvaged', value: true },
        ],
        resultText: '你成功打捞起了一些物资。',
        failText: '海浪太大，打捞失败了。',
      },
      {
        id: 'avoid',
        text: '远远避开',
        description: '安全第一，绕开这片危险的海域。',
        rewards: [
          { type: 'exp', value: 'exp', amount: 10 },
        ],
        effects: [
          { type: 'flag', key: 'shipwreck_avoided', value: true },
        ],
        resultText: '你明智地选择了安全，虽然没有收获，但确保了航程平安。',
      },
    ],
  },
  {
    id: 'fog_zone_1',
    type: 'fog_zone',
    name: '迷雾海域',
    description: '浓密的海雾笼罩了一切，能见度极低，很容易迷失方向。',
    rarity: 'common',
    icon: '🌫️',
    minChapter: 1,
    cooldown: 100,
    triggerCondition: {
      weatherType: 'fog',
    },
    choices: [
      {
        id: 'stars',
        text: '观星导航',
        description: '尝试穿透迷雾，用星星来确定方位。',
        condition: {
          requiredCrewRole: 'navigator',
        },
        successRate: 0.5,
        rewards: [
          { type: 'exp', value: 'exp', amount: 40 },
        ],
        effects: [
          { type: 'flag', key: 'fog_navigated_by_stars', value: true },
        ],
        nextEventId: 'fog_zone_2',
        resultText: '你在迷雾间隙中捕捉到了星光，成功辨明了方向！迷雾深处似乎有更诡异的东西……',
        failText: '迷雾太浓，完全看不到星星。',
      },
      {
        id: 'compass',
        text: '罗盘定向',
        description: '依靠罗盘，谨慎地保持航向前进。',
        successRate: 0.6,
        rewards: [
          { type: 'exp', value: 'exp', amount: 15 },
        ],
        penalties: [
          { type: 'supplies', amount: 15 },
        ],
        effects: [
          { type: 'flag', key: 'fog_compass_navigated', value: true },
        ],
        resultText: '虽然慢了些，但你安全地穿过了迷雾区。',
        failText: '迷雾中迷失了方向，浪费了不少时间和物资。',
      },
      {
        id: 'wait',
        text: '原地等待',
        description: '抛锚停船，等待迷雾散去。',
        rewards: [],
        penalties: [
          { type: 'supplies', amount: 20 },
        ],
        effects: [
          { type: 'flag', key: 'fog_waited_out', value: true },
        ],
        resultText: '你耐心等待，迷雾终于散去了。',
      },
    ],
    codexEntry: {
      id: 'codex_fog_1',
      category: 'chapters',
      name: '海雾天气',
      description: '海雾是航海中常见的危险天气，会严重影响能见度。经验丰富的航海士能够在雾中保持正确的航向。',
    },
  },
  {
    id: 'fog_zone_2',
    type: 'fog_zone',
    name: '幽灵雾',
    description: '诡异的浓雾中隐约传来奇怪的声音，似乎有什么东西在雾中移动。',
    rarity: 'epic',
    icon: '👻',
    minChapter: 2,
    cooldown: 200,
    triggerCondition: {
      timeOfDay: 'night',
      weatherType: 'fog',
      flag: 'fog_navigated_by_stars',
    },
    choices: [
      {
        id: 'investigate',
        text: '一探究竟',
        description: '鼓起勇气，朝着奇怪的声音驶去。',
        condition: {
          minHealth: 50,
          flag: 'fog_navigated_by_stars',
        },
        successRate: 0.5,
        rewards: [
          { type: 'gold', value: 'gold', amount: 500 },
          { type: 'codex_entry', value: 'codex_ghost_fog' },
        ],
        penalties: [
          { type: 'health', amount: 30 },
        ],
        effects: [
          { type: 'flag', key: 'ghost_fog_investigated', value: true },
          { type: 'flag', key: 'has_ghost_compass', value: true },
        ],
        nextEventId: 'lost_ruins_2',
        resultText: '原来雾中是一艘失事的商船残骸，上面还有不少值钱的货物！船上的幽灵罗盘似乎指向了某座圣殿……',
        failText: '雾中似乎有什么东西袭击了船只，船体受损。',
      },
      {
        id: 'light',
        text: '点亮桅灯',
        description: '点亮所有灯火，驱散迷雾中的恐惧。',
        condition: {
          requiredCrewRole: 'lookout',
        },
        successRate: 0.6,
        rewards: [
          { type: 'exp', value: 'exp', amount: 35 },
        ],
        penalties: [
          { type: 'supplies', amount: 10 },
        ],
        effects: [
          { type: 'flag', key: 'ghost_fog_lit', value: true },
        ],
        resultText: '明亮的灯光驱散了恐惧，船员们镇定下来，安全通过了迷雾。',
        failText: '灯光似乎吸引了什么，情况变得更糟了。',
      },
      {
        id: 'retreat',
        text: '全速撤退',
        description: '不管那么多，立刻退出这片诡异的海域。',
        successRate: 0.8,
        rewards: [],
        penalties: [
          { type: 'supplies', amount: 25 },
        ],
        effects: [
          { type: 'flag', key: 'ghost_fog_retreated', value: true },
        ],
        resultText: '你迅速撤离了危险区域，虽然消耗了不少物资，但至少安全了。',
        failText: '撤退时迷失了方向，在雾中绕了好久才出来。',
      },
    ],
    codexEntry: {
      id: 'codex_ghost_fog',
      category: 'chapters',
      name: '幽灵雾传说',
      description: '传说中有些海域会出现诡异的幽灵雾，雾中常常传来奇怪的声音。有人说那是遇难船员的亡魂，也有人说那只是海流的声音。',
    },
  },
  {
    id: 'lost_ruins_1',
    type: 'lost_ruins',
    name: '海底遗迹',
    description: '你发现了一座神秘的海底遗迹，石柱上刻满了古老的星图符号。',
    rarity: 'rare',
    icon: '🏛️',
    minChapter: 2,
    cooldown: 180,
    triggerCondition: {
      minStarsDiscovered: 8,
      flag: 'has_ancient_map',
    },
    choices: [
      {
        id: 'dive',
        text: '潜水探索',
        description: '派潜水员下水探索遗迹的秘密。',
        condition: {
          minHealth: 60,
          requiredCrewRole: 'sailor',
        },
        successRate: 0.7,
        rewards: [
          { type: 'gold', value: 'gold', amount: 250 },
          { type: 'codex_entry', value: 'codex_ruins_1' },
          { type: 'exp', value: 'exp', amount: 60 },
        ],
        penalties: [
          { type: 'health', amount: 20 },
        ],
        effects: [
          { type: 'flag', key: 'ruins_dived', value: true },
          { type: 'flag', key: 'has_star_tablet', value: true },
        ],
        nextEventId: 'lost_ruins_2',
        resultText: '探索队在遗迹中发现了古代的天文记录、一些金币和一块星图石板！石板上似乎标注着星之圣殿的位置……',
        failText: '遗迹结构不稳定，探索队被迫返回。',
      },
      {
        id: 'study',
        text: '研究石刻',
        description: '让学者研究遗迹表面的石刻星图。',
        condition: {
          requiredCrewRole: 'navigator',
        },
        successRate: 0.75,
        rewards: [
          { type: 'exp', value: 'exp', amount: 50 },
          { type: 'codex_entry', value: 'codex_ruins_star' },
        ],
        effects: [
          { type: 'flag', key: 'ruins_studied', value: true },
          { type: 'flag', key: 'has_star_tablet', value: true },
        ],
        nextEventId: 'lost_ruins_2',
        resultText: '你解读出了部分星图，获得了一块星图石板，上面暗示着星之圣殿的存在……',
        failText: '石刻太过古老，大部分已经无法辨认。',
      },
      {
        id: 'map_record',
        text: '记录位置',
        description: '将遗迹的位置标注在海图上，以后再来探索。',
        rewards: [
          { type: 'exp', value: 'exp', amount: 20 },
        ],
        effects: [
          { type: 'flag', key: 'ruins_mapped', value: true },
        ],
        resultText: '你仔细记录了遗迹的位置，等准备充分后再来探索。',
      },
    ],
    codexEntry: {
      id: 'codex_ruins_1',
      category: 'chapters',
      name: '远古文明遗迹',
      description: '海底发现的遗迹证明了这片海域曾经存在过一个古老的文明，他们似乎对星象有着深入的研究。',
    },
  },
  {
    id: 'lost_ruins_2',
    type: 'lost_ruins',
    name: '星之圣殿',
    description: '在一座荒岛的深处，你发现了一座被藤蔓覆盖的古老圣殿，圣殿中央矗立着一座巨大的星盘。',
    rarity: 'legendary',
    icon: '✨',
    minChapter: 3,
    cooldown: 300,
    maxOccurrences: 1,
    triggerCondition: {
      minStarsDiscovered: 15,
      flag: 'has_star_tablet',
    },
    choices: [
      {
        id: 'activate',
        text: '激活星盘',
        description: '按照星图石板的指引，尝试激活古老的星盘。',
        condition: {
          minStarsDiscovered: 12,
          requiredCrewRole: 'navigator',
          flag: 'has_star_tablet',
        },
        successRate: 0.7,
        rewards: [
          { type: 'gold', value: 'gold', amount: 500 },
          { type: 'codex_entry', value: 'codex_star_temple' },
          { type: 'exp', value: 'exp', amount: 100 },
          { type: 'chapter_unlock', value: 'chapter_4' },
        ],
        effects: [
          { type: 'flag', key: 'starTempleActivated', value: true },
          { type: 'flag', key: 'ancient_wisdom_obtained', value: true },
          { type: 'chapter', key: 'unlock', value: 'chapter_4' },
        ],
        resultText: '星盘被成功激活！古老的知识涌入你的脑海，你感觉自己对星辰的理解有了质的飞跃。新的海域已向你敞开！',
        failText: '星盘没有反应，也许是你知道的星星还不够多。',
      },
      {
        id: 'treasure',
        text: '寻找宝藏',
        description: '在圣殿中搜寻可能存在的宝藏。',
        condition: {
          minHealth: 50,
          flag: 'has_ghost_compass',
        },
        successRate: 0.6,
        rewards: [
          { type: 'gold', value: 'gold', amount: 800 },
          { type: 'supplies', value: 'supplies', amount: 50 },
        ],
        penalties: [
          { type: 'health', amount: 20 },
        ],
        effects: [
          { type: 'flag', key: 'temple_treasure_found', value: true },
        ],
        resultText: '幽灵罗盘指引你找到了圣殿的密室，里面堆满了古代宝藏！',
        failText: '触发了古老的陷阱，船只受损。',
      },
      {
        id: 'pray',
        text: '虔诚祈祷',
        description: '在这座神圣的地方，向星之神明许下心愿。',
        successRate: 0.6,
        rewards: [
          { type: 'health', value: 'health', amount: 30 },
          { type: 'exp', value: 'exp', amount: 40 },
        ],
        effects: [
          { type: 'flag', key: 'temple_prayed', value: true },
        ],
        resultText: '一阵温暖的星光洒落，你感觉身心都得到了治愈。',
        failText: '祈祷没有得到回应，但你内心感到平静。',
      },
    ],
    codexEntry: {
      id: 'codex_star_temple',
      category: 'chapters',
      name: '星之圣殿',
      description: '传说中星之圣殿是古代观星者的圣地，只有掌握了足够星辰知识的航海士才能激活其中的星盘，获得远古的智慧。',
    },
  },
];

export const getSeaEventsByChapter = (chapterId: string): SeaEventConfig[] => {
  return seaEvents.filter(event => {
    if (event.chapterIds && event.chapterIds.length > 0) {
      return event.chapterIds.includes(chapterId);
    }
    return true;
  });
};

export const getSeaEventById = (eventId: string): SeaEventConfig | undefined => {
  return seaEvents.find(e => e.id === eventId);
};
