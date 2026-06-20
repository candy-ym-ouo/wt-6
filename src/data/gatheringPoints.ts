import { GatheringPointConfig } from '../types';

export const gatheringPoints: GatheringPointConfig[] = [
  {
    id: 'gather_fish_1',
    routePointId: 'point-1-2',
    name: '富饶渔场',
    description: '这片海域鱼类资源丰富，是补充给养的好地方。',
    type: 'fishing',
    icon: '🎣',
    gatherTime: 5,
    cooldown: 30,
    successRate: 0.85,
    rewards: [
      { type: 'supplies', value: 'supplies', amount: 15, rarity: 'common' },
      { type: 'gold', value: 'gold', amount: 20, rarity: 'uncommon' },
    ],
    chapterIds: ['chapter-1'],
    maxGatherCount: 3,
  },
  {
    id: 'gather_forage_1',
    routePointId: 'point-1-3',
    name: '神秘海岛',
    description: '一座无人居住的小岛，岛上似乎有一些可采集的资源。',
    type: 'foraging',
    icon: '🌴',
    gatherTime: 8,
    cooldown: 60,
    successRate: 0.75,
    rewards: [
      { type: 'supplies', value: 'supplies', amount: 25, rarity: 'common' },
      { type: 'health', value: 'health', amount: 10, rarity: 'uncommon' },
      { type: 'clue', value: 'clue_island_secret', rarity: 'rare' },
    ],
    chapterIds: ['chapter-1'],
    clueId: 'clue_island_secret',
  },
  {
    id: 'gather_mine_1',
    routePointId: 'point-2-2',
    name: '礁石矿脉',
    description: '这片礁石区似乎蕴含着珍贵的矿物资源。',
    type: 'mining',
    icon: '⛏️',
    gatherTime: 10,
    cooldown: 120,
    successRate: 0.6,
    requiredSupplies: 5,
    rewards: [
      { type: 'gold', value: 'gold', amount: 80, rarity: 'uncommon' },
      { type: 'supplies', value: 'supplies', amount: 10, rarity: 'common' },
    ],
    chapterIds: ['chapter-2'],
    maxGatherCount: 2,
  },
  {
    id: 'gather_explore_1',
    routePointId: 'point-2-3',
    name: '古代遗迹',
    description: '古老的文明遗迹，探索它可能会发现重要的线索。',
    type: 'exploration',
    icon: '🏛️',
    gatherTime: 15,
    cooldown: 180,
    successRate: 0.5,
    requiredSupplies: 10,
    rewards: [
      { type: 'gold', value: 'gold', amount: 150, rarity: 'rare' },
      { type: 'codex_entry', value: 'codex_ancient_ruins', rarity: 'epic' },
      { type: 'clue', value: 'clue_ancient_map', rarity: 'legendary' },
    ],
    chapterIds: ['chapter-2'],
    clueId: 'clue_ancient_map',
    unlockCondition: {
      minStarsDiscovered: 5,
    },
  },
  {
    id: 'gather_ruins_1',
    routePointId: 'point-3-2',
    name: '沉船残骸',
    description: '一艘古老的商船残骸，里面可能还有值钱的货物。',
    type: 'trade_ruins',
    icon: '🚢',
    gatherTime: 12,
    cooldown: 150,
    successRate: 0.65,
    requiredSupplies: 8,
    requiredCrewRole: 'sailor',
    rewards: [
      { type: 'gold', value: 'gold', amount: 200, rarity: 'rare' },
      { type: 'supplies', value: 'supplies', amount: 30, rarity: 'uncommon' },
      { type: 'codex_entry', value: 'codex_sunken_ship', rarity: 'rare' },
    ],
    chapterIds: ['chapter-3'],
    maxGatherCount: 1,
  },
  {
    id: 'gather_fish_2',
    routePointId: 'point-3-3',
    name: '深海渔区',
    description: '传说这里有珍稀的深海鱼类，能卖出好价钱。',
    type: 'fishing',
    icon: '🐟',
    gatherTime: 8,
    cooldown: 45,
    successRate: 0.7,
    rewards: [
      { type: 'supplies', value: 'supplies', amount: 20, rarity: 'common' },
      { type: 'gold', value: 'gold', amount: 100, rarity: 'rare' },
    ],
    chapterIds: ['chapter-3'],
    unlockCondition: {
      minConstellationsDiscovered: 1,
    },
  },
  {
    id: 'gather_explore_2',
    routePointId: 'point-1-4',
    name: '观星台遗址',
    description: '古代天文学家建造的观星台，这里可能隐藏着星辰的秘密。',
    type: 'exploration',
    icon: '🔭',
    gatherTime: 12,
    cooldown: 90,
    successRate: 0.7,
    rewards: [
      { type: 'star', value: 'star-1-5', rarity: 'rare' },
      { type: 'codex_entry', value: 'codex_ancient_astronomy', rarity: 'epic' },
      { type: 'exp', value: 'exp', amount: 50, rarity: 'uncommon' },
    ],
    chapterIds: ['chapter-1'],
    unlockCondition: {
      minStarsDiscovered: 3,
    },
  },
  {
    id: 'gather_forage_2',
    routePointId: 'point-2-4',
    name: '草药山谷',
    description: '山谷中生长着珍贵的药草，能够修复船只损伤。',
    type: 'foraging',
    icon: '🌿',
    gatherTime: 6,
    cooldown: 40,
    successRate: 0.8,
    requiredCrewRole: 'doctor',
    rewards: [
      { type: 'health', value: 'health', amount: 25, rarity: 'uncommon' },
      { type: 'supplies', value: 'supplies', amount: 15, rarity: 'common' },
    ],
    chapterIds: ['chapter-2'],
  },
];

export function getGatheringPointById(id: string): GatheringPointConfig | undefined {
  return gatheringPoints.find(p => p.id === id);
}

export function getGatheringPointsForChapter(chapterId: string): GatheringPointConfig[] {
  return gatheringPoints.filter(p => 
    !p.chapterIds || p.chapterIds.includes(chapterId)
  );
}

export function getGatheringPointsForRoutePoint(routePointId: string): GatheringPointConfig[] {
  return gatheringPoints.filter(p => p.routePointId === routePointId);
}

export function getAllGatheringPoints(): GatheringPointConfig[] {
  return [...gatheringPoints];
}
