'use strict';

// Pixel-art sprites των χαρακτήρων (STORY.md, ενότητα 6): κάθε sprite είναι ένα πλέγμα
// από χαρακτήρες (ένας χαρακτήρας = ένα art pixel), με τα χρώματα της SPR_PAL.
// Στο init() γίνονται μικροί καμβάδες (και καθρεφτισμένοι, για όταν κοιτάνε αριστερά)
// με αυτόματο περίγραμμα γύρω γύρω. Ζωγραφίζονται στον μικρό καμβά του Pixel,
// ένα pixel του sprite = ένα art pixel, πάντα σε ακέραιες θέσεις (καθαρά pixels).
// Όλα κοιτάνε δεξιά στο σχέδιο ('.' = διάφανο).

// Παλέτα: ζεστά χρώματα πηλού / αγγείου (χωρίς μπλε ή ψυχρά γκρι).
const SPR_PAL = {
  h: '190,64,34',    // κόκκινα μαλλιά (Ορφέας)
  H: '120,34,18',
  s: '238,172,120',  // δέρμα (άμμος / πηλός)
  S: '196,122,78',
  e: '40,20,12',     // μάτια, σκούρες λεπτομέρειες
  w: '244,230,204',  // χιτώνας / λευκό φόρεμα
  W: '196,172,136',
  b: '124,66,32',    // δέρμα (ζώνη, σανδάλια)
  y: '246,196,72',   // χρυσό (λύρα, στέμματα)
  Y: '176,122,40',
  1: '255,246,210',  // οι τρεις χορδές της λύρας (φαίνονται όσες έχεις βρει)
  2: '255,246,210',
  3: '255,246,210',
  k: '50,42,38',     // κάρβουνο (σκιές, πανοπλία του Άδη)
  K: '30,24,22',
  E: '255,252,240',  // λευκά μάτια που λάμπουν (σκιές)
  p: '250,244,234',  // χλωμό φάσμα (Ευρυδίκη, ψυχές)
  P: '206,194,180',
  c: '196,180,160',  // χλωμά μαλλιά (Ευρυδίκη)
  v: '110,98,90',    // μάτι του φάσματος
  g: '214,158,58',   // φίδι: χρυσό / καφέ με σκούρες ρίγες
  G: '150,94,38',
  d: '86,52,22',
  t: '210,44,32',    // γλώσσα
  q: '104,68,32',    // ξερό χορτάρι
  Q: '150,104,48',
  r: '176,34,34',    // ρόδι (στέμμα της Περσεφόνης), κόκκινα μάτια
  R: '120,20,24',
  a: '64,32,22',     // σκούρα μαλλιά (Περσεφόνη)
  m: '92,62,46',     // πέτρα (θρόνοι)
  M: '58,38,30',
  n: '128,90,66',
  o: '150,96,48',    // ξύλο (κουπί, βάρκα)
  O: '100,62,30',
  T: '186,118,70',   // ηλιοκαμένο δέρμα (Χάροντας)
  U: '140,84,48',
  B: '210,196,172',  // γκριζωπά μαλλιά και γένια (Χάροντας)
  z: '110,74,48',    // χιτώνας του Χάροντα
  Z: '70,46,30',
};

// ---- Ορφέας: σύνθεση από πάνω μέρος (γραμμές 0-12) και πόδια (13-15) ----
const ORPHEUS_UPPER = {
  base: [
    '...hhhh......',
    '..hhhhhhh....',
    '..hhhhsss....',
    '..hhhhses....',
    '..Hhhssss....',
    '...Hhsss.....',
    '....Ss..y...y',
    '...wwwwwyyyyy',
    '..Wwwwwwy123y',
    '..Wwwwwss123y',
    '..Wbbbbb.YYY.',
    '..Wwwwww.....',
    '..Wwwwww.....',
  ],
};
// Τρέξιμο: τα μαλλιά πετάνε πίσω.
ORPHEUS_UPPER.run = ORPHEUS_UPPER.base.map((r, i) =>
  i === 1 ? '.hhhhhhhh....' : i === 2 ? 'hhhhhhsss....' : r);
