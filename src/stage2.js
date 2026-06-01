import * as THREE from 'three';

export function loadStage2(scene, physicsWorld, RAPIER, environmentObjects) {
  // 스테이지 2는 독립된 다른 공간 (y = -100) 에 배치하여 물리적 간섭 방지
  const offsetY = -100;
  
  // 골 플랫폼 상단 (Y = 11.5) 지면이 도착지점
  const portal1Pos = new THREE.Vector3(42, 11.5 + offsetY, 0); 
  const startPos = new THREE.Vector3(0, 2 + offsetY, 0);

  buildStage2Map(scene, physicsWorld, RAPIER, environmentObjects, offsetY);
  buildPortalFrame(scene, physicsWorld, RAPIER, portal1Pos, environmentObjects);

  // 실내 테마 포인트 조명들 추가 (아늑한 미래지향적 테스트실 분위기)
  addStage2CeilingLights(scene, environmentObjects, offsetY);

  // 스테이지 2 노란색 사진 아이템 (중간 하이 플랫폼 위에 배치)
  const photoItemMesh = addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [1.2, 0.8, 0.1],
    position: [22, 7.5 + offsetY + 0.6, 0],
    color: 0xffcc00, 
    metalness: 0.5
  });

  return { startPos, portal1Pos, photoItemMesh };
}

function addBox(scene, physicsWorld, RAPIER, environmentObjects, { size, position, color = 0x888888, roughness = 0.7, metalness = 0.1 }) {
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  environmentObjects.push(mesh);

  const bodyDesc = RAPIER.RigidBodyDesc.fixed()
    .setTranslation(position[0], position[1], position[2]);
  const body = physicsWorld.createRigidBody(bodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2);
  physicsWorld.createCollider(colliderDesc, body);

  return mesh;
}

function buildPortalFrame(scene, physicsWorld, RAPIER, position, environmentObjects) {
  const OPENING_W = 3;
  const OPENING_H = 3.5;
  const T = 0.4;
  const frameStyle = { color: 0xaa2222, roughness: 0.3, metalness: 0.8 }; // 스테이지2 골 포탈 색상 다르게

  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [T, OPENING_H, T],
    position: [position.x - OPENING_W / 2 - T / 2, position.y + OPENING_H / 2, position.z], ...frameStyle
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [T, OPENING_H, T],
    position: [position.x + OPENING_W / 2 + T / 2, position.y + OPENING_H / 2, position.z], ...frameStyle
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [OPENING_W + T * 2, T, T],
    position: [position.x, position.y + OPENING_H + T / 2, position.z], ...frameStyle
  });

  const portalGeo = new THREE.PlaneGeometry(OPENING_W, OPENING_H);
  const portalMat = new THREE.MeshBasicMaterial({ color: 0xff33aa, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
  const portalMesh = new THREE.Mesh(portalGeo, portalMat);
  portalMesh.position.set(position.x, position.y + OPENING_H / 2, position.z);
  scene.add(portalMesh);
}

function addStage2CeilingLights(scene, environmentObjects, offsetY) {
  const neonPink = 0xff00bb;
  const warmYellow = 0xffaa00;

  const createHangingLight = (x, y, z, color) => {
    // 1. 길게 내려오는 전선/케이블 에셋 (천장 Y=20 에서 8미터 하강해 Y=12 공중에 걸림)
    const wireGeo = new THREE.BoxGeometry(0.04, 8, 0.04);
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.position.set(x, y - 4 + offsetY, z); 
    scene.add(wireMesh);
    environmentObjects.push(wireMesh);

    // 2. 조명 펜던트 바디
    const fixtureGeo = new THREE.BoxGeometry(1.0, 0.4, 1.0);
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 });
    const fixtureMesh = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixtureMesh.position.set(x, y - 8 + offsetY, z);
    scene.add(fixtureMesh);
    environmentObjects.push(fixtureMesh);

    // 3. 실제 하강식 포인트 조명 (intensity 5.0, 범위 30)
    const pLight = new THREE.PointLight(color, 5.0, 30);
    pLight.decay = 1.0;
    pLight.position.set(x, y - 9 + offsetY, z);
    pLight.castShadow = true;
    scene.add(pLight);
    environmentObjects.push(pLight);
  };

  // 시작점과 장벽 사이 천장 조명
  createHangingLight(5, 20, -5, warmYellow);
  // 골 지점 천장 조명
  createHangingLight(35, 20, 5, neonPink);
}

