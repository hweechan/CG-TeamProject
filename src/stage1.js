import * as THREE from 'three';

export function loadStage1(scene, physicsWorld, RAPIER, environmentObjects) {
  // 스테이지 1은 오프셋 없이 0, 0, 0에 생성
  const startPos = new THREE.Vector3(0, 2, 0); 
  const portal1Pos = new THREE.Vector3(0, 1.8, 92); // 방 2 끝 모니터(바닥 배치)
  
  const interactables = buildStage1Map(scene, physicsWorld, RAPIER, environmentObjects);
  const photoItemMesh = interactables.photoItemMesh;
  const buttonMesh = interactables.buttonMesh;
  const doorMesh = interactables.doorMesh;
  const doorBody = interactables.doorBody;
  
  // 튜토리얼 텍스트 요소 생성 (index.html에 추가될 예정)
  let tutorialWasd = document.getElementById('tutorial-wasd');
  let tutorialGrab = document.getElementById('tutorial-grab');
  
  // UI 요소가 HTML에 아직 없을 경우 생성 (개발자 모드나 런타임 추가 대비)
  if (!tutorialWasd) {
    tutorialWasd = document.createElement('div');
    tutorialWasd.id = 'tutorial-wasd';
    tutorialWasd.textContent = 'WASD 키를 눌러 이동하세요';
    Object.assign(tutorialWasd.style, {
      position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
      color: '#fff', fontFamily: "'Noto Sans KR', sans-serif", fontSize: '32px', textShadow: '2px 2px 4px #000',
      zIndex: '100', pointerEvents: 'none', display: 'none'
    });
    document.body.appendChild(tutorialWasd);
  }
  
  if (!tutorialGrab) {
    tutorialGrab = document.createElement('div');
    tutorialGrab.id = 'tutorial-grab';
    tutorialGrab.textContent = '마우스를 클릭하여 물체를 집으세요';
    Object.assign(tutorialGrab.style, {
      position: 'fixed', top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
      color: '#00ffcc', fontFamily: "'Noto Sans KR', sans-serif", fontSize: '32px', textShadow: '2px 2px 4px #000',
      zIndex: '100', pointerEvents: 'none', display: 'none'
    });
    document.body.appendChild(tutorialGrab);
  }

  // Update 함수: main.js의 게임 루프에서 매 프레임 호출됨
  // 플레이어 위치나 물리 상태에 따른 기믹(버튼, 문, 튜토리얼) 제어
  const update = (delta, playerPos, pickableObjects) => {
    // 1. 튜토리얼 UI 표시 로직
    // 시작 방 (Z < 25)
    if (playerPos.z < 25) {
      tutorialWasd.style.display = 'block';
      tutorialGrab.style.display = 'none';
    } 
    // 터널 내부 (버튼 구역, Z >= 25 && Z < 45)
    else if (playerPos.z >= 25 && playerPos.z < 45) {
      tutorialWasd.style.display = 'none';
      tutorialGrab.style.display = 'block';
    }
    // 터널 후반 및 끝 방 (Z >= 45)
    else if (playerPos.z >= 45) {
      tutorialWasd.style.display = 'none';
      tutorialGrab.style.display = 'none';
    }

    // 2. 버튼 눌림 로직 (플레이어나 치즈 큐브가 버튼 주변 AABB/거리에 들어왔는지 확인)
    const buttonPos = new THREE.Vector3(0, 0, 55); // 문(Z=64.5)에 가깝게 이동
    const buttonRadius = 1.3; // 인식 반경 (2/3 크기로 줄임)
    let isPressed = false;
    
    // 플레이어 거리 체크 (Y 높이 차이 고려하여 2D 거리 기반으로 판정)
    const dxP = playerPos.x - buttonPos.x;
    const dzP = playerPos.z - buttonPos.z;
    if (Math.sqrt(dxP*dxP + dzP*dzP) < buttonRadius && Math.abs(playerPos.y - buttonPos.y) < 3) {
      isPressed = true;
    }

    // 치즈 거리 체크
    if (!isPressed) {
      for (let obj of pickableObjects) {
        const dx = obj.position.x - buttonPos.x;
        const dz = obj.position.z - buttonPos.z;
        if (Math.sqrt(dx*dx + dz*dz) < buttonRadius && Math.abs(obj.position.y - buttonPos.y) < 2) {
          isPressed = true;
          break;
        }
      }
    }

    // 버튼 눌림 애니메이션 및 문 열림 로직
    if (isPressed) {
      buttonMesh.position.y = THREE.MathUtils.lerp(buttonMesh.position.y, 0.05, 10 * delta); // 버튼 들어감
    } else {
      buttonMesh.position.y = THREE.MathUtils.lerp(buttonMesh.position.y, 0.2, 10 * delta); // 버튼 올라옴
    }

    // 문 슬라이딩 애니메이션 (Mesh와 Physics 모두 동기화)
    const targetDoorY = isPressed ? 12 : 4;
    doorMesh.position.y = THREE.MathUtils.lerp(doorMesh.position.y, targetDoorY, 5 * delta);
    doorBody.setNextKinematicTranslation({ x: 0, y: doorMesh.position.y, z: 65 });
  };

  // cleanup 함수: 스테이지 넘어갈 때 UI 숨기기
  const cleanup = () => {
    tutorialWasd.style.display = 'none';
    tutorialGrab.style.display = 'none';
  };

  return { startPos, portal1Pos, photoItemMesh, update, cleanup };
}

