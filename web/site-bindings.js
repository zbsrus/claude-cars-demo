/* Apply explicitly published editorial content to the existing storefront. */
(() => {
  "use strict";
  const {siteContent: site, lang, page} = window.CC;
  if (!site || page === "owner") return;

  const words = section => site[section]?.texts?.[lang] || {};
  const all = selector => document.querySelectorAll(selector);
  function label(element, value) {
    if (!element || !value) return;
    const node = [...element.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (!node) element.prepend(document.createTextNode(value));
    else if (node.textContent !== value) node.textContent = value;
  }
  function bindLabels(section, selectors) {
    const copy = words(section);
    for (const [key, selector] of Object.entries(selectors)) {
      if (copy[key]) all(selector).forEach(el => label(el, copy[key]));
    }
  }
  function imageAt(selector, url, description) {
    const image = document.querySelector(selector);
    if (!image) return;
    if (url) {
      image.removeAttribute("srcset");
      image.src = url;
    }
    if (description) image.alt = description;
  }

  if (page === "home" && site.home) {
    bindLabels("home", {aboutTitle:"#cc-cover-title", coverLine:".cc-cover-intro > p",
      featured:"#cc-stock-title", z3Credit:".cc-z3 figcaption", exploreCars:'.cc-cover-links [href="#stock"]'});
    imageAt(".cc-z3 img", site.home.images?.hero, words("home").z3Alt);
    const stock = document.getElementById("stock-items");
    if (stock && site.home.featured?.length) {
      const cards = new Map([...stock.querySelectorAll(".cc-car-card")].map(card => [new URL(card.href).pathname.split("/").pop(), card]));
      stock.prepend(...site.home.featured.map(id => cards.get(id)).filter(Boolean));
      // The editorial note always belongs to the car named in its dossier link.
      const link = document.querySelector(".cc-perspective .cc-doc-link");
      const car = link && window.CC.cars.find(item => new URL(link.href).pathname.endsWith("/" + item.id));
      if (car && car.id !== site.home.featured[0]) label(link, [car.make, car.model].join(" "));
    }
  }
  if (page === "catalogue") bindLabels("catalogue", {current:"#cc-catalogue-title",
    catalogueIntro:".cc-catalogue-lead h1 + p", archive:"#cc-archive-title", noCars:".cc-inventory-band .cc-empty"});
  if (page === "about" && site.profile) {
    bindLabels("profile", {aboutTitle:".cc-about-heading h1", story:".cc-story-intro",
      selectionTitle:"#cc-about-selection", selection:".cc-story .cc-prose"});
    imageAt(".cc-claude-portrait", site.profile.images?.portrait, words("profile").claudePortrait);
  }
  bindLabels("services", {services:'#cc-services-title, .cc-cover-links [href="#services"], .cc-empty + [href="#services"]',
    servicesIntro:".cc-services-inner h2 + p", search:'#services [href*="type=sourcing"], .cc-cover-links [href*="type=sourcing"]',
    import:'#services [href*="type=import"], .cc-cover-links [href*="type=import"]'});
  if (page === "privacy") {
    const copy = words("privacy");
    label(document.querySelector(".cc-privacy h1"), copy.privacy);
    const sections = all(".cc-privacy-copy > section");
    for (const [i, [heading, body]] of [["privacyEnquiries","privacyEnquiriesText"], ["privacySecurity","privacySecurityText"],
      ["privacyButtons","privacyChoiceText"], ["privacyRights","privacyRightsText"]].entries()) {
      label(sections[i]?.querySelector("h2"), copy[heading]);
      label(sections[i]?.querySelector("p"), copy[body]);
    }
    label(document.querySelector(".cc-privacy-copy > section + p"), copy.privacyDraft);
  }

  const comments = site.reviews?.reviews;
  if (page === "about" && comments?.length) {
    const translations = {
      fr:["Avis des clients","Réponse de Claude","Lire l’original"],
      nl:["Ervaringen van klanten","Antwoord van Claude","Lees het origineel"],
      de:["Kundenstimmen","Antwort von Claude","Original lesen"],
      en:["Customer reviews","Claude’s reply","Read the original"],
      es:["Opiniones de clientes","Respuesta de Claude","Leer el original"]
    };
    const [heading, reply, original] = translations[lang];
    const make = (tag, text) => { const el = document.createElement(tag); el.textContent = text; return el; };
    const section = document.createElement("section");
    section.className = "cc-wrap cc-section";
    const title = make("h2", heading);
    title.className = "cc-section-title";
    section.append(title);
    for (const item of comments) {
      const figure = document.createElement("figure");
      const quote = make("blockquote", item.quote);
      quote.lang = item.language;
      const author = make("figcaption", item.rating ? item.author + " · " + item.rating + "/5" : item.author);
      figure.append(quote, author);
      if (item.reply) {
        const response = make("p", item.reply);
        response.lang = item.language;
        figure.append(make("strong", reply), response);
      }
      if (item.source) {
        const link = make("a", original);
        link.href = item.source;
        link.rel = "noreferrer";
        figure.append(link);
      }
      section.append(figure);
    }
    document.querySelector(".cc-about-band")?.after(section);
  }

  const contacts = site.contact?.contacts || {};
  const {phone, email, address, company, vat, facebook, whatsapp} = contacts;
  function lines(element, parts) {
    if (!element) return;
    const nodes = [];
    for (const part of parts) {
      if (nodes.length) nodes.push(document.createElement("br"));
      nodes.push(part);
    }
    element.replaceChildren(...nodes);
  }
  const originalCompany = "Claude C SRL", originalVAT = "BE 0681.982.155";
  const legal = (company || originalCompany) + " · " + (vat || originalVAT);
  const addressLines = address?.split(/\r?\n/).filter(Boolean);
  const originalAddress = document.querySelector("#foot address")?.innerText.split("\n").filter(Boolean) || [];
  if (address) {
    lines(document.querySelector("#foot address"), addressLines);
    for (const map of all('a[href^="https://www.google.com/maps/dir/"]')) {
      const url = new URL(map.href);
      url.searchParams.set("destination", addressLines.join(", "));
      map.href = url.href;
    }
  }
  if (company || vat) label(document.querySelector(".cc-foot-legal"), legal);
  if (company || address) lines(document.querySelector(".ins-address address"), [company || originalCompany, ...(addressLines || originalAddress)]);
  if (vat) {
    const el = document.querySelector(".ins-address small");
    if (el) el.textContent = window.CCInsightsCopy[lang].vat + " " + vat;
  }
  if (page === "privacy" && (company || vat || address)) {
    const container = document.querySelector(".cc-privacy-copy > p");
    const mail = container?.querySelector("a");
    if (mail) lines(container, [legal, ...(addressLines || originalAddress), mail]);
  }
  if (phone) for (const link of all('a[href^="tel:"]')) {
    link.href = "tel:" + phone.replace(/[^+\d]/g, "");
    label(link, phone);
  }
  if (email) for (const link of all('a[href^="mailto:"]')) {
    link.href = "mailto:" + email;
    label(link, email);
  }
  if (facebook) for (const link of all('.cc-about-band a[href^="https://www.facebook.com/"]')) link.href = facebook;
  if (page === "car" && Object.keys(contacts).length) {
    const footer = document.querySelector(".cc-print-contact");
    if (footer) {
      const source = [...footer.childNodes].at(-1).textContent;
      const brand = document.createElement("strong");
      brand.textContent = "Claude Cars · " + (company || originalCompany);
      lines(footer, [brand, [...(addressLines || originalAddress), vat || originalVAT].join(" · "),
        (phone || document.querySelector("#foot [href^='tel:']").textContent) + " · " +
        (email || document.querySelector("#foot [href^='mailto:']").textContent), source]);
    }
  }
  function bindWhatsApp() {
    if (!whatsapp) return;
    for (const link of all('a[href^="https://wa.me/"]')) {
      const url = new URL(link.href);
      const path = "/" + whatsapp.replace(/\D/g, "");
      if (url.pathname !== path) { url.pathname = path; link.href = url.href; }
    }
  }
  bindWhatsApp();
  if (page === "contact" && site.contact) {
    const copy = words("contact"), root = document.querySelector(".ins-contact");
    if (!root) return;
    const params = new URLSearchParams(location.search);
    const kinds = ["question", "viewing", "sourcing", "import"];
    const messages = window.CCInsightsCopy[lang];
    const contextual = kinds.includes(params.get("type")) || !!window.CC.cars.find(car => car.id === params.get("car"));
    function bindContact() {
      const title = root.querySelector(".ins-contact-lead h1");
      const kind = root.querySelector("#ins-type")?.value || kinds.find(k => messages[k] === title.textContent);
      if (!contextual) label(title, copy.contactPage);
      label(root.querySelector(".ins-contact-lead p"), copy[contextual ? kind + "Intro" : "contactIntro"]);
      bindWhatsApp();
    }
    bindLabels("contact", {byAppointment:".ins-address > p", contactDetails:".ins-address h2"});
    bindContact();
    // The enquiry form rebuilds its heading and contact link when the visitor changes the request.
    new MutationObserver(bindContact).observe(root, {subtree:true, childList:true, attributes:true, attributeFilter:["href"]});
  }
})();
