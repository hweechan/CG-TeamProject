import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { createScene } from './scene.js';
import { FPSController } from './fpsController.js';

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

  const { scene } = createScene(physicsWorld, RAPIER);

  const fpsController = new FPSController(camera, physicsWorld, RAPIER, renderer.domElement);

  const overlay = document.getElementById('overlay');
  const crosshair = document.getElementById('crosshair');
  crosshair.style.display = 'none';

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

    renderer.render(scene, camera);
  }

  gameLoop();
}

init();
