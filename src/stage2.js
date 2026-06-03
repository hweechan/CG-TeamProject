import * as THREE from 'three';

export function loadStage2(scene, physicsWorld, RAPIER, environmentObjects) {
  // 모니터 위치 (터널 안쪽 끝) - 통로 높이 2 상향 조정 (Y=8 -> 10)
  const monitorBasePos = new THREE.Vector3(0, 10.0, 59.4); 
  const portal1Pos = new THREE.Vector3(monitorBasePos.x, monitorBasePos.y + 1.8, monitorBasePos.z); // 스크린 중심부
  const startPos = new THREE.Vector3(0, 2, 10); 

  const photoItemMesh = buildStage2Map(scene, physicsWorld, RAPIER, environmentObjects);
  buildMonitorConsole(scene, physicsWorld, RAPIER, monitorBasePos, environmentObjects);

  addCeilingLights(scene, environmentObjects);

  return { startPos, portal1Pos, photoItemMesh };
}

function addBox(scene, physicsWorld, RAPIER, environmentObjects, { size, position, color = 0x888888, roughness = 0.7, metalness = 0.1, type }) {
  let materials;
  if (type === 'prop' || type === 'accent') {
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
    ctx.fillStyle = '#ffdab9'; // 살구색 베이스
    ctx.fillRect(0, 0, 4, 256);
    
    // 벽 하단부 초록색 띠
    const baseRatio = Math.min(1.0, 4 / size[1]);
    const basePixels = Math.floor(256 * baseRatio);
    ctx.fillStyle = '#32cd32';
    ctx.fillRect(0, 256 - basePixels, 4, basePixels);
    
    const wallTex = new THREE.CanvasTexture(canvas);
    wallTex.magFilter = THREE.NearestFilter; 
    wallTex.minFilter = THREE.NearestFilter;
    wallTex.colorSpace = THREE.SRGBColorSpace;
    
    const matWallSide = new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.1 });
    // 포인트 컬러 벽 (어두운 색상 등)
    const matWallAccent = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1 });

    const sideMaterial = (type === 'wall_accent') ? matWallAccent : matWallSide;

    if (type === 'floor') materials = matFloor;
    else if (type === 'ceiling') materials = matCeil;
    else materials = [sideMaterial, sideMaterial, matFloor, matCeil, sideMaterial, sideMaterial];
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

function buildMonitorConsole(scene, physicsWorld, RAPIER, position, environmentObjects) {
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [1.6, 0.1, 1.2], position: [position.x, position.y + 0.05, position.z], color: 0x1f1f1f, type: 'prop'
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [0.3, 1.0, 0.3], position: [position.x, position.y + 0.6, position.z], color: 0x3a3a3a, type: 'prop'
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [3.2, 2.0, 0.3], position: [position.x, position.y + 1.8, position.z], color: 0x2d2d2d, type: 'prop'
  });

  const screenGeo = new THREE.PlaneGeometry(3.0, 1.8);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(position.x, position.y + 1.8, position.z - 0.16); 
  scene.add(screenMesh);
  environmentObjects.push(screenMesh);
}

function addCeilingLights(scene, environmentObjects) {
  const lightColors = [0x00ffcc, 0xff33aa];
  const createHangingLight = (x, y, z, color) => {
    const pointLight = new THREE.PointLight(color, 4.5, 30);
    pointLight.decay = 1.0;
    pointLight.position.set(x, y - 5, z);
    pointLight.castShadow = true;
    scene.add(pointLight);
    environmentObjects.push(pointLight);
  };

  createHangingLight(0, 28, 0, lightColors[0]);
  createHangingLight(0, 28, 30, lightColors[1]);
}

function buildStage2Map(scene, physicsWorld, RAPIER, environmentObjects) {
  // 방 전체 크기 (50x50, 높이 30)
  const hallLength = 50; 
  const hallWidth = 50;  
  const hallHeight = 30; 
  
  // 1. 기본 방 벽면 (바닥, 천장, 좌우, 앞)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [hallLength, 1, hallWidth], position: [0, -0.5, 25], color: 0x3a3d46, type: 'floor' });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [hallLength, 1, hallWidth], position: [0, 30.5, 25], color: 0x5e6370, type: 'ceiling' });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [1, hallHeight, hallWidth], position: [-25.5, 15, 25], color: 0x767c8e, type: 'wall' });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [1, hallHeight, hallWidth], position: [25.5, 15, 25], color: 0x767c8e, type: 'wall' });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [hallLength, hallHeight, 1], position: [0, 15, -0.5], color: 0x767c8e, type: 'wall' });
  
  // 2. 뒤쪽 목표 벽면 (장애물 벽) - Z=50.5
  // 플레이어가 통과해야 하는 구멍: X = -2.5 ~ 2.5, Y = 8 ~ 20 (폭 5로 축소)
  const wallZ = 50.5;
  
  // 좌측 전체 벽 (X=-25 ~ -2.5, Y=0 ~ 30)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [22.5, 30, 1], position: [-13.75, 15, wallZ], type: 'wall' });
  // 우측 전체 벽 (X=2.5 ~ 25, Y=0 ~ 30)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [22.5, 30, 1], position: [13.75, 15, wallZ], type: 'wall' });
  // 중앙 하단 벽 (X=-2.5 ~ 2.5, Y=0 ~ 10)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [5, 10, 1], position: [0, 5, wallZ], type: 'wall' });
  // 중앙 윗벽 (X=-2.5 ~ 2.5, Y=16 ~ 30) - 공중이므로 초록띠 방지를 위해 ceiling 타입(살구색) 적용
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [5, 14, 1], position: [0, 23, wallZ], type: 'ceiling' });

  // 3. 터널 내부 구조 (Y=10, Z=50.5 ~ 60.5)
  // 터널 벽/바닥을 벽 정중앙(50.5)에서 시작하도록 하여 바깥쪽에서 Z-Fighting 방지
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [5, 1, 10], position: [0, 9.5, 55.5], type: 'floor' }); 
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [1, 6, 10], position: [-3, 13, 55.5], type: 'ceiling' }); 
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [1, 6, 10], position: [3, 13, 55.5], type: 'ceiling' }); 
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [5, 1, 10], position: [0, 16.5, 55.5], type: 'ceiling' }); 
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [5, 6, 1], position: [0, 13, 60.5], type: 'ceiling' }); 

  // 터널 내부 집중 조명 (입구가 아주 잘 보이게)
  const tunnelLight = new THREE.PointLight(0xffa500, 3, 20); // 주황빛
  tunnelLight.position.set(0, 16, 55);
  scene.add(tunnelLight);
  environmentObjects.push(tunnelLight);

  // 안쓰는 Photo Item (숨김)
  const photoItemMesh = addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [0.1, 0.1, 0.1], position: [0, -10, 0], color: 0xffcc00, type: 'prop' });
  photoItemMesh.visible = false;
  return photoItemMesh;
}
