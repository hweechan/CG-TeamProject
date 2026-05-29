import * as THREE from 'three';

const BRIDGE_SIZE = [10, 1, 10];

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

export class PhotoSystem {
  constructor(camera, scene, physicsWorld, RAPIER, photoItemMesh) {
    this.camera = camera;
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.RAPIER = RAPIER;
    this.photoItemMesh = photoItemMesh;
    this.holding = false;
    this.stamped = false;

    this.photoScene = new THREE.Scene();
    this.photoScene.background = new THREE.Color(0xd0d0d0);
    this.photoScene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const pLight = new THREE.DirectionalLight(0xffffff, 0.8);
    pLight.position.set(30, 50, 30);
    this.photoScene.add(pLight);

    this.previewBridge = new THREE.Mesh(
      new THREE.BoxGeometry(...BRIDGE_SIZE),
      new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.8, metalness: 0.1 })
    );
    this.photoScene.add(this.previewBridge);

    this.previewSky = new THREE.Mesh(
      new THREE.PlaneGeometry(SKY_W, SKY_H),
      new THREE.MeshBasicMaterial({ color: 0xd0d0d0, side: THREE.DoubleSide })
    );
    this.photoScene.add(this.previewSky);

    this.photoCamera = new THREE.PerspectiveCamera(PHOTO_FOV, PHOTO_ASPECT, 0.1, 500);

    const rtW = 512;
    const rtH = Math.round(rtW / PHOTO_ASPECT);
    this.renderTarget = new THREE.WebGLRenderTarget(rtW, rtH);

    this.viewmodel = new THREE.Group();
    this.viewmodel.visible = false;
    this._buildViewmodel();
    camera.add(this.viewmodel);
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

    this.stamped = true;
    this.holding = false;
    this.viewmodel.visible = false;

    this.camera.updateMatrixWorld();
    const camQ = this.camera.quaternion;

    const bridgeWorldPos = BRIDGE_LOCAL.clone();
    this.camera.localToWorld(bridgeWorldPos);

    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(...BRIDGE_SIZE),
      new THREE.MeshStandardMaterial({ color: 0xbbbbbb, roughness: 0.8, metalness: 0.1 })
    );
    bridge.position.copy(bridgeWorldPos);
    bridge.quaternion.copy(camQ);
    bridge.castShadow = true;
    bridge.receiveShadow = true;
    this.scene.add(bridge);

    const body = this.physicsWorld.createRigidBody(
      this.RAPIER.RigidBodyDesc.fixed()
        .setTranslation(bridgeWorldPos.x, bridgeWorldPos.y, bridgeWorldPos.z)
        .setRotation({ x: camQ.x, y: camQ.y, z: camQ.z, w: camQ.w })
    );
    this.physicsWorld.createCollider(
      this.RAPIER.ColliderDesc.cuboid(BRIDGE_SIZE[0] / 2, BRIDGE_SIZE[1] / 2, BRIDGE_SIZE[2] / 2),
      body
    );

    const skyWorldPos = SKY_LOCAL.clone();
    this.camera.localToWorld(skyWorldPos);

    const skyPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(SKY_W, SKY_H),
      new THREE.MeshBasicMaterial({ color: 0xd0d0d0, side: THREE.DoubleSide, fog: false })
    );
    skyPlane.position.copy(skyWorldPos);
    skyPlane.quaternion.copy(camQ);
    this.scene.add(skyPlane);
  }

  renderPreview(renderer) {
    if (!this.holding) return;

    this.photoCamera.position.copy(this.camera.position);
    this.photoCamera.quaternion.copy(this.camera.quaternion);
    this.photoCamera.updateMatrixWorld();

    const bridgeWorld = BRIDGE_LOCAL.clone();
    this.photoCamera.localToWorld(bridgeWorld);
    this.previewBridge.position.copy(bridgeWorld);
    this.previewBridge.quaternion.copy(this.camera.quaternion);

    const skyWorld = SKY_LOCAL.clone();
    this.photoCamera.localToWorld(skyWorld);
    this.previewSky.position.copy(skyWorld);
    this.previewSky.quaternion.copy(this.camera.quaternion);

    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.photoScene, this.photoCamera);
    renderer.setRenderTarget(null);
  }

  isNearItem(cameraPos) {
    if (this.holding || this.stamped) return false;
    return cameraPos.distanceTo(this.photoItemMesh.position) < 2;
  }
}
