import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetLoader {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
  }
  loadGLTF(url) {
    if (this.cache.has(url)) return Promise.resolve(this.cache.get(url));
    return new Promise((resolve, reject) => {
      this.loader.load(url, (gltf) => {
        this.cache.set(url, gltf);
        resolve(gltf);
      }, undefined, (err) => reject(err));
    });
  }
  clearCache() { this.cache.clear(); }
}
export const assetLoader = new AssetLoader();