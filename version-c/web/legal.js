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
    demoTitle: words("Confidentialité de la démo", "Privacy van de demo", "Datenschutz der Demo", "Demo privacy", "Privacidad de la demo"),
    demoFormsTitle: words("Demandes et avis", "Aanvragen en beoordelingen", "Anfragen und Bewertungen", "Enquiries and reviews", "Consultas y reseñas"),
    demoScope: words(
      "Cette version sert uniquement à essayer le site. Le cabinet simule une connexion. Aucun compte réel n’est ouvert.",
      "Deze versie is alleen bedoeld om de site uit te proberen. De werkruimte simuleert een aanmelding. Er wordt geen echt account geopend.",
      "Diese Version dient nur zum Ausprobieren. Der interne Bereich simuliert die Anmeldung. Es wird kein echtes Konto geöffnet.",
      "This version is for trying out the site. The workspace simulates signing in. It does not open a real account.",
      "Esta versión solo sirve para probar el sitio. El espacio de trabajo simula el acceso. No se abre ninguna cuenta real."
    ),
    demoForms: words(
      "Utilisez uniquement des données fictives. Les demandes et avis de démonstration ne sont pas envoyés à Claude ni publiés.",
      "Gebruik alleen fictieve gegevens. Aanvragen en beoordelingen in de demo worden niet naar Claude verstuurd of gepubliceerd.",
      "Verwenden Sie nur erfundene Daten. Anfragen und Bewertungen in der Demo werden weder an Claude gesendet noch veröffentlicht.",
      "Use fictional details only. Demo enquiries and reviews are not sent to Claude or published.",
      "Usa solo datos ficticios. Las consultas y reseñas de la demo no se envían a Claude ni se publican."
    ),
    demoStore: words(
      "Le navigateur peut garder le brouillon de demande dans l’onglet. Les changements dans le cabinet de démonstration restent dans ce navigateur. Effacez les données du site dans votre navigateur pour les retirer.",
      "De browser kan een conceptaanvraag in het tabblad bewaren. Wijzigingen in de demo-werkruimte blijven in deze browser. Wis de sitegegevens in uw browser om ze te verwijderen.",
      "Der Browser kann einen Anfrageentwurf im Tab speichern. Änderungen im Demo-Bereich bleiben in diesem Browser. Löschen Sie die Websitedaten im Browser, um sie zu entfernen.",
      "The browser can keep your enquiry draft in the tab. Any changes you make in the demo workspace stay in this browser. Clear the site data in your browser to remove them.",
      "El navegador puede conservar el borrador de la consulta en la pestaña. Los cambios del espacio de trabajo de la demo quedan en este navegador. Borra los datos del sitio en tu navegador para eliminarlos."
    ),
    demoHosting: words(
      "Quand cette démo est hébergée sur GitHub Pages, GitHub journalise l’adresse IP des visiteurs pour la sécurité.",
      "Als deze demo op GitHub Pages wordt gehost, registreert GitHub de IP-adressen van bezoekers voor de beveiliging.",
      "Wird diese Demo auf GitHub Pages gehostet, protokolliert GitHub die IP-Adressen der Besucher zu Sicherheitszwecken.",
      "When this demo is hosted on GitHub Pages, GitHub logs visitors’ IP addresses for security.",
      "Cuando esta demo está alojada en GitHub Pages, GitHub registra las direcciones IP de los visitantes por motivos de seguridad."
    )
  };
  const authority = "https://www.autoriteprotectiondonnees.be/citoyen/agir/introduire-une-plainte";
  const github = "https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages#data-collection";
  const whatsapp = "https://www.whatsapp.com/legal/privacy-policy-eea";
  const baseBusiness = {company:"Claude Cars"};
  const get = (key, lang) => copy[key]?.[lang] || "";
  function business(state) {
    return {...baseBusiness, ...state.siteContent?.contact?.contacts, ...state.legalDetails};
  }
  function render({state, path, esc}) {
    const {lang, page} = state;
    const demo = Boolean(window.CCDemo);
    const editorial = state.siteContent?.privacy?.texts?.[lang] || {};
    const t = key => esc(get(key, lang) || (!demo && editorial[key]) || window.CCPublicWords[key]?.[lang] || "");
    const org = business(state);
    const link = (url, label) => '<a href="' + esc(url) + '">' + label + '</a>';
    const mail = () => link("mailto:" + org.email, esc(org.email));
    const section = (key, content, id = "") => '<section' + (id ? ' id="' + id + '"' : '') + '><h2>' + t(key) + '</h2>' + content + '</section>';
    const p = text => '<p>' + text + '</p>';
    const entry = (key, value) => '<div><dt>' + t(key) + '</dt><dd>' + value + '</dd></div>';
    const isLegal = page === "legal";
    let body;
    if (demo) {
      body = isLegal ? section("operator", p(t("demoScope")) + p(link(path("privacy"), t("demoTitle")))) :
        p(t("demoScope")) + section("demoFormsTitle", p(t("demoForms")), "review-privacy") +
        section("storage", p(t("demoStore")) + p(t("layout"))) +
        section("privacySecurity", p(t("demoHosting")) + p(link(github, "GitHub Pages")));
    } else if (isLegal) {
      body = section("operator", '<dl class="cc-legal-facts">' +
        entry("company", esc(org.company)) + entry("seat", esc(org.address).replace(/\r?\n/g, "<br>")) +
        entry("enterprise", esc(org.enterprise)) + entry("vat", esc(org.vat)) +
        entry("court", esc(org.court)) + entry("email", mail()) + '</dl>' +
        p(t("visit")) + p(link(path("privacy"), t("privacy"))));
    } else {
      body = section("controller", p(esc(org.company) + " · " + mail()) + p(link(path("legal"), t("legal")))) +
        section("privacyEnquiries", p(t("privacyEnquiriesText"))) +
        section("reviewTitle", p(t("feedbackPrivacy")), "review-privacy") +
        section("recipients", p(t("recipientsText")) + p(t("whatsapp")) + p(link(whatsapp, t("whatsappPolicy")))) +
        section("privacySecurity", p(t("privacySecurityText"))) +
        section("storage", p(t("privacyDraft")) + p(t("layout"))) +
        section("privacyButtons", '<label class="cc-choice"><input type="checkbox" id="cc-count-buttons">' + t("privacyCount") +
          '</label>' + p(t("privacyChoiceText"))) +
        section("privacyRights", p(t("privacyRightsText")) + p(link(authority, t("privacyAuthority"))));
    }
    return '<article class="cc-privacy"><header class="cc-privacy-cover"><div class="cc-wrap cc-policy-title"><h1>' +
      t(isLegal ? "legal" : demo ? "demoTitle" : "privacy") + '</h1></div></header><div class="cc-wrap cc-privacy-copy">' + body + '</div></article>';
  }
  window.CCLegal = {get, render, business};
})();
