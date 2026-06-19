import { GameStateManager } from '../core/GameStateManager';
import { eventBus } from '../utils/EventBus';
import { GameEngine } from '../core/GameEngine';
import {
  TradeItem,
  PortTradeItem,
  Port,
  TradeState,
  TradeItemCategory
} from '../types';

const TRADE_ITEMS: TradeItem[] = [
  {
    id: 'supply_food',
    name: '干粮',
    description: '基础补给品，可恢复船员士气',
    category: 'supply',
    basePrice: 20,
    priceCurrency: 'gold',
    icon: '🍞',
    maxStock: 50,
    effects: { type: 'supplies', value: 10 }
  },
  {
    id: 'supply_water',
    name: '淡水',
    description: '纯净的饮用水，航行必需品',
    category: 'supply',
    basePrice: 15,
    priceCurrency: 'gold',
    icon: '💧',
    maxStock: 40,
    effects: { type: 'supplies', value: 8 }
  },
  {
    id: 'supply_medicine',
    name: '药材',
    description: '珍贵的药材，可治疗船员伤病',
    category: 'supply',
    basePrice: 80,
    priceCurrency: 'gold',
    icon: '💊',
    maxStock: 20,
    effects: { type: 'health', value: 30 }
  },
  {
    id: 'supply_rum',
    name: '朗姆酒',
    description: '能大幅提升士气的美酒',
    category: 'supply',
    basePrice: 50,
    priceCurrency: 'gold',
    icon: '🍾',
    maxStock: 15,
    effects: { type: 'morale', value: 25 }
  },
  {
    id: 'material_wood',
    name: '木材',
    description: '优质木材，可用于修船',
    category: 'material',
    basePrice: 30,
    priceCurrency: 'gold',
    icon: '🪵',
    maxStock: 30
  },
  {
    id: 'material_cloth',
    name: '帆布',
    description: '结实的帆布，用于制作船帆',
    category: 'material',
    basePrice: 45,
    priceCurrency: 'gold',
    icon: '🧵',
    maxStock: 25
  },
  {
    id: 'material_iron',
    name: '铁矿石',
    description: '珍贵的铁矿石，打造工具的原料',
    category: 'material',
    basePrice: 100,
    priceCurrency: 'gold',
    icon: '⛏️',
    maxStock: 15
  },
  {
    id: 'special_compass',
    name: '精制罗盘',
    description: '精美的罗盘，提升导航效率',
    category: 'special',
    basePrice: 200,
    priceCurrency: 'gold',
    icon: '🧭',
    maxStock: 3,
    effects: { type: 'speed', value: 0.05 }
  },
  {
    id: 'special_sextant',
    name: '六分仪',
    description: '精密的六分仪，提升星辰观测能力',
    category: 'special',
    basePrice: 300,
    priceCurrency: 'gold',
    icon: '🔭',
    maxStock: 2
  },
  {
    id: 'chapter_key_2',
    name: '第二章海图',
    description: '通往第二章的神秘海图',
    category: 'chapter_unlock',
    basePrice: 500,
    priceCurrency: 'gold',
    icon: '🗺️',
    maxStock: 1,
    unlockChapter: 'chapter-2',
    effects: { type: 'chapter_unlock', value: 1 }
  },
  {
    id: 'chapter_key_3',
    name: '第三章航海志',
    description: '记载着第三章航路的古老航海志',
    category: 'chapter_unlock',
    basePrice: 800,
    priceCurrency: 'gold',
    icon: '📜',
    maxStock: 1,
    unlockChapter: 'chapter-3',
    effects: { type: 'chapter_unlock', value: 1 }
  }
];

