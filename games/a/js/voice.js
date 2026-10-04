'use strict';

// Φωνές χαρακτήρων (STORY.md, ενότητα 10): chiptune συνθετικές φωνές, χωρίς αρχεία ήχου.
// Κάθε χαρακτήρας "μιλάει" με συλλαβές 8-bit στο δικό του ηχόχρωμα, σε συγχρονισμό με
// τον υπότιτλο. Οι συλλαβές βγαίνουν από το ίδιο το κείμενο: πόσες είναι, τι φωνήεν
// έχουν (αυτό αλλάζει το "χρώμα" — formants), πού σταματάει η πρόταση, αν είναι ερώτηση.

// Χαρακτήρες φωνής.
//   wave: κυματομορφή, f0: βασική συχνότητα, syl: διάρκεια συλλαβής (δευτ.),
//   range: πόσα ημιτόνια ανεβοκατεβαίνει, cut: lowpass, crush: "8-bit" παραμόρφωση (0..1),
//   breath: θόρυβος ανάσας (0..1), wobble: τρέμουλο τόνου (ημιτόνια), vol: ένταση,
//   whisper: μόνο θόρυβος μέσα από formants (ψίθυρος), reverb: πόσο στη σπηλιά.
//   fmt: πόσο ψηλά είναι τα formants — το "μέγεθος" του λαιμού, αυτό που κάνει μια φωνή να
//        ακούγεται αντρική (< 1) ή γυναικεία (> 1), πέρα από το ύψος f0.
//   hum: σε ψίθυρο, λίγος τόνος στο f0 από κάτω, για να ακούγεται αν είναι άντρας ή γυναίκα.
const VOICES = {
  // Ο αφηγητής: ζεστός, ήρεμος (αντρική φωνή).
  narrator: { wave: 'pulse', f0: 150, syl: 0.13, range: 3, cut: 2600, crush: 0.25, breath: 0.05, wobble: 0.1, vol: 0.2, reverb: 0.35, fmt: 1 },
  // Ο Ορφέας: νέος άντρας, τραγουδιστής — ζεστή, μελωδική φωνή.
  orpheus:  { wave: 'sawtooth', f0: 132, syl: 0.14, range: 5, cut: 2300, crush: 0.2, breath: 0.08, wobble: 0.12, vol: 0.19, reverb: 0.45, fmt: 0.95 },
  charon:   { wave: 'sawtooth', f0: 62, syl: 0.2, range: 2, cut: 1100, crush: 0.7, breath: 0.12, wobble: 0.3, vol: 0.26, reverb: 0.55, fmt: 0.82 },
  hades:    { wave: 'square', f0: 78, syl: 0.18, range: 2, cut: 1300, crush: 0.5, breath: 0.04, wobble: 0.08, vol: 0.24, reverb: 0.7, fmt: 0.85 },
  // Η Ευρυδίκη: γυναίκα — ψηλή, απαλή, με ανάσα.
  eurydice: { wave: 'triangle', f0: 300, syl: 0.15, range: 4, cut: 3600, crush: 0.1, breath: 0.45, wobble: 0.15, vol: 0.2, reverb: 0.8, fmt: 1.2 },
  // Σκιές: παραμορφωμένο βογκητό, αντρικό ή γυναικείο.
  shade:    { wave: 'sawtooth', f0: 110, syl: 0.2, range: 7, cut: 1700, crush: 0.85, breath: 0.35, wobble: 1.8, vol: 0.24, reverb: 0.7, fmt: 0.88 },
  shadeF:   { wave: 'sawtooth', f0: 215, syl: 0.19, range: 7, cut: 2600, crush: 0.8, breath: 0.4, wobble: 1.9, vol: 0.22, reverb: 0.7, fmt: 1.18 },
  // Ερινύες: γυναικείο, τραχύ στρίγγλισμα με σφύριγμα φιδιών (πολύ θόρυβος).
  erinys:   { wave: 'sawtooth', f0: 255, syl: 0.17, range: 8, cut: 3400, crush: 0.7, breath: 0.6, wobble: 1.2, vol: 0.22, reverb: 0.75, fmt: 1.22 },
  // Χαμένες ψυχές: ψίθυροι — άντρας, γέρος, γυναίκα.
  soulM:    { wave: 'triangle', f0: 118, syl: 0.16, range: 3, cut: 2500, crush: 0, breath: 1, wobble: 0.2, vol: 0.2, whisper: true, hum: 0.14, reverb: 0.8, fmt: 0.88 },
  soulOld:  { wave: 'triangle', f0: 92, syl: 0.19, range: 2, cut: 2100, crush: 0, breath: 1, wobble: 0.5, vol: 0.2, whisper: true, hum: 0.12, reverb: 0.8, fmt: 0.82 },
  soulF:    { wave: 'triangle', f0: 225, syl: 0.15, range: 4, cut: 3800, crush: 0, breath: 1, wobble: 0.2, vol: 0.2, whisper: true, hum: 0.14, reverb: 0.8, fmt: 1.2 },
};

