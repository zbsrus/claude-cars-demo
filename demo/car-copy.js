// Each entry is fictional catalogue copy in French, English, German and Spanish.
// A saved, edited field always takes precedence over the corresponding seed.
(() => {
  "use strict";
  const languages = ["fr", "en", "de", "es"];
  const copy = {
    "porsche-997-gt3": {
      description: [
        "Montez le son pour entendre le six-cylindres à plat de cette GT3 RS orange dans les rues de New York. C’est la même voiture que l’on retrouve dans la galerie.",
        "Play the clip with the sound on to hear the flat-six as this orange GT3 RS passes the camera in New York. The gallery shows the same car.",
        "Im Video ist der Sechszylinder-Boxer dieses orangefarbenen GT3 RS auf den Straßen von New York zu hören. Die Bildergalerie zeigt denselben Wagen.",
        "Sube el volumen para escuchar el bóxer de seis cilindros de este GT3 RS naranja por las calles de Nueva York. En la galería puedes ver el mismo coche con más detalle.",
      ],
      equipment: [
        "Boîte manuelle à six rapports, aileron arrière fixe et sièges sport.",
        "Six-speed manual gearbox, fixed rear wing and sports seats.",
        "Sechsgang-Schaltgetriebe, feststehender Heckflügel und Sportsitze.",
        "Cambio manual de seis marchas, alerón trasero fijo y asientos deportivos.",
      ],
      condition: [
        "Quelques impacts de gravillons sur le bouclier avant. Le bord inférieur du spoiler présente de légères marques.",
        "A few stone chips on the front bumper. Light scuffing on the lower edge of the spoiler.",
        "Einige Steinschläge am vorderen Stoßfänger. Leichte Gebrauchsspuren an der Unterkante des Spoilers.",
        "Algunos impactos de gravilla en el paragolpes delantero. Marcas leves en el borde inferior del espóiler.",
      ],
    },
    "bmw-e30": {
      description: [
        "La caisse rabaissée et les jantes à déport donnent à cette E30 bleue une allure bien à elle. Sous le capot, on retrouve le six-cylindres en ligne de 2,5 litres de la 325i.",
        "This blue E30 sits low on deep-dish wheels. Under the bonnet is the 325i’s 2.5-litre straight-six, paired with a manual gearbox.",
        "Tiefergelegt und auf Tiefbettfelgen steht dieser blaue E30 besonders satt auf der Straße. Unter der Haube sitzt der 2,5-Liter-Reihensechszylinder des 325i.",
        "La suspensión rebajada y las llantas de garganta profunda dan a este E30 azul un aire muy suyo. Bajo el capó lleva el seis cilindros en línea de 2,5 litros del 325i.",
      ],
      equipment: [
        "Boîte manuelle à cinq rapports, jantes en alliage et vitres avant électriques.",
        "Five-speed manual gearbox, alloy wheels and electric front windows.",
        "Fünfgang-Schaltgetriebe, Leichtmetallräder und elektrische Fensterheber vorn.",
        "Cambio manual de cinco marchas, llantas de aleación y elevalunas eléctricos delanteros.",
      ],
      condition: [
        "Quelques impacts sur le capot. Le bourrelet extérieur du siège conducteur est marqué par l’usure.",
        "A few stone chips on the bonnet. The driver’s seat shows wear on the outer bolster.",
        "Einige Steinschläge auf der Motorhaube. Die äußere Wange des Fahrersitzes ist sichtbar abgenutzt.",
        "Hay pequeños impactos de gravilla en el capó y desgaste visible en el lateral exterior del asiento del conductor.",
      ],
    },
    "mercedes-280sl": {
      description: [
        "La large calandre chromée se détache sur la carrosserie noire de cette 280 SL. Dans cette annonce de démonstration, le six-cylindres en ligne de 2,8 litres de la W113 est associé à une boîte automatique.",
        "The wide chrome grille stands out against the black bodywork of this 280 SL. In this demo listing, the W113’s 2.8-litre straight-six is paired with an automatic gearbox.",
        "Vor dem schwarzen Lack kommt der breite Chromgrill dieses 280 SL besonders gut zur Geltung. In diesem Beispiel ist der 2,8-Liter-Reihensechszylinder des W113 mit einer Automatik kombiniert.",
        "La amplia parrilla cromada destaca sobre la carrocería negra de este 280 SL. En este anuncio de muestra, el seis cilindros en línea de 2,8 litros del W113 va unido a un cambio automático.",
      ],
      equipment: [
        "Direction assistée, boîte automatique et autoradio à boutons.",
        "Power steering, automatic gearbox and push-button radio.",
        "Servolenkung, Automatikgetriebe und Radio mit Drucktasten.",
        "Dirección asistida, cambio automático y radio con pulsadores.",
      ],
      condition: [
        "Léger ternissement du chrome autour de la calandre. Petites marques sur le seuil de porte gauche.",
        "Slight dulling of the chrome around the grille. Small marks on the left door sill.",
        "Der Chrom am Kühlergrill ist leicht matt. Am linken Türeinstieg sind kleine Gebrauchsspuren zu sehen.",
        "El cromado de la parrilla ha perdido algo de brillo. Hay pequeñas marcas en el umbral de la puerta izquierda.",
      ],
    },
    "alfa-spider": {
      description: [
        "Une capote en toile à replier dès que la route s’y prête. Ce Spider rouge de quatrième série associe un quatre-cylindres de deux litres à une boîte manuelle à cinq rapports.",
        "Fold back the soft top and take the country road home. This red fourth-series Spider pairs a two-litre four-cylinder engine with a five-speed manual.",
        "Verdeck auf, raus auf die Landstraße. In diesem roten Spider der vierten Serie trifft der Zweiliter-Vierzylinder auf ein Fünfgang-Schaltgetriebe.",
        "Con la capota de lona plegada, este Spider rojo invita a volver a casa por una carretera secundaria. Pertenece a la cuarta serie y lleva un motor de cuatro cilindros y dos litros con cambio manual de cinco marchas.",
      ],
      equipment: [
        "Capote en toile, boîte manuelle à cinq rapports et jantes en alliage.",
        "Fabric soft top, five-speed manual gearbox and alloy wheels.",
        "Stoffverdeck, Fünfgang-Schaltgetriebe und Leichtmetallräder.",
        "Capota de lona, cambio manual de cinco marchas y llantas de aleación.",
      ],
      condition: [
        "Plis d’usage sur la toile de la capote et petite éraflure sur le pare-chocs arrière.",
        "Creases in the fabric soft top and a small scuff on the rear bumper.",
        "Gebrauchsfalten im Stoffverdeck und ein kleiner Kratzer am hinteren Stoßfänger.",
        "Pliegues de uso en la lona de la capota y un pequeño roce en el paragolpes trasero.",
      ],
    },
    "porsche-911": {
      description: [
        "De profil, les jantes à centre noir soulignent la ligne basse de ce coupé rouge. De face, ses phares ronds annoncent la 911. À l’arrière se trouve le six-cylindres à plat de la Carrera 3.2.",
        "Black-centred wheels set off the low lines of this red coupé. Round headlamps mark it out as a 911 from the front. The Carrera’s 3.2-litre flat-six sits at the rear.",
        "Schwarze Felgensterne betonen die flache Linie des roten Coupés. Vorn trägt der Carrera 3.2 die runden Scheinwerfer des 911, hinten sitzt der Sechszylinder-Boxer.",
        "Las llantas con el centro negro acentúan el perfil bajo de este cupé rojo. Los faros redondos delatan al 911 de frente. Detrás lleva el bóxer de seis cilindros del Carrera 3.2.",
      ],
      equipment: [
        "Boîte manuelle à cinq rapports, sièges avant sport et jantes en alliage à centre noir.",
        "Five-speed manual gearbox, front sports seats and black-centred alloy wheels.",
        "Fünfgang-Schaltgetriebe, Sportsitze vorn und Leichtmetallräder mit schwarzen Felgensternen.",
        "Cambio manual de cinco marchas, asientos deportivos delanteros y llantas de aleación con el centro negro.",
      ],
      condition: [
        "Petits éclats de gravillons sur la face avant. Le siège conducteur présente une légère patine sur le côté extérieur.",
        "Small stone chips on the front end. The outer bolster of the driver’s seat shows light wear.",
        "Kleine Steinschläge an der Front. An der äußeren Wange des Fahrersitzes sind leichte Gebrauchsspuren sichtbar.",
        "Pequeños impactos de gravilla en el frontal. El lateral exterior del asiento del conductor muestra un ligero desgaste.",
      ],
    },
    "porsche-911t": {
      description: [
        "Le long capot et les ailes étroites dessinent le profil de cette 911 T verte de première génération. Au volant, sa direction légère et sa mécanique simple font tout son charme.",
        "The long bonnet and narrow wings mark this green T out as an early 911. Its appeal is just as clear from the driver’s seat, with light steering and straightforward mechanicals.",
        "Lange Haube, schmale Kotflügel und grüner Lack prägen die Seitenansicht dieses frühen 911 T. Am Steuer machen die leichtgängige Lenkung und die einfache Mechanik seinen Reiz aus.",
        "El capó largo y las aletas estrechas dibujan la silueta de este 911 T verde de primera generación. Al volante se aprecia la sencillez de su mecánica y la ligereza de la dirección.",
      ],
      equipment: [
        "Volant à trois branches, boîte manuelle et instrumentation analogique.",
        "Three-spoke steering wheel, manual gearbox and analogue instruments.",
        "Dreispeichenlenkrad, Schaltgetriebe und analoge Instrumente.",
        "Volante de tres radios, cambio manual e instrumentación analógica.",
      ],
      condition: [
        "Petites rayures superficielles sur l’aile arrière droite et patine du volant.",
        "Light surface scratches on the right rear wing and patina on the steering wheel.",
        "Leichte Oberflächenkratzer am rechten hinteren Kotflügel und Patina am Lenkrad.",
        "Arañazos superficiales en la aleta trasera derecha y señales de uso en el volante.",
      ],
    },
    "volvo-v50": {
      description: [
        "Un break suédois au format compact, avec une banquette qui se rabat quand les bagages prennent le dessus. Sous la carrosserie argentée de ce V50, le diesel de deux litres est associé à une boîte manuelle.",
        "Fold the rear seats when there’s more to carry. This compact Swedish estate has silver bodywork, a two-litre diesel and a manual gearbox.",
        "Braucht das Gepäck mehr Platz, lässt sich die Rücksitzbank umklappen. Der silberne V50 verbindet das kompakte Format eines schwedischen Kombis mit einem Zweiliter-Diesel und Schaltgetriebe.",
        "Cuando hace falta más maletero, basta con abatir los asientos traseros. Este familiar sueco compacto de color plata lleva un diésel de dos litros con cambio manual.",
      ],
      equipment: [
        "Climatisation, banquette arrière rabattable et régulateur de vitesse.",
        "Air conditioning, folding rear seats and cruise control.",
        "Klimaanlage, umklappbare Rücksitzbank und Tempomat.",
        "Aire acondicionado, asientos traseros abatibles y control de crucero.",
      ],
      condition: [
        "Le coffre porte des traces de chargement. Le pare-chocs arrière présente une légère éraflure.",
        "Loading marks in the boot and a light scuff on the rear bumper.",
        "Im Kofferraum sind Ladespuren zu sehen, am hinteren Stoßfänger eine leichte Schramme.",
        "Marcas de carga en el maletero y un roce leve en el paragolpes trasero.",
      ],
    },
  };

  function variants(car, key) {
    const original = car.originalLang || "fr";
    const seed = window.VIRAGE_SEED.find((item) => item.id === car.id);
    const values = Object.fromEntries(languages.map((lang) => [lang, ""]));
    if (car.texts) {
      for (const lang of languages) values[lang] = car.texts[lang]?.[key] || "";
      if (!Object.hasOwn(car.texts[original] || {}, key))
        values[original] = car[key] || "";
      return values;
    }
    // Existing local edits can predate the introduction of translations.
    if (car[key] !== undefined && car[key] !== seed?.[key]) {
      values[original] = car[key];
      return values;
    }
    languages.forEach((lang, idx) => {
      values[lang] =
        copy[car.id]?.[key]?.[idx] ?? (lang === original ? car[key] || "" : "");
    });
    return values;
  }

  function field(car, key, lang = I18n.lang()) {
    const values = variants(car, key);
    return (
      values[lang] ||
      values[car.originalLang || "fr"] ||
      Object.values(values).find(Boolean) ||
      ""
    );
  }
  window.CarCopy = { variants, field };
})();
