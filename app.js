/* ============================================================
   Aqua Soft — editable brochure (page-2 style rebuild)
   price rows + auto total + save/load all editable pages + PDF
   ============================================================ */
const STORAGE_KEY = "aquasoftBrochure_v1";

/* ---------- number helpers ---------- */
function toNumber(s){ const n = parseFloat(String(s).replace(/[^0-9.]/g,"")); return isNaN(n)?0:n; }
function formatIN(num){
  let x = num.toFixed(0), last3 = x.slice(-3), rest = x.slice(0,-3);
  if(rest) last3 = "," + last3;
  rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return rest + last3;
}

/* ---------- auto total (page 2) ---------- */
function recalcTotal(){
  let sum = 0;
  document.querySelectorAll("#priceTable tbody tr:not(.total):not(.gst) .price").forEach(td=> sum += toNumber(td.textContent));
  const gt = document.getElementById("grandTotal");
  if(gt) gt.textContent = formatIN(sum) + "/-";
}
function bindPriceInputs(){
  document.querySelectorAll("#priceTable tbody tr:not(.total):not(.gst) .price").forEach(td=> td.oninput = recalcTotal);
}

/* ---------- rows ---------- */
function delRow(btn){ btn.closest("tr").remove(); recalcTotal(); }

/* add a blank row right BELOW the clicked row (works for any table) */
function addRowBelow(btn){
  const tr = btn.closest("tr");
  const clone = tr.cloneNode(true);
  clone.querySelectorAll('[contenteditable="true"]').forEach(c=>{ c.innerHTML = ""; });
  tr.parentNode.insertBefore(clone, tr.nextSibling);
  bindPriceInputs(); recalcTotal();
  const first = clone.querySelector('[contenteditable="true"]');
  if(first) first.focus();
}
function addPriceRow(){
  const totalRow = document.getElementById("totalRow");
  const tr = document.createElement("tr");
  tr.innerHTML = `<td contenteditable="true">New item</td>
    <td class="amt price" contenteditable="true">0/-</td>
    <td class="no-print act"><button class="del" onclick="delRow(this)">✕</button></td>`;
  totalRow.parentNode.insertBefore(tr, totalRow);
  bindPriceInputs(); tr.querySelector("td").focus(); recalcTotal();
}

