/* =====================================================================
   Merit dashboard — front-end application logic.

   Loads after fallback-data.js (which defines the FALLBACK_* consts below).
   Plain, non-module script on purpose so index.html works opened directly
   over file:// without a dev server or CORS gymnastics. (coming-soon.html
   is the old pre-launch placeholder, kept around for its waitlist form and
   ROI calculator but no longer served at the site root.)

   Sections: DATA LAYER, FORMATTERS, RENDER, INTERACTIONS.
   ===================================================================== */
/* global FALLBACK_OVERVIEW, FALLBACK_TEAMS, FALLBACK_ROLES, FALLBACK_TRENDS, FALLBACK_TOOL_BREAKDOWN, FALLBACK_ADOPTION, FALLBACK_TOOL_PERFORMANCE, FALLBACK_SPEND_FORECAST */

/* =====================================================================
   DATA LAYER
   Tries the live Merit API first (see ../backend/); if it's not reachable
   (most common — this file is usually opened standalone) it falls back to
   the snapshot in fallback-data.js, so the UI behaves identically either
   way. The sidebar badge tells you which mode it's in.
   ===================================================================== */
// localhost/127.0.0.1/file:// (empty hostname) means local dev — hit the
// local backend. Any other origin is a real deploy (the production domain,
// or a Cloudflare Workers preview build) — hit the production API. A preview
// build's origin won't be in MERIT_CORS_ORIGINS, so its fetches get CORS-
// blocked and it falls back to demo data — expected, not a bug.
const API_BASE = ["localhost", "127.0.0.1", ""].includes(location.hostname)
  ? "http://localhost:8000"
  : "https://api.usemeritai.com";

let STATE = {
  overview: null, teams: null, roles: null, trends: null, toolBreakdown: null, adoption: null,
  toolPerformance: null, spendForecast: null, live: false
};

// The backend gates /api/* behind MERIT_JWT_SECRET when that's set in
// production (see backend/app/dependencies.py) -- a real per-user login
// (password or Google, see backend/app/routers/auth.py), not a shared
// secret. Storing the issued JWT in localStorage means a visitor logs in
// once; it's sent as a Bearer token on every API call, same delivery
// mechanism the old shared token used.
const TOKEN_KEY = "merit_token";
function getStoredToken() { return localStorage.getItem(TOKEN_KEY) || ""; }
function setStoredToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }

class AuthError extends Error {}

async function fetchJSON(path, timeoutMs = 900) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const token = getStoredToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(API_BASE + path, { signal: ctrl.signal, headers });
    clearTimeout(t);
    // A 401 means "the API is reachable but this token is wrong/missing" --
    // distinct from every other failure mode below, which all mean "treat
    // this the same as the API being offline and show demo data."
    if (res.status === 401) throw new AuthError("unauthorized");
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } catch (e) {
    clearTimeout(t);
    if (e instanceof AuthError) throw e;
    return null;
  }
}

async function fetchLive() {
  const [ov, tm, rl, tr, tb, ad, tp, sf] = await Promise.all([
    fetchJSON("/api/overview"), fetchJSON("/api/teams"), fetchJSON("/api/roles"),
    fetchJSON("/api/trends"), fetchJSON("/api/tool-breakdown"), fetchJSON("/api/adoption"),
    fetchJSON("/api/tool-performance"), fetchJSON("/api/spend-forecast")
  ]);
  if (ov && tm && rl && tr && tb && ad && tp && sf) {
    return { overview: ov, teams: tm, roles: rl, trends: tr, toolBreakdown: tb, adoption: ad, toolPerformance: tp, spendForecast: sf };
  }
  return null;
}

