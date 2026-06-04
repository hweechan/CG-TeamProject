import * as THREE from 'three';

export class GimmickInfiniteCorridor {
  /**
   * 무한 루프 복도를 생성합니다.
   * @param {THREE.Scene} scene 
   * @param {Object} physicsWorld 
   * @param {Object} RAPIER 
   * @param {Array} environmentObjects 
   * @param {Object} options 
   */
  constructor(scene, physicsWorld, RAPIER, environmentObjects, options = {}) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.RAPIER = RAPIER;
    this.environmentObjects = environmentObjects;
    
    // 설정값
    this.offsetY = options.offsetY || 0;
    this.W = options.width || 10;
    this.H = options.height || 15;
    this.D = options.depth || 40;
    this.cx = options.cx || 0;
    
    this.loopZ = options.loopZ || 35; // 이 Z좌표를 넘어가면 텔레포트
    this.returnZDelta = options.returnZDelta || 30; // 텔레포트 시 되돌릴 Z 거리
    
    this._buildCorridor();
  }

  _buildCorridor() {
    // ── 시작 방 (Start Room) ──
    const startW = 20;
    const startD = 20;
    const startZCenter = -10; // Z=-20 부터 Z=0 까지
    
    // 시작 방 바닥과 천장
    this._addBox([startW, 1, startD], [this.cx, this.offsetY - 0.5, startZCenter], 'floor');
    this._addBox([startW, 1, startD], [this.cx, this.offsetY + this.H + 0.5, startZCenter], 'ceiling');
    
    // 시작 방 뒤쪽 벽 (Z=-20)
    this._addBox([startW, this.H, 1], [this.cx, this.offsetY + this.H / 2, -20.5], 'wall');
    
    // 시작 방 좌우 벽
    this._addBox([1, this.H, startD], [this.cx - startW / 2 - 0.5, this.offsetY + this.H / 2, startZCenter], 'wall');
    this._addBox([1, this.H, startD], [this.cx + startW / 2 + 0.5, this.offsetY + this.H / 2, startZCenter], 'wall');
    
    // 시작 방 앞쪽 벽 (Z=0) - 복도 입구 제외
    this._addBox([(startW - this.W) / 2, this.H, 1], [this.cx - this.W / 2 - (startW - this.W) / 4, this.offsetY + this.H / 2, -0.5], 'wall');
    this._addBox([(startW - this.W) / 2, this.H, 1], [this.cx + this.W / 2 + (startW - this.W) / 4, this.offsetY + this.H / 2, -0.5], 'wall');

    // ── 무한 복도 (Infinite Corridor) ──
    // 복도 바닥과 천장 (문 너머로 바닥을 살짝 연장하여 떨어지지 않게 함)
    this._addBox([this.W, 1, this.D + 2], [this.cx, this.offsetY - 0.5, (this.D + 2) / 2], 'floor');
    this._addBox([this.W, 1, this.D], [this.cx, this.offsetY + this.H + 0.5, this.D / 2], 'ceiling');
    
    // 복도 좌우 벽
    this._addBox([1, this.H, this.D], [this.cx - this.W / 2 - 0.5, this.offsetY + this.H / 2, this.D / 2], 'wall');
    this._addBox([1, this.H, this.D], [this.cx + this.W / 2 + 0.5, this.offsetY + this.H / 2, this.D / 2], 'wall');

    // 복도 뒤쪽 끝(Z=40)은 문을 위해 구멍을 뚫어놓음
    const doorW = 4;
    const doorH = 6;
    // 왼쪽 벽
    this._addBox([(this.W - doorW) / 2, this.H, 1], [this.cx - this.W / 2 + (this.W - doorW) / 4, this.offsetY + this.H / 2, this.D + 0.5], 'wall');
    // 오른쪽 벽
    this._addBox([(this.W - doorW) / 2, this.H, 1], [this.cx + this.W / 2 - (this.W - doorW) / 4, this.offsetY + this.H / 2, this.D + 0.5], 'wall');
    // 위쪽 벽 (연두색 하단이 나오지 않도록 전체 살구색인 ceiling 재질 사용)
    this._addBox([doorW, this.H - doorH, 1], [this.cx, this.offsetY + doorH + (this.H - doorH) / 2, this.D + 0.5], 'ceiling');

    // ── 끝 방 (End Room) ──
    const endW = 20;
    const endD = 20;
    const endZCenter = this.D + 1 + (endD / 2); // Z = 41 + 10 = 51
    
    // 끝 방 바닥과 천장
    this._addBox([endW, 1, endD], [this.cx, this.offsetY - 0.5, endZCenter], 'floor');
    this._addBox([endW, 1, endD], [this.cx, this.offsetY + this.H + 0.5, endZCenter], 'ceiling');
    
    // 끝 방 뒤쪽 벽 (Z = 61)
    this._addBox([endW, this.H, 1], [this.cx, this.offsetY + this.H / 2, endZCenter + endD / 2 + 0.5], 'wall');
    
    // 끝 방 좌우 벽
    this._addBox([1, this.H, endD], [this.cx - endW / 2 - 0.5, this.offsetY + this.H / 2, endZCenter], 'wall');
    this._addBox([1, this.H, endD], [this.cx + endW / 2 + 0.5, this.offsetY + this.H / 2, endZCenter], 'wall');
    
    // 끝 방 앞쪽 벽 (Z = 41) - 문 입구 제외
    this._addBox([(endW - doorW) / 2, this.H, 1], [this.cx - doorW / 2 - (endW - doorW) / 4, this.offsetY + this.H / 2, this.D + 1.5], 'wall');
    this._addBox([(endW - doorW) / 2, this.H, 1], [this.cx + doorW / 2 + (endW - doorW) / 4, this.offsetY + this.H / 2, this.D + 1.5], 'wall');

    // 조명
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);
    this.environmentObjects.push(ambient);

    // 시작방 조명
    const startLight = new THREE.PointLight(0xffffff, 4, 40);
    startLight.position.set(this.cx, this.offsetY + 13, -10);
    this.scene.add(startLight);
    this.environmentObjects.push(startLight);

    // 복도 루프 조명
    for (let z = 5; z <= this.D - 5; z += 10) {
      const light = new THREE.PointLight(0xffffff, 2, 20);
      light.position.set(this.cx, this.offsetY + 13, z);
      this.scene.add(light);
      this.environmentObjects.push(light);
      this._addBox([2, 0.5, 2], [this.cx, this.offsetY + this.H - 0.2, z], 'prop');
    }

    // 끝 방 조명
    const endLight = new THREE.PointLight(0xffffff, 4, 40);
    endLight.position.set(this.cx, this.offsetY + 13, endZCenter);
    this.scene.add(endLight);
    this.environmentObjects.push(endLight);
  }

  _addBox(size, pos, type) {
    let materials;
    if (type === 'prop') {
      materials = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
    } else {
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

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), materials);
    mesh.position.set(...pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.environmentObjects.push(mesh);

    const body = this.physicsWorld.createRigidBody(this.RAPIER.RigidBodyDesc.fixed().setTranslation(...pos));
    this.physicsWorld.createCollider(this.RAPIER.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2), body);
    mesh.userData.rigidBody = body;
  }

  /**
   * 플레이어가 복도 끝에 도달했는지 확인하고 텔레포트시킵니다.
   * @param {THREE.Vector3} cameraPos 
   * @param {Object} fpsController 
   * @returns {boolean} 텔레포트 발생 여부
   */
  update(cameraPos, fpsController) {
    if (cameraPos.z > this.loopZ && fpsController) {
      const newZ = cameraPos.z - this.returnZDelta;
      // 카메라 위치 대신 플레이어 body의 실제 Y 위치를 넘겨주어 위아래 덜컹거림 방지
      const bodyY = fpsController.body.translation().y;
      fpsController.teleport(cameraPos.x, bodyY, newZ, true);
      console.log(`[InfiniteCorridor] 문 통과 텔레포트 (Z: ${cameraPos.z.toFixed(2)} -> ${newZ.toFixed(2)})`);
      return true;
    }
    return false;
  }
}
