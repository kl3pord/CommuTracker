
// Utility DB (localStorage)
const DBKEY='ct_pinterest_v1_updated';
function loadDB(){ try{ return JSON.parse(localStorage.getItem(DBKEY)) || {drivers:[], subscribers:[], stats:{queued:0}};}catch(e){return {drivers:[], subscribers:[], stats:{queued:0}};} }
function saveDB(db){ localStorage.setItem(DBKEY, JSON.stringify(db)); }

// Loading screen hide
window.addEventListener('load', ()=>{
  setTimeout(()=>{
    const el=document.getElementById('loading');
    if(el) el.style.display='none';
  },650);
  renderAll();
});

// Submit driver update
function submitDriver(){
  const plate = document.getElementById('plate').value.trim();
  const route = document.getElementById('route').value.trim();
  const loc = document.getElementById('location').value.trim() || 'Not updated';
  const traffic = document.getElementById('traffic').value;
  const seats = parseInt(document.getElementById('seats').value) || 0;
  if(!plate || !route){ alert('Please fill plate and route'); return; }
  const db = loadDB();
  const now = Date.now();
  const existing = db.drivers.find(d=>d.plate.toLowerCase()===plate.toLowerCase());
  const base = existing ? existing.baseEta : (15 + Math.floor(Math.random()*21));
  const eta = Math.max(3, Math.round(base * (traffic==='Yes'?1.6:1.0)));
  if(existing){
    existing.route=route; existing.loc=loc; existing.traffic=traffic; existing.seats=seats; existing.eta=eta; existing.updatedAt=now;
  } else {
    db.drivers.push({plate,route,loc,traffic,seats,eta,baseEta:base,createdAt:now,updatedAt:now});
  }
  // notify any subscribers to this plate
  db.subscribers.filter(s=>s.plate.toLowerCase()===plate.toLowerCase()).forEach(s=>{
    addToast(`Update from ${plate}: Seats ${seats}, Traffic: ${traffic}, ETA: ${eta}min`);
  });
  saveDB(db);
  clearDriverForm();
  renderAll();
}

// UI helpers
function addToast(text){
  const box=document.createElement('div'); box.className='card'; box.style.borderLeft='4px solid var(--accent)'; box.textContent=text;
  document.body.appendChild(box);
  setTimeout(()=>box.remove(),6000);
}

function clearDriverForm(){
  ['plate','route','location','traffic','seats'].forEach(id=>{ const e=document.getElementById(id); if(e) e.value=''; });
  const msg=document.getElementById('driverMsg'); if(msg) msg.textContent='Saved ✓';
  setTimeout(()=>{ if(msg) msg.textContent=''; },2000);
}

// Render routes in masonry and support search
function renderRoutes(filter=''){
  const db=loadDB();
  const wrap=document.getElementById('routesGrid');
  if(!wrap) return;
  const drivers = db.drivers.filter(d=> d.route.toLowerCase().includes(filter.toLowerCase()) );
  if(drivers.length===0){ wrap.innerHTML='<p style="color:#666">No routes yet. Ask drivers to submit updates.</p>'; return; }
  // build cards
  wrap.innerHTML='';
  drivers.forEach(d=>{
    const card=document.createElement('div'); card.className='route-card';
    const loc = d.loc ?? 'Not updated';
    card.innerHTML = `<h4>${escapeHtml(capitalizeWords(d.route))}</h4>
      <div class="route-meta">${escapeHtml(d.plate)} — ${escapeHtml(loc)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px;color:var(--muted)">Seats: <strong>${d.seats}</strong> · Traffic: <strong>${d.traffic}</strong></div>
        <div style="font-weight:700;color:var(--accent)">${d.eta} min</div>
      </div>`;
    wrap.appendChild(card);
  });
}

// Dashboard stats render
function renderDashboard(){
  const db=loadDB();
  const vehicles = db.drivers.filter(d=>d.seats>0).length;
  const etas = db.drivers.map(d=>d.eta).filter(Boolean);
  const statVehicles = document.getElementById('statVehicles');
  if(statVehicles) statVehicles.textContent = vehicles;
  const statEta = document.getElementById('statEta');
  if(statEta) statEta.textContent = etas.length ? Math.round(etas.reduce((a,b)=>a+b,0)/etas.length) : '—';
  const statQueued = document.getElementById('statQueued');
  if(statQueued) statQueued.textContent = db.stats.queued || 0;
  const routesSummary=document.getElementById('routesSummary'); if(routesSummary){
    routesSummary.innerHTML='';
    const groups = {};
    db.drivers.forEach(d=> groups[d.route]= (groups[d.route]||0)+1 );
    for(const r in groups){
      const el=document.createElement('div'); el.className='card'; el.style.marginBottom='8px'; el.innerHTML=`<div style="display:flex;justify-content:space-between"><div>${escapeHtml(capitalizeWords(r))}</div><div class="small">${groups[r]} jeep(s)</div></div>`;
      routesSummary.appendChild(el);
    }
  }
}

// Utility: escape html
function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function capitalizeWords(s){ return String(s).split(' ').map(w=> w.charAt(0).toUpperCase()+w.slice(1)).join(' '); }

// Fare calc: C: peach scheme - implement new fare rules: first 4.5km 13 reg,11 disc; +1km = +1.25
function calcFare(){
  const km = parseFloat(document.getElementById('fareKm').value);
  if(isNaN(km)||km<0){ alert('Enter valid distance'); return; }
  const baseReg=13, baseDisc=11, per=1.25;
  const extra = Math.max(0, km - 4.5) * per;
  document.getElementById('fareOutput').innerHTML = `<div style="font-weight:800">Regular: ₱${(baseReg+extra).toFixed(2)}</div><div class="small">Discounted (student/senior/PWD): ₱${(baseDisc+extra).toFixed(2)}</div>`;
}

// Generic render call
function renderAll(){
  renderRoutes('');
  renderDashboard();
}

// Search handler
function attachSearch(){
  const s=document.getElementById('routeSearch'); if(!s) return;
  s.addEventListener('input', ()=> renderRoutes(s.value));
}

// On DOM ready attach handlers
document.addEventListener('DOMContentLoaded', ()=>{
  attachSearch();
});
