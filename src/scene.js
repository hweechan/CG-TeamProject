import * as THREE from 'three';

export function createScene(physicsWorld, RAPIER) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 80, 300);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(30, 50, 30);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(2048, 2048);
  dirLight.shadow.camera.left = -80;
  dirLight.shadow.camera.right = 80;
  dirLight.shadow.camera.top = 80;
  dirLight.shadow.camera.bottom = -80;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 200;
  scene.add(dirLight);

  const photoItemMesh = buildStage1(scene, physicsWorld, RAPIER);
  buildStage2(scene, physicsWorld, RAPIER);

  const portal1Pos = new THREE.Vector3(20, 0, -14.5);
  const portal2Pos = new THREE.Vector3(100, 0, 19);
  buildPortalFrame(scene, physicsWorld, RAPIER, portal1Pos);
  buildPortalFrame(scene, physicsWorld, RAPIER, portal2Pos);

  return { scene, portal1Pos, portal2Pos, photoItemMesh };
}

function addBox(scene, physicsWorld, RAPIER, { size, position, color = 0x888888, roughness = 0.7, metalness = 0.1 }) {
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const bodyDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(position[0], position[1], position[2]);
  const body = physicsWorld.createRigidBody(bodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2);
  physicsWorld.createCollider(colliderDesc, body);

  return mesh;
}

function buildPortalFrame(scene, physicsWorld, RAPIER, position) {
  const OPENING_W = 3;
  const OPENING_H = 3.5;
  const T = 0.4;
  const frameStyle = { color: 0x444444, roughness: 0.3, metalness: 0.8 };

  addBox(scene, physicsWorld, RAPIER, {
    size: [T, OPENING_H, T],
    position: [position.x - OPENING_W / 2 - T / 2, position.y + OPENING_H / 2, position.z],
    ...frameStyle,
  });

  addBox(scene, physicsWorld, RAPIER, {
    size: [T, OPENING_H, T],
    position: [position.x + OPENING_W / 2 + T / 2, position.y + OPENING_H / 2, position.z],
    ...frameStyle,
  });

  addBox(scene, physicsWorld, RAPIER, {
    size: [OPENING_W + T * 2, T, T],
    position: [position.x, position.y + OPENING_H + T / 2, position.z],
    ...frameStyle,
  });

  const portalGeo = new THREE.PlaneGeometry(OPENING_W, OPENING_H);
  const portalMat = new THREE.MeshBasicMaterial({
    color: 0x4488ff,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
  });
  const portalMesh = new THREE.Mesh(portalGeo, portalMat);
  portalMesh.position.set(position.x, position.y + OPENING_H / 2, position.z);
  scene.add(portalMesh);
}

function buildStage1(scene, physicsWorld, RAPIER) {
  addBox(scene, physicsWorld, RAPIER, {
    size: [10, 1, 30],
    position: [0, -0.5, 0],
    color: 0x999999,
  });

  addBox(scene, physicsWorld, RAPIER, {
    size: [20, 1, 10],
    position: [15, -0.5, 10],
    color: 0x999999,
  });

  // Chasm gap: x 5→15, z -15→-5 (no floor — bridge photo required)

  addBox(scene, physicsWorld, RAPIER, {
    size: [10, 1, 10],
    position: [20, -0.5, -10],
    color: 0x999999,
  });

  const photoItemMesh = addBox(scene, physicsWorld, RAPIER, {
    size: [1, 1, 0.1],
    position: [20, 1, 10],
    color: 0xffcc00,
  });

  return photoItemMesh;
}

function buildStage2(scene, physicsWorld, RAPIER) {
  addBox(scene, physicsWorld, RAPIER, {
    size: [40, 1, 40],
    position: [100, -0.5, 0],
    color: 0xaaaaaa,
  });

  addBox(scene, physicsWorld, RAPIER, {
    size: [40, 20, 2],
    position: [100, 10, -10],
    color: 0x776655,
  });

  addBox(scene, physicsWorld, RAPIER, {
    size: [10, 1, 10],
    position: [100, 15, -25],
    color: 0x999999,
  });

  addBox(scene, physicsWorld, RAPIER, {
    size: [3, 4, 0.5],
    position: [100, 17, -29],
    color: 0x33cc66,
  });
}
