// =======================
// 0) CONFIG
// =======================
const TEAM_LABELS = { ozark: "Team Ozark", valley: "Team Valley" };

// Your photos live under images/players/
const PLAYER_PHOTO_BASE_PATH = "images/players/";

const RESPECT_SAVED_HIDDEN_SEEDED = false; // <— OFF so hard-coded players always render

// Storage keys
const SIGNUPS_ROSTER_KEY = "ozarkSignupsRoster_v1";
const SIGNUPS_DUPE_KEY   = "ozarkSignupsDupes_v1";
const HIDDEN_PLAYERS_KEY = "ozarkHiddenPlayers_v1";
// Shared bridge key used by Scoreboard/Scorecard/Leaderboard
const SHARED_KEY = "ozarkShared_v1";

// Helpers for hidden seeded players
const loadHiddenIds = () => {
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_PLAYERS_KEY) || "[]")); }
  catch { return new Set(); }
};
const saveHiddenIds = (set) => {
  localStorage.setItem(HIDDEN_PLAYERS_KEY, JSON.stringify(Array.from(set)));
};

// =======================
// 1) NAV TOGGLE (mobile + a11y)
// =======================
(function initNavToggleImmediate() {
  const navToggle = document.getElementById("navToggle");
  const nav = document.querySelector(".nav");
  if (navToggle && nav) {
    navToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
})();

// =======================
// 2) SCHEDULE TABS
// =======================
(function initScheduleTabs() {
  const scheduleTabButtons = document.querySelectorAll(".tab-btn[data-day]");
  const scheduleDays = document.querySelectorAll(".schedule-day");
  if (!scheduleTabButtons.length || !scheduleDays.length) return;

  scheduleTabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      scheduleTabButtons.forEach((b) => b.classList.remove("active"));
      scheduleDays.forEach((d) => {
        const isActive = d.id === btn.dataset.day;
        d.classList.toggle("active", isActive);
        d.toggleAttribute("hidden", !isActive);
      });
      btn.classList.add("active");
    });
  });
})();

// =======================
// 3) MASTER PLAYER LIST (seeded + signups)
// =======================
const players = [
  { id: "1", firstName: "Nick",    nickname: "Gamer",     lastName: "Brown",   team: "ozark",  photo: "nick-brown.png",  handicap: 15, notes: "Tech guy" },
  { id: "2", firstName: "Barry",   nickname: "Aim Right", lastName: "Brown",   team: "ozark",  photo: "barry-brown.png", handicap: 18, notes: "OG" },
  { id: "3", firstName: "Joshua",  nickname: "Long Ball", lastName: "Brown",   team: "valley", photo: "josh-brown.png",  handicap: 11, notes: "Long hitter" },
  { id: "4", firstName: "Matthew", nickname: "Hands",     lastName: "Brown",   team: "valley", photo: "matt-brown.png",  handicap: 10, notes: "Short game guy" },
  // add more seeded players here as needed
];

const SEEDED_PLAYERS = players.slice();

function loadSignupPlayers() {
  try { return JSON.parse(localStorage.getItem(SIGNUPS_ROSTER_KEY) || "[]"); } catch { return []; }
}
function saveSignupPlayers(arr) {
  localStorage.setItem(SIGNUPS_ROSTER_KEY, JSON.stringify(arr || []));
}

function upsertPlayerToMasterList(p) {
  const n = (s) => String(s || "").toLowerCase().trim();
  const exists = players.some(x =>
    (p.id && x.id === p.id) ||
    (n(x.firstName) === n(p.firstName) &&
     n(x.lastName)  === n(p.lastName)  &&
     (!!x.email && !!p.email ? n(x.email) === n(p.email) : true))
  );
  if (!exists) players.push(p);
}
loadSignupPlayers().forEach(upsertPlayerToMasterList);

// Only hide seeded if explicitly enabled
if (RESPECT_SAVED_HIDDEN_SEEDED) {
  const hidden = loadHiddenIds();
  for (let i = players.length - 1; i >= 0; i--) {
    if (hidden.has(players[i].id)) players.splice(i, 1);
  }
}

