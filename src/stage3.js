import * as THREE from 'three';

export function loadStage3(scene, physicsWorld, RAPIER, environmentObjects) {
  // 스테이지 2는 독립된 다른 공간 (y = -100) 에 배치하여 물리적 간섭 방지
  const offsetY = -100;
  
  // 골 플랫폼 상단 (Y = 11.5) 지면이 도착지점
  const portal1Pos = new THREE.Vector3(42, 11.5 + offsetY, 0); 
  const startPos = new THREE.Vector3(0, 2 + offsetY, 0);

  buildStage3Map(scene, physicsWorld, RAPIER, environmentObjects, offsetY);
  buildPortalFrame(scene, physicsWorld, RAPIER, portal1Pos, environmentObjects);

  // 실내 테마 포인트 조명들 추가 (아늑한 미래지향적 테스트실 분위기)
  addStage2CeilingLights(scene, environmentObjects, offsetY);

  // 스테이지 3 노란색 사진 아이템 (사용하지 않으므로 지하에 숨김)
  const photoItemMesh = addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [0.1, 0.1, 0.1],
    position: [0, -10 + offsetY, 0],
    color: 0x000000,
    type: 'prop'
  });
  photoItemMesh.visible = false;

  return { startPos, portal1Pos, photoItemMesh };
}

function addBox(scene, physicsWorld, RAPIER, environmentObjects, { size, position, color = 0x888888, roughness = 0.7, metalness = 0.1, type }) {
  let materials;
  if (type === 'prop') {
    materials = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  } else {
    if (!type) {
      type = (size[1] <= 1.5) ? 'floor' : 'wall';
    }
    const matFloor = new THREE.MeshStandardMaterial({ color: 0x4b5320, roughness: 0.9, metalness: 0.1 });
    const matCeil = new THREE.MeshStandardMaterial({ color: 0xffdab9, roughness: 0.9, metalness: 0.1 });
    
    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffdab9';
    ctx.fillRect(0, 0, 4, 256);
    const baseRatio = Math.min(1.0, 4 / size[1]);
    const basePixels = Math.floor(256 * baseRatio);
    ctx.fillStyle = '#32cd32';
    ctx.fillRect(0, 256 - basePixels, 4, basePixels);
    
    const wallTex = new THREE.CanvasTexture(canvas);
    wallTex.magFilter = THREE.NearestFilter; 
    wallTex.minFilter = THREE.NearestFilter;
    wallTex.colorSpace = THREE.SRGBColorSpace;
    const matWallSide = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.1 });
    
    if (type === 'floor') materials = matFloor;
    else if (type === 'ceiling') materials = matCeil;
    else materials = [matWallSide, matWallSide, matFloor, matCeil, matWallSide, matWallSide];
  }

  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = new THREE.Mesh(geo, materials);
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
  
  mesh.userData.rigidBody = body;

  return mesh;
}

function buildPortalFrame(scene, physicsWorld, RAPIER, position, environmentObjects) {
  const OPENING_W = 3;
  const OPENING_H = 3.5;
  const T = 0.4;
  const frameStyle = { color: 0xaa2222, roughness: 0.3, metalness: 0.8, type: 'prop' }; // 스테이지3 골 포탈 색상 다르게

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
    // 1. 약간 내려오는 전선/케이블 에셋
    const wireGeo = new THREE.BoxGeometry(0.04, 4, 0.04);
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.position.set(x, y - 2 + offsetY, z); 
    scene.add(wireMesh);
    environmentObjects.push(wireMesh);

    // 2. 조명 펜던트 바디
    const fixtureGeo = new THREE.BoxGeometry(1.0, 0.4, 1.0);
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 });
    const fixtureMesh = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixtureMesh.position.set(x, y - 4 + offsetY, z);
    scene.add(fixtureMesh);
    environmentObjects.push(fixtureMesh);

    // 3. 실제 하강식 포인트 조명
    const pLight = new THREE.PointLight(color, 5.0, 50);
    pLight.decay = 1.0;
    pLight.position.set(x, y - 5 + offsetY, z);
    pLight.castShadow = true;
    scene.add(pLight);
    environmentObjects.push(pLight);
  };

  // 시작점 천장 조명
  createHangingLight(5, 40, 0, warmYellow);
  // 골 지점 천장 조명
  createHangingLight(45, 40, 0, neonPink);
}

function buildStage3Map(scene, physicsWorld, RAPIER, environmentObjects, offsetY) {
  // 거대한 실내 챔버 공간 한계 정의
  const roomLength = 70;
  const roomWidth = 50;
  const wallHeight = 40;
  const cx = 25; // 중심 X 좌표
  
  // 1. 거대한 방의 바닥 (Y = -0.5, 윗면은 Y=0)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [roomLength, 1, roomWidth], 
    position: [cx, -0.5 + offsetY, 0], 
    color: 0x3a3d46, 
    roughness: 0.8 
  });

  // 2. 웅장한 실내 천장 (Y = 40.5)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [roomLength, 1, roomWidth], 
    position: [cx, wallHeight + 0.5 + offsetY, 0], 
    color: 0x5e6370, 
    roughness: 0.7,
    type: 'ceiling'
  });

  // 3. 사방의 외벽
  // 왼쪽 뒷벽 (X = -10)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [1, wallHeight, roomWidth], 
    position: [-10.5, wallHeight / 2 + offsetY, 0], 
    color: 0x767c8e, 
    roughness: 0.6 
  });
  // 오른쪽 앞벽 (X = 60)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [1, wallHeight, roomWidth], 
    position: [60.5, wallHeight / 2 + offsetY, 0], 
    color: 0x767c8e, 
    roughness: 0.6 
  });
  // Z쪽 벽 (Z = 25)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [roomLength, wallHeight, 1], 
    position: [cx, wallHeight / 2 + offsetY, 25.5], 
    color: 0x767c8e, 
    roughness: 0.7 
  });
  // -Z쪽 벽 (Z = -25)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [roomLength, wallHeight, 1], 
    position: [cx, wallHeight / 2 + offsetY, -25.5], 
    color: 0x767c8e, 
    roughness: 0.7 
  });

  // --- 실내 지형 구조 (계단식) ---

  // 1) 시작 구역 (Tier 1)은 Y=0 바닥을 그대로 사용. (X: -10 ~ 10)

  // 2) 가로막는 거대한 장애물 벽 (X = 10, 높이 = 6)
  // 방의 전체 너비(Z)를 꽉 채우도록 방해물 배치
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [2, 6, roomWidth], 
    position: [10, 2.5 + offsetY, 0], 
    color: 0xbdc4d4,
    roughness: 0.6
  });

  // 3) 중간 구역 (Tier 2)
  // X = 11 ~ 35 까지 바닥이 통째로 솟아오름 (상단 Y = 7.5)
  // 11부터 35까지 길이 24. 중심은 X = 23
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [24, 7.5, roomWidth], 
    position: [23, 7.5 / 2 - 0.5 + offsetY, 0], 
    color: 0xa9b0c2,
    roughness: 0.5
  });

  // 4) 도착 구역 (Tier 3)
  // X = 35 ~ 60 까지 바닥이 한 번 더 솟아오름 (상단 Y = 11.5)
  // 35부터 60까지 길이 25. 중심은 X = 47.5
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [25, 11.5, roomWidth], 
    position: [47.5, 11.5 / 2 - 0.5 + offsetY, 0], 
    color: 0x8e94a6,
    roughness: 0.6
  });
}