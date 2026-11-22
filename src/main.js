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
  // The lines of /exemple/amal/ and the second each one starts in recit-fr.mp3 (generator phraseStarts).
  const chapters = [
    ["La bonne nouvelle", [[0, "Tu es née le jeudi douze février, à l’aube."], [2.928, "Il neigeait sur Lyon."], [4.584, "Nous t’avons accueillie à la maternité de la Croix-Rousse."]]],
    ["Nos vœux", [[8.352, "Puisses-tu longtemps entendre la même comptine que Sami, cinq ans, te chante le soir."]]],
    ["Le sens de son prénom", [[13.56, "En arabe, notre choix signifie l’espérance."]]],
    ["Son prénom", [[17.472, "Notre fille née à l’aube s’appelle…"], [20.88, "Amal"]]],
    ["Avec tout notre amour", [[22.512, "Bienvenue, Amal."], [24.24, "Mamie Fatima avait terminé ton bonnet jaune la veille de ta naissance."]]],
  ];
  const chapterLabel = document.querySelector("[data-chapter-label]");
  const chapterNumber = document.querySelector("[data-chapter-number]");
  const chapterPhrase = document.querySelector("[data-chapter-phrase]");
  const bars = document.querySelectorAll("[data-chapter-bar]");
  const updateProgress = () => {
    const time = audio.currentTime;
    const end = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : Infinity;
    const starts = chapters.map(([, lines]) => lines[0][0]);
    let index = 0;
    while (index + 1 < chapters.length && starts[index + 1] <= time) index++;
    const lines = chapters[index][1];
    chapterLabel.textContent = chapters[index][0];
    chapterNumber.textContent = `${index + 1} / ${chapters.length}`;
    chapterPhrase.textContent = lines.filter(([start]) => start <= time).at(-1)?.[1] ?? lines[0][1];
    bars.forEach((bar, i) => {
      const from = starts[i], to = starts[i + 1] ?? end;
      bar.style.width = `${Math.max(0, Math.min(1, (time - from) / (to - from))) * 100}%`;
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
