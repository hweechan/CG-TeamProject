import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  Gamepad, 
  HelpCircle, 
  RotateCcw, 
  Layers, 
  Navigation, 
  Maximize2, 
  ShieldAlert, 
  Compass, 
  VolumeX, 
  Volume2, 
  CheckCircle2, 
  Sparkles, 
  Info,
  Tv,
  ArrowRight,
  RefreshCw,
  LogOut,
  Camera,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getRapier, PhysicsEngine } from './physics';
import { 
  subtractGeometry, 
  addGeometry, 
  createBridgeGeometry, 
  createCorridorRampGeometry 
} from './csgHelper';
import { 
  createConcreteTexture, 
  createBumpyConcreteNormal, 
  createMetalGridTexture, 
  createWoodPlankTexture, 
  createWarningStripesTexture, 
  createMonitorTexture 
} from './textures';
import { StageId, PhotoItem, GameState, ControlsState } from './types';

// 헬퍼: 펜스 난간 생성
const buildHandrailsLocal = (scene: THREE.Scene, platZ: number, width: number, ironFloorMat: THREE.Material) => {
  const postH = 1.1;
  const postG_sub = new THREE.CylinderGeometry(0.05, 0.05, postH, 6);
  const railG_sub = new THREE.BoxGeometry(0.08, 0.08, 8);
  const halfW = width / 2 - 0.1;
  
  const railL = new THREE.Mesh(railG_sub, ironFloorMat);
  railL.position.set(-halfW, 1.05, platZ);
  scene.add(railL);

  for (let offsetZ = -3.5; offsetZ <= 3.5; offsetZ += 1.75) {
    const post = new THREE.Mesh(postG_sub, ironFloorMat);
    post.position.set(-halfW, 0.5 + 0.1, platZ + offsetZ);
    scene.add(post);
  }

  const railR = new THREE.Mesh(railG_sub, ironFloorMat);
  railR.position.set(width / 2 - 0.1, 1.05, platZ);
  scene.add(railR);

  for (let offsetZ = -3.5; offsetZ <= 3.5; offsetZ += 1.75) {
    const post = new THREE.Mesh(postG_sub, ironFloorMat);
    post.position.set(width / 2 - 0.1, 0.5 + 0.1, platZ + offsetZ);
    scene.add(post);
  }

  const backRailG = new THREE.BoxGeometry(width, 0.08, 0.08);
  const railBack = new THREE.Mesh(backRailG, ironFloorMat);
  const backZ = platZ > 0 ? platZ + 3.9 : platZ - 3.9;
  railBack.position.set(0, 1.05, backZ);
  scene.add(railBack);

  for (let offsetX = -width / 2 + 0.5; offsetX <= width / 2 - 0.5; offsetX += 2.0) {
    const post = new THREE.Mesh(postG_sub, ironFloorMat);
    post.position.set(offsetX, 0.5 + 0.1, backZ);
    scene.add(post);
  }
};

// 헬퍼: Stage 1 천장 케이블 조명 추가 (Y=28 에서 10미터 하강해 Y=18에 걸림)
const addCeilingLightsLocal = (scene: THREE.Scene, ceilingY: number, environmentObjects: any[]) => {
  const lightColors = [0x00ffcc, 0xff33aa];
  const createHangingLight = (x: number, y: number, z: number, color: number) => {
    const wireMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 10, 0.05), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
    wireMesh.position.set(x, y - 5, z);
    scene.add(wireMesh);
    environmentObjects.push(wireMesh);

    const fixtureMesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 }));
    fixtureMesh.position.set(x, y - 10, z);
    scene.add(fixtureMesh);
    environmentObjects.push(fixtureMesh);

    const bulbMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 1.0), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    bulbMesh.position.set(x, y - 10.25, z);
    scene.add(bulbMesh);
    environmentObjects.push(bulbMesh);

    const pointLight = new THREE.PointLight(color, 4.0, 25);
    pointLight.decay = 1.0;
    pointLight.position.set(x, y - 11.5, z);
    pointLight.castShadow = true;
    scene.add(pointLight);
    environmentObjects.push(pointLight);
  };

  createHangingLight(0, ceilingY, 0, lightColors[0]);
  createHangingLight(22, ceilingY, 5, lightColors[1]);
  createHangingLight(40, ceilingY, 0, lightColors[0]);
};

// 헬퍼: Stage 2 천장 케이블 조명 추가 (Y=20 에서 8미터 하강해 Y=12에 걸림)
const addStage2CeilingLightsLocal = (scene: THREE.Scene, ceilingY: number, offsetY: number, environmentObjects: any[]) => {
  const neonPink = 0xff00bb;
  const warmYellow = 0xffaa00;
  const createHangingLight = (x: number, y: number, z: number, color: number) => {
    const wireMesh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 8, 0.04), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
    wireMesh.position.set(x, y - 4 + offsetY, z);
    scene.add(wireMesh);
    environmentObjects.push(wireMesh);

    const fixtureMesh = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 1.0), new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.4, metalness: 0.8 }));
    fixtureMesh.position.set(x, y - 8 + offsetY, z);
    scene.add(fixtureMesh);
    environmentObjects.push(fixtureMesh);

    const pLight = new THREE.PointLight(color, 5.0, 30);
    pLight.decay = 1.0;
    pLight.position.set(x, y - 9 + offsetY, z);
    pLight.castShadow = true;
    scene.add(pLight);
    environmentObjects.push(pLight);
  };

  createHangingLight(5, ceilingY, -5, warmYellow);
  createHangingLight(35, ceilingY, 5, neonPink);
};