// =======================
// 4) UTIL + PHOTO HELPERS (avatars w/ fallbacks)
// =======================
function formatPlayerName(p) {
  if (p.nickname && p.nickname.trim() !== "") {
    return `${p.firstName} “${p.nickname}” ${p.lastName}`;
  }
  return `${p.firstName} ${p.lastName}`;
}

function slugifyName(p){
  const f = (p.firstName||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-");
  const l = (p.lastName||"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-");
  return [f,l].filter(Boolean).join("-");
}

// Build a safe URL for the player's photo. Returns null if we should use initials.
function getPlayerPhotoURL(p){
  const raw = (p.photo || "").trim();

  // Absolute or root-relative paths -> use as is
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/") || raw.startsWith("./")) {
    return raw;
  }

  // If data contains "players/..." but base already is "images/players/", strip leading "players/"
  const cleaned = raw.replace(/^\/+/, "").replace(/^players\//i, "");

  // If we still have a filename, join with base
  if (cleaned) return PLAYER_PHOTO_BASE_PATH.replace(/\/+$/,"") + "/" + cleaned;

  // Try id.png, then slug.png (prefer .png by convention)
  if (p.id) return PLAYER_PHOTO_BASE_PATH + String(p.id) + ".png";
  const slug = slugifyName(p);
  if (slug) return PLAYER_PHOTO_BASE_PATH + slug + ".png";

  return null; // use initials fallback
}

function playerInitials(p){
  const f = (p.firstName||"").trim()[0] || "";
  const l = (p.lastName||"").trim()[0] || "";
  return (f + l).toUpperCase();
}

// Circular avatar: image if it loads, otherwise initials.
function renderAvatar(p, size=56){
  const wrap = document.createElement("div");
  wrap.className = "avatar";
  wrap.style.width = wrap.style.height = size + "px";
  wrap.style.borderRadius = "999px";
  wrap.style.display = "inline-grid";
  wrap.style.placeItems = "center";
  wrap.style.background = "#e9ecef";
  wrap.style.color = "#334155";
  wrap.style.fontWeight = "800";
  wrap.style.overflow = "hidden";
  wrap.style.boxShadow = "0 2px 10px rgba(0,0,0,.06)";

  const initials = document.createElement("span");
  initials.className = "avatar-initials";
  initials.textContent = playerInitials(p);
  wrap.appendChild(initials);

  const url = getPlayerPhotoURL(p);
  if (url){
    const img = new Image();
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = `${p.firstName||""} ${p.lastName||""}`.trim();
    img.src = url;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    img.addEventListener("error", ()=> {/* keep initials */});
    img.addEventListener("load", ()=> {
      wrap.innerHTML = "";
      wrap.appendChild(img);
    });
  } else {
    initials.style.fontSize = "clamp(12px, 40%, 16px)";
    initials.style.letterSpacing = ".04em";
  }
  return wrap;
}

// Ensure new signups without an explicit photo still get a sensible default filename guess
function attachPhotoIfMissing(p){
  if (p.photo && String(p.photo).trim()) return p;
  if (p.id) { p.photo = `${p.id}.png`; return p; }
  const slug = slugifyName(p);
  if (slug) { p.photo = `${slug}.png`; return p; } // prefer .png
  return p; // initials fallback
}
for (let i=0;i<players.length;i++){ players[i] = attachPhotoIfMissing(players[i]); }

// =======================
// 4b) TEAM COUNTS + FIELD SUMMARY (homepage widget)
// =======================
function computeTeamCounts() {
  const counts = {
    ozark: 0,
    valley: 0,
    other: 0,
    total: 0,
  };

  players.forEach(p => {
    const team = (p.team || "").toLowerCase();
    if (team === "ozark") counts.ozark++;
    else if (team === "valley") counts.valley++;
    else counts.other++;
    counts.total++;
  });

  return counts;
}

function renderTeamSummary() {
  const host = document.getElementById("teamSummary");
  if (!host) return; // homepage only

  const counts = computeTeamCounts();
  const MAX_PLAYERS = 24; // adjust as needed
  const remaining = Math.max(0, MAX_PLAYERS - counts.total);
  const pct = Math.max(0, Math.min(100, (counts.total / MAX_PLAYERS) * 100));

  const ozarkLabel = TEAM_LABELS?.ozark || "Team Ozark";
  const valleyLabel = TEAM_LABELS?.valley || "Team Valley";

  host.innerHTML = `
    <div class="team-summary-card">
      <h3>${ozarkLabel}</h3>
      <div class="count">${counts.ozark}</div>
      <div class="label">Players locked in</div>
      <div class="meta">Includes seeded players &amp; online signups.</div>
    </div>

    <div class="team-summary-card">
      <h3>${valleyLabel}</h3>
      <div class="count">${counts.valley}</div>
      <div class="label">Players locked in</div>
      <div class="meta">Captains can shift players later if needed.</div>
    </div>

    <div class="team-summary-card">
      <h3>Total Field</h3>
      <div class="count">${counts.total}</div>
      <div class="label">of ${MAX_PLAYERS} spots</div>
      <div class="team-progress">
        <div class="team-progress-inner" style="width:${pct}%;"></div>
      </div>
      <div class="meta">
        ${remaining > 0
          ? `${remaining} spots remaining.`
          : `Field is full (or over target).`}
      </div>
    </div>
  `;
}

// =======================
// 5) PLAYERS WHEEL (safe no-op if homepage doesn't have it)
// =======================
function makeWheelTile(p){
  const a = document.createElement("a");
  a.className = "wheel-item";
  a.dataset.team = (p.team||"").toLowerCase();
  a.href = "#teams";
  a.setAttribute("aria-label", formatPlayerName(p));

  const thumb = document.createElement("div");
  thumb.className = "wheel-thumb";
  thumb.appendChild(renderAvatar(p, 56));

  const nm = document.createElement("span");
  nm.className = "wheel-name";
  nm.textContent = formatPlayerName(p);

  const chip = document.createElement("span");
  chip.className = "wheel-chip " + a.dataset.team;
  chip.textContent = (a.dataset.team === "ozark" ? "Ozark" : "Valley");

  a.appendChild(thumb);
  a.appendChild(nm);
  a.appendChild(chip);
  return a;
}

function renderWheel(filter = "all") {
  const wheelTrack = document.getElementById("playerWheel");
  if (!wheelTrack) return; // page may not have the wheel

  const list = (filter === "all")
    ? players
    : players.filter(p => (p.team||"").toLowerCase() === filter);

  wheelTrack.innerHTML = "";
  list.forEach(p => wheelTrack.appendChild(makeWheelTile(p)));
  updateCenterGlow();
}

const teamButtons = document.querySelectorAll(".team-btn");
teamButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    teamButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderWheel(btn.dataset.team);
  });
});

