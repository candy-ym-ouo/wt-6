import { ChapterReplayConfig, ChallengeCondition, InheritOption, ReplayReward } from '../types';

export const DEFAULT_INHERIT_OPTIONS: InheritOption[] = [
  {
    type: 'stars',
    name: '继承星辰发现',
    description: '保留已发现的星辰，无需重新探索',
    icon: '⭐',
    enabled: true,
    impactScore: true,
  },
  {
    type: 'constellations',
    name: '继承星座连接',
    description: '保留已连接的星座进度',
    icon: '🔯',
    enabled: true,
    impactScore: true,
  },
  {
    type: 'visited_points',
    name: '继承航点记录',
    description: '保留已访问的航点进度',
    icon: '⚓',
    enabled: true,
    impactScore: false,
  },
  {
    type: 'crew_levels',
    name: '继承船员等级',
    description: '保留船员等级和经验',
    icon: '👨‍✈️',
    enabled: true,
    impactScore: false,
  },
  {
    type: 'gold',
    name: '继承金币',
    description: '保留当前金币数量',
    icon: '💰',
    enabled: false,
    impactScore: false,
  },
  {
    type: 'supplies',
    name: '继承补给',
    description: '保留当前补给数量',
    icon: '📦',
    enabled: false,
    impactScore: false,
  },
  {
    type: 'codex',
    name: '继承图鉴',
    description: '保留图鉴解锁进度',
    icon: '📖',
    enabled: true,
    impactScore: false,
  },
  {
    type: 'achievements',
    name: '继承成就',
    description: '保留成就解锁状态',
    icon: '🏆',
    enabled: true,
    impactScore: false,
  },
];

export const DEFAULT_CHALLENGES: ChallengeCondition[] = [
  {
    type: 'time_limit',
    name: '限时挑战',
    description: '在限定时间内完成章节',
    icon: '⏱️',
    difficulty: 'medium',
    value: 300,
    rewardMultiplier: 1.5,
  },
  {
    type: 'no_damage',
    name: '无伤航行',
    description: '全程不受到任何伤害',
    icon: '🛡️',
    difficulty: 'hard',
    rewardMultiplier: 2.0,
  },
  {
    type: 'limited_supplies',
    name: '补给限制',
    description: '使用有限的补给完成航行',
    icon: '📦',
    difficulty: 'medium',
    value: 50,
    rewardMultiplier: 1.5,
  },
  {
    type: 'speed_run',
    name: '极速航行',
    description: '最快速度完成章节',
    icon: '💨',
    difficulty: 'easy',
    rewardMultiplier: 1.2,
  },
  {
    type: 'perfect_score',
    name: '完美评分',
    description: '获得S级评分',
    icon: '💎',
    difficulty: 'legendary',
    rewardMultiplier: 3.0,
  },
  {
    type: 'hard_mode',
    name: '困难模式',
    description: '天气更恶劣，危险更多',
    icon: '⚔️',
    difficulty: 'hard',
    rewardMultiplier: 2.0,
  },
  {
    type: 'low_visibility',
    name: '低能见度',
    description: '视野范围大幅降低',
    icon: '🌫️',
    difficulty: 'medium',
    rewardMultiplier: 1.5,
  },
  {
    type: 'no_constellation_hint',
    name: '星座盲连',
    description: '不显示星座连线提示',
    icon: '🔍',
    difficulty: 'easy',
    rewardMultiplier: 1.2,
  },
];

