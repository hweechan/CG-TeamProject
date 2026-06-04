import * as THREE from 'three';
import { loadStage1 } from './stage1.js';
import { loadStage2 } from './stage2.js';
import { loadStage3 } from './stage3.js';

export function createScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a24);
  scene.fog = new THREE.Fog(0x1a1a24, 40, 180);

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3d4150, 0.6);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
  dirLight.position.set(15, 14, 15);
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
  } else if (stageIndex === 3) {
    return loadStage3(scene, physicsWorld, RAPIER, environmentObjects);
  } else if (stageIndex >= 4 && stageIndex <= 6) {
    // Dummy stages for Developer Mode testing
    const offsetY = -100 * stageIndex;

    const geo = new THREE.BoxGeometry(50, 1, 50);
    const mat = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.8 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, -0.5 + offsetY, 0);
    mesh.receiveShadow = true;
    scene.add(mesh);
    environmentObjects.push(mesh);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5 + offsetY, 0);
    const body = physicsWorld.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(25, 0.5, 25);
    physicsWorld.createCollider(colliderDesc, body);

    const photoItemMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    photoItemMesh.position.set(0, -10 + offsetY, 0);
    photoItemMesh.visible = false;
    scene.add(photoItemMesh);
    environmentObjects.push(photoItemMesh);

    return {
      startPos: new THREE.Vector3(0, 2 + offsetY, 0),
      portal1Pos: new THREE.Vector3(20, 2 + offsetY, 0),
      photoItemMesh: photoItemMesh
    };
  }
  return null;
}
