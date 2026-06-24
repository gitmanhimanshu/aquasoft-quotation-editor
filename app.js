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
  document.getElementById("imgInput").click();
}
document.getElementById("imgInput").addEventListener("change", e=>{
  const f = e.target.files[0]; if(!f || !slotImg) return;
  const r = new FileReader();
  r.onload = ev=>{ slotImg.src = ev.target.result; };
  r.readAsDataURL(f); e.target.value = "";
});

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

/* ---------- init ---------- */
bindPriceInputs();
recalcTotal();
