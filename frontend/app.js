/* =====================================================================
   Meter dashboard — front-end application logic.

   Loads after fallback-data.js (which defines FALLBACK_OVERVIEW/TEAMS/ROLES).
   Plain, non-module script on purpose so index.html works opened directly
   over file:// without a dev server or CORS gymnastics.

   Sections: DATA LAYER, FORMATTERS, RENDER, INTERACTIONS.
   ===================================================================== */

/* =====================================================================
   DATA LAYER
   Tries the live Meter API first (see ../backend/); if it's not reachable
   (most common — this file is usually opened standalone) it falls back to
   the snapshot in fallback-data.js, so the UI behaves identically either
   way. The sidebar badge tells you which mode it's in.
   ===================================================================== */
const API_BASE = "http://localhost:8000";

let STATE = { overview: null, teams: null, roles: null, live: false };

async function fetchJSON(path, timeoutMs = 900) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(API_BASE + path, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (e) {
    clearTimeout(t);
    return null;
  }
}

async function loadData() {
  const [ov, tm, rl] = await Promise.all([
    fetchJSON("/api/overview"), fetchJSON("/api/teams"), fetchJSON("/api/roles")
  ]);
  if (ov && tm && rl) {
    STATE = { overview: ov, teams: tm, roles: rl, live: true };
  } else {
    STATE = { overview: FALLBACK_OVERVIEW, teams: FALLBACK_TEAMS, roles: FALLBACK_ROLES, live: false };
  }
  const badge = document.getElementById("sourceBadge");
  if (STATE.live) {
    badge.className = "sb-badge live";
    badge.innerHTML = "<i></i> LIVE · Meter API";
  } else {
    badge.className = "sb-badge demo";
    badge.innerHTML = "<i></i> DEMO DATA · API offline";
  }
  renderAll();
}

/* =====================================================================
   FORMATTERS
   ===================================================================== */
const teamColors = { Engineering:'#4f46e5', Design:'#0ea5b7', Support:'#8b5cf6', Sales:'#e0699a', Marketing:'#f0a020', Data:'#3b8a4e' };
function initials(n){ return n.split(' ').map(w=>w[0]).join('').slice(0,2); }
function slopColor(s){ return s>=60?'#d1382c':s>=35?'#dc6803':'#0d9668'; }
function fmtMoney(n){ return '$' + Math.round(n).toLocaleString(); }
function fmtX(n){ return n.toFixed(2) + '×'; }
function valueColor(v){ return v>=1.6?'var(--value)':(v<0?'var(--slop-hi)':'var(--slop)'); }

/* =====================================================================
   RENDER
   ===================================================================== */
function renderAll(){
  const ov = STATE.overview;
  document.getElementById('periodLabel').textContent =
    new Date(ov.period_start).toLocaleDateString(undefined,{month:'long',year:'numeric'});

  document.getElementById('kpiSpend').textContent = fmtMoney(ov.total_spend_usd);
  document.getElementById('kpiSpendNote').textContent =
    (ov.spend_change_pct>=0?'▲ ':'▼ ') + Math.abs(ov.spend_change_pct) + '% vs last month';
  document.getElementById('kpiValue').textContent = fmtX(ov.blended_value_per_dollar);
  document.getElementById('kpiSlop').textContent = ov.avg_slop_risk.toFixed(0) + '/100';
  document.getElementById('kpiRecoverable').textContent = fmtMoney(ov.recoverable_annual_usd);

  document.getElementById('segFund').textContent = ov.people.filter(p=>p.segment==='fund').length;
  document.getElementById('segCoach').textContent = ov.people.filter(p=>p.segment==='coach').length;
  document.getElementById('segLearn').textContent = ov.people.filter(p=>p.segment==='learn').length;
  document.getElementById('segWatch').textContent = ov.people.filter(p=>p.segment==='watch').length;

  document.getElementById('roiBig').textContent = fmtMoney(ov.recoverable_annual_usd);
  const pctOfBill = ov.total_spend_usd>0 ? Math.round(ov.recoverable_annual_usd/(ov.total_spend_usd*12)*100) : 0;
  document.getElementById('roiSub').textContent = `≈ ${pctOfBill}% of the ${fmtMoney(ov.total_spend_usd*12)} annual AI bill`;
  const roiRows = document.getElementById('roiRows');
  const maxAmt = Math.max(...ov.recoverable_breakdown.map(r=>r.amount_usd), 1);
  roiRows.innerHTML = ov.recoverable_breakdown.map(r => `
    <div class="roi-row"><span>${r.label}</span><span style="font-weight:700;color:var(--value)">${fmtMoney(r.amount_usd)}</span></div>
    <div class="bar"><i style="width:${Math.max(4,r.amount_usd/maxAmt*100)}%"></i></div>
  `).join('');

  renderScatter(ov.people);
  renderPeopleTable();
  renderAgg('teams');

  const teamSel = document.getElementById('teamFilter');
  if (teamSel.options.length <= 1) {
    [...new Set(ov.people.map(p=>p.team))].sort().forEach(t=>{
      const o = document.createElement('option'); o.value=t; o.textContent=t; teamSel.appendChild(o);
    });
  }

  renderAlerts(ov, STATE.teams);
  renderIntegrations();
}