// Παίζει τη λύρα (φόρτιση κύματος): το χέρι περνάει πάνω από τις χορδές.
ORPHEUS_UPPER.play0 = ORPHEUS_UPPER.base.map((r, i) => (i === 8 ? '..Wwwwwwys23y' : r));
ORPHEUS_UPPER.play1 = ORPHEUS_UPPER.base.map((r, i) => (i === 8 ? '..Wwwwwwy12sy' : r));

const ORPHEUS_LEGS = {
  stand: ['...WwwwW.....', '....s.s......', '...bb.bb.....'],
  stepA: ['...WwwwW.....', '...S...s.....', '..bb...bb....'],
  stepB: ['...WwwwW.....', '...s...S.....', '..bb...bb....'],
  pass:  ['...WwwwW.....', '.....s.......', '....bb.......'],
  runA:  ['...WwwwWw....', '..S.....s....', '.bb......bb..'],
  runB:  ['...WwwwWw....', '..s.....S....', '.bb......bb..'],
};

// [πάνω μέρος, πόδια, πόσο "βουλιάζει" το πάνω μέρος (art px)]
const ORPHEUS_ANIMS = {
  idle: [['base', 'stand', 0], ['base', 'stand', 1]],
  walk: [['base', 'stepA', 1], ['base', 'pass', 0], ['base', 'stepB', 1], ['base', 'pass', 0]],
  run:  [['run', 'runA', 1], ['run', 'pass', 0], ['run', 'runB', 1], ['run', 'pass', 0]],
  play: [['play0', 'stand', 0], ['play1', 'stand', 0]],
};

// ---- Ευρυδίκη (χλωμό, διάφανο φάσμα με αρχαίο φόρεμα) ----
const EURY_TOP = [
  '...cccc....',
  '..cccccc...',
  '..cccpppp..',
  '.ccccppvp..',
  '.ccccpppp..',
  '.cccc.pp...',
  '.ccc..pP...',
  '.cc.PpppP..',
  '..pPpppPp..',
  '..p.pppp.p.',
  '...PPPPP...',
  '...ppppp...',
  '...pppppp..',
  '..Ppppppp..',
];
const EURY_HEM = {
  A: ['..Ppppppp..', '.Pppppppp..'],
  B: ['..pppppppP.', '..PpppppppP'],
  C: ['..Ppppppp..', '..PPpppppP.'],
};

// ---- Σκιά (κάρβουνο, σκυφτή, με απλωμένα χέρια και λευκά μάτια) ----
const SHADE_TOP = [
  '......kkkk....',
  '.....kkkkkk...',
  '.....kkEkEk...',
  '.....kkkkkk...',
  '....kkkkkk....',
  '..kkkkkkkkkkk.',
  '.kkkkkkkkkkkkk',
  '.kkkkkk...kKkK',
  '..kkkkk.......',
  '..Kkkkk.......',
  '..Kkkkkk......',
  '..KkkkkkK.....',
];
const SHADE_TAT = {
  A: ['..Kk...kK.....', '.Kk.....kK....'],
  B: ['...Kk.kK......', '...Kk..kK.....'],
};

// ---- Ερινύα (φτερωτή γυναίκα από μπροστά, φίδια στα μαλλιά, κίτρινα μάτια) ----
// Γράφεται μόνο το αριστερό μισό· το δεξί είναι καθρέφτης. Δύο καρέ: φτερά κάτω / πάνω.
const ERINYS_HALF = {
  A: [
    '........g',
    '.....g.gG',
    'K...gGgGR',
    'KK..GgRRR',
    'KkK..gRyR',
    'KkkK..RRR',
    'KkkkK..RR',
    '.KkkkKkkk',
    '..KkkkKkk',
    '...KKkkkk',
    '....KRkkk',
    '.....Rkkk',
    '......kkk',
    '......kKk',
    '.......kK',
    '.......K.',
  ],
  B: [
    'K.......g',
    'KK...g.gG',
    'KkK.gGgGR',
    '.KkKGgRRR',
    '..KkKgRyR',
    '...KkKRRR',
    '....KkKRR',
    '.....Kkkk',
    '......Kkk',
    '......kkk',
    '....KRkkk',
    '.....Rkkk',
    '......kkk',
    '......kKk',
    '.......kK',
    '.......K.',
  ],
};

