/* Results page. Public after Sunday 21:30; the organiser (Kostas key) can preview earlier. */
(function(){
  const app=document.getElementById("app"), sub=document.getElementById("rsub");
  const RELEASE=new Date("2026-10-04T21:30:00+03:00");
  const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
  const esc=GJ.esc, L3=["A","B","C"];
  const MEDAL=["🥇","🥈","🥉"];
  /* Names set by the organiser (override what the database says). game: A Descent, B Patra's Brawlers, C Unremembered */
  const MANUAL={ fan:{name:"Vasssar"}, hater:{name:"Ζέρβας",game:"A",score:3} };
  /* Ceremony audio files (put them in media/ceremony/). Empty = built-in synthesised sounds / no music. */
  const AUDIO={ music:"media/ceremony/music.mp3", drumroll:"media/ceremony/drumroll.mp3", applause:["media/ceremony/clap1.mp3","media/ceremony/clap2.mp3","media/ceremony/clap3.mp3"] };   // applause: small, medium, big (champion)
  const THUMB={A:"games/a/thumb.jpg",B:"games/b/thumb.jpg",C:"games/c/thumb.jpg"};
  let BASIS="valid", DATA=null, EXTRA=null, timer=null, confettiOn=false;
  try{ parent.postMessage({gj:"nav",path:"results.html",title:document.title},location.origin); }catch(e){}

  /* organiser key: #key=… (stored once) */
  const KN="gj_devkey_kostas";
  const m=location.hash.match(/[#&](?:key|edit)=([A-Za-z0-9_-]{20,80})/);
  if(m){ try{ localStorage.setItem(KN,m[1]); }catch(e){} history.replaceState(null,"",location.pathname+location.search); }
  const KEY=(()=>{ try{ return localStorage.getItem(KN)||null; }catch(e){ return null; } })();

  const fmt=ms=>{ const s=Math.max(0,Math.floor(ms/1000)), d=Math.floor(s/86400), h=Math.floor(s%86400/3600), mi=Math.floor(s%3600/60), x=s%60, p=n=>String(n).padStart(2,"0"); return (d?d+"μ ":"")+p(h)+":"+p(mi)+":"+p(x); };

  async function fetchData(){ try{ return await GJ.rpc("gj_results",{p_key:KEY}); }catch(e){ return null; } }
  // fan names (optional RPC: works without it, the fan then shows without a name)
  async function fetchFans(){ try{ return await GJ.rpc("gj_fans",{p_key:KEY}); }catch(e){ return null; } }
  // public extras for the special awards: play time, reactions, fastest clears
  async function fetchExtra(){
    const [st,rc,cl,fans]=await Promise.all([GJ.stats().catch(()=>null),GJ.reactCounts().catch(()=>null),
      Promise.all(L3.map(L=>GJ.clearsList(L).catch(()=>[]))),fetchFans()]);
    return {st,rc,clears:{A:cl[0],B:cl[1],C:cl[2]},fans};
  }

  function rank(sc){
    const arr=L3.filter(l=>sc[l]&&sc[l].n>0).map(l=>Object.assign({l},sc[l]));
    arr.sort((a,b)=> b.avg-a.avg || b.n8-a.n8 || b.n-a.n);
    return arr;
  }
  const winnerOf=(obj)=>{ if(!obj) return null; const e=Object.entries(obj).sort((a,b)=>b[1]-a[1]); if(!e.length) return null; const top=e[0][1]; const tied=e.filter(x=>x[1]===top).map(x=>x[0]); return {tied,count:top}; };

  /* Biggest fan: the highest single rating. Ties: a lone fan beats a crowd, then the score furthest above the game's average. */
  function fanPick(sc){
    let best=null;
    L3.forEach(l=>{ const s=sc[l]; if(!s||!s.n||!s.dist) return; let top=0; for(let i=9;i>=0;i--) if(s.dist[i]>0){ top=i+1; break; } if(!top) return;
      const c={l,score:top,count:s.dist[top-1],gap:top-s.avg};
      if(!best || c.score>best.score || (c.score===best.score && (c.count<best.count || (c.count===best.count && c.gap>best.gap)))) best=c; });
    return best;
  }
  // most divisive: biggest spread of scores (standard deviation)
  function spreadPick(sc){
    let best=null;
    L3.forEach(l=>{ const s=sc[l]; if(!s||s.n<2||!s.dist) return; const v=s.dist.reduce((a,c,i)=>a+c*(i+1-s.avg)**2,0)/s.n; const sd=Math.sqrt(v);
      if(sd>0.05 && (!best||sd>best.sd)) best={l,sd}; });
    return best;
  }
  // harshest / most generous judge: lowest / highest average score given (at least 2 games rated). Needs gj_fans.raters.
  function raterPicks(list){
    const el2=(list||[]).filter(r=>r&&r.name&&r.n>=2&&typeof r.avg==="number"); if(el2.length<2) return null;
    const lo=Math.min(...el2.map(r=>r.avg)), hi=Math.max(...el2.map(r=>r.avg)); if(lo===hi) return null;
    const pick=v=>{ const w=el2.filter(r=>r.avg===v); return {names:w.map(r=>r.name),avg:v,n:w.length===1?w[0].n:null}; };
    return {harsh:pick(lo),generous:pick(hi)};
  }
  const topOf=(obj,min)=>{ const w=winnerOf(obj); return w&&w.count>=(min||1)? w : null; };
  const names=(arr)=>arr.length<=3? arr.join(" & ") : arr.slice(0,2).join(", ")+" & "+(arr.length-2)+" ακόμα";
  const gnames=ls=>ls.map(l=>GJ.gname(l)).join(" & ");

  /* Every award as data: shown as cards on the page and as slides in the ceremony.
     {em, t, dsc, games:[winning letters], nom:true if all games are nominees, win, meta, rows:[{win,meta,l}], wide, lvl:applause 1-3} */
  function voted(d){
    return [["visual","🎨","Καλύτερο οπτικό","Το παιχνίδι που δείχνει καλύτερα"],["bug","🪲","Χρυσό bug","Το πιο αστείο glitch"]].map(([k,em,t,dsc])=>{
      const w=winnerOf(d.awards&&d.awards[k]);
      return {key:k,em,t,dsc,nom:true,lvl:2,games:w?w.tied:[],win:w&&gnames(w.tied),meta:w&&(w.count+(w.count===1?" ψήφος":" ψήφοι")+(w.tied.length>1?" · ισοπαλία":"")),empty:"Καμία ψήφος ακόμα."};
    });
  }
  function special(d,sc,basis){
    const X=EXTRA||{}, out=[];
    // 🎮 most played
    if(X.st){ const t={}; L3.forEach(l=>{ if(X.st[l]&&X.st[l].seconds) t[l]=X.st[l].seconds; }); const w=topOf(t,60);
      out.push({key:"played",em:"🎮",t:"Δεν το άφηναν",dsc:"Οι περισσότερες ώρες παιχνιδιού",nom:true,lvl:1,games:w?w.tied:[],win:w&&gnames(w.tied),meta:w&&("⏱ "+GJ.fmtDur(w.count)+" συνολικά")}); }
    // 💬 most talked about
    if(d.comments){ const w=topOf(d.comments); out.push({key:"talk",em:"💬",t:"Πιο πολυσυζητημένο",dsc:"Τα περισσότερα σχόλια",nom:true,lvl:1,games:w?w.tied:[],win:w&&gnames(w.tied),meta:w&&(w.count+(w.count===1?" σχόλιο":" σχόλια"))}); }
    // reactions
    if(X.rc){ [["music","🎵","Καλύτερος ήχος","Τα περισσότερα 🎵"],["hard","💀","Το πιο δύσκολο","Τα περισσότερα 💀"]].forEach(([k,em,t,dsc])=>{
      const o={}; L3.forEach(l=>{ const n=X.rc[l]&&X.rc[l][k]; if(n) o[l]=n; }); const w=topOf(o);
      out.push({key:k,em,t,dsc,nom:true,lvl:1,games:w?w.tied:[],win:w&&gnames(w.tied),meta:w&&(w.count+" αντιδράσεις")}); }); }
    // 🎢 most divisive
    const sp=spreadPick(sc);
    out.push({key:"spread",em:"🎢",t:"Πιο διχαστικό",dsc:"Οι βαθμοί του απείχαν πιο πολύ",nom:true,lvl:1,games:sp?[sp.l]:[],win:sp&&GJ.gname(sp.l),meta:sp&&("απόκλιση ±"+sp.sd.toFixed(1))});
    // ⚡ speedrunners: fastest clear of each game
    if(X.clears){ const rows=L3.map(l=>{ const r=(X.clears[l]||[]).slice().sort((a,b)=>a.seconds-b.seconds)[0]; return r? {l,win:r.name,meta:"⏱ "+GJ.fmtClock(r.seconds)+" στο "+GJ.gname(l)} : null; }).filter(Boolean);
      if(rows.length) out.push({key:"speed",em:"⚡",t:"Speedrunner",dsc:"Ο πιο γρήγορος τερματισμός",lvl:2,games:rows.map(r=>r.l),rows}); }
    // 😤 / 🥰 judges (needs gj_fans.raters)
    const rp=raterPicks(X.fans&&X.fans.raters&&X.fans.raters[basis]);
    if(rp){ const meta=r=>"Ø "+r.avg.toFixed(2)+(r.n? " σε "+r.n+" παιχνίδια":"");
      out.push({key:"harsh",em:"😤",t:"Πιο αυστηρός κριτής",dsc:"Ο χαμηλότερος μέσος όρος",lvl:1,games:[],win:names(rp.harsh.names),meta:meta(rp.harsh)});
      out.push({key:"generous",em:"🥰",t:"Πιο γενναιόδωρος κριτής",dsc:"Ο ψηλότερος μέσος όρος",lvl:2,games:[],win:names(rp.generous.names),meta:meta(rp.generous)}); }
    // 💘 biggest fan (name needs gj_fans)
    const f=fanPick(sc);
    // 👎 biggest hater (set by the organiser)
    if(MANUAL.hater) out.push({key:"hater",em:"👎",t:"Μεγαλύτερος hater",dsc:"Η πιο χαμηλή ατομική βαθμολογία",lvl:1,wide:true,games:[MANUAL.hater.game],win:MANUAL.hater.name,meta:"έδωσε "+MANUAL.hater.score+"/10 στο "+GJ.gname(MANUAL.hater.game)});
    if(f){ const fn=X.fans&&X.fans[basis]&&X.fans[basis][f.l]; const who=MANUAL.fan&&MANUAL.fan.name? [MANUAL.fan.name] : fn&&fn.score===f.score&&Array.isArray(fn.names)&&fn.names.length? fn.names : null;
      out.push({key:"fan",em:"💘",t:"Μεγαλύτερος fan",dsc:"Η πιο ψηλή ατομική βαθμολογία",lvl:2,wide:true,games:[f.l],
        win:who? names(who) : (f.count===1? "Ένας μυστικός fan" : f.count+" fans"), meta:(who&&who.length>1||!who&&f.count>1? "έδωσαν ":"έδωσε ")+f.score+"/10 στο "+GJ.gname(f.l)}); }
    return out;
  }
  function awCard(a){
    const c=el("div","glass aw"+(a.wide?" wide":"")); c.append(el("b",null,a.em+" "+a.t), el("p","by",a.dsc));
    if(a.rows) a.rows.forEach(r=>{ c.append(el("div","awn",r.win), el("p","by",r.meta)); });
    else if(!a.win) c.append(el("p","empty",a.empty||"Δεν βγήκε νικητής."));
    else { c.append(el("div","awn",a.win)); if(a.meta) c.append(el("p","by",a.meta)); }
    return c;
  }
  // shrink a line until its longest word fits (Bungee is wide: "UNREMEMBERED" must not break mid-word)
  function fit(root){ (root||document).querySelectorAll(".awn,.cname,.cer-win,.cer-t").forEach(e=>{ e.style.fontSize=""; let s=parseFloat(getComputedStyle(e).fontSize), n=0; while(e.scrollWidth>e.clientWidth+1 && s>11 && n++<40){ s-=1; e.style.fontSize=s+"px"; } }); }
  try{ document.fonts&&document.fonts.ready.then(()=>fit()); }catch(e){}
  let rsz; addEventListener("resize",()=>{ clearTimeout(rsz); rsz=setTimeout(()=>fit(),150); });

  /* ---------- sounds: soft drumroll + applause variations, synthesised (no files), quiet ---------- */
  const SFX=(()=>{
    let ac=null, out=null, buf=null, live=[];
    let muted=(()=>{ try{ return localStorage.getItem("gj_cer_mute")==="1"; }catch(e){ return false; } })();
    function init(){ if(ac){ if(ac.state==="suspended") ac.resume(); return; } try{ const C=window.AudioContext||window.webkitAudioContext; if(!C) return; ac=new C();
      out=ac.createGain(); out.gain.value=0.2; out.connect(ac.destination);
      buf=ac.createBuffer(1,ac.sampleRate*0.4|0,ac.sampleRate); const d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }catch(e){ ac=null; } }
    function hit(t,gain,freq,type,decay,pan){ const s=ac.createBufferSource(); s.buffer=buf; const f=ac.createBiquadFilter(); f.type=type; f.frequency.value=freq; f.Q.value=type==="bandpass"?1.1:0.7;
      const g=ac.createGain(); g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(gain,t+0.003); g.gain.exponentialRampToValueAtTime(0.0001,t+decay);
      s.connect(f); f.connect(g); let n=g; if(ac.createStereoPanner){ const p=ac.createStereoPanner(); p.pan.value=pan||0; g.connect(p); n=p; } n.connect(out);
      s.start(t,Math.random()*0.3,decay+0.02); live.push(s); }
    function stop(){ live.forEach(s=>{ try{ s.stop(); }catch(e){} }); live=[]; }
    // optional recorded sounds (AUDIO): decoded once, used instead of the synth
    const files={}; let loaded=false;
    async function loadFiles(){ if(loaded||!ac) return; loaded=true; const get=async u=>{ try{ const r=await fetch(u); if(!r.ok) return null; return await ac.decodeAudioData(await r.arrayBuffer()); }catch(e){ return null; } };
      if(AUDIO.drumroll) files.drum=await get(AUDIO.drumroll); files.clap=(await Promise.all((AUDIO.applause||[]).map(get))).filter(Boolean); }
    let drumG=null;
    function playBuf(b,vol){ const s=ac.createBufferSource(); s.buffer=b; const g=ac.createGain(); g.gain.value=vol; s.connect(g); g.connect(out); s.start(); live.push(s); return g; }
    function drumOff(){ if(drumG){ try{ drumG.gain.setTargetAtTime(0,ac.currentTime,0.06); }catch(e){} drumG=null; } }
    let mus=null;
    function music(on){ if(!AUDIO.music) return; if(!mus){ mus=new Audio(AUDIO.music); mus.loop=true; mus.volume=0.18; }
      if(on&&!muted){ mus.play().catch(()=>{}); } else mus.pause(); }
    // level 1 = a few people, 2 = a room, 3 = the whole hall (longer, denser, with a swell)
    function applause(level){ if(!ac||muted) return; live=live.slice(-50);
      drumOff(); if(files.clap&&files.clap.length){ const c=files.clap; playBuf(c[Math.min(c.length-1,(level||1)-1)] || c[Math.random()*c.length|0], level===3?2.2:1.8); return; }
      const P=[null,{dur:1.8,ppl:6,rate:3.4},{dur:2.8,ppl:11,rate:3.8},{dur:4.6,ppl:20,rate:4.3}][level||1], t0=ac.currentTime+0.03;
      for(let i=0;i<P.ppl;i++){ const fq=850+Math.random()*1700, pan=Math.random()*1.6-0.8, rate=P.rate*(0.75+Math.random()*0.5); let t=t0+Math.random()*0.4;
        while(t<t0+P.dur){ const x=(t-t0)/P.dur, env=Math.min(1,x*6)*(x<0.55?1:1-(x-0.55)/0.45); hit(t,(0.18+Math.random()*0.22)*env+0.001,fq*(0.92+Math.random()*0.16),"bandpass",0.07+Math.random()*0.05,pan); t+=(1/rate)*(0.8+Math.random()*0.4); } } }
    function drumroll(sec){ if(!ac||muted) return; if(files.drum){ drumG=playBuf(files.drum,1.6); return; } const t0=ac.currentTime+0.02;
      for(let t=0;t<sec;t+=0.045+Math.random()*0.01){ const x=t/sec; hit(t0+t,0.08+0.32*x*x,520+Math.random()*120,"lowpass",0.06,(Math.random()-.5)*0.3); } }
    return { get hasDrum(){ return !!files.drum; }, init, loadFiles, applause, drumroll, stop, music, get locked(){ return !!ac && ac.state!=="running"; }, unlock(){ try{ ac&&ac.resume(); }catch(e){} if(mus&&!muted) mus.play().catch(()=>{}); },
      get muted(){ return muted; }, toggle(){ muted=!muted; try{ localStorage.setItem("gj_cer_mute",muted?"1":"0"); }catch(e){} if(muted) stop(); music(!muted); return muted; } };
  })();

  /* ---------- the ceremony: one award per slide, the champion last ---------- */
  const SEEN="gj_cer_seen";
  const seen=()=>{ try{ return localStorage.getItem(SEEN)==="1"; }catch(e){ return false; } };
  function buildShow(){
    const d=DATA, sc=(d.scores&&d.scores.valid)||{}, R=rank(sc), S=[];
    const tot=d.comments? Object.values(d.comments).reduce((a,b)=>a+b,0) : 0;
    S.push({intro:true});
    const list=special(d,sc,"valid").concat(voted(d)).filter(a=>a.win||a.rows);
    list.forEach((a,i)=>S.push(Object.assign({kick:"ΒΡΑΒΕΙΟ "+(i+1)+" / "+list.length},a)));
    if(R.length){ const c=R[0], dv=GJ.devOf(c.l), tie=R[1]&&R[1].avg===c.avg&&R[1].n8===c.n8;
      S.push({champ:true,others:R.slice(1),kick:"ΤΟ ΜΕΓΑΛΟ ΒΡΑΒΕΙΟ",em:"👑",t:"Game Jam Champion",dsc:"Ο υψηλότερος μέσος όρος βαθμολογίας",nom:true,lvl:3,games:[c.l],win:GJ.gname(c.l),
        meta:(dv?"από "+dv.name+" · ":"")+"Ø "+c.avg.toFixed(2)+" · "+c.n+" ψήφοι"+(tie?" · κέρδισε στις 8+":"")}); }
    S.push({outro:true,R,voters:d.voters,tot});
    return S;
  }
  function ceremony(){
    if(document.querySelector(".cer")) return;
    SFX.init(); SFX.loadFiles(); try{ parent.GJ_RADIO&&parent.GJ_RADIO.hold(true); parent.postMessage({gj:"sheet",open:true},location.origin); }catch(e){} SFX.music(true);
    const S=buildShow(); let i=0, revealed=false, busy=false, tm=null, auto=null;
    const ov=el("div","cer"); ov.setAttribute("role","dialog"); ov.setAttribute("aria-modal","true"); ov.setAttribute("aria-label","Τελετή απονομής");
    const top=el("div","cer-top"), prog=el("span","cer-prog"), mute=el("button","cer-btn"), x=el("button","cer-btn","✕");
    mute.type=x.type="button"; x.setAttribute("aria-label","Κλείσιμο"); const mlab=()=>{ mute.textContent=SFX.muted?"🔇":"🔊"; mute.setAttribute("aria-label",SFX.muted?"Ήχος ανοιχτός":"Σίγαση"); }; mlab();
    const lock=el("button","cer-btn cer-lock","🔊 Πάτα για ήχο"); lock.type="button"; lock.hidden=!SFX.locked; lock.onclick=e=>{ e.stopPropagation(); SFX.unlock(); lock.hidden=true; };
    setTimeout(()=>{ lock.hidden=!SFX.locked; },300);
    const bar=el("div","cer-bar"), barI=el("i"); bar.append(barI);
    top.append(prog,lock,mute,x); const stage=el("div","cer-stage"); stage.setAttribute("aria-live","polite"); const hint=el("p","cer-hint");
    ov.append(bar,top,stage,hint); document.body.append(ov); document.documentElement.classList.add("cer-on");
    const thumb=(l,cls)=>{ const f=el("figure","cer-nom"+(cls?" "+cls:"")); const im=el("img"); im.src=THUMB[l]; im.alt=""; f.append(im, el("figcaption",null,GJ.gname(l))); return f; };
    function draw(){
      const s=S[i]; stage.textContent=""; stage.className="cer-stage"+(s.champ?" champ":""); void stage.offsetWidth; stage.classList.add("in");
      prog.textContent=(i+1)+" / "+S.length; barI.style.width=Math.round((i+1)/S.length*100)+"%"; clearTimeout(auto);
      if(s.intro){ stage.append(el("div","cer-em","🏆"), el("p","cer-kick","GAME JAM VOL. 01"), el("h2","cer-t","Τελετή απονομής"), el("p","cer-dsc","Τα βραβεία ένα-ένα. Το μεγάλο βραβείο στο τέλος."));
        hint.textContent="Η τελετή ξεκινά… (πάτα για να προχωρήσεις)"; revealed=true; auto=setTimeout(next,3500); return; }
      if(s.outro){ stage.append(el("div","cer-em","🎮"), el("h2","cer-t","GG σε όλους!"), el("p","cer-dsc","Ψήφισαν "+s.voters+" άτομα"+(s.tot?" · "+s.tot+" σχόλια":"")+"."));
        const ol=el("ol","cer-rank"); s.R.forEach((r,k)=>{ const li=el("li"); li.append(el("span",null,MEDAL[k]||String(k+1)), el("b",null,GJ.gname(r.l)), el("span",null,r.avg.toFixed(2))); ol.append(li); }); stage.append(ol);
        const b=el("button","btn red","Δες όλα τα αποτελέσματα"); b.type="button"; b.onclick=e=>{ e.stopPropagation(); close(); }; stage.append(b);
        hint.textContent=""; revealed=true; return; }
      stage.append(el("p","cer-kick",s.kick), el("div","cer-em",s.em), el("h2","cer-t",s.t), el("p","cer-dsc",s.dsc));
      if(s.nom){ const row=el("div","cer-noms"); L3.filter(l=>sc0[l]).forEach(l=>row.append(thumb(l))); stage.append(row); }
      const res=el("div","cer-res"); res.append(el("p","cer-goes","Και το βραβείο πηγαίνει σε…")); stage.append(res);
      hint.textContent="";
      if(revealed) show(false); else auto=setTimeout(next, s.champ?4500:3200); fit(stage);
    }
    const sc0=(DATA.scores&&DATA.scores.valid)||{};
    function show(sound){
      const s=S[i], res=stage.querySelector(".cer-res"); if(!res) return; res.textContent=""; res.classList.add("on");
      stage.querySelectorAll(".cer-noms .cer-nom").forEach((f,k)=>{ const l=L3.filter(q=>sc0[q])[k]; f.classList.add(s.games.includes(l)?"win":"lose"); });
      if(s.champ){ stage.classList.add("crowned"); const n=stage.querySelector(".cer-noms"); if(n) n.remove();
        const big=el("figure","cer-big"); const im=el("img"); im.src=THUMB[s.games[0]]; im.alt=GJ.gname(s.games[0]); big.append(im); res.append(big, el("div","cer-win",s.win), el("p","cer-meta",s.meta));
        const rest=el("div","cer-rest"); (s.others||[]).forEach((r,k)=>{ const f=el("figure","cer-nom"); const ti=el("img"); ti.src=THUMB[r.l]; ti.alt=""; f.append(ti, el("figcaption",null,MEDAL[k+1]+" "+GJ.gname(r.l)), el("b","cer-sc",r.avg.toFixed(2))); rest.append(f); }); res.append(rest); }
      else if(s.rows) s.rows.forEach(r=>{ res.append(el("div","cer-win",r.win), el("p","cer-meta",r.meta)); });
      else { if(!s.nom && s.games.length) { const row=el("div","cer-noms solo"); s.games.forEach(l=>row.append(thumb(l,"win"))); res.append(row); }
        res.append(el("div","cer-win",s.win)); if(s.meta) res.append(el("p","cer-meta",s.meta)); }
      fit(stage); revealed=true; hint.textContent=""; clearTimeout(auto); if(sound) auto=setTimeout(next, s.champ?11000:4800);
      if(sound){ SFX.applause(s.lvl||1); if(s.champ) confetti(); }
    }
    function next(){
      if(busy) return; const s=S[i];
      clearTimeout(auto); if(!revealed){ busy=true; SFX.drumroll(s.champ?2.2:1.1); const r=stage.querySelector(".cer-goes"); if(r) r.classList.add("pulse"); hint.textContent="";
        tm=setTimeout(()=>{ busy=false; show(true); }, SFX.hasDrum&&!SFX.muted? (s.champ?4300:1700) : (s.champ?2300:1150)); return; }
      if(i<S.length-1){ i++; revealed=false; draw(); }
    }
    function prev(){ if(busy||i===0) return; clearTimeout(auto); SFX.stop(); i--; revealed=true; draw(); }
    function key(e){ if(e.key==="Escape") close(); else if(e.key==="ArrowRight"||e.key===" "||e.key==="Enter"){ e.preventDefault(); next(); } else if(e.key==="ArrowLeft") prev(); }
    function close(){ clearTimeout(tm); clearTimeout(auto); SFX.stop(); SFX.music(false); try{ parent.postMessage({gj:"sheet",open:false},location.origin); }catch(e){} removeEventListener("keydown",key); ov.remove(); document.documentElement.classList.remove("cer-on");
      try{ parent.GJ_RADIO&&parent.GJ_RADIO.hold(false); }catch(e){} try{ localStorage.setItem(SEEN,"1"); }catch(e){} SHOWN=true; render(); }
    ov.addEventListener("click",e=>{ if(e.target.closest(".cer-btn,.btn")) return; if(SFX.locked){ SFX.unlock(); lock.hidden=true; } next(); });
    x.onclick=e=>{ e.stopPropagation(); close(); }; mute.onclick=e=>{ e.stopPropagation(); SFX.toggle(); mlab(); };
    addEventListener("keydown",key); draw(); ov.focus&&ov.setAttribute("tabindex","-1"); ov.focus();
  }
  let SHOWN=false, EXTRA_P=null, AUTO_DONE=false;
  async function startCeremony(btn){ if(btn){ btn.disabled=true; btn.textContent="Ετοιμάζω τη σκηνή…"; } SFX.init(); if(!EXTRA) await (EXTRA_P||loadExtra()); ceremony(); }

  function bars(dist){
    const mx=Math.max(1,...dist); const w=el("div","bars");
    dist.forEach((c,i)=>{ const col=el("div","bar"); const fill=el("i"); fill.style.height=Math.round(c/mx*100)+"%"; fill.title=(i+1)+": "+c; col.append(fill,el("span",null,String(i+1))); w.append(col); });
    return w;
  }

  function render(){
    app.textContent=""; clearInterval(timer);
    const d=DATA;
    if(!d){ sub.textContent="Δεν φορτώθηκαν τα αποτελέσματα. Δοκίμασε ξανά σε λίγο."; return; }
    if(d.released===false && !d.preview){
      sub.textContent="Τα αποτελέσματα βγαίνουν την Κυριακή 4/10 στις 21:30.";
      const c=el("div","glass big"); const lb=el("p","clk-l","Αποτελέσματα σε"); const dg=el("div","clk",""); c.append(lb,dg); app.append(c);
      const tick=()=>{ const left=RELEASE-new Date(); dg.textContent=fmt(left); if(left<=0){ clearInterval(timer); boot(); } }; tick(); timer=setInterval(tick,1000);
      app.append(el("p","empty","Μέχρι τότε: παίξε, βαθμολόγησε και σχολίασε. Η ψηφοφορία κλείνει στις 21:00."));
      return;
    }
    // released: first visit opens with the ceremony instead of spoiling the winner
    if(!d.preview && !SHOWN && !seen()){
      sub.textContent="Τα αποτελέσματα βγήκαν!";
      const c=el("div","glass big cer-start"); c.append(el("div","cer-em","🏆"), el("h2","cer-t","Τελετή απονομής"), el("p","cer-dsc","Τα βραβεία ένα-ένα, με το μεγάλο βραβείο στο τέλος. Άνοιξε τον ήχο 🔊"));
      const go=el("button","btn red","▶ Ξεκίνα την τελετή"); go.type="button"; go.onclick=()=>startCeremony(go); c.append(go); app.append(c);
      if(!AUTO_DONE){ AUTO_DONE=true; startCeremony(go); }
      const sk=el("button","gj-link cer-skip","Δείξε μου κατευθείαν τα αποτελέσματα"); sk.type="button"; sk.onclick=()=>{ SHOWN=true; render(); }; app.append(sk);
      return;
    }
    if(d.preview){ const b=el("div","glass pv-banner"); b.append(el("b",null,"🔍 ΠΡΟΕΠΙΣΚΟΠΗΣΗ"), document.createTextNode(" Το βλέπεις μόνο εσύ (κλειδί διοργανωτή). Οι υπόλοιποι θα δουν αυτή τη σελίδα την Κυριακή στις 21:30. Οι ψήφοι ακόμα μετράνε.")); app.append(b); }
    const sc=(d.scores&&d.scores[BASIS])||{};
    const R=rank(sc);
    sub.textContent = d.preview? "Προσωρινά αποτελέσματα (μέχρι στιγμής)" : "Το Game Jam Vol. 01 τελείωσε. GG σε όλους!";
    if(!R.length){ app.append(el("p","empty","Δεν υπάρχουν ψήφοι ακόμα.")); return; }

    const rw=el("button","btn alt cer-again","🎬 "+(d.preview?"Δοκιμή τελετής":"Δες ξανά την τελετή")); rw.type="button"; rw.onclick=()=>startCeremony(rw); app.append(rw);
    // basis toggle
    const tg=el("div","chips"); [["valid","Όλες οι έγκυρες ψήφοι"],["judges","Μόνο κριτές"]].forEach(([k,lab])=>{ const b=el("button","chip all",lab); b.type="button"; b.setAttribute("aria-pressed",BASIS===k); b.onclick=()=>{ BASIS=k; render(); }; tg.append(b); });
    app.append(tg); app.append(el("p","note2", BASIS==="valid"? "Δεν μετράνε οι ψήφοι των δημιουργών στο δικό τους παιχνίδι. Μία ψήφος ανά όνομα, μετράει η τελευταία." : "Χωρίς τις ψήφους των τριών δημιουργών, μόνο όσοι δεν έφτιαξαν παιχνίδι."));

    // champion
    const champ=R[0], dev=GJ.devOf(champ.l), tie=R[1]&&R[1].avg===champ.avg&&R[1].n8===champ.n8;
    const hero=el("section","glass champ"); hero.append(el("div","crown","👑"));
    const im=el("img","cthumb"); im.src=THUMB[champ.l]; im.alt=GJ.gname(champ.l); hero.append(im);
    hero.append(el("p","clabel","GAME JAM CHAMPION"), el("h2","cname",GJ.gname(champ.l)));
    hero.append(el("p","cby", dev? "από "+dev.name : ""));
    hero.append(el("div","cavg",champ.avg.toFixed(2)), el("p","cmeta", champ.n+" ψήφοι · "+champ.n8+" με 8+"+(tie?" · ισοβαθμία, κέρδισε με τις περισσότερες 8+":"")));
    app.append(hero);

    // podium list
    app.append(el("h2",null,"Κατάταξη"));
    const list=el("div","rank");
    R.forEach((r,i)=>{ const row=el("article","glass rk"); const mdl=el("div","mdl",MEDAL[i]||String(i+1)); const t=el("img","rth"); t.src=THUMB[r.l]; t.alt="";
      const body=el("div","rkb"); const dv=GJ.devOf(r.l); body.append(el("h3",null,GJ.gname(r.l)), el("p","by",(dv?"από "+dv.name:"")+" · "+r.n+" ψήφοι · "+r.n8+" με 8+")); body.append(bars(r.dist||[]));
      const av=el("div","rav",r.avg.toFixed(2)); row.append(mdl,t,body,av); list.append(row); });
    app.append(list);

    // awards
    app.append(el("h2",null,"Βραβεία κοινού"));
    const aw=el("div","awards2"); voted(d).forEach(a=>aw.append(awCard(a))); app.append(aw);
    app.append(el("h2",null,"Ειδικά βραβεία"));
    const spx=el("div","awards2"); const sl=special(d,sc,BASIS); ["hater","fan"].forEach(k=>{ const fi=sl.findIndex(a=>a.key===k); if(fi>0) sl.unshift(sl.splice(fi,1)[0]); });
    sl.forEach(a=>spx.append(awCard(a))); app.append(spx);
    if(!EXTRA) app.append(el("p","note2","Φορτώνω τα υπόλοιπα βραβεία…"));
    app.append(el("p","note2","Ψήφισαν "+d.voters+" άτομα"+(d.comments? " · "+Object.values(d.comments).reduce((a,b)=>a+b,0)+" σχόλια":"")+"."));

    // actions
    const ac=el("div","acts"); const sh=el("button","btn red","📣 Κοινοποίηση"); sh.type="button";
    sh.onclick=async()=>{ const txt=`🏆 GAME JAM Vol. 01\n${R.map((r,i)=>(MEDAL[i]||"")+" "+GJ.gname(r.l)+" ("+(GJ.devOf(r.l)||{}).name+"): "+r.avg.toFixed(2)).join("\n")}\nhttps://gamejam-patra.netlify.app/`;
      try{ if(navigator.share){ await navigator.share({text:txt}); } else { await navigator.clipboard.writeText(txt); sh.textContent="✓ Αντιγράφηκε"; } }catch(e){} };
    const ar=el("a","btn alt","🕹️ Arcade"); ar.href="arcade/"; ac.append(sh,ar); app.append(ac);
    if(!d.preview && !confettiOn && !SHOWN){ confettiOn=true; confetti(); }
    requestAnimationFrame(()=>fit(app));
  }

  function confetti(){
    if(!matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    const cv=document.createElement("canvas"); cv.style.cssText="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:70"; document.body.append(cv);
    const x=cv.getContext("2d"); const W=cv.width=innerWidth, H=cv.height=innerHeight; const cols=["#EE4266","#FFD23F","#1FA88A","#3D3A8C","#FFFFFF"];
    const ps=Array.from({length:90},()=>({x:Math.random()*W,y:-20-Math.random()*H*.6,s:5+Math.random()*7,v:2+Math.random()*3.5,h:(Math.random()-.5)*2,c:cols[Math.random()*cols.length|0]}));
    let t0=performance.now();
    (function f(t){ x.clearRect(0,0,W,H); ps.forEach(p=>{ p.y+=p.v; p.x+=p.h; x.fillStyle=p.c; x.fillRect(Math.round(p.x),Math.round(p.y),p.s,p.s); });
      if(t-t0<6500) requestAnimationFrame(f); else cv.remove(); })(t0);
  }

  let extraT=0;
  async function loadExtra(){ if(Date.now()-extraT<25000) return EXTRA_P; extraT=Date.now(); EXTRA_P=fetchExtra(); const x=await EXTRA_P; EXTRA=x; if(!document.querySelector(".cer")) render(); }
  async function boot(){ DATA=await fetchData(); render(); if(DATA&&(DATA.released!==false||DATA.preview)) loadExtra(); if(DATA&&DATA.released===false&&DATA.preview){ clearInterval(timer); timer=setInterval(async()=>{ const d=await fetchData(); if(d){ DATA=d; render(); loadExtra(); } },30000); } }
  boot();
})();
