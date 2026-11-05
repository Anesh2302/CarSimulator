import * as THREE from 'three';
import { TrafficCar } from '../vehicles/TrafficCar.js';
import { Pedestrian } from '../vehicles/Pedestrian.js';

export class World {
  constructor(game) {
    this.game = game;
    this.scene = game.scene;
    this.colliders = [];
    this.trafficCars = [];
    this.pedestrians = [];
    this.lights = [];
    this.time = 0; // day/night 0..1
    this.weather = 'clear';
    this.rain = null;
  }

  build() {
    const scene = this.scene;
    // ground
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2d3a2e, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // grid helper
    const grid = new THREE.GridHelper(600, 120, 0x444444, 0x222222);
    scene.add(grid);

    // lighting
    this.ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.1);
    this.sun.position.set(50, 80, 30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -120;
    this.sun.shadow.camera.right = 120;
    this.sun.shadow.camera.top = 120;
    this.sun.shadow.camera.bottom = -120;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 300;
    scene.add(this.sun);
    scene.add(this.sun.target);

    // skybox-ish fog color handled

    // roads
    this._buildRoads();
    // buildings
    this._buildBuildings();
    // parking
    this._buildParking();
    // traffic lights
    this._buildSignals();
    // rain system
    this._buildRain();

    // colliders already pushed
  }

  _addCollider(box) { this.colliders.push(box); }