function buildStage1Map(scene, physicsWorld, RAPIER, environmentObjects) {
  // 방 1: 튜토리얼 1 (WASD) 방 (50x50, Z: -25 ~ 25)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [50, 1, 50], position: [0, -0.5, 0], color: 0x3a3d46 }); // 바닥
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [50, 15, 1], position: [0, 7.5, -25], color: 0x5e6370 }); // 뒷벽
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [1, 15, 50], position: [-25, 7.5, 0], color: 0x767c8e }); // 왼쪽 벽
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [1, 15, 50], position: [25, 7.5, 0], color: 0x767c8e }); // 오른쪽 벽
  
  // 방 1 앞벽 (터널 구멍 뚫기, 터널 폭 10)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [20, 15, 1], position: [-15, 7.5, 25], color: 0x5e6370 });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [20, 15, 1], position: [15, 7.5, 25], color: 0x5e6370 });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [10, 7, 1], position: [0, 11.5, 25], color: 0x5e6370, type: 'ceiling' }); // 터널 위쪽

  // 긴 터널 (Z: 25 ~ 65) 길이 40
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [10, 1, 40], position: [0, -0.5, 45], color: 0x2e313b }); // 터널 바닥
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [10, 1, 40], position: [0, 15.5, 45], color: 0x2e313b, type: 'ceiling' }); // 터널 천장
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [1, 15, 40], position: [-5, 7.5, 45], color: 0x484c57 }); // 터널 왼쪽
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [1, 15, 40], position: [5, 7.5, 45], color: 0x484c57 }); // 터널 오른쪽

  // 방 2: 기믹 방 (14x30, Z: 65 ~ 95)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [14, 1, 30], position: [0, -0.5, 80], color: 0x3a3d46 }); // 바닥
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [1, 20, 30], position: [-7, 9.5, 80], color: 0x767c8e }); // 왼쪽 벽
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [1, 20, 30], position: [7, 9.5, 80], color: 0x767c8e }); // 오른쪽 벽
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [14, 20, 1], position: [0, 9.5, 95], color: 0x5e6370 }); // 끝 뒷벽

  // 방 2 앞벽 (터널 입구를 샌드위치 구조로 뚫기)
  // 왼쪽, 오른쪽 기둥 (두께 3)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [2, 20, 3], position: [-6, 9.5, 65], color: 0x5e6370 });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [2, 20, 3], position: [6, 9.5, 65], color: 0x5e6370 });
  
  // 샌드위치 앞면 벽 (터널 안쪽)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [10, 12, 1], position: [0, 14, 64], color: 0x5e6370, type: 'ceiling' });
  // 샌드위치 뒷면 벽 (방 2 안쪽)
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [10, 12, 1], position: [0, 14, 66], color: 0x5e6370, type: 'ceiling' });
  // 중간 Z=65에는 문이 슬라이딩해서 올라갈 수 있는 틈이 존재함

  // 버튼 테두리 (회색 Torus, 2/3 크기)
  const borderGeo = new THREE.TorusGeometry(1.1, 0.15, 16, 32);
  const borderMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
  const borderMesh = new THREE.Mesh(borderGeo, borderMat);
  borderMesh.rotation.x = Math.PI / 2;
  borderMesh.position.set(0, 0.15, 55); // 바닥에 직접 닿게 배치, 문(64.5)에 가깝게
  borderMesh.castShadow = true;
  borderMesh.receiveShadow = true;
  scene.add(borderMesh);
  environmentObjects.push(borderMesh);

  // 실제 파란색 버튼 (Cylinder, 2/3 크기)
  const buttonGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.26, 32);
  const buttonMat = new THREE.MeshStandardMaterial({ color: 0x0066ff, roughness: 0.2, metalness: 0.8 });
  const buttonMesh = new THREE.Mesh(buttonGeo, buttonMat);
  buttonMesh.position.set(0, 0.2, 55); // 기본적으로 살짝 위로 올라와 있음
  buttonMesh.castShadow = true;
  buttonMesh.receiveShadow = true;
  scene.add(buttonMesh);
  environmentObjects.push(buttonMesh);

  // 슬라이딩 도어 벽 생성 (Z=65 샌드위치 틈)
  const doorSize = [10, 8, 1];
  const doorGeo = new THREE.BoxGeometry(doorSize[0], doorSize[1], doorSize[2]);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, transparent: true, opacity: 0.7, depthWrite: false });
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.position.set(0, 4, 65); 
  scene.add(doorMesh);
  environmentObjects.push(doorMesh);

  const doorBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 4, 65);
  const doorBody = physicsWorld.createRigidBody(doorBodyDesc);
  const doorColliderDesc = RAPIER.ColliderDesc.cuboid(doorSize[0]/2, doorSize[1]/2, doorSize[2]/2);
  physicsWorld.createCollider(doorColliderDesc, doorBody);
  
  doorMesh.userData.rigidBody = doorBody;

  // 끝 방의 모니터 (포탈, 바닥에 배치 Y=0)
  buildMonitorConsole(scene, physicsWorld, RAPIER, new THREE.Vector3(0, 0, 92), environmentObjects);

  // 조명 배치
  const pLight1 = new THREE.PointLight(0xffffff, 2.5, 80);
  pLight1.position.set(0, 12, 0); // 시작 방
  scene.add(pLight1);
  environmentObjects.push(pLight1);

  // 터널 조명
  const tLight1 = new THREE.PointLight(0x4488ff, 1.5, 30);
  tLight1.position.set(0, 10, 45); // 터널 중간
  scene.add(tLight1);
  environmentObjects.push(tLight1);

  // 퍼즐 방 조명 (Z=80으로 당김)
  const pLight2 = new THREE.PointLight(0xffaa00, 3, 80);
  pLight2.position.set(0, 15, 80); 
  scene.add(pLight2);
  environmentObjects.push(pLight2);

  // 안쓰는 사진 아이템 (지하)
  const photoItemMesh = addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [0.1, 0.1, 0.1], position: [0, -10, 0], color: 0x000, type: 'prop' });
  photoItemMesh.visible = false;

  return { photoItemMesh, buttonMesh, doorMesh, doorBody };
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

  const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(position[0], position[1], position[2]);
  const body = physicsWorld.createRigidBody(bodyDesc);
  const colliderDesc = RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2);
  physicsWorld.createCollider(colliderDesc, body);
  
  mesh.userData.rigidBody = body;

  return mesh;
}

function buildMonitorConsole(scene, physicsWorld, RAPIER, position, environmentObjects) {
  // 모니터 본체
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [3.2, 2.0, 0.3], position: [position.x, position.y + 1.8, position.z], color: 0x111111, metalness: 0.9, type: 'prop' });
  // 모니터 스탠드 넥
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [0.4, 0.8, 0.4], position: [position.x, position.y + 0.4, position.z], color: 0x333333, metalness: 0.8, type: 'prop' });
  // 모니터 받침대
  addBox(scene, physicsWorld, RAPIER, environmentObjects, { size: [1.6, 0.1, 1.0], position: [position.x, position.y + 0.05, position.z], color: 0x444444, metalness: 0.6, type: 'prop' });

  // 모니터 스크린 (플레이어를 향하게 Z-0.16)
  const screenGeo = new THREE.PlaneGeometry(3.0, 1.8);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(position.x, position.y + 1.8, position.z - 0.16);
  scene.add(screenMesh);
  environmentObjects.push(screenMesh);
}