function buildStage2Map(scene, physicsWorld, RAPIER, environmentObjects, offsetY) {
  // 거대한 실내 챔버 공간 한계 정의 (Industrial Testing Hangar)
  const hallLength = 70;
  const hallWidth = 46;
  const hallHeight = 36;
  
  // 1. 심연의 실내 바닥 (구렁텅이 밑면 Y = -15.5)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [hallLength, 1, hallWidth], 
    position: [21, -15.5 + offsetY, 0], 
    color: 0x484c57, 
    roughness: 0.8 
  });

  // 2. 웅장한 실내 천장 (Y = 20.0)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [hallLength, 1, hallWidth], 
    position: [21, 19.5 + offsetY, 0], 
    color: 0x767c8e, 
    roughness: 0.7 
  });

  // 3. 외벽 (Z = ±23.0 - 시원하게 벌림)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [hallLength, hallHeight, 1], 
    position: [21, 2 + offsetY, -23], 
    color: 0x9ba2b5, 
    roughness: 0.6 
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [hallLength, hallHeight, 1], 
    position: [21, 2 + offsetY, 23], 
    color: 0x9ba2b5, 
    roughness: 0.6 
  });

  // 4. 시작 뒷벽 (X = -20.0) 및 골 뒷벽 (X = 50.0)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [1, hallHeight, hallWidth], 
    position: [-20, 2 + offsetY, 0], 
    color: 0x767c8e, 
    roughness: 0.7 
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [1, hallHeight, hallWidth], 
    position: [50, 2 + offsetY, 0], 
    color: 0x767c8e, 
    roughness: 0.7 
  });

  // --- 공장 구조 지지용 세로 철골 H-Beam 기둥 배치 ---
  const addPillar = (x, z) => {
    addBox(scene, physicsWorld, RAPIER, environmentObjects, {
      size: [1.2, hallHeight, 1.2],
      position: [x, 2 + offsetY, z],
      color: 0x2e313b,
      roughness: 0.5,
      metalness: 0.9
    });
  };
  addPillar(-10, -22.2); addPillar(-10, 22.2);
  addPillar(15, -22.2);  addPillar(15, 22.2);
  addPillar(40, -22.2);  addPillar(40, 22.2);

  // --- 플레이어용 플로팅 세그먼트 메쉬 및 묵직한 하부 지지 콘크리트 철탑 생성 ---

  // 1) 시작 플랫폼 (지면 Y = -0.5)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [12, 1, 12], 
    position: [0, -0.5 + offsetY, 0], 
    color: 0xa9b0c2,
    roughness: 0.5
  });
  // 시작 플랫폼 지붕을 받치는 거대 하부 기둥 (Y = -0.5 ~ -15.5)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [4, 15, 4],
    position: [0, -8.0 + offsetY, 0],
    color: 0x6e7485,
    roughness: 0.7
  });

  // 2) 가로막는 장애물 벽 (이 벽을 치즈를 밟아 올라가 넘어가야 함)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [2, 6, 12], 
    position: [10, 2.5 + offsetY, 0], 
    color: 0xbdc4d4,
    roughness: 0.6
  });

  // 3) 중간 플랫폼 (하이 플랫폼 - 상단 높이 Y = 3.5 + 4.0 = 7.5 + offsetY)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [12, 8, 12], 
    position: [22, 3.5 + offsetY, 0], 
    color: 0xa9b0c2,
    roughness: 0.5
  });
  // 중간 플랫폼 지붕을 받치는 거대 하부 기둥 (Y = 3.5 ~ -15.5)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [4, 19, 4],
    position: [22, -6.0 + offsetY, 0],
    color: 0x6e7485,
    roughness: 0.7
  });

  // 4) 도착 골 플랫폼 (매우 높음 - 상단 높이 Y = 5.5 + 6.0 = 11.5 + offsetY)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [12, 12, 12], 
    position: [42, 5.5 + offsetY, 0], 
    color: 0x8e94a6,
    roughness: 0.6
  });
  // 도착 골 플랫폼 지붕을 받치는 거대 하부 기둥 (Y = 5.5 ~ -15.5)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [4, 21, 4],
    position: [42, -5.0 + offsetY, 0],
    color: 0x6e7485,
    roughness: 0.7
  });
}