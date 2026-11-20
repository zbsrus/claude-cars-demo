(() => {
  "use strict";

  const storageKey = "virage.local.v1.seller-rating";
  const t = (...copy) => I18n.t(...copy);
  const esc = (value) => App.esc(value);
  const icon = (name) => App.icon(name);
  const scoreLabels = () => [
    t(
      "Très insatisfait",
      "Very dissatisfied",
      "Sehr unzufrieden",
      "Muy insatisfecho",
    ),
    t("Insatisfait", "Dissatisfied", "Unzufrieden", "Insatisfecho"),
    t("Mitigé", "Mixed", "Gemischt", "Regular"),
    t("Satisfait", "Satisfied", "Zufrieden", "Satisfecho"),
    t("Très satisfait", "Very satisfied", "Sehr zufrieden", "Muy satisfecho"),
  ];
  let draft = null;
  let draftSource = null;

  function readRating() {
    try {
      const rating = JSON.parse(localStorage.getItem(storageKey));
      return rating &&
        Number.isInteger(rating.score) &&
        rating.score >= 1 &&
        rating.score <= 5
        ? rating
        : null;
    } catch {
      return null;
    }
  }

  const languageNames = {
    fr: "Français",
    en: "English",
    de: "Deutsch",
    es: "Español",
  };
  const profileKey = "virage.local.v1.profile";
  const defaults = {
    fr: {
      intro:
        "Le galbe d’une aile, un cadran au tableau de bord… C’est souvent un détail qui me fait aimer une voiture. Si l’une de mes voitures vous a plu sur Facebook, vous la retrouverez ici tant qu’elle est en vente.",
      approach:
        "J’aimerais que vous sachiez à quoi vous attendre avant de vous déplacer. Dans mes annonces, je précise les équipements et les traces d’usure. Vous pouvez agrandir les photos pour regarder de plus près. Quand j’ai une vidéo, je l’ajoute à la galerie.",
    },
    en: {
      intro:
        "Sometimes it’s the curve of a wing or a dial on the dash that makes me fall for a car. If one of my cars caught your eye on Facebook, you can come back for another look here while it’s for sale.",
      approach:
        "I want you to know what you’re coming to see. In each listing I describe the equipment and point out signs of wear. Open a photo to get a closer look. If I have a video of the car, you’ll find it in the gallery too.",
    },
    de: {
      intro:
        "Oft sind es Kleinigkeiten, die mich an einem Auto begeistern. Der Schwung eines Kotflügels etwa oder ein Rundinstrument im Armaturenbrett. Wenn Ihnen eines meiner Autos auf Facebook gefallen hat, finden Sie es hier wieder, solange es zum Verkauf steht.",
      approach:
        "Ich möchte, dass Sie schon vor der Besichtigung wissen, was Sie erwartet. In meinen Inseraten beschreibe ich die Ausstattung und weise auf Gebrauchsspuren hin. Die Fotos lassen sich vergrößern. Wenn ich ein Video zum Auto habe, finden Sie es ebenfalls in der Galerie.",
    },
    es: {
      intro:
        "A veces me enamora un detalle tan pequeño como la curva de una aleta o la esfera de un reloj en el salpicadero. Si alguno de mis coches te llamó la atención en Facebook, aquí puedes volver a verlo mientras siga en venta.",
      approach:
        "Quiero que sepas qué te vas a encontrar antes de venir a ver un coche. En cada anuncio describo el equipamiento y señalo las marcas de uso. Puedes ampliar las fotos para ver los detalles. Si tengo un vídeo del coche, lo encontrarás en la galería.",
    },
  };
  function profile() {
    let overrides;
    try {
      overrides = JSON.parse(localStorage.getItem(profileKey));
    } catch {
      /* Initial copy remains available offline. */
    }
    return Object.fromEntries(
      Object.entries(defaults).map(([lang, initial]) => [
        lang,
        Object.fromEntries(
          Object.entries(initial).map(([key, original]) => [
            key,
            typeof overrides?.[lang]?.[key] === "string" &&
            overrides[lang][key].trim()
              ? overrides[lang][key]
              : original,
          ]),
        ),
      ]),
    );
  }
  function storeProfile(value) {
    localStorage.setItem(profileKey, JSON.stringify(value));
  }
  function reviewVersion(review) {
    return JSON.stringify([review?.score || 0, review?.comment || ""]);
  }
  function replyHTML(review) {
    if (!review?.reply?.text) return "";
    const outdated = review.reply.review !== reviewVersion(review);
    return `<aside class="seller-reply"><h3>${t("Réponse de Claude", "Claude’s reply", "Claudes Antwort", "Respuesta de Claude")}</h3>
      <p lang="${esc(Object.hasOwn(languageNames, review.reply.lang) ? review.reply.lang : "fr")}">${esc(review.reply.text)}</p>
      ${outdated ? `<small>${t("L’avis a été modifié depuis cette réponse.", "The visitor edited the review after this reply.", "Die Bewertung wurde nach dieser Antwort bearbeitet.", "La valoración se modificó después de esta respuesta.")}</small>` : ""}</aside>`;
  }
  function saveRating(review) {
    localStorage.setItem(storageKey, JSON.stringify(review));
  }
  function reviewLinkLabel() {
    return readRating()
      ? t(
          "Voir mon avis",
          "View my review",
          "Meine Bewertung ansehen",
          "Ver mi valoración",
        )
      : t(
          "Laisser un avis",
          "Leave a review",
          "Bewertung abgeben",
          "Dejar una valoración",
        );
  }
  function ratingEditor(value) {
    const labels = scoreLabels();
    return `<form id="rating-form" novalidate>
      <fieldset class="rating-stars"><legend>${t("Votre note sur 5", "Your rating out of 5", "Ihre Bewertung (1 bis 5 Sterne)", "Tu puntuación sobre 5")}</legend>
        <div class="star-row">${labels
          .map((label, index) => {
            const n = index + 1;
            return `<label class="star-choice"><input type="radio" name="score" value="${n}" ${n === value.score ? "checked" : ""} required aria-label="${esc(n + " / 5 · " + label)}"><span aria-hidden="true">★</span></label>`;
          })
          .join(
            "",
          )}<output id="score-caption" aria-live="polite"></output></div>
      </fieldset>
      <label class="review-label" for="review-comment">${t("Commentaire", "Comment", "Kommentar", "Comentario")} <small>${t("Facultatif", "Optional", "Optional", "Opcional")}</small></label>
      <textarea id="review-comment" rows="3" maxlength="500" placeholder="${esc(t("Qu’aimeriez-vous partager sur votre expérience ?", "What stood out to you?", "Was ist Ihnen aufgefallen?", "¿Qué destacarías?"))}">${esc(value.comment || "")}</textarea>
      <div class="review-actions"><button type="submit" class="btn primary">${t("Enregistrer mon avis", "Save my review", "Bewertung speichern", "Guardar mi valoración")} ${icon("check")}</button>
      ${readRating() ? '<button type="button" class="btn" id="cancel-rating">' + t("Annuler", "Cancel", "Abbrechen", "Cancelar") + "</button>" : ""}</div>
      <p role="alert" class="review-error" id="rating-error"></p>
      <button type="button" class="oc-tool" data-reload-rating hidden>${t("Voir la version enregistrée", "View saved review", "Gespeicherte Bewertung ansehen", "Ver la valoración guardada")}</button>
    </form>`;
  }

  function ratingPanel() {
    const saved = readRating();
    const body =
      saved && !draft
        ? `<div class="saved-rating">
      <div class="kicker">${t("Votre avis enregistré", "Your saved review", "Ihre gespeicherte Bewertung", "Tu valoración guardada")}</div>
      <p class="review-score"><b>${saved.score} / 5</b> <span aria-hidden="true">${"★".repeat(saved.score)}${"☆".repeat(5 - saved.score)}</span></p>
      ${saved.comment ? '<p class="visitor-comment">' + esc(saved.comment) + "</p>" : ""}
      ${replyHTML(saved)}
      <button class="btn" id="change-rating">${icon("edit")} ${t("Modifier mon avis", "Edit my review", "Bewertung bearbeiten", "Editar mi valoración")}</button></div>`
        : ratingEditor(draft || { score: 0, comment: "" });
    return `<div class="review-intro">
      <div class="kicker rule-tag">${t("Avis visiteurs", "Visitor feedback", "Besucherstimmen", "Opiniones de visitantes")}</div>
      <h2 id="reviews-title" class="heading">${t("Votre expérience avec Claude", "Your experience with Claude", "Ihre Erfahrung mit Claude", "Tu experiencia con Claude")}</h2>
      <p>${t("Dans cette démo, votre avis reste dans ce navigateur. Vous pouvez le modifier à tout moment.", "In this demo, your review stays in this browser. You can edit it at any time.", "In dieser Demo bleibt Ihre Bewertung in diesem Browser. Sie können sie jederzeit ändern.", "En esta demo, tu valoración se guarda en este navegador. Puedes editarla cuando quieras.")}</p>
    </div><div class="review-entry">${body}</div>`;
  }

  function render() {
    const copy = profile()[I18n.lang()];
    return `<div class="wrap about-page">
      <div class="about-head"><article class="about-story">
        <div class="kicker rule-tag">${t("Le vendeur", "Meet the seller", "Über den Verkäufer", "Sobre el vendedor")}</div>
        <h1>${t("Moi, c’est <em>Claude.</em>", "Hi, I’m <em>Claude.</em>", "Hallo, ich bin <em>Claude.</em>", "Hola, soy <em>Claude.</em>")}</h1>
        <p class="story-lead">${esc(copy.intro)}</p>
        <div class="about-links"><a class="btn primary" href="#catalogue">${t("Voir mes voitures", "Browse my cars", "Meine Autos ansehen", "Ver mis coches")} ${icon("arrow")}</a>
        <button type="button" class="textlink" id="jump-rating">${reviewLinkLabel()} ${icon("down")}</button></div>
      </article><figure class="about-photo"><img src="assets/cars/mercedes-280sl.webp" alt="${esc(t("Calandre chromée d’une Mercedes-Benz 280 SL", "Chrome grille of a Mercedes-Benz 280 SL", "Chromgrill eines Mercedes-Benz 280 SL", "Parrilla cromada de un Mercedes-Benz 280 SL"))}"><figcaption>Mercedes-Benz 280 SL · 1969</figcaption></figure></div>
      <section class="about-method"><div><div class="kicker rule-tag">${t("Ma démarche", "How I work", "Meine Arbeitsweise", "Cómo trabajo")}</div>
      <h2 class="heading">${t("Avant la visite", "Before you visit", "Vor der Besichtigung", "Antes de la visita")}</h2><a class="textlink about-contact" href="#contact">${I18n.label("contactClaude")} ${icon("arrow")}</a></div>
      <p>${esc(copy.approach)}</p></section>
      <section id="seller-reviews" class="seller-reviews" aria-labelledby="reviews-title" tabindex="-1">${ratingPanel()}</section></div>`;
  }

  function bindRating() {
    const panel = document.querySelector("#seller-reviews");
    function refreshPanel() {
      panel.innerHTML = ratingPanel();
      document.querySelector("#jump-rating").innerHTML =
        reviewLinkLabel() + " " + icon("down");
      bindRating();
    }
    const saved = readRating();
    panel.querySelector("#change-rating")?.addEventListener("click", () => {
      draft = { ...saved };
      draftSource = reviewVersion(saved);
      refreshPanel();
      panel.querySelector("input:checked")?.focus();
    });
    panel.querySelector("#cancel-rating")?.addEventListener("click", () => {
      draft = null;
      draftSource = null;
      refreshPanel();
      panel.querySelector("#change-rating")?.focus();
    });
    const form = panel.querySelector("#rating-form");
    if (!form) return;
    const initialVersion = reviewVersion(saved);
    form.querySelector("[data-reload-rating]").addEventListener("click", () => {
      draft = null;
      draftSource = null;
      refreshPanel();
      (
        panel.querySelector("#change-rating") || panel.querySelector("input")
      ).focus();
    });
    const read = () => ({
      score: Number(form.elements.score.value) || 0,
      comment: form.querySelector("textarea").value,
    });
    function reflect(value) {
      const controls = form.querySelectorAll(".star-choice");
      controls.forEach((control, index) => {
        control.classList.toggle("filled", index < value);
        control.querySelector("span").textContent = index < value ? "★" : "☆";
      });
      form.querySelector("#score-caption").textContent = value
        ? value + "/5 · " + scoreLabels()[value - 1]
        : "";
    }
    reflect(read().score);
    form.addEventListener("input", () => {
      draftSource ??= initialVersion;
      draft = read();
      reflect(draft.score);
      if (draft.score) form.querySelector(".review-error").textContent = "";
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const { score, comment } = read();
      if (!score) {
        form.querySelector(".review-error").textContent = t(
          "Choisissez une note de 1 à 5.",
          "Choose a rating from 1 to 5.",
          "Wählen Sie eine Bewertung von 1 bis 5.",
          "Elige una puntuación del 1 al 5.",
        );
        form.querySelector("input").focus();
        return;
      }
      try {
        const latest = readRating();
        const value = { score, comment: comment.trim() };
        if (
          reviewVersion(latest) !== (draftSource ?? initialVersion) &&
          reviewVersion(latest) !== reviewVersion(value)
        ) {
          form.querySelector(".review-error").textContent = t(
            "Cet avis a changé dans un autre onglet. Copiez votre commentaire avant d’ouvrir la version enregistrée.",
            "This review changed in another tab. Copy your comment before opening the saved version.",
            "Die Bewertung wurde in einem anderen Tab geändert. Kopieren Sie Ihren Kommentar, bevor Sie die gespeicherte Fassung öffnen.",
            "La valoración cambió en otra pestaña. Copia tu comentario antes de abrir la versión guardada.",
          );
          form.querySelector("[data-reload-rating]").hidden = false;
          return;
        }
        saveRating({ ...latest, ...value });
      } catch {
        form.querySelector(".review-error").textContent = t(
          "Votre avis n’a pas pu être enregistré. Vérifiez que le navigateur autorise le stockage des données de ce site, puis réessayez.",
          "Your review couldn’t be saved. Check that your browser allows this site to store data, then try again.",
          "Speichern nicht möglich. Erlauben Sie lokalen Speicher und versuchen Sie es erneut.",
          "No se ha podido guardar. Permite el almacenamiento local e inténtalo de nuevo.",
        );
        return;
      }
      draft = null;
      draftSource = null;
      refreshPanel();
      panel.querySelector("#change-rating")?.focus();
      App.toast(
        t(
          "Avis enregistré dans ce navigateur.",
          "Review saved in this browser.",
          "Bewertung in diesem Browser gespeichert.",
          "Valoración guardada en este navegador.",
        ),
      );
    });
  }
  function mount() {
    bindRating();
    function focusReviews() {
      const panel = document.querySelector("#seller-reviews");
      panel.scrollIntoView({ block: "start" });
      (
        panel.querySelector("input:checked, #change-rating") ||
        panel.querySelector("input")
      ).focus({ preventScroll: true });
    }
    document
      .querySelector("#jump-rating")
      .addEventListener("click", focusReviews);
    if (
      new URLSearchParams(location.hash.split("?")[1]).get("view") === "reviews"
    ) {
      requestAnimationFrame(() => {
        if (document.querySelector("#seller-reviews")) focusReviews();
      });
    }
  }
  window.addEventListener("storage", (event) => {
    if (
      !document.querySelector(".about-page") ||
      ![profileKey, storageKey, null].includes(event.key)
    )
      return;
    if (event.key !== storageKey) {
      const copy = profile()[I18n.lang()];
      document.querySelector(".story-lead").textContent = copy.intro;
      document.querySelector(".about-method > p").textContent = copy.approach;
    }
    if (event.key !== profileKey && !draft) {
      document.querySelector("#seller-reviews").innerHTML = ratingPanel();
      document.querySelector("#jump-rating").innerHTML =
        reviewLinkLabel() + " " + icon("down");
      bindRating();
    }
  });
  window.ClaudePage = {
    render,
    mount,
    languageNames,
    defaults,
    profile,
    storeProfile,
    readRating,
    saveRating,
    reviewVersion,
    replyHTML,
    storageKey,
    profileKey,
  };
})();