// Prev/Next controls
(function(){
  const wheelTrack = document.getElementById('playerWheel');
  if (!wheelTrack) return;
  const btnPrev = document.querySelector('.player-wheel .prev');
  const btnNext = document.querySelector('.player-wheel .next');
  const ITEM_STEP = 3;

  const getStepWidth = () => {
    const item = wheelTrack?.querySelector('.wheel-item');
    if (!item) return 200;
    const cs = getComputedStyle(wheelTrack);
    const gap = parseFloat(cs.columnGap || cs.gap || 14);
    return item.offsetWidth + gap;
  };
  const scrollByItems = (n) => wheelTrack?.scrollBy({ left: getStepWidth() * n, behavior: 'smooth' });

  btnPrev?.addEventListener('click', ()=> scrollByItems(-ITEM_STEP));
  btnNext?.addEventListener('click', ()=> scrollByItems(+ITEM_STEP));
})();

// Drag-to-scroll
(function(){
  const wheelTrack = document.getElementById("playerWheel");
  if (!wheelTrack) return;
  let isDown=false, startX=0, startLeft=0;
  wheelTrack.addEventListener('pointerdown', e=>{ isDown=true; startX=e.clientX; startLeft=wheelTrack.scrollLeft; wheelTrack.setPointerCapture(e.pointerId); });
  wheelTrack.addEventListener('pointermove', e=>{ if(!isDown) return; wheelTrack.scrollLeft = startLeft - (e.clientX - startX); });
  wheelTrack.addEventListener('pointerup',   ()=>{ isDown=false; });
  wheelTrack.addEventListener('pointerleave',()=>{ isDown=false; });
})();

