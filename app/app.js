const ROUNDS_KEY = "ozarkApp_rounds_v1";

document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  setupHome();
  setupScorecard();
  loadRounds();
  registerServiceWorker();
});

/* NAV BETWEEN SCREENS */

function setupNav() {
  const navButtons = document.querySelectorAll(".bottom-nav button");
  const screens = document.querySelectorAll(".screen");

  function showScreen(name) {
    screens.forEach(s => s.classList.remove("active"));
    const target = document.getElementById("screen-" + name);
    if (target) target.classList.add("active");
  }

  navButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.screen;
      showScreen(target);
    });
  });

  // Buttons inside content that jump screens
  document.querySelectorAll("[data-screen-jump]").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.screenJump;
      showScreen(target);
    });
  });
}

/* HOME SCREEN */

function setupHome() {
  const el = document.getElementById("todayText");
  if (!el) return;

  const now = new Date();
  const options = { weekday: "long", month: "short", day: "numeric" };
  const dateStr = now.toLocaleDateString(undefined, options);

  el.textContent = `It's ${dateStr}. Great day to play a round.`;
}

/* SCORECARD + SAVE */

function setupScorecard() {
  const inputs = document.querySelectorAll(".score-input");
  const totalEl = document.getElementById("scoreTotal");
  const saveBtn = document.getElementById("saveRoundBtn");
  const statusEl = document.getElementById("saveStatus");

  if (!inputs.length || !totalEl || !saveBtn) return;

  function recalcTotal() {
    let total = 0;
    let hasAny = false;
    inputs.forEach(input => {
      const v = parseInt(input.value, 10);
      if (!isNaN(v)) {
        hasAny = true;
        total += v;
      }
    });
    totalEl.textContent = hasAny ? total : "—";
  }

  inputs.forEach(input => {
    input.addEventListener("input", recalcTotal);
  });

  saveBtn.addEventListener("click", () => {
    const course = document.getElementById("courseSelect").value;
    const tees = document.getElementById("teesSelect").value;

    const scores = [];
    let filledCount = 0;

    inputs.forEach(input => {
      const hole = parseInt(input.dataset.hole, 10);
      const v = parseInt(input.value, 10);
      if (!isNaN(v)) {
        filledCount++;
        scores.push({ hole, score: v });
      }
    });

    if (filledCount === 0) {
      statusEl.textContent = "Enter at least one hole score before saving.";
      statusEl.style.color = "#b91c1c";
      return;
    }

    const total = scores.reduce((sum, s) => sum + s.score, 0);

    const round = {
      id: Date.now(),
      date: new Date().toISOString(),
      course,
      tees,
      total,
      holesFilled: filledCount
    };

    const rounds = loadRoundsFromStorage();
    rounds.unshift(round);
    saveRoundsToStorage(rounds);

    // Reset UI
    inputs.forEach(i => (i.value = ""));
    recalcTotal();

    statusEl.textContent = "Round saved to this device.";
    statusEl.style.color = "#166534";

    // Refresh rounds screen
    renderRounds(rounds);
  });
}

/* STORAGE HELPERS */

function loadRoundsFromStorage() {
  try {
    const raw = localStorage.getItem(ROUNDS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to read rounds from storage", e);
    return [];
  }
}

function saveRoundsToStorage(rounds) {
  try {
    localStorage.setItem(ROUNDS_KEY, JSON.stringify(rounds));
  } catch (e) {
    console.error("Failed to save rounds", e);
  }
}

/* ROUNDS SCREEN */

function loadRounds() {
  const rounds = loadRoundsFromStorage();
  renderRounds(rounds);
}

function renderRounds(rounds) {
  const list = document.getElementById("roundsList");
  if (!list) return;

  list.innerHTML = "";

  if (!rounds.length) {
    const p = document.createElement("p");
    p.className = "muted small";
    p.textContent = "No rounds saved yet. Start one from the Scorecard tab.";
    list.appendChild(p);
    return;
  }

  rounds.forEach(round => {
    const card = document.createElement("div");
    card.className = "round-card";

    const title = document.createElement("div");
    title.className = "round-title";

    const date = new Date(round.date);
    const dateStr = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });

    title.textContent = `${round.course} – ${round.total}`;

    const meta = document.createElement("div");
    meta.className = "round-meta";
    meta.textContent = `${dateStr} • ${round.tees} tees • ${round.holesFilled} holes`;

    card.appendChild(title);
    card.appendChild(meta);

    list.appendChild(card);
  });
}

/* SERVICE WORKER */

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(err => {
      console.warn("SW registration failed", err);
    });
  }
}
