import * as THREE from 'three';

// 다양한 상호작용 (원근법, 사진기 등에 쓰이는) 오브젝트들을 정의하는 파일

export function createRamp(scene, physicsWorld, RAPIER, { size, position, color = 0xffcc88, roughness = 0.5, metalness = 0.0, hasGravity = true }) {
  const geo = new THREE.BufferGeometry();
  const w = size[0] / 2;
  const h = size[1] / 2;
  const d = size[2] / 2;
  
  // 쐐기(Wedge/경사형 케이크 조각) 형태의 정점 정의
  const vertices = new Float32Array([
    -w, -h,  d,  // 0: 왼쪽 앞 아래
     w, -h,  d,  // 1: 오른쪽 앞 아래
    -w,  h, -d,  // 2: 왼쪽 뒤 위
     w,  h, -d,  // 3: 오른쪽 뒤 위
    -w, -h, -d,  // 4: 왼쪽 뒤 아래
     w, -h, -d   // 5: 오른쪽 뒤 아래
  ]);
  const indices = [
    0,1,2,  1,3,2, // 빗면
    1,5,3,         // 우측면
    4,0,2,         // 좌측면
    4,5,1,  4,1,0, // 바닥면
    2,3,5,  2,5,4  // 뒷면 (수직벽)
  ];
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return createPhysicsMesh(scene, physicsWorld, RAPIER, geo, { position, color, roughness, metalness, hasGravity });
}

export function createCube(scene, physicsWorld, RAPIER, { size, position, color = 0x3366ff, roughness = 0.7, metalness = 0.1, hasGravity = true }) {
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  return createPhysicsMesh(scene, physicsWorld, RAPIER, geo, { position, color, roughness, metalness, hasGravity });
}

function createPhysicsMesh(scene, physicsWorld, RAPIER, geometry, { position, color, roughness, metalness, hasGravity }) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  mesh.userData.isDynamic = hasGravity; // 나중에 중력 적용 여부 알 수 있게 저장

  if (physicsWorld && RAPIER) {
    // 중력이 있으면 Dynamic, 없으면 Kinematic/Fixed
    const bodyType = hasGravity ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.fixed();
    const bodyDesc = bodyType.setTranslation(position[0], position[1], position[2]);
    const body = physicsWorld.createRigidBody(bodyDesc);
    
    // Geometry의 형태 그대로 Convex Hull(볼록 껍질) 충돌체 생성하여 Box, Ramp 모두 안전하게 지원
    const posAttr = geometry.getAttribute('position');
    const vertices = new Float32Array(posAttr.array);
    let colliderDesc = RAPIER.ColliderDesc.convexHull(vertices);
    
    if (colliderDesc) {
      const collider = physicsWorld.createCollider(colliderDesc, body);
      mesh.userData.rigidBody = body;
      mesh.userData.collider = collider;
    }
  }
  return mesh;
}
