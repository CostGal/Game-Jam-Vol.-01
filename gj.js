/* Game Jam shared logic: voting (Supabase REST, insert-only) */
(function(){
  const GJ = window.GJ = window.GJ || {};
  GJ.SUPA_URL = "https://dgnxbcoxdpdloplkcmzs.supabase.co";
  GJ.SUPA_KEY = "sb_publishable_kXCrlX-9S1ud3bs9Zdyt1A_9n-U1X1F"; // publishable key (insert-only via RLS)
  GJ.PLAY_AT  = new Date("2026-10-03T18:10:00+03:00");
  GJ.VOTE_END = new Date("2026-10-04T21:00:00+03:00");
  GJ.GAMES = ["A","B","C"];
  // Per-game info (filled in by the organiser). title: shown only after the reveal. howto: shown on the play screen.
  GJ.INFO = {
    A:{title:"Descent",howto:"Σύρε αριστερά για κίνηση, πάτα δεξιά για ήχο. Περπάτα αργά, ο θόρυβος σε προδίδει.",dev:"fanis"},
    B:{title:"Patra's Brawlers",howto:"D-pad για κίνηση, Punch/Kick για χτυπήματα, Block για άμυνα, Special με γεμάτη μπάρα",dev:"amarildo",video:{url:"media/patras-brawlers-trailer.mp4",poster:"media/patras-brawlers-trailer.jpg",label:"Trailer"}},
    C:{title:"Unremembered",howto:"",dev:"kostas"},
  };
  GJ.DEVS = { kostas:{name:"Κώστας",game:"C"}, amarildo:{name:"Αμαρίλντο",game:"B"}, fanis:{name:"Φάνης",game:"A"} };
  GJ.gname = L => (GJ.INFO[L] && GJ.INFO[L].title) || ("Game "+L);
  GJ.devOf = L => { const d=GJ.INFO[L]&&GJ.INFO[L].dev; return d? Object.assign({slug:d},GJ.DEVS[d]) : null; };
  // Test mode: ?gjtest=1 opens voting now (this tab only); votes are tagged [TEST]
  try{ const q=new URLSearchParams(location.search);
    if(q.get("gjtest")==="1") localStorage.setItem("gj_test","1");
    if(q.get("gjtest")==="0"){ localStorage.removeItem("gj_test"); localStorage.removeItem("gj_votes"); localStorage.removeItem("gj_votes_test"); }
    GJ.TEST = localStorage.getItem("gj_test")==="1"; }catch(e){ GJ.TEST=false; }
  if(GJ.TEST) GJ.PLAY_AT = new Date(Date.now()-60000);
  const VKEY = GJ.TEST ? "gj_votes_test" : "gj_votes";

  /* identity (id + name) is mirrored in localStorage, a 1-year cookie and IndexedDB, so it survives as long as possible */
  const ck = {
    get:()=>{ try{ const m=document.cookie.match(/(?:^|; )gj_voter=([^;]*)/); return m?JSON.parse(decodeURIComponent(m[1])):null; }catch(e){ return null; } },
    set:v=>{ try{ document.cookie="gj_voter="+encodeURIComponent(JSON.stringify(v))+"; max-age=31536000; path=/; SameSite=Lax"; }catch(e){} }
  };
  const idb = {
    open:()=>new Promise((res,rej)=>{ try{ const r=indexedDB.open("gj",1); r.onupgradeneeded=()=>r.result.createObjectStore("kv"); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }catch(e){ rej(e); } }),
    async set(v){ try{ const d=await idb.open(); d.transaction("kv","readwrite").objectStore("kv").put(v,"voter"); }catch(e){} },
    async get(){ try{ const d=await idb.open(); return await new Promise(res=>{ const q=d.transaction("kv").objectStore("kv").get("voter"); q.onsuccess=()=>res(q.result||null); q.onerror=()=>res(null); }); }catch(e){ return null; } }
  };
  const LS = { get:(k,d)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d; }catch(e){ return d; } },
               set:(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} if(k==="gj_voter"){ ck.set(v); idb.set(v); } } };
  const uuid = ()=> (crypto.randomUUID ? crypto.randomUUID() :
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c=="x"?r:(r&3|8)).toString(16)}));
  GJ.voter = ()=>{ let v=LS.get("gj_voter",null); if(!v||!v.id){ v=ck.get(); if(v&&v.id) LS.set("gj_voter",v); else { v={id:uuid(),name:""}; LS.set("gj_voter",v); } } return v; };
  // best-effort async restore from IndexedDB if both localStorage and cookie were wiped
  (async()=>{ if(LS.get("gj_voter",null)||ck.get()) return; const v=await idb.get(); if(v&&v.id&&!LS.get("gj_voter",null)) LS.set("gj_voter",v); })();
  GJ.myVotes = ()=> LS.get(VKEY,{scores:{},awards:{}});
  GJ.open = ()=> { const n=new Date(); return n>=GJ.PLAY_AT && n<GJ.VOTE_END; };

  async function send(rows){
    if(!GJ.SUPA_KEY) throw new Error("nokey");
    const h={ "apikey":GJ.SUPA_KEY, "Content-Type":"application/json", "Prefer":"return=minimal" };
    if(!GJ.SUPA_KEY.startsWith("sb_")) h["Authorization"]="Bearer "+GJ.SUPA_KEY;
    const r=await fetch(GJ.SUPA_URL+"/rest/v1/gj_votes",{method:"POST",headers:h,body:JSON.stringify(rows)});
    if(!r.ok) throw new Error("http "+r.status);
  }

  /* ---------- sheet ---------- */
  let bd, sh;
  function ensure(){
    if(sh) return;
    bd=document.createElement("div"); bd.className="gj-backdrop"; bd.addEventListener("click",close);
    sh=document.createElement("div"); sh.className="gj-sheet"; sh.setAttribute("role","dialog"); sh.setAttribute("aria-modal","true");
    document.body.append(bd,sh);
    addEventListener("keydown",e=>{ if(e.key==="Escape") close(); });
  }
  function close(){ if(!sh) return; sh.querySelectorAll("video").forEach(v=>{ try{ v.pause(); }catch(e){} }); sh.querySelectorAll("iframe").forEach(f=>{ f.src="about:blank"; }); if(GJ._held){ GJ._held=false; try{ parent.GJ_RADIO&&parent.GJ_RADIO.hold(false); }catch(e){} } sh.classList.remove("on"); bd.classList.remove("on"); document.documentElement.classList.remove("sheet-open"); try{ if(window.parent!==window) parent.postMessage({gj:"sheet",open:false},location.origin); }catch(e){} if(GJ._dirty){ GJ._dirty=false; document.dispatchEvent(new CustomEvent("gj:votes")); } }
  GJ.close = close;
  GJ.showSheet = (html)=>show(html);
  GJ.sheetEl = ()=>sh;
  function show(html){ ensure(); sh.innerHTML='<div class="gj-grab"></div><button class="gj-x" aria-label="Κλείσιμο">✕</button>'+html;
    sh.querySelector(".gj-x").onclick=close; requestAnimationFrame(()=>{ bd.classList.add("on"); sh.classList.add("on"); document.documentElement.classList.add("sheet-open"); try{ if(window.parent!==window) parent.postMessage({gj:"sheet",open:true},location.origin); }catch(e){} }); }
  const esc = GJ.esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  function closedMsg(){
    const n=new Date();
    return n<GJ.PLAY_AT ? "Η ψηφοφορία δεν έχει ανοίξει ακόμα." : "Η ψηφοφορία έκλεισε. Τα αποτελέσματα βγαίνουν την Κυριακή στις 21:30.";
  }

  GJ.scoreSheet = function(letter){
    const v=GJ.voter(), mine=GJ.myVotes(), prev=mine.scores[letter];
    if(!GJ.open()){ show(`<h2 class="gj-h">${esc(GJ.gname(letter))}</h2><p class="gj-msg">${closedMsg()}</p>`); return; }
    let pick=prev||0;
    show(`<h2 class="gj-h">${esc(GJ.gname(letter))}<small>Game ${letter} · πόσο καλό και πόσο fun ήταν;</small></h2>
      ${v.name?"":`<label class="gj-lbl" for="gjName">Το όνομά σου</label><input id="gjName" class="gj-in" maxlength="40" autocomplete="name" placeholder="π.χ. Μαρία">`}
      <span class="gj-lbl">Βαθμός 1–10</span>
      <div class="gj-scores">${[1,2,3,4,5,6,7,8,9,10].map(n=>`<button class="gj-chip" data-n="${n}" aria-pressed="${n===pick}">${n}</button>`).join("")}</div>
      ${prev?`<p class="gj-hint">Έχεις ήδη δώσει ${prev}/10. Αν ψηφίσεις ξανά, μετράει η τελευταία ψήφος.</p>`:""}
      <button class="gj-go" id="gjGo" ${pick?"":"disabled"}>Καταχώρηση</button><p class="gj-msg" id="gjMsg" aria-live="polite"></p>`);
    const go=sh.querySelector("#gjGo"), msg=sh.querySelector("#gjMsg");
    sh.querySelectorAll(".gj-chip").forEach(b=>b.onclick=()=>{ pick=+b.dataset.n; sh.querySelectorAll(".gj-chip").forEach(x=>x.setAttribute("aria-pressed",x===b)); go.disabled=false; });
    go.onclick=async()=>{
      const nameEl=sh.querySelector("#gjName"); let name=v.name;
      if(nameEl){ name=nameEl.value.trim(); if(!name){ msg.className="gj-msg err"; msg.textContent="Γράψε το όνομά σου."; nameEl.focus(); return; } }
      go.disabled=true; msg.className="gj-msg"; msg.textContent="Στέλνω…";
      try{
        await send([{voter_id:v.id,voter_name:(GJ.TEST?"[TEST] ":"")+name,kind:"score",game:letter,score:pick}]);
        v.name=name; LS.set("gj_voter",v); mine.scores[letter]=pick; LS.set(VKEY,mine); GJ._dirty=true;
        show(`<div class="gj-done"><div class="big">${pick}/10</div><p class="gj-msg ok">✓ Η ψήφος σου για το Game ${letter} καταχωρήθηκε.</p></div>
          <button class="gj-go" id="gjOk">Τέλεια</button>`);
        sh.querySelector("#gjOk").onclick=close;
      }catch(e){ go.disabled=false; msg.className="gj-msg err";
        msg.textContent = e.message==="nokey" ? "Η ψηφοφορία δεν έχει ενεργοποιηθεί ακόμα." : "Κάτι πήγε στραβά. Δοκίμασε ξανά."; }
    };
  };

  GJ.awardsSheet = function(){
    const v=GJ.voter(), mine=GJ.myVotes();
    if(!GJ.open()){ show(`<h2 class="gj-h">ΒΡΑΒΕΙΑ</h2><p class="gj-msg">${closedMsg()}</p>`); return; }
    const pick={bug:mine.awards.bug||"",visual:mine.awards.visual||""};
    const group=(key,label)=>`<span class="gj-lbl">${label}</span><div class="gj-chips3" data-k="${key}">${GJ.GAMES.map(g=>`<button class="gj-chip" data-g="${g}" aria-pressed="${pick[key]===g}">${esc(GJ.gname(g))}</button>`).join("")}</div>`;
    show(`<h2 class="gj-h">ΒΡΑΒΕΙΑ<small>Διάλεξε ένα παιχνίδι σε κάθε κατηγορία.</small></h2>
      ${v.name?"":`<label class="gj-lbl" for="gjName">Το όνομά σου</label><input id="gjName" class="gj-in" maxlength="40" autocomplete="name" placeholder="π.χ. Μαρία">`}
      ${group("bug","🪲 Χρυσό bug: το πιο αστείο glitch")}
      ${group("visual","🎨 Καλύτερο οπτικό")}
      <button class="gj-go" id="gjGo">Καταχώρηση</button><p class="gj-msg" id="gjMsg" aria-live="polite"></p>`);
    const go=sh.querySelector("#gjGo"), msg=sh.querySelector("#gjMsg");
    const sync=()=>{ go.disabled=!(pick.bug||pick.visual); }; sync();
    sh.querySelectorAll(".gj-chips3").forEach(row=>row.querySelectorAll(".gj-chip").forEach(b=>b.onclick=()=>{
      pick[row.dataset.k]=b.dataset.g; row.querySelectorAll(".gj-chip").forEach(x=>x.setAttribute("aria-pressed",x===b)); sync(); }));
    go.onclick=async()=>{
      const nameEl=sh.querySelector("#gjName"); let name=v.name;
      if(nameEl){ name=nameEl.value.trim(); if(!name){ msg.className="gj-msg err"; msg.textContent="Γράψε το όνομά σου."; nameEl.focus(); return; } }
      const rows=[]; for(const k of ["bug","visual"]) if(pick[k]) rows.push({voter_id:v.id,voter_name:(GJ.TEST?"[TEST] ":"")+name,kind:"award",game:pick[k],award:k});
      go.disabled=true; msg.className="gj-msg"; msg.textContent="Στέλνω…";
      try{ await send(rows); v.name=name; LS.set("gj_voter",v); Object.assign(mine.awards,pick); LS.set(VKEY,mine); GJ._dirty=true;
        show(`<div class="gj-done"><div class="big">✓</div><p class="gj-msg ok">Οι ψήφοι σου για τα βραβεία καταχωρήθηκαν.</p></div><button class="gj-go" id="gjOk">Τέλεια</button>`);
        sh.querySelector("#gjOk").onclick=close;
      }catch(e){ go.disabled=false; msg.className="gj-msg err"; msg.textContent = e.message==="nokey" ? "Η ψηφοφορία δεν έχει ενεργοποιηθεί ακόμα." : "Κάτι πήγε στραβά. Δοκίμασε ξανά."; }
    };
  };


  /* ---------- Comments ---------- */
  const REST = ()=>GJ.SUPA_URL+"/rest/v1/gj_comments";
  const hdr = (extra)=>Object.assign({ "apikey":GJ.SUPA_KEY }, GJ.SUPA_KEY.startsWith("sb_")?{}:{ "Authorization":"Bearer "+GJ.SUPA_KEY }, extra||{});
  GJ.COMMENTS_END = new Date("2026-10-05T00:00:00+03:00");
  GJ.commentsOpen = ()=>{ const n=new Date(); return n>=GJ.PLAY_AT && n<GJ.COMMENTS_END; };
  GJ.cList = async (letter)=>{
    const r=await fetch(REST()+"?select=id,created_at,voter_name,game,body&game=eq."+letter+"&order=created_at.asc&limit=300",{ headers:hdr(), cache:"no-store" });
    if(!r.ok) throw new Error("http "+r.status); return r.json();
  };
  GJ.cCounts = async ()=>{
    const r=await fetch(REST()+"?select=game&limit=2000",{ headers:hdr(), cache:"no-store" });
    if(!r.ok) throw new Error("http "+r.status); const rows=await r.json(); const c={A:0,B:0,C:0}; rows.forEach(x=>{ if(c[x.game]!=null) c[x.game]++; }); return c;
  };
  async function cPost(letter, name, body){
    const h=hdr({ "Content-Type":"application/json", "Prefer":"return=minimal" });
    const r=await fetch(REST(),{ method:"POST", headers:h, body:JSON.stringify([{ voter_id:GJ.voter().id, voter_name:(GJ.TEST?"[TEST] ":"")+name, game:letter, body }]) });
    if(!r.ok){ const t=await r.text().catch(()=>""); throw new Error(/slow down|too many/.test(t)?"slow":"http "+r.status); }
  }
  function fmtTime(iso){ const d=new Date(iso), n=new Date(); const t=d.toLocaleTimeString("el-GR",{hour:"2-digit",minute:"2-digit",hour12:false});
    return d.toDateString()===n.toDateString()? t : d.toLocaleDateString("el-GR",{weekday:"short"})+" "+t; }
  let cTimer=null;
  GJ.commentsSheet = function(letter){
    const v=GJ.voter();
    if(new Date()<GJ.PLAY_AT){ show(`<h2 class="gj-h">ΣΧΟΛΙΑ<small>${esc(GJ.gname(letter))}</small></h2><p class="gj-msg">Τα σχόλια δεν έχουν ανοίξει ακόμα.</p>`); return; }
    const open=GJ.commentsOpen();
    const nameHtml = v.name
      ? `<p class="gj-hint" id="gjAs">Σχολιάζεις ως <b>${esc(v.name)}</b> · <button type="button" class="gj-link" id="gjChg">αλλαγή</button></p>`
      : `<label class="gj-lbl" for="gjName">Το όνομά σου</label><input id="gjName" class="gj-in" maxlength="40" autocomplete="name" placeholder="π.χ. Μαρία">`;
    show(`<h2 class="gj-h">ΣΧΟΛΙΑ<small>${esc(GJ.gname(letter))} · τα σχόλια φαίνονται σε όλους και στο Discord</small></h2>
      <div class="gj-clist" id="gjList" aria-live="polite"><p class="gj-hint">Φορτώνω…</p></div>
      ${open?`${nameHtml}
      <textarea id="gjBody" class="gj-in gj-ta" rows="2" maxlength="500" placeholder="Γράψε ένα σχόλιο για το ${esc(GJ.gname(letter))}…"></textarea>
      <button class="gj-go" id="gjSend">Στείλε σχόλιο</button><p class="gj-msg" id="gjMsg" aria-live="polite"></p>`:`<p class="gj-msg">Τα σχόλια έκλεισαν.</p>`}`);
    const list=sh.querySelector("#gjList");
    let lastCount=-1;
    async function load(scroll){
      try{ const rows=await GJ.cList(letter);
        if(rows.length===lastCount && !scroll) return; lastCount=rows.length;
        list.textContent="";
        if(!rows.length){ const p=document.createElement("p"); p.className="gj-hint"; p.textContent="Κανένα σχόλιο ακόμα. Γράψε το πρώτο!"; list.append(p); return; }
        const me=GJ.voter().name;
        rows.forEach(r=>{ const it=document.createElement("div"); it.className="gj-c"+(me&&r.voter_name===me?" me":"");
          const h=document.createElement("div"); h.className="gj-ch"; const b=document.createElement("b"); b.textContent=r.voter_name; const t=document.createElement("span"); t.textContent=fmtTime(r.created_at); h.append(b,t);
          const m=document.createElement("div"); m.className="gj-cb"; m.textContent=r.body; it.append(h,m); list.append(it); });
        list.scrollTop=list.scrollHeight;
      }catch(e){ if(lastCount<0){ list.textContent=""; const p=document.createElement("p"); p.className="gj-hint"; p.textContent="Δεν φορτώθηκαν τα σχόλια. Δοκίμασε ξανά σε λίγο."; list.append(p); } }
    }
    load(true);
    clearInterval(cTimer); cTimer=setInterval(()=>{ if(!sh.classList.contains("on")){ clearInterval(cTimer); return; } load(false); },12000);
    if(!open) return;
    const send=sh.querySelector("#gjSend"), msg=sh.querySelector("#gjMsg"), ta=sh.querySelector("#gjBody");
    const chg=sh.querySelector("#gjChg");
    if(chg) chg.onclick=()=>{ const as=sh.querySelector("#gjAs"); as.outerHTML=`<label class="gj-lbl" for="gjName">Το όνομά σου</label><input id="gjName" class="gj-in" maxlength="40" autocomplete="name" value="${esc(GJ.voter().name)}">`; };
    send.onclick=async()=>{
      const body=ta.value.trim(); if(!body){ ta.focus(); return; }
      const nameEl=sh.querySelector("#gjName"); let name=GJ.voter().name;
      if(nameEl){ name=nameEl.value.trim(); if(!name){ msg.className="gj-msg err"; msg.textContent="Γράψε το όνομά σου."; nameEl.focus(); return; } }
      send.disabled=true; msg.className="gj-msg"; msg.textContent="Στέλνω…";
      try{ await cPost(letter,name,body);
        const vv=GJ.voter(); if(vv.name!==name){ vv.name=name; LS.set("gj_voter",vv); }
        ta.value=""; GJ._dirty=true; msg.className="gj-msg ok"; msg.textContent="✓ Στάλθηκε";
        if(nameEl){ const lb=sh.querySelector('label[for="gjName"]'); if(lb) lb.remove(); nameEl.outerHTML=`<p class="gj-hint" id="gjAs">Σχολιάζεις ως <b>${esc(name)}</b> · <button type="button" class="gj-link" id="gjChg2">αλλαγή</button></p>`;
          const c2=sh.querySelector("#gjChg2"); if(c2) c2.onclick=()=>{ const as=sh.querySelector("#gjAs"); as.outerHTML=`<label class="gj-lbl" for="gjName">Το όνομά σου</label><input id="gjName" class="gj-in" maxlength="40" autocomplete="name" value="${esc(GJ.voter().name)}">`; }; }
        await load(true); setTimeout(()=>{ if(msg.textContent==="✓ Στάλθηκε") msg.textContent=""; },2500);
      }catch(e){ msg.className="gj-msg err"; msg.textContent = e.message==="slow" ? "Λίγο πιο αργά! Δοκίμασε σε λίγα δευτερόλεπτα." : "Κάτι πήγε στραβά. Δοκίμασε ξανά."; }
      send.disabled=false;
    };
  };


  /* ---------- Shared helpers: RPC, reactions, progress, video ---------- */
  GJ.top = (()=>{ try{ return (window.parent!==window && window.parent.GJ) ? window.parent.GJ : GJ; }catch(e){ return GJ; } })();
  GJ.rpc = async (name,args)=>{
    const r=await fetch(GJ.SUPA_URL+"/rest/v1/rpc/"+name,{ method:"POST", headers:hdr({"Content-Type":"application/json"}), body:JSON.stringify(args||{}), cache:"no-store" });
    if(!r.ok) throw new Error("http "+r.status); const t=await r.text(); return t?JSON.parse(t):null;
  };
  GJ.TAGS=[["art","🎨","Οπτικό"],["music","🎵","Μουσική"],["idea","💡","Ιδέα"],["gameplay","🕹️","Gameplay"],["funny","😂","Αστείο"],["scary","😱","Ένταση"],["fire","🔥","Φωτιά"],["hard","💀","Δύσκολο"]];
  const RK = GJ.TEST ? "gj_myreact_test" : "gj_myreact";
  GJ.myReact = ()=> LS.get(RK,[]);
  GJ.reactCounts = ()=> GJ.rpc("gj_reaction_counts");
  GJ.syncMyReact = async ()=>{ if(GJ.TEST) return GJ.myReact(); try{ const rows=(await GJ.rpc("gj_my_reactions",{p_voter:GJ.voter().id}))||[]; const a=rows.map(r=>r.game+":"+r.tag); LS.set(RK,a); return a; }catch(e){ return GJ.myReact(); } };
  GJ.react = async (game,tag,on)=>{
    if(!GJ.TEST) await GJ.rpc("gj_react",{p_voter:GJ.voter().id,p_game:game,p_tag:tag,p_on:on});   // test mode keeps reactions local
    const a=new Set(GJ.myReact()); on?a.add(game+":"+tag):a.delete(game+":"+tag); LS.set(RK,[...a]);
  };
  GJ.report = (game,kind,value)=>{ try{ return fetch(GJ.SUPA_URL+"/rest/v1/rpc/gj_report",{ method:"POST", keepalive:true, headers:hdr({"Content-Type":"application/json"}),
      body:JSON.stringify({ p_voter:GJ.voter().id, p_name:(GJ.TEST?"[TEST] ":"")+(GJ.voter().name||""), p_game:game, p_kind:kind, p_value:value }) }).catch(()=>{}); }catch(e){} };
  GJ.stats = ()=> GJ.rpc("gj_stats");
  GJ.fmtDur = sec => { sec=Math.round(sec||0); const h=Math.floor(sec/3600), m=Math.floor(sec%3600/60); return h? h+"ω "+m+"'" : m? m+"'" : sec+"''"; };
  GJ.videoSheet = (url,title,poster)=>{
    const yt=/^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,20})/i.exec(url||"");
    if(!yt && /^https?:\/\//i.test(url||"") && !/\.(mp4|webm|mov)(\?|$)/i.test(url)){ window.open(url,"_blank","noopener"); return; }
    try{ if(parent.GJ_RADIO){ parent.GJ_RADIO.hold(true); GJ._held=true; } }catch(e){}
    const inner = yt ? `<div class="gj-vid"><iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&playsinline=1" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`
      : `<div class="gj-vid"><video src="${esc(url)}" ${poster?`poster="${esc(poster)}"`:""} controls playsinline autoplay preload="metadata"></video></div>`;
    show(`<h2 class="gj-h">🎬 ${esc(title)}</h2>${inner}`);
  };
  // first user gesture inside an embedded page must reach the radio in the shell synchronously (autoplay rules)
  if(window.parent!==window){ ["pointerdown","touchend","keydown"].forEach(n=>addEventListener(n,()=>{ try{ parent.GJ_RADIO&&parent.GJ_RADIO.gesture(); }catch(e){} },true)); }


  /* ---------- Champions: who cleared the game, how long it took, game-specific details ---------- */
  GJ.CLEAR_VER = { A:"v1", B:"v1", C:"hard1" };
  GJ.CHAMP_TITLE = { A:"Descent Champions", B:"Patra's Brawlers Champions", C:"Unremembered Champions" };
  GJ.setName = n => { const v=GJ.voter(); v.name=String(n||"").trim().slice(0,40); LS.set("gj_voter",v); return v.name; };
  GJ.fmtClock = sec => { sec=Math.round(sec||0); const h=Math.floor(sec/3600), m=Math.floor(sec%3600/60), x=sec%60; return (h? h+":"+String(m).padStart(2,"0") : String(m))+":"+String(x).padStart(2,"0"); };
  GJ.clearsList = async (L,ver)=> (await GJ.rpc("gj_clears_list",{p_game:L,p_ver:ver===undefined?GJ.CLEAR_VER[L]:ver}))||[];
  GJ.clearCounts = async ()=>{ const out={A:0,B:0,C:0}; await Promise.all(["A","B","C"].map(async L=>{ try{ out[L]=(await GJ.clearsList(L)).length; }catch(e){} })); return out; };
  GJ.reportClear = (L,ver,mode,seconds,details)=>{
    try{ return fetch(GJ.SUPA_URL+"/rest/v1/rpc/gj_report_clear",{ method:"POST", keepalive:true, headers:hdr({"Content-Type":"application/json"}),
      body:JSON.stringify({ p_voter:GJ.voter().id, p_name:(GJ.TEST?"[TEST] ":"")+(GJ.voter().name||""), p_game:L, p_ver:ver, p_mode:mode||"", p_seconds:seconds, p_details:details||{} }) }); }catch(e){ return Promise.resolve(); }
  };
  const RANKC={S:"#f0c060",A:"#3fd0c9",B:"#f1efe8"};
  function detailChips(L,d){
    d=d||{}; const out=[]; const chip=(txt,cls,col)=>{ const e=document.createElement("span"); e.className="ch-chip"+(cls?" "+cls:""); e.textContent=txt; if(col){ e.style.background=col; e.style.color="#22223B"; } out.push(e); };
    if(d.avgRank){ chip("Ø rank "+d.avgRank+(d.avgScore!=null?" ("+Math.round(d.avgScore)+")":""),"rank",RANKC[d.avgRank]||"#fff"); }
    const nb=Array.isArray(d.battles)?d.battles.length:(d.battleCount||0); if(nb) chip(nb+" μάχες");
    if(d.ending!=null&&d.ending!=="") chip("Ending "+d.ending);
    if(d.deaths!=null) chip("💀 "+d.deaths); if(d.detected!=null) chip("👁 "+d.detected+" φορές"); 
    if(d.cities!=null) chip("🌍 "+d.cities+(d.citiesTotal?"/"+d.citiesTotal:"")+" πόλεις"); if(d.wins!=null) chip("🥊 "+d.wins+" νίκες"); if(d.streak!=null) chip("🔥 σερί "+d.streak);
    if(!out.length){ Object.entries(d).filter(([k,v])=>typeof v!=="object").slice(0,3).forEach(([k,v])=>chip(k+": "+v)); }
    return out;
  }
  GJ.championsSheet = async function(L){
    const esc=GJ.esc; const title=GJ.CHAMP_TITLE[L]||(GJ.gname(L)+" Champions");
    show(`<h2 class="gj-h">🏅 ${esc(title)}<small>Όσοι τελείωσαν το παιχνίδι, με τον πιο γρήγορο πρώτο</small></h2><div class="ch-list" id="chList"><p class="gj-hint">Φορτώνω…</p></div><div id="chAct"></div>`);
    const list=sh.querySelector("#chList"), act=sh.querySelector("#chAct"); let rows=[], mode="";
    const draw=()=>{
      list.textContent=""; act.textContent="";
      const modes=[...new Set(rows.map(r=>r.mode).filter(Boolean))];
      const shown=rows.filter(r=>!mode||r.mode===mode);
      if(modes.length>1){ const ch=document.createElement("div"); ch.className="ch-modes"; [["","Όλα"],...modes.map(m=>[m,m])].forEach(([k,lab])=>{ const b=document.createElement("button"); b.type="button"; b.className="gj-chip"; b.textContent=lab; b.setAttribute("aria-pressed",String(mode===k)); b.onclick=()=>{ mode=k; draw(); }; ch.append(b); }); list.append(ch); }
      if(!shown.length){ const p=document.createElement("p"); p.className="gj-hint"; p.textContent="Κανείς ακόμα. Θα είσαι ο πρώτος;"; list.append(p); return; }
      shown.forEach((r,i)=>{ const it=document.createElement("div"); it.className="ch-row"+(i===0?" first":"");
        const pos=document.createElement("div"); pos.className="ch-pos"; pos.textContent=["🥇","🥈","🥉"][i]||String(i+1);
        const mid=document.createElement("div"); mid.className="ch-mid"; const nm=document.createElement("b"); nm.textContent=r.name; const chips=document.createElement("div"); chips.className="ch-chips";
        if(r.mode){ const mc=document.createElement("span"); mc.className="ch-chip mode"; mc.textContent=r.mode; chips.append(mc); }
        detailChips(L,r.details).forEach(c=>chips.append(c)); mid.append(nm,chips);
        const tm=document.createElement("div"); tm.className="ch-time"; tm.textContent="⏱ "+GJ.fmtClock(r.seconds); it.append(pos,mid,tm); list.append(it); });
      const names=[...new Set(shown.map(r=>r.name))]; const cb=document.createElement("button"); cb.type="button"; cb.className="gj-go"; cb.textContent="📋 Αντιγραφή ονομάτων για τα credits";
      cb.onclick=async()=>{ const txt=names.join("\n"); try{ await navigator.clipboard.writeText(txt); cb.textContent="✓ Αντιγράφηκαν "+names.length+" ονόματα"; }catch(e){ cb.textContent="Δεν έγινε αντιγραφή"; } };
      act.append(cb);
      const hint=document.createElement("p"); hint.className="gj-hint"; hint.textContent="Μετράει το γρηγορότερο τρέξιμο κάθε παίκτη. Τα νούμερα στέλνονται από το ίδιο το παιχνίδι."; act.append(hint);
    };
    try{ rows=await GJ.clearsList(L); }catch(e){ list.textContent=""; const p=document.createElement("p"); p.className="gj-hint"; p.textContent="Δεν φορτώθηκε η λίστα. Δοκίμασε ξανά σε λίγο."; list.append(p); return; }
    draw();
  };

  /* ---------- PWA ---------- */
  if("serviceWorker" in navigator) addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
  GJ.standalone = ()=> matchMedia("(display-mode: standalone)").matches || navigator.standalone===true;
  GJ.platform = ()=>{ const u=navigator.userAgent||"";
    const ios=/iPhone|iPad|iPod/.test(u) || (navigator.platform==="MacIntel" && navigator.maxTouchPoints>1);
    const inapp=/Instagram|FBAN|FBAV|Discord|Line\/|Snapchat|TikTok|musical_ly|Twitter/i.test(u);
    return { ios, android:/Android/i.test(u), inapp }; };
  GJ.deferredPrompt=null;
  addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); GJ.deferredPrompt=e; document.dispatchEvent(new CustomEvent("gj:installable")); });
})();

/* test-mode banner */
(function(){ if(!window.GJ||!GJ.TEST) return;
  const add=()=>{ const b=document.createElement("button"); b.type="button"; b.className="gj-test"; b.innerHTML="🧪 TEST MODE <u>Έξοδος</u>";
    b.onclick=()=>{ try{ localStorage.removeItem("gj_test"); localStorage.removeItem("gj_votes_test"); }catch(e){} location.href=location.pathname; };
    document.body.append(b); };
  if(document.body) add(); else addEventListener("DOMContentLoaded",add); })();
