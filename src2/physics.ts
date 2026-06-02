import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';

let registeredRapier: typeof RAPIER | null = null;

/**
 * Initializes Rapier engine in a lazy promise-based manner
 */
export async function getRapier() {
  if (registeredRapier) return registeredRapier;
  await RAPIER.init();
  registeredRapier = RAPIER;
  return RAPIER;
}

export class PhysicsEngine {
  public world: RAPIER.World;
  public playerBody: RAPIER.RigidBody;
  public playerCollider: RAPIER.Collider;
  private collidersMap: Map<string, RAPIER.Collider> = new Map();
  private rapier: typeof RAPIER;

  constructor(rapier: typeof RAPIER, startPos: THREE.Vector3) {
    this.rapier = rapier;
    
    // Create world with normal Earth gravity
    const gravity = { x: 0.0, y: -18.0, z: 0.0 }; // slightly higher gravity for tighter responsive game feel
    this.world = new rapier.World(gravity);

    // Create player rigid body (standing upright, locked x/y/z rotation)
    const bodyDesc = rapier.RigidBodyDesc.dynamic()
      .setTranslation(startPos.x, startPos.y, startPos.z)
      .setLinearDamping(0.2)
      .lockRotations();
      
    this.playerBody = this.world.createRigidBody(bodyDesc);

    // Create a capsule collider for the player (height: 2.0, radius: 0.5)
    // Capsule extends from -0.6 to 0.6 on Y axis with radius 0.5
    const colliderDesc = rapier.ColliderDesc.capsule(0.6, 0.45);
    this.playerCollider = this.world.createCollider(colliderDesc, this.playerBody);
  }

  /**
   * Resets player position
   */
  public resetPlayerPosition(pos: THREE.Vector3) {
    this.playerBody.setTranslation({ x: pos.x, y: pos.y, z: pos.z }, true);
    this.playerBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  }

  /**
   * Steps the physics simulation
   */
  public step(deltaTime: number) {
    // Clamp delta time to avoid huge physics jumps if lagging
    const dt = Math.min(deltaTime, 0.03);
    this.world.timestep = dt;
    this.world.step();
  }

  /**
   * Creates of static trimesh collider from a ThreeJS BufferGeometry
   */
  public createStaticTrimeshCollider(id: string, geometry: THREE.BufferGeometry, position: THREE.Vector3, quaternion: THREE.Quaternion, scale: THREE.Vector3) {
    // Clean up old collider with this ID if exists
    this.removeCollider(id);

    // Clone and apply transform to get absolute vertices for static trimesh, OR use local coordinates with body
    const clonedGeom = geometry.clone();
    clonedGeom.scale(scale.x, scale.y, scale.z);
    
    const posAttr = clonedGeom.getAttribute('position');
    const vertices = new Float32Array(posAttr.array);

    let indices: Uint32Array;
    if (clonedGeom.index) {
      indices = new Uint32Array(clonedGeom.index.array);
    } else {
      indices = new Uint32Array(posAttr.count);
      for (let i = 0; i < indices.length; i++) {
        indices[i] = i;
      }
    }

    // Since we baked scale, we create a rigid body at the mesh position/quaternion
    const bodyDesc = this.rapier.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z)
      .setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w });
      
    const rigidBody = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.rapier.ColliderDesc.trimesh(vertices, indices);
    const collider = this.world.createCollider(colliderDesc, rigidBody);

    this.collidersMap.set(id, collider);
  }

  /**
   * Creates a basic static box collider (for platforms, ground)
   */
  public createStaticBoxCollider(id: string, halfExtents: THREE.Vector3, position: THREE.Vector3) {
    this.removeCollider(id);

    const bodyDesc = this.rapier.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z);
      
    const rBody = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.rapier.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z);
    const collider = this.world.createCollider(colliderDesc, rBody);

    this.collidersMap.set(id, collider);
  }

  /**
   * Creates a static solid box collider with custom rotation orientation
   */
  public createStaticRotatedBoxCollider(id: string, halfExtents: THREE.Vector3, position: THREE.Vector3, quaternion: THREE.Quaternion) {
    this.removeCollider(id);

    const bodyDesc = this.rapier.RigidBodyDesc.fixed()
      .setTranslation(position.x, position.y, position.z)
      .setRotation({ x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w });
      
    const rBody = this.world.createRigidBody(bodyDesc);
    const colliderDesc = this.rapier.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z);
    const collider = this.world.createCollider(colliderDesc, rBody);

    this.collidersMap.set(id, collider);
  }

  /**
   * Removes a collider from the physics simulation
   */
  public removeCollider(id: string) {
    const col = this.collidersMap.get(id);
    if (col) {
      const parentBody = col.parent();
      this.world.removeCollider(col, true);
      if (parentBody) {
        this.world.removeRigidBody(parentBody);
      }
      this.collidersMap.delete(id);
    }
  }

  /**
   * Cleans up all colliders in the world except the player
   */
  public clearAllWorld() {
    for (const key of Array.from(this.collidersMap.keys())) {
      this.removeCollider(key);
    }
  }

  /**
   * Move player based on WASD controls + yaw direction
   */
  public updatePlayerMovement(
    controls: { forward: boolean; backward: boolean; left: boolean; right: boolean; jump: boolean },
    fX: number,
    fZ: number,
    moveSpeed: number = 8.5,
    jumpForce: number = 7.5
  ) {
    const vel = this.playerBody.linvel();
    
    let moveX = 0;
    let moveZ = 0;

    // Horizontal right direction (perpendicular to forward)
    const rightX = -fZ;
    const rightZ = fX;

    if (controls.forward) {
      moveX += fX;
      moveZ += fZ;
    }
    if (controls.backward) {
      moveX -= fX;
      moveZ -= fZ;
    }
    if (controls.left) {
      moveX -= rightX;
      moveZ -= rightZ;
    }
    if (controls.right) {
      moveX += rightX;
      moveZ += rightZ;
    }

    // Normalize input vectors
    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX = (moveX / len) * moveSpeed;
      moveZ = (moveZ / len) * moveSpeed;
    }

    // Handle Jumps: can jump if vertical velocity is very low (sitting on floor)
    let finalVy = vel.y;
    if (controls.jump && Math.abs(vel.y) < 0.15) {
      finalVy = jumpForce;
    }

    this.playerBody.setLinvel({ x: moveX, y: finalVy, z: moveZ }, true);
  }

  /**
   * Fetches the player position vector
   */
  public getPlayerPosition(): THREE.Vector3 {
    const translation = this.playerBody.translation();
    return new THREE.Vector3(translation.x, translation.y, translation.z);
  }
}
