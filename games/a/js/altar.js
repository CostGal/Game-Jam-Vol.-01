'use strict';

// Βωμοί (checkpoints): ένας στην αρχή κάθε κεφαλαίου, με σβηστή φλόγα.
// Αν τον φτάσεις, η φλόγα ανάβει και η πρόοδος αποθηκεύεται.
// Ο σβηστός βωμός φαίνεται μόνο όταν τον ακουμπήσει κύμα· ο αναμμένος
// καίει πάντα — η μόνη μόνιμη φωτιά μέσα στο σκοτάδι.
const ALTAR_REACH = TILE * 0.55;
const ALTAR_REVEAL_TIME = 2;
const BRAZIER_SIZE = 20;      // ύψος του τρίποδα σε μονάδες κόσμου

const Altars = {
  list: [],   // { x, y, lit, revealTime, revealStrength, litAt }

  // litUpTo: οι βωμοί με δείκτη <= litUpTo είναι ήδη αναμμένοι (από το save).
  reset(litUpTo) {
    this.list = Level.altars.map((a, i) => ({
      x: a.x, y: a.y, lit: i <= litUpTo,
      revealTime: -1e6, revealStrength: 0, litAt: -1e6,
      // Για το Echoes.listeners: κάθε βωμός "βλέπει" τα κύματα.
      onHear(wave, d, los) {
        if (!los) return;
        const s = Echoes.strengthAt(wave, d);
        const left = this.revealStrength * Math.max(0, 1 - (Echoes.now - this.revealTime) / ALTAR_REVEAL_TIME);
        if (s < left) return;   // ήδη φωτεινότερος από αυτό το κύμα
        this.revealTime = Echoes.now;
        this.revealStrength = s;
      },
    }));
  },

  // Επιστρέφει τον δείκτη του βωμού που μόλις άναψε, ή -1.
  check(p, now) {
    for (let i = 0; i < this.list.length; i++) {
      const a = this.list[i];
      if (a.lit) continue;
      if (Math.hypot(p.x - a.x, p.y - a.y) < ALTAR_REACH) {
        a.lit = true;
        a.litAt = now;
        return i;
      }
    }
    return -1;
  },

  draw(ctx, now, view) {
    for (const a of this.list) {
      if (a.x < view.x0 - TILE * 3 || a.x > view.x1 + TILE * 3 ||
          a.y < view.y0 - TILE * 3 || a.y > view.y1 + TILE * 3) continue;

      let stone = 0;
      const age = now - a.revealTime;
      if (age < ALTAR_REVEAL_TIME) stone = Math.min(1, 0.3 + a.revealStrength) * (1 - age / ALTAR_REVEAL_TIME);

      const baseY = a.y + 7;                     // εκεί που πατάνε τα πόδια του τρίποδα
      const bowlY = baseY - BRAZIER_SIZE * 0.6;  // το χείλος της λεκάνης
      let flicker = 1, burst = 0;

      if (a.lit) {
        // Το φως της φλόγας στον χώρο: τρέμει σαν αληθινή φωτιά (πολλές συχνότητες).
        flicker = 0.82 + 0.1 * Math.sin(now * 13 + a.x) + 0.08 * Math.sin(now * 5.3 + a.y * 0.3);
        burst = Math.max(0, 1 - (now - a.litAt) / 1.4);    // λάμψη τη στιγμή που ανάβει
        const r = TILE * (2.1 + burst * 2.6) * flicker;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(a.x, bowlY, 0, a.x, bowlY, r);
        g.addColorStop(0, `rgba(255,170,80,${(0.32 * flicker + 0.4 * burst).toFixed(3)})`);
        g.addColorStop(0.45, `rgba(236,120,50,${(0.1 * flicker).toFixed(3)})`);
        g.addColorStop(1, 'rgba(206,90,40,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(a.x, bowlY, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        stone = Math.max(stone, 0.6);
      }

      if (stone > 0.01) Pottery.brazier(ctx, a.x, baseY, BRAZIER_SIZE, stone);

      if (a.lit) this.drawFlame(ctx, a.x, bowlY, now, flicker, a.x);
    }
  },

  // Η φλόγα: τρεις γλώσσες φωτιάς η μία μέσα στην άλλη, με διαφορετικό ρυθμό,
  // και σπίθες που ανεβαίνουν και σβήνουν.
  drawFlame(ctx, x, y, now, flicker, seed) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const tongues = [
      { w: 6.5, h: 15, col: '236,110,40', a: 0.85, sp: 1 },
      { w: 4.6, h: 11.5, col: '255,170,70', a: 0.9, sp: 1.3 },
      { w: 2.6, h: 7.5, col: '255,232,160', a: 0.95, sp: 1.7 },
    ];
    for (const f of tongues) {
      const t = now * 9 * f.sp + seed;
      const h = f.h * (0.86 + 0.14 * Math.sin(t) * flicker + 0.08 * Math.sin(t * 2.3));
      const lean = Math.sin(t * 0.7) * 1.8 + Math.sin(t * 1.9) * 0.9;
      const g = ctx.createLinearGradient(x, y, x, y - h);
      g.addColorStop(0, `rgba(${f.col},${f.a})`);
      g.addColorStop(1, `rgba(${f.col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - f.w, y);
      ctx.bezierCurveTo(x - f.w * 1.1, y - h * 0.45, x + lean * 0.4 - f.w * 0.3, y - h * 0.7, x + lean, y - h);
      ctx.bezierCurveTo(x + lean * 0.4 + f.w * 0.3, y - h * 0.7, x + f.w * 1.1, y - h * 0.45, x + f.w, y);
      ctx.closePath();
      ctx.fill();
    }
    // Σπίθες (χωρίς κατάσταση: η θέση προκύπτει από τον χρόνο).
    for (let i = 0; i < 9; i++) {
      const life = (now * 0.55 + i * 0.211 + seed * 0.01) % 1;
      const px = x + Math.sin(i * 7.3 + now * 1.4 + seed) * (2 + life * 8);
      const py = y - 6 - life * 34;
      ctx.fillStyle = `rgba(255,200,110,${((1 - life) * 0.8).toFixed(3)})`;
      ctx.fillRect(px, py, 1.2, 1.2);
    }
    ctx.restore();
  },
};
