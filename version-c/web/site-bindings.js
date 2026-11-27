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
      image.src = window.CCDemo?.asset(url) || url;
    }
    if (description) image.alt = description;
  }

  if (page === "home" && site.home) {
    bindLabels("home", {aboutTitle:"#cc-cover-title", coverLine:".cc-cover-intro > p",
      featured:"#cc-stock-title", z3Credit:".cc-z3 figcaption", exploreCars:'.cc-cover-links [href="#stock"]'});
    imageAt(".cc-z3 img", site.home.images?.hero, words("home").z3Alt);
    const stock = document.getElementById("stock-items");
    if (stock && site.home.featured?.length) {
      const cards = new Map([...stock.querySelectorAll(".cc-car-card")].map(card => {
        const url = new URL(card.href);
        return [url.searchParams.get("id") || url.pathname.split("/").filter(Boolean).pop(), card];
      }));
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
  const contacts = site.contact?.contacts || {};
  const {phone, email, facebook, whatsapp} = contacts;
  const demo = Boolean(window.CCDemo);
  if (phone && !demo) for (const link of all('a[href^="tel:"]')) {
    link.href = "tel:" + phone.replace(/[^+\d]/g, "");
    label(link, phone);
  }
  if (email && !demo) for (const link of all('a[href^="mailto:"]')) {
    link.href = "mailto:" + email;
    label(link, email);
  }
  if (facebook) for (const link of all('.cc-about-band a[href^="https://www.facebook.com/"]')) link.href = facebook;
  function bindWhatsApp() {
    if (!whatsapp || demo) return;
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
