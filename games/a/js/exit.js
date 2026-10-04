'use strict';

// Πόσο φαίνεται η πόρτα αφού την ακουμπήσει κύμα (δευτ.) και πόσο φωτεινή γίνεται.
const EXIT_REVEAL_TIME = 2;
const EXIT_MAX_ALPHA = 0.75;

const ExitDoor = {
  x: 0,
  y: 0,
  revealTime: -1e6,
  revealStrength: 0,

  reset() {
    this.x = Level.exit.x;
    this.y = Level.exit.y;
    this.revealTime = -1e6;
  },

  // Καλείται από το Echoes: η πόρτα φαίνεται μόνο αν τη "βλέπει" το κύμα.
  onHear(wave, d, los) {
    if (!los) return;
    const now = Echoes.now;
    const s = Echoes.strengthAt(wave, d);
    if (s > this.alpha(now) / EXIT_MAX_ALPHA) {
      this.revealTime = now;
      this.revealStrength = s;
    }
  },

  alpha(now) {
    const age = now - this.revealTime;
    if (age >= EXIT_REVEAL_TIME) return 0;
    return EXIT_MAX_ALPHA * Math.min(1, this.revealStrength * 1.5) * (1 - age / EXIT_REVEAL_TIME);
  },

  reached(p) {
    return Math.hypot(p.x - this.x, p.y - this.y) < TILE * 0.45;
  },

  draw(ctx, now) {
    const a = this.alpha(now);
    if (a < 0.01) return;

    // Η πόρτα μπαίνει στην πλευρά του κελιού που είναι απέναντι από τον διάδρομο.
    // (ix, iy) = η κατεύθυνση προς τον διάδρομο, (ox, oy) = προς τον τοίχο/έξω.
    const { tx, ty } = Level.exit;
    let ox = 0, oy = 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (!Level.isWall(tx + dx, ty + dy)) { ox = -dx; oy = -dy; break; }
    }
    const ix = -ox, iy = -oy;
    const depth = 7;
    const cx = this.x + ox * (TILE / 2 - depth / 2);
    const cy = this.y + oy * (TILE / 2 - depth / 2);
    const w = ox !== 0 ? depth : TILE;
    const h = ox !== 0 ? TILE : depth;
    const flick = 0.92 + 0.08 * Math.sin(now * 3.1) + 0.04 * Math.sin(now * 9);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Το φως της μέρας που χύνεται μέσα στον διάδρομο: κώνος που ανοίγει και σβήνει.
    const reach = TILE * 3.4;
    const tipX = cx + ix * reach, tipY = cy + iy * reach;
    const spread = TILE * 0.85;
    const px = -iy, py = ix;   // κάθετος
    const g = ctx.createLinearGradient(cx, cy, tipX, tipY);
    g.addColorStop(0, `rgba(255,236,190,${(a * 0.5 * flick).toFixed(3)})`);
    g.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx + px * TILE * 0.4, cy + py * TILE * 0.4);
    ctx.lineTo(tipX + px * spread, tipY + py * spread);
    ctx.lineTo(tipX - px * spread, tipY - py * spread);
    ctx.lineTo(cx - px * TILE * 0.4, cy - py * TILE * 0.4);
    ctx.closePath();
    ctx.fill();

    // Ακτίνες μέσα στον κώνο.
    ctx.strokeStyle = `rgba(255,240,200,${(a * 0.16 * flick).toFixed(3)})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (const k of [-0.6, -0.2, 0.25, 0.65]) {
      ctx.moveTo(cx + px * k * TILE * 0.35, cy + py * k * TILE * 0.35);
      ctx.lineTo(tipX + px * k * spread * 0.9, tipY + py * k * spread * 0.9);
    }
    ctx.stroke();

    // Το ίδιο το άνοιγμα: φωτεινό, με ζεστή λάμψη γύρω του.
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, TILE * 1.1);
    glow.addColorStop(0, `rgba(255,240,205,${(a * 0.8 * flick).toFixed(3)})`);
    glow.addColorStop(0.4, `rgba(255,200,130,${(a * 0.3).toFixed(3)})`);
    glow.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE * 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = `rgba(255,236,190,${(a * 0.9).toFixed(3)})`;
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
    // Πλαίσιο πηλού και μαίανδρος στο κατώφλι.
    ctx.strokeStyle = `rgba(${POT.terra},${a.toFixed(3)})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - w / 2 - 1, cy - h / 2 - 1, w + 2, h + 2);
    if (ox !== 0) {
      Pottery.meander(ctx, cx - ox * 9 - 5, cy - TILE / 2 + 2, 10, TILE - 4, POT.terra, a * 0.6, 1);
    } else {
      Pottery.meander(ctx, cx - TILE / 2 + 2, cy - oy * 9 - 5, TILE - 4, 10, POT.terra, a * 0.6, 1);
    }
  },
};
