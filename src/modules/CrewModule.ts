import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { GameEngine } from '../core/GameEngine';
import { SupplyModule } from './SupplyModule';
import {
  CrewMember,
  CrewRole,
  CrewRarity,
  CrewSkill,
  CrewRecruitCandidate,
  CrewState,
  CrewEventBonus,
  WeatherType
} from '../types';

const FIRST_NAMES = [
  '李', '王', '张', '陈', '林', '黄', '周', '吴', '郑', '孙',
  '刘', '杨', '赵', '许', '何', '朱', '马', '胡', '郭', '高'
];

const LAST_NAMES = [
  '云飞', '雪晴', '沧海', '星辰', '长风', '明月', '天涯', '远航',
  '朝阳', '暮雪', '清风', '醉月', '孤帆', '远航', '波涛', '浩然',
  '子轩', '文博', '俊杰', '天佑', '沐辰', '雨泽', '奕辰', '梓涵'
];

const AVATAR_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e67e22', '#34495e', '#d35400', '#c0392b',
  '#16a085', '#27ae60', '#2980b9', '#8e44ad', '#f1c40f'
];

const CREW_TRAITS = [
  '坚韧不拔', '航海世家', '星象精通', '天生神力', '巧手匠人',
  '医术高明', '厨艺精湛', '目光如炬', '临危不乱', '鼓舞士气',
  '精打细算', '风之眷顾', '海之宠儿', '夜行能手', '幸运之星'
];

const SKILL_TEMPLATES: Omit<CrewSkill, 'id'>[] = [
  { name: '迅捷操帆', description: '提升航行速度', type: 'speed', value: 0.05 },
  { name: '风暴之子', description: '提升天气抗性', type: 'weather_resist', value: 0.1 },
  { name: '精壮体魄', description: '提升生命恢复', type: 'health', value: 0.05 },
  { name: '节俭持家', description: '减少物资消耗', type: 'supply_save', value: 0.05 },
  { name: '振奋士气', description: '提升士气恢复', type: 'morale', value: 0.05 },
  { name: '观星达人', description: '提升星辰可见度', type: 'star_vision', value: 0.1 },
  { name: '老练舵手', description: '大幅提升航行速度', type: 'speed', value: 0.1 },
  { name: '铁壁铜墙', description: '大幅提升天气抗性', type: 'weather_resist', value: 0.2 },
];

const ROLE_REQUIREMENTS: Record<CrewRole, string> = {
  captain: '船长',
  navigator: '领航员',
  sailor: '水手',
  cook: '厨师',
  doctor: '船医',
  engineer: '轮机师',
  lookout: '瞭望员',
  idle: '待命'
};

const RARITY_CONFIG: Record<CrewRarity, { color: string; skillCount: number; baseStat: number; expMultiplier: number }> = {
  common: { color: '#95a5a6', skillCount: 1, baseStat: 70, expMultiplier: 1 },
  uncommon: { color: '#2ecc71', skillCount: 2, baseStat: 85, expMultiplier: 1.2 },
  rare: { color: '#3498db', skillCount: 2, baseStat: 100, expMultiplier: 1.5 },
  epic: { color: '#9b59b6', skillCount: 3, baseStat: 120, expMultiplier: 2 },
  legendary: { color: '#f39c12', skillCount: 4, baseStat: 150, expMultiplier: 3 },
};

