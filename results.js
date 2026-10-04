/* Results page. Public after Sunday 21:30; the organiser (Kostas key) can preview earlier. */
(function(){
  const app=document.getElementById("app"), sub=document.getElementById("rsub");
  const RELEASE=new Date("2026-10-04T21:30:00+03:00");
  const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
  const esc=GJ.esc, L3=["A","B","C"];
  const MEDAL=["🥇","🥈","🥉"];
  const THUMB={A:"games/a/thumb.jpg",B:"games/b/thumb.jpg",C:"games/c/thumb.jpg"};
  let BASIS="valid", DATA=null, timer=null, confettiOn=false;
  try{ parent.postMessage({gj:"nav",path:"results.html",title:document.title},location.origin); }catch(e){}

  /* organiser key: #key=… (stored once) */
  const KN="gj_devkey_kostas";
  const m=location.hash.match(/[#&](?:key|edit)=([A-Za-z0-9_-]{20,80})/);
  if(m){ try{ localStorage.setItem(KN,m[1]); }catch(e){} history.replaceState(null,"",location.pathname+location.search); }
  const KEY=(()=>{ try{ return localStorage.getItem(KN)||null; }catch(e){ return null; } })();

  const fmt=ms=>{ const s=Math.max(0,Math.floor(ms/1000)), d=Math.floor(s/86400), h=Math.floor(s%86400/3600), mi=Math.floor(s%3600/60), x=s%60, p=n=>String(n).padStart(2,"0"); return (d?d+"μ ":"")+p(h)+":"+p(mi)+":"+p(x); };

  async function fetchData(){ try{ return await GJ.rpc("gj_results",{p_key:KEY}); }catch(e){ return null; } }

  function rank(sc){
    const arr=L3.filter(l=>sc[l]&&sc[l].n>0).map(l=>Object.assign({l},sc[l]));
    arr.sort((a,b)=> b.avg-a.avg || b.n8-a.n8 || b.n-a.n);
    return arr;
  }
  const winnerOf=(obj)=>{ if(!obj) return null; const e=Object.entries(obj).sort((a,b)=>b[1]-a[1]); if(!e.length) return null; const top=e[0][1]; const tied=e.filter(x=>x[1]===top).map(x=>x[0]); return {tied,count:top}; };

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
    app.append(el("h2",null,"Βραβεία"));
    const aw=el("div","awards2");
    [["bug","🪲 Χρυσό bug","Το πιο αστείο glitch"],["visual","🎨 Καλύτερο οπτικό","Το παιχνίδι που δείχνει καλύτερα"]].forEach(([k,t,dsc])=>{
      const w=winnerOf(d.awards&&d.awards[k]); const c=el("div","glass aw"); c.append(el("b",null,t), el("p","by",dsc));
      if(!w) c.append(el("p","empty","Καμία ψήφος ακόμα."));
      else { const names=w.tied.map(l=>GJ.gname(l)).join(" & "); c.append(el("div","awn",names), el("p","by",w.count+(w.count===1?" ψήφος":" ψήφοι")+(w.tied.length>1?" · ισοπαλία":""))); }
      aw.append(c); });
    app.append(aw);
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

  async function boot(){ DATA=await fetchData(); render(); if(DATA&&DATA.released===false&&DATA.preview){ clearInterval(timer); timer=setInterval(async()=>{ const d=await fetchData(); if(d){ DATA=d; render(); } },30000); } }
  boot();
})();
