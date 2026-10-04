'use strict';

// Pixel art (STORY.md, ενότητα 6): ο κόσμος ζωγραφίζεται σε έναν μικρό καμβά (π.χ.
// ~195×422 σε κινητό) και μεγαλώνει χωρίς εξομάλυνση, οπότε κάθε "pixel" της
// ζωγραφιάς γίνεται ένα καθαρό τετράγωνο. Πριν μεγαλώσει, τα χρώματα κβαντίζονται
// σε λίγα επίπεδα με διάχυση Bayer 4×4 (ordered dithering), όπως στις παλιές κονσόλες:
// οι λάμψεις και οι σκιάσεις γίνονται "κουκκιδωτές" διαβαθμίσεις.
const PIXEL_TARGET = 200;    // περίπου πόσα art pixels χωράνε στη μικρή πλευρά της οθόνης
const PIXEL_LEVELS = 9;      // επίπεδα ανά κανάλι χρώματος (λιγότερα = πιο "8-bit")
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const Pixel = {
  canvas: null,
  ctx: null,
  w: 0,          // πλάτος σε art pixels
  h: 0,
  px: 2,         // πόσα CSS pixels είναι ένα art pixel
  dither: true,
  _lut: null,    // [16][256]: κβαντισμένη τιμή για κάθε κατώφλι Bayer και κάθε τιμή καναλιού

  init() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    // Πίνακες κβάντισης: κάθε κανάλι σε PIXEL_LEVELS επίπεδα, με κατώφλι ανά θέση Bayer.
    // Η κβάντιση γίνεται σε "γάμμα" χώρο: περισσότερα επίπεδα στα σκούρα, ώστε το
    // σκοτάδι να μένει καθαρό και να μη γεμίζει κόκκους.
    const L = PIXEL_LEVELS;
    this._lut = BAYER4.map((b) => {
      const off = (b / 16 - 0.5) / L;
      const t = new Uint8ClampedArray(256);
      for (let v = 0; v < 256; v++) {
        const g = Math.pow(v / 255, 1 / 2.2);
        const q = Math.round(Math.max(0, Math.min(1, g + off)) * L) / L;
        t[v] = v < 4 ? 0 : Math.round(Math.pow(q, 2.2) * 255);
      }
      return t;
    });
  },

  resize(cssW, cssH) {
    this.px = Math.max(2, Math.round(Math.min(cssW, cssH) / PIXEL_TARGET));
    this.w = Math.ceil(cssW / this.px);
    this.h = Math.ceil(cssH / this.px);
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  },

  // Καθαρίζει τον μικρό καμβά και τον δίνει για ζωγραφική (συντεταγμένες σε art pixels).
  begin() {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.fillStyle = '#000';
    c.fillRect(0, 0, this.w, this.h);
    return c;
  },

  // Κβάντιση με dithering (μόνο στα pixels που δεν είναι εντελώς μαύρα — τα περισσότερα είναι).
  quantize() {
    const img = this.ctx.getImageData(0, 0, this.w, this.h);
    const d = img.data, w = this.w, lut = this._lut;
    for (let y = 0, i = 0; y < this.h; y++) {
      const row = (y & 3) * 4;
      for (let x = 0; x < w; x++, i += 4) {
        if ((d[i] | d[i + 1] | d[i + 2]) === 0) continue;
        const t = lut[row + (x & 3)];
        d[i] = t[d[i]];
        d[i + 1] = t[d[i + 1]];
        d[i + 2] = t[d[i + 2]];
      }
    }
    this.ctx.putImageData(img, 0, 0);
  },

  // Μεταφέρει τον μικρό καμβά στον κανονικό, μεγεθυμένο με καθαρά τετράγωνα pixels.
  // (ox, oy) = μετατόπιση σε art pixels (π.χ. τίναγμα της οθόνης).
  present(mainCtx, dpr, ox = 0, oy = 0) {
    if (this.dither) this.quantize();
    const k = this.px * dpr;
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);
    mainCtx.imageSmoothingEnabled = false;
    mainCtx.drawImage(this.canvas, 0, 0, this.w, this.h,
      Math.round(ox * k), Math.round(oy * k), this.w * k, this.h * k);
    mainCtx.imageSmoothingEnabled = true;
  },
};
