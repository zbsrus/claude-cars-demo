(() => {
  "use strict";
  const t = (...copy) => I18n.t(...copy);
  const esc = (value) => App.esc(value);
  const icon = (name) => App.icon(name);
  const content = () => window.ClaudePage;
  const fields = ["intro", "approach"];
  let section = null;
  let profileState = null;
  let replyDraft = null;
  let reviewSnapshot = null;
  const text = {
    intro: () =>
      t("Présentation", "Introduction", "Vorstellung", "Presentación"),
    approach: () =>
      t("Ma démarche", "My approach", "Meine Arbeitsweise", "Mi enfoque"),
    saved: () => t("Enregistré", "Saved", "Gespeichert", "Guardado"),
    dirty: () =>
      t(
        "Modifications non enregistrées",
        "Unsaved changes",
        "Ungespeicherte Änderungen",
        "Cambios sin guardar",
      ),
    cancel: () => t("Annuler", "Cancel", "Abbrechen", "Cancelar"),
    view: () =>
      t("Voir ma page", "View my page", "Meine Seite ansehen", "Ver mi página"),
    storageError: () =>
      t(
        "Impossible d’enregistrer. Vérifiez le stockage local et réessayez.",
        "Could not save. Check local storage and try again.",
        "Speichern nicht möglich. Prüfen Sie den lokalen Speicher.",
        "No se pudo guardar. Comprueba el almacenamiento local e inténtalo de nuevo.",
      ),
    conflict: () =>
      t(
        "Ce contenu a changé dans un autre onglet. Copiez votre texte, annulez vos modifications puis rouvrez-le.",
        "This content changed in another tab. Copy your text, cancel these changes and reopen it.",
        "Der Inhalt wurde in einem anderen Tab geändert. Kopieren Sie Ihren Text, verwerfen Sie diese Änderungen und öffnen Sie den Inhalt erneut.",
        "El contenido cambió en otra pestaña. Copia tu texto, descarta los cambios y vuelve a abrirlo.",
      ),
    discardTitle: () =>
      t(
        "Abandonner les modifications ?",
        "Discard changes?",
        "Änderungen verwerfen?",
        "¿Descartar los cambios?",
      ),
    discardMessage: () =>
      t(
        "Les modifications en cours seront perdues.",
        "Your unsaved changes will be lost.",
        "Ihre ungespeicherten Änderungen gehen verloren.",
        "Se perderán los cambios sin guardar.",
      ),
    discardAction: () =>
      t("Abandonner", "Discard changes", "Verwerfen", "Descartar cambios"),
    review: () =>
      t(
        "Avis du visiteur",
        "Visitor review",
        "Besucherbewertung",
        "Valoración del visitante",
      ),
    reply: () => t("Ma réponse", "My reply", "Meine Antwort", "Mi respuesta"),
  };

  function discard(onConfirm) {
    App.dialog({
      title: text.discardTitle(),
      body: text.discardMessage(),
      confirm: text.discardAction(),
      onConfirm,
    });
  }

  function start(sectionName) {
    if (section !== sectionName) {
      section = sectionName;
      profileState = null;
      replyDraft = null;
    }
    if (section === "profile" && !profileState) {
      const current = content().profile();
      profileState = {
        base: current,
        values: structuredClone(current),
        lang: I18n.lang(),
      };
    }
  }

  function dirtyFields() {
    if (!profileState) return [];
    const { base, values } = profileState;
    return Object.keys(values).flatMap((code) =>
      fields
        .filter((key) => values[code][key] !== base[code][key])
        .map((key) => [code, key]),
    );
  }
  function dirty() {
    return (
      (section === "profile" && dirtyFields().length > 0) ||
      (section === "reviews" &&
        replyDraft !== null &&
        replyDraft.value !== replyDraft.base)
    );
  }
  function reset() {
    section = null;
    profileState = null;
    replyDraft = null;
    reviewSnapshot = null;
  }
  function guardLeave(onLeave) {
    if (!dirty()) {
      reset();
      return true;
    }
    discard(() => {
      reset();
      onLeave();
    });
    return false;
  }

  function header(title, description, href, linkLabel) {
    return `<div class="oc-heading"><div><h2>${title}</h2><p>${description}</p></div>
      <a class="oc-public" href="${href}">${linkLabel} ${icon("out")}</a></div>`;
  }
  function languageLabel() {
    return t(
      "Langue des textes",
      "Content language",
      "Textsprache",
      "Idioma de los textos",
    );
  }
  function profileEditor() {
    const state = profileState;
    const language = state.lang;
    const links = Object.entries(content().languageNames)
      .map(
        ([code, label]) =>
          `<label class="oc-lang"><input type="radio" name="oc-language" lang="${code}" value="${code}" ${code === language ? "checked" : ""}><span lang="${code}">${label}</span></label>`,
      )
      .join("");
    const restore = t(
      "Rétablir le texte de démonstration",
      "Restore demo text",
      "Demotext wiederherstellen",
      "Restaurar el texto de la demo",
    );
    return `<section id="owner-content" class="oc-panel" data-section="profile">
      ${header(
        t("Ma présentation", "My profile", "Mein Profil", "Mi presentación"),
        t(
          "Choisissez la langue, puis racontez ce qui vous plaît dans les voitures et comment vous les présentez.",
          "Choose a language, then tell visitors what you love about cars and how you present yours.",
          "Wählen Sie eine Sprache. Erzählen Sie, was Sie an Autos begeistert und wie Sie Ihre Fahrzeuge vorstellen.",
          "Elige un idioma y cuenta qué te apasiona de los coches y cómo presentas los tuyos.",
        ),
        "#claude",
        text.view(),
      )}
      <form id="oc-profile" novalidate>
      <fieldset class="oc-languages"><legend>${languageLabel()}</legend><div>${links}</div></fieldset>
      <div class="oc-fields">${fields.map((key) => `<label for="oc-${key}">${text[key]()}<textarea required id="oc-${key}" lang="${language}" name="${key}" rows="4" maxlength="1800">${esc(state.values[language][key])}</textarea></label>`).join("")}</div>
      <div class="oc-tools"><button type="button" class="oc-tool" data-oc-preview>${icon("book")}${t("Aperçu", "Preview", "Vorschau", "Vista previa")}</button><button type="button" class="oc-tool oc-restore" data-oc-restore>${icon("restore")}${restore}</button></div>
      <p class="oc-error" role="alert"></p>
      <div class="oc-actions"><span class="oc-status" role="status"></span><button type="button" class="btn" data-oc-cancel>${text.cancel()}</button><button type="submit" class="btn primary">${icon("check")}${t("Enregistrer la présentation", "Save profile", "Profil speichern", "Guardar presentación")}</button></div></form></section>`;
  }

  function reviewEditor() {
    const review = content().readRating();
    reviewSnapshot = review;
    const title = t(
      "Avis visiteurs",
      "Visitor reviews",
      "Besucherbewertungen",
      "Opiniones de visitantes",
    );
    const heading = header(
      title,
      t(
        "Consultez l’avis laissé dans cette démo et répondez en tant que Claude.",
        "Read the review left in this demo and reply as Claude.",
        "Lesen Sie die Bewertung aus dieser Demo und antworten Sie als Claude.",
        "Consulta la valoración de esta demo y responde como Claude.",
      ),
      "#claude?view=reviews",
      t(
        "Voir côté visiteur",
        "View as visitor",
        "Besucheransicht",
        "Ver como visitante",
      ),
    );
    let inner;
    if (!review) {
      replyDraft = null;
      inner = `<div class="oc-empty">${icon("book")}<h3>${t("Aucun avis pour le moment", "No reviews yet", "Noch keine Bewertungen", "Aún no hay opiniones")}</h3>
        <p>${t("Pour essayer, ouvrez la vue visiteur, laissez un avis et revenez ici pour y répondre.", "To try it, open the visitor view, leave a review, then come back here to reply.", "Zum Ausprobieren können Sie in der Besucheransicht eine Bewertung abgeben und hier darauf antworten.", "Para probarlo, abre la vista de visitante, deja una valoración y vuelve aquí para responder.")}</p></div>`;
    } else {
      const reply = review.reply;
      const editAction = reply?.text
        ? t(
            "Modifier ma réponse",
            "Edit my reply",
            "Antwort bearbeiten",
            "Editar mi respuesta",
          )
        : t(
            "Répondre au visiteur",
            "Reply to visitor",
            "Dem Besucher antworten",
            "Responder al visitante",
          );
      const remove = t(
        "Retirer la réponse",
        "Remove reply",
        "Antwort entfernen",
        "Retirar respuesta",
      );
      inner = `<article class="oc-review-card"><div class="oc-review-id">${icon("user")}<h3>${text.review()}</h3></div>
        <p class="oc-score"><b>${review.score}/5</b><span aria-hidden="true">${"★".repeat(review.score)}${"☆".repeat(5 - review.score)}</span></p>
        <p class="oc-comment">${esc(review.comment || t("Note sans commentaire.", "Rating only. No comment.", "Bewertung ohne Kommentar.", "Puntuación sin comentario."))}</p>
        ${
          replyDraft === null
            ? `${content().replyHTML(review)}<div class="oc-review-buttons"><button class="btn ${reply?.text ? "" : "primary"}" data-oc-edit-reply>${icon("edit")}${editAction}</button>${reply?.text ? `<button class="oc-tool" data-oc-remove-reply>${remove}</button>` : ""}</div>`
            : `<form id="oc-reply-form" novalidate><label for="oc-reply">${text.reply()}<textarea id="oc-reply" rows="3" maxlength="800" required>${esc(replyDraft.value)}</textarea></label>
        <div class="oc-review-buttons"><button type="submit" class="btn primary">${icon("check")}${t("Enregistrer ma réponse", "Save my reply", "Antwort speichern", "Guardar mi respuesta")}</button><button type="button" class="btn" data-oc-cancel-reply>${text.cancel()}</button></div></form>`
        }
      <p role="alert" class="oc-error"></p></article>`;
    }
    return `<section id="owner-content" class="oc-panel" data-section="reviews">${heading}${inner}</section>`;
  }

  function render(sectionName) {
    start(sectionName);
    return sectionName === "profile" ? profileEditor() : reviewEditor();
  }
  function rerender(focusSelector) {
    const root = document.querySelector("#owner-content");
    if (!root) return;
    root.outerHTML = render(section);
    mount(section);
    if (focusSelector)
      document.querySelector(focusSelector)?.focus({ preventScroll: true });
  }

  function refreshProfileStatus(form) {
    const changed = !!dirtyFields().length;
    const state = profileState;
    form.querySelector("button[type=submit]").disabled = !changed;
    form.querySelector("[data-oc-cancel]").disabled = !changed;
    form.querySelector("[data-oc-restore]").disabled = fields.every(
      (key) =>
        state.values[state.lang][key] === content().defaults[state.lang][key],
    );
    const note = form.querySelector(".oc-status");
    const msg = changed ? text.dirty() : text.saved();
    if (note.textContent !== msg) note.textContent = msg;
    note.classList.toggle("is-dirty", changed);
  }
  function reviseFields(form) {
    const { lang, values } = profileState;
    for (const key of fields) {
      form.elements[key].value = values[lang][key];
      form.elements[key].lang = lang;
      form.elements[key].removeAttribute("aria-invalid");
    }
    form.querySelector(".oc-error").textContent = "";
    refreshProfileStatus(form);
  }
  function mountProfile() {
    const form = document.querySelector("#oc-profile");
    refreshProfileStatus(form);
    for (const key of fields) {
      form.elements[key].addEventListener("input", () => {
        profileState.values[profileState.lang][key] = form.elements[key].value;
        form.elements[key].removeAttribute("aria-invalid");
        form.querySelector(".oc-error").textContent = "";
        refreshProfileStatus(form);
      });
    }
    form.querySelectorAll('[name="oc-language"]').forEach((radio) =>
      radio.addEventListener("change", () => {
        profileState.lang = radio.value;
        reviseFields(form);
      }),
    );
    form.querySelector("[data-oc-preview]").addEventListener("click", () => {
      const { values, lang } = profileState;
      App.showSheet(
        t(
          "Aperçu de ma page",
          "Profile preview",
          "Profilvorschau",
          "Vista previa del perfil",
        ),
        `<div class="oc-preview" lang="${lang}"><small>${content().languageNames[lang]}</small><h3>${text.intro()}</h3><p>${esc(values[lang].intro)}</p><h3>${text.approach()}</h3><p>${esc(values[lang].approach)}</p></div>`,
      );
    });
    form.querySelector("[data-oc-restore]").addEventListener("click", () => {
      profileState.values[profileState.lang] = {
        ...content().defaults[profileState.lang],
      };
      reviseFields(form);
      form.elements.intro.focus();
    });
    form.querySelector("[data-oc-cancel]").addEventListener("click", () =>
      discard(() => {
        const lang = profileState.lang;
        profileState = null;
        start("profile");
        profileState.lang = lang;
        rerender("#oc-intro");
      }),
    );
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const changed = dirtyFields();
      if (!changed.length) return;
      const current = content().profile();
      for (const [code, key] of changed) {
        const value = profileState.values[code][key].trim();
        if (!value) {
          profileState.lang = code;
          form.elements["oc-language"].value = code;
          reviseFields(form);
          form.elements[key].setAttribute("aria-invalid", "true");
          form.querySelector(".oc-error").textContent = t(
            "Ajoutez un texte avant d’enregistrer.",
            "Add some text before saving.",
            "Geben Sie vor dem Speichern einen Text ein.",
            "Añade texto antes de guardar.",
          );
          form.elements[key].focus();
          return;
        }
        if (
          current[code][key] !== profileState.base[code][key] &&
          current[code][key] !== value
        ) {
          form.querySelector(".oc-error").textContent = text.conflict();
          return;
        }
        current[code][key] = value;
      }
      try {
        content().storeProfile(current);
      } catch {
        form.querySelector(".oc-error").textContent = text.storageError();
        return;
      }
      profileState.base = current;
      profileState.values = structuredClone(current);
      reviseFields(form);
      App.toast(
        t(
          "Présentation enregistrée.",
          "Profile saved.",
          "Profil gespeichert.",
          "Presentación guardada.",
        ),
      );
    });
  }

  function mountReviews() {
    const root = document.querySelector("#owner-content");
    const error = root.querySelector(".oc-error");
    root
      .querySelector("[data-oc-edit-reply]")
      ?.addEventListener("click", () => {
        replyDraft = {
          value: reviewSnapshot.reply?.text || "",
          base: reviewSnapshot.reply?.text || "",
          lang: reviewSnapshot.reply?.lang || I18n.lang(),
          review: content().reviewVersion(reviewSnapshot),
        };
        rerender("#oc-reply");
      });
    const form = root.querySelector("#oc-reply-form");
    form?.elements["oc-reply"].addEventListener("input", () => {
      replyDraft.value = form.elements["oc-reply"].value;
      error.textContent = "";
    });
    root
      .querySelector("[data-oc-cancel-reply]")
      ?.addEventListener("click", () => {
        replyDraft = null;
        rerender("[data-oc-edit-reply]");
      });
    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = replyDraft.value.trim();
      if (!value) {
        error.textContent = t(
          "Rédigez une réponse.",
          "Write a reply first.",
          "Bitte eine Antwort eingeben.",
          "Escribe una respuesta.",
        );
        form.elements["oc-reply"].focus();
        return;
      }
      const latest = content().readRating();
      if (
        !latest ||
        content().reviewVersion(latest) !== replyDraft.review ||
        (latest.reply?.text || "") !== replyDraft.base
      ) {
        error.textContent = text.conflict();
        return;
      }
      try {
        content().saveRating({
          ...latest,
          reply: {
            text: value,
            lang: replyDraft.lang,
            review: content().reviewVersion(latest),
          },
        });
      } catch {
        error.textContent = text.storageError();
        return;
      }
      replyDraft = null;
      rerender("[data-oc-edit-reply]");
      App.toast(
        t(
          "Réponse enregistrée. Elle apparaît sous l’avis dans ce navigateur.",
          "Reply saved. It now appears below the review in this browser.",
          "Antwort gespeichert. Sie steht in diesem Browser unter der Bewertung.",
          "Respuesta guardada. Aparece debajo de la valoración en este navegador.",
        ),
      );
    });
    root
      .querySelector("[data-oc-remove-reply]")
      ?.addEventListener("click", () => {
        const prior = reviewSnapshot.reply?.text;
        App.dialog({
          title: t(
            "Retirer ma réponse ?",
            "Remove my reply?",
            "Meine Antwort entfernen?",
            "¿Retirar mi respuesta?",
          ),
          body: t(
            "La réponse de Claude disparaîtra de sa page. L’avis du visiteur restera visible.",
            "Claude’s reply will be removed from his page. The visitor’s review will stay visible.",
            "Claudes Antwort wird von seiner Seite entfernt. Die Besucherbewertung bleibt sichtbar.",
            "La respuesta de Claude se retirará de su página. La valoración seguirá visible.",
          ),
          confirm: t(
            "Retirer la réponse",
            "Remove reply",
            "Antwort entfernen",
            "Retirar respuesta",
          ),
          onConfirm: () => {
            const latest = content().readRating();
            if (!latest || latest.reply?.text !== prior) {
              error.textContent = text.conflict();
              return;
            }
            delete latest.reply;
            try {
              content().saveRating(latest);
            } catch {
              error.textContent = text.storageError();
              return;
            }
            rerender("[data-oc-edit-reply]");
            App.toast(
              t(
                "Réponse retirée.",
                "Reply removed.",
                "Antwort entfernt.",
                "Respuesta retirada.",
              ),
            );
          },
        });
      });
  }

  function mount(sectionName) {
    if (sectionName === "profile") mountProfile();
    else mountReviews();
  }
  window.addEventListener("beforeunload", (event) => {
    if (document.querySelector("#owner-content") && dirty()) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.addEventListener("storage", (event) => {
    if (
      !document.querySelector("#owner-content") ||
      ![content().profileKey, content().storageKey, null].includes(event.key) ||
      dirty()
    )
      return;
    const lang = profileState?.lang;
    reset();
    start(document.querySelector("#owner-content").dataset.section);
    if (profileState && lang) profileState.lang = lang;
    rerender();
  });
  window.OwnerContent = { render, mount, guardLeave };
})();
