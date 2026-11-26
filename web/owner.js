(function ownerWorkspace() {
  "use strict";
  const context = window.CC;
  if (!context || context.page !== "owner") return;
  const main = document.getElementById("main");
  const { languages, names, t: translate } = window.CCOwnerLocales;
  const lang = context.lang;
  const t = (key) => translate(key, lang);
  const format = (value, language = lang) => new Intl.NumberFormat(language).format(value);
  const formatPrice = (value, language = lang) =>
    new Intl.NumberFormat(language, {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(value);
  const esc = (raw) =>
    String(raw ?? "").replace(
      /[&<>"']/g,
      (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
    );
  const statusKeys = ["available", "soon", "reserved", "sold"];
  const copyFields = ["intro", "history", "condition", "equipment", "documents", "opinion"];
  const ownerURL = new URL(`/${lang}/owner`, location.origin);
  const draftStore = "claude-cars.owner.pending.v1";
  let cars = [];
  let busy = false;
  let dirty = false;
  let canLeave = false;
  let editor = null;
  let state = null;
  let panel;
  let routeSequence = 0;
  let savedCurrent = false;
  let activeUrl = location.href;

  function urlFor(query = {}) {
    const url = new URL(ownerURL);
    for (const [key, value] of Object.entries(query)) if (value) url.searchParams.set(key, value);
    return url.pathname + url.search;
  }
  const routeLink = (query, label, cls = "ow-btn") =>
    `<a data-owner-route href="${esc(urlFor(query))}" class="${cls}">${esc(label)}</a>`;
  function listingUrl(car, language = lang, source = "") {
    const url = new URL(`/${language}/cars/${encodeURIComponent(car.id)}`, location.origin);
    if (source) url.searchParams.set("src", source);
    return url.href;
  }
  function externalUrl(car, channel, language, value) {
    const chosen = listingUrl(car, language, channel);
    const url = new URL(
      channel === "facebook" ? "https://www.facebook.com/sharer/sharer.php" : "https://wa.me/",
    );
    if (channel === "facebook") url.searchParams.set("u", chosen);
    else url.searchParams.set("text", value.includes(chosen) ? value.trim() : `${value.trim()}\n\n${chosen}`);
    return url.href;
  }
  function symbol(key) {
    const paths = {
      facebook:
        '<path d="M14 21v-8h2.7l.5-3H14V8.2c0-.9.3-1.5 1.6-1.5h1.8V4a23 23 0 0 0-2.5-.2c-2.6 0-4.4 1.6-4.4 4.5V10H8v3h2.5v8"/>',
      whatsapp:
        '<path d="M20.5 11.6a8.6 8.6 0 0 1-12.7 7.6l-4.3 1.1 1.1-4.2A8.6 8.6 0 1 1 20.5 11.6Z"/><path d="M8.5 8.2c.5-.5 1-.2 1.3.6l.5 1-.6 1c.8 1.2 1.6 2 3 2.6l.8-1c.3-.2 1.2.3 2 .8.5.5.1 1.3-.4 1.6-1.5 1-3.6-.3-5.3-1.7-1.7-1.6-2.7-3.7-1.3-4.9Z"/>',
      external: '<path d="M13 4h7v7m0-7-10 10M9 5H5v14h14v-4"/>',
      chevron: '<path d="m9 5 7 7-7 7"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
    };
    return `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[key] || ""}</svg>`;
  }
  async function api(path, method = "GET", body, file = false) {
    const opts = {
      method,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      cache: "no-store",
    };
    if (method !== "GET") {
      opts.headers["X-CSRF-Token"] = context.csrf || "";
      if (body !== undefined) {
        opts.headers["Content-Type"] = file ? body.type || "application/octet-stream" : "application/json";
        opts.body = file ? body : JSON.stringify(body);
      }
    }
    let res;
    try {
      res = await fetch(path, opts);
    } catch {
      throw new Error("network");
    }
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (path !== "/api/login" && (res.status === 401 || res.status === 403)) {
        const prompt = main.querySelector("#ow-reconnect");
        if (prompt) {
          prompt.hidden = false;
          prompt.querySelector("button").focus();
        }
        throw new Error("session");
      }
      const key =
        res.status === 429
          ? "rateLimit"
          : res.status === 401
            ? path === "/api/login"
              ? "invalid"
              : "session"
            : res.status === 409
              ? "conflict"
              : res.status === 404
                ? "notfound"
                : res.status === 413 || payload.error === "media" || file
                  ? "mediaError"
                  : "failure";
      throw new Error(key);
    }
    return payload;
  }
  function notice(key, bad = false) {
    const region = main.querySelector("#ow-notice");
    if (!region) return;
    region.classList.toggle("ow-error", bad);
    region.textContent = key ? t(key) : "";
  }
  function errorMessage(error) {
    notice(error.message, true);
  }
  function currentCar(id) {
    return cars.find((car) => car.id === id);
  }
  function compactDetails(car, language = lang) {
    return [
      car.year,
      car.km != null && car.km !== "" ? format(car.km, language) + " km" : "",
      car.status === "sold"
        ? ""
        : car.price != null && car.price !== ""
          ? formatPrice(car.price, language)
          : translate("noprice", language),
    ]
      .filter(Boolean)
      .join(" · ");
  }
  function blankCar() {
    const key =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : (() => {
            const bytes = crypto.getRandomValues(new Uint8Array(16));
            bytes[6] = (bytes[6] & 15) | 64;
            bytes[8] = (bytes[8] & 63) | 128;
            const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
            return [
              hex.slice(0, 8),
              hex.slice(8, 12),
              hex.slice(12, 16),
              hex.slice(16, 20),
              hex.slice(20),
            ].join("-");
          })();
    return {
      requestId: key,
      make: "",
      model: "",
      year: "",
      km: "",
      price: "",
      carpass: "",
      cover: "",
      photos: [],
      video: "",
      status: "draft",
      translations: {},
      approved: {},
    };
  }
  function options(values, selected, labels) {
    return values
      .map(
        (key) =>
          `<option value="${esc(key)}"${key === selected ? " selected" : ""}>${esc(labels(key))}</option>`,
      )
      .join("");
  }
  function listFilter(car) {
    return ["draft", "sold"].includes(car.status) ? { filter: car.status } : {};
  }
  function buttonsFor(car, compact = false) {
    if (!car || car.status === "draft") return "";
    const actions = compact
      ? routeLink({ tab: "share", car: car.id }, t("share"))
      : ["facebook", "whatsapp"]
      .map(
        (channel) =>
          `<a class="ow-btn" data-owner-route href="${esc(urlFor({ tab: "share", car: car.id, channel }))}">${symbol(channel)}${t(channel === "facebook" ? "shareFb" : "shareWa")}</a>`,
      )
      .join("");
    return `<div class="ow-action-row"><a class="ow-btn" href="${esc(listingUrl(car))}" target="_blank" rel="noopener">${symbol("external")}${t("open")}</a>${actions}</div>`;
  }
  function banner(key) {
    return `<p class="ow-notice" id="ow-notice" role="status" aria-live="polite">${key ? esc(t(key)) : ""}</p>`;
  }
  function top(title, action = "") {
    return `<div class="ow-top"><h1>${esc(title)}</h1>${action}</div>`;
  }
  function frame(active) {
    const nav = [
      ["list", "catalogue"],
      ["stats", "stats"],
      ["enquiries", "enquiries"],
    ]
      .map(([tab, key]) => {
        const selected = tab === active;
        return `<a class="ow-menu-link" data-owner-route href="${esc(urlFor(tab === "list" ? {} : { tab }))}"${selected ? ' aria-current="page"' : ""}>${t(key)}</a>`;
      })
      .join("");
    main.innerHTML = `<div class="ow-shell"><div id="ow-reconnect" hidden><p>${t("session")}</p><button class="ow-btn" type="button" data-action="reconnect">${t("signin")}</button></div><aside class="ow-rail"><div class="ow-rail-title">${t("workspace")}</div><nav class="ow-menu" aria-label="${t("workspace")}">${nav}</nav><button type="button" class="ow-logout" data-action="logout">${t("signout")}</button></aside><div class="ow-panel" id="owner-panel"></div></div>`;
    panel = document.getElementById("owner-panel");
  }
  function login() {
    main.innerHTML = `<div class="ow-login"><h1>${t("workspace")}</h1><form id="ow-login"><label class="ow-field">${t("password")}<input type="password" name="password" required autocomplete="current-password"></label>${banner()}<button class="ow-btn ow-primary">${t("signin")}</button></form></div>`;
    main.querySelector("input").addEventListener("input", (event) => {
      event.target.removeAttribute("aria-invalid");
      notice("");
    });
    main.querySelector("form").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (busy) return;
      busy = true;
      const btn = ev.target.querySelector("button");
      btn.disabled = true;
      try {
        await api("/api/login", "POST", { password: ev.target.elements.password.value });
        location.reload();
      } catch (error) {
        errorMessage(error);
        if (error.message === "invalid") {
          const input = ev.target.elements.password;
          input.setAttribute("aria-invalid", "true");
          input.setAttribute("aria-describedby", "ow-notice");
          input.focus();
          input.select();
        }
        btn.disabled = false;
        busy = false;
      }
    });
  }
  function clearRecovery() {
    try {
      sessionStorage.removeItem(draftStore);
    } catch {}
  }
  function readRecovery() {
    try {
      return JSON.parse(sessionStorage.getItem(draftStore) || "null");
    } catch {
      return null;
    }
  }
  function writeRecovery() {
    if (!dirty) return true;
    let data = null;
    const query = new URLSearchParams(location.search);
    if (editor)
      data = { tab: "edit", car: query.get("car") || "", revision: editor.original.revision, editor };
    if (state)
      data = {
        tab: "share",
        car: state.car.id,
        lang: state.language,
        channel: state.channel,
        text: state.value,
      };
    try {
      if (data) sessionStorage.setItem(draftStore, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }
  function leave() {
    if (busy) return false;
    return !dirty || window.confirm(t("discard"));
  }
  function navigate(url, { discard = false, replace = false } = {}) {
    if (discard && !leave()) return;
    dirty = false;
    clearRecovery();
    if (replace) history.replaceState({}, "", url);
    else history.pushState({}, "", url);
    renderRoute(true);
  }
  function syncLanguageLinks() {
    activeUrl = location.href;
    for (const link of document.querySelectorAll("#mast [data-cc-language]")) {
      link.href = `/${link.dataset.ccLanguage}/owner${location.search}${location.hash}`;
    }
  }
  function renderList(params) {
    const filter = ["draft", "sold"].includes(params.get("filter")) ? params.get("filter") : "public";
    const groups = {
      public: cars.filter((c) => c.status !== "draft" && c.status !== "sold"),
      sold: cars.filter((c) => c.status === "sold"),
      draft: cars.filter((c) => c.status === "draft"),
    };
    const add = `${symbol("plus")}<span>${t("added")}</span>`;
    const addLink = `<a data-owner-route class="ow-btn ow-primary" href="${urlFor({ tab: "edit" })}">${add}</a>`;
    const sectionNav = ["public", "draft", "sold"]
      .map(
        (key) =>
          `<a class="ow-tab" data-owner-route href="${urlFor(key === "public" ? {} : { filter: key })}"${filter === key ? ' aria-current="page"' : ""}>${t(key === "public" ? "published" : key === "sold" ? "archive" : "drafts")} <span>${groups[key].length}</span></a>`,
      )
      .join("");
    const rows = groups[filter]
      .map((car) => {
        const title = [car.make, car.model].filter(Boolean).join(" ");
        return `<article class="ow-row"><div class="ow-row-media">${car.cover ? `<img alt="" src="${esc(car.cover)}" loading="lazy" width="140" height="105">` : ""}</div><div class="ow-row-main"><span class="ow-status">${t(car.status)}</span><h2>${esc(title)}</h2><p class="ow-muted">${esc(compactDetails(car))}</p>${buttonsFor(car, true)}</div>${routeLink({ tab: "edit", car: car.id }, t("edit"), "ow-btn ow-edit")}</article>`;
      })
      .join("");
    panel.innerHTML = `${top(t("listingsTitle"), addLink)}<div class="ow-tabs">${sectionNav}</div>${banner()}${rows || `<p class="ow-empty">${t(filter === "public" ? "nonePublic" : filter === "sold" ? "noneSold" : "noneDrafts")}</p>`}`;
  }

  function initEditor(params) {
    const id = params.get("car");
    const original = id ? currentCar(id) : blankCar();
    if (!original) {
      panel.innerHTML = `<p>${t("notfound")}</p>${routeLink({}, t("back"))}`;
      return;
    }
    editor = {
      original: structuredClone(original),
      car: structuredClone(original),
      section: "details",
      language: "fr",
      selectedStatus: original.status === "draft" ? original.draftStatus || "available" : original.status,
    };
    editor.car.photos ||= [];
    editor.car.translations ||= {};
    editor.car.approved ||= {};
    const recovery = readRecovery();
    if (recovery?.tab === "edit" && recovery.car === (id || "") && recovery.revision === original.revision) {
      editor = recovery.editor;
      dirty = true;
    }
    printEditor();
  }

  const examples = {
    make: "BMW",
    model: "Z4 E89 35is DKG7",
    year: "2011",
    km: "126000",
    price: "25900",
    carpass: "https://…",
  };
  function fieldError(key) {
    const message = editor.errors?.[key];
    return `<small id="ow-error-${key}" class="ow-field-error"${message ? ' role="alert"' : ""}>${message ? t(message) : ""}</small>`;
  }
  function detailField(key, type = "text", attrs = "") {
    const val = editor.car[key] ?? "";
    const extra =
      type === "number" ? (key === "price" ? ' inputmode="decimal"' : ' inputmode="numeric"') : "";
    const hasHint = key === "price" || key === "carpass";
    const error = editor.errors?.[key];
    const id = `ow-car-${key}`;
    const hint = hasHint ? `<small class="ow-help" id="ow-${key}-hint">${t(key + "Hint")}</small>` : "";
    const label = `<label for="${id}">${t(key)}</label>`;
    const placeholder = key === "carpass" ? examples[key] : `${t("example")} ${examples[key]}`;
    return `<div class="ow-field">${label}<input id="${id}" type="${type}" data-car-field="${key}" aria-describedby="ow-error-${key}${hasHint ? ` ow-${key}-hint` : ""}" name="${key}" value="${esc(val)}" placeholder="${esc(placeholder)}" ${error ? 'aria-invalid="true"' : ""}${extra} ${attrs}>${hint}${fieldError(key)}</div>`;
  }
  function vehicleInputs() {
    return `<div class="ow-fields">
       ${detailField("make", "text", 'maxlength="100" autocomplete="off"')}
       ${detailField("model", "text", 'maxlength="160" autocomplete="off"')}
       ${detailField("year", "number", 'min="1886" max="2100" step="1"')}
       ${detailField("km", "number", 'min="0" max="9999999" step="1"')}
       ${detailField("price", "number", 'min="0" max="999999999" step="0.01"')}
       <label class="ow-field">${t("status")}<select name="status" data-car-field="selectedStatus">${options(statusKeys, editor.selectedStatus, t)}</select></label>
       <div class="ow-fullline">${detailField("carpass", "url", 'maxlength="1200" autocomplete="off" spellcheck="false"')}</div></div>`;
  }
  function bindDirectory() {
    const form = panel.querySelector("#ow-editor");
    if (!form?.elements.make || !window.CCSelect || !window.VehicleDirectory?.makes) return;
    const dir = window.VehicleDirectory;
    const unique = (values) => Array.from(new Set(values.filter(Boolean)));
    const alphabetical = (values) =>
      values.sort((a, b) => a.localeCompare(b, lang, { numeric: true, sensitivity: "base" }));
    CCSelect.suggest(
      form.elements.make,
      () => unique(["BMW", "Mazda", ...alphabetical([...dir.makes(), ...cars.map((c) => c.make)])]),
      t("customValue"),
    );
    CCSelect.suggest(
      form.elements.model,
      () => {
        const brand = form.elements.make.value.trim();
        const sameBrand = (c) => c.make.toLowerCase() === brand.toLowerCase();
        return unique([
          ...(brand.toLowerCase() === "bmw" ? ["Z3", "Z4", "125i", "130i"] : []),
          ...cars.filter(sameBrand).map((c) => c.model),
          ...alphabetical([...dir.modelsFor(brand)]),
        ]);
      },
      () =>
        !form.elements.make.value.trim() && !form.elements.model.value.trim()
          ? t("modelHint")
          : t("customValue"),
    );
  }

  function storyInputs() {
    const language = editor.language;
    const copy = editor.car.translations[language] || {};
    const french = editor.car.translations.fr || {};
    const boxes = copyFields
      .map((key) => {
        const reference =
          language !== "fr" && french[key]
            ? `<details class="ow-translation-ref"><summary>${t("original")}</summary><p lang="fr">${esc(french[key])}</p></details>`
            : "";
        return `<div class="ow-field"><label for="ow-text-${key}">${t(key)}</label>${reference}<textarea id="ow-text-${key}" data-copy-field="${key}" name="${key}" rows="${key === "intro" ? 3 : 2}" lang="${language}" maxlength="10000" placeholder="${esc(translate(key + "Example", language))}">${esc(copy[key])}</textarea></div>`;
      })
      .join("");
    return `<div class="ow-story"><div class="ow-story-tools"><label class="ow-field">${t("lang")}<select data-edit-language>${options(languages, language, (l) => names[l])}</select></label>${language !== "fr" ? `<label class="ow-check"><input type="checkbox" data-approve ${editor.car.approved[language] ? "checked" : ""}>${t("approve")}</label>` : ""}</div>${boxes}</div>`;
  }

  function mediaInputs() {
    const car = editor.car;
    const images = car.photos
      .map((url, i) => {
        const cover = url === car.cover;
        return `<li><div class="ow-thumb"><img src="${esc(url)}" alt="${t("photo")} ${i + 1}" width="160" height="120"></div><div class="ow-photo-controls">${cover ? `<span class="ow-cover-label">${t("cover")}</span>` : ""}
        ${!cover ? `<button type="button" class="ow-small" data-photo-op="cover" data-index="${i}">${t("setCover")}</button>` : ""}
        <button type="button" class="ow-small" data-photo-op="up" data-index="${i}" aria-label="${t("earlier")} · ${i + 1}" ${i === 0 ? "disabled" : ""}>←</button>
        <button type="button" class="ow-small" data-photo-op="down" data-index="${i}" aria-label="${t("later")} · ${i + 1}" ${i === car.photos.length - 1 ? "disabled" : ""}>→</button>
        <button type="button" class="ow-small" data-photo-op="remove" data-index="${i}" aria-label="${t("remove")} · ${t("photo")} ${i + 1}">${t("remove")}</button>
        </div></li>`;
      })
      .join("");
    const preview = car.cover
      ? `<figure class="ow-cover-preview"><figcaption>${t("coverPreview")}</figcaption><img alt="${esc([car.make, car.model].filter(Boolean).join(" ") || t("cover"))}" src="${esc(car.cover)}" width="400" height="300"></figure>`
      : "";
    return `<div class="ow-media"><div class="ow-photo-intake"><div><label class="ow-uploader" for="ow-photos">${symbol("plus")}<span>${t("addPhotos")}<small>${t("photoHelp")}</small></span><input id="ow-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple aria-describedby="ow-photo-guide ow-error-cover" ${editor.errors?.cover ? 'aria-invalid="true"' : ""}></label>${fieldError("cover")}
        <ul class="ow-photo-guide" id="ow-photo-guide"><li>${t("photoFraming")}</li><li>${t("photoPortrait")}</li><li>${t("photoHeic")}</li></ul></div>${preview}</div>
      <ol class="ow-photos">${images}</ol>
      <label class="ow-uploader">${symbol("plus")}<span>${t(car.video ? "replaceVideo" : "addVideo")}<small>${t("videoHelp")}</small></span><input id="ow-video" type="file" accept="video/mp4,video/webm"></label>
      ${car.video ? `<div class="ow-film"><video src="${esc(car.video)}" controls preload="metadata" playsinline></video><button type="button" data-action="remove-video" class="ow-small">${t("remove")}</button></div>` : ""}</div>`;
  }
  function printEditor() {
    const car = editor.car;
    const isDraft = editor.original.status === "draft";
    const tabs = ["details", "story", "media"]
      .map(
        (key) =>
          `<button type="button" class="ow-tab" data-edit-step="${key}" aria-pressed="${key === editor.section}">${t(key)}</button>`,
      )
      .join("");
    const body =
      editor.section === "details"
        ? vehicleInputs()
        : editor.section === "story"
          ? storyInputs()
          : mediaInputs();
    const publishedActions = isDraft ? "" : buttonsFor(editor.original);
    const contextLine = car.id ? `<p class="ow-editor-context">${esc([editor.original.make, editor.original.model].join(" "))} · ${t(editor.original.status)}</p>` : "";
    const saved = savedCurrent ? `<p class="ow-notice" role="status">${t(savedCurrent === "withdrawn" ? "withdrawn" : "saved")}</p>` : "";
    panel.innerHTML = `${top(t(car.id ? "editListing" : "added"))}${contextLine}${saved}
      <div class="ow-tabs ow-editor-tabs">${tabs}</div>${isDraft && editor.section === "details" ? `<p class="ow-draft-help">${t("draftHelp")}</p>` : ""}<form id="ow-editor" novalidate>${body}${banner()}
      <div class="ow-submit">${isDraft ? `<button type="submit" value="draft" class="ow-btn">${t("saveDraft")}</button>` : ""}<button type="submit" value="public" class="ow-btn ow-primary">${t(isDraft ? "publish" : "save")}</button>${routeLink(listFilter(editor.original), t("cancel"), "ow-link")}${isDraft ? "" : `<button type="submit" value="withdraw" class="ow-link ow-withdraw">${t("withdraw")}</button>`}</div>
      </form>${publishedActions ? `<div class="ow-existing-share">${publishedActions}</div>` : ""}`;
    bindDirectory();
  }
  function editInput(target) {
    if (!editor) return;
    if (target.dataset.carField) {
      const key = target.dataset.carField;
      if (key === "selectedStatus") editor.selectedStatus = target.value;
      else editor.car[key] = target.value;
      dirty = true;
    }
    if (target.dataset.copyField) {
      const language = editor.language;
      editor.car.translations[language] ||= {};
      editor.car.translations[language][target.dataset.copyField] = target.value;
      if (language === "fr") {
        for (const l of languages.filter((l) => l !== "fr")) editor.car.approved[l] = false;
      } else {
        editor.car.approved[language] = false;
        const check = panel.querySelector("[data-approve]");
        if (check) check.checked = false;
      }
      dirty = true;
    }
    if (target.matches("[data-approve]")) {
      editor.car.approved[editor.language] = target.checked;
      dirty = true;
    }
    if (target.dataset.carField && target.hasAttribute("aria-invalid")) {
      if (editor.errors) delete editor.errors[target.dataset.carField];
      const error = panel.querySelector(`#ow-error-${target.dataset.carField}`);
      if (error) error.textContent = "";
      target.removeAttribute("aria-invalid");
    }
  }

  function valid(isDraft) {
    const car = editor.car;
    const errors = {};
    if (!String(car.make || "").trim()) errors.make = "enterMake";
    if (!String(car.model || "").trim()) errors.model = "enterModel";
    for (const key of ["year", "km", "price"]) {
      const val = car[key];
      const input = panel.querySelector(`[name=${key}]`);
      if (val == null || val === "") {
        if (input?.validity.badInput || (!isDraft && key !== "price"))
          errors[key] = { year: "enterYear", km: "enterKm", price: "enterPrice" }[key];
        continue;
      }
      const n = Number(val);
      if (
        !Number.isFinite(n) ||
        n < 0 ||
        (key !== "price" && !Number.isSafeInteger(n)) ||
        (key === "year" && (n < 1886 || n > 2100)) ||
        (key === "km" && n > 9999999) ||
        (key === "price" && (n > 999999999 || Math.round(n * 100) / 100 !== n))
      )
        errors[key] = { year: "enterYear", km: "enterKm", price: "enterPrice" }[key];
    }
    if (!isDraft && editor.selectedStatus === "available" && !(Number(car.price) > 0)) {
      errors.price = "salePriceRequired";
    }
    if (car.carpass) {
      try {
        const u = new URL(car.carpass);
        if (u.protocol !== "https:" || u.username || u.password) throw Error();
      } catch {
        errors.carpass = "invalidLink";
      }
    }
    if (!isDraft && !car.cover) errors.cover = "requirePhoto";
    editor.errors = errors;
    const key = Object.keys(errors)[0];
    if (!key) return true;
    editor.section = key === "cover" ? "media" : "details";
    printEditor();
    const field = panel.querySelector(key === "cover" ? "#ow-photos" : `[name=${key}]`);
    field?.focus();
    return false;
  }

  function disableForm(disabled) {
    const form = panel.querySelector("form");
    if (form)
      for (const control of form.elements) {
        if (disabled) {
          if (!control.disabled) {
            control.disabled = true;
            control.dataset.owRestore = "";
          }
        } else if (control.hasAttribute("data-ow-restore")) {
          delete control.dataset.owRestore;
          control.disabled = false;
        }
      }
    for (const btn of panel.querySelectorAll("[data-edit-step]")) btn.disabled = disabled;
  }
  async function saveCar(isDraft) {
    if (busy || !valid(isDraft)) return;
    busy = true;
    disableForm(true);
    const action = isDraft ? (editor.original.status === "draft" ? "draft" : "withdraw") : "public";
    const activeButton = panel.querySelector(`[value="${action}"]`);
    const initialLabel = activeButton?.textContent;
    if (activeButton)
      activeButton.textContent = t(!isDraft && editor.original.status === "draft" ? "publishing" : "saving");
    panel.querySelector("form")?.setAttribute("aria-busy", "true");
    const payload = structuredClone(editor.car);
    payload.status = isDraft ? "draft" : editor.selectedStatus;
    if (isDraft) payload.draftStatus = editor.selectedStatus;
    else delete payload.draftStatus;
    for (const key of ["year", "km", "price"]) {
      payload[key] = payload[key] === "" || payload[key] == null ? null : Number(payload[key]);
    }
    try {
      const result = await api(
        `/api/owner/cars${payload.id ? "/" + encodeURIComponent(payload.id) : ""}`,
        payload.id ? "PUT" : "POST",
        payload,
      );
      const car = result.car;
      cars = [car, ...cars.filter((c) => c.id !== car.id)];
      dirty = false;
      clearRecovery();
      savedCurrent = isDraft && editor.original.status !== "draft" ? "withdrawn" :
        editor.original.status === "draft" ? "created" : "updated";
      navigate(urlFor(isDraft ? { tab: "edit", car: car.id } : { tab: "published", car: car.id }), {
        replace: true,
      });
    } catch (err) {
      errorMessage(err);
    } finally {
      busy = false;
      if (editor) disableForm(false);
      if (activeButton?.isConnected) {
        activeButton.textContent = initialLabel;
        panel.querySelector("form")?.removeAttribute("aria-busy");
      }
    }
  }
  async function uploadFiles(input) {
    if (busy || !editor) return;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    const isVideo = input.id === "ow-video";
    const allowed = isVideo ? ["video/mp4", "video/webm"] : ["image/jpeg", "image/png", "image/webp"];
    const max = (isVideo ? 64 : 20) * 1024 * 1024;
    if (
      (!isVideo && editor.car.photos.length + files.length > 40) ||
      files.some((file) => !allowed.includes(file.type) || file.size > max || !file.size)
    ) {
      notice("mediaError", true);
      input.value = "";
      return;
    }
    busy = true;
    disableForm(true);
    notice("uploading");
    let failure;
    try {
      for (const file of files) {
        const { url } = await api("/api/owner/media", "POST", file, true);
        if (isVideo) editor.car.video = url;
        else {
          if (!editor.car.photos.includes(url)) editor.car.photos.push(url);
          editor.car.cover ||= url;
          if (editor.errors) delete editor.errors.cover;
        }
        dirty = true;
      }
    } catch (err) {
      failure = err;
    } finally {
      busy = false;
      printEditor();
      if (failure) errorMessage(failure);
      panel.querySelector(isVideo ? "#ow-video" : "#ow-photos")?.focus();
    }
  }
  function changePhoto(button) {
    const index = Number(button.dataset.index);
    const car = editor.car;
    const url = car.photos[index];
    if (!url) return;
    let target = index;
    if (button.dataset.photoOp === "cover") car.cover = url;
    if (button.dataset.photoOp === "up" && index > 0) target = index - 1;
    if (button.dataset.photoOp === "down" && index < car.photos.length - 1) target = index + 1;
    if (target !== index) [car.photos[index], car.photos[target]] = [car.photos[target], car.photos[index]];
    if (button.dataset.photoOp === "remove") {
      car.photos.splice(index, 1);
      if (car.cover === url) car.cover = car.photos[0] || "";
      target = Math.min(index, car.photos.length - 1);
    }
    dirty = true;
    printEditor();
    const focusTarget =
      panel.querySelector(`[data-photo-op][data-index="${target}"]:not(:disabled)`) ||
      panel.querySelector("#ow-photos");
    focusTarget?.focus();
  }

  function suggestedText(car, channel, language) {
    const title = [car.make, car.model].filter(Boolean).join(" ");
    const details = compactDetails(car, language);
    const copy = language === "fr" || car.approved?.[language] ? car.translations?.[language] || {} : {};
    const feature = (copy.opinion || copy.intro || "").split(/(?<=[.!?])(?:\s|$)|\n/u)[0].trim();
    const status = translate(car.status, language);
    const opener =
      channel === "facebook" ? `${title} · ${status}` : `${translate("message", language)} ${title}.`;
    return [
      opener,
      details,
      feature,
      status !== "" && channel === "whatsapp" && car.status !== "available" ? status : "",
    ]
      .filter(Boolean)
      .join(channel === "facebook" ? "\n\n" : "\n");
  }
  function published(car) {
    panel.innerHTML = `${routeLink(listFilter(car), t("back"), "ow-back")}${top(t(savedCurrent === "updated" ? "updated" : savedCurrent === "created" ? "live" : "listing"))}<section class="ow-result">
      ${car.cover ? `<img class="ow-result-photo" src="${esc(car.cover)}" alt="" width="640" height="400">` : ""}
      <div><span class="ow-status">${t(car.status)}</span><h2>${esc(car.make + " " + car.model)}</h2>
      <p class="ow-muted">${esc(compactDetails(car))}</p></div><div class="ow-result-actions">${buttonsFor(car)}${routeLink({ tab: "edit", car: car.id }, t("editAgain"), "ow-link")}</div></section>${banner()}`;
  }
  async function initShare(params, sequence) {
    const car = currentCar(params.get("car"));
    if (!car || car.status === "draft") {
      panel.innerHTML = `${banner("notfound")}${routeLink({}, t("back"))}`;
      return;
    }
    const result = await api(`/api/owner/cars/${encodeURIComponent(car.id)}/shares`);
    if (sequence !== routeSequence) return;
    state = {
      car,
      shares: result.shares || {},
      channel: params.get("channel") === "facebook" ? "facebook" : "whatsapp",
      language: languages.includes(params.get("copyLang")) ? params.get("copyLang") : lang,
    };
    selectCaption();
    const recovery = readRecovery();
    if (
      recovery?.tab === "share" &&
      recovery.car === car.id &&
      recovery.channel === state.channel &&
      languages.includes(recovery.lang)
    ) {
      state.language = recovery.lang;
      selectCaption();
      state.value = recovery.text;
      dirty = true;
    }
    printShare();
  }
  function selectCaption() {
    const saved = state.shares?.[state.channel]?.[state.language];
    state.value = saved?.text ?? suggestedText(state.car, state.channel, state.language);
    dirty = false;
    state.manual = false;
  }
  function printShare() {
    const { car, channel, language, value } = state;
    const previous = state.shares[channel]?.[language];
    const old = previous && previous.revision !== car.revision;
    const url = listingUrl(car, language, channel);
    panel.innerHTML = `${routeLink(listFilter(car), t("back"), "ow-back")}${top(t("share"))}
      <div class="ow-share-summary">${car.cover ? `<img src="${esc(car.cover)}" alt="" width="128" height="88">` : ""}<div><span class="ow-status">${t(car.status)}</span><h2>${esc(car.make + " " + car.model)}</h2><p>${esc(compactDetails(car))}</p></div></div>
      <div class="ow-share-grid"><section class="ow-compose"><div class="ow-fields ow-compose-tools">
      <label class="ow-field">${t("channel")}<select name="channel" data-share-setting="channel">${options(["facebook", "whatsapp"], channel, (s) => (s === "facebook" ? "Facebook" : "WhatsApp"))}</select></label>
      <label class="ow-field">${t("shareLanguage")}<select name="copyLang" data-share-setting="language">${options(languages, language, (s) => names[s])}</select></label></div>
      ${old ? `<p class="ow-alert" id="ow-caption-update">${t("outdated")}</p>` : ""}
      <label class="ow-field">${t("shareText")}<textarea rows="7" id="ow-caption" name="caption" lang="${language}" maxlength="16000">${esc(value)}</textarea></label>
      <div class="ow-compose-actions"><button class="ow-btn" type="button" data-action="save-caption">${t("saveText")}</button><button class="ow-link" type="button" data-action="refresh-caption">${t("refresh")}</button></div>
      <div class="ow-share-url"><label class="ow-field">${t("shareLink")}<input id="ow-share-url" value="${esc(url)}" readonly dir="ltr"></label><button class="ow-link" type="button" data-action="copy-link">${t("copy")}</button></div>
      ${banner()}<a id="ow-open-share" data-share-open class="ow-btn ow-primary" ${old ? 'aria-disabled="true" role="link" aria-describedby="ow-caption-update"' : `href="${esc(externalUrl(car, channel, language, value))}"`} target="_blank" rel="noopener noreferrer">${symbol(channel)}${t(channel === "facebook" ? "copyOpen" : "openWa")}</a>
      <div id="ow-share-fallback"></div></section></div>`;
  }
  async function saveCaption() {
    const { car, channel, language } = state;
    const value = state.value.trim();
    if (!value.trim()) {
      panel.querySelector("#ow-caption").focus();
      notice("required", true);
      return false;
    }
    const body = {
      text: value,
      revision: car.revision,
      previousText: state.shares[channel]?.[language]?.text ?? null,
    };
    await api(`/api/owner/cars/${encodeURIComponent(car.id)}/shares/${channel}/${language}`, "PUT", body);
    state.shares[channel] ||= {};
    state.shares[channel][language] = body;
    state.value = value;
    dirty = false;
    clearRecovery();
    return true;
  }
  function lockCaption(locked) {
    const caption = panel.querySelector("#ow-caption");
    if (caption) caption.readOnly = locked;
    for (const input of panel.querySelectorAll(
      "[data-share-setting], [data-action='save-caption'], [data-action='refresh-caption']",
    ))
      input.disabled = locked;
  }
  async function switchShareSetting(target) {
    const key = target.dataset.shareSetting;
    const next = target.value;
    if (next === state[key]) return;
    if (busy) {
      target.value = state[key];
      return;
    }
    busy = true;
    lockCaption(true);
    try {
      if (dirty && !(await saveCaption())) {
        target.value = state[key];
        return;
      }
      state[key] = next;
      history.replaceState(
        {},
        "",
        urlFor({ tab: "share", car: state.car.id, channel: state.channel, copyLang: state.language }),
      );
      syncLanguageLinks();
      selectCaption();
      printShare();
      panel.querySelector(`[data-share-setting="${key}"]`)?.focus();
    } catch (err) {
      target.value = state[key];
      errorMessage(err);
    } finally {
      busy = false;
      lockCaption(false);
    }
  }
  function manualFacebook() {
    notice("manual");
    const text = panel.querySelector("#ow-caption");
    text.focus();
    text.select();
    panel.querySelector("#ow-share-fallback").innerHTML =
      `<a class="ow-btn" target="_blank" rel="noopener noreferrer" href="${esc(externalUrl(state.car, "facebook", state.language, state.value))}">${t("openFb")}</a>`;
  }
  function copyText(value) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);
    return Promise.reject(new Error("clipboard"));
  }
  async function openShare(event) {
    const { car, channel, language, value } = state;
    if (event.target.closest("[data-share-open]").getAttribute("aria-disabled") === "true") {
      event.preventDefault();
      panel.querySelector("#ow-caption").focus();
      return;
    }
    if (busy || !value.trim()) {
      event.preventDefault();
      if (!value.trim()) {
        notice("required", true);
        panel.querySelector("#ow-caption").focus();
      }
      return;
    }
    if (channel === "whatsapp" && !dirty) {
      // A real activated HTTPS link lets the OS hand the message to WhatsApp.
      return;
    }
    event.preventDefault();
    busy = true;
    lockCaption(true);
    let popup;
    let copyResult;
    if (channel === "facebook")
      copyResult = copyText(value).then(
        () => true,
        () => false,
      );
    try {
      popup = window.open("about:blank", "_blank");
      if (popup) popup.opener = null;
      if (dirty && !(await saveCaption())) {
        popup?.close();
        return;
      }
      if (channel === "facebook" && !(await copyResult)) {
        popup?.close();
        manualFacebook();
        return;
      }
      const destination = externalUrl(car, channel, language, value);
      if (channel === "facebook") notice("copied");
      if (popup) popup.location.replace(destination);
      else {
        const fallback = panel.querySelector("#ow-share-fallback");
        fallback.innerHTML = `<a href="${esc(destination)}" class="ow-btn" target="_blank" rel="noopener noreferrer">${t(channel === "facebook" ? "openFb" : "openWa")}</a>`;
        fallback.querySelector("a").focus();
      }
    } catch (err) {
      popup?.close();
      errorMessage(err);
    } finally {
      busy = false;
      lockCaption(false);
    }
  }
  async function renderRoute(focusHeading = false) {
    const sequence = ++routeSequence;
    syncLanguageLinks();
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab") || "list";
    editor = null;
    state = null;
    frame(["stats", "enquiries"].includes(tab) ? tab : "list");
    panel.innerHTML = `<p role="status">${t("loading")}</p>`;
    try {
      const result = await api("/api/owner/cars");
      if (sequence !== routeSequence) return;
      cars = result.cars;
      context.cars = cars.filter((car) => car.status !== "draft");
      if (tab === "stats" || tab === "enquiries") {
        await window.CCInsights.renderOwner(panel, tab, api);
      } else if (tab === "edit") {
        initEditor(params);
        savedCurrent = false;
      } else if (tab === "published") {
        const car = currentCar(params.get("car"));
        if (car && car.status !== "draft") published(car);
        else renderList(params);
        savedCurrent = false;
      } else if (tab === "share") {
        await initShare(params, sequence);
      } else renderList(params);
      if (focusHeading && sequence === routeSequence) {
        const heading = panel.querySelector("h1,h2");
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
          const rect = heading.getBoundingClientRect();
          if (rect.top < 0 || rect.top > innerHeight * 0.65) heading.scrollIntoView({ block: "start" });
        }
      }
    } catch (err) {
      if (sequence !== routeSequence) return;
      panel.innerHTML = `${banner()}<button type="button" class="ow-btn" data-action="retry">${t("retry")}</button>`;
      errorMessage(err);
    }
  }
  function interceptClick(event) {
    const target = event.target.closest("button,a");
    if (!target) return;
    if (target.hasAttribute("data-owner-route")) {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(target.href, { discard: true });
      return;
    }
    if (target.hasAttribute("data-share-open")) {
      openShare(event);
      return;
    }
    if (busy) return;
    if (target.dataset.editStep) {
      editor.section = target.dataset.editStep;
      printEditor();
      panel.querySelector(`[data-edit-step="${editor.section}"]`).focus();
      return;
    }
    if (target.dataset.photoOp) {
      changePhoto(target);
      return;
    }
    const action = target.dataset.action;
    if (action === "reconnect") {
      if (!writeRecovery() && !confirm(t("discard"))) return;
      canLeave = true;
      location.reload();
      return;
    }
    if (action === "logout") {
      if (!leave()) return;
      busy = true;
      api("/api/logout", "POST", {})
        .then(() => {
          clearRecovery();
          dirty = false;
          location.assign(ownerURL);
        })
        .catch(errorMessage)
        .finally(() => {
          busy = false;
        });
    }
    if (action === "remove-video") {
      editor.car.video = "";
      dirty = true;
      printEditor();
      panel.querySelector("#ow-video").focus();
    }
    if (action === "retry") renderRoute();
    if (action === "save-caption") {
      busy = true;
      lockCaption(true);
      saveCaption()
        .then((ok) => {
          if (ok) {
            printShare();
            notice("saved");
            panel.querySelector('[data-action="save-caption"]').focus();
          }
        })
        .catch(errorMessage)
        .finally(() => {
          busy = false;
          lockCaption(false);
        });
    }
    if (action === "refresh-caption") {
      if (!confirm(t("replace"))) return;
      state.value = suggestedText(state.car, state.channel, state.language);
      dirty = true;
      printShare();
      panel.querySelector("#ow-caption").focus();
    }
    if (action === "copy-link") {
      const input = panel.querySelector("#ow-share-url");
      copyText(input.value)
        .then(() => notice("linkCopied"))
        .catch(() => {
          input.focus();
          input.select();
          notice("manualLink");
        });
    }
  }
  if (!context.authenticated) {
    login();
    return;
  }
  main.addEventListener("click", interceptClick);
  main.addEventListener("submit", (event) => {
    if (event.target.id === "ow-editor") {
      event.preventDefault();
      const intent = event.submitter?.value || (editor.original.status === "draft" ? "draft" : "public");
      if (intent === "withdraw" && !confirm(t("confirmWithdraw"))) return;
      saveCar(intent !== "public");
    }
  });
  main.addEventListener("input", (event) => {
    const target = event.target;
    editInput(target);
    if (target.id === "ow-caption" && state) {
      state.value = target.value;
      dirty = true;
      const link = panel.querySelector("#ow-open-share");
      if (!link.hasAttribute("aria-disabled")) link.href = externalUrl(
        state.car,
        state.channel,
        state.language,
        state.value,
      );
    }
  });
  main.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-edit-language]")) {
      editor.language = target.value;
      printEditor();
      panel.querySelector("[data-edit-language]").focus();
    }
    if (target.matches("[data-share-setting]")) switchShareSetting(target);
    if (target.id === "ow-photos" || target.id === "ow-video") uploadFiles(target);
  });
  document.addEventListener("cc:languagechange", (event) => {
    if (busy) {
      event.preventDefault();
      return;
    }
    if (!writeRecovery() && !confirm(t("discard"))) {
      event.preventDefault();
      return;
    }
    canLeave = true;
  });
  window.addEventListener("beforeunload", (event) => {
    if (!canLeave && (dirty || busy)) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.addEventListener("popstate", () => {
    if (!leave()) {
      history.pushState({}, "", activeUrl);
      return;
    }
    dirty = false;
    clearRecovery();
    renderRoute();
  });
  renderRoute();
})();