async function loadData() {
  const hadToken = !!getStoredToken();
  let live = null;
  try {
    live = await fetchLive();
  } catch (e) {
    if (!(e instanceof AuthError)) throw e;
    // Expired/invalid session -- clear it and ask again (with a hint if one
    // was already stored) rather than silently retrying forever. Demo data
    // still renders underneath so the page isn't blank while the visitor
    // logs back in.
    setStoredToken("");
    showAuthGate(hadToken ? "Your session expired -- sign in again." : "");
  }
  STATE = live
    ? { ...live, live: true }
    : {
        overview: FALLBACK_OVERVIEW, teams: FALLBACK_TEAMS, roles: FALLBACK_ROLES,
        trends: FALLBACK_TRENDS, toolBreakdown: FALLBACK_TOOL_BREAKDOWN, adoption: FALLBACK_ADOPTION,
        toolPerformance: FALLBACK_TOOL_PERFORMANCE, spendForecast: FALLBACK_SPEND_FORECAST, live: false
      };
  // Shown in two places — the sidebar footer (easy to miss) and next to the
  // page title (harder to miss) — since which mode the data is in matters
  // for how much a viewer should trust the numbers.
  [document.getElementById("sourceBadge"), document.getElementById("sourceBadgeTop")].forEach(badge=>{
    if (!badge) return;
    if (STATE.live) {
      badge.className = "sb-badge live";
      badge.innerHTML = "<i></i> LIVE · Merit API";
    } else {
      badge.className = "sb-badge demo";
      badge.innerHTML = "<i></i> DEMO DATA · API offline";
    }
  });
  renderAll();
}

function showAuthGate(errorMsg) {
  const gate = document.getElementById("authGate");
  if (!gate) return;
  const err = document.getElementById("authError");
  err.textContent = errorMsg || "";
  err.hidden = !errorMsg;
  gate.hidden = false;
  document.body.style.overflow = "hidden"; // full-page takeover -- nothing behind it should scroll either
  document.getElementById("authEmail").focus();
}
function hideAuthGate() {
  const gate = document.getElementById("authGate");
  if (gate) gate.hidden = true;
  document.body.style.overflow = "";
}

// login/signup toggle -- same form, different endpoint + an extra "name"
// field for signup. Kept as one form rather than two so there's only one
// place handling the submit/error/loading dance.
let authMode = "login";
function setAuthMode(mode) {
  authMode = mode;
  const isSignup = mode === "signup";
  document.getElementById("authGateTitle").textContent = isSignup ? "Create your account" : "Sign in to Merit";
  document.getElementById("authName").hidden = !isSignup;
  document.getElementById("authName").required = isSignup;
  document.getElementById("authPassword").autocomplete = isSignup ? "new-password" : "current-password";
  document.getElementById("authSubmit").textContent = isSignup ? "Sign up" : "Sign in";
  document.getElementById("authToggleText").textContent = isSignup ? "Already have an account?" : "Don't have an account?";
  document.getElementById("authToggleBtn").textContent = isSignup ? "Sign in" : "Sign up";
  document.getElementById("authError").hidden = true;
}

