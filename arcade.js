/* Arcade + developer profiles. Reads gj_devs / gj_games from Supabase (public), falls back to the built-in seed.
   Edits go through key-checked RPCs; a dev opens their private link once (…/devs/<name>/#key=…) and stays logged in on that device. */
(function(){
  const B=document.body, ROOT=B.dataset.root||"", PAGE=B.dataset.page, SLUG=B.dataset.dev||"";
  const SEED={"devs": [{"slug": "kostas", "name": "Κώστας", "tagline": "Game dev · Unremembered", "bio": "", "avatar": "img/dev-kostas.png", "fav_game": "Sonic Unleashed", "traits": ["Average Gemini enjoyer", "Νομίζει ότι είναι προγραμματιστής", "Δεν του αρέσει να του κάνουν spoil"], "links": []}, {"slug": "amarildo", "name": "Αμαρίλντο", "tagline": "Game dev · Patra's Brawlers", "bio": "", "avatar": "img/dev-amarildo.png", "fav_game": "Elden Ring", "traits": ["Νομίζει ότι είναι ο Subaru", "Επαγγελματίας εισπράκτορας ταμείου ανεργίας", "Κάνει spoil"], "links": []}, {"slug": "fanis", "name": "Φάνης", "tagline": "Game dev · Descent", "bio": "", "avatar": "img/dev-fanis.png", "fav_game": "League of Legends", "traits": ["Του αρέσει το LoL χαχα", "«Θα είμαι εκεί σε 5'»", "«Ό,τι ώρα γυρίζω συνήθως»"], "links": []}], "games": [{"id": "descent", "dev_slug": "fanis", "title": "Descent", "tagline": "Σύρε αριστερά για κίνηση, πάτα δεξιά για ήχο. Περπάτα αργά, ο θόρυβος σε προδίδει.", "description": "", "thumb": "games/a/thumb.jpg", "play_url": "play.html?g=A", "jam": "Game Jam Vol. 01", "status": "live", "sort": 10, "video_url": "", "video_label": "Trailer"}, {"id": "patras-brawlers", "dev_slug": "amarildo", "title": "Patra's Brawlers", "tagline": "D-pad για κίνηση, Punch/Kick για χτυπήματα, Block για άμυνα, Special με γεμάτη μπάρα", "description": "", "thumb": "games/b/thumb.jpg", "play_url": "play.html?g=B", "jam": "Game Jam Vol. 01", "status": "live", "sort": 10, "video_url": "media/patras-brawlers-trailer.mp4", "video_label": "Trailer"}, {"id": "unremembered", "dev_slug": "kostas", "title": "Unremembered", "tagline": "Σοβαρό 2D RPG όπου οι αναμνήσεις γίνονται δύναμη.", "description": "Turn-based μάχες με parry και dodge σε πραγματικό χρόνο. Demo για το Game Jam Vol. 01.", "thumb": "games/c/thumb.jpg", "play_url": "play.html?g=C", "jam": "Game Jam Vol. 01", "status": "demo", "sort": 10, "video_url": "", "video_label": "Trailer"}]};
  let DEVS=SEED.devs.slice(), GAMES=SEED.games.slice(), FILTER="all", EDIT=false, KEY="";
  const app=document.getElementById("app");
  const el=(t,c,x)=>{ const e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; };
  const U=p=>!p?"":/^(https?:|data:)/.test(p)?p:ROOT+p;
  const ST={live:"Παίζεται",demo:"Demo",wip:"Σε εξέλιξη",soon:"Σύντομα",archived:"Αρχείο"};
  const devOf=s=>DEVS.find(d=>d.slug===s);
  const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const H=(x)=>Object.assign({apikey:GJ.SUPA_KEY},GJ.SUPA_KEY.startsWith("sb_")?{}:{Authorization:"Bearer "+GJ.SUPA_KEY},x||{});
  const REST=GJ.SUPA_URL+"/rest/v1/";

  /* ---------- data ---------- */
  async function load(){
    try{
      const [a,b]=await Promise.all([
        fetch(REST+"gj_devs?select=slug,name,tagline,bio,avatar,fav_game,traits,links&order=slug.asc",{headers:H(),cache:"no-store"}),
        fetch(REST+"gj_games?select=id,dev_slug,title,tagline,description,thumb,play_url,jam,status,sort,video_url,video_label,updated_at&order=sort.asc,updated_at.desc",{headers:H(),cache:"no-store"})]);
      if(a.ok&&b.ok){ const d=await a.json(), g=await b.json(); if(d.length){ DEVS=d; GAMES=g; } }
    }catch(e){}
    render();
  }
  async function rpc(name,args){
    const r=await fetch(REST+"rpc/"+name,{method:"POST",headers:H({"Content-Type":"application/json"}),body:JSON.stringify(args)});
    if(!r.ok){ const t=await r.text().catch(()=>""); throw new Error(/forbidden/.test(t)?"forbidden":"http "+r.status); }
    const t=await r.text(); return t?JSON.parse(t):null;
  }

  /* ---------- pieces ---------- */
  function avatar(d,cls){ const i=el("img",cls||""); i.alt=d.name; i.src=U(d.avatar)||U("img/dev-"+d.slug+".png"); if(!/^data:/.test(i.src)) i.classList.add("px"); i.onerror=()=>{ i.removeAttribute("src"); }; return i; }
  function gameCard(g,showDev){
    const c=el("article","gc glass"); const th=el("div","th");
    if(g.thumb){ const i=el("img"); i.alt=g.title; i.loading="lazy"; i.src=U(g.thumb); i.onerror=()=>{ i.remove(); th.textContent=(g.title||"?").slice(0,1).toUpperCase(); }; th.append(i); } else th.textContent=(g.title||"?").slice(0,1).toUpperCase();
    const bd=el("div","bd"); bd.append(el("h3",null,g.title));
    const d=devOf(g.dev_slug);
    if(d&&showDev){ const by=el("p","by"); by.append(document.createTextNode("από ")); const a=el("a",null,d.name); a.href=ROOT+"devs/"+d.slug+"/"; by.append(a); bd.append(by); }
    if(g.tagline) bd.append(el("p","tg",g.tagline)); if(g.description) bd.append(el("p","ds",g.description));
    const bs=el("div","badges"); if(g.jam) bs.append(el("span","bdg",g.jam)); bs.append(el("span","bdg "+g.status,ST[g.status]||g.status)); bd.append(bs);
    const ac=el("div","acts");
    if(g.play_url){ const a=el("a","btn","▶ Παίξε"); a.href=/^(https?:)/.test(g.play_url)?g.play_url:ROOT+g.play_url; if(/^https?:/.test(g.play_url)){ a.target="_blank"; a.rel="noopener"; } else a.target="_top"; ac.append(a); }
    if(g.video_url){ const lab=g.video_label||"Trailer"; const v=el("button","btn alt","🎬 "+lab); v.type="button"; const poster=/^media\/.+\.mp4$/.test(g.video_url)?U(g.video_url.replace(/\.mp4$/,".jpg")):""; v.onclick=()=>GJ.videoSheet(U(g.video_url),g.title+" · "+lab,poster); ac.append(v); }
    const mm=/[?&]g=([ABC])\b/.exec(g.play_url||""); if(mm){ const st=el("p","gstat"); st.dataset.l=mm[1]; bd.insertBefore(st,bs.nextSibling); }
    if(mm){ const cb=el("button","btn alt gcb","🏅 Champions"); cb.type="button"; cb.dataset.l=mm[1]; cb.hidden=(mm[1]!=="C"&&!(CLR&&CLR[mm[1]]>0)); cb.onclick=()=>GJ.championsSheet(mm[1]); ac.append(cb); }
    if(EDIT&&g.dev_slug===SLUG){ const b=el("button","btn alt","✎ Επεξεργασία"); b.type="button"; b.onclick=()=>gameEditor(g); ac.append(b); }
    if(ac.children.length) bd.append(ac);
    c.append(th,bd); return c;
  }
  function paintStats(st){ document.querySelectorAll(".gstat").forEach(p=>{ const s=st&&st[p.dataset.l]; if(!s){ return; } const a=[]; a.push("🎮 "+s.players+(s.players===1?" έπαιξε":" έπαιξαν")); if(s.seconds>=60) a.push("⏱ "+GJ.fmtDur(s.seconds)); if(s.finishers&&s.finishers.length) a.push("✔ "+s.finishers.length+" το τελείωσαν"); p.textContent=a.join(" · "); }); }
let CLR=null; function paintClr(){ document.querySelectorAll(".gcb").forEach(b=>{ const n=CLR&&CLR[b.dataset.l]||0; b.hidden=!(n>0||b.dataset.l==="C"); b.textContent="🏅 Champions"+(n?" ("+n+")":""); }); }
let STATS=null; function loadStats(){ GJ.clearCounts().then(c=>{ CLR=c; paintClr(); }).catch(()=>{}); GJ.stats().then(s=>{ STATS=s; paintStats(s); }).catch(()=>{}); }
function soonCard(){ const c=el("article","gc glass soon"); const bd=el("div","bd"); bd.append(el("div",null,"🚧 Game Jam Vol. 02")); bd.append(el("p","empty","Το επόμενο jam. Σύντομα.")); c.append(bd); return c; }

  /* ---------- pages ---------- */
  function renderArcade(){
    app.textContent="";
    const chips=el("div","chips"); chips.setAttribute("role","group"); chips.setAttribute("aria-label","Φίλτρο δημιουργού");
    const mk=(key,label,d)=>{ const b=el("button","chip"+(d?"":" all")); b.type="button"; b.setAttribute("aria-pressed",FILTER===key); if(d) b.append(avatar(d)); b.append(document.createTextNode(label)); b.onclick=()=>{ FILTER=key; renderArcade(); }; return b; };
    chips.append(mk("all","Όλα ("+GAMES.length+")"));
    DEVS.forEach(d=>chips.append(mk(d.slug,d.name+" ("+GAMES.filter(g=>g.dev_slug===d.slug).length+")",d)));
    app.append(chips);
    const grid=el("div","grid"); const list=GAMES.filter(g=>FILTER==="all"||g.dev_slug===FILTER);
    list.forEach(g=>grid.append(gameCard(g,true)));
    if(FILTER==="all") grid.append(soonCard());
    app.append(grid);
    app.append(el("h2",null,"Οι δημιουργοί"));
    const dv=el("div","devs");
    DEVS.forEach(d=>{ const a=el("a","dv glass"); a.href=ROOT+"devs/"+d.slug+"/"; a.append(avatar(d),el("span",null,d.name)); const n=GAMES.filter(g=>g.dev_slug===d.slug).length; a.append(el("small",null,n+(n===1?" παιχνίδι":" παιχνίδια"))); dv.append(a); });
    app.append(dv);
  }
  function renderDev(){
    app.textContent=""; const d=devOf(SLUG);
    if(!d){ app.append(el("p","empty","Δεν βρέθηκε αυτό το προφίλ.")); return; }
    document.title=d.name+" · Arcade · Game Jam";
    const pf=el("section","pf glass"); const top=el("div","top"); top.append(avatar(d,"av"));
    const nm=el("div"); nm.append(el("h1",null,d.name)); if(d.tagline) nm.append(el("p","tl",d.tagline)); if(d.fav_game) nm.append(el("span","fav","♥ "+d.fav_game)); top.append(nm); pf.append(top);
    if(d.bio) pf.append(el("p","bio",d.bio));
    if(d.traits&&d.traits.length){ const ul=el("ul","traits"); d.traits.forEach(t=>ul.append(el("li",null,t))); pf.append(ul); }
    if(d.links&&d.links.length){ const ls=el("div","links"); d.links.forEach(l=>{ const a=el("a","btn alt",l.label||l.url); a.href=l.url; a.target="_blank"; a.rel="noopener noreferrer"; ls.append(a); }); pf.append(ls); }
    if(EDIT){ const b=el("button","btn red","✎ Επεξεργασία προφίλ"); b.type="button"; b.onclick=profileEditor; pf.append(b); pf.append(el("p","edit-hint","Είσαι συνδεδεμένος ως "+d.name+" σε αυτή τη συσκευή.")); }
    app.append(pf);
    app.append(el("h2",null,"Games made"));
    const grid=el("div","grid"); const list=GAMES.filter(g=>g.dev_slug===SLUG);
    list.forEach(g=>grid.append(gameCard(g,false)));
    if(!list.length) grid.append(el("p","empty","Κανένα παιχνίδι ακόμα."));
    if(EDIT){ const b=el("button","btn red","＋ Νέο παιχνίδι"); b.type="button"; b.onclick=()=>gameEditor(null); grid.append(b); }
    app.append(grid);
    const all=el("a","btn alt","🕹️ Όλο το Arcade"); all.href=ROOT+"arcade/"; all.style.marginTop="22px"; app.append(all);
  }
  function render(){ PAGE==="dev"?renderDev():renderArcade(); if(STATS) paintStats(STATS); paintClr(); }

  /* ---------- editors (shared bottom sheet) ---------- */
  function fld(label,id,val,opt){ opt=opt||{}; const v=esc(val);
    if(opt.area) return `<label class="gj-lbl" for="${id}">${label}</label><textarea id="${id}" class="gj-in" maxlength="${opt.max||800}" placeholder="${esc(opt.ph||"")}">${v}</textarea>`;
    return `<label class="gj-lbl" for="${id}">${label}</label><input id="${id}" class="gj-in" maxlength="${opt.max||140}" value="${v}" placeholder="${esc(opt.ph||"")}" ${opt.type?`type="${opt.type}"`:""}>`; }
  function fileToData(file,w,h,q){
    return new Promise((res,rej)=>{ const fr=new FileReader(); fr.onerror=()=>rej(new Error("read")); fr.onload=()=>{ const im=new Image(); im.onerror=()=>rej(new Error("image")); im.onload=()=>{
      const c=document.createElement("canvas"); c.width=w; c.height=h; const x=c.getContext("2d"); const ar=w/h, sr=im.width/im.height; let sw=im.width, sh=im.height, sx=0, sy=0;
      if(sr>ar){ sw=im.height*ar; sx=(im.width-sw)/2; } else { sh=im.width/ar; sy=(im.height-sh)/2; }
      x.fillStyle="#000"; x.fillRect(0,0,w,h); x.drawImage(im,sx,sy,sw,sh,0,0,w,h); res(c.toDataURL("image/jpeg",q)); }; im.src=fr.result; }; fr.readAsDataURL(file); });
  }
  const val=(sh,id)=>{ const e=sh.querySelector("#"+id); return e?e.value:""; };
  const slugify=t=>{ const s=String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,28); return (s.length>=2?s:"game")+"-"+Math.random().toString(36).slice(2,6); };
  const errText=e=>e.message==="forbidden"?"Το κλειδί σου δεν ισχύει πια. Άνοιξε ξανά τον ιδιωτικό σου σύνδεσμο.":e.message==="image"?"Δεν μπόρεσα να διαβάσω την εικόνα.":"Κάτι πήγε στραβά. Δοκίμασε ξανά.";

  function profileEditor(){
    const d=devOf(SLUG); const tr=(d.traits||[]).concat(["","",""]).slice(0,3); const ln=(d.links||[]).concat([{},{},{}]).slice(0,3); let avatarData=null;
    GJ.showSheet(`<h2 class="gj-h">ΠΡΟΦΙΛ<small>${esc(d.name)}</small></h2><div class="ed">
      ${fld("Όνομα","fName",d.name,{max:60})}${fld("Μία γραμμή για σένα","fTag",d.tagline,{max:140,ph:"π.χ. Game dev · RPG και pixel art"})}
      ${fld("Αγαπημένο game","fFav",d.fav_game,{max:80})}${fld("Bio","fBio",d.bio,{area:true,max:800,ph:"Λίγα λόγια για σένα και τα παιχνίδια σου"})}
      <span class="gj-lbl">Τρία πράγματα για σένα</span>${tr.map((t,i)=>`<input id="fT${i}" class="gj-in" maxlength="120" value="${esc(t)}" style="margin-bottom:6px">`).join("")}
      <span class="gj-lbl">Links (προαιρετικά, https://…)</span>${ln.map((l,i)=>`<div class="row2" style="margin-bottom:6px"><input id="fL${i}" class="gj-in" maxlength="40" placeholder="Όνομα" value="${esc(l.label||"")}"><input id="fU${i}" class="gj-in" maxlength="300" placeholder="https://…" value="${esc(l.url||"")}"></div>`).join("")}
      <label class="gj-lbl" for="fAv">Φωτογραφία / avatar</label><input id="fAv" class="gj-in" type="file" accept="image/*"><img class="pv" id="avPv" alt="" hidden>
      <button class="gj-go" id="fSave" type="button">Αποθήκευση</button><p class="gj-msg" id="fMsg" aria-live="polite"></p></div>`);
    const sh=GJ.sheetEl(), msg=sh.querySelector("#fMsg");
    sh.querySelector("#fAv").onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try{ avatarData=await fileToData(f,256,256,.85); const pv=sh.querySelector("#avPv"); pv.src=avatarData; pv.hidden=false; msg.textContent=""; }catch(er){ msg.className="gj-msg err"; msg.textContent=errText(er); } };
    sh.querySelector("#fSave").onclick=async()=>{
      const patch={ name:val(sh,"fName").trim(), tagline:val(sh,"fTag").trim(), fav_game:val(sh,"fFav").trim(), bio:val(sh,"fBio").trim(),
        traits:[0,1,2].map(i=>val(sh,"fT"+i).trim()).filter(Boolean),
        links:[0,1,2].map(i=>({label:val(sh,"fL"+i).trim(),url:val(sh,"fU"+i).trim()})).filter(l=>l.url) };
      if(!patch.name){ msg.className="gj-msg err"; msg.textContent="Το όνομα είναι υποχρεωτικό."; return; }
      if(patch.links.some(l=>!/^https?:\/\//i.test(l.url))){ msg.className="gj-msg err"; msg.textContent="Τα links πρέπει να ξεκινούν με https://"; return; }
      if(avatarData) patch.avatar=avatarData;
      const b=sh.querySelector("#fSave"); b.disabled=true; msg.className="gj-msg"; msg.textContent="Αποθηκεύω…";
      try{ await rpc("gj_dev_update",{p_slug:SLUG,p_key:KEY,p_patch:patch}); GJ.close(); await load(); }catch(er){ b.disabled=false; msg.className="gj-msg err"; msg.textContent=errText(er); }
    };
  }
  function gameEditor(g){
    const isNew=!g; g=g||{id:"",title:"",tagline:"",description:"",thumb:"",play_url:"",video_url:"",video_label:"Trailer",jam:"",status:"wip",sort:100}; let thumbData=null;
    GJ.showSheet(`<h2 class="gj-h">${isNew?"ΝΕΟ ΠΑΙΧΝΙΔΙ":"ΠΑΙΧΝΙΔΙ"}<small>${esc(g.title||"")}</small></h2><div class="ed">
      ${fld("Τίτλος","gT",g.title,{max:80})}${fld("Μία γραμμή (tagline)","gTag",g.tagline,{max:160})}
      ${fld("Περιγραφή","gDs",g.description,{area:true,max:1200})}
      <label class="gj-lbl" for="gSt">Κατάσταση</label><select id="gSt" class="gj-in">${Object.keys(ST).map(k=>`<option value="${k}" ${g.status===k?"selected":""}>${ST[k]}</option>`).join("")}</select>
      ${fld("Link για παίξιμο (https://…)","gUrl",g.play_url,{max:300,ph:"https://…"})}${fld("Βίντεο: trailer ή playthrough (YouTube ή .mp4 link)","gVid",g.video_url,{max:300,ph:"https://youtu.be/…"})}${fld("Τίτλος κουμπιού βίντεο","gVl",g.video_label||"Trailer",{max:30,ph:"Trailer ή Playthrough"})}${fld("Jam / event (προαιρετικό)","gJam",g.jam,{max:60,ph:"π.χ. Game Jam Vol. 01"})}
      <label class="gj-lbl" for="gTh">Εικόνα (16:9)</label><input id="gTh" class="gj-in" type="file" accept="image/*">${g.thumb?`<img class="pv" id="thPv" alt="" src="${esc(U(g.thumb))}">`:`<img class="pv" id="thPv" alt="" hidden>`}
      <button class="gj-go" id="gSave" type="button">Αποθήκευση</button>${isNew?"":`<button class="gj-go dng" id="gDel" type="button">Διαγραφή παιχνιδιού</button>`}<p class="gj-msg" id="gMsg" aria-live="polite"></p></div>`);
    const sh=GJ.sheetEl(), msg=sh.querySelector("#gMsg");
    sh.querySelector("#gTh").onchange=async e=>{ const f=e.target.files[0]; if(!f) return; try{ thumbData=await fileToData(f,640,360,.8); const pv=sh.querySelector("#thPv"); pv.src=thumbData; pv.hidden=false; msg.textContent=""; }catch(er){ msg.className="gj-msg err"; msg.textContent=errText(er); } };
    sh.querySelector("#gSave").onclick=async()=>{
      const title=val(sh,"gT").trim(); const url=val(sh,"gUrl").trim();
      if(!title){ msg.className="gj-msg err"; msg.textContent="Ο τίτλος είναι υποχρεωτικός."; return; }
      if(url&&!/^(https?:\/\/|play\.html|games\/)/i.test(url)){ msg.className="gj-msg err"; msg.textContent="Το link πρέπει να ξεκινά με https://"; return; }
      const vurl=val(sh,"gVid").trim(); if(vurl&&!/^(https?:\/\/|media\/)/i.test(vurl)){ msg.className="gj-msg err"; msg.textContent="Το βίντεο πρέπει να ξεκινά με https://"; return; }
      const game={ id:isNew?slugify(title):g.id, video_url:vurl, video_label:val(sh,"gVl").trim()||"Trailer", title, tagline:val(sh,"gTag").trim(), description:val(sh,"gDs").trim(), status:val(sh,"gSt"), play_url:url, jam:val(sh,"gJam").trim(), thumb:thumbData||g.thumb||"", sort:g.sort||100 };
      const b=sh.querySelector("#gSave"); b.disabled=true; msg.className="gj-msg"; msg.textContent="Αποθηκεύω…";
      try{ await rpc("gj_game_upsert",{p_slug:SLUG,p_key:KEY,p_game:game}); GJ.close(); await load(); }catch(er){ b.disabled=false; msg.className="gj-msg err"; msg.textContent=errText(er); }
    };
    const del=sh.querySelector("#gDel"); if(del) del.onclick=async()=>{
      if(!del.dataset.sure){ del.dataset.sure="1"; del.textContent="Πάτα ξανά για οριστική διαγραφή"; return; }
      try{ await rpc("gj_game_delete",{p_slug:SLUG,p_key:KEY,p_id:g.id}); GJ.close(); await load(); }catch(er){ msg.className="gj-msg err"; msg.textContent=errText(er); } };
  }

  /* ---------- login via private link ---------- */
  async function auth(){
    if(PAGE!=="dev") return;
    const kName="gj_devkey_"+SLUG;
    const m=location.hash.match(/[#&](?:key|edit)=([A-Za-z0-9_-]{20,80})/);
    if(m){ try{ localStorage.setItem(kName,m[1]); }catch(e){} history.replaceState(null,"",location.pathname+location.search); }
    let k=""; try{ k=localStorage.getItem(kName)||""; }catch(e){}
    if(!k) return;
    try{ const ok=await rpc("gj_dev_check",{p_slug:SLUG,p_key:k}); if(ok===true){ EDIT=true; KEY=k; } else { try{ localStorage.removeItem(kName); }catch(e){} } }catch(e){}
  }

  try{ parent.postMessage({gj:"nav",path:location.pathname,title:document.title},location.origin); }catch(e){}
  loadStats();
  render();           // instant, from the built-in seed
  auth().then(load);  // then live data (+ edit mode if logged in)
  addEventListener("hashchange",()=>{ auth().then(load); });
})();
