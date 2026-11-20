// An offline editorial index of passenger cars, classics and light vans.
// Suggestions are starting points: the seller can always type another designation.
(() => {
  "use strict";
  const families = {
    Abarth: "500|595|695|124 Spider|500e|600e|Grande Punto|Punto Evo",
    Acura: "Integra|Legend|NSX|RSX|TL|TLX|MDX|RDX",
    "Alfa Romeo": "33|75|90|145|146|147|155|156|159|164|166|4C|8C Competizione|Alfasud|Alfetta|Brera|Giulia|Giulietta|GT|GTV|Junior|MiTo|Montreal|Spider|Stelvio|Tonale",
    ALPINA: "B3|B4|B5|B6|B7|B8|B10|B12|D3|D4|D5|XD3|XD4|XB7",
    Alpine: "A106|A108|A110|A290|A310|A610|GTA",
    "Aston Martin": "DB4|DB5|DB6|DB7|DB9|DB11|DB12|DBS|DBX|Rapide|V8|Vantage|Vanquish|Virage",
    Audi: "50|80|90|100|200|A1|A2|A3|A4|A5|A6|A7|A8|Cabriolet|Coupé|Q2|Q3|Q4 e-tron|Q5|Q6 e-tron|Q7|Q8|Q8 e-tron|quattro|R8|RS 2|RS 3|RS 4|RS 5|RS 6|RS 7|S1|S2|S3|S4|S5|S6|S7|S8|TT|V8|e-tron|e-tron GT",
    Austin: "Seven|Mini|A30|A35|A40|1100|1300|Allegro|Maestro|Metro|Montego",
    "Austin-Healey": "100|100-6|3000|Sprite",
    Autobianchi: "A112|Bianchina|Primula|Y10",
    Bentley: "Arnage|Azure|Bentayga|Brooklands|Continental R|Continental GT|Flying Spur|Mulsanne|T Series|Turbo R",
    BMW: "02 Series|1500|1600|1800|2000|2002|1 Series|2 Series|3 Series|4 Series|5 Series|6 Series|7 Series|8 Series|318i|320i|323i|325i|328i|330i|520i|525i|530i|635 CSi|850i|X1|X2|X3|X4|X5|X6|X7|XM|Z1|Z3|Z4|Z8|i3|i4|i5|i7|i8|iX|iX1|iX2|iX3|M1|M2|M3|M4|M5|M6|M8",
    Bugatti: "Type 35|Type 57|EB110|Veyron|Chiron",
    Buick: "Century|Electra|Enclave|Encore|Grand National|LeSabre|Park Avenue|Regal|Riviera|Roadmaster|Skylark",
    BYD: "Atto 2|Atto 3|Dolphin|Dolphin Surf|Han|Seal|Seal U|Sealion 7|Tang",
    Cadillac: "ATS|BLS|CT4|CT5|CTS|DeVille|Eldorado|Escalade|Fleetwood|Lyriq|Seville|SRX|XT4|XT5|XT6",
    Caterham: "Seven",
    Changan: "CS35|CS55|CS75|CS95|Eado|UNI-K|UNI-T",
    Chery: "Arrizo 5|Arrizo 8|Tiggo 4|Tiggo 7|Tiggo 8",
    Chevrolet: "Apache|Astro|Aveo|Bel Air|Blazer|Bolt|Camaro|Captiva|Chevelle|Cobalt|Corvair|Corvette|Cruze|El Camino|Equinox|Impala|Malibu|Matiz|Orlando|Silverado|Spark|Suburban|Tahoe|Trailblazer|Trax|Volt",
    Chrysler: "180|200|300|300C|Crossfire|Grand Voyager|LeBaron|New Yorker|Pacifica|PT Cruiser|Sebring|Voyager",
    Citroën: "2CV|Ami|AX|BX|CX|Dyane|DS|GS|GSA|ID|Méhari|Saxo|SM|Visa|Xantia|XM|Xsara|ZX|C1|C2|C3|C3 Aircross|C3 Picasso|C4|C4 Cactus|C4 Picasso|C4 SpaceTourer|C4 X|C5|C5 Aircross|C5 X|C6|C8|Berlingo|Jumper|Jumpy|SpaceTourer|Traction Avant",
    CUPRA: "Ateca|Born|Formentor|Leon|Tavascan|Terramar",
    Dacia: "1300|1310|Bigster|Dokker|Duster|Jogger|Lodgy|Logan|Sandero|Spring",
    DAF: "33|44|55|66",
    Daewoo: "Espero|Kalos|Lacetti|Lanos|Leganza|Matiz|Nexia|Nubira",
    Daihatsu: "Applause|Charade|Copen|Cuore|Feroza|Gran Move|Materia|Rocky|Sirion|Terios|Trevis|YRV",
    Datsun: "100A|120Y|240Z|260Z|280Z|280ZX|510|Bluebird|Cherry|Fairlady|Sunny",
    "De Tomaso": "Deauville|Guarà|Longchamp|Mangusta|Pantera",
    DeLorean: "DMC-12",
    Donkervoort: "D8|F22",
    Dodge: "Avenger|Caliber|Caravan|Challenger|Charger|Coronet|Dart|Durango|Grand Caravan|Journey|Magnum|Nitro|Ram|Viper",
    "DS Automobiles": "DS 3|DS 3 Crossback|DS 4|DS 5|DS 7|DS 7 Crossback|DS 9",
    Ferrari: "250|275|308|328|348|355|360 Modena|430 Scuderia|456|458 Italia|458 Spider|488 GTB|512 BB|550 Maranello|575M Maranello|599 GTB Fiorano|612 Scaglietti|812 Superfast|296 GTB|California|Dino|Enzo|F8 Tributo|F12berlinetta|F40|F50|F430|FF|GTC4Lusso|LaFerrari|Mondial|Portofino|Purosangue|Roma|SF90 Stradale|Testarossa",
    Fiat: "124|124 Spider|126|127|128|130|131|500|500e|500L|500X|600|850|Barchetta|Brava|Bravo|Cinquecento|Coupé|Croma|Doblò|Ducato|Fiorino|Freemont|Grande Panda|Grande Punto|Idea|Multipla|Panda|Punto|Ritmo|Scudo|Sedici|Seicento|Spider Europa|Stilo|Strada|Tempra|Tipo|Ulysse|Uno|X1/9",
    Ford: "Anglia|B-Max|Bronco|Capri|C-Max|Consul|Cortina|Cougar|Crown Victoria|EcoSport|Edge|Escort|Explorer|F-150|Fiesta|Focus|Fusion|Galaxy|Granada|GT|Ka|Kuga|Maverick|Mondeo|Mustang|Mustang Mach-E|Orion|Puma|Ranger|S-Max|Scorpio|Sierra|Taunus|Thunderbird|Tourneo Connect|Tourneo Custom|Transit|Transit Connect|Transit Custom",
    Geely: "Coolray|Emgrand|Geometry C|Monjaro|Tugella",
    Genesis: "G70|G80|G90|GV60|GV70|GV80",
    GMC: "Acadia|Canyon|Jimmy|Savana|Sierra|Suburban|Terrain|Yukon",
    "Great Wall": "Hover|Steed|Wingle",
    Haval: "H2|H6|H9|Jolion",
    Hongqi: "E-HS9|H5|HS5",
    Honda: "Accord|Civic|Concerto|CR-V|CR-X|CR-Z|e|e:Ny1|FR-V|HR-V|Insight|Integra|Jazz|Legend|Logo|NSX|Odyssey|Prelude|S2000|Shuttle|Stream|ZR-V",
    Hummer: "H1|H2|H3",
    Hyundai: "Accent|Atos|Bayon|Coupé|Elantra|Galloper|Getz|H-1|i10|i20|i30|i40|Ioniq|Ioniq 5|Ioniq 6|Ioniq 9|ix20|ix35|Kona|Matrix|Nexo|Pony|Santa Fe|Sonata|Staria|Terracan|Trajet|Tucson|Veloster",
    INEOS: "Grenadier|Quartermaster",
    Infiniti: "EX|FX|G35|G37|M|Q30|Q50|Q60|Q70|QX30|QX50|QX70|QX80",
    Isuzu: "D-Max|Gemini|Piazza|Trooper",
    Iveco: "Daily|Massif",
    JAECOO: "7|8",
    Jaguar: "Daimler Double Six|E-Type|F-Pace|F-Type|I-Pace|E-Pace|Mark 2|S-Type|X-Type|XE|XF|XJ|XJ-S|XJ220|XK|XK120|XK140|XK150|XK8|XKR",
    Jeep: "Avenger|Cherokee|Commander|Compass|Gladiator|Grand Cherokee|Patriot|Renegade|Wagoneer|Wrangler",
    KGM: "Actyon|Korando|Musso|Rexton|Tivoli|Torres",
    Kia: "Carens|Carnival|Ceed|Cerato|EV3|EV4|EV5|EV6|EV9|Magentis|Niro|Opirus|Optima|Picanto|Pride|ProCeed|Rio|Sorento|Soul|Sportage|Stinger|Stonic|Venga|XCeed",
    Lada: "110|111|112|1200|1500|Granta|Kalina|Niva|Priora|Riva|Samara|Vesta",
    Lamborghini: "350 GT|400 GT|Aventador|Countach|Diablo|Espada|Gallardo|Huracán|Jalpa|Jarama|LM002|Miura|Murciélago|Revuelto|Temerario|Urraco|Urus",
    Lancia: "2000|Aurelia|Beta|Dedra|Delta|Flaminia|Flavia|Fulvia|Gamma|Kappa|Lybra|Montecarlo|Musa|Phedra|Prisma|Stratos|Thema|Thesis|Voyager|Y10|Ypsilon|Zeta",
    "Land Rover": "Series I|Series II|Series III|Defender|Discovery|Discovery Sport|Freelander|Range Rover|Range Rover Evoque|Range Rover Sport|Range Rover Velar",
    Leapmotor: "B10|C10|T03",
    Lexus: "CT|ES|GS|GX|IS|LC|LFA|LM|LS|LX|LBX|NX|RC|RX|RZ|SC|UX",
    Lincoln: "Aviator|Continental|Mark VIII|Navigator|Town Car",
    Lotus: "Elan|Eletre|Elise|Elite|Emeya|Emira|Esprit|Europa|Evora|Exige|Seven",
    Lucid: "Air|Gravity",
    "Lynk & Co": "01|02|08",
    Mahindra: "Bolero|Scorpio|Thar|XUV500|XUV700",
    Maserati: "3200 GT|Biturbo|Bora|Coupé|Ghibli|GranCabrio|GranSport|GranTurismo|Grecale|Indy|Khamsin|Levante|MC20|Merak|Quattroporte|Shamal|Spyder",
    Maxus: "Deliver 9|eDeliver 3|eDeliver 7|eDeliver 9|Mifa 9|T90 EV",
    Mazda: "2|3|5|6|121|323|626|929|BT-50|CX-3|CX-30|CX-5|CX-60|CX-7|CX-80|CX-9|Demio|MX-3|MX-5|MX-6|MX-30|Premacy|RX-7|RX-8|Tribute|Xedos 6|Xedos 9",
    McLaren: "12C|540C|570S|600LT|650S|675LT|720S|750S|765LT|Artura|F1|GT|P1|Senna",
    "Mercedes-Benz": "190|190 E|200|220|230 SL|250 SL|280 SL|300 SL|500 SL|A-Class|B-Class|C-Class|CL|CLA|CLC|CLK|CLS|E-Class|G-Class|GL|GLA|GLB|GLC|GLE|GLK|GLS|ML|R-Class|S-Class|SL|SLC|SLK|SLR McLaren|SLS AMG|AMG GT|EQA|EQB|EQC|EQE|EQE SUV|EQS|EQS SUV|EQT|EQV|Citan|Marco Polo|Sprinter|T-Class|V-Class|Viano|Vito|X-Class",
    Mercury: "Capri|Cougar|Grand Marquis|Marauder|Mountaineer|Sable",
    MG: "MG3|MG4|MG5|MG6|MG ZS|MG HS|MG TF|MGA|MGB|MGC|MGF|Midget|Cyberster|Marvel R|ZR|ZS|ZT",
    MINI: "Mini|Cooper|Cooper S|John Cooper Works|Aceman|Clubman|Countryman|Coupé|Paceman|Roadster",
    Mitsubishi: "3000GT|ASX|Carisma|Colt|Eclipse|Eclipse Cross|Galant|Grandis|i-MiEV|L200|Lancer|Lancer Evolution|Outlander|Pajero|Pajero Pinin|Sigma|Space Star|Space Wagon|Starion",
    Morgan: "3 Wheeler|4/4|Aero 8|Plus 4|Plus 8|Plus Four|Plus Six|Super 3",
    Morris: "Minor|Mini-Minor|Marina|Ital",
    NIO: "EL6|EL7|EL8|ET5|ET7",
    Nissan: "100NX|200SX|300ZX|350Z|370Z|Almera|Ariya|Bluebird|Cherry|Cube|GT-R|Juke|Leaf|Maxima|Micra|Murano|Navara|Note|NV200|NV300|Pathfinder|Patrol|Primastar|Primera|Pulsar|Qashqai|Serena|Silvia|Skyline|Sunny|Terrano|Townstar|X-Trail|Z",
    Oldsmobile: "442|Alero|Cutlass|Delta 88|Toronado",
    OMODA: "5|9|E5",
    ORA: "03|07|Funky Cat",
    Opel: "Adam|Agila|Ampera|Antara|Ascona|Astra|Calibra|Campo|Cascada|Combo|Commodore|Corsa|Crossland|Frontera|Grandland|GT|Insignia|Kadett|Kapitän|Karl|Manta|Meriva|Mokka|Monza|Movano|Omega|Rekord|Senator|Signum|Speedster|Tigra|Vectra|Vivaro|Zafira",
    Panhard: "24|Dyna X|Dyna Z|PL 17",
    Perodua: "Axia|Bezza|Kelisa|Kancil|Myvi|Nippa",
    Peugeot: "104|106|107|108|201|202|203|204|205|206|207|208|301|304|305|306|307|308|309|403|404|405|406|407|408|504|505|508|604|605|607|806|807|1007|2008|3008|4007|4008|5008|Bipper|Boxer|Expert|Partner|RCZ|Rifter|Traveller",
    Plymouth: "Barracuda|Belvedere|Fury|GTX|Prowler|Road Runner|Valiant",
    Polestar: "1|2|3|4",
    Pontiac: "Bonneville|Fiero|Firebird|Grand Am|Grand Prix|GTO|LeMans|Trans Am",
    Porsche: "356|550 Spyder|718 Boxster|718 Cayman|911|911 Carrera|911 Carrera S|911 Carrera 4|911 Carrera 4S|911 GT3|911 GT3 RS|911 Targa|911 Turbo|912|914|918 Spyder|924|928|944|959|968|Boxster|Carrera GT|Cayenne|Cayman|Macan|Panamera|Taycan",
    Proton: "Persona|Saga|Satria|Waja|Wira|X50|X70",
    RAM: "1500|2500|3500|ProMaster",
    Renault: "4|5|6|8|9|10|11|12|14|15|16|17|18|19|20|21|25|30|4 E-Tech|5 E-Tech|Arkana|Austral|Avantime|Captur|Clio|Espace|Estafette|Express|Fluence|Fuego|Kadjar|Kangoo|Koleos|Laguna|Latitude|Master|Mégane|Modus|Rafale|Safrane|Scénic|Sport Spider|Supercinq|Symbioz|Talisman|Trafic|Twingo|Vel Satis|Wind|ZOE",
    "Rolls-Royce": "Camargue|Corniche|Cullinan|Dawn|Ghost|Phantom|Silver Cloud|Silver Shadow|Silver Spirit|Silver Spur|Spectre|Wraith",
    Rivian: "R1S|R1T",
    Rover: "25|45|75|200|400|600|800|Mini|P5|P6|SD1|Streetwise",
    Saab: "92|93|95|96|99|90|900|9000|9-3|9-5|9-7X|Sonett",
    SEAT: "Alhambra|Altea|Arona|Arosa|Ateca|Cordoba|Exeo|Fura|Ibiza|Inca|Leon|Malaga|Marbella|Mii|Ronda|Tarraco|Toledo",
    Škoda: "100|105|120|130|Citigo|Elroq|Enyaq|Fabia|Favorit|Felicia|Forman|Kamiq|Karoq|Kodiaq|Octavia|Rapid|Roomster|Scala|Superb|Yeti",
    Simca: "1000|1100|1300|1301|1500|1501|Aronde|Chambord|Vedette",
    smart: "City-Coupé|Crossblade|Forfour|Fortwo|Roadster|#1|#3|#5",
    SsangYong: "Actyon|Korando|Kyron|Musso|Rexton|Rodius|Tivoli|Torres",
    Subaru: "BRZ|Crosstrek|Forester|Impreza|Justy|Legacy|Levorg|Outback|Solterra|SVX|Tribeca|Vivio|WRX|XV",
    Suzuki: "Across|Alto|Baleno|Cappuccino|Carry|Celerio|Grand Vitara|Ignis|Jimny|Kizashi|Liana|S-Cross|Samurai|Splash|Swift|Swace|SX4|Vitara|Wagon R+",
    Tata: "Harrier|Indica|Indigo|Nano|Nexon|Safari|Xenon",
    Tesla: "Model 3|Model S|Model X|Model Y|Roadster|Cybertruck",
    Toyota: "4Runner|Alphard|Auris|Avensis|Aygo|Aygo X|bZ4X|Camry|Carina|Celica|C-HR|Corolla|Corolla Cross|Crown|GT86|GR86|GR Supra|GR Yaris|Hiace|Hilux|iQ|Land Cruiser|LiteAce|MR2|Paseo|Picnic|Previa|Prius|Proace|Proace City|RAV4|Starlet|Supra|Tercel|Verso|Yaris|Yaris Cross",
    Triumph: "Dolomite|GT6|Herald|Spitfire|Stag|TR2|TR3|TR4|TR5|TR6|TR7|TR8|Vitesse",
    TVR: "Cerbera|Chimaera|Griffith|Sagaris|Tamora|Tuscan",
    Vauxhall: "Astra|Cavalier|Chevette|Corsa|Cresta|Firenze|Insignia|Mokka|Nova|Omega|Victor|Viva|VX220",
    VinFast: "VF 6|VF 7|VF 8|VF 9",
    Volkswagen: "Arteon|Beetle|Bora|Caddy|CC|Corrado|Crafter|Eos|Fox|Golf|Golf GTI|Golf R|Golf Plus|Golf Sportsvan|ID.3|ID.4|ID.5|ID.7|ID. Buzz|Jetta|Karmann Ghia|Lupo|LT|Multivan|New Beetle|Passat|Phaeton|Polo|Scirocco|Sharan|Taigo|T-Cross|T-Roc|Tiguan|Touareg|Touran|Transporter|Type 2|Type 3|up!|Vento",
    Volvo: "66|140|164|240|260|340|360|440|460|480|740|760|780|850|940|960|Amazon|C30|C40|C70|EC40|EX30|EX40|EX90|P1800|PV444|PV544|S40|S60|S70|S80|S90|V40|V50|V60|V70|V90|XC40|XC60|XC70|XC90",
    XPENG: "G6|G9|P7",
    ZEEKR: "001|7X|X",
  };

  const normalize = (value) => String(value || "").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const aliases = {
    vw: "volkswagen", merc: "mercedesbenz", mercedes: "mercedesbenz",
    alfa: "alfaromeo", rolls: "rollsroyce", ds: "dsautomobiles",
  };
  const keyOf = (make) => {
    const key = normalize(make);
    return Object.hasOwn(aliases, key) ? aliases[key] : key;
  };
  const t = (...words) => I18n.t(...words);

  function modelName(make, model) {
    const series = /^(\d) Series$/.exec(model);
    if (make === "bmw" && series) {
      const n = series[1];
      return t("Série " + n, n + " Series", n + "er", "Serie " + n);
    }
    const cls = /^(\w)-Class$/.exec(model);
    if (make === "mercedesbenz" && cls) {
      const n = cls[1];
      return t("Classe " + n, model, n + "-Klasse", "Clase " + n);
    }
    return model;
  }

  function bind(form, cars) {
    const make = form.elements.make;
    const model = form.elements.model;
    const names = new Map(), models = new Map();
    function add(makeName, modelNames) {
      if (!makeName) return;
      const key = keyOf(makeName);
      if (!names.has(key)) names.set(key, makeName);
      if (!models.has(key)) models.set(key, new Map());
      for (const raw of modelNames) {
        if (!raw) continue;
        const name = modelName(key, raw);
        if (name) models.get(key).set(normalize(name), name);
      }
    }
    Object.entries(families).forEach(([name, line]) => add(name, line.split("|")));
    cars.forEach((car) => add(car.make, [car.model]));
    const collator = new Intl.Collator(I18n.lang(), { numeric: true, sensitivity: "base" });
    function suggestions(input, all) {
      const options = input === make ? names : models.get(keyOf(make.value));
      const search = normalize(input.value);
      return [...(options?.values() || [])].filter((name) => {
        return all || normalize(name).includes(search) ||
          (input === make && keyOf(search) === keyOf(name));
      }).sort(collator.compare);
    }
    // A changed make invalidates its previous model. Focus records the actual
    // value, including a restored language-switch draft or a historic spelling.
    let previousMake;
    make.addEventListener("focus", () => { previousMake = keyOf(make.value); });
    function commitMake() {
      if (previousMake && previousMake !== keyOf(make.value) && model.value) {
        model.value = "";
        model.dispatchEvent(new Event("input", { bubbles: true }));
      }
      previousMake = keyOf(make.value);
    }
    make.addEventListener("change", commitMake);
    const closeChoices = [];
    for (const input of [make, model]) {
      const wrap = input.parentElement;
      const list = document.createElement("div");
      const panel = document.createElement("div");
      const hint = document.createElement("p");
      const button = document.createElement("button");
      const title = form.querySelector('label[for="' + input.id + '"]');
      title.id = input.id + "-label";
      list.id = input.id + "-suggestions";
      list.className = "gg-choices";
      list.setAttribute("role", "listbox");
      list.setAttribute("aria-labelledby", title.id);
      panel.className = "gg-choice-panel";
      panel.hidden = true;
      hint.className = "gg-choice-hint";
      hint.setAttribute("role", "status");
      panel.append(list, hint);
      input.setAttribute("role", "combobox");
      input.setAttribute("aria-autocomplete", "list");
      input.setAttribute("aria-controls", list.id);
      input.setAttribute("aria-expanded", "false");
      input.placeholder = t("Choisir ou saisir…", "Select or type…", "Wählen oder eingeben…", "Selecciona o escribe…");
      button.className = "gg-choice-toggle";
      button.type = "button";
      button.tabIndex = -1;
      button.setAttribute("aria-label", input === make
        ? t("Afficher les marques", "Show makes", "Marken anzeigen", "Mostrar marcas")
        : t("Afficher les modèles", "Show models", "Modelle anzeigen", "Mostrar modelos"));
      button.setAttribute("aria-controls", list.id);
      button.setAttribute("aria-expanded", "false");
      button.innerHTML = App.icon("down");
      wrap.classList.add("gg-combobox");
      wrap.append(button, panel);
      let options = [], cursor = -1;
      function positionPanel() {
        const field = input.getBoundingClientRect();
        const view = window.visualViewport;
        const top = view?.offsetTop || 0;
        const bottom = top + (view?.height || window.innerHeight);
        const bar = form.querySelector(".gg-save-bar").getBoundingClientRect();
        const above = field.top - top - 12;
        const below = Math.min(bottom, bar.top) - field.bottom - 12;
        const upwards = below < Math.min(210, Math.max(40, options.length * 40)) && above > below;
        panel.classList.toggle("gg-above", upwards);
        list.style.maxHeight = Math.max(44, Math.min(210, upwards ? above : below)) + "px";
      }
      function close() {
        window.removeEventListener("scroll", positionPanel);
        window.visualViewport?.removeEventListener("resize", positionPanel);
        window.visualViewport?.removeEventListener("scroll", positionPanel);
        panel.hidden = true;
        cursor = -1;
        input.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-expanded", "false");
        input.removeAttribute("aria-activedescendant");
      }
      function open(all = false) {
        cursor = -1;
        input.removeAttribute("aria-activedescendant");
        options = suggestions(input, all);
        const items = options.map((name, index) => {
          const item = document.createElement("div");
          item.id = list.id + "-" + index;
          item.setAttribute("role", "option");
          item.setAttribute("aria-selected", "false");
          item.dataset.index = String(index);
          item.textContent = name;
          return item;
        });
        list.replaceChildren(...items);
        list.scrollTop = 0;
        const search = input.value.trim();
        hint.textContent = options.length ? "" : search
          ? t("Vous pouvez garder cette saisie.", "You can use this exact spelling.", "Sie können diese Eingabe übernehmen.", "Puedes guardar el texto tal como está.")
          : t("Saisissez le modèle de votre voiture.", "Enter your car’s model.", "Geben Sie das Fahrzeugmodell ein.", "Escribe el modelo del coche.");
        hint.hidden = Boolean(options.length);
        panel.hidden = false;
        positionPanel();
        window.addEventListener("scroll", positionPanel, { passive: true });
        window.visualViewport?.addEventListener("resize", positionPanel);
        window.visualViewport?.addEventListener("scroll", positionPanel);
        input.setAttribute("aria-expanded", "true");
        button.setAttribute("aria-expanded", "true");
      }
      function choose(index) {
        if (!options[index]) return;
        input.value = options[index];
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        close();
        input.focus({ preventScroll: true });
      }
      function highlight(index) {
        if (!options.length) return;
        if (cursor >= 0) list.children[cursor].setAttribute("aria-selected", "false");
        cursor = Math.max(0, Math.min(index, options.length - 1));
        const item = list.children[cursor];
        item.setAttribute("aria-selected", "true");
        input.setAttribute("aria-activedescendant", item.id);
        const top = item.offsetTop;
        if (top < list.scrollTop) list.scrollTop = top;
        else if (top + item.offsetHeight > list.scrollTop + list.clientHeight)
          list.scrollTop = top + item.offsetHeight - list.clientHeight;
      }
      input.addEventListener("click", () => { if (panel.hidden) open(); });
      input.addEventListener("input", () => { if (document.activeElement === input) open(); });
      input.addEventListener("keydown", (event) => {
        if (event.isComposing) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          if (panel.hidden) open();
          highlight(event.key === "ArrowDown" ? cursor + 1 : cursor < 0 ? options.length - 1 : cursor - 1);
        } else if (event.key === "Escape" && !panel.hidden) {
          event.preventDefault();
          close();
        } else if (event.key === "Enter" && !panel.hidden) {
          event.preventDefault();
          if (cursor >= 0) choose(cursor);
          else close();
        } else if (event.key === "Tab") close();
      });
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => {
        input.focus({ preventScroll: true });
        if (panel.hidden) open(true); else close();
      });
      list.addEventListener("mousedown", (event) => event.preventDefault());
      list.addEventListener("click", (event) => {
        const option = event.target.closest('[role="option"]');
        if (option) choose(Number(option.dataset.index));
      });
      closeChoices.push(close);
      wrap.addEventListener("focusout", (event) => {
        if (!wrap.contains(event.relatedTarget)) close();
      });
    }
    return () => closeChoices.forEach((close) => close());
  }
  window.VehicleDirectory = { bind };
})();