function renderScatter(people){
  const W=560,H=340,padL=46,padR=16,padT=16,padB=38;
  const spends = people.map(p=>p.spend_usd), values = people.map(p=>p.value_per_dollar);
  const xMax = Math.max(...spends) * 1.12;
  const yMax = Math.max(3.2, Math.max(...values) * 1.15);
  const yMin = Math.min(-0.6, Math.min(...values) * 1.15);
  const xPix = v => padL + (v/xMax)*(W-padL-padR);
  const yPix = v => H-padB - ((v-yMin)/(yMax-yMin))*(H-padT-padB);
  const VALUE_T = 1.6, SPEND_T = people.length ? (spends.reduce((a,b)=>a+b,0)/people.length) : 900;
  const vx = xPix(SPEND_T), vy = yPix(VALUE_T), zeroY = yPix(0);

  let svg = '';
  svg += `<rect x="${padL}" y="${padT}" width="${vx-padL}" height="${vy-padT}" fill="#e5f4ee" opacity=".45"/>`;
  svg += `<rect x="${vx}" y="${vy}" width="${W-padR-vx}" height="${H-padB-vy}" fill="#fdecdd" opacity=".5"/>`;
  svg += `<line x1="${padL}" y1="${zeroY}" x2="${W-padR}" y2="${zeroY}" stroke="#d7dbe3"/>`;
  svg += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB}" stroke="#e6e9ef"/>`;
  svg += `<line x1="${vx}" y1="${padT}" x2="${vx}" y2="${H-padB}" stroke="#d7dbe3" stroke-dasharray="4 4"/>`;
  svg += `<line x1="${padL}" y1="${vy}" x2="${W-padR}" y2="${vy}" stroke="#d7dbe3" stroke-dasharray="4 4"/>`;
  svg += `<text x="${padL}" y="${H-10}" font-size="10.5" fill="#5c6470">$0</text>`;
  svg += `<text x="${W-padR}" y="${H-10}" font-size="10.5" fill="#5c6470" text-anchor="end">$${Math.round(xMax).toLocaleString()}/mo →</text>`;
  svg += `<text x="4" y="${padT+6}" font-size="10.5" fill="#5c6470">value/$ ↑</text>`;

  people.forEach((p,i)=>{
    const r = 5 + Math.sqrt(Math.max(p.spend_usd,1))/9;
    svg += `<circle class="dot" data-i="${i}" cx="${xPix(p.spend_usd)}" cy="${yPix(p.value_per_dollar)}" r="${r}" fill="${slopColor(p.slop_risk)}" fill-opacity=".82" stroke="#fff" stroke-width="1.2"/>`;
  });
  const plot = document.getElementById('plot');
  plot.setAttribute('viewBox', `0 0 ${W} ${H}`);
  plot.innerHTML = svg;
  const tip = document.getElementById('tip');
  plot.querySelectorAll('.dot').forEach(d=>{
    d.addEventListener('mousemove', e=>{
      const p = people[d.dataset.i];
      tip.innerHTML = `<b>${p.name}</b> · ${p.team}<br>${fmtMoney(p.spend_usd)}/mo · ${fmtX(p.value_per_dollar)} value · slop ${p.slop_risk.toFixed(0)}`;
      const wrap = plot.closest('.plotwrap').getBoundingClientRect();
      tip.style.left = (e.clientX - wrap.left + 12) + 'px';
      tip.style.top = (e.clientY - wrap.top - 8) + 'px';
      tip.style.opacity = 1;
    });
    d.addEventListener('mouseleave', ()=> tip.style.opacity = 0);
  });
}

function pill(t){
  const map = {Frontier:['#eef0fe','#4f46e5'], Standard:['#eef7f1','#0d9668'], Basic:['#f0f2f6','#5c6470']};
  const [c,f] = map[t] || map.Basic;
  return `<span class="pill" style="background:${c};color:${f}">${t}</span>`;
}
function confPill(c){
  const label = {tier1:'Tier 1', 'tier1+2':'Tier 1+2', 'tier1+2+3':'Tier 1+2+3'}[c] || c;
  return `<span class="pill" style="background:var(--chip);color:var(--muted)">${label}</span>`;
}
function recClass(rec){
  if (rec.startsWith('Keep')) return 'keep';
  if (rec.startsWith('Re-tier') || rec.startsWith('Review') || rec.startsWith('Over-tiered')) return 'flag';
  return '';
}

