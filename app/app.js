document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".bottom-nav button");
  const screens = document.querySelectorAll(".screen");

  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.screen;

      screens.forEach(s => s.classList.remove("active"));
      document.getElementById("screen-" + target).classList.add("active");
    });
  });

  // Register service worker if supported
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js");
  }
});
