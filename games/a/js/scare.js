'use strict';

// Jump scare: το πρόσωπο του τέρατος που σε έπιασε, σε pixel art — το ίδιο τέρας με τα
// sprites του παιχνιδιού, από πολύ κοντά (SCARE_KINDS: η σκιά με λευκά μάτια, η Ερινύα με
// φίδια στα μαλλιά, κίτρινα μάτια και φτερά). Ορμάει από το σκοτάδι, το στόμα ανοίγει,
// χέρια με νύχια σε αρπάζουν από κάτω, η εικόνα "σπάει" σαν χαλασμένο σήμα και στο τέλος
// τα μάτια φλέγονται.
// Ζωγραφίζεται στον μικρό καμβά του Pixel (σε art pixels), όπως όλος ο κόσμος.
const SCARE_TIME = 0.65;    // συνολική διάρκεια (δευτ.)
const SCARE_LUNGE = 0.3;    // ώσπου να γεμίσει την οθόνη το πρόσωπο

// Το πρόσωπο, από μπροστά. Γράφεται μόνο το αριστερό μισό· το δεξί είναι καθρέφτης.
// k/K = κάρβουνο, p = λάμψη γύρω από τα μάτια, E = λευκά μάτια, R/r = το στόμα, P = δόντια.
const SCARE_HEAD = [
  '..........kkkkk',
  '.......kkkkkkkk',
  '.....kkkkkkkkkk',
  '....Kkkkkkkkkkk',
  '...Kkkkkkkkkkkk',
  '...KkkkkkkkkkKk',
  '..KkkKKKKKKkkKk',
  '..KkKKKKKKKKkkk',
  '..KKKKpEEpKKkkk',
  '..KKKpEEEEpKkkk',
  '..KKKpEEEEpKkkk',
  '..KkKKpEEpKKkkk',
  '..KkKKKKKKKKkkk',
  '...KkkKKKKkkkkk',
  '...KKkkKkkkkKkk',
  '...KKkkKkkkkKkk',
  '....KkkKkkkkkkk',
];
// Το στόμα σε τρία καρέ: κλειστό, μισάνοιχτο, ορθάνοιχτο με κοφτερά δόντια (8 γραμμές).
const SCARE_MOUTH = [
  ['....Kkkkkkkkkkk', '....Kkkkkkkkkkk', '....KkkkkkkkKKK', '....KkKKKKKKkkk',
   '....Kkkkkkkkkkk', '.....Kkkkkkkkkk', '.....Kkkkkkkkkk', '.....kkkkkkkkkk'],
  ['....Kkkkkkkkkkk', '....Kkkkkkkkkkk', '....KkKRRRRRRRR', '....KKPRPRPRPRP',
   '....KKPRPRPRPRP', '.....KRRRRRRRRR', '.....Kkkkkkkkkk', '.....kkkkkkkkkk'],
  ['....KkKRRRRRRRR', '....KKPRPRPRPRP', '....KKRPRRRPRRR', '....KKRrrrrrrrr',
   '....KKRrrrrrrrr', '....KKRRPRRRPRR', '....KKPRPRPRPRP', '.....KKRRRRRRRR'],
];
const SCARE_CHIN = [
  '.....kkkkkkkkkk',
  '......kkkkkkkkk',
  '........kkkkkkk',
  '..........kkkkk',
];
// Χέρι σκιάς με νύχια, που ανεβαίνει από κάτω (το δεξί είναι καθρέφτης του).
const SCARE_HAND = [
  '.PP..PP..PP.....',
  '.kk..kk..kk.....',
  '.kk..kk..kk..PP.',
  '.kk..kk..kk..kk.',
  '.kkk.kkk.kkk.kk.',
  '..kk..kk..kk.kk.',
  '..kkkkkkkkkkkkk.',
  '..kkkkkkkkkkkkk.',
  '..kkkkkkkkkkkk..',
  '...kkkkkkkkkkk..',
  '...kkkkkkkkkk...',
  '....kkkkkkkk....',
  '....kkkkkkk.....',
  '.....kkkkkk.....',
  '.....kkkkkk.....',
  '.....kkkkkk.....',
  '.....kkkkkk.....',
  '.....kkkkkk.....',
  '.....kkkkkk.....',
  '.....kkkkkk.....',
];
// ---- Ερινύα: σκούρο κόκκινο πρόσωπο, κίτρινα μάτια, φίδια αντί για μαλλιά (που
// σφαδάζουν σε 2 καρέ), στόμα που ουρλιάζει με κοφτερά δόντια, και μεγάλα φτερά πίσω της.
const ERINYS_HAIR = [
  [
    '..t....t....t..',
    '.gge..gge..gge.',
    '.gG..gG...gG..g',
    'gGdGgGdggGdGgGd',
    'Gd.gGdGgGdGgdGg',
  ],
  [
    '...t....t....t.',
    '..gge..gge..gge',
    '..gG..Gg..gG..G',
    'GdGgGdgGgdGgGdG',
    'dG.GgdGgdGgGdgG',
  ],
];
const ERINYS_HEAD = [
  'g.gGdkkkkkkkkkk',
  '.gGkkRRRRRRRRRR',
  'gGkRRRRRRRRRRRR',
  'GkRRKKKKRRRRRRR',
  'gkRKKYyyYKRRRRR',
  'GkRKYyyyyYKRRRR',
  'gkRKKYyyYKKRRRR',
  '.kRRKKKKKKRRRRR',
  '.kRRRRRRRRRRKRR',
  '.gkRRRRRRRRRKRR',
  '..kRRRRRRRRRRRR',
];
const ERINYS_MOUTH = [
  ['..gkRRRRRRRRRRR', '...kRRRRRRRRRRR', '...kRRKKKKKKKKK', '...gkRRRRRRRRRR',
   '....kRRRRRRRRRR', '....gkRRRRRRRRR', '.....kRRRRRRRRR'],
  ['..gkRRRRRRRRRRR', '...kRRKKKKKKKKK', '...kRKPKPKKPKPK', '...gkRKPKPKKPKP',
   '....kRRKKKKKKKK', '....gkRRRRRRRRR', '.....kRRRRRRRRR'],
  ['..gkRRKKKKKKKKK', '...kRKPKPKKPKPK', '...kRKKKKKKKKKK', '...gkRKKKKKtttt',
   '....kRKPKPKKPKP', '....gkRKKKKKKKK', '.....kRRRRRRRRR'],
];
const ERINYS_CHIN = [
  '......kRRRRRRRR',
  '.......kkRRRRRR',
  '.........kkkkkk',
];
// Το αριστερό φτερό (το δεξί είναι καθρέφτης): μαύρα φτερά με περίγραμμα πηλού.
const ERINYS_WING = [
  '...............K',
  '.............KKk',
  '...........KKkkk',
  '.........KKkkkkk',
  '.......KKkkkkkkk',
  '.....KKkkkkkkkkk',
  '...KKkkkKkkkkkkk',
  '.KKkkkKkkkKkkkkk',
  'KkkkKkkkKkkkkkkk',
  '.KkKkkKkkKkkkkkk',
  '..K.KkK.kKkkkkkk',
  '....K.K..KkKkkkk',
  '.........K.KkKkk',
  '...........K.KkK',
  '.............K.K',
];

