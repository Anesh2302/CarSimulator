import * as THREE from 'three';
import { InputManager } from '../input/InputManager.js';
import { SaveManager } from '../storage/SaveManager.js';
import { AudioManager } from '../audio/AudioManager.js';
import { CameraController } from '../camera/CameraController.js';
import { World } from '../world/World.js';
import { Car } from '../vehicles/Car.js';
import { HUD } from '../ui/HUD.js';
import { Menu } from '../ui/Menu.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('gl');
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = new THREE.Clock();
    this.running = false;
    this.paused = false;
    this.state = 'loading'; // loading, menu, playing, paused
    this.settings = SaveManager.loadSettings();
    this.progress = SaveManager.loadProgress();
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.world = null;
    this.car = null;
    this.traffic = [];
    this.peds = [];
    this.cameraCtrl = null;
    this.hud = null;
    this.menu = null;
    this.selectedCarId = this.progress.selectedCar || 'sport';
    this.mission = null;
    this.missionProgress = 0;
  }

  async init() {
    this._setLoading(0.1, 'Creating renderer...');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.settings.graphics === 'high' ? 2 : 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = this.settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0xcfd8e3, 60, 260);

    this.camera = new THREE.PerspectiveCamera(this.settings.fov, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(0, 5, 12);

    window.addEventListener('resize', () => this._onResize());

    this.input.init();
    this.audio.init();
    this.hud = new HUD(this);
    this.menu = new Menu(this);

    this._setLoading(0.3, 'Building world...');
    await this._yield();
    this.world = new World(this);
    this.world.build();

    this._setLoading(0.6, 'Creating vehicle...');
    await this._yield();
    this.car = new Car(this, this.selectedCarId);
    this.car.spawn(new THREE.Vector3(0, 1, 0));
    this.scene.add(this.car.group);

    this._setLoading(0.75, 'Traffic & pedestrians...');
    await this._yield();
    this.world.spawnTraffic(this);
    this.world.spawnPedestrians(this);

    this._setLoading(0.85, 'Cameras & audio...');
    this.cameraCtrl = new CameraController(this);
    this.cameraCtrl.setMode('third');

    this._setLoading(1.0, 'Ready');
    await this._yield();
    this._hideLoading();
    this.state = 'menu';
    this.menu.show();
    this._loop();
  }

  _yield() { return new Promise(r => setTimeout(r, 16)); }

  _setLoading(p, msg) {
    document.getElementById('loadbar').style.width = (p * 100) + '%';
    document.getElementById('loadmsg').textContent = msg;
  }
  _hideLoading() { document.getElementById('loading').classList.add('hidden'); }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  startPlay() {
    this.menu.hide();
    document.getElementById('garage').classList.add('hidden');
    document.getElementById('settings').classList.add('hidden');
    document.getElementById('controls').classList.add('hidden');
    this.state = 'playing';
    this.paused = false;
    document.getElementById('hud').classList.remove('hidden');
    const touch = document.getElementById('touch');
    if (this.settings.touch) touch.classList.remove('hidden'); else touch.classList.add('hidden');
    // ensure selected car
    if (!this.car || this.car.id !== this.selectedCarId) {
      if (this.car) this.scene.remove(this.car.group);
      this.car = new Car(this, this.selectedCarId);
      this.car.spawn(new THREE.Vector3(0,1,0));
      this.scene.add(this.car.group);
    } else {
      this.car.reset();
    }
    this.audio.resume();
    this.car.reset();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.paused = true;
    this.state = 'paused';
    document.getElementById('pause').classList.remove('hidden');
  }
  resume() {
    this.paused = false;
    this.state = 'playing';
    document.getElementById('pause').classList.add('hidden');
    this.clock.getDelta();
  }

  backToMenu() {
    this.state = 'menu';
    this.paused = false;
    document.getElementById('pause').classList.add('hidden');
    document.getElementById('hud').classList.add('hidden');
    this.menu.show();
  }

  _loop() {
    setTimeout(() => this._loop(), 16);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    if (this.state === 'playing' && !this.paused) {
      this._update(dt);
    }
    this._render();
  }

  _update(dt) {
    this.input.update();
    const input = this.input.state;
    // pause
    if (input.pausePressed) { input.pausePressed = false; this.pause(); return; }
    if (input.menuPressed) { input.menuPressed = false; this.backToMenu(); return; }

    // camera cycle
    if (input.camPressed) { input.camPressed = false; this.cameraCtrl.cycle(); }

    // reset
    if (input.resetPressed) { input.resetPressed = false; this.car.reset(); }
    // weather
    if (input.weatherPressed) { input.weatherPressed = false; const ws = ['clear','rain','fog']; const i = ws.indexOf(this.world.weather); this.world.setWeather(ws[(i+1)%ws.length]); if (this.world.weather === 'fog') { this.scene.fog.near = 20; this.scene.fog.far = 120; } else if (this.world.weather === 'clear') { this.scene.fog.near = 60; this.scene.fog.far = 260; } }

    this.car.update(dt, input, this.world.colliders);
    this.world.update(dt, this);
    this.cameraCtrl.update(dt, this.car);
    this.hud.update(dt, this.car, this);
    this.audio.update(dt, this.car, this.settings);

    // mission check
    if (this.mission) this._updateMission(dt);
  }

  _updateMission(dt) {
    const m = this.mission;
    if (m.type === 'checkpoint') {
      const dist = this.car.position.distanceTo(m.target);
      m.progress = Math.max(0, 1 - dist / m.startDist);
      document.getElementById('missionprog').textContent = 'Progress: ' + Math.round(m.progress * 100) + '%';
      if (dist < 3) {
        this._completeMission();
      }
    }
  }
  startMission(mission) {
    this.mission = mission;
    this.mission.startDist = this.car.position.distanceTo(mission.target);
    document.getElementById('mission').classList.remove('hidden');
    document.getElementById('missiontitle').textContent = mission.title;
    document.getElementById('missiondesc').textContent = mission.desc;
  }
  _completeMission() {
    const m = this.mission;
    this.progress.money = (this.progress.money || 0) + (m.reward || 100);
    this.progress.completedMissions = this.progress.completedMissions || [];
    this.progress.completedMissions.push(m.id);
    SaveManager.saveProgress(this.progress);
    this.mission = null;
    document.getElementById('mission').classList.add('hidden');
    this.hud.flash('Mission Complete! +' + (m.reward || 100));
  }

  _render() {
    this.renderer.render(this.scene, this.camera);
  }
}