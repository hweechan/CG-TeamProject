import * as THREE from 'three';
import { GimmickInfiniteCorridor } from './gimmickInfiniteCorridor.js';
import { createPictogram } from './object.js';

export function loadStage4(scene, physicsWorld, RAPIER, environmentObjects) {
  const offsetY = -300;
  const startPos = new THREE.Vector3(0, 2 + offsetY, -10);
  const portal1Pos = new THREE.Vector3(0, -9999, 0); 

  const corridor = new GimmickInfiniteCorridor(scene, physicsWorld, RAPIER, environmentObjects, {
    offsetY: offsetY,
    width: 10,
    height: 15,
    depth: 40,
    loopZ: 40,
    returnZDelta: 40
  });

  const pickables = [];
  const startRoomCenter = new THREE.Vector3(0, offsetY + 0.5, -10);
  const snapZonePos = new THREE.Vector3(0, offsetY + 7.5, 39.9);

  // 스냅 존 가이드라인
  const snapZone = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 2),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
  );
  snapZone.position.copy(snapZonePos);
  snapZone.visible = false;
  scene.add(snapZone);

  // 1. 초기 스냅되어 있는 유턴 표지판 생성
  const uturnSign = createPictogram(scene, physicsWorld, RAPIER, {
    texturePath: 'asset/uturn.jpg', type: 'uturn',
    position: [snapZonePos.x, snapZonePos.y, snapZonePos.z],
    scale: [3.333, 3.333, 3.333],
    hasGravity: false // 처음엔 고정
  });
  uturnSign.userData.isSnapped = true;
  pickables.push(uturnSign);

  // 2. 시작 방 벽면에 장식용 가짜 표지판들 부착
  const fakeTextures = [
    'asset/leftturn.jpg', 'asset/staffonly.jpg', 'asset/toilet.png',
    'asset/free-icon-caution-17317523.png', 'asset/free-icon-dance-4766750.png',
    'asset/free-icon-gps-17317496.png', 'asset/free-icon-man-657680.png',
    'asset/free-icon-man-9567125.png', 'asset/free-icon-man-9567155.png',
    'asset/hospital.png', 'asset/message.png', 'asset/parking.png'
  ];
  
  for (let i = 0; i < 120; i++) {
    const wallType = Math.floor(Math.random() * 3); // 0: 왼쪽 벽, 1: 오른쪽 벽, 2: 뒷벽
    let px, pz, rotY;
    
    // 시작방 좌표: X=-10~10, Z=-20~0, Y=offsetY ~ offsetY+15
    const py = offsetY + 2 + Math.random() * 10;
    
    if (wallType === 0) {
      px = -9.9; // 왼쪽 벽
      pz = -19 + Math.random() * 18;
      rotY = Math.PI / 2;
    } else if (wallType === 1) {
      px = 9.9; // 오른쪽 벽
      pz = -19 + Math.random() * 18;
      rotY = -Math.PI / 2;
    } else {
      px = -9 + Math.random() * 18; // 뒷벽
      pz = -19.9;
      rotY = 0;
    }
    
    const fake = createPictogram(scene, physicsWorld, RAPIER, {
      texturePath: fakeTextures[Math.floor(Math.random() * fakeTextures.length)],
      type: 'fake',
      position: [px, py, pz],
      scale: [1.2 + Math.random(), 1.2 + Math.random(), 1.2 + Math.random()],
      hasGravity: false
    });
    fake.rotation.y = rotY;
    pickables.push(fake);
  }

  // 3. 진짜 비상구 표지판 (다른 표지판의 1/6 정도 크기로 구석 바닥에 숨김)
  const exitSign = createPictogram(scene, physicsWorld, RAPIER, {
    texturePath: 'asset/exit.png', type: 'exit',
    position: [9, offsetY + 0.5, -19], // 오른쪽 구석 바닥 부근
    scale: [0.3, 0.3, 0.3], // 너무 작지 않은 0.3 스케일
    hasGravity: false
  });
  pickables.push(exitSign);

  // ── 끝 방 모니터 (스테이지 1, 2와 동일한 외형) ──
  const monX = 0, monY = offsetY, monZ = 58;
  const monitorGroup = new THREE.Group();
  
  const baseMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 1.0), new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.6 }));
  baseMesh.position.set(monX, monY + 0.05, monZ);
  baseMesh.castShadow = true; baseMesh.receiveShadow = true;
  monitorGroup.add(baseMesh);

  const neckMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.4), new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 }));
  neckMesh.position.set(monX, monY + 0.4, monZ);
  neckMesh.castShadow = true; neckMesh.receiveShadow = true;
  monitorGroup.add(neckMesh);

  const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 0.3), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 }));
  bodyMesh.position.set(monX, monY + 1.8, monZ);
  bodyMesh.castShadow = true; bodyMesh.receiveShadow = true;
  monitorGroup.add(bodyMesh);

  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 1.8), new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide }));
  screenMesh.position.set(monX, monY + 1.8, monZ - 0.16);
  monitorGroup.add(screenMesh);
  scene.add(monitorGroup);
  
  const monitorBody = physicsWorld.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(monX, monY + 1.4, monZ));
  physicsWorld.createCollider(RAPIER.ColliderDesc.cuboid(1.6, 1.4, 0.5), monitorBody);

  let gimmickDone = false;

  function update(delta, cameraPos, pickableObjects, fpsController, fp) {
    if (gimmickDone) {
      portal1Pos.set(0, offsetY + 4, 55);
    } else {
      portal1Pos.set(0, -9999, 0); // 닫혀있음
    }

    let hasExitSignSnapped = false;

    // 모든 픽토그램 순회하며 스냅 로직 적용
    for (let i = 0; i < pickables.length; i++) {
      const picto = pickables[i];
      
      // 누군가 스냅된 물체를 다시 짚었으면 스냅 해제
      if (picto.userData.isSnapped && picto.userData._isHeld) {
        picto.userData.isSnapped = false;
        // 강제원근법 로직이 놓을 때 알아서 dynamic으로 복구함
      }
      
      // 스냅 판정 (잡고 있는 상태 + 거리가 가깝고 + 스케일이 어느정도 커졌을 때 자석효과 발동)
      // 잡고 있는 중에는 스냅 판정을 건너뛰어 다시 떼어낼 수 있게 함!
      if (!picto.userData.isSnapped && !picto.userData._isHeld) {
        const dist = picto.position.distanceTo(snapZonePos);
        // 표지판 스케일이 2.0 이상이고 스냅존 반경 3.5 안에 있으면 스냅!
        if (picto.scale.y > 2.0 && dist < 3.5) {
          picto.userData.isSnapped = true;
          
          if (fp && fp.isHolding && fp.heldObject === picto) {
            fp.forceDrop();
          }
          
          const targetScale = new THREE.Vector3(3.333, 3.333, 3.333);
          picto.scale.copy(targetScale);
          // Z-fighting이나 투명도 정렬 이슈로 숨겨지는 것을 방지하기 위해 0.05만큼 앞으로 돌출시킴
          picto.position.set(snapZonePos.x, snapZonePos.y, snapZonePos.z - 0.05);
          picto.rotation.set(0, 0, 0);
          
          // 물리 업데이트를 큐 뒤로 미룸
          setTimeout(() => {
            if (picto.userData.rigidBody) {
              picto.userData.rigidBody.setTranslation(snapZonePos.x, snapZonePos.y, snapZonePos.z - 0.05, true);
              picto.userData.rigidBody.setRotation({x:0, y:0, z:0, w:1}, true);
              // BodyType을 바꾸는 것은 물리 엔진 에러를 유발하므로
              // 타입은 그대로(Dynamic) 두고 속도만 0으로 만들어서 멈춰있게 함 (무중력이므로 떨어지지 않음)
              picto.userData.rigidBody.setLinvel({x: 0, y: 0, z: 0}, true);
              picto.userData.rigidBody.setAngvel({x: 0, y: 0, z: 0}, true);
              
              // 벽과 정확히 겹쳤을 때 물리 엔진이 폭주(unreachable)하는 것을 방지하기 위해 콜라이더 영구 삭제
              if (picto.userData.collider && typeof physicsWorld !== 'undefined') {
                physicsWorld.removeCollider(picto.userData.collider, true);
                picto.userData.collider = null;
              }
            }
          }, 0);
        }
      }
      
      // 현재 스냅된 물체가 무엇인지 확인
      if (picto.userData.isSnapped && picto.userData.pictoType === 'exit') {
        hasExitSignSnapped = true;
      }
    }

    // 비상구 표지판이 스냅되어 있으면 문 오픈, 아니면 무한 루프 가동
    if (hasExitSignSnapped) {
      if (!gimmickDone) {
        console.log('[Stage4] 비상구 스냅 완료! 무한 루프 탈출 가능');
        gimmickDone = true;
        corridor.loopZ = 99999;
      }
    } else {
      if (gimmickDone) {
        console.log('[Stage4] 비상구가 제거됨. 다시 무한 루프로 복귀');
        gimmickDone = false;
        corridor.loopZ = 40;
      }
      corridor.update(cameraPos, fpsController);
    }
  }

  // 더미 메쉬 (photoSystem.js 크래시 방지)
  const dummyPhotoMesh = new THREE.Mesh();
  dummyPhotoMesh.visible = false;
  
  function cleanup() {
    pickables.forEach(p => {
      scene.remove(p);
      if (p.geometry) p.geometry.dispose();
      if (p.material) {
        if (Array.isArray(p.material)) p.material.forEach(m => m.dispose());
        else p.material.dispose();
      }
      if (p.userData.rigidBody && typeof physicsWorld !== 'undefined') {
        physicsWorld.removeRigidBody(p.userData.rigidBody);
      }
    });
  }

  return { startPos, portal1Pos, photoItemMesh: dummyPhotoMesh, customPickables: pickables, update, cleanup };
}