export const chapterReplayConfigs: ChapterReplayConfig[] = [
  {
    chapterId: 'chapter-1',
    canReplay: true,
    maxReplayCount: 10,
    inheritOptions: DEFAULT_INHERIT_OPTIONS,
    challenges: DEFAULT_CHALLENGES.filter(c => 
      c.type !== 'hard_mode' && c.type !== 'low_visibility'
    ),
    replayRewards: [
      { type: 'gold', amount: 50, rarity: 'common' },
      { type: 'exp', amount: 30, rarity: 'common' },
      {
        type: 'gold',
        amount: 100,
        rarity: 'uncommon',
        condition: { minGrade: 'A' },
      },
      {
        type: 'exp',
        amount: 80,
        rarity: 'uncommon',
        condition: { minGrade: 'A' },
      },
      {
        type: 'gold',
        amount: 200,
        rarity: 'rare',
        condition: { minGrade: 'S' },
      },
      {
        type: 'exp',
        amount: 150,
        rarity: 'rare',
        condition: { minGrade: 'S' },
      },
    ],
    firstClearRewards: [
      { type: 'gold', amount: 200, rarity: 'common' },
      { type: 'exp', amount: 100, rarity: 'common' },
      { type: 'supplies', amount: 50, rarity: 'common' },
    ],
    scoreBonusPerReplay: 0,
  },
  {
    chapterId: 'chapter-2',
    canReplay: true,
    maxReplayCount: 10,
    inheritOptions: DEFAULT_INHERIT_OPTIONS,
    challenges: DEFAULT_CHALLENGES,
    replayRewards: [
      { type: 'gold', amount: 80, rarity: 'common' },
      { type: 'exp', amount: 50, rarity: 'common' },
      {
        type: 'gold',
        amount: 150,
        rarity: 'uncommon',
        condition: { minGrade: 'A' },
      },
      {
        type: 'exp',
        amount: 100,
        rarity: 'uncommon',
        condition: { minGrade: 'A' },
      },
      {
        type: 'gold',
        amount: 300,
        rarity: 'rare',
        condition: { minGrade: 'S' },
      },
      {
        type: 'exp',
        amount: 200,
        rarity: 'rare',
        condition: { minGrade: 'S' },
      },
      {
        type: 'special_item',
        amount: 1,
        value: 'star_compass',
        rarity: 'epic',
        condition: { allChallenges: true },
      },
    ],
    firstClearRewards: [
      { type: 'gold', amount: 400, rarity: 'common' },
      { type: 'exp', amount: 200, rarity: 'common' },
      { type: 'supplies', amount: 80, rarity: 'common' },
    ],
    scoreBonusPerReplay: 2,
  },
  {
    chapterId: 'chapter-3',
    canReplay: true,
    maxReplayCount: 10,
    inheritOptions: DEFAULT_INHERIT_OPTIONS,
    challenges: DEFAULT_CHALLENGES,
    replayRewards: [
      { type: 'gold', amount: 120, rarity: 'common' },
      { type: 'exp', amount: 80, rarity: 'common' },
      {
        type: 'gold',
        amount: 200,
        rarity: 'uncommon',
        condition: { minGrade: 'A' },
      },
      {
        type: 'exp',
        amount: 150,
        rarity: 'uncommon',
        condition: { minGrade: 'A' },
      },
      {
        type: 'gold',
        amount: 500,
        rarity: 'rare',
        condition: { minGrade: 'S' },
      },
      {
        type: 'exp',
        amount: 300,
        rarity: 'rare',
        condition: { minGrade: 'S' },
      },
      {
        type: 'special_item',
        amount: 1,
        value: 'captain_badge',
        rarity: 'legendary',
        condition: { allChallenges: true },
      },
    ],
    firstClearRewards: [
      { type: 'gold', amount: 600, rarity: 'common' },
      { type: 'exp', amount: 300, rarity: 'common' },
      { type: 'supplies', amount: 100, rarity: 'common' },
    ],
    scoreBonusPerReplay: 5,
  },
];

export const getReplayConfig = (chapterId: string): ChapterReplayConfig | undefined => {
  return chapterReplayConfigs.find(c => c.chapterId === chapterId);
};

export const getChallengeByType = (type: string): ChallengeCondition | undefined => {
  return DEFAULT_CHALLENGES.find(c => c.type === type);
};

export const getInheritOptionByType = (type: string): InheritOption | undefined => {
  return DEFAULT_INHERIT_OPTIONS.find(o => o.type === type);
};