// Formants (F1, F2) για κάθε φωνήεν — δίνουν στη φωνή το "α", "ε", "ι", "ο", "ου".
const FORMANTS = {
  a: [800, 1200], e: [500, 1800], i: [320, 2250], o: [500, 900], u: [350, 800], y: [320, 2250],
};

// Μια σταθερή "πεντατονική" κλίμακα: τα ύψη πηδάνε σε νότες, όπως στις φωνές των παλιών παιχνιδιών.
const VOICE_SCALE = [0, 2, 4, 7, 9, 12, -3, -5];

const Voice = {
  active: [],     // ζωντανοί κόμβοι, για να σταματάνε όταν πατάς "επόμενη γραμμή"
  _crushCurve: null,
  _pulse: null,

  // Χωρίζει το κείμενο σε συλλαβές: { vowel, pause, rise, fall }.
  syllables(text) {
    const out = [];
    const words = text.split(/\s+/).filter(Boolean);
    words.forEach((w, wi) => {
      const clean = w.toLowerCase().replace(/[^a-z']/g, '');
      const groups = clean.match(/[aeiouy]+/g) || ['a'];
      groups.forEach((g, gi) => {
        out.push({ vowel: g[0], pause: 0, hash: (wi * 7 + gi * 3 + clean.length * 5 + g.charCodeAt(0)) % 97 });
      });
      const last = out[out.length - 1];
      if (/\.\.\.$/.test(w)) last.pause = 0.45;
      else if (/[.!]$/.test(w)) { last.pause = 0.32; last.fall = true; }
      else if (/\?$/.test(w)) { last.pause = 0.32; last.rise = true; }
      else if (/[,;:]$/.test(w)) last.pause = 0.16;
    });
    const end = out[out.length - 1];
    if (end && !end.rise) end.fall = true;
    return out;
  },

  // Πόσο θα κρατήσει η φράση (δευτ.), χωρίς να παίξει τίποτα.
  duration(text, who) {
    const v = VOICES[who] || VOICES.narrator;
    return this.syllables(text).reduce((s, x) => s + v.syl + x.pause, 0);
  },

  crushCurve(ac) {
    if (this._crushCurve) return this._crushCurve;
    // "8-bit": ο ήχος κβαντίζεται σε λίγα επίπεδα.
    const c = new Float32Array(1024), levels = 6;
    for (let i = 0; i < c.length; i++) {
      const x = (i / (c.length - 1)) * 2 - 1;
      c[i] = Math.round(Math.tanh(x * 1.6) * levels) / levels;
    }
    this._crushCurve = c;
    return c;
  },

  pulseWave(ac) {
    if (this._pulse) return this._pulse;
    // Παλμός 25% — ο κλασικός ήχος των κονσολών 8-bit.
    const n = 32, re = new Float32Array(n), im = new Float32Array(n), duty = 0.25;
    for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    this._pulse = ac.createPeriodicWave(re, im);
    return this._pulse;
  },

  stop() {
    const t = Sound.ctx ? Sound.ctx.currentTime : 0;
    for (const n of this.active) {
      try {
        if (n.gain) { n.gain.cancelScheduledValues(t); n.gain.setTargetAtTime(0, t, 0.03); }
        if (n.src) n.src.stop(t + 0.12);
      } catch (_) { /* ήδη σταματημένο */ }
    }
    this.active = [];
  },

  // Λέει μια φράση. opts: { x, y } = από εκείνο το σημείο του κόσμου (panning, απόσταση),
  // fade: true = σβήνει σιγά σιγά ως τη σιωπή, delay: δευτ. πριν ξεκινήσει.
  // Επιστρέφει πόσο κρατάει (δευτ.) — για να μένει ο υπότιτλος όσο χρειάζεται.
  say(text, who, opts = {}) {
    const dur = this.duration(text, who);
    if (!Sound.ready()) return dur;
    const ac = Sound.ctx, v = VOICES[who] || VOICES.narrator;
    const t0 = ac.currentTime + (opts.delay || 0) + 0.03;
    const mine = [];   // οι κόμβοι αυτής της φράσης
    const keep = (n) => { mine.push(n); this.active.push(n); };

    // Έξοδος: μια γραμμή για όλη τη φράση (με θέση στον κόσμο αν δοθεί).
    const out = ac.createGain();
    out.gain.value = 1;
    if (opts.x !== undefined) {
      const sp = Sound.spatial(opts.x, opts.y, 1, 650);
      out.connect(sp);
    } else {
      out.connect(Sound.sfx);
    }
    const rev = ac.createGain();
    rev.gain.value = v.reverb;
    out.connect(rev);
    rev.connect(Sound.reverbSend);
    if (opts.fade) {
      out.gain.setValueAtTime(1, t0);
      out.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.2);
    }
    keep({ gain: out.gain });

    // Κοινή αλυσίδα ηχοχρώματος: 8-bit κβάντιση → lowpass.
    const shaper = ac.createWaveShaper();
    shaper.curve = this.crushCurve(ac);
    const dry = ac.createGain(), wet = ac.createGain();
    dry.gain.value = 1 - v.crush;
    wet.gain.value = v.crush;
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = v.cut;
    const mix = ac.createGain();
    mix.connect(dry);
    mix.connect(shaper);
    shaper.connect(wet);
    dry.connect(lp);
    wet.connect(lp);
    lp.connect(out);

    let t = t0;
    const syl = this.syllables(text);
    syl.forEach((s, i) => {
      const step = VOICE_SCALE[s.hash % VOICE_SCALE.length] * (v.range / 7);
      let semi = step;
      if (s.fall) semi -= 3;
      if (s.rise) semi += 5;
      // Η φωνή πέφτει λίγο όσο προχωράει η φράση (όπως όταν μιλάμε).
      semi -= (i / Math.max(1, syl.length)) * 1.5;
      const f = v.f0 * Math.pow(2, semi / 12);
      const len = v.syl * (s.fall || s.rise ? 1.5 : 1) * (0.85 + (s.hash % 5) * 0.06);
      const [f1, f2] = (FORMANTS[s.vowel] || FORMANTS.a).map((f) => f * (v.fmt || 1));

      // Formants αυτής της συλλαβής.
      const env = ac.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(v.vol, t + Math.min(0.03, len * 0.25));
      env.gain.setValueAtTime(v.vol, t + len * 0.6);
      env.gain.exponentialRampToValueAtTime(0.0001, t + len);
      const b1 = ac.createBiquadFilter();
      b1.type = 'bandpass'; b1.frequency.value = f1; b1.Q.value = 5;
      const b2 = ac.createBiquadFilter();
      b2.type = 'bandpass'; b2.frequency.value = f2; b2.Q.value = 7;
      const g1 = ac.createGain(); g1.gain.value = 2.6;
      const g2 = ac.createGain(); g2.gain.value = 1.4;
      b1.connect(g1); b2.connect(g2);
      g1.connect(env); g2.connect(env);
      env.connect(mix);

      if (!v.whisper) {
        const o = ac.createOscillator();
        if (v.wave === 'pulse') o.setPeriodicWave(this.pulseWave(ac));
        else o.type = v.wave;
        // Chiptune: η συλλαβή ξεκινάει με ένα γρήγορο "αρπίσιμο" μια οκτάβα πάνω.
        o.frequency.setValueAtTime(f * 2, t);
        o.frequency.setValueAtTime(f, t + 0.025);
        if (s.rise) o.frequency.linearRampToValueAtTime(f * 1.25, t + len);
        if (s.fall) o.frequency.linearRampToValueAtTime(f * 0.82, t + len);
        if (v.wobble > 0.5) {
          // Οι σκιές: ο τόνος "λιώνει" και τρέμει σαν βογκητό.
          const lfo = ac.createOscillator();
          lfo.frequency.value = 5 + (s.hash % 4);
          const lg = ac.createGain();
          lg.gain.value = f * (Math.pow(2, v.wobble / 12) - 1);
          lfo.connect(lg);
          lg.connect(o.frequency);
          lfo.start(t);
          lfo.stop(t + len + 0.05);
        }
        o.connect(b1);
        o.connect(b2);
        // Λίγος καθαρός τόνος για να ακούγεται το ύψος (όχι μόνο τα formants).
        const body = ac.createGain();
        body.gain.value = 0.25;
        o.connect(body);
        body.connect(env);
        o.start(t);
        o.stop(t + len + 0.05);
        keep({ src: o });
      } else if (v.hum) {
        // Ψίθυρος με λίγη "φωνή" από κάτω: ακούγεται αν είναι άντρας ή γυναίκα.
        const o = ac.createOscillator();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, t);
        if (s.fall) o.frequency.linearRampToValueAtTime(f * 0.85, t + len);
        const hg = ac.createGain();
        hg.gain.value = v.hum;
        o.connect(hg);
        hg.connect(b1);
        hg.connect(env);
        o.start(t);
        o.stop(t + len + 0.05);
        keep({ src: o });
      }

      if (v.breath > 0) {
        const n = Sound.noiseSource();
        const ng = ac.createGain();
        ng.gain.value = v.breath * (v.whisper ? 1.6 : 0.5);
        n.connect(ng);
        ng.connect(b1);
        ng.connect(b2);
        n.start(t, Math.random() * 1.5);
        n.stop(t + len + 0.05);
        keep({ src: n });
      }

      t += len + s.pause;
    });
    // Όταν τελειώσει η φράση, οι κόμβοι της φεύγουν από τη λίστα του stop().
    setTimeout(() => {
      this.active = this.active.filter((n) => !mine.includes(n));
    }, (t - ac.currentTime + 0.5) * 1000);
    return t - t0;
  },
};