/* ---------- page 5: add tech-spec row ---------- */
function addTechRow(){
  const tb = document.querySelector("#techTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `<td contenteditable="true">New label</td>
    <td contenteditable="true">New value</td>
    <td class="no-print act"><button class="del" onclick="delRow(this)">✕</button></td>`;
  tb.appendChild(tr); tr.querySelector("td").focus();
}

/* ---------- page 7: add elements row ---------- */
function addElemRow(){
  const tb = document.querySelector("#elemTable tbody");
  const tr = document.createElement("tr");
  tr.innerHTML = `<td contenteditable="true">New element</td>
    <td contenteditable="true">1</td>
    <td class="no-print act"><button class="del" onclick="delRow(this)">✕</button></td>`;
  tb.appendChild(tr); tr.querySelector("td").focus();
}

/* ---------- image slots (click-to-replace) ---------- */
let slotImg = null;
function replaceImg(btn){
  const slot = btn.parentElement;
  slotImg = slot.querySelector("img");
  if(!slotImg){ slotImg = document.createElement("img"); slot.insertBefore(slotImg, btn); } // empty photo-slot
  imgPickCb = null;   // ensure the unified handler treats this as a slot replace
  document.getElementById("imgInput").click();
}
/* (the #imgInput change handler is defined once, in the custom-pages section below) */

/* ---------- save / load (all editable pages) ---------- */
function collect(){
  const data = {};
  document.querySelectorAll(".epage").forEach(ep=> data[ep.dataset.ep] = ep.innerHTML);
  return data;
}
function apply(data){
  document.querySelectorAll(".epage").forEach(ep=>{ if(data[ep.dataset.ep] != null) ep.innerHTML = data[ep.dataset.ep]; });
  bindPriceInputs(); recalcTotal();
}
function saveLocal(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(collect())); flash("Saved ✓"); }
function loadLocal(){
  const d = localStorage.getItem(STORAGE_KEY);
  if(!d){ flash("Nothing saved yet"); return; }
  apply(JSON.parse(d)); flash("Loaded ✓");
}

/* ---------- export / import ---------- */
function exportJSON(){
  const blob = new Blob([JSON.stringify(collect(),null,2)], {type:"application/json"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "aquasoft_brochure.json"; a.click();
}
function importJSON(){ document.getElementById("jsonInput").click(); }
document.getElementById("jsonInput").addEventListener("change", e=>{
  const f = e.target.files[0]; if(!f) return;
  const r = new FileReader();
  r.onload = ev=>{ try{ apply(JSON.parse(ev.target.result)); flash("Imported ✓"); }catch(err){ flash("Invalid JSON"); } };
  r.readAsText(f); e.target.value = "";
});

/* ---------- PDF (browser print) ---------- */
function downloadPDF(){
  showLoader("Preparing print…");
  setTimeout(() => {
    try { window.print(); }      // blocking in Chrome/Edge: returns after dialog closes
    finally { hideLoader(); }
  }, 80);
}
window.addEventListener("afterprint", hideLoader);   // safety net for non-blocking browsers

/* ---------- toast ---------- */
function flash(msg){
  let t = document.getElementById("toast");
  if(!t){ t = document.createElement("div"); t.id="toast";
    t.style.cssText="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#2f8fd0;color:#fff;padding:10px 18px;border-radius:8px;z-index:99;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.3)";
    document.body.appendChild(t); }
  t.textContent = msg; t.style.display="block";
  clearTimeout(t._timer); t._timer = setTimeout(()=>t.style.display="none",1800);
}

/* ---------- toast-style confirm modal ---------- */
function toastConfirm(msg){
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);";
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:14px;padding:28px 32px;min-width:320px;max-width:420px;box-shadow:0 12px 44px rgba(0,0,0,.4);text-align:center;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="font-size:15px;color:#1a1a1a;line-height:1.5;margin-bottom:20px;">${msg}</div>
        <div style="display:flex;gap:10px;justify-content:center;">
          <button id="tc-cancel" style="border:1px solid #ccc;background:#fff;color:#555;padding:8px 24px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">Cancel</button>
          <button id="tc-ok" style="border:none;background:#2f8fd0;color:#fff;padding:8px 24px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;">OK</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#tc-ok").onclick = () => { overlay.remove(); resolve(true); };
    overlay.querySelector("#tc-cancel").onclick = () => { overlay.remove(); resolve(false); };
  });
}

/* ============================================================
   CUSTOM CONTENT PAGES — block editor
   (vanilla JS, event delegation, undo/redo, PDF-safe)
   ============================================================ */

/* ---- small DOM helpers ---- */
function htmlToNode(html){ const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function focusFirstEditable(node){ const e = node.querySelector('[contenteditable="true"]'); if(e){ e.focus(); } }

let customSeq = 0;          // unique id counter for custom pages
let activeContent = null;   // last focused .custom-content
let pagesWrap = null;       // container that holds every .page

/* ---- project / autosave state ---- */
const PROJECT_VERSION = 1;
const AUTOSAVE_KEY = "aqsAutoSave_v1";
let projectCreatedAt = new Date().toISOString();
let dirty = false;          // unsaved-changes flag for auto-save

/* ---- wrap all pages in one container (needed for undo/redo + insertion) ---- */
function initPagesWrap(){
  pagesWrap = document.getElementById("pagesWrap");
  if(pagesWrap) return;
  pagesWrap = document.createElement("div");
  pagesWrap.id = "pagesWrap";
  const first = document.querySelector(".page");
  first.parentNode.insertBefore(pagesWrap, first);
  document.querySelectorAll("body > .page").forEach(p => pagesWrap.appendChild(p));
}

/* ---- per-page Add / Remove controls (on every page) ---- */
function pageToolsHTML(){
  return `<div class="page-tools no-print">
    <button class="add-pg" data-action="add-page">➕ Add Page</button>
    <button class="rm-pg" data-action="remove-page">🗑 Remove Page</button>
  </div>`;
}
function ensurePageTools(){
  pagesWrap.querySelectorAll(":scope > .page").forEach(p => {
    if(!p.querySelector(":scope > .page-tools")) p.insertAdjacentHTML("beforeend", pageToolsHTML());
  });
}

/* ---- block factory ---- */
function blockShell(type, body){
  return `<div class="block" data-type="${type}">
    <div class="block-tools no-print">
      <button data-action="b-up" title="Move up">↑</button>
      <button data-action="b-down" title="Move down">↓</button>
      <button data-action="b-dup" title="Duplicate">⧉</button>
      <button data-action="b-del" title="Delete">🗑</button>
    </div>
    <div class="block-body">${body}</div>
  </div>`;
}
function tableMarkup(rows, cols){
  let b = "";
  for(let r=0;r<rows;r++){ b+="<tr>"; for(let c=0;c<cols;c++){ b+=`<td contenteditable="true">${r===0?"Header":"Cell"}</td>`; } b+="</tr>"; }
  return `<table class="ctable"><tbody>${b}</tbody></table>
    <div class="table-ctl no-print">
      <button data-action="t-addrow">+ Row</button><button data-action="t-addcol">+ Col</button>
      <button data-action="t-delrow">– Row</button><button data-action="t-delcol">– Col</button>
    </div>`;
}
/* one editable text row (with hover delete) inside an image+text layout */
function layoutRowHTML(text){
  return `<div class="layout-row">`+
    `<div class="lr-text" contenteditable="true">${text || "New text"}</div>`+
    `<button class="lr-del no-print" contenteditable="false" data-action="layout-delrow" title="Delete this text">✕</button>`+
  `</div>`;
}
/* 8 resize handles (4 corners + 4 edges) for an image box */
function resizeHandlesHTML(){
  return ["nw","n","ne","e","se","s","sw","w"]
    .map(d => `<span class="img-resize no-print rh-${d}" data-action="img-resize" data-dir="${d}"></span>`)
    .join("");
}
/* image + text block (image on one side, a column of text rows on the other) */
function imgTextBlock(side){
  const img =
    `<div class="cimg layout-img" style="width:42%" draggable="true">`+
      `<div class="cimg-placeholder no-print" data-action="img-pick">🖼️ Upload Image</div>`+
      resizeHandlesHTML()+
    `</div>`;
  const textCol =
    `<div class="layout-text-col">`+
      layoutRowHTML("Type text here. Add more rows with “＋ Add Text”, resize the image from its corner.")+
      `<button class="layout-addrow no-print" data-action="layout-addrow">＋ Add Text</button>`+
    `</div>`;
  /* markup is always image + text; CSS flips the side for "right" */
  return blockShell("img-" + side, `<div class="img-text-layout layout-${side}">${img}${textCol}</div>`);
}
/* image in the MIDDLE with text columns on BOTH sides (each: multiple rows) */
function imgBothBlock(){
  const textCol = (cls) =>
    `<div class="layout-text-col ${cls}">`+
      layoutRowHTML("Text here. Use “＋ Add Text” for more rows.")+
      `<button class="layout-addrow no-print" data-action="layout-addrow">＋ Add Text</button>`+
    `</div>`;
  const img =
    `<div class="cimg layout-img" style="width:34%" draggable="true">`+
      `<div class="cimg-placeholder no-print" data-action="img-pick">🖼️ Upload Image</div>`+
      resizeHandlesHTML()+
    `</div>`;
  return blockShell("img-both", `<div class="img-text-layout layout-both">${textCol("side-left")}${img}${textCol("side-right")}</div>`);
}

function blockHTML(type, text){
  switch(type){
    case "heading":   return blockShell("heading",   `<h2 contenteditable="true">${text || "Heading"}</h2>`);
    case "paragraph": return blockShell("paragraph", `<p contenteditable="true">${text || "Type your text here…"}</p>`);
    case "list":      return blockShell("list",      `<ul contenteditable="true"><li>First item</li><li>Second item</li></ul>`);
    case "cols2":     return blockShell("cols2",     `<div class="cols cols-2"><div class="col" contenteditable="true">Column 1</div><div class="col" contenteditable="true">Column 2</div></div>`);
    case "cols3":     return blockShell("cols3",     `<div class="cols cols-3"><div class="col" contenteditable="true">Column 1</div><div class="col" contenteditable="true">Column 2</div><div class="col" contenteditable="true">Column 3</div></div>`);
    case "image":     return blockShell("image",     `<div class="cimg align-center" style="width:55%" draggable="true"><div class="cimg-placeholder no-print" data-action="img-pick">🖼️ Click to upload image</div>${resizeHandlesHTML()}</div><div class="img-dropzones no-print"><div class="dropzone" data-align="left">◧ Left</div><div class="dropzone active" data-align="center">▣ Center</div><div class="dropzone" data-align="right">Right ◨</div></div>`);
    case "img-left":  return imgTextBlock("left");
    case "img-right": return imgTextBlock("right");
    case "img-both":  return imgBothBlock();
    case "table":     return blockShell("table",     tableMarkup(3,3));
    default: return "";
  }
}

/* ---- custom page factory ---- */
function createCustomPage(){
  const p = document.createElement("div");
  p.className = "page custom-page";
  p.innerHTML =
    `<img src="assets/image4.png" class="wave-top" alt="">` +
    `<img src="assets/image2.png" class="logo" alt="">` +
    `<img src="assets/image3.png" class="wave-bottom" alt="">` +
    `<div class="custom-content epage" data-ep="custom-${++customSeq}">` +
      blockHTML("heading", "Custom Page Title") +
      blockHTML("paragraph", "Click to edit. Use the toolbar at the top to add headings, images, tables and more.") +
    `</div>` +
    pageToolsHTML();
  return p;
}

/* ---- active content resolver ---- */
function getActiveContent(){
  if(activeContent && document.body.contains(activeContent)) return activeContent;
  const all = pagesWrap.querySelectorAll(".custom-content");
  return all.length ? all[all.length-1] : null;
}
function currentBlock(content){
  const sel = window.getSelection();
  if(sel && sel.rangeCount){
    let n = sel.anchorNode; n = (n && n.nodeType===3) ? n.parentElement : n;
    const b = n && n.closest ? n.closest(".block") : null;
    if(b && content.contains(b)) return b;
  }
  return null;
}

/* ---- insert a block (after current, else append) ---- */
function insertBlock(type){
  const content = getActiveContent();
  if(!content){ flash("Add a Custom Page first (➕ Custom Page)"); return; }
  const node = htmlToNode(blockHTML(type));
  const cur = currentBlock(content);
  if(cur) cur.after(node); else content.appendChild(node);
  focusFirstEditable(node);
  History.snapshot();
}

/* ---- block operations ---- */
function moveBlock(block, dir){
  if(!block) return;
  if(dir < 0){ const prev = block.previousElementSibling; if(prev && prev.classList.contains("block")) block.parentNode.insertBefore(block, prev); }
  else        { const next = block.nextElementSibling;     if(next && next.classList.contains("block")) block.parentNode.insertBefore(next, block); }
  History.snapshot();
}
function dupBlock(block){ if(!block) return; const c = block.cloneNode(true); block.after(c); History.snapshot(); }
function delBlock(block){ if(!block) return; const content = block.closest(".custom-content"); block.remove();
  if(content && !content.querySelector(".block")) content.appendChild(htmlToNode(blockHTML("paragraph")));
  History.snapshot(); }

/* ---- table operations ---- */
function tableOf(btn){ return btn.closest(".block").querySelector(".ctable"); }
function tableAddRow(btn){ const t = tableOf(btn); const cols = t.rows[0].cells.length; const tr = t.insertRow(-1);
  for(let i=0;i<cols;i++){ const td = tr.insertCell(-1); td.contentEditable = "true"; td.textContent = "Cell"; } History.snapshot(); }
function tableAddCol(btn){ const t = tableOf(btn); for(const row of t.rows){ const td = row.insertCell(-1); td.contentEditable = "true"; td.textContent = "Cell"; } History.snapshot(); }
function tableDelRow(btn){ const t = tableOf(btn); if(t.rows.length > 1) t.deleteRow(-1); History.snapshot(); }
function tableDelCol(btn){ const t = tableOf(btn); if(t.rows[0].cells.length > 1){ for(const row of t.rows) row.deleteCell(-1); } History.snapshot(); }

/* ---- image+text layout: text rows ---- */
function layoutAddRow(btn){
  const col = btn.closest(".layout-text-col");
  const row = htmlToNode(layoutRowHTML("New text"));
  col.insertBefore(row, btn);          // add above the "+ Add Text" button
  focusFirstEditable(row);
  History.snapshot();
}
function layoutDelRow(btn){
  const row = btn.closest(".layout-row");
  const col = row && row.closest(".layout-text-col");
  if(col && col.querySelectorAll(".layout-row").length > 1){ row.remove(); History.snapshot(); }
  else flash("At least one text row is required");
}

/* remove a page-6 icon (callout <i> icon, or bullet ::before star) */
function removeIcon(btn){
  const callout = btn.closest(".callout");
  const li = btn.closest("li");
  if(callout){ const ic = callout.querySelector("i"); if(ic) ic.remove(); btn.remove(); }
  else if(li){ li.classList.add("no-bullet"); btn.remove(); }
  History.snapshot();
}

/* ---- images (upload / replace) ---- */
let imgPickCb = null;
function pickImage(cb){ imgPickCb = cb; document.getElementById("imgInput").click(); }
function pickImageInto(triggerEl){
  const cimg = triggerEl.closest(".cimg");
  pickImage(data => {
    const ph = cimg.querySelector(".cimg-placeholder"); if(ph) ph.remove();
    let img = cimg.querySelector("img");
    if(!img){ img = document.createElement("img"); cimg.insertBefore(img, cimg.firstChild); }
    img.src = data;
    History.snapshot();
  });
}
/* unified image input: serves both fixed-page slots and custom image blocks */
document.getElementById("imgInput").addEventListener("change", e => {
  const f = e.target.files[0]; e.target.value = "";
  if(!f) return;
  const r = new FileReader();
  r.onload = ev => {
    const data = ev.target.result;
    if(imgPickCb){ const cb = imgPickCb; imgPickCb = null; cb(data); }
    else if(slotImg){ slotImg.src = data; }
  };
  r.readAsDataURL(f);
});

/* ---- page management ---- */
function addPageAfter(pageEl){
  if(!pageEl) return;
  const np = createCustomPage();
  pageEl.after(np);
  activeContent = np.querySelector(".custom-content");
  np.scrollIntoView({ behavior:"smooth", block:"center" });
  History.snapshot();
}
function addCustomPageEnd(){
  const pages = pagesWrap.querySelectorAll(":scope > .page");
  addPageAfter(pages[pages.length-1]);
}
async function removePage(pageEl){
  const pages = pagesWrap.querySelectorAll(":scope > .page");
  if(pages.length <= 1){ flash("Cannot delete the last page"); return; }
  const ok = await toastConfirm("Remove this page? (You can press Undo ↶ to bring it back.)");
  if(!ok) return;
  pageEl.remove();
  History.snapshot();
}

/* ---- text formatting (uses current selection) ---- */
const FMT = { "fmt-bold":"bold", "fmt-italic":"italic", "fmt-underline":"underline",
              "align-left":"justifyLeft", "align-center":"justifyCenter", "align-right":"justifyRight" };
function applyFormat(cmd){ document.execCommand(cmd, false, null); History.snapshot(); }

/* increase / decrease text size — works on a selection, else on the focused text block */
function adjustFontSize(delta){
  const sel = window.getSelection();
  if(sel && sel.rangeCount && !sel.isCollapsed){
    const range = sel.getRangeAt(0);
    const refEl = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    const cur = parseFloat(getComputedStyle(refEl).fontSize) || 16;
    const span = document.createElement("span");
    span.style.fontSize = Math.max(8, Math.min(96, cur + delta)) + "px";
    try{
      span.appendChild(range.extractContents());
      range.insertNode(span);
      sel.removeAllRanges();
      const nr = document.createRange(); nr.selectNodeContents(span); sel.addRange(nr);  // keep selection for repeat clicks
      History.snapshot();
    }catch(e){}
    return;
  }
  /* no selection -> resize the whole editable element under the cursor */
  let el = document.activeElement;
  el = (el && el.closest) ? el.closest('[contenteditable="true"]') : null;
  if(!el && activeContent) el = activeContent.querySelector('[contenteditable="true"]');
  if(el){
    const cur = parseFloat(getComputedStyle(el).fontSize) || 16;
    el.style.fontSize = Math.max(8, Math.min(96, cur + delta)) + "px";
    History.snapshot();
  }else{
    flash("Select some text (or click inside a text block) first");
  }
}

/* ============================================================
   UNDO / REDO  (snapshot the pages container)
   ============================================================ */
const History = {
  stack: [], idx: -1, limit: 50, locked: false,
  snapshot(){
    if(this.locked || !pagesWrap) return;
    const html = pagesWrap.innerHTML;
    if(this.stack[this.idx] === html) return;        // no change
    this.stack = this.stack.slice(0, this.idx + 1);  // drop redo tail
    this.stack.push(html);
    if(this.stack.length > this.limit) this.stack.shift();
    this.idx = this.stack.length - 1;
    dirty = true;                                    // mark for auto-save
  },
  reset(){ this.stack = []; this.idx = -1; this.snapshot(); },
  undo(){ if(this.idx > 0){ this.idx--; this.restore(); } },
  redo(){ if(this.idx < this.stack.length - 1){ this.idx++; this.restore(); } },
  restore(){
    this.locked = true;
    pagesWrap.innerHTML = this.stack[this.idx];
    this.locked = false;
    activeContent = null;
    bindPriceInputs(); recalcTotal();   // keep existing price page working
  }
};

/* ============================================================
   EVENT DELEGATION  (single listeners for everything)
   ============================================================ */
/* track which custom content is being edited */
document.addEventListener("focusin", e => {
  const c = e.target.closest(".custom-content");
  if(c) activeContent = c;
});

/* keep text selection when clicking the floating toolbar */
document.addEventListener("mousedown", e => {
  if(e.target.closest(".float-toolbar")) e.preventDefault();
});

/* image resize from any handle — corners + edges (top/bottom/left/right) */
document.addEventListener("mousedown", e => {
  const handle = e.target.closest(".img-resize");
  if(!handle) return;
  e.preventDefault(); e.stopPropagation();
  const dir  = handle.dataset.dir || "se";
  const cimg = handle.closest(".cimg");
  const ref  = cimg.parentElement;                 // width % is relative to the immediate container
  const area = cimg.closest(".custom-content") || cimg.closest(".imported-overlay") || ref;
  const img  = cimg.querySelector("img");
  const startX = e.clientX, startY = e.clientY;
  const startW = cimg.offsetWidth;
  const refW   = (ref && ref.clientWidth) || (area && area.clientWidth) || startW;
  const startH = img ? img.offsetHeight : cimg.offsetHeight;
  const sx = dir.includes("e") ? 1 : (dir.includes("w") ? -1 : 0);  // width: +right edge, -left edge
  const sy = dir.includes("s") ? 1 : (dir.includes("n") ? -1 : 0);  // height: +bottom edge, -top edge
  function move(ev){
    if(sx !== 0){
      const w = startW + sx * (ev.clientX - startX);
      const pct = Math.max(12, Math.min(100, (w / refW) * 100));
      cimg.style.width = pct.toFixed(1) + "%";
    }
    if(sy !== 0 && img){
      const h = startH + sy * (ev.clientY - startY);
      img.style.height = Math.max(40, h) + "px";
      img.style.width = "100%";
      img.style.objectFit = "contain";   // keep image undistorted inside the new box
    }
  }
  function up(){ document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); History.snapshot(); }
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
});

/* ---- drag-and-drop image alignment ---- */
let draggedCimg = null;
let dragClone = null;
let dropzones = [];

document.addEventListener("dragstart", e => {
  if(e.target.closest(".img-resize")){ e.preventDefault(); return; }  // grabbing the resize handle must NOT start a move-drag
  const cimg = e.target.closest(".cimg[draggable]");
  if(!cimg) return;
  draggedCimg = cimg;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", "");
  /* create a visual clone for the drag image */
  dragClone = cimg.cloneNode(true);
  dragClone.classList.add("drag-clone");
  dragClone.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:120px;opacity:0.85;z-index:9999;pointer-events:none;border:3px solid #2f8fd0;border-radius:6px;";
  document.body.appendChild(dragClone);
  e.dataTransfer.setDragImage(dragClone, 60, 40);
  /* show dropzones */
  const block = cimg.closest(".block");
  if(block){
    block.classList.add("dragging-block");
    dropzones = Array.from(block.querySelectorAll(".dropzone"));
    dropzones.forEach(dz => dz.classList.add("visible"));
  }
  cimg.classList.add("dragging");
});

document.addEventListener("dragend", e => {
  if(dragClone){ dragClone.remove(); dragClone = null; }
  if(draggedCimg){
    draggedCimg.classList.remove("dragging");
    const block = draggedCimg.closest(".block");
    if(block){
      block.classList.remove("dragging-block");
      dropzones.forEach(dz => { dz.classList.remove("visible"); dz.classList.remove("drag-over"); });
    }
  }
  dropzones = [];
  draggedCimg = null;
});

document.addEventListener("dragover", e => {
  const dz = e.target.closest(".dropzone");
  if(!dz || !draggedCimg) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  dropzones.forEach(d => d.classList.remove("drag-over"));
  dz.classList.add("drag-over");
});

document.addEventListener("dragleave", e => {
  const dz = e.target.closest(".dropzone");
  if(dz) dz.classList.remove("drag-over");
});

document.addEventListener("drop", e => {
  const dz = e.target.closest(".dropzone");
  if(!dz || !draggedCimg) return;
  e.preventDefault();
  const align = dz.dataset.align;
  draggedCimg.classList.remove("align-left","align-center","align-right");
  draggedCimg.classList.add("align-" + align);
  dz.parentElement.querySelectorAll(".dropzone").forEach(d => d.classList.remove("active"));
  dz.classList.add("active");
  History.snapshot();
  dropzones.forEach(d => { d.classList.remove("drag-over"); });
});

/* master click handler */
document.addEventListener("click", e => {
  /* click an existing custom image -> replace it */
  if(e.target.matches(".cimg img")){ pickImageInto(e.target); return; }

  /* alignment buttons (Left / Center / Right) — click to align */
  const dz = e.target.closest(".dropzone");
  if(dz){
    const blk = dz.closest(".block");
    const cimg = blk && blk.querySelector(".cimg");
    if(cimg){
      cimg.classList.remove("align-left","align-center","align-right");
      cimg.classList.add("align-" + dz.dataset.align);
      dz.parentElement.querySelectorAll(".dropzone").forEach(d => d.classList.remove("active"));
      dz.classList.add("active");
      History.snapshot();
    }
    return;
  }

  const btn = e.target.closest("[data-action]");
  if(!btn) return;
  const action = btn.dataset.action;
  const block = btn.closest(".block");

  /* text formatting */
  if(FMT[action]){ applyFormat(FMT[action]); return; }
  if(action === "font-bigger"){ adjustFontSize(2); return; }
  if(action === "font-smaller"){ adjustFontSize(-2); return; }

  switch(action){
    /* insert blocks */
    case "ins-heading":   insertBlock("heading");   break;
    case "ins-paragraph": insertBlock("paragraph"); break;
    case "ins-image":     insertBlock("image");     break;
    case "ins-img-left":  insertBlock("img-left");  break;
    case "ins-img-right": insertBlock("img-right"); break;
    case "ins-img-both":  insertBlock("img-both");  break;
    case "ins-list":      insertBlock("list");      break;
    case "ins-cols2":     insertBlock("cols2");     break;
    case "ins-cols3":     insertBlock("cols3");     break;
    case "ins-table":     insertBlock("table");     break;
    /* block tools */
    case "b-up":   moveBlock(block, -1); break;
    case "b-down": moveBlock(block,  1); break;
    case "b-dup":  dupBlock(block);      break;
    case "b-del":  delBlock(block);      break;
    /* image */
    case "img-pick": pickImageInto(btn); break;
    case "rm-ico":   removeIcon(btn);    break;
    case "img-resize": break; /* handled by mousedown listener */
    case "imp-replace-bg": { const im = btn.closest(".page").querySelector("img.full"); if(im){ slotImg = im; imgPickCb = null; document.getElementById("imgInput").click(); } break; }
    /* image + text layout rows */
    case "layout-addrow": layoutAddRow(btn); break;
    case "layout-delrow": layoutDelRow(btn); break;
    /* table */
    case "t-addrow": tableAddRow(btn); break;
    case "t-addcol": tableAddCol(btn); break;
    case "t-delrow": tableDelRow(btn); break;
    case "t-delcol": tableDelCol(btn); break;
    /* page management */
    case "add-page":    addPageAfter(btn.closest(".page")); break;
    case "remove-page": removePage(btn.closest(".page"));   break;
    /* history */
    case "undo": History.undo(); break;
    case "redo": History.redo(); break;
  }
});

/* snapshot on typing (debounced) */
let _typeTimer = null;
document.addEventListener("input", e => {
  if(e.target.closest(".epage")){            // any editable page (custom + brochure pages 1–8)
    clearTimeout(_typeTimer);
    _typeTimer = setTimeout(() => History.snapshot(), 700);
  }
});

/* keyboard shortcuts: Ctrl/Cmd+Z / Shift+Z */
document.addEventListener("keydown", e => {
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z"){
    e.preventDefault();
    if(e.shiftKey) History.redo(); else History.undo();
  }
});

/* ============================================================
   PROJECT FILES  (Save Project / Open Project)  — .aqs / .json
   ============================================================ */
/* ---- loading overlay ---- */
function showLoader(msg){
  const l = document.getElementById("loader"), m = document.getElementById("loaderMsg");
  if(m) m.textContent = msg || "Working…";
  if(l) l.classList.add("show");
}
function hideLoader(){ const l = document.getElementById("loader"); if(l) l.classList.remove("show"); }

function download(text, filename, mime){
  const blob = new Blob([text], { type: mime || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/* full editor state -> portable object (pages, custom pages, text, tables,
   prices, totals, base64 images, layout, page order, blocks) */
function buildProject(){
  return {
    format: "aqs-brochure",
    projectVersion: PROJECT_VERSION,
    createdAt: projectCreatedAt,
    updatedAt: new Date().toISOString(),
    title: "Aqua Soft 1000 LPH Brochure",
    pageCount: pagesWrap.querySelectorAll(":scope > .page").length,
    html: pagesWrap.innerHTML
  };
}
function saveProject(){
  showLoader("Saving project…");
  setTimeout(() => {
    try{
      const data = buildProject();
      const stamp = new Date().toISOString().slice(0, 10);
      download(JSON.stringify(data), "AquaSoft_Brochure_" + stamp + ".aqs", "application/json");
      flash("Project saved ✓");
    }catch(err){ flash("Could not save project"); }
    finally{ hideLoader(); }
  }, 30);
}
function openProject(){ document.getElementById("projInput").click(); }
function getMaxCustomSeq(){
  let m = 0;
  pagesWrap.querySelectorAll('[data-ep^="custom-"],[data-ep^="imp-"]').forEach(el => {
    const n = parseInt((el.dataset.ep.split("-")[1]) || "0", 10); if(n > m) m = n;
  });
  return m;
}
function applyProject(data){
  if(!data || typeof data.html !== "string"){ flash("Invalid project file"); return; }
  pagesWrap.innerHTML = data.html;
  projectCreatedAt = data.createdAt || new Date().toISOString();
  customSeq = Math.max(customSeq, getMaxCustomSeq());   // avoid id collisions
  ensurePageTools(); bindPriceInputs(); recalcTotal();
  activeContent = null;
  History.reset();
  flash("Project opened ✓");
}
document.getElementById("projInput").addEventListener("change", e => {
  const f = e.target.files[0]; e.target.value = ""; if(!f) return;
  if(/\.pdf$/i.test(f.name) || f.type === "application/pdf"){ openFromPDF(f); return; }
  const r = new FileReader();
  r.onload = ev => {
    showLoader("Opening project…");
    setTimeout(() => {
      try { applyProject(JSON.parse(ev.target.result)); }
      catch(err){ flash("Could not read project file"); }
      finally{ hideLoader(); }
    }, 30);
  };
  r.readAsText(f);
});

/* ============================================================
   EDITABLE PDF  — single .pdf that is both printable AND re-openable
   (pages rasterised with html2canvas, assembled with jsPDF,
    project JSON appended after %%EOF and read back on import)
   ============================================================ */
const AQS_MARKER = "%%AQS-PROJECT%%";

function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function exportEditablePDF(){
  if(!window.html2canvas || !window.jspdf){ flash("PDF engine still loading — try again"); return; }
  showLoader("Building PDF… this can take a few seconds");
  document.body.classList.add("exporting");
  await new Promise(r => setTimeout(r, 60));   // let the loader paint first
  try{
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const W = 595.28, H = 841.89;
    const pages = Array.from(pagesWrap.querySelectorAll(":scope > .page"));
    for(let i = 0; i < pages.length; i++){
      const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
      const img = canvas.toDataURL("image/jpeg", 0.92);
      if(i > 0) doc.addPage();
      doc.addImage(img, "JPEG", 0, 0, W, H);
    }
    let bytes = new Uint8Array(doc.output("arraybuffer"));
    /* append the editable project data after the PDF's %%EOF */
    const payload = new TextEncoder().encode("\n" + AQS_MARKER + "\n" + JSON.stringify(buildProject()));
    const full = new Uint8Array(bytes.length + payload.length);
    full.set(bytes, 0); full.set(payload, bytes.length);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadBlob(new Blob([full], { type: "application/pdf" }), "AquaSoft_Brochure_" + stamp + ".pdf");
    flash("PDF saved ✓ (re-openable via Open Project)");
  }catch(err){ flash("Could not build PDF"); }
  finally{ document.body.classList.remove("exporting"); hideLoader(); }
}

/* find a byte sequence inside a Uint8Array (search from the end) */
function indexOfBytes(hay, needleStr){
  const needle = new TextEncoder().encode(needleStr);
  outer: for(let i = hay.length - needle.length; i >= 0; i--){
    for(let j = 0; j < needle.length; j++){ if(hay[i + j] !== needle[j]){ continue outer; } }
    return i;
  }
  return -1;
}

/* open a PDF: if it carries embedded project data -> exact restore,
   else fall back to the visual reconstruction importer */
async function openFromPDF(file){
  showLoader("Opening PDF…");
  try{
    const bytes = new Uint8Array(await file.arrayBuffer());
    const at = indexOfBytes(bytes, AQS_MARKER);
    if(at >= 0){
      const jsonStr = new TextDecoder("utf-8").decode(bytes.slice(at + AQS_MARKER.length)).trim();
      try{ applyProject(JSON.parse(jsonStr)); flash("Project restored from PDF ✓"); hideLoader(); return; }
      catch(e){ /* fall through to visual */ }
    }
    hideLoader();
    flash("No editable data found in PDF — importing pages as images");
    await importPDF(file);   // manages its own loader
  }catch(err){ flash("Could not open PDF"); hideLoader(); }
}

/* ============================================================
   AUTO-SAVE  (localStorage every 5s) + restore on reload
   ============================================================ */
function autoSave(){
  if(!dirty) return;
  try{ localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(buildProject())); dirty = false; }
  catch(err){ /* storage full — silently skip; user can use Save Project */ }
}

/* start a fresh document and clear the restored/auto-saved session */
async function newProject(){
  const ok = await toastConfirm("Start a fresh document?<br><br>This clears the auto-saved session. Anything not saved with \"Save Project\" or \"Editable PDF\" will be lost.");
  if(!ok) return;
  try{ localStorage.removeItem(AUTOSAVE_KEY); }catch(e){}
  location.reload();
}
function restoreAutoSave(){
  let s; try{ s = localStorage.getItem(AUTOSAVE_KEY); }catch(e){ return; }
  if(!s) return;
  try{
    const d = JSON.parse(s);
    if(d && typeof d.html === "string"){
      pagesWrap.innerHTML = d.html;
      projectCreatedAt = d.createdAt || projectCreatedAt;
      customSeq = Math.max(customSeq, getMaxCustomSeq());
      ensurePageTools(); bindPriceInputs(); recalcTotal();
      flash("↩ Restored your last session");
    }
  }catch(e){}
}

/* ============================================================
   IMPORT PDF  (experimental — visual reconstruction only)
   each PDF page -> image -> editor page with editable overlay
   ============================================================ */
function setupPdfWorker(){
  if(window.pdfjsLib){
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }
}
function createImportedPage(dataURL){
  const p = document.createElement("div");
  p.className = "page imported-page";
  p.innerHTML =
    `<img class="full" src="${dataURL}" alt="">` +
    `<button class="slot-btn imp-bg-btn no-print" data-action="imp-replace-bg"><i class="fa-solid fa-image"></i> Replace</button>` +
    `<div class="custom-content epage imported-overlay" data-ep="imp-${++customSeq}"></div>` +
    pageToolsHTML();
  return p;
}
async function importPDF(file){
  if(!window.pdfjsLib){ flash("PDF engine still loading — try again in a moment"); return; }
  showLoader("Importing PDF…");
  await new Promise(r => setTimeout(r, 60));
  try{
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    for(let i = 1; i <= pdf.numPages; i++){
      showLoader("Importing PDF… page " + i + " / " + pdf.numPages);
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      const dataURL = canvas.toDataURL("image/jpeg", 0.85);
      pagesWrap.appendChild(createImportedPage(dataURL));
    }
    ensurePageTools();
    History.snapshot();
    flash("PDF imported ✓ (" + pdf.numPages + " pages) — add text/images on top");
  }catch(err){ flash("Could not import PDF"); }
  finally{ hideLoader(); }
}
document.getElementById("pdfInput").addEventListener("change", e => {
  const f = e.target.files[0]; e.target.value = ""; if(f) importPDF(f);
});

/* ---------- init ---------- */
bindPriceInputs();
recalcTotal();
initPagesWrap();
ensurePageTools();
setupPdfWorker();
restoreAutoSave();              // bring back unsaved work, if any
History.reset();               // fresh undo history at the current state
setInterval(autoSave, 5000);   // auto-save every 5 seconds
