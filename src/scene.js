import * as THREE from 'three';
import { loadStage1 } from './stage1.js';
import { loadStage2 } from './stage2.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a24); // 은은한 사이버 다크 슬레이트 블루
  scene.fog = new THREE.Fog(0x1a1a24, 40, 180);

  // 천장과 지면의 2톤 반사광을 부드럽게 잡아주는 HemisphereLight
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3d4150, 0.6);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45); // 기본적인 가시성을 확보하는 AmbientLight
  scene.add(ambientLight);

  // 실내 그림자 연출용 방향성 라이트
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85); 
  dirLight.position.set(15, 14, 15); // 천장 바로 아래 고도에서 내리쬐도록 조정
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.left = -60;
  dirLight.shadow.camera.right = 60;
  dirLight.shadow.camera.top = 60;
  dirLight.shadow.camera.bottom = -60;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 150;
  scene.add(dirLight);

  return scene;
}

export function loadStage(stageIndex, scene, physicsWorld, RAPIER, environmentObjects) {
  if (stageIndex === 1) {
    return loadStage1(scene, physicsWorld, RAPIER, environmentObjects);
  } else if (stageIndex === 2) {
    return loadStage2(scene, physicsWorld, RAPIER, environmentObjects);
  }
  return null;
}
