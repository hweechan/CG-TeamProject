import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createScene } from './scene.js';
import { FPSController } from './fpsController.js';
import { PhotoSystem } from './photoSystem.js';

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

  const { scene, portal1Pos, portal2Pos, photoItemMesh } = createScene(physicsWorld, RAPIER);

  scene.add(camera);

  const fpsController = new FPSController(camera, physicsWorld, RAPIER, renderer.domElement);
  const photoSystem = new PhotoSystem(camera, scene, physicsWorld, RAPIER, photoItemMesh);

  const overlay = document.getElementById('overlay');
  const crosshair = document.getElementById('crosshair');
  const interactPrompt = document.getElementById('interact-prompt');
  crosshair.style.display = 'none';

  const portalOffset = new THREE.Vector3().subVectors(portal2Pos, portal1Pos);
  let prevPlayerZ = null;
  let portalUsed = false;
  const PORTAL_HALF_WIDTH = 1.5;

  overlay.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === renderer.domElement) {
      overlay.style.display = 'none';
      crosshair.style.display = 'block';
      fpsController.enabled = true;
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

  const clock = new THREE.Clock();

  function gameLoop() {
    requestAnimationFrame(gameLoop);
    const delta = clock.getDelta();

    physicsWorld.step();
    fpsController.update(delta);

    if (!portalUsed && prevPlayerZ !== null) {
      const currZ = camera.position.z;
      const currX = camera.position.x;
      if (
        prevPlayerZ > portal1Pos.z &&
        currZ <= portal1Pos.z &&
        Math.abs(currX - portal1Pos.x) < PORTAL_HALF_WIDTH
      ) {
        fpsController.offsetTeleport(portalOffset.x, portalOffset.y, portalOffset.z);
        portalUsed = true;
      }
    }
    prevPlayerZ = camera.position.z;

    const nearItem = photoSystem.isNearItem(camera.position);
    interactPrompt.style.display = nearItem && fpsController.enabled ? 'block' : 'none';
    if (nearItem) interactPrompt.textContent = "Press 'E' to Pick Up";

    photoSystem.renderPreview(renderer);
    renderer.render(scene, camera);
  }

  gameLoop();
}

init();
