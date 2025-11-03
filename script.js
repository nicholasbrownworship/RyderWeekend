// =======================
// 0. CONFIG
// =======================
const TEAM_LABELS = {
  ozark: "Team Ozark",
  valley: "Team Valley",
  // add/rename teams here; the sign-up dropdown + UI will update automatically
};
const PLAYER_PHOTO_BASE_PATH = "images/";
const PAIRING_STORAGE_PREFIX = "ozarkPairings_"; // we'll add round+event to this

// =======================
// SIGNUP PERSISTENCE
// =======================
const SIGNUPS_KEY = "ozarkSignups_v1";

function loadSignupPlayers() {
  try {
    const raw = localStorage.getItem(SIGNUPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveSignupPlayers(arr) {
  localStorage.setItem(SIGNUPS_KEY, JSON.stringify(arr || []));
}
function upsertPlayerToMasterList(p) {
  // avoid duplicates by id or by (name+email)
  const exists = players.some(x =>
    x.id === p.id ||
    (x.firstName.toLowerCase() === p.firstName.toLowerCase() &&
     x.lastName.toLowerCase() === p.lastName.toLowerCase() &&
     (p.email ? (x.notes||"").toLowerCase().includes(p.email.toLowerCase()) : false))
  );
  if (!exists) players.push(p);
}


// =======================
// 1. NAV TOGGLE (mobile)
// =======================
const navToggle = document.getElementById("navToggle");
const nav = document.querySelector(".nav");

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

// =======================
// 2. SCHEDULE TABS (Day 1 / Day 2)
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
// 3. MASTER PLAYER LIST
// =======================
const players = [
  {
    id: "1",
    firstName: "Nick",
    nickname: "Frenzy",
    lastName: "Brown",
    team: "ozark",
    photo: "nick.jpg",
    handicap: 10,
    notes: "Organizer / TD"
  },
  {
    id: "2",
    firstName: "Barry",
    nickname: "Aim Right",
    lastName: "Brown",
    team: "ozark",
    photo: "dad.jpg",
    handicap: 14,
    notes: "OG"
  },
  {
    id: "3",
    firstName: "Joshua",
    nickname: "Long Ball",
    lastName: "Brown",
    team: "valley",
    photo: "brother1.jpg",
    handicap: 6,
    notes: "Long hitter"
  },
  {
    id: "4",
    firstName: "Matthew",
    nickname: "Hands",
    lastName: "Brown",
    team: "valley",
    photo: "brother2.jpg",
    handicap: 12,
    notes: "Short game guy"
  },
  // add more players here
  
];

// Pull prior signups from localStorage into players[]
const _savedSignups = loadSignupPlayers();
_savedSignups.forEach(upsertPlayerToMasterList);


function formatPlayerName(p) {
  if (p.nickname && p.nickname.trim() !== "") {
    return `${p.firstName} "${p.nickname}" ${p.lastName}`;
  }
  return `${p.firstName} ${p.lastName}`;
}

function getPlayerPhotoUrl(p) {
  if (!p.photo) return "";
  if (p.photo.startsWith("http") || p.photo.startsWith("./") || p.photo.startsWith("/")) {
    return p.photo;
  }
  return PLAYER_PHOTO_BASE_PATH + p.photo;
}

// =======================
// 4. ROUNDS
// (2 events per round -> 2 pairings per round)
// =======================
const rounds = [
  {
    id: "round-1",
    title: "Round 1 – Saturday AM",
    events: [
      { name: "Best Ball (Front 9)", format: "Best Ball" },
      { name: "2-Man Scramble (Back 9)", format: "Scramble" },
    ],
  },
  {
    id: "round-2",
    title: "Round 2 – Saturday PM",
    events: [
      { name: "Alternate Shot (Front 9)", format: "Alt Shot" },
      { name: "Singles (Back 9)", format: "Singles" },
    ],
  },
];

// =======================
// 5. RENDER PLAYERS
// =======================
const playerList = document.getElementById("playerList");
const teamButtons = document.querySelectorAll(".team-btn");

function renderPlayers(filter = "all") {
  if (!playerList) return;
  playerList.innerHTML = "";

  let filtered = players;
  if (filter !== "all") {
    filtered = players.filter((p) => p.team === filter);
  }

  filtered.forEach((p) => {
    const card = document.createElement("div");
    card.className = "player-card";

    const photoUrl = getPlayerPhotoUrl(p);
    const teamLabel = TEAM_LABELS[p.team] ?? p.team;
    const statText =
      p.handicap != null
        ? `Handicap: ${p.handicap}`
        : p.averageScore != null
        ? `Avg score: ${p.averageScore}`
        : "—";

    card.innerHTML = `
      <div class="player-top">
        ${
          photoUrl
            ? `<img src="${photoUrl}" alt="${formatPlayerName(p)}" class="player-photo" />`
            : `<div class="player-photo placeholder">${p.firstName[0]}${p.lastName[0]}</div>`
        }
        <div class="player-head">
          <span class="badge">${teamLabel}</span>
          <h3>${formatPlayerName(p)}</h3>
          <p class="muted">${statText}</p>
        </div>
      </div>
      ${p.notes ? `<p class="player-notes">${p.notes}</p>` : ""}
    `;
    playerList.appendChild(card);
  });
}

renderPlayers();

teamButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    teamButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderPlayers(btn.dataset.team);
  });
});

