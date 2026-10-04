'use strict';

// Η Μελωδία: ξεκλειδώνει με τις 3 χορδές. Όταν παίζεις, οι σκιές κοντά σου
// "θυμούνται ότι κάποτε ζούσαν" και παγώνουν για λίγα δευτερόλεπτα.
// Περιορισμένες χρήσεις, που γεμίζουν ξανά σε κάθε βωμό.
const MELODY_USES = 2;
const MELODY_RADIUS = 300;       // πόσο μακριά φτάνει
const MELODY_FREEZE = 5;         // πόσα δευτ. μένουν παγωμένες
const MELODY_RING_TIME = 1.6;    // το χρυσό δαχτυλίδι που απλώνεται

const Melody = {
  uses: 0,
  rings: [],     // { x, y, t } — μόνο οπτικό, ΔΕΝ είναι κύμα ήχου (δεν το ακούνε οι σκιές)

  reset(uses) {
    this.uses = uses;
    this.rings = [];
  },

  // Επιστρέφει πόσες σκιές πάγωσαν, ή -1 αν δεν έγινε (χωρίς χρήσεις).
  play(p, shades, now) {
    if (this.uses <= 0) return -1;
    this.uses--;
    this.rings.push({ x: p.x, y: p.y, t: now });
    let n = 0;
    for (const s of shades) {
      if (Math.hypot(s.x - p.x, s.y - p.y) <= MELODY_RADIUS) {
        s.freeze(now + MELODY_FREEZE);
        n++;
      }
    }
    Sound.melody();
    return n;
  },

  draw(ctx, now) {
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      const t = (now - r.t) / MELODY_RING_TIME;
      if (t >= 1) { this.rings.splice(i, 1); continue; }
      const ease = 1 - Math.pow(1 - t, 2);
      for (let k = 0; k < 3; k++) {
        const rr = MELODY_RADIUS * Math.max(0, ease - k * 0.08);
        if (rr <= 0) continue;
        ctx.strokeStyle = `rgba(${POT.light},${((1 - t) * (0.35 - k * 0.1)).toFixed(3)})`;
        ctx.lineWidth = 2 - k * 0.5;
        ctx.beginPath();
        ctx.arc(r.x, r.y, rr, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  },
};
