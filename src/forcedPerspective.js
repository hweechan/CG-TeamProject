import * as THREE from 'three';

// Forced Perspective helper for Three.js
// Usage:
// const fp = new ForcedPerspective(camera, scene, renderer, pickableObjects, environmentObjects)
// call fp.update() each frame. call fp.dispose() when done.

export class ForcedPerspective {
  constructor(camera, scene, renderer, pickableObjects = [], environmentObjects = [], options = {}) {
    this.camera = camera;
    this.scene = scene;
    this.renderer = renderer;
    this.pickableObjects = Array.isArray(pickableObjects) ? pickableObjects : [pickableObjects];
    this.environmentObjects = Array.isArray(environmentObjects) ? environmentObjects : [environmentObjects];

    this.raycaster = new THREE.Raycaster();
    this.center = new THREE.Vector2(0, 0);

    this.isHolding = false;
    this.heldObject = null;
    this.initialDistance = 0;
    this.initialScale = new THREE.Vector3(1, 1, 1);
    this.originalParent = null;
    this.originalMatrixAutoUpdate = true;
    this.boundingRadius = 0.5;
    this.debug = options.debug || false;
    this.skipApplyFrames = 0;

    this.physicsWorld = options.physicsWorld;
    this.RAPIER = options.RAPIER;

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);

