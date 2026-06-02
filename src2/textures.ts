import * as THREE from 'three';

/**
 * Procedural texture generator for high-fidelity realistic materials
 */

export function createConcreteTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base concrete color (warm gray)
  ctx.fillStyle = '#656360';
  ctx.fillRect(0, 0, 1024, 1024);

  // Add noise and cement speckles
  for (let i = 0; i < 50000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const size = Math.random() * 2 + 1;
    const opacity = Math.random() * 0.15;
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`;
    ctx.fillRect(x, y, size, size);
  }

  // Draw expansion joint lines (slab panels)
  ctx.strokeStyle = 'rgba(20, 20, 20, 0.4)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  // Draw cross patterns to simulate cast panels
  ctx.moveTo(512, 0);
  ctx.lineTo(512, 1024);
  ctx.moveTo(0, 512);
  ctx.lineTo(1024, 512);
  ctx.stroke();

  // Add panel screw holes at the corners
  const drawHole = (hx: number, hy: number) => {
    ctx.fillStyle = '#2d2b29';
    ctx.beginPath();
    ctx.arc(hx, hy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8c8a86';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hx, hy, 14, 0, Math.PI * 2);
    ctx.stroke();
  };

  const pad = 48;
  const offsets = [pad, 512 + pad, 1024 - pad];
  for (const ox of offsets) {
    for (const oy of offsets) {
      if (ox !== 512 && oy !== 512) {
        drawHole(ox, oy);
      }
    }
  }

  // Draw some subtle cracks
  ctx.strokeStyle = 'rgba(25, 24, 23, 0.25)';
  ctx.lineWidth = 2;
  for (let k = 0; k < 3; k++) {
    let px = Math.random() * 1024;
    let py = Math.random() * 1024;
    ctx.beginPath();
    ctx.moveTo(px, py);
    for (let s = 0; s < 5; s++) {
      px += (Math.random() - 0.5) * 80;
      py += (Math.random() - 0.3) * 60; // tilt down
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

export function createBumpyConcreteNormal(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base standard neutral normal map color
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, 512, 512);

  // Add tiny gradient bumps
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 3 + 1;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const rX = Math.floor(128 + (Math.random() - 0.5) * 40);
    const gY = Math.floor(128 + (Math.random() - 0.5) * 40);
    grad.addColorStop(0, `rgb(${rX}, ${gY}, 255)`);
    grad.addColorStop(1, '#8080ff');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createMetalGridTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base steel dark grey
  ctx.fillStyle = '#22252a';
  ctx.fillRect(0, 0, 512, 512);

  // Grid mesh lines
  ctx.strokeStyle = '#434a54';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 512; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Rivets/nuts at grid intersection
  ctx.fillStyle = '#101214';
  for (let x = 0; x <= 512; x += 128) {
    for (let y = 0; y <= 512; y += 128) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createWoodPlankTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Warm wood base brown
  ctx.fillStyle = '#8a5a36';
  ctx.fillRect(0, 0, 512, 512);

  // Render planks
  const plankHeight = 64;
  for (let y = 0; y < 512; y += plankHeight) {
    // Fill slightly different shades of brown for wood variance
    const shade = (Math.random() - 0.5) * 20;
    ctx.fillStyle = `rgb(${138 + shade}, ${90 + shade * 0.7}, ${54 + shade * 0.5})`;
    ctx.fillRect(0, y, 512, plankHeight - 4);

    // Draw dark gap separating planks
    ctx.fillStyle = '#3d2512';
    ctx.fillRect(0, y + plankHeight - 4, 512, 4);

    // Draw woodgrain lines within each plank
    ctx.strokeStyle = 'rgba(60, 36, 18, 0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) {
      const gy = y + Math.random() * (plankHeight - 12);
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(128, gy + (Math.random() - 0.5) * 15, 384, gy + (Math.random() - 0.5) * 15, 512, gy);
      ctx.stroke();
    }

    // Add wood knot details
    if (Math.random() > 0.4) {
      const kx = Math.random() * 400 + 50;
      const ky = y + Math.random() * (plankHeight - 16);
      ctx.fillStyle = 'rgba(50, 30, 15, 0.4)';
      ctx.beginPath();
      ctx.ellipse(kx, ky, 15, 6, Math.random() * 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function createWarningStripesTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f6c31a'; // bright gold warning yellow
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#1e2022'; // deep grey-black
  const stripeW = 32;
  ctx.beginPath();
  for (let i = -128; i < 256; i += stripeW * 2) {
    ctx.moveTo(i, 0);
    ctx.lineTo(i + stripeW, 0);
    ctx.lineTo(i + stripeW + 128, 256);
    ctx.lineTo(i + 128, 256);
    ctx.closePath();
  }
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

/**
 * Creates dynamic glowing textures for PC output screens
 */
export function createMonitorTexture(stageName: string, activeItemDesc: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Retro cyber terminal theme
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, 512, 512);

  // Grid line scanlines
  ctx.fillStyle = 'rgba(24, 43, 73, 0.5)';
  for (let y = 0; y < 512; y += 4) {
    ctx.fillRect(0, y, 512, 1);
  }

  // Draw frame / corners
  ctx.strokeStyle = '#00ffcc';
  ctx.lineWidth = 4;
  ctx.strokeRect(16, 16, 512 - 32, 512 - 32);

  // Glowing status header
  ctx.fillStyle = 'rgba(0, 255, 204, 0.15)';
  ctx.fillRect(20, 20, 512 - 40, 50);

  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#00ffcc';
  ctx.textBaseline = 'middle';
  ctx.fillText('CRITICAL FEED: ONLINE', 40, 45);

  // Monitor text info
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px monospace';
  ctx.fillText(`TRANSITION PORTAL: ACTIVE`, 40, 110);

  ctx.fillStyle = '#8ab4f8';
  ctx.fillText(`TARGET DEST: ${stageName}`, 40, 150);

  // Draw a styled live camera schematic or portal wireframe
  ctx.strokeStyle = '#8ab4f8';
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 190, 512 - 128, 180);

  // Draw some floating concentric rings to make it look highly digital/rendered!
  ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
  ctx.beginPath();
  ctx.arc(256, 280, 50, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#ff0033';
  ctx.beginPath();
  ctx.arc(256, 280, 30, 0, Math.PI * 2);
  ctx.stroke();

  // Target lock crosshair
  ctx.strokeStyle = '#00ffcc';
  ctx.beginPath();
  ctx.moveTo(256, 210); ctx.lineTo(256, 350);
  ctx.moveTo(186, 280); ctx.lineTo(326, 280);
  ctx.stroke();

  // Draw alert notifications
  ctx.fillStyle = '#ff3366';
  ctx.font = 'bold 18px monospace';
  ctx.fillText('>> STAND IN FRONT AND CLICK TO DIVE <<', 40, 410);

  ctx.fillStyle = 'rgba(0, 255, 204, 0.7)';
  ctx.font = '16px monospace';
  ctx.fillText(`SYSTEM BUFFER: ${activeItemDesc}`, 40, 450);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
