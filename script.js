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
// 9. SIGNUP FORM (nickname + team dropdown + phone) + duplicate protection
// =======================
const signupForm = document.getElementById("signupForm");
const formMsg = document.getElementById("formMsg");
const FORMSPREE_URL = "https://formspree.io/f/xnnokdqb";

// ---- Duplicate tracking (localStorage) ----
const SIGNUPS_KEY = "ozarkSignups_v1";
function loadSignups() {
  try {
    const raw = localStorage.getItem(SIGNUPS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveSignups(arr) {
  localStorage.setItem(SIGNUPS_KEY, JSON.stringify(arr || []));
}
function normalizeNameEmail(name, email) {
  return {
    normName: String(name || "").toLowerCase().replace(/\s+/g, " ").trim(),
    normEmail: String(email || "").toLowerCase().trim(),
  };
}

// --- Build/ensure fields: nickname + team dropdown ---
(function ensureSignupFields() {
  if (!signupForm) return;

  let nameInput = signupForm.querySelector('[name="name"]');
  let nicknameInput = signupForm.querySelector('[name="nickname"]');
  let teamSelect = signupForm.querySelector('[name="team"]');

  // Create nickname input if missing (optional)
  if (!nicknameInput) {
    const nnLabel = document.createElement("label");
    nnLabel.setAttribute("for", "nickname");
    nnLabel.textContent = "Nickname (optional)";
    nicknameInput = document.createElement("input");
    nicknameInput.type = "text";
    nicknameInput.name = "nickname";
    nicknameInput.id = "nickname";
    nicknameInput.placeholder = "e.g., Long Ball";
    nicknameInput.required = false; // ✅ optional

    if (nameInput && nameInput.parentElement) {
      nameInput.parentElement.insertAdjacentElement("afterend", nnLabel);
      nnLabel.insertAdjacentElement("afterend", nicknameInput);
    } else {
      signupForm.prepend(nicknameInput);
      signupForm.prepend(nnLabel);
    }
  }

  // Create team dropdown if missing
  if (!teamSelect) {
    const label = document.createElement("label");
    label.setAttribute("for", "signupTeam");
    label.textContent = "Team";
    teamSelect = document.createElement("select");
    teamSelect.name = "team";
    teamSelect.id = "signupTeam";
    teamSelect.required = true;
    populateTeamDropdown(teamSelect);

    if (nicknameInput && nicknameInput.parentElement) {
      nicknameInput.insertAdjacentElement("afterend", label);
      label.insertAdjacentElement("afterend", teamSelect);
    } else {
      signupForm.prepend(teamSelect);
      signupForm.prepend(label);
    }
  } else {
    populateTeamDropdown(teamSelect);
  }
})();

function populateTeamDropdown(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  Object.entries(TEAM_LABELS).forEach(([value, label]) => {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    selectEl.appendChild(opt);
  });
}

if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(signupForm);

    const rawName   = (data.get("name")     || "").trim();
    const nickname  = (data.get("nickname") || "").trim();       // optional
    const selectedTeam = (data.get("team")  || "").trim();
    const contact   = (data.get("email")    || "").trim();
    const phone     = (data.get("phone")    || "").trim();
    const handicap  = (data.get("handicap") || "").trim();
    const notes     = (data.get("notes")    || "").trim();

    if (formMsg) formMsg.classList.remove("error");

    // ✅ Validate required fields (nickname excluded)
    if (!rawName || !selectedTeam || !contact || !phone || !handicap || !notes) {
      if (formMsg) {
        formMsg.textContent = "Please complete all required fields.";
        formMsg.classList.add("error");
      }
      return;
    }

    // ✅ Duplicate protection: same normalized full name + email
    const { normName, normEmail } = normalizeNameEmail(rawName, contact);
    const prior = loadSignups();
    const isDupe = prior.some(p => p.normName === normName && p.normEmail === normEmail);
    if (isDupe) {
      if (formMsg) {
        formMsg.textContent = "It looks like you've already signed up with this email. If you need to make a change, reply to your confirmation email.";
        formMsg.classList.add("error");
      }
      return;
    }

    // Prepare pretty fields
    const parts = rawName.split(" ").filter(Boolean);
    const firstName = parts[0];
    const lastName  = parts.length > 1 ? parts.slice(1).join(" ") : "—";
    const teamLabel = TEAM_LABELS[selectedTeam] ?? selectedTeam;

    // Normalize payload for Formspree
    data.set("name", `${firstName} ${lastName}`);
    data.set("nickname", nickname || "—");
    data.set("team", selectedTeam);     // key
    data.set("team_label", teamLabel);  // human label
    data.set("handicap", handicap);
    data.set("email", contact);
    data.set("phone", phone);
    data.set("notes", notes);
    data.set("_subject", "New Ozark Invitational signup");

    const formatted = `
Name: ${firstName} ${lastName}
Nickname: ${nickname || "—"}
Team: ${teamLabel}
Handicap: ${handicap}
Email: ${contact}
Phone: ${phone}
Notes: ${notes}`.trim();
    data.set("summary", formatted);

    try {
      const res = await fetch(FORMSPREE_URL, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: data
      });

      if (res.ok) {
        // Save this signup locally so future attempts are flagged as duplicate
        prior.push({
          normName,
          normEmail,
          ts: Date.now(),
          display: { firstName, lastName, email: contact }
        });
        saveSignups(prior);

        if (formMsg) {
          formMsg.textContent = "Thanks! Your signup has been submitted.";
          formMsg.classList.remove("error");
        }
        signupForm.reset();

        // Re-populate team options after reset (autofill quirks)
        const teamSelect = signupForm.querySelector('[name="team"]');
        if (teamSelect) populateTeamDropdown(teamSelect);
      } else {
        let msg = "Something went wrong. Please try again.";
        try {
          const err = await res.json();
          if (err?.errors?.length) msg = err.errors.map(e => e.message).join(", ");
        } catch (_) {}
        if (formMsg) {
          formMsg.textContent = msg;
          formMsg.classList.add("error");
        }
      }
    } catch (err) {
      if (formMsg) {
        formMsg.textContent = "Network error. Please try again.";
        formMsg.classList.add("error");
      }
    }
  });
}


(function autoFormatPhone() {
  const phoneInput = document.getElementById("phone");
  if (!phoneInput) return;
  phoneInput.addEventListener("input", () => {
    const digits = phoneInput.value.replace(/\D/g, "").slice(0, 10);
    const parts = [];
    if (digits.length > 0) parts.push("(" + digits.slice(0,3));
    if (digits.length >= 4) parts[0] += ") " + digits.slice(3,6);
    if (digits.length >= 7) parts[0] += "-" + digits.slice(6,10);
    phoneInput.value = parts[0] || "";
  });
})();
