import "./styles.css";

const interestForm = document.querySelector("[data-interest-form]");
const interestSuccess = document.querySelector("[data-interest-success]");
if (interestForm && interestSuccess) {
  const { email, consent, website } = interestForm.elements;
  const error = interestForm.querySelector("[data-interest-error]");
  const button = interestForm.querySelector('button[type="submit"]');
  const messages = {
    email: "Cette adresse ne semble pas complète.",
    consent: "Cochez la case pour que nous puissions vous écrire.",
    server: "Votre demande n'a pas pu être enregistrée. Réessayez dans un moment.",
    rate: "Trop de demandes. Réessayez dans une heure.",
  };
  interestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (button.disabled) return;
    error.textContent = "";
    email.removeAttribute("aria-invalid");
    consent.removeAttribute("aria-invalid");
    const showError = (kind) => {
      error.textContent = messages[kind];
      if (kind === "email" || kind === "consent") {
        const field = kind === "email" ? email : consent;
        field.setAttribute("aria-invalid", "true");
        field.focus();
      }
    };
    if (!email.value.trim() || !email.validity.valid) return showError("email");
    if (!consent.checked) return showError("consent");
    button.disabled = true;
    try {
      const response = await fetch('/interest/subscribe', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.value.trim(), consent: true, website: website.value, source: 'landing' }),
      });
      if (response.status === 429) return showError("rate");
      const result = await response.json().catch(() => ({}));
      if (response.status === 200 && result.ok === true) {
        interestForm.hidden = true;
        interestSuccess.hidden = false;
        interestSuccess.focus();
      } else if (response.status === 400 && (result.error === "email" || result.error === "consent")) {
        showError(result.error);
      } else showError("server");
    } catch {
      showError("server");
    } finally {
      button.disabled = false;
    }
  });
}

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
  const chapters = [
    ["Une nouvelle présence", "Sa présence emplit déjà nos jours de tendresse."],
    ["Pour les jours à venir", "Nous lui souhaitons une vie entourée d’amour et de sérénité."],
    ["Avec tout notre amour", "Bienvenue Amal, notre petite lumière."],
  ];
  const chapterLabel = document.querySelector("[data-chapter-label]");
  const chapterNumber = document.querySelector("[data-chapter-number]");
  const chapterPhrase = document.querySelector("[data-chapter-phrase]");
  const bars = document.querySelectorAll("[data-chapter-bar]");
  const updateProgress = () => {
    const progress = Number.isFinite(audio.duration) && audio.duration > 0
      ? Math.max(0, Math.min(1, audio.currentTime / audio.duration)) : 0;
    const index = Math.min(2, Math.floor(progress * 3));
    chapterLabel.textContent = chapters[index][0];
    chapterNumber.textContent = `${index + 1} / 3`;
    chapterPhrase.textContent = chapters[index][1];
    bars.forEach((bar, i) => {
      bar.style.width = `${Math.max(0, Math.min(1, progress * 3 - i)) * 100}%`;
    });
  };

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
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("loadedmetadata", updateProgress);
  audio.addEventListener("play", () => render(true));
  audio.addEventListener("pause", () => render(false));
  audio.addEventListener("ended", () => {
    audio.currentTime = 0;
    updateProgress();
    render(false);
  });
}