// ---- Χαμένη ψυχή (φωτεινό χλωμό πνεύμα, μισό σώμα με ουρά) ----
const SOUL_TOP = [
  '...ppp...',
  '..ppppp..',
  '..pPpPp..',
  '..ppppp..',
  '...ppp...',
  '.ppppppp.',
  'ppPpppPpp',
  'p.ppppp.p',
  '..ppppp..',
  '..Ppppp..',
];
const SOUL_TAIL = {
  A: ['...ppP...', '...Pp....', '....P....'],
  B: ['...Ppp...', '....pP...', '.....P...'],
};

// ---- Φίδι (κουλουριασμένο στο χορτάρι) ----
const SNAKE_BASE = [
  '.gGgGgGgGgGgg.',
  'gddddddddddddg',
  '.gGgGgGgGgGgg.',
];
const SNAKE_TOP = {
  coil: [
    '..............',
    '..............',
    '..............',
    '....gGgGgGg...',
    '..ggdddddggegg',
  ],
  hiss: [
    '..........ggg.',
    '.........gdegt',
    '.........gg..t',
    '....gGgGgGg...',
    '..ggdddddgg...',
  ],
};
const GRASS = [
  '.Q......Q.....Q...',
  '.q.Q...qQ...Q.q.Q.',
  'qQ.q.Q.q.q.Qq.qQq.',
  'qqQqqqQqqQqqqQqqqQ',
];

// ---- Άδης στον θρόνο (μπροστινή όψη) ----
const HADES = [
  '..nn........nn..',
  '..mm.y.yy.y.mm..',
  '..mm.kykkyk.mm..',
  '..mm.KssssK.mm..',
  '..mm.KeSSeK.mm..',
  '..mm.KsssSK.mm..',
  '..mm.KKKKKK.mm..',
  '..mmkKKKKKKkmm..',
  '..mkkkKKKKkkkm..',
  '..mkykkKKkkykm..',
  '..mkkkkkkkkkkm..',
  '..mskkyyyykksm..',
  '.nnnkkkkkkkknnn.',
  '.mmmkkkkkkkkmmm.',
  '.mmmKkkkkkkKmmm.',
  '.mmmmKkkkkKmmmm.',
  '.mmmmKkkkkKmmmm.',
  '.MMMMbb..bbMMMM.',
  '.nnnnnnnnnnnnnn.',
  '.MMMMMMMMMMMMMM.',
];
// Μικρό σκυλί του Κάτω Κόσμου με τρία κεφάλια, δίπλα στον θρόνο.
const HOUND = [
  'k.k.k.....',
  'rkrkrk....',
  'kkkkkk....',
  '..kkkk....',
  '..kkkkkkk.',
  '..kkkkkkkk',
  '..k.k..kk.',
];

// ---- Περσεφόνη στον θρόνο (λευκό φόρεμα, στέμμα με ρόδι) ----
const PERSEPHONE = [
  '..nn...r....nn..',
  '..mm.yrRRry.mm..',
  '..mm.aaaaaa.mm..',
  '..mm.assssa.mm..',
  '..mm.aessea.mm..',
  '..mm.aSssSa.mm..',
  '..mm.aasSaa.mm..',
  '..mmawwwwwwamm..',
  '..mawwwrwwwwam..',
  '..mawwwwwwwwam..',
  '..mswwwyywwwsm..',
  '..mswwwwwwwwsm..',
  '.nnnwwwwwwwwnnn.',
  '.mmmWwwwwwwWmmm.',
  '.mmmWwwwrwwWmmm.',
  '.mmmmWwwwwWmmmm.',
  '.mmmmWwwwwWmmmm.',
  '.MMMMss..ssMMMM.',
  '.nnnnnnnnnnnnnn.',
  '.MMMMMMMMMMMMMM.',
];
// Γέρνει προς τον Άδη (που κάθεται αριστερά της): το κεφάλι ένα pixel αριστερά.
const PERSEPHONE_LEAN = PERSEPHONE.map((r, i) => [
  '..nn..r.....nn..',
  '..mmyrRRry..mm..',
  '..mmaaaaaa..mm..',
  '..mmassssa..mm..',
  '..mmaessea..mm..',
  '..mmaSssSa..mm..',
  '..mmaasSaa..mm..',
][i] || r);

