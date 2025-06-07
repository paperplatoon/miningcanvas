// enemies.js



export class Enemy {
  constructor(xBlock, yBlock, xMin, xMax, speed, blockSize) {
    this.blockSize = blockSize;
    this.width = blockSize;
    this.height = blockSize;
    this.xMin = xMin;
    this.xMax = xMax;
    this.x = xBlock * blockSize;
    this.y = yBlock * blockSize;
    this.vx = speed;
    this.damage = 50;
  }

  update(game) {
    this.x += this.vx;
    const blockX = Math.floor((this.x + (this.vx > 0 ? this.width : -1)) / this.blockSize);
    const blockY = Math.floor(this.y / this.blockSize);
    const hitBlock = game.terrain[blockY] && game.terrain[blockY][blockX];

    if (hitBlock && hitBlock.exists) {
    this.vx *= -1;
    this.x += this.vx; // back off to avoid sticking
    }
    const p = game.player;
    if (!(p.x + p.width  < this.x ||
        this.x + this.width < p.x ||
        p.y + p.height < this.y ||
        this.y + this.height < p.y)) {
    
    const now = performance.now();
    if (now - p.lastHitTime >= 1500) { // 1.5 seconds
      p.hull = Math.max(0, p.hull - 50);
      p.lastHitTime = now;
    }
    
    return true;
  }  
    return true;
  }

  render(ctx, cameraX, cameraY) {
    const sx = this.x - cameraX;
    const sy = this.y - cameraY;
    const img = window.SPRITE_IMAGES.enemy;
    if (img) {
      ctx.drawImage(img, sx, sy, this.width, this.height);
    } else {                      // fallback while loading
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(sx, sy, this.width, this.height);
    }
  }
}

export function initEnemies(terrain, level, blockSize, enemyCount) {
  const rows = terrain.length;
  const cols = terrain[0].length;
  const enemies = [];
  
  for (let i = 0; i < enemyCount; i++) {
    // Pick a random row in the upper area (1-9 to avoid very top and solid terrain)
    const y = 10 + Math.floor(Math.random() * (terrain.length-10));
    
    // Pick tunnel length (3-5 blocks)
    const tunnelLength = 3 + Math.floor(Math.random() * 3);
    const maxStartX = cols - tunnelLength;
    if (maxStartX <= 0) continue; // Skip if world too narrow
    
    let startX = Math.floor(Math.random() * maxStartX);
    
    // Avoid shop area (rows 4-5, x 0-1) - shift tunnel if needed
    if (y >= 4 && y <= 5 && startX < 3) {
      startX = Math.max(3, startX);
      if (startX + tunnelLength > cols) continue; // Skip if doesn't fit
    }
    
    // Create the tunnel by clearing blocks
    for (let x = startX; x < startX + tunnelLength; x++) {
      if (x >= 0 && x < cols) {
        terrain[y][x] = { type: 'air', exists: false };
      }
    }
    
    // Place the enemy in the center of the tunnel
    const enemyX = startX + Math.floor(tunnelLength / 2);
    const speed = 2 + 0.3 * level;
    enemies.push(new Enemy(
      enemyX, y,
      startX * blockSize,
      (startX + tunnelLength) * blockSize,
      speed,
      blockSize
    ));
  }
  
  return enemies;
}

export function updateEnemies(game) {
  const remain = [];
  for (let e of game.enemies) {
    if (e.update(game)) remain.push(e);
  }
  game.enemies = remain;
}

export function renderEnemies(game, ctx) {
  for (let e of game.enemies) {
    e.render(ctx, game.camera.x, game.camera.y);
  }
}

export function checkLaserEnemyCollision(game, laser) {
  for (let i = 0; i < game.enemies.length; i++) {
    const e = game.enemies[i];
    if (!(laser.x + 2 > e.x + e.width ||
          e.x > laser.x + 2 ||
          laser.y + 2 > e.y + e.height ||
          e.y > laser.y + 2)) {
      game.enemies.splice(i,1);
      game.score += 50;
      return true;
    }
  }
  return false;
}