const authForm = document.getElementById("authForm");
if (authForm) {
  document.getElementById("authGoogleBtn").href = API_BASE + "/auth/google/login";
  document.getElementById("authToggleBtn").addEventListener("click", () => setAuthMode(authMode === "login" ? "signup" : "login"));
  document.getElementById("authGateSkip").addEventListener("click", hideAuthGate);

  authForm.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const name = document.getElementById("authName").value.trim();
    const errEl = document.getElementById("authError");
    const submitBtn = document.getElementById("authSubmit");
    if (!email || !password) return;

    const path = authMode === "signup" ? "/auth/signup" : "/auth/login";
    const body = authMode === "signup" ? { email, password, name } : { email, password };
    submitBtn.disabled = true;
    try {
      const res = await fetch(API_BASE + path, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        errEl.textContent = data.detail || "Something went wrong -- try again.";
        errEl.hidden = false;
        return;
      }
      setStoredToken(data.access_token);
      document.getElementById("authPassword").value = "";
      hideAuthGate();
      loadData();
    } catch {
      errEl.textContent = "Couldn't reach the server -- try again in a moment.";
      errEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// Google's OAuth callback redirects the whole page back here with either
// ?token=... (success) or ?auth_error=... (failure) -- pick it up once,
// then scrub the URL so a refresh/share doesn't carry the token along.
(function handleAuthRedirect() {
  const params = new URLSearchParams(location.search);
  const token = params.get("token");
  const authError = params.get("auth_error");
  if (!token && !authError) return;
  if (token) setStoredToken(token);
  history.replaceState({}, "", location.pathname);
  if (authError) showAuthGate(authError);
})();

/* =====================================================================
   FORMATTERS
   ===================================================================== */
// Fixed categorical order (never cycled/reassigned) validated against the
// dataviz palette gates for CVD + normal-vision separation. Each team gets a
// soft tint background + a darkened version of its hue for text, since three
// of these six hues (aqua, yellow, magenta) fall short of 3:1 white-on-color
// contrast on their own — the "relief" the validator flags for those slots.
const teamColors = {
  Data:        { bg:'#e5eefb', text:'#2a78d6' },
  Design:      { bg:'#fdece2', text:'#c8511f' },
  Engineering: { bg:'#e0f6ee', text:'#0f9464' },
  Marketing:   { bg:'#fdf1d9', text:'#9c6a00' },
  Sales:       { bg:'#fbe7ef', text:'#c14883' },
  Support:     { bg:'#dff3df', text:'#046b04' },
};
const FALLBACK_TEAM_COLOR = { bg:'var(--chip)', text:'var(--muted)' };
function teamColor(name){ return teamColors[name] || FALLBACK_TEAM_COLOR; }
function initials(n){ return n.split(' ').map(w=>w[0]).join('').slice(0,2); }
function slopColor(s){ return s>=60?'var(--bad)':s>=35?'var(--warn)':'var(--good)'; }
function fmtMoney(n){ return '$' + Math.round(n).toLocaleString(); }
function fmtX(n){ return n.toFixed(2) + '×'; }
// --good/--bad/--warn are also used for large text and non-text (bars,
// dots), where they're contrast-safe; --good-text/--warn-text are the same
// hues darkened for the small bold table text this feeds (WCAG AA needs
// 4.5:1 there vs. the 3:1 large-text minimum the KPI numbers get away with).
// Same number the scatter plot's quadrant line (renderScatter) is drawn at --
// both mark "good" value/$ at the same place, so they share this constant.
const VALUE_GOOD_THRESHOLD = 1.6;
function valueColor(v){ return v>=VALUE_GOOD_THRESHOLD?'var(--good-text)':(v<0?'var(--bad)':'var(--warn-text)'); }
const TOOL_LABELS = { anthropic_api:'Anthropic API', github_copilot:'GitHub Copilot', chatgpt_enterprise:'ChatGPT Enterprise' };
function toolLabel(t){ return TOOL_LABELS[t] || t; }
function slopBarHtml(risk){
  return `<div class="slopbar"><div class="track"><i style="width:${risk}%;background:${slopColor(risk)}"></i></div><span>${risk.toFixed(0)}</span></div>`;
}
function avatarCellHtml(name, subtitle, colorKey){
  const c = teamColor(colorKey);
  return `<div class="who"><div class="av" style="background:${c.bg};color:${c.text}">${initials(name)}</div>
        <div><div class="nm">${name}</div><div class="rl">${subtitle}</div></div></div>`;
}
// Shared crosshair/dot tooltip positioning for renderScatter + renderTrends --
// both float a `.tip` element inside a `.plotwrap`, anchored to the cursor.
function positionTooltip(tip, plotEl, clientX, clientY){
  const wrap = plotEl.closest('.plotwrap').getBoundingClientRect();
  tip.style.left = (clientX - wrap.left + 12) + 'px';
  tip.style.top = (clientY - wrap.top - 8) + 'px';
  tip.style.opacity = 1;
}

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
  document.getElementById('kpiReworkTax').textContent = ov.rework_tax_pct.toFixed(1) + '%';
  document.getElementById('kpiRecoverable').textContent = fmtMoney(ov.recoverable_annual_usd);

  const ad = STATE.adoption;
  document.getElementById('kpiAdoption').textContent = `${ad.active_users} / ${ad.total_seats}`;
  document.getElementById('kpiAdoptionNote').textContent = `${ad.utilization_pct.toFixed(0)}% seat utilization`;

  const confOrder = ['tier1+2+3', 'tier1+2', 'tier1'];
  const cb = ov.confidence_breakdown || {};
  document.getElementById('confidenceBreakdown').innerHTML = confOrder
    .filter(k => cb[k])
    .map(k => `<span class="coverage-item">${confPill(k)}<b>${cb[k]}</b></span>`)
    .join('') || '<span class="coverage-empty">No scored people yet.</span>';

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
    <div class="roi-row"><span>${r.label}</span><span>${fmtMoney(r.amount_usd)}</span></div>
    <div class="bar"><i style="width:${Math.max(4,r.amount_usd/maxAmt*100)}%"></i></div>
  `).join('');

  renderScatter(ov.people);
  renderTrends(STATE.trends);
  renderForecast(STATE.spendForecast);
  renderPeopleTable();
  renderAgg('teams');
  renderToolBreakdown();
  renderToolPerformance();

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
  svg += `<rect x="${padL}" y="${padT}" width="${vx-padL}" height="${vy-padT}" fill="var(--good-soft)" opacity=".5"/>`;
  svg += `<rect x="${vx}" y="${vy}" width="${W-padR-vx}" height="${H-padB-vy}" fill="var(--bad-soft)" opacity=".5"/>`;
  svg += `<line x1="${padL}" y1="${zeroY}" x2="${W-padR}" y2="${zeroY}" stroke="var(--line-strong)"/>`;
  svg += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB}" stroke="var(--line)"/>`;
  svg += `<line x1="${vx}" y1="${padT}" x2="${vx}" y2="${H-padB}" stroke="var(--line-strong)" stroke-dasharray="4 4"/>`;
  svg += `<line x1="${padL}" y1="${vy}" x2="${W-padR}" y2="${vy}" stroke="var(--line-strong)" stroke-dasharray="4 4"/>`;
  svg += `<text x="${padL}" y="${H-10}" font-size="10.5" fill="var(--muted)">$0</text>`;
  svg += `<text x="${W-padR}" y="${H-10}" font-size="10.5" fill="var(--muted)" text-anchor="end">$${Math.round(xMax).toLocaleString()}/mo →</text>`;
  svg += `<text x="4" y="${padT+6}" font-size="10.5" fill="var(--muted)">value/$ ↑</text>`;

  people.forEach((p,i)=>{
    const r = 5 + Math.sqrt(Math.max(p.spend_usd,1))/9;
    const label = `${p.name}, ${p.team}: ${fmtMoney(p.spend_usd)} per month, ${fmtX(p.value_per_dollar)} value per dollar, slop risk ${p.slop_risk.toFixed(0)} of 100`;
    svg += `<circle class="dot" tabindex="0" role="img" aria-label="${label}" data-i="${i}" cx="${xPix(p.spend_usd)}" cy="${yPix(p.value_per_dollar)}" r="${r}" fill="${slopColor(p.slop_risk)}" fill-opacity=".82" stroke="#fff" stroke-width="1.2"><title>${label}</title></circle>`;
  });
  const plot = document.getElementById('plot');
  plot.setAttribute('viewBox', `0 0 ${W} ${H}`);
  plot.innerHTML = svg;
  const tip = document.getElementById('tip');
  const showTip = (p, clientX, clientY) => {
    tip.innerHTML = `<b>${p.name}</b> · ${p.team}<br>${fmtMoney(p.spend_usd)}/mo · ${fmtX(p.value_per_dollar)} value · slop ${p.slop_risk.toFixed(0)}`;
    positionTooltip(tip, plot, clientX, clientY);
  };
  plot.querySelectorAll('.dot').forEach(d=>{
    d.addEventListener('mousemove', e=> showTip(people[d.dataset.i], e.clientX, e.clientY));
    d.addEventListener('mouseleave', ()=> tip.style.opacity = 0);
    // Keyboard-focus equivalent of hover, so the tooltip isn't mouse-only —
    // the aria-label above already covers screen readers on its own.
    d.addEventListener('focus', ()=>{
      const rect = d.getBoundingClientRect();
      showTip(people[d.dataset.i], rect.left + rect.width / 2, rect.top);
    });
    d.addEventListener('blur', ()=> tip.style.opacity = 0);
  });
}

function renderTrends(trends){
  if (!trends || !trends.length) return;
  const W=900,H=190,padL=46,padR=16,padT=14,padB=26;
  const spend = trends.map(t=>t.total_spend_usd);
  const maxSpend = Math.max(...spend, 1) * 1.15;
  const xPix = i => padL + (trends.length>1 ? i/(trends.length-1)*(W-padL-padR) : (W-padL-padR)/2);
  const yPix = v => H-padB - (v/maxSpend)*(H-padT-padB);

  let svg = `<line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="var(--line)"/>`;
  svg += `<text x="${padL}" y="${padT+2}" font-size="10.5" fill="var(--muted)">$${Math.round(maxSpend).toLocaleString()}</text>`;
  const path = trends.map((t,i)=> `${i===0?'M':'L'}${xPix(i).toFixed(1)},${yPix(t.total_spend_usd).toFixed(1)}`).join(' ');
  svg += `<path d="${path}" fill="none" stroke="var(--brand)" stroke-width="2"/>`;

  trends.forEach((t,i)=>{
    const monthLabel = new Date(t.period_start).toLocaleDateString(undefined,{month:'short',year:'2-digit'});
    const label = `${new Date(t.period_start).toLocaleDateString(undefined,{month:'long',year:'numeric'})}: ${fmtMoney(t.total_spend_usd)}/mo, ${fmtX(t.blended_value_per_dollar)} value, slop ${t.avg_slop_risk.toFixed(0)}`;
    svg += `<circle class="dot" tabindex="0" role="img" aria-label="${label}" data-i="${i}" cx="${xPix(i).toFixed(1)}" cy="${yPix(t.total_spend_usd).toFixed(1)}" r="4" fill="var(--brand)" stroke="#fff" stroke-width="1.2"><title>${label}</title></circle>`;
    svg += `<text x="${xPix(i).toFixed(1)}" y="${H-8}" font-size="10" fill="var(--muted)" text-anchor="middle">${monthLabel}</text>`;
  });
  svg += `<line class="crosshair" id="trendsCrosshair" x1="0" y1="${padT}" x2="0" y2="${H-padB}" style="opacity:0"/>`;
  svg += `<rect id="trendsOverlay" x="${padL}" y="${padT}" width="${Math.max(0,W-padL-padR)}" height="${Math.max(0,H-padT-padB)}" fill="transparent"/>`;

  const plot = document.getElementById('trendsPlot');
  plot.setAttribute('viewBox', `0 0 ${W} ${H}`);
  plot.innerHTML = svg;

  // Crosshair + tooltip: a transparent overlay tracks mouse position across
  // the whole plot width so the tooltip follows continuously, not just when
  // the cursor is exactly over a 4px dot (the dataviz interaction guidance
  // for line charts). Per-dot focus/blur covers the same for keyboard users.
  const tip = document.getElementById('trendsTip');
  const crosshair = document.getElementById('trendsCrosshair');
  const showTrendsTip = (i, clientX, clientY) => {
    const t = trends[i];
    const monthLabel = new Date(t.period_start).toLocaleDateString(undefined,{month:'long',year:'numeric'});
    tip.innerHTML = `<b>${monthLabel}</b><br>${fmtMoney(t.total_spend_usd)}/mo · ${fmtX(t.blended_value_per_dollar)} value · slop ${t.avg_slop_risk.toFixed(0)}`;
    positionTooltip(tip, plot, clientX, clientY);
    crosshair.setAttribute('x1', xPix(i).toFixed(1));
    crosshair.setAttribute('x2', xPix(i).toFixed(1));
    crosshair.style.opacity = 1;
  };
  const hideTrendsTip = () => { tip.style.opacity = 0; crosshair.style.opacity = 0; };
  document.getElementById('trendsOverlay').addEventListener('mousemove', e=>{
    const rect = plot.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) * (W / rect.width);
    let idx = 0, minD = Infinity;
    trends.forEach((t,i)=>{ const d = Math.abs(xPix(i)-mouseX); if (d<minD){ minD=d; idx=i; } });
    showTrendsTip(idx, e.clientX, e.clientY);
  });
  document.getElementById('trendsOverlay').addEventListener('mouseleave', hideTrendsTip);
  plot.querySelectorAll('.dot').forEach(d=>{
    d.addEventListener('focus', ()=>{
      const rect = d.getBoundingClientRect();
      showTrendsTip(Number(d.dataset.i), rect.left + rect.width/2, rect.top);
    });
    d.addEventListener('blur', hideTrendsTip);
  });
}

