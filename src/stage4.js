import * as THREE from 'three';

export function loadStage4(scene, physicsWorld, RAPIER, environmentObjects) {
  const offsetY = -400;
  const startPos = new THREE.Vector3(0, 2 + offsetY, 5);
  const monitorBasePos = new THREE.Vector3(0, 0 + offsetY, 93);
  const portal1Pos = new THREE.Vector3(monitorBasePos.x, monitorBasePos.y + 1.8, monitorBasePos.z);

  const interactables = buildStage4Map(scene, physicsWorld, RAPIER, environmentObjects, offsetY);
  buildMonitorConsole(scene, physicsWorld, RAPIER, monitorBasePos, environmentObjects);
  addLights(scene, environmentObjects, offsetY);

  const trompe = createTrompeLOeilCube(scene, physicsWorld, RAPIER, environmentObjects, offsetY);

  let tutorialTrompe = document.getElementById('tutorial-trompe');
  if (!tutorialTrompe) {
    tutorialTrompe = document.createElement('div');
    tutorialTrompe.id = 'tutorial-trompe';
    Object.assign(tutorialTrompe.style, {
      position: 'fixed', top: '20%', left: '50%',
      transform: 'translate(-50%, -50%)',
      color: '#00ffcc', fontFamily: 'monospace', fontSize: '24px',
      textShadow: '2px 2px 4px #000',
      zIndex: '100', pointerEvents: 'none', display: 'none',
      textAlign: 'center'
    });
    document.body.appendChild(tutorialTrompe);
  }

  let alignBar = document.getElementById('align-bar');
  if (!alignBar) {
    alignBar = document.createElement('div');
    alignBar.id = 'align-bar';
    Object.assign(alignBar.style, {
      position: 'fixed', bottom: '15%', left: '50%',
      transform: 'translateX(-50%)',
      width: '200px', height: '6px',
      backgroundColor: '#ffdab9',
      borderRadius: '3px',
      zIndex: '100', pointerEvents: 'none', display: 'none',
      overflow: 'hidden'
    });
    const fill = document.createElement('div');
    fill.id = 'align-bar-fill';
    Object.assign(fill.style, {
      width: '0%', height: '100%',
      backgroundColor: '#00ffcc',
      borderRadius: '3px',
      transition: 'width 0.1s'
    });
    alignBar.appendChild(fill);
    document.body.appendChild(alignBar);
  }
  const alignBarFill = document.getElementById('align-bar-fill');

  const photoItemMesh = addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [0.1, 0.1, 0.1],
    position: [0, -10 + offsetY, 0],
    color: 0x000000,
    type: 'prop'
  });
  photoItemMesh.visible = false;

  const { button1Mesh, button2Mesh, doorMesh, doorBody } = interactables;
  const button1WorldPos = new THREE.Vector3(-6, 0 + offsetY, 78);
  const button2WorldPos = new THREE.Vector3(6, 0 + offsetY, 78);
  const BUTTON_RADIUS = 1.5;

  const stageData = {
    startPos,
    portal1Pos,
    photoItemMesh,
    _camera: null
  };

  stageData.update = (delta, playerPos, pickableObjects) => {
    if (!stageData._camera) return;
    const cam = stageData._camera;

    const newCube = trompe.consumeMaterialized();
    if (newCube) {
      pickableObjects.push(newCube);
    }

    trompe.update(delta, cam.position, cam.quaternion);

    if (trompe.alignment > 0.05 && !trompe.isMaterialized) {
      alignBar.style.display = 'block';
      alignBarFill.style.width = `${trompe.alignment * 100}%`;
      alignBarFill.style.backgroundColor = trompe.alignment >= 0.7 ? '#00ff88' : '#00ffcc';
    } else {
      alignBar.style.display = 'none';
    }

    if (trompe.alignment > 0.5 && !trompe.isMaterialized) {
      tutorialTrompe.style.display = 'block';
      tutorialTrompe.textContent = trompe.alignment >= 0.7
        ? '클릭하여 환영을 실체화하세요!'
        : '올바른 위치에서 바라보세요...';
    } else {
      tutorialTrompe.style.display = 'none';
    }

    let btn1Pressed = false;
    let btn2Pressed = false;

    const dxP1 = playerPos.x - button1WorldPos.x;
    const dzP1 = playerPos.z - button1WorldPos.z;
    if (Math.sqrt(dxP1 * dxP1 + dzP1 * dzP1) < BUTTON_RADIUS &&
        Math.abs(playerPos.y - button1WorldPos.y) < 3) {
      btn1Pressed = true;
    }
    const dxP2 = playerPos.x - button2WorldPos.x;
    const dzP2 = playerPos.z - button2WorldPos.z;
    if (Math.sqrt(dxP2 * dxP2 + dzP2 * dzP2) < BUTTON_RADIUS &&
        Math.abs(playerPos.y - button2WorldPos.y) < 3) {
      btn2Pressed = true;
    }

    for (const obj of pickableObjects) {
      const dx1 = obj.position.x - button1WorldPos.x;
      const dz1 = obj.position.z - button1WorldPos.z;
      if (Math.sqrt(dx1 * dx1 + dz1 * dz1) < BUTTON_RADIUS &&
          Math.abs(obj.position.y - button1WorldPos.y) < 2) {
        btn1Pressed = true;
      }
      const dx2 = obj.position.x - button2WorldPos.x;
      const dz2 = obj.position.z - button2WorldPos.z;
      if (Math.sqrt(dx2 * dx2 + dz2 * dz2) < BUTTON_RADIUS &&
          Math.abs(obj.position.y - button2WorldPos.y) < 2) {
        btn2Pressed = true;
      }
    }

    button1Mesh.position.y = THREE.MathUtils.lerp(
      button1Mesh.position.y,
      btn1Pressed ? (0.05 + offsetY) : (0.2 + offsetY),
      10 * delta
    );
    button2Mesh.position.y = THREE.MathUtils.lerp(
      button2Mesh.position.y,
      btn2Pressed ? (0.05 + offsetY) : (0.2 + offsetY),
      10 * delta
    );

    const targetDoorY = (btn1Pressed && btn2Pressed) ? (12 + offsetY) : (4 + offsetY);
    doorMesh.position.y = THREE.MathUtils.lerp(doorMesh.position.y, targetDoorY, 5 * delta);
    doorBody.setNextKinematicTranslation({ x: 0, y: doorMesh.position.y, z: 85 });
  };

  stageData.onClick = () => {
    return trompe.tryMaterialize();
  };

  stageData.cleanup = () => {
    trompe.cleanup();
    if (tutorialTrompe) tutorialTrompe.style.display = 'none';
    if (alignBar) alignBar.style.display = 'none';
  };

  return stageData;
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

