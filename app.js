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

/* ---------- PDF ---------- */
function downloadPDF(){ window.print(); }

/* ---------- toast ---------- */
function flash(msg){
  let t = document.getElementById("toast");
  if(!t){ t = document.createElement("div"); t.id="toast";
    t.style.cssText="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#2f8fd0;color:#fff;padding:10px 18px;border-radius:8px;z-index:99;font-size:13px;box-shadow:0 4px 16px rgba(0,0,0,.3)";
    document.body.appendChild(t); }
  t.textContent = msg; t.style.display="block";
  clearTimeout(t._timer); t._timer = setTimeout(()=>t.style.display="none",1800);
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
function blockHTML(type, text){
  switch(type){
    case "heading":   return blockShell("heading",   `<h2 contenteditable="true">${text || "Heading"}</h2>`);
    case "paragraph": return blockShell("paragraph", `<p contenteditable="true">${text || "Type your text here…"}</p>`);
    case "list":      return blockShell("list",      `<ul contenteditable="true"><li>First item</li><li>Second item</li></ul>`);
    case "cols2":     return blockShell("cols2",     `<div class="cols cols-2"><div class="col" contenteditable="true">Column 1</div><div class="col" contenteditable="true">Column 2</div></div>`);
    case "cols3":     return blockShell("cols3",     `<div class="cols cols-3"><div class="col" contenteditable="true">Column 1</div><div class="col" contenteditable="true">Column 2</div><div class="col" contenteditable="true">Column 3</div></div>`);
    case "image":     return blockShell("image",     `<div class="cimg" style="width:55%"><div class="cimg-placeholder no-print" data-action="img-pick">🖼️ Click to upload image</div><span class="img-resize no-print" data-action="img-resize"></span></div>`);
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
function removePage(pageEl){
  const pages = pagesWrap.querySelectorAll(":scope > .page");
  if(pages.length <= 1){ flash("Cannot delete the last page"); return; }
  if(!confirm("Remove this page? (You can press Undo ↶ to bring it back.)")) return;
  pageEl.remove();
  History.snapshot();
}

/* ---- text formatting (uses current selection) ---- */
const FMT = { "fmt-bold":"bold", "fmt-italic":"italic", "fmt-underline":"underline",
              "align-left":"justifyLeft", "align-center":"justifyCenter", "align-right":"justifyRight" };
function applyFormat(cmd){ document.execCommand(cmd, false, null); History.snapshot(); }

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

/* image resize via drag handle */
document.addEventListener("mousedown", e => {
  const handle = e.target.closest(".img-resize");
  if(!handle) return;
  e.preventDefault();
  const cimg = handle.closest(".cimg");
  const area = cimg.closest(".custom-content");
  const startX = e.clientX, startW = cimg.offsetWidth, areaW = area.clientWidth;
  function move(ev){
    const w = startW + (ev.clientX - startX);
    const pct = Math.max(15, Math.min(100, (w / areaW) * 100));
    cimg.style.width = pct.toFixed(1) + "%";
  }
  function up(){ document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); History.snapshot(); }
  document.addEventListener("mousemove", move);
  document.addEventListener("mouseup", up);
});

/* master click handler */
document.addEventListener("click", e => {
  /* click an existing custom image -> replace it */
  if(e.target.matches(".cimg img")){ pickImageInto(e.target); return; }

  const btn = e.target.closest("[data-action]");
  if(!btn) return;
  const action = btn.dataset.action;
  const block = btn.closest(".block");

  /* text formatting */
  if(FMT[action]){ applyFormat(FMT[action]); return; }

  switch(action){
    /* insert blocks */
    case "ins-heading":   insertBlock("heading");   break;
    case "ins-paragraph": insertBlock("paragraph"); break;
    case "ins-image":     insertBlock("image");     break;
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
    case "imp-replace-bg": { const im = btn.closest(".page").querySelector("img.full"); if(im){ slotImg = im; imgPickCb = null; document.getElementById("imgInput").click(); } break; }
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
  if(e.target.closest(".custom-content")){
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
  try{
    const data = buildProject();
    const stamp = new Date().toISOString().slice(0, 10);
    download(JSON.stringify(data), "AquaSoft_Brochure_" + stamp + ".aqs", "application/json");
    flash("Project saved ✓");
  }catch(err){ flash("Could not save project"); }
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
  r.onload = ev => { try { applyProject(JSON.parse(ev.target.result)); } catch(err){ flash("Could not read project file"); } };
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
  flash("Building editable PDF… please wait");
  document.body.classList.add("exporting");
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
    flash("Editable PDF saved ✓ (re-openable via Open Project)");
  }catch(err){ flash("Could not build editable PDF"); }
  finally{ document.body.classList.remove("exporting"); }
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
  try{
    const bytes = new Uint8Array(await file.arrayBuffer());
    const at = indexOfBytes(bytes, AQS_MARKER);
    if(at >= 0){
      const jsonStr = new TextDecoder("utf-8").decode(bytes.slice(at + AQS_MARKER.length)).trim();
      try{ applyProject(JSON.parse(jsonStr)); flash("Project restored from PDF ✓"); return; }
      catch(e){ /* fall through to visual */ }
    }
    flash("No editable data found in PDF — importing pages as images");
    importPDF(file);
  }catch(err){ flash("Could not open PDF"); }
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
function newProject(){
  if(!confirm("Start a fresh document?\n\nThis clears the auto-saved session. Anything not saved with “Save Project” or “Editable PDF” will be lost.")) return;
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
  flash("Importing PDF…");
  try{
    const buf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    for(let i = 1; i <= pdf.numPages; i++){
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
