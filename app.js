"use strict";
(() => {
  const main = document.querySelector("#main");
  const sheet = document.querySelector("#sheet");
  const storageKey = "virage.local.v1.listings";
  const seed = window.VIRAGE_SEED;
  const { label: l, value, money, num } = I18n;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const paths = {
    mail: "M3 5h18v14H3zM4 6l8 7 8-7",
    globe:
      "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18m-9-9c5 5 5 13 0 18-5-5-5-13 0-18Z",
    plus: "M12 5v14M5 12h14",
    arrow: "M4 12h15m-6-6 6 6-6 6",
    out: "M6 18 18 6M8 6h10v10",
    chevron: "m8 5 7 7-7 7",
    up: "m5 15 7-7 7 7",
    down: "m5 9 7 7 7-7",
    back: "M20 12H5m6-6-6 6 6 6",
    prev: "m15 5-7 7 7 7",
    user: "M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0",
    close: "m6 6 12 12M18 6 6 18",
    menu: "M3 6h18M3 12h18M3 18h18",
    grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    sliders: "M3 7h8m5 0h5M3 17h3m5 0h10M11 4v6m-5 4v6",
    check: "m4 12 5 5L20 6",
    search: "M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Zm-2 5 6 6",
    pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    edit: "m4 16-1 5 5-1L20 8l-4-4ZM14 6l4 4",
    archive: "M3 4h18v5H3zM5 9v11h14V9M9 13h6",
    restore: "M4 10a8 8 0 1 1 0 5m0-11v6h6",
    image: "M3 4h18v16H3zM3 17l5-5 4 4 3-3 6 6M15 9h.1",
    car: "M3 16V9l4-5h10l4 5v7H3Zm3 0v3m12-3v3M3 10h18m-14 3h1m8 0h1",
    expand: "M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5",
    book: "M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z",
    clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-6v6l4 2",
  };
  const icon = (name) =>
    '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="' +
    (paths[name] || paths.car) +
    '"/></svg>';
  const view = window.StudioView;
  const brand = view?.brand ||
    '<span class="brand"><img src="assets/mark.svg" alt="" width="36" height="36"><span>Claude <em>Cars</em></span></span>';
  const validStatuses = new Set(["draft", "active", "archived"]);
  let slide = 0;
  let renderedHash = null;
  let historyIndex = Number.isSafeInteger(history.state?.virageIndex)
    ? history.state.virageIndex
    : 0;
  let undoingTraversal = false;
  let detailReturn = "catalogue";
  let toastTimer;
  let storageWarning = false;
  const validId = /^[A-Za-z0-9_-]{1,90}$/;
  function localCars() {
    const value = localStorage.getItem(storageKey);
    if (!value) return [];
    const records = JSON.parse(value);
    if (
      !Array.isArray(records) ||
      records.some(
        (c) => !c || !validId.test(c.id) || !validStatuses.has(c.status),
      )
    )
      throw Error("Données locales illisibles.");
    return records;
  }
  function cars() {
    let local = [];
    try {
      local = localCars();
    } catch {
      storageWarning = true;
    }
    const ids = new Set(local.map((c) => c.id));
    return [...local, ...seed.filter((c) => !ids.has(c.id))].sort(
      (a, b) => b.updated - a.updated,
    );
  }
  function save(car) {
    const local = localCars();
    if (!validId.test(car.id) || !validStatuses.has(car.status))
      throw Error("Annonce invalide.");
    const record = { ...car, own: true, updated: Date.now() };
    localStorage.setItem(
      storageKey,
      JSON.stringify([record, ...local.filter((c) => c.id !== record.id)]),
    );
    return record;
  }
  function photo(car) {
    const src = car?.image || "";
    return /^assets\/(?:cars|media)\/[\w.-]+\.(webp|jpe?g|png)$/i.test(src) ||
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(src)
      ? src
      : "assets/placeholder.svg";
  }
  function toast(message) {
    clearTimeout(toastTimer);
    document.querySelector("#notice").textContent = message;
    toastTimer = setTimeout(
      () => (document.querySelector("#notice").textContent = ""),
      3700,
    );
  }
  function canLeave(continueNavigation) {
    if (/^(contact(?:\?|$)|garage\/enquiries(?:\?|$))/.test(renderedHash || ""))
      return Contacts.guardLeave(continueNavigation);
    if (renderedHash === "garage/showcase")
      return Showcase.guardLeave(continueNavigation);
    if (renderedHash?.startsWith("form") && window.Garage?.guardLeave)
      return Garage.guardLeave(continueNavigation);
    if (
      /^garage\/(profile|reviews)(?:$|\?)/.test(renderedHash || "") &&
      window.OwnerContent?.guardLeave
    )
      return OwnerContent.guardLeave(continueNavigation);
    return true;
  }
  function go(path) {
    const target = path || "accueil";
    if (target === renderedHash) return;
    const enter = () => {
      history.pushState({ virageIndex: historyIndex + 1 }, "", "#" + target);
      render();
    };
    if (canLeave(enter)) enter();
  }
  function showSheet(title, body, kind = "") {
    if (sheet.open) sheet.close();
    sheet.className = kind;
    sheet.innerHTML = `<header><h2 id="sheet-title">${esc(title)}</h2>
      <button type="button" class="icon-btn" data-close aria-label="${l("close")}">${icon("close")}</button></header>${body}`;
    sheet.setAttribute("aria-labelledby", "sheet-title");
    sheet.showModal();
    if (kind === "menu-sheet")
      document
        .querySelector("[data-menu]")
        ?.setAttribute("aria-expanded", "true");
  }
  function dialog({ title, body, confirm, onConfirm }) {
    showSheet(
      title,
      `<p>${esc(body)}</p><div class="actions">
      <button class="btn" data-close>${l("cancel")}</button>
      <button class="btn primary" id="confirm-action">${esc(confirm)}</button></div>`,
    );
    sheet.querySelector("#confirm-action").addEventListener(
      "click",
      () => {
        sheet.close();
        onConfirm?.();
      },
      { once: true },
    );
  }
  function navLink(id, label, current, css = "") {
    const ownerDetail =
      current === "car" && /^garage(?:\/|$)/.test(detailReturn);
    const here =
      current === id ||
      (id === "garage" && (current === "form" || ownerDetail)) ||
      (id === "catalogue" && current === "car" && !ownerDetail);
    return `<a href="#${id}" class="${css}" ${here ? 'aria-current="page"' : ""}>${label}</a>`;
  }
  function changeLanguage(code) {
    const headerVisible = window.scrollY < document.querySelector("#header").offsetHeight;
    const snapshot = window.Garage?.captureForm?.();
    if (snapshot === false) return;
    const filters = document.querySelector("#catalog-filters");
    const pending = filters ? new FormData(filters) : null;
    I18n.set(code);
    refresh();
    window.Garage?.restoreForm?.(snapshot);
    if (pending) {
      const form = document.querySelector("#catalog-filters");
      if (form) {
        form.elements.make.value = pending.get("make");
        updateModelFilter(form, pending.get("model") || "");
      }
      for (const [name, value] of pending) {
        if (form?.elements.namedItem(name))
          form.elements.namedItem(name).value = value;
      }
    }
    document.querySelector("#language")?.focus({ preventScroll: true });
    if (headerVisible) window.scrollTo(0, 0);
  }
  const ownerLabel = () =>
    I18n.t(
      "Espace Claude",
      "Claude’s workspace",
      "Claudes Bereich",
      "Espacio de Claude",
    );
  function chrome(page) {
    const wordmark = `<a href="#accueil" aria-label="Claude Cars — ${l("home")}">${brand}</a>`;
    document.querySelector(".skip").textContent = l("skip");
    document.querySelector("#header").innerHTML =
      `<div class="mast wrap"><div class="mast-identity">${wordmark}<small class="brand-demo">${l("demo")}</small></div>
        <nav aria-label="${l("mainNav")}">${navLink("accueil", l("home"), page)}${navLink("catalogue", l("catalogue"), page)}${navLink("claude", l("about"), page)}${navLink("contact", l("contact"), page)}</nav>
        <div class="mast-end"><span class="demo-tag">${l("demo")}</span>${navLink("contact", l("contact"), page, "quick-contact")}${LanguageMenu.markup(icon)}
        ${navLink("garage", icon("user") + ownerLabel(), page, "owner-entry")}
        <button class="icon-btn mobile-nav" data-menu aria-expanded="false" aria-controls="sheet" aria-label="${l("openMenu")}" aria-haspopup="dialog">${icon("menu")}</button></div></div>`;
    LanguageMenu.bind(changeLanguage);
    document.querySelector("#footer").innerHTML =
      `<div class="wrap foot">${wordmark}<span>${l("footer")}</span>
      <nav aria-label="${l("menu")}"><a href="#contact">${l("contact")}</a><a href="#claude">${l("about")}</a><a href="#garage">${ownerLabel()}</a><button data-credits>${l("credits")}</button></nav></div>`;
  }
  function card(c) {
    const video = Object.hasOwn(c, "video") ? c.video : CarMedia.seed(c).video;
    const filmLabel = I18n.t(
      "Voir la vidéo",
      "View video",
      "Video ansehen",
      "Ver vídeo",
    );
    const filmLink =
      video && video.kind !== "photo-film"
        ? `<a class="film-tag" href="#car/${encodeURIComponent(c.id)}?media=video" aria-label="${esc(filmLabel + " · " + c.make + " " + c.model)}"><span aria-hidden="true">▶</span> ${filmLabel}</a>`
        : "";
    return (
      '<article class="listing-tile"><a class="car-card" href="#car/' +
      encodeURIComponent(c.id) +
      '"><div class="car-pic"><img loading="lazy" src="' +
      esc(photo(c)) +
      '" alt=""><span class="car-tag">' +
      esc(c.year) +
      '</span></div><div class="car-info"><div class="car-nameprice"><h3>' +
      esc(c.make + " " + c.model) +
      "</h3><strong>" +
      money(c.price) +
      '</strong></div><p class="facts">' +
      num(c.km) +
      " km · " +
      esc(value(c.gearbox)) +
      " · " +
      esc(value(c.fuel)) +
      '</p><p class="city">' +
      icon("pin") +
      esc(c.city) +
      "</p></div></a>" +
      filmLink +
      "</article>"
    );
  }
  function activeCars() {
    return cars().filter((c) => c.status === "active");
  }
  function featured() {
    return Showcase.featured(activeCars());
  }
  function featurePhoto(choices) {
    const c = choices[slide];
    const total = choices.length;
    const controls =
      total > 1
        ? `<div class="slide-tools">
      <span class="idx" aria-hidden="true">${String(slide + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}</span>
      <button type="button" data-slide="-1" aria-label="${l("previous")}">${icon("prev")}</button>
      <button type="button" data-slide="1" aria-label="${l("next")}">${icon("chevron")}</button>
    </div>`
        : "";
    return `<a href="#car/${encodeURIComponent(c.id)}" aria-label="${esc(l("viewCar") + " · " + c.make + " " + c.model)}"><img fetchpriority="high" src="${esc(photo(c))}" alt="">
      <span class="hero-meta"><small>${icon("pin")}${esc(c.city)}</small><b>${money(c.price)}</b></span></a>${controls}
      <span class="visually-quiet" role="status">${esc(c.make + " " + c.model)} · ${slide + 1} / ${total}</span>`;
  }
  function heroCopy(c) {
    const name = [c.make, c.model].join(" ");
    // Keep a numbered model family with the make on editorial covers.
    const split = /^(\d{3})\s+(.+)$/.exec(c.model);
    const top = split ? c.make + " " + split[1] : c.make;
    const bottom = split ? split[2] : c.model;
    return `<div class="kicker rule-tag">${l("cover")}</div>
      <h1 class="cover-title${Math.max(top.length, bottom.length) > 15 ? " long-title" : ""}"><span>${esc(top)}</span> <em>${esc(bottom)}</em></h1>
      <p class="cover-facts">${esc(c.year)} <i>·</i> ${num(c.km)} km <i>·</i> ${esc(value(c.gearbox))}</p>
      <div class="hero-actions"><a class="btn light" href="#car/${encodeURIComponent(c.id)}" aria-label="${esc(l("viewCar") + " · " + name)}">${l("viewCar")} ${icon("arrow")}</a>
      <a class="hero-about" href="#catalogue">${l("fullCatalog")}</a></div>`;
  }
  function changeSlide(direction) {
    const root = document.querySelector(".hero-visual");
    const list = featured();
    if ((!root && !document.querySelector("#studio-cover")) || list.length < 2) return;
    slide = (slide + direction + list.length) % list.length;
    if (view) {
      view.updateCover(list, slide, direction);
      return;
    }
    const next = list[slide];
    document.querySelector(".hero-copy").innerHTML = heroCopy(next);
    const link = root.querySelector("a");
    link.href = "#car/" + encodeURIComponent(next.id);
    link.setAttribute("aria-label", l("viewCar") + " · " + next.make + " " + next.model);
    const img = link.querySelector("img");
    img.src = photo(next);
    root.querySelector(".hero-meta small").innerHTML = icon("pin") + esc(next.city);
    root.querySelector(".hero-meta b").textContent = money(next.price);
    root.querySelector(".idx").textContent =
      String(slide + 1).padStart(2, "0") +
      " / " +
      String(list.length).padStart(2, "0");
    root.querySelector('[role="status"]').textContent =
      next.make + " " + next.model + " · " + (slide + 1) + " / " + list.length;
    img.getAnimations().forEach((animation) => animation.cancel());
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      img.animate([{ opacity: 0.72 }, { opacity: 1 }], {
        duration: 200,
        easing: "ease-out",
      });
    }
  }
  function emptyStock() {
    return `<div class="empty"><h2>${l("noStock")}</h2><p>${l("noStockText")}</p><a class="btn" href="#claude">${l("about")}</a></div>`;
  }
  function home() {
    const stock = activeCars();
    const latest = stock.slice(0, 3);
    if (!latest.length) return `<section class="wrap empty unavailable-car"><h1>${l("noStock")}</h1><p>${l("noStockText")}</p><a class="btn primary" href="#claude">${l("aboutLink")} ${icon("arrow")}</a></section>`;
    const choices = Showcase.featured(stock);
    const n = stock.length;
    const stockLink = n === 1 ? l("fullCatalog") : I18n.t(`Les ${n} voitures`, `All ${n} cars`, `Alle ${n} Fahrzeuge`, `Ver los ${n} coches`);
    slide %= choices.length;
    if (view) return view.home({ stock, choices, slide, stockLink, card });
    return `<div class="wrap hero-wrap"><section class="hero" aria-label="${l("featured")}">
      <div class="hero-copy">${heroCopy(choices[slide])}</div>
      <div class="hero-visual">${featurePhoto(choices)}</div></section></div>
      <section class="wrap section"><div class="section-head"><div><h2 class="heading">${l("latest")}</h2></div><a class="textlink" href="#catalogue">${stockLink} ${icon("out")}</a></div>
      <div class="cards">${latest.map(card).join("")}</div></section>
      <section class="wrap seller-note"><div><h2 class="heading">${l("about")}</h2><p>${esc(ClaudePage.profile()[I18n.lang()].intro)}</p></div>
      <a class="textlink" href="#claude">${l("aboutLink")} ${icon("arrow")}</a></section>`;
  }
  const defaultFilters = {
    q: "",
    make: "",
    model: "",
    price: "",
    gearbox: "",
    sort: "recent",
  };
  function getFilters() {
    const values = new URLSearchParams(location.hash.split("?")[1] || "");
    return Object.fromEntries(
      Object.entries(defaultFilters).map(([k, v]) => [k, values.get(k) || v]),
    );
  }
  function catalogPath(filters) {
    const query = new URLSearchParams();
    Object.entries(defaultFilters).forEach(([key, v]) => {
      if (filters[key] && filters[key] !== v) query.set(key, filters[key]);
    });
    return "catalogue" + (query.size ? "?" + query : "");
  }
  function folded(s) {
    return String(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }
  function matches(f) {
    const list = activeCars().filter(
      (c) =>
        (!f.make || c.make === f.make) &&
        (!f.model || c.model === f.model) &&
        (!f.price || c.price <= Number(f.price)) &&
        (!f.gearbox || c.gearbox === f.gearbox) &&
        folded([c.make, c.model, c.year, c.city].join(" ")).includes(
          folded(f.q.trim()),
        ),
    );
    if (f.sort === "low") list.sort((a, b) => a.price - b.price);
    if (f.sort === "high") list.sort((a, b) => b.price - a.price);
    if (f.sort === "year") list.sort((a, b) => a.year - b.year);
    return list;
  }
  function options(items, current) {
    return items
      .map(
        ([v, label]) =>
          '<option value="' +
          esc(v) +
          '"' +
          (current === v ? " selected" : "") +
          ">" +
          esc(label) +
          "</option>",
      )
      .join("");
  }
  function modelOptions(make, selected = "") {
    const names = activeCars().filter((c) => c.make === make).map((c) => c.model);
    // Keep a saved filter visible even if the matching car has since been archived.
    if (selected) names.push(selected);
    return options([["", l("allModels")], ...[...new Set(names)].sort().map((m) => [m, m])], selected);
  }
  function updateModelFilter(form, selected = "") {
    const make = form.elements.make.value;
    const select = form.elements.model;
    select.innerHTML = modelOptions(make, selected);
    select.closest("label").hidden = !make && !selected;
  }
  function filterFields(f) {
    const makes = [...new Set(activeCars().map((c) => c.make))].sort();
    if (f.make && !makes.includes(f.make)) makes.push(f.make);
    return `<label>${l("make")}<select name="make">${options([["", l("allMakes")], ...makes.map((m) => [m, m])], f.make)}</select></label>
      <label data-model-filter ${f.make || f.model ? "" : "hidden"}>${l("model")}<select name="model">${modelOptions(f.make, f.model)}</select></label>
      <label>${l("maxPrice")}<input name="price" inputmode="numeric" type="number" min="0" max="999999999" step="1" value="${esc(f.price)}" placeholder="${l("unlimited")}"></label>
      <label>${l("gearbox")}<select name="gearbox">${options([["", l("allGears")], ...["Manuelle", "Automatique"].map((s) => [s, value(s)])], f.gearbox)}</select></label>`;
  }
  function sortChoices() {
    return [
      ["recent", l("recent")],
      ["low", l("low")],
      ["high", l("high")],
      ["year", l("yearSort")],
    ];
  }
  function filtersOf(form) {
    const filters = {
      ...getFilters(),
      ...Object.fromEntries(new FormData(form)),
    };
    filters.q = filters.q.trim();
    return filters;
  }
  function activeFilterBar(f, keys) {
    if (!keys.length) return "";
    const remove = I18n.t(
      "Retirer le filtre",
      "Remove filter",
      "Filter entfernen",
      "Quitar filtro",
    );
    const labels = {
      q: f.q,
      make: f.make,
      model: f.model,
      price: "≤ " + money(f.price),
      gearbox: value(f.gearbox),
    };
    const pills = keys
      .map((key) => {
        const text = labels[key];
        const href = catalogPath({ ...f, ...(key === "make" ? { model: "" } : {}), [key]: "" });
        return `<a class="filter-chip" href="#${esc(href)}" aria-label="${esc(remove + " · " + text)}">${esc(text)} ${icon("close")}</a>`;
      })
      .join("");
    const clear =
      keys.length > 1
        ? `<a class="filter-clear" href="#${esc(catalogPath({ sort: f.sort }))}">${l("clearFilters")}</a>`
        : "";
    return `<div class="applied-filters">${pills}${clear}</div>`;
  }
  function catalog() {
    const f = getFilters(),
      results = matches(f);
    const used = Object.keys(defaultFilters).filter(
      (k) => k !== "sort" && f[k],
    );
    const empty = used.length
      ? `<div class="empty"><h2>${l("noResults")}</h2><p>${l("tryFilters")}</p><a class="btn primary" href="#${esc(catalogPath({ sort: f.sort }))}">${l("resetFilters")}</a></div>`
      : emptyStock();
    return `<div class="wrap catalogue"><header class="page-head"><h1>${l("inventory")}</h1></header>
      <form class="filters" id="catalog-filters"><div class="search-field"><label for="catalog-search">${l("search")}</label><span>${icon("search")}
      <input type="search" id="catalog-search" name="q" maxlength="100" value="${esc(f.q)}" placeholder="${l("searchHint")}"><button type="submit" class="search-submit" aria-label="${l("searchGo")}">${icon("arrow")}</button></span></div>
      <div class="desktop-fields">${filterFields(f)}</div><button class="btn primary apply">${l("search")}</button>
      <button class="btn filter-mobile" type="button" data-filters>${icon("sliders")}${l("filters")}${used.length ? " (" + used.length + ")" : ""}</button></form>
      ${activeFilterBar(f, used)}<div class="resultbar"><div><strong>${I18n.count(results.length)}</strong></div>
      <label>${l("sort")} <select aria-label="${l("sort")}" id="sort">${options(sortChoices(), f.sort)}</select></label></div>
      ${results.length ? `<div class="cards">${results.map(card).join("")}</div>` : empty}</div>`;
  }
  function detail(id) {
    const c = cars().find((car) => car.id === id);
    if (!c) return missing();
    const manage = c.own && detailReturn.startsWith("garage");
    if (!manage && c.status !== "active") {
      return `<section class="empty wrap unavailable-car"><h1>${I18n.t("Cette voiture n’est plus en vente", "This car is currently unavailable", "Dieses Fahrzeug ist derzeit nicht im Angebot", "Este coche no está a la venta")}</h1><p>${l("missingText")}</p><a class="btn primary" href="#catalogue">${l("explore")} ${icon("arrow")}</a></section>`;
    }
    const back =
      manage && c.status !== "active" ? "garage/" + c.status : detailReturn;
    const backLabel = back.startsWith("garage")
      ? l("garage")
      : back === "accueil"
        ? l("home")
        : l("catalogue");
    const specs = [
      [l("year"), c.year],
      [l("mileage"), c.km !== "" && c.km != null ? num(c.km) + " km" : ""],
      [l("gearbox"), value(c.gearbox)],
      [l("fuel"), value(c.fuel)],

    ];
    const city = (c.city || "").trim();
    const mapQuery = seed.some((car) => car.city.toLowerCase() === city.toLowerCase())
      ? city + ", Belgium"
      : city;
    const mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapQuery);
    const locationRow = `<div><dt>${l("location")}</dt><dd>${city
      ? `<a class="city-map" href="${esc(mapUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(city + " · " + l("openMap"))}">${esc(city)} ${icon("out")}<small>Google Maps</small></a>`
      : l("unspecified")}</dd></div>`;
    const change = c.status === "archived" ? "restore" : "archive";
    const actions = manage
      ? `<a class="btn primary" href="#form/${c.id}">${icon("edit")}${l("edit")}</a>
      ${c.status !== "draft" ? `<button class="btn" data-change="${c.id}">${icon(change)}${l(change)}</button>` : ""}`
      : `<a class="btn primary" href="#contact?car=${encodeURIComponent(c.id)}">${icon("mail")}${l("contactClaude")}</a>
      <a class="seller-profile-link" href="#claude">${l("aboutLink")}</a>`;
    function descriptionParagraph(key, fallback) {
      const text = CarCopy.field(c, key);
      if (!text) return `<p>${l(fallback)}</p>`;
      const translations = CarCopy.variants(c, key);
      if (translations[I18n.lang()]) return `<p>${esc(text)}</p>`;
      const source = Object.keys(translations).find(
        (language) => translations[language] === text,
      );
      const languageName = {
        fr: "Français",
        en: "English",
        de: "Deutsch",
        es: "Español",
      }[source];
      const caption = I18n.t(
        "Langue du texte",
        "Text language",
        "Textsprache",
        "Idioma del texto",
      );
      return `<p lang="${source}">${esc(text)}</p><small class="content-language">${caption} · ${languageName}</small>`;
    }
    return `<div class="wrap detail"><a href="#${esc(back)}" class="backlink">${icon("back")}${backLabel}</a>
      <div class="detail-grid">${window.CarMedia.detail(c)}<article class="detail-copy"><div class="kicker rule-tag">${l("selection")} · ${l(c.status)}</div>
      <h1>${esc([c.make, c.model].filter(Boolean).join(" ") || l("noTitle"))}</h1><div class="price">${c.price ? money(c.price) : l("noPrice")}</div>
      <dl class="specs">${specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v || l("unspecified"))}</dd></div>`).join("")}${locationRow}</dl><div class="detail-actions">${actions}</div></article></div>
      <section class="description"><h2 class="heading">${l("detailsTitle")}</h2>
      ${descriptionParagraph("description", "noDescription")}</section><div class="vehicle-notes">
      <section class="description"><h2 class="heading">${l("equipment")}</h2>${descriptionParagraph("equipment", "noEquipment")}</section>
      <section class="description"><h2 class="heading">${l("condition")}</h2>${descriptionParagraph("condition", "noCondition")}</section></div>
      ${manage ? "" : `<a class="textlink detail-enquiry" href="#contact?car=${encodeURIComponent(c.id)}">${l("askAboutCar")} ${icon("arrow")}</a>`}</div>`;
  }
  function missing() {
    return `<section class="empty wrap"><h1>${l("missing")}</h1><p>${l("missingText")}</p><a class="btn primary" href="#catalogue">${l("explore")}</a></section>`;
  }
  function render(scroll = true) {
    const old = renderedHash,
      hash = location.hash.slice(1) || "accueil";
    const route = hash.split("?")[0].split("/"),
      page = route[0];
    historyIndex = Number.isSafeInteger(history.state?.virageIndex)
      ? history.state.virageIndex
      : historyIndex + 1;
    history.replaceState({ ...history.state, virageIndex: historyIndex }, "");
    if (page === "accueil" && old !== hash) slide = 0;
    if (page === "car") {
      const previous = history.state?.virageReturn || old || "";
      if (/^(accueil|catalogue|garage)([/?]|$)/.test(previous)) {
        detailReturn = previous;
      } else if (previous.startsWith("form")) {
        const status =
          cars().find((car) => car.id === route[1])?.status || "active";
        detailReturn = "garage/" + status;
      } else if (old !== hash) {
        detailReturn = "catalogue";
      }
      history.replaceState(
        { ...history.state, virageReturn: detailReturn },
        "",
      );
    }
    window.CarMedia?.unmount();
    renderedHash = hash;
    if (sheet.open) sheet.close();
    chrome(page);
    let content;
    if (page === "accueil") content = home();
    else if (page === "claude") content = window.ClaudePage.render();
    else if (page === "catalogue") content = catalog();
    else if (page === "contact") content = Contacts.render();
    else if (page === "car") content = detail(route[1]);
    else if ((page === "garage" || page === "form") && window.Garage)
      content = Garage.render(route);
    else content = missing();
    main.innerHTML = content;
    main.dataset.route = hash;
    view?.mount(page);
    if (storageWarning) {
      const msg = document.createElement("p");
      msg.className = "storage-warning";
      msg.textContent = l("storageWarning");
      main.prepend(msg);
    }
    window.Garage?.afterRender(route);
    if (page === "contact" || (page === "garage" && route[1] === "enquiries")) Contacts.mount();
    if (page === "claude") window.ClaudePage.mount();
    if (page === "car") {
      const car = cars().find((c) => c.id === route[1]);
      if (car) window.CarMedia.mount(car);
    }
    const h1 = main.querySelector("h1")?.textContent;
    const workspaceSection = page === "garage" && route[1] && main.querySelector(".gg-work-nav [aria-current]")?.textContent.trim();
    const title = page === "accueil" ? l("title") : h1 || l("garage");
    document.title = (workspaceSection ? workspaceSection + " · " : "") + title + " — Claude Cars";
    if (scroll) {
      window.scrollTo(0, 0);
      if (old !== null) main.focus({ preventScroll: true });
    }
  }
  function refresh() {
    render(false);
  }
  window.App = {
    cars,
    save,
    go,
    refresh,
    esc,
    money,
    num,
    toast,
    icon,
    dialog,
    photo,
    showSheet,
  };
  window.addEventListener("hashchange", () => {
    const target = location.hash.slice(1) || "accueil";
    if (target === renderedHash) {
      undoingTraversal = false;
      return;
    }
    const index = history.state?.virageIndex;
    const delta = Number.isSafeInteger(index) ? index - historyIndex : 0;
    const resume = () => (delta ? history.go(delta) : go(target));
    if (canLeave(resume)) {
      render();
    } else if (delta && !undoingTraversal) {
      // Return to the original history entry while the user decides. Cancel
      // must preserve both the draft and the browser's Back/Forward path.
      undoingTraversal = true;
      history.go(-delta);
    } else {
      history.replaceState(
        { virageIndex: historyIndex },
        "",
        "#" + renderedHash,
      );
    }
  });
  window.addEventListener("storage", (e) => {
    if (e.key === storageKey && !renderedHash.startsWith("form")) refresh();
  });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button,a");
    if (!b) return;
    if (b.matches(".skip")) {
      e.preventDefault();
      main.focus();
      return;
    }
    if (b.matches("[data-close]")) sheet.close();
    else if (b.matches("[data-slide]")) {
      changeSlide(Number(b.dataset.slide));
    } else if (b.matches("[data-menu]")) {
      const page = renderedHash.split(/[/?]/)[0];
      showSheet(
        l("menu"),
        `<nav class="sheet-nav">${navLink("accueil", l("home"), page)}${navLink("catalogue", l("catalogue"), page)}
        ${navLink("claude", l("about"), page)}${navLink("contact", l("contact"), page)}${navLink("garage", icon("user") + ownerLabel(), page, "menu-owner")}</nav>`,
        "menu-sheet",
      );
    } else if (b.matches("[data-filters]")) {
      const f = filtersOf(document.querySelector("#catalog-filters"));
      showSheet(
        l("filterCars"),
        `<form id="mobile-filters"><label>${l("search")}<input type="search" name="q" maxlength="100" value="${esc(f.q)}" placeholder="${l("searchHint")}"></label>
        ${filterFields(f)}<div class="actions"><button type="button" class="btn" data-reset>${l("reset")}</button>
        <button class="btn primary" data-filter-apply></button></div></form>`,
        "filter-sheet",
      );
      updateFilterCount();
    } else if (b.matches("[data-reset]")) {
      for (const input of sheet.querySelectorAll("input,select"))
        input.value = "";
      updateModelFilter(sheet.querySelector("#mobile-filters"));
      updateFilterCount();
    } else if (b.matches("[data-change]"))
      Garage.changeStatus(b.dataset.change);
    else if (b.matches("[data-credits]")) {
      const list = window.VIRAGE_CREDITS?.match(/<ul[\s\S]*<\/ul>/)?.[0] || "";
      const filmCredit = I18n.t(
        "Vidéo et photogrammes",
        "Video and stills",
        "Video und Standbilder",
        "Vídeo y fotogramas",
      );
      const adaptation = I18n.t(
        "Extrait converti en MP4, deux images extraites.",
        "Converted to MP4, with two still frames extracted.",
        "In MP4 konvertiert, zwei Standbilder entnommen.",
        "Conversión a MP4 y extracción de dos fotogramas.",
      );
      showSheet(
        l("credits"),
        `<p>${l("creditsBody")}</p>${list}<p class="film-credit"><b>${filmCredit} · Porsche 911 GT3 RS (997)</b><br>Damian Morys · <a href="https://commons.wikimedia.org/wiki/File:997_GT3_RS_Acceleration_Sound_-_Sets_Off_Car_Alarm.ogv" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> · <a href="https://creativecommons.org/licenses/by/2.0/" target="_blank" rel="noopener noreferrer">CC BY 2.0</a><br>${adaptation}</p>${view?.credits() || ""}`,
      );
    } else if (
      b.matches('a[href^="#"]') &&
      !e.defaultPrevented &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey &&
      !e.altKey &&
      e.button === 0
    ) {
      const target = b.getAttribute("href").slice(1);
      if (
        document.getElementById(target) &&
        !["claude", "contact", "garage", "accueil", "catalogue", "form"].includes(target)
      )
        return;
      e.preventDefault();
      if (sheet.open) sheet.close();
      go(target);
    }
  });
  function updateFilterCount() {
    const form = document.querySelector("#mobile-filters");
    if (!form) return;
    const n = matches(filtersOf(form)).length;
    form.querySelector("[data-filter-apply]").textContent = I18n.showCount(n);
  }
  document.addEventListener("input", (e) => {
    if (e.target.closest("#mobile-filters")) updateFilterCount();
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches('#catalog-filters [name="make"], #mobile-filters [name="make"]')) {
      updateModelFilter(e.target.form);
      if (e.target.form.id === "mobile-filters") updateFilterCount();
    }
    if (e.target.id === "sort") {
      const form = document.querySelector("#catalog-filters");
      if (form.reportValidity())
        go(catalogPath({ ...filtersOf(form), sort: e.target.value }));
      else e.target.value = getFilters().sort;
    }
  });
  document.addEventListener("submit", (e) => {
    if (!["catalog-filters", "mobile-filters"].includes(e.target.id)) return;
    e.preventDefault();
    const path = catalogPath(filtersOf(e.target));
    if (sheet.open) sheet.close();
    go(path);
  });
  sheet.addEventListener("close", () => {
    document
      .querySelector("[data-menu]")
      ?.setAttribute("aria-expanded", "false");
  });
  sheet.addEventListener("click", (e) => {
    if (e.target !== sheet) return;
    const r = sheet.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      sheet.close();
  });
  render();
})();
