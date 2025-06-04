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
  }

  update(game) {
    this.x += this.vx;
    if (this.x < this.xMin || this.x + this.width > this.xMax) {
      this.vx *= -1;
      this.x = Math.max(this.xMin, Math.min(this.x, this.xMax - this.width));
    }
    const p = game.player;
    if (!(p.x + p.width  < this.x ||
          this.x + this.width < p.x ||
          p.y + p.height < this.y ||
          this.y + this.height < p.y)) {
      p.hull = Math.max(0, p.hull - 50);
      return false;
    }
    return true;
  }

  render(ctx, cameraX, cameraY) {
    const sx = this.x - cameraX;
    const sy = this.y - cameraY;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(sx, sy, this.width, this.height);
  }
}

export function initEnemies(terrain, level, blockSize) {
  const rows = terrain.length;
  const cols = terrain[0].length;
  const segments = [];
  for (let y = 10; y < rows; y++) {
    let runStart = null;
    for (let x = 0; x <= cols; x++) {
      const empty = x < cols && !terrain[y][x].exists;
      if (empty && runStart === null) runStart = x;
      if ((!empty || x === cols) && runStart !== null) {
        const runLen = x - runStart;
        if (runLen >= 4) segments.push({ y, start: runStart, end: x - 1 });
        runStart = null;
      }
    }
  }
  const count = 3 + Math.floor(Math.random() * 4);
  const enemies = [];
  for (let i = 0; i < count && segments.length; i++) {
    const seg = segments[Math.floor(Math.random() * segments.length)];
    const xBlock = seg.start + Math.floor(Math.random() * (seg.end - seg.start + 1));
    const speed = 1 + 0.2 * level;
    enemies.push(new Enemy(
      xBlock, seg.y,
      seg.start * blockSize,
      (seg.end + 1) * blockSize,
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
      return true;
    }
  }
  return false;
}