let sortKey='spend_usd', sortDir=-1;

function currentFiltered(){
  const q = document.getElementById('searchBox').value.trim().toLowerCase();
  const team = document.getElementById('teamFilter').value;
  const tier = document.getElementById('tierFilter').value;
  const seg = document.getElementById('segFilter').value;
  let rows = STATE.overview.people.filter(p =>
    (!q || p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q)) &&
    (!team || p.team===team) && (!tier || p.tier===tier) && (!seg || p.segment===seg)
  );
  rows.sort((a,b)=>{
    const av=a[sortKey], bv=b[sortKey];
    if (typeof av === 'string') return sortDir*av.localeCompare(bv);
    return sortDir*(av-bv);
  });
  return rows;
}

function renderPeopleTable(){
  const rows = currentFiltered();
  document.getElementById('peopleCount').textContent = `${rows.length} of ${STATE.overview.people.length} people`;
  document.getElementById('peopleBody').innerHTML = rows.map(p => `
    <tr>
      <td><div class="who"><div class="av" style="background:${teamColors[p.team]||'#8892a0'}">${initials(p.name)}</div>
        <div><div class="nm">${p.name}</div><div class="rl">${p.team} · ${p.role}</div></div></div></td>
      <td class="num">${fmtMoney(p.spend_usd)}</td>
      <td class="num val-cell" style="color:${valueColor(p.value_per_dollar)}">${fmtX(p.value_per_dollar)}</td>
      <td class="num"><div class="slopbar"><div class="track"><i style="width:${p.slop_risk}%;background:${slopColor(p.slop_risk)}"></i></div><span>${p.slop_risk.toFixed(0)}</span></div></td>
      <td>${confPill(p.confidence)}</td>
      <td>${pill(p.tier)}</td>
      <td class="rec"><span class="${recClass(p.recommendation)}">${p.recommendation}</span></td>
    </tr>`).join('');
}

let aggView = 'teams';
function renderAgg(view){
  aggView = view || aggView;
  const rows = aggView==='teams' ? STATE.teams : STATE.roles;
  document.getElementById('aggCol').textContent = aggView==='teams' ? 'Team' : 'Role';
  document.getElementById('aggBody').innerHTML = rows.map(r => `
    <tr>
      <td><div class="who"><div class="av" style="background:${teamColors[r.name]||'#8892a0'}">${initials(r.name)}</div>
        <div><div class="nm">${r.name}</div><div class="rl">${r.people_count} ${r.people_count===1?'person':'people'}</div></div></div></td>
      <td class="num">${r.people_count}</td>
      <td class="num">${fmtMoney(r.spend_usd)}</td>
      <td class="num val-cell" style="color:${valueColor(r.value_per_dollar)}">${fmtX(r.value_per_dollar)}</td>
      <td class="num"><div class="slopbar"><div class="track"><i style="width:${r.slop_risk}%;background:${slopColor(r.slop_risk)}"></i></div><span>${r.slop_risk.toFixed(0)}</span></div></td>
    </tr>`).join('');
}

function renderAlerts(ov, teams){
  const alerts = [];
  const worstTeam = [...teams].sort((a,b)=>b.slop_risk-a.slop_risk)[0];
  if (worstTeam && worstTeam.slop_risk >= 50) {
    alerts.push({sev:'high', title:`${worstTeam.name} has the highest slop risk of any team (${worstTeam.slop_risk.toFixed(0)}/100)`,
      body:`${worstTeam.people_count} people, ${fmtMoney(worstTeam.spend_usd)}/mo. Worth a sampled Tier-3 review before the next budget cycle.`});
  }
  const coachPeople = ov.people.filter(p=>p.recommendation==='Re-tier + coach');
  if (coachPeople.length) {
    const spend = coachPeople.reduce((a,p)=>a+p.spend_usd,0);
    alerts.push({sev:'high', title:`${coachPeople.length} people flagged for re-tier + coach`,
      body:`Together they represent ${fmtMoney(spend)}/mo in high-spend, high-slop usage — the single largest recoverable bucket this period.`});
  }
  if (ov.spend_change_pct >= 25) {
    alerts.push({sev:'med', title:`Company AI spend is up ${ov.spend_change_pct}% month over month`,
      body:`Total spend reached ${fmtMoney(ov.total_spend_usd)} this period. No anomalous single spender identified — growth looks broad-based.`});
  }
  const stars = ov.people.filter(p=>p.recommendation.startsWith('Keep'));
  if (stars.length) {
    alerts.push({sev:'good', title:`${stars.length} people are top-performing outliers worth studying`,
      body: stars.map(s=>s.name).join(', ') + ' — high value per dollar with low slop risk. Consider surfacing their workflows to the rest of the team.'});
  }
  const sevColor = {high:'var(--slop-hi)', med:'var(--slop)', good:'var(--value)'};
  document.getElementById('alertsList').innerHTML = alerts.map(a => `
    <div class="alert"><div class="dot2" style="background:${sevColor[a.sev]}"></div>
      <div><h4>${a.title}</h4><p>${a.body}</p></div></div>
  `).join('') || '<p style="color:var(--muted);font-size:13px">No alerts this period.</p>';
}

