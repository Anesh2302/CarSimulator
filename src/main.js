import './style.css';
import { Game } from './game/Game.js';

const game = new Game();
window.game = game;
game.init().catch(err => {
  console.error(err);
  const el = document.getElementById('error');
  document.getElementById('errmsg').textContent = err?.message || String(err);
  el.classList.remove('hidden');
  document.getElementById('errretry').onclick = () => location.reload();
});