// =======================
// 6. RANDOM PAIRING (LOCKED PER ROUND + PER EVENT)
// =======================
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createRandomPairingsFromPlayers(playerList) {
  const shuffled = shuffleArray(playerList);
  const matches = [];
  let i = 0;
  while (i < shuffled.length - 1) {
    matches.push([shuffled[i].id, shuffled[i + 1].id]);
    i += 2;
  }
  const leftoverId = shuffled.length % 2 === 1 ? shuffled[shuffled.length - 1].id : null;
  return { matches, leftoverId };
}

// key looks like: ozarkPairings_round-1_0  (0 = front 9, 1 = back 9)
function storageKeyFor(roundId, eventIndex) {
  return `${PAIRING_STORAGE_PREFIX}${roundId}_${eventIndex}`;
}

function savePairings(roundId, eventIndex, data) {
  localStorage.setItem(storageKeyFor(roundId, eventIndex), JSON.stringify(data));
}

function loadPairings(roundId, eventIndex) {
  const raw = localStorage.getItem(storageKeyFor(roundId, eventIndex));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// for you only (re-roll)
/*
window._ozarkClearPairings = function (roundId, eventIndex) {
  localStorage.removeItem(storageKeyFor(roundId, eventIndex));
  console.log("Cleared pairings for", roundId, "event", eventIndex);
};
*/

// =======================
// 7. RENDER ROUNDS + BOTH EVENTS' PAIRINGS
// =======================
const roundTabs = document.getElementById("roundTabs");
const roundContent = document.getElementById("roundContent");

function renderRoundTabs() {
  if (!roundTabs) return;
  roundTabs.innerHTML = "";
  rounds.forEach((r, idx) => {
    const btn = document.createElement("button");
    btn.className = `tab-btn ${idx === 0 ? "active" : ""}`;
    btn.dataset.round = r.id;
    btn.textContent = r.title;
    btn.addEventListener("click", () => {
      roundTabs.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderRoundContent(r.id);
    });
    roundTabs.appendChild(btn);
  });
}

function renderRoundContent(roundId) {
  if (!roundContent) return;
  const round = rounds.find((r) => r.id === roundId);
  if (!round) {
    roundContent.innerHTML = "<p>No round found.</p>";
    return;
  }

  // we'll build 2 blocks: one for each event (front 9, back 9)
  const eventBlocksHtml = round.events
    .map((ev, evIndex) => {
      // load or create pairings for THIS event
      let pairingData = loadPairings(roundId, evIndex);
      if (!pairingData) {
        pairingData = createRandomPairingsFromPlayers(players);
        savePairings(roundId, evIndex, pairingData);
      }

      const pairingsHtml = pairingData.matches
        .map((pair, idx) => {
          const p1 = players.find((p) => p.id === pair[0]);
          const p2 = players.find((p) => p.id === pair[1]);
          return `
            <li class="pairing-item">
              <div class="pairing-title">Match ${idx + 1}</div>
              <div class="pairing-players">
                <div class="pairing-player">
                  ${p1 && getPlayerPhotoUrl(p1) ? `<img src="${getPlayerPhotoUrl(p1)}" alt="${formatPlayerName(p1)}" class="round-photo" />` : ""}
                  <div>
                    <div class="name">${p1 ? formatPlayerName(p1) : "Unknown"}</div>
                    <div class="team">${p1 ? (TEAM_LABELS[p1.team] ?? p1.team) : ""}</div>
                  </div>
                </div>
                <div class="vs">vs</div>
                <div class="pairing-player">
                  ${p2 && getPlayerPhotoUrl(p2) ? `<img src="${getPlayerPhotoUrl(p2)}" alt="${formatPlayerName(p2)}" class="round-photo" />` : ""}
                  <div>
                    <div class="name">${p2 ? formatPlayerName(p2) : "Unknown"}</div>
                    <div class="team">${p2 ? (TEAM_LABELS[p2.team] ?? p2.team) : ""}</div>
                  </div>
                </div>
              </div>
            </li>
          `;
        })
        .join("");

      const leftover =
        pairingData.leftoverId ? players.find((p) => p.id === pairingData.leftoverId) : null;
      const leftoverHtml = leftover
        ? `<div class="leftover-box"><strong>Unpaired this 9:</strong> ${formatPlayerName(leftover)} (${TEAM_LABELS[leftover.team] ?? leftover.team})</div>`
        : "";

      return `
        <section class="event-block">
          <h3 class="subhead">${ev.name}</h3>
          <p class="muted">${ev.format}</p>
          <ul class="pairings-list">
            ${pairingsHtml || "<li>No pairings created.</li>"}
          </ul>
          ${leftoverHtml}
        </section>
      `;
    })
    .join("");

  roundContent.innerHTML = `
    <div class="round-layout">
      <div>
        ${eventBlocksHtml}
      </div>
    </div>
  `;
}

renderRoundTabs();
if (rounds.length > 0) {
  renderRoundContent(rounds[0].id);
}

// =======================
// 9. SIGNUP FORM (force-inject nickname + team, Formspree, dupes) — SAFE
// =======================
(function () {
  const signupForm = document.getElementById("signupForm");
  const formMsg = document.getElementById("formMsg");
  const FORMSPREE_URL = "https://formspree.io/f/xnnokdqb";
  if (!signupForm) return;

  // --- helpers (dupe tracking) ---
  const SIGNUPS_KEY = "ozarkSignups_v1";
  const loadSignups = () => {
    try { return JSON.parse(localStorage.getItem(SIGNUPS_KEY) || "[]"); } catch { return []; }
  };
  const saveSignups = (arr) => localStorage.setItem(SIGNUPS_KEY, JSON.stringify(arr || []));
  const normalize = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

  // --- small DOM helpers that match your CSS structure (.form-row > .full) ---
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

  // --- anchors for placement ---
  const nameInput = signupForm.querySelector('#name,[name="name"]');
  const nameRow = nameInput ? nameInput.closest(".form-row") : null;
  const actionsRow = signupForm.querySelector(".actions");

  // --- ensure Nickname (optional) ---
  let nicknameInput = signupForm.querySelector('#nickname,[name="nickname"]');
  if (!nicknameInput) {
    const nnLabel = document.createElement("label");
    nnLabel.setAttribute("for", "nickname");
    nnLabel.textContent = "Nickname (optional)";
    nicknameInput = document.createElement("input");
    nicknameInput.type = "text";
    nicknameInput.id = "nickname";
    nicknameInput.name = "nickname";
    nicknameInput.placeholder = "e.g., Long Ball"; // optional
    const nnRow = makeRow(nnLabel, nicknameInput);
    if (nameRow) insertAfter(nnRow, nameRow);
    else if (actionsRow) signupForm.insertBefore(nnRow, actionsRow);
    else signupForm.appendChild(nnRow);
  }

  // --- ensure Team (required dropdown) ---
  let teamSelect = signupForm.querySelector('#signupTeam,[name="team"]');
  if (!teamSelect) {
    const tLabel = document.createElement("label");
    tLabel.setAttribute("for", "signupTeam");
    tLabel.textContent = "Team";
    teamSelect = document.createElement("select");
    teamSelect.id = "signupTeam";
    teamSelect.name = "team";
    teamSelect.required = true;

    // placeholder
    const ph = document.createElement("option");
    ph.value = ""; ph.textContent = "Select a team…"; ph.disabled = true; ph.selected = true;
    teamSelect.appendChild(ph);

    // populate from TEAM_LABELS (safe if undefined)
    if (typeof TEAM_LABELS === "object" && TEAM_LABELS) {
      Object.entries(TEAM_LABELS).forEach(([val, label]) => {
        const opt = document.createElement("option");
        opt.value = val; opt.textContent = label;
        teamSelect.appendChild(opt);
      });
    }
    const tRow = makeRow(tLabel, teamSelect);
    const nnRow = signupForm.querySelector("#nickname")?.closest(".form-row");
    if (nnRow) insertAfter(tRow, nnRow);
    else if (nameRow) insertAfter(tRow, nameRow);
    else if (actionsRow) signupForm.insertBefore(tRow, actionsRow);
    else signupForm.appendChild(tRow);
  }

  // --- submit handler (Formspree + dupes) ---
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (formMsg) formMsg.classList.remove("error");

    const get = (sel) => (signupForm.querySelector(sel)?.value || "").trim();

    const rawName     = get('[name="name"]');
    const nickname    = get('[name="nickname"]'); // optional
    const selectedTeam= get('[name="team"]');     // required
    const contact     = get('[name="email"]');    // required
    const phone       = get('[name="phone"]');    // required
    const handicap    = get('[name="handicap"]'); // required
    const notes       = get('[name="notes"]');    // required

    if (!rawName || !selectedTeam || !contact || !phone || !handicap || !notes) {
      if (formMsg) { formMsg.textContent = "Please complete all required fields."; formMsg.classList.add("error"); }
      return;
    }

    // dupe by normalized Full Name + Email
    const prior = loadSignups();
    const isDupe = prior.some(p => p.name === normalize(rawName) && p.email === normalize(contact));
    if (isDupe) {
      if (formMsg) { formMsg.textContent = "It looks like you've already signed up with this email."; formMsg.classList.add("error"); }
      return;
    }

    const parts = rawName.split(" ").filter(Boolean);
    const firstName = parts[0];
    const lastName  = parts.length > 1 ? parts.slice(1).join(" ") : "—";

    let teamLabel = selectedTeam;
    if (typeof TEAM_LABELS === "object" && TEAM_LABELS && TEAM_LABELS[selectedTeam]) {
      teamLabel = TEAM_LABELS[selectedTeam];
    }

    const data = new FormData(signupForm);
    data.set("name", `${firstName} ${lastName}`);
    data.set("nickname", nickname || "—");
    data.set("team", selectedTeam);
    data.set("team_label", teamLabel);
    data.set("email", contact);
    data.set("phone", phone);
    data.set("handicap", handicap);
    data.set("notes", notes);
    data.set("_subject", "New Ozark Invitational signup");

    const summary = `
Name: ${firstName} ${lastName}
Nickname: ${nickname || "—"}
Team: ${teamLabel}
Handicap: ${handicap}
Email: ${contact}
Phone: ${phone}
Notes: ${notes}`.trim();
    data.set("summary", summary);

    try {
      const res = await fetch("https://formspree.io/f/xnnokdqb", {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: data
      });

      if (res.ok) {
        // store dedupe key
        prior.push({ name: normalize(rawName), email: normalize(contact), ts: Date.now() });
        saveSignups(prior);

        if (formMsg) { formMsg.textContent = "Thanks! Your signup has been submitted."; formMsg.classList.remove("error"); }
        signupForm.reset();

        // restore team options after reset
        const select = signupForm.querySelector('[name="team"]');
        if (select) {
          select.innerHTML = "";
          const ph2 = document.createElement("option");
          ph2.value = ""; ph2.textContent = "Select a team…"; ph2.disabled = true; ph2.selected = true;
          select.appendChild(ph2);
          if (typeof TEAM_LABELS === "object" && TEAM_LABELS) {
            Object.entries(TEAM_LABELS).forEach(([val, label]) => {
              const opt = document.createElement("option");
              opt.value = val; opt.textContent = label;
              select.appendChild(opt);
            });
          }
        }
      } else {
        let msg = "Something went wrong. Please try again.";
        try {
          const err = await res.json();
          if (err?.errors?.length) msg = err.errors.map(e => e.message).join(", ");
        } catch (_) {}
        if (formMsg) { formMsg.textContent = msg; formMsg.classList.add("error"); }
      }
    } catch (err) {
      if (formMsg) { formMsg.textContent = "Network error. Please try again."; formMsg.classList.add("error"); }
    }
  });

  // 🔁 Safety: if your roster didn't render yet for any reason, try to render it
  if (typeof renderPlayers === "function") {
    const activeTeam = document.querySelector(".team-btn.active")?.dataset.team || "all";
    try { renderPlayers(activeTeam); } catch {}
  }
})();
