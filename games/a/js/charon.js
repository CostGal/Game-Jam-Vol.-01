'use strict';

// Ο Χάροντας στέκεται στη βάρκα του, πάνω στην πύλη του κεφαλαίου II (w στον χάρτη).
// Αν έχεις οβολό, πληρώνεις και η πύλη ανοίγει. Αλλιώς, απλώνει το χέρι.
const CHARON_REACH = TILE * 1.25;
const CHARON_REVEAL_TIME = 2.5;

const Charon = {
  gate: -1,           // δείκτης στο Level.gates
  x: 0,
  y: 0,
  paid: false,
  paidAt: -1e6,
  near: false,        // ήταν ήδη κοντά (για να μη λέει το ίδιο μήνυμα συνέχεια)
  revealTime: -1e6,
  revealStrength: 0,

  reset(paid) {
    this.gate = Level.gates.length > 0 ? 0 : -1;
    if (this.gate < 0) return;
    const g = Level.gates[this.gate];
    this.x = g.x;
    this.y = g.y;
    this.paid = paid;
    this.paidAt = -1e6;
    this.near = false;
    this.revealTime = -1e6;
    Level.setGate(this.gate, paid);
  },

  onHear(wave, d) {
    // Στέκεται πάνω στην κλειστή πύλη (που σταματάει τον ήχο), οπότε η οπτική επαφή
    // ελέγχεται ως την άκρη της προβλήτας, λίγο πιο πάνω.
    if (!Level.lineOfSight(wave.x, wave.y, this.x, this.y - TILE * 0.6)) return;
    const s = Echoes.strengthAt(wave, d);
    const left = this.revealStrength * Math.max(0, 1 - (Echoes.now - this.revealTime) / CHARON_REVEAL_TIME);
    if (s < left) return;
    this.revealTime = Echoes.now;
    this.revealStrength = s;
  },

  // Επιστρέφει 'empty' (δεν έχεις οβολό), 'paid' (μόλις πλήρωσες) ή null.
  check(p, hasObol, now) {
    if (this.gate < 0 || this.paid) return null;
    const close = Math.hypot(p.x - this.x, p.y - this.y) < CHARON_REACH;
    if (!close) {
      // Ξαναλέει το μήνυμα μόνο αφού απομακρυνθείς αρκετά.
      if (Math.hypot(p.x - this.x, p.y - this.y) > CHARON_REACH * 2) this.near = false;
      return null;
    }
    if (hasObol) {
      this.paid = true;
      this.paidAt = now;
      Level.setGate(this.gate, true);
      return 'paid';
    }
    if (this.near) return null;
    this.near = true;
    return 'empty';
  },

  draw(ctx, now) {
    if (this.gate < 0) return;
    const age = now - this.revealTime;
    let a = age < CHARON_REVEAL_TIME
      ? Math.min(1, 0.35 + this.revealStrength) * (1 - age / CHARON_REVEAL_TIME) : 0;
    // Μετά την πληρωμή, η βάρκα "φεύγει" προς τα κάτω και σβήνει.
    const leave = this.paid ? Math.min(1, (now - this.paidAt) / 2.5) : 0;
    if (this.paid) a = Math.max(a * (1 - leave), (1 - leave) * 0.6);
    if (a < 0.01) return;

    // Pixel sprite: ηλιοκαμένος γέρος βαρκάρης με κουπί, όρθιος στη βάρκα του (που έχει
    // "μάτι" στην πλώρη, όπως τα πλοία των αγγείων). Όσο περιμένει τον οβολό, απλώνει
    // την παλάμη. Κοιτάζει προς τον παίκτη.
    const x = this.x, y = this.y + leave * TILE * 0.8;
    const flip = typeof player !== 'undefined' && player.x < x;
    Sprites.draw(ctx, 'charon', this.paid ? 0 : 1, x, y + 8, { flip, alpha: a });
    Sprites.draw(ctx, 'boat', 0, x, y + 13, { flip, alpha: a });
  },
};
