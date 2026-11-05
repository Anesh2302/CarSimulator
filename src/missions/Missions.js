import * as THREE from 'three';

export function buildMissions() {
  return [
    { id:'m1', title:'City Checkpoint', desc:'Drive to the green marker near downtown.', type:'checkpoint', target: new THREE.Vector3(120,1,80), reward:150 },
    { id:'m2', title:'Parking Challenge', desc:'Park inside the lot at (40,40).', type:'checkpoint', target: new THREE.Vector3(40,1,40), reward:200 },
    { id:'m3', title:'Highway Run', desc:'Reach the far edge of the map.', type:'checkpoint', target: new THREE.Vector3(280,1,280), reward:300 },
  ];
}