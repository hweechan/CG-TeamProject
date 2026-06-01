import * as THREE from 'three';

export function loadStage1(scene, physicsWorld, RAPIER, environmentObjects) {
  // 포탈 1은 도착지점 (스테이지 2로 가는 모니터 화면)
  const portal1Pos = new THREE.Vector3(40, 7.5, 0);
  const startPos = new THREE.Vector3(0, 2, 10); // 스테이지 시작 시 스폰될 위치

  const photoItemMesh = buildPuzzleMap(scene, physicsWorld, RAPIER, environmentObjects);
  buildMonitorConsole(scene, physicsWorld, RAPIER, portal1Pos, environmentObjects);

  // 웅장한 천장 구조에 매달린 격납고 조명 설치
  addCeilingLights(scene, environmentObjects);

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

function buildMonitorConsole(scene, physicsWorld, RAPIER, position, environmentObjects) {
  // 1. 받침대 (Base)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [1.6, 0.1, 1.2],
    position: [position.x, position.y + 0.05, position.z],
    color: 0x1f1f1f,
    roughness: 0.5,
    metalness: 0.8
  });

  // 2. 기둥 (Stand)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [0.3, 1.0, 0.3],
    position: [position.x, position.y + 0.6, position.z],
    color: 0x3a3a3a,
    roughness: 0.6,
    metalness: 0.5
  });

  // 3. 모니터 본체 (Body)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [3.2, 2.0, 0.3],
    position: [position.x, position.y + 1.8, position.z],
    color: 0x2d2d2d,
    roughness: 0.4,
    metalness: 0.6
  });

  // 4. 모니터 스크린 (Screen) - Z+ 방향을 바라보는 플레이어 쪽으로 배치
  const screenGeo = new THREE.PlaneGeometry(3.0, 1.8);
  const screenMat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc, // 사이버네틱 펄스 청록색
    side: THREE.DoubleSide
  });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(position.x, position.y + 1.8, position.z + 0.16);
  scene.add(screenMesh);
  environmentObjects.push(screenMesh);
}

function addCeilingLights(scene, environmentObjects) {
  // 아주 높은 천장(Y=28)에 웅장한 케이블 조명 하강식으로 매달기
  const lightColors = [0x00ffcc, 0xff33aa]; // 청록 / 자주
  
  const createHangingLight = (x, y, z, color) => {
    // 1. 길게 내려오는 전선/케이블 에셋
    const wireGeo = new THREE.BoxGeometry(0.05, 10, 0.05);
    const wireMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.position.set(x, y - 5, z); // 천장 Y=28 에서 10미터 내려와 Y=23에 조명이 걸림
    scene.add(wireMesh);
    environmentObjects.push(wireMesh);

    // 2. 조명 펜던트 바디
    const fixtureGeo = new THREE.BoxGeometry(1.2, 0.5, 1.2);
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 });
    const fixtureMesh = new THREE.Mesh(fixtureGeo, fixtureMat);
    fixtureMesh.position.set(x, y - 10, z);
    scene.add(fixtureMesh);
    environmentObjects.push(fixtureMesh);

    // 3. 발광 스크린
    const bulbGeo = new THREE.BoxGeometry(1.0, 0.1, 1.0);
    const bulbMat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const bulbMesh = new THREE.Mesh(bulbGeo, bulbMat);
    bulbMesh.position.set(x, y - 10.25, z);
    scene.add(bulbMesh);
    environmentObjects.push(bulbMesh);

    // 4. 실제 하강식 포인트 조명 (intensity 4.5, 범위 30)
    const pointLight = new THREE.PointLight(color, 4.5, 30);
    pointLight.decay = 1.0;
    pointLight.position.set(x, y - 11.5, z);
    pointLight.castShadow = true;
    scene.add(pointLight);
    environmentObjects.push(pointLight);
  };

  // Starting Area 위에 하나 매달기
  createHangingLight(0, 28, 0, lightColors[0]);
  // Chasm 격납고 중앙 공중에 하나 매달기
  createHangingLight(22, 28, 5, lightColors[1]);
  // Exit Area 위에 하나 매달기
  createHangingLight(40, 28, 0, lightColors[0]);
}

