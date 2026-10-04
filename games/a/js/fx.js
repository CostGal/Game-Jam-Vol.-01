'use strict';

// Ατμόσφαιρα: σκόνη στον αέρα που φαίνεται μόνο εκεί που φτάνει φως (ήχου ή φλόγας),
// και το animated φόντο του μενού.
const MOTE_COUNT = 90;

const Fx = {
  motes: [],
  ready: false,

  // Τα σωματίδια ζουν γύρω από την κάμερα και "τυλίγονται" όταν βγουν από το πλαίσιο.
  update(dt, cam, halfW, halfH) {
    const mw = halfW + 40, mh = halfH + 40;
    if (!this.ready) {
      for (let i = 0; i < MOTE_COUNT; i++) {
        this.motes.push({
          x: cam.x + (Math.random() * 2 - 1) * mw, y: cam.y + (Math.random() * 2 - 1) * mh,
          vx: (Math.random() - 0.5) * 3, vy: -1 - Math.random() * 3.5,
          ph: Math.random() * 6.28, sz: 0.8 + Math.random() * 1.1,
        });
      }
      this.ready = true;
    }
    for (const m of this.motes) {
      m.ph += dt * 0.9;
      m.x += (m.vx + Math.sin(m.ph) * 2.2) * dt;
      m.y += m.vy * dt;
      if (m.x < cam.x - mw) m.x += mw * 2; else if (m.x > cam.x + mw) m.x -= mw * 2;
      if (m.y < cam.y - mh) m.y += mh * 2; else if (m.y > cam.y + mh) m.y -= mh * 2;
    }
  },

  // Πόσο φως πέφτει σε ένα σημείο: από τα κύματα και από τους αναμμένους βωμούς.
  light(x, y) {
    let l = Echoes.lightAt(x, y);
    for (const a of Altars.list) {
      if (!a.lit) continue;
      const d = Math.hypot(x - a.x, y - a.y);
      if (d < 130) l += (1 - d / 130) * 0.8;
    }
    return l;
  },

  drawMotes(ctx, now) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      const l = this.light(m.x, m.y);
      if (l < 0.03) continue;
      const tw = 0.6 + 0.4 * Math.sin(now * 3 + m.ph * 4);
      ctx.fillStyle = `rgba(${POT.light},${Math.min(0.85, l * 0.9 * tw).toFixed(3)})`;
      ctx.fillRect(m.x, m.y, m.sz * 1.8, m.sz * 1.8);   // ~1 art pixel
    }
    ctx.restore();
  },

  // Φόντο του μενού: μια μικρή σκηνή σε pixel art, σαν ζωφόρος αγγείου μέσα σε πλαίσιο με
  // μαιάνδρους — ο Ορφέας παίζει τη λύρα, κύματα ήχου απλώνονται στο σκοτάδι, και όταν
  // φτάνουν στη σκιά που πλησιάζει, αυτή φαίνεται για λίγο (όπως στο παιχνίδι). Πίσω του,
  // αχνή, η Ευρυδίκη. Από κάτω σπίθες που ανεβαίνουν.
  // box = πού μπαίνει η σκηνή (art pixels): ο χώρος #menu-art του μενού, ή null (καμία σκηνή).
  drawMenu(ctx, w, h, t, box) {
    if (box) this.drawMenuScene(ctx, t, box);
    this.drawSparks(ctx, w, h, t);
  },

  drawMenuScene(ctx, t, box) {
    const pw = Math.round(box.w), ph = Math.round(box.h) - 12;
    const x0 = Math.round(box.x), y0 = Math.round(box.y) + 10;
    // Μέγεθος των sprites: όσο χωράει σε ύψος, και ώστε να χωράνε οι τρεις μορφές σε πλάτος.
    const K = Math.max(1, Math.min(3, Math.floor((ph - 4) / 28), Math.floor(pw / 70)));
    const ground = y0 + ph - 8 * K;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, y0, pw, ph);
    ctx.clip();

    // Δάπεδο από σκούρα πήλινα πλακάκια, που φωτίζονται λίγο όταν περνάει το κύμα.
    const ox = x0 + Math.round(pw * 0.4);      // ο Ορφέας
    const sx = x0 + pw - 14 * K;               // η σκιά
    const period = 2.4, age = t % period, ringR = age * pw * 0.45;
    const tile = 6 * K;
    for (let x = x0; x < x0 + pw; x += tile) {
      const d = Math.abs(x + tile / 2 - ox);
      const lit = Math.max(0, 1 - Math.abs(d - ringR) / (pw * 0.15)) * (1 - age / period);
      ctx.fillStyle = `rgba(92,48,28,${(0.25 + 0.55 * lit).toFixed(3)})`;
      ctx.fillRect(x, ground, tile - 1, 3 * K);
      ctx.fillRect(x + tile / 2, ground + 4 * K, tile - 1, 3 * K);
    }

    // Κύματα ήχου από τη λύρα.
    for (let k = 0; k < 2; k++) {
      const a2 = (t + k * period / 2) % period;
      const r = a2 * pw * 0.45;
      ctx.strokeStyle = `rgba(${POT.light},${(0.55 * (1 - a2 / period)).toFixed(3)})`;
      ctx.lineWidth = K;
      ctx.beginPath();
      ctx.arc(ox + 4 * K, ground - 10 * K, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Η Ευρυδίκη, αχνή πίσω του.
    const ex = ox - 19 * K;
    const glow = ctx.createRadialGradient(ex, ground - 9 * K, 0, ex, ground - 9 * K, 16 * K);
    glow.addColorStop(0, `rgba(${POT.cream},0.18)`);
    glow.addColorStop(1, `rgba(${POT.cream},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(ex - 16 * K, ground - 25 * K, 32 * K, 32 * K);
    Sprites.blit(ctx, 'eurydice', 1, ex, ground, { scale: K, alpha: 0.4 + 0.1 * Math.sin(t * 2) });

    // Ο Ορφέας παίζει τη λύρα.
    Sprites.blit(ctx, 'orpheus_play_3', Math.floor(t * 4), ox, ground, { scale: K });

    // Η σκιά: φαίνεται μόνο όταν τη φτάσει το κύμα, και μετά σβήνει.
    const hitAge = (age - (sx - ox) / (pw * 0.45) + period) % period;
    const sa = hitAge < 1.3 ? 1 - hitAge / 1.3 : 0;
    if (sa > 0.02) {
      const g2 = ctx.createRadialGradient(sx, ground - 8 * K, 0, sx, ground - 8 * K, 14 * K);
      g2.addColorStop(0, `rgba(${POT.red},${(0.4 * sa).toFixed(3)})`);
      g2.addColorStop(1, `rgba(${POT.red},0)`);
      ctx.fillStyle = g2;
      ctx.fillRect(sx - 14 * K, ground - 22 * K, 28 * K, 28 * K);
      const r = Sprites.blit(ctx, 'shade', 0, sx, ground, { scale: K, flip: true, alpha: sa });
      Sprites.blit(ctx, 'iconHear', 0, sx, r.y - 2 * K, { scale: K, alpha: sa * (0.6 + 0.4 * Math.sin(t * 10)) });
    }
    ctx.restore();

    // Πλαίσιο: γραμμή πηλού με μαίανδρο από πάνω, σαν τη ζώνη ενός αγγείου (από κάτω
    // ακολουθεί ο μαίανδρος του τίτλου).
    ctx.strokeStyle = `rgba(${POT.terra},0.7)`;
    ctx.lineWidth = 1;
    ctx.strokeRect(x0 - 0.5, y0 - 0.5, pw + 1, ph + 1);
    Pottery.meander(ctx, x0, y0 - 9, pw, 7, POT.terra, 0.8, 1);
  },

  // Σπίθες που ανεβαίνουν.
  drawSparks(ctx, w, h, t) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 28; i++) {
      const life = (t * 0.12 + i * 0.137) % 1;
      const x = (i * 97.3 + Math.sin(t * 0.7 + i) * 18) % w;
      const y = h * (1.05 - life * 1.15);
      ctx.fillStyle = `rgba(${POT.light},${(Math.sin(life * Math.PI) * 0.5).toFixed(3)})`;
      ctx.fillRect(x < 0 ? x + w : x, y, 1.6, 1.6);
    }
    ctx.restore();
  },
};
