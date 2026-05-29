import * as THREE from 'three';

const MOVE_SPEED = 8;
const JUMP_VELOCITY = 10;
const GRAVITY = 30;
const MOUSE_SENSITIVITY = 0.002;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.3;
const PLAYER_HALF_HEIGHT = PLAYER_HEIGHT / 2 - PLAYER_RADIUS;

export class FPSController {
  constructor(camera, physicsWorld, RAPIER, domElement) {
    this.camera = camera;
    this.physicsWorld = physicsWorld;
    this.RAPIER = RAPIER;
    this.domElement = domElement;
    this.enabled = false;

    this.yaw = 0;
    this.pitch = 0;
    this.verticalVelocity = 0;
    this.inputDir = new THREE.Vector3();
    this.keys = {};

    this.spawnPos = { x: 0, y: 2, z: 10 };

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(this.spawnPos.x, this.spawnPos.y, this.spawnPos.z);
    this.body = physicsWorld.createRigidBody(bodyDesc);

    const colliderDesc = RAPIER.ColliderDesc.capsule(PLAYER_HALF_HEIGHT, PLAYER_RADIUS);
    this.collider = physicsWorld.createCollider(colliderDesc, this.body);

    this.characterController = physicsWorld.createCharacterController(0.02);
    this.characterController.enableAutostep(0.3, 0.2, true);
    this.characterController.enableSnapToGround(0.3);
    this.characterController.setSlideEnabled(true);
    this.characterController.setMaxSlopeClimbAngle(50 * (Math.PI / 180));

    const camOffset = PLAYER_HEIGHT / 2 - 0.15;
    this.camera.position.set(this.spawnPos.x, this.spawnPos.y + camOffset, this.spawnPos.z);

    document.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
    document.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    document.addEventListener('mousemove', (e) => this._onMouseMove(e));
  }

  _onMouseMove(event) {
    if (!this.enabled) return;

    this.yaw -= event.movementX * MOUSE_SENSITIVITY;
    this.pitch -= event.movementY * MOUSE_SENSITIVITY;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
  }

  update(delta) {
    if (!this.enabled) return;

    const pos = this.body.translation();
    if (pos.y < -10) {
      this.body.setNextKinematicTranslation(this.spawnPos);
      this.verticalVelocity = 0;
      const camOffset = PLAYER_HEIGHT / 2 - 0.15;
      this.camera.position.set(this.spawnPos.x, this.spawnPos.y + camOffset, this.spawnPos.z);
      return;
    }

    const grounded = this.characterController.computedGrounded();

    this.inputDir.set(0, 0, 0);
    if (this.keys['KeyW'] || this.keys['ArrowUp']) this.inputDir.z += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) this.inputDir.z -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.inputDir.x -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.inputDir.x += 1;

    if (this.inputDir.lengthSq() > 0) {
      this.inputDir.normalize();
    }

    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);
    const yawQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      this.yaw
    );
    forward.applyQuaternion(yawQuat);
    right.applyQuaternion(yawQuat);

    const moveDir = new THREE.Vector3();
    moveDir.addScaledVector(right, this.inputDir.x);
    moveDir.addScaledVector(forward, this.inputDir.z);

    if (grounded) {
      if (this.verticalVelocity < 0) this.verticalVelocity = 0;
      if (this.keys['Space']) {
        this.verticalVelocity = JUMP_VELOCITY;
      }
    } else {
      this.verticalVelocity -= GRAVITY * delta;
    }

    const desiredMovement = new this.RAPIER.Vector3(
      moveDir.x * MOVE_SPEED * delta,
      this.verticalVelocity * delta,
      moveDir.z * MOVE_SPEED * delta
    );

    this.characterController.computeColliderMovement(this.collider, desiredMovement);

    const corrected = this.characterController.computedMovement();
    const curPos = this.body.translation();
    const newPos = {
      x: curPos.x + corrected.x,
      y: curPos.y + corrected.y,
      z: curPos.z + corrected.z,
    };

    this.body.setNextKinematicTranslation(newPos);

    if (this.verticalVelocity < 0 && Math.abs(corrected.y) < 0.001) {
      this.verticalVelocity = 0;
    }

    const camOffset = PLAYER_HEIGHT / 2 - 0.15;
    this.camera.position.set(newPos.x, newPos.y + camOffset, newPos.z);

    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  teleport(x, y, z) {
    this.body.setNextKinematicTranslation({ x, y, z });
    this.verticalVelocity = 0;
    this.yaw = 0;
    this.pitch = 0;
    const camOffset = PLAYER_HEIGHT / 2 - 0.15;
    this.camera.position.set(x, y + camOffset, z);
    this.camera.quaternion.setFromEuler(new THREE.Euler(0, 0, 0, 'YXZ'));
  }

  offsetTeleport(dx, dy, dz) {
    const camOffset = PLAYER_HEIGHT / 2 - 0.15;
    const newX = this.camera.position.x + dx;
    const newY = this.camera.position.y + dy;
    const newZ = this.camera.position.z + dz;
    this.body.setNextKinematicTranslation({ x: newX, y: newY - camOffset, z: newZ });
    this.camera.position.set(newX, newY, newZ);
  }
}
