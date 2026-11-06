import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetLoader {
  constructor() {
    this.manager = new THREE.LoadingManager();
    this.gltfLoader = new GLTFLoader(this.manager);
    this.textureLoader = new THREE.TextureLoader(this.manager);
    this.cache = new Map();
    this.status = {};
  }
  loadGLB(url, onProgress) {
    if (this.cache.has(url)) return Promise.resolve(this.cache.get(url));
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(url, (gltf) => {
        this.cache.set(url, gltf);
        this.status[url] = 'loaded';
        resolve(gltf);
      }, onProgress, (err) => {
        this.status[url] = 'error';
        reject(err);
      });
    });
  }
  loadTexture(url) {
    if (this.cache.has(url)) return Promise.resolve(this.cache.get(url));
    return new Promise((resolve, reject) => {
      this.textureLoader.load(url, (tex) => {
        this.cache.set(url, tex);
        this.status[url] = 'loaded';
        resolve(tex);
      }, undefined, (err) => { this.status[url] = 'error'; reject(err); });
    });
  }
  clearCache() { this.cache.clear(); }
}
export const assetLoader = new AssetLoader();