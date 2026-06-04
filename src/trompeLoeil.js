import * as THREE from 'three';

export class TrompeLoeilPuzzle {
  constructor(scene, physicsWorld, RAPIER, environmentObjects, config) {
    this.scene = scene;
    this.physicsWorld = physicsWorld;
    this.RAPIER = RAPIER;
    this.environmentObjects = environmentObjects;
    this.config = config;

    this.fragmentMeshes = [];
    this.materializedMesh = null;
    this.materializedBody = null;
    this.isMaterialized = false;
    this.alignment = 0;
    this.floorMarker = null;

    this.isAnimating = false;
    this.animTimer = 0;
    this.ANIM_DURATION = 0.6;
    this.fragmentStartPositions = [];

    this._buildFragments();
    this._buildFloorMarker();
  }

  _buildFragments() {
    for (const frag of this.config.fragments) {
      const geo = new THREE.PlaneGeometry(frag.size[0], frag.size[1]);
      const mat = new THREE.MeshStandardMaterial({
        color: frag.color,
        roughness: 0.4,
        metalness: 0.2,
        side: THREE.DoubleSide,
        emissive: frag.color,
        emissiveIntensity: 0.0
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(frag.position);
      mesh.rotation.copy(frag.rotation);
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.environmentObjects.push(mesh);
      this.fragmentMeshes.push(mesh);
    }
  }

  _buildFloorMarker() {
    const geo = new THREE.RingGeometry(0.8, 1.0, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    this.floorMarker = new THREE.Mesh(geo, mat);
    this.floorMarker.rotation.x = -Math.PI / 2;
    this.floorMarker.position.copy(this.config.floorMarkerPos);
    this.scene.add(this.floorMarker);
    this.environmentObjects.push(this.floorMarker);
  }

  update(delta, cameraPos, cameraQuaternion) {
    if (this.isMaterialized && !this.isAnimating) return;

    if (this.isAnimating) {
      this._updateAnimation(delta);
      return;
    }

    this.alignment = this._checkAlignment(cameraPos, cameraQuaternion);

    for (const mesh of this.fragmentMeshes) {
      mesh.material.emissiveIntensity = this.alignment * 0.5;
    }

    const pulse = 0.3 + 0.2 * Math.sin(Date.now() * 0.003);
    this.floorMarker.material.opacity = this.alignment > 0.1 ? 0.3 + this.alignment * 0.5 : pulse;
  }

  _checkAlignment(cameraPos, cameraQuaternion) {
    const { sweetSpotPos, sweetSpotDir, posThreshold, angleThreshold } = this.config;

    const distance = cameraPos.distanceTo(sweetSpotPos);
    if (distance > posThreshold) return 0;

    const lookDir = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuaternion).normalize();
    const dot = lookDir.dot(sweetSpotDir);
    if (dot < angleThreshold) return 0;

    const posQuality = 1 - (distance / posThreshold);
    const angleQuality = (dot - angleThreshold) / (1 - angleThreshold);
    return Math.min(posQuality, angleQuality);
  }

  tryMaterialize() {
    if (this.isMaterialized || this.isAnimating) return false;
    if (this.alignment < 0.7) return false;

    this.isAnimating = true;
    this.animTimer = 0;
    this.fragmentStartPositions = this.fragmentMeshes.map(m => m.position.clone());

    return true;
  }

  _updateAnimation(delta) {
    this.animTimer += delta;
    const t = Math.min(1, this.animTimer / this.ANIM_DURATION);
    const eased = t * t * (3 - 2 * t);

    const targetPos = this.config.targetPosition;

    for (let i = 0; i < this.fragmentMeshes.length; i++) {
      const mesh = this.fragmentMeshes[i];
      mesh.position.lerpVectors(this.fragmentStartPositions[i], targetPos, eased);
      mesh.material.opacity = 1 - eased;
      mesh.material.transparent = true;
    }

    if (t >= 1) {
      this.isAnimating = false;
      this.isMaterialized = true;
      this._spawnRealObject();
      this._removeFragments();
    }
  }

  _spawnRealObject() {
    const { targetPosition, targetGeometry, targetSize, targetColor, targetRotation } = this.config;

    const mat = new THREE.MeshStandardMaterial({
      color: targetColor,
      roughness: 0.6,
      metalness: 0.2
    });
    this.materializedMesh = new THREE.Mesh(targetGeometry, mat);
    this.materializedMesh.position.copy(targetPosition);
    if (targetRotation) this.materializedMesh.quaternion.copy(targetRotation);
    this.materializedMesh.castShadow = true;
    this.materializedMesh.receiveShadow = true;
    this.scene.add(this.materializedMesh);
    this.environmentObjects.push(this.materializedMesh);

    const bodyDesc = this.RAPIER.RigidBodyDesc.fixed()
      .setTranslation(targetPosition.x, targetPosition.y, targetPosition.z);
    if (targetRotation) {
      bodyDesc.setRotation({
        x: targetRotation.x, y: targetRotation.y,
        z: targetRotation.z, w: targetRotation.w
      });
    }
    this.materializedBody = this.physicsWorld.createRigidBody(bodyDesc);

    let colliderDesc;
    if (targetSize) {
      colliderDesc = this.RAPIER.ColliderDesc.cuboid(
        targetSize[0] / 2, targetSize[1] / 2, targetSize[2] / 2
      );
    } else {
      const posAttr = targetGeometry.getAttribute('position');
      colliderDesc = this.RAPIER.ColliderDesc.convexHull(new Float32Array(posAttr.array));
    }
    if (colliderDesc) {
      this.physicsWorld.createCollider(colliderDesc, this.materializedBody);
    }

    this.materializedMesh.userData.rigidBody = this.materializedBody;
  }

  _removeFragments() {
    for (const mesh of this.fragmentMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.fragmentMeshes = [];
    if (this.floorMarker) this.floorMarker.visible = false;
  }

  cleanup() {
    this._removeFragments();
    if (this.materializedBody) {
      this.physicsWorld.removeRigidBody(this.materializedBody);
      this.materializedBody = null;
    }
    if (this.materializedMesh) {
      this.materializedMesh.userData.rigidBody = null;
      this.scene.remove(this.materializedMesh);
      this.materializedMesh.geometry.dispose();
      this.materializedMesh.material.dispose();
      this.materializedMesh = null;
    }
    if (this.floorMarker) {
      this.scene.remove(this.floorMarker);
      this.floorMarker.geometry.dispose();
      this.floorMarker.material.dispose();
      this.floorMarker = null;
    }
  }
}