// Subtle center glow
function updateCenterGlow(){
  const wheelTrack = document.getElementById("playerWheel");
  if (!wheelTrack) return;
  const rect = wheelTrack.getBoundingClientRect();
  const centerX = rect.left + rect.width/2;
  const items = wheelTrack.querySelectorAll('.wheel-item');
  let best = null, bestDist = Infinity;
  items.forEach(el=>{
    const r = el.getBoundingClientRect();
    const mid = r.left + r.width/2;
    const d = Math.abs(centerX - mid);
    if (d < bestDist){ bestDist = d; best = el; }
    el.classList.remove('is-center');
  });
  if (best) best.classList.add('is-center');
}
let glowRAF=null;
function onWheelScroll(){
  if (glowRAF) cancelAnimationFrame(glowRAF);
  glowRAF = requestAnimationFrame(updateCenterGlow);
}
(function(){
  const wheelTrack = document.getElementById("playerWheel");
  if (wheelTrack){
    wheelTrack.addEventListener('scroll', onWheelScroll);
    window.addEventListener('resize', updateCenterGlow);
  }
})();

// Safe initial render AFTER DOM is ready (prevents "nothing shows" issues)
(function safeBootWheel(){
  const boot = () => {
    const activeTeam = document.querySelector(".team-btn.active")?.dataset.team || "all";
    renderWheel(activeTeam);   // no-op on pages without wheel
    renderTeamSummary();       // no-op on pages without #teamSummary
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();

// =======================
// 6) SIGNUP FORM (nickname + team + optional photo; submit via fetch; NO REDIRECT)
// =======================
(function () {
  const signupForm = document.getElementById("signupForm");
  const formMsg = document.getElementById("formMsg");
  if (!signupForm) return;

  // If the HTML still has action/method, we'll still prevent default and use fetch.
  const loadDupes = () => { try { return JSON.parse(localStorage.getItem(SIGNUPS_DUPE_KEY) || "[]"); } catch { return []; } };
  const saveDupes = (arr) => localStorage.setItem(SIGNUPS_DUPE_KEY, JSON.stringify(arr || []));
  const normalize = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

  const makeRow = (labelEl, inputEl) => {
    const row = document.createElement("div");
    row.className = "form-row";
    const full = document.createElement("div");
    full.className = "full";
    if (labelEl) full.appendChild(labelEl);
    if (inputEl) full.appendChild(inputEl);
    row.appendChild(full);
    return row;
  };
  const insertAfter = (newNode, refNode) => refNode.parentNode.insertBefore(newNode, refNode.nextSibling);

  const nameInput = signupForm.querySelector('#name,[name="name"]');
  const nameRow = nameInput ? nameInput.closest(".form-row") : null;
  const actionsRow = signupForm.querySelector(".actions");

  // Nickname (optional) – only inject if missing
  let nicknameInput = signupForm.querySelector('#nickname,[name="nickname"]');
  if (!nicknameInput) {
    const nnLabel = document.createElement("label");
    nnLabel.setAttribute("for", "nickname");
    nnLabel.textContent = "Nickname (optional)";
    nicknameInput = document.createElement("input");
    nicknameInput.type = "text";
    nicknameInput.id = "nickname";
    nicknameInput.name = "nickname";
    nicknameInput.placeholder = "e.g., Long Ball";
    const nnRow = makeRow(nnLabel, nicknameInput);
    if (nameRow) insertAfter(nnRow, nameRow); else if (actionsRow) signupForm.insertBefore(nnRow, actionsRow); else signupForm.appendChild(nnRow);
  }

  // Team (required) – only inject if missing
  let teamSelect = signupForm.querySelector('#signupTeam,[name="team"]');
  if (!teamSelect) {
    const tLabel = document.createElement("label");
    tLabel.setAttribute("for", "signupTeam");
    tLabel.textContent = "Team";
    teamSelect = document.createElement("select");
    teamSelect.id = "signupTeam";
    teamSelect.name = "team";
    teamSelect.required = true;

    const ph = document.createElement("option");
    ph.value = ""; ph.textContent = "Select a team…"; ph.disabled = true; ph.selected = true;
    teamSelect.appendChild(ph);

    Object.entries(TEAM_LABELS).forEach(([val, label]) => {
      const opt = document.createElement("option");
      opt.value = val; opt.textContent = label;
      teamSelect.appendChild(opt);
    });

    const tRow = makeRow(tLabel, teamSelect);
    const nnRow = signupForm.querySelector("#nickname")?.closest(".form-row");
    if (nnRow) insertAfter(tRow, nnRow); else if (nameRow) insertAfter(tRow, nameRow); else if (actionsRow) signupForm.insertBefore(tRow, actionsRow); else signupForm.appendChild(tRow);
  }

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🔒 prevent native submit/redirect
    formMsg?.classList.remove("error");

    const get = (sel) => (signupForm.querySelector(sel)?.value || "").trim();
    const rawName     = get('[name="name"]');
    const nickname    = get('[name="nickname"]');
    const selectedTeam= get('[name="team"]');
    const contact     = get('[name="email"]');
    const phone       = get('[name="phone"]');
    const handicap    = get('[name="handicap"]');
    const notes       = get('[name="notes"]');

    if (!rawName || !selectedTeam || !contact || !phone || !handicap || !notes) {
      formMsg && (formMsg.textContent = "Please complete all required fields.", formMsg.classList.add("error"));
      return;
    }

    const prior = loadDupes();
    const normalizeName = normalize(rawName);
    const isDupe = prior.some(p => p.name === normalizeName && p.email === normalize(contact));
    if (isDupe) {
      formMsg && (formMsg.textContent = "It looks like you've already signed up with this email.", formMsg.classList.add("error"));
      return;
    }

    const parts = rawName.split(" ").filter(Boolean);
    const firstName = parts[0];
    const lastName  = parts.length > 1 ? parts.slice(1).join(" ") : "—";

    // Build payload for Formspree (no redirect)
    const data = new FormData(signupForm);
    data.set("name", `${firstName} ${lastName}`);
    data.set("nickname", nickname || "—");
    data.set("team", selectedTeam);
    data.set("team_label", TEAM_LABELS[selectedTeam] || selectedTeam);
    data.set("_subject", "New Ozark Invitational signup");
    data.set("summary", `
Name: ${firstName} ${lastName}
Nickname: ${nickname || "—"}
Team: ${TEAM_LABELS[selectedTeam] || selectedTeam}
Handicap: ${handicap}
Email: ${contact}
Phone: ${phone}
Notes: ${notes}`.trim());

    // attach photo file if chosen (from <input type="file" id="photo">)
    const file = signupForm.querySelector('#photo')?.files?.[0];
    if (file) data.append('photo', file, file.name);

    // UX: show submitting
    formMsg && (formMsg.textContent = "Submitting...", formMsg.classList.remove("error"));

    try {
      const res = await fetch("https://formspree.io/f/xnnokdqb", {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: data
      });

      // Hard-stop any attempted redirect just in case
      if (res.redirected) window.stop();

      if (res.ok) {
        // remember this signup to prevent dupes
        prior.push({ name: normalizeName, email: normalize(contact), ts: Date.now() });
        localStorage.setItem(SIGNUPS_DUPE_KEY, JSON.stringify(prior));

        // Save a local copy (used by other pages; optional photo path hint)
        const playerObj = {
          id: (crypto?.randomUUID?.() || String(Date.now())),
          firstName, nickname: nickname || "", lastName,
          team: selectedTeam,
          photo: file ? `images/players/${slugifyName({firstName, lastName})}.png` : "",
          handicap: Number(handicap),
          notes, email: contact, phone
        };
        attachPhotoIfMissing(playerObj);

        const roster = loadSignupPlayers();
        roster.push(playerObj);
        saveSignupPlayers(roster);
        upsertPlayerToMasterList(playerObj);

        // If a wheel exists on this page, update it
        const activeTeam = document.querySelector(".team-btn.active")?.dataset.team || "all";
        renderWheel(activeTeam);
        renderTeamSummary();

        // Clear the form + reset team select placeholder
        signupForm.reset();
        const select = signupForm.querySelector('#signupTeam,[name="team"]');
        if (select) select.selectedIndex = 0;

        formMsg && (formMsg.textContent = "Thanks! Your signup has been submitted.", formMsg.classList.remove("error"));
      } else {
        let msg = "Something went wrong. Please try again.";
        try {
          const err = await res.json();
          if (err?.errors?.length) msg = err.errors.map(e => e.message).join(", ");
        } catch{}
        formMsg && (formMsg.textContent = msg, formMsg.classList.add("error"));
      }
    } catch {
      formMsg && (formMsg.textContent = "Network error. Please try again.", formMsg.classList.add("error"));
    }
  });
})();

// =======================
// 7) ADMIN: VIEW PLAYER POOL MODAL (+ CSV export)
// =======================
(function () {
  const poolBtn = document.getElementById("viewPoolBtn");
  const dlg = document.getElementById("poolDialog");
  if (!poolBtn || !dlg) return;

  const activeTableHost  = document.getElementById("activeRosterTable");
  const hiddenTableHost  = document.getElementById("hiddenSeededTable");
  const signupTableHost  = document.getElementById("signupTable");
  const activeCountEl    = document.getElementById("activeCount");
  const hiddenCountEl    = document.getElementById("hiddenCount");
  const signupCountEl    = document.getElementById("signupCount");
  const exportBtn        = document.getElementById("exportCSV");

  const n = (s) => String(s || "").trim();
  const teamLabel = (t) => (TEAM_LABELS && TEAM_LABELS[t]) ? TEAM_LABELS[t] : t || "";
  const fullName = (p) => p ? (p.nickname ? `${p.firstName} “${p.nickname}” ${p.lastName}` : `${p.firstName} ${p.lastName}`) : "";

  function readHiddenIds() {
    try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_PLAYERS_KEY) || "[]")); }
    catch { return new Set(); }
  }
  function readSignups() {
    try { return JSON.parse(localStorage.getItem(SIGNUPS_ROSTER_KEY) || "[]"); }
    catch { return []; }
  }

  function tableHTML(rows) {
    if (!rows.length) return `<div class="empty muted" style="padding:0.6rem 0.4rem;">No entries</div>`;
    const heads = Object.keys(rows[0]);
    return `
      <table>
        <thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.map(r => `<tr>${heads.map(h => `<td>${n(r[h])}</td>`).join("")}</tr>`).join("")}
        </tbody>
      </table>
    `;
  }

  function buildActiveRows() {
    return players.map(p => ({
      id: p.id,
      name: fullName(p),
      team: teamLabel(p.team),
      handicap: p.handicap ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      // include photo path in exports/tables
      photo: (p.photo ? (PLAYER_PHOTO_BASE_PATH.replace(/\/+$/,"") + "/" + p.photo.replace(/^\/+/, "").replace(/^players\//i,"")) : (slugifyName(p) ? `images/players/${slugifyName(p)}.png` : ""))
    }));
  }

  function buildHiddenRows() {
    const ids = readHiddenIds();
    const byId = new Map((SEEDED_PLAYERS || []).map(p => [p.id, p]));
    const rows = [];
    ids.forEach(id => {
      const p = byId.get(id);
      rows.push({
        id,
        name: p ? fullName(p) : "(seeded player)",
        team: p ? teamLabel(p.team) : ""
      });
    });
    return rows;
  }

  function buildSignupRows() {
    const arr = readSignups();
    return arr.map(p => ({
      id: p.id,
      name: fullName(p),
      team: teamLabel(p.team),
      handicap: p.handicap ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      photo: p.photo ? p.photo : (slugifyName(p) ? `images/players/${slugifyName(p)}.png` : "")
    }));
  }

  function renderPool() {
    const act = buildActiveRows();
    const hid = buildHiddenRows();
    const sig = buildSignupRows();

    if (activeTableHost) activeTableHost.innerHTML = tableHTML(act);
    if (hiddenTableHost) hiddenTableHost.innerHTML = tableHTML(hid);
    if (signupTableHost) signupTableHost.innerHTML = tableHTML(sig);

    if (activeCountEl) activeCountEl.textContent = String(act.length);
    if (hiddenCountEl) hiddenCountEl.textContent = String(hid.length);
    if (signupCountEl) signupCountEl.textContent = String(sig.length);
  }

  function exportActiveCSV() {
    const rows = buildActiveRows();
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(",")]
      .concat(rows.map(r => headers.map(h => {
        const v = String(r[h] ?? "");
        return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(",")))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ozark_active_roster.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  poolBtn.addEventListener("click", () => {
    try { renderPool(); } catch {}
    if (typeof dlg.showModal === "function") dlg.showModal();
    else alert("Active roster count: " + players.length);
  });

  if (exportBtn) exportBtn.addEventListener("click", exportActiveCSV);
})();

// =======================
// 8) SHARED SNAPSHOT BRIDGE (Scoreboard/Scorecard/Leaderboard)
// =======================
(function(){
  function safeParse(json){
    try { return JSON.parse(json); } catch { return null; }
  }
  function readSharedSnapshot(){
    const raw = localStorage.getItem(SHARED_KEY);
    return safeParse(raw);
  }
  function writeSharedSnapshot(partial){
    const cur = readSharedSnapshot() || {};
    const merged = {
      ...cur,
      ...partial,
      format: { ...(cur.format||{}), ...(partial.format||{}) },
      groups: { ...(cur.groups||{}), ...(partial.groups||{}) },
      results:{ ...(cur.results||{}), ...(partial.results||{}) },
      dates:  { ...(cur.dates||{}),   ...(partial.dates||{})   },
      ts: Date.now()
    };
    localStorage.setItem(SHARED_KEY, JSON.stringify(merged));
    try {
      window.dispatchEvent(new StorageEvent('storage', { key: SHARED_KEY, newValue: JSON.stringify(merged) }));
    } catch {}
    return merged;
  }
  window.OZARK = Object.freeze({ readSharedSnapshot, writeSharedSnapshot, SHARED_KEY });
  const snap = readSharedSnapshot();
  if (!snap) writeSharedSnapshot({ eventName: "Ozark Invitational" });
})();

// =======================
// 9) FEATURED PLAYERS (homepage random snapshot)
// =======================
(function () {
  const grid = document.getElementById("featuredGrid");
  if (!grid || !Array.isArray(players)) return; // only runs on homepage

  const FEATURED_COUNT = 6; // how many players to show

  function shuffleCopy(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function makeFeaturedCard(p) {
    const card = document.createElement("article");
    card.className = "player-card featured";

    const header = document.createElement("div");
    header.className = "pc-header";

    const avatar = renderAvatar(p, 56);
    avatar.classList.add("pc-avatar");

    const meta = document.createElement("div");
    meta.className = "pc-meta";

    const nameEl = document.createElement("div");
    nameEl.className = "pc-name";
    nameEl.textContent = formatPlayerName(p);

    const subEl = document.createElement("div");
    subEl.className = "pc-sub";

    const parts = [];
    if (p.team) {
      const t = (p.team || "").toLowerCase();
      parts.push(
        t === "ozark" ? "Team Ozark" :
        t === "valley" ? "Team Valley" :
        p.team
      );
    }
    if (p.handicap !== undefined && p.handicap !== null && p.handicap !== "") {
      parts.push(`Hcp ${p.handicap}`);
    }
    subEl.textContent = parts.join(" • ");

    meta.appendChild(nameEl);
    meta.appendChild(subEl);

    header.appendChild(avatar);
    header.appendChild(meta);
    card.appendChild(header);

    return card;
  }

  function renderFeatured() {
    grid.innerHTML = ""; // clear "Loading..." text

    // Only show players assigned to a team
    const eligible = players.filter(p => (p.team || "").trim() !== "");
    if (!eligible.length) {
      grid.innerHTML = `<p class="muted">No players to show yet.</p>`;
      return;
    }

    const shuffled = shuffleCopy(eligible);
    const chosen = shuffled.slice(0, Math.min(FEATURED_COUNT, shuffled.length));

    chosen.forEach(p => {
      grid.appendChild(makeFeaturedCard(p));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderFeatured, { once: true });
  } else {
    renderFeatured();
  }
})();
