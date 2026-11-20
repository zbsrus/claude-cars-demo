(() => {
  "use strict";

  const channelsKey = "claude-cars.contact.channels.v1";
  const enquiryPrefix = "claude-cars.contact.enquiry.v1.";
  const channelKeys = ["email", "phone", "facebook"];
  const blankChannels = () => ({ email: "", phone: "", facebook: "" });
  const esc = (value) => App.esc(value);
  const icon = (name) => App.icon(name);
  const labels = {
    contact: ["Contacter Claude", "Contact Claude", "Kontakt zu Claude", "Contacta con Claude"],
    intro: [
      "Une question sur l’état d’une voiture, un équipement ou une visite ? Précisez le modèle pour retrouver tous les détails de l’annonce.",
      "Want a closer look at a car, a detail about its condition or a viewing? Choose the model you’re interested in.",
      "Haben Sie eine Frage zum Zustand, zur Ausstattung oder zu einer Besichtigung? Wählen Sie das Fahrzeug aus, das Sie interessiert.",
      "¿Quieres ver un coche, consultar su estado o saber más sobre su equipamiento? Elige el modelo que te interesa."
    ],
    direct: ["Coordonnées", "Contact details", "Kontaktdaten", "Datos de contacto"],
    unset: [
      "Claude n’a pas encore ajouté ses coordonnées à cette démo. Vous pouvez essayer le formulaire de demande.",
      "Claude hasn’t added his contact details to this demo yet. You can try the enquiry form here.",
      "Claude hat in dieser Demo noch keine Kontaktdaten hinterlegt. Sie können das Anfrageformular ausprobieren.",
      "Claude aún no ha añadido sus datos de contacto a esta demo. Puedes probar el formulario de consulta."
    ],
    email: ["E-mail", "Email", "E-Mail", "Correo electrónico"],
    phone: ["Téléphone", "Phone", "Telefon", "Teléfono"],
    facebook: ["Page Facebook", "Facebook page", "Facebook-Seite", "Página de Facebook"],
    facebookAction: ["Ouvrir la page", "Visit Facebook page", "Facebook-Seite öffnen", "Abrir la página"],
    form: ["Votre demande", "Your enquiry", "Ihre Anfrage", "Tu consulta"],
    demoNote: [
      "Démo locale. La demande sera visible dans l’espace de Claude sur cet appareil. Utilisez un message d’exemple sans coordonnées personnelles.",
      "Local demo. Your enquiry will appear in Claude’s workspace on this device. Use a sample message without personal contact details.",
      "Lokale Demo. Die Anfrage erscheint auf diesem Gerät in Claudes Bereich. Verwenden Sie eine Beispielnachricht ohne persönliche Kontaktdaten.",
      "Demo local. La consulta aparecerá en el espacio de Claude en este dispositivo. Usa un mensaje de ejemplo sin datos personales."
    ],
    choose: ["Voiture concernée", "Which car?", "Um welches Fahrzeug geht es?", "¿Sobre qué coche?"],
    general: ["Question générale", "General enquiry", "Allgemeine Anfrage", "Consulta general"],
    message: ["Votre question", "Your question", "Ihre Frage", "Tu pregunta"],
    reply: ["E-mail de réponse (facultatif)", "Reply email (optional)", "E-Mail für die Antwort (optional)", "Correo de respuesta (opcional)"],
    replyLabel: ["E-mail de réponse", "Reply email", "E-Mail für die Antwort", "Correo de respuesta"],
    hint: [
      "Par exemple, dans quel état se trouve le siège conducteur ?",
      "For example, how much wear is there on the driver’s seat?",
      "Zum Beispiel: Wie stark ist der Fahrersitz abgenutzt?",
      "Por ejemplo, ¿qué desgaste tiene el asiento del conductor?"
    ],
    saveEnquiry: ["Enregistrer la demande démo", "Save demo enquiry", "Demo-Anfrage speichern", "Guardar consulta de prueba"],
    done: ["Demande enregistrée", "Enquiry saved", "Anfrage gespeichert", "Consulta guardada"],
    doneBody: [
      "La demande est enregistrée dans l’espace de Claude sur cet appareil. Aucun message n’a été envoyé au vendeur.",
      "Your enquiry is in Claude’s workspace on this device. No message was sent to the seller.",
      "Ihre Anfrage liegt auf diesem Gerät in Claudes Bereich. Es wurde keine Nachricht an den Verkäufer gesendet.",
      "Tu consulta está en el espacio de Claude en este dispositivo. No se ha enviado ningún mensaje al vendedor."
    ],
    another: ["Nouvelle demande", "New enquiry", "Neue Anfrage", "Nueva consulta"],
    backCar: ["Revoir la voiture", "Back to the car", "Zurück zum Fahrzeug", "Volver al coche"],
    browse: ["Voir les voitures", "Browse cars", "Fahrzeuge ansehen", "Ver los coches"],
    required: ["Saisissez votre question.", "Enter your question.", "Geben Sie Ihre Frage ein.", "Escribe tu pregunta."],
    unavailable: [
      "Cette annonce n’est plus en vente. Choisissez une autre voiture ou une question générale.",
      "This listing is no longer available. Choose another car or a general enquiry.",
      "Dieses Fahrzeug wird nicht mehr angeboten. Wählen Sie ein anderes Fahrzeug oder eine allgemeine Anfrage.",
      "Este anuncio ya no está disponible. Elige otro coche o una consulta general."
    ],
    inbox: ["Demandes reçues", "Enquiries", "Anfragen", "Consultas"],
    inboxHelp: ["Les demandes enregistrées sur cet appareil apparaissent ici.", "Enquiries saved on this device appear here.", "Hier sehen Sie die auf diesem Gerät gespeicherten Anfragen.", "Aquí verás las consultas guardadas en este dispositivo."],
    empty: ["Aucune demande pour le moment", "No enquiries yet", "Noch keine Anfragen", "Aún no hay consultas"],
    viewContact: ["Voir la page de contact", "View contact page", "Kontaktseite ansehen", "Ver página de contacto"],
    settings: ["Mes coordonnées", "My contact details", "Meine Kontaktdaten", "Mis datos de contacto"],
    settingsHelp: [
      "Renseignez les moyens de contact à afficher dans cette démo. Laissez les autres champs vides.",
      "Add the contact methods you want to show in this demo. Leave the other fields empty.",
      "Tragen Sie die Kontaktdaten ein, die in dieser Demo angezeigt werden sollen. Andere Felder können leer bleiben.",
      "Añade los datos de contacto que quieras mostrar en esta demo. Deja los demás campos en blanco."
    ],
    save: ["Enregistrer les coordonnées", "Save contact details", "Kontaktdaten speichern", "Guardar datos de contacto"],
    saved: ["Coordonnées enregistrées.", "Contact details saved.", "Kontaktdaten gespeichert.", "Datos de contacto guardados."],
    invalidEmail: ["Vérifiez l’adresse e-mail.", "Enter a valid email address.", "Geben Sie eine gültige E-Mail-Adresse ein.", "Introduce una dirección de correo válida."],
    invalidPhone: ["Vérifiez le numéro de téléphone.", "Enter a valid phone number.", "Geben Sie eine gültige Telefonnummer ein.", "Introduce un número de teléfono válido."],
    invalidFacebook: ["Collez le lien https de votre page Facebook.", "Enter the https link to your Facebook page.", "Geben Sie den HTTPS-Link zu Ihrer Facebook-Seite ein.", "Introduce el enlace https de tu página de Facebook."],
    conflict: ["Les coordonnées ont changé dans un autre onglet. Rechargez la version enregistrée avant de réessayer.", "The contact details changed in another tab. Load the saved version before editing again.", "Die Kontaktdaten wurden in einem anderen Tab geändert. Laden Sie die gespeicherte Version.", "Los datos de contacto han cambiado en otra pestaña. Carga la versión guardada antes de volver a editar."],
    reload: ["Charger la version enregistrée", "Load saved version", "Gespeicherte Version laden", "Cargar versión guardada"],
    error: ["Enregistrement impossible. Vérifiez l’espace disponible dans le navigateur, puis réessayez.", "Couldn’t save. Check the storage available in your browser and try again.", "Speichern fehlgeschlagen. Prüfen Sie den verfügbaren Browserspeicher und versuchen Sie es erneut.", "No se pudo guardar. Comprueba el espacio disponible en el navegador y vuelve a intentarlo."],
    readError: ["Les données locales sont indisponibles.", "Local data could not be loaded.", "Lokale Daten konnten nicht geladen werden.", "No se han podido cargar los datos locales."],
    discardTitle: ["Quitter sans enregistrer ?", "Leave without saving?", "Ohne Speichern verlassen?", "¿Salir sin guardar?"],
    discardBody: ["Les modifications saisies ici seront perdues.", "Your edits on this page will be lost.", "Ihre Änderungen auf dieser Seite gehen verloren.", "Perderás los cambios de esta página."],
    discard: ["Quitter la page", "Leave page", "Seite verlassen", "Salir de la página"]
  };
  const l = (key) => I18n.t(...labels[key]);
  const carTitle = (car) => [car.make, car.model].filter(Boolean).join(" ");
  const availableCars = () => App.cars().filter((car) => car.status === "active");
  const carHref = (id) => "#car/" + encodeURIComponent(id);
  let buyer = null;
  let settings = null;

  function channelHref(key, raw, subject = "") {
    const value = (raw || "").trim();
    if (!value) return "";
    if (key === "email") {
      if (!/^[^\s@?#&%,;<>]+@[^\s@?#&%,;<>]+\.[^\s@?#&%,;<>]+$/.test(value)) return "";
      const address = encodeURIComponent(value).replace("%40", "@");
      return "mailto:" + address + (subject ? "?subject=" + encodeURIComponent(subject) : "");
    }
    if (key === "phone") {
      const number = value.replace(/[\s().-]/g, "");
      return /^\+?\d{6,16}$/.test(number) ? "tel:" + number : "";
    }
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password || url.port ||
          !["facebook.com", "www.facebook.com", "m.facebook.com"].includes(url.hostname)) return "";
      if (url.pathname === "/profile.php" && /^\d+$/.test(url.searchParams.get("id") || "")) {
        return "https://www.facebook.com/profile.php?id=" + url.searchParams.get("id");
      }
      if (/^\/(?:[\w.\-]+|(?:people|pages)\/[\w.%\-]+\/\d+)\/?$/.test(url.pathname) &&
          !/^\/(?:l\.php|login|sharer|dialog|plugins)\/?$/i.test(url.pathname)) {
        return "https://www.facebook.com" + url.pathname;
      }
    } catch { /* The field will show a validation message. */ }
    return "";
  }

  function readChannels() {
    const raw = localStorage.getItem(channelsKey);
    const stored = raw ? JSON.parse(raw) : {};
    return Object.fromEntries(channelKeys.map((key) => [
      key, typeof stored?.[key] === "string" ? stored[key] : ""
    ]));
  }

  function directLinks(subject) {
    let data;
    try { data = readChannels(); }
    catch { return '<p class="cc-muted">' + l("readError") + "</p>"; }
    const rows = channelKeys.map((key) => {
      const href = channelHref(key, data[key], subject);
      if (!href) return "";
      return `<a class="cc-channel" href="${esc(href)}"${key === "facebook" ? ' target="_blank" rel="noopener noreferrer"' : ""}>
        <span><small>${l(key)}</small><strong>${key === "facebook" ? l("facebookAction") : esc(data[key])}</strong></span>${icon("out")}</a>`;
    }).join("");
    return rows || '<p class="cc-muted">' + l("unset") + "</p>";
  }

  function requestedCar() {
    return new URLSearchParams(location.hash.split("?")[1] || "").get("car") || "";
  }

  function startBuyer(cars) {
    const source = requestedCar();
    const chosen = cars.find((car) => car.id === source);
    return { source, initial: chosen?.id || "", selected: chosen?.id || "", message: "", reply: "", sent: false, error: "", unavailable: !!source && !chosen };
  }

  function carSummary(car) {
    return car ? `<a class="cc-car" href="${carHref(car.id)}"><img src="${esc(App.photo(car))}" alt="">
      <span><strong>${esc(carTitle(car))}</strong><small>${esc([car.year, car.city, car.price ? App.money(car.price) : ""].filter(Boolean).join(" · "))}</small></span>${icon("arrow")}</a>` : "";
  }

  function render() {
    const cars = availableCars();
    if (!buyer || buyer.source !== requestedCar()) buyer = startBuyer(cars);
    if (!buyer.sent && buyer.selected && !cars.some((car) => car.id === buyer.selected)) {
      buyer.selected = "";
      buyer.unavailable = true;
    }
    const chosen = cars.find((car) => car.id === buyer.selected);
    const receipt = `<div class="cc-receipt" role="status" tabindex="-1">
      <span class="cc-check">${icon("check")}</span><h2>${l("done")}</h2><p>${l("doneBody")}</p>
      <div class="cc-actions"><a class="btn primary" href="${chosen ? carHref(chosen.id) : "#catalogue"}">${l(chosen ? "backCar" : "browse")} ${icon("arrow")}</a>
      <button class="textlink" type="button" data-cc-again>${l("another")}</button></div></div>`;
    const form = `<form id="cc-enquiry" class="cc-form" novalidate>
      <h2>${l("form")}</h2><p class="cc-demo-note">${l("demoNote")}</p>
      <label for="cc-car">${l("choose")}</label><select id="cc-car" name="car">
        <option value="">${l("general")}</option>${cars.map((car) => `<option value="${esc(car.id)}"${car.id === buyer.selected ? " selected" : ""}>${esc(carTitle(car) + " · " + car.year)}</option>`).join("")}</select>
      ${buyer.unavailable ? '<p class="cc-feedback">' + l("unavailable") + "</p>" : ""}
      <label for="cc-message">${l("message")}</label>
      <textarea id="cc-message" name="message" rows="4" maxlength="1500" required placeholder="${esc(l("hint"))}" aria-describedby="cc-enquiry-error"${buyer.error === "required" ? ' aria-invalid="true"' : ""}>${esc(buyer.message)}</textarea>
      <label for="cc-reply">${l("reply")}</label>
      <input id="cc-reply" name="reply" type="email" maxlength="200" placeholder="buyer@example.test" autocomplete="off"
        value="${esc(buyer.reply)}" aria-describedby="cc-enquiry-error"${buyer.error === "invalidEmail" ? ' aria-invalid="true"' : ""}>
      <p class="cc-feedback" id="cc-enquiry-error" role="alert">${buyer.error ? l(buyer.error) : ""}</p>
      <button type="submit" class="btn primary">${l("saveEnquiry")} ${icon("arrow")}</button></form>`;
    return `<div class="wrap cc-page"><a class="backlink" href="${chosen ? carHref(chosen.id) : "#catalogue"}">${icon("back")}${l(chosen ? "backCar" : "browse")}</a>
      <section class="cc-layout"><div class="cc-intro"><h1>${l("contact")}</h1><p class="cc-lead">${l("intro")}</p>
        <div id="cc-car-preview">${carSummary(chosen)}</div>
        <section class="cc-channels"><h2>${l("direct")}</h2><div id="cc-methods">${directLinks(chosen ? carTitle(chosen) : "")}</div></section></div>
        ${buyer.sent ? receipt : form}</section></div>`;
  }

  function enquiries() {
    const messages = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(enquiryPrefix)) continue;
      const item = JSON.parse(localStorage.getItem(key));
      if (item && typeof item.message === "string" && Number.isFinite(item.time)) messages.push(item);
    }
    return messages.sort((a, b) => b.time - a.time);
  }

  function inbox() {
    let messages;
    try { messages = enquiries(); }
    catch { return '<p class="cc-muted">' + l("readError") + "</p>"; }
    if (!messages.length) return `<div class="cc-empty"><h3>${l("empty")}</h3><p>${l("inboxHelp")}</p></div>`;
    const date = new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: "medium", timeStyle: "short" });
    const cars = availableCars();
    return `<div class="cc-inbox-list">${messages.map((item) => {
      const subject = esc(item.title || l("general"));
      const linked = cars.some((car) => car.id === item.car);
      return `<article class="cc-inquiry"><div><h3>${linked ? `<a href="${carHref(item.car)}">${subject} ${icon("out")}</a>` : subject}</h3><time datetime="${new Date(item.time).toISOString()}">${esc(date.format(item.time))}</time></div><p>${esc(item.message)}</p>${item.reply ? `<p class="cc-reply-address"><strong>${l("replyLabel")}</strong> ${esc(item.reply)}</p>` : ""}</article>`;
    }).join("")}</div>`;
  }

  function initialSettings() {
    let baseline = blankChannels();
    let error = "";
    try { baseline = readChannels(); }
    catch { error = "readError"; }
    return { baseline, values: { ...baseline }, error, field: "" };
  }

  function owner() {
    settings ||= initialSettings();
    const form = `<form id="cc-settings" class="cc-settings" novalidate><h3>${l("settings")}</h3><p>${l("settingsHelp")}</p>
      <div class="cc-setting-fields">${channelKeys.map((key) => `<div><label for="cc-${key}">${l(key)}</label><input id="cc-${key}" name="${key}"
        type="${{ email: "email", phone: "tel", facebook: "url" }[key]}" maxlength="${key === "facebook" ? 400 : 200}"
        value="${esc(settings.values[key])}" aria-describedby="cc-settings-error"${settings.field === key ? ' aria-invalid="true"' : ""}></div>`).join("")}</div>
      <p class="cc-feedback" id="cc-settings-error" role="alert">${settings.error ? l(settings.error) : ""}</p>
      <div class="cc-actions"><button type="submit" class="btn primary">${l("save")}</button>
      <button type="button" class="textlink" data-cc-reload${settings.error === "conflict" || settings.error === "readError" ? "" : " hidden"}>${l("reload")}</button></div></form>`;
    return `<section class="cc-owner"><div class="oc-heading"><div><h2>${l("inbox")}</h2></div><a class="oc-public" href="#contact">${l("viewContact")} ${icon("out")}</a></div>
      <div id="cc-inbox">${inbox()}</div>${form}</section>`;
  }

  function dirty() {
    if (document.querySelector("#cc-enquiry") && buyer)
      return !!buyer.message.trim() || !!buyer.reply.trim() || buyer.selected !== buyer.initial;
    if (document.querySelector("#cc-settings") && settings)
      return channelKeys.some((key) => settings.values[key] !== settings.baseline[key]);
    return false;
  }

  function reset() {
    buyer = null;
    settings = null;
  }

  function guardLeave(proceed) {
    if (!dirty()) { reset(); return true; }
    App.dialog({
      title: l("discardTitle"), body: l("discardBody"), confirm: l("discard"),
      onConfirm() { reset(); proceed(); }
    });
    return false;
  }

  function bindBuyer(form) {
    const message = form.elements.message;
    const reply = form.elements.reply;
    const feedback = form.querySelector("#cc-enquiry-error");
    function showError(key, field) {
      buyer.error = key;
      feedback.textContent = key ? l(key) : "";
      message.removeAttribute("aria-invalid");
      reply.removeAttribute("aria-invalid");
      if (field) {
        field.setAttribute("aria-invalid", "true");
        field.focus();
      }
    }
    form.elements.car.addEventListener("change", () => {
      buyer.selected = form.elements.car.value;
      buyer.unavailable = false;
      App.refresh();
      document.querySelector("#cc-car")?.focus({ preventScroll: true });
    });
    message.addEventListener("input", () => {
      buyer.message = message.value;
      if (buyer.error !== "invalidEmail") showError("");
    });
    reply.addEventListener("input", () => {
      buyer.reply = reply.value;
      if (buyer.error !== "required") showError("");
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = message.value.trim();
      if (!value) {
        showError("required", message);
        return;
      }
      const replyAddress = reply.value.trim();
      if (replyAddress && (!reply.validity.valid || !channelHref("email", replyAddress))) {
        showError("invalidEmail", reply);
        return;
      }
      const car = availableCars().find((item) => item.id === form.elements.car.value);
      if (form.elements.car.value && !car) { App.refresh(); return; }
      try {
        const time = Date.now();
        const uid = Array.from(crypto.getRandomValues(new Uint32Array(3))).join("-");
        localStorage.setItem(enquiryPrefix + time + "." + uid, JSON.stringify({
          time, car: car?.id || "", title: car ? carTitle(car) : "", message: value, reply: replyAddress
        }));
      } catch {
        showError("error");
        return;
      }
      buyer.sent = true;
      buyer.message = "";
      buyer.reply = "";
      App.refresh();
      document.querySelector(".cc-receipt")?.focus();
    });
  }

  function bindSettings(form) {
    const error = form.querySelector("#cc-settings-error");
    const reload = form.querySelector("[data-cc-reload]");
    function showError(key, field = "") {
      settings.error = key;
      settings.field = field;
      error.textContent = key ? l(key) : "";
      for (const channel of channelKeys) form.elements[channel].removeAttribute("aria-invalid");
      if (field) {
        form.elements[field].setAttribute("aria-invalid", "true");
        form.elements[field].focus();
      }
      reload.hidden = key !== "conflict" && key !== "readError";
    }
    form.addEventListener("input", (event) => {
      if (!channelKeys.includes(event.target.name)) return;
      settings.values[event.target.name] = event.target.value;
      if (settings.error && !["readError", "conflict"].includes(settings.error)) showError("");
    });
    reload.addEventListener("click", () => {
      settings = initialSettings();
      App.refresh();
      document.querySelector("#cc-email")?.focus();
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const data = blankChannels();
      for (const key of channelKeys) {
        data[key] = form.elements[key].value.trim();
        if (data[key] && !channelHref(key, data[key])) {
          showError({ email: "invalidEmail", phone: "invalidPhone", facebook: "invalidFacebook" }[key], key);
          return;
        }
      }
      try {
        const current = readChannels();
        if (channelKeys.some((key) => settings.baseline[key] !== current[key])) {
          showError("conflict");
          return;
        }
        localStorage.setItem(channelsKey, JSON.stringify(data));
      } catch { showError("error"); return; }
      settings = initialSettings();
      App.refresh();
      document.querySelector("#cc-settings [type=submit]")?.focus({ preventScroll: true });
      App.toast(l("saved"));
    });
  }

  function mount() {
    const form = document.querySelector("#cc-enquiry");
    if (form) bindBuyer(form);
    const ownerForm = document.querySelector("#cc-settings");
    if (ownerForm) bindSettings(ownerForm);
    document.querySelector("[data-cc-again]")?.addEventListener("click", () => {
      buyer = null;
      App.refresh();
      document.querySelector("#cc-message")?.focus();
    });
  }

  window.addEventListener("beforeunload", (event) => {
    if (dirty()) { event.preventDefault(); event.returnValue = ""; }
  });
  window.addEventListener("storage", (event) => {
    if (document.querySelector("#cc-inbox") && (!event.key || event.key.startsWith(enquiryPrefix))) {
      document.querySelector("#cc-inbox").innerHTML = inbox();
    }
    if (event.key && event.key !== channelsKey) return;
    if (document.querySelector("#cc-settings") && !dirty()) {
      settings = null;
      App.refresh();
    } else if (document.querySelector("#cc-methods")) {
      const car = availableCars().find((item) => item.id === buyer?.selected);
      document.querySelector("#cc-methods").innerHTML = directLinks(car ? carTitle(car) : "");
    }
  });
  window.Contacts = { render, owner, mount, guardLeave };
})();
