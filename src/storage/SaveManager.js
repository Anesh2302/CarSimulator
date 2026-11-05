const SETTINGS_KEY = 'carsim_settings';
const PROGRESS_KEY = 'carsim_progress';

export const SaveManager = {
  defaultSettings() {
    return { graphics:'medium', shadows:true, touch:true, fov:75, volume:0.7, music:0.4, steerSensitivity:1.0, physicsMode:'arcade', deadZone:0.08, invertSteer:false, invertPedals:false, engineVolume:0.6, envVolume:0.4, fxVolume:0.7 };
  },
  loadSettings() {
    try { const r = localStorage.getItem(SETTINGS_KEY); return r ? { ...this.defaultSettings(), ...JSON.parse(r) } : this.defaultSettings(); } catch { return this.defaultSettings(); }
  },
  saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {} },
  loadProgress() {
    try { const r = localStorage.getItem(PROGRESS_KEY); return r ? JSON.parse(r) : { selectedCar:'sport', money:0, completedMissions:[] }; } catch { return { selectedCar:'sport', money:0, completedMissions:[] }; }
  },
  saveProgress(p) { try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch {} },
};