// ---- Χάροντας (ηλιοκαμένος βαρκάρης με κουπί) και η βάρκα του ----
const CHARON = [
  '...BBBB....o',
  '..BBBBBB...o',
  '..BBTTTT...o',
  '..BTTTeT...o',
  '..BTTTTU...o',
  '..BBBBBB...o',
  '...BBBB....o',
  '..zzBBzzTTTo',
  '.zzzzzzz..To',
  '.Zzzzzzz...o',
  '.ZzzzzzzT..o',
  '.Zzzbbzz...o',
  '.Zzzzzzz...o',
  '..Zzzzzz...o',
  '..Zzzzzz...o',
  '..UT..TU...O',
  '..bb..bb...O',
  '...........O',
];
// Όσο περιμένει τον οβολό: απλώνει την παλάμη.
const CHARON_ASK = CHARON.map((r, i) => (i === 10 ? '.ZzzzzzzTTTo' : r));
const BOAT = [
  'O' + '.'.repeat(26) + 'O',
  'Oo' + '.'.repeat(24) + 'oO',
  '.O' + 'o'.repeat(24) + 'O.',
  '..O' + 'o'.repeat(21) + 'EO..',   // "μάτι" στην πλώρη, όπως στα πλοία των αγγείων
  '...' + 'O'.repeat(22) + '...',
];

// ---- Εικονίδια πάνω από τις σκιές: "ακούει" ((•)) και "ψάχνει" ? ----
const ICON_HEAR = [
  '.y.......y.',
  'y..y...y..y',
  'y.y..y..y.y',
  'y.y.yyy.y.y',
  'y.y..y..y.y',
  'y..y...y..y',
  '.y.......y.',
];
const ICON_SEARCH = [
  '.yy.',
  'y..y',
  '..y.',
  '....',
  '..y.',
];

