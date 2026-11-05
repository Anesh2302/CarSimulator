export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.tireOsc = null;
    this.tireGain = null;
    this.initialized = false;
    this.volume = 0.7;
    this.musicVol = 0.4;
  }
  init() {
    // lazy; resume on user gesture
  }
  resume() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);

        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.0;
        this.engineOsc.connect(this.engineGain).connect(this.master);
        this.engineOsc.start();

        this.tireOsc = this.ctx.createOscillator();
        this.tireOsc.type = 'square';
        this.tireGain = this.ctx.createGain();
        this.tireGain.gain.value = 0.0;
        this.tireOsc.connect(this.tireGain).connect(this.master);
        this.tireOsc.start();
        this.initialized = true;
      } catch (e) { console.warn('Audio init failed', e); }
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  update(dt, car, settings) {
    if (!this.initialized || !this.ctx) return;
    this.volume = settings.volume ?? this.volume;
    this.master.gain.value = this.volume;
    const rpm = car.rpm || 800;
    const freq = 40 + rpm * 0.05;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    const load = Math.min(1, Math.abs(car.speed) / car.spec.maxSpeed + 0.2);
    this.engineGain.gain.setTargetAtTime(0.08 + load * 0.12, this.ctx.currentTime, 0.1);
    // tire screech
    const turning = Math.abs(car.steerAngle);
    const braking = car.handbrake;
    const screech = (braking || turning > 1.5) && Math.abs(car.speed) > 8;
    this.tireOsc.frequency.setTargetAtTime(1200 + turning * 200, this.ctx.currentTime, 0.05);
    this.tireGain.gain.setTargetAtTime(screech ? 0.06 : 0.0, this.ctx.currentTime, 0.05);
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
}