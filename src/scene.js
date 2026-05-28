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

  buildStage1(scene, physicsWorld, RAPIER);
  buildStage2(scene, physicsWorld, RAPIER);

  return { scene };
}

function addBox(scene, physicsWorld, RAPIER, { size, position, color = 0x888888 }) {
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
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

function buildStage1(scene, physicsWorld, RAPIER) {
  // 왼쪽 복도 (키 7, 4, 1) — L자의 세로 부분
  addBox(scene, physicsWorld, RAPIER, {
    size: [10, 1, 30],
    position: [0, -0.5, 0],
    color: 0x999999,
  });

  // 아래쪽 복도 (키 2, 3) — L자의 가로 부분
  addBox(scene, physicsWorld, RAPIER, {
    size: [20, 1, 10],
    position: [15, -0.5, 10],
    color: 0x999999,
  });

  // 끝 플랫폼 (키 9) — 캐즘 건너편
  addBox(scene, physicsWorld, RAPIER, {
    size: [10, 1, 10],
    position: [20, -0.5, -10],
    color: 0x999999,
  });

  // 사진 아이템 더미 (키 3)
  addBox(scene, physicsWorld, RAPIER, {
    size: [1, 1, 0.1],
    position: [20, 1, 10],
    color: 0xffcc00,
  });

  // PC 모니터 더미 (키 9)
  addBox(scene, physicsWorld, RAPIER, {
    size: [2, 1.5, 0.5],
    position: [20, 1, -10],
    color: 0x3366ff,
  });
}

function buildStage2(scene, physicsWorld, RAPIER) {
  // 방 바닥
  addBox(scene, physicsWorld, RAPIER, {
    size: [40, 1, 40],
    position: [100, -0.5, 0],
    color: 0xaaaaaa,
  });

  // 거대한 벽 (통로 차단)
  addBox(scene, physicsWorld, RAPIER, {
    size: [40, 20, 2],
    position: [100, 10, -10],
    color: 0x776655,
  });

  // 높은 출구 플랫폼
  addBox(scene, physicsWorld, RAPIER, {
    size: [10, 1, 10],
    position: [100, 15, -25],
    color: 0x999999,
  });

  // 최종 출구 문
  addBox(scene, physicsWorld, RAPIER, {
    size: [3, 4, 0.5],
    position: [100, 17, -29],
    color: 0x33cc66,
  });
}