const Sprites = {
  frames: {},   // name → [{ c: canvas (δεξιά), f: canvas (αριστερά), w, h }]

  init() {
    // Ορφέας: κάθε καρέ σε 4 εκδοχές (0..3 χορδές στη λύρα).
    for (const anim in ORPHEUS_ANIMS) {
      for (let n = 0; n <= 3; n++) {
        this.frames[`orpheus_${anim}_${n}`] = ORPHEUS_ANIMS[anim].map(([up, legs, bob]) => {
          // Πρώτα τα πόδια (γραμμές 13-15), μετά από πάνω το πάνω μέρος, bob γραμμές πιο κάτω.
          const rows = [];
          for (let i = 0; i < 16; i++) rows.push([...(i >= 13 ? ORPHEUS_LEGS[legs][i - 13] : '.'.repeat(13))]);
          ORPHEUS_UPPER[up].forEach((r, i) => [...r].forEach((ch, x) => { if (ch !== '.') rows[i + bob][x] = ch; }));
          // Οι χορδές που δεν έχεις βρει ακόμα λείπουν από τη λύρα.
          const shown = rows.map((r) => r.join('').replace(/[123]/g, (d) => (Number(d) <= n ? d : '.')));
          return this.build(shown, '26,12,6');
        });
      }
    }
    this.frames.eurydice = ['A', 'C', 'B', 'C'].map((k) => this.build([...EURY_TOP, ...EURY_HEM[k]], '120,110,100'));
    this.frames.shade = ['A', 'B'].map((k) => this.build([...SHADE_TOP, ...SHADE_TAT[k]], POT.terra));
    const mirror = (r) => r + [...r].reverse().join('');
    this.frames.erinys = ['A', 'B'].map((k) => this.build(ERINYS_HALF[k].map(mirror), POT.terra));
    this.frames.soul = ['A', 'B'].map((k) => this.build([...SOUL_TOP, ...SOUL_TAIL[k]], '160,140,120'));
    this.frames.snake = ['coil', 'hiss'].map((k) => this.build([...SNAKE_TOP[k], ...SNAKE_BASE], '30,16,8'));
    this.frames.grass = [this.build(GRASS, null)];
    this.frames.hades = [this.build(HADES, POT.terra)];
    this.frames.hound = [this.build(HOUND, POT.terra)];
    this.frames.persephone = [this.build(PERSEPHONE, POT.terra), this.build(PERSEPHONE_LEAN, POT.terra)];
    this.frames.charon = [this.build(CHARON, '26,12,6'), this.build(CHARON_ASK, '26,12,6')];
    this.frames.boat = [this.build(BOAT, POT.terra)];
    this.frames.iconHear = [this.build(ICON_HEAR, null)];
    this.frames.iconSearch = [this.build(ICON_SEARCH, null)];
  },

  // Φτιάχνει τον καμβά ενός sprite. outline = χρώμα του περιγράμματος (1 pixel γύρω
  // από το σχήμα, μόνο οριζόντια / κάθετα), ή null για χωρίς περίγραμμα.
  build(rows, outline) {
    const h = rows.length, w = rows[0].length;
    for (const r of rows) if (r.length !== w) console.warn('sprite row width', r);
    const pad = outline ? 1 : 0;
    const W = w + pad * 2, H = h + pad * 2;
    const make = (flip) => {
      const cv = document.createElement('canvas');
      cv.width = W;
      cv.height = H;
      const c = cv.getContext('2d');
      const img = c.createImageData(W, H);
      const put = (x, y, rgb) => {
        const i = (y * W + (flip ? W - 1 - x : x)) * 4;
        const [r, g, b] = rgb.split(',').map(Number);
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b; img.data[i + 3] = 255;
      };
      const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && rows[y][x] !== '.';
      for (let y = -pad; y < h + pad; y++) {
        for (let x = -pad; x < w + pad; x++) {
          if (solid(x, y)) {
            put(x + pad, y + pad, SPR_PAL[rows[y][x]]);
          } else if (outline && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1))) {
            put(x + pad, y + pad, outline);
          }
        }
      }
      c.putImageData(img, 0, 0);
      return cv;
    };
    return { c: make(false), f: make(true), w: W, h: H };
  },

  get(name, i = 0) {
    const list = this.frames[name];
    return list[((i % list.length) + list.length) % list.length];
  },

  // Από συντεταγμένες κόσμου σε art pixels του καμβά (με τον τωρινό μετασχηματισμό του ctx).
  toArt(ctx, x, y) {
    const t = ctx.getTransform();
    return { x: t.a * x + t.c * y + t.e, y: t.b * x + t.d * y + t.f };
  },

  // Ζωγραφίζει το sprite με το κάτω-κέντρο του στο (ax, ay) σε art pixels,
  // κουμπωμένο σε ακέραια pixels. opts: { flip, alpha, scale (ακέραιος), center }
  // center = το (ax, ay) είναι το κέντρο του sprite αντί για το κάτω μέρος.
  blit(ctx, name, i, ax, ay, opts = {}) {
    const s = this.get(name, i);
    const k = opts.scale || 1;
    const w = s.w * k, h = s.h * k;
    const sx = Math.round(ax - w / 2);
    const sy = Math.round(ay - (opts.center ? h / 2 : h));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (opts.alpha !== undefined) ctx.globalAlpha *= Math.max(0, Math.min(1, opts.alpha));
    ctx.drawImage(opts.flip ? s.f : s.c, sx, sy, w, h);
    ctx.restore();
    return { x: sx, y: sy, w, h };
  },

  // Όπως το blit, αλλά σε συντεταγμένες κόσμου.
  draw(ctx, name, i, x, y, opts = {}) {
    const p = this.toArt(ctx, x, y);
    return this.blit(ctx, name, i, p.x, p.y, opts);
  },
};
