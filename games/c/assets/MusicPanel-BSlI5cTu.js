import{u,p as d,m as r,t as y,s as m,a as h}from"./index-Bb191QTE.js";function f(c){const x=y(),i=document.createElement("div");i.style.cssText="position:fixed;left:8px;right:8px;bottom:12px;z-index:30;padding:10px;font:14px monospace;color:#f1efe8;background:rgba(18,21,31,.94);border:1px solid #2a2e3d;border-radius:6px;display:flex;flex-direction:column;gap:10px",i.innerHTML=`
    <div style="display:flex;gap:8px">
      <select data-k style="flex:1;min-height:44px;font:inherit;background:#0b0d14;color:inherit;border:1px solid #2a2e3d">${x.map(t=>`<option value="${t}"${t===c?" selected":""}>${t}</option>`).join("")}</select>
      <button data-play style="min-width:84px;min-height:44px;font:inherit">Play</button>
      <button data-stop style="min-width:84px;min-height:44px;font:inherit">Stop</button>
    </div>
    <label style="display:flex;align-items:center;gap:8px">intensity
      <input data-i type="range" min="0" max="1" step="0.05" value="0" style="flex:1;min-height:32px">
      <span data-iv>0.00</span></label>
    <label style="display:flex;align-items:center;gap:8px"><input data-w type="checkbox" style="width:24px;height:24px"> warm (Recollection variant)</label>
    <div data-s style="font-size:12px;color:#8a8fa3;white-space:pre-wrap;word-break:break-word"></div>`,document.body.appendChild(i);const e=t=>i.querySelector(t),p=e("[data-k]"),s=e("[data-i]"),l=e("[data-w]");i.addEventListener("pointerdown",t=>t.stopPropagation());const o=()=>{m(Number(s.value)),h(l.checked),e("[data-iv]").textContent=Number(s.value).toFixed(2)};e("[data-play]").addEventListener("click",()=>{u(),d(null),d(p.value),o()}),e("[data-stop]").addEventListener("click",()=>d(null)),s.addEventListener("input",o),l.addEventListener("change",o),p.addEventListener("change",()=>{r().key&&e("[data-play]").click()}),setInterval(()=>{const t=r(),n=t.position,a=t.stats;e("[data-s]").textContent=t.key?`${t.key}${t.procedural?"":" (file)"}  ${n?`bar ${n.bar}/${n.bars} ${n.section} ${n.chord}`:""}
`+(a?`notes ${a.notes}  dropped ${a.dropped}  tick avg ${(a.tickMs/Math.max(1,a.ticks)).toFixed(3)} ms  max ${a.maxTickMs.toFixed(2)} ms`:"")+`
audio ${t.state}`:`stopped  audio ${t.state}

tap Play (the browser needs a tap to start sound)`},250)}export{f as openMusicPanel};
