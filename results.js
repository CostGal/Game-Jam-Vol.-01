/* Results page. Public after Sunday 21:30; the organiser (Kostas key) can preview earlier. */
(function(){
  const app=document.getElementById("app"), sub=document.getElementById("rsub");
  const RELEASE=new Date("2026-10-04T21:30:00+03:00");
  const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
  const esc=GJ.esc, L3=["A","B","C"];
  const MEDAL=["🥇","🥈","🥉"];
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
  function awCard(title,dsc,win,meta){
    const c=el("div","glass aw"); c.append(el("b",null,title), el("p","by",dsc));
    if(!win) c.append(el("p","empty","Δεν βγήκε νικητής."));
    else { c.append(el("div","awn",win)); if(meta) c.append(el("p","by",meta)); }
    return c;
  }

  function specialAwards(d,sc){
    const X=EXTRA||{}, out=[];
    // 💘 biggest fan
    const f=fanPick(sc);
    if(f){ const fn=X.fans&&X.fans[BASIS]&&X.fans[BASIS][f.l]; const who=fn&&fn.score===f.score&&Array.isArray(fn.names)&&fn.names.length? fn.names : null;
      const win=who? names(who) : (f.count===1? "Ένας μυστικός fan" : f.count+" fans");
      const fc=awCard("💘 Μεγαλύτερος fan","Η πιο ψηλή ατομική βαθμολογία", win, (who||f.count===1? "έδωσε ":"έδωσαν ")+f.score+"/10 στο "+GJ.gname(f.l)); fc.classList.add("wide"); out.push(fc); }
    // 😤 / 🥰 judges
    const rp=raterPicks(X.fans&&X.fans.raters&&X.fans.raters[BASIS]);
    if(rp){ const meta=r=>"Ø "+r.avg.toFixed(2)+(r.n? " σε "+r.n+" παιχνίδια":"");
      out.push(awCard("😤 Πιο αυστηρός κριτής","Ο χαμηλότερος μέσος όρος", names(rp.harsh.names), meta(rp.harsh)));
      out.push(awCard("🥰 Πιο γενναιόδωρος κριτής","Ο ψηλότερος μέσος όρος", names(rp.generous.names), meta(rp.generous))); }
    // 🎢 most divisive
    const sp=spreadPick(sc);
    out.push(awCard("🎢 Πιο διχαστικό","Οι βαθμοί του απείχαν πιο πολύ", sp&&GJ.gname(sp.l), sp&&("απόκλιση ±"+sp.sd.toFixed(1))));
    // 🎮 most played
    if(X.st){ const t={}; L3.forEach(l=>{ if(X.st[l]&&X.st[l].seconds) t[l]=X.st[l].seconds; }); const w=topOf(t,60);
      out.push(awCard("🎮 Δεν το άφηναν","Οι περισσότερες ώρες παιχνιδιού", w&&w.tied.map(GJ.gname).join(" & "), w&&("⏱ "+GJ.fmtDur(w.count)+" συνολικά"))); }
    // 💬 most talked about
    if(d.comments){ const w=topOf(d.comments); out.push(awCard("💬 Πιο πολυσυζητημένο","Τα περισσότερα σχόλια", w&&w.tied.map(GJ.gname).join(" & "), w&&(w.count+(w.count===1?" σχόλιο":" σχόλια")))); }
    // reactions
    if(X.rc){ [["music","🎵 Καλύτερος ήχος","Τα περισσότερα 🎵"],["hard","💀 Το πιο δύσκολο","Τα περισσότερα 💀"]].forEach(([k,t,dsc])=>{
      const o={}; L3.forEach(l=>{ const n=X.rc[l]&&X.rc[l][k]; if(n) o[l]=n; }); const w=topOf(o);
      out.push(awCard(t,dsc, w&&w.tied.map(GJ.gname).join(" & "), w&&(w.count+" αντιδράσεις"))); }); }
    // ⚡ speedrunners: fastest clear of each game
    if(X.clears){ const rows=L3.map(l=>{ const r=(X.clears[l]||[]).slice().sort((a,b)=>a.seconds-b.seconds)[0]; return r? {l,r} : null; }).filter(Boolean);
      if(rows.length){ const c=el("div","glass aw"); c.append(el("b",null,"⚡ Speedrunner"), el("p","by","Ο πιο γρήγορος τερματισμός"));
        rows.forEach(({l,r})=>{ c.append(el("div","awn",r.name), el("p","by","⏱ "+GJ.fmtClock(r.seconds)+" στο "+GJ.gname(l))); }); out.push(c); } }
    return out;
  }

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
    if(d.preview){ const b=el("div","glass pv-banner"); b.append(el("b",null,"🔍 ΠΡΟΕΠΙΣΚΟΠΗΣΗ"), document.createTextNode(" Το βλέπεις μόνο εσύ (κλειδί διοργανωτή). Οι υπόλοιποι θα δουν αυτή τη σελίδα την Κυριακή στις 21:30. Οι ψήφοι ακόμα μετράνε.")); app.append(b); }
    const sc=(d.scores&&d.scores[BASIS])||{};
    const R=rank(sc);
    sub.textContent = d.preview? "Προσωρινά αποτελέσματα (μέχρι στιγμής)" : "Το Game Jam Vol. 01 τελείωσε. GG σε όλους!";
    if(!R.length){ app.append(el("p","empty","Δεν υπάρχουν ψήφοι ακόμα.")); return; }

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
    const aw=el("div","awards2");
    [["bug","🪲 Χρυσό bug","Το πιο αστείο glitch"],["visual","🎨 Καλύτερο οπτικό","Το παιχνίδι που δείχνει καλύτερα"]].forEach(([k,t,dsc])=>{
      const w=winnerOf(d.awards&&d.awards[k]); const c=el("div","glass aw"); c.append(el("b",null,t), el("p","by",dsc));
      if(!w) c.append(el("p","empty","Καμία ψήφος ακόμα."));
      else { const names=w.tied.map(l=>GJ.gname(l)).join(" & "); c.append(el("div","awn",names), el("p","by",w.count+(w.count===1?" ψήφος":" ψήφοι")+(w.tied.length>1?" · ισοπαλία":""))); }
      aw.append(c); });
    app.append(aw);
    app.append(el("h2",null,"Ειδικά βραβεία"));
    const sp=el("div","awards2"); specialAwards(d,sc).forEach(c=>sp.append(c)); app.append(sp);
    if(!EXTRA) app.append(el("p","note2","Φορτώνω τα υπόλοιπα βραβεία…"));
    app.append(el("p","note2","Ψήφισαν "+d.voters+" άτομα"+(d.comments? " · "+Object.values(d.comments).reduce((a,b)=>a+b,0)+" σχόλια":"")+"."));

    // actions
    const ac=el("div","acts"); const sh=el("button","btn red","📣 Κοινοποίηση"); sh.type="button";
    sh.onclick=async()=>{ const txt=`🏆 GAME JAM Vol. 01\n${R.map((r,i)=>(MEDAL[i]||"")+" "+GJ.gname(r.l)+" ("+(GJ.devOf(r.l)||{}).name+"): "+r.avg.toFixed(2)).join("\n")}\nhttps://gamejam-patra.netlify.app/`;
      try{ if(navigator.share){ await navigator.share({text:txt}); } else { await navigator.clipboard.writeText(txt); sh.textContent="✓ Αντιγράφηκε"; } }catch(e){} };
    const ar=el("a","btn alt","🕹️ Arcade"); ar.href="arcade/"; ac.append(sh,ar); app.append(ac);
    if(!d.preview && !confettiOn){ confettiOn=true; confetti(); }
  }

  function confetti(){
    if(!matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    const cv=document.createElement("canvas"); cv.style.cssText="position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:3"; document.body.append(cv);
    const x=cv.getContext("2d"); const W=cv.width=innerWidth, H=cv.height=innerHeight; const cols=["#EE4266","#FFD23F","#1FA88A","#3D3A8C","#FFFFFF"];
    const ps=Array.from({length:90},()=>({x:Math.random()*W,y:-20-Math.random()*H*.6,s:5+Math.random()*7,v:2+Math.random()*3.5,h:(Math.random()-.5)*2,c:cols[Math.random()*cols.length|0]}));
    let t0=performance.now();
    (function f(t){ x.clearRect(0,0,W,H); ps.forEach(p=>{ p.y+=p.v; p.x+=p.h; x.fillStyle=p.c; x.fillRect(Math.round(p.x),Math.round(p.y),p.s,p.s); });
      if(t-t0<6500) requestAnimationFrame(f); else cv.remove(); })(t0);
  }

  let extraT=0;
  async function loadExtra(){ if(Date.now()-extraT<25000) return; extraT=Date.now(); const x=await fetchExtra(); EXTRA=x; render(); }
  async function boot(){ DATA=await fetchData(); render(); if(DATA&&(DATA.released!==false||DATA.preview)) loadExtra(); if(DATA&&DATA.released===false&&DATA.preview){ clearInterval(timer); timer=setInterval(async()=>{ const d=await fetchData(); if(d){ DATA=d; render(); loadExtra(); } },30000); } }
  boot();
})();
