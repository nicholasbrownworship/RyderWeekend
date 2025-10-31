// =======================
// 0. CONFIG (easy to edit)
// =======================
const TEAM_LABELS = {
  ozark: "Team Ozark",
  valley: "Team Valley",
};

// If you put all your headshots in /images, you can just write "nick.jpg"
const PLAYER_PHOTO_BASE_PATH = "images/";

// prefix for localStorage keys
const PAIRING_STORAGE_PREFIX = "ozarkPairings_";

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
// 4. ROUNDS (no carts / no fixed pairings)
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
// 6. RANDOM PAIRING UTILS (LOCKED)
// =======================

// shuffle
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// build matches in pairs
function createRandomPairingsFromPlayers(playerList) {
  const shuffled = shuffleArray(playerList);
  const matches = [];
  let i = 0;
  while (i < shuffled.length - 1) {
    matches.push([shuffled[i].id, shuffled[i + 1].id]); // store IDs so it survives reloads
    i += 2;
  }
  const leftoverId = shuffled.length % 2 === 1 ? shuffled[shuffled.length - 1].id : null;
  return { matches, leftoverId };
}

// save to localStorage
function savePairings(roundId, data) {
  const key = PAIRING_STORAGE_PREFIX + roundId;
  localStorage.setItem(key, JSON.stringify(data));
}

// load from localStorage
function loadPairings(roundId) {
  const key = PAIRING_STORAGE_PREFIX + roundId;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// OPTIONAL: helper to clear one round (run in console)
// clearPairings("round-1");
window.clearPairings = function (roundId) {
  const key = PAIRING_STORAGE_PREFIX + roundId;
  localStorage.removeItem(key);
  console.log("Cleared pairings for", roundId);
};

// =======================
// 7. RENDER ROUNDS / USE LOCKED PAIRINGS
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

  // 1. try to load existing pairings
  let pairingData = loadPairings(roundId);

  // 2. if none, create and store
  if (!pairingData) {
    pairingData = createRandomPairingsFromPlayers(players);
    savePairings(roundId, pairingData);
  }

  // events list
  const eventsHtml = round.events
    .map(
      (ev) => `
      <div class="event-card">
        <h3>${ev.name}</h3>
        <p class="muted">${ev.format}</p>
      </div>
    `
    )
    .join("");

  // render matches
  const pairingsHtml = pairingData.matches
    .map((pair, idx) => {
      const p1 = getPlayerById(pair[0]);
      const p2 = getPlayerById(pair[1]);
      const p1Photo = p1 ? getPlayerPhotoUrl(p1) : "";
      const p2Photo = p2 ? getPlayerPhotoUrl(p2) : "";
      const p1Team = p1 ? (TEAM_LABELS[p1.team] ?? p1.team) : "";
      const p2Team = p2 ? (TEAM_LABELS[p2.team] ?? p2.team) : "";

      return `
        <li class="pairing-item">
          <strong>Match ${idx + 1}:</strong>
          <div class="pairing-players">
            <div class="pairing-player">
              ${p1Photo ? `<img src="${p1Photo}" alt="${p1 && formatPlayerName(p1)}" class="round-photo" />` : ""}
              <span>${p1 ? formatPlayerName(p1) : "Unknown"}</span>
              <small>${p1Team}</small>
            </div>
            <span class="vs">vs</span>
            <div class="pairing-player">
              ${p2Photo ? `<img src="${p2Photo}" alt="${p2 && formatPlayerName(p2)}" class="round-photo" />` : ""}
              <span>${p2 ? formatPlayerName(p2) : "Unknown"}</span>
              <small>${p2Team}</small>
            </div>
          </div>
        </li>
      `;
    })
    .join("");

  const leftover =
    pairingData.leftoverId ? getPlayerById(pairingData.leftoverId) : null;

  const leftoverHtml = leftover
    ? `
      <div class="leftover-box">
        <p><strong>Unpaired this round:</strong> ${formatPlayerName(leftover)} (${TEAM_LABELS[leftover.team] ?? leftover.team})</p>
      </div>
    `
    : "";

  roundContent.innerHTML = `
    <div class="round-layout">
      <div>
        <h2 class="subhead">Events in this round</h2>
        <div class="event-grid">
          ${eventsHtml}
        </div>
        <h2 class="subhead">Pairings (locked)</h2>
        <p class="muted">These were randomized the first time this round was opened and saved in your browser.</p>
        <ul class="pairings-list">
          ${pairingsHtml || "<li>No pairings created.</li>"}
        </ul>
        ${leftoverHtml}
      </div>
    </div>
  `;
}

