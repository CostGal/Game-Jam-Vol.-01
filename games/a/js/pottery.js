'use strict';

// Το στυλ των αρχαίων ελληνικών αγγείων (STORY.md, ενότητα 6): μαύρο φόντο,
// γραμμές και μορφές στο χρώμα του πηλού (terracotta), μαίανδροι για διακόσμηση.
// Οι μορφές είναι απλές σιλουέτες με "χαραγμένες" μαύρες λεπτομέρειες, όπως
// χάραζαν οι αγγειογράφοι τις λεπτομέρειες πάνω στις μορφές.
const POT = {
  terra: '206,108,56',      // το κύριο χρώμα του πηλού
  light: '236,156,98',      // φωτεινός πηλός (πυρήνας των γραμμών)
  cream: '242,218,184',     // "πρόσθετο λευκό" — γυναίκες, αντικείμενα, ψυχές
  red: '150,38,26',         // "πρόσθετο κόκκινο" — οι σκιές
  black: '10,6,4',          // το μαύρο γάνωμα
};

const Pottery = {
  rgba(color, a) {
    return `rgba(${color},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  },

  // Μαίανδρος (ελληνικό κλειδί) σε λωρίδα ύψους h, από το x ως το x + w.
  // Μια συνεχής γραμμή βάσης με "σπείρες" που υψώνονται από πάνω της.
  meander(ctx, x, y, w, h, color, alpha, lineWidth) {
    const u = h;                      // πλάτος ενός μοτίβου
    ctx.save();
    ctx.strokeStyle = this.rgba(color, alpha);
    ctx.lineWidth = lineWidth || Math.max(1, h / 9);
    ctx.lineJoin = 'miter';
    ctx.lineCap = 'square';
    ctx.beginPath();
    const b = y + h * 0.92, t = y + h * 0.08;
    ctx.moveTo(x, b);
    ctx.lineTo(x + w, b);
    ctx.moveTo(x, t);
    ctx.lineTo(x + w, t);
    for (let ux = x; ux + u <= x + w + 0.01; ux += u) {
      const k = u / 16;
      ctx.moveTo(ux + 13 * k, b);
      ctx.lineTo(ux + 13 * k, y + 3 * k);
      ctx.lineTo(ux + 4 * k, y + 3 * k);
      ctx.lineTo(ux + 4 * k, y + 11 * k);
      ctx.lineTo(ux + 9 * k, y + 11 * k);
      ctx.lineTo(ux + 9 * k, y + 7 * k);
    }
    ctx.stroke();
    ctx.restore();
  },

  // Χαραγμένη λεπτομέρεια: μαύρη γραμμή πάνω στη μορφή.
  incise(ctx, pts, s) {
    ctx.strokeStyle = this.rgba(POT.black, 0.9);
    ctx.lineWidth = Math.max(0.8, s * 0.018);
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
  },

  // Πηλός "ψημένος" στη φωτιά: φωτεινότερος από τη μία πλευρά, σκουρότερος από την άλλη.
  clay(ctx, x0, y0, x1, y1, alpha, base) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, this.rgba(POT.light, alpha));
    g.addColorStop(0.5, this.rgba(base || POT.terra, alpha));
    g.addColorStop(1, this.rgba('116,52,26', alpha));
    return g;
  },

  // Τρίποδας με λεκάνη φωτιάς (βωμός). (x, y) = το έδαφος στη μέση, s = ύψος.
  brazier(ctx, x, y, s, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    ctx.strokeStyle = this.rgba(POT.terra, alpha);
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.beginPath();     // τρία πόδια
    ctx.moveTo(-0.34 * s, 0); ctx.lineTo(-0.16 * s, -0.5 * s);
    ctx.moveTo(0.34 * s, 0); ctx.lineTo(0.16 * s, -0.5 * s);
    ctx.moveTo(0, 0); ctx.lineTo(0, -0.5 * s);
    ctx.stroke();
    // Λεκάνη με ζώνη μαιάνδρου.
    ctx.fillStyle = this.clay(ctx, -0.5 * s, 0, 0.5 * s, 0, alpha);
    ctx.beginPath();
    ctx.moveTo(-0.5 * s, -0.62 * s);
    ctx.quadraticCurveTo(-0.44 * s, -0.4 * s, 0, -0.36 * s);
    ctx.quadraticCurveTo(0.44 * s, -0.4 * s, 0.5 * s, -0.62 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = this.rgba(POT.black, alpha * 0.9);
    ctx.lineWidth = Math.max(0.8, s * 0.03);
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      ctx.moveTo(i * 0.11 * s - 0.03 * s, -0.5 * s);
      ctx.lineTo(i * 0.11 * s - 0.03 * s, -0.56 * s);
      ctx.lineTo(i * 0.11 * s + 0.03 * s, -0.56 * s);
    }
    ctx.stroke();
    ctx.strokeStyle = this.rgba(POT.light, alpha);
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath();     // χείλος
    ctx.moveTo(-0.54 * s, -0.63 * s);
    ctx.lineTo(0.54 * s, -0.63 * s);
    ctx.stroke();
    ctx.restore();
  },


  // Ο Κέρβερος ξαπλωμένος, κοιτάζει δεξιά: σώμα, μπροστινά πόδια απλωμένα, τρία
  // κεφάλια το ένα πάνω από το άλλο, ουρά-φίδι. (x, y) = το έδαφος στη μέση, L = μήκος.
  // barking[i] = true όταν το κεφάλι i γαβγίζει (0 = μπροστινό/χαμηλό, 2 = πίσω/ψηλό):
  // τότε ανοίγει το στόμα και το μάτι του. breath = 0..1, πολύ ήπια ανάσα στον ύπνο.
  cerberus(ctx, x, y, L, alpha, barking, breath) {
    const fill = this.rgba(POT.terra, alpha);
    const b = 1 + 0.03 * breath;
    ctx.save();
    ctx.translate(x, y);

    // Ουρά-φίδι που κουλουριάζεται πίσω.
    ctx.strokeStyle = fill;
    ctx.lineWidth = L * 0.03;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.36 * L, -0.14 * L);
    ctx.quadraticCurveTo(-0.55 * L, -0.12 * L, -0.5 * L, -0.28 * L);
    ctx.quadraticCurveTo(-0.45 * L, -0.4 * L, -0.56 * L, -0.42 * L);
    ctx.stroke();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-0.55 * L, -0.45 * L);
    ctx.lineTo(-0.63 * L, -0.42 * L);
    ctx.lineTo(-0.55 * L, -0.39 * L);
    ctx.fill();

    // Σώμα και πίσω πόδι.
    ctx.beginPath();
    ctx.ellipse(-0.1 * L, -0.15 * L * b, 0.3 * L, 0.14 * L * b, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-0.3 * L, -0.08 * L, 0.12 * L, 0.08 * L, 0, 0, Math.PI * 2);
    ctx.fill();
    // Μπροστινά πόδια απλωμένα μπροστά, με τα κεφάλια ακουμπισμένα πάνω τους.
    ctx.beginPath();
    ctx.moveTo(0.05 * L, -0.07 * L);
    ctx.lineTo(0.46 * L, -0.05 * L);
    ctx.quadraticCurveTo(0.5 * L, -0.02 * L, 0.46 * L, 0);
    ctx.lineTo(0.05 * L, 0);
    ctx.closePath();
    ctx.fill();
    // Χαραγμένα πλευρά και κολάρο.
    if (alpha > 0.3) {
      for (const k of [-0.2, -0.1, 0]) {
        this.incise(ctx, [k * L - 0.03 * L, -0.24 * L, k * L + 0.02 * L, -0.08 * L], L * 0.5);
      }
      this.incise(ctx, [0.36 * L, -0.03 * L, 0.36 * L, 0], L * 0.4);
      this.incise(ctx, [0.42 * L, -0.03 * L, 0.42 * L, 0], L * 0.4);
    }

    // Τα τρία κεφάλια: από το πίσω (ψηλό) προς το μπροστινό (χαμηλό).
    const heads = [
      { hx: 0.33, hy: -0.11 },   // 0: μπροστινό, χαμηλό
      { hx: 0.27, hy: -0.23 },   // 1: μεσαίο
      { hx: 0.19, hy: -0.35 },   // 2: πίσω, ψηλό
    ];
    for (let i = 2; i >= 0; i--) {
      const barkNow = barking && barking[i];
      const hx = heads[i].hx * L, hy = (heads[i].hy - (barkNow ? 0.03 : 0)) * L;
      ctx.fillStyle = fill;
      // Λαιμός από τους ώμους ως το κεφάλι.
      ctx.beginPath();
      ctx.moveTo(0.05 * L, -0.22 * L);
      ctx.lineTo(hx - 0.02 * L, hy - 0.05 * L);
      ctx.lineTo(hx + 0.01 * L, hy + 0.05 * L);
      ctx.lineTo(0.12 * L, -0.08 * L);
      ctx.closePath();
      ctx.fill();
      // Κρανίο, αυτί, μουσούδα.
      ctx.beginPath();
      ctx.ellipse(hx, hy, 0.085 * L, 0.062 * L, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(hx - 0.05 * L, hy - 0.04 * L);
      ctx.lineTo(hx - 0.075 * L, hy - 0.13 * L);
      ctx.lineTo(hx + 0.005 * L, hy - 0.055 * L);
      ctx.fill();
      ctx.beginPath();
      if (barkNow) {
        // Ανοιχτό στόμα: πάνω σαγόνι σηκωμένο, κάτω σαγόνι κατεβασμένο.
        ctx.moveTo(hx + 0.04 * L, hy - 0.03 * L);
        ctx.lineTo(hx + 0.17 * L, hy - 0.05 * L);
        ctx.lineTo(hx + 0.16 * L, hy - 0.01 * L);
        ctx.lineTo(hx + 0.05 * L, hy + 0.005 * L);
        ctx.lineTo(hx + 0.14 * L, hy + 0.05 * L);
        ctx.lineTo(hx + 0.12 * L, hy + 0.075 * L);
        ctx.lineTo(hx + 0.03 * L, hy + 0.05 * L);
      } else {
        ctx.moveTo(hx + 0.04 * L, hy - 0.03 * L);
        ctx.lineTo(hx + 0.16 * L, hy - 0.005 * L);
        ctx.lineTo(hx + 0.155 * L, hy + 0.03 * L);
        ctx.lineTo(hx + 0.04 * L, hy + 0.045 * L);
      }
      ctx.closePath();
      ctx.fill();
      // Μάτι: κλειστό (χαραγμένο τόξο) όταν κοιμάται, ανοιχτό όταν γαβγίζει.
      if (barkNow) {
        ctx.fillStyle = this.rgba(POT.cream, alpha);
        ctx.beginPath();
        ctx.arc(hx + 0.025 * L, hy - 0.015 * L, 0.012 * L, 0, Math.PI * 2);
        ctx.fill();
      } else if (alpha > 0.3) {
        ctx.strokeStyle = this.rgba(POT.black, 0.9);
        ctx.lineWidth = Math.max(0.8, L * 0.008);
        ctx.beginPath();
        ctx.arc(hx + 0.025 * L, hy - 0.02 * L, 0.014 * L, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
      // Περίγραμμα, ώστε τα κεφάλια να ξεχωρίζουν μεταξύ τους.
      ctx.strokeStyle = this.rgba(POT.black, 0.85);
      ctx.lineWidth = Math.max(0.8, L * 0.008);
      ctx.beginPath();
      ctx.ellipse(hx, hy, 0.085 * L, 0.062 * L, 0, Math.PI * 0.6, Math.PI * 1.6);
      ctx.stroke();
    }
    ctx.restore();
  },
};