function renderIntegrations(){
  const items = [
    {name:'Anthropic / OpenAI API', color:'#4f46e5', icon:'$', status:true, feed:'ingest/usage', desc:'Model-provider billing & token usage, attributed via proxy key → Identity.'},
    {name:'LLM proxy (LiteLLM-style)', color:'#7c74f4', icon:'⇄', status:true, feed:'ingest/usage', desc:'Homegrown apps route through a thin proxy so every completion is attributed without app changes.'},
    {name:'GitHub / GitLab', color:'#12151c', icon:'⌥', status:true, feed:'ingest/outcome + quality-signal', desc:'PRs merged, reverted, and rework rounds — Tier 1 value and Tier 2 slop signals.'},
    {name:'Jira / Linear', color:'#0ea5b7', icon:'✓', status:true, feed:'ingest/outcome', desc:'Tickets resolved or reopened, attributed to the assignee.'},
    {name:'Zendesk', color:'#03363d', icon:'◉', status:false, feed:'ingest/outcome + quality-signal', desc:'Support resolutions and reopen rates. Not yet connected.'},
    {name:'HubSpot / Salesforce', color:'#e0699a', icon:'◆', status:false, feed:'ingest/outcome', desc:'Deal-stage advances for sales/marketing value attribution. Not yet connected.'},
    {name:'Okta / Entra (SSO+SCIM)', color:'#f0a020', icon:'⚿', status:true, feed:'IdentityMapping', desc:'The load-bearing integration — resolves every external id to one canonical person.'},
    {name:'Sampled rubric grading', color:'#0d9668', icon:'★', status:false, feed:'RubricGrade (Tier 3)', desc:'Opt-in human/LLM grading on a sample, for teams that want a calibrated hard number.'},
  ];
  document.getElementById('intGrid').innerHTML = items.map(it => `
    <div class="int-card">
      <div class="int-top">
        <div class="int-icon" style="background:${it.color}">${it.icon}</div>
        <span class="status ${it.status?'on':'off'}">${it.status?'Connected':'Not connected'}</span>
      </div>
      <h3>${it.name}</h3>
      <p>${it.desc}</p>
      <span class="int-feed"><code class="tag" style="background:transparent;padding:0">${it.feed}</code></span>
    </div>`).join('');
}

/* =====================================================================
   INTERACTIONS
   ===================================================================== */
document.getElementById('nav').addEventListener('click', e=>{
  const item = e.target.closest('.sb-item');
  if (!item) return;
  document.querySelectorAll('.sb-item').forEach(i=>i.classList.remove('active'));
  item.classList.add('active');
  const view = item.dataset.view;
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  const titles = {overview:['Overview','AI spend & value, down to the person'],
    people:['People','Every AI-active person — search, filter, sort'],
    teams:['Teams & Roles','Spend and value rolled up above the individual'],
    alerts:['Alerts','What Meter thinks needs a look this period'],
    integrations:['Integrations','How spend, outcomes, and quality signals get in']};
  document.getElementById('pageTitle').textContent = titles[view][0];
  document.getElementById('pageSub').textContent = titles[view][1];
});

['searchBox'].forEach(id=>document.getElementById(id).addEventListener('input', renderPeopleTable));
['teamFilter','tierFilter','segFilter'].forEach(id=>document.getElementById(id).addEventListener('change', renderPeopleTable));

document.getElementById('peopleTable').querySelector('thead').addEventListener('click', e=>{
  const th = e.target.closest('th'); if (!th || !th.dataset.k) return;
  const k = th.dataset.k;
  if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = -1; }
  renderPeopleTable();
});

document.getElementById('aggToggle').addEventListener('click', e=>{
  if (e.target.tagName !== 'BUTTON') return;
  document.querySelectorAll('#aggToggle button').forEach(b=>b.classList.remove('on'));
  e.target.classList.add('on');
  renderAgg(e.target.dataset.v);
});

loadData();
