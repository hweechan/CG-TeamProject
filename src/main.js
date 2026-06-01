import * as THREE from 'three';
import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import { createScene, loadStage } from './scene.js';
import { createRamp, createCube } from './object.js';
import { FPSController } from './fpsController.js';
import { PhotoSystem } from './photoSystem.js';
import ForcedPerspective from './forcedPerspective.js';

async function init() {
  await RAPIER.init();

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  const gravity = new RAPIER.Vector3(0.0, -20.0, 0.0);
  const physicsWorld = new RAPIER.World(gravity);

  const scene = createScene();
  scene.add(camera);

  // 스테이지 관리를 위한 전역 변수
  let currentStageIndex = 1;
  let environmentObjects = [];
  let portal1Pos = null;
  let photoItemMesh = null;
  let startPos = null;
  
  // 첫 스테이지 로드
  const stageData = loadStage(currentStageIndex, scene, physicsWorld, RAPIER, environmentObjects);
  startPos = stageData.startPos;
  portal1Pos = stageData.portal1Pos;
  photoItemMesh = stageData.photoItemMesh;

  // 테스트용 픽업 가능한 치즈 램프 생성
  let testRamp = createRamp(scene, physicsWorld, RAPIER, {
    size: [2, 2, 3],     
    position: [5, 5, 5],
    color: 0xffdd88,     
    hasGravity: true
  });

  const fpsController = new FPSController(camera, physicsWorld, RAPIER, renderer.domElement);
  fpsController.spawnPos = { x: startPos.x, y: startPos.y, z: startPos.z };
  fpsController.fallLimitY = -10; // Stage 1 Fall Limit
  fpsController.teleport(startPos.x, startPos.y, startPos.z);

  const photoSystem = new PhotoSystem(camera, scene, physicsWorld, RAPIER, photoItemMesh);

  // 강제 원근법 헬퍼 연동
  const pickableObjects = [testRamp];
  const fp = new ForcedPerspective(camera, scene, renderer, pickableObjects, environmentObjects, { 
    debug: true,
    physicsWorld: physicsWorld,
    RAPIER: RAPIER
  });

  const overlay = document.getElementById('overlay');
  const crosshair = document.getElementById('crosshair');
  const interactPrompt = document.getElementById('interact-prompt');
  crosshair.style.display = 'none';

  // 씬 전환 관련 변수들
  let transitioning = false;
  let transitionTimer = 0;
  const TRANSITION_DURATION = 1.2; // 1.2초 동안 모니터 화면으로 줌인
  const transitionStartPos = new THREE.Vector3();
  const transitionStartRot = new THREE.Quaternion();
  // 모니터 스크린 바로 앞 지점 (Y축으로 9.3은 모니터 화면 정중앙 높이)
  const transitionTargetPos = new THREE.Vector3(40, 9.3, 0.7); 
  const transitionTargetRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, 0)); // 정면을 쳐다보는 각도

  function resetStage() {
    // 1. 플레이어 위치 초기화
    fpsController.teleport(fpsController.spawnPos.x, fpsController.spawnPos.y, fpsController.spawnPos.z);
    transitioning = false;

    // 2. 오브젝트를 쥐고 있다면 놓기
    if (fp.isHolding) {
      fp._onMouseUp({ button: 0 });
    }

    // 3. 테스트용 램프(치즈 오브젝트) 초기화
    scene.remove(testRamp);
    if (testRamp.userData.rigidBody) {
      physicsWorld.removeRigidBody(testRamp.userData.rigidBody);
    }
    
    // 스테이지에 따른 치즈 스폰 처리
    const rampStartPos = [fpsController.spawnPos.x + 5, fpsController.spawnPos.y + 3, fpsController.spawnPos.z - 5];
    testRamp = createRamp(scene, physicsWorld, RAPIER, {
      size: [2, 2, 3],
      position: rampStartPos,
      color: 0xffdd88,
      hasGravity: true
    });
    pickableObjects[0] = testRamp;
    fp.pickableObjects[0] = testRamp;

    // 4. 포토 시스템 초기화
    photoSystem.reset();
  }

  fpsController.onReset = resetStage;

  overlay.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === renderer.domElement) {
      overlay.style.display = 'none';
      crosshair.style.display = 'block';
      if (!transitioning) fpsController.enabled = true;
    } else {
      overlay.style.display = 'flex';
      crosshair.style.display = 'none';
      fpsController.enabled = false;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyE' && fpsController.enabled && photoSystem.isNearItem(camera.position)) {
      photoSystem.pickup();
    }
    if (e.code === 'KeyR' && fpsController.enabled && !transitioning) {
      resetStage();
    }
  });

  document.addEventListener('mousedown', (e) => {
    if (e.button === 0 && fpsController.enabled && photoSystem.holding) {
      photoSystem.stamp();
    }
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // 스테이지 1 -> 스테이지 2 전환 로직 (모니터 몰입 연출)
  function performStageTransition() {
    transitioning = false;
    currentStageIndex = 2;

    // 1. 기존 스테이지 1 환경 메쉬 및 물리 자원 제거
    environmentObjects.forEach(obj => {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
      if (obj.userData.rigidBody) {
        physicsWorld.removeRigidBody(obj.userData.rigidBody);
      }
    });
    environmentObjects.length = 0;

    // 2. 포토 시스템에서 스탬프했던 메시 정리
    photoSystem.reset();

    // 3. 스테이지 2 로드
    const stage2Data = loadStage(currentStageIndex, scene, physicsWorld, RAPIER, environmentObjects);
    startPos = stage2Data.startPos;
    portal1Pos = stage2Data.portal1Pos;
    
    // 4. 플레이어 컨트롤러 및 스테이지 제한 매개변수 업데이트
    fpsController.spawnPos = { x: startPos.x, y: startPos.y, z: startPos.z };
    fpsController.fallLimitY = -115; // Stage 2 추락 제한선
    fpsController.teleport(startPos.x, startPos.y, startPos.z);

    // 포토 아이템 갱신
    photoSystem.updateItemMesh(stage2Data.photoItemMesh);
    
    // Stage 2 유효 투영구역으로 설정 (중간 플랫폼 ~ 골 플랫폼 범위)
    photoSystem.setValidZone(
      new THREE.Vector3(15, -108, -10),
      new THREE.Vector3(50, -85, 10)
    );
    // Stage 2는 경사로(Ramp) 에셋 투영으로 교체!
    photoSystem.setProjectedAsset('ramp');

    // 5. 치즈(testRamp)도 Stage 2에 맞춰 재구성 및 위치 스폰
    scene.remove(testRamp);
    if (testRamp.userData.rigidBody) {
      physicsWorld.removeRigidBody(testRamp.userData.rigidBody);
    }
    
    const rampStartPos = [startPos.x + 5, startPos.y + 2, startPos.z];
    testRamp = createRamp(scene, physicsWorld, RAPIER, {
      size: [2, 2, 3],
      position: rampStartPos,
      color: 0xffdd88,
      hasGravity: true
    });
    pickableObjects[0] = testRamp;
    fp.pickableObjects[0] = testRamp;
    fp.environmentObjects = environmentObjects;

    // 6. 플레이어 조작 잠금 해제
    fpsController.enabled = true;
  }

  const clock = new THREE.Clock();

  function gameLoop() {
    requestAnimationFrame(gameLoop);
    const delta = clock.getDelta();

    physicsWorld.step();

    // 씬 전환 애니메이션 프레임 제어
    if (transitioning) {
      transitionTimer += delta;
      const t = Math.min(1, transitionTimer / TRANSITION_DURATION);
      const easedT = t * t * (3 - 2 * t); // smoothstep

      camera.position.lerpVectors(transitionStartPos, transitionTargetPos, easedT);
      camera.quaternion.slerpQuaternions(transitionStartRot, transitionTargetRot, easedT);

      // 렌더러 그리기 및 탈출
      photoSystem.renderPreview(renderer);
      renderer.render(scene, camera);

      if (t >= 1) {
        performStageTransition();
      }
      return;
    }

    fpsController.update(delta);

    // Forced Perspective 업데이트
    fp.update();

    // 치즈 오브젝트 물리 동기화
    pickableObjects.forEach(obj => {
      if (!fp.isHolding || fp.heldObject !== obj) {
        if (obj.userData.rigidBody && obj.userData.isDynamic) {
          const trans = obj.userData.rigidBody.translation();
          const rot = obj.userData.rigidBody.rotation();
          obj.position.set(trans.x, trans.y, trans.z);
          obj.quaternion.set(rot.x, rot.y, rot.z, rot.w);
        }
      }
    });

    // Stage 1 모니터 줌인 전환 트리거 판정
    if (currentStageIndex === 1 && !transitioning) {
      // 모니터 중심점: [40, 9.3, 0.16]
      const screenPos = new THREE.Vector3(40, 9.3, 0.16);
      const dist = camera.position.distanceTo(screenPos);
      
      // 모니터 앞면(Z > 0.16)에서 아주 가까이 다가왔을 때 트리거
      if (dist < 2.0 && camera.position.z > 0.16) {
        transitioning = true;
        transitionTimer = 0;
        fpsController.enabled = false;
        transitionStartPos.copy(camera.position);
        transitionStartRot.copy(camera.quaternion);
      }
    }

    // Stage 2 클리어 조건 (도착 골 포탈 Z축 통과 체크)
    if (currentStageIndex === 2) {
      const portal2Pos = new THREE.Vector3(42, -100 + 11.5, 0); // Stage 2 골 포탈
      const dist = camera.position.distanceTo(portal2Pos);
      if (dist < 1.8) {
        // 데모 종료 알림
        interactPrompt.style.display = 'block';
        interactPrompt.textContent = "DEMO COMPLETE! Thanks for playing.";
      }
    }

    const nearItem = photoSystem.isNearItem(camera.position);
    if (currentStageIndex === 1 || (currentStageIndex === 2 && !photoSystem.stamped)) {
      interactPrompt.style.display = nearItem && fpsController.enabled ? 'block' : 'none';
      if (nearItem) interactPrompt.textContent = "Press 'E' to Pick Up";
    }

    photoSystem.renderPreview(renderer);
    renderer.render(scene, camera);
  }

  gameLoop();
}

init();
