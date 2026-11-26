(() => {
  "use strict";

  const api = () => window.App;
  const t = (...items) => I18n.t(...items);
  const esc = (value) => api().esc(String(value ?? ""));
  const icon = (name) => api().icon(name);
  const textKeys = ["description", "equipment", "condition"];
  const languages = {
    fr: "Français",
    en: "English",
    de: "Deutsch",
    es: "Español",
  };
  const fields = [
    "make",
    "model",
    "year",
    "km",
    "fuel",
    "gearbox",
    "price",
    "city",
  ];
  const fuelTypes = ["Essence", "Diesel", "Électrique", "Hybride"];
  const gearTypes = ["Manuelle", "Automatique"];
  const maxYear = new Date().getFullYear() + 1;
  const ranges = {
    year: [1886, maxYear],
    km: [0, 9999999],
    price: [1, 999999999],
  };
  const labels = {
    garage: [
      "Garage de Claude",
      "Claude’s garage",
      "Claudes Garage",
      "Garaje de Claude",
    ],
    create: [
      "Créer une annonce",
      "Create a listing",
      "Inserat erstellen",
      "Crear anuncio",
    ],
    edit: ["Modifier", "Edit", "Bearbeiten", "Editar"],
    archive: ["Archiver", "Archive", "Archivieren", "Archivar"],
    restore: ["Restaurer", "Restore", "Wiederherstellen", "Restaurar"],
    active: ["Actives", "Active", "Aktiv", "Activos"],
    draft: ["Brouillons", "Drafts", "Entwürfe", "Borradores"],
    archived: ["Archivées", "Archived", "Archiviert", "Archivados"],
    make: ["Marque", "Make", "Marke", "Marca"],
    model: ["Modèle", "Model", "Modell", "Modelo"],
    year: ["Année", "Year", "Baujahr", "Año"],
    km: ["Kilométrage", "Mileage", "Kilometerstand", "Kilometraje"],
    fuel: ["Carburant", "Fuel", "Kraftstoff", "Combustible"],
    gearbox: ["Boîte de vitesses", "Transmission", "Getriebe", "Cambio"],
    price: [
      "Prix demandé",
      "Asking price",
      "Preisvorstellung",
      "Precio de venta",
    ],
    city: ["Ville", "Town or city", "Ort", "Ciudad"],
    description: ["Description", "Description", "Beschreibung", "Descripción"],
    equipment: ["Équipements", "Equipment", "Ausstattung", "Equipamiento"],
    condition: ["État", "Condition", "Zustand", "Estado"],
    waitMedia: [
      "Ajout du fichier en cours. Patientez un instant.",
      "Please wait while the file is added.",
      "Die Datei wird hinzugefügt. Bitte warten Sie einen Moment.",
      "Espera a que termine de cargarse el archivo.",
    ],
    storageError: [
      "Enregistrement impossible. Vérifiez l’espace disponible dans votre navigateur et réessayez.",
      "Couldn’t save. Check the available storage in your browser and try again.",
      "Speichern fehlgeschlagen. Prüfen Sie den verfügbaren Browserspeicher und versuchen Sie es erneut.",
      "No se pudo guardar. Comprueba el espacio disponible en el navegador y vuelve a intentarlo.",
    ],
  };
  const label = (key) => t(...labels[key]);
  let formState = null;

  function ownCar(id) {
    return api()
      .cars()
      .find((car) => car.own && car.id === id);
  }
  function titleOf(car) {
    return (
      [car.make, car.model].filter(Boolean).join(" ") ||
      t(
        "Véhicule sans nom",
        "Untitled vehicle",
        "Fahrzeug ohne Namen",
        "Vehículo sin nombre",
      )
    );
  }
  function hasNumber(value) {
    return value !== "" && value != null && Number.isFinite(Number(value));
  }
  function photo(car) {
    const src = api().photo(car);
    return car.image && src !== "assets/placeholder.svg"
      ? `<img src="${esc(src)}" alt="${esc(titleOf(car))}">`
      : `<div class="gg-photo-empty">${icon("car")}<span>${t("Sans photo", "No photo", "Kein Foto", "Sin foto")}</span></div>`;
  }
  function garageRow(car) {
    const id = encodeURIComponent(car.id);
    const details = [
      car.year,
      hasNumber(car.km) ? api().num(car.km) + " km" : "",
      I18n.value(car.gearbox),
      car.city,
    ].filter(Boolean);
    const action = car.status === "archived" ? "restore" : "archive";
    return `<article class="gg-row">
      <a class="gg-thumb" href="#car/${id}" aria-label="${esc(t("Voir", "View", "Ansehen", "Ver") + " " + titleOf(car))}">${photo(car)}</a>
      <div class="gg-row-info"><h3><a href="#car/${id}">${esc(titleOf(car))}</a></h3><p>${esc(details.join(" · "))}</p></div>
      <strong class="gg-row-price">${hasNumber(car.price) ? esc(api().money(car.price)) : t("Prix à renseigner", "Price not set", "Preis noch offen", "Precio pendiente")}</strong>
      <div class="gg-row-actions">
        <a class="btn light" href="#form/${id}" aria-label="${esc(label("edit") + " · " + titleOf(car))}">${icon("edit")}${label("edit")}</a>
        ${car.status === "draft" ? "" : `<button class="gg-text-action" type="button" aria-label="${esc(label(action) + " · " + titleOf(car))}" data-change-status="${esc(car.id)}">${icon(action)}${label(action)}</button>`}
      </div>
    </article>`;
  }
  function ownerNav(section) {
    const sections = [
      [
        "listings",
        "active",
        "car",
        t("Annonces", "Listings", "Inserate", "Anuncios"),
      ],
      [
        "showcase",
        "showcase",
        "grid",
        t("Accueil", "Homepage", "Startseite", "Portada"),
      ],
      [
        "profile",
        "profile",
        "user",
        t("Profil", "Profile", "Profil", "Perfil"),
      ],
      [
        "enquiries",
        "enquiries",
        "mail",
        t("Messages", "Enquiries", "Anfragen", "Consultas"),
      ],
      [
        "reviews",
        "reviews",
        "feedback",
        t("Avis", "Reviews", "Bewertungen", "Reseñas"),
      ],
    ];
    return `<nav class="gg-work-nav" aria-label="${label("garage")}">${sections
      .map(([key, path, symbol, name]) => {
        const mark =
          symbol === "feedback"
            ? '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8 8 0 0 1-8 8H6l-4 3v-9a9 9 0 1 1 19-2Z"/><path d="m11.4 6.6 1.4 2.8 3.1.4-2.2 2.2.5 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z"/></svg>'
            : icon(symbol);
        return `<a href="#garage/${path}" ${key === section ? 'aria-current="page"' : ""}>${mark}<span>${name}</span></a>`;
      })
      .join("")}</nav>`;
  }
  function garageView(tab) {
    const section = ["showcase", "profile", "reviews", "enquiries"].includes(tab)
      ? tab
      : "listings";
    let panels;
    if (section === "listings") panels = listingsView(tab);
    else if (section === "showcase") panels = Showcase.render();
    else if (section === "enquiries") panels = Contacts.owner();
    else panels = OwnerContent.render(section);
    return `<section class="wrap gg-shell gg-workspace">
      <header class="gg-heading"><div><p class="gg-eyebrow">${t("Espace vendeur", "Seller workspace", "Verkäuferbereich", "Área del vendedor")}</p><h1>${label("garage")}</h1></div>
      ${section === "listings" ? `<a class="btn primary" href="#form">${icon("plus")}${label("create")}</a>` : ""}</header>
      <div class="gg-work-layout"><aside class="gg-work-rail">${ownerNav(section)}</aside>
      <div class="gg-work-panel">${panels}</div></div></section>`;
  }
  function listingsView(tab) {
    const tabs = ["active", "draft", "archived"];
    const selected = tabs.includes(tab) ? tab : "active";
    const owned = api()
      .cars()
      .filter((car) => car.own);
    const cars = owned
      .filter((car) => car.status === selected)
      .sort((a, b) => Number(b.updated || 0) - Number(a.updated || 0));
    const emptyTitle = {
      active: t(
        "Aucune annonce active",
        "No active listings",
        "Keine aktiven Inserate",
        "No hay anuncios activos",
      ),
      draft: t(
        "Aucun brouillon",
        "No drafts",
        "Keine Entwürfe",
        "No hay borradores",
      ),
      archived: t(
        "Aucune annonce archivée",
        "No archived listings",
        "Keine archivierten Inserate",
        "No hay anuncios archivados",
      ),
    }[selected];
    const emptyText = {
      active: t(
        "Créez une annonce ou activez un brouillon pour afficher la voiture dans le catalogue.",
        "Create a listing or activate a draft to show the car in the catalogue.",
        "Erstellen Sie ein Inserat oder aktivieren Sie einen Entwurf, damit das Fahrzeug im Katalog erscheint.",
        "Crea un anuncio o activa un borrador para que el coche aparezca en el catálogo.",
      ),
      draft: t(
        "Enregistrez une annonce en brouillon pour la reprendre ici.",
        "Save a listing as a draft to finish it here later.",
        "Speichern Sie ein Inserat als Entwurf. Hier können Sie es später ergänzen.",
        "Guarda un anuncio como borrador para terminarlo aquí más tarde.",
      ),
      archived: t(
        "Les annonces archivées quittent le catalogue. Vous pourrez les restaurer ici.",
        "Archived listings leave the catalogue. You can restore them here.",
        "Archivierte Inserate werden aus dem Katalog ausgeblendet. Hier können Sie sie wiederherstellen.",
        "Los anuncios archivados salen del catálogo. Puedes restaurarlos aquí.",
      ),
    }[selected];
    const empty = `<div class="gg-empty"><div class="gg-empty-icon">${icon(selected === "archived" ? "archive" : selected === "draft" ? "edit" : "car")}</div>
      <h3>${emptyTitle}</h3><p>${emptyText}</p></div>`;
    return `<div class="gg-inventory-head"><h2>${t("Mes annonces", "My listings", "Meine Inserate", "Mis anuncios")}</h2>
      <nav class="gg-tabs" aria-label="${t("Statut des annonces", "Listing status", "Inseratstatus", "Estado de los anuncios")}">
      ${tabs.map((value) => `<a href="#garage/${value}"${selected === value ? ' aria-current="page"' : ""}>${label(value)}<span>${owned.filter((car) => car.status === value).length}</span></a>`).join("")}</nav></div>
      <div class="gg-list">${cars.length ? cars.map(garageRow).join("") : empty}</div>`;
  }

  function textField(
    car,
    key,
    { range, max = 100, unit = "", placeholder = "" } = {},
  ) {
    const numeric = !!range;
    const attributes = numeric
      ? `type="number" step="1" min="${range[0]}" max="${range[1]}" inputmode="numeric"`
      : `type="text" maxlength="${max}"`;
    return `<div class="gg-field"><label for="gg-${key}">${label(key)}</label><div class="gg-input-wrap">
      <input id="gg-${key}" name="${key}" ${attributes} value="${esc(car[key])}" aria-describedby="gg-err-${key}"${unit ? ' class="gg-with-unit"' : ""} autocomplete="off" placeholder="${esc(placeholder)}" required>
      ${unit ? `<span aria-hidden="true">${unit}</span>` : ""}</div><small class="gg-error" id="gg-err-${key}"></small></div>`;
  }
  function selectField(car, key, choices) {
    return `<div class="gg-field"><label for="gg-${key}">${label(key)}</label><select id="gg-${key}" name="${key}" aria-describedby="gg-err-${key}" required>
      <option value="">${t("Choisir…", "Select…", "Auswählen…", "Seleccionar…")}</option>
      ${choices.map((value) => `<option value="${value}"${car[key] === value ? " selected" : ""}>${I18n.value(value)}</option>`).join("")}
      </select><small class="gg-error" id="gg-err-${key}"></small></div>`;
  }
  function textEditor() {
    const hints = {
      description: t(
        "Qu’appréciez-vous au volant de cette voiture ?",
        "What do you enjoy about driving this car?",
        "Was gefällt Ihnen beim Fahren besonders?",
        "¿Qué te gusta de este coche al conducirlo?",
      ),
      equipment: t(
        "Sièges, climatisation, jantes, options d’origine…",
        "Seats, air conditioning, wheels, factory options…",
        "Sitze, Klimaanlage, Felgen, Sonderausstattung ab Werk…",
        "Asientos, aire acondicionado, llantas, extras de fábrica…",
      ),
      condition: t(
        "Carrosserie, usure de l’habitacle, entretien récent, défauts connus…",
        "Bodywork, interior wear, recent servicing, known faults…",
        "Lack, Gebrauchsspuren im Innenraum, letzte Wartung, bekannte Mängel…",
        "Carrocería, desgaste interior, mantenimiento reciente, defectos conocidos…",
      ),
    };
    return `<fieldset class="gg-panel"><legend>${t("Présentation de la voiture", "About the car", "Fahrzeugdetails", "Presentación del coche")}</legend>
      <div class="gg-copy-toolbar"><div class="gg-field"><label for="gg-text-lang">${t("Langue du texte", "Text language", "Textsprache", "Idioma del texto")}</label>
      <select id="gg-text-lang">${Object.entries(languages)
        .map(
          ([code, name]) =>
            `<option lang="${code}" value="${code}">${name}</option>`,
        )
        .join("")}</select></div>
      <p>${t("Choisissez une langue pour rédiger sa version. Si une traduction manque, le texte disponible s’affiche.", "Choose a language to edit its version. If a translation is missing, visitors see the text in an available language.", "Wählen Sie die Sprache, die Sie bearbeiten möchten. Fehlt eine Übersetzung, erscheint der Text in einer verfügbaren Sprache.", "Elige el idioma que quieras editar. Si falta una traducción, se mostrará el texto en un idioma disponible.")}</p></div>
      ${textKeys.map((key) => `<div class="gg-field"><label for="gg-${key}">${label(key)} <span>${t("Facultatif", "Optional", "Optional", "Opcional")}</span></label><textarea id="gg-${key}" name="${key}" rows="${key === "description" ? 3 : 2}" maxlength="1800" placeholder="${hints[key]}"></textarea></div>`).join("")}
      </fieldset>`;
  }
  function editorTabs() {
    const tabs = [
      ["vehicle", "car", t("Véhicule", "Vehicle", "Fahrzeug", "Vehículo")],
      ["texts", "book", t("Textes", "Description", "Texte", "Textos")],
      ["media", "image", t("Galerie", "Gallery", "Galerie", "Galería")],
    ];
    return `<div class="gg-editor-tabs" role="tablist" aria-label="${t("Sections de l’annonce", "Listing sections", "Inseratbereiche", "Secciones del anuncio")}">${tabs.map(([id, symbol, name], index) => `<button type="button" role="tab" data-editor-tab="${id}" id="gg-tab-${id}" aria-controls="gg-pane-${id}" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}">${icon(symbol)}${name}</button>`).join("")}</div>`;
  }
  function setEditorTab(id, focus = false) {
    const form = formState.form;
    const tabs = [...form.querySelectorAll("[data-editor-tab]")];
    if (!tabs.some((button) => button.dataset.editorTab === id)) return;
    formState.tab = id;
    for (const button of tabs) {
      const current = button.dataset.editorTab === id;
      button.setAttribute("aria-selected", String(current));
      button.tabIndex = current ? 0 : -1;
      document.getElementById(button.getAttribute("aria-controls")).hidden =
        !current;
      if (current && focus) button.focus();
    }
  }

  function formView(id) {
    const car = id ? ownCar(id) : {};
    if (!car)
      return `<section class="wrap gg-shell"><div class="gg-empty"><h1>${t("Annonce indisponible", "Listing unavailable", "Inserat nicht verfügbar", "Anuncio no disponible")}</h1><a class="btn primary" href="#garage/active">${label("garage")}</a></div></section>`;
    const publish = !car.id || car.status === "draft";
    const back = "#garage/" + (car.status || "active");
    return `<section class="wrap gg-shell gg-form-shell"><a class="gg-back" href="${back}">${icon("back")}${label("garage")}</a>
      <div class="gg-heading"><div><h1>${car.id ? t("Modifier l’annonce", "Edit listing", "Inserat bearbeiten", "Editar anuncio") : t("Nouvelle annonce", "New listing", "Neues Inserat", "Nuevo anuncio")}</h1>
      <p>${car.id ? esc(titleOf(car)) : t("Une marque suffit pour enregistrer un brouillon.", "A make is all you need to save a draft.", "Eine Marke genügt, um einen Entwurf zu speichern.", "Basta con indicar la marca para guardar un borrador.")}</p></div></div>
      <form id="gg-form" novalidate><div class="gg-form-layout"><div class="gg-editor-main">${editorTabs()}
      <div role="tabpanel" id="gg-pane-vehicle" aria-labelledby="gg-tab-vehicle" class="gg-sections">
      <fieldset class="gg-panel"><legend>${t("Le véhicule", "Vehicle", "Fahrzeug", "Vehículo")}</legend><div class="gg-fields">
      ${textField(car, "make", { max: 48, placeholder: "Porsche" })}${textField(car, "model", { max: 80, placeholder: "911 Carrera" })}
      ${textField(car, "year", { range: ranges.year, placeholder: "1992" })}${textField(car, "km", { range: ranges.km, unit: "km", placeholder: "85000" })}
      ${selectField(car, "fuel", fuelTypes)}${selectField(car, "gearbox", gearTypes)}</div></fieldset>
      <fieldset class="gg-panel"><legend>${t("Mise en vente", "Sale details", "Verkaufsdetails", "Datos de venta")}</legend><div class="gg-fields">
      ${textField(car, "price", { range: ranges.price, unit: "€", placeholder: "32000" })}${textField(car, "city", { max: 80, placeholder: "Liège" })}</div></fieldset>
      </div><div role="tabpanel" id="gg-pane-texts" aria-labelledby="gg-tab-texts" hidden>${textEditor()}</div>
      <div role="tabpanel" id="gg-pane-media" aria-labelledby="gg-tab-media" hidden><div id="gg-media">${CarMedia.editor(car)}</div></div></div>
      <aside class="gg-aside"><section class="gg-preview"><h2>${t("Aperçu de l’annonce", "Listing preview", "Inseratvorschau", "Vista previa del anuncio")}</h2>
      <div id="gg-preview-image" class="gg-preview-image">${photo(car)}</div><div class="gg-preview-body"><p id="gg-preview-specs"></p><h3 id="gg-preview-name"></h3><strong id="gg-preview-price"></strong></div></section></aside></div>
      <div class="gg-save-bar"><p id="gg-form-message" class="gg-form-message" role="alert"></p><div class="gg-save-actions">
      <a class="gg-cancel" href="${back}">${t("Annuler", "Cancel", "Abbrechen", "Cancelar")}</a>
      ${publish ? `<button type="button" id="gg-draft" class="btn light">${t("Enregistrer le brouillon", "Save draft", "Entwurf speichern", "Guardar borrador")}</button>` : ""}
      <button type="submit" class="btn primary">${publish ? t("Activer l’annonce", "Activate listing", "Inserat aktivieren", "Activar anuncio") : t("Enregistrer les modifications", "Save changes", "Änderungen speichern", "Guardar cambios")}${icon("arrow")}</button></div></div></form></section>`;
  }

  function readValues() {
    return Object.fromEntries(
      fields.map((key) => [key, formState.form.elements[key].value]),
    );
  }
  function readTexts(car) {
    const texts = Object.fromEntries(
      Object.keys(languages).map((code) => [code, {}]),
    );
    for (const key of textKeys) {
      const translations = CarCopy.variants(car, key);
      for (const code of Object.keys(languages))
        texts[code][key] = translations[code] || "";
    }
    return texts;
  }
  function syncTextInputs() {
    const { form, texts, textLang } = formState;
    for (const key of textKeys) texts[textLang][key] = form.elements[key].value;
  }
  function displayTextInputs() {
    const { form, texts, textLang } = formState;
    form.querySelector("#gg-text-lang").value = textLang;
    for (const key of textKeys) {
      form.elements[key].lang = textLang;
      form.elements[key].value = texts[textLang][key];
    }
  }
  function refreshPreview() {
    const values = readValues();
    document.getElementById("gg-preview-name").textContent =
      [values.make, values.model].filter(Boolean).join(" ") ||
      t("Votre véhicule", "Your vehicle", "Ihr Fahrzeug", "Tu vehículo");
    document.getElementById("gg-preview-specs").textContent = [
      values.year,
      values.city,
    ]
      .filter(Boolean)
      .join(" · ");
    document.getElementById("gg-preview-price").textContent = hasNumber(
      values.price,
    )
      ? api().money(values.price)
      : t(
          "Prix à renseigner",
          "Price not set",
          "Preis noch offen",
          "Precio pendiente",
        );
  }
  function mediaChanged() {
    if (!formState?.media) return;
    const { image } = formState.media.read();
    document.getElementById("gg-preview-image").innerHTML = photo({
      ...readValues(),
      image,
    });
    const busy = formState.media.busy();
    for (const button of formState.form.querySelectorAll(
      '#gg-draft, button[type="submit"]',
    ))
      button.disabled = busy;
  }
  function bindMedia(car) {
    const container = document.getElementById("gg-media");
    container.innerHTML = CarMedia.editor(car);
    formState.media = CarMedia.bindEditor(container, car, mediaChanged);
    mediaChanged();
  }
  function fingerprint() {
    syncTextInputs();
    return JSON.stringify([
      readValues(),
      formState.texts,
      formState.media.read(),
    ]);
  }
  function dirty() {
    return (
      !!formState &&
      (formState.media.busy() || formState.baseline !== fingerprint())
    );
  }
  function dispose(options = {}) {
    formState?.closeChoices();
    formState?.media?.dispose(options);
    formState = null;
  }
  function guardLeave(onLeave) {
    if (!dirty()) return true;
    api().dialog({
      title: t(
        "Quitter cette annonce ?",
        "Leave this listing?",
        "Inserat verlassen?",
        "¿Salir del anuncio?",
      ),
      body: t(
        "Les modifications en cours seront perdues.",
        "Your unsaved changes will be lost.",
        "Ungespeicherte Änderungen gehen verloren.",
        "Se perderán los cambios sin guardar.",
      ),
      confirm: t(
        "Quitter sans enregistrer",
        "Leave without saving",
        "Ohne Speichern verlassen",
        "Salir sin guardar",
      ),
      onConfirm: () => {
        dispose();
        onLeave();
      },
    });
    return false;
  }
  function captureForm() {
    if (!formState) return null;
    if (formState.media.busy()) {
      api().toast(label("waitMedia"));
      return false;
    }
    syncTextInputs();
    const values = readValues();
    const { original, texts, textLang, baseline, originalLang } = formState;
    const snapshot = {
      values,
      original,
      texts,
      textLang,
      originalLang,
      baseline,
      tab: formState.tab,
      media: formState.media.read(),
    };
    dispose({ preserve: true });
    return snapshot;
  }
  function restoreForm(snapshot) {
    if (!snapshot || !formState) return;
    Object.assign(formState, {
      original: snapshot.original,
      texts: snapshot.texts,
      textLang: snapshot.textLang,
      originalLang: snapshot.originalLang,
      baseline: snapshot.baseline,
    });
    for (const key of fields)
      formState.form.elements[key].value = snapshot.values[key];
    displayTextInputs();
    formState.media.dispose({ preserve: true });
    bindMedia({ ...snapshot.original, ...snapshot.media });
    setEditorTab(snapshot.tab || "vehicle");
    refreshPreview();
  }

  function fieldError(key, raw, draft) {
    const value = raw.trim();
    const required = {
      make: t(
        "Indiquez la marque du véhicule.",
        "Enter the make.",
        "Geben Sie die Marke an.",
        "Indica la marca.",
      ),
      model: t(
        "Indiquez le modèle.",
        "Enter the model.",
        "Geben Sie das Modell an.",
        "Indica el modelo.",
      ),
      year: t(
        "Indiquez l’année.",
        "Enter the year.",
        "Geben Sie das Baujahr an.",
        "Indica el año.",
      ),
      km: t(
        "Indiquez le kilométrage.",
        "Enter the mileage.",
        "Geben Sie den Kilometerstand an.",
        "Indica el kilometraje.",
      ),
      fuel: t(
        "Choisissez un carburant.",
        "Select the fuel type.",
        "Wählen Sie den Kraftstoff.",
        "Elige un combustible.",
      ),
      gearbox: t(
        "Choisissez une boîte de vitesses.",
        "Select the transmission.",
        "Wählen Sie das Getriebe.",
        "Elige el tipo de cambio.",
      ),
      price: t(
        "Indiquez un prix en euros.",
        "Enter the price in euros.",
        "Geben Sie den Preis in Euro an.",
        "Indica un precio en euros.",
      ),
      city: t(
        "Indiquez la ville.",
        "Enter the town or city.",
        "Geben Sie den Ort an.",
        "Indica la ciudad.",
      ),
    };
    if (!value && !formState.form.elements[key].validity.badInput)
      return !draft || key === "make" ? required[key] : "";
    const range = ranges[key];
    if (
      range &&
      (formState.form.elements[key].validity.badInput ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) < range[0] ||
        Number(value) > range[1])
    ) {
      const [lo, hi] = range.map((n) => api().num(n));
      return t(
        `Entrez un nombre entier entre ${lo} et ${hi}.`,
        `Enter a whole number from ${lo} to ${hi}.`,
        `Geben Sie eine ganze Zahl zwischen ${lo} und ${hi} ein.`,
        `Introduce un número entero entre ${lo} y ${hi}.`,
      );
    }
    return "";
  }
  function validate(values, draft) {
    let firstError;
    for (const key of fields) {
      const input = formState.form.elements[key],
        error = fieldError(key, values[key], draft);
      document.getElementById("gg-err-" + key).textContent = error;
      input.setAttribute("aria-invalid", String(!!error));
      if (error && !firstError) firstError = input;
    }
    if (firstError) {
      setEditorTab("vehicle");
      firstError.focus();
    }
    return !firstError;
  }
  function newId() {
    return (
      globalThis.crypto?.randomUUID?.() ||
      "local-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10)
    );
  }
  function save(draft) {
    if (!formState || formState.media.busy()) return;
    const values = readValues();
    const feedback = document.getElementById("gg-form-message");
    if (!validate(values, draft)) {
      feedback.textContent = t(
        "Vérifiez les champs indiqués avant d’enregistrer.",
        "Check the highlighted fields before saving.",
        "Prüfen Sie die markierten Felder vor dem Speichern.",
        "Revisa los campos señalados antes de guardar.",
      );
      return;
    }
    const original = formState.original,
      latest = original.id && ownCar(original.id);
    if (
      original.id &&
      (!latest ||
        latest.updated !== original.updated ||
        latest.status !== original.status)
    ) {
      feedback.textContent = t(
        "Cette annonce a changé dans un autre onglet. Rouvrez-la depuis le garage pour la modifier.",
        "This listing changed in another tab. Reopen it from the garage to edit the latest version.",
        "Dieses Inserat wurde in einem anderen Tab geändert. Öffnen Sie es erneut in der Garage.",
        "El anuncio ha cambiado en otra pestaña. Vuelve a abrirlo desde el garaje para editarlo.",
      );
      return;
    }
    syncTextInputs();
    const originalLang = formState.originalLang;
    const texts = Object.fromEntries(
      Object.entries(formState.texts).map(([code, copy]) => [
        code,
        Object.fromEntries(textKeys.map((key) => [key, copy[key].trim()])),
      ]),
    );
    const status = draft
      ? "draft"
      : original.status === "archived"
        ? "archived"
        : "active";
    const car = {
      ...original,
      ...formState.media.read(),
      ...texts[originalLang],
      texts,
      originalLang,
      id: original.id || newId(),
      own: true,
      status,
    };
    for (const key of fields) {
      const value = values[key].trim();
      car[key] = value && ranges[key] ? Number(value) : value;
    }
    try {
      api().save(car);
    } catch {
      feedback.textContent = label("storageError");
      return;
    }
    dispose({ saved: true });
    api().go(draft ? "garage/draft" : "car/" + encodeURIComponent(car.id));
    api().toast(
      draft
        ? t(
            "Brouillon enregistré.",
            "Draft saved.",
            "Entwurf gespeichert.",
            "Borrador guardado.",
          )
        : original.status === "active" || original.status === "archived"
          ? t(
              "Modifications enregistrées.",
              "Changes saved.",
              "Änderungen gespeichert.",
              "Cambios guardados.",
            )
          : t(
              "La voiture apparaît maintenant dans le catalogue de démonstration.",
              "The car now appears in the demo catalogue.",
              "Das Fahrzeug ist jetzt im Demo-Katalog zu sehen.",
              "El coche ya aparece en el catálogo de demostración.",
            ),
    );
  }

  function mountForm(id) {
    const form = document.getElementById("gg-form");
    if (!form) return;
    const original = id ? ownCar(id) : {};
    formState = {
      form,
      original: { ...original },
      originalLang: original.originalLang || (id ? "fr" : I18n.lang()),
      texts: readTexts(original),
      textLang: I18n.lang(),
      tab: "vehicle",
    };
    formState.closeChoices = VehicleDirectory.bind(form, api().cars());
    const tabs = [...form.querySelectorAll("[data-editor-tab]")];
    for (const [index, button] of tabs.entries()) {
      button.addEventListener("click", () =>
        setEditorTab(button.dataset.editorTab),
      );
      button.addEventListener("keydown", (event) => {
        const targets = {
          ArrowRight: (index + 1) % tabs.length,
          ArrowLeft: (index + tabs.length - 1) % tabs.length,
          Home: 0,
          End: tabs.length - 1,
        };
        if (!Object.hasOwn(targets, event.key)) return;
        event.preventDefault();
        setEditorTab(tabs[targets[event.key]].dataset.editorTab, true);
      });
    }
    displayTextInputs();
    formState.media = CarMedia.bindEditor(
      document.getElementById("gg-media"),
      original,
      mediaChanged,
    );
    formState.baseline = fingerprint();
    refreshPreview();
    form.querySelector("#gg-text-lang").addEventListener("change", (event) => {
      syncTextInputs();
      formState.textLang = event.target.value;
      displayTextInputs();
    });
    form.addEventListener("input", (event) => {
      if (fields.includes(event.target.name)) {
        event.target.removeAttribute("aria-invalid");
        document.getElementById("gg-err-" + event.target.name).textContent = "";
        document.getElementById("gg-form-message").textContent = "";
        refreshPreview();
      }
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      save(false);
    });
    form
      .querySelector("#gg-draft")
      ?.addEventListener("click", () => save(true));
  }
  function changeStatus(id) {
    const car = ownCar(id);
    if (!car || !["active", "archived"].includes(car.status)) return;
    const restore = car.status === "archived";
    api().dialog({
      title: label(restore ? "restore" : "archive") + " · " + titleOf(car),
      body: restore
        ? t(
            "La voiture réapparaîtra dans le catalogue.",
            "The car will reappear in the catalogue.",
            "Das Fahrzeug wird wieder im Katalog angezeigt.",
            "El coche volverá a aparecer en el catálogo.",
          )
        : t(
            "La voiture sera retirée du catalogue. Vous pourrez la remettre en vente depuis l’onglet « Archivées ».",
            "This will remove the car from the catalogue. You can restore it from Archived.",
            "Das Fahrzeug verschwindet aus dem Katalog. Unter „Archiviert“ können Sie es wiederherstellen.",
            "El coche dejará de aparecer en el catálogo. Podrás restaurarlo desde «Archivados».",
          ),
      confirm: label(restore ? "restore" : "archive"),
      onConfirm() {
        const current = ownCar(id);
        if (!current || current.status !== car.status) {
          api().refresh();
          return;
        }
        const status = restore ? "active" : "archived";
        try {
          api().save({ ...current, status });
        } catch {
          api().toast(label("storageError"));
          return;
        }
        api().go("garage/" + status);
        api().toast(
          restore
            ? t(
                "Annonce restaurée.",
                "Listing restored.",
                "Inserat wiederhergestellt.",
                "Anuncio restaurado.",
              )
            : t(
                "Annonce archivée.",
                "Listing archived.",
                "Inserat archiviert.",
                "Anuncio archivado.",
              ),
        );
      },
    });
  }

  window.addEventListener("beforeunload", (event) => {
    if (dirty()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.Garage = {
    render(route) {
      return route[0] === "form" ? formView(route[1]) : garageView(route[1]);
    },
    afterRender(route) {
      dispose();
      if (route[0] === "form") mountForm(route[1]);
      if (route[0] === "garage") {
        if (route[1] === "showcase") Showcase.mount();
        if (["profile", "reviews"].includes(route[1]))
          OwnerContent.mount(route[1]);
        document
          .querySelectorAll("[data-change-status]")
          .forEach((button) =>
            button.addEventListener("click", () =>
              changeStatus(button.dataset.changeStatus),
            ),
          );
      }
    },
    guardLeave,
    changeStatus,
    captureForm,
    restoreForm,
  };
})();
