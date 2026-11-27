"use strict";
(() => {
  const words = (fr, nl, de, en, es) => ({fr, nl, de, en, es});
  const copy = {
    legal: words("Mentions légales", "Wettelijke informatie", "Impressum", "Legal notice", "Aviso legal"),
    operator: words("Éditeur du site", "Uitgever van de website", "Websitebetreiber", "Site operator", "Titular del sitio"),
    company: words("Dénomination sociale", "Maatschappelijke naam", "Firmenname", "Registered company name", "Denominación social"),
    controller: words("Responsable du traitement", "Verwerkingsverantwoordelijke", "Verantwortlicher", "Data controller", "Responsable del tratamiento"),
    seat: words("Siège social", "Maatschappelijke zetel", "Satzungssitz", "Registered office", "Domicilio social"),
    enterprise: words("Numéro d’entreprise", "Ondernemingsnummer", "Unternehmensnummer", "Enterprise number", "Número de empresa"),
    vat: words("TVA", "Btw", "MwSt.", "VAT", "IVA"),
    court: words("Registre des personnes morales", "Rechtspersonenregister", "Register der juristischen Personen", "Register of legal entities", "Registro de personas jurídicas"),
    email: words("Adresse e-mail", "E-mailadres", "E-Mail-Adresse", "Email address", "Correo electrónico"),
    visit: words(
      "Le siège social n’est pas indiqué comme lieu de visite. Le lieu est convenu lors de la prise de rendez-vous.",
      "De maatschappelijke zetel wordt niet als bezoekadres vermeld. De locatie wordt bij de afspraak afgesproken.",
      "Der Satzungssitz ist nicht als Besichtigungsort ausgewiesen. Der Ort wird bei der Terminvereinbarung abgesprochen.",
      "The registered office is not listed as a viewing address. The location is agreed when you book a visit.",
      "El domicilio social no se indica como lugar de visita. La ubicación se acuerda al concertar la cita."
    ),
    recipients: words("Qui peut recevoir les données ?", "Wie kan gegevens ontvangen?", "Wer kann Daten erhalten?", "Who may receive the data?", "¿Quién puede recibir los datos?"),
    recipientsText: words(
      "Claude et les personnes habilitées traitent les demandes et avis. Les prestataires d’hébergement et de maintenance peuvent y accéder dans la mesure nécessaire à leur mission. Si vous écrivez par e-mail, les prestataires de messagerie assurent l’acheminement. Des autorités peuvent recevoir des données lorsque la loi l’exige.",
      "Claude en bevoegde personen behandelen aanvragen en beoordelingen. Hosting- en onderhoudsdiensten kunnen erbij voor zover dat voor hun werk nodig is. Bij e-mail zorgen e-maildiensten voor de bezorging. Wettelijk bevoegde instanties kunnen gegevens ontvangen als de wet dat vereist.",
      "Claude und befugte Personen bearbeiten Anfragen und Bewertungen. Hosting- und Wartungsdienstleister können im nötigen Umfang darauf zugreifen. Bei E-Mail wird die Nachricht von Maildiensten zugestellt. Behörden erhalten Daten, wenn das Gesetz dies verlangt.",
      "Claude and authorised staff handle enquiries and reviews. Hosting and maintenance providers may access them as needed to do their work. If you email us, email providers deliver the message. Authorities may receive data where required by law.",
      "Claude y las personas autorizadas gestionan las consultas y reseñas. Los proveedores de alojamiento y mantenimiento pueden acceder a los datos en la medida necesaria para su trabajo. Si escribes por correo, los servicios de correo entregan el mensaje. Las autoridades pueden recibir datos cuando lo exija la ley."
    ),
    whatsapp: words(
      "En ouvrant WhatsApp depuis un bouton du site, vous transmettez à WhatsApp le texte prérempli, y compris les informations que vous avez saisies s’il s’agit d’un brouillon. Vous décidez ensuite de l’envoyer ou non. WhatsApp applique sa propre politique de confidentialité.",
      "Als u WhatsApp opent via de site, ontvangt WhatsApp de vooraf ingevulde tekst, ook uw eigen invoer als u een concept opent. Daarna beslist u of u die tekst verstuurt. WhatsApp heeft een eigen privacybeleid.",
      "Wenn Sie WhatsApp über die Website öffnen, erhält WhatsApp den vorausgefüllten Text, bei einem Entwurf auch Ihre Eingaben. Sie bestimmen danach, ob Sie die Nachricht absenden. Für WhatsApp gilt die eigene Datenschutzrichtlinie.",
      "Opening WhatsApp from the site passes the prefilled text to WhatsApp, including your entries if you open a draft. You then decide whether to send it. WhatsApp has its own privacy policy.",
      "Al abrir WhatsApp desde el sitio, se le transmite el texto prellenado, incluidos tus datos si abres un borrador. Después decides si lo envías. WhatsApp aplica su propia política de privacidad."
    ),
    whatsappPolicy: words("Politique de confidentialité de WhatsApp", "Privacybeleid van WhatsApp", "Datenschutzrichtlinie von WhatsApp", "WhatsApp Privacy Policy", "Política de privacidad de WhatsApp"),
    storage: words("Stockage dans le navigateur", "Opslag in de browser", "Speicherung im Browser", "Browser storage", "Almacenamiento en el navegador"),
    layout: words(
      "Votre choix de présentation des voitures reste dans ce navigateur jusqu’à sa suppression.",
      "Uw weergavekeuze voor de auto’s blijft bewaard in deze browser totdat u die wist.",
      "Die gewählte Fahrzeugansicht bleibt in diesem Browser gespeichert, bis Sie die Daten löschen.",
      "Your preferred car layout stays in this browser until you clear it.",
      "La vista que elijas para los coches permanece en este navegador hasta que borres esos datos."
    ),
  };
  const authority = "https://www.autoriteprotectiondonnees.be/citoyen/agir/introduire-une-plainte";
  const whatsapp = "https://www.whatsapp.com/legal/privacy-policy-eea";
  const baseBusiness = {company:"Claude C SRL", enterprise:"0681.982.155", vat:"BE 0681.982.155",
    email:"mcsportcars17@gmail.com", phone:"+32 496 80 79 76"};
  const get = (key, lang) => copy[key]?.[lang] || "";
  function business(state) {
    return {...baseBusiness, ...state.siteContent?.contact?.contacts, ...state.legalDetails};
  }
  function render({state, path, esc}) {
    const {lang, page} = state;
    const editorial = state.siteContent?.privacy?.texts?.[lang] || {};
    const t = key => esc(get(key, lang) || editorial[key] || window.CCPublicWords[key]?.[lang] || "");
    const org = business(state);
    const link = (url, label) => '<a href="' + esc(url) + '">' + label + '</a>';
    const mail = () => link("mailto:" + org.email, esc(org.email));
    const section = (key, content, id = "") => '<section' + (id ? ' id="' + id + '"' : '') + '><h2>' + t(key) + '</h2>' + content + '</section>';
    const p = text => '<p>' + text + '</p>';
    const entry = (key, value) => '<div><dt>' + t(key) + '</dt><dd>' + value + '</dd></div>';
    const isLegal = page === "legal";
    let body;
    if (isLegal) {
      body = section("operator", '<dl class="cc-legal-facts">' +
        entry("company", esc(org.company)) + entry("seat", esc(org.address).replace(/\r?\n/g, "<br>")) +
        entry("enterprise", esc(org.enterprise)) + entry("vat", esc(org.vat)) +
        entry("court", esc(org.court)) + entry("email", mail()) + '</dl>' +
        p(t("visit")) + p(link(path("privacy"), t("privacy"))));
    } else {
      body = section("controller", p(esc(org.company) + " · " + mail()) + p(link(path("legal"), t("legal")))) +
        section("privacyEnquiries", p(esc(window.CCPages.enquiry))) +
        section("reviewTitle", p(esc(window.CCPages.review)), "review-privacy") +
        section("recipients", p(t("recipientsText")) + p(t("whatsapp")) + p(link(whatsapp, t("whatsappPolicy")))) +
        section("privacySecurity", p(esc(window.CCPages.security))) +
        section("storage", p(t("privacyDraft")) + p(t("layout"))) +
        section("privacyRights", p(t("privacyRightsText")) + p(link(authority, t("privacyAuthority"))));
    }
    return '<article class="cc-privacy"><header class="cc-privacy-cover"><div class="cc-wrap cc-policy-title"><h1>' +
      t(isLegal ? "legal" : "privacy") + '</h1></div></header><div class="cc-wrap cc-privacy-copy">' + body + '</div></article>';
  }
  window.CCLegal = {get, render, business};
})();