  _buildRoads() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    // main grid roads
    const roadW = 12;
    for (let i = -5; i <= 5; i++) {
      // horizontal
      const h = new THREE.Mesh(new THREE.PlaneGeometry(600, roadW), mat);
      h.rotation.x = -Math.PI / 2;
      h.position.set(0, 0.01, i * 60);
      h.receiveShadow = true;
      this.scene.add(h);
      // vertical
      const v = new THREE.Mesh(new THREE.PlaneGeometry(roadW, 600), mat);
      v.rotation.x = -Math.PI / 2;
      v.position.set(i * 60, 0.01, 0);
      v.receiveShadow = true;
      this.scene.add(v);
      // center lines
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(600, 0.3), lineMat);
      cl.rotation.x = -Math.PI / 2;
      cl.position.set(0, 0.02, i * 60);
      this.scene.add(cl);
    }
    // highway ring
    // simple outer loop
    // colliders: none for roads (drivable)
  }

  _buildBuildings() {
    const colors = [0x8a8a9a, 0x6b7b8c, 0x9aa0a8, 0x7c6f64, 0x5e6e7e];
    let seed = 1;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let bx = -5; bx <= 5; bx++) {
      for (let bz = -5; bz <= 5; bz++) {
        if (Math.abs(bx) < 1 && Math.abs(bz) < 1) continue; // keep center open
        // blocks between roads
        const cx = bx * 60 + (bx > 0 ? 20 : -20);
        const cz = bz * 60 + (bz > 0 ? 20 : -20);
        // cluster of buildings
        for (let k = 0; k < 3; k++) {
          const w = 8 + rnd() * 10;
          const d = 8 + rnd() * 10;
          const h = 6 + rnd() * 28;
          const geo = new THREE.BoxGeometry(w, h, d);
          const mat = new THREE.MeshStandardMaterial({ color: colors[Math.floor(rnd() * colors.length)], roughness: 0.8 });
          const m = new THREE.Mesh(geo, mat);
          m.position.set(cx + (rnd() - 0.5) * 18, h / 2, cz + (rnd() - 0.5) * 18);
          m.castShadow = true;
          m.receiveShadow = true;
          this.scene.add(m);
          // collider
          const box = new THREE.Box3().setFromObject(m);
          // shrink y? keep full
          this.colliders.push(box);
        }
      }
    }
  }

  _buildParking() {
    // parking lots near center
    const mat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(40, 30), mat);
    lot.rotation.x = -Math.PI / 2;
    lot.position.set(40, 0.01, 40);
    this.scene.add(lot);
    // lines
    const lmat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let i = -4; i <= 4; i++) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 24), lmat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(40 + i * 4, 0.02, 40);
      this.scene.add(line);
    }
    // parking colliders: barriers
    const barrier = new THREE.Mesh(new THREE.BoxGeometry(42, 1, 1), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
    barrier.position.set(40, 0.5, 25);
    this.scene.add(barrier);
    this.colliders.push(new THREE.Box3().setFromObject(barrier));
    const barrier2 = barrier.clone(); barrier2.position.set(40, 0.5, 55);
    this.scene.add(barrier2);
    this.colliders.push(new THREE.Box3().setFromObject(barrier2));
  }

  _buildSignals() {
    // traffic lights at intersections
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        if (i === 0 && j === 0) continue;
        const x = i * 60;
        const z = j * 60;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
        pole.position.set(x + 7, 3, z + 7);
        this.scene.add(pole);
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        box.position.set(x + 7, 6.5, z + 7);
        this.scene.add(box);
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
        light.position.set(x + 7, 7.0, z + 7.4);
        this.scene.add(light);
        this.lights.push({ mesh: light, state: 0, timer: Math.random() * 5 });
      }
    }
  }

  _buildRain() {
    const count = 2000;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 200;
      pos[i * 3 + 1] = Math.random() * 60;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.15, transparent: true, opacity: 0.6 });
    this.rain = new THREE.Points(geo, mat);
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  spawnTraffic(game) {
    // simple traffic cars moving along axes
    for (let i = 0; i < 12; i++) {
      const car = new TrafficCar(game);
      // random lane
      const axis = Math.random() > 0.5 ? 'x' : 'z';
      const lane = (Math.floor(Math.random() * 9) - 4) * 60 + (Math.random() > 0.5 ? 4 : -4);
      const pos = axis === 'x' ? new THREE.Vector3(-280, 0.5, lane) : new THREE.Vector3(lane, 0.5, -280);
      car.spawn(pos, axis);
      this.trafficCars.push(car);
      this.scene.add(car.group);
    }
  }

  spawnPedestrians(game) {
    for (let i = 0; i < 20; i++) {
      const ped = new Pedestrian(game);
      ped.spawn(new THREE.Vector3((Math.random() - 0.5) * 200, 0.9, (Math.random() - 0.5) * 200));
      this.pedestrians.push(ped);
      this.scene.add(ped.group);
    }
  }

  update(dt, game) {
    this.time += dt * 0.02; // day cycle speed
    if (this.time > 1) this.time = 0;
    // day/night
    const t = this.time;
    // sun angle
    const angle = t * Math.PI * 2;
    this.sun.position.set(Math.cos(angle) * 80, Math.sin(angle) * 80 + 10, Math.sin(angle * 0.5) * 40);
    const dayFactor = Math.max(0, Math.sin(angle));
    this.sun.intensity = 0.2 + dayFactor * 1.0;
    this.ambient.intensity = 0.15 + dayFactor * 0.4;
    const skyColor = new THREE.Color().setHSL(0.55, 0.5, 0.3 + dayFactor * 0.4);
    this.scene.background = skyColor;
    this.scene.fog.color.copy(skyColor);

    // weather (simple: toggle rain with R? no, random)
    // traffic lights
    for (const l of this.lights) {
      l.timer -= dt;
      if (l.timer <= 0) {
        l.state = (l.state + 1) % 3;
        l.timer = l.state === 1 ? 2 : 5;
        const colors = [0x00ff00, 0xffff00, 0xff0000];
        l.mesh.material.color.setHex(colors[l.state]);
      }
    }

    // traffic
    for (const c of this.trafficCars) c.update(dt, this);
    // pedestrians
    for (const p of this.pedestrians) p.update(dt, this);

    // rain
    if (this.weather === 'rain') {
      this.rain.visible = true;
      const pos = this.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, pos.getY(i) - dt * 30);
        if (pos.getY(i) < 0) pos.setY(i, 60);
      }
      pos.needsUpdate = true;
    } else {
      this.rain.visible = false;
    }
  }

  setWeather(w) {
    this.weather = w;
    if (w === 'rain') this.scene.fog.near = 30;
    else this.scene.fog.near = 60;
  }
}