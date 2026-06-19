import { DialogueSequence } from '../types';

export const dialogues: DialogueSequence[] = [
  {
    id: 'ch1-opening',
    trigger: 'chapter_open',
    triggerTarget: 'chapter-1',
    priority: 100,
    repeatable: false,
    startNodeId: 'ch1-n1',
    nodes: [
      {
        id: 'ch1-n1',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '年轻人，欢迎登上"晨曦号"。从今夜起，你便是我们新的观星航海士了。',
        nextNodeId: 'ch1-n2',
        audio: { sfx: 'dialogue_appear' }
      },
      {
        id: 'ch1-n2',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '看那边——北方的天穹上，七颗星辰排成了一个勺子的形状。那便是"北斗七星"，千百年来指引着无数航海者归家的方向。',
        nextNodeId: 'ch1-n3',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch1-n3',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '我记住了。我要做的，就是找到那些星辰，把它们连接成星座，对吗？',
        nextNodeId: 'ch1-n4',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch1-n4',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '没错。不过观星可不是简单地看星星。你需要亲自点亮它们——点击星辰去发现它，然后进入"连接模式"，把属于同一星座的星辰连在一起。',
        nextNodeId: 'ch1-n5',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch1-n5',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '去吧，今夜的天穹属于你。先从发现"北辰"开始吧——那是北斗七星中最明亮的一颗。',
        effects: [{ type: 'flag', key: 'ch1_tutorial_done', value: true }],
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' }
      }
    ]
  },
  {
    id: 'ch1-first-star',
    trigger: 'event_insert',
    triggerTarget: 'star_discovered',
    priority: 50,
    repeatable: false,
    condition: { flag: 'ch1_tutorial_done', flagValue: true },
    startNodeId: 'ch1-star-n1',
    nodes: [
      {
        id: 'ch1-star-n1',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '做得好！你看到了吗？当一颗星辰被发现时，它的光芒会变得更加清晰。这就是观星者与天空之间的共鸣。',
        nextNodeId: 'ch1-star-n2',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch1-star-n2',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '现在，试试进入"连接模式"，把属于同一星座的星辰连在一起。北斗的七颗星正等着你将它们联系起来。',
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' }
      }
    ]
  },
  {
    id: 'ch1-constellation',
    trigger: 'event_insert',
    triggerTarget: 'constellation_discovered',
    priority: 50,
    repeatable: false,
    startNodeId: 'ch1-cons-n1',
    nodes: [
      {
        id: 'ch1-cons-n1',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '不可思议！北斗七星被你完整地连接了！千百年来，这个星座一直是北方航海者的指路明灯。',
        nextNodeId: 'ch1-cons-n2',
        audio: { sfx: 'dialogue_next', music: 'exploration' }
      },
      {
        id: 'ch1-cons-n2',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '记住这种感觉——当你将星辰连成星座的那一刻，天空仿佛在向你诉说什么。继续前进吧，完成剩余的任务，回到归航港。',
        effects: [{ type: 'flag', key: 'ch1_constellation_done', value: true }],
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' }
      }
    ]
  },
  {
    id: 'ch2-opening',
    trigger: 'chapter_open',
    triggerTarget: 'chapter-2',
    priority: 100,
    repeatable: false,
    startNodeId: 'ch2-n1',
    nodes: [
      {
        id: 'ch2-n1',
        speaker: '神秘女子',
        speakerTitle: '？？？',
        text: '……你终于来了。我在雾中等了很久。',
        nextNodeId: 'ch2-n2',
        audio: { sfx: 'dialogue_appear', music: 'exploration', ambient: 'wind' }
      },
      {
        id: 'ch2-n2',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '你是谁？你怎么会在这片浓雾中？',
        nextNodeId: 'ch2-n3',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch2-n3',
        speaker: '神秘女子',
        speakerTitle: '星之守望者',
        text: '我是星之守望者。这片雾海是星辰的试炼之地——只有能看穿迷雾、识别隐藏星座的航海士，才能找到通往"星之岛"的航路。',
        nextNodeId: 'ch2-branch1',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch2-branch1',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '在我指引你之前，我必须知道——你为何而航？',
        choices: [
          {
            id: 'ch2-c1',
            text: '为了探索未知的海域和星辰',
            nextNodeId: 'ch2-explore',
            effects: [{ type: 'flag', key: 'ch2_motive', value: 'exploration' }]
          },
          {
            id: 'ch2-c2',
            text: '为了保护同伴，找到安全的归途',
            nextNodeId: 'ch2-protect',
            effects: [
              { type: 'flag', key: 'ch2_motive', value: 'protection' },
              { type: 'ship', key: 'supplies', value: 10 }
            ]
          },
          {
            id: 'ch2-c3',
            text: '为了追求力量和传说中星之岛的宝藏',
            nextNodeId: 'ch2-power',
            effects: [
              { type: 'flag', key: 'ch2_motive', value: 'power' },
              { type: 'crew', key: 'gold', value: 100 }
            ]
          }
        ],
        audio: { sfx: 'dialogue_choice' }
      },
      {
        id: 'ch2-explore',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '好奇心是航海者最宝贵的品质。雾海之上的星辰虽被遮蔽，但只要你用心去看，它们的光芒终将穿透迷雾。',
        nextNodeId: 'ch2-final',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch2-protect',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '守护之心……很好。这片雾海会考验你的决心。作为回应，我在你的船舱中留下了一些补给。照顾好你的同伴。',
        nextNodeId: 'ch2-final',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch2-power',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '力量并非罪恶，但追逐力量的路上充满诱惑。我在你的行囊中放入了一些金币——但愿你能善用它。',
        nextNodeId: 'ch2-final',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch2-final',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '天琴座与猎户座隐匿在雾海之中。找到它们，连接它们，星之岛的航路便会向你展开。去吧——愿星辰指引你的方向。',
        effects: [{ type: 'flag', key: 'ch2_quest_given', value: true }],
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' }
      }
    ]
  },
  {
    id: 'ch2-fog-warning',
    trigger: 'weather_change',
    triggerTarget: 'fog',
    priority: 30,
    repeatable: true,
    condition: { flag: 'ch2_quest_given', flagValue: true },
    startNodeId: 'ch2-fog-n1',
    nodes: [
      {
        id: 'ch2-fog-n1',
        speaker: '瞭望手',
        speakerTitle: '晨曦号·瞭望',
        text: '航海士！浓雾正在靠近，能见度急剧下降！星辰的光芒快要看不见了！',
        nextNodeId: 'ch2-fog-n2',
        audio: { sfx: 'dialogue_appear' }
      },
      {
        id: 'ch2-fog-n2',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '冷静。我们已经在雾海中航行了，这正是试炼的一部分。继续沿着航路前进，注意观察每一个航标。',
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' }
      }
    ]
  },
  {
    id: 'ch2-storm-choice',
    trigger: 'weather_change',
    triggerTarget: 'storm',
    priority: 60,
    repeatable: false,
    condition: { flag: 'ch2_quest_given', flagValue: true },
    startNodeId: 'ch2-storm-n1',
    nodes: [
      {
        id: 'ch2-storm-n1',
        speaker: '瞭望手',
        speakerTitle: '晨曦号·瞭望',
        text: '暴风雨来了！浪高已经超过了船舷！航海士，我们该怎么办？',
        choices: [
          {
            id: 'ch2-storm-c1',
            text: '迎风航行，冲过风暴！',
            nextNodeId: 'ch2-storm-brave',
            effects: [
              { type: 'ship', key: 'health', value: -15 },
              { type: 'flag', key: 'ch2_storm_choice', value: 'brave' }
            ]
          },
          {
            id: 'ch2-storm-c2',
            text: '寻找避风港，等风暴过去再前进',
            nextNodeId: 'ch2-storm-cautious',
            effects: [
              { type: 'ship', key: 'supplies', value: -10 },
              { type: 'flag', key: 'ch2_storm_choice', value: 'cautious' }
            ]
          }
        ],
        audio: { sfx: 'dialogue_appear' }
      },
      {
        id: 'ch2-storm-brave',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '好气魄！全体注意，收紧帆缆——我们冲过去！虽然船体受了些损伤，但我们赢得了宝贵的时间！',
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' }
      },
      {
        id: 'ch2-storm-cautious',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '稳妥之策。虽然多消耗了些物资，但船员们都平安。风暴终将过去，而我们仍在。',
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' }
      }
    ]
  },
  {
    id: 'ch3-opening',
    trigger: 'chapter_open',
    triggerTarget: 'chapter-3',
    priority: 100,
    repeatable: false,
    startNodeId: 'ch3-n1',
    nodes: [
      {
        id: 'ch3-n1',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '航海士，我们已经到达了传说中的"风暴之海"。从这里开始，天空将不再仁慈。',
        nextNodeId: 'ch3-n2',
        audio: { sfx: 'dialogue_appear', music: 'exploration' }
      },
      {
        id: 'ch3-n2',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '你再次来到了我面前。风暴之海的尽头，有一颗能指引所有航海士回家的星星——南十字星。',
        nextNodeId: 'ch3-n3',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch3-n3',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '但在此之前，你必须做出选择。',
        nextNodeId: 'ch3-branch1',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch3-branch1',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '前方有两条航路。一条穿越风暴中心，危险但更短；另一条沿岛屿边缘绕行，安全却漫长。你如何选择？',
        choices: [
          {
            id: 'ch3-c1',
            text: '穿越风暴中心——我要直面考验',
            nextNodeId: 'ch3-direct',
            effects: [
              { type: 'flag', key: 'ch3_route', value: 'direct' },
              { type: 'ship', key: 'speed', value: 3 }
            ]
          },
          {
            id: 'ch3-c2',
            text: '沿岛屿绕行——稳扎稳打，不冒无谓的风险',
            nextNodeId: 'ch3-safe',
            effects: [
              { type: 'flag', key: 'ch3_route', value: 'safe' },
              { type: 'ship', key: 'supplies', value: -15 }
            ]
          }
        ],
        audio: { sfx: 'dialogue_choice' }
      },
      {
        id: 'ch3-direct',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '明白了。升起主帆，全速前进！风暴虽猛，但晨曦号不会退缩！船速已提升，但风暴会带来更大的考验。',
        nextNodeId: 'ch3-final',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch3-safe',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '安全第一。我们沿着岛屿边缘前进，虽然路途更远、物资消耗更多，但至少能避开最猛烈的风暴。',
        nextNodeId: 'ch3-final',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch3-final',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '无论你选择哪条路，记住——南十字座、大犬座和御夫座隐藏在这片天穹之中。找到它们，你就能找到回家的路。愿星辰永远照耀你的航途。',
        effects: [{ type: 'flag', key: 'ch3_quest_given', value: true }],
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' }
      }
    ]
  },
  {
    id: 'ch3-storm-warn',
    trigger: 'weather_change',
    triggerTarget: 'storm',
    priority: 40,
    repeatable: true,
    condition: { flag: 'ch3_quest_given', flagValue: true },
    startNodeId: 'ch3-sw-n1',
    nodes: [
      {
        id: 'ch3-sw-n1',
        speaker: '瞭望手',
        speakerTitle: '晨曦号·瞭望',
        text: '航海士！前方又出现风暴了！这次的风浪比之前更猛烈！',
        nextNodeId: 'ch3-sw-n2',
        audio: { sfx: 'dialogue_appear' }
      },
      {
        id: 'ch3-sw-n2',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '稳住船身，保持航向！我们已经穿越过风暴，这次也不会例外。',
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' }
      }
    ]
  },
  {
    id: 'ch3-midway',
    trigger: 'event_insert',
    triggerTarget: 'midway',
    priority: 40,
    repeatable: false,
    condition: { flag: 'ch3_route', flagValue: 'direct' },
    startNodeId: 'ch3-mid-n1',
    nodes: [
      {
        id: 'ch3-mid-n1',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '航海士，我们正处于风暴的中心！但你看——在风暴的间隙中，星辰的光芒格外璀璨！',
        nextNodeId: 'ch3-mid-n2',
        audio: { sfx: 'dialogue_appear' }
      },
      {
        id: 'ch3-mid-n2',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '这正是我们发现星辰的最佳时机！风暴越是猛烈，穿过云层的星光就越清晰。让我看看……',
        nextNodeId: null,
        effects: [{ type: 'flag', key: 'ch3_storm_vision', value: true }],
        audio: { sfx: 'dialogue_close' }
      }
    ]
  },
  {
    id: 'ch3-ending',
    trigger: 'objective_complete',
    triggerTarget: 'all',
    priority: 100,
    repeatable: false,
    condition: { flag: 'ch3_quest_given', flagValue: true },
    startNodeId: 'ch3-end-n1',
    nodes: [
      {
        id: 'ch3-end-n1',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '你找到了南十字星……我等这一刻，已经等了千年。',
        nextNodeId: 'ch3-end-n2',
        audio: { sfx: 'dialogue_appear', music: 'exploration' }
      },
      {
        id: 'ch3-end-n2',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '从今以后，无论你航行到世界的哪个角落，南十字星都会为你指引归途。你已不再是普通的航海士——你是真正的观星者。',
        nextNodeId: 'ch3-end-n3',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'ch3-end-n3',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '航海士……谢谢你。这趟航程，是我这辈子最难忘的旅程。无论未来前方有什么在等待，晨曦号永远听从你的号令。',
        effects: [
          { type: 'flag', key: 'game_completed', value: true },
          { type: 'crew', key: 'gold', value: 200 }
        ],
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' }
      }
    ]
  }
];
