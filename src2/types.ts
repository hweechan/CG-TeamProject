/**
 * Types and interfaces for the Web Viewfinder game.
 */

export enum StageId {
  STAGE_1 = 1,
  STAGE_2 = 2,
}

export interface PhotoItem {
  id: string;
  name: string;
  description: string;
  // Type of asset contained in the photo
  assetType: 'bridge' | 'ramp_corridor';
  thumbnailUrl: string;
  // Pre-defined offset / scale for placement
  scale: [number, number, number];
  rotation: [number, number, number];
}

export interface GameState {
  currentStage: StageId;
  inventory: PhotoItem | null;
  selectedPhoto: PhotoItem | null;
  heldPhotoRotation: number; // in radians or degrees (yaw/pitch/roll)
  isPointerLocked: boolean;
  stageTransitioning: boolean;
  gameCleared: boolean;
  playerHasKey: boolean;
  isCollidingWithMonitor: boolean;
}

export interface ControlsState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
}
