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
  let devMode = false;
  let currentStageData = null;
  
  // 첫 스테이지 로드
  currentStageData = loadStage(currentStageIndex, scene, physicsWorld, RAPIER, environmentObjects);
  startPos = currentStageData.startPos;
  portal1Pos = currentStageData.portal1Pos;
  photoItemMesh = currentStageData.photoItemMesh;

  // 테스트용 픽업 가능한 치즈 아이템 생성 (스테이지별로 다름)
  let testItem = createCube(scene, physicsWorld, RAPIER, {
    size: [2, 2, 2],     
    position: [startPos.x + 2, startPos.y + 2, 30], // 스테이지 1 터널 내부
    color: 0xffdd88,     
    hasGravity: true
  });

  const fpsController = new FPSController(camera, physicsWorld, RAPIER, renderer.domElement);
  fpsController.spawnPos = { x: startPos.x, y: startPos.y, z: startPos.z };
  fpsController.fallLimitY = -10; // Stage 1 Fall Limit
  fpsController.teleport(startPos.x, startPos.y, startPos.z);

  const photoSystem = new PhotoSystem(camera, scene, physicsWorld, RAPIER, photoItemMesh);

  // Pickable Objects
  const pickableObjects = [testItem];
  const fp = new ForcedPerspective(camera, scene, renderer, pickableObjects, environmentObjects, { 
    debug: true,
    physicsWorld: physicsWorld,
    RAPIER: RAPIER
  });

  const crosshair = document.getElementById('crosshair');
  const interactPrompt = document.getElementById('interact-prompt');
  const interactText = document.getElementById('interact-text');
  const devModeIndicator = document.getElementById('dev-mode-indicator');
  const startScreen = document.getElementById('start-screen');
  const btnStart = document.getElementById('btn-start');
  const pauseScreen = document.getElementById('pause-screen');
  const btnResume = document.getElementById('btn-resume');
  const transitionScreen = document.getElementById('transition-screen');
  const clearScreen = document.getElementById('clear-screen');
  const btnRestartDemo = document.getElementById('btn-restart-demo');
  const btnReset = document.getElementById('btn-reset');
  const sysStatus = document.getElementById('sys-status');
  const playerCoords = document.getElementById('player-coords');

  crosshair.style.display = 'none';

  // 씬 전환 관련 변수들
  let transitioning = false;
  let transitionTimer = 0;
  const TRANSITION_DURATION = 1.2; // 1.2초 동안 모니터 화면으로 줌인
  const transitionStartPos = new THREE.Vector3();
  const transitionStartRot = new THREE.Quaternion();
  // 모니터 스크린 바로 앞 지점 (동적으로 설정됨)
  const transitionTargetPos = new THREE.Vector3(); 
  const transitionTargetRot = new THREE.Quaternion();

  fpsController.onReset = () => {
    jumpToStage(currentStageIndex);
    renderer.domElement.requestPointerLock();
  };

  let hasStarted = false;

  btnStart.addEventListener('click', () => {
    hasStarted = true;
    startScreen.classList.add('hidden');
    renderer.domElement.requestPointerLock();
  });

  btnResume.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
  });

  btnReset.addEventListener('click', () => {
    if (fpsController.enabled && !transitioning) {
      jumpToStage(currentStageIndex);
      renderer.domElement.requestPointerLock();
    }
  });

  btnRestartDemo.addEventListener('click', () => {
    clearScreen.classList.add('hidden');
    jumpToStage(1);
    renderer.domElement.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === renderer.domElement) {
      if (hasStarted) pauseScreen.classList.add('hidden');
      crosshair.style.display = 'block';
      if (!transitioning && hasStarted) fpsController.enabled = true;
    } else {
      if (hasStarted && !transitioning && currentStageIndex !== 3) {
        pauseScreen.classList.remove('hidden');
      }
      crosshair.style.display = 'none';
      fpsController.enabled = false;
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'KeyR' && fpsController.enabled && !transitioning) {
      jumpToStage(currentStageIndex);
    }

    // Developer Mode
    if (e.code === 'KeyP') {
      devMode = !devMode;
      console.log(`Developer Mode: ${devMode ? 'ON' : 'OFF'}`);
      if (devMode) devModeIndicator.classList.remove('hidden');
      else devModeIndicator.classList.add('hidden');
      if (!devMode) fpsController.isFlying = false;
    }

    if (devMode) {
      if (e.code === 'KeyF') {
        fpsController.isFlying = !fpsController.isFlying;
        console.log(`Fly Mode: ${fpsController.isFlying ? 'ON' : 'OFF'}`);
        interactPrompt.classList.remove('hidden');
        interactText.textContent = `Fly Mode: ${fpsController.isFlying ? 'ON' : 'OFF'}`;
        setTimeout(() => interactPrompt.classList.add('hidden'), 1500);
      }
      if (e.code === 'Digit1') jumpToStage(1);
      if (e.code === 'Digit2') jumpToStage(2);
      if (e.code === 'Digit3') jumpToStage(3);
      if (e.code === 'Digit4') jumpToStage(4);
      if (e.code === 'Digit5') jumpToStage(5);
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

  // 원하는 스테이지로 즉시 전환 및 로드
  function jumpToStage(index) {
    transitioning = false;
    transitionTimer = 0;
    transitionScreen.classList.add('hidden', 'opacity-0');
    clearScreen.classList.add('hidden');
    
    currentStageIndex = index;
    if (sysStatus) {
      sysStatus.textContent = `SYSTEM STATE: LOADED STAGE ${index}`;
    }

    // 1. 기존 메쉬 및 물리 자원 제거
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

    // 1.5 기존 스테이지 정리 콜백 호출
    if (currentStageData && currentStageData.cleanup) {
      currentStageData.cleanup();
    }

    // 2. 포토 시스템 초기화
    photoSystem.reset();

    // 3. 쥐고 있는 오브젝트 놓기
    if (fp.isHolding) {
      fp._onMouseUp({ button: 0 });
    }

    // 4. 새 스테이지 로드
    currentStageData = loadStage(currentStageIndex, scene, physicsWorld, RAPIER, environmentObjects);
    if (!currentStageData) {
      console.warn("Invalid Stage Index");
      return;
    }
    
    startPos = currentStageData.startPos;
    portal1Pos = currentStageData.portal1Pos;
    
    // 5. 플레이어 컨트롤러 업데이트
    fpsController.spawnPos = { x: startPos.x, y: startPos.y, z: startPos.z };
    
    if (index === 1) fpsController.fallLimitY = -10;
    else if (index === 2) fpsController.fallLimitY = -115;
    else if (index === 3) fpsController.fallLimitY = -210;
    else fpsController.fallLimitY = startPos.y - 30;
    
    fpsController.teleport(startPos.x, startPos.y, startPos.z);

    photoSystem.updateItemMesh(currentStageData.photoItemMesh);
    
    if (index === 2) {
      photoSystem.setValidZone(new THREE.Vector3(-1000, -1000, -1000), new THREE.Vector3(1000, 1000, 1000));
      photoSystem.setProjectedAsset('ramp');
    } else if (index === 3) {
      // 스테이지 3: GimmickDoor 기믹, 경사로 필요
      photoSystem.setValidZone(new THREE.Vector3(-1000, -1000, -1000), new THREE.Vector3(1000, 1000, 1000));
      photoSystem.setProjectedAsset('ramp');
    } else {
      photoSystem.setValidZone(new THREE.Vector3(-1000, -1000, -1000), new THREE.Vector3(1000, 1000, 1000));
      photoSystem.setProjectedAsset('cube');
    }

    // 6. 테스트용 치즈 재배치
    if (testItem) {
      scene.remove(testItem);
      if (testItem.userData && testItem.userData.rigidBody) {
        physicsWorld.removeRigidBody(testItem.userData.rigidBody);
      }
    }
    
    // 스테이지 1에서는 치즈를 터널 내부(Z=30)에 배치
    const itemStartPos = (currentStageIndex === 1) 
      ? [startPos.x + 2, startPos.y + 2, 30] 
      : [startPos.x + 5, startPos.y + 2, startPos.z];
    
    if (currentStageIndex === 1) {
      testItem = createCube(scene, physicsWorld, RAPIER, {
        size: [2, 2, 2],
        position: itemStartPos,
        color: 0xffdd88,
        hasGravity: true
      });
    } else if (currentStageIndex === 3) {
      // 스테이지 3은 기본 큐브/경사로 아이템을 생성하지 않음
      testItem = null;
    } else {
      testItem = createRamp(scene, physicsWorld, RAPIER, {
        size: [4, 4, 6],
        position: itemStartPos,
        rotation: [0, Math.PI, 0],
        color: 0xffdd88,
        hasGravity: true
      });
    }

    // pickableObjects 초기화 및 testItem 등록
    pickableObjects.length = 0;
    if (testItem) pickableObjects.push(testItem);
    
    // 스테이지에서 던져준 커스텀 잡기 가능 물체가 있다면 등록
    if (currentStageData.customPickables) {
      pickableObjects.push(...currentStageData.customPickables);
    }
    
    fp.pickableObjects = pickableObjects;
    fp.environmentObjects = environmentObjects;

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
        jumpToStage(currentStageIndex + 1);
      }
      return;
    }

    // 스테이지별 개별 로직 업데이트
    if (currentStageData && currentStageData.update) {
      currentStageData.update(delta, camera.position, pickableObjects, fpsController, fp);
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

    // 포탈(모니터) 도달 줌인 전환 트리거 판정
    if (portal1Pos && !transitioning) {
      const dist = camera.position.distanceTo(portal1Pos);
      
      // 포탈(모니터)에 2.5 이내로 접근했을 때
      if (dist < 2.5) {
        if (currentStageIndex === 3) {
          // Stage 3는 데모의 마지막
          clearScreen.classList.remove('hidden');
          if (document.pointerLockElement === renderer.domElement) {
            document.exitPointerLock();
          }
        } else {
          transitioning = true;
          transitionTimer = 0;
          fpsController.enabled = false;
          
          transitionScreen.classList.remove('hidden');
          // For fade-in effect
          setTimeout(() => {
            transitionScreen.classList.remove('opacity-0');
          }, 50);

          transitionStartPos.copy(camera.position);
          transitionStartRot.copy(camera.quaternion);
          
          // 전환 목표는 해당 스테이지의 portal1Pos 바로 앞(Z - 0.5)
          transitionTargetPos.copy(portal1Pos);
          transitionTargetPos.z -= 0.5;
          transitionTargetRot.setFromEuler(new THREE.Euler(0, Math.PI, 0)); // 정면을 쳐다보는 각도
        }
      }
    }

    const nearItem = photoSystem.isNearItem(camera.position);
    if (currentStageIndex === 1 || (currentStageIndex === 2 && !photoSystem.stamped)) {
      if (nearItem && fpsController.enabled && !transitioning) {
        interactPrompt.classList.remove('hidden');
        interactText.textContent = "L-CLICK to Pick Up/Drop";
      } else {
        interactPrompt.classList.add('hidden');
      }
    } else {
      interactPrompt.classList.add('hidden');
    }

    if (playerCoords) {
      playerCoords.textContent = `POS: X: ${camera.position.x.toFixed(2)} | Y: ${camera.position.y.toFixed(2)} | Z: ${camera.position.z.toFixed(2)}`;
    }

    photoSystem.renderPreview(renderer);
    renderer.render(scene, camera);
  }

  gameLoop();
}

init();
