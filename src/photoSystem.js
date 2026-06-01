import * as THREE from 'three';

const BRIDGE_SIZE = [10, 1, 10];
const RAMP_SIZE = [4, 4, 12];

const QUAD_W = 1.6;
const QUAD_H = 0.9;
const QUAD_DIST = 2.0;
const SKY_DIST = 200.0;

const PHOTO_FOV = 2 * Math.atan((QUAD_H / 2) / QUAD_DIST) * (180 / Math.PI);
const PHOTO_ASPECT = QUAD_W / QUAD_H;

const SKY_W = QUAD_W * (SKY_DIST / QUAD_DIST);
const SKY_H = QUAD_H * (SKY_DIST / QUAD_DIST);

const BRIDGE_LOCAL = new THREE.Vector3(0, -2, -15);
const SKY_LOCAL = new THREE.Vector3(0, 0, -SKY_DIST);

const B = 0.03;
const B_BOT = B * 3;
const FRAME_W = QUAD_W + B * 2;
const FRAME_H = QUAD_H + B + B_BOT;

function createWedgeGeometry(w, h, d) {
  const geo = new THREE.BufferGeometry();
  const hw = w / 2;
  const hh = h / 2;
  const hd = d / 2;
  
  const vertices = new Float32Array([
    -hw, -hh,  hd,  // 0: 왼쪽 앞 아래
     hw, -hh,  hd,  // 1: 오른쪽 앞 아래
    -hw,  hh, -hd,  // 2: 왼쪽 뒤 위
     hw,  hh, -hd,  // 3: 오른쪽 뒤 위
    -hw, -hh, -hd,  // 4: 왼쪽 뒤 아래
     hw, -hh, -hd   // 5: 오른쪽 뒤 아래
  ]);
  const indices = [
    0,1,2,  1,3,2, // 빗면
    1,5,3,         // 우측면
    4,0,2,         // 좌측면
    4,5,1,  4,1,0, // 바닥면
    2,3,5,  2,5,4  // 뒷면
  ];
  geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

export class PhotoSystem {
  constructor(camera, scene, physicsWorld, RAPIER, photoItemMesh) {
    this.camera = camera;
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.RAPIER = RAPIER;
    this.photoItemMesh = photoItemMesh;
    this.holding = false;
    this.stamped = false;
    this.projectedType = 'bridge'; // 'bridge' or 'ramp'

    this.stampedObjects = {
      meshes: [],
      bodies: []
    };

    this.photoScene = new THREE.Scene();
    this.photoScene.background = new THREE.Color(0xd0d0d0);
    this.photoScene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pLight = new THREE.DirectionalLight(0xffffff, 0.8);
    pLight.position.set(30, 50, 30);
    this.photoScene.add(pLight);

    // 공통 프리뷰 메쉬 생성 (기본은 bridge 지오메트리)
    this.previewMesh = new THREE.Mesh(
      new THREE.BoxGeometry(...BRIDGE_SIZE),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.1 })
    );
    this.photoScene.add(this.previewMesh);

    this.previewSky = new THREE.Mesh(
      new THREE.PlaneGeometry(SKY_W, SKY_H),
      new THREE.MeshBasicMaterial({ color: 0xd0d0d0, side: THREE.DoubleSide })
    );
    this.photoScene.add(this.previewSky);

    // 투영 가능한 유효 구역 초기화 (Stage 1 기준)
    this.validZone = new THREE.Box3(
      new THREE.Vector3(20, -5, -10),
      new THREE.Vector3(38, 12, 10)
    );

    this.photoCamera = new THREE.PerspectiveCamera(PHOTO_FOV, PHOTO_ASPECT, 0.1, 500);

    const rtW = 512;
    const rtH = Math.round(rtW / PHOTO_ASPECT);
    this.renderTarget = new THREE.WebGLRenderTarget(rtW, rtH);

    this.viewmodel = new THREE.Group();
    this.viewmodel.visible = false;
    this._buildViewmodel();
    camera.add(this.viewmodel);
  }

  setValidZone(min, max) {
    this.validZone.set(min, max);
  }

  setProjectedAsset(type) {
    this.projectedType = type;
    if (this.previewMesh.geometry) {
      this.previewMesh.geometry.dispose();
    }
    
    if (type === 'ramp') {
      this.previewMesh.geometry = createWedgeGeometry(...RAMP_SIZE);
    } else {
      this.previewMesh.geometry = new THREE.BoxGeometry(...BRIDGE_SIZE);
    }
  }

  _buildViewmodel() {
    const D = 0.01;
    const innerOffsetY = (B_BOT - B) / 2;

    const photoMat = new THREE.MeshBasicMaterial({
      map: this.renderTarget.texture,
      depthTest: false,
    });
    const photoPlane = new THREE.Mesh(new THREE.PlaneGeometry(QUAD_W, QUAD_H), photoMat);
    photoPlane.position.y = innerOffsetY;
    photoPlane.renderOrder = 2;
    this.viewmodel.add(photoPlane);

    const fMat = new THREE.MeshBasicMaterial({ color: 0xf0f0f0, depthTest: false });
    const mkBorder = (w, h, x, y) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, D), fMat);
      m.position.set(x, y, 0);
      m.renderOrder = 10;
      return m;
    };
    this.viewmodel.add(mkBorder(FRAME_W, B, 0, (FRAME_H - B) / 2));
    this.viewmodel.add(mkBorder(FRAME_W, B_BOT, 0, -(FRAME_H - B_BOT) / 2));
    this.viewmodel.add(mkBorder(B, FRAME_H, -(FRAME_W - B) / 2, 0));
    this.viewmodel.add(mkBorder(B, FRAME_H, (FRAME_W - B) / 2, 0));

    this.viewmodel.position.set(0, 0, -QUAD_DIST);
  }

  pickup() {
    if (this.stamped) return;
    this.holding = true;
    this.photoItemMesh.visible = false;
    this.viewmodel.visible = true;
  }

  stamp() {
    if (!this.holding || this.stamped) return;

    this.camera.updateMatrixWorld();
    const camQ = this.camera.quaternion;

    const bridgeWorldPos = BRIDGE_LOCAL.clone();
    this.camera.localToWorld(bridgeWorldPos);

    // 지정된 구역이 아니라면 스탬프 거부
    if (!this.validZone.containsPoint(bridgeWorldPos)) {
      console.log("여기에는 투영할 수 없습니다!");
      return; 
    }

    this.stamped = true;
    this.holding = false;
    this.viewmodel.visible = false;

    // 메쉬 생성
    let stampedGeo;
    let size;
    if (this.projectedType === 'ramp') {
      stampedGeo = createWedgeGeometry(...RAMP_SIZE);
      size = RAMP_SIZE;
    } else {
      stampedGeo = new THREE.BoxGeometry(...BRIDGE_SIZE);
      size = BRIDGE_SIZE;
    }

    const bridge = new THREE.Mesh(
      stampedGeo,
      new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.8, metalness: 0.1 })
    );
    bridge.position.copy(bridgeWorldPos);
    bridge.quaternion.copy(camQ);
    bridge.castShadow = true;
    bridge.receiveShadow = true;
    this.scene.add(bridge);
    this.stampedObjects.meshes.push(bridge);

    // 물리 바디 생성
    const body = this.physicsWorld.createRigidBody(
      this.RAPIER.RigidBodyDesc.fixed()
        .setTranslation(bridgeWorldPos.x, bridgeWorldPos.y, bridgeWorldPos.z)
        .setRotation({ x: camQ.x, y: camQ.y, z: camQ.z, w: camQ.w })
    );

    // 콜라이더 생성 (Ramp는 convexHull, Bridge는 cuboid)
    let colliderDesc;
    if (this.projectedType === 'ramp') {
      const posAttr = stampedGeo.getAttribute('position');
      const vertices = new Float32Array(posAttr.array);
      colliderDesc = this.RAPIER.ColliderDesc.convexHull(vertices);
    } else {
      colliderDesc = this.RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2);
    }

    if (colliderDesc) {
      this.physicsWorld.createCollider(colliderDesc, body);
    }
    this.stampedObjects.bodies.push(body);

    const skyWorldPos = SKY_LOCAL.clone();
    this.camera.localToWorld(skyWorldPos);

    const skyPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(SKY_W, SKY_H),
      new THREE.MeshBasicMaterial({ color: 0xd0d0d0, side: THREE.DoubleSide, fog: false })
    );
    skyPlane.position.copy(skyWorldPos);
    skyPlane.quaternion.copy(camQ);
    this.scene.add(skyPlane);
    this.stampedObjects.meshes.push(skyPlane);
  }

  reset() {
    this.holding = false;
    this.stamped = false;
    this.viewmodel.visible = false;
    this.photoItemMesh.visible = true;

    // 투영된 물체들 제거
    for (const mesh of this.stampedObjects.meshes) {
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
      this.scene.remove(mesh);
    }
    this.stampedObjects.meshes = [];

    for (const body of this.stampedObjects.bodies) {
      this.physicsWorld.removeRigidBody(body);
    }
    this.stampedObjects.bodies = [];
  }

  updateItemMesh(newMesh) {
    this.photoItemMesh = newMesh;
    this.reset();
  }

  renderPreview(renderer) {
    if (!this.holding) return;

    this.photoCamera.position.copy(this.camera.position);
    this.photoCamera.quaternion.copy(this.camera.quaternion);
    this.photoCamera.updateMatrixWorld();

    const bridgeWorld = BRIDGE_LOCAL.clone();
    this.photoCamera.localToWorld(bridgeWorld);
    this.previewMesh.position.copy(bridgeWorld);
    this.previewMesh.quaternion.copy(this.camera.quaternion);

    const skyWorld = SKY_LOCAL.clone();
    this.photoCamera.localToWorld(skyWorld);
    this.previewSky.position.copy(skyWorld);
    this.previewSky.quaternion.copy(this.camera.quaternion);

    // 투영 불가능한 구역이면 붉은색 피드백
    if (!this.validZone.containsPoint(bridgeWorld)) {
      this.previewMesh.material.color.setHex(0xff4444);
    } else {
      this.previewMesh.material.color.setHex(0xaaaaaa);
    }

    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.photoScene, this.photoCamera);
    renderer.setRenderTarget(null);
  }

  isNearItem(cameraPos) {
    if (this.holding || this.stamped || !this.photoItemMesh) return false;
    return cameraPos.distanceTo(this.photoItemMesh.position) < 2;
  }
}
