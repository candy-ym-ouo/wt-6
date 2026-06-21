import { VoyageEventConfig } from '../types';

export const voyageEvents: VoyageEventConfig[] = [
  // ==================== 天气突变类事件 ====================
  {
    id: 'weather_sudden_storm',
    type: 'weather_sudden',
    name: '骤起风暴',
    description: '海面突然翻起巨浪，乌云从四面八方汇聚而来，一场暴风雨即将来临！',
    icon: '⛈️',
    rarity: 'uncommon',
    trigger: {
      minProgress: 0.2,
      maxProgress: 0.8,
      requireMoving: true,
      probabilityWeight: 30,
      cooldown: 60,
      onlyOncePerRoute: false,
      routeTypes: ['main', 'alternative'],
      weatherCondition: 'clear',
    },
    choices: [
      {
        id: 'weather_storm_prepare',
        text: '加固船帆',
        description: '让船员们加固船帆和货物，准备迎接暴风雨',
        icon: '🔧',
        action: 'accept',
      },
      {
        id: 'weather_storm_avoid',
        text: '尝试绕行',
        description: '改变航向，试图绕过风暴区域（会消耗额外物资）',
        icon: '🧭',
        action: 'investigate',
      },
      {
        id: 'weather_storm_ignore',
        text: '继续航行',
        description: '按原计划前行，听天由命',
        icon: '⛵',
        action: 'decline',
      },
    ],
    effects: [],
    successEffects: [
      {
        type: 'trigger_weather',
        weatherType: 'storm',
        weatherIntensity: 0.4,
        weatherDuration: 25,
      },
      {
        type: 'grant_reward',
        rewardItems: [{ type: 'exp', amount: 15 }],
      },
    ],
    failEffects: [
      {
        type: 'trigger_weather',
        weatherType: 'storm',
        weatherIntensity: 0.6,
        weatherDuration: 35,
      },
    ],
    narrativeText: {
      intro: '天空骤然变色，经验丰富的水手察觉到了危险的信号。',
      accept: '船员们齐心协力，做好了迎接风暴的准备。',
      decline: '你决定继续前行，风暴让你们措手不及。',
      success: '加固措施起了作用，虽然经历了风暴，但损失降到了最低。',
      fail: '风暴比预想的更加猛烈，船只在巨浪中艰难前行。',
    },
    autoResolveAfterMs: 20000,
    allowContinueVoyage: true,
  },
  {
    id: 'weather_sudden_fog',
    type: 'weather_sudden',
    name: '突降浓雾',
    description: '毫无征兆地，浓密的海雾从四面八方涌来，视线瞬间变得模糊不清。',
    icon: '🌫️',
    rarity: 'common',
    trigger: {
      minProgress: 0.15,
      maxProgress: 0.85,
      requireMoving: true,
      probabilityWeight: 35,
      cooldown: 50,
      onlyOncePerRoute: false,
      weatherCondition: 'clear',
      timeOfDayCondition: 'night',
    },
    choices: [
      {
        id: 'weather_fog_slow',
        text: '减速慢行',
        description: '降低航速，谨慎前行避免触礁',
        icon: '🐢',
        action: 'accept',
      },
      {
        id: 'weather_fog_lights',
        text: '点亮桅灯',
        description: '点亮所有信号灯并鸣号，提醒周围注意',
        icon: '🔦',
        action: 'investigate',
      },
      {
        id: 'weather_fog_wait',
        text: '抛锚等待',
        description: '就地抛锚，等待浓雾散去（消耗物资但更安全）',
        icon: '⏳',
        action: 'decline',
      },
    ],
    effects: [],
    successEffects: [
      {
        type: 'trigger_weather',
        weatherType: 'fog',
        weatherIntensity: 0.5,
        weatherDuration: 30,
      },
    ],
    failEffects: [
      {
        type: 'trigger_weather',
        weatherType: 'fog',
        weatherIntensity: 0.75,
        weatherDuration: 40,
      },
    ],
    narrativeText: {
      intro: '浓雾突然降临，前方的航线变得模糊难辨。',
      accept: '你果断减速，谨慎地驾驶船只前行。',
      decline: '你决定就地等待，虽然会消耗时间和物资，但安全第一。',
      success: '安全措施得当，船只在雾中稳步前行。',
      fail: '浓雾超出了预期，能见度降到了极低的程度。',
    },
    autoResolveAfterMs: 18000,
    allowContinueVoyage: true,
  },
  {
    id: 'weather_sudden_clear',
    type: 'weather_sudden',
    name: '骤然放晴',
    description: '原本阴沉的天空突然放晴，阳光洒落海面，视野变得无比清晰。',
    icon: '☀️',
    rarity: 'rare',
    trigger: {
      minProgress: 0.3,
      maxProgress: 0.7,
      requireMoving: true,
      probabilityWeight: 15,
      cooldown: 90,
      onlyOncePerRoute: true,
      weatherCondition: 'any_adverse',
    },
    choices: [
      {
        id: 'weather_clear_observe',
        text: '观察星象',
        description: '趁天气放晴，让领航员观测星象校准航线',
        icon: '✨',
        action: 'accept',
      },
      {
        id: 'weather_clear_speed',
        text: '加速航行',
        description: '利用好天气，全速前进节省时间',
        icon: '💨',
        action: 'investigate',
      },
    ],
    effects: [
      {
        type: 'trigger_weather',
        weatherType: 'clear',
        weatherIntensity: 0,
        weatherDuration: 40,
      },
    ],
    successEffects: [
      {
        type: 'modify_progress',
        progressDelta: 0.05,
      },
    ],
    narrativeText: {
      intro: '天空奇迹般地放晴了，这是一个好兆头！',
      accept: '领航员抓住机会，仔细观测了星象。',
      success: '观测结果让你们对航线有了更精确的判断，航行效率提升了。',
    },
    autoResolveAfterMs: 15000,
    allowContinueVoyage: true,
  },

  // ==================== 星图异常类事件 ====================
  {
    id: 'starmap_anomaly_distort',
    type: 'starmap_anomaly',
    name: '星图紊乱',
    description: '夜空中的星星似乎发生了偏移，原本熟悉的星座变得难以辨认。',
    icon: '🌀',
    rarity: 'uncommon',
    trigger: {
      minProgress: 0.25,
      maxProgress: 0.75,
      requireMoving: true,
      probabilityWeight: 20,
      cooldown: 80,
      onlyOncePerRoute: true,
      routeTypes: ['main', 'alternative', 'secret'],
      timeOfDayCondition: 'night',
      minStarsDiscovered: 3,
    },
    choices: [
      {
        id: 'starmap_distort_study',
        text: '仔细研究',
        description: '让领航员仔细记录异常现象，尝试理解变化规律',
        icon: '📜',
        action: 'investigate',
      },
      {
        id: 'starmap_distort_compass',
        text: '依靠罗盘',
        description: '暂时放弃星象导航，仅依靠罗盘和海图前进',
        icon: '🧭',
        action: 'accept',
      },
      {
        id: 'starmap_distort_ignore',
        text: '忽略异常',
        description: '继续使用原有星图，也许只是视觉错觉',
        icon: '🤷',
        action: 'decline',
      },
    ],
    effects: [],
    successEffects: [
      {
        type: 'starmap_clarify',
      },
      {
        type: 'grant_reward',
        rewardItems: [{ type: 'exp', amount: 25 }],
      },
    ],
    failEffects: [
      {
        type: 'starmap_distort',
        durationMs: 30000,
      },
      {
        type: 'modify_progress',
        progressDelta: -0.03,
      },
    ],
    narrativeText: {
      intro: '星空看起来有些不对劲，星星们的位置似乎偏离了正常的轨迹。',
      accept: '你决定依靠传统导航设备，暂时不依赖星象。',
      decline: '你认为只是错觉，继续按原有星图航行。',
      success: '领航员成功理解了星象变化的规律，甚至从中获得了新的知识！',
      fail: '星图的紊乱导致航线出现了偏差，你们不得不修正航向。',
    },
    autoResolveAfterMs: 22000,
    allowContinueVoyage: true,
  },
  {
    id: 'starmap_anomaly_new_stars',
    type: 'starmap_anomaly',
    name: '新星显现',
    description: '几颗从未见过的星星突然出现在夜空中，散发着神秘的光芒。',
    icon: '🌟',
    rarity: 'rare',
    trigger: {
      minProgress: 0.3,
      maxProgress: 0.9,
      requireMoving: true,
      probabilityWeight: 12,
      cooldown: 120,
      onlyOncePerRoute: true,
      routeTypes: ['secret', 'alternative'],
      timeOfDayCondition: 'night',
    },
    choices: [
      {
        id: 'starmap_new_record',
        text: '记录观测',
        description: '仔细记录这些新星的位置和特征',
        icon: '📝',
        action: 'accept',
      },
      {
        id: 'starmap_new_follow',
        text: '追寻光芒',
        description: '尝试朝着新星出现的方向航行，也许能发现什么',
        icon: '🚀',
        action: 'investigate',
      },
    ],
    effects: [],
    successEffects: [
      {
        type: 'reveal_stars',
      },
      {
        type: 'grant_reward',
        rewardItems: [
          { type: 'exp', amount: 40 },
          { type: 'gold', amount: 80 },
        ],
      },
      {
        type: 'show_hint',
        hintText: '你记录的新星似乎在暗示附近隐藏着什么秘密……',
        hintIcon: '💡',
        durationMs: 8000,
      },
    ],
    failEffects: [
      {
        type: 'grant_reward',
        rewardItems: [{ type: 'exp', amount: 10 }],
      },
    ],
    narrativeText: {
      intro: '几颗陌生的星星突然点亮了夜空，这是从未记录过的天象！',
      accept: '你迫不及待地记录下了这些珍贵的观测数据。',
      success: '你成功记录了新星的位置，这些数据可能价值连城！',
      fail: '新星很快就消失了，只留下了模糊的印象。',
    },
    autoResolveAfterMs: 20000,
    allowContinueVoyage: true,
  },
  {
    id: 'starmap_anomaly_constellation_hint',
    type: 'starmap_anomaly',
    name: '星座指引',
    description: '某个星座的星星突然变得格外明亮，似乎在向你指引着某个方向。',
    icon: '🌌',
    rarity: 'epic',
    trigger: {
      minProgress: 0.4,
      maxProgress: 0.85,
      requireMoving: true,
      probabilityWeight: 8,
      cooldown: 180,
      onlyOncePerRoute: true,
      timeOfDayCondition: 'night',
      minStarsDiscovered: 5,
      flagCondition: { key: 'starmap_hint_used', value: false },
    },
    choices: [
      {
        id: 'starmap_hint_follow',
        text: '遵循指引',
        description: '按照星座指示的方向调整航线',
        icon: '🧭',
        action: 'accept',
      },
      {
        id: 'starmap_hint_study',
        text: '研究图案',
        description: '仔细研究星座的排列，看看是否有特殊含义',
        icon: '🔍',
        action: 'investigate',
      },
    ],
    effects: [],
    successEffects: [
      {
        type: 'highlight_constellation',
      },
      {
        type: 'show_hint',
        hintText: '星座的光芒指向了附近一处未探索的海域……',
        hintIcon: '⭐',
        durationMs: 10000,
      },
      {
        type: 'grant_reward',
        rewardItems: [{ type: 'exp', amount: 60 }],
      },
      {
        type: 'modify_progress',
        progressDelta: 0.08,
      },
    ],
    narrativeText: {
      intro: '星座的异常明亮引起了所有人的注意，这绝非偶然。',
      accept: '你决定相信星辰的指引。',
      success: '遵循星座的指引后，你发现了一条更高效的航线！',
    },
    autoResolveAfterMs: 25000,
    allowContinueVoyage: true,
  },

  // ==================== 目标追加类事件 ====================
  {
    id: 'objective_bonus_supplies',
    type: 'objective_bonus',
    name: '商队求救',
    description: '远处传来信号弹，一支小型商队请求援助，他们的物资即将耗尽。',
    icon: '🆘',
    rarity: 'uncommon',
    trigger: {
      minProgress: 0.2,
      maxProgress: 0.8,
      requireMoving: true,
      probabilityWeight: 18,
      cooldown: 100,
      onlyOncePerRoute: false,
      routeTypes: ['main', 'alternative'],
    },
    choices: [
      {
        id: 'bonus_supplies_help',
        text: '援助商队',
        description: '分出部分物资援助他们（消耗物资但可能获得回报）',
        icon: '🤝',
        action: 'accept',
      },
      {
        id: 'bonus_supplies_trade',
        text: '交易物资',
        description: '以合理价格向他们出售多余物资',
        icon: '💰',
        action: 'investigate',
      },
      {
        id: 'bonus_supplies_ignore',
        text: '无暇顾及',
        description: '继续航行，你们的任务也很紧迫',
        icon: '⛵',
        action: 'decline',
      },
    ],
    effects: [],
    successEffects: [
      {
        type: 'add_objective',
        objective: {
          id: 'bonus_supplies_reward',
          type: 'visit',
          targetId: 'any',
          description: '完成对商队的援助并抵达下一个航点',
          total: 1,
          rewards: [
            { type: 'gold', value: 150 },
            { type: 'exp', value: 30 },
          ],
        },
      },
      {
        type: 'grant_reward',
        rewardItems: [
          { type: 'gold', amount: 100 },
          { type: 'exp', amount: 20 },
        ],
      },
    ],
    failEffects: [],
    narrativeText: {
      intro: '一支陷入困境的商队向你们发出了求救信号。',
      accept: '善良的你决定向他们伸出援手。',
      decline: '你选择了继续前进，完成自己的使命。',
      success: '商队感激不尽，赠送了珍贵的礼物作为答谢！',
    },
    autoResolveAfterMs: 18000,
    allowContinueVoyage: true,
  },
  {
    id: 'objective_bonus_survive',
    type: 'objective_bonus',
    name: '风暴预警',
    description: '远处的天色不对劲，一场大风暴正在逼近。如果能成功穿越，将获得宝贵的经验！',
    icon: '🌊',
    rarity: 'rare',
    trigger: {
      minProgress: 0.35,
      maxProgress: 0.65,
      requireMoving: true,
      probabilityWeight: 15,
      cooldown: 120,
      onlyOncePerRoute: true,
      weatherCondition: 'clear',
    },
    choices: [
      {
        id: 'bonus_survive_challenge',
        text: '接受挑战',
        description: '直接穿越风暴，证明你的航海能力',
        icon: '⚡',
        action: 'accept',
      },
      {
        id: 'bonus_survive_detour',
        text: '改变航道',
        description: '绕开风暴区域，安全但费时',
        icon: '↪️',
        action: 'decline',
      },
    ],
    effects: [],
    successEffects: [
      {
        type: 'trigger_weather',
        weatherType: 'storm',
        weatherIntensity: 0.7,
        weatherDuration: 35,
      },
      {
        type: 'add_objective',
        objective: {
          id: 'bonus_survive_storm',
          type: 'survive_weather',
          targetId: 'storm',
          description: '成功穿越即将到来的大风暴',
          total: 1,
          rewards: [
            { type: 'exp', value: 80 },
            { type: 'gold', value: 200 },
          ],
        },
      },
      {
        type: 'show_hint',
        hintText: '大风暴即将来袭，准备好应对挑战吧！',
        hintIcon: '⛈️',
        durationMs: 6000,
      },
    ],
    failEffects: [
      {
        type: 'modify_progress',
        progressDelta: -0.05,
      },
    ],
    narrativeText: {
      intro: '远方的天空出现了不祥的征兆，一场考验即将来临。',
      accept: '你决定直面风暴，这将是证明实力的时刻！',
      decline: '你选择了更安全的路线，虽然会耽误一些时间。',
      success: '风暴已经到来，成功穿越将是对你们航海技术的最好证明！',
      fail: '在改变航道的过程中损失了一些时间。',
    },
    autoResolveAfterMs: 20000,
    allowContinueVoyage: true,
  },
  {
    id: 'objective_bonus_discovery',
    type: 'objective_bonus',
    name: '探索机遇',
    description: '水手报告在航线附近发现了一处从未记录过的小岛，也许值得去探索一番。',
    icon: '🏝️',
    rarity: 'rare',
    trigger: {
      minProgress: 0.25,
      maxProgress: 0.9,
      requireMoving: true,
      probabilityWeight: 10,
      cooldown: 140,
      onlyOncePerRoute: true,
      routeTypes: ['secret', 'optional'],
    },
    choices: [
      {
        id: 'bonus_discovery_explore',
        text: '登岛探索',
        description: '派人登岛探索，可能有意外收获',
        icon: '🗺️',
        action: 'investigate',
      },
      {
        id: 'bonus_discovery_record',
        text: '记录位置',
        description: '在海图上标注位置，待日后再探索',
        icon: '📋',
        action: 'accept',
      },
      {
        id: 'bonus_discovery_pass',
        text: '保持航线',
        description: '当前任务优先，不做额外停留',
        icon: '➡️',
        action: 'decline',
      },
    ],
    effects: [],
    successEffects: [
      {
        type: 'add_objective',
        objective: {
          id: 'bonus_discovery_explore',
          type: 'visit',
          targetId: 'any',
          description: '探索未知小岛后抵达下一个航点',
          total: 1,
          rewards: [
            { type: 'supplies', value: 40 },
            { type: 'gold', value: 120 },
            { type: 'exp', value: 35 },
          ],
        },
      },
      {
        type: 'grant_reward',
        rewardItems: [
          { type: 'supplies', amount: 25 },
          { type: 'gold', amount: 60 },
        ],
      },
    ],
    failEffects: [
      {
        type: 'grant_reward',
        rewardItems: [{ type: 'exp', amount: 10 }],
      },
    ],
    narrativeText: {
      intro: '前方发现了一座未在海图上标注的小岛！',
      accept: '你决定先标注位置，以后有机会再来探索。',
      decline: '你决定保持原定航线，不做停留。',
      success: '探索队从小岛带回了不少有用的物资和情报！',
      fail: '探索没有发现太多有价值的东西，但至少记录了位置。',
    },
    autoResolveAfterMs: 22000,
    allowContinueVoyage: true,
  },

  // ==================== 提示交互类事件 ====================
  {
    id: 'navigational_hint_route',
    type: 'navigational_hint',
    name: '老水手的建议',
    description: '船上经验丰富的老水手建议调整一下航线，也许能发现捷径。',
    icon: '🧓',
    rarity: 'common',
    trigger: {
      minProgress: 0.15,
      maxProgress: 0.5,
      requireMoving: true,
      probabilityWeight: 25,
      cooldown: 60,
      onlyOncePerRoute: true,
      routeTypes: ['main', 'alternative'],
    },
    choices: [
      {
        id: 'hint_route_adopt',
        text: '采纳建议',
        description: '按照老水手的建议微调航线',
        icon: '✅',
        action: 'accept',
      },
      {
        id: 'hint_route_ask',
        text: '询问理由',
        description: '请老水手详细解释他的判断依据',
        icon: '❓',
        action: 'investigate',
      },
      {
        id: 'hint_route_decline',
        text: '维持原航线',
        description: '相信领航员的判断，按原计划航行',
        icon: '🎯',
        action: 'decline',
      },
    ],
    effects: [],
    successEffects: [
      {
        type: 'modify_progress',
        progressDelta: 0.06,
      },
      {
        type: 'show_hint',
        hintText: '老水手的经验让你们找到了一条更高效的航线！',
        hintIcon: '🛤️',
        durationMs: 6000,
      },
      {
        type: 'grant_reward',
        rewardItems: [{ type: 'exp', amount: 20 }],
      },
    ],
    failEffects: [
      {
        type: 'grant_reward',
        rewardItems: [{ type: 'exp', amount: 5 }],
      },
    ],
    narrativeText: {
      intro: '老水手眯着眼观察了一会儿海面，提出了他的建议。',
      accept: '你决定相信这位久经风浪的老水手。',
      decline: '你决定还是按原计划航行，毕竟领航员也很专业。',
      success: '经验的价值在此刻体现！航线被缩短了不少。',
      fail: '虽然没有采纳建议，但老水手分享的知识让船员们受益。',
    },
    autoResolveAfterMs: 16000,
    allowContinueVoyage: true,
  },
  {
    id: 'navigational_hint_whale',
    type: 'navigational_hint',
    name: '鲸群出现',
    description: '一群鲸鱼从船边游过，它们迁徙的方向也许暗示着海流的走向。',
    icon: '🐋',
    rarity: 'uncommon',
    trigger: {
      minProgress: 0.2,
      maxProgress: 0.7,
      requireMoving: true,
      probabilityWeight: 16,
      cooldown: 90,
      onlyOncePerRoute: true,
      weatherCondition: 'clear',
      timeOfDayCondition: 'day',
    },
    choices: [
      {
        id: 'hint_whale_follow',
        text: '跟随鲸群',
        description: '沿着鲸群的方向航行，可能有顺流的帮助',
        icon: '🌊',
        action: 'accept',
      },
      {
        id: 'hint_whale_observe',
        text: '观察记录',
        description: '仔细观察鲸群的行为，记录下这片海域的生态',
        icon: '🔭',
        action: 'investigate',
      },
      {
        id: 'hint_whale_avoid',
        text: '保持距离',
        description: '与鲸群保持安全距离，避免惊扰它们',
        icon: '↔️',
        action: 'decline',
      },
    ],
    effects: [],
    successEffects: [
      {
        type: 'modify_speed',
        speedModifier: 1.15,
        durationMs: 30000,
      },
      {
        type: 'show_hint',
        hintText: '顺流而行！航速得到了显著提升！',
        hintIcon: '⚡',
        durationMs: 6000,
      },
    ],
    failEffects: [
      {
        type: 'grant_reward',
        rewardItems: [{ type: 'exp', amount: 15 }],
      },
    ],
    narrativeText: {
      intro: '宏伟的鲸群从船舷边缓缓游过，场面令人惊叹。',
      accept: '你决定跟随着鲸群的方向前进。',
      decline: '你让船只与鲸群保持安全距离，尊重这些美丽的生灵。',
      success: '果然！鲸群带路的方向正是顺流，航行效率大幅提升！',
      fail: '虽然没有跟随鲸群，但你们获得了宝贵的观测数据。',
    },
    autoResolveAfterMs: 18000,
    allowContinueVoyage: true,
  },
  {
    id: 'navigational_hint_shipwreck',
    type: 'navigational_hint',
    name: '海漂残骸',
    description: '海面上漂浮着一些船只残骸，上面可能有有用的线索或物资。',
    icon: '⚓',
    rarity: 'uncommon',
    trigger: {
      minProgress: 0.25,
      maxProgress: 0.75,
      requireMoving: true,
      probabilityWeight: 20,
      cooldown: 80,
      onlyOncePerRoute: false,
    },
    choices: [
      {
        id: 'hint_wreck_retrieve',
        text: '打捞残骸',
        description: '派人打捞漂浮的残骸，也许能找到有用的东西',
        icon: '🪝',
        action: 'investigate',
      },
      {
        id: 'hint_wreck_warn',
        text: '记录警示',
        description: '在海图上标注危险区域，提醒其他船只',
        icon: '⚠️',
        action: 'accept',
      },
      {
        id: 'hint_wreck_pass',
        text: '继续航行',
        description: '不停留，保持航向',
        icon: '➡️',
        action: 'decline',
      },
    ],
    effects: [],
    successEffects: [
      {
        type: 'grant_reward',
        rewardItems: [
          { type: 'supplies', amount: 20 },
          { type: 'gold', amount: 40 },
          { type: 'exp', amount: 25 },
        ],
      },
      {
        type: 'show_hint',
        hintText: '从残骸中找到了一些物资和一张残缺的海图！',
        hintIcon: '📦',
        durationMs: 7000,
      },
    ],
    failEffects: [
      {
        type: 'grant_reward',
        rewardItems: [{ type: 'exp', amount: 8 }],
      },
    ],
    narrativeText: {
      intro: '前方海面散布着一些残骸，似乎是一艘遇难船只的遗物。',
      accept: '你决定在海图上标注这片区域，警示后来者。',
      decline: '你决定不停留，继续执行任务。',
      success: '打捞颇有收获！找到了一些有用的物资！',
      fail: '残骸中没有太多有价值的东西。',
    },
    autoResolveAfterMs: 17000,
    allowContinueVoyage: true,
  },
  {
    id: 'navigational_hint_secret_route',
    type: 'navigational_hint',
    name: '暗流秘密',
    description: '船员注意到了异常的海流变化，这也许是一条隐蔽洋流的入口。',
    icon: '🔮',
    rarity: 'legendary',
    trigger: {
      minProgress: 0.3,
      maxProgress: 0.7,
      requireMoving: true,
      probabilityWeight: 5,
      cooldown: 240,
      onlyOncePerRoute: true,
      routeTypes: ['main', 'secret'],
      minStarsDiscovered: 8,
    },
    choices: [
      {
        id: 'hint_secret_explore',
        text: '探索洋流',
        description: '冒险驶入洋流，看看它通向何方',
        icon: '🌊',
        action: 'investigate',
      },
      {
        id: 'hint_secret_record',
        text: '谨慎记录',
        description: '先记录下海流特征，不贸然深入',
        icon: '📜',
        action: 'accept',
      },
    ],
    effects: [],
    successEffects: [
      {
        type: 'modify_progress',
        progressDelta: 0.15,
      },
      {
        type: 'unlock_route',
      },
      {
        type: 'show_hint',
        hintText: '隐藏洋流！这将大幅缩短你的航程！',
        hintIcon: '🗝️',
        durationMs: 10000,
      },
      {
        type: 'grant_reward',
        rewardItems: [
          { type: 'exp', amount: 100 },
          { type: 'gold', amount: 250 },
        ],
      },
    ],
    failEffects: [
      {
        type: 'modify_progress',
        progressDelta: -0.02,
      },
    ],
    narrativeText: {
      intro: '海面下的暗流异常活跃，这似乎不寻常……',
      accept: '你决定先记录这些特征，以后有机会再来探索。',
      success: '果然是一条隐藏的洋流通道！航程被大大缩短了！',
      fail: '探索过程中遇到了一些困难，损失了少许时间。',
    },
    autoResolveAfterMs: 25000,
    allowContinueVoyage: true,
  },
];

export const getVoyageEventById = (eventId: string): VoyageEventConfig | undefined => {
  return voyageEvents.find(e => e.id === eventId);
};

export const getVoyageEventsByChapter = (chapterId: string): VoyageEventConfig[] => {
  return voyageEvents.filter(event => {
    if (event.chapterIds && event.chapterIds.length > 0) {
      return event.chapterIds.includes(chapterId);
    }
    return true;
  });
};

export const getVoyageEventsByType = (type: string): VoyageEventConfig[] => {
  return voyageEvents.filter(e => e.type === type);
};
