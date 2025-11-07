// =======================
// 0) CONFIG
// =======================
const TEAM_LABELS = { ozark: "Team Ozark", valley: "Team Valley" };
const PLAYER_PHOTO_BASE_PATH = "images/";
const RESPECT_SAVED_HIDDEN_SEEDED = false; // <— OFF so hard-coded players always render

// Storage keys
const SIGNUPS_ROSTER_KEY = "ozarkSignupsRoster_v1";
const SIGNUPS_DUPE_KEY   = "ozarkSignupsDupes_v1";
const HIDDEN_PLAYERS_KEY = "ozarkHiddenPlayers_v1";

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
const navToggle = document.getElementById("navToggle");
const nav = document.querySelector(".nav");
if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

// =======================
// 2) SCHEDULE TABS
// =======================
const scheduleTabButtons = document.querySelectorAll(".tab-btn[data-day]");
const scheduleDays = document.querySelectorAll(".schedule-day");
scheduleTabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    scheduleTabButtons.forEach((b) => b.classList.remove("active"));
    scheduleDays.forEach((d) => d.classList.remove("active"));
    btn.classList.add("active");
    const dayId = btn.dataset.day;
    const dayEl = document.getElementById(dayId);
    if (dayEl) dayEl.classList.add("active");
  });
});

// =======================
// 3) MASTER PLAYER LIST (seeded + signups)
// =======================
const players = [
  { id: "1", firstName: "Nick",    nickname: "Gamer",     lastName: "Brown",   team: "ozark",  photo: "nick.jpg",     handicap: 15, notes: "Tech guy" },
  { id: "2", firstName: "Barry",   nickname: "Aim Right", lastName: "Brown",   team: "ozark",  photo: "dad.jpg",      handicap: 18, notes: "OG" },
  { id: "3", firstName: "Joshua",  nickname: "Long Ball", lastName: "Brown",   team: "valley", photo: "josh.jpg",     handicap: 11, notes: "Long hitter" },
  { id: "4", firstName: "Matthew", nickname: "Hands",     lastName: "Brown",   team: "valley", photo: "matt.jpg",     handicap: 10, notes: "Short game guy" },
  { id: "5", firstName: "Brian",   nickname: "Bri-Ri",    lastName: "Ramirez", team: "ozark",  photo: "brian.jpg.",   handicap: 25, notes: "Summerscam" },
  { id: "6", firstName: "Ryan",    nickname: "Pastor",    lastName: "Puls",    team: "valley", photo: "ryan.jpg",     handicap: 16, notes: "Glue guy" },
  { id: "7", firstName: "Kenny",   nickname: "Sherriff",  lastName: "Deyoung", team: "valley", photo: "kenny.jpg",    handicap: 7,  notes: "Cat scratch fever" },
  { id: "8", firstName: "Riley",   nickname: "Caveman",   lastName: "Shelton", team: "ozark",  photo: "riley.jpg",    handicap: 13, notes: "Insane game" },

  // add more players here
];

const SEEDED_PLAYERS = players.slice();

// Load saved signups
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
// 4) UTIL
// =======================
function formatPlayerName(p) {
  if (p.nickname && p.nickname.trim() !== "") {
    return `${p.firstName} “${p.nickname}” ${p.lastName}`;
  }
  return `${p.firstName} ${p.lastName}`;
}
function getPlayerPhotoUrl(p) {
  if (!p.photo) return "images/default-player.jpg";
  if (p.photo.startsWith("http") || p.photo.startsWith("./") || p.photo.startsWith("/")) return p.photo;
  return PLAYER_PHOTO_BASE_PATH + p.photo;
}

// =======================
// 5) PLAYERS WHEEL
// =======================
const wheelTrack = document.getElementById("playerWheel");
const teamButtons = document.querySelectorAll(".team-btn");

function toWheelModel(p) {
  return { name: formatPlayerName(p), team: (p.team || "").toLowerCase(), photo: getPlayerPhotoUrl(p) };
}

function renderWheel(filter = "all") {
  if (!wheelTrack) return;
  const list = (filter === "all") ? players : players.filter(p => p.team === filter);
  wheelTrack.innerHTML = list.map(toWheelModel).map(p => `
    <a class="wheel-item" data-team="${p.team}" href="#teams" aria-label="${p.name}">
      <div class="wheel-thumb">
        <img src="${p.photo}" alt="${p.name}" loading="lazy" decoding="async">
      </div>
      <span class="wheel-name">${p.name}</span>
      <span class="wheel-chip ${p.team}">${p.team === 'ozark' ? 'Ozark' : 'Valley'}</span>
    </a>
  `).join('');
  updateCenterGlow();
}

teamButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    teamButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderWheel(btn.dataset.team);
  });
});

// Prev/Next controls
(function(){
  const btnPrev = document.querySelector('.player-wheel .prev');
  const btnNext = document.querySelector('.player-wheel .next');
  const ITEM_STEP = 3;

  const getStepWidth = () => {
    const item = wheelTrack?.querySelector('.wheel-item');
    if (!item) return 200;
    const gap = parseFloat(getComputedStyle(wheelTrack).columnGap || getComputedStyle(wheelTrack).gap || 14);
    return item.offsetWidth + gap;
  };
  const scrollByItems = (n) => wheelTrack?.scrollBy({ left: getStepWidth() * n, behavior: 'smooth' });

  btnPrev?.addEventListener('click', ()=> scrollByItems(-ITEM_STEP));
  btnNext?.addEventListener('click', ()=> scrollByItems(+ITEM_STEP));
})();