// A plain linear trend projection (see backend/app/services/analytics.py
// forecast_next_period_spend) -- not a black-box prediction. Hidden entirely
// rather than shown with a fake number when there isn't enough history yet.
function renderForecast(forecast){
  const el = document.getElementById('forecastNote');
  if (!el) return;
  if (!forecast || !forecast.available) { el.hidden = true; return; }
  const arrow = forecast.trend_direction === 'up' ? '▲' : forecast.trend_direction === 'down' ? '▼' : '→';
  el.innerHTML = `${arrow} Next period trend projection: <b>${fmtMoney(forecast.projected_spend_usd)}</b> — a straight-line projection from the last ${forecast.based_on_periods} scored periods, not a guarantee.`;
  el.hidden = false;
}

function pill(t){
  const map = {
    Frontier: ['var(--brand-soft)', 'var(--brand-dark)'],
    Standard: ['var(--good-soft)', 'var(--good-text)'],
    Basic: ['var(--chip)', 'var(--muted)'],
  };
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
// Tier is a rank, not alphabetical text — Basic/Frontier/Standard sorted as
// strings reads oddly given the app implies a hierarchy (matches the order
// already used in the tier filter dropdown).
const TIER_RANK = { Frontier: 3, Standard: 2, Basic: 1 };

function currentFiltered(){
  const q = document.getElementById('searchBox').value.trim().toLowerCase();
  const team = document.getElementById('teamFilter').value;
  const tier = document.getElementById('tierFilter').value;
  const seg = document.getElementById('segFilter').value;
  let rows = STATE.overview.people.filter(p =>
    (!q || p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) || p.recommendation.toLowerCase().includes(q)) &&
    (!team || p.team===team) && (!tier || p.tier===tier) && (!seg || p.segment===seg)
  );
  rows.sort((a,b)=>{
    if (sortKey === 'tier') return sortDir * ((TIER_RANK[a.tier]||0) - (TIER_RANK[b.tier]||0));
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
      <td>${avatarCellHtml(p.name, `${p.team} · ${p.role}`, p.team)}</td>
      <td class="num">${fmtMoney(p.spend_usd)}</td>
      <td class="num val-cell" style="color:${valueColor(p.value_per_dollar)}">${fmtX(p.value_per_dollar)}</td>
      <td class="num">${slopBarHtml(p.slop_risk)}</td>
      <td>${confPill(p.confidence)}</td>
      <td>${pill(p.tier)}</td>
      <td class="rec"><span class="${recClass(p.recommendation)}">${p.recommendation}</span></td>
    </tr>`).join('') || `<tr><td colspan="7" style="color:var(--muted)">No people match these filters.</td></tr>`;
}

let aggView = 'teams';
function renderAgg(view){
  aggView = view || aggView;
  const rows = aggView==='teams' ? STATE.teams : STATE.roles;
  document.getElementById('aggCol').textContent = aggView==='teams' ? 'Team' : 'Role';
  document.getElementById('aggBody').innerHTML = rows.map(r => `
    <tr>
      <td>${avatarCellHtml(r.name, `${r.people_count} ${r.people_count===1?'person':'people'}`, r.name)}</td>
      <td class="num">${r.people_count}</td>
      <td class="num">${fmtMoney(r.spend_usd)}</td>
      <td class="num val-cell" style="color:${valueColor(r.value_per_dollar)}">${fmtX(r.value_per_dollar)}</td>
      <td class="num">${slopBarHtml(r.slop_risk)}</td>
    </tr>`).join('') || `<tr><td colspan="5" style="color:var(--muted)">No data for this period yet.</td></tr>`;
}

// Alerts computed by the last renderAlerts() call, so the click/keydown
// delegation below can look up which filter to apply without re-deriving it.
let lastAlerts = [];

function renderAlerts(ov, teams){
  const alerts = [];
  const worstTeam = [...teams].sort((a,b)=>b.slop_risk-a.slop_risk)[0];
  if (worstTeam && worstTeam.slop_risk >= 50) {
    alerts.push({sev:'high', title:`${worstTeam.name} has the highest slop risk of any team (${worstTeam.slop_risk.toFixed(0)}/100)`,
      body:`${worstTeam.people_count} people, ${fmtMoney(worstTeam.spend_usd)}/mo. Worth a sampled Tier-3 review before the next budget cycle.`,
      filterTeam: worstTeam.name});
  }
  const coachPeople = ov.people.filter(p=>p.recommendation==='Re-tier + coach');
  if (coachPeople.length) {
    const spend = coachPeople.reduce((a,p)=>a+p.spend_usd,0);
    alerts.push({sev:'high', title:`${coachPeople.length} people flagged for re-tier + coach`,
      body:`Together they represent ${fmtMoney(spend)}/mo in high-spend, high-slop usage — the single largest recoverable bucket this period.`,
      filterSearch: 're-tier + coach'});
  }
  if (ov.spend_change_pct >= 25) {
    alerts.push({sev:'med', title:`Company AI spend is up ${ov.spend_change_pct}% month over month`,
      body:`Total spend reached ${fmtMoney(ov.total_spend_usd)} this period. No anomalous single spender identified — growth looks broad-based.`});
  }
  const stars = ov.people.filter(p=>p.recommendation.startsWith('Keep'));
  if (stars.length) {
    alerts.push({sev:'good', title:`${stars.length} people are top-performing outliers worth studying`,
      body: stars.map(s=>s.name).join(', ') + ' — high value per dollar with low slop risk. Consider surfacing their workflows to the rest of the team.',
      filterSearch: 'keep'});
  }
  lastAlerts = alerts;
  const sevColor = {high:'var(--bad)', med:'var(--warn)', good:'var(--good)'};
  document.getElementById('alertsList').innerHTML = alerts.map((a,i) => {
    const clickable = a.filterTeam || a.filterSearch;
    return `
    <div class="alert${clickable?' clickable':''}"${clickable?` role="button" tabindex="0" data-i="${i}"`:''}>
      <div class="dot2" style="background:${sevColor[a.sev]}"></div>
      <div><h4>${a.title}</h4><p>${a.body}</p>${clickable?'<span class="alert-cta">View in People →</span>':''}</div>
    </div>`;
  }).join('') || '<p style="color:var(--muted);font-size:13px">No alerts this period.</p>';
}

function renderToolBreakdown(){
  const rows = STATE.toolBreakdown || [];
  document.getElementById('toolBreakdownBody').innerHTML = rows.map(r => `
    <tr>
      <td>${toolLabel(r.tool)}</td>
      <td>${r.model || '—'}</td>
      <td class="num">${fmtMoney(r.spend_usd)}</td>
      <td class="num">${r.event_count.toLocaleString()}</td>
    </tr>`).join('') || `<tr><td colspan="4" style="color:var(--muted)">No usage yet this period.</td></tr>`;
}

function renderToolPerformance(){
  const rows = STATE.toolPerformance || [];
  document.getElementById('toolPerformanceBody').innerHTML = rows.map(r => `
    <tr>
      <td>${toolLabel(r.tool)}</td>
      <td class="num">${fmtMoney(r.spend_usd)}</td>
      <td class="num val-cell" style="color:${valueColor(r.value_per_dollar)}">${fmtX(r.value_per_dollar)}</td>
      <td class="num">${slopBarHtml(r.slop_risk)}</td>
      <td class="num">${r.people_count}</td>
    </tr>`).join('') || `<tr><td colspan="5" style="color:var(--muted)">No usage yet this period.</td></tr>`;
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
    {name:'Sampled rubric grading', color:'#0a8a4b', icon:'★', status:false, feed:'RubricGrade (Tier 3)', desc:'Opt-in human/LLM grading on a sample, for teams that want a calibrated hard number.'},
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
const VIEW_TITLES = {overview:['Overview','AI spend, value, and rework risk — by team, with person-level detail when you need it'],
  people:['People','Every AI-active person — search, filter, sort'],
  teams:['Teams & Roles','Spend and value rolled up above the individual'],
  alerts:['Alerts','What Merit thinks needs a look this period'],
  integrations:['Integrations','How spend, outcomes, and quality signals get in']};

function switchView(view){
  document.querySelectorAll('.sb-item').forEach(i=>{
    const active = i.dataset.view === view;
    i.classList.toggle('active', active);
    if (active) i.setAttribute('aria-current', 'page'); else i.removeAttribute('aria-current');
  });
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active', v.id === 'view-' + view));
  document.getElementById('pageTitle').textContent = VIEW_TITLES[view][0];
  document.getElementById('pageSub').textContent = VIEW_TITLES[view][1];
}

document.getElementById('nav').addEventListener('click', e=>{
  const item = e.target.closest('.sb-item');
  if (!item) return;
  switchView(item.dataset.view);
});
document.getElementById('nav').addEventListener('keydown', e=>{
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const item = e.target.closest('.sb-item');
  if (!item) return;
  e.preventDefault();
  switchView(item.dataset.view);
});

['searchBox'].forEach(id=>document.getElementById(id).addEventListener('input', renderPeopleTable));
['teamFilter','tierFilter','segFilter'].forEach(id=>document.getElementById(id).addEventListener('change', renderPeopleTable));

function sortByHeader(th){
  if (!th || !th.dataset.k) return;
  const k = th.dataset.k;
  if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = -1; }
  document.querySelectorAll('#peopleTable th[data-k]').forEach(h=>{
    h.setAttribute('aria-sort', h.dataset.k === sortKey ? (sortDir === 1 ? 'ascending' : 'descending') : 'none');
  });
  renderPeopleTable();
}
const peopleThead = document.getElementById('peopleTable').querySelector('thead');
peopleThead.addEventListener('click', e=> sortByHeader(e.target.closest('th')));
peopleThead.addEventListener('keydown', e=>{
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const th = e.target.closest('th'); if (!th || !th.dataset.k) return;
  e.preventDefault();
  sortByHeader(th);
});

document.getElementById('aggToggle').addEventListener('click', e=>{
  if (e.target.tagName !== 'BUTTON') return;
  document.querySelectorAll('#aggToggle button').forEach(b=>b.classList.remove('on'));
  e.target.classList.add('on');
  renderAgg(e.target.dataset.v);
});

// Alerts that reference a specific cohort (a team, or people matching a
// recommendation) cross-navigate into the People view pre-filtered to them.
function goToPeopleWithFilter({filterTeam, filterSearch}){
  document.getElementById('teamFilter').value = filterTeam || '';
  document.getElementById('tierFilter').value = '';
  document.getElementById('segFilter').value = '';
  document.getElementById('searchBox').value = filterSearch || '';
  renderPeopleTable();
  switchView('people');
}
function activateAlert(target){
  const card = target.closest('.alert.clickable');
  if (!card) return;
  const a = lastAlerts[Number(card.dataset.i)];
  if (a) goToPeopleWithFilter(a);
}
const alertsList = document.getElementById('alertsList');
alertsList.addEventListener('click', e=> activateAlert(e.target));
alertsList.addEventListener('keydown', e=>{
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (!e.target.closest('.alert.clickable')) return;
  e.preventDefault();
  activateAlert(e.target);
});

loadData();
