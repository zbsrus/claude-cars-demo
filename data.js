// Demo values are independent of the cars and locations in the photographs.
// Keep original descriptions stable so saved owner edits remain distinguishable.
// CarCopy supplies the current catalogue text in all four languages.
window.VIRAGE_SEED = [
  {
    id: "porsche-997-gt3",
    make: "Porsche",
    model: "911 GT3 RS (997)",
    year: 2007,
    price: 154900,
    km: 42500,
    city: "Namur",
    gearbox: "Manuelle",
    fuel: "Essence",
    image: "assets/media/porsche-997-front.webp",
    description:
      "Une 911 orange, son aileron fixe et le son du six-cylindres à plat. La galerie et la vidéo présentent la même GT3 RS en circulation à New York.",
  },
  {
    id: "bmw-e30",
    make: "BMW",
    model: "325i E30",
    year: 1989,
    price: 24900,
    km: 148200,
    city: "Liège",
    gearbox: "Manuelle",
    fuel: "Essence",
    image: "assets/cars/bmw-e30.webp",
    own: true,
    description:
      "Un six-cylindres en ligne de 2,5 litres et une boîte manuelle à cinq rapports. Cette E30 bleue illustre une configuration personnalisée, avec une assiette basse et des jantes à déport.",
  },
  {
    id: "mercedes-280sl",
    make: "Mercedes-Benz",
    model: "280 SL",
    year: 1969,
    price: 82400,
    km: 89600,
    city: "Bruxelles",
    gearbox: "Automatique",
    fuel: "Essence",
    image: "assets/cars/mercedes-280sl.webp",
    description:
      "Avec son six-cylindres de 2,8 litres et sa grande calandre chromée, la W113 incarne le grand tourisme des années soixante. Cet exemplaire fictif est présenté en noir avec une boîte automatique.",
  },
  {
    id: "alfa-spider",
    make: "Alfa Romeo",
    model: "Spider 2.0",
    year: 1991,
    price: 21800,
    km: 93500,
    city: "Wavre",
    gearbox: "Manuelle",
    fuel: "Essence",
    image: "assets/cars/alfa-spider.webp",
    description:
      "Un Spider de quatrième série en rouge, avec capote souple et boîte manuelle. Le quatre-cylindres deux litres accompagne aussi bien les balades en ville que les longues routes de campagne.",
  },
  {
    id: "porsche-911",
    make: "Porsche",
    model: "911 Carrera 3.2",
    year: 1986,
    price: 74800,
    km: 112400,
    city: "Namur",
    gearbox: "Manuelle",
    fuel: "Essence",
    image: "assets/cars/porsche-911.webp",
    description:
      "Une silhouette basse, des phares ronds et le six-cylindres à plat à l’arrière. La Carrera 3.2 est présentée ici en coupé rouge, avec boîte manuelle et jantes à cœur noir.",
  },
  {
    id: "porsche-911t",
    make: "Porsche",
    model: "911 T",
    year: 1972,
    price: 95800,
    km: 107900,
    city: "Dinant",
    gearbox: "Manuelle",
    fuel: "Essence",
    image: "assets/cars/porsche-911t.webp",
    description:
      "Capot long, ailes fines et teinte verte pour cette 911 de première génération. Le modèle T conserve une mécanique simple et une direction légère.",
  },
  {
    id: "volvo-v50",
    make: "Volvo",
    model: "V50 2.0D",
    year: 2009,
    price: 7900,
    km: 178500,
    city: "Mons",
    gearbox: "Manuelle",
    fuel: "Diesel",
    image: "assets/cars/volvo-v50.webp",
    description:
      "Un break compact suédois en finition argentée. Le deux litres diesel, la boîte manuelle et le coffre modulable en font un véhicule de tous les jours.",
  },
].map((car, i) => ({
  own: true,
  ...car,
  status: "active",
  updated: 1000 - i,
}));

window.VIRAGE_CREDITS =
  '<p>Photos d’illustration sous licence Unsplash. Les caractéristiques et les prix des annonces sont fictifs.</p><ul class="credits-list">' +
  [
    ["Porsche 911 Carrera", "Michael Lock"],
    ["BMW E30", "Rishabh Patel"],
    ["Mercedes-Benz 280 SL", "Philippe"],
    ["Alfa Romeo Spider", "Ruben Mavarez"],
    ["Volvo V50", "Sascha Pfyl"],
    ["Porsche 911 T", "Ferran Ventura"],
  ]
    .map(
      ([car, author]) =>
        "<li><strong>" + car + "</strong> · " + author + "</li>",
    )
    .join("") +
  "</ul>";