const PORTS: Port[] = [
  {
    id: 'port_start',
    name: '起航港',
    description: '旅程开始的地方，一个宁静的小港口',
    routePointId: 'point-start',
    type: 'small',
    items: ['supply_food', 'supply_water', 'supply_rum', 'material_wood'],
    priceModifier: 1.0,
    refreshInterval: 60000
  },
  {
    id: 'port_stargaze',
    name: '观星台集市',
    description: '观星爱好者聚集的地方，有些特别的物品',
    routePointId: 'point-1',
    type: 'medium',
    items: ['supply_food', 'supply_water', 'supply_medicine', 'material_cloth'],
    specialItems: ['special_sextant'],
    priceModifier: 1.1,
    refreshInterval: 90000
  },
  {
    id: 'port_beidou',
    name: '北斗湾贸易站',
    description: '繁华的贸易中心，物资丰富多样',
    routePointId: 'point-2',
    type: 'large',
    items: ['supply_food', 'supply_water', 'supply_medicine', 'supply_rum', 
            'material_wood', 'material_cloth', 'material_iron'],
    specialItems: ['special_compass', 'chapter_key_2'],
    priceModifier: 0.9,
    refreshInterval: 45000
  },
  {
    id: 'port_end',
    name: '归航港',
    description: '航线的终点，什么都能买到',
    routePointId: 'point-end',
    type: 'large',
    items: ['supply_food', 'supply_water', 'supply_medicine', 'supply_rum',
            'material_wood', 'material_cloth', 'material_iron',
            'special_compass', 'special_sextant'],
    specialItems: ['chapter_key_3'],
    priceModifier: 1.0,
    refreshInterval: 30000
  }
];

export class TradeModule {
  private static instance: TradeModule;
  private stateManager: GameStateManager;
  private engine: GameEngine;
  private updateUnsubscriber: (() => void) | null = null;
  private initialized: boolean = false;
  private eventHandlerRefs: Array<{ event: string; handler: (...args: any[]) => void }> = [];
  private tradeItems: Map<string, TradeItem> = new Map();
  private ports: Map<string, Port> = new Map();

  private constructor() {
    this.stateManager = GameStateManager.getInstance();
    this.engine = GameEngine.getInstance();
    
    TRADE_ITEMS.forEach(item => this.tradeItems.set(item.id, item));
    PORTS.forEach(port => this.ports.set(port.id, port));
  }

  public static getInstance(): TradeModule {
    if (!TradeModule.instance) {
      TradeModule.instance = new TradeModule();
    }
    return TradeModule.instance;
  }

  public initialize(): void {
    this.ensureTradeStateExists();

    if (!this.initialized) {
      this.updateUnsubscriber = this.engine.onUpdate(this.update.bind(this));
      this.setupEventListeners();
      this.initialized = true;
    }
  }

  public resetState(): void {
    const defaultTrade: TradeState = this.getDefaultTradeState();
    this.stateManager.setState({ trade: defaultTrade });
  }

  private getDefaultTradeState(): TradeState {
    return {
      currentPortId: null,
      portPrices: {},
      lastRefreshTime: {},
      priceHistory: {},
      inventory: {},
      unlockedChapterItems: []
    };
  }

  private ensureTradeStateExists(): void {
    const state = this.stateManager.getState();
    if (!state.trade) {
      this.stateManager.setState({ trade: this.getDefaultTradeState() });
    }
  }