export class CrewModule {
  private static instance: CrewModule;
  private stateManager: GameStateManager;
  private engine: GameEngine;
  private supplyModule: SupplyModule;
  private updateUnsubscriber: (() => void) | null = null;
  private recruitRefreshTimer: number | null = null;
  private initialized: boolean = false;
  private eventHandlerRefs: Array<{ event: string; handler: (...args: any[]) => void }> = [];

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.engine = GameEngine.getInstance();
    this.supplyModule = SupplyModule.getInstance();
  }

  public static getInstance(): CrewModule {
    if (!CrewModule.instance) {
      CrewModule.instance = new CrewModule();
    }
    return CrewModule.instance;
  }

  public initialize(): void {
    this.ensureCrewStateExists();

    if (!this.initialized) {
      this.updateUnsubscriber = this.engine.onUpdate(this.update.bind(this));
      this.startRecruitRefresh();
      this.setupEventListeners();
      this.initialized = true;
    }

    const state = this.stateManager.getState();
    if (state.crew.members.length === 0) {
      this.initializeStarterCrew();
    }
    this.recalculateBonuses();
  }

  public resetState(): void {
    const state = this.stateManager.getState();
    const defaultCrew: CrewState = {
      members: [],
      recruits: [],
      maxCrew: 8,
      gold: 500,
      efficiencyBonuses: {
        speed: 0,
        weatherResist: 0,
        healthRegen: 0,
        supplySave: 0,
        moraleBoost: 0,
        starVision: 0,
      },
    };
    this.stateManager.setState({
      crew: defaultCrew,
      activeCrewBonuses: []
    });

    this.initializeStarterCrew();
    this.recalculateBonuses();
  }

  private ensureCrewStateExists(): void {
    const state = this.stateManager.getState();
    if (!state.crew) {
      const defaultCrew: CrewState = {
        members: [],
        recruits: [],
        maxCrew: 8,
        gold: 500,
        efficiencyBonuses: {
          speed: 0,
          weatherResist: 0,
          healthRegen: 0,
          supplySave: 0,
          moraleBoost: 0,
          starVision: 0,
        },
      };
      this.stateManager.setState({
        crew: defaultCrew,
        activeCrewBonuses: []
      });
    }
  }

  private setupEventListeners(): void {
    this.onceOn('weather:changed', this.onWeatherChanged.bind(this));
    this.onceOn('route:started', this.onRouteStarted.bind(this));
    this.onceOn('route:completed', this.onRouteCompleted.bind(this));
    this.onceOn('point:reached', this.onPointReached.bind(this));
    this.onceOn('chapter:started', this.onChapterStarted.bind(this));
    this.onceOn('crew:recruit', this.recruitCrew.bind(this));
    this.onceOn('crew:assign_role', this.assignRole.bind(this));
    this.onceOn('crew:rest', this.restCrew.bind(this));
    this.onceOn('crew:train', this.trainCrew.bind(this));
    this.onceOn('crew:dismiss', this.dismissCrew.bind(this));
    this.onceOn('crew:add_bonus', this.addEventBonus.bind(this));
  }

  private onceOn<T = unknown>(event: string, handler: (data: T) => void): void {
    this.eventHandlerRefs.push({ event, handler });
    eventBus.on(event, handler);
  }

  private clearAllEventListeners(): void {
    this.eventHandlerRefs.forEach(({ event, handler }) => {
      eventBus.off(event, handler);
    });
    this.eventHandlerRefs = [];
  }

  private initializeStarterCrew(): void {
    const captain = this.generateCrewMember('captain', 'rare');
    captain.name = '林云飞';
    captain.description = '经验丰富的船长，曾多次穿越危险海域';
    captain.traits = ['航海世家', '临危不乱'];

    const navigator = this.generateCrewMember('navigator', 'uncommon');
    navigator.name = '陈星辰';
    navigator.description = '精通星象导航的年轻领航员';
    navigator.traits = ['星象精通', '目光如炬'];

    const sailor1 = this.generateCrewMember('sailor', 'common');
    const sailor2 = this.generateCrewMember('sailor', 'common');
    const cook = this.generateCrewMember('cook', 'common');

    this.addCrewMember(captain);
    this.addCrewMember(navigator);
    this.addCrewMember(sailor1);
    this.addCrewMember(sailor2);
    this.addCrewMember(cook);

    this.refreshRecruits();
  }

  public generateCrewMember(forcedRole?: CrewRole, forcedRarity?: CrewRarity): CrewMember {
    const rarity = forcedRarity || this.rollRarity();
    const rarityConfig = RARITY_CONFIG[rarity];

    const roles: CrewRole[] = ['navigator', 'sailor', 'cook', 'doctor', 'engineer', 'lookout', 'idle'];
    const role = forcedRole || roles[Math.floor(Math.random() * roles.length)];

    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const name = firstName + lastName;

    const avatar = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const skills: CrewSkill[] = [];
    const availableSkills = [...SKILL_TEMPLATES];
    for (let i = 0; i < rarityConfig.skillCount && availableSkills.length > 0; i++) {
      const idx = Math.floor(Math.random() * availableSkills.length);
      const skillTemplate = availableSkills.splice(idx, 1)[0];
      skills.push({
        ...skillTemplate,
        id: `skill_${Date.now()}_${i}`,
        value: skillTemplate.value * (0.8 + Math.random() * 0.5)
      });
    }

    const traits: string[] = [];
    const traitCount = rarity === 'legendary' ? 3 : rarity === 'epic' ? 2 : rarity === 'rare' ? 2 : 1;
    const availableTraits = [...CREW_TRAITS];
    for (let i = 0; i < traitCount && availableTraits.length > 0; i++) {
      const idx = Math.floor(Math.random() * availableTraits.length);
      traits.push(availableTraits.splice(idx, 1)[0]);
    }

    return {
      id: `crew_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      role,
      rarity,
      level: 1,
      exp: 0,
      maxExp: 100,
      fatigue: 0,
      maxFatigue: rarityConfig.baseStat,
      morale: rarityConfig.baseStat,
      maxMorale: rarityConfig.baseStat,
      health: rarityConfig.baseStat,
      maxHealth: rarityConfig.baseStat,
      skills,
      traits,
      avatar,
      description: this.generateDescription(role, rarity),
      hiredAt: Date.now(),
      activeEvents: [],
    };
  }

  private rollRarity(): CrewRarity {
    const roll = Math.random() * 100;
    if (roll < 1) return 'legendary';
    if (roll < 6) return 'epic';
    if (roll < 20) return 'rare';
    if (roll < 50) return 'uncommon';
    return 'common';
  }

  private generateDescription(role: CrewRole, rarity: CrewRarity): string {
    const rarityDesc: Record<CrewRarity, string> = {
      common: '普通的船员，踏实可靠',
      uncommon: '略有经验的船员，身手不凡',
      rare: '出色的船员，各有所长',
      epic: '精英船员，千里挑一',
      legendary: '传奇船员，百年难遇',
    };
    return `${rarityDesc[rarity]}，专长于${ROLE_REQUIREMENTS[role]}`;
  }

  public addCrewMember(member: CrewMember): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };

    if (crew.members.length >= crew.maxCrew) {
      eventBus.emit('toast:show', { message: '船员已满，无法招募更多' });
      return;
    }

    if (crew.members.find(m => m.id === member.id)) {
      return;
    }

    crew.members = [...crew.members, member];
    this.stateManager.setState({ crew });
    this.recalculateBonuses();
    eventBus.emit('crew:updated', crew);
    eventBus.emit('crew:added', member);
  }

  public getCrewMembers(): CrewMember[] {
    return this.stateManager.getState().crew.members;
  }

  public getCrewByRole(role: CrewRole): CrewMember[] {
    return this.getCrewMembers().filter(m => m.role === role);
  }

  public assignRole(data: { crewId: string; role: CrewRole }): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const member = crew.members.find(m => m.id === data.crewId);

    if (!member) return;

    if (data.role === 'captain') {
      const existingCaptain = crew.members.find(m => m.role === 'captain');
      if (existingCaptain && existingCaptain.id !== data.crewId) {
        existingCaptain.role = 'idle';
      }
    }

    member.role = data.role;
    crew.members = [...crew.members];

    this.stateManager.setState({ crew });
    this.recalculateBonuses();
    eventBus.emit('crew:updated', crew);
    eventBus.emit('crew:role_changed', { crewId: data.crewId, role: data.role });
    eventBus.emit('toast:show', { message: `${member.name} 已任命为${ROLE_REQUIREMENTS[data.role]}` });
  }

  public refreshRecruits(): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const recruits: CrewRecruitCandidate[] = [];

    const recruitCount = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < recruitCount; i++) {
      const member = this.generateCrewMember();
      const rarityMultiplier = {
        common: 1,
        uncommon: 2.5,
        rare: 5,
        epic: 12,
        legendary: 30,
      }[member.rarity];

      const goldCost = Math.floor((80 + Math.random() * 40) * rarityMultiplier);
      const suppliesCost = Math.floor((20 + Math.random() * 30) * rarityMultiplier);

      recruits.push({
        id: `recruit_${Date.now()}_${i}`,
        crew: {
          name: member.name,
          role: member.role,
          rarity: member.rarity,
          level: member.level,
          exp: member.exp,
          maxExp: member.maxExp,
          fatigue: member.fatigue,
          maxFatigue: member.maxFatigue,
          morale: member.morale,
          maxMorale: member.maxMorale,
          health: member.health,
          maxHealth: member.maxHealth,
          skills: member.skills,
          traits: member.traits,
          avatar: member.avatar,
          description: member.description,
          hiredAt: member.hiredAt,
          activeEvents: member.activeEvents,
        },
        cost: {
          gold: goldCost,
          supplies: suppliesCost,
        },
        expiresAt: Date.now() + 10 * 60 * 1000,
      });
    }

    crew.recruits = recruits;
    this.stateManager.setState({ crew });
    eventBus.emit('crew:recruits_updated', recruits);
  }

  public recruitCrew(data: { recruitId: string }): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const recruit = crew.recruits.find(r => r.id === data.recruitId);

    if (!recruit) {
      eventBus.emit('toast:show', { message: '招募候选人不存在' });
      return;
    }

    if (crew.members.length >= crew.maxCrew) {
      eventBus.emit('toast:show', { message: '船员已满，无法招募' });
      return;
    }

    if (recruit.cost.gold && crew.gold < recruit.cost.gold) {
      eventBus.emit('toast:show', { message: '金币不足' });
      return;
    }

    if (recruit.cost.supplies) {
      if (!this.supplyModule.consumeSuppliesManual(recruit.cost.supplies, 'crew_recruit')) {
        return;
      }
    }

    if (recruit.cost.gold) {
      crew.gold -= recruit.cost.gold;
    }

    const newMember: CrewMember = {
      id: `crew_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...recruit.crew,
      hiredAt: Date.now(),
    };

    crew.members = [...crew.members, newMember];
    crew.recruits = crew.recruits.filter(r => r.id !== data.recruitId);

    this.stateManager.setState({ crew });
    this.recalculateBonuses();
    eventBus.emit('crew:updated', crew);
    eventBus.emit('crew:recruited', newMember);
    eventBus.emit('toast:show', { message: `成功招募 ${newMember.name}` });
    eventBus.emit('sound:play', 'objective_complete');
  }

  public dismissCrew(data: { crewId: string }): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const member = crew.members.find(m => m.id === data.crewId);

    if (!member) return;

    if (member.role === 'captain') {
      eventBus.emit('toast:show', { message: '不能解雇船长' });
      return;
    }

    crew.members = crew.members.filter(m => m.id !== data.crewId);
    crew.gold += Math.floor(20 * RARITY_CONFIG[member.rarity].baseStat / 70);

    this.stateManager.setState({ crew });
    this.recalculateBonuses();
    eventBus.emit('crew:updated', crew);
    eventBus.emit('crew:dismissed', member);
    eventBus.emit('toast:show', { message: `${member.name} 已离船，获得 ${Math.floor(20 * RARITY_CONFIG[member.rarity].baseStat / 70)} 金币` });
  }

  public restCrew(data?: { crewId: string }): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    let membersToRest: CrewMember[];

    if (data?.crewId) {
      const member = crew.members.find(m => m.id === data.crewId);
      membersToRest = member ? [member] : [];
    } else {
      membersToRest = crew.members;
    }

    const suppliesCost = membersToRest.length * 5;
    if (!this.supplyModule.consumeSuppliesManual(suppliesCost, 'crew_rest')) {
      return;
    }

    membersToRest.forEach(member => {
      member.fatigue = Math.max(0, member.fatigue - member.maxFatigue * 0.3);
      member.morale = Math.min(member.maxMorale, member.morale + member.maxMorale * 0.15);
      member.health = Math.min(member.maxHealth, member.health + member.maxHealth * 0.1);
    });

    crew.members = [...crew.members];
    this.stateManager.setState({ crew });
    eventBus.emit('crew:updated', crew);
    eventBus.emit('crew:rested', { count: membersToRest.length });
    eventBus.emit('toast:show', { message: `船员休息完毕，消耗 ${suppliesCost} 物资` });
  }

  public trainCrew(data: { crewId: string }): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const member = crew.members.find(m => m.id === data.crewId);

    if (!member) return;

    const goldCost = 50 * member.level;
    if (crew.gold < goldCost) {
      eventBus.emit('toast:show', { message: `训练需要 ${goldCost} 金币` });
      return;
    }

    crew.gold -= goldCost;
    member.exp += Math.floor(50 * RARITY_CONFIG[member.rarity].expMultiplier);

    while (member.exp >= member.maxExp) {
      member.exp -= member.maxExp;
      member.level += 1;
      member.maxExp = Math.floor(member.maxExp * 1.5);
      member.maxHealth += 10;
      member.maxFatigue += 5;
      member.maxMorale += 5;
      member.health = member.maxHealth;
      eventBus.emit('crew:level_up', member);
    }

    crew.members = [...crew.members];
    this.stateManager.setState({ crew });
    this.recalculateBonuses();
    eventBus.emit('crew:updated', crew);
    eventBus.emit('sound:play', 'objective_complete');
  }

  public addEventBonus(bonus: Omit<CrewEventBonus, 'eventId'> & { eventId?: string }): void {
    const state = this.stateManager.getState();
    const newBonus: CrewEventBonus = {
      eventId: bonus.eventId || `bonus_${Date.now()}`,
      ...bonus,
    };

    const activeBonuses = [...(state.activeCrewBonuses || []), newBonus];
    this.stateManager.setState({ activeCrewBonuses: activeBonuses });
    this.recalculateBonuses();
    eventBus.emit('crew:bonus_added', newBonus);
    eventBus.emit('toast:show', { message: `获得加成：${newBonus.eventName}` });
  }

  public recalculateBonuses(): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const members = crew.members;

    const bonuses = {
      speed: 0,
      weatherResist: 0,
      healthRegen: 0,
      supplySave: 0,
      moraleBoost: 0,
      starVision: 0,
    };

    const roleMultipliers: Record<CrewRole, Partial<Record<keyof typeof bonuses, number>>> = {
      captain: { speed: 1.5, moraleBoost: 2, weatherResist: 1.2 },
      navigator: { speed: 1.2, starVision: 2 },
      sailor: { speed: 1.3, weatherResist: 1.1 },
      cook: { moraleBoost: 1.5, supplySave: 1.5, healthRegen: 1.2 },
      doctor: { healthRegen: 2.5, moraleBoost: 1.1 },
      engineer: { speed: 1.1, supplySave: 1.3, healthRegen: 1.1 },
      lookout: { starVision: 2, weatherResist: 1.1 },
      idle: {},
    };

    members.forEach(member => {
      if (member.health <= 0) return;

      const efficiencyFactor = this.getMemberEfficiency(member);
      const levelFactor = 1 + (member.level - 1) * 0.05;
      const roleMults = roleMultipliers[member.role] || {};

      member.skills.forEach(skill => {
        const roleMult = roleMults[skill.type as keyof typeof bonuses] || 1;
        const value = skill.value * efficiencyFactor * levelFactor * roleMult;

        switch (skill.type) {
          case 'speed':
            bonuses.speed += value;
            break;
          case 'weather_resist':
            bonuses.weatherResist += value;
            break;
          case 'health':
            bonuses.healthRegen += value;
            break;
          case 'supply_save':
            bonuses.supplySave += value;
            break;
          case 'morale':
            bonuses.moraleBoost += value;
            break;
          case 'star_vision':
            bonuses.starVision += value;
            break;
        }
      });

      if (member.traits.includes('航海世家')) bonuses.speed += 0.03 * efficiencyFactor;
      if (member.traits.includes('风之眷顾')) bonuses.weatherResist += 0.08 * efficiencyFactor;
      if (member.traits.includes('海之宠儿')) bonuses.speed += 0.04 * efficiencyFactor;
      if (member.traits.includes('星象精通')) bonuses.starVision += 0.08 * efficiencyFactor;
      if (member.traits.includes('精打细算')) bonuses.supplySave += 0.06 * efficiencyFactor;
      if (member.traits.includes('鼓舞士气')) bonuses.moraleBoost += 0.06 * efficiencyFactor;
      if (member.traits.includes('医术高明')) bonuses.healthRegen += 0.06 * efficiencyFactor;
      if (member.traits.includes('天生神力')) bonuses.speed += 0.02 * efficiencyFactor;
      if (member.traits.includes('坚韧不拔')) bonuses.weatherResist += 0.04 * efficiencyFactor;
      if (member.traits.includes('目光如炬')) bonuses.starVision += 0.05 * efficiencyFactor;
      if (member.traits.includes('巧手匠人')) bonuses.supplySave += 0.03 * efficiencyFactor;
      if (member.traits.includes('厨艺精湛')) bonuses.moraleBoost += 0.04 * efficiencyFactor;
      if (member.traits.includes('临危不乱')) bonuses.weatherResist += 0.05 * efficiencyFactor;
      if (member.traits.includes('夜行能手')) bonuses.starVision += 0.06 * efficiencyFactor;
      if (member.traits.includes('幸运之星')) {
        bonuses.speed += 0.01;
        bonuses.weatherResist += 0.02;
        bonuses.healthRegen += 0.02;
      }
    });

    const captain = members.find(m => m.role === 'captain');
    if (!captain) {
      bonuses.speed *= 0.6;
      bonuses.weatherResist *= 0.6;
      bonuses.moraleBoost *= 0.5;
    }

    const activeBonuses = state.activeCrewBonuses || [];
    activeBonuses.forEach(bonus => {
      const affectedMembers = bonus.crewIds
        ? members.filter(m => bonus.crewIds!.includes(m.id))
        : members;
      const avgEfficiency = affectedMembers.length > 0
        ? affectedMembers.reduce((sum, m) => sum + this.getMemberEfficiency(m), 0) / affectedMembers.length
        : 0;

      switch (bonus.bonusType) {
        case 'speed':
          bonuses.speed += bonus.value * avgEfficiency;
          break;
        case 'weather_resist':
          bonuses.weatherResist += bonus.value * avgEfficiency;
          break;
        case 'morale':
          bonuses.moraleBoost += bonus.value * avgEfficiency;
          break;
      }
    });

    crew.efficiencyBonuses = bonuses;
    this.stateManager.setState({ crew });
    eventBus.emit('crew:bonuses_updated', bonuses);
  }

  private getMemberEfficiency(member: CrewMember): number {
    const healthFactor = member.health / member.maxHealth;
    const fatigueFactor = 1 - (member.fatigue / member.maxFatigue) * 0.7;
    const moraleFactor = 0.5 + (member.morale / member.maxMorale) * 0.5;
    return Math.max(0.1, healthFactor * fatigueFactor * moraleFactor);
  }

  public getSpeedModifier(): number {
    return 1 + (this.stateManager.getState().crew.efficiencyBonuses?.speed || 0);
  }

  public getWeatherResistModifier(): number {
    return 1 - Math.min(0.8, this.stateManager.getState().crew.efficiencyBonuses?.weatherResist || 0);
  }

  public getSupplySaveModifier(): number {
    return Math.min(0.8, this.stateManager.getState().crew.efficiencyBonuses?.supplySave || 0);
  }

  public getEffectiveWeatherEffects(weather: WeatherType | null): WeatherType['effects'] | null {
    if (!weather) return null;

    const resistMod = this.getWeatherResistModifier();
    const starVisionBonus = this.stateManager.getState().crew.efficiencyBonuses?.starVision || 0;

    return {
      visibility: weather.effects.visibility + (1 - weather.effects.visibility) * (1 - resistMod),
      speedModifier: weather.effects.speedModifier + (1 - weather.effects.speedModifier) * (1 - resistMod),
      starVisibility: Math.min(1, weather.effects.starVisibility + starVisionBonus),
      taskProgressModifier: weather.effects.taskProgressModifier + (1 - weather.effects.taskProgressModifier) * (1 - resistMod),
      supplyConsumptionModifier: 1 + (weather.effects.supplyConsumptionModifier - 1) * resistMod,
      collisionChanceModifier: 1 + (weather.effects.collisionChanceModifier - 1) * resistMod,
    };
  }

  private update(delta: number, elapsed: number): void {
    this.updateFatigue(delta);
    this.updateRegeneration(delta);
    this.updateEventBonuses();
    this.cleanupExpiredRecruits();
  }

  private updateFatigue(delta: number): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const weather = state.activeWeather;
    const isMoving = state.ship.speed > 0.1;

    let needsUpdate = false;
    const fatiguePerSecond = isMoving ? 0.8 : 0.2;
    const weatherPenalty = weather ? weather.intensity * 0.5 : 0;
    const totalFatigueRate = (fatiguePerSecond + weatherPenalty) * delta;

    crew.members.forEach(member => {
      if (member.health <= 0) return;

      const baseFatigue = totalFatigueRate;
      const roleExtra: Record<CrewRole, number> = {
        captain: isMoving ? 0.3 : 0,
        navigator: isMoving ? 0.4 : 0.1,
        sailor: isMoving ? 0.6 : 0.1,
        cook: 0.2,
        doctor: 0.15,
        engineer: isMoving ? 0.25 : 0.1,
        lookout: isMoving ? 0.5 : 0.2,
        idle: 0.05,
      };

      const fatigueGain = baseFatigue * (1 + (roleExtra[member.role] || 0));
      if (fatigueGain > 0) {
        member.fatigue = Math.min(member.maxFatigue, member.fatigue + fatigueGain);
        needsUpdate = true;

        if (member.fatigue >= member.maxFatigue * 0.8 && Math.random() < delta * 0.1) {
          member.morale = Math.max(0, member.morale - delta * 2);
        }
      }
    });

    if (needsUpdate) {
      crew.members = [...crew.members];
      this.stateManager.setState({ crew });
      this.recalculateBonuses();
    }
  }

  private updateRegeneration(delta: number): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const bonuses = crew.efficiencyBonuses;
    const isPaused = !state.ship || state.ship.speed < 0.1;

    let needsUpdate = false;
    const healthRegenRate = (bonuses?.healthRegen || 0) * delta * (isPaused ? 2 : 0.5);
    const moraleBoostRate = (bonuses?.moraleBoost || 0) * delta * (isPaused ? 2 : 0.3);

    crew.members.forEach(member => {
      if (member.health <= 0) return;

      if (healthRegenRate > 0 && member.health < member.maxHealth) {
        member.health = Math.min(member.maxHealth, member.health + healthRegenRate * member.maxHealth);
        needsUpdate = true;
      }

      if (moraleBoostRate > 0 && member.morale < member.maxMorale) {
        member.morale = Math.min(member.maxMorale, member.morale + moraleBoostRate * member.maxMorale);
        needsUpdate = true;
      }

      if (isPaused && member.fatigue > 0) {
        member.fatigue = Math.max(0, member.fatigue - delta * 1.5);
        needsUpdate = true;
      }
    });

    if (needsUpdate) {
      crew.members = [...crew.members];
      this.stateManager.setState({ crew });
      this.recalculateBonuses();
    }
  }

  private updateEventBonuses(): void {
    const state = this.stateManager.getState();
    const bonuses = state.activeCrewBonuses || [];
    const now = Date.now();

    const validBonuses = bonuses.filter(b => !b.expiresAt || b.expiresAt > now);
    if (validBonuses.length !== bonuses.length) {
      this.stateManager.setState({ activeCrewBonuses: validBonuses });
      this.recalculateBonuses();
    }
  }

  private cleanupExpiredRecruits(): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    const now = Date.now();

    const validRecruits = crew.recruits.filter(r => r.expiresAt > now);
    if (validRecruits.length !== crew.recruits.length) {
      crew.recruits = validRecruits;
      this.stateManager.setState({ crew });
      eventBus.emit('crew:recruits_updated', crew.recruits);
    }
  }

  private startRecruitRefresh(): void {
    if (this.recruitRefreshTimer !== null) {
      clearInterval(this.recruitRefreshTimer);
    }
    this.recruitRefreshTimer = window.setInterval(() => {
      this.refreshRecruits();
    }, 5 * 60 * 1000);
  }

  private onWeatherChanged(weather: WeatherType | null): void {
    if (weather) {
      const intensity = weather.intensity;

      if (intensity > 0.6) {
        this.addEventBonus({
          eventId: `weather_storm_${Date.now()}`,
          eventName: '风暴考验',
          bonusType: 'weather_resist',
          value: 0,
          expiresAt: Date.now() + 60000,
        });

        const state = this.stateManager.getState();
        const crew = { ...state.crew };
        crew.members.forEach(member => {
          if (member.health > 0) {
            member.health = Math.max(0, member.health - intensity * 3);
            member.morale = Math.max(0, member.morale - intensity * 2);
            if (Math.random() < intensity * 0.2) {
              member.activeEvents = [...member.activeEvents, 'injured'];
            }
          }
        });
        crew.members = [...crew.members];
        this.stateManager.setState({ crew });
        this.recalculateBonuses();
      }
    }
  }

  private onRouteStarted(): void {
    this.addEventBonus({
      eventName: '启航激励',
      bonusType: 'speed',
      value: 0.1,
      expiresAt: Date.now() + 30000,
    });
  }

  private onRouteCompleted(): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };

    crew.members.forEach(member => {
      if (member.health > 0) {
        const expGain = Math.floor(30 * RARITY_CONFIG[member.rarity].expMultiplier);
        member.exp += expGain;

        while (member.exp >= member.maxExp) {
          member.exp -= member.maxExp;
          member.level += 1;
          member.maxExp = Math.floor(member.maxExp * 1.5);
          member.maxHealth += 10;
          member.maxFatigue += 5;
          member.maxMorale += 5;
          member.health = member.maxHealth;
          eventBus.emit('crew:level_up', member);
          eventBus.emit('toast:show', { message: `🎉 ${member.name} 升级到 ${member.level} 级！` });
        }

        member.morale = Math.min(member.maxMorale, member.morale + 10);
      }
    });

    crew.gold += 100;
    crew.members = [...crew.members];
    this.stateManager.setState({ crew });
    this.recalculateBonuses();
    eventBus.emit('crew:updated', crew);
  }

  private onPointReached(): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    crew.gold += 20;
    crew.members.forEach(member => {
      if (member.health > 0) {
        member.exp += 10;
      }
    });
    crew.members = [...crew.members];
    this.stateManager.setState({ crew });
    this.recalculateBonuses();
  }

  private onChapterStarted(): void {
    this.refreshRecruits();
    this.addEventBonus({
      eventName: '新篇章',
      bonusType: 'morale',
      value: 0.2,
      expiresAt: Date.now() + 120000,
    });
  }

  public serialize(): any {
    const state = this.stateManager.getState();
    return {
      crew: state.crew,
      activeCrewBonuses: state.activeCrewBonuses,
    };
  }

  public deserialize(data: any): void {
    if (!data) return;

    if (data.crew) {
      this.stateManager.setState({ crew: data.crew });
    }
    if (data.activeCrewBonuses) {
      this.stateManager.setState({ activeCrewBonuses: data.activeCrewBonuses });
    }
    this.recalculateBonuses();
  }

  public addGold(amount: number): void {
    const state = this.stateManager.getState();
    const crew = { ...state.crew };
    crew.gold += amount;
    this.stateManager.setState({ crew });
    eventBus.emit('crew:updated', crew);
  }

  public getRarityConfig(rarity: CrewRarity) {
    return RARITY_CONFIG[rarity];
  }

  public getRoleName(role: CrewRole): string {
    return ROLE_REQUIREMENTS[role];
  }

  public dispose(): void {
    if (this.updateUnsubscriber) {
      this.updateUnsubscriber();
      this.updateUnsubscriber = null;
    }
    if (this.recruitRefreshTimer) {
      clearInterval(this.recruitRefreshTimer);
      this.recruitRefreshTimer = null;
    }
    this.clearAllEventListeners();
    this.initialized = false;
  }
}