function buildStage4Map(scene, physicsWorld, RAPIER, environmentObjects, offsetY) {
  // ===== Room 1: Starting room (30 wide, Z: 0~26, height 15) =====
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [30, 1, 26], position: [0, -0.5 + offsetY, 13]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [30, 15, 1], position: [0, 7.5 + offsetY, -0.5]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [1, 15, 26], position: [-15.5, 7.5 + offsetY, 13]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [1, 15, 26], position: [15.5, 7.5 + offsetY, 13]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [13, 15, 1], position: [-8.5, 7.5 + offsetY, 26]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [13, 15, 1], position: [8.5, 7.5 + offsetY, 26]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [4, 7, 1], position: [0, 11.5 + offsetY, 26], type: 'ceiling'
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [30, 1, 26], position: [0, 15.5 + offsetY, 13], type: 'ceiling'
  });

  // ===== Tunnel (width 4, Z: 26~54) =====
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [4, 1, 28], position: [0, -0.5 + offsetY, 40]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [1, 15, 28], position: [-2.5, 7.5 + offsetY, 40]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [1, 15, 28], position: [2.5, 7.5 + offsetY, 40]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [4, 1, 28], position: [0, 15.5 + offsetY, 40], type: 'ceiling'
  });

  // ===== Room 2: Puzzle room (30 wide, Z: 54~96, height 15) =====
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [30, 1, 42], position: [0, -0.5 + offsetY, 75]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [1, 15, 42], position: [-15.5, 7.5 + offsetY, 75]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [1, 15, 42], position: [15.5, 7.5 + offsetY, 75]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [30, 15, 1], position: [0, 7.5 + offsetY, 96.5]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [13, 15, 1], position: [-8.5, 7.5 + offsetY, 54]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [13, 15, 1], position: [8.5, 7.5 + offsetY, 54]
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [4, 7, 1], position: [0, 11.5 + offsetY, 54], type: 'ceiling'
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [30, 1, 42], position: [0, 15.5 + offsetY, 75], type: 'ceiling'
  });

  // ===== Button 1 (left, X=-6, Z=78) =====
  const border1Geo = new THREE.TorusGeometry(1.1, 0.15, 16, 32);
  const border1Mat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
  const border1Mesh = new THREE.Mesh(border1Geo, border1Mat);
  border1Mesh.rotation.x = Math.PI / 2;
  border1Mesh.position.set(-6, 0.15 + offsetY, 78);
  border1Mesh.castShadow = true;
  border1Mesh.receiveShadow = true;
  scene.add(border1Mesh);
  environmentObjects.push(border1Mesh);

  const btn1Geo = new THREE.CylinderGeometry(0.9, 0.9, 0.26, 32);
  const btn1Mat = new THREE.MeshStandardMaterial({ color: 0x0066ff, roughness: 0.2, metalness: 0.8 });
  const button1Mesh = new THREE.Mesh(btn1Geo, btn1Mat);
  button1Mesh.position.set(-6, 0.2 + offsetY, 78);
  button1Mesh.castShadow = true;
  button1Mesh.receiveShadow = true;
  scene.add(button1Mesh);
  environmentObjects.push(button1Mesh);

  // ===== Button 2 (right, X=6, Z=78) =====
  const border2Geo = new THREE.TorusGeometry(1.1, 0.15, 16, 32);
  const border2Mat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.8, roughness: 0.2 });
  const border2Mesh = new THREE.Mesh(border2Geo, border2Mat);
  border2Mesh.rotation.x = Math.PI / 2;
  border2Mesh.position.set(6, 0.15 + offsetY, 78);
  border2Mesh.castShadow = true;
  border2Mesh.receiveShadow = true;
  scene.add(border2Mesh);
  environmentObjects.push(border2Mesh);

  const btn2Geo = new THREE.CylinderGeometry(0.9, 0.9, 0.26, 32);
  const btn2Mat = new THREE.MeshStandardMaterial({ color: 0x0066ff, roughness: 0.2, metalness: 0.8 });
  const button2Mesh = new THREE.Mesh(btn2Geo, btn2Mat);
  button2Mesh.position.set(6, 0.2 + offsetY, 78);
  button2Mesh.castShadow = true;
  button2Mesh.receiveShadow = true;
  scene.add(button2Mesh);
  environmentObjects.push(button2Mesh);

  // ===== Door (Z=85, full room width) =====
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [30, 7, 1], position: [0, 11.5 + offsetY, 84], type: 'ceiling'
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [30, 7, 1], position: [0, 11.5 + offsetY, 86], type: 'ceiling'
  });

  const doorSize = [30, 8, 1];
  const doorGeo = new THREE.BoxGeometry(...doorSize);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x00ccff, transparent: true, opacity: 0.7 });
  const doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.position.set(0, 4 + offsetY, 85);
  scene.add(doorMesh);
  environmentObjects.push(doorMesh);

  const doorBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(0, 4 + offsetY, 85);
  const doorBody = physicsWorld.createRigidBody(doorBodyDesc);
  const doorColliderDesc = RAPIER.ColliderDesc.cuboid(doorSize[0] / 2, doorSize[1] / 2, doorSize[2] / 2);
  physicsWorld.createCollider(doorColliderDesc, doorBody);
  doorMesh.userData.rigidBody = doorBody;

  return { button1Mesh, button2Mesh, doorMesh, doorBody };
}

