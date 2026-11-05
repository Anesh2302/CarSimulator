import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import fs from 'node:fs';

// Polyfill FileReader for Node
globalThis.FileReader = class {
  constructor(){ this.result=null; this.onload=null; this.onerror=null; }
  readAsDataURL(blob){ process.nextTick(()=>{ this.result='data:application/octet-stream;base64,'; this.onload && this.onload({target:this}); }); }
  readAsArrayBuffer(blob){ blob.arrayBuffer().then(b=>{ this.result=b; this.onload && this.onload({target:this}); }).catch(e=>this.onerror&&this.onerror(e)); }
};

const scene = new THREE.Scene();
const body = new THREE.Mesh(new THREE.BoxGeometry(2,0.7,4.2), new THREE.MeshStandardMaterial({color:0xe53935, metalness:0.6, roughness:0.3}));
body.position.y = 0.6; body.name = 'Body'; scene.add(body);
const wheelGeo = new THREE.CylinderGeometry(0.35,0.35,0.3,16);
const wheelMat = new THREE.MeshStandardMaterial({color:0x222222});
const wheelNames = ['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR'];
const positions = [[-1.05,0.35,1.3],[1.05,0.35,1.3],[-1.05,0.35,-1.3],[1.05,0.35,-1.3]];
positions.forEach((p,i)=>{ const w=new THREE.Mesh(wheelGeo,wheelMat); w.rotation.z=Math.PI/2; w.position.set(...p); w.name=wheelNames[i]; scene.add(w); });
const sw = new THREE.Mesh(new THREE.TorusGeometry(0.25,0.03,8,24), new THREE.MeshStandardMaterial({color:0x222222}));
sw.position.set(0,1.05,0.6); sw.rotation.x=Math.PI/2; sw.name='SteeringWheel'; scene.add(sw);
const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.6,2.0), new THREE.MeshStandardMaterial({color:0x88ccff, transparent:true, opacity:0.3, roughness:0.1, metalness:0.1}));
glass.position.set(0,1.15,-0.2); glass.name='Glass'; scene.add(glass);

const exporter = new GLTFExporter();
await new Promise((resolve,reject)=>{
  exporter.parse(scene, (gltf) => {
    try {
      fs.mkdirSync('public/models', {recursive:true});
      fs.writeFileSync('public/models/car_placeholder.glb', Buffer.from(gltf));
      console.log('written', gltf.byteLength || (gltf.length||0));
      resolve();
    } catch(e){ reject(e); }
  }, (err)=>{ console.error('parse err', err); reject(err); }, { binary:true });
});
console.log('done');
