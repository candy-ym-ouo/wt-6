import { Achievement } from '../types';

export const achievements: Achievement[] = [
  {
    id: 'ach_star_first',
    name: '初窥星穹',
    description: '发现你的第一颗星辰',
    category: 'star',
    rarity: 'common',
    icon: '⭐',
    targetCount: 1,
    reward: { type: 'gold', value: 50 }
  },
  {
    id: 'ach_star_5',
    name: '星之探索者',
    description: '发现5颗星辰',
    category: 'star',
    rarity: 'common',
    icon: '🌟',
    targetCount: 5,
    reward: { type: 'gold', value: 100 }
  },
  {
    id: 'ach_star_15',
    name: '星辰收集家',
    description: '发现15颗星辰',
    category: 'star',
    rarity: 'uncommon',
    icon: '✨',
    targetCount: 15,
    reward: { type: 'gold', value: 200 }
  },
  {
    id: 'ach_star_30',
    name: '观星大师',
    description: '发现30颗星辰',
    category: 'star',
    rarity: 'rare',
    icon: '💫',
    targetCount: 30,
    reward: { type: 'gold', value: 500 }
  },
  {
    id: 'ach_star_all',
    name: '星海征服者',
    description: '发现所有星辰',
    category: 'star',
    rarity: 'legendary',
    icon: '🌌',
    targetCount: 35,
    reward: { type: 'gold', value: 2000 }
  },
  {
    id: 'ach_constellation_first',
    name: '星座初成',
    description: '连接你的第一个星座',
    category: 'constellation',
    rarity: 'common',
    icon: '🔯',
    targetCount: 1,
    reward: { type: 'gold', value: 100 }
  },
  {
    id: 'ach_constellation_3',
    name: '星座绘制者',
    description: '连接3个星座',
    category: 'constellation',
    rarity: 'uncommon',
    icon: '✡️',
    targetCount: 3,
    reward: { type: 'gold', value: 300 }
  },
  {
    id: 'ach_constellation_all',
    name: '星图大师',
    description: '连接所有星座',
    category: 'constellation',
    rarity: 'epic',
    icon: '🌠',
    targetCount: 6,
    reward: { type: 'gold', value: 1000 }
  },
  {
    id: 'ach_constellation_bigdipper',
    name: '北斗指引',
    description: '连接北斗七星',
    category: 'constellation',
    rarity: 'uncommon',
    icon: '🐻',
    targetId: 'cons-1',
    targetCount: 1,
    reward: { type: 'supplies', value: 50 }
  },
  {
    id: 'ach_constellation_lyra',
    name: '天琴之音',
    description: '连接天琴座',
    category: 'constellation',
    rarity: 'uncommon',
    icon: '🎵',
    targetId: 'cons-2-1',
    targetCount: 1,
    reward: { type: 'supplies', value: 50 }
  },
  {
    id: 'ach_constellation_orion',
    name: '猎人之魂',
    description: '连接猎户座',
    category: 'constellation',
    rarity: 'uncommon',
    icon: '🏹',
    targetId: 'cons-2-2',
    targetCount: 1,
    reward: { type: 'supplies', value: 50 }
  },
  {
    id: 'ach_constellation_southerncross',
    name: '南十字之光',
    description: '连接南十字座',
    category: 'constellation',
    rarity: 'rare',
    icon: '✝️',
    targetId: 'cons-3-1',
    targetCount: 1,
    reward: { type: 'gold', value: 200 }
  },
  {
    id: 'ach_waypoint_first',
    name: '初次着陆',
    description: '到达第一个航点',
    category: 'waypoint',
    rarity: 'common',
    icon: '⚓',
    targetCount: 1,
    reward: { type: 'supplies', value: 30 }
  },
  {
    id: 'ach_waypoint_5',
    name: '航路先锋',
    description: '到达5个航点',
    category: 'waypoint',
    rarity: 'common',
    icon: '🧭',
    targetCount: 5,
    reward: { type: 'supplies', value: 50 }
  },
  {
    id: 'ach_waypoint_10',
    name: '老练航海家',
    description: '到达10个航点',
    category: 'waypoint',
    rarity: 'uncommon',
    icon: '🏝️',
    targetCount: 10,
    reward: { type: 'gold', value: 200 }
  },
  {
    id: 'ach_waypoint_all',
    name: '航路征服者',
    description: '到达所有航点',
    category: 'waypoint',
    rarity: 'epic',
    icon: '🗺️',
    targetCount: 13,
    reward: { type: 'gold', value: 800 }
  },
  {
    id: 'ach_chapter_1',
    name: '星之初航',
    description: '完成第一章《星之初航》',
    category: 'chapter',
    rarity: 'common',
    icon: '🚢',
    targetId: 'chapter-1',
    targetCount: 1,
    reward: { type: 'gold', value: 200 }
  },
  {
    id: 'ach_chapter_2',
    name: '雾海破迷',
    description: '完成第二章《雾海迷途》',
    category: 'chapter',
    rarity: 'uncommon',
    icon: '🌫️',
    targetId: 'chapter-2',
    targetCount: 1,
    reward: { type: 'gold', value: 400 }
  },
  {
    id: 'ach_chapter_3',
    name: '风暴勇者',
    description: '完成第三章《风暴之海》',
    category: 'chapter',
    rarity: 'rare',
    icon: '⛈️',
    targetId: 'chapter-3',
    targetCount: 1,
    reward: { type: 'gold', value: 600 }
  },
  {
    id: 'ach_chapter_all',
    name: '传奇航海士',
    description: '完成所有章节',
    category: 'chapter',
    rarity: 'legendary',
    icon: '👑',
    targetCount: 3,
    reward: { type: 'gold', value: 3000 }
  },
  {
    id: 'ach_collection_starchapter1',
    name: '第一章星图',
    description: '收集第一章所有星辰',
    category: 'collection',
    rarity: 'uncommon',
    icon: '📜',
    targetId: 'chapter-1-stars',
    targetCount: 10,
    reward: { type: 'exp', value: 100 }
  },
  {
    id: 'ach_collection_starchapter2',
    name: '第二章星图',
    description: '收集第二章所有星辰',
    category: 'collection',
    rarity: 'rare',
    icon: '📜',
    targetId: 'chapter-2-stars',
    targetCount: 14,
    reward: { type: 'exp', value: 200 }
  },
  {
    id: 'ach_collection_starchapter3',
    name: '第三章星图',
    description: '收集第三章所有星辰',
    category: 'collection',
    rarity: 'epic',
    icon: '📜',
    targetId: 'chapter-3-stars',
    targetCount: 15,
    reward: { type: 'exp', value: 300 }
  },
  {
    id: 'ach_special_storm_survivor',
    name: '风暴幸存者',
    description: '在3次风暴中存活',
    category: 'special',
    rarity: 'rare',
    icon: '🌪️',
    targetId: 'storm_survived',
    targetCount: 3,
    reward: { type: 'gold', value: 300 }
  },
  {
    id: 'ach_special_meteor_watcher',
    name: '流星雨观测者',
    description: '观看2次流星雨',
    category: 'special',
    rarity: 'uncommon',
    icon: '☄️',
    targetId: 'meteor_watched',
    targetCount: 2,
    reward: { type: 'supplies', value: 30 }
  },
  {
    id: 'ach_special_speed_demon',
    name: '疾风之舟',
    description: '航速达到20节',
    category: 'special',
    rarity: 'uncommon',
    icon: '💨',
    targetId: 'max_speed',
    targetCount: 20,
    reward: { type: 'gold', value: 150 }
  },
  {
    id: 'ach_special_playtime_1h',
    name: '航海新手',
    description: '累计航行1小时',
    category: 'special',
    rarity: 'common',
    icon: '⏱️',
    targetId: 'playtime',
    targetCount: 3600,
    reward: { type: 'gold', value: 100 }
  },
  {
    id: 'ach_special_playtime_5h',
    name: '资深航海士',
    description: '累计航行5小时',
    category: 'special',
    rarity: 'rare',
    icon: '⏰',
    targetId: 'playtime',
    targetCount: 18000,
    reward: { type: 'gold', value: 500 }
  },
  {
    id: 'ach_special_rich',
    name: '富甲一方',
    description: '持有金币达到2000',
    category: 'special',
    rarity: 'rare',
    icon: '💰',
    targetId: 'max_gold',
    targetCount: 2000,
    reward: { type: 'supplies', value: 100 }
  },
  {
    id: 'ach_special_crew_full',
    name: '人强马壮',
    description: '船员数量达到上限',
    category: 'special',
    rarity: 'epic',
    icon: '👨‍✈️',
    targetId: 'crew_max',
    targetCount: 8,
    reward: { type: 'gold', value: 500 }
  }
];

export const getAchievementById = (id: string): Achievement | undefined => {
  return achievements.find(a => a.id === id);
};

export const getAchievementsByCategory = (category: string): Achievement[] => {
  return achievements.filter(a => a.category === category);
};
