"""Sample inventory used only with preview.py --demo and a separate data directory."""
import json

import catalogue


# Local images and credit links are documented in assets/cars/credits.md.
EXAMPLES = [
    ("bmw-e30", "BMW", "325i E30", 1989, 148200, 24900, "available",
     ("Une E30 bleue, un six-cylindres en ligne et des jantes à déport.",
      "Een blauwe E30 met lijnzescilinder en velgen met diepe rand.",
      "Ein blauer E30 mit Reihensechszylinder und Tiefbettfelgen.",
      "A blue E30 with a straight-six and deep-dish wheels.",
      "Un E30 azul con seis cilindros en línea y llantas de garganta profunda.")),
    ("alfa-spider", "Alfa Romeo", "Spider 2.0", 1991, 93500, 21800, "available",
     ("Un Spider rouge à deux places, avec capote en toile et boîte manuelle.",
      "Een rode tweezits Spider met stoffen kap en handbak.",
      "Ein roter, zweisitziger Spider mit Stoffverdeck und Handschaltung.",
      "A red two-seat Spider with a fabric roof and a manual gearbox.",
      "Un Spider rojo de dos plazas con capota de lona y cambio manual.")),
    ("porsche-911", "Porsche", "911 Carrera 3.2", 1986, 112400, 74800, "reserved",
     ("Un coupé rouge à phares ronds, avec un six-cylindres à plat à l’arrière.",
      "Een rode coupé met ronde koplampen en een zescilinder boxer achterin.",
      "Ein rotes Coupé mit runden Scheinwerfern und einem Sechszylinder-Boxer im Heck.",
      "A red coupé with round headlights and a rear-mounted flat-six.",
      "Un cupé rojo con faros redondos y un motor bóxer de seis cilindros detrás.")),
    ("mercedes-280sl", "Mercedes-Benz", "280 SL Pagode", 1969, 89600, None, "soon",
     ("La calandre chromée et le six-cylindres de 2,8 litres de la Pagode.",
      "De verchroomde grille en de 2,8-liter zescilinder van de Pagode.",
      "Der Chromgrill und der 2,8-Liter-Sechszylinder der Pagode.",
      "The Pagoda’s chrome grille and 2.8-litre straight-six.",
      "La parrilla cromada y el seis cilindros de 2,8 litros del Pagoda.")),
    ("porsche-911t", "Porsche", "911 T", 1972, 107900, None, "sold",
     ("Une 911 verte de première génération, reconnaissable à son long capot.",
      "Een groene 911 van de eerste generatie, herkenbaar aan de lange voorklep.",
      "Ein grüner 911 der ersten Generation mit der charakteristischen langen Fronthaube.",
      "A green first-generation 911 with its distinctive long bonnet.",
      "Un 911 verde de primera generación, reconocible por su capó largo.")),
]


def seed_examples(db):
    db.execute("CREATE TABLE IF NOT EXISTS demo_inventory (version INTEGER PRIMARY KEY)")
    if db.execute("SELECT 1 FROM demo_inventory").fetchone():
        return
    for slug, make, model, year, km, price, status, introductions in reversed(EXAMPLES):
        image = (catalogue.ROOT / "assets" / "cars" / f"{slug}.webp").read_bytes()
        media = catalogue.store_media(db, image, "image/webp")
        translations = {lang: {"intro": intro} for lang, intro in zip(catalogue.LANGS, introductions)}
        car = catalogue.normalized(db, dict(make=make, model=model, year=year, km=km,
                                           price=price, status=status, cover=media, photos=[media],
                                           translations=translations, approved=dict.fromkeys(catalogue.LANGS, True)))
        car.update(id=f"collection-{slug}", revision=1)
        db.execute("INSERT INTO cars VALUES(?,1,?)", (car["id"], json.dumps(car)))
        db.execute("INSERT INTO assets VALUES(?,?)", (car["id"], media))
    db.execute("INSERT INTO demo_inventory VALUES(1)")