    window.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('wheel', this._onWheel, { passive: false });
  }

  _onMouseDown(e) {
    // Only use left mouse button
    if (e.button !== 0) return;
    if (this.isHolding) return;

    this.raycaster.setFromCamera(this.center, this.camera);
    const intersects = this.raycaster.intersectObjects(this.pickableObjects, true);
    if (!intersects || intersects.length === 0) return;

    const hit = intersects[0];
    this.heldObject = hit.object;
    this.isHolding = true;

    this.originalParent = this.heldObject.parent;
    this.originalMatrixAutoUpdate = this.heldObject.matrixAutoUpdate;
    this.heldObject.matrixAutoUpdate = true;


    // store initial scale & distance
    this.initialScale.copy(this.heldObject.scale);

    // Project object center along camera's look direction for initial depth
    const objWorldPos = new THREE.Vector3();
    this.heldObject.getWorldPosition(objWorldPos);
    const camPos = this.camera.position.clone();
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const L = new THREE.Vector3().subVectors(objWorldPos, camPos);
    this.initialDistance = Math.max(0.5, L.dot(dir));

    // compute bounding sphere radius to avoid embedding into walls
    const box = new THREE.Box3().setFromObject(this.heldObject);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    this.boundingRadius = sphere.radius || 0.5;

    // exact math does not require skipped frames
    this.skipApplyFrames = 0;

    // Change rigid body to Kinematic if it has physics
    if (this.physicsWorld && this.RAPIER && this.heldObject.userData.rigidBody) {
      const rb = this.heldObject.userData.rigidBody;
      rb.setBodyType(this.RAPIER.RigidBodyType.KinematicPositionBased, true);
    }
  }

  _onMouseUp(e) {
    if (e.button !== 0) return;
    if (!this.isHolding) return;

    // Handle physics object release: update collider size and make dynamic again
    if (this.physicsWorld && this.RAPIER && this.heldObject && this.heldObject.userData.rigidBody) {
      const rb = this.heldObject.userData.rigidBody;
      const oldCollider = this.heldObject.userData.collider;
      
      if (oldCollider) {
        this.physicsWorld.removeCollider(oldCollider, true);
      }
      
      // Update collision volume based on new scale
      // Extract position buffer and apply current scale to support any geometric shape (Box, Wedge, etc.)
      const posAttr = this.heldObject.geometry.getAttribute('position');
      const vertices = new Float32Array(posAttr.array.length);
      const scale = this.heldObject.scale;
      
      for(let i=0; i<posAttr.count; i++) {
         vertices[i*3] = posAttr.getX(i) * scale.x;
         vertices[i*3+1] = posAttr.getY(i) * scale.y;
         vertices[i*3+2] = posAttr.getZ(i) * scale.z;
      }
      
      let newColliderDesc = this.RAPIER.ColliderDesc.convexHull(vertices);
      
      // Fallback fallback to bounding box cuboid if convex hull fails
      if (!newColliderDesc) {
        this.heldObject.geometry.computeBoundingBox();
        const box = this.heldObject.geometry.boundingBox;
        const hx = ((box.max.x - box.min.x) / 2) * Math.abs(scale.x);
        const hy = ((box.max.y - box.min.y) / 2) * Math.abs(scale.y);
        const hz = ((box.max.z - box.min.z) / 2) * Math.abs(scale.z);
        newColliderDesc = this.RAPIER.ColliderDesc.cuboid(hx, hy, hz);
      }
      
      this.heldObject.userData.collider = this.physicsWorld.createCollider(newColliderDesc, rb);

      // Restore body type according to original dynamic state
      rb.setTranslation(this.heldObject.position, true);
      rb.setRotation(this.heldObject.quaternion, true);
      if (this.heldObject.userData.isDynamic !== false) {
        rb.setBodyType(this.RAPIER.RigidBodyType.Dynamic, true);
        rb.wakeUp();
      } else {
        rb.setBodyType(this.RAPIER.RigidBodyType.Fixed, true);
      }
    }

    // release and keep object at current transformed world position
    this.isHolding = false;
    if (this.heldObject) {
      this.heldObject.matrixAutoUpdate = this.originalMatrixAutoUpdate;
      this.heldObject = null;
    }
  }

  _onWheel(e) {
    if (!this.isHolding || !this.heldObject) return;

    // prevent default scrolling / zooming
    e.preventDefault();

    // 휠 방향에 따른 회전: 아래(deltaY > 0) -> 시계방향, 위(deltaY < 0) -> 반시계방향
    const rotationSpeed = Math.PI / 12; // 15도씩
    const direction = e.deltaY > 0 ? -1 : 1; 

    // Y축(월드 기준)으로 회전 적용
    this.heldObject.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), direction * rotationSpeed);
  }

  update() {
    if (!this.isHolding || !this.heldObject) return;

    if (this.skipApplyFrames > 0) {
      if (this.debug) console.log('[FP] skipping apply frames left=', this.skipApplyFrames);
      this.skipApplyFrames -= 1;
      return;
    }

    // find environment hit (wall/floor) from camera center
    this.raycaster.setFromCamera(this.center, this.camera);
    const envHits = this.raycaster.intersectObjects(this.environmentObjects, true) || [];

    // pick first hit that's not the held object (or its children)
    let hitPoint = null;
    for (let i = 0; i < envHits.length; i++) {
      const obj = envHits[i].object;
      if (this._isDescendantOf(obj, this.heldObject)) continue;
      hitPoint = envHits[i].point.clone();
      break;
    }

    if (!hitPoint) {
      // fallback: point straight ahead at some distance
      const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      hitPoint = this.camera.position.clone().addScaledVector(dir, 10);
    }

    // Calculate how far the hit point is
    const hitDistance = this.camera.position.distanceTo(hitPoint);
    
    // Calculate ideal distance for the object center so it rests perfectly on the surface
    // Scale ratio is determined exactly by the new depth geometry:
    const ratio = this.boundingRadius / this.initialDistance;
    const newDistance = hitDistance / (1 + ratio);
    
    let scaleFactor = newDistance / this.initialDistance;
    
    const SCALE_MIN = 0.05;
    const SCALE_MAX = 100.0;
    scaleFactor = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scaleFactor));
    
    // Place exactly on the camera ray at the re-calculated distance
    const actualDistance = scaleFactor * this.initialDistance;

    // Apply scale instantly (no lerp = no jump in apparent size)
    const targetScale = this.initialScale.clone().multiplyScalar(scaleFactor);
    this.heldObject.scale.copy(targetScale);
    
    // Place exactly along the camera ray
    const centerRayDir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    const placePos = this.camera.position.clone().addScaledVector(centerRayDir, actualDistance);
    
    // Convert to local if parented
    const localPos = placePos.clone();
    if (this.heldObject.parent) this.heldObject.parent.worldToLocal(localPos);
    this.heldObject.position.copy(localPos);

    // Update kinematic rigid body position so physics stays in sync while holding
    if (this.physicsWorld && this.heldObject.userData.rigidBody) {
      const rb = this.heldObject.userData.rigidBody;
      rb.setNextKinematicTranslation(this.heldObject.position);
      
      if (rb.setNextKinematicRotation) {
        rb.setNextKinematicRotation(this.heldObject.quaternion);
      } else {
        rb.setRotation(this.heldObject.quaternion, true);
      }
    }
  }

  _isDescendantOf(child, parent) {
    if (!child || !parent) return false;
    let p = child;
    while (p) {
      if (p === parent) return true;
      p = p.parent;
    }
    return false;
  }

  dispose() {
    window.removeEventListener('mousedown', this._onMouseDown);
    window.removeEventListener('mouseup', this._onMouseUp);
    window.removeEventListener('wheel', this._onWheel);
    this.pickableObjects = [];
    this.environmentObjects = [];
    this.heldObject = null;
  }
}

export default ForcedPerspective;
