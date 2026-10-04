'use strict';

// Αγγείο σπονδής (αντικαθιστά το παλιό δόλωμα): πετιέται προς την κατεύθυνση
// που κινείσαι, ταξιδεύει λίγο, και μόλις σταματήσει (τοίχος ή τριβή) σπάει
// με έναν δυνατό ήχο. Οι σκιές τον ακούνε και πάνε εκεί.
const JAR_RADIUS = 4;
const JAR_SPEED = 300;           // αρχική ταχύτητα ρίψης
const JAR_FRICTION = 360;        // επιβράδυνση → ταξιδεύει ~3 κελιά
const JAR_WAVE = { radius: 460, strength: 1 };
const JAR_SHARDS_TIME = 1.2;     // πόσο φαίνονται τα θραύσματα

const Jars = {
  items: [],      // αγγεία στον αέρα ή σπασμένα
  left: 0,        // πόσα κρατάει ο παίκτης

  reset(count) {
    this.items = [];
    this.left = count;
  },

  // Πέταγμα από (x, y) προς την κατεύθυνση (dx, dy) (μοναδιαίο διάνυσμα).
  throw(x, y, dx, dy) {
    if (this.left <= 0) return false;
    this.left--;
    this.items.push({
      x, y, r: JAR_RADIUS,
      vx: dx * JAR_SPEED, vy: dy * JAR_SPEED,
      spin: 0, brokenAt: -1, shards: null,
    });
    return true;
  },

  shatter(it, now) {
    it.brokenAt = now;
    it.vx = it.vy = 0;
    it.shards = [];
    for (let i = 0; i < 9; i++) {
      const ang = Math.random() * Math.PI * 2, sp = 20 + Math.random() * 45;
      it.shards.push({ ang, sp, rot: Math.random() * 6 });
    }
    Echoes.emit(it.x, it.y, JAR_WAVE.radius, JAR_WAVE.strength, 'jar');
    Sound.shatter(it.x, it.y);
  },

  update(dt, now) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.brokenAt >= 0) {
        if (now - it.brokenAt > JAR_SHARDS_TIME) this.items.splice(i, 1);
        continue;
      }

      const speed = Math.hypot(it.vx, it.vy);
      let hit = false;
      // Μικρά βήματα ώστε να μην περνάει μέσα από τοίχους.
      const steps = Math.max(1, Math.ceil((speed * dt) / (JAR_RADIUS * 0.8)));
      for (let s = 0; s < steps && !hit; s++) {
        it.x += (it.vx * dt) / steps;
        it.y += (it.vy * dt) / steps;
        hit = Level.pushOutOfWalls(it);
      }
      it.spin += dt * 12;
      const k = Math.max(0, speed - JAR_FRICTION * dt) / Math.max(speed, 1e-6);
      it.vx *= k;
      it.vy *= k;

      if (hit || Math.hypot(it.vx, it.vy) < 5) this.shatter(it, now);
    }
  },

  draw(ctx, now) {
    for (const it of this.items) {
      if (it.brokenAt < 0) {
        // Στον αέρα: ένα μικρό αγγείο που γυρίζει.
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(it.spin);
        ctx.strokeStyle = `rgba(${POT.terra},0.85)`;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.ellipse(0, 1, 3.5, 4.5, 0, 0, Math.PI * 2);
        ctx.moveTo(-1.5, -3.5);
        ctx.lineTo(-1.5, -6);
        ctx.moveTo(1.5, -3.5);
        ctx.lineTo(1.5, -6);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      // Σπασμένο: θραύσματα που σκορπίζουν και σβήνουν.
      const t = (now - it.brokenAt) / JAR_SHARDS_TIME;
      const a = Math.max(0, 1 - t);
      const spread = 1 - Math.pow(1 - Math.min(1, t * 2.5), 3);
      ctx.strokeStyle = `rgba(${POT.terra},${a.toFixed(3)})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const s of it.shards) {
        const px = it.x + Math.cos(s.ang) * s.sp * spread * 0.4;
        const py = it.y + Math.sin(s.ang) * s.sp * spread * 0.4;
        ctx.moveTo(px - Math.cos(s.rot) * 2, py - Math.sin(s.rot) * 2);
        ctx.lineTo(px + Math.cos(s.rot) * 2, py + Math.sin(s.rot) * 2);
      }
      ctx.stroke();
    }
  },
};
