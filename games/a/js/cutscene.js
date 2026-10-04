'use strict';

// Cutscenes (STORY.md, ενότητα 7): μαύρη οθόνη, οι γραμμές εμφανίζονται μία-μία
// με απαλό ήχο. Άγγιγμα / κλικ / Space / Enter = επόμενη γραμμή, κουμπί Skip.
const CUT_MIN_GAP = 0.45;   // δευτ. — ώστε ένα διπλό άγγιγμα να μην πηδάει γραμμές

const Cutscene = {
  el: null,
  linesEl: null,
  lines: [],
  shown: 0,
  onEnd: null,
  lastAdvance: 0,
  active: false,

  init() {
    this.el = document.getElementById('cutscene');
    this.linesEl = document.getElementById('cut-lines');
    this.el.addEventListener('pointerup', (e) => {
      if (e.target.closest('#cut-skip')) return;
      e.preventDefault();
      this.advance();
    });
    document.getElementById('cut-skip').addEventListener('click', (e) => {
      e.preventDefault();
      this.finish();
    });
  },

  // style: '' | 'good' | 'bad' (λίγο διαφορετικό φόντο για τα τέλη)
  // art: 'intro' | 'middle' | 'good' | 'bad' — η μικρή "ζωγραφιά αγγείου" από πάνω
  // who: ποιος λέει κάθε γραμμή (π.χ. STORY.middleWho) — βλ. js/voice.js.
  play(lines, style, onEnd, art, who) {
    this.lines = lines;
    this.who = who || [];
    this.shown = 0;
    this.onEnd = onEnd;
    this.active = true;
    this.lastAdvance = 0;
    this.linesEl.textContent = '';
    this.el.className = 'overlay cutscene ' + (style || '');
    this.drawArt(art);
    this.showNext();
  },

  // Μια μικρή σκηνή με τα pixel sprites των χαρακτήρων (js/sprites.js), σε διπλό
  // μέγεθος, πάνω από έναν μαίανδρο. Ζωγραφίζεται σε μισή ανάλυση και το CSS τη
  // μεγαλώνει με καθαρά τετράγωνα pixels (image-rendering: pixelated).
  drawArt(art) {
    const cv = document.getElementById('cut-art');
    const W = 150, H = 59, K = 2;   // art pixels, και πόσο μεγαλώνουν τα sprites
    cv.width = W;
    cv.height = H;
    const c = cv.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    const ground = 51;
    const put = (name, i, x, opts = {}) => Sprites.blit(c, name, i, x, ground, { scale: K, ...opts });
    // Η Ευρυδίκη: χλωμό φάσμα με απαλή λάμψη γύρω της.
    const ghost = (x, a, i) => {
      const g = c.createRadialGradient(x, ground - 18, 2, x, ground - 18, 26);
      g.addColorStop(0, Pottery.rgba(POT.cream, 0.35 * a));
      g.addColorStop(1, Pottery.rgba(POT.cream, 0));
      c.fillStyle = g;
      c.fillRect(x - 26, ground - 44, 52, 52);
      put('eurydice', i, x, { alpha: a });
    };
    if (art === 'intro') {
      // Ο Ορφέας με τη λύρα, και το φίδι στο χορτάρι που σηκώνει το κεφάλι.
      put('orpheus_idle_3', 0, 52);
      put('snake', 1, 104, { flip: true });
      put('grass', 0, 104);
    } else if (art === 'middle') {
      // Ο Ορφέας παίζει μπροστά στον Άδη· η Περσεφόνη γέρνει προς το μέρος του.
      put('orpheus_play_3', 0, 22);
      put('hound', 0, 58);
      put('hades', 0, 88);
      put('persephone', 1, 126);
    } else if (art === 'good') {
      // Βγαίνουν στο φως: εκείνος μπροστά, εκείνη πίσω του. Ο ήλιος δεξιά.
      const sun = c.createRadialGradient(W - 31, 28, 2, W - 31, 28, 26);
      sun.addColorStop(0, Pottery.rgba(POT.cream, 0.9));
      sun.addColorStop(1, Pottery.rgba(POT.light, 0));
      c.fillStyle = sun;
      c.fillRect(0, 0, W, H);
      ghost(58, 1, 0);
      put('orpheus_walk_3', 0, 90);
    } else if (art === 'bad') {
      // Γύρισε: την κοιτάζει, κι εκείνη σβήνει στο σκοτάδι.
      ghost(58, 0.3, 1);
      put('orpheus_idle_3', 0, 90, { flip: true });
    }
    c.setTransform(0.5, 0, 0, 0.5, 0, 0);
    Pottery.meander(c, 20, 118 - 14, 260, 12, POT.terra, 0.9, 1.3);
  },

  showNext() {
    const p = document.createElement('p');
    p.textContent = this.lines[this.shown];
    this.linesEl.appendChild(p);
    // Οι προηγούμενες γραμμές σβήνουν λίγο, ώστε να ξεχωρίζει η καινούργια.
    for (const old of this.linesEl.children) if (old !== p) old.classList.add('old');
    requestAnimationFrame(() => p.classList.add('in'));
    this.shown++;
    this.el.classList.toggle('last', this.shown >= this.lines.length);
    // Η προηγούμενη φωνή σταματάει αν πατήσεις "επόμενη" πριν τελειώσει.
    Voice.stop();
    Voice.say(this.lines[this.shown - 1], this.who[this.shown - 1] || 'narrator');
  },

  advance() {
    if (!this.active) return;
    const now = performance.now() / 1000;
    if (now - this.lastAdvance < CUT_MIN_GAP) return;
    this.lastAdvance = now;
    if (this.shown < this.lines.length) this.showNext();
    else this.finish();
  },

  finish() {
    if (!this.active) return;
    Voice.stop();
    this.active = false;
    this.el.classList.add('hidden');
    const cb = this.onEnd;
    this.onEnd = null;
    if (cb) cb();
  },
};
