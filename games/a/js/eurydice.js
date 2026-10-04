'use strict';

// Η Ευρυδίκη στο κεφάλαιο V (STORY.md, ενότητα 5): ακολουθεί τον παίκτη σαν χλωμό,
// διάφανο φάσμα λίγα βήματα πίσω του, και ακούγονται τα απαλά βήματά της.
// Ένα μεγάλο κύμα σημαίνει "κοίταξες πίσω": σβήνει και τη χάνεις για πάντα.
const EURY_BEHIND = 46;        // πόσο πίσω (πάνω στη διαδρομή του παίκτη) περπατάει
const EURY_STEP = 30;          // απόσταση ανάμεσα στα βήματά της
// Πάνω από αυτή τη φόρτιση (0..1) το κύμα είναι "μεγάλο" = κοιτάζεις πίσω.
const LOOK_BACK_CHARGE = 0.5;
const EURY_VANISH = 1.8;       // σε πόσα δευτ. σβήνει όταν κοιτάξεις πίσω

const Eurydice = {
  // 'none' (πριν τη μεσαία cutscene) | 'following' | 'lost'
  state: 'none',
  trail: [],      // σημεία από όπου πέρασε ο παίκτης, το πιο καινούργιο στο τέλος
  x: 0,
  y: 0,
  stepDist: 0,
  dir: 1,         // προς τα πού κοιτάει (1 = δεξιά)
  walked: 0,      // πόσο έχει περπατήσει (για τα καρέ του sprite)
  moving: false,
  lostAt: -1e6,

  // Ψιθυρίζει "Orpheus... I am right behind you." λίγο μετά που αρχίζει να σε ακολουθεί,
  // και μετά πού και πού (κάθε 45-75 δευτ.). Το main ρωτάει με wantsToSpeak(now).
  nextWhisper: 0,
  whisperArmed: false,

  wantsToSpeak(now) {
    if (this.state !== 'following') return false;
    if (!this.whisperArmed) { this.whisperArmed = true; this.nextWhisper = now + 5; return false; }
    if (now < this.nextWhisper) return false;
    this.nextWhisper = now + 45 + Math.random() * 30;
    return true;
  },

  reset(state, p) {
    this.whisperArmed = false;
    this.state = state;
    this.trail = [{ x: p.x, y: p.y }];
    this.x = p.x;
    this.y = p.y;
    this.stepDist = 0;
  },

  following() {
    return this.state === 'following';
  },

  lose(now) {
    this.state = 'lost';
    this.lostAt = now;
  },

  update(p) {
    if (this.state !== 'following') return;
    const prev = this.trail[this.trail.length - 1];
    if (Math.hypot(p.x - prev.x, p.y - prev.y) >= 4) this.trail.push({ x: p.x, y: p.y });

    // Βρες το σημείο της διαδρομής που απέχει EURY_BEHIND από τον παίκτη (κατά μήκος της).
    const last = this.trail[this.trail.length - 1];
    let dist = Math.hypot(p.x - last.x, p.y - last.y);
    let target = this.trail[0];
    for (let i = this.trail.length - 1; i > 0; i--) {
      const a = this.trail[i], b = this.trail[i - 1];
      const seg = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist + seg >= EURY_BEHIND) {
        const t = (EURY_BEHIND - dist) / seg;
        target = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        this.trail.splice(0, i - 1);   // ό,τι είναι πιο πίσω δεν χρειάζεται πια
        break;
      }
      dist += seg;
    }

    const moved = Math.hypot(target.x - this.x, target.y - this.y);
    if (Math.abs(target.x - this.x) > 0.05) this.dir = target.x < this.x ? -1 : 1;
    this.moving = moved > 0.05;
    this.walked += moved;
    this.x = target.x;
    this.y = target.y;
    this.stepDist += moved;
    if (this.stepDist >= EURY_STEP) {
      this.stepDist -= EURY_STEP;
      Sound.softStep(this.x, this.y);
    }
  },
};
