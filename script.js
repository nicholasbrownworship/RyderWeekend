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
    // remove active from all
    scheduleTabButtons.forEach((b) => b.classList.remove("active"));
    scheduleDays.forEach((d) => d.classList.remove("active"));
    // activate this one
    btn.classList.add("active");
    const dayId = btn.dataset.day;
    const dayEl = document.getElementById(dayId);
    if (dayEl) dayEl.classList.add("active");
  });
});

// =======================
// 3. MASTER PLAYER LIST
//    (edit this for your family)
// =======================
const players = [
  {
    id: "nick-brown",
    firstName: "Nick",
    nickname: "Frenzy",
    lastName: "Brown",
    team: "ozark",
    photo: "images/nick.jpg", // put your real path
    handicap: 10,
    notes: "Organizer / TD"
  },
  {
    id: "dad-brown",
    firstName: "James",
    nickname: "",
    lastName: "Brown",
    team: "ozark",
    photo: "images/dad.jpg",
    handicap: 14,
    notes: "OG • must ride"
  },
  {
    id: "brother-1",
    firstName: "Ethan",
    nickname: "",
    lastName: "Brown",
    team: "valley",
    photo: "images/brother1.jpg",
    handicap: 6,
    notes: "Long hitter"
  },
  {
    id: "brother-2",
    firstName: "Caleb",
    nickname: "",
    lastName: "Brown",
    team: "valley",
    photo: "images/brother2.jpg",
    handicap: 12,
    notes: "Short game guy"
  },
  {
    id: "cousin-mike",
    firstName: "Mike",
    nickname: "",
    lastName: "Carter",
    team: "ozark",
    photo: "",
    handicap: 18,
    notes: "New this year"
  },
];

// convenience
function formatPlayerName(p) {
  if (p.nickname && p.nickname.trim() !== "") {
    return `${p.firstName} "${p.nickname}" ${p.lastName}`;
  }
  return `${p.firstName} ${p.lastName}`;
}

// =======================
// 4. ROUNDS / CARTS / PAIRINGS
//    (edit this when you want to move people)
// =======================
const rounds = [
  {
    id: "round-1",
    title: "Round 1 – Saturday AM",
    events: [
      { name: "Best Ball (Front 9)", format: "Best Ball" },
      { name: "2-Man Scramble (Back 9)", format: "Scramble" },
    ],
    carts: [
      {
        cartId: "Cart 1",
        playerIds: ["nick-brown", "dad-brown"],
      },
      {
        cartId: "Cart 2",
        playerIds: ["brother-1", "brother-2"],
      },
      {
        cartId: "Cart 3",
        playerIds: ["cousin-mike"],
      },
    ],
    pairings: [
      {
        match: "Match 1",
        playerIds: ["nick-brown", "brother-1"],
      },
      {
        match: "Match 2",
        playerIds: ["dad-brown", "brother-2"],
      },
    ],
  },
  {
    id: "round-2",
    title: "Round 2 – Saturday PM",
    events: [
      { name: "Alternate Shot (Front 9)", format: "Alt Shot" },
      { name: "Singles (Back 9)", format: "Singles" },
    ],
    carts: [
      {
        cartId: "Cart 1",
        playerIds: ["nick-brown", "brother-2"],
      },
      {
        cartId: "Cart 2",
        playerIds: ["dad-brown", "cousin-mike"],
      },
    ],
    pairings: [
      {
        match: "Match 1",
        playerIds: ["nick-brown", "dad-brown"],
      },
      {
        match: "Match 2",
        playerIds: ["brother-1", "brother-2"],
      },
    ],
  },
];

// helper to find a player
function getPlayerById(id) {
  return players.find((p) => p.id === id);
}

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
    card.innerHTML = `
      <div class="player-top">
        ${
          p.photo
            ? `<img src="${p.photo}" alt="${formatPlayerName(p)}" class="player-photo" />`
            : `<div class="player-photo placeholder">${p.firstName[0]}${p.lastName[0]}</div>`
        }
        <div class="player-head">
          <span class="badge">${p.team === "ozark" ? "Team Ozark" : "Team Valley"}</span>
          <h3>${formatPlayerName(p)}</h3>
          <p class="muted">Handicap: ${p.handicap ?? "—"}</p>
        </div>
      </div>
      ${
        p.notes
          ? `<p class="player-notes">${p.notes}</p>`
          : ""
      }
    `;
    playerList.appendChild(card);
  });
}

// initial render
renderPlayers();

// team filter buttons
teamButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    teamButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    renderPlayers(btn.dataset.team);
  });
});

// =======================
// 6. RENDER ROUNDS / CARTS / PAIRINGS
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
      // clear active
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

  // carts
  const cartsHtml = round.carts
    .map((cart) => {
      const cartPlayers = cart.playerIds
        .map((pid) => {
          const p = getPlayerById(pid);
          if (!p) return `<li>Unknown player (${pid})</li>`;
          return `<li>
            ${p.photo ? `<img src="${p.photo}" alt="${formatPlayerName(p)}" class="round-photo" />` : ""}
            <span>${formatPlayerName(p)}</span>
            <small>${p.team === "ozark" ? "Ozark" : "Valley"}</small>
          </li>`;
        })
        .join("");
      return `
        <div class="cart-card">
          <h3>${cart.cartId}</h3>
          <ul>${cartPlayers}</ul>
        </div>
      `;
    })
    .join("");

  // pairings
  const pairingsHtml = round.pairings
    .map((pair) => {
      const listed = pair.playerIds
        .map((pid) => {
          const p = getPlayerById(pid);
          return p ? formatPlayerName(p) : pid;
        })
        .join(" vs ");
      return `<li><strong>${pair.match}:</strong> ${listed}</li>`;
    })
    .join("");

  roundContent.innerHTML = `
    <div class="round-layout">
      <div>
        <h2 class="subhead">Events in this round</h2>
        <div class="event-grid">
          ${eventsHtml}
        </div>
        <h2 class="subhead">Pairings</h2>
        <ul class="pairings-list">
          ${pairingsHtml || "<li>No pairings set.</li>"}
        </ul>
      </div>
      <div>
        <h2 class="subhead">Carts</h2>
        <div class="cart-grid">
          ${cartsHtml || "<p>No carts assigned.</p>"}
        </div>
      </div>
    </div>
  `;
}

renderRoundTabs();
if (rounds.length > 0) {
  renderRoundContent(rounds[0].id);
}

// =======================
// 7. SPONSORS
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
// 8. SIGNUP FORM
// =======================
const signupForm = document.getElementById("signupForm");
const formMsg = document.getElementById("formMsg");

if (signupForm) {
  signupForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(signupForm);
    const name = data.get("name");
    formMsg.textContent = `Thanks, ${name || "player"}! We'll confirm your spot.`;
    signupForm.reset();
    setTimeout(() => {
      formMsg.textContent = "";
    }, 6000);
  });
}
