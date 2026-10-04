/* Game Jam shell: hosts every page in an iframe so the radio (audio + beat analyser) never restarts. */
(function(){
  const VERSION="v17";
  const view=document.getElementById("view");
  const ALLOWED=/^(home\.html|arcade\/|devs\/[a-z0-9-]+\/|results\.html)$/;
  /* ---------- routing ---------- */
  (function init(){
    const q=new URLSearchParams(location.search); let p=q.get("p")||"home.html";
    if(!ALLOWED.test(p)) p="home.html";
    const hash=location.hash||"";
    view.src=p+hash;
    if(hash||q.get("p")) history.replaceState(null,"",q.get("p")?("/?p="+encodeURIComponent(p)):"/");   // never keep #key=… in the address bar
  })();
  addEventListener("message",e=>{
    if(e.origin===location.origin&&e.data&&e.data.gj==="sheet"){ document.body.classList.toggle("sheet-in-view",!!e.data.open); return; }   // a sheet inside the page is open: tuck the radio pill away
    if(e.origin!==location.origin||!e.data||e.data.gj!=="nav") return;
    const p=String(e.data.path||"").replace(/^\/+/,"");
    if(ALLOWED.test(p)) history.replaceState(null,"",p==="home.html"?"/":("/?p="+encodeURIComponent(p)));
    if(e.data.title) document.title=e.data.title;
  });

  /* ---------- 21:30: everyone on the site is taken to the results (the ceremony starts on its own) ---------- */
  (function(){ const AT=new Date("2026-10-04T21:30:00+03:00").getTime(), left=AT-Date.now();
    if(left>0 && left<2147483647) setTimeout(()=>{ let cur=""; try{ cur=view.contentWindow.location.pathname; }catch(e){}
      if(!/results\.html$/.test(cur)){ view.src="results.html"; history.replaceState(null,"","/?p=results.html"); } }, left+1500); })();

  /* ---------- radio ---------- */
  const audio=document.getElementById("bgm"), pill=document.getElementById("musicBtn");
  const rCover=document.getElementById("rCover"), rName=document.getElementById("musicLbl"), rArtist=document.getElementById("rArtist"), rPlay=document.getElementById("rPlay");
  const RD=window.GJ_RADIO_DATA||{name:"Game Jam FM",tracks:[]}, R=RD.tracks;
  let ti=0, shuffle=false, errRun=0, userOff=false, held=false, wasPlaying=false;
  let actx=null, an=null, gain=null, buf=null, prev=new Float32Array(12), mx=40, beat=0, hit=0, lastHit=0;
  let vol=0.8, muted=false; try{ const v=parseFloat(localStorage.getItem("gj_radio_vol")); if(v>=0&&v<=1) vol=v; muted=localStorage.getItem("gj_radio_mute")==="1"; }catch(e){}
  const reduce=!matchMedia("(prefers-reduced-motion: no-preference)").matches;
  const MASTER=0.45;   // whole-site music level (the slider works inside it)
  function applyVol(){ const g=muted?0:vol*MASTER; if(gain){ try{ gain.gain.setTargetAtTime(g,actx.currentTime,0.02); }catch(e){ gain.gain.value=g; } } audio.volume = gain? 1 : g; }
  function setup(){
    if(actx) return;
    try{
      actx=new (window.AudioContext||window.webkitAudioContext)();
      const src=actx.createMediaElementSource(audio); an=actx.createAnalyser(); an.fftSize=1024; an.smoothingTimeConstant=.2; an.minDecibels=-85; an.maxDecibels=-5;
      gain=actx.createGain(); src.connect(an); an.connect(gain); gain.connect(actx.destination);   // analyser sits before the gain: the beat works at any volume
      buf=new Uint8Array(an.frequencyBinCount); audio.volume=1; applyVol();
    }catch(e){ actx=null; gain=null; }
  }
  function paint(){
    const t=R[ti]; if(!t) return;
    if(rCover.getAttribute("src")!==t.cover) rCover.src=t.cover;
    const on=!audio.paused; pill.dataset.on=on?"true":"false";
    const started=on||audio.currentTime>0;
    rName.textContent=started? t.t : "📻 "+RD.name; rArtist.textContent=started? t.a : "Πάτα για μουσική";
    if("mediaSession" in navigator){ try{ navigator.mediaSession.metadata=new MediaMetadata({title:t.t,artist:t.a,album:t.al,artwork:[{src:t.cover,sizes:"256x256",type:"image/jpeg"}]}); }catch(e){} }
    document.dispatchEvent(new CustomEvent("gj:radio"));
  }
  function load(i,play){ ti=((i%R.length)+R.length)%R.length; audio.src=R[ti].src; paint(); try{ localStorage.setItem("gj_radio_i",String(ti)); }catch(e){} if(play) start(); }
  async function start(){ setup(); try{ if(actx&&actx.state==="suspended") await actx.resume(); if(!audio.src) load(ti,false); applyVol(); await audio.play(); errRun=0; }catch(e){} paint(); }
  function stop(){ audio.pause(); paint(); }
  function next(d){ load(shuffle&&R.length>1? (ti+1+Math.floor(Math.random()*(R.length-1))) : ti+(d||1), true); }
  audio.addEventListener("ended",()=>next(1)); audio.addEventListener("play",paint); audio.addEventListener("pause",paint);
  audio.addEventListener("error",()=>{ if(++errRun<R.length) setTimeout(()=>next(1),400); });
  if("mediaSession" in navigator){ try{ const ms=navigator.mediaSession; ms.setActionHandler("nexttrack",()=>next(1)); ms.setActionHandler("previoustrack",()=>next(-1)); ms.setActionHandler("play",()=>{ userOff=false; start(); }); ms.setActionHandler("pause",()=>{ userOff=true; stop(); }); }catch(e){} }
  let armed=true;
  function gesture(){ if(!armed) return; armed=false; if(userOff||held) return; start(); }   // first user gesture anywhere (also inside the iframe)
  ["pointerdown","touchend","keydown"].forEach(n=>addEventListener(n,e=>{ if(pill.contains(e.target)) return; gesture(); },true));
  window.GJ_RADIO={ gesture, hold(on){ if(on){ held=true; wasPlaying=!audio.paused; if(wasPlaying) stop(); } else { held=false; if(wasPlaying&&!userOff){ wasPlaying=false; start(); } } }, next:()=>next(1), prev:()=>next(-1), toggle:()=>{ audio.paused? (userOff=false,start()) : (userOff=true,stop()); } };
  rPlay.addEventListener("click",e=>{ e.stopPropagation(); armed=false; if(audio.paused){ userOff=false; start(); } else { userOff=true; stop(); } });
  const fmtT=x=>{ x=Math.max(0,Math.floor(x||0)); return Math.floor(x/60)+":"+String(x%60).padStart(2,"0"); };
  function openRadio(){
    armed=false; const esc=GJ.esc;
    GJ.showSheet(`<h2 class="gj-h">📻 ${esc(RD.name)}<small>Παίζει τώρα</small></h2>
      <div class="rd"><img class="rd-cv" id="rdCv" alt=""><div class="rd-meta"><b id="rdT"></b><span id="rdA"></span><em id="rdAl"></em></div></div>
      <input id="rdSeek" class="rd-seek" type="range" min="0" max="1000" value="0" aria-label="Θέση στο κομμάτι">
      <div class="rd-time"><span id="rdCur">0:00</span><span id="rdDur">0:00</span></div>
      <div class="rd-ctl"><button class="rd-b" id="rdShuf" type="button" aria-pressed="${shuffle}" aria-label="Τυχαία σειρά">🔀</button><button class="rd-b" id="rdPrev" type="button" aria-label="Προηγούμενο">⏮</button><button class="rd-b main" id="rdPP" type="button" aria-label="Αναπαραγωγή / παύση">▶</button><button class="rd-b" id="rdNext" type="button" aria-label="Επόμενο">⏭</button></div>
      <div class="rd-vol"><button class="rd-b sm" id="rdMute" type="button" aria-pressed="${muted}" aria-label="Σίγαση">${muted||vol===0?"🔇":"🔊"}</button><input id="rdVol" type="range" min="0" max="100" value="${Math.round(vol*100)}" aria-label="Ένταση"><span id="rdVolN">${Math.round(vol*100)}%</span></div>
      <div class="rd-list" id="rdList"></div><p class="gj-hint rd-credit">${esc(RD.credit||"")}</p>`);
    const sh=GJ.sheetEl(), q=id=>sh.querySelector(id), list=q("#rdList");
    R.forEach((t,i)=>{ const b=document.createElement("button"); b.type="button"; b.className="rd-it"; b.dataset.i=i;
      b.innerHTML=`<img alt="" src="${esc(t.cover)}"><span><b>${t.hot?"⭐ ":""}${esc(t.t)}</b><small>${esc(t.a)}</small></span>`; b.onclick=()=>{ userOff=false; load(i,true); }; list.append(b); });
    const seek=q("#rdSeek");
    const refresh=()=>{ if(!sh.contains(seek)) return; const t=R[ti];
      q("#rdCv").src=t.cover; q("#rdT").textContent=t.t; q("#rdA").textContent=t.a; q("#rdAl").textContent=t.al; q("#rdPP").textContent=audio.paused?"▶":"⏸";
      list.querySelectorAll(".rd-it").forEach(b=>b.classList.toggle("on",+b.dataset.i===ti));
      const d=audio.duration||0; if(!seek.matches(":active")) seek.value=d?Math.round(audio.currentTime/d*1000):0; q("#rdCur").textContent=fmtT(audio.currentTime); q("#rdDur").textContent=fmtT(d); };
    refresh(); ["timeupdate","loadedmetadata","play","pause"].forEach(ev=>audio.addEventListener(ev,refresh)); document.addEventListener("gj:radio",refresh);
    seek.oninput=()=>{ if(audio.duration) audio.currentTime=audio.duration*seek.value/1000; };
    q("#rdPP").onclick=()=>{ if(audio.paused){ userOff=false; start(); } else { userOff=true; stop(); } };
    q("#rdNext").onclick=()=>{ userOff=false; next(1); }; q("#rdPrev").onclick=()=>{ userOff=false; if(audio.currentTime>4) audio.currentTime=0; else next(-1); };
    q("#rdShuf").onclick=e=>{ shuffle=!shuffle; e.currentTarget.setAttribute("aria-pressed",shuffle); };
    const vi=q("#rdVol"), vn=q("#rdVolN"), mb=q("#rdMute");
    const vui=()=>{ vn.textContent=Math.round((muted?0:vol)*100)+"%"; mb.textContent=(muted||vol===0)?"🔇":"🔊"; mb.setAttribute("aria-pressed",muted); vi.value=Math.round((muted?0:vol)*100); };
    vi.oninput=()=>{ vol=vi.value/100; muted=vol===0; applyVol(); try{ localStorage.setItem("gj_radio_vol",String(vol)); localStorage.setItem("gj_radio_mute",muted?"1":"0"); }catch(e){} vui(); };
    mb.onclick=()=>{ muted=!muted; if(!muted&&vol===0) vol=.5; applyVol(); try{ localStorage.setItem("gj_radio_vol",String(vol)); localStorage.setItem("gj_radio_mute",muted?"1":"0"); }catch(e){} vui(); };
    const cur=list.querySelector(".rd-it.on"); if(cur) list.scrollTop=cur.offsetTop-list.offsetTop-6;
  }
  pill.querySelector("#rOpen").onclick=openRadio; pill.querySelector("#rInfo").onclick=openRadio;
  if(R.length){ let i0=0; try{ if(localStorage.getItem("gj_radio_pl")!=="v17"){ localStorage.setItem("gj_radio_pl","v17"); localStorage.setItem("gj_radio_i","0"); } i0=parseInt(localStorage.getItem("gj_radio_i")||"0",10)||0; }catch(e){} load(i0%R.length,false); audio.volume=muted?0:vol*MASTER; audio.play().then(()=>{ armed=false; paint(); }).catch(paint); }

  /* ---------- beat → pushed into the page inside the iframe + the shell ---------- */
  const root=document.documentElement; let last=performance.now(), lastSet=-1;
  function frame(t){
    const dt=Math.min(.05,(t-last)/1000); last=t; let target=0;
    if(an && !audio.paused){
      an.getByteFrequencyData(buf);
      let fl=0; for(let i=0;i<12;i++){ const d=buf[i]-prev[i]; if(d>0) fl+=d*(i<4?1.5:1); prev[i]=buf[i]; }
      mx=Math.max(fl,mx*Math.pow(.6,dt),40);
      const r=Math.max(0,(fl/mx-.45)/.55);
      if(r>.15 && t-lastHit>240){ lastHit=t; hit=Math.min(1,.55+r*.45); }
    }
    hit*=Math.pow(.004,dt); target=Math.max(target,hit);
    beat+=(target-beat)*(target>beat?Math.min(1,dt*28):Math.min(1,dt*9));
    const b=reduce?0:beat;
    if(Math.abs(b-lastSet)>.01||(b===0&&lastSet!==0)){
      lastSet=b; const v=b.toFixed(3); root.style.setProperty("--beat",v);
      try{ view.contentDocument.documentElement.style.setProperty("--beat",v); }catch(e){}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  view.addEventListener("load",()=>{ lastSet=-1; });

  /* ---------- "What's new" tour (first time on this version) ---------- */
  const SLIDES=[
    ["🏅","Champions","Όποιος τελειώνει ένα παιχνίδι μπαίνει στη λίστα των champions, με τον χρόνο του και στατιστικά από το ίδιο το παιχνίδι. Πάτα 🏅 Champions στην κάρτα του παιχνιδιού."],
    ["🎭","Αποκαλύφθηκαν οι δημιουργοί","Κάθε παιχνίδι δείχνει πλέον τον τίτλο και τον δημιουργό του. Πάτα το όνομα για να δεις το προφίλ του."],
    ["🕹️","Arcade και προφίλ","Η βιβλιοθήκη όλων των παιχνιδιών μας, με υποσελίδα για κάθε δημιουργό. Οι ίδιοι μπορούν να προσθέτουν παιχνίδια και βίντεο."],
    ["📻","Game Jam FM","Radio κάτω δεξιά με ένταση, playlist και εξώφυλλα. Συνεχίζει να παίζει όσο γυρνάς σελίδες. Σταματά μόνο όταν παίζεις παιχνίδι."],
    ["😍","Τι σου άρεσε και σχόλια","Πάτα τα emoji κάτω από κάθε παιχνίδι. Τα σχόλιά σου εμφανίζονται και στο Discord."],
    ["🏆","Στατιστικά και αποτελέσματα","Δες πόσοι έπαιξαν και ποιοι το τελείωσαν. Οι νικητές ανακοινώνονται την Κυριακή στις 21:30 στη σελίδα Αποτελέσματα."]
  ];
  function openTour(){
    let i=0; const esc=GJ.esc;
    const draw=()=>{
      const [ic,t,d]=SLIDES[i]; const last=i===SLIDES.length-1;
      GJ.showSheet(`<div class="tour"><div class="tour-ic" aria-hidden="true">${ic}</div><h2 class="gj-h">${esc(t)}<small>Τι νέο · ${i+1} από ${SLIDES.length}</small></h2><p class="tour-d">${esc(d)}</p>
        <div class="tour-dots" aria-hidden="true">${SLIDES.map((_,k)=>`<i class="${k===i?"on":""}"></i>`).join("")}</div>
        <button class="gj-go" id="tNext" type="button">${last?"Πάμε!":"Επόμενο"}</button>${last?"":`<button class="gj-go tour-skip" id="tSkip" type="button">Παράλειψη</button>`}</div>`);
      const sh=GJ.sheetEl();
      sh.querySelector("#tNext").onclick=()=>{ if(last){ GJ.close(); } else { i++; draw(); } };
      const sk=sh.querySelector("#tSkip"); if(sk) sk.onclick=()=>GJ.close();
    };
    draw(); try{ localStorage.setItem("gj_seen",VERSION); }catch(e){}
  }
  window.GJ_TOUR=openTour;
  let seen=""; try{ seen=localStorage.getItem("gj_seen")||""; }catch(e){}
  if(seen!==VERSION && !/[?&]notour/.test(location.search) && !/results/.test(location.search)) setTimeout(()=>{ let cur=""; try{ cur=view.contentWindow.location.pathname; }catch(e){} if(!/results\.html$/.test(cur)) openTour(); },1400);
})();
