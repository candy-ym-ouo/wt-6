import { Game } from './Game';
import './style.css';

console.log('🌌 观星航路 - Celestial Voyage 🌌');
console.log('古地图观星航路题材 H5 游戏');

let game: Game | null = null;

window.addEventListener('DOMContentLoaded', () => {
  try {
    game = new Game();
    console.log('✅ 游戏初始化完成');
  } catch (error) {
    console.error('❌ 游戏初始化失败:', error);
    if (error instanceof Error) {
      console.error('错误堆栈:', error.stack);
    }
    
    const container = document.getElementById('ui-layer');
    if (container) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ff6b6b; text-align: center; padding: 2rem;">
          <h2 style="margin-bottom: 1rem;">游戏加载失败</h2>
          <p style="color: #c8b888; margin-bottom: 1rem;">请检查控制台获取详细信息</p>
          <button onclick="location.reload()" style="padding: 0.8rem 2rem; background: #d4af37; border: none; color: #000; cursor: pointer; font-family: inherit;">
            重新加载
          </button>
        </div>
      `;
    }
  }
});

window.addEventListener('beforeunload', () => {
  if (game) {
    game.dispose();
  }
});

if ((import.meta as any).hot) {
  (import.meta as any).hot.dispose(() => {
    if (game) {
      game.dispose();
    }
  });
}
