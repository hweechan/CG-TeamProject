# Product Requirements Document (PRD): Web Viewfinder MVP

## 1. Project Meta & Context
* **Project Name:** Web Viewfinder (Computer Graphics Term Project)
* **Target Deadline:** June 5, 2026
* **Author:** Hweechan Yoo (2024148033)
* **Goal:** A 3D web-based puzzle game prototype inspired by Viewfinder. Players use pre-defined photo items to project them into the 3D world, altering geometry and physics in real-time.
* **Demo Format:** A 2-minute linear playthrough consisting of two stages with a seamless transition effect.

## 2. Technology Stack
* **Engine:** Three.js (Required)
* **Bundler:** Vite
* **Language:** JavaScript / TypeScript
* **Mandatory External Libraries:**
  * **Physics:** `@dimforge/rapier3d-compat` (WASM physics for character and collisions).
  * **CSG (Mesh Slicing):** `three-bvh-csg` (CRITICAL for boolean operations).

## 3. Core Mechanics
1. **FPS Controller:** `PointerLockControls` with Rapier physics handling gravity, walking (WASD), and look-around.
2. **Photo Inventory System:** Instead of real-time capturing (to ensure stability), the player picks up pre-defined "Photo Items" placed in the level. Each photo holds specific texture data and predefined 3D object structural data.
3. **Visual Projection:** Holding a photo renders it on a screen-space Plane. Stamping utilizes Stencil Buffer masking (`gl.stencilMask`, `gl.stencilFunc`) to create a portal illusion, overlaying the photo's world onto the background.
4. **Physical Projection (CSG):** Stamping cuts a frustum out of the existing wall/floor meshes via `three-bvh-csg` (SUBTRACT) and injects the photo's 3D assets (ADD), instantly updating Rapier `Trimesh` colliders.

## 4. Level & Demo Sequence (Two-Stage Architecture)

### Stage 1: The Chasm (Introduction to Addition)
* **Setup:** Player starts on a platform. The exit is across a wide chasm that cannot be crossed by walking or jumping. A "Bridge Photo" item is placed near the starting point.
* **Solution:** Player picks up the photo, faces the chasm, and stamps it. A solid bridge mesh with a physical collider is generated, allowing the player to cross.
* **Stage Exit:** At the end of Stage 1, there is an in-game PC Monitor showing a live feed of Stage 2.

### Stage Transition: Monitor Immersion Effect
* **Trigger:** When the player approaches the PC Monitor and interacts with it (or enters its bounding box).
* **Visuals:** The player's movement locks. The camera smoothly interpolates (zooms in) toward the monitor screen until the Stage 2 feed fills 100% of the viewport.
* **Logic:** Transition the active Three.js scene from Stage 1 to Stage 2 seamlessly, resetting the player's position to Stage 2's start point just as the zoom completes.

### Stage 2: The Double Obstacle (Addition & Subtraction)
* **Setup:** A large room with two blockers: a massive wall blocking the path, and an exit door located on a high, unreachable platform. A "Corridor/Ramp Photo" item is provided.
* **Solution:** 1. The player uses the photo on the massive wall: the CSG `SUBTRACT` operation cuts a hole through the wall, creating a path.
  2. The player rotates the photo (using Q/E or Mouse Wheel) to tilt the corridor asset into a 45-degree ramp, then stamps it against the high platform to walk up and reach the final exit.

## 5. Implementation Phases
*AI Instruction: Execute one phase at a time. Stop and ask for approval after finishing each phase.*
* **Phase 1:** Vite project init with Three.js, Rapier physics, and FPS controller.
* **Phase 2:** Design Stage 1 environment (chasm, exit monitor) and Stage 2 environment (blocked wall, high platform).
* **Phase 3:** Implement Stage Transition effect (Camera zoom into the monitor texture, scene swapping).
* **Phase 4:** Implement the Photo Projection System (Stencil buffer visual masking).
* **Phase 5:** Implement `three-bvh-csg` integration (Cutting walls, spawning meshes, updating Rapier colliders).