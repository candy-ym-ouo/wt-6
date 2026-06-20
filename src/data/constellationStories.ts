import { ConstellationStorySequence } from '../types';

export const constellationStories: ConstellationStorySequence[] = [
  {
    id: 'story-cons-1',
    constellationId: 'cons-1',
    constellationName: '北斗七星',
    chapterId: 'chapter-1',
    title: '北斗之誓',
    subtitle: '北方天空的永恒指引',
    icon: '🌟',
    repeatable: true,
    startNodeId: 'cons1-n1',
    nodes: [
      {
        id: 'cons1-n1',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '你做到了！北斗七星的七颗亮星在你的手下连成了一个完整的勺子形状。',
        nextNodeId: 'cons1-n2',
        audio: { sfx: 'dialogue_appear', music: 'exploration' },
        visual: { constellationHighlight: true, starEffect: 'sparkle' }
      },
      {
        id: 'cons1-n2',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '千年前，我们的祖先就是依靠这七颗星的指引，在茫茫大海中找到了归家的方向。',
        nextNodeId: 'cons1-n3',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons1-n3',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '它们看起来如此普通，却承载着这么厚重的历史……',
        nextNodeId: 'cons1-n4',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons1-n4',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '星光从来不会自己说话。是航海者们，在一次次生死攸关的航行中，赋予了它们意义。',
        nextNodeId: 'cons1-n5',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons1-n5',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '北辰为轴心，玄枢定方位，天玑测距离，天权辨时辰，玉衡量远近，开阳察风向，摇光判晴雨。',
        nextNodeId: 'cons1-n6',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons1-n6',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '记住它们的名字。从今往后，它们也会记住你的名字——因为你是又一个将它们连成星座的观星者。',
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' },
        visual: { starEffect: 'constellation_form' }
      }
    ]
  },
  {
    id: 'story-cons-2-1',
    constellationId: 'cons-2-1',
    constellationName: '天琴座',
    chapterId: 'chapter-2',
    title: '银河织梦',
    subtitle: '跨越星海的千年守望',
    icon: '🎵',
    repeatable: true,
    startNodeId: 'cons21-n1',
    nodes: [
      {
        id: 'cons21-n1',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '天琴座……织女星的光芒终于在你的指尖绽放了。',
        nextNodeId: 'cons21-n2',
        audio: { sfx: 'dialogue_appear', music: 'exploration' },
        visual: { constellationHighlight: true, starEffect: 'sparkle' }
      },
      {
        id: 'cons21-n2',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '传说中，织女星本是天界的公主，因为爱上了凡间的牵牛星，被王母用银河隔开。',
        nextNodeId: 'cons21-n3',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons21-n3',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '所以每年七夕，喜鹊会搭桥让他们相见……这个故事我从小就听过。',
        nextNodeId: 'cons21-n4',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons21-n4',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '但是你知道吗？在航海者的版本里，银河不是惩罚的鸿沟，而是试炼的航路。',
        nextNodeId: 'cons21-n5',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons21-n5',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '织女星夜夜在银河西岸闪烁，不是在等待鹊桥——而是在等待一个能看穿迷雾、用星辰搭桥的航海士。',
        nextNodeId: 'cons21-n6',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons21-n6',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '而你，就是那个穿越了雾海、用心灵连接星辰的人。天琴座的旋律，今夜只为你奏响。',
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' },
        visual: { starEffect: 'music_notes' }
      }
    ]
  },
  {
    id: 'story-cons-2-2',
    constellationId: 'cons-2-2',
    constellationName: '猎户座',
    chapterId: 'chapter-2',
    title: '猎人之威',
    subtitle: '守护夜海的威武身影',
    icon: '🏹',
    repeatable: true,
    startNodeId: 'cons22-n1',
    nodes: [
      {
        id: 'cons22-n1',
        speaker: '瞭望手',
        speakerTitle: '晨曦号·瞭望',
        text: '航海士！东南方的天空中，那个巨大的人形星座……是猎户座！',
        nextNodeId: 'cons22-n2',
        audio: { sfx: 'dialogue_appear', music: 'exploration' },
        visual: { constellationHighlight: true, starEffect: 'sparkle' }
      },
      {
        id: 'cons22-n2',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '猎户座……猎人奥利翁的化身。据说他生前是最伟大的猎人，能徒手搏杀任何猛兽。',
        nextNodeId: 'cons22-n3',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons22-n3',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '他腰间那三颗连成一线的星——"猎户腰带"，是我们航海者判断方位的另一个重要标志。',
        nextNodeId: 'cons22-n4',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons22-n4',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '那颗橙红色的亮星……是参宿四吗？它的颜色好特别。',
        nextNodeId: 'cons22-n5',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons22-n5',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '好眼力！参宿四是一颗红超巨星，它的体积大到能装下数百个太阳。航海者们称它为"风暴之眼"。',
        nextNodeId: 'cons22-n6',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons22-n6',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '当参宿四的光芒变得昏暗时，就意味着海上将有大风暴。记住这位猎人的警示——它永远在守护着夜航的人。',
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' },
        visual: { starEffect: 'hunter_pose' }
      }
    ]
  },
  {
    id: 'story-cons-3-1',
    constellationId: 'cons-3-1',
    constellationName: '南十字座',
    chapterId: 'chapter-3',
    title: '归途十字',
    subtitle: '所有航海士的永恒归宿',
    icon: '✝️',
    repeatable: true,
    startNodeId: 'cons31-n1',
    unlockCondition: {
      requiredConstellationIds: ['cons-1', 'cons-2-1', 'cons-2-2']
    },
    nodes: [
      {
        id: 'cons31-n1',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '……你找到了。南十字星。',
        nextNodeId: 'cons31-n2',
        audio: { sfx: 'dialogue_appear', music: 'exploration' },
        visual: { constellationHighlight: true, starEffect: 'divine_light' }
      },
      {
        id: 'cons31-n2',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '我在这片风暴之海等了千年。等一个能从北方的北斗、穿越雾海的天琴与猎户、最终抵达这里的观星者。',
        nextNodeId: 'cons31-n3',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons31-n3',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '为什么……要等我？',
        nextNodeId: 'cons31-n4',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons31-n4',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '因为南十字座的使命，就是为所有迷途的航海士指引归途。但只有真正理解星辰的人，才能激活它的力量。',
        nextNodeId: 'cons31-n5',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons31-n5',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '航海士……你看！南十字的五颗星正在向我们的船投射光芒！船舵……自己在转动！',
        nextNodeId: 'cons31-n6',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons31-n6',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '从今以后，无论你航行到世界的哪个角落，南十字座都会在南方的天空为你指引方向。回家的路，永远不会迷失。',
        nextNodeId: 'cons31-n7',
        audio: { sfx: 'dialogue_next' },
        visual: { starEffect: 'guiding_light' }
      },
      {
        id: 'cons31-n7',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '谢谢你……星之守望者。也谢谢你们——每一颗为我闪耀的星辰。',
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' }
      }
    ]
  },
  {
    id: 'story-cons-3-2',
    constellationId: 'cons-3-2',
    constellationName: '大犬座',
    chapterId: 'chapter-3',
    title: '天狼忠魂',
    subtitle: '猎人身边最忠实的伙伴',
    icon: '🐕',
    repeatable: true,
    startNodeId: 'cons32-n1',
    nodes: [
      {
        id: 'cons32-n1',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '天狼星！那是大犬座的主星——整个夜空中最亮的恒星！',
        nextNodeId: 'cons32-n2',
        audio: { sfx: 'dialogue_appear', music: 'exploration' },
        visual: { constellationHighlight: true, starEffect: 'sparkle' }
      },
      {
        id: 'cons32-n2',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '传说大犬座是猎人奥利翁最忠实的猎犬。主人升上天空之后，它也追随着来到了天界。',
        nextNodeId: 'cons32-n3',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons32-n3',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '所以猎户座和大犬座总是一起出现在天空中？',
        nextNodeId: 'cons32-n4',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons32-n4',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '没错。而且对于我们航海者来说，天狼星还有更重要的意义——它的"偕日升"预示着尼罗河的泛滥，也预示着新一年航行季节的开始。',
        nextNodeId: 'cons32-n5',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons32-n5',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '看到天狼星在船头前方闪耀时，老船长们都会说："最亮的星，指引最勇敢的船。"',
        nextNodeId: 'cons32-n6',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons32-n6',
        speaker: '老舵手',
        speakerTitle: '晨曦号·航海长',
        text: '继续前进吧，航海士。天狼的光芒正为你而亮。',
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' },
        visual: { starEffect: 'dog_bark' }
      }
    ]
  },
  {
    id: 'story-cons-3-3',
    constellationId: 'cons-3-3',
    constellationName: '御夫座',
    chapterId: 'chapter-3',
    title: '御者之车',
    subtitle: '承载希望的天界马车',
    icon: '🛒',
    repeatable: true,
    startNodeId: 'cons33-n1',
    nodes: [
      {
        id: 'cons33-n1',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '那个五边形的星座……是御夫座吗？它的形状真的像一辆马车。',
        nextNodeId: 'cons33-n2',
        audio: { sfx: 'dialogue_appear', music: 'exploration' },
        visual: { constellationHighlight: true, starEffect: 'sparkle' }
      },
      {
        id: 'cons33-n2',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '御夫是雅典王的儿子埃里克托尼俄斯。他发明了四马战车，因此被宙斯升上天空。',
        nextNodeId: 'cons33-n3',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons33-n3',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '但御夫座还有一个更古老的名字——"载星者"。传说它承载着所有航海者的愿望，在夜空中缓缓行驶。',
        nextNodeId: 'cons33-n4',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons33-n4',
        speaker: '你',
        speakerTitle: '晨曦号·观星航海士',
        text: '载星者……承载愿望……那么我的愿望，也会被这辆马车承载吗？',
        nextNodeId: 'cons33-n5',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons33-n5',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '你已经连接了那么多星座，点亮了那么多星辰。你的愿望，比任何人都更有资格被承载。',
        nextNodeId: 'cons33-n6',
        audio: { sfx: 'dialogue_next' }
      },
      {
        id: 'cons33-n6',
        speaker: '星之守望者',
        speakerTitle: '星之守望者',
        text: '看——御夫座中最亮的"五车二"正在向你眨眼。那是马车在回应你。它会带着你的愿望，穿越千年的夜空。',
        nextNodeId: null,
        audio: { sfx: 'dialogue_close' },
        visual: { starEffect: 'chariot_move' }
      }
    ]
  }
];

export const getConstellationStory = (constellationId: string): ConstellationStorySequence | undefined => {
  return constellationStories.find(s => s.constellationId === constellationId);
};

export const getStoriesByChapter = (chapterId: string): ConstellationStorySequence[] => {
  return constellationStories.filter(s => s.chapterId === chapterId);
};

export const getAllConstellationStories = (): ConstellationStorySequence[] => {
  return [...constellationStories];
};
