import "./styles.css";

const reveals = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, index) => {
      if (!entry.isIntersecting) return;
      setTimeout(() => entry.target.classList.add("visible"), index * 80);
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.12 },
);

reveals.forEach((element) => observer.observe(element));

let lastY = 0;
const nav = document.querySelector("nav");

window.addEventListener(
  "scroll",
  () => {
    const y = window.scrollY;
    if (nav) {
      nav.style.transform = y > lastY && y > 100 ? "translateY(-100%)" : "translateY(0)";
    }
    lastY = y;
  },
  { passive: true },
);
