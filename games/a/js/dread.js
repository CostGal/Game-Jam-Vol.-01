'use strict';

// "Τρόμος": πόσο κοντά είναι το πιο κοντινό τέρας, και ό,τι βγαίνει από αυτό —
// καρδιοχτύπι (ήχος + δόνηση), κόκκινο βινιετάρισμα, τρέμουλο οθόνης.
const DREAD_NEAR = 40;       // σε αυτή την απόσταση (ή πιο κοντά) ο τρόμος είναι 1
const DREAD_FAR = 400;       // πέρα από εδώ είναι 0
const SHAKE_FROM = 0.72;     // πάνω από αυτό το επίπεδο τρόμου η οθόνη τρέμει

// Δόνηση όπου υποστηρίζεται (Android) και αν δεν την έχει κλείσει ο παίκτης.
// Στο iPhone απλώς δεν κάνει τίποτα.
function vibrate(pattern) {
  if (!Settings.vibration) return;
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (_) { /* - */ }
}

const Dread = {
  threat: 0,        // 0..1, εξομαλυμένο
  nextBeat: 0,
  beatTime: -1e6,

  reset() {
    this.threat = 0;
    this.nextBeat = 0;
    this.beatTime = -1e6;
  },

  // active = false όταν δεν παίζουμε (παύση, μενού κ.λπ.): όλα σβήνουν.
  update(dt, now, player, monsters, active) {
    let target = 0;
    const voices = [];
    if (active) {
      for (const m of monsters) {
        // Παγωμένη από τη Μελωδία: σιωπηλή και ακίνδυνη.
        if (m.isFrozen()) { voices.push(null); continue; }
        const d = Math.hypot(m.x - player.x, m.y - player.y);
        target = Math.max(target, 1 - (d - DREAD_NEAR) / (DREAD_FAR - DREAD_NEAR));
        voices.push({ x: m.x, y: m.y, los: Level.lineOfSight(player.x, player.y, m.x, m.y) });
      }
    }
    target = Math.max(0, Math.min(1, target));
    this.threat += (target - this.threat) * (1 - Math.pow(0.05, dt));

    Sound.updateGrowls(voices);

    // Καρδιοχτύπι: από 1.25 δευτ. (μακριά) έως 0.4 δευτ. (δίπλα σου).
    if (active && this.threat > 0.12) {
      if (now >= this.nextBeat) {
        this.beatTime = now;
        this.nextBeat = now + 1.25 - 0.85 * this.threat;
        Sound.heartbeat(0.2 + 0.8 * this.threat);
        if (this.threat > 0.35) vibrate([30, 130, 20]);
      }
    } else {
      this.nextBeat = now + 0.3;
    }
  },

  // Κόκκινο βινιετάρισμα, σε συντεταγμένες οθόνης. Χτυπάει μαζί με την καρδιά.
  drawVignette(ctx, w, h, now) {
    if (this.threat < 0.02) return;
    const beat = Math.max(0, 1 - (now - this.beatTime) / 0.35);
    const a = Math.pow(this.threat, 1.4) * (0.5 + 0.2 * beat);
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * (0.42 - 0.15 * this.threat),
      w / 2, h / 2, Math.hypot(w, h) / 2);
    g.addColorStop(0, 'rgba(140,0,0,0)');
    g.addColorStop(1, `rgba(140,0,0,${a.toFixed(3)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  },

  // Τυχαία μετατόπιση της κάμερας (σε CSS pixels) όταν το τέρας είναι πολύ κοντά.
  shake() {
    if (this.threat <= SHAKE_FROM) return [0, 0];
    const amp = ((this.threat - SHAKE_FROM) / (1 - SHAKE_FROM)) * 4;
    return [(Math.random() * 2 - 1) * amp, (Math.random() * 2 - 1) * amp];
  },
};
