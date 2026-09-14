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

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// hero タグラインを記憶をタイピングするように1文字ずつ表示
function animateHeroTagline() {
  const groups = document.querySelectorAll(".hero__tagline-group");
  if (!groups.length) return null;

  if (prefersReducedMotion) {
    groups.forEach((group) => {
      group.querySelectorAll(".hero__char").forEach((el) => { el.style.opacity = "1"; });
    });
    return 0;
  }

  const charStagger = 0.045;
  const charDuration = 0.12;
  const groupGap = 0.35;
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
  const buttonStagger = 0.22;
  buttons.forEach((btn, i) => {
    btn.classList.add("hero__cta-btn");
    btn.style.animationDelay = `${(startDelay + i * buttonStagger).toFixed(3)}s`;
  });
}

const taglineEnd = animateHeroTagline();
if (taglineEnd !== null) {
  animateHeroCTA(taglineEnd + 0.2);
}

// About teaser / Featured見出し / カード / Links: スクロール位置に連動して表示・スライド
(function setupScrollProximityEffects() {
  const proximityEls = Array.from(document.querySelectorAll("[data-proximity]"));
  const slideCards = Array.from(document.querySelectorAll("[data-slide]"));
  const linksHeading = document.querySelector(".links h2");
  const linksItems = linksHeading
    ? [linksHeading, ...document.querySelectorAll(".links .pill")]
    : [];
  if (!proximityEls.length && !slideCards.length && !linksItems.length) return;

  if (prefersReducedMotion) {
    proximityEls.forEach((el) => el.style.setProperty("--proximity", "1"));
    slideCards.forEach((card) => {
      card.style.setProperty("--slide-x", "0%");
      card.style.setProperty("--slide-opacity", "1");
    });
    linksItems.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  function update() {
    const navEl = document.querySelector(".nav");
    const headerH = navEl ? navEl.offsetHeight : 0;
    const screenTop = headerH;
    const screenH = window.innerHeight - headerH;
    const topThird = screenTop + screenH / 3;
    const bottomThird = screenTop + (screenH * 2) / 3;
    const bottomQuarter = screenTop + screenH * 0.75;
    const center = screenTop + screenH / 2;
    const screenBottom = window.innerHeight;

    // about-teaser / Featured見出し: 自分の上端がheader除く画面の下1/3ラインを越えたら表示、
    // (参照要素があればその)下端がheader除く画面の上1/3ラインを越えたら非表示
    proximityEls.forEach((el) => {
      const hideRefSelector = el.dataset.proximityRef;
      const hideRefEl = hideRefSelector ? document.querySelector(hideRefSelector) : el;
      const ownRect = el.getBoundingClientRect();
      const hideRect = hideRefEl ? hideRefEl.getBoundingClientRect() : ownRect;
      const visible = ownRect.top < bottomThird && hideRect.bottom > topThird;
      el.style.setProperty("--proximity", visible ? "1" : "0");
    });

    slideCards.forEach((card) => {
      const rect = card.getBoundingClientRect();

      // 進入: 上端がheader除く画面の下1/3〜画面中央の間でオフセット1→0
      let entryT = (rect.top - center) / (bottomThird - center);
      entryT = Math.min(Math.max(entryT, 0), 1);

      // 退出: 下端がheaderを含めた画面最上端(y=0)を越えたら画面外へ
      const exitTriggered = rect.bottom < 0;

      const t = exitTriggered ? 1 : entryT;
      const dir = card.dataset.slide === "left" ? -1 : 1;
      card.style.setProperty("--slide-x", `${(dir * t * 70).toFixed(1)}%`);
      card.style.setProperty("--slide-opacity", (1 - t).toFixed(3));
    });

    // Links: 各要素の上端がheader除く画面の下1/4ラインを越えたら表示、
    // 「Links」見出しの上端が画面下端より下がったら（スクロールし直すたびに再生）非表示
    if (linksItems.length) {
      const headingRect = linksHeading.getBoundingClientRect();
      const groupHidden = headingRect.top >= screenBottom;
      linksItems.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const visible = !groupHidden && rect.top < bottomQuarter;
        el.classList.toggle("is-visible", visible);
      });
    }
  }

  let ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    }
  }

  update();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
})();