function createTrompeLOeilCube(scene, physicsWorld, RAPIER, environmentObjects, offsetY) {
  const CUBE_COLOR = 0xff8844;
  const CUBE_SIZE = 3;

  const virtualCenter = new THREE.Vector3(10, 2 + offsetY, 65);
  const virtualHalf = 1.5;
  const targetPos = virtualCenter.clone();

  const sweetSpotPos = new THREE.Vector3(-10, 2 + offsetY, 80);
  const sweetSpotDir = new THREE.Vector3(20, 0, -15).normalize();
  const posThreshold = 3.0;
  const angleThreshold = 0.88;

  const eye = sweetSpotPos;
  const wallX = 14.9;

  function projectToXPlane(point) {
    const t = (wallX - eye.x) / (point.x - eye.x);
    return new THREE.Vector3(
      wallX,
      eye.y + t * (point.y - eye.y),
      eye.z + t * (point.z - eye.z)
    );
  }

  const cx = virtualCenter.x, cy = virtualCenter.y, cz = virtualCenter.z;
  const h = virtualHalf;

  const sideFaceCorners = [
    new THREE.Vector3(cx - h, cy - h, cz - h),
    new THREE.Vector3(cx - h, cy + h, cz - h),
    new THREE.Vector3(cx - h, cy + h, cz + h),
    new THREE.Vector3(cx - h, cy - h, cz + h)
  ];
  const frontFaceCorners = [
    new THREE.Vector3(cx - h, cy - h, cz + h),
    new THREE.Vector3(cx - h, cy + h, cz + h),
    new THREE.Vector3(cx + h, cy + h, cz + h),
    new THREE.Vector3(cx + h, cy - h, cz + h)
  ];

  const projSide = sideFaceCorners.map(p => projectToXPlane(p)).reverse();
  const projFront = frontFaceCorners.map(p => projectToXPlane(p)).reverse();

  function createProjectedFragment(projCorners, color) {
    const center = new THREE.Vector3();
    for (const c of projCorners) center.add(c);
    center.divideScalar(4);

    const positions = new Float32Array(12);
    for (let i = 0; i < 4; i++) {
      positions[i * 3]     = projCorners[i].x - center.x;
      positions[i * 3 + 1] = projCorners[i].y - center.y;
      positions[i * 3 + 2] = projCorners[i].z - center.z;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.2,
      side: THREE.DoubleSide,
      emissive: color,
      emissiveIntensity: 0.0
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(center);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    return mesh;
  }

  const fragments = [];

  const fragSide = createProjectedFragment(projSide, CUBE_COLOR);
  scene.add(fragSide);
  environmentObjects.push(fragSide);
  fragments.push(fragSide);

  const fragFront = createProjectedFragment(projFront, 0xcc6633);
  scene.add(fragFront);
  environmentObjects.push(fragFront);
  fragments.push(fragFront);

  const markerGeo = new THREE.RingGeometry(0.8, 1.0, 32);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc, side: THREE.DoubleSide,
    transparent: true, opacity: 0.5
  });
  const floorMarker = new THREE.Mesh(markerGeo, markerMat);
  floorMarker.rotation.x = -Math.PI / 2;
  floorMarker.position.set(sweetSpotPos.x, 0.02 + offsetY, sweetSpotPos.z);
  scene.add(floorMarker);
  environmentObjects.push(floorMarker);

  let isMaterialized = false;
  let alignment = 0;
  let pendingPickup = null;

  function checkAlignment(camPos, camQuat) {
    const dist = camPos.distanceTo(sweetSpotPos);
    if (dist > posThreshold) return 0;
    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camQuat).normalize();
    const dot = lookDir.dot(sweetSpotDir);
    if (dot < angleThreshold) return 0;
    const posQ = 1 - (dist / posThreshold);
    const angleQ = (dot - angleThreshold) / (1 - angleThreshold);
    return Math.min(posQ, angleQ);
  }

  function spawnDynamicCube() {
    const geo = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const mat = new THREE.MeshStandardMaterial({
      color: CUBE_COLOR, roughness: 0.5, metalness: 0.1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(targetPos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    environmentObjects.push(mesh);

    mesh.userData.isDynamic = true;

    const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(targetPos.x, targetPos.y, targetPos.z);
    const body = physicsWorld.createRigidBody(bodyDesc);
    const posAttr = geo.getAttribute('position');
    const vertices = new Float32Array(posAttr.array);
    const colliderDesc = RAPIER.ColliderDesc.convexHull(vertices);
    if (colliderDesc) {
      const collider = physicsWorld.createCollider(colliderDesc, body);
      mesh.userData.rigidBody = body;
      mesh.userData.collider = collider;
    }

    return mesh;
  }

  return {
    get alignment() { return alignment; },
    get isMaterialized() { return isMaterialized; },

    update(delta, camPos, camQuat) {
      if (isMaterialized) return;

      alignment = checkAlignment(camPos, camQuat);
      for (const mesh of fragments) {
        mesh.material.emissiveIntensity = alignment * 0.5;
      }
      const pulse = 0.3 + 0.2 * Math.sin(Date.now() * 0.003);
      floorMarker.material.opacity = alignment > 0.1 ? 0.3 + alignment * 0.5 : pulse;
    },

    tryMaterialize() {
      if (isMaterialized) return false;
      if (alignment < 0.7) return false;

      isMaterialized = true;
      pendingPickup = spawnDynamicCube();
      for (const mesh of fragments) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      fragments.length = 0;
      floorMarker.visible = false;
      return true;
    },

    consumeMaterialized() {
      if (pendingPickup) {
        const result = pendingPickup;
        pendingPickup = null;
        return result;
      }
      return null;
    },

    cleanup() {
      for (const mesh of fragments) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
      fragments.length = 0;
      if (floorMarker) {
        scene.remove(floorMarker);
        floorMarker.geometry.dispose();
        floorMarker.material.dispose();
      }
    }
  };
}

function buildMonitorConsole(scene, physicsWorld, RAPIER, position, environmentObjects) {
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [3.2, 2.0, 0.3], position: [position.x, position.y + 1.8, position.z],
    color: 0x111111, metalness: 0.9, type: 'prop'
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [0.4, 0.8, 0.4], position: [position.x, position.y + 0.4, position.z],
    color: 0x333333, metalness: 0.8, type: 'prop'
  });
  addBox(scene, physicsWorld, RAPIER, environmentObjects, {
    size: [1.6, 0.1, 1.0], position: [position.x, position.y + 0.05, position.z],
    color: 0x444444, metalness: 0.6, type: 'prop'
  });

  const screenGeo = new THREE.PlaneGeometry(3.0, 1.8);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc, side: THREE.DoubleSide });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(position.x, position.y + 1.8, position.z - 0.16);
  scene.add(screenMesh);
  environmentObjects.push(screenMesh);
}

function addLights(scene, environmentObjects, offsetY) {
  const light1 = new THREE.PointLight(0xffffff, 2.5, 40);
  light1.position.set(0, 12 + offsetY, 12);
  light1.castShadow = true;
  scene.add(light1);
  environmentObjects.push(light1);

  const light2 = new THREE.PointLight(0x4488ff, 1.5, 30);
  light2.position.set(0, 10 + offsetY, 40);
  scene.add(light2);
  environmentObjects.push(light2);

  const light3 = new THREE.PointLight(0xffaa00, 3, 50);
  light3.position.set(0, 12 + offsetY, 70);
  light3.castShadow = true;
  scene.add(light3);
  environmentObjects.push(light3);

  const light4 = new THREE.PointLight(0xff8844, 2, 30);
  light4.position.set(0, 10 + offsetY, 85);
  scene.add(light4);
  environmentObjects.push(light4);
}
