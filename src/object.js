import * as THREE from 'three';

// 다양한 상호작용 (원근법, 사진기 등에 쓰이는) 오브젝트들을 정의하는 파일

export function createRamp(scene, physicsWorld, RAPIER, { size, position, rotation, color = 0xffcc88, roughness = 0.5, metalness = 0.0, hasGravity = true }) {
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

  return createPhysicsMesh(scene, physicsWorld, RAPIER, geo, { position, rotation, color, roughness, metalness, hasGravity });
}

export function createPictogram(scene, physicsWorld, RAPIER, { texturePath, type, position, rotation, scale, size = [1.2, 0.6, 0.02], hasGravity = true }) {
  // 이미지 로드
  const textureLoader = new THREE.TextureLoader();
  const tex = textureLoader.load(texturePath); 
  tex.colorSpace = THREE.SRGBColorSpace;
  
  // 픽토그램 메쉬를 위한 박스 지오메트리
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  
  // createPhysicsMesh를 활용하여 물리 객체 생성
  const mesh = createPhysicsMesh(scene, physicsWorld, RAPIER, geo, { 
    position, 
    rotation, 
    color: 0xffffff, 
    roughness: 0.2, 
    metalness: 0.1, 
    hasGravity,
    map: tex, 
    emissive: 0x444444,
    emissiveMap: tex,
    emissiveIntensity: 0.8 
  });
  
  if (scale) {
    mesh.scale.set(scale[0], scale[1], scale[2]);
    // 스케일에 따른 콜라이더 크기는 ForcedPerspective가 잡았을 때 업데이트 됨
    // 혹은 처음부터 작은 크기를 원하면 크기에 맞게 박스를 재생성하는 것이 맞지만,
    // 이 코드 구조상 나중에 ForcedPerspective에서 마우스다운/업 할때 충돌체가 리사이즈 됨
  }
  
  mesh.userData.pictoType = type; // 스냅 로직 판별용
  return mesh;
}

export function createCube(scene, physicsWorld, RAPIER, { size, position, rotation, color = 0x3366ff, roughness = 0.7, metalness = 0.1, hasGravity = true }) {
  const geo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  return createPhysicsMesh(scene, physicsWorld, RAPIER, geo, { position, rotation, color, roughness, metalness, hasGravity });
}

function createPhysicsMesh(scene, physicsWorld, RAPIER, geometry, { position, rotation, color, roughness, metalness, hasGravity, map, emissive, emissiveMap, emissiveIntensity }) {
  const matParams = { color, roughness, metalness };
  if (map) matParams.map = map;
  if (emissive !== undefined) matParams.emissive = emissive;
  if (emissiveMap !== undefined) matParams.emissiveMap = emissiveMap;
  if (emissiveIntensity !== undefined) matParams.emissiveIntensity = emissiveIntensity;
  
  const mat = new THREE.MeshStandardMaterial(matParams);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.set(position[0], position[1], position[2]);
  if (rotation) {
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);
  }
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  mesh.userData.isDynamic = hasGravity; // 나중에 중력 적용 여부 알 수 있게 저장

  if (physicsWorld && RAPIER) {
    // Fixed 바디를 잡아서 Kinematic으로 바꿀 때 발생하는 Rapier Rust Aliasing 에러 방지.
    // 모두 Dynamic 바디로 생성하되, 중력이 없어야 하면 gravityScale을 0으로 설정합니다.
    const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(position[0], position[1], position[2]);
    if (!hasGravity) {
      bodyDesc.setGravityScale(0.0);
    }
    
    if (rotation) {
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));
      bodyDesc.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    }
    const body = physicsWorld.createRigidBody(bodyDesc);
    
    // Geometry의 형태 그대로 Convex Hull(볼록 껍질) 충돌체 생성하여 Box, Ramp 모두 안전하게 지원
    const posAttr = geometry.getAttribute('position');
    const vertices = new Float32Array(posAttr.array);
    let colliderDesc = RAPIER.ColliderDesc.convexHull(vertices);
    
    if (colliderDesc) {
      // 중력이 없는 객체는 허공에 둥둥 떠있게 하고자 할 때 마찰력을 주거나 질량을 조정할 수 있음
      const collider = physicsWorld.createCollider(colliderDesc, body);
      mesh.userData.rigidBody = body;
      mesh.userData.collider = collider;
    }
  }
  return mesh;
}
