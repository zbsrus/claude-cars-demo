"use strict";
(() => {
  const state = window.CC;
  if (!state || !window.CCPublicWords) return;
  const { lang, page, cars = [] } = state;
  const names = { fr: "Français", nl: "Nederlands", de: "Deutsch", en: "English", es: "Español" };
  const regions = { fr: "fr-BE", nl: "nl-BE", de: "de-DE", en: "en-GB", es: "es-ES" };
  const t = (key) => window.CCPublicWords[key]?.[lang] || "";
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
  const path = (suffix = "") => "/claude-cars-demo/version-c/" + lang + "/" + suffix + (suffix && !suffix.startsWith("#") ? "/" : "");
  const carPath = (car) => path("cars/" + encodeURIComponent(car.id));
  const carName = (car) => [car.make, car.model].filter(Boolean).join(" ");
  const firstPhoto = (car) => car.cover || car.photos?.find(Boolean) || "";
  const active = ["available", "soon", "reserved"].flatMap(status => cars.filter(car => car.status === status));
  const sold = cars.filter(car => car.status === "sold");
  const inventoryControls = {
    view: ["inventoryView", [["grid", "inventoryGrid"], ["list", "inventoryList"]]],
    density: ["inventorySize", [["standard", "inventoryStandard"], ["compact", "inventoryCompact"]]]
  };
  const inventoryKey = "cc.inventory.display";
  const inventoryDisplay = {view: "grid", density: "standard"};
  if ((page === "home" || page === "catalogue") && (active.length || sold.length)) {
    try {
      const saved = JSON.parse(localStorage.getItem(inventoryKey));
      for (const [kind, [, choices]] of Object.entries(inventoryControls)) {
        if (choices.some(([value]) => value === saved?.[kind])) inventoryDisplay[kind] = saved[kind];
      }
    } catch { /* Viewing the listings does not depend on browser storage. */ }
  }
  const formatNumber = new Intl.NumberFormat(regions[lang]);
  const money = new Intl.NumberFormat(regions[lang], {style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 2});
  const km = (value) => value !== null && value !== undefined && value !== "" ? formatNumber.format(value) + " km" : "";
  const price = (car) => car.status === "sold" ? "" : car.price == null || car.price === "" ? t("priceOnRequest") : money.format(car.price);
  const details = (car, key) => {
    const versions = car.translations || {};
    const code = versions[lang]?.[key] ? lang : Object.keys(versions).find(k => versions[k]?.[key]);
    return { code, text: code ? versions[code][key] : "" };
  };
  const symbols = {
    arrow: "M4 12h15m-6-6 6 6-6 6",
    down: "m6 9 6 6 6-6",
    arrowDown: "M12 5v14m-6-6 6 6 6-6",
    top: "M12 19V5m-6 6 6-6 6 6",
    left: "m14 6-6 6 6 6",
    right: "m10 6 6 6-6 6",
    globe: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-18 0h18m-9-9c5 5 5 13 0 18-5-5-5-13 0-18Z",
    menu: "M3 6h18M3 12h18M3 18h18",
    close: "m5 5 14 14m0-14L5 19",
    zoom: "M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6",
    message: "M21 11a9 9 0 0 1-13.4 7.9L3 20l1.1-4.4A9 9 0 1 1 21 11Z",
    location: "M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Zm-5 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z",
    clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2",
    copy: "M9 8h11v13H9zM5 16H3V3h12v2",
    grid: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    list: "M4 6h2m4 0h10M4 12h2m4 0h10M4 18h2m4 0h10",
    standard: "M4 9V4h5m6 0h5v5m0 6v5h-5m-6 0H4v-5",
    compact: "M4 9h5V4m6 0v5h5m0 6h-5v5m-6 0v-5H4",
    print: "M7 8V3h10v5M7 17H4V9h16v8h-3M7 14h10v7H7zM16 11h1"
  };
  const icon = (name) => '<svg class="cc-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="' + symbols[name] + '"/></svg>';
  const brand = () => '<a class="cc-brand" href="' + path() + '" aria-label="Claude Cars"><img src="/claude-cars-demo/version-c/assets/identity/loop.svg" width="54" height="46" alt=""><span translate="no">Claude Cars</span></a>';
  const serviceRoute = ["servicesNav", "#services"];
  const publicRoutes = [["home", ""], ["cars", "cars"], serviceRoute, ["about", "about"], ["contact", "contact"]];
  function navLinks(items) {
    return items.map(([key, suffix]) => {
      const selected = key === page || (key === "cars" && page === "catalogue");
      const href = key === "servicesNav" && ["home","catalogue","about"].includes(page) ? "#services" : path(suffix);
      return '<a href="' + href + '"' + (selected ? ' aria-current="page"' : "") + '>' + t(key) + '</a>';
    }).join("");
  }
  function languageUrl(code) {
    const url = new URL(location.href);
    url.pathname = url.pathname.replace(/\/(fr|nl|de|en|es)(?=\/|$)/, "/" + code);
    return url.pathname + url.search + url.hash;
  }
  function header() {
    const links = navLinks(publicRoutes);
    const languages = Object.entries(names).map(([code, label]) => '<a lang="' + code + '" hreflang="' + code +
      '" href="' + esc(languageUrl(code)) + '" data-cc-language="' + code + '"' + (code === lang ? ' aria-current="true"' : "") + '>' + label + '</a>').join("");
    document.getElementById("mast").innerHTML =
      '<a class="cc-skip" href="#main">' + t("skip") + '</a><div class="cc-header cc-wrap">' + brand() +
      '<nav class="cc-nav" aria-label="' + t("nav") + '">' + navLinks(publicRoutes.slice(1)) + '</nav><div class="cc-tools">' +
      '<details class="cc-switch"><summary aria-label="' + lang.toUpperCase() + ' · ' + names[lang] + ' · ' + t("lang") + '">' + icon("globe") +
      '<span class="cc-language-full">' + names[lang] + '</span><span class="cc-language-short">' + lang.toUpperCase() +
      '</span>' + icon("down") + '</summary><div class="cc-pop">' + languages + '</div></details>' +
      '<details class="cc-menu"><summary aria-label="' + t("menu") + '">' + icon("menu") + '</summary><nav class="cc-pop" aria-label="' + t("nav") + '">' +
      links + '</nav></details></div></div>';
    const selector = document.querySelector(".cc-switch");
    document.querySelectorAll("#mast details").forEach(menu => {
      menu.addEventListener("keydown", e => {
        if (!["ArrowDown","ArrowUp","Home","End"].includes(e.key)) return;
        if (!menu.open && ["Home","End"].includes(e.key)) return;
        const links = [...menu.querySelectorAll(".cc-pop a")];
        e.preventDefault();
        menu.open = true;
        const index = links.indexOf(document.activeElement);
        const next = e.key === "Home" ? 0 : e.key === "End" ? links.length-1 :
          e.key === "ArrowDown" ? (index+1) % links.length : (index > 0 ? index-1 : links.length-1);
        links[next].focus();
      });
    });
    selector.addEventListener("toggle", () => {
      if (selector.open) {
        selector.querySelectorAll("[data-cc-language]").forEach(link => {
          link.href = languageUrl(link.dataset.ccLanguage);
        });
      }
    });
    const menus = [...document.querySelectorAll("#mast details")];
    const closeOthers = (except) => menus.forEach(menu => { if (menu !== except) menu.open = false; });
    document.addEventListener("click", event => {
      const dropdown = event.target.closest("#mast details");
      closeOthers(dropdown);
      if (dropdown?.classList.contains("cc-menu") && event.target.closest(".cc-pop a")) dropdown.open = false;
      const link = event.target.closest("[data-cc-language]");
      if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      link.href = languageUrl(link.dataset.ccLanguage);
      const change = new CustomEvent("cc:languagechange", {
        cancelable: true, detail: {lang: link.dataset.ccLanguage, url: link.href}
      });
      if (!document.dispatchEvent(change)) event.preventDefault();
    });
    document.addEventListener("focusin", event => closeOthers(event.target.closest("#mast details")));
    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      const open = menus.find(menu => menu.open);
      if (open) { open.open = false; open.querySelector("summary").focus(); }
    });
  }
  function footer() {
    document.getElementById("foot").innerHTML = '<div class="cc-wrap cc-foot"><div>' + brand() +
      '<address>Chaussée de Tirlemont 28/3<br>4520 Wanze, ' + t("location").split(", ")[1] + '</address><a href="https://www.google.com/maps/dir/?api=1&amp;destination=Chauss%C3%A9e+de+Tirlemont+28%2F3%2C+4520+Wanze%2C+Belgium" referrerpolicy="no-referrer">' + t("directions") + '</a></div><div class="cc-foot-links">' +
      navLinks([["cars","cars"],serviceRoute,["about","about"],["contact","contact"],["privacy","privacy"]]) + '</div><div class="cc-foot-links"><p>' + t("appointment") + '</p>' +
      '<a data-cc-event="phone" href="tel:+32496807976">+32 496 80 79 76</a><a href="mailto:mcsportcars17@gmail.com">mcsportcars17@gmail.com</a></div></div>' +
      '<div class="cc-wrap cc-foot-legal">Claude C SRL · BE 0681.982.155</div>';
  }
  function photo(src, alt, className = "", highPriority = false, sizes = "100vw") {
    let url;
    try { url = new URL(src, location.origin); } catch { return ""; }
    if (!src || url.origin !== location.origin || !["http:", "https:"].includes(url.protocol)) return "";
    const original = /\/assets\/z4\/[123]\.webp$/.test(url.pathname);
    const responsive = original ? ' srcset="' + url.pathname.replace(".webp", "-720.webp") + ' 720w, ' + url.pathname +
      ' 1680w" sizes="' + sizes + '"' : "";
    return '<img class="' + className + '" src="' + esc(url.pathname) + '"' + responsive + ' alt="' +
      esc(alt) + '" width="1680" height="1260" decoding="async" ' + (highPriority ? 'fetchpriority="high"' : 'loading="lazy"') + '>';
  }
  const photoNames = {
    "1": {fr:"Trois quarts arrière, toit fermé", en:"Rear three-quarter view, roof closed", de:"Heckansicht, Dach geschlossen", nl:"Schuin van achteren, dak gesloten", es:"Vista trasera, techo cerrado"},
    "2": {fr:"Trois quarts avant, toit ouvert", en:"Front three-quarter view, roof open", de:"Frontansicht, Dach geöffnet", nl:"Schuin van voren, dak open", es:"Vista delantera, techo abierto"},
    "3": {fr:"Habitacle et sièges", en:"Cabin and seats", de:"Innenraum und Sitze", nl:"Interieur en stoelen", es:"Habitáculo y asientos"}
  };
  function caption(car, src, index = 0) {
    const match = /\/assets\/z4\/([123])\.webp$/.exec(src);
    return match ? photoNames[match[1]][lang] : t("photo") + " " + (index + 1);
  }
  function pictures(car) { return [...new Set([firstPhoto(car), ...(car.photos || [])].filter(Boolean))]; }
  function splitName(car) {
    const [model, ...variant] = String(car.model || "").trim().split(/\s+/);
    return '<span>' + esc([car.make, model].filter(Boolean).join(" ")) + '</span>' +
      (variant.length ? ' <em>' + esc(variant.join(" ")) + '</em>' : "");
  }
  const status = car => '<span class="cc-status cc-status-' + esc(car.status) + '">' + esc(t(car.status)) + '</span>';
  function routeToForm(type, car, topic) {
    const search = new URLSearchParams({type});
    if (car) search.set("car", car.id);
    if (topic) search.set("topic", topic);
    return esc(path("contact") + "?" + search);
  }
  function nextCarAction(car) {
    if (car.status === "available") return [routeToForm("viewing", car), t("viewings")];
    if (car.status === "sold") return [routeToForm("sourcing", car), t("sourcing")];
    return [routeToForm("question", car, "availability"), t("checkAvailability")];
  }
  function button(href, label, variant = "") {
    return '<a class="cc-button ' + variant + '" href="' + href + '">' + esc(label) + icon("arrow") + '</a>';
  }
  function hero() {
    return `<section class="cc-brand-cover" aria-labelledby="cc-cover-title">
      <div class="cc-cover-layout">
        <div class="cc-cover-heading">
          <p class="cc-cover-place">${t("location")}</p>
          <h1 id="cc-cover-title">${t("aboutTitle")}</h1>
        </div>
        <figure class="cc-z3">
          <img src="/claude-cars-demo/version-c/assets/identity/z3-studio.webp" width="1536" height="1024" alt="${t("z3Alt")}" fetchpriority="high">
          <figcaption>${t("z3Credit")}</figcaption>
        </figure>
        <div class="cc-cover-intro"><p>${t("coverLine")}</p>
          <div class="cc-cover-links">${active.length ? button("#stock", t("exploreCars")) : button(routeToForm("sourcing"), t("search"))}
          <a class="cc-text-link" href="${active.length ? "#services" : routeToForm("import")}">${active.length ? t("services") : t("import")}${icon(active.length ? "down" : "arrow")}</a></div></div>
      </div><a class="cc-cover-next" href="#stock" aria-label="${t("coverNext")}">${icon("arrowDown")}</a>
    </section>`;
  }
  const inventoryIsSpread = (single) => single && inventoryDisplay.view === "grid" && inventoryDisplay.density === "standard";
  function inventoryPhotoSizes(spread) {
    if (inventoryDisplay.view === "list") return inventoryDisplay.density === "compact"
      ? "(max-width: 620px) 25vw, 180px" : "(max-width: 620px) 36vw, (max-width: 1100px) 29vw, 340px";
    if (inventoryDisplay.density === "compact") return "(max-width: 699px) 45vw, (max-width: 1099px) 30vw, 22vw";
    return spread ? "(max-width: 849px) 100vw, 58vw" : "(max-width: 680px) 90vw, 45vw";
  }
  function inventoryToolbar(targets) {
    const groups = Object.entries(inventoryControls).map(([kind, [label, choices]]) => {
      const buttons = choices.map(([value, words]) => '<button type="button" data-inventory-option="' + kind +
        '" data-inventory-value="' + value + '" aria-pressed="' + (inventoryDisplay[kind] === value) +
        '" aria-controls="' + targets + '" aria-label="' + esc(t(words)) + '" title="' + esc(t(words)) + '">' + icon(value) + '</button>').join("");
      return '<div class="cc-inventory-choice"><span aria-hidden="true">' + t(label) + '</span><div class="cc-inventory-buttons" role="group" aria-label="' + esc(t(label)) + '">' + buttons + '</div></div>';
    }).join("");
    return '<div class="cc-inventory-toolbar">' + groups + '</div>';
  }
  function bindInventory(main) {
    const buttons = [...main.querySelectorAll("[data-inventory-option]")];
    const containers = [...main.querySelectorAll(".cc-inventory-items")];
    for (const button of buttons) button.addEventListener("click", () => {
      const {inventoryOption: kind, inventoryValue: value} = button.dataset;
      if (inventoryDisplay[kind] === value) return;
      inventoryDisplay[kind] = value;
      for (const item of containers) {
        const spread = inventoryIsSpread(item.hasAttribute("data-single-spread"));
        item.dataset.view = inventoryDisplay.view;
        item.dataset.density = inventoryDisplay.density;
        item.classList.toggle("cc-stock-spread", spread);
        item.classList.toggle("cc-card-grid", !spread);
        item.classList.toggle("cc-wrap", !spread);
        const sizes = inventoryPhotoSizes(spread);
        item.querySelectorAll("img[sizes]").forEach(img => { img.sizes = sizes; });
      }
      for (const choice of buttons) choice.setAttribute("aria-pressed", String(inventoryDisplay[choice.dataset.inventoryOption] === choice.dataset.inventoryValue));
      try { localStorage.setItem(inventoryKey, JSON.stringify(inventoryDisplay)); }
      catch { /* The selected layout still works for this page. */ }
    });
  }
  function card(car, heading, split, priority, sizes) {
    const img = firstPhoto(car);
    const action = '<span class="cc-card-more">' + t("detail") + icon("arrow") + '</span>';
    const figure = photo(img, "", "", priority, sizes);
    return '<a class="cc-car-card" href="' + carPath(car) + '"><div class="cc-card-image cc-photo-stage">' +
      (figure || '<span>'+t("photosPending")+'</span>') + '</div>' +
      '<div class="cc-card-body">' + status(car) + '<' + heading + '>' + (split ? splitName(car) : esc(carName(car))) + '</' + heading + '><p>' + esc([car.year, km(car.km)].filter(Boolean).join(" · ")) + '</p>' +
      '<div class="cc-card-price">' + esc(price(car)) + action + '</div></div></a>';
  }
  function inventory(list, heading, id, singleSpread = false) {
    const firstVisible = page === "catalogue" && (list === active || !active.length);
    const single = singleSpread && list.length === 1;
    const spread = inventoryIsSpread(single);
    const sizes = inventoryPhotoSizes(spread);
    return '<div id="' + id + '" class="cc-inventory-items ' + (spread ? 'cc-stock-spread' : 'cc-wrap cc-card-grid') +
      '" data-view="' + inventoryDisplay.view + '" data-density="' + inventoryDisplay.density + '"' + (single ? ' data-single-spread' : '') + '>' +
      list.map((car,i) => card(car, heading, single, firstVisible && i === 0, sizes)).join("") + '</div>';
  }
  function cardSection(list, title, controls = false) {
    if (!list.length) return "";
    return '<section id="archive" class="cc-archive-band" tabindex="-1" aria-labelledby="cc-archive-title"><header class="cc-wrap cc-stock-header"><h2 id="cc-archive-title" class="cc-section-title">' + t(title) + '</h2>' +
      (controls ? inventoryToolbar("archive-items") : '') + '</header>' + inventory(list, "h3", "archive-items") + '</section>';
  }
  function services() {
    const intro = '<h2 id="cc-services-title" class="cc-section-title">' + t("services") + '</h2><p>' + t("servicesIntro") + '</p>';
    const links = '<div class="cc-service-links">' + button(routeToForm("sourcing"), t("search"), "cc-button-line") +
      button(routeToForm("import"), t("import"), "cc-button-line") + '</div>';
    const start = '<section id="services" class="cc-services" tabindex="-1" aria-labelledby="cc-services-title"><div class="cc-wrap cc-services-inner';
    if (page !== "home") return start + '"><div>' + intro + '</div>' + links + '</div></section>';
    const settings = state.siteContent?.services;
    const uploaded = settings?.images?.sourcing;
    const figure = uploaded
      ? '<figure class="cc-service-photo cc-service-photo-uploaded"><img loading="lazy" decoding="async" src="' + esc(uploaded) + '" alt="' + esc(settings.texts?.[lang]?.servicesPhotoAlt) + '"></figure>'
      : '<figure class="cc-service-photo"><img loading="lazy" decoding="async" src="/claude-cars-demo/version-c/assets/identity/claude-sourcing-desk.webp" srcset="/claude-cars-demo/version-c/assets/identity/claude-sourcing-desk-720.webp 720w, /claude-cars-demo/version-c/assets/identity/claude-sourcing-desk.webp 1440w" sizes="(min-width: 1600px) 755px, (min-width: 850px) 47vw, 92vw" width="1440" height="960" alt="' + esc(t("servicesPhotoDefaultAlt")) + '"></figure>';
    return start + ' cc-services-feature"><div class="cc-service-copy">' + intro + links + '</div>' + figure + '</div></section>';
  }
  function beforeVisit() {
    // Use the public dossier, not a second copy of the example's condition.
    const car = [...active, ...sold].find(item => item.id === "bmw-z4-e89-35is");
    const condition = car ? details(car, "condition") : {text: ""};
    const sentences = condition.code === lang ? (condition.text.match(/[^.!?]+(?:[.!?]+|$)/g) || []).map(s => s.trim()) : [];
    const note = sentences.find(s => s.length <= 180 && /\b(?:jantes?|velgen|felgen|wheels?|llantas?)\b/i.test(s)) || sentences.find(s => s && s.length <= 180);
    const example = note
      ? '<div class="cc-visit-example"><p>' + esc(t("beforeVisitExample").replace("{car}", carName(car))) +
        '</p><blockquote lang="' + esc(condition.code) + '">' + esc(note) + '</blockquote></div>' : '';
    const target = condition.text ? carPath(car) + "#cc-condition" : path("about") + "#selection";
    const label = condition.text ? t("beforeVisitDossier") : t("selectionTitle");
    return '<section class="cc-section cc-perspective" aria-labelledby="cc-perspective-title"><div class="cc-perspective-copy"><h2 id="cc-perspective-title">' + t("beforeVisitTitle") +
      '</h2><p class="cc-prose">' + t("beforeVisitIntro") + '</p>' + example + '<div class="cc-actions"><a class="cc-text-link" href="' +
      target + '">' + label + icon("arrow") + '</a></div></div><figure>' +
      photo("/claude-cars-demo/version-c/assets/z4/3.webp", "", "", false, "(max-width: 849px) 100vw, 52vw") + '<figcaption>' + t("beforeVisitPhoto") + '</figcaption></figure></section>';
  }
  const publishedReviews = state.siteContent?.reviews?.reviews || [];
  const reviewDate = new Intl.DateTimeFormat(regions[lang], {dateStyle: "medium", timeZone: "UTC"});
  function reviewsSection() {
    if (!publishedReviews.length) return "";
    return '<section class="cc-reviews" id="reviews" tabindex="-1" aria-labelledby="cc-reviews-title"><div class="cc-wrap">' +
      '<h2 id="cc-reviews-title" class="cc-section-title">' + t("reviewTitle") + '</h2><div class="cc-review-list">' +
      publishedReviews.map(item => {
        const source = documentUrl(item.source);
        const author = /^guest-[a-f0-9]{32}$/.test(item.id) ? t("feedbackAnonymous") : item.author;
        const date = item.date && new Date(item.date);
        const dateLabel = date && Number.isFinite(+date) ? '<time datetime="' + esc(item.date) + '">' + esc(reviewDate.format(date)) + '</time>' : "";
        const rating = item.rating ? '<span>' + esc(item.rating) + '/5</span>' : "";
        return '<figure class="cc-review"><blockquote lang="' + esc(item.language) + '"' + (source ? ' cite="' + esc(source) + '"' : "") + '><p>' + esc(item.quote) +
          '</p></blockquote><figcaption><strong dir="auto">' + esc(author) + '</strong>' + dateLabel + rating + '</figcaption>' +
          (item.reply ? '<div class="cc-review-reply"><strong>' + t("reviewReply") + '</strong><p lang="' + esc(item.language) + '">' + esc(item.reply) + '</p></div>' : "") +
          (source ? '<a class="cc-text-link" href="' + esc(source) + '" rel="noreferrer" aria-label="' + esc(t("reviewOriginal") + " · " + author) + '">' + t("reviewOriginal") + icon("arrow") + '</a>' : "") + '</figure>';
      }).join("") + '</div></div></section>';
  }
  function feedbackSection() {
    const star = '<svg class="cc-feedback-star" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.5 2.8 6 6.5.8-4.8 4.6 1.2 6.6-5.7-3.2-5.7 3.2 1.2-6.6-4.8-4.6 6.5-.8Z"/></svg>';
    const ratings = [1, 2, 3, 4, 5].map(score =>
      '<label><input type="radio" name="rating" value="' + score + '" required aria-label="' + score + '/5">' + star + '</label>').join("");
    return '<section id="feedback" class="cc-feedback" tabindex="-1" aria-labelledby="cc-feedback-title"><div class="cc-wrap cc-feedback-inner">' +
      '<div><h2 id="cc-feedback-title" class="cc-section-title">' + t("feedbackTitle") + '</h2><p class="cc-prose">' + t("feedbackIntro") + '</p></div>' +
      '<div><form class="cc-feedback-form"><fieldset><legend>' + t("feedbackRating") + '</legend><div class="cc-feedback-stars">' + ratings + '</div></fieldset>' +
      '<label for="cc-feedback-comment">' + t("feedbackComment") + '</label><textarea id="cc-feedback-comment" name="comment" rows="3" maxlength="500" aria-describedby="cc-feedback-hint" placeholder="' + esc(t("feedbackPrompt")) + '"></textarea>' +
      '<p id="cc-feedback-hint" class="cc-feedback-hint">' + t("feedbackNoDetails") + '</p><label class="cc-feedback-permission" hidden><input type="checkbox" name="permission"> <span>' + t("feedbackPermission") + '</span></label>' +
      '<button type="submit" class="cc-button">' + t("feedbackSend") + '</button><a class="cc-text-link cc-feedback-privacy" href="' + path("privacy") + '#review-privacy">' + t("privacy") + '</a></form>' +
      '<p class="cc-feedback-message" role="status" tabindex="-1"></p></div></div></section>';
  }
  function bindFeedback() {
    const form = document.querySelector(".cc-feedback-form");
    if (!form) return;
    const {comment, permission} = form.elements;
    const consent = permission.closest("label");
    const button = form.querySelector("button[type=submit]");
    const message = form.parentElement.querySelector(".cc-feedback-message");
    const sync = () => {
      consent.hidden = !comment.value.trim();
      if (consent.hidden) permission.checked = false;
    };
    comment.addEventListener("input", sync);
    sync();
    let id, busy = false;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      message.textContent = window.CC.demoNotice; message.focus(); return;

    });
  }
  function home() {
    const stock = active.length ? inventory(active, "h3", "stock-items", true) :
      '<div class="cc-wrap"><p class="cc-empty">' + t("noCars") + '</p><a class="cc-text-link" href="#services">' + t("services") + icon("down") + '</a></div>';
    const archive = active.length ? "" : cardSection(sold, "archive", true);
    return '<div class="cc-home">' + hero() +
      '<section id="stock" class="cc-section cc-stock" tabindex="-1" aria-labelledby="cc-stock-title">' +
      '<div class="cc-wrap cc-stock-header"><h2 id="cc-stock-title" class="cc-section-title">' + t("featured") + '</h2>' +
      (active.length ? '<div class="cc-inventory-aside"><p>' + icon("clock") + t("appointment") + '</p>' + inventoryToolbar("stock-items") + '</div>' : "") +
      '</div>' + stock + '</section>' + archive + beforeVisit() + reviewsSection() + services() + '</div>';
  }
  function catalogue() {
    const targets = [active.length && "stock-items", sold.length && "archive-items"].filter(Boolean).join(" ");
    return '<div class="cc-catalogue-page"><section class="cc-inventory-band" aria-labelledby="cc-catalogue-title">' +
      '<header class="cc-lead cc-wrap cc-catalogue-lead"><div><h1 id="cc-catalogue-title">' + t("current") + '</h1><p>' + t("catalogueIntro") + '</p></div>' +
      (targets ? '<div class="cc-inventory-aside">' + (sold.length ? '<a class="cc-text-link" href="#archive">' + t("goToArchive") + icon("arrowDown") + '</a>' : '') + inventoryToolbar(targets) + '</div>' : '') + '</header>' +
      (active.length ? inventory(active, "h2", "stock-items", true) : '<div class="cc-wrap"><p class="cc-empty">' + t("noCars") + '</p><a class="cc-text-link" href="#services">' + t("services") + icon("down") + '</a></div>') +
      '</section>' + cardSection(sold, "archive") + services() + '</div>';
  }
  function about() {
    return '<div class="cc-about-page"><header class="cc-about-cover"><div class="cc-wrap cc-lead cc-about-lead"><div class="cc-about-heading"><p class="cc-eyebrow">' + t("about") + '</p><h1>' + t("aboutTitle") +
      '</h1><div class="cc-story-name"><p translate="no">Claude Crahay</p><p>' + icon("location") + ' ' + t("location") +
      '</p></div></div><img class="cc-claude-portrait" src="/claude-cars-demo/version-c/assets/identity/claude-portrait.webp" srcset="/claude-cars-demo/version-c/assets/identity/claude-portrait-600.webp 600w, /claude-cars-demo/version-c/assets/identity/claude-portrait.webp 1080w" sizes="(max-width: 520px) 100vw, (max-width: 849px) 520px, (max-width: 1454px) 33vw, 480px" width="1080" height="1440" alt="' + esc(t("claudePortrait")) + '" fetchpriority="high" decoding="async"></div></header><section id="selection" class="cc-about-band" aria-labelledby="cc-about-selection"><div class="cc-wrap cc-story"><p class="cc-story-intro">' + t("story") +
      '</p><div><h2 id="cc-about-selection">' + t("selectionTitle") + '</h2><p class="cc-prose">' + t("selection") +
      '</p><div class="cc-actions">' + button(path("contact"),t("contactSeller")) +
      '<a class="cc-text-link" href="#feedback">' + t("feedbackLink") + icon("down") + '</a>' +
      '<a class="cc-text-link" href="https://www.facebook.com/people/Claude-C/61566785224862/">' + t("reviews") + icon("arrow") +
      '</a></div></div></div></section>' + reviewsSection() + services() + feedbackSection() + '</div>';
  }
  function documentUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
    } catch { return ""; }
  }
  function dossier(car, carPassUrl) {
    const carPass = carPassUrl ? '<a class="cc-doc-link cc-carpass" href="' + esc(carPassUrl) + '">' + t("carpass") + icon("arrow") + '</a>' : '';
    const sections = ["opinion","intro","history","condition","equipment","documents"].map(key => {
      const segment = details(car,key);
      if (!segment.text && !(key === "documents" && carPass)) return "";
      const ask = key === "documents"
        ? '<div class="cc-document-actions">' + carPass + '<a class="cc-doc-link" href="' + routeToForm("question", car, "documents") + '">' + t("askDocuments") + icon("arrow") + '</a></div>'
        : "";
      const text = segment.text ? '<p lang="' + esc(segment.code) + '" class="cc-prose">' + esc(segment.text) + '</p>' : '';
      return '<section class="cc-dossier-row" id="cc-' + key + '"><h3>' + t(key === "opinion" ? "signature" : key) + '</h3><div>' + text + ask + '</div></section>';
    }).join("");
    if (!sections) return "";
    const [nextUrl, nextLabel] = nextCarAction(car);
    const closingAction = button(nextUrl, nextLabel, car.status === "sold" ? "cc-button-outline" : "");
    return '<article id="dossier" class="cc-dossier" aria-labelledby="cc-dossier-title"><div class="cc-wrap"><h2 id="cc-dossier-title" class="cc-section-title">' + t("dossier") + '</h2>' + sections +
      '<div class="cc-record-next"><span>' + icon("location") + t("location") + '</span>' + closingAction + '</div></div></article>';
  }
  function gallery(car) {
    const items = pictures(car);
    const main = items[0];
    const controls = items.length > 1 ? '<div class="cc-stage-controls"><button type="button" data-cc-stage-prev aria-label="' + t("previous") + '">' +
      icon("left") + '</button><button type="button" data-cc-stage-next aria-label="' + t("next") + '">' + icon("right") + '</button></div>' : "";
    const strip = items.length > 1 ? '<div class="cc-thumbs" role="group" aria-label="' + t("gallery") + '">' + items.map((src,i) =>
      '<button type="button" data-cc-thumb="' + i + '" aria-label="' + esc(t("photo") + " " + (i+1) + " · " + caption(car,src,i)) +
      '" aria-pressed="' + (i === 0) + '">' + photo(src, "", "", false, "90px") + '</button>').join("") + '</div>' : "";
    const video = car.video && /^\/(?!\/)/.test(car.video) ? '<video class="cc-film" controls playsinline preload="none" aria-label="' + esc(t("video") + " · " + carName(car)) +
      '" src="' + esc(car.video) + '"></video>' : "";
    if (!main) return video || '<div class="cc-gallery-image cc-photo-stage"><span>' + t("photosPending") + '</span></div>';
    return '<div class="cc-gallery"><div class="cc-gallery-frame"><button type="button" class="cc-gallery-photo" data-cc-enlarge aria-label="' + t("full") + '"><span class="cc-gallery-image cc-photo-stage">' +
      photo(main,carName(car) + " · " + caption(car,main),"",true, "(max-width: 849px) 100vw, 58vw") + '</span><span class="cc-zoom">' + icon("zoom") + t("full") + '</span></button>' + controls + '</div>' +
      '<p class="cc-gallery-caption" aria-live="polite"><span data-cc-caption>' + esc(caption(car,main)) + '</span><span data-cc-count>1 / ' + items.length +
      '</span></p>' + strip + video +
      '<dialog class="cc-lightbox" aria-label="' + t("gallery") + '"><div class="cc-light-head"><span>' + esc(carName(car)) +
      '</span><button type="button" data-cc-close aria-label="' + t("close") + '">' + icon("close") + '</button></div>' +
      '<div class="cc-light-stage"></div><div class="cc-light-bar"><button type="button" data-cc-prev aria-label="' + t("previous") + '"' + (items.length === 1 ? " hidden" : "") + '>' +
      icon("left") + '</button><span data-cc-light-count aria-live="polite"></span><button type="button" data-cc-next aria-label="' +
      t("next") + '"' + (items.length === 1 ? " hidden" : "") + '>' + icon("right") + '</button></div></dialog></div>';
  }
  function vehicle(car) {
    const shareUrl = new URL(carPath(car),location.origin);
    const wa = "https://wa.me/32496807976?text=" + encodeURIComponent(t("greeting") + " " + carName(car) + ".\n" + shareUrl.href);
    const [nextUrl, nextLabel] = nextCarAction(car);
    const actions = button(nextUrl, nextLabel) + (car.status !== "sold" ? '<a class="cc-button cc-button-outline" aria-label="' + t("ask") + '" data-cc-event="whatsapp" data-cc-car="' + esc(car.id) + '" href="' + esc(wa) + '">' + icon("message") + 'WhatsApp</a>' : '');
    const carPassUrl = documentUrl(car.carpass);
    const jumps = ["history","condition","documents"].filter(key => details(car,key).text || (key === "documents" && carPassUrl))
      .map(key => '<a href="#cc-' + key + '">' + t(key) + '</a>').join("");
    const backTo = car.status === "sold" ? ["cars#archive", "archive"] : ["cars", "cars"];
    return '<div class="cc-detail-page"><section class="cc-vehicle-band" aria-labelledby="cc-vehicle-title"><div class="cc-wrap"><a class="cc-back" href="' + path(backTo[0]) + '">' + icon("left") + t(backTo[1]) + '</a></div>' +
      '<div class="cc-vehicle"><div class="cc-vehicle-summary">' + status(car) +
      '<h1 id="cc-vehicle-title">' + splitName(car) + '</h1>' + (price(car) ? '<p class="cc-summary-price">' + esc(price(car)) + '</p>' : "") +
      '<dl class="cc-specs"><div><dt>' + t("year") + '</dt><dd>' + esc(car.year) + '</dd></div><div><dt>' + t("km") + '</dt><dd>' + esc(km(car.km)) +
      '</dd></div></dl><div class="cc-buy-actions">' + actions + '</div></div><div class="cc-vehicle-media">' + gallery(car) + '</div><div class="cc-vehicle-tools"><div class="cc-seller-inline"><span>' + icon("location") + t("location") + '</span>' +
      '<span>' + t("appointment") + '</span></div><div class="cc-vehicle-contact"><a class="cc-number" href="tel:+32496807976" data-cc-event="phone" data-cc-car="' + esc(car.id) +
      '">+32 496 80 79 76</a>' + (car.status !== "sold" ? '<a class="cc-small-link" href="' + routeToForm("question",car) + '">' + t("question") + '</a>' : "") + '</div>' +
      (jumps ? '<nav class="cc-dossier-links" aria-label="' + t("dossier") + '">' + jumps + '</nav>' : "") +
      '<div class="cc-share-link"><button type="button" data-copy-car>' + icon("copy") + t("copyLink") + '</button><span role="status"></span>' +
      '<button type="button" data-print-car>' + icon("print") + t("printDossier") + '</button></div>' +
      '</div></div></section>' + dossier(car, carPassUrl) + '<footer class="cc-print-contact"><strong>Claude Cars · Claude C SRL</strong><br>Chaussée de Tirlemont 28/3 · 4520 Wanze · BE 0681.982.155<br>+32 496 80 79 76 · mcsportcars17@gmail.com<br>' + esc(shareUrl.href) + '</footer></div>';
  }
  function bindGallery(car) {
    const items = pictures(car);
    const dialog = document.querySelector(".cc-lightbox");
    if (!dialog) return;
    const thumbnails = [...document.querySelectorAll("[data-cc-thumb]")];
    const strip = document.querySelector(".cc-thumbs");
    let index = 0;
    const show = (i) => {
      index = (i + items.length) % items.length;
      const src = items[index], label = caption(car,src,index);
      const alt = carName(car) + " · " + label;
      const current = document.querySelector(".cc-gallery-photo img");
      current.outerHTML = photo(src,alt,"",true,"(max-width: 849px) 100vw, 58vw");
      document.querySelector("[data-cc-caption]").textContent = label;
      const position = (index+1) + " / " + items.length;
      document.querySelector("[data-cc-count]").textContent = position;
      thumbnails.forEach((thumb,j) => thumb.setAttribute("aria-pressed", String(index === j)));
      if (strip && !dialog.open) {
        const thumb = thumbnails[index];
        const bounds = strip.getBoundingClientRect(), target = thumb.getBoundingClientRect();
        if (target.left < bounds.left) strip.scrollLeft += target.left - bounds.left - 4;
        else if (target.right > bounds.right) strip.scrollLeft += target.right - bounds.right + 4;
      }
      if (dialog.open) {
        dialog.querySelector(".cc-light-stage").innerHTML = photo(src,alt,"",true);
        dialog.querySelector("[data-cc-light-count]").textContent = position + " · " + label;
      }
    };
    thumbnails.forEach((thumb, i) => thumb.addEventListener("click", () => show(i)));
    strip?.addEventListener("keydown", e => {
      const moves = { ArrowLeft: index-1, ArrowRight: index+1, Home: 0, End: items.length-1 };
      if (!Object.hasOwn(moves, e.key)) return;
      e.preventDefault();
      show(moves[e.key]);
      thumbnails[index].focus();
    });
    document.querySelector("[data-cc-stage-prev]")?.addEventListener("click", () => show(index-1));
    document.querySelector("[data-cc-stage-next]")?.addEventListener("click", () => show(index+1));
    const open = document.querySelector("[data-cc-enlarge]");
    open.addEventListener("click", () => { dialog.showModal(); document.documentElement.classList.add("cc-gallery-open"); show(index); });
    dialog.querySelector("[data-cc-close]").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", e => {
      if (e.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener("close", () => { document.documentElement.classList.remove("cc-gallery-open"); dialog.querySelector(".cc-light-stage").replaceChildren(); open.focus({preventScroll:true}); });
    dialog.querySelector("[data-cc-next]").addEventListener("click", () => show(index+1));
    dialog.querySelector("[data-cc-prev]").addEventListener("click", () => show(index-1));
    dialog.addEventListener("keydown", e => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); show(index + (e.key === "ArrowLeft" ? -1 : 1)); }
    });
    let firstTouch;
    const swipeStart = e => { firstTouch = e.touches.length === 1 ? e.touches[0] : null; };
    const swipeEnd = e => {
      if (!firstTouch || e.changedTouches.length !== 1 || items.length < 2) return;
      const dx = e.changedTouches[0].clientX - firstTouch.clientX;
      const dy = e.changedTouches[0].clientY - firstTouch.clientY;
      firstTouch = null;
      if (Math.abs(dx) >= 48 && Math.abs(dx) > 1.5 * Math.abs(dy)) {
        if (e.cancelable) e.preventDefault();
        show(index + (dx < 0 ? 1 : -1));
      }
    };
    [open,dialog.querySelector(".cc-light-stage")].forEach(surface => {
      surface.addEventListener("touchstart",swipeStart,{passive:true});
      surface.addEventListener("touchend",swipeEnd,{passive:false});
    });
  }
  const countButtonsKey = "cc.contact-clicks.allowed";
  function countButtonsAllowed() {
    try { return sessionStorage.getItem(countButtonsKey) === "yes"; }
    catch { return false; }
  }
  header();
  footer();
  const backTop = document.createElement("button");
  backTop.type = "button";
  backTop.className = "cc-back-top";
  backTop.setAttribute("aria-label", t("backTop"));
  backTop.title = t("backTop");
  backTop.innerHTML = icon("top");
  backTop.hidden = true;
  document.body.append(backTop);
  const syncBackTop = () => { backTop.hidden = window.scrollY < 240; };
  window.addEventListener("scroll", syncBackTop, {passive: true});
  window.addEventListener("pageshow", syncBackTop);
  backTop.addEventListener("click", () => {
    document.querySelector("#mast .cc-brand").focus({preventScroll: true});
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({top: 0, behavior: reduced ? "instant" : "smooth"});
  });
  syncBackTop();
  const main = document.getElementById("main");
  main.setAttribute("tabindex","-1");
  if (page === "home") main.innerHTML = home();
  else if (page === "catalogue") main.innerHTML = catalogue();
  else if (page === "about") { main.innerHTML = about(); bindFeedback(); }
  else if (page === "privacy") {
    const section = (heading, body) => '<section><h2>' + t(heading) + '</h2><p>' + t(body) + '</p></section>';
    main.innerHTML = '<article class="cc-privacy"><header class="cc-privacy-cover"><div class="cc-wrap cc-lead"><h1>' + t("privacy") +
      '</h1></div></header><div class="cc-wrap cc-privacy-copy"><p>Claude C SRL · BE 0681.982.155<br>Chaussée de Tirlemont 28/3, 4520 ' + t("location") + '<br>' +
      '<a href="mailto:mcsportcars17@gmail.com">mcsportcars17@gmail.com</a></p>' +
      section("privacyEnquiries", "privacyEnquiriesText") + section("privacySecurity", "privacySecurityText") +
      '<p>' + t("privacyDraft") + '</p><section><h2>' + t("privacyButtons") +
      '</h2><label class="cc-choice"><input type="checkbox" id="cc-count-buttons">' + t("privacyCount") +
      '</label><p>' + t("privacyChoiceText") + '</p></section>' + section("privacyRights", "privacyRightsText") +
      '<section id="review-privacy"><h2>' + t("reviewTitle") + '</h2><p>' + t("feedbackPrivacy") + '</p></section><a href="https://www.autoriteprotectiondonnees.be/citoyen">' + t("privacyAuthority") + '</a></div></article>';
    const choice = main.querySelector("#cc-count-buttons");
    choice.checked = countButtonsAllowed();
    choice.addEventListener("change", () => {
      try {
        if (choice.checked) sessionStorage.setItem(countButtonsKey, "yes");
        else sessionStorage.removeItem(countButtonsKey);
      } catch { choice.checked = false; }
    });
  }
  else if (page === "car") {
    const record = cars.find(c => c.id === state.id);
    if (record) {
      main.innerHTML = vehicle(record);
      bindGallery(record);
      main.querySelector("[data-print-car]").addEventListener("click", () => window.print());
      const copy = main.querySelector("[data-copy-car]");
      copy.addEventListener("click", async () => {
        const url = new URL(carPath(record), location.origin).href;
        const notice = copy.nextElementSibling;
        try {
          await navigator.clipboard.writeText(url);
          notice.textContent = t("linkCopied");
        } catch {
          notice.innerHTML = '<label>' + t("manualCopy") + '<input readonly></label>';
          const input = notice.querySelector("input");
          input.value = url;
          input.focus();
          input.select();
        }
      });
    }
  }
  if (page === "home" || page === "catalogue") bindInventory(main);
})();