function buildPuzzleMap(scene, physicsWorld, RAPIER, environmentObjects) {
  // 거대한 하나의 실내 공장 챔버(Industrial Testing Hall) 구축
  const hallLength = 70; // X축
  const hallWidth = 46;  // Z축
  const hallHeight = 44; // Y축
  
  // 1. 공장 바닥 (심연 - 구렁텅이 밑면 Y = -16.0)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [hallLength, 1, hallWidth], 
    position: [15, -16.5, 0], 
    color: 0x3a3d46, 
    roughness: 0.8 
  });

  // 2. 웅장한 트러스 천장 (Y = 28.0)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [hallLength, 1, hallWidth], 
    position: [15, 28.5, 0], 
    color: 0x5e6370, 
    roughness: 0.7 
  });

  // 3. 광활한 공장 좌우 외벽 (Z = ±23.0)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [hallLength, hallHeight, 1], 
    position: [15, 6, -23], 
    color: 0x767c8e, 
    roughness: 0.6 
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [hallLength, hallHeight, 1], 
    position: [15, 6, 23], 
    color: 0x767c8e, 
    roughness: 0.6 
  });

  // 4. 격납고 전후방 뒷벽 (X = -20.0 및 X = 50.0)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [1, hallHeight, hallWidth], 
    position: [-20, 6, 0], 
    color: 0x5e6370, 
    roughness: 0.7 
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { 
    size: [1, hallHeight, hallWidth], 
    position: [50, 6, 0], 
    color: 0x5e6370, 
    roughness: 0.7 
  });

  // --- 공장 벽면 장식용 H-Beam 철골 기둥 (Structural Pillars) ---
  const addPillar = (x, z) => {
    addBox(scene, physicsWorld, RAPIER, environmentObjects, {
      size: [1.2, hallHeight, 1.2],
      position: [x, 6, z],
      color: 0x2e313b,
      roughness: 0.5,
      metalness: 0.9
    });
  };
  addPillar(-10, -22.2); addPillar(-10, 22.2);
  addPillar(15, -22.2);  addPillar(15, 22.2);
  addPillar(40, -22.2);  addPillar(40, 22.2);

  // --- 플레이테스트용 오리지널 맵 핵심 지형 배치 (광활한 격납고 안에 떠 있는 구조) ---

  // 1) Starting Room (두꺼운 지반 큐브, Y = 0.0 지면)
  // X = [-10, 10], Z = [-10, 10]
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [20, 1, 20], position: [0, -0.5, 0], color: 0x8a92a3, roughness: 0.6 });
  
  // Starting Room 옆면 차단 보조 펜스 (낙하 방지용 얇은 빔)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [0.3, 1.5, 20], position: [-9.85, 0.75, 0], color: 0x3d414c }); // 좌측 펜스
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [20, 1.5, 0.3], position: [0, 0.75, -9.85], color: 0x3d414c }); // 뒤쪽 펜스 1
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [20, 1.5, 0.3], position: [0, 0.75, 9.85], color: 0x3d414c });  // 뒤쪽 펜스 2

  // 2) High Ledge (중간에 있는 웅장한 지반 블록)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [10, 8, 20], position: [15, 3.5, 0], color: 0xa9b0c2, roughness: 0.5 });

  // 3) Final Platform (도착 지면 플랫폼, Y = 7.5 지면)
  // X = [35, 45], Z = [-10, 10]
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [10, 8, 20], position: [40, 3.5, 0], color: 0x9ba2b5, roughness: 0.6 });
  // Final platform 뒤쪽 마감벽 (여기에 모니터 콘솔이 어우러져 설치됨)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [0.6, 12, 20], position: [44.7, 9.5, 0], color: 0x6e7485, roughness: 0.7 });

  // 4) Photo Item (Placed on the first High Ledge)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [1, 1, 1], position: [15, 8, 0], color: 0x2b2b2b });
  
  const photoItemMesh = addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [1.2, 0.8, 0.1],
    position: [15, 8.6, 0],
    color: 0xffcc00, 
    metalness: 0.5
  });

  return photoItemMesh;
}