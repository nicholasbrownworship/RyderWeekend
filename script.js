// =======================
// 0. CONFIG (easy to edit)
// =======================
const TEAM_LABELS = {
  ozark: "Team Ozark",
  valley: "Team Valley",
};

// If you put all your headshots in /images, you can just write "nick.jpg"
const PLAYER_PHOTO_BASE_PATH = "images/";

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
    id: "1",
    firstName: "Nick",
    nickname: "Frenzy",
    lastName: "Brown",
    team: "ozark",
    photo: "nick.jpg", // now you can just write the filename
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

// convenience
function formatPlayerName(p) {
  if (p.nickname && p.nickname.trim() !== "") {
    return `${p.firstName} "${p.nickname}" ${p.lastName}`;
  }
  return `${p.firstName} ${p.lastName}`;
}

// turn "nick.jpg" into "images/nick.jpg"
function getPlayerPhotoUrl(p) {
  if (!p.photo) return "";
  // if they already gave you a path or URL, just use it
  if (p.photo.startsWith("http") || p.photo.startsWith("./") || p.photo.startsWith("/")) {
    return p.photo;
  }
  return PLAYER_PHOTO_BASE_PATH + p.photo;
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
        playerIds: ["1", "3"],
      },
      {
        cartId: "Cart 2",
        playerIds: ["2", "4"],
      },
      
    ],
    pairings: [
      {
        match: "Match 1",
        playerIds: ["1", "3"],
      },
      {
        match: "Match 2",
        playerIds: ["2", "4"],
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
        playerIds: ["1", "3"],
      },
      {
        cartId: "Cart 2",
        playerIds: ["2", "4"],
      },
    ],
    pairings: [
      {
        match: "Match 1",
        playerIds: ["1", "2"],
      },
      {
        match: "Match 2",
        playerIds: ["3", "4"],
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

    const photoUrl = getPlayerPhotoUrl(p);
    const teamLabel = TEAM_LABELS[p.team] ?? p.team;

    // show handicap OR average score, whichever you filled in
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
          const photoUrl = getPlayerPhotoUrl(p);
          const teamLabel = TEAM_LABELS[p.team] ?? p.team;
          return `<li>
            ${photoUrl ? `<img src="${photoUrl}" alt="${formatPlayerName(p)}" class="round-photo" />` : ""}
            <span>${formatPlayerName(p)}</span>
            <small>${teamLabel}</small>
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
// 8. SIGNUP FORM (static-site friendly)
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

    // split name
    const parts = rawName.split(" ").filter(Boolean);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "—";

    // build the object in the exact format your script uses
    const playerId = `signup-${Date.now()}`;
    const playerObj = {
      id: playerId,
      firstName: firstName,
      nickname: "",
      lastName: lastName,
      team: "valley", // or "ozark" — change default
      photo: "",
      handicap: handicap ? Number(handicap) : null,
      notes: notes || (contact ? `Contact: ${contact}` : "Signed up via form"),
    };

    // show the user the JS they can paste
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

    // put it in (or create) a code box
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

    // also open an email draft with it
    const subject = encodeURIComponent("New Ozark Invitational signup");
    const body = encodeURIComponent(
      `New signup for Ozark Invitational:\n\n${formatted}\n\nAdd this to players[] in script.js.`
    );
    // change this to your real email
    window.location.href = `mailto:nick@example.com?subject=${subject}&body=${body}`;

    signupForm.reset();
  });
}

