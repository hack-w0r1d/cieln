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
  const linksPills = Array.from(document.querySelectorAll(".link-pills .pill"));
  const linksItems = linksHeading ? [linksHeading] : [];
  if (!proximityEls.length && !slideCards.length && !linksItems.length && !linksPills.length) return;

  if (prefersReducedMotion) {
    proximityEls.forEach((el) => {
      el.style.setProperty("--proximity", "1");
      el.style.setProperty("--vanish", "0");
    });
    slideCards.forEach((card) => {
      card.style.setProperty("--slide-x", "0%");
      card.style.setProperty("--slide-opacity", "1");
    });
    linksItems.forEach((el) => el.classList.add("is-visible"));
    linksPills.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  // Links: 「Links」見出しの表示が完了する少し前のタイミングでpillsを表示するタイマー
  let pillRevealTimer = null;
  let lastScrollY = window.scrollY;

  function update() {
    const navEl = document.querySelector(".nav");
    const headerH = navEl ? navEl.offsetHeight : 0;
    const screenTop = headerH;
    const screenH = window.innerHeight - headerH;
    const topThird = screenTop + screenH / 3;
    const bottomThird = screenTop + (screenH * 2) / 3;
    const bottomQuarter = screenTop + screenH * 0.75;
    const screenBottom = window.innerHeight;

    // about-teaser（data-vanish）: 上端が下1/3を越えたら表示。
    // 下端が上1/3(開始)〜screenTop(完了)の間で「儚く消える」効果を別軸で進行
    // Featured見出し（data-vanishなし）: 上端が下1/3で表示、参照要素の下端が上1/3で非表示（従来どおり）
    proximityEls.forEach((el) => {
      const ownRect = el.getBoundingClientRect();

      if (el.hasAttribute("data-vanish")) {
        const visible = ownRect.top < bottomThird;
        el.style.setProperty("--proximity", visible ? "1" : "0");

        let vanishT = (topThird - ownRect.bottom) / (topThird - screenTop);
        vanishT = Math.min(Math.max(vanishT, 0), 1);
        el.style.setProperty("--vanish", vanishT.toFixed(3));
        return;
      }

      const hideRefSelector = el.dataset.proximityRef;
      const hideRefEl = hideRefSelector ? document.querySelector(hideRefSelector) : el;
      const hideRect = hideRefEl ? hideRefEl.getBoundingClientRect() : ownRect;
      const visible = ownRect.top < bottomThird && hideRect.bottom > topThird;
      el.style.setProperty("--proximity", visible ? "1" : "0");
    });

    // card: 上端がheader除く画面の下1/3を越えたらスライドイン(フェード)をトリガー。
    // スクロール位置に連続追従させず表示/非表示の二値で目標値を切り替えるため、
    // 一度トリガーしたらスクロールを途中で止めてもCSSのtransitionが最後まで完了する。
    // 行ごとに独立して動く(前の行の完了を待たない)。表示(下スクロール)は行内で左→右、
    // 非表示(上スクロール)は右→左の順に開始するよう、行内の列位置に応じてtransition-delayをずらす
    const scrollingUp = window.scrollY < lastScrollY;
    lastScrollY = window.scrollY;
    const cardEntries = slideCards.map((card) => ({ card, rect: card.getBoundingClientRect() }));
    const cardRows = [];
    cardEntries.forEach((entry) => {
      const row = cardRows[cardRows.length - 1];
      if (row && Math.abs(entry.rect.top - row[0].rect.top) < 2) {
        row.push(entry);
      } else {
        cardRows.push([entry]);
      }
    });
    cardRows.forEach((row) => {
      row.sort((a, b) => a.rect.left - b.rect.left);
      row.forEach((entry, colIndex) => {
        const order = scrollingUp ? row.length - 1 - colIndex : colIndex;
        entry.card.style.transitionDelay = `0s, 0s, ${(order * 0.3).toFixed(2)}s`;
      });
    });
    cardEntries.forEach(({ card, rect }) => {
      const shouldReveal = rect.top < bottomThird;
      const dir = card.dataset.slide === "left" ? -1 : 1;
      card.style.setProperty("--slide-x", shouldReveal ? "0%" : `${(dir * 70).toFixed(1)}%`);
      card.style.setProperty("--slide-opacity", shouldReveal ? "1" : "0");
    });

    // Links見出し: 上端がheader除く画面の下1/4ラインを越えたら表示、
    // 上端が画面下端より下がったら（スクロールし直すたびに再生）非表示
    if (linksHeading) {
      const headingRect = linksHeading.getBoundingClientRect();
      const groupHidden = headingRect.top >= screenBottom;
      const visible = !groupHidden && headingRect.top < bottomQuarter;
      const wasVisible = linksHeading.classList.contains("is-visible");
      linksHeading.classList.toggle("is-visible", visible);
      if (visible && !wasVisible) {
        // 見出しの表示開始直後にpillsを表示開始する
        clearTimeout(pillRevealTimer);
        pillRevealTimer = setTimeout(() => {
          linksPills.forEach((el) => el.classList.add("is-visible"));
        }, 350);
      }
      if (!visible && wasVisible) {
        clearTimeout(pillRevealTimer);
        linksPills.forEach((el) => el.classList.remove("is-visible"));
      }
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