// Τα jump scares ανά είδος τέρατος.
//   hair: καρέ που εναλλάσσονται συνέχεια (φίδια), mouths: κλειστό / μισάνοιχτο / ανοιχτό,
//   eye: ο χαρακτήρας των ματιών (για να βρεθούν τα κέντρα τους), eyeColor: χρώμα της λάμψης,
//   hand: τα χέρια που ανεβαίνουν από κάτω, wing: φτερά πίσω από το πρόσωπο (ή null),
//   halo: το χρώμα της λάμψης πίσω από το κεφάλι, size: πόσο μεγαλώνει το πρόσωπο (1 = όσο η οθόνη).
const SCARE_KINDS = {
  shade: {
    hair: [[]], head: SCARE_HEAD, mouths: SCARE_MOUTH, chin: SCARE_CHIN, eye: 'E',
    eyeColor: '255,250,235', hand: SCARE_HAND, wing: null, halo: POT.red, size: 1.05,
  },
  erinys: {
    hair: ERINYS_HAIR, head: ERINYS_HEAD, mouths: ERINYS_MOUTH, chin: ERINYS_CHIN, eye: 'y',
    eyeColor: '255,214,90', hand: SCARE_HAND.map((r) => r.replace(/k/g, 'R')), wing: ERINYS_WING,
    halo: '190,40,20', size: 0.78,   // μικρότερο, για να φαίνονται τα φτερά γύρω του
  },
};

