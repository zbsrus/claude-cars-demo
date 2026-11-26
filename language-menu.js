(() => {
  "use strict";
  const choices = {
    fr: "Français",
    en: "English",
    de: "Deutsch",
    es: "Español",
  };

  function markup(icon) {
    const current = I18n.lang();
    const label = I18n.label("language");
    return `<div class="lang-control">
      <button class="lang-trigger" id="language" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="languages" aria-label="${label} · ${choices[current]}">
        ${icon("globe")}<span class="lang-full" lang="${current}">${choices[current]}</span><span class="lang-short">${current.toUpperCase()}</span>${icon("down")}
      </button>
      <div class="lang-panel" id="languages" hidden>
        <p class="lang-caption" id="languages-title">${label}</p>
        <div role="menu" aria-labelledby="languages-title">
          ${Object.entries(choices)
            .map(
              ([code, name]) =>
                `<button type="button" role="menuitemradio" aria-checked="${code === current}" tabindex="-1" data-language-code="${code}" lang="${code}"><span class="lang-code" aria-hidden="true">${code.toUpperCase()}</span><span>${name}</span>${code === current ? icon("check") : ""}</button>`,
            )
            .join("")}
        </div>
      </div></div>`;
  }
  function bind(onSelect) {
    const trigger = document.querySelector("#language");
    const container = trigger.parentElement;
    const panel = container.querySelector("#languages");
    const items = [...panel.querySelectorAll("[data-language-code]")];
    function toggle(open, restoreFocus = false) {
      panel.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
      if (open) {
        const right = trigger.getBoundingClientRect().right;
        const shift = Math.max(0, panel.offsetWidth + 12 - right);
        panel.style.right =
          -Math.min(shift, Math.max(0, window.innerWidth - right - 12)) + "px";
        items
          .find((item) => item.dataset.languageCode === I18n.lang())
          .focus({ preventScroll: true });
      } else if (restoreFocus) trigger.focus({ preventScroll: true });
    }
    trigger.addEventListener("click", () => toggle(panel.hidden));
    trigger.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        toggle(true);
      }
    });
    panel.addEventListener("keydown", (event) => {
      const index = items.indexOf(document.activeElement);
      let next;
      switch (event.key) {
        case "ArrowDown":
          next = (index + 1) % items.length;
          break;
        case "ArrowUp":
          next = (index + items.length - 1) % items.length;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = items.length - 1;
          break;
        case "Escape":
          event.preventDefault();
          toggle(false, true);
          return;
        case "Tab":
          toggle(false, true);
          return;
        default:
          if (event.key.length === 1 && event.key !== " ") {
            next = items.findIndex((item) =>
              choices[item.dataset.languageCode]
                .toLowerCase()
                .startsWith(event.key.toLowerCase()),
            );
          }
      }
      if (next >= 0) {
        event.preventDefault();
        items[next].focus({ preventScroll: true });
      }
    });
    panel.addEventListener("click", (event) => {
      const option = event.target.closest("[data-language-code]");
      if (!option) return;
      toggle(false, true);
      if (option.dataset.languageCode !== I18n.lang())
        onSelect(option.dataset.languageCode);
    });
    container.addEventListener("focusout", (event) => {
      if (
        !panel.hidden &&
        event.relatedTarget &&
        !container.contains(event.relatedTarget)
      )
        toggle(false);
    });
  }
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest(".lang-control")) {
      const current = document.querySelector("#languages:not([hidden])");
      if (current) {
        current.hidden = true;
        document
          .querySelector("#language")
          .setAttribute("aria-expanded", "false");
      }
    }
  });
  window.LanguageMenu = { markup, bind };
})();
