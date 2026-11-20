(() => {
  "use strict";
  const key = "virage.local.v1.showcase";
  const defaults = ["porsche-911", "porsche-997-gt3", "alfa-spider"];
  const t = (...words) => I18n.t(...words);
  const esc = (value) => App.esc(value);
  const empty = () => ["", "", ""];
  let editor = null;

  function load() {
    const raw = localStorage.getItem(key);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 3 ||
      parsed.some((id) => typeof id !== "string")
    )
      throw Error("Invalid selection");
    return parsed;
  }
  function selected(list, pins) {
    // Reserve explicitly selected vehicles before filling any automatic slots.
    const byId = new Map(list.map((car) => [car.id, car]));
    const preferred = pins.map((id) => byId.get(id));
    const pool = [...defaults.map((id) => byId.get(id)), ...list].filter(
      Boolean,
    );
    const used = new Set(preferred.filter(Boolean));
    return preferred.map((car) => {
      if (car) return car;
      const available = pool.find((candidate) => !used.has(candidate));
      if (available) used.add(available);
      return available;
    });
  }
  function featured(list) {
    let pins;
    try {
      pins = load();
    } catch {
      pins = empty();
    }
    return selected(list, pins).filter(Boolean);
  }
  function render() {
    if (!editor) {
      let initial,
        readable = true;
      try {
        initial = load();
      } catch {
        initial = empty();
        readable = false;
      }
      editor = { initial, pins: [...initial], readable };
    }
    const list = App.cars().filter((car) => car.status === "active");
    const resolved = selected(list, editor.pins);
    const positions = [
      t("Voiture en couverture", "Cover car", "Fahrzeug fürs Titelbild", "Coche de portada"),
      t("Deuxième voiture", "Second car", "Zweites Fahrzeug", "Segundo coche"),
      t("Troisième voiture", "Third car", "Drittes Fahrzeug", "Tercer coche"),
    ];
    const auto = t(
      "Sélection automatique",
      "Automatic selection",
      "Automatische Auswahl",
      "Selección automática",
    );
    const dirty = changed();
    const rows = positions
      .map((position, index) => {
        const car = resolved[index],
          chosen = editor.pins[index];
        const options = list
          .map(
            (item) =>
              `<option value="${esc(item.id)}" ${chosen === item.id ? "selected" : ""} ${editor.pins.some((pin, i) => pin === item.id && i !== index) ? "disabled" : ""}>${esc(item.make + " " + item.model + " · " + item.year)}</option>`,
          )
          .join("");
        const unavailable =
          chosen && !list.some((item) => item.id === chosen)
            ? `<option selected value="${esc(chosen)}">${t("Indisponible · sélection automatique", "Unavailable · selected automatically", "Nicht verfügbar · automatische Auswahl", "No disponible · selección automática")}</option>`
            : "";
        return `<div class="showcase-slot"><div class="showcase-image"><img src="${esc(App.photo(car))}" alt=""><span>${String(index + 1).padStart(2, "0")}</span></div>
        <div class="showcase-field"><label for="showcase-car-${index}">${position}</label>
        <select id="showcase-car-${index}" data-showcase-slot="${index}"><option value="">${auto}</option>${unavailable}${options}</select>
        ${car ? `<small>${esc(car.make + " " + car.model)} · ${esc(car.city)}</small>` : `<small>${t("Aucune voiture disponible", "No car available", "Kein Fahrzeug verfügbar", "Ningún coche disponible")}</small>`}</div></div>`;
      })
      .join("");
    return `<section id="showcase-editor"><div class="showcase-intro"><div><h2>${t("Voitures à la une", "Featured cars", "Fahrzeuge auf der Startseite", "Coches destacados")}</h2>
      <p>${t("Choisissez jusqu’à trois voitures parmi les annonces actives. La première occupe la couverture. Laissez une place en sélection automatique pour la remplir avec une voiture disponible.", "Choose up to three cars from your active listings. The first is the cover car. Leave a slot on automatic to feature an available car.", "Wählen Sie bis zu drei Fahrzeuge aus Ihren aktiven Inseraten. Das erste erscheint auf dem Titelbild. Die automatische Auswahl füllt freie Plätze mit verfügbaren Fahrzeugen.", "Elige hasta tres coches entre tus anuncios activos. El primero irá en portada. Deja un puesto en selección automática para mostrar un coche disponible.")}</p></div>
      <a class="textlink" href="#accueil">${t("Voir la page d’accueil", "View homepage", "Startseite ansehen", "Ver la portada")} ${App.icon("out")}</a></div>
      <div class="showcase-list">${rows}</div>
      <div class="showcase-save"><button class="btn" data-auto ${!editor.pins.some(Boolean) ? "disabled" : ""}>${t("Tout sélectionner automatiquement", "Use automatic selection", "Automatisch auswählen", "Usar selección automática")}</button>
      <button class="btn primary" data-save-showcase ${dirty && editor.readable ? "" : "disabled"}>${App.icon("check")} ${t("Enregistrer la sélection", "Save selection", "Auswahl speichern", "Guardar selección")}</button></div>
      <p class="showcase-status" role="status">${editor.readable ? "" : t("Impossible de lire la sélection enregistrée. Vérifiez les réglages de stockage du navigateur, puis rechargez la page.", "Your saved selection could not be loaded. Check your browser’s storage settings and reload this page.", "Die gespeicherte Auswahl lässt sich nicht laden. Prüfen Sie die Speichereinstellungen des Browsers und laden Sie die Seite neu.", "No se ha podido cargar la selección guardada. Comprueba los ajustes de almacenamiento del navegador y recarga la página.")}</p></section>`;
  }
  function changed() {
    return (
      editor && editor.pins.some((id, index) => id !== editor.initial[index])
    );
  }
  function refresh(focus) {
    document.querySelector("#showcase-editor").outerHTML = render();
    mount();
    document.querySelector(focus)?.focus({ preventScroll: true });
  }
  function mount() {
    const root = document.querySelector("#showcase-editor");
    root.addEventListener("change", (e) => {
      if (!e.target.matches("[data-showcase-slot]")) return;
      editor.pins[Number(e.target.dataset.showcaseSlot)] = e.target.value;
      refresh("#" + e.target.id);
    });
    root.querySelector("[data-auto]").addEventListener("click", () => {
      editor.pins = empty();
      refresh("#showcase-car-0");
    });
    root.querySelector("[data-save-showcase]").addEventListener("click", () => {
      const status = root.querySelector(".showcase-status");
      try {
        const latest = load();
        if (latest.some((value, i) => value !== editor.initial[i])) {
          status.textContent = t(
            "La sélection a changé dans un autre onglet. Rechargez cette page pour voir la dernière version.",
            "The selection changed in another tab. Reload this page to see the latest selection.",
            "Die Auswahl wurde in einem anderen Tab geändert. Laden Sie diese Seite neu, um die aktuelle Auswahl zu sehen.",
            "La selección ha cambiado en otra pestaña. Recarga esta página para ver la versión más reciente.",
          );
          return;
        }
        localStorage.setItem(key, JSON.stringify(editor.pins));
      } catch {
        status.textContent = t(
          "Impossible d’enregistrer la sélection. Vérifiez l’espace disponible dans votre navigateur et réessayez.",
          "Couldn’t save your selection. Check your browser’s available storage and try again.",
          "Die Auswahl ließ sich nicht speichern. Prüfen Sie den verfügbaren Browserspeicher und versuchen Sie es erneut.",
          "No se ha podido guardar la selección. Comprueba el espacio disponible en el navegador y vuelve a intentarlo.",
        );
        return;
      }
      editor.initial = [...editor.pins];
      refresh(".showcase-intro a");
      App.toast(
        t(
          "Sélection enregistrée pour la page d’accueil.",
          "Featured cars saved.",
          "Auswahl gespeichert.",
          "Selección de portada guardada.",
        ),
      );
    });
  }
  function guardLeave(onLeave) {
    if (!changed()) {
      editor = null;
      return true;
    }
    App.dialog({
      title: t(
        "Quitter sans enregistrer la sélection ?",
        "Leave without saving your selection?",
        "Auswahl ohne Speichern verlassen?",
        "¿Salir sin guardar la selección?",
      ),
      body: t(
        "La page d’accueil conservera les voitures sélectionnées précédemment.",
        "The homepage will keep its previous selection.",
        "Auf der Startseite bleibt die bisherige Auswahl zu sehen.",
        "La portada mantendrá la selección anterior.",
      ),
      confirm: t(
        "Quitter sans enregistrer",
        "Discard changes",
        "Änderungen verwerfen",
        "Descartar cambios",
      ),
      onConfirm: () => {
        editor = null;
        onLeave();
      },
    });
    return false;
  }
  window.addEventListener("beforeunload", (e) => {
    if (changed()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  window.addEventListener("storage", (e) => {
    if (e.key !== key || changed()) return;
    editor = null;
    if (
      document.querySelector("#showcase-editor") ||
      document.querySelector(".hero-visual, #studio-cover")
    )
      App.refresh();
  });
  window.Showcase = { render, mount, featured, guardLeave };
})();