const Scare = {
  kinds: null,    // για κάθε είδος: { faces: [στόμα][μαλλιά], eyes, hand, wing }
  kind: 'shade',
  hands: [],      // από πού ανεβαίνουν τα χέρια αυτή τη φορά
  seed: 0,

  build() {
    const mirror = (r) => r + [...r].reverse().join('');
    this.kinds = {};
    for (const name in SCARE_KINDS) {
      const d = SCARE_KINDS[name];
      const rows = (hair, mouth) => [...hair, ...d.head, ...mouth, ...d.chin].map(mirror);
      // Κέντρα των ματιών: ο μέσος όρος των pixels των ματιών σε κάθε μισό (+1 για το περίγραμμα).
      const grid = rows(d.hair[0], d.mouths[0]);
      const eyes = [0, 1].map((side) => {
        let sx = 0, sy = 0, n = 0;
        grid.forEach((r, y) => [...r].forEach((c, x) => {
          if (c === d.eye && (x < r.length / 2) === (side === 0)) { sx += x; sy += y; n++; }
        }));
        return [sx / n + 1.5, sy / n + 1.5];
      });
      this.kinds[name] = {
        faces: d.mouths.map((m) => d.hair.map((hr) => Sprites.build(rows(hr, m), POT.terra))),
        eyes,
        hand: Sprites.build(d.hand, POT.terra),
        wing: d.wing ? Sprites.build(d.wing, POT.terra) : null,
        eyeColor: d.eyeColor,
        halo: d.halo,
        size: d.size,
      };
    }
  },

  // Ετοιμάζει ένα λίγο διαφορετικό jump scare κάθε φορά (μία φορά ανά θάνατο).
  // kind = το είδος του τέρατος που σε έπιασε ('shade' | 'erinys').
  prepare(kind = 'shade') {
    if (!this.kinds) this.build();
    this.kind = this.kinds[kind] ? kind : 'shade';
    this.seed = Math.random() * 100;
    // Δύο ή τρία χέρια: x = θέση στο πλάτος της οθόνης, flip = δεξί χέρι.
    const n = Math.random() < 0.5 ? 2 : 3;
    this.hands = [];
    for (let i = 0; i < n; i++) {
      const left = i % 2 === 0;
      this.hands.push({
        x: i === 2 ? 0.4 + Math.random() * 0.2 : left ? 0.14 + Math.random() * 0.12 : 0.74 + Math.random() * 0.12,
        flip: !left,
        delay: 0.14 + Math.random() * 0.1,
        reach: 0.55 + Math.random() * 0.25,
      });
    }
  },

  // t = δευτ. από τη στιγμή του θανάτου. (w, h) = μέγεθος του μικρού καμβά (art pixels).
  draw(ctx, w, h, t) {
    if (t > SCARE_TIME) return;
    if (!this.kinds) this.build();
    const K = this.kinds[this.kind];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;

    // Πρώτα ένα στιγμιαίο κόκκινο φλας.
    if (t < 0.04) {
      ctx.fillStyle = Pottery.rgba(POT.red, 1);
      ctx.fillRect(0, 0, w, h);
      return;
    }
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    // Ορμάει: από μικρό στο βάθος ως λίγο μεγαλύτερο από την οθόνη.
    const lunge = Math.min(1, (t - 0.04) / (SCARE_LUNGE - 0.04));
    const grow = 1 - Math.pow(1 - lunge, 3);
    const mouth = K.faces[t < 0.13 ? 0 : t < 0.22 ? 1 : 2];
    const face = mouth[Math.floor(t * 14) % mouth.length];   // τα φίδια σφαδάζουν
    const fw = Math.min(w, h * 0.85) * (0.12 + K.size * grow);
    const k = fw / face.w;
    const fh = face.h * k;
    const shake = 1 + grow * 3 + (t > 0.45 ? 3 : 0);
    const cx = w / 2 + (Math.random() - 0.5) * shake;
    const cy = h * 0.46 + (Math.random() - 0.5) * shake;
    const x0 = Math.round(cx - fw / 2), y0 = Math.round(cy - fh / 2);

    // Λάμψη πίσω από το κεφάλι.
    const halo = ctx.createRadialGradient(cx, cy, fw * 0.2, cx, cy, fw * 0.9);
    halo.addColorStop(0, Pottery.rgba(K.halo, 0.55));
    halo.addColorStop(1, Pottery.rgba(K.halo, 0));
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, w, h);

    // Φτερά που ανοίγουν πίσω από το πρόσωπο και χτυπάνε.
    if (K.wing) {
      const wk = k * (0.9 + 0.5 * grow);
      const ww = K.wing.w * wk, wh = K.wing.h * wk;
      const flap = Math.sin(t * 30) * wh * 0.08;
      const wy = Math.round(cy - wh * 0.75 + flap);
      ctx.drawImage(K.wing.c, Math.round(cx - fw * 0.3 - ww), wy, ww, wh);
      ctx.drawImage(K.wing.f, Math.round(cx + fw * 0.3), wy, ww, wh);
    }

    // Το πρόσωπο. Στις στιγμές της "παρεμβολής" κόβεται σε λωρίδες που γλιστράνε στο πλάι.
    const glitch = (t > 0.19 && t < 0.235) || (t > 0.5 && Math.random() < 0.5);
    if (glitch) {
      const bands = 7;
      for (let b = 0; b < bands; b++) {
        const sy = (face.h / bands) * b, sh = face.h / bands;
        const off = Math.round((Math.random() - 0.5) * fw * 0.18);
        ctx.drawImage(face.c, 0, sy, face.w, sh, x0 + off, y0 + sy * k, fw, sh * k);
      }
    } else {
      ctx.drawImage(face.c, x0, y0, fw, fh);
    }

    // Τα μάτια λάμπουν — και στο τέλος φλέγονται.
    const flare = t > 0.42 ? (t - 0.42) / (SCARE_TIME - 0.42) : 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [ex, ey] of K.eyes) {
      const px = x0 + ex * k, py = y0 + ey * k;
      const R = k * (3 + flare * 6) * (0.9 + 0.2 * Math.random());
      const g = ctx.createRadialGradient(px, py, 0, px, py, R);
      g.addColorStop(0, `rgba(${K.eyeColor},${(0.55 + 0.45 * flare).toFixed(3)})`);
      g.addColorStop(1, `rgba(${K.eyeColor},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(px - R, py - R, R * 2, R * 2);
    }
    ctx.restore();

    // Χέρια με νύχια που ανεβαίνουν από κάτω και σε αρπάζουν.
    const hk = Math.max(2, Math.round(k * 0.6));
    const hw = K.hand.w * hk, hh = K.hand.h * hk;
    for (const hd of this.hands) {
      const p = Math.max(0, Math.min(1, (t - hd.delay) / 0.14));
      if (p <= 0) continue;
      const rise = 1 - Math.pow(1 - p, 2);
      const hx = Math.round(hd.x * w - hw / 2 + (Math.random() - 0.5) * 2);
      const hy = Math.round(h - hh * hd.reach * rise + (Math.random() - 0.5) * 2);
      ctx.drawImage(hd.flip ? K.hand.f : K.hand.c, hx, hy, hw, hh);
    }

    // Λωρίδες "παρεμβολής" σαν χαλασμένο σήμα, πάνω από όλα.
    ctx.fillStyle = Pottery.rgba(POT.light, 0.12);
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, Math.random() * w * 0.4, 1);
    }
    // Ο λεπτός μαίανδρος πάνω και κάτω, όπως στην οθόνη του παιχνιδιού.
    Pottery.meander(ctx, 0, 0, w, 7, POT.terra, 0.6, 1);
    Pottery.meander(ctx, 0, h - 7, w, 7, POT.terra, 0.6, 1);
  },
};
