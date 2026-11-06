import * as THREE from 'three';
import { CAR_SPECS } from '../vehicles/Car.js';
import { SaveManager } from '../storage/SaveManager.js';
import { buildMissions } from '../missions/Missions.js';
import { GAME_MODES } from '../modes/GameModes.js';

export class Menu {
  constructor(game) { this.game = game; this.selectedCar = game.selectedCarId; this._bind(); }
  _bind() {
    const g = this.game;
    document.getElementById('btn-play').onclick = () => { g.startPlay(); };
    document.getElementById('btn-garage').onclick = () => { this.showGarage(); };
    document.getElementById('btn-modes').onclick = () => { this.showModes(); };
    document.getElementById('btn-missions').onclick = () => { this.showMissions(); };
    document.getElementById('btn-settings').onclick = () => { this.showSettings(); };
    document.getElementById('btn-controls').onclick = () => { document.getElementById('controls').classList.remove('hidden'); };

    document.getElementById('btn-garage-back').onclick = () => { document.getElementById('garage').classList.add('hidden'); this.show(); };
    document.getElementById('btn-garage-select').onclick = () => {
      g.selectedCarId = this.selectedCar;
      g.progress.selectedCar = this.selectedCar;
      const color = document.getElementById('set-color').value;
      g.progress.bodyColor = color;
      SaveManager.saveProgress(g.progress);
      document.getElementById('garage').classList.add('hidden');
      this.show();
    };

    document.getElementById('btn-settings-back').onclick = () => { document.getElementById('settings').classList.add('hidden'); this.show(); };
    document.getElementById('btn-settings-save').onclick = () => { this.saveSettings(); document.getElementById('settings').classList.add('hidden'); this.show(); };

    document.getElementById('btn-controls-back').onclick = () => { document.getElementById('controls').classList.add('hidden'); };
    document.getElementById('btn-calibrate').onclick = () => { document.getElementById('calibrate').classList.remove('hidden'); };
    document.getElementById('btn-calibrate-close').onclick = () => { document.getElementById('calibrate').classList.add('hidden'); };
    document.getElementById('btn-missions-back').onclick = () => { document.getElementById('missions').classList.add('hidden'); this.show(); };
    document.getElementById('btn-modes-back').onclick = () => { document.getElementById('modes').classList.add('hidden'); this.show(); };

    document.getElementById('btn-resume').onclick = () => { g.resume(); };
    document.getElementById('btn-pause-settings').onclick = () => { document.getElementById('pause').classList.add('hidden'); this.showSettings(); };
    document.getElementById('btn-pause-menu').onclick = () => { g.backToMenu(); };
  }

  show() {
    document.getElementById('menu').classList.remove('hidden');
  }
  hide() {
    document.getElementById('menu').classList.add('hidden');
  }

  showGarage() {
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('garage').classList.remove('hidden');
    const list = document.getElementById('carlist');
    list.innerHTML = '';
    for (const id in CAR_SPECS) {
      const spec = CAR_SPECS[id];
      const card = document.createElement('div');
      card.className = 'carcard' + (id === this.selectedCar ? ' sel' : '');
      card.innerHTML = `<h3>${spec.name}</h3><p>Speed ${spec.maxSpeed} | Accel ${spec.accel} | Handling ${spec.handling}</p>`;
      card.onclick = () => {
        this.selectedCar = id;
        document.querySelectorAll('.carcard').forEach(c => c.classList.remove('sel'));
        card.classList.add('sel');
      };
      list.appendChild(card);
    }
  }

  showMissions() {
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('missions').classList.remove('hidden');
    const list = document.getElementById('missionlist');
    list.innerHTML = '';
    const ms = buildMissions();
    for (const m of ms) {
      const done = (this.game.progress.completedMissions || []).includes(m.id);
      const card = document.createElement('div');
      card.className = 'carcard';
      card.innerHTML = `<h3>${m.title}${done ? ' ✓' : ''}</h3><p>${m.desc} Reward: ${m.reward}</p><button>Start</button>`;
      card.querySelector('button').onclick = (e) => {
        e.stopPropagation();
        this.game.startMission(m);
        document.getElementById('missions').classList.add('hidden');
        this.game.startPlay();
      };
      list.appendChild(card);
    }
  }
  showModes() {
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('modes').classList.remove('hidden');
    const list = document.getElementById('modelist');
    list.innerHTML = '';
    for (const m of GAME_MODES) {
      const card = document.createElement('div');
      card.className = 'carcard';
      card.innerHTML = `<h3>${m.title}</h3><p>${m.desc}</p><button>Start</button>`;
      card.querySelector('button').onclick = (e) => {
        e.stopPropagation();
        document.getElementById('modes').classList.add('hidden');
        this.game.startPlay(m.id);
      };
      list.appendChild(card);
    }
  }
  showSettings() {
    document.getElementById('menu').classList.add('hidden');
    document.getElementById('settings').classList.remove('hidden');
    const s = this.game.settings;
    document.getElementById('set-graphics').value = s.graphics;
    document.getElementById('set-volume').value = s.volume;
    document.getElementById('set-music').value = s.music;
    document.getElementById('set-steer').value = s.steerSensitivity;
    document.getElementById('set-physics').value = s.physicsMode || 'arcade';
    document.getElementById('set-deadzone').value = s.deadZone || 0.08;
    document.getElementById('set-invert-steer').checked = !!s.invertSteer;
    document.getElementById('set-invert-pedals').checked = !!s.invertPedals;
    document.getElementById('set-fov').value = s.fov;
    document.getElementById('set-touch').checked = s.touch;
    document.getElementById('set-shadows').checked = s.shadows;
  }

  saveSettings() {
    const g = this.game;
    g.settings.graphics = document.getElementById('set-graphics').value;
    g.settings.volume = parseFloat(document.getElementById('set-volume').value);
    g.settings.music = parseFloat(document.getElementById('set-music').value);
    g.settings.steerSensitivity = parseFloat(document.getElementById('set-steer').value);
    g.settings.physicsMode = document.getElementById('set-physics').value;
    g.settings.deadZone = parseFloat(document.getElementById('set-deadzone').value);
    g.settings.invertSteer = document.getElementById('set-invert-steer').checked;
    g.settings.invertPedals = document.getElementById('set-invert-pedals').checked;
    g.settings.fov = parseFloat(document.getElementById('set-fov').value);
    g.settings.touch = document.getElementById('set-touch').checked;
    g.settings.shadows = document.getElementById('set-shadows').checked;
    SaveManager.saveSettings(g.settings);
    // apply
    g.renderer.shadowMap.enabled = g.settings.shadows;
    // pixel ratio
    g.renderer.setPixelRatio(Math.min(window.devicePixelRatio, g.settings.graphics === 'high' ? 2 : 1.5));
  }
}