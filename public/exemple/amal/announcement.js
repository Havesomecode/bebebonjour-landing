(() => {
  const panels = Array.from(document.querySelectorAll('[data-language-panel]'));
  const links = Array.from(document.querySelectorAll('[data-language]'));
  const select = (language) => {
    panels.forEach((panel) => {
      const active = panel.dataset.languagePanel === language;
      panel.hidden = !active;
      if (!active) panel.querySelector('audio')?.pause();
    });
    links.forEach((link) => link.setAttribute('aria-current', String(link.dataset.language === language)));
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  };
  links.forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); select(link.dataset.language); }));
  panels.forEach((panel) => {
    const audio = panel.querySelector('audio');
    if (!audio) return;
    const button = panel.querySelector('[data-play]');
    const error = panel.querySelector('[data-audio-error]');
    button.addEventListener('click', async () => {
      if (!audio.paused) { audio.pause(); return; }
      error.hidden = true;
      try { await audio.play(); } catch { error.hidden = false; }
    });
    audio.addEventListener('play', () => button.setAttribute('aria-pressed', 'true'));
    ['pause', 'ended'].forEach((event) => audio.addEventListener(event, () => button.setAttribute('aria-pressed', 'false')));
    audio.addEventListener('error', () => { error.hidden = false; button.setAttribute('aria-pressed', 'false'); });
  });
  if (panels.length > 1) {
    const requested = location.hash.replace('#story-', '');
    select(panels.some((panel) => panel.dataset.languagePanel === requested) ? requested : panels[0].dataset.languagePanel);
  }
})();
