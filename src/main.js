import "./styles.css";

const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");

if (year) year.textContent = String(new Date().getFullYear());

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const listen = document.querySelector("[data-listen]");
const audio = document.querySelector("[data-example-audio]");

if (listen && audio) {
  const label = listen.querySelector("[data-listen-label]");
  const icon = listen.querySelector("[data-listen-icon]");
  const idleLabel = label.textContent;

  const render = (playing) => {
    listen.setAttribute("aria-pressed", String(playing));
    label.textContent = playing ? "Pause" : idleLabel;
    icon.textContent = playing ? "❚❚" : "▶";
  };

  listen.addEventListener("click", async () => {
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch {
      render(false);
    }
  });
  audio.addEventListener("play", () => render(true));
  audio.addEventListener("pause", () => render(false));
  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    render(false);
  });
}
