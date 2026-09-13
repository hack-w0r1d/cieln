// ナビの高さを実測してCSS変数に反映（heroの中央寄せに使用）
function setNavHeightVar() {
  const navEl = document.querySelector(".nav");
  if (navEl) {
    document.documentElement.style.setProperty("--nav-height", `${navEl.offsetHeight}px`);
  }
}
setNavHeightVar();
window.addEventListener("resize", setNavHeightVar);

// モバイルメニューの開閉
const toggle = document.querySelector(".nav__toggle");
const nav = document.querySelector(".nav");

toggle?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  toggle.setAttribute("aria-expanded", String(isOpen));
});

// フッターの年表示
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

// hero タグラインを段落ごと・文字ごとにふわっと表示
function animateHeroTagline() {
  const groups = document.querySelectorAll(".hero__tagline-group");
  if (!groups.length) return null;

  const charStagger = 0.028;
  const charDuration = 0.55;
  const groupGap = 0.25;

  let delay = 0.15;

  groups.forEach((group, groupIndex) => {
    if (groupIndex > 0) delay += groupGap;
    const lines = group.querySelectorAll(".hero__tagline-line");
    lines.forEach((line) => {
      const text = line.textContent;
      line.textContent = "";
      Array.from(text).forEach((ch) => {
        const span = document.createElement("span");
        span.className = "hero__char";
        span.style.animationDelay = `${delay.toFixed(3)}s`;
        span.textContent = ch;
        line.appendChild(span);
        delay += charStagger;
      });
    });
  });

  return delay + charDuration;
}

// hero の CTA ボタンを順番にふわっと表示
function animateHeroCTA(startDelay) {
  const buttons = document.querySelectorAll(".hero__cta .btn");
  const buttonStagger = 0.18;
  buttons.forEach((btn, i) => {
    btn.classList.add("hero__cta-btn");
    btn.style.animationDelay = `${(startDelay + i * buttonStagger).toFixed(3)}s`;
  });
}

const taglineEnd = animateHeroTagline();
if (taglineEnd !== null) {
  animateHeroCTA(taglineEnd + 0.2);
}

// スクロールに合わせて各セクションをふわっと表示
const revealTargets = document.querySelectorAll(".reveal");
if (revealTargets.length) {
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });
    revealTargets.forEach((el) => io.observe(el));
  } else {
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  }
}