  private setupEventListeners(): void {
    this.onceOn('point:reached', this.onPointReached.bind(this));
    this.onceOn('port:open', this.openPort.bind(this));
    this.onceOn('port:buy', this.buyItem.bind(this));
    this.onceOn('port:sell', this.sellItem.bind(this));
    this.onceOn('port:refresh', this.refreshPortPrices.bind(this));
    this.onceOn('chapter:started', this.onChapterStarted.bind(this));
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

  private onPointReached(pointId: string): void {
    const port = this.findPortByRoutePoint(pointId);
    if (port) {
      this.refreshPortPricesIfNeeded(port.id);
      eventBus.emit('port:available', port);
    }
  }

  private onChapterStarted(): void {
    const state = this.stateManager.getState();
    const chapterId = state.currentChapterId;
    
    if (chapterId) {
      const unlockedItems = TRADE_ITEMS
        .filter(item => item.category === 'chapter_unlock' && item.unlockChapter && item.unlockChapter !== chapterId)
        .map(item => item.id);
      
      const trade = { ...state.trade };
      unlockedItems.forEach(itemId => {
        if (!trade.unlockedChapterItems.includes(itemId)) {
          trade.unlockedChapterItems.push(itemId);
        }
      });
      this.stateManager.setState({ trade });
    }
  }

  public findPortByRoutePoint(routePointId: string): Port | undefined {
    return Array.from(this.ports.values()).find(p => p.routePointId === routePointId);
  }

  public getPort(portId: string): Port | undefined {
    return this.ports.get(portId);
  }

  public getAllPorts(): Port[] {
    return Array.from(this.ports.values());
  }

  public getTradeItem(itemId: string): TradeItem | undefined {
    return this.tradeItems.get(itemId);
  }

  public getPortItems(portId: string): PortTradeItem[] {
    const state = this.stateManager.getState();
    return state.trade.portPrices[portId] || [];
  }

  public getInventory(): Record<string, number> {
    const state = this.stateManager.getState();
    return { ...state.trade.inventory };
  }

  public getItemCount(itemId: string): number {
    const state = this.stateManager.getState();
    return state.trade.inventory[itemId] || 0;
  }

  private refreshPortPricesIfNeeded(portId: string): void {
    const state = this.stateManager.getState();
    const port = this.ports.get(portId);
    if (!port) return;

    const lastRefresh = state.trade.lastRefreshTime[portId] || 0;
    const now = Date.now();

    if (now - lastRefresh >= port.refreshInterval || !state.trade.portPrices[portId]) {
      this.refreshPortPrices(portId);
    }
  }

  public refreshPortPrices(portId: string | { portId?: string }): void {
    const id = typeof portId === 'string' ? portId : portId.portId;
    if (!id) return;

    const state = this.stateManager.getState();
    const port = this.ports.get(id);
    if (!port) return;

    const trade = { ...state.trade };
    const portItems: PortTradeItem[] = [];

    const allItemIds = [...port.items];
    if (port.specialItems) {
      allItemIds.push(...port.specialItems);
    }

    allItemIds.forEach(itemId => {
      const item = this.tradeItems.get(itemId);
      if (!item) return;

      if (item.category === 'chapter_unlock') {
        if (trade.unlockedChapterItems.includes(itemId)) {
          return;
        }
      }

      const priceFluctuation = 0.7 + Math.random() * 0.6;
      const currentPrice = Math.round(item.basePrice * port.priceModifier * priceFluctuation);
      
      const maxStock = item.maxStock || 99;
      const currentStock = item.category === 'chapter_unlock' ? 1 : (Math.floor(Math.random() * maxStock * 0.7) + Math.floor(maxStock * 0.3));

      const history = trade.priceHistory[itemId] || [];
      const prevPrice = history.length > 0 ? history[history.length - 1] : item.basePrice;
      const trend: 'up' | 'down' | 'stable' = 
        currentPrice > prevPrice * 1.05 ? 'up' : 
        currentPrice < prevPrice * 0.95 ? 'down' : 'stable';

      portItems.push({
        ...item,
        currentPrice,
        currentStock,
        priceTrend: trend
      });

      history.push(currentPrice);
      if (history.length > 10) history.shift();
      trade.priceHistory[itemId] = history;
    });

    trade.portPrices[id] = portItems;
    trade.lastRefreshTime[id] = Date.now();

    this.stateManager.setState({ trade });
    eventBus.emit('port:prices_updated', { portId: id, items: portItems });
  }

  public openPort(portId: string): void {
    const port = this.ports.get(portId);
    if (!port) {
      eventBus.emit('toast:show', { message: '港口不存在' });
      return;
    }

    this.refreshPortPrices(portId);
    
    const state = this.stateManager.getState();
    const trade = { ...state.trade, currentPortId: portId };
    this.stateManager.setState({ trade });
    
    eventBus.emit('port:opened', port);
  }

  public closePort(): void {
    const state = this.stateManager.getState();
    const trade = { ...state.trade, currentPortId: null };
    this.stateManager.setState({ trade });
    eventBus.emit('port:closed');
  }

  public buyItem(data: { itemId: string; quantity: number }): void {
    const { itemId, quantity } = data;
    const state = this.stateManager.getState();
    const portId = state.trade.currentPortId;

    if (!portId) {
      eventBus.emit('toast:show', { message: '请先打开港口' });
      return;
    }

    const portItems = state.trade.portPrices[portId];
    const portItem = portItems?.find(i => i.id === itemId);

    if (!portItem) {
      eventBus.emit('toast:show', { message: '商品不存在' });
      return;
    }

    if (portItem.currentStock < quantity) {
      eventBus.emit('toast:show', { message: '库存不足' });
      return;
    }

    const totalCost = portItem.currentPrice * quantity;
    const crew = { ...state.crew };

    if (portItem.priceCurrency === 'gold') {
      if (crew.gold < totalCost) {
        eventBus.emit('toast:show', { message: '金币不足' });
        return;
      }
      crew.gold -= totalCost;
    } else {
      if (state.ship.supplies < totalCost) {
        eventBus.emit('toast:show', { message: '物资不足' });
        return;
      }
      this.stateManager.updateShip({
        supplies: state.ship.supplies - totalCost
      });
    }

    const trade = { ...state.trade };
    trade.inventory = { ...trade.inventory };
    trade.unlockedChapterItems = [...trade.unlockedChapterItems];

    if (portItem.category === 'chapter_unlock') {
      if (!trade.unlockedChapterItems.includes(itemId)) {
        trade.unlockedChapterItems.push(itemId);
      }
    } else {
      trade.inventory[itemId] = (trade.inventory[itemId] || 0) + quantity;
    }

    const itemIndex = portItems.findIndex(i => i.id === itemId);
    if (itemIndex > -1) {
      const newPortItems = [...portItems];
      if (portItem.category === 'chapter_unlock') {
        newPortItems.splice(itemIndex, 1);
      } else {
        newPortItems[itemIndex] = { ...portItem, currentStock: portItem.currentStock - quantity };
      }
      trade.portPrices = { ...trade.portPrices, [portId]: newPortItems };
    }

    if (portItem.category === 'chapter_unlock' && portItem.unlockChapter) {
      const targetChapterId = portItem.unlockChapter;
      eventBus.emit('chapter:unlock', targetChapterId);
      
      const item = this.tradeItems.get(itemId);
      const chapterName = item?.name || targetChapterId;
      eventBus.emit('toast:show', { message: `🗺️ 使用了${chapterName}，新章节已解锁！` });
    } else {
      this.applyItemEffects(portItem, quantity);
    }

    if (portItem.priceCurrency === 'gold') {
      this.stateManager.setState({ crew, trade });
    } else {
      this.stateManager.setState({ trade });
    }

    eventBus.emit('port:item_bought', { itemId, quantity, price: portItem.currentPrice });
    eventBus.emit('trade:updated', trade);
    eventBus.emit('sound:play', 'objective_complete');
  }

  public sellItem(data: { itemId: string; quantity: number }): void {
    const { itemId, quantity } = data;
    const state = this.stateManager.getState();
    const portId = state.trade.currentPortId;

    if (!portId) {
      eventBus.emit('toast:show', { message: '请先打开港口' });
      return;
    }

    const item = this.tradeItems.get(itemId);
    if (!item) {
      eventBus.emit('toast:show', { message: '物品不存在' });
      return;
    }

    const currentCount = state.trade.inventory[itemId] || 0;
    if (currentCount < quantity) {
      eventBus.emit('toast:show', { message: '物品数量不足' });
      return;
    }

    const portItems = state.trade.portPrices[portId];
    const portItem = portItems?.find(i => i.id === itemId);
    const sellPrice = portItem ? Math.round(portItem.currentPrice * 0.6) : Math.round(item.basePrice * 0.5);
    const totalValue = sellPrice * quantity;

    const trade = { ...state.trade };
    trade.inventory = { ...trade.inventory };
    trade.inventory[itemId] = currentCount - quantity;

    if (portItem && portItems) {
      const itemIndex = portItems.findIndex(i => i.id === itemId);
      if (itemIndex > -1) {
        portItems[itemIndex] = { 
          ...portItem, 
          currentStock: portItem.currentStock + quantity 
        };
        trade.portPrices[portId] = [...portItems];
      }
    }

    const crew = { ...state.crew };
    if (item.priceCurrency === 'gold') {
      crew.gold += totalValue;
    } else {
      this.stateManager.updateShip({
        supplies: Math.min(state.ship.maxSupplies, state.ship.supplies + totalValue)
      });
    }

    if (item.priceCurrency === 'gold') {
      this.stateManager.setState({ crew, trade });
    } else {
      this.stateManager.setState({ trade });
    }

    eventBus.emit('port:item_sold', { itemId, quantity, price: sellPrice });
    eventBus.emit('trade:updated', trade);
    eventBus.emit('toast:show', { message: `出售 ${item.name} x${quantity}，获得 ${totalValue} ${item.priceCurrency === 'gold' ? '金币' : '物资'}` });
    eventBus.emit('sound:play', 'button_click');
  }

  private applyItemEffects(item: TradeItem, quantity: number): void {
    if (!item.effects) return;

    const state = this.stateManager.getState();
    const totalValue = item.effects.value * quantity;

    switch (item.effects.type) {
      case 'supplies':
        this.stateManager.updateShip({
          supplies: Math.min(state.ship.maxSupplies, state.ship.supplies + totalValue)
        });
        eventBus.emit('toast:show', { message: `补充了 ${totalValue} 物资` });
        break;
      case 'health':
        const crew = { ...state.crew };
        crew.members.forEach(member => {
          member.health = Math.min(member.maxHealth, member.health + totalValue);
        });
        crew.members = [...crew.members];
        this.stateManager.setState({ crew });
        eventBus.emit('toast:show', { message: `全员恢复 ${totalValue} 生命` });
        break;
      case 'morale':
        const crewMorale = { ...state.crew };
        crewMorale.members.forEach(member => {
          member.morale = Math.min(member.maxMorale, member.morale + totalValue);
        });
        crewMorale.members = [...crewMorale.members];
        this.stateManager.setState({ crew: crewMorale });
        eventBus.emit('toast:show', { message: `全员士气提升 ${totalValue}` });
        break;
      case 'speed':
        eventBus.emit('toast:show', { message: `获得速度加成：+${Math.round(totalValue * 100)}%` });
        break;
    }
  }

  public useItem(itemId: string): void {
    const state = this.stateManager.getState();
    const count = state.trade.inventory[itemId] || 0;

    if (count <= 0) {
      eventBus.emit('toast:show', { message: '物品不足' });
      return;
    }

    const item = this.tradeItems.get(itemId);
    if (!item) return;

    if (!item.effects || item.effects.type === 'chapter_unlock') {
      eventBus.emit('toast:show', { message: '此物品无法使用' });
      return;
    }

    const trade = { ...state.trade };
    trade.inventory = { ...trade.inventory };
    trade.inventory[itemId] = count - 1;

    this.applyItemEffects(item, 1);

    this.stateManager.setState({ trade });
    eventBus.emit('trade:updated', trade);
    eventBus.emit('port:item_used', { itemId });
  }

  public getCurrentPort(): Port | null {
    const state = this.stateManager.getState();
    const portId = state.trade.currentPortId;
    return portId ? this.ports.get(portId) || null : null;
  }

  public getPriceHistory(itemId: string): number[] {
    const state = this.stateManager.getState();
    return state.trade.priceHistory[itemId] || [];
  }

  private update(delta: number, elapsed: number): void {
    this.checkPortRefreshes();
  }

  private checkPortRefreshes(): void {
    const state = this.stateManager.getState();
    const now = Date.now();

    this.ports.forEach((port, portId) => {
      const lastRefresh = state.trade.lastRefreshTime[portId] || 0;
      if (now - lastRefresh >= port.refreshInterval && state.trade.portPrices[portId]) {
        this.refreshPortPrices(portId);
      }
    });
  }

  public serialize(): any {
    const state = this.stateManager.getState();
    return {
      trade: state.trade
    };
  }

  public deserialize(data: any): void {
    if (!data?.trade) return;

    this.ensureTradeStateExists();
    const state = this.stateManager.getState();
    const trade = { ...this.getDefaultTradeState(), ...data.trade };
    this.stateManager.setState({ trade: trade as TradeState });
  }

  public dispose(): void {
    if (this.updateUnsubscriber) {
      this.updateUnsubscriber();
      this.updateUnsubscriber = null;
    }
    this.clearAllEventListeners();
    this.initialized = false;
  }
}