renderRoundTabs();
if (rounds.length > 0) {
  renderRoundContent(rounds[0].id);
}

// =======================
// 8. SPONSORS
// =======================
const sponsors = [
  { name: "Sponsor 1", tier: "Hole Sponsor" },
  { name: "Sponsor 2", tier: "Lunch Sponsor" },
  { name: "Sponsor 3", tier: "Prize Sponsor" },
];

const sponsorGrid = document.getElementById("sponsorGrid");
if (sponsorGrid) {
  sponsorGrid.innerHTML = "";
  sponsors.forEach((s) => {
    const div = document.createElement("div");
    div.className = "sponsor-card";
    div.innerHTML = `<div>${s.name}</div><small>${s.tier}</small>`;
    sponsorGrid.appendChild(div);
  });
}

// =======================
// 9. SIGNUP FORM (static-site friendly)
// =======================
const signupForm = document.getElementById("signupForm");
const formMsg = document.getElementById("formMsg");

if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(signupForm);
    const rawName = (data.get("name") || "").trim();
    const contact = (data.get("email") || "").trim();
    const handicap = (data.get("handicap") || "").trim();
    const notes = (data.get("notes") || "").trim();

    if (!rawName) {
      formMsg.textContent = "Please enter a name.";
      return;
    }

    const parts = rawName.split(" ").filter(Boolean);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "—";

    const playerId = `signup-${Date.now()}`;
    const playerObj = {
      id: playerId,
      firstName: firstName,
      nickname: "",
      lastName: lastName,
      team: "valley", // default
      photo: "",
      handicap: handicap ? Number(handicap) : null,
      notes: notes || (contact ? `Contact: ${contact}` : "Signed up via form"),
    };

    const formatted = `{
  id: "${playerObj.id}",
  firstName: "${playerObj.firstName}",
  nickname: "",
  lastName: "${playerObj.lastName}",
  team: "${playerObj.team}",
  photo: "",
  ${playerObj.handicap !== null ? `handicap: ${playerObj.handicap},` : ""}
  notes: "${playerObj.notes.replace(/"/g, '\\"')}"
},`;

    formMsg.textContent = "Sign-up captured! Scroll to copy the code below.";

    let codeBox = document.getElementById("signupCodeBox");
    if (!codeBox) {
      codeBox = document.createElement("pre");
      codeBox.id = "signupCodeBox";
      codeBox.style.background = "#1a1a1a";
      codeBox.style.color = "#fff";
      codeBox.style.padding = "1rem";
      codeBox.style.borderRadius = "12px";
      codeBox.style.marginTop = "0.75rem";
      codeBox.style.whiteSpace = "pre-wrap";
      signupForm.parentElement.appendChild(codeBox);
    }
    codeBox.textContent = `// paste this into your players[] in script.js\n${formatted}`;

    const subject = encodeURIComponent("New Ozark Invitational signup");
    const body = encodeURIComponent(
      `New signup for Ozark Invitational:\n\n${formatted}\n\nAdd this to players[] in script.js.`
    );

    window.location.href = `mailto:nick@example.com?subject=${subject}&body=${body}`;

    signupForm.reset();
  });
}