// Drag-to-scroll
(function(){
  if (!wheelTrack) return;
  let isDown=false, startX=0, startLeft=0;
  wheelTrack.addEventListener('pointerdown', e=>{ isDown=true; startX=e.clientX; startLeft=wheelTrack.scrollLeft; wheelTrack.setPointerCapture(e.pointerId); });
  wheelTrack.addEventListener('pointermove', e=>{ if(!isDown) return; wheelTrack.scrollLeft = startLeft - (e.clientX - startX); });
  wheelTrack.addEventListener('pointerup',   ()=>{ isDown=false; });
  wheelTrack.addEventListener('pointerleave',()=>{ isDown=false; });
})();

// Subtle center glow
function updateCenterGlow(){
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
function onWheelScroll(){ if (glowRAF) cancelAnimationFrame(glowRAF); glowRAF = requestAnimationFrame(updateCenterGlow); }
wheelTrack?.addEventListener('scroll', onWheelScroll);
window.addEventListener('resize', updateCenterGlow);

// Initial render
renderWheel("all");

// =======================
// 6) SIGNUP FORM (inject nickname + team; add to roster; refresh wheel)
// =======================
(function () {
  const signupForm = document.getElementById("signupForm");
  const formMsg = document.getElementById("formMsg");
  if (!signupForm) return;

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

  // Nickname (optional)
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

  // Team (required)
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

  // Submit handler
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (formMsg) formMsg.classList.remove("error");

    const get = (sel) => (signupForm.querySelector(sel)?.value || "").trim();
    const rawName     = get('[name="name"]');
    const nickname    = get('[name="nickname"]');
    const selectedTeam= get('[name="team"]');
    const contact     = get('[name="email"]');
    const phone       = get('[name="phone"]');
    const handicap    = get('[name="handicap"]');
    const notes       = get('[name="notes"]');

    if (!rawName || !selectedTeam || !contact || !phone || !handicap || !notes) {
      if (formMsg) { formMsg.textContent = "Please complete all required fields."; formMsg.classList.add("error"); }
      return;
    }

    const prior = loadDupes();
    const normalizeName = normalize(rawName);
    const isDupe = prior.some(p => p.name === normalizeName && p.email === normalize(contact));
    if (isDupe) {
      if (formMsg) { formMsg.textContent = "It looks like you've already signed up with this email."; formMsg.classList.add("error"); }
      return;
    }

    const parts = rawName.split(" ").filter(Boolean);
    const firstName = parts[0];
    const lastName  = parts.length > 1 ? parts.slice(1).join(" ") : "—";

    const data = new FormData(signupForm);
    data.set("name", `${firstName} ${lastName}`);
    data.set("nickname", nickname || "—");
    data.set("team", selectedTeam);
    data.set("team_label", TEAM_LABELS[selectedTeam] || selectedTeam);
    data.set("email", contact);
    data.set("phone", phone);
    data.set("handicap", handicap);
    data.set("notes", notes);
    data.set("_subject", "New Ozark Invitational signup");
    data.set("summary", `
Name: ${firstName} ${lastName}
Nickname: ${nickname || "—"}
Team: ${TEAM_LABELS[selectedTeam] || selectedTeam}
Handicap: ${handicap}
Email: ${contact}
Phone: ${phone}
Notes: ${notes}`.trim());

    try {
      const res = await fetch("https://formspree.io/f/xnnokdqb", {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: data
      });

      if (res.ok) {
        prior.push({ name: normalizeName, email: normalize(contact), ts: Date.now() });
        saveDupes(prior);

        const playerObj = {
          id: (crypto?.randomUUID?.() || String(Date.now())),
          firstName, nickname: nickname || "", lastName,
          team: selectedTeam,
          photo: "",
          handicap: Number(handicap),
          notes, email: contact, phone
        };

        const roster = loadSignupPlayers();
        roster.push(playerObj);
        saveSignupPlayers(roster);

        upsertPlayerToMasterList(playerObj);

        const activeTeam = document.querySelector(".team-btn.active")?.dataset.team || "all";
        renderWheel(activeTeam);

        if (formMsg) { formMsg.textContent = "Thanks! Your signup has been submitted."; formMsg.classList.remove("error"); }
        signupForm.reset();

        // repopulate team options (keeps placeholder selected)
        const select = signupForm.querySelector('[name="team"]');
        if (select) {
          select.innerHTML = "";
          const ph2 = document.createElement("option");
          ph2.value = ""; ph2.textContent = "Select a team…"; ph2.disabled = true; ph2.selected = true;
          select.appendChild(ph2);
          Object.entries(TEAM_LABELS).forEach(([val, label]) => {
            const opt = document.createElement("option");
            opt.value = val; opt.textContent = label;
            select.appendChild(opt);
          });
        }
      } else {
        let msg = "Something went wrong. Please try again.";
        try { const err = await res.json(); if (err?.errors?.length) msg = err.errors.map(e => e.message).join(", "); } catch {}
        if (formMsg) { formMsg.textContent = msg; formMsg.classList.add("error"); }
      }
    } catch {
      if (formMsg) { formMsg.textContent = "Network error. Please try again."; formMsg.classList.add("error"); }
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
      phone: p.phone ?? ""
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
      phone: p.phone ?? ""
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
