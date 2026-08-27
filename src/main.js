import "./styles.css";

const header = document.querySelector("[data-header]");
const year = document.querySelector("[data-year]");

if (year) year.textContent = String(new Date().getFullYear());

function updateHeader() {
  header?.classList.toggle("is-scrolled", window.scrollY > 12);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });
