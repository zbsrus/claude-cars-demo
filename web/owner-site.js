(function ownerSite() {
  "use strict";
  const sections = {
    home: ["aboutTitle", "coverLine", "exploreCars", "z3Credit", "z3Alt", "featured"],
    catalogue: ["current", "catalogueIntro", "archive", "noCars"],
    profile: ["aboutTitle", "story", "selectionTitle", "selection", "claudePortrait"],
    services: ["services", "servicesIntro", "search", "import"],
    contact: ["contactPage", "contactIntro", "questionIntro", "viewingIntro", "sourcingIntro", "importIntro", "contactDetails", "byAppointment"],
    reviews: [],
    privacy: ["privacy", "privacyEnquiries", "privacyEnquiriesText", "privacySecurity", "privacySecurityText", "privacyDraft", "privacyButtons", "privacyChoiceText", "privacyRights", "privacyRightsText"]
  };
  const labels = {
    aboutTitle: "title", coverLine: "intro", exploreCars: "buttonText", z3Credit: "credit", z3Alt: "alternative",
    featured: "stockTitle", current: "title", catalogueIntro: "intro", archive: "archiveTitle", noCars: "emptyStock",
    story: "intro", claudePortrait: "alternative", services: "title", servicesIntro: "intro", contactPage: "title",
    contactIntro: "intro", privacy: "title", privacyDraft: "draftPolicy"
  };
  const labelledBy = {
    selectionTitle: ["title", "selectionTitle"], selection: ["text", "selectionTitle"],
    search: ["buttonText", "search"], import: ["buttonText", "import"],
    questionIntro: ["intro", "question"], viewingIntro: ["intro", "viewing"], sourcingIntro: ["intro", "sourcing"],
    importIntro: ["intro", "import"], contactDetails: ["title", "contactDetails"], byAppointment: ["text", "appointment"],
    privacyEnquiries: ["title", "privacyEnquiries"], privacyEnquiriesText: ["text", "privacyEnquiries"],
    privacySecurity: ["title", "privacySecurity"], privacySecurityText: ["text", "privacySecurity"],
    privacyButtons: ["title", "privacyButtons"], privacyChoiceText: ["text", "privacyButtons"],
    privacyRights: ["title", "privacyRights"], privacyRightsText: ["text", "privacyRights"]
  };
  const contacts = {
    phone: "+32 496 80 79 76", whatsapp: "+32 496 80 79 76", email: "mcsportcars17@gmail.com",
    address: "Chaussée de Tirlemont 28/3\n4520 Wanze, Belgique", facebook: "https://www.facebook.com/people/Claude-C/61566785224862/",
    company: "Claude C SRL", vat: "BE 0681.982.155"
  };
  const limits = {phone: 40, whatsapp: 40, email: 254, address: 400, facebook: 2048, company: 400, vat: 80,
    author: 120, quote: 2000, reply: 2000, source: 2048};
  const originals = {hero: "/assets/identity/z3-studio.webp", portrait: "/assets/identity/claude-portrait.webp"};
  const imageSlots = {home: "hero", profile: "portrait"};
  const multiline = new Set(["coverLine", "story", "selection", "catalogueIntro", "servicesIntro", "privacyDraft",
    "quote", "reply", "address", "byAppointment", "noCars"]);
  const esc = raw => String(raw ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"}[c]));
  const copy = value => JSON.parse(JSON.stringify(value));
  // Compare maps irrespective of the key order returned by the server.
  const canonical = value => Array.isArray(value) ? value.map(canonical) :
    value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
  const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  const carName = car => [car.make, car.model, car.year].filter(Boolean).join(" ");
  const button = (action, label, primary = false, attrs = "") =>
    `<button type="button" class="ow-btn${primary ? " ow-primary" : ""}" data-site-action="${action}" ${attrs}>${esc(label)}</button>`;
  const title = text => `<header class="ow-top"><h1>${esc(text)}</h1></header>`;
  const apiPath = section => `/api/owner/site/${section}`;
  const defaultText = (section, key, lang) => (section === "contact" ? window.CCInsightsCopy[lang]?.[key] : "") ||
    window.CCPublicWords[key]?.[lang] || window.CCInsightsCopy[lang]?.[key] || "";
  const effectiveText = (section, values, key, lang) => values.texts?.[lang]?.[key] || defaultText(section, key, lang);
  const contactValue = (values, key) => values.contacts?.[key] || contacts[key];
  const imageValue = (values, key) => values.images?.[key] || originals[key];
  const localImage = (value) => typeof value === "string" && /^\/(?:assets|media)\/[a-zA-Z0-9_./%-]+$/.test(value) ? value : "";
  const safeLink = value => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password && !/[\\\s]/.test(value);
    } catch { return false; }
  };
  const languages = ["fr", "nl", "de", "en", "es"];
  const langOptions = selected => languages.map(code =>
    `<option value="${code}" lang="${code}"${code === selected ? " selected" : ""}>${esc(window.CCOwnerLocales.names[code])}</option>`).join("");

  async function render(options) {
    const {panel, params, api, cars, urlFor, t, lang, isCurrent, recovery, setRecovery, setDirty, setBusy} = options;
    const w = key => window.CCOwnerSiteWords(key, lang);
    const section = params.get("section");
    const route = id => esc(urlFor({tab: "site", section: id}));
    if (!Object.hasOwn(sections, section)) {
      panel.innerHTML = `${title(w("site"))}<nav class="os-directory" aria-label="${esc(w("site"))}">${Object.keys(sections).map(id =>
        `<a data-owner-route href="${route(id)}"><span><strong>${esc(w(id))}</strong><small>${esc(w(id + "Hint"))}</small></span><span class="os-dir-tail"><small data-site-state="${id}"></small><span aria-hidden="true">→</span></span></a>`).join("")}</nav>`;
      await Promise.all(Object.keys(sections).map(async id => {
        try {
          const state = await api(apiPath(id));
          if (!isCurrent()) return;
          if (!equal(state.draft, state.published)) panel.querySelector(`[data-site-state="${id}"]`).textContent = w("draft");
        } catch { /* Each section loads its own current state on entry. */ }
      }));
      return;
    }
    let snapshot = await api(apiPath(section));
    if (!isCurrent()) return;
    let received = [];
    let inboxFailed = false;
    async function loadInbox() {
      try {
        received = (await api("/api/owner/reviews")).reviews;
        inboxFailed = false;
      } catch { inboxFailed = true; }
    }
    if (section === "reviews") await loadInbox();
    if (!isCurrent()) return;
    let values = copy(snapshot.draft);
    let revision = snapshot.revision;
    let language = lang;
    let comparing = false;
    let conflict = false;
    let preview = false;
    let confirmation = "";
    let removeAt = null;
    let message = "";
    let error = false;
    let busy = false;
    const slot = imageSlots[section];
    const visibleCars = ["available", "soon", "reserved"].flatMap(status => cars.filter(car => car.status === status));
    const vehicle = id => cars.find(car => car.id === id);
    const label = key => {
      if (labels[key]) return w(labels[key]);
      if (labelledBy[key]) {
        const [kind, ref] = labelledBy[key];
        return `${w(kind)} · ${defaultText(section, ref, lang)}`;
      }
      return {whatsapp: "WhatsApp", facebook: "Facebook"}[key] || w(key);
    };
    const display = key => effectiveText(section, values, key, language);
    const dataChanged = () => !equal(values, snapshot.draft);
    const hasDraft = () => !equal(snapshot.draft, snapshot.published);
    const status = () => w(dataChanged() ? "unsaved" : hasDraft() ? "draft" : "live");
    const back = `<a class="ow-back" data-owner-route href="${route("")}">${esc(w("site"))}</a>`;
    const dataForRecovery = () => ({section, revision, values: copy(values), language});
    if (recovery?.section === section && Number.isInteger(recovery.revision) && recovery.values && typeof recovery.values === "object") {
      values = copy(recovery.values);
      language = languages.includes(recovery.language) ? recovery.language : lang;
      revision = recovery.revision;
      conflict = revision !== snapshot.revision && !equal(values, snapshot.draft);
      if (!conflict) revision = snapshot.revision;
      message = w(conflict ? "conflict" : "recovered");
    }
    setRecovery?.(dataForRecovery);
    const isDirty = () => dataChanged() || conflict;
    setDirty(isDirty());
    function setMessage(text, bad = false) {
      message = text; error = bad;
      const line = panel.querySelector(".os-message");
      if (line) { line.textContent = text; line.classList.toggle("os-error", bad); }
    }
    const textInput = (path, name, val, key, opts = {}) => {
      const id = "os-" + path.replaceAll(".", "-");
      const attrs = `id="${id}" data-path="${path}" maxlength="${limits[key] || 4000}"${opts.required ? " required" : ""}${opts.readonly ? " readonly" : ""}${opts.lang ? ` lang="${opts.lang}"` : ""}`;
      const large = multiline.has(key) || key.endsWith("Text") || key.endsWith("Intro");
      const type = ["email", "date"].includes(key) ? key : ["source", "facebook"].includes(key) ? "url" : ["phone", "whatsapp"].includes(key) ? "tel" : "text";
      const hint = ["phone", "whatsapp"].includes(key) ? w("numberHint") : ["source", "facebook"].includes(key) ? "https://…" : "";
      return `<div class="ow-field"><label for="${id}">${esc(name)}</label>${hint ? `<small id="${id}-hint">${esc(hint)}</small>` : ""}${large ?
        `<textarea ${attrs} rows="${String(val).length > 240 ? 5 : 3}">${esc(val)}</textarea>` :
        `<input ${attrs} type="${type}" value="${esc(val)}"${hint ? ` aria-describedby="${id}-hint"` : ""}>`}</div>`;
    };
    const block = (heading, contents, hint = "", id = "") => `<section class="os-block"><h2${id ? ` id="os-group-${id}" tabindex="-1"` : ""}>${esc(heading)}</h2>${hint ? `<p class="os-hint">${esc(hint)}</p>` : ""}${contents}</section>`;
    const languageSelect = () => `<div class="ow-field os-language"><label for="os-language">${esc(w("language"))}</label><select id="os-language">${langOptions(language)}</select></div>`;
    function copyFields() {
      return block(w("copy"), languageSelect() + sections[section].map(key =>
        textInput(`texts.${language}.${key}`, label(key), display(key), key, {lang: language})).join(""), w("defaultHint"), "copy");
    }
    function imageFields() {
      const photoTitle = w(slot === "hero" ? "photo" : "portrait");
      return block(photoTitle, `<div class="os-image-box ${slot}"><img src="${esc(imageValue(values, slot))}" alt="${esc(display(slot === "hero" ? "z3Alt" : "claudePortrait"))}"></div>
        <div class="ow-field"><label class="ow-btn os-file" for="os-image"><span>${esc(w("photoChoose"))}</span><input id="os-image" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="os-file-hint"></label><small id="os-file-hint">${esc(w("fileHint"))}</small></div>
        ${values.images?.[slot] ? button("reset-image", w("photoReset")) : ""}`, "", "image");
    }
    function featuredFields() {
      const pinned = values.featured || [];
      return block(w("stock"), [0, 1, 2].map(i => {
        const id = pinned[i];
        const missing = id && !visibleCars.some(car => car.id === id);
        const available = visibleCars.filter(car => car.id === id || !pinned.includes(car.id));
        return `<div class="ow-field"><label for="os-position-${i}">${esc(w("position"))} ${i + 1}</label><select id="os-position-${i}" data-position="${i}"${i > pinned.length || (!available.length && !missing) ? " disabled" : ""}>
          <option value="">${esc(w("unselected"))}</option>${missing ? `<option selected value="${esc(id)}">${esc(vehicle(id) ? carName(vehicle(id)) : id)} · ${esc(w("unavailable"))}</option>` : ""}
          ${available.map(car => `<option value="${esc(car.id)}"${car.id === id ? " selected" : ""}>${esc(carName(car))}</option>`).join("")}</select>${id && pinned.length > 1 ? `<div class="os-actions">${i > 0 ? button("up-" + i, w("up"), false, `aria-label="${esc(w("up") + " · " + (vehicle(id) ? carName(vehicle(id)) : id))}"`) : ""}${i < pinned.length - 1 ? button("down-" + i, w("down"), false, `aria-label="${esc(w("down") + " · " + (vehicle(id) ? carName(vehicle(id)) : id))}"`) : ""}</div>` : ""}</div>`;
      }).join(""), w("stockHint"), "stock");
    }
    function contactFields() {
      return block(w("details"), Object.keys(contacts).map(key =>
        textInput("contacts." + key, label(key), contactValue(values, key), key)).join(""), "", "details");
    }
    function reviewFields() {
      const reviews = values.reviews || [];
      const receivedCards = received.map(item => {
        const inEditor = reviews.some(r => r.id === item.id) || snapshot.published.reviews?.some(r => r.id === item.id);
        const date = new Date(item.created * 1000);
        const stamp = new Intl.DateTimeFormat(lang, {dateStyle:"medium", timeZone:"Europe/Brussels"}).format(date);
        return `<article class="os-received-review">
          <div class="os-received-meta"><strong>${esc(item.rating)}/5</strong><time datetime="${date.toISOString()}">${esc(stamp)}</time><span>${esc(item.language.toUpperCase())}</span></div>
          ${item.comment ? `<p lang="${esc(item.language)}">${esc(item.comment)}</p>` : ""}
          <p class="os-hint">${esc(w(item.permission ? "feedbackAllowed" : "feedbackPrivate"))}</p>
          <div class="os-actions">${item.permission && !inEditor && reviews.length < 30 ? button("prepare-" + item.id, w("feedbackPrepare")) : ""}
          ${button("archive-" + item.id, w("feedbackArchive"))}</div></article>`;
      }).join("");
      const inbox = block(w("feedbackInbox"), inboxFailed
        ? `<p>${esc(w("feedbackInboxError"))}</p>` + button("reload-inbox", w("feedbackReload"))
        : receivedCards || `<p>${esc(w("feedbackEmpty"))}</p>`, w("feedbackInboxNote"), "inbox");
      return inbox + block(w("reviews"), (reviews.length ? reviews.map((r, i) =>
        `<fieldset class="os-review"><legend>${esc(w("review"))} ${i + 1}</legend>
        ${textInput(`reviews.${i}.author`, w("author"), r.author, "author", {required: true, readonly: /^guest-[a-f0-9]{32}$/.test(r.id)})}
        ${textInput(`reviews.${i}.date`, w("reviewDate"), r.date, "date")}
        <div class="ow-field"><label for="os-review-lang-${i}">${esc(w("reviewLang"))}</label><select data-path="reviews.${i}.language" id="os-review-lang-${i}">${langOptions(r.language)}</select></div>
        <div class="ow-field"><label for="os-reviews-${i}-rating">${esc(w("rating"))}</label><select data-path="reviews.${i}.rating" id="os-reviews-${i}-rating"><option value="">${esc(w("noRating"))}</option>${[1,2,3,4,5].map(n => `<option value="${n}"${r.rating === n ? " selected" : ""}>${n}/5</option>`).join("")}</select></div>
        ${["quote", "reply", "source"].map(key => textInput(`reviews.${i}.${key}`, w(key), r[key], key, {required: key === "quote", lang: key === "source" ? "" : r.language})).join("")}
        ${button(`remove-${i}`, w("removeReview"), false, `aria-label="${esc(w("removeReview") + " " + (r.author || (i + 1)))}"`)}</fieldset>`).join("") : `<p>${esc(w("noneReview"))}</p>`) +
        (reviews.length < 30 ? button("add-review", w("addReview")) : ""), w("reviewsNote"));
    }
    function previewCards(list) {
      return `<div class="os-preview-cars">${list.map(car => {
        const url = localImage(car.cover || car.photos?.[0]);
        return `<div>${url ? `<img src="${esc(url)}" alt="">` : ""}<b>${esc(carName(car))}</b></div>`;
      }).join("")}</div>`;
    }
    function previewContent() {
      const content = key => esc(display(key));
      const h = key => `<h3>${content(key)}</h3>`;
      const p = key => `<p>${content(key)}</p>`;
      const action = key => `<span class="os-preview-action">${content(key)}</span>`;
      const hero = section === "home";
      const parts = [];
      if (slot) {
        parts.push(`<h2>${content("aboutTitle")}</h2><figure class="${slot}"><img src="${esc(imageValue(values, slot))}" alt="${content(hero ? "z3Alt" : "claudePortrait")}">${hero ? `<figcaption>${content("z3Credit")}</figcaption>` : ""}</figure>`);
        if (hero) {
          const order = (values.featured || []).map(id => visibleCars.find(c => c.id === id)).filter(Boolean);
          const carsHere = order.concat(visibleCars.filter(c => !order.includes(c)));
          parts.push(p("coverLine"), carsHere.length ? action("exploreCars") : "", h("featured"), previewCards(carsHere));
        } else parts.push(p("story"), h("selectionTitle"), p("selection"));
      } else if (section === "catalogue") {
        const sold = cars.filter(c => c.status === "sold");
        parts.push(`<h2>${content("current")}</h2>`, p("catalogueIntro"), visibleCars.length ? previewCards(visibleCars) : p("noCars"), sold.length ? h("archive") + previewCards(sold) : "");
      } else if (section === "services") {
        parts.push(`<h2>${content("services")}</h2>`, p("servicesIntro"), action("search"), action("import"));
      } else if (section === "contact") {
        parts.push(`<h2>${content("contactPage")}</h2>`, p("contactIntro"));
        for (const type of ["question", "viewing", "sourcing", "import"]) {
          parts.push(`<details><summary>${esc(window.CCInsightsCopy[language][type])}</summary>${p(type + "Intro")}</details>`);
        }
        parts.push(h("contactDetails"), p("byAppointment"), `<dl>${Object.keys(contacts).map(key =>
          `<dt>${esc(label(key))}</dt><dd>${esc(contactValue(values, key))}</dd>`).join("")}</dl>`);
      } else if (section === "reviews") {
        parts.push(`<h2>${esc(w("reviews"))}</h2>`);
        for (const r of values.reviews || []) {
          parts.push(`<blockquote lang="${esc(r.language)}">${r.rating ? `<b>${r.rating}/5</b>` : ""}<p>${esc(r.quote)}</p><cite>${esc(r.author)}</cite>${r.date ? ` <time datetime="${esc(r.date)}">${esc(r.date)}</time>` : ""}${r.reply ? `<p><b lang="${lang}">${esc(w("replyBy"))}</b><br>${esc(r.reply)}</p>` : ""}${r.source ? `<small>${esc(r.source)}</small>` : ""}</blockquote>`);
        }
        if (!values.reviews?.length) parts.push(`<p>${esc(w("noneReview"))}</p>`);
      } else {
        for (const key of sections.privacy) {
          parts.push(key === "privacy" ? `<h2>${content(key)}</h2>` : key.endsWith("Text") || key === "privacyDraft" ? p(key) : h(key));
        }
      }
      return `<section class="os-preview" aria-label="${esc(w("previewNote"))}"><div class="os-preview-bar"><span>${esc(w("previewNote"))}</span><span lang="${language}">${esc(window.CCOwnerLocales.names[language])}</span></div><article lang="${language}">${parts.join("")}</article></section>`;
    }
    function differences() {
      const rows = [];
      const add = (name, theirs, mine, image = false) => {
        if (equal(theirs, mine)) return;
        const cell = v => image ? `<img alt="" src="${esc(v)}">` : esc(v || "—");
        rows.push(`<div class="os-diff"><h3>${esc(name)}</h3><div><b>${esc(w("latest"))}</b><p>${cell(theirs)}</p></div><div><b>${esc(w("mine"))}</b><p>${cell(mine)}</p></div></div>`);
      };
      const theirs = snapshot.draft;
      for (const code of languages) for (const key of sections[section]) {
        add(`${window.CCOwnerLocales.names[code]} · ${label(key)}`, effectiveText(section, theirs, key, code), effectiveText(section, values, key, code));
      }
      if (slot) add(w(slot === "hero" ? "photo" : "portrait"), imageValue(theirs, slot), imageValue(values, slot), true);
      if (section === "home") {
        const names = v => (v.featured || []).map(id => vehicle(id) ? carName(vehicle(id)) : id).join("\n");
        add(w("stock"), names(theirs), names(values));
      }
      if (section === "contact") for (const key of Object.keys(contacts)) add(label(key), contactValue(theirs, key), contactValue(values, key));
      if (section === "reviews") {
        const summary = v => (v.reviews || []).map(r => [r.author, r.date, r.language?.toUpperCase(), r.rating ? r.rating + "/5" : "", r.quote, r.reply, r.source].filter(Boolean).join("\n")).join("\n\n");
        add(w("reviews"), summary(theirs), summary(values));
      }
      return block(w("compare"), rows.join("") + `<p>${esc(w("keepCheck"))}</p><div class="os-actions">${button("use-latest", w("useLatest"))}${button("keep-mine", w("keepMine"))}</div>`);
    }
    function askBlock() {
      if (!confirmation) return "";
      const review = confirmation === "remove";
      const prompt = review ? w("removeCheck") : w(confirmation + "Check");
      return `<section class="os-confirm" aria-labelledby="os-confirm-title"><h2 tabindex="-1" id="os-confirm-title">${esc(prompt)}</h2>
        <div class="os-actions">${button("confirm", review ? w("removeReview") : w(confirmation), true)}${button("cancel", t("cancel"))}</div></section>`;
    }
    function refreshStatus() {
      setDirty(isDirty());
      const state = panel.querySelector(".os-status");
      if (state && state.textContent !== status()) state.textContent = status();
      const save = panel.querySelector('[data-site-action="save"]');
      if (save) save.disabled = !dataChanged() || busy || conflict || Boolean(confirmation);
      const publish = panel.querySelector('[data-site-action="publish"]');
      if (publish) publish.disabled = !hasDraft() || dataChanged() || busy || conflict || Boolean(confirmation);
      const discard = panel.querySelector('[data-site-action="discard"]');
      if (discard) {
        discard.hidden = !dataChanged() && !hasDraft();
        discard.disabled = busy || conflict || Boolean(confirmation);
      }
    }
    function focus(target) {
      const el = panel.querySelector(target);
      if (el?.tagName === "SELECT" && window.CCSelect) window.CCSelect.focus(el);
      else el?.focus();
    }
    function draw(focusOn) {
      if (!isCurrent()) return;
      const fields = section === "reviews" ? reviewFields() : `<div class="os-columns"><div>${copyFields()}</div>${section === "contact" ? `<aside>${contactFields()}</aside>` :
        slot ? `<aside>${imageFields()}${section === "home" ? featuredFields() : ""}</aside>` : ""}</div>`;
      const showLinks = !preview && !confirmation && (slot || section === "contact");
      const jumps = [["copy", w("copy")], ...(slot ? [["image", w(slot === "hero" ? "photo" : "portrait")]] : []),
        ...(section === "home" ? [["stock", w("stock")]] : []), ...(section === "contact" ? [["details", w("details")]] : [])];
      const links = showLinks ? `<div class="os-jumps">${jumps.map(([id, name]) => `<button type="button" class="ow-link" data-site-action="jump-${id}">${esc(name)}</button>`).join("")}</div>` : "";
      panel.innerHTML = `${back}${title(w(section))}<div class="os-editor"><div class="os-toolbar"><span class="os-status" role="status" tabindex="-1">${esc(status())}</span>
        ${button("preview", w(preview ? "edit" : "preview"))}</div>
        <p class="os-message${error ? " os-error" : ""}" aria-live="polite">${esc(message)}</p>
        ${conflict && !comparing ? button("compare", w("compare"), true) : ""}${comparing ? differences() : ""}
        ${askBlock()}${links}<fieldset class="os-controls"${busy || confirmation ? " disabled" : ""}>
        ${preview ? (sections[section].length ? languageSelect() : "") + previewContent() : fields}
        <div class="os-footer"><p>${esc(w("unpublished"))}</p><div class="os-actions">${button("save", w("save"), true)}${button("publish", w("publish"))}
        ${button("discard", w("discard"))}</div></div></fieldset></div>`;
      refreshStatus();
      if (focusOn) focus(focusOn);
    }
    function locked(value) {
      busy = value;
      setBusy(value);
      const controls = panel.querySelector(".os-controls");
      if (controls) controls.disabled = value || Boolean(confirmation);
      for (const btn of panel.querySelectorAll(".os-toolbar button, .os-confirm button, .os-diff button")) btn.disabled = value;
      refreshStatus();
    }
    function updatePath(path, value) {
      const [group, pos, field] = path.split(".");
      if (group === "reviews") {
        const review = values.reviews[Number(pos)];
        if (field === "date" && !value) delete review.date;
        else if (field !== "rating") review[field] = value;
        else if (value) review.rating = Number(value);
        else delete review.rating;
      }
      else {
        const text = group === "texts";
        let bucket = values[group] || (values[group] = {});
        if (text) bucket = bucket[pos] || (bucket[pos] = {});
        const key = text ? field : pos;
        const original = text ? defaultText(section, key, pos) : contacts[key];
        if (!value.trim() || value === original) delete bucket[key];
        else bucket[key] = value;
        if (text && !Object.keys(bucket).length) delete values[group][pos];
        if (!Object.keys(values[group]).length) delete values[group];
      }
      setMessage("");
      refreshStatus();
    }
    function reportField(path) {
      preview = false;
      confirmation = "";
      if (path.startsWith("texts.")) language = path.split(".")[1];
      message = path.startsWith("featured") ? w("staleCar") : w("badField");
      error = true;
      draw();
      const id = path.startsWith("featured") ? "os-position-" + (path.split(".")[1] || 0) : "os-" + path.replaceAll(".", "-");
      const field = document.getElementById(id);
      if (field) {
        field.setAttribute("aria-invalid", "true");
        field.setCustomValidity(message);
        focus("#" + id);
        field.reportValidity();
      } else focus(".os-status");
    }
    function firstInvalid() {
      if (section === "contact") for (const key of Object.keys(contacts)) {
        const v = contactValue(values, key).trim();
        if ((["whatsapp", "phone"].includes(key) && (!/^\+?[0-9 ()-]+$/.test(v) || !/^\d{7,15}$/.test(v.replace(/\D/g, "")))) ||
          (key === "whatsapp" && !/^[1-9]\d{6,14}$/.test(v.replace(/\D/g, ""))) ||
          (key === "facebook" && !safeLink(v)) || (key === "email" && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v))) return "contacts." + key;
      }
      if (section === "reviews") for (const [i,r] of (values.reviews || []).entries()) {
        for (const key of ["author", "quote"]) if (!r[key]?.trim()) return `reviews.${i}.${key}`;
        if (r.source?.trim() && !safeLink(r.source.trim())) return `reviews.${i}.source`;
      }
      return "";
    }
    async function commit(action) {
      if (busy || conflict) return;
      if (action !== "discard") {
        const issue = firstInvalid();
        if (issue) { reportField(issue); return; }
      }
      locked(true);
      try {
        const next = await api(apiPath(section), "PUT", {revision, action, values});
        if (!isCurrent()) return;
        snapshot = next; revision = next.revision; values = copy(next.draft);
        confirmation = ""; conflict = false; comparing = false;
        message = w(action === "publish" || action === "discard" ? "live" : "draft");
        error = false;
        draw(); focus(".os-status");
      } catch (err) {
        if (!isCurrent()) return;
        confirmation = "";
        if (err.message === "conflict") {
          conflict = true;
          message = w("conflict"); error = true;
          draw('[data-site-action="compare"]');
        } else if (err.field) reportField(err.field);
        else { message = t(err.message) || t("failure"); error = true; draw(); }
      } finally { if (isCurrent()) locked(false); }
    }
    async function compareLatest() {
      locked(true);
      try {
        const latest = await api(apiPath(section));
        if (!isCurrent()) return;
        snapshot = latest; comparing = true; preview = false;
        draw('[data-site-action="use-latest"]');
      } catch (err) { if (isCurrent()) setMessage(t(err.message) || t("failure"), true); }
      finally { if (isCurrent()) locked(false); }
    }
    async function upload(file) {
      if (!file || busy) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 20 * 1024 * 1024 || !file.size) {
        setMessage(t("mediaError"), true); return;
      }
      locked(true);
      setMessage(t("uploading"));
      try {
        const result = await api("/api/owner/media", "POST", file, true);
        if (!isCurrent()) return;
        values.images = {[slot]: result.url};
        message = ""; error = false;
        draw();
      } catch (err) {
        if (isCurrent()) setMessage(t(err.message) || t("mediaError"), true);
      } finally {
        if (isCurrent()) {
          locked(false);
          if (!panel.ownerDocument.querySelector("#ow-reconnect:not([hidden])")) focus("#os-image");
        }
      }
    }
    function onInput(event) {
      const field = event.target;
      if (!isCurrent() || busy || confirmation || !field.dataset.path || field.tagName === "SELECT") return;
      field.setCustomValidity("");
      field.removeAttribute("aria-invalid");
      updatePath(field.dataset.path, field.value);
    }
    function onChange(event) {
      const el = event.target;
      if (!isCurrent() || busy || confirmation) return;
      if (el.id === "os-language") {
        language = el.value; draw("#os-language");
      } else if (el.id === "os-image") upload(el.files[0]);
      else if (el.dataset.position !== undefined) {
        const i = Number(el.dataset.position);
        const pinned = [...(values.featured || [])];
        if (el.value) pinned[i] = el.value;
        else pinned.splice(i, 1);
        if (pinned.length) values.featured = pinned;
        else delete values.featured;
        message = ""; error = false;
        draw("#os-position-" + Math.min(i, pinned.length));
      } else if (el.tagName === "SELECT" && el.dataset.path) updatePath(el.dataset.path, el.value);
    }
    async function onClick(event) {
      const el = event.target.closest("[data-site-action]");
      if (!el || !isCurrent() || busy) return;
      const action = el.dataset.siteAction;
      if (confirmation && !["confirm", "cancel"].includes(action)) return;
      if (action.startsWith("jump-")) {
        const heading = panel.querySelector("#os-group-" + action.slice(5));
        heading?.focus();
        heading?.scrollIntoView({block: "start"});
      } else if (action === "save") commit("draft");
      else if (/^(up|down)-[0-2]$/.test(action)) {
        const [direction, at] = action.split("-");
        const index = Number(at), next = direction === "up" ? index - 1 : index + 1;
        [values.featured[index], values.featured[next]] = [values.featured[next], values.featured[index]];
        message = ""; error = false;
        draw("#os-position-" + next);
      }
      else if (action === "compare") compareLatest();
      else if (action === "keep-mine" || action === "use-latest") {
        if (action === "use-latest") values = copy(snapshot.draft);
        revision = snapshot.revision; conflict = false; comparing = false; message = ""; error = false;
        draw('[data-site-action="preview"]');
      } else if (action === "preview") { preview = !preview; draw('[data-site-action="preview"]'); }
      else if (["discard", "publish"].includes(action) || action.startsWith("remove-")) {
        if (action.startsWith("remove-")) { confirmation = "remove"; removeAt = Number(action.slice(7)); }
        else confirmation = action;
        draw("#os-confirm-title");
      } else if (action === "cancel") {
        const from = confirmation === "remove" ? "remove-" + removeAt : confirmation;
        confirmation = ""; draw(`[data-site-action="${from}"]`);
      } else if (action === "confirm") {
        if (confirmation === "remove") {
          values.reviews.splice(removeAt, 1);
          if (!values.reviews.length) delete values.reviews;
          confirmation = ""; message = ""; error = false; draw('[data-site-action="add-review"]');
        } else commit(confirmation);
      } else if (action === "reset-image") {
        delete values.images; message = ""; error = false; draw("#os-image");
      } else if (action === "reload-inbox") {
        locked(true);
        await loadInbox();
        if (isCurrent()) { locked(false); draw("#os-group-inbox"); }
      } else if (action.startsWith("prepare-guest-")) {
        const item = received.find(row => row.id === action.slice(8));
        const reviews = values.reviews || (values.reviews = []);
        if (!item?.permission || reviews.length >= 30 || reviews.some(r => r.id === item.id)) return;
        const anonymous = window.CCOwnerSiteWords("feedbackAnonymous", item.language);
        const date = new Intl.DateTimeFormat("sv-SE", {year:"numeric", month:"2-digit", day:"2-digit", timeZone:"Europe/Brussels"}).format(new Date(item.created * 1000));
        reviews.push({id:item.id, author:anonymous, language:item.language, quote:item.comment, rating:item.rating, date, reply:"", source:""});
        message = w("feedbackPrepared"); error = false; draw(`#os-reviews-${reviews.length - 1}-quote`);
      } else if (action.startsWith("archive-guest-")) {
        const id = action.slice(8);
        locked(true);
        try {
          await api("/api/owner/reviews", "PUT", {id});
          if (!isCurrent()) return;
          await loadInbox();
          if (!isCurrent()) return;
          message = w("feedbackArchived"); error = false;
        } catch (err) { if (isCurrent()) { message = t(err.message) || t("failure"); error = true; } }
        finally { if (isCurrent()) { locked(false); draw("#os-group-inbox"); } }
      } else if (action === "add-review") {
        const reviews = values.reviews || (values.reviews = []);
        const id = crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
        reviews.push({id, author: "", language, quote: "", reply: "", source: ""});
        message = ""; error = false; draw(`#os-reviews-${reviews.length - 1}-author`);
      }
    }
    // The route owner replaces this panel on navigation. Bind to its lifetime.
    panel.addEventListener("input", onInput);
    panel.addEventListener("change", onChange);
    panel.addEventListener("click", onClick);
    draw();
  }
  window.CCOwnerSite = {render};
})();
