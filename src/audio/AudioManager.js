export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineBus = null;
    this.envBus = null;
    this.fxBus = null;
    this.layers = [];
    this.tireGain = null;
    this.tireFilter = null;
    this.ambientGain = null;
    this.initialized = false;
    this.volume = 0.7;
    this.engineVol = 0.6;
    this.envVol = 0.4;
    this.fxVol = 0.7;
    this._noiseBuffer = null;
  }
  init() {}
  _makeNoiseBuffer() {
    if (this._noiseBuffer) return this._noiseBuffer;
    const size = this.ctx.sampleRate * 2;
    const buf = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
    this._noiseBuffer = buf;
    return buf;
  }
  resume() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.ctx.destination);

        this.engineBus = this.ctx.createGain(); this.engineBus.gain.value = this.engineVol; this.engineBus.connect(this.master);
        this.envBus = this.ctx.createGain(); this.envBus.gain.value = this.envVol; this.envBus.connect(this.master);
        this.fxBus = this.ctx.createGain(); this.fxBus.gain.value = this.fxVol; this.fxBus.connect(this.master);

        const freqs = [55, 110, 220, 440];
        this.layers = freqs.map((f, i) => {
          const osc = this.ctx.createOscillator();
          osc.type = i === 0 ? 'sine' : (i === 1 ? 'triangle' : 'sawtooth');
          osc.frequency.value = f;
          const g = this.ctx.createGain();
          g.gain.value = 0;
          osc.connect(g).connect(this.engineBus);
          osc.start();
          return { osc, gain: g, base: f };
        });

        // tire
        this.tireFilter = this.ctx.createBiquadFilter();
        this.tireFilter.type = 'bandpass';
        this.tireFilter.frequency.value = 1200;
        this.tireGain = this.ctx.createGain();
        this.tireGain.gain.value = 0;
        const tireSrc = this.ctx.createBufferSource();
        tireSrc.buffer = this._makeNoiseBuffer();
        tireSrc.loop = true;
        tireSrc.connect(this.tireFilter).connect(this.tireGain).connect(this.fxBus);
        tireSrc.start();

        // ambient
        this.ambientGain = this.ctx.createGain();
        this.ambientGain.gain.value = 0.05;
        const ambSrc = this.ctx.createBufferSource();
        ambSrc.buffer = this._makeNoiseBuffer();
        ambSrc.loop = true;
        const ambFilter = this.ctx.createBiquadFilter();
        ambFilter.type = 'lowpass';
        ambFilter.frequency.value = 600;
        ambSrc.connect(ambFilter).connect(this.ambientGain).connect(this.envBus);
        ambSrc.start();

        this.initialized = true;
      } catch (e) { console.warn('Audio init failed', e); }
    } else if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
  update(dt, car, settings) {
    if (!this.initialized || !this.ctx) return;
    this.volume = settings.volume ?? this.volume;
    this.engineVol = settings.engineVolume ?? this.engineVol;
    this.envVol = settings.envVolume ?? this.envVol;
    this.fxVol = settings.fxVolume ?? this.fxVol;
    this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.1);
    this.engineBus.gain.setTargetAtTime(this.engineVol, this.ctx.currentTime, 0.1);
    this.envBus.gain.setTargetAtTime(this.envVol, this.ctx.currentTime, 0.1);
    this.fxBus.gain.setTargetAtTime(this.fxVol, this.ctx.currentTime, 0.1);

    const rpm = car.rpm || 800;
    const maxRpm = 7000;
    const n = Math.min(1, rpm / maxRpm);
    // crossfade layers
    this.layers.forEach((l, i) => {
      const center = i / (this.layers.length - 1);
      const dist = Math.abs(n - center);
      const g = Math.max(0, 1 - dist * 2.5);
      l.gain.gain.setTargetAtTime(g * 0.15, this.ctx.currentTime, 0.1);
      l.osc.frequency.setTargetAtTime(l.base * (1 + n * 0.5), this.ctx.currentTime, 0.1);
    });
    // tire squeal based on steer + speed
    const slip = car.slip || 0;
    const screech = car.handbrake ? 0.15 : Math.min(0.1, slip * 0.15 + (Math.abs(car.speed) > 15 && Math.abs(car.steerAngle) > 1 ? 0.05 : 0));
    this.tireGain.gain.setTargetAtTime(screech, this.ctx.currentTime, 0.05);
  }
  playGearShift() {
    if (!this.initialized || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.value = 0.08;
    osc.connect(g).connect(this.fxBus);
    osc.start();
    g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.12);
    osc.stop(this.ctx.currentTime + 0.12);
  }
  playCollision(intensity) {
    if (!this.initialized || !this.ctx) return;
    const g = this.ctx.createGain();
    g.gain.value = Math.min(0.4, intensity * 0.02);
    const src = this.ctx.createBufferSource();
    src.buffer = this._makeNoiseBuffer();
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 400;
    src.connect(f).connect(g).connect(this.fxBus);
    src.start();
    src.stop(this.ctx.currentTime + 0.25);
  }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }
}