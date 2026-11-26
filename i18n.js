"use strict";
(() => {
  const locales = { fr: "fr-BE", en: "en-GB", de: "de-DE", es: "es-ES" };
  const languages = Object.keys(locales);
  const key = "virage.local.language";
  let current = "fr";
  try {
    const saved = localStorage.getItem(key);
    if (languages.includes(saved)) current = saved;
  } catch {
    // The interface still works for this visit when storage is unavailable.
  }
  function set(language) {
    if (!languages.includes(language)) return;
    current = language;
    document.documentElement.lang = locales[current];
    try {
      localStorage.setItem(key, current);
    } catch {
      /* Use session memory. */
    }
  }
  function t(fr, en, de, es) {
    return [fr, en, de, es][languages.indexOf(current)];
  }
  const values = {
    Manuelle: ["Manuelle", "Manual", "Schaltgetriebe", "Manual"],
    Automatique: ["Automatique", "Automatic", "Automatik", "Automático"],
    Essence: ["Essence", "Petrol", "Benzin", "Gasolina"],
    Diesel: ["Diesel", "Diesel", "Diesel", "Diésel"],
    Électrique: ["Électrique", "Electric", "Elektro", "Eléctrico"],
    Hybride: ["Hybride", "Hybrid", "Hybrid", "Híbrido"],
  };
  function value(raw) {
    return Object.hasOwn(values, raw) ? t(...values[raw]) : raw;
  }
  const messages = {
    contact: ["Contact", "Contact", "Kontakt", "Contacto"],
    askAboutCar: ["Poser une question sur cette voiture", "Ask Claude about this car", "Eine Frage zu diesem Fahrzeug stellen", "Preguntar por este coche"],
    contactClaude: ["Contacter Claude", "Contact Claude", "Claude kontaktieren", "Contactar con Claude"],
    openMap: ["Ouvrir dans Google Maps", "Open in Google Maps", "In Google Maps öffnen", "Abrir en Google Maps"],
    home: ["Accueil", "Home", "Startseite", "Inicio"],
    catalogue: ["Catalogue", "Catalogue", "Katalog", "Catálogo"],
    garage: [
      "Garage de Claude",
      "Claude’s garage",
      "Claudes Garage",
      "Garaje de Claude",
    ],
    navGarage: ["Garage", "Garage", "Garage", "Garaje"],
    about: [
      "À propos de Claude",
      "About Claude",
      "Über Claude",
      "Sobre Claude",
    ],
    aboutLink: [
      "Rencontrer Claude",
      "Meet Claude",
      "Claude kennenlernen",
      "Conoce a Claude",
    ],
    cars: [
      "Voir les voitures",
      "View cars",
      "Fahrzeuge ansehen",
      "Ver los coches",
    ],
    language: ["Langue", "Language", "Sprache", "Idioma"],
    mainNav: [
      "Navigation principale",
      "Main navigation",
      "Hauptnavigation",
      "Navegación principal",
    ],
    menu: ["Menu", "Menu", "Menü", "Menú"],
    openMenu: ["Ouvrir le menu", "Open menu", "Menü öffnen", "Abrir menú"],
    skip: [
      "Aller au contenu",
      "Skip to content",
      "Zum Inhalt springen",
      "Saltar al contenido",
    ],
    demo: ["Démo locale", "Local demo", "Lokale Demo", "Demo local"],
    footer: [
      "Démo locale · Annonces fictives · Belgique",
      "Local demo · Fictional listings · Belgium",
      "Lokale Demo · Fiktive Angebote · Belgien",
      "Demo local · Anuncios ficticios · Bélgica",
    ],
    credits: [
      "Crédits photo et vidéo",
      "Photo and video credits",
      "Bild- und Videonachweise",
      "Créditos de fotos y vídeo",
    ],
    creditsBody: [
      "Les photos ci-dessous sont utilisées sous licence Unsplash. Les caractéristiques et les prix des annonces sont fictifs.",
      "The photographs listed below are used under the Unsplash License. Vehicle details and prices are fictional.",
      "Die unten aufgeführten Fotos stehen unter der Unsplash-Lizenz. Fahrzeugdaten und Preise sind fiktiv.",
      "Las fotografías de la lista se utilizan bajo la licencia de Unsplash. Los datos de los vehículos y los precios son ficticios.",
    ],
    close: ["Fermer", "Close", "Schließen", "Cerrar"],
    cancel: ["Annuler", "Cancel", "Abbrechen", "Cancelar"],
    featured: ["À la une", "Featured cars", "Im Fokus", "Coches destacados"],
    cover: [
      "À la une en Belgique",
      "Featured in Belgium",
      "Im Fokus in Belgien",
      "Destacado en Bélgica",
    ],
    viewCar: [
      "Voir cette voiture",
      "View this car",
      "Zum Fahrzeug",
      "Ver este coche",
    ],
    selection: [
      "La sélection de Claude",
      "Claude’s selection",
      "Claudes Auswahl",
      "La selección de Claude",
    ],
    explore: [
      "Voir les voitures en vente",
      "Browse cars for sale",
      "Fahrzeuge ansehen",
      "Ver coches en venta",
    ],
    inventory: [
      "Voitures à vendre",
      "Cars for sale",
      "Fahrzeuge zu verkaufen",
      "Coches en venta",
    ],
    latest: [
      "À découvrir en ce moment",
      "In the garage now",
      "Aktuell in der Garage",
      "Ahora en el garaje",
    ],
    fullCatalog: [
      "Toutes les voitures",
      "All cars",
      "Alle Fahrzeuge",
      "Todos los coches",
    ],
    previous: [
      "Voiture précédente",
      "Previous car",
      "Vorheriges Fahrzeug",
      "Coche anterior",
    ],
    next: [
      "Voiture suivante",
      "Next car",
      "Nächstes Fahrzeug",
      "Coche siguiente",
    ],
    noStock: [
      "Aucune voiture en vente pour le moment",
      "No cars for sale at the moment",
      "Zurzeit stehen keine Fahrzeuge zum Verkauf",
      "Por ahora no hay coches en venta",
    ],
    noStockText: [
      "En attendant, faites connaissance avec Claude et découvrez sa façon de travailler.",
      "While the garage is empty, meet Claude and see how he approaches a sale.",
      "Lernen Sie in der Zwischenzeit Claude und seine Arbeitsweise kennen.",
      "Mientras tanto, conoce a Claude y descubre cómo trabaja.",
    ],
    model: ["Modèle", "Model", "Modell", "Modelo"],
    allModels: ["Tous les modèles", "All models", "Alle Modelle", "Todos los modelos"],
    make: ["Marque", "Make", "Marke", "Marca"],
    allMakes: [
      "Toutes les marques",
      "All makes",
      "Alle Marken",
      "Todas las marcas",
    ],
    maxPrice: [
      "Prix maximum (€)",
      "Maximum price (€)",
      "Höchstpreis (€)",
      "Precio máximo (€)",
    ],
    unlimited: ["Sans limite", "No limit", "Unbegrenzt", "Sin límite"],
    gearbox: [
      "Boîte de vitesses",
      "Gearbox",
      "Getriebe",
      "Cambio",
    ],
    allGears: [
      "Toutes les boîtes",
      "All gearboxes",
      "Alle Getriebe",
      "Todos los cambios",
    ],
    search: ["Rechercher", "Search", "Suchen", "Buscar"],
    searchHint: [
      "Modèle, marque, ville…",
      "Model, make, city…",
      "Modell, Marke, Ort …",
      "Modelo, marca, ciudad…",
    ],
    searchGo: [
      "Rechercher",
      "Search",
      "Suchen",
      "Buscar",
    ],
    filters: ["Filtres", "Filters", "Filter", "Filtros"],
    filterCars: [
      "Filtrer les annonces",
      "Filter listings",
      "Angebote filtern",
      "Filtrar anuncios",
    ],
    clearFilters: [
      "Effacer les filtres",
      "Clear filters",
      "Filter löschen",
      "Borrar filtros",
    ],
    resetFilters: [
      "Réinitialiser les filtres",
      "Reset filters",
      "Filter zurücksetzen",
      "Restablecer filtros",
    ],
    reset: ["Réinitialiser", "Reset", "Zurücksetzen", "Restablecer"],
    sort: ["Trier par", "Sort by", "Sortieren nach", "Ordenar por"],
    recent: [
      "Récemment mises à jour",
      "Recently updated",
      "Zuletzt aktualisiert",
      "Actualizados recientemente",
    ],
    low: [
      "Prix croissant",
      "Price: low to high",
      "Preis aufsteigend",
      "Precio ascendente",
    ],
    high: [
      "Prix décroissant",
      "Price: high to low",
      "Preis absteigend",
      "Precio descendente",
    ],
    yearSort: [
      "Année : de la plus ancienne",
      "Year: oldest first",
      "Baujahr: älteste zuerst",
      "Año: más antiguos primero",
    ],
    noResults: [
      "Aucune voiture ne correspond",
      "No cars match your search",
      "Keine passenden Fahrzeuge",
      "Ningún coche coincide con tu búsqueda",
    ],
    tryFilters: [
      "Retirez un filtre ou essayez le nom du modèle seul.",
      "Remove a filter or try just the model name.",
      "Entfernen Sie einen Filter oder suchen Sie nur nach dem Modellnamen.",
      "Quita un filtro o busca solo por el modelo.",
    ],
    year: ["Année", "Year", "Baujahr", "Año"],
    mileage: ["Kilométrage", "Mileage", "Kilometerstand", "Kilometraje"],
    fuel: ["Carburant", "Fuel", "Kraftstoff", "Combustible"],
    location: ["Localisation", "Location", "Standort", "Ubicación"],
    vehicle: [
      "Fiche véhicule",
      "Vehicle details",
      "Fahrzeugdetails",
      "Ficha del vehículo",
    ],
    noTitle: [
      "Sans titre",
      "Untitled vehicle",
      "Fahrzeug ohne Titel",
      "Vehículo sin título",
    ],
    noPrice: [
      "Prix non indiqué",
      "Price not listed",
      "Keine Preisangabe",
      "Precio sin indicar",
    ],
    unspecified: [
      "Non renseigné",
      "Not listed",
      "Keine Angabe",
      "Sin indicar",
    ],
    edit: [
      "Modifier l’annonce",
      "Edit listing",
      "Angebot bearbeiten",
      "Editar anuncio",
    ],
    restore: ["Restaurer", "Restore", "Wiederherstellen", "Restaurar"],
    archive: ["Archiver", "Archive", "Archivieren", "Archivar"],
    detailsTitle: [
      "À propos de cette voiture",
      "About this car",
      "Über dieses Fahrzeug",
      "Sobre este coche",
    ],
    equipment: ["Équipement", "Equipment", "Ausstattung", "Equipamiento"],
    condition: [
      "État du véhicule",
      "Vehicle condition",
      "Fahrzeugzustand",
      "Estado del vehículo",
    ],
    noDescription: [
      "Aucune description pour cette voiture.",
      "No description for this car yet.",
      "Zu diesem Fahrzeug liegt keine Beschreibung vor.",
      "Este coche aún no tiene descripción.",
    ],
    noEquipment: [
      "L’équipement n’est pas détaillé dans cette annonce.",
      "This listing does not specify the equipment.",
      "Dieses Angebot enthält keine Angaben zur Ausstattung.",
      "Este anuncio no detalla el equipamiento.",
    ],
    noCondition: [
      "Le vendeur n’a pas précisé l’état de cette voiture.",
      "The seller has not added condition notes for this car.",
      "Zum Zustand dieses Fahrzeugs liegen keine Angaben vor.",
      "El vendedor aún no ha descrito el estado de este coche.",
    ],
    draft: ["Brouillon", "Draft", "Entwurf", "Borrador"],
    active: ["En vente", "For sale", "Zu verkaufen", "En venta"],
    archived: ["Archivée", "Archived", "Archiviert", "Archivado"],
    missing: [
      "Page introuvable",
      "Page not found",
      "Seite nicht gefunden",
      "Página no encontrada",
    ],
    missingText: [
      "Retrouvez les voitures encore en vente dans le catalogue.",
      "Browse the catalogue to see the cars currently for sale.",
      "Im Katalog finden Sie alle aktuell angebotenen Fahrzeuge.",
      "Consulta el catálogo para ver qué coches siguen en venta.",
    ],
    storageWarning: [
      "Le stockage local est indisponible. Vérifiez les réglages de votre navigateur.",
      "Local storage is unavailable. Check your browser settings.",
      "Der lokale Speicher ist nicht verfügbar. Prüfen Sie Ihre Browsereinstellungen.",
      "El almacenamiento local no está disponible. Revisa los ajustes del navegador.",
    ],
    title: [
      "Voitures à vendre en Belgique",
      "Cars for sale in Belgium",
      "Fahrzeuge zum Verkauf in Belgien",
      "Coches en venta en Bélgica",
    ],
  };
  function label(name) {
    return t(...messages[name]);
  }
  function count(n) {
    return t(
      n + " annonce" + (n <= 1 ? "" : "s"),
      n + " listing" + (n === 1 ? "" : "s"),
      n + " Angebot" + (n === 1 ? "" : "e"),
      n + " anuncio" + (n === 1 ? "" : "s"),
    );
  }
  function showCount(n) {
    return t(
      "Afficher " + count(n),
      "Show " + count(n),
      count(n) + " anzeigen",
      "Mostrar " + count(n),
    );
  }
  const formats = Object.fromEntries(
    languages.map((code) => [
      code,
      {
        number: new Intl.NumberFormat(locales[code]),
        currency: new Intl.NumberFormat(locales[code], {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }),
      },
    ]),
  );
  document.documentElement.lang = locales[current];
  window.I18n = {
    lang: () => current,
    set,
    t,
    label,
    value,
    count,
    showCount,
    num: (n) => formats[current].number.format(Number(n)),
    money: (n) => formats[current].currency.format(Number(n)),
  };
})();
