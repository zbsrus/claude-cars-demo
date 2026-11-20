(() => {
  "use strict";

  const t = (...words) => window.I18n.t(...words);
  const esc = (value) => window.App.esc(value);
  const icon = (name) => window.App.icon(name);
  const coverPath = "assets/cars/porsche-911.webp";
  const detailPath = "assets/media/porsche-911-detail.webp";
  const filmPath = "assets/media/porsche-911-study.mp4";
  const roadFilm = "assets/media/porsche-997-drive.mp4";
  const roadFront = "assets/media/porsche-997-front.webp";
  const roadRear = "assets/media/porsche-997-rear.webp";
  const maxPhotos = 5;
  const mb = 1024 * 1024;
  const pendingVideos = new Set();
  let databasePromise;
  let activeGallery;
  let gallerySnapshot;
  let retainedEditor;

  function seed(car) {
    if (car.id === "porsche-997-gt3" && car.image === roadFront) {
      return {
        images: [roadFront, roadRear],
        video: { src: roadFilm, kind: "driving" },
      };
    }
    if (car.id !== "porsche-911" || car.image !== coverPath) return {};
    return {
      images: [coverPath, detailPath],
      video: { src: filmPath, kind: "photo-film" },
    };
  }

  function safePhoto(src) {
    return (
      typeof src === "string" &&
      (/^assets\/(cars|media)\/[\w-]+\.(webp|png|jpe?g)$/i.test(src) ||
        /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(src))
    );
  }

  function safeVideo(video) {
    if (video?.src === roadFilm) return { src: roadFilm, kind: "driving" };
    if (video?.src === filmPath) return { src: filmPath, kind: "photo-film" };
    if (
      video &&
      typeof video.key === "string" &&
      /^video-[\w-]{6,100}$/.test(video.key)
    ) {
      return { key: video.key, name: String(video.name || "") };
    }
    return null;
  }

  function mediaOf(car) {
    const defaults = seed(car);
    const sources = Array.isArray(car.images)
      ? car.images
      : defaults.images || [car.image];
    const images = [...new Set(sources.filter(safePhoto))].slice(0, maxPhotos);
    return {
      image: images[0] || "",
      images,
      video: safeVideo(
        Object.hasOwn(car, "video") ? car.video : defaults.video,
      ),
    };
  }

  const labels = {
    photos: () => t("Photos", "Photos", "Fotos", "Fotos"),
    gallery: () =>
      t(
        "Photos et vidéo",
        "Photos and video",
        "Fotos und Video",
        "Fotos y vídeo",
      ),
    video: () => t("Vidéo", "Video", "Video", "Vídeo"),
    animation: () =>
      t("Photo animée", "Animated photo", "Animiertes Foto", "Foto animada"),
    closeUp: () =>
      t(
        "Détail de la photo",
        "Photo detail",
        "Fotoausschnitt",
        "Detalle de la foto",
      ),
    cover: () => t("Couverture", "Cover", "Titelbild", "Portada"),
    zoom: () =>
      t(
        "Agrandir la photo",
        "Enlarge photo",
        "Foto vergrößern",
        "Ampliar foto",
      ),
    noPhoto: () => t("Aucune photo", "No photo", "Kein Foto", "Sin foto"),
    missing: () =>
      t(
        "Cette vidéo est indisponible dans ce navigateur.",
        "This video is unavailable in this browser.",
        "Dieses Video ist in diesem Browser nicht verfügbar.",
        "Este vídeo no está disponible en este navegador.",
      ),
    uploading: () =>
      t(
        "Préparation du fichier…",
        "Preparing file…",
        "Datei wird vorbereitet…",
        "Preparando el archivo…",
      ),
    fileError: () =>
      t(
        "Fichier illisible. Choisissez un autre fichier.",
        "This file cannot be read. Choose another file.",
        "Datei nicht lesbar. Bitte eine andere Datei wählen.",
        "No se puede leer este archivo. Elige otro.",
      ),
    storageError: () =>
      t(
        "Impossible d’enregistrer la vidéo. Vérifiez l’espace et les autorisations de stockage du navigateur.",
        "The video could not be saved. Check free space and your browser’s storage permissions.",
        "Das Video konnte nicht gespeichert werden. Bitte Speicherplatz und Speicherberechtigungen des Browsers prüfen.",
        "No se ha podido guardar el vídeo. Comprueba el espacio libre y los permisos de almacenamiento del navegador.",
      ),
  };

  function photoName(src, i) {
    if (src === roadFront)
      return t("Vue avant", "Front view", "Vorderansicht", "Vista frontal");
    if (src === roadRear)
      return t("Vue arrière", "Rear view", "Heckansicht", "Vista trasera");
    return src === detailPath
      ? labels.closeUp()
      : t("Photo", "Photo", "Foto", "Foto") + " " + (i + 1);
  }

  function videoName(video) {
    if (video.src === roadFilm)
      return t("Sur la route", "On the road", "Unterwegs", "En carretera");
    return video.src === filmPath ? labels.animation() : labels.video();
  }

  function poster(video) {
    if (video?.src === roadFilm) return roadFront;
    if (video?.src === filmPath) return coverPath;
    return "";
  }

  function vehicleName(car) {
    return [car.make, car.model].filter(Boolean).join(" ");
  }

  function videoGlyph() {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" class="cm-play-svg"><path d="m8 5 11 7-11 7z" fill="currentColor"/></svg>';
  }

  function detail(car) {
    const media = mediaOf(car);
    const caption = vehicleName(car);
    const thumbs = media.images.map(
      (src, index) =>
        '<button type="button" class="cm-thumb" data-media-index="' +
        index +
        '" aria-label="' +
        esc(photoName(src, index)) +
        '" aria-pressed="' +
        (index === 0) +
        '">' +
        '<img src="' +
        esc(src) +
        '" alt=""><span>' +
        esc(src === detailPath ? labels.closeUp() : photoName(src, index)) +
        "</span></button>",
    );
    if (media.video) {
      thumbs.push(
        '<button class="cm-thumb cm-thumb-film" type="button" data-media-index="' +
          media.images.length +
          '" aria-pressed="false">' +
          (poster(media.video)
            ? '<img src="' + poster(media.video) + '" alt="">'
            : "") +
          "<i>" +
          videoGlyph() +
          "</i><span>" +
          esc(videoName(media.video)) +
          "</span></button>",
      );
    }
    const firstImage =
      '<img class="cm-main-photo" src="' +
      esc(media.image || "assets/placeholder.svg") +
      '" alt="' +
      esc(media.image ? caption : labels.noPhoto()) +
      '">';
    return (
      '<figure class="cm-gallery" data-car-media aria-label="' +
      esc(labels.gallery()) +
      '"><div class="cm-stage" data-media-stage>' +
      firstImage +
      "</div>" +
      (thumbs.length > 1
        ? '<div class="cm-thumbs" role="group" aria-label="' +
          esc(labels.gallery()) +
          '">' +
          thumbs.join("") +
          "</div>"
        : "") +
      "</figure>"
    );
  }

  function openDB() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      const req = indexedDB.open("virage-owner-media-v1", 1);
      req.onupgradeneeded = () =>
        req.result.createObjectStore("videos", { keyPath: "key" });
      req.onsuccess = () => {
        req.result.onversionchange = () => {
          req.result.close();
          databasePromise = undefined;
        };
        resolve(req.result);
      };
      req.onerror = () => reject(req.error);
    }).catch((error) => {
      databasePromise = undefined;
      throw error;
    });
    return databasePromise;
  }

  async function withVideos(mode, action) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("videos", mode);
      const req = action(tx.objectStore("videos"));
      tx.oncomplete = () => resolve(req.result);
      tx.onabort = tx.onerror = () => reject(tx.error);
    });
  }

  function disposeGallery() {
    if (!activeGallery) return;
    gallerySnapshot = activeGallery.snapshot();
    activeGallery.stop();
    activeGallery = null;
  }

  function openPhotos(car, images, first) {
    const title = vehicleName(car);
    const previous = t(
      "Photo précédente",
      "Previous photo",
      "Vorheriges Foto",
      "Foto anterior",
    );
    const next = t(
      "Photo suivante",
      "Next photo",
      "Nächstes Foto",
      "Foto siguiente",
    );
    const fitLabel = t(
      "Ajuster à l’écran",
      "Fit to screen",
      "An Bildschirm anpassen",
      "Ajustar a la pantalla",
    );
    const zoomLabel = t("Voir les détails", "Zoom in", "Vergrößern", "Ampliar");
    const arrows =
      images.length > 1
        ? `<div class="cm-light-controls">
      <button class="icon-btn" type="button" data-photo-step="-1" aria-label="${esc(previous)}">${icon("prev")}</button>
      <button class="icon-btn" type="button" data-photo-step="1" aria-label="${esc(next)}">${icon("chevron")}</button></div>`
        : "";
    App.showSheet(
      title,
      `<div class="cm-light-stage" data-light-stage>
        <div class="cm-light-canvas"><img alt="" draggable="false"></div></div>
      <div class="cm-light-foot"><span role="status" data-light-caption></span>
        <button type="button" class="btn cm-light-zoom" data-light-zoom aria-pressed="false"></button>${arrows}</div>`,
      "photo-sheet cm-lightbox",
    );
    const sheet = document.querySelector("#sheet");
    const stage = sheet.querySelector("[data-light-stage]");
    const img = stage.querySelector("img");
    const zoomButton = sheet.querySelector("[data-light-zoom]");
    let index = first;
    let enlarged = false;
    let swipeStart = null;
    let ignoreClick = false;

    function fit() {
      if (!img.naturalWidth || !stage.clientWidth) return;
      const scale = Math.min(
        stage.clientWidth / img.naturalWidth,
        stage.clientHeight / img.naturalHeight,
        1,
      );
      const zoom = enlarged ? Math.min(1, scale * 2.5) : scale;
      img.style.width = Math.round(zoom * img.naturalWidth) + "px";
      img.style.height = Math.round(zoom * img.naturalHeight) + "px";
      zoomButton.hidden = scale >= 0.99;
      zoomButton.setAttribute("aria-pressed", String(enlarged));
      zoomButton.textContent = enlarged ? fitLabel : zoomLabel;
      stage.classList.toggle("is-enlarged", enlarged);
      stage.classList.toggle("can-zoom", scale < 0.99);
    }
    function show(at) {
      index = (at + images.length) % images.length;
      enlarged = false;
      img.src = images[index];
      img.alt = title + " · " + photoName(images[index], index);
      const label = photoName(images[index], index);
      sheet.querySelector("[data-light-caption]").textContent =
        label +
        (images.length > 1 ? " · " + (index + 1) + " / " + images.length : "");
      fit();
      stage.scrollTo(0, 0);
    }
    function toggleZoom(x = 0.5, y = 0.5) {
      if (zoomButton.hidden) return;
      enlarged = !enlarged;
      fit();
      stage.scrollTo(
        enlarged ? img.offsetWidth * x - stage.clientWidth / 2 : 0,
        enlarged ? img.offsetHeight * y - stage.clientHeight / 2 : 0,
      );
    }
    function onClick(event) {
      const step = event.target.closest("[data-photo-step]");
      if (step) show(index + Number(step.dataset.photoStep));
      if (event.target.closest("[data-light-zoom]")) toggleZoom();
      if (event.target === img && !ignoreClick) {
        const rect = img.getBoundingClientRect();
        toggleZoom(
          (event.clientX - rect.left) / rect.width,
          (event.clientY - rect.top) / rect.height,
        );
      }
      ignoreClick = false;
    }
    function onKey(event) {
      if (
        !enlarged &&
        images.length > 1 &&
        ["ArrowLeft", "ArrowRight"].includes(event.key)
      ) {
        event.preventDefault();
        show(index + (event.key === "ArrowRight" ? 1 : -1));
      }
    }
    let pan = null;
    stage.addEventListener("pointerdown", (event) => {
      ignoreClick = false;
      if (!enlarged) {
        swipeStart = { x: event.clientX, y: event.clientY };
        return;
      }
      if (event.pointerType === "mouse" && event.button === 0) {
        pan = {
          x: event.clientX,
          y: event.clientY,
          left: stage.scrollLeft,
          top: stage.scrollTop,
        };
        img.setPointerCapture(event.pointerId);
      }
    });
    stage.addEventListener("pointermove", (event) => {
      if (!pan) return;
      const dx = event.clientX - pan.x,
        dy = event.clientY - pan.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) ignoreClick = true;
      stage.scrollTo(pan.left - dx, pan.top - dy);
    });
    stage.addEventListener("pointercancel", () => {
      swipeStart = null;
      pan = null;
    });
    stage.addEventListener("pointerup", (event) => {
      pan = null;
      if (!swipeStart) return;
      const dx = event.clientX - swipeStart.x,
        dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (
        images.length > 1 &&
        Math.abs(dx) > 40 &&
        Math.abs(dx) > Math.abs(dy) * 1.5
      ) {
        ignoreClick = true;
        show(index + (dx < 0 ? 1 : -1));
      }
    });
    sheet.addEventListener("click", onClick);
    sheet.addEventListener("keydown", onKey);
    img.addEventListener("load", fit);
    const observer = new ResizeObserver(fit);
    observer.observe(stage);
    sheet.addEventListener(
      "close",
      () => {
        observer.disconnect();
        sheet.removeEventListener("click", onClick);
        sheet.removeEventListener("keydown", onKey);
      },
      { once: true },
    );
    show(first);
  }

  function mount(car) {
    disposeGallery();
    const root = document.querySelector("[data-car-media]");
    if (!root) return;
    const media = mediaOf(car);
    const stage = root.querySelector("[data-media-stage]");
    const openedAt = location.href;
    const restore = gallerySnapshot?.url === openedAt ? gallerySnapshot : null;
    gallerySnapshot = null;
    let selected = 0;
    let objectUrl = "";
    let generation = 0;

    function clearPlayer() {
      ++generation;
      const video = stage.querySelector("video");
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
      }
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = "";
      }
    }

    async function show(index, playback = null) {
      clearPlayer();
      selected = index;
      root
        .querySelectorAll("[data-media-index]")
        .forEach((button) =>
          button.setAttribute(
            "aria-pressed",
            String(Number(button.dataset.mediaIndex) === index),
          ),
        );
      const src = media.images[index];
      if (src || !media.video) {
        stage.innerHTML =
          '<img class="cm-main-photo" src="' +
          esc(src || "assets/placeholder.svg") +
          '" alt="' +
          esc(
            src
              ? vehicleName(car) + " · " + photoName(src, index)
              : labels.noPhoto(),
          ) +
          '">' +
          (src
            ? '<button class="icon-btn cm-zoom" type="button" data-media-zoom aria-label="' +
              esc(labels.zoom()) +
              '">' +
              icon("expand") +
              "</button>"
            : "");
        return;
      }
      const current = generation;
      const name = videoName(media.video);
      stage.innerHTML =
        '<video controls playsinline preload="metadata" aria-label="' +
        esc(name) +
        '"' +
        (poster(media.video) ? ' poster="' + poster(media.video) + '"' : "") +
        '></video><p class="cm-video-state" role="status" hidden></p>';
      const player = stage.querySelector("video");
      const notifyError = () => {
        if (generation !== current) return;
        const message = stage.querySelector(".cm-video-state");
        if (message) {
          message.textContent = labels.missing();
          message.hidden = false;
        }
      };
      player.addEventListener("error", notifyError, { once: true });
      if (playback)
        player.addEventListener(
          "loadedmetadata",
          () => {
            if (generation !== current) return;
            if (playback.time > 0 && Number.isFinite(player.duration)) {
              player.currentTime = Math.min(playback.time, player.duration);
            }
            if (playback.playing) void player.play().catch(() => {});
          },
          { once: true },
        );
      try {
        if (media.video.key) {
          const record = await withVideos("readonly", (store) =>
            store.get(media.video.key),
          );
          if (generation !== current) return;
          if (!record?.blob) {
            notifyError();
            return;
          }
          objectUrl = URL.createObjectURL(record.blob);
        }
        player.src = media.video.src || objectUrl;
      } catch {
        notifyError();
      }
    }

    function onClick(event) {
      const item = event.target.closest("[data-media-index]");
      if (item) {
        const next = Number(item.dataset.mediaIndex);
        if (next !== selected) void show(next);
        return;
      }
      if (event.target.closest("[data-media-zoom]")) {
        const src = media.images[selected];
        if (!src) return;
        openPhotos(car, media.images, selected);
      }
    }

    function onKey(event) {
      const current = event.target.closest("[data-media-index]");
      if (
        !current ||
        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
      )
        return;
      const buttons = [...root.querySelectorAll("[data-media-index]")];
      const at = buttons.indexOf(current);
      let next;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = buttons.length - 1;
      else
        next =
          (at + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
          buttons.length;
      event.preventDefault();
      buttons[next].focus();
      if (next !== selected) void show(next);
    }
    root.addEventListener("keydown", onKey);
    root.addEventListener("click", onClick);
    activeGallery = {
      snapshot() {
        if (location.href !== openedAt) return null;
        const player = stage.querySelector("video");
        return {
          url: openedAt,
          index: selected,
          time: player?.currentTime || 0,
          playing: Boolean(player && !player.paused && !player.ended),
        };
      },
      stop() {
        clearPlayer();
        root.removeEventListener("click", onClick);
        root.removeEventListener("keydown", onKey);
      },
    };
    const chosen = new URLSearchParams(location.hash.split("?")[1] || "").get(
      "media",
    );
    const max = Math.max(0, media.images.length - (media.video ? 0 : 1));
    const initial = restore
      ? Math.min(restore.index, max)
      : chosen === "video" && media.video
        ? media.images.length
        : 0;
    void show(initial, restore);
  }

  function editor() {
    return (
      '<section class="cm-editor" data-media-editor><h2>' +
      esc(labels.gallery()) +
      "</h2>" +
      '<p class="cm-help">' +
      esc(
        t(
          "Ajoutez jusqu’à 5 photos et une vidéo. La première photo illustre l’annonce dans le catalogue.",
          "Add up to 5 photos and one video. The first photo appears on the catalogue card.",
          "Fügen Sie bis zu 5 Fotos und ein Video hinzu. Das erste Foto erscheint im Katalog.",
          "Añade hasta 5 fotos y un vídeo. La primera foto se muestra en el catálogo.",
        ),
      ) +
      "</p>" +
      '<div data-edit-photos class="cm-edit-photos"></div><label class="cm-add" for="gg-file">' +
      icon("image") +
      esc(
        t(
          "Ajouter des photos",
          "Add photos",
          "Fotos hinzufügen",
          "Añadir fotos",
        ),
      ) +
      '<input type="file" id="gg-file" accept="image/jpeg,image/png,image/webp" multiple aria-describedby="cm-photo-types"></label><p id="cm-photo-types" class="cm-help">JPG · PNG · WebP · ' +
      esc(t("12 Mo max. par photo", "Up to 12 MB each", "Max. 12 MB pro Foto", "Hasta 12 MB por foto")) +
      "</p>" +
      '<div data-edit-video class="cm-edit-video"></div><label class="cm-add" for="cm-video-file">' +
      videoGlyph() +
      '<span data-video-add></span><input type="file" id="cm-video-file" accept="video/mp4,video/webm,.mp4,.webm" aria-describedby="cm-video-types"></label>' +
      '<p id="cm-video-types" class="cm-help">MP4 · WebM · ' +
      esc(t("40 Mo max.", "Up to 40 MB", "Max. 40 MB", "Hasta 40 MB")) +
      '</p><p class="cm-feedback" data-media-status role="status" aria-live="polite"></p></section>'
    );
  }

  async function preparePhoto(file) {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 12 * mb
    ) {
      throw new Error(
        t(
          "Choisissez un JPG, PNG ou WebP de 12 Mo maximum.",
          "Choose a JPG, PNG or WebP up to 12 MB.",
          "Bitte JPG, PNG oder WebP bis 12 MB wählen.",
          "Elige un JPG, PNG o WebP de hasta 12 MB.",
        ),
      );
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      try {
        await img.decode();
      } catch {
        throw new Error(labels.fileError());
      }
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const presets = [
        [2048, 0.84],
        [1700, 0.76],
        [1440, 0.68],
        [1200, 0.63],
      ];
      for (const [longSide, quality] of presets) {
        const scale = Math.min(
          1,
          longSide / Math.max(img.naturalWidth, img.naturalHeight),
        );
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        let src = canvas.toDataURL("image/webp", quality);
        if (!src.startsWith("data:image/webp;"))
          src = canvas.toDataURL("image/jpeg", quality);
        if (src.length <= 520000) return src;
      }
      throw new Error(
        t(
          "Cette photo reste trop volumineuse après compression. Choisissez une image plus petite.",
          "This photo is still too large after compression. Choose a smaller image.",
          "Das Foto ist auch nach dem Verkleinern zu groß. Wählen Sie ein kleineres Bild.",
          "La foto sigue siendo demasiado grande después de comprimirla. Elige una imagen más pequeña.",
        ),
      );
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function prepareVideo(file) {
    if (
      file.size > 40 * mb ||
      !(
        /\.(mp4|webm)$/i.test(file.name) ||
        ["video/mp4", "video/webm"].includes(file.type)
      )
    ) {
      throw new Error(
        t(
          "Choisissez un MP4 ou WebM de 40 Mo maximum.",
          "Choose an MP4 or WebM up to 40 MB.",
          "Bitte eine MP4- oder WebM-Datei bis 40 MB wählen.",
          "Elige un MP4 o WebM de hasta 40 MB.",
        ),
      );
    }
    const url = URL.createObjectURL(file);
    const player = document.createElement("video");
    try {
      player.preload = "metadata";
      await new Promise((resolve, reject) => {
        const failed = () =>
          reject(
            new Error(
              t(
                "Ce navigateur ne peut pas lire la vidéo. Essayez un autre fichier MP4 ou WebM.",
                "This browser can’t play the video. Try another MP4 or WebM file.",
                "Dieser Browser kann das Video nicht abspielen. Wählen Sie eine andere MP4- oder WebM-Datei.",
                "Este navegador no puede reproducir el vídeo. Prueba con otro archivo MP4 o WebM.",
              ),
            ),
          );
        const timeout = setTimeout(failed, 12000);
        player.onloadedmetadata = () => {
          clearTimeout(timeout);
          player.videoWidth ? resolve() : failed();
        };
        player.onerror = () => {
          clearTimeout(timeout);
          failed();
        };
        player.src = url;
      });
    } finally {
      player.onloadedmetadata = player.onerror = null;
      player.removeAttribute("src");
      player.load();
      URL.revokeObjectURL(url);
    }
    const token =
      crypto.randomUUID?.() ||
      Date.now().toString(36) + Math.random().toString(36).slice(2);
    const key = "video-" + token;
    try {
      await withVideos("readwrite", (store) => store.put({ key, blob: file }));
    } catch {
      throw new Error(labels.storageError());
    }
    pendingVideos.add(key);
    return { key, name: file.name };
  }

  function releaseVideo(key) {
    if (!key) return;
    pendingVideos.delete(key);
    // An earlier upload may still be used by a separately saved listing.
    if (App.cars().some((c) => safeVideo(c.video)?.key === key)) return;
    void withVideos("readwrite", (store) => store.delete(key)).catch(() => {});
  }

  function bindEditor(container, car, onChange = () => {}) {
    const root = container.matches("[data-media-editor]")
      ? container
      : container.querySelector("[data-media-editor]");
    let { images, video } = mediaOf(car);
    const original =
      retainedEditor?.id === (car.id || "")
        ? retainedEditor.original
        : { images: [...images], video };
    retainedEditor = null;
    let processing = false;
    let disposed = false;
    const status = root.querySelector("[data-media-status]");
    const photoInput = root.querySelector("#gg-file");
    const videoInput = root.querySelector("#cm-video-file");
    function draw() {
      const photoList = root.querySelector("[data-edit-photos]");
      photoList.innerHTML = images
        .map(
          (src, i) =>
            '<div class="cm-edit-item"><img src="' +
            esc(src) +
            '" alt="' +
            esc(photoName(src, i)) +
            '">' +
            '<div class="cm-item-actions">' +
            (i === 0
              ? "<strong>" + esc(labels.cover()) + "</strong>"
              : '<button type="button" data-cover="' +
                i +
                '">' +
                esc(
                  t(
                    "Mettre en couverture",
                    "Set as cover",
                    "Als Titelbild",
                    "Usar de portada",
                  ),
                ) +
                "</button>") +
            '<button type="button" data-remove-photo="' +
            i +
            '" aria-label="' +
            esc(
              t(
                "Retirer la photo",
                "Remove photo",
                "Foto entfernen",
                "Quitar foto",
              ) +
                " " +
                (i + 1),
            ) +
            '">' +
            icon("close") +
            "</button></div></div>",
        )
        .join("");
      const row = root.querySelector("[data-edit-video]");
      row.innerHTML = video
        ? "<span>" +
          videoGlyph() +
          esc(video.name || videoName(video)) +
          '</span><button type="button" data-remove-video>' +
          esc(t("Retirer la vidéo", "Remove video", "Video entfernen", "Quitar vídeo")) +
          "</button>"
        : "";
      root.querySelector("[data-video-add]").textContent = video
        ? t(
            "Remplacer la vidéo",
            "Replace video",
            "Video ersetzen",
            "Cambiar vídeo",
          )
        : t(
            "Ajouter une vidéo",
            "Add video",
            "Video hinzufügen",
            "Añadir vídeo",
          );
      photoInput.disabled = processing || images.length >= maxPhotos;
      videoInput.disabled = processing;
      root.querySelectorAll("button").forEach((button) => {
        button.disabled = processing;
      });
      root.setAttribute("aria-busy", String(processing));
    }

    function onClick(event) {
      if (processing) return;
      const button = event.target.closest("button");
      if (!button) return;
      if (button.hasAttribute("data-remove-photo")) {
        images.splice(Number(button.dataset.removePhoto), 1);
      } else if (button.hasAttribute("data-cover")) {
        const [src] = images.splice(Number(button.dataset.cover), 1);
        images.unshift(src);
      } else if (button.hasAttribute("data-remove-video")) {
        if (pendingVideos.has(video?.key)) releaseVideo(video.key);
        video = null;
      } else return;
      status.textContent = "";
      draw();
      onChange();
    }

    async function onInput(event) {
      const input = event.target;
      if (processing || !input.files?.length) return;
      const files = Array.from(input.files);
      input.value = "";
      if (input === photoInput && images.length + files.length > maxPhotos) {
        status.textContent = t(
          "Sélectionnez moins de photos. Chaque annonce peut en contenir 5 au maximum.",
          "Select fewer photos. Each listing can hold up to 5.",
          "Wählen Sie weniger Fotos. Ein Inserat kann höchstens 5 Fotos enthalten.",
          "Selecciona menos fotos. Cada anuncio admite un máximo de 5.",
        );
        return;
      }
      processing = true;
      status.textContent = labels.uploading();
      draw();
      onChange();
      try {
        if (input === photoInput) {
          const batch = [];
          for (const file of files) batch.push(await preparePhoto(file));
          if (disposed) return;
          images = [...new Set([...images, ...batch])];
        } else {
          const next = await prepareVideo(files[0]);
          if (disposed) {
            releaseVideo(next.key);
            return;
          }
          if (pendingVideos.has(video?.key)) releaseVideo(video.key);
          video = next;
        }
        status.textContent = "";
      } catch (error) {
        if (!disposed) status.textContent = error.message || labels.fileError();
      } finally {
        processing = false;
        if (!disposed) {
          draw();
          onChange();
        }
      }
    }
    draw();
    root.addEventListener("click", onClick);
    root.addEventListener("change", onInput);
    return {
      read: () => ({
        image: images[0] || "",
        images: [...images],
        video: video ? { ...video } : null,
      }),
      dirty: () =>
        images.length !== original.images.length ||
        images.some((src, i) => src !== original.images[i]) ||
        (video?.key || video?.src || "") !==
          (original.video?.key || original.video?.src || ""),
      busy: () => processing,
      commit() {
        pendingVideos.delete(video?.key);
        if (original.video?.key && original.video.key !== video?.key)
          releaseVideo(original.video.key);
      },
      dispose(options = {}) {
        disposed = true;
        root.removeEventListener("click", onClick);
        root.removeEventListener("change", onInput);
        if (options.preserve) {
          retainedEditor = { id: car.id || "", original };
          return;
        }
        if (options.saved) this.commit();
        else if (pendingVideos.has(video?.key)) releaseVideo(video.key);
      },
    };
  }

  window.CarMedia = {
    seed,
    detail,
    mount,
    unmount: disposeGallery,
    editor,
    bindEditor,
    hasVideo: (car) => Boolean(mediaOf(car).video),
  };
})();