export default function App() {
  // Game states in React
  const [stage, setStage] = useState<StageId>(StageId.STAGE_1);
  const [stageRevision, setStageRevision] = useState<number>(0);
  const [controls, setControls] = useState<ControlsState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  });
  const [heldPhoto, setHeldPhoto] = useState<PhotoItem | null>(null);
  const [inventory, setInventory] = useState<PhotoItem[]>([]);
  const [heldRotation, setHeldRotation] = useState<number>(0); // in degrees

  // Auto clean state on stage alterations and resets
  useEffect(() => {
    setInventory([]);
    setHeldPhoto(null);
  }, [stage, stageRevision]);
  const [isPointerLocked, setIsPointerLocked] = useState<boolean>(false);
  const [hasDismissedStart, setHasDismissedStart] = useState<boolean>(false);
  const [isNearMonitor, setIsNearMonitor] = useState<boolean>(false);
  const [isNearExit, setIsNearExit] = useState<boolean>(false);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const [isCleared, setIsCleared] = useState<boolean>(false);
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(true);
  const [sysStatus, setSysStatus] = useState<string>("SYSTEM STATE: NOMINAL");
  const [physicsActive, setPhysicsActive] = useState<boolean>(false);
  const [hasPickedPhoto, setHasPickedPhoto] = useState<boolean>(false);
  const [isFlashActive, setIsFlashActive] = useState<boolean>(false);
  const [showPhotoAlert, setShowPhotoAlert] = useState<string | null>(null);
  const [targetDetectionState, setTargetDetectionState] = useState<'NOT_IN_RANGE' | 'IN_RANGE_NOT_LOOKING' | 'TARGET_LOCKED'>('NOT_IN_RANGE');
  const [targetDistance, setTargetDistance] = useState<number>(0);

  // References
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ThreeJS mutable components stored in refs
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const physicsRef = useRef<PhysicsEngine | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Interactive meshes for Level slicing
  const cuttableWallRef = useRef<THREE.Mesh | null>(null);
  const photoSpawnMeshRef = useRef<THREE.Mesh | null>(null);
  const projectionHologramRef = useRef<THREE.Mesh | null>(null);
  const monitorScreenRef = useRef<THREE.Mesh | null>(null);

  // environmentObjects to track procedural parts for easy cleanups
  const environmentObjectsRef = useRef<any[]>([]);

  const heldPhotoRef = useRef<PhotoItem | null>(null);
  const inventoryRef = useRef<PhotoItem[]>([]);
  const stageRef = useRef<StageId>(stage);

  useEffect(() => {
    heldPhotoRef.current = heldPhoto;
  }, [heldPhoto]);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  // Audio elements (synth beep triggers)
  const beepChannel = (freq: number, type: OscillatorType = 'sine', duration: number = 0.1) => {
    if (!soundsEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (_) {}
  };

  // Keyboard navigation & mouse controls values stored in pure refs for the 144Hz anim loop
  const movementKeysRef = useRef<ControlsState>({
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
  });
  const cameraRotationRef = useRef<{ yaw: number; pitch: number }>({ yaw: 0, pitch: 0 });
  const customRollDegreesRef = useRef<number>(0);
  const executeObjectPlacementRef = useRef<() => void>();
  const updateHologramTransformRef = useRef<((camera: THREE.PerspectiveCamera, playerPos: THREE.Vector3) => void) | null>(null);

  useEffect(() => {
    updateHologramTransformRef.current = updateHologramTransform;
  });

  const checkAndTriggerPhotoCaptureRef = useRef<() => boolean>();
  const lastDetectionStateRef = useRef<'NOT_IN_RANGE' | 'IN_RANGE_NOT_LOOKING' | 'TARGET_LOCKED'>('NOT_IN_RANGE');
  const lastDistanceRef = useRef<number>(0);

  // Create & load materials once to prevent WebGL compilation lag during CSG stamp
  const textureStoreRef = useRef<{
    concrete: THREE.Texture;
    concreteNormal: THREE.Texture;
    metalGrid: THREE.Texture;
    woodPlank: THREE.Texture;
    warningStripes: THREE.Texture;
  } | null>(null);

  useEffect(() => {
    // Generate all procedural assets on startup
    textureStoreRef.current = {
      concrete: createConcreteTexture(),
      concreteNormal: createBumpyConcreteNormal(),
      metalGrid: createMetalGridTexture(),
      woodPlank: createWoodPlankTexture(),
      warningStripes: createWarningStripesTexture()
    };
  }, []);

  // Set up Keyboard interaction
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (['c', 'f', 'ㅊ', 'ㄹ'].includes(e.key.toLowerCase()) || ['KeyC', 'KeyF', 'Enter'].includes(e.code)) {
        if (!heldPhotoRef.current) {
          if (checkAndTriggerPhotoCaptureRef.current) {
            checkAndTriggerPhotoCaptureRef.current();
          }
        }
      }

      if (['j', 'ㅓ'].includes(e.key.toLowerCase()) || e.code === 'KeyJ') {
        if (heldPhotoRef.current) {
          if (executeObjectPlacementRef.current) {
            executeObjectPlacementRef.current();
          }
        } else {
          if (checkAndTriggerPhotoCaptureRef.current) {
            checkAndTriggerPhotoCaptureRef.current();
          }
        }
      }

      switch (e.code) {
        case 'KeyW':
          movementKeysRef.current.forward = true;
          break;
        case 'KeyS':
          movementKeysRef.current.backward = true;
          break;
        case 'KeyA':
          movementKeysRef.current.left = true;
          break;
        case 'KeyD':
          movementKeysRef.current.right = true;
          break;
        case 'Space':
          movementKeysRef.current.jump = true;
          break;
        case 'KeyQ':
          // Rotate photo held - Counter Clockwise
          if (heldPhotoRef.current) {
            customRollDegreesRef.current = (customRollDegreesRef.current + 15) % 360;
            setHeldRotation(customRollDegreesRef.current);
            beepChannel(460, 'sine', 0.05);
          }
          break;
        case 'KeyE':
          // Rotate photo held - Clockwise
          if (heldPhotoRef.current) {
            customRollDegreesRef.current = (customRollDegreesRef.current - 15 + 360) % 360;
            setHeldRotation(customRollDegreesRef.current);
            beepChannel(420, 'sine', 0.05);
          }
          break;
        case 'Digit1':
          if (inventoryRef.current.length > 0) {
            const p = inventoryRef.current[0];
            setHeldPhoto(heldPhotoRef.current?.id === p.id ? null : p);
            beepChannel(heldPhotoRef.current?.id === p.id ? 300 : 600, 'sine', 0.1);
          }
          break;
        case 'Digit2':
          if (inventoryRef.current.length > 1) {
            const p = inventoryRef.current[1];
            setHeldPhoto(heldPhotoRef.current?.id === p.id ? null : p);
            beepChannel(heldPhotoRef.current?.id === p.id ? 300 : 600, 'sine', 0.1);
          }
          break;
        case 'Digit3':
          if (inventoryRef.current.length > 2) {
            const p = inventoryRef.current[2];
            setHeldPhoto(heldPhotoRef.current?.id === p.id ? null : p);
            beepChannel(heldPhotoRef.current?.id === p.id ? 300 : 600, 'sine', 0.1);
          }
          break;
        case 'KeyR':
          // Easy reset hook
          restartCurrentState();
          break;
      }
      setControls({ ...movementKeysRef.current });
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
          movementKeysRef.current.forward = false;
          break;
        case 'KeyS':
          movementKeysRef.current.backward = false;
          break;
        case 'KeyA':
          movementKeysRef.current.left = false;
          break;
        case 'KeyD':
          movementKeysRef.current.right = false;
          break;
        case 'Space':
          movementKeysRef.current.jump = false;
          break;
      }
      setControls({ ...movementKeysRef.current });
    };

    const handleWheel = (e: WheelEvent) => {
      if (heldPhotoRef.current) {
        // Scroll wheel rotates the photo beautifully!
        const direction = e.deltaY > 0 ? -15 : 15;
        customRollDegreesRef.current = (customRollDegreesRef.current + direction + 360) % 360;
        setHeldRotation(customRollDegreesRef.current);
        beepChannel(440, 'triangle', 0.04);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Pointerlock state sync
  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === canvasRef.current;
      setIsPointerLocked(isLocked);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
    };
  }, []);

  // Main game core simulation
  useEffect(() => {
    let active = true;
    let cameraYaw = 0;
    let cameraPitch = 0;
    let localPhysics: PhysicsEngine | null = null;
    let localRenderer: THREE.WebGLRenderer | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== canvasRef.current) return;
      cameraYaw -= e.movementX * 0.0022;
      cameraPitch -= e.movementY * 0.0022;
      cameraPitch = Math.max(-Math.PI / 2.05, Math.min(Math.PI / 2.05, cameraPitch));
      cameraRotationRef.current = { yaw: cameraYaw, pitch: cameraPitch };
    };

    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };

    const setupEngine = async () => {
      if (!canvasRef.current || !textureStoreRef.current) return;

      setSysStatus("BOOTING GRAPHICS & PHYSICS SYSTEMS...");

      const rapier = await getRapier();

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#1a1a24'); // 은은한 사이버 다크 슬레이트 블루
      // Thick realistic depth mist and styling fog
      scene.fog = new THREE.FogExp2('#1a1a24', 0.025);
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 150);
      const spawnPoint = stage === StageId.STAGE_1 ? new THREE.Vector3(0, 3, 13) : new THREE.Vector3(0, 3, 14);
      camera.position.copy(spawnPoint);
      cameraRef.current = camera;

      // Lights (은은하고 세련된 실내 반구 및 직사광 셋업)
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x3d4150, 0.6);
      scene.add(hemiLight);

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.45); // 실내 가시성 기본 광량
      scene.add(ambientLight);

      const sunLight = new THREE.DirectionalLight('#ffe3b5', 1.25);
      sunLight.position.set(15, 25, 10); // 천장 아래 고도
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 1024;
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.bias = -0.0001;
      scene.add(sunLight);

      // WebGL Renderer
      const renderer = new THREE.WebGLRenderer({ 
        canvas: canvasRef.current, 
        antialias: true,
        stencil: true, // MANDATORY FOR STENCIL MASKS
        preserveDrawingBuffer: true,
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      localRenderer = renderer;

      // Physics Instance
      const physics = new PhysicsEngine(rapier, spawnPoint);
      physicsRef.current = physics;
      localPhysics = physics;
      setPhysicsActive(true);

      // Environment list tracker
      environmentObjectsRef.current = [];

      // Build out Level Layouts procedurally with high realistic detail
      buildProceduralLevel(scene, physics, stage);

      // Floating Photo pickup visual Card
      createFloatingPhotoCard(scene, stage);

      // Setup projection hologram aid
      setupPlacementVisualHologram(scene);

      setSysStatus("SYSTEM: OPERATIONAL & NOMINAL");

      // Custom Mouse look handler and window resize listeners
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('resize', handleResize);

      let prevTime = performance.now();

      // RENDER & PHYSICS LOOP
      const tick = () => {
        if (!active) return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - prevTime) / 1000;
        prevTime = currentTime;

        // Step physics Engine simulation
        physics.step(deltaTime);

        // Map Rapier Capsule body translation to THREE layout camera positions
        const playerPos = physics.getPlayerPosition();
        
        // Soft camera head bobbing if moving
        const velocity = physics.playerBody.linvel();
        const isMovingHorizontal = Math.abs(velocity.x) > 0.1 || Math.abs(velocity.z) > 0.1;
        
        let headBobY = 0;
        if (isMovingHorizontal && Math.abs(velocity.y) < 0.1) {
          headBobY = Math.sin(currentTime * 0.012) * 0.08;
        }

        camera.position.set(playerPos.x, playerPos.y + 0.95 + headBobY, playerPos.z);

        // Sync camera look rotation
        camera.quaternion.setFromEuler(new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ'));

        // Update movement based on input WASD and Camera horizontal yaw rotation
        const fX = -Math.sin(cameraYaw);
        const fZ = -Math.cos(cameraYaw);
        physics.updatePlayerMovement(movementKeysRef.current, fX, fZ);

        // Desk prototype toy interaction indicators (pulsing ring and floating pointer)
        if (photoSpawnMeshRef.current) {
          const ring = photoSpawnMeshRef.current.getObjectByName('pulseRing');
          const arrowObj = photoSpawnMeshRef.current.getObjectByName('arrow');
          if (ring) {
            const scaleVal = 1.0 + Math.sin(currentTime * 0.007) * 0.15;
            ring.scale.set(scaleVal, scaleVal, scaleVal);
          }
          if (arrowObj) {
            arrowObj.position.y = 0.4 + Math.sin(currentTime * 0.005) * 0.06;
            arrowObj.rotation.y += 0.02;
          }

          // Real-time tracking of camera alignment & distance to desk toy
          const toyPos = photoSpawnMeshRef.current.position;
          const dist = playerPos.distanceTo(toyPos);
          const forwardVec = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
          const toToy = toyPos.clone().sub(camera.position).normalize();
          const dot = forwardVec.dot(toToy);

          let newState: 'NOT_IN_RANGE' | 'IN_RANGE_NOT_LOOKING' | 'TARGET_LOCKED' = 'NOT_IN_RANGE';
          if (dist <= 12.0) {
            if (dot > 0.40) {
              newState = 'TARGET_LOCKED';
            } else {
              newState = 'IN_RANGE_NOT_LOOKING';
            }
          }

          if (newState !== lastDetectionStateRef.current) {
            lastDetectionStateRef.current = newState;
            setTargetDetectionState(newState);
          }

          const roundedDist = Math.round(dist * 10) / 10;
          if (roundedDist !== lastDistanceRef.current) {
            lastDistanceRef.current = roundedDist;
            setTargetDistance(roundedDist);
          }
        } else {
          if (lastDetectionStateRef.current !== 'NOT_IN_RANGE') {
            lastDetectionStateRef.current = 'NOT_IN_RANGE';
            setTargetDetectionState('NOT_IN_RANGE');
          }
          if (lastDistanceRef.current !== 0) {
            lastDistanceRef.current = 0;
            setTargetDistance(0);
          }
        }

        const currentStage = stageRef.current;

        // Check Stage restart triggers (laser grid pits)
        // 거대 격납고 바닥(Y=-15)에 맞춰 낙하 리셋 한계를 -15.0으로 셋업
        const fallLimit = -15.0;
        if (playerPos.y < fallLimit) {
          beepChannel(150, 'sawtooth', 0.25);
          physics.resetPlayerPosition(spawnPoint);
        }

        // Stage 1 Monitor interaction proximity check
        if (currentStage === StageId.STAGE_1) {
          const distToMonitor = playerPos.distanceTo(new THREE.Vector3(0, 1.2, -12));
          setIsNearMonitor(distToMonitor < 2.8);
        } else {
          setIsNearMonitor(false);
        }

        // Stage 2 Exit Goal door proximity check
        if (currentStage === StageId.STAGE_2) {
          const distToExit = playerPos.distanceTo(new THREE.Vector3(0, 4.25, -12.5));
          setIsNearExit(distToExit < 2.5);
          if (distToExit < 2.0 && !isCleared) {
            triggerStage2Clear();
          }
        }

        // Update holographic projection preview matrix
        if (updateHologramTransformRef.current) {
          updateHologramTransformRef.current(camera, playerPos);
        }

        renderer.render(scene, camera);
        animationFrameIdRef.current = requestAnimationFrame(tick);
      };

      tick();
    };

    setupEngine();

    return () => {
      active = false;
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (localPhysics) {
        localPhysics.clearAllWorld();
      }
      if (localRenderer) {
        localRenderer.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if ((object as any).isMesh) {
            const mesh = object as THREE.Mesh;
            if (mesh.geometry) {
              mesh.geometry.dispose();
            }
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach((mat) => mat.dispose());
              } else {
                mesh.material.dispose();
              }
            }
          }
        });
        while(sceneRef.current.children.length > 0){ 
          sceneRef.current.remove(sceneRef.current.children[0]); 
        }
      }
      // Explicitly clear UI hud states
      setIsNearMonitor(false);
      setIsNearExit(false);
      setTargetDetectionState('NOT_IN_RANGE');
      setTargetDistance(0);
    };
  }, [stage, stageRevision]);

  // Builds level configurations
  const buildProceduralLevel = (scene: THREE.Scene, physics: PhysicsEngine, currentStage: StageId) => {
    const store = textureStoreRef.current!;

    // Reusable Materials
    const concreteMat = new THREE.MeshStandardMaterial({
      map: store.concrete,
      normalMap: store.concreteNormal,
      roughness: 0.85,
      metalness: 0.1,
      roughnessMap: store.concrete,
      normalScale: new THREE.Vector2(0.4, 0.4)
    });

    const ironFloorMat = new THREE.MeshStandardMaterial({
      map: store.metalGrid,
      roughness: 0.35,
      metalness: 0.8
    });

    const yellowBorderMat = new THREE.MeshStandardMaterial({
      map: store.warningStripes,
      roughness: 0.5
    });

    const addBoxLocal = (size: [number, number, number], position: [number, number, number], colorHex: number) => {
      const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
      const mat = new THREE.MeshStandardMaterial({ 
        color: colorHex, 
        roughness: 0.7, 
        metalness: 0.1 
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(position[0], position[1], position[2]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      environmentObjectsRef.current.push(mesh);
      
      physics.createStaticBoxCollider(`plat_${Date.now()}_${Math.random()}`, new THREE.Vector3(size[0] / 2, size[1] / 2, size[2] / 2), new THREE.Vector3(position[0], position[1], position[2]));
      return mesh;
    };

    if (currentStage === StageId.STAGE_1) {
      // --- STAGE 1: GRAND TESTING WAREHOUSE HALL ---
      const hallLength = 70;
      const hallWidth = 46;
      const hallHeight = 44;

      // 1. 공장 바닥 (심연 - Y = -16.5)
      addBoxLocal([hallLength, 1, hallWidth], [15, -16.5, 0], 0x3a3d46);

      // 2. 트러스 천장 (Y = 28.5)
      addBoxLocal([hallLength, 1, hallWidth], [15, 28.5, 0], 0x5e6370);

      // 3. 좌우 외벽 (Z = ±23.0)
      addBoxLocal([hallLength, hallHeight, 1], [15, 6, -23], 0x767c8e);
      addBoxLocal([hallLength, hallHeight, 1], [15, 6, 23], 0x767c8e);

      // 4. 전후방 벽 (X = -20.0, X = 50.0)
      addBoxLocal([1, hallHeight, hallWidth], [-20, 6, 0], 0x5e6370);
      addBoxLocal([1, hallHeight, hallWidth], [50, 6, 0], 0x5e6370);

      // 벽면 H-beam 기둥
      const addPillarLocal = (x: number, z: number) => {
        addBoxLocal([1.2, hallHeight, 1.2], [x, 6, z], 0x2e313b);
      };
      addPillarLocal(-10, -22.2); addPillarLocal(-10, 22.2);
      addPillarLocal(15, -22.2);  addPillarLocal(15, 22.2);
      addPillarLocal(40, -22.2);  addPillarLocal(40, 22.2);

      // --- 오리지널 맵 핵심 퍼즐 지형 ---
      // 1) 시작 플랫폼 (Y = 0)
      const spawnPlat = new THREE.Mesh(new THREE.BoxGeometry(50, 2, 8), concreteMat);
      spawnPlat.position.set(0, 0, 11);
      spawnPlat.receiveShadow = true;
      spawnPlat.castShadow = true;
      scene.add(spawnPlat);
      environmentObjectsRef.current.push(spawnPlat);
      physics.createStaticBoxCollider('spawnPlatform', new THREE.Vector3(25, 1, 4), new THREE.Vector3(0, 0, 11));

      // 지반 지지 기둥
      const columnGeom = new THREE.CylinderGeometry(0.5, 0.7, 14, 8);
      const pcol1 = new THREE.Mesh(columnGeom, concreteMat);
      pcol1.position.set(-18, -7.0, 11);
      pcol1.receiveShadow = true;
      pcol1.castShadow = true;
      scene.add(pcol1);
      environmentObjectsRef.current.push(pcol1);
      const pcol2 = pcol1.clone();
      pcol2.position.set(18, -7.0, 11);
      scene.add(pcol2);
      environmentObjectsRef.current.push(pcol2);

      // 경고선
      const edgeM = new THREE.Mesh(new THREE.BoxGeometry(50, 0.1, 0.3), yellowBorderMat);
      edgeM.position.set(0, 1.05, 7.15);
      scene.add(edgeM);
      environmentObjectsRef.current.push(edgeM);

      // 펜스 난간 추가
      buildHandrailsLocal(scene, 11, 50, ironFloorMat);

      // 2) 높은 Ledge (Y=3.5)
      const ledge = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 20), concreteMat);
      ledge.position.set(15, 3.5, 0);
      ledge.receiveShadow = true;
      ledge.castShadow = true;
      scene.add(ledge);
      environmentObjectsRef.current.push(ledge);
      physics.createStaticBoxCollider('highLedgePlatform', new THREE.Vector3(5, 4, 10), new THREE.Vector3(15, 3.5, 0));

      // 3) 도착 플랫폼 (Y=3.5)
      const goalPlat = new THREE.Mesh(new THREE.BoxGeometry(50, 2, 8), concreteMat);
      goalPlat.position.set(0, 0, -11);
      goalPlat.receiveShadow = true;
      goalPlat.castShadow = true;
      scene.add(goalPlat);
      environmentObjectsRef.current.push(goalPlat);
      physics.createStaticBoxCollider('goalPlatform', new THREE.Vector3(25, 1, 4), new THREE.Vector3(0, 0, -11));

      const pcol3 = new THREE.Mesh(columnGeom, concreteMat);
      pcol3.position.set(-18, -7.0, -11);
      pcol3.receiveShadow = true;
      pcol3.castShadow = true;
      scene.add(pcol3);
      environmentObjectsRef.current.push(pcol3);
      const pcol4 = pcol3.clone();
      pcol4.position.set(18, -7.0, -11);
      scene.add(pcol4);
      environmentObjectsRef.current.push(pcol4);

      buildHandrailsLocal(scene, -11, 50, ironFloorMat);

      const edgeM2 = new THREE.Mesh(new THREE.BoxGeometry(50, 0.1, 0.3), yellowBorderMat);
      edgeM2.position.set(0, 1.05, -7.15);
      scene.add(edgeM2);
      environmentObjectsRef.current.push(edgeM2);

      // 뒤쪽 마감 벽
      addBoxLocal([0.6, 12, 20], [44.7, 9.5, 0], 0x6e7485);

      // 모니터 콘솔 설치
      const monitorGroup = new THREE.Group();
      monitorGroup.position.set(0, 1.0, -13);

      const stand = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 1.2), ironFloorMat);
      stand.position.set(0, 0.15, 0);
      monitorGroup.add(stand);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), ironFloorMat);
      neck.position.set(0, 0.55, 0);
      monitorGroup.add(neck);

      const frame = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.9, 0.4), ironFloorMat);
      frame.position.set(0, 1.4, 0);
      monitorGroup.add(frame);

      const screenTex = createMonitorTexture("STAGE 2: DUAL WALLS", "HOLOGRAM INTERIOR LINK");
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 1.7),
        new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
      );
      screen.position.set(0, 1.4, 0.21);
      monitorGroup.add(screen);
      monitorScreenRef.current = screen;

      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), new THREE.MeshBasicMaterial({ color: '#00ffcc' }));
      lamp.position.set(-1.3, 2.15, 0.21);
      monitorGroup.add(lamp);

      scene.add(monitorGroup);
      environmentObjectsRef.current.push(monitorGroup);
      physics.createStaticBoxCollider('monitorStand', new THREE.Vector3(1.5, 1.2, 0.6), new THREE.Vector3(0, 1.6, -13));

      // 하강식 펜던트 조명 추가
      addCeilingLightsLocal(scene, 28, environmentObjectsRef.current);

    } else {
      // --- STAGE 2: WAREHOUSE DUAL WALLS ---
      const hallLength = 70;
      const hallWidth = 46;
      const hallHeight = 36;
      const offsetY = 0; // Stage 2 씬은 React 상에서 stage=2 전환 시 y=0 기준으로 clean 생성됨.

      // 1. 공장 바닥 (Y = -15.5)
      addBoxLocal([hallLength, 1, hallWidth], [21, -15.5, 0], 0x484c57);

      // 2. 트러스 천장 (Y = 19.5)
      addBoxLocal([hallLength, 1, hallWidth], [21, 19.5, 0], 0x767c8e);

      // 3. 좌우 외벽 (Z = ±23.0)
      addBoxLocal([hallLength, hallHeight, 1], [21, 2, -23], 0x9ba2b5);
      addBoxLocal([hallLength, hallHeight, 1], [21, 2, 23], 0x9ba2b5);

      // 4. 전후방 벽 (X = -20.0, X = 50.0)
      addBoxLocal([1, hallHeight, hallWidth], [-20, 2, 0], 0x767c8e);
      addBoxLocal([1, hallHeight, hallWidth], [50, 2, 0], 0x767c8e);

      // H-beam 기둥
      const addPillarLocal = (x: number, z: number) => {
        addBoxLocal([1.2, hallHeight, 1.2], [x, 2, z], 0x2e313b);
      };
      addPillarLocal(-10, -22.2); addPillarLocal(-10, 22.2);
      addPillarLocal(15, -22.2);  addPillarLocal(15, 22.2);
      addPillarLocal(40, -22.2);  addPillarLocal(40, 22.2);

      // --- 오리지널 Stage 2 퍼즐 레이아웃 ---
      // 1) 시작 플랫폼 (Y = 0)
      const sPlat = new THREE.Mesh(new THREE.BoxGeometry(10, 2, 8), concreteMat);
      sPlat.position.set(0, 0, 15);
      sPlat.receiveShadow = true;
      sPlat.castShadow = true;
      scene.add(sPlat);
      environmentObjectsRef.current.push(sPlat);
      physics.createStaticBoxCollider('stage2SpawnPlat', new THREE.Vector3(5, 1, 4), new THREE.Vector3(0, 0, 15));

      // 지지용 기둥
      addBoxLocal([4, 15, 4], [0, -8.0, 15], 0x6e7485);

      // 경고 테두리
      const wallEdgeM = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 0.3), yellowBorderMat);
      wallEdgeM.position.set(0, 1.05, 11.15);
      scene.add(wallEdgeM);
      environmentObjectsRef.current.push(wallEdgeM);

      // 2) 가로막는 거대 벽 (CSG 격벽!)
      const obstruction = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 2.5), concreteMat);
      obstruction.position.set(0, 4.0, 6.0);
      obstruction.castShadow = true;
      obstruction.receiveShadow = true;
      scene.add(obstruction);
      environmentObjectsRef.current.push(obstruction);
      cuttableWallRef.current = obstruction;
      physics.createStaticTrimeshCollider('cuttableWallCollider', obstruction.geometry, obstruction.position, obstruction.quaternion, obstruction.scale);

      // 3) 벽 뒤 낮은 바닥 통로 (Y = -0.85)
      const lowFloor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.3, 16), concreteMat);
      lowFloor.position.set(0, -0.85, 3.0);
      lowFloor.receiveShadow = true;
      scene.add(lowFloor);
      environmentObjectsRef.current.push(lowFloor);
      physics.createStaticBoxCollider('stage2LowFloor', new THREE.Vector3(5, 0.15, 8), new THREE.Vector3(0, -0.85, 3.0));

      // 4) 높은 플랫폼 (Y=2.5)
      const highPlat = new THREE.Mesh(new THREE.BoxGeometry(10, 7.0, 10), concreteMat);
      highPlat.position.set(0, 2.5, -9.0);
      highPlat.receiveShadow = true;
      highPlat.castShadow = true;
      scene.add(highPlat);
      environmentObjectsRef.current.push(highPlat);
      physics.createStaticBoxCollider('stage2HighPlat', new THREE.Vector3(5, 3.5, 5), new THREE.Vector3(0, 2.5, -9.0));

      // 지지용 기둥
      addBoxLocal([4, 19, 4], [0, -6.0, -9.0], 0x6e7485);

      const edgeM3 = new THREE.Mesh(new THREE.BoxGeometry(10, 0.1, 0.3), yellowBorderMat);
      edgeM3.position.set(0, 6.05, -4.15);
      scene.add(edgeM3);
      environmentObjectsRef.current.push(edgeM3);

      // 출구 구조 (Vault Door)
      const doorGroup = new THREE.Group();
      doorGroup.position.set(0, 6.0, -13.5);

      const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.5, 0.4), ironFloorMat);
      frameL.position.set(-1.6, 1.25, 0);
      doorGroup.add(frameL);

      const frameR = frameL.clone();
      frameR.position.set(1.6, 1.25, 0);
      doorGroup.add(frameR);

      const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.4, 0.4), ironFloorMat);
      lintel.position.set(0, 2.7, 0);
      doorGroup.add(lintel);

      const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.2), ironFloorMat);
      sign.position.set(0, 3.15, 0.1);
      doorGroup.add(sign);

      const exitText = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.35),
        new THREE.MeshBasicMaterial({ map: createExitSignTexture() })
      );
      exitText.position.set(0, 3.15, 0.21);
      doorGroup.add(exitText);

      scene.add(doorGroup);
      environmentObjectsRef.current.push(doorGroup);

      // 천장 케이블 조명 추가
      addStage2CeilingLightsLocal(scene, 20, offsetY, environmentObjectsRef.current);
    }
  };

  /**
   * Generates a glowing green/red Neon exit label texture
   */
  const createExitSignTexture = (): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0a100d';
    ctx.fillRect(0, 0, 128, 32);

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#39ff14'; // high energy lime green
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#39ff14';
    ctx.fillText('EXIT DOCK', 18, 22);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  /**
   * Generates a realistic blueprint thumbnail texture for the photo snapshots
   */
  const createPhotoThumbnailTexture = (type: 'bridge' | 'ramp_corridor'): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Background gradient space/cyber grid
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#0a101f'); // dark slate
    grad.addColorStop(1, '#020617'); // slate-950
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Draw cyber blueprint grids
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.12)'; 
    ctx.lineWidth = 1;
    for (let x = 0; x <= 256; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0); ctx.lineTo(x, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, x); ctx.lineTo(256, x);
      ctx.stroke();
    }

    if (type === 'bridge') {
      // Draw a highly distinct 2D blueprint of a wooden plank bridge
      // Girders
      ctx.strokeStyle = '#10b981'; 
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(15, 140);
      ctx.lineTo(241, 140);
      ctx.moveTo(15, 160);
      ctx.lineTo(241, 160);
      ctx.stroke();

      // Vertical posts
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.7)';
      ctx.lineWidth = 1.5;
      for (let x = 30; x <= 226; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 140); ctx.lineTo(x, 185);
        ctx.stroke();
      }

      // Planks diagonal pattern
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      for (let x = 20; x <= 236; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, 132);
        ctx.lineTo(x, 168);
        ctx.stroke();
      }

      // Title
      ctx.fillStyle = '#00ffcc';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('BRIDGE SNAP', 20, 50);
      ctx.fillStyle = 'rgba(0, 255, 204, 0.6)';
      ctx.font = '11px monospace';
      ctx.fillText('GEOM TYPE: 3D_BRIDGE_SOLID', 20, 75);
    } else {
      // Draw ramp stairwell csg
      ctx.strokeStyle = '#06b6d4'; 
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(25, 210);
      ctx.lineTo(115, 140);
      ctx.lineTo(155, 140);
      ctx.lineTo(235, 75);
      ctx.stroke();

      // Guide indicators
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(25, 235);
      ctx.lineTo(105, 165);
      ctx.lineTo(165, 165);
      ctx.lineTo(235, 105);
      ctx.stroke();

      // Title
      ctx.fillStyle = '#22d3ee';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('RAMP CELL', 20, 50);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.6)';
      ctx.font = '11px monospace';
      ctx.fillText('GEOM TYPE: 3D_RAMP_CORRIDOR', 20, 75);
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  };

  /**
   * Spawns a beautiful realistic industrial testing desk with the physical tool model sitting on it for photo capture!
   */
  const createFloatingPhotoCard = (scene: THREE.Scene, currentStage: StageId) => {
    // 1. Core positioning parameters for the workbench/desk
    const tablePos = currentStage === StageId.STAGE_1 
      ? new THREE.Vector3(-4.5, 1.0, 11.5) 
      : new THREE.Vector3(-3.5, 1.0, 16.0);

    // 2. High fidelity desk top (polished mahogany industrial plate)
    const tableTopGeo = new THREE.BoxGeometry(1.8, 0.08, 1.2);
    const tableTopMat = new THREE.MeshStandardMaterial({
      color: '#3a2512', // Warm organic wood grain tone
      roughness: 0.45,
      metalness: 0.25
    });
    const tableTop = new THREE.Mesh(tableTopGeo, tableTopMat);
    tableTop.position.set(tablePos.x, 1.68, tablePos.z);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    scene.add(tableTop);
    environmentObjectsRef.current.push(tableTop);

    // 3. Heavy industrial metal legs
    const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.68, 8);
    const legMat = new THREE.MeshStandardMaterial({
      color: '#212529', // Dark carbon fiber/cast iron
      roughness: 0.35,
      metalness: 0.95
    });

    const offsetsX = [-0.75, 0.75];
    const offsetsZ = [-0.48, 0.48];
    offsetsX.forEach(ox => {
      offsetsZ.forEach(oz => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(tablePos.x + ox, 1.34, tablePos.z + oz);
        leg.castShadow = true;
        scene.add(leg);
        environmentObjectsRef.current.push(leg);
      });
    });

    // Substantial static collider in Rapier Physics so player cannot clip through the desk
    const physics = physicsRef.current;
    if (physics) {
      physics.createStaticBoxCollider('desk_collider', new THREE.Vector3(0.9, 0.35, 0.6), new THREE.Vector3(tablePos.x, 1.35, tablePos.z));
    }

    // 4. Compact elegant 3D Prototype Miniature sitting on the desk
    const toyGroup = new THREE.Group();
    toyGroup.position.set(tablePos.x, 1.72, tablePos.z);

    if (currentStage === StageId.STAGE_1) {
      // miniature Bridge of Planks
      const baseGeo = new THREE.BoxGeometry(0.72, 0.03, 0.22);
      const baseMat = new THREE.MeshStandardMaterial({
        color: '#ffbb77', // Glowing light pine wood tone
        roughness: 0.7,
        metalness: 0.05
      });
      const miniPlank = new THREE.Mesh(baseGeo, baseMat);
      miniPlank.name = 'stage1_bridge_toy';
      toyGroup.add(miniPlank);

      // Cute safety railings
      const railGeo = new THREE.BoxGeometry(0.72, 0.06, 0.012);
      const railMat = new THREE.MeshStandardMaterial({ color: '#c68a4c', roughness: 0.85 });
      
      const railL = new THREE.Mesh(railGeo, railMat);
      railL.position.set(0, 0.04, 0.10);
      toyGroup.add(railL);

      const railR = new THREE.Mesh(railGeo, railMat);
      railR.position.set(0, 0.04, -0.10);
      toyGroup.add(railR);

      // Micro decorative struts
      const strutGeo = new THREE.BoxGeometry(0.015, 0.06, 0.015);
      for (let sx = -0.28; sx <= 0.28; sx += 0.14) {
        const sL = new THREE.Mesh(strutGeo, railMat);
        sL.position.set(sx, 0.03, 0.10);
        const sR = new THREE.Mesh(strutGeo, railMat);
        sR.position.set(sx, 0.03, -0.10);
        toyGroup.add(sL);
        toyGroup.add(sR);
      }
    } else {
      // Stage 2: Miniature 3D CSG Ramp Corridor
      const baseColG = new THREE.BoxGeometry(0.42, 0.26, 0.42);
      const baseColM = new THREE.MeshStandardMaterial({
        color: '#1e293b',
        roughness: 0.4,
        metalness: 0.8
      });
      const miniRamp = new THREE.Mesh(baseColG, baseColM);
      miniRamp.name = 'stage2_ramp_toy';
      toyGroup.add(miniRamp);

      // Visual warning stripe cutting through the micro-ramp
      const detailGeo = new THREE.BoxGeometry(0.43, 0.015, 0.06);
      const stripeM = new THREE.MeshBasicMaterial({ color: '#ffd700' });
      const detail = new THREE.Mesh(detailGeo, stripeM);
      detail.position.set(0, 0.08, 0);
      toyGroup.add(detail);
    }

    // 5. Pulsing holographic target zone directly above the miniature model
    const pulseRingGeo = new THREE.RingGeometry(0.22, 0.25, 16);
    pulseRingGeo.rotateX(-Math.PI / 2);
    const pulseRingMat = new THREE.MeshBasicMaterial({
      color: '#00ffcc',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      toneMapped: false
    });
    const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
    pulseRing.position.set(0, 0.14, 0);
    pulseRing.name = 'pulseRing';
    toyGroup.add(pulseRing);

    // Levitating neon interactive selector arrow pointing down at model
    const selectorGeo = new THREE.ConeGeometry(0.06, 0.16, 4);
    selectorGeo.rotateX(Math.PI); // Point downwards
    const selectorMat = new THREE.MeshBasicMaterial({
      color: '#00ffcc',
      toneMapped: false
    });
    const arrow = new THREE.Mesh(selectorGeo, selectorMat);
    arrow.position.set(0, 0.38, 0);
    arrow.name = 'arrow';
    toyGroup.add(arrow);

    scene.add(toyGroup);
    environmentObjectsRef.current.push(toyGroup);
    photoSpawnMeshRef.current = toyGroup;
  };

  /**
   * Pre-allocates placement visual helper (3D bounding cylinder or frames)
   */
  const setupPlacementVisualHologram = (scene: THREE.Scene) => {
    const group = new THREE.Group();
    group.name = 'preview_hologram';

    // Box border outline
    const hologramBox = new THREE.BoxGeometry(8, 4.5, 10);
    const edges = new THREE.EdgesGeometry(hologramBox);
    const edgeLines = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
      color: '#00ffcc',
      linewidth: 3
    }));
    edgeLines.name = 'bounding_box';
    group.add(edgeLines);

    // Adds a central target dot
    const targetDotGeom = new THREE.SphereGeometry(0.2, 8, 8);
    const targetDotMat = new THREE.MeshBasicMaterial({ color: '#ff3366', toneMapped: false });
    const dot = new THREE.Mesh(targetDotGeom, targetDotMat);
    group.add(dot);

    // Beautiful Glowing 3D Bridge Hologram Mesh
    // Matches depth = 17.5, width = 3.6, height = 0.8
    const hBridgeGeom = createBridgeGeometry(3.6, 0.8, 17.5);
    const hBridgeMat = new THREE.MeshBasicMaterial({
      color: '#10b981', // green / emerald
      transparent: true,
      opacity: 0.55,
      wireframe: true,
      toneMapped: false
    });
    const bridgeHoloMesh = new THREE.Mesh(hBridgeGeom, hBridgeMat);
    bridgeHoloMesh.name = 'preview_bridge';
    group.add(bridgeHoloMesh);

    // Beautiful Glowing 3D Ramp Corridor Hologram Mesh
    // Matches depth = 12.0, width = 4.0, height = 3.0
    const hCorridorGeom = createCorridorRampGeometry(4.0, 3.0, 12.0);
    const hCorridorMat = new THREE.MeshBasicMaterial({
      color: '#22d3ee', // bright cyan
      transparent: true,
      opacity: 0.55,
      wireframe: true,
      toneMapped: false
    });
    const corridorHoloMesh = new THREE.Mesh(hCorridorGeom, hCorridorMat);
    corridorHoloMesh.name = 'preview_corridor';
    group.add(corridorHoloMesh);

    group.visible = false; // off initially
    scene.add(group);
    projectionHologramRef.current = group as any;
  };

  /**
   * Refined updates to the hologram placement preview (Yaw/Pitch roll calculations)
   */
  const updateHologramTransform = (camera: THREE.PerspectiveCamera, playerPos: THREE.Vector3) => {
    const holo = projectionHologramRef.current;
    if (!holo) return;

    const currentHeld = heldPhotoRef.current;
    if (!currentHeld) {
      holo.visible = false;
      return;
    }

    holo.visible = true;

    // Get sub-preview components inside the group
    const previewBridge = holo.getObjectByName('preview_bridge');
    const previewCorridor = holo.getObjectByName('preview_corridor');
    const boundingBox = holo.getObjectByName('bounding_box');

    // Hide generic bounding box to make space for exact custom 3D wireframe visuals!
    if (boundingBox) boundingBox.visible = false;

    // Toggle active preview based on what photo is held in user's hand
    if (currentHeld.assetType === 'bridge') {
      if (previewBridge) previewBridge.visible = true;
      if (previewCorridor) previewCorridor.visible = false;
    } else if (currentHeld.assetType === 'ramp_corridor') {
      if (previewBridge) previewBridge.visible = false;
      if (previewCorridor) previewCorridor.visible = true;
    }

    // Direct ray forward from camera to hit level layout
    const forwardVec = new THREE.Vector3(0, 0, -1);
    forwardVec.applyQuaternion(camera.quaternion);
    forwardVec.normalize();

    // Trace placement location: default 9 units in front of player
    let stampOffsetDistance = 9.0;

    // Dynamic raycast search against all solid elements in the active scene!
    const sceneObj = sceneRef.current;
    if (sceneObj) {
      const raycaster = new THREE.Raycaster();
      raycaster.set(camera.position, forwardVec);
      const targets = sceneObj.children.filter(obj => 
        obj.visible && 
        obj !== holo && 
        obj.name !== 'placed_bridge_group' && 
        obj.name !== 'placed_corridor_ramp'
      );
      const intersects = raycaster.intersectObjects(targets, true);
      if (intersects.length > 0) {
        // Enforce robust placement range: comfort bounds [4.5, 18.0]
        stampOffsetDistance = Math.max(4.5, Math.min(intersects[0].distance, 18.0));
      }
    }

    const stampPos = camera.position.clone().addScaledVector(forwardVec, stampOffsetDistance);
    
    // Core forced-perspective scaling mechanic (Superliminal style)
    const scaleFactor = stampOffsetDistance / 9.0;
    holo.scale.setScalar(scaleFactor);

    holo.position.copy(stampPos);
    
    // Smooth camera target rotation + Roll alignment offset from current Q/E values
    holo.quaternion.copy(camera.quaternion);
    
    // Spin roll on local axis of hologram (the forward vector)
    const rollRad = (customRollDegreesRef.current * Math.PI) / 180;
    holo.rotateZ(rollRad);
  };

  /**
   * Toggle equipping / holstering a photo from inventory
   */
  const toggleEquipPhoto = (photo: PhotoItem) => {
    if (heldPhoto && heldPhoto.id === photo.id) {
      setHeldPhoto(null);
      beepChannel(300, 'sine', 0.1);
      setSysStatus("PHOTO HOLSTERED (UN-EQUIPPED)");
    } else {
      setHeldPhoto(photo);
      beepChannel(600, 'sine', 0.12);
      setSysStatus(`EQUIPPED: ${photo.name.toUpperCase()}`);
    }
  };

  /**
   * Event triggers player photo capture of the desk miniature model
   */
  const triggerPhotoPickup = () => {
    if (!photoSpawnMeshRef.current || !sceneRef.current) return;
    
    // Play satisfying retro camera snapshot sound!
    beepChannel(1200, 'sine', 0.05);
    setTimeout(() => {
      beepChannel(400, 'triangle', 0.18);
    }, 40);

    // Active full screen camera white flash overlay
    setIsFlashActive(true);
    setTimeout(() => {
      setIsFlashActive(false);
    }, 350);

    // Save snapshot state of canvas! Let's pull from WebGL's canvas buffer
    let snapshotUrl = '';
    if (canvasRef.current && rendererRef.current && sceneRef.current && cameraRef.current) {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const originalCamera = cameraRef.current;

      // Temporary hide interactive HUD indicators so the snapshot shows the pristine actual desk object
      const arrow = photoSpawnMeshRef.current.getObjectByName('arrow');
      const ring = photoSpawnMeshRef.current.getObjectByName('pulseRing');
      if (arrow) arrow.visible = false;
      if (ring) ring.visible = false;

      // Position a clean product-shot close-up camera looking nicely at the toy model on the desk
      const snapCamera = new THREE.PerspectiveCamera(
        42, // Narrow focal length for elegant photographic product look
        originalCamera.aspect,
        0.1,
        100
      );

      const toyPos = new THREE.Vector3();
      photoSpawnMeshRef.current.getWorldPosition(toyPos);

      // Place camera angled from slight front/top/right to capture desk wood background nicely
      snapCamera.position.copy(toyPos).add(new THREE.Vector3(0.5, 0.45, 0.6));
      snapCamera.lookAt(toyPos);

      // Force instant render update of the close-up vantage point
      renderer.render(scene, snapCamera);

      // Extract the high quality snapshot data URL
      snapshotUrl = canvasRef.current.toDataURL('image/jpeg', 0.85);

      // Restore normal indicators before disposing them
      if (arrow) arrow.visible = true;
      if (ring) ring.visible = true;

      // Restore camera state instantly for the standard render loop
      renderer.render(scene, originalCamera);
    } else if (canvasRef.current) {
      snapshotUrl = canvasRef.current.toDataURL('image/jpeg', 0.6); // Fallback
    }

    // Determine what we actually photographed based on the current stage!
    const actualStage = stageRef.current;

    // Slide-out and trigger polaroid film developing overlay UI
    setShowPhotoAlert(actualStage === StageId.STAGE_1 ? 'bridge' : 'ramp_corridor');
    setTimeout(() => {
      setShowPhotoAlert(null);
    }, 3200);

    // Clean up pulsing rings & arrows so it looks photographed and completed
    const arrow = photoSpawnMeshRef.current.getObjectByName('arrow');
    const ring = photoSpawnMeshRef.current.getObjectByName('pulseRing');
    if (arrow) photoSpawnMeshRef.current.remove(arrow);
    if (ring) photoSpawnMeshRef.current.remove(ring);

    // Set ref to null so the user cannot take another photo of this desk,
    // though the physical toy and desk stay rendered in the room!
    photoSpawnMeshRef.current = null;

    // Bind captured item properties to the polaroid hand slot
    const pickedPhoto: PhotoItem = {
      id: actualStage === StageId.STAGE_1 ? 'photo_bridge' : 'photo_ramp_corridor',
      name: actualStage === StageId.STAGE_1 ? 'Bridge of Planks' : 'Corridor Entrance Tunnel',
      description: actualStage === StageId.STAGE_1 ? 'A study in wooden walkway projection.' : 'A 3D hollow tunnel with internal ramps.',
      assetType: actualStage === StageId.STAGE_1 ? 'bridge' : 'ramp_corridor',
      thumbnailUrl: snapshotUrl,
      scale: [1, 1, 1],
      rotation: [0, 0, 0]
    };

    setInventory(prev => {
      if (prev.some(item => item.id === pickedPhoto.id)) {
        return prev;
      }
      return [...prev, pickedPhoto];
    });

    setHeldPhoto(pickedPhoto);
    setHasPickedPhoto(true);
    setSysStatus(`SNAPSHOT CAPTURED: ${pickedPhoto.name.toUpperCase()} ACQUIRED!`);
  };

  /**
   * Generous proximity and direct look angle check to capture polaroid snapshot easily
   */
  const checkAndTriggerPhotoCapture = (): boolean => {
    if (!photoSpawnMeshRef.current || !cameraRef.current || !physicsRef.current) return false;

    // Must be aiming directly at the interactive desk object (target locked state)!
    if (lastDetectionStateRef.current !== 'TARGET_LOCKED') {
      beepChannel(250, 'sawtooth', 0.15);
      setSysStatus("LOCK REQUIRED: AIM CAMERA AT INTERACTIVE TOY DESK!");
      return false;
    }

    triggerPhotoPickup();
    return true;
  };

  // Sync ref
  checkAndTriggerPhotoCaptureRef.current = checkAndTriggerPhotoCapture;

  /**
   * TRIMS / STAMPS CSG & physical geometries
   */
  const executeObjectPlacement = () => {
    try {
      const currentHeld = heldPhotoRef.current;
      console.log("Execute Object Placement Triggered! currentHeld:", currentHeld);
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const physics = physicsRef.current;
      if (!scene || !camera || !physics) return;

      if (!currentHeld) return;

      console.log("Projects at:", camera.position, "Asset Type:", currentHeld.assetType);

      beepChannel(520, 'triangle', 0.15);
      beepChannel(880, 'sine', 0.25);

      setSysStatus("PROJECTING 3D PERSPECTIVE TO REALITY...");

      // Locate projection target center
      const holo = projectionHologramRef.current;

      let projectionPos = new THREE.Vector3();
      let stampRotation = new THREE.Quaternion();
      let scaleFactor = 1.0;

      if (holo && holo.visible) {
        // ALWAYS use the exact hologram preview transform so the forced perspective visually matches perfectly!
        projectionPos.copy(holo.position);
        stampRotation.copy(holo.quaternion);
        scaleFactor = holo.scale.x;
      } else {
        // Fallback safety (should never hit if preview is visible)
        const forwardVec = new THREE.Vector3(0, 0, -1);
        forwardVec.applyQuaternion(camera.quaternion);
        forwardVec.normalize();
        
        let placementDist = 9.0;
        const raycaster = new THREE.Raycaster();
        raycaster.set(camera.position, forwardVec);
        const targets = scene.children.filter(obj => 
          obj.visible && 
          obj.name !== 'preview_hologram' &&
          obj.name !== 'placed_bridge_group' && 
          obj.name !== 'placed_corridor_ramp'
        );
        const intersects = raycaster.intersectObjects(targets, true);
        if (intersects.length > 0) {
          placementDist = Math.max(4.5, Math.min(intersects[0].distance, 18.0));
        }

        projectionPos = camera.position.clone().addScaledVector(forwardVec, placementDist);
        scaleFactor = placementDist / 9.0;
        stampRotation = camera.quaternion.clone();
        const rollRad = (customRollDegreesRef.current * Math.PI) / 180;
        const rollOffset = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, -1), rollRad);
        stampRotation.multiply(rollOffset);
      }

      if (currentHeld.assetType === 'bridge') {
        // --- STAGE 1: Bridge placement math ---
        const width = 3.6 * scaleFactor;
        const height = 0.8 * scaleFactor;
        const depth = 17.5 * scaleFactor; 

        const store = textureStoreRef.current!;
        let snapTex: THREE.Texture | null = null;
        try {
          if (currentHeld.thumbnailUrl) {
            snapTex = new THREE.TextureLoader().load(currentHeld.thumbnailUrl);
            snapTex.colorSpace = THREE.SRGBColorSpace;
            snapTex.wrapS = THREE.RepeatWrapping;
            snapTex.wrapT = THREE.RepeatWrapping;
            snapTex.repeat.set(1, 4);
          }
        } catch (e) {
          console.warn("Bridge snapshot texture failed to load, falling back:", e);
        }

        // Visual representation of the bridge as a beautifully styled Group
        const bridgeGroup = new THREE.Group();
        bridgeGroup.name = 'placed_bridge_group';

        // 1. Main wooden deck
        const deckHalfHeight = height * 0.4 / 2; // 0.16
        const deckGeom = new THREE.BoxGeometry(width, height * 0.4, depth);
        const deckMat = new THREE.MeshStandardMaterial({
          map: snapTex || store.woodPlank,
          color: '#ffffff', // Pure white base
          roughness: 0.75,
          metalness: 0.15
        });
        const deckMesh = new THREE.Mesh(deckGeom, deckMat);
        deckMesh.position.set(0, 0, 0);
        deckMesh.castShadow = true;
        deckMesh.receiveShadow = true;
        bridgeGroup.add(deckMesh);

        // 2. Pair of solid safety side rails
        const railWidth = 0.12 * scaleFactor;
        const railGeom = new THREE.BoxGeometry(railWidth, 1.2 * scaleFactor, depth);
        const railMat = new THREE.MeshStandardMaterial({
          color: '#1e293b',
          roughness: 0.4,
          metalness: 0.8
        });

        const leftRail = new THREE.Mesh(railGeom, railMat);
        leftRail.position.set(-width / 2 + railWidth/2 + 0.02 * scaleFactor, 0.6 * scaleFactor, 0);
        leftRail.castShadow = true;
        bridgeGroup.add(leftRail);

        const rightRail = new THREE.Mesh(railGeom, railMat);
        rightRail.position.set(width / 2 - railWidth/2 - 0.02 * scaleFactor, 0.6 * scaleFactor, 0);
        rightRail.castShadow = true;
        bridgeGroup.add(rightRail);

        // POSITION: Project exactly at projectionPos
        const placementPos = projectionPos.clone();

        bridgeGroup.position.copy(placementPos);
        bridgeGroup.quaternion.copy(stampRotation);
        scene.add(bridgeGroup);
        environmentObjectsRef.current.push(bridgeGroup);

        // Create main walking deck collider
        physics.createStaticRotatedBoxCollider(
          'projectedBridgeDeck',
          new THREE.Vector3(width / 2 - (0.15 * scaleFactor), deckHalfHeight, depth / 2),
          placementPos,
          stampRotation
        );

        // Left rail solid safety collider
        const leftRailRelPos = new THREE.Vector3(-width / 2 + (0.08 * scaleFactor), 0.6 * scaleFactor, 0).applyQuaternion(stampRotation);
        const leftRailPos = placementPos.clone().add(leftRailRelPos);
        physics.createStaticRotatedBoxCollider(
          'projectedBridgeLeftRail',
          new THREE.Vector3(0.08 * scaleFactor, 0.6 * scaleFactor, depth / 2),
          leftRailPos,
          stampRotation
        );

        // Right rail solid safety collider
        const rightRailRelPos = new THREE.Vector3(width / 2 - (0.08 * scaleFactor), 0.6 * scaleFactor, 0).applyQuaternion(stampRotation);
        const rightRailPos = placementPos.clone().add(rightRailRelPos);
        physics.createStaticRotatedBoxCollider(
          'projectedBridgeRightRail',
          new THREE.Vector3(0.08 * scaleFactor, 0.6 * scaleFactor, depth / 2),
          rightRailPos,
          stampRotation
        );

        // Complete visual portal dust burst particles
        createVisualDustSplatter(placementPos, scene);

        console.log("Bridge group and solid rotated box physics collider placed successfully aligned at camera view:", placementPos);

      } else if (currentHeld.assetType === 'ramp_corridor') {
        // --- STAGE 2: CARVE AND STAMP WALLS (CSG) ---
        // 1. CARVING SUBTRACT OUT OF HUGE WALL IF ENCOUNTERED
        if (cuttableWallRef.current) {
          // Create matching box cutter geometry
          const sliceBoxW = 4.2 * scaleFactor;
          const sliceBoxH = 4.6 * scaleFactor;
          const sliceBoxD = 14.0 * scaleFactor;
          const cutterGeom = new THREE.BoxGeometry(sliceBoxW, sliceBoxH, sliceBoxD);
          const cutterMaterial = new THREE.MeshBasicMaterial({ color: '#ff0033' });
          
          const cutterMesh = new THREE.Mesh(cutterGeom, cutterMaterial);
          cutterMesh.position.copy(projectionPos);
          cutterMesh.quaternion.copy(stampRotation);
          cutterMesh.updateMatrixWorld(true);

          try {
            // Perform high-performance slice subtracted geometry
            const subtractedGeom = subtractGeometry(cuttableWallRef.current, cutterMesh);
            
            // Replace current wall visuals to show the custom carved corridor tunnels!
            cuttableWallRef.current.geometry.dispose();
            cuttableWallRef.current.geometry = subtractedGeom;
            
            // Instantly update physical rigid body colliders so players can walk through
            physics.createStaticTrimeshCollider(
              'cuttableWallCollider',
              subtotalGeometryFilter(subtractedGeom),
              cuttableWallRef.current.position,
              cuttableWallRef.current.quaternion,
              cuttableWallRef.current.scale
            );

            setSysStatus("CSG INTEGRATION SUCCEEDED: Tunnel Carved!");
          } catch (e) {
            console.error("CSG Slicing Err:", e);
          }
        }

        // 2. ADD / SOLIDIFY RAMP CORRIDOR MODEL
        const rWidth = 4.0 * scaleFactor;
        const rHeight = 3.0 * scaleFactor;
        const rDepth = 12.0 * scaleFactor;

        const corridorGeom = createCorridorRampGeometry(rWidth, rHeight, rDepth);
        
        const snapTex = new THREE.TextureLoader().load(currentHeld.thumbnailUrl);
        snapTex.colorSpace = THREE.SRGBColorSpace;
        snapTex.wrapS = THREE.RepeatWrapping;
        snapTex.wrapT = THREE.RepeatWrapping;

        const stepMat = new THREE.MeshStandardMaterial({
          map: snapTex,
          roughness: 0.9,
          metalness: 0.1
        });

        const corridorMesh = new THREE.Mesh(corridorGeom, stepMat);
        corridorMesh.name = 'placed_corridor_ramp';
        corridorMesh.position.copy(projectionPos);
        corridorMesh.quaternion.copy(stampRotation);
        corridorMesh.receiveShadow = true;
        corridorMesh.castShadow = true;
        scene.add(corridorMesh);
        environmentObjectsRef.current.push(corridorMesh);

        // Create trimesh collider inside Rapier
        const corridorId = `corridor_ramp_${Date.now()}`;
        physics.createStaticTrimeshCollider(
          corridorId,
          corridorGeom,
          projectionPos,
          stampRotation,
          new THREE.Vector3(1, 1, 1)
        );

        createVisualDustSplatter(projectionPos, scene);
      }

      // Release held inventory items once projected
      setHeldPhoto(null);
      setSysStatus("PROJECTION COMPLETED. INVENTORY CLEAR.");
    } catch (error) {
      console.error("CRITICAL ERROR IN executeObjectPlacement:", error);
      setSysStatus(`PROJECTION ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Keep Ref updated with current closure state
  executeObjectPlacementRef.current = executeObjectPlacement;

  /**
   * Handles pointer click events on the canvas
   */
  const handleViewportClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPointerLocked) {
      canvasRef.current?.requestPointerLock();
      return;
    }

    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const physics = physicsRef.current;
    if (!scene || !camera || !physics) return;

    const currentHeld = heldPhotoRef.current;

    // Right Click places/projects the photo
    if (e.button === 2) {
      if (currentHeld) {
        executeObjectPlacement();
      }
      return;
    }

    // Left Click: Try capture photo if not holding anything, or trigger Stage Transition monitor
    if (e.button === 0) {
      if (!currentHeld) {
        if (photoSpawnMeshRef.current) {
          const captured = checkAndTriggerPhotoCapture();
          if (captured) return;
        }
      }

      const currentStage = stageRef.current;
      if (currentStage === StageId.STAGE_1 && isNearMonitor && !isTransitioning) {
        triggerMonitorStageTransition();
      }
    }
  };

  /**
   * Clones and guarantees safe vertices array exists for Physics Trimeshes
   */
  const subtotalGeometryFilter = (geom: THREE.BufferGeometry): THREE.BufferGeometry => {
    geom.computeVertexNormals();
    return geom; 
  };

  /**
   * Emits floating particle rings upon stamps
   */
  const createVisualDustSplatter = (center: THREE.Vector3, scene: THREE.Scene) => {
    const pGroup = new THREE.Group();
    const count = 35;
    
    const geom = new THREE.SphereGeometry(0.12, 6, 6);
    const material = new THREE.MeshBasicMaterial({ 
      color: '#00ffcc', 
      transparent: true, 
      opacity: 0.8 
    });

    for (let i = 0; i < count; i++) {
      const pm = new THREE.Mesh(geom, material);
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 2.5;
      pm.position.set(
        Math.cos(angle) * dist,
        (Math.random() - 0.5) * 3,
        Math.sin(angle) * dist
      );
      pGroup.add(pm);
    }

    pGroup.position.copy(center);
    scene.add(pGroup);

    // Fade out animations over time
    let age = 0;
    const interval = setInterval(() => {
      age += 0.05;
      pGroup.scale.addScalar(0.04);
      pGroup.children.forEach((c) => {
        const mat = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 0.8 - age);
      });

      if (age >= 1.0) {
        clearInterval(interval);
        scene.remove(pGroup);
      }
    }, 50);
  };

  /**
   * Action triggers dive/monitoring transition to Stage 2 with immersive macro zoom-in fov
   */
  const triggerMonitorStageTransition = () => {
    if (isTransitioning || !cameraRef.current) return;

    setIsTransitioning(true);
    setIsNearMonitor(false);
    document.exitPointerLock(); // temporarily drop focus during cinematic swap
    beepChannel(260, 'sine', 0.2);
    setTimeout(() => beepChannel(390, 'sine', 0.2), 120);
    setTimeout(() => beepChannel(780, 'sine', 0.4), 240);

    const camera = cameraRef.current;
    const targetMonitorPos = new THREE.Vector3(0, 1.45, -11.9); // Center coordinates of the monitor panel
    const startCamPos = camera.position.clone();
    const startCamRot = camera.quaternion.clone();

    // Line up camera angle staring flat forward at screen during zoom
    const targetCamRot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, 0));

    let progress = 0;
    const duration = 1.35; // seconds
    const intervalTime = 16; // ms (~60fps ticks)
    const steps = (duration * 1000) / intervalTime;
    let stepCount = 0;

    const transitionAnim = setInterval(() => {
      stepCount++;
      progress = stepCount / steps;
      const t = Math.pow(progress, 2.5);

      camera.position.lerpVectors(startCamPos, targetMonitorPos, t);
      camera.quaternion.copy(startCamRot).slerp(targetCamRot, t);

      // Immersive Macro Lens FOV decrease (75 down to 14)
      camera.fov = 75 - (75 - 14) * t;
      camera.updateProjectionMatrix();

      if (stepCount >= steps) {
        clearInterval(transitionAnim);
        
        // Final transition trigger stage swaps
        setTimeout(() => {
          setStage(StageId.STAGE_2);
          setStageRevision(prev => prev + 1);
          setInventory([]);
          setHeldPhoto(null);
          setHeldRotation(0);
          customRollDegreesRef.current = 0;
          setIsTransitioning(false);
          setIsNearMonitor(false);
          photoSpawnMeshRef.current = null;
          setSysStatus("SYSTEM: TRANSITION COMPLETED. STAGE 2 DOCK ONLINE.");
        }, 150);
      }
    }, intervalTime);
  };

  /**
   * Wins / Clears the Stage 2 prototype game
   */
  const triggerStage2Clear = () => {
    setIsCleared(true);
    document.exitPointerLock();
    beepChannel(520, 'sine', 0.15);
    beepChannel(650, 'sine', 0.15);
    beepChannel(780, 'sine', 0.15);
    beepChannel(1040, 'sine', 0.5);
    setSysStatus("CHALLENGE CLEARED: PORTAL DESTINATION REACHED!");
  };

  /**
   * Resets level structures
   */
  const restartCurrentState = () => {
    beepChannel(220, 'triangle', 0.1);
    setHeldPhoto(null);
    setHeldRotation(0);
    customRollDegreesRef.current = 0;
    setPhysicsActive(false);
    setIsCleared(false);
    
    setStageRevision(prev => prev + 1);
    const currentStage = stageRef.current;
    setSysStatus(`STAGE ${currentStage === StageId.STAGE_1 ? '1' : '2'} STATE RELOADED.`);
  };

  return (
    <main className="relative w-full h-screen overflow-hidden bg-[#0a0c10] text-[#e0e6ed] font-sans" id="game_root">
      {/* Dynamic 3D canvas viewport */}
      <canvas 
        ref={canvasRef} 
        onMouseDown={handleViewportClick}
        onContextMenu={(e) => e.preventDefault()}
        className="block w-full h-full cursor-crosshair outline-none"
        id="game_canvas"
      />

      {/* 📸 Retro Shutter Flash White Overlay */}
      {isFlashActive && (
        <div className="absolute inset-0 bg-white/95 z-50 pointer-events-none animate-flash-out" />
      )}

      {/* 🎞️ POLAROID PRINTING/DEVELOPING FILMIC NOTIFICATION OVERLAY */}
      {showPhotoAlert && (
        <div className="absolute top-[88px] right-6 w-[200px] bg-slate-950/90 border-2 border-emerald-400 p-4 rounded-xl shadow-[0_0_25px_rgba(52,211,153,0.2)] z-40 pointer-events-none flex flex-col items-center">
          <span className="text-[10px] font-bold font-mono text-[#00ffcc] tracking-widest uppercase mb-2.5 animate-pulse">
            PRINT SHUTTER DEVELOPING...
          </span>
          <div className="w-[110px] h-[130px] bg-white border border-white p-2 rounded shadow-lg flex flex-col justify-between items-center transform rotate-3 scale-105">
            {/* Captured blueprint schematic */}
            <div className="w-full h-[90px] bg-slate-900 border border-slate-200/25 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none animate-pulse" />
              {showPhotoAlert === 'bridge' ? (
                <svg className="w-16 h-12 text-[#00ffcc]" viewBox="0 0 100 50" fill="none">
                  <path d="M5 32 H95 M5 37 H95" stroke="currentColor" strokeWidth="3" />
                  <path d="M10 18 V32 M50 18 V32 M90 18 V32" stroke="currentColor" strokeWidth="2" />
                  <path d="M5 18 H95 M5 12 Q50 32 95 12" stroke="currentColor" strokeWidth="2" />
                </svg>
              ) : (
                <svg className="w-16 h-12 text-cyan-400" viewBox="0 0 100 50" fill="none">
                  <path d="M15 42 L45 27 H55 L85 10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M10 45 L40 30 H60 L90 15" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
                </svg>
              )}
            </div>
            <span className="text-[8px] text-slate-800 font-bold font-mono tracking-tighter mt-1 truncate max-w-full">
              {showPhotoAlert === 'bridge' ? 'BRIDGE OF PLANKS' : 'CORRIDOR RAMP'}
            </span>
          </div>
          <span className="text-[10px] text-slate-300 font-mono mt-3 text-center">
            가방에 새로운 폴라로이드 추가!
          </span>
        </div>
      )}

      {/* Crosshair target sight at center of view */}
      {isPointerLocked && !isCleared && !isTransitioning && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center justify-center z-10">
          <div className="w-10 h-10 border border-emerald-400/50 rounded-full flex items-center justify-center animate-pulse">
            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${heldPhoto ? 'bg-emerald-400' : 'bg-[#00ffcc]'}`} />
          </div>
          
          {heldPhoto && (
            <div 
              className="absolute text-[10px] text-emerald-400 font-mono mt-14 px-1.5 py-0.5 bg-slate-900/80 border border-emerald-400/30 rounded shadow-md"
              style={{ transform: `rotate(${heldRotation}deg)` }}
            >
              PROJECT: {heldRotation}°
            </div>
          )}
        </div>
      )}

      {/* 📸 RETRO SLR CAMERA VIEWFINDER HUD OVERLAY */}
      {!heldPhoto && hasDismissedStart && isPointerLocked && !isCleared && !isTransitioning && (
        <div className="absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-7 select-none">
          {/* Glass Viewfinder Corner Brackets */}
          <div className="absolute inset-0 border-[3px] border-slate-950/60 m-12 rounded-2xl flex flex-col justify-between p-4 pointer-events-none">
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[#00ffcc]/80 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[#00ffcc]/80 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[#00ffcc]/80 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[#00ffcc]/80 rounded-br-xl" />
          </div>

          {/* SLR Camera Top Bar Indicators */}
          <div className="w-full flex justify-between items-center bg-slate-950/85 border border-slate-800/80 px-4 py-2.5 rounded-xl backdrop-blur-md self-start pointer-events-auto shadow-lg">
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-red-500 animate-pulse">
                <span className="w-2.5 h-2.5 bg-red-600 rounded-full" />
                <span className="font-bold tracking-wider text-[11px]">REC [SLR]</span>
              </div>
              <div className="text-slate-400">
                AF-SYS: <span className="text-[#00ffcc] font-bold">LASER_AUTO</span>
              </div>
              <div className="text-slate-400">
                EXPOSURE: <span className="text-white">1/250s at f/4.0</span>
              </div>
              <div className="text-slate-400">
                ISO: <span className="text-amber-400">400</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded flex items-center gap-1.5 text-slate-300">
                <span className="text-slate-500">DIST TO TOY:</span>
                <span className={targetDetectionState !== 'NOT_IN_RANGE' ? 'text-emerald-400 font-bold' : 'text-slate-400 font-bold'}>
                  {targetDistance > 0 ? `${targetDistance.toFixed(1)}m` : '---'}
                </span>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                <span>FILM:</span>
                <span className="text-[#00ffcc] font-bold">1 / 1 EXPOSURE</span>
              </div>
            </div>
          </div>

          {/* Center focusing ring and target acquisition overlay */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center">
            <div className={`w-40 h-40 border-2 border-dashed rounded-full flex items-center justify-center transition-all duration-300 ${
              targetDetectionState === 'TARGET_LOCKED' 
                ? 'border-emerald-400 bg-emerald-500/10 scale-105' 
                : targetDetectionState === 'IN_RANGE_NOT_LOOKING' 
                  ? 'border-amber-400 bg-amber-500/5 animate-pulse'
                  : 'border-slate-500/30'
            }`}>
              <div className={`w-16 h-16 border rounded-full flex items-center justify-center transition-all ${
                targetDetectionState === 'TARGET_LOCKED' ? 'border-emerald-400 scale-95 border-2' : 'border-slate-500/20'
              }`}>
                <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                  targetDetectionState === 'TARGET_LOCKED' ? 'bg-[#00ffcc] scale-110 shadow-[0_0_10px_#00ffcc]' : 'bg-slate-700/50'
                }`} />
              </div>
            </div>

            {/* Target Status Floating Card */}
            <div className="mt-14 transition-all duration-300 ease-out select-none">
              {targetDetectionState === 'TARGET_LOCKED' && (
                <div className="bg-emerald-950/95 border-2 border-emerald-400 text-emerald-300 px-5 py-3 rounded-2xl shadow-[0_0_35px_rgba(52,211,153,0.35)] flex flex-col items-center gap-1.5 flex flex-col items-center max-w-sm text-center border-solid pointer-events-auto">
                  <div className="flex items-center gap-2">
                    <Camera className="w-5 h-5 text-[#00ffcc] animate-pulse" />
                    <span className="text-xs font-black tracking-widest font-mono text-[#00ffcc]">📸 TARGET LOCK ACQUIRED</span>
                  </div>
                  <p className="text-[11px] text-emerald-200 leading-relaxed font-sans">
                    책상 위의 모형을 겨냥했습니다!<br />
                    <strong className="text-white">[마우스 왼쪽 클릭]</strong> 또는 <kbd className="px-1 py-0.2 bg-slate-900 rounded text-[#00ffcc] font-bold font-mono">C</kbd> / <kbd className="px-1 py-0.2 bg-slate-900 rounded text-[#00ffcc] font-bold font-mono">F</kbd> 키를 눌러<br />
                    <span className="text-[#00ffcc] font-semibold">폴라로이드 사진(교각/경사로)</span>을 촬영하십시오!
                  </p>
                </div>
              )}

              {targetDetectionState === 'IN_RANGE_NOT_LOOKING' && (
                <div className="bg-amber-950/90 border border-amber-400 text-amber-300 px-4 py-2.5 rounded-xl shadow-lg flex flex-col items-center gap-1 max-w-sm text-center pointer-events-auto">
                  <span className="text-xs font-bold tracking-widest font-mono text-amber-300">⚠️ TARGET OUT OF FOCUS</span>
                  <p className="text-[11px] text-amber-200">
                    책상에 충분히 다가갔습니다! 책상 위에 홀로그램 화살표가 가리키는<br />
                    <strong className="text-white font-mono">미니어처 물리 모형</strong>을 향해 화면 정중앙 크로스헤어를 맞추십시오.
                  </p>
                </div>
              )}

              {targetDetectionState === 'NOT_IN_RANGE' && (() => {
                const isS1BridgePlaced = sceneRef.current?.getObjectByName('placed_bridge_group') !== undefined;
                const isS2RampPlaced = sceneRef.current?.getObjectByName('placed_corridor_ramp') !== undefined;

                if (stage === StageId.STAGE_1) {
                  if (hasPickedPhoto) {
                    if (isS1BridgePlaced) {
                      return (
                        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-300 px-4 py-2.5 rounded-xl shadow-lg flex flex-col items-center gap-1.5 max-w-sm text-center pointer-events-auto animate-pulse">
                          <span className="text-xs font-bold font-mono text-emerald-400 tracking-wider">🌉 BRIDGE DEPLOYED SUCCESS</span>
                          <p className="text-[11px] text-emerald-200 leading-normal">
                            다리가 낭떠러지에 무사히 건설되었습니다!<br />
                            낭떠러지 임시 다리를 건너 건너편 <strong className="text-cyan-300">모니터 장치</strong>가 위치한 목표 지점으로 안전하게 이동하십시오.
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-blue-950/95 border border-cyan-500 text-cyan-200 px-5 py-3 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.3)] flex flex-col items-center gap-1.5 max-w-xs text-center border-solid pointer-events-auto">
                          <span className="text-xs font-bold font-mono text-cyan-400 tracking-wider">📂 SNAPSHOT IN BACKPACK</span>
                          <p className="text-[11px] text-cyan-200 leading-relaxed">
                            사진이 성공적으로 촬영되었습니다!<br />
                            하단 가방에서 <strong className="text-[#00ffcc]">다리 사진 슬롯</strong>을 클릭하여 장착한 뒤, 낭떠러지를 응시하며 <strong className="text-amber-300">[마우스 우클릭]</strong> 또는 <strong className="text-amber-400">[J] 키</strong>를 눌러 실제로 맵에 투영/배치하십시오.
                          </p>
                        </div>
                      );
                    }
                  } else {
                    return (
                      <div className="bg-slate-950/90 border border-slate-800 text-slate-300 px-4 py-2.5 rounded-xl shadow-lg flex flex-col items-center gap-1 max-w-xs text-center pointer-events-auto">
                        <span className="text-xs font-bold font-mono text-slate-400 tracking-wider">📷 CAMERA SYSTEM ARMED</span>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          왼쪽에 위치한 <strong className="text-amber-400">나무 실험대 책상(Desk)</strong>으로 좀 더 가까이 다가가십시오.
                        </p>
                      </div>
                    );
                  }
                } else {
                  // STAGE 2
                  const hasS2Photo = inventory.some(item => item.assetType === 'ramp_corridor');
                  if (hasS2Photo) {
                    if (isS2RampPlaced) {
                      return (
                        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-300 px-4 py-2.5 rounded-xl shadow-lg flex flex-col items-center gap-1.5 max-w-sm text-center pointer-events-auto animate-pulse">
                          <span className="text-xs font-bold font-mono text-emerald-400 tracking-wider">🚀 RAMP DEPLOYED SUCCESS</span>
                          <p className="text-[11px] text-emerald-200 leading-normal">
                            경사로 터널 통로가 벽면에 무사히 병합되었습니다!<br />
                            새로 뚫린 터널 경사로를 타고 위로 올라가 <strong className="text-[#00ffcc] font-bold">초록색 차원 관문(Portal)</strong>으로 가십시오!
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-blue-950/95 border border-cyan-500 text-cyan-200 px-5 py-3 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.3)] flex flex-col items-center gap-1.5 max-w-xs text-center border-solid pointer-events-auto">
                          <span className="text-xs font-bold font-mono text-cyan-400 tracking-wider">📂 SNAPSHOT IN BACKPACK</span>
                          <p className="text-[11px] text-cyan-200 leading-relaxed">
                            사진이 성공적으로 촬영되었습니다!<br />
                            하단 가방에서 <strong className="text-[#00ffcc]">경사로 사진</strong>을 클릭 장착하고, 중앙의 거대한 회색 콘크리트 벽면을 조각하여 터널을 뚫도록 <strong className="text-amber-300">[마우스 우클릭]</strong> 또는 <strong className="text-amber-400">[J] 키</strong>를 누르십시오.
                          </p>
                        </div>
                      );
                    }
                  } else {
                    return (
                      <div className="bg-slate-950/90 border border-slate-800 text-slate-300 px-4 py-2.5 rounded-xl shadow-lg flex flex-col items-center gap-1 max-w-xs text-center pointer-events-auto">
                        <span className="text-xs font-bold font-mono text-slate-400 tracking-wider">📷 CAMERA SYSTEM ARMED</span>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          왼쪽에 위치한 <strong className="text-amber-400">나무 실험대 책상(Desk)</strong>으로 좀 더 가까이 다가가십시오.
                        </p>
                      </div>
                    );
                  }
                }
              })()}
            </div>
          </div>

          {/* SLR Camera Bottom Status Bar */}
          <div className="w-full flex justify-between items-center bg-slate-950/85 border border-slate-800/80 px-4 py-2 rounded-xl backdrop-blur-md self-end pointer-events-auto shadow-lg">
            <span className="text-[10px] text-slate-400 font-mono">
              RETRO VIEW SYSTEM: <span className="text-emerald-400 font-semibold animate-pulse">LOCK_READY_OK</span>
            </span>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
              <div className="flex items-center gap-1">
                <span className="text-slate-500">BATT:</span>
                <span className="text-emerald-400 font-bold">100% [||||]</span>
              </div>
              <span className="text-slate-700">|</span>
              <span>SDCARD: AF-ACTIVE [RAW_MODE]</span>
            </div>
          </div>
        </div>
      )}

      {/* TOP HEADER STATUS & QUICK PANEL */}
      <header className="absolute top-0 inset-x-0 p-4 pointer-events-none flex items-start justify-between z-20">
        {/* Left Side: Game Status & Retro Cyber Logs */}
        <div className="p-3 bg-slate-950/80 backdrop-blur border border-slate-800 rounded-lg flex items-center gap-3">
          <Gamepad className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div>
            <h1 className="text-sm font-semibold tracking-wider uppercase text-emerald-400">
              Web Viewfinder
            </h1>
            <p className="text-[11px] text-slate-400 font-mono">
              {sysStatus}
            </p>
          </div>
        </div>

        {/* Center: Stage Indicator */}
        <div className="p-2.5 bg-slate-950/80 backdrop-blur border border-slate-800 rounded-full flex items-center gap-3 pointer-events-auto">
          <button 
            onClick={() => {
              beepChannel(310, 'triangle', 0.1);
              setStage(StageId.STAGE_1);
              setHeldPhoto(null);
              setInventory([]);
            }}
            className={`px-3.5 py-1 text-xs font-mono rounded-full font-bold transition-all ${
              stage === StageId.STAGE_1 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            STAGE 1: 낭떠러지
          </button>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
          <button 
            onClick={() => {
              beepChannel(350, 'triangle', 0.1);
              setStage(StageId.STAGE_2);
              setHeldPhoto(null);
              setInventory([]);
            }}
            className={`px-3.5 py-1 text-xs font-mono rounded-full font-bold transition-all ${
              stage === StageId.STAGE_2 
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            STAGE 2: 이중 장애물
          </button>
        </div>

        {/* Right Side: Tools / Audios Toggle */}
        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={() => {
              setSoundsEnabled(!soundsEnabled);
              beepChannel(550, 'sine', 0.05);
            }}
            className="p-2.5 bg-slate-950/80 dark:hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-all shadow-md"
            title="소리 설정"
          >
            {soundsEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
          
          <button 
            onClick={restartCurrentState}
            className="p-2.5 bg-slate-950/80 dark:hover:bg-slate-900 border border-slate-800 rounded-lg text-slate-300 hover:text-white transition-all shadow-md flex items-center gap-2 text-xs font-mono"
            title="레벨 초기화"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">RESET [R]</span>
          </button>
        </div>
      </header>

      {/* CONTROLS HUD (MINIMAL) */}
      {hasDismissedStart && !isCleared && !isTransitioning && (
        <section className="absolute bottom-6 left-6 pointer-events-none z-20">
          <div className="bg-slate-950/40 backdrop-blur-sm border border-slate-800/30 rounded-xl p-3 shadow-lg flex flex-col gap-1.5">
            <div className="flex gap-4 text-[10px] font-mono text-slate-300">
              <div className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold bg-slate-900/50 px-1 rounded">WASD</span> 이동</div>
              <div className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold bg-slate-900/50 px-1 rounded">SPACE</span> 점프</div>
              <div className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold bg-slate-900/50 px-1 rounded">L-CLICK</span> 촬영</div>
            </div>
            <div className="flex gap-4 text-[10px] font-mono text-slate-300">
              <div className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold bg-slate-900/50 px-1 rounded">R-CLICK</span> 배치</div>
              <div className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold bg-slate-900/50 px-1 rounded">Q/E</span> 회전</div>
              <div className="flex items-center gap-1.5"><span className="text-emerald-400 font-bold bg-slate-900/50 px-1 rounded">ESC</span> 마우스 해제</div>
            </div>
          </div>
        </section>
      )}

      {/* POLAROID STENCIL OVERLAY LAYER WHEN HOLDING PHOTO */}
      {heldPhoto && hasDismissedStart && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 animate-scale-in">
          <div 
            className="w-[300px] h-[340px] bg-white border-[10px] border-white shadow-[0_0_50px_rgba(0,0,0,0.85)] flex flex-col justify-between transition-transform duration-75 relative rounded-sm"
            style={{ transform: `rotate(${heldRotation}deg)` }}
          >
            <div className="w-full h-[240px] bg-slate-950/20 border-4 border-dashed border-emerald-400/40 relative flex items-center justify-center overflow-hidden bg-black">
              {heldPhoto.thumbnailUrl ? (
                <img src={heldPhoto.thumbnailUrl} alt="Snapshot" className="w-full h-full object-cover" />
              ) : (
                <>
                  {heldPhoto.assetType === 'bridge' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-teal-950/30 p-2 animate-fade-in text-emerald-400/80">
                      <svg className="w-36 h-24 text-emerald-400/85 drop-shadow-[0_0_12px_rgba(52,211,153,0.7)]" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 32 H95 M5 37 H95" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        <path d="M10 18 V32 M30 18 V32 M50 18 V32 M70 18 V32 M90 18 V32" stroke="currentColor" strokeWidth="1" />
                        <path d="M5 18 H95 M5 12 Q50 32 95 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M30 12 V22 M50 12 V32 M70 12 V22" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1,1" />
                        <line x1="20" y1="32" x2="20" y2="37" stroke="currentColor" strokeWidth="1" />
                        <line x1="40" y1="32" x2="40" y2="37" stroke="currentColor" strokeWidth="1" />
                        <line x1="60" y1="32" x2="60" y2="37" stroke="currentColor" strokeWidth="1" />
                        <line x1="80" y1="32" x2="80" y2="37" stroke="currentColor" strokeWidth="1" />
                      </svg>
                      <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-400 mt-1 uppercase">PROCEDURAL BRIDGE</span>
                    </div>
                  )}

                  {heldPhoto.assetType === 'ramp_corridor' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-cyan-950/30 p-2 animate-fade-in text-cyan-400/80">
                      <svg className="w-32 h-24 text-cyan-400/85 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]" viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M15 42 L45 27 H55 L85 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M10 45 L40 30 H60 L90 15" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
                        <path d="M10 20 L40 5 H60 L90 -10" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
                        <line x1="25" y1="34" x2="35" y2="34" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="63" y1="18" x2="73" y2="18" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                      <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-400 mt-1 uppercase">RAMP STAIRWELL CSG</span>
                    </div>
                  )}
                </>
              )}

              <div className="absolute top-1 left-2.5 text-[7px] font-mono text-emerald-400/80">VIEWFINDER PROJ ACTIVE</div>
              <div className="absolute bottom-1 right-2.5 text-[7px] font-mono text-emerald-400/80">FOCAL DEPTH: 9.0m</div>
              <div className="absolute w-12 h-12 border border-emerald-400/20 rounded-full border-t-emerald-400/60 animate-spin pointer-events-none" />
            </div>

            <div className="p-2 flex flex-col items-center justify-center leading-none">
              <span className="text-slate-950 font-mono text-xs font-bold tracking-tight">
                {heldPhoto.name}
              </span>
              <span className="text-[10px] text-slate-500 font-mono mt-1">
                {stage === StageId.STAGE_1 ? 'ALIGN GAPS AND CLICK TO SPAWN' : 'ROTATE: [Q/E] or [SCROLL]'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* COMPARED HUD PROMPTS FOR RETRO INTERACTIONS */}
      {isNearMonitor && !isTransitioning && isPointerLocked && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-slate-950/90 border border-cyan-400 p-4 rounded-xl text-center shadow-2xl z-20 pointer-events-none animate-bounce">
          <div className="flex items-center justify-center gap-2.5 text-cyan-400 font-bold font-mono text-sm uppercase">
            <Tv className="w-5 h-5 text-cyan-400 animate-pulse" />
            MONITOR OVERLAY IN RANGE!
          </div>
          <p className="text-slate-300 text-xs mt-1">
            모니터를 정면으로 바라보고 <strong className="text-cyan-300 font-bold">[마우스 클릭]</strong> 하여 Stage 2로 <strong className="text-cyan-300">다이브(Zoom Transition)</strong> 하세요!
          </p>
        </div>
      )}

      {/* RESUME POINTER LOCK FALLBACK BADGE OVERLAY */}
      {hasDismissedStart && !isPointerLocked && !isCleared && (
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-30 pointer-events-auto">
          <div className="bg-slate-900/90 border border-emerald-500/50 p-6 rounded-xl text-center shadow-2xl max-w-sm animate-scale-in flex flex-col items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-400/30 rounded-full flex items-center justify-center animate-pulse">
              <Compass className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">CAMERA CONTROL PAUSED</h3>
              <p className="text-slate-300 text-xs leading-relaxed">
                현재 화면 시점이 잠금 해제되었습니다.<br />아래 버튼 또는 뷰포트를 클릭하여 마우스 카메라 제어를 다시 시작하세요.
              </p>
            </div>
            <button 
              onClick={() => canvasRef.current?.requestPointerLock()}
              className="mt-2 w-full py-2.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/50 rounded-lg text-emerald-300 font-mono text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              PLAY RESUME
            </button>
          </div>
        </div>
      )}

      {/* PERSISTENT FOOTER INVENTORY BAR */}
      {hasDismissedStart && !isCleared && !isTransitioning && (
        <section 
          className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-2 z-20"
          id="inventory_bar"
        >
          <div className="px-3 py-1 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-full text-[10px] font-bold font-mono tracking-widest text-[#00ffcc] uppercase shadow-lg flex items-center gap-1.5 leading-none">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Polaroid Snapshots Bag
          </div>

          <div className="flex items-center gap-3.5 p-3 pb-3.5 px-4 bg-slate-950/60 backdrop-blur-lg border border-slate-800/50 rounded-2xl shadow-2xl relative">
            {inventory.length === 0 ? (
              <div className="w-[85px] h-[105px] border-2 border-dashed border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-slate-500 font-mono text-[9px] text-center p-1 uppercase">
                <Compass className="w-4 h-4 mb-1.5 text-slate-600 animate-pulse" />
                Empty Bag
              </div>
            ) : (
              inventory.map((item, idx) => {
                const isActive = heldPhoto?.id === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleEquipPhoto(item)}
                    className={`group relative w-[86px] h-[106px] bg-[#f8f9fa] flex flex-col justify-between items-center p-1.5 pb-2.5 outline-none cursor-pointer transition-all duration-200 ${
                      isActive 
                        ? 'shadow-[0_0_20px_rgba(52,211,153,0.5)] z-10 scale-[1.15] -translate-y-3 ring-2 ring-emerald-400 border border-white' 
                        : 'shadow-[0_8px_16px_rgba(0,0,0,0.6)] hover:scale-105 hover:-translate-y-1 z-0 grayscale-[20%] border border-slate-300'
                    } ${!isActive && idx % 2 === 0 ? 'rotate-[-3deg]' : ''} ${!isActive && idx % 2 !== 0 ? 'rotate-[2deg]' : ''}`}
                  >
                    <span className={`absolute top-0.5 right-0.5 text-[8px] font-mono font-bold px-1.5 py-0.5 z-10 ${
                      isActive ? 'text-emerald-500' : 'text-slate-400'
                    }`}>
                      [{idx + 1}]
                    </span>

                    <div className="w-full h-[66px] bg-slate-900 border border-slate-300 relative flex items-center justify-center overflow-hidden">
                      <div className="absolute inset-0 bg-emerald-500/5 mix-blend-overlay z-10 pointer-events-none"></div>
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt="Snapshot" />
                      ) : (
                        <div className="scale-75">
                          {item.assetType === 'bridge' ? (
                            <svg className={`w-12 h-10 ${isActive ? 'text-emerald-400' : 'text-emerald-400/80 group-hover:text-emerald-400'}`} viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 32 H95 M5 37 H95" stroke="currentColor" strokeWidth="3" />
                              <path d="M10 18 V32 M50 18 V32 M90 18 V32" stroke="currentColor" strokeWidth="2" />
                              <path d="M5 18 H95 M5 12 Q50 32 95 12" stroke="currentColor" strokeWidth="2" />
                            </svg>
                          ) : (
                            <svg className={`w-12 h-10 ${isActive ? 'text-cyan-400' : 'text-cyan-400/80 group-hover:text-cyan-400'}`} viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M15 42 L45 27 H55 L85 10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                              <path d="M10 45 L40 30 H60 L90 15" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="w-full text-center mt-1">
                      <div className={`font-mono text-[8.5px] font-bold truncate max-w-full tracking-tighter ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                        {item.assetType === 'bridge' ? 'BRIDGE CSG' : 'RAMP CSG'}
                      </div>
                      <span className={`text-[6.5px] font-mono font-bold leading-none uppercase ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {isActive ? 'EQUIPPED' : 'READY'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* START INSTRUCTIONS / POINTER LOCK HUB PRE-OVERLAY */}
      {!hasDismissedStart && !isCleared && (
        <section className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center z-40 p-6">
          <div className="max-w-xl w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl text-center space-y-6 animate-scale-in">
            <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 rounded-2xl flex items-center justify-center">
              <Gamepad className="w-8 h-8 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Web Viewfinder
              </h2>
              <p className="text-slate-400 text-sm">
                2D 사진을 현실 세계에 투사하여 기하학적 형태를 창조하고 잘라내는(CSG) 실시간 3D 공간 퍼즐 게임 데모
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 border border-slate-800 rounded-xl text-left space-y-3.5 text-xs text-slate-300">
              <h3 className="font-bold text-slate-400 font-mono tracking-wider text-center uppercase flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                HOW TO PLAY & DEMO STEPS:
              </h3>
              <ul className="space-y-2 list-disc list-inside">
                <li>
                  <strong className="text-white">STAGE 1</strong>: 앞으로 걸어가 거치된 <strong className="text-emerald-400">교각 사진(Bridge Card)</strong>에 접근하여 획득한 뒤, 낭떠러지 맞은편을 조준하며 <strong className="text-emerald-400">마우스 클릭</strong>하여 3D 구조물 다리를 설치해 이동하십시오!
                </li>
                <li>
                  <strong className="text-white">STAGE 2</strong>: 막힌 거대 콘크리트 벽을 조준해 사진을 투사하면 <strong className="text-emerald-400">벽이 잘려나갑니다(CSG Slicing)</strong>. 그 후, 높은 출구 통로를 타기 위해 <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-200">Q / E</kbd> 키나 <strong className="text-emerald-400">마우스 휠</strong>로 복도를 <strong className="text-emerald-400">경사로로 45도 회전</strong>하여 높은 벽에 쏘아 경사길을 올라가세요!
                </li>
                <li>
                  <strong className="text-emerald-400">포탈 다이브 전환</strong>: 스테이지 1 끝자리에 놓인 컴퓨터 터미널 모니터는 클릭 인터랙션 시 자연스럽게 스테이지 2 씬으로 전환(Zoom-in) 시켜줍니다.
                </li>
              </ul>
            </div>

            <button 
              onClick={() => {
                beepChannel(440, 'triangle', 0.1);
                setHasDismissedStart(true);
                setTimeout(() => {
                  canvasRef.current?.requestPointerLock();
                }, 50);
              }}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 font-semibold text-slate-950 rounded-xl shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
            >
              시작하기 (Click to enter Viewport)
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-[10px] text-slate-500 font-mono border-t border-slate-800/80 pt-4">
              Vite, ThreeJS, Rapier WASM Physics & three-bvh-csg • v1.2 Operational
            </p>
          </div>
        </section>
      )}

      {/* GAME CLEARED / WIN POPUP SUMMARY */}
      {isCleared && (
        <section className="absolute inset-0 bg-slate-950/95 flex items-center justify-center z-50 p-6">
          <div className="max-w-md w-full bg-slate-900 border border-emerald-400/40 p-8 rounded-2xl shadow-xl text-center space-y-6 animate-scale-in">
            <div className="mx-auto w-16 h-16 bg-emerald-500/20 border border-emerald-400 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight text-white uppercase">
                Challenge Complete!
              </h2>
              <p className="text-slate-400 text-xs">
                사진 속에 갇혀 있던 가상의 3D 공간을 실제 현실 물리 월드로 환원하였습니다.
              </p>
            </div>

            <div className="bg-slate-950/80 p-4 border border-slate-800 rounded-lg text-left text-xs text-slate-300 space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">STAGE 1 COMPLETED</span>
                <span className="text-emerald-400 font-bold">YES</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">STAGE 2 COMPLETED</span>
                <span className="text-emerald-400 font-bold">YES</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">CSG SLICING ACTIONS</span>
                <span className="text-emerald-400 font-bold">OPERATIONAL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PORTAL MONITOR DOCK</span>
                <span className="text-emerald-400 font-bold">SUCCESS</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button 
                onClick={() => {
                  beepChannel(440, 'triangle', 0.1);
                  setStage(StageId.STAGE_1);
                  setHeldPhoto(null);
                  setInventory([]);
                  setIsCleared(false);
                  setTimeout(() => canvasRef.current?.requestPointerLock(), 100);
                }}
                className="w-full py-3 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl hover:bg-slate-750 transition-all text-xs font-mono flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" />
                REPLAY PROTOSTAGE
              </button>
            </div>
          </div>
        </section>
      )}

      {/* PORTAL TRANSITION CINEMATIC SCREEN COVER */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-black/40 pointer-events-none flex items-center justify-center z-30 transition-opacity duration-300">
          <div className="text-center space-y-3">
            <Tv className="w-16 h-16 mx-auto text-[#00ffcc] animate-pulse" />
            <div className="text-xs font-mono text-[#00ffcc] tracking-[0.25em] animate-pulse">
              DIVE PORTAL LINKING: STAGE 2
            </div>
            <div className="w-64 h-1 bg-slate-900 rounded mx-auto overflow-hidden">
              <div className="h-full bg-[#00ffcc] w-2/3 animate-[loading_1s_infinite] rounded" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
