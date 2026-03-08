// ============================================================
// French → English translation dictionaries for venue data
// ============================================================

/** Categories */
const CATEGORIES: Record<string, string> = {
  "Bars à cocktails & Speakeasy": "Cocktail Bars & Speakeasy",
  "Rooftops & Bars à vins": "Rooftops & Wine Bars",
  "Bars à bières, Pubs & Bars insolites": "Beer Bars, Pubs & Unique Bars",
  "Péniches & Bars dansants": "Barges & Dancing Bars",
  "Bars & Clubs LGBT-friendly": "LGBT-friendly Bars & Clubs",
  "Clubs & Boîtes de nuit": "Clubs & Nightclubs",
  "Pubs irlandais/écossais & Bars Vieux Lyon": "Irish/Scottish Pubs & Old Lyon Bars",
  "Cocktail & Speakeasy": "Cocktail & Speakeasy",
  Latino: "Latin",
  "LGBT-friendly": "LGBT-friendly",
  "Péniche": "Barge",
  "Bar à jeux": "Game Bar",
  "Bar à bières": "Beer Bar",
  "Bar à vins": "Wine Bar",
  Bar: "Bar",
  "Clubs & Bars Dansants": "Clubs & Dancing Bars",
  "Bars Cosy & Afterworks": "Cozy Bars & Afterwork Spots",
};

/** Sous-categories */
const SOUS_CATEGORIES: Record<string, string> = {
  "cocktail bar": "cocktail bar",
  "bar lounge": "lounge bar",
  "bar d'hôtel": "hotel bar",
  "salon de thé": "tea room",
  "bar à vins": "wine bar",
  "bar concept": "concept bar",
  "bar culturel": "cultural bar",
  speakeasy: "speakeasy",
  rooftop: "rooftop",
  "bar dansant": "dancing bar",
  "lieu culturel": "cultural venue",
  restaurant: "restaurant",
  bar: "bar",
  "bar panoramique": "panoramic bar",
  cave: "wine cellar",
  "bar à tapas": "tapas bar",
  "bar musical": "music bar",
  "bar à bières artisanales": "craft beer bar",
  brewpub: "brewpub",
  "bar à bières": "beer bar",
  "bar festif": "party bar",
  "salle de concerts": "concert hall",
  "bar sportif": "sports bar",
  "bar belge": "Belgian bar",
  "pub anglais": "English pub",
  "bar insolite": "quirky bar",
  "bar à jeux": "game bar",
  "bar gaming": "gaming bar",
  "bar esport": "esports bar",
  "bar terrasse": "terrace bar",
  "bar afterwork": "afterwork bar",
  "café-restaurant": "café-restaurant",
  "bar engagé": "socially conscious bar",
  bistrot: "bistro",
  "péniche": "barge",
  "bar LGBT": "LGBT bar",
  "bar bear": "bear bar",
  "club LGBT": "LGBT club",
  "discothèque": "discotheque",
  "bar-restaurant": "bar-restaurant",
  "bar LGBT-friendly": "LGBT-friendly bar",
  "club electro": "electro club",
  "club tendance": "trendy club",
  "club underground": "underground club",
  "club généraliste": "mainstream club",
  "club éclectique": "eclectic club",
  club: "club",
  "club latino": "Latin club",
  "club VIP": "VIP club",
  "restaurant festif": "festive restaurant",
  terrasse: "terrace",
  "club afro-antillais": "Afro-Caribbean club",
  "pub irlandais": "Irish pub",
  pub: "pub",
  "pub écossais": "Scottish pub",
  "salle de spectacle": "performance hall",
};

/** Music genres */
const MUSIQUE: Record<string, string> = {
  jazz: "jazz",
  lounge: "lounge",
  "années 20": "20s music",
  "jazz doux": "soft jazz",
  soul: "soul",
  funk: "funk",
  "variée": "variety",
  "DJ sets": "DJ sets",
  swing: "swing",
  "années 20-30": "20s-30s music",
  "années 50-60": "50s-60s music",
  "ambiance film noir": "film noir vibes",
  rock: "rock",
  "années 70": "70s music",
  chill: "chill",
  electro: "electro",
  techno: "techno",
  house: "house",
  "jazz live": "live jazz",
  world: "world",
  "pop rock": "pop rock",
  indie: "indie",
  festive: "festive",
  "concerts live": "live concerts",
  "ambiance sport": "sports vibes",
  metal: "metal",
  steampunk: "steampunk",
  reggae: "reggae",
  "fond sonore": "background music",
  "gaming OST": "gaming OST",
  live: "live",
  "jam sessions": "jam sessions",
  "karaoké": "karaoke",
  pop: "pop",
  "années 90": "90s music",
  "rétro": "retro",
  "généraliste": "mainstream",
  dance: "dance",
  "drag shows": "drag shows",
  bingo: "bingo",
  disco: "disco",
  "deep house": "deep house",
  rap: "rap",
  "hip-hop": "hip-hop",
  hits: "hits",
  reggaeton: "reggaeton",
  urban: "urban",
  "éclectique": "eclectic",
  "concerts variés": "mixed concerts",
  trance: "trance",
  "années 80": "80s music",
  "hits actuels": "current hits",
  "variété": "variety",
  salsa: "salsa",
  bachata: "bachata",
  latino: "Latin",
  "electro underground": "underground electro",
  "afro-antillais": "Afro-Caribbean",
  "R&B": "R&B",
  "musique irlandaise": "Irish music",
  folk: "folk",
  "folk irlandais": "Irish folk",
  concerts: "concerts",
  "jazz manouche": "gypsy jazz",
  "théâtre": "theater",
  "DJ soft": "soft DJ",
  "cocktail bar avec DJ": "cocktail bar with DJ",
  "nu-disco": "nu-disco",
  "bar festif": "party bar",
  "musique latine (salsa": "Latin music (salsa",
  "généraliste)": "mainstream)",
  merengue: "merengue",
  DJ: "DJ",
  OST: "OST",
  "électro légère": "light electro",
  "jazz soft": "soft jazz",
  "jazz moderne et classique": "modern & classic jazz",
  blues: "blues",
  "généraliste club": "mainstream club",
  "soirées à thème": "themed nights",
  "généraliste dansant": "mainstream dance",
  "Techno brute": "hard techno",
  Underground: "underground",
  "Évolutive": "progressive",
  "Généraliste": "mainstream",
  "DJ sets progressifs": "progressive DJ sets",
  Latino: "Latin",
  Reggaeton: "reggaeton",
  "Clubbing pointu": "niche clubbing",
  Live: "live",
  Jazz: "jazz",
  Pop: "pop",
  Rap: "rap",
  Electro: "electro",
  "DJ Sets": "DJ sets",
  "Éclectique": "eclectic",
  Clubbing: "clubbing",
  "DJ locaux": "local DJs",
  Vinyles: "vinyl",
  "Rétro": "retro",
  Chill: "chill",
  "Ambiance zen": "zen vibes",
  Calme: "calm",
  "Généraliste douce": "soft mainstream",
  Lounge: "lounge",
  Rock: "rock",
  Pub: "pub",
};

/** Quartiers — most are proper names kept as-is, translate generic parts */
const QUARTIERS: Record<string, string> = {
  "Opéra / Terreaux": "Opéra / Terreaux",
  "Presqu'île / Bellecour": "Presqu'île / Bellecour",
  "Presqu'île Nord": "Northern Presqu'île",
  Terreaux: "Terreaux",
  Bellecour: "Bellecour",
  "Guillotière": "Guillotière",
  "Presqu'île": "Presqu'île",
  "Pentes Croix-Rousse": "Croix-Rousse Slopes",
  Brotteaux: "Brotteaux",
  Cordeliers: "Cordeliers",
  "Terreaux / Opéra": "Terreaux / Opéra",
  Confluence: "Confluence",
  "Fourvière / Antiquaille": "Fourvière / Antiquaille",
  "Part-Dieu": "Part-Dieu",
  "Vieux Lyon": "Old Lyon",
  "Fourvière": "Fourvière",
  "Vieux Lyon / Saint-Paul": "Old Lyon / Saint-Paul",
  Ainay: "Ainay",
  "Jean Macé": "Jean Macé",
  "Gratte-Ciel": "Gratte-Ciel",
  Quais: "Riverbanks",
  "Jean Macé / Guillotière": "Jean Macé / Guillotière",
  Multiples: "Various",
  "Croix-Rousse": "Croix-Rousse",
  "Berges du Rhône": "Rhône Riverbanks",
  "Opéra": "Opéra",
  Gerland: "Gerland",
  Villeurbanne: "Villeurbanne",
  "Gorge de Loup": "Gorge de Loup",
  "Vieux Lyon / Saint-Jean": "Old Lyon / Saint-Jean",
  "Vieux Lyon / Saint-Georges": "Old Lyon / Saint-Georges",
  "Terreaux / Rue de la soif": "Terreaux / Party Street",
  "Croix-Rousse (plateau)": "Croix-Rousse (plateau)",
};

/** Common French words/phrases → English for description auto-translation */
const DESC_PHRASES: ReadonlyArray<readonly [RegExp, string]> = [
  // Ambiance / atmosphere
  [/\bambiance années folles\b/gi, "Roaring Twenties atmosphere"],
  [/\bambiance rococo\b/gi, "rococo atmosphere"],
  [/\bambiance (très )?intime\b/gi, "intimate atmosphere"],
  [/\bambiance jazzy new-yorkaise\b/gi, "New York jazz atmosphere"],
  [/\bambiance film noir\b/gi, "film noir atmosphere"],
  [/\bambiance sophistiquée\b/gi, "sophisticated atmosphere"],
  [/\bambiance tropicale et sud-américaine\b/gi, "tropical South American atmosphere"],
  [/\bambiance tamisée\b/gi, "dimly lit atmosphere"],
  [/\bambiance chaleureuse\b/gi, "warm atmosphere"],
  [/\bambiance conviviale\b/gi, "friendly atmosphere"],
  [/\bambiance festive\b/gi, "festive atmosphere"],
  [/\bambiance décontractée\b/gi, "relaxed atmosphere"],
  [/\bambiance chill\b/gi, "chill atmosphere"],
  [/\bambiance branchée\b/gi, "trendy atmosphere"],
  [/\bambiance underground\b/gi, "underground atmosphere"],
  [/\bambiance cosy\b/gi, "cozy atmosphere"],
  [/\bambiance lounge\b/gi, "lounge atmosphere"],
  [/\bambiance feutrée\b/gi, "hushed atmosphere"],
  [/\bambiance(?! )\b/gi, "atmosphere"],
  // Décor / decor
  [/\bdécor Art Déco\b/gi, "Art Deco decor"],
  [/\bdécor victorien\b/gi, "Victorian decor"],
  [/\bdécor élégant\b/gi, "elegant decor"],
  [/\bdécor minimaliste\b/gi, "minimalist decor"],
  [/\bdéco minimaliste\b/gi, "minimalist design"],
  [/\bdécoration victorienne\b/gi, "Victorian decoration"],
  [/\bdécoration soignée\b/gi, "refined decoration"],
  [/\bdécor\b/gi, "decor"],
  [/\bdéco\b/gi, "design"],
  // Places / features
  [/\bterrasse (secrète|cachée)\b/gi, "secret terrace"],
  [/\bterrasse panoramique\b/gi, "panoramic terrace"],
  [/\bterrasse chauffée\b/gi, "heated terrace"],
  [/\bterrasse\b/gi, "terrace"],
  [/\bpiste de danse\b/gi, "dance floor"],
  [/\bpiste dansante\b/gi, "dance floor"],
  [/\bvue panoramique\b/gi, "panoramic view"],
  [/\bvue imprenable\b/gi, "stunning view"],
  [/\bvue magnifique\b/gi, "magnificent view"],
  [/\bvue sur\b/gi, "view of"],
  [/\bcheminée\b/gi, "fireplace"],
  [/\bfumoir\b/gi, "smoking lounge"],
  [/\bsous-sol\b/gi, "basement"],
  [/\ben sous-sol\b/gi, "in the basement"],
  [/\bcave voûtée\b/gi, "vaulted cellar"],
  [/\bcave secrète\b/gi, "secret cellar"],
  [/\bsalle voûtée\b/gi, "vaulted room"],
  [/\bsalle VIP\b/gi, "VIP room"],
  [/\bsalle\b/gi, "room"],
  [/\bbillards?\b/gi, "billiards"],
  [/\bfléchettes\b/gi, "darts"],
  [/\bjeux de société\b/gi, "board games"],
  [/\bjeux d'arcade\b/gi, "arcade games"],
  [/\bjeux\b/gi, "games"],
  [/\bbabyfoot\b/gi, "foosball"],
  [/\bflippers?\b/gi, "pinball"],
  [/\bécrans?\b/gi, "screens"],
  // Drinks
  [/\bcocktails? signatures?\b/gi, "signature cocktails"],
  [/\bcocktails? maison\b/gi, "house cocktails"],
  [/\bcocktails? créatifs?\b/gi, "creative cocktails"],
  [/\bcocktails? subtils?\b/gi, "refined cocktails"],
  [/\bcocktails? originau?x?\b/gi, "original cocktails"],
  [/\bcocktails?\b/gi, "cocktails"],
  [/\bmixologie innovante\b/gi, "innovative mixology"],
  [/\bmixologie\b/gi, "mixology"],
  [/\bbières? artisanales?\b/gi, "craft beers"],
  [/\bbières? pression\b/gi, "beers on tap"],
  [/\bbières? locales?\b/gi, "local beers"],
  [/\bbières? dispo\b/gi, "beers available"],
  [/\bbières?\b/gi, "beers"],
  [/\bvins? natures?\b/gi, "natural wines"],
  [/\bvins?\b/gi, "wines"],
  [/\bshots?\b/gi, "shots"],
  [/\bshooters?\b/gi, "shooters"],
  [/\brhums?\b/gi, "rum"],
  [/\bpinte\b/gi, "pint"],
  [/\bconsommations?\b/gi, "drinks"],
  [/\bplanches? (raffinées?|fromages?|charcuterie)?\b/gi, "platters"],
  [/\btapas\b/gi, "tapas"],
  [/\bbrunch(s)?\b/gi, "brunch"],
  [/\bbrunchs? gourmands?\b/gi, "gourmet brunch"],
  // Events / activities
  [/\bsoirées? (à )?thèmes?\b/gi, "themed nights"],
  [/\bsoirées? cigares?\b/gi, "cigar nights"],
  [/\bsoirées?\b/gi, "nights"],
  [/\bateliers? cocktails?\b/gi, "cocktail workshops"],
  [/\bmaster classes?\b/gi, "master classes"],
  [/\bexpos? éphémères?\b/gi, "pop-up exhibitions"],
  [/\bconcerts? live\b/gi, "live concerts"],
  [/\bconcerts?\b/gi, "concerts"],
  [/\bDJ sets?\b/gi, "DJ sets"],
  [/\bkaraoké\b/gi, "karaoke"],
  [/\bquiz\b/gi, "quiz"],
  [/\bhappy hours?\b/gi, "happy hours"],
  [/\bafterworks?\b/gi, "afterworks"],
  // Adjectives / descriptions
  [/\bcadre (très )?luxueux\b/gi, "luxurious setting"],
  [/\bcadre (très )?chaleureux\b/gi, "warm setting"],
  [/\bcadre (très )?convivial\b/gi, "friendly setting"],
  [/\bcadre (très )?exceptionnel\b/gi, "exceptional setting"],
  [/\bcadre\b/gi, "setting"],
  [/\bélu meilleur bar au monde\b/gi, "voted best bar in the world"],
  [/\bmeilleur(e)?s?\b/gi, "best"],
  [/\bnote parfaite\b/gi, "perfect score"],
  [/\bcréations? originales?\b/gi, "original creations"],
  [/\bbar (très )?chic\b/gi, "upscale bar"],
  [/\bbar caché\b/gi, "hidden bar"],
  [/\bbar narratif\b/gi, "narrative bar"],
  [/\bbar dansant\b/gi, "dancing bar"],
  [/\bbar de nuit\b/gi, "night bar"],
  [/\bbar à cocktails?\b/gi, "cocktail bar"],
  [/\bspeakeasy caché\b/gi, "hidden speakeasy"],
  [/\bspeakeasy cosy\b/gi, "cozy speakeasy"],
  [/\bréservation obligatoire\b/gi, "reservation required"],
  [/\bsonnette à l'entrée\b/gi, "ring the doorbell to enter"],
  [/\bentré(e|er)\b/gi, "entrance"],
  [/\bdifficile à trouver\b/gi, "hard to find"],
  [/\bcaché(e)?s?\b/gi, "hidden"],
  [/\bcosy\b/gi, "cozy"],
  [/\btamisé(e)?s?\b/gi, "dim"],
  [/\bchic\b/gi, "upscale"],
  [/\bélégant(e)?s?\b/gi, "elegant"],
  [/\braffiné(e)?s?\b/gi, "refined"],
  [/\bconvivial(e)?s?\b/gi, "cozy"],
  [/\bchaleureux(se)?\b/gi, "warm"],
  [/\baccueillant(e)?s?\b/gi, "welcoming"],
  [/\baccessible\b/gi, "accessible"],
  [/\bgratuit(e)?s?\b/gi, "free"],
  [/\bénorme\b/gi, "huge"],
  [/\bgrand(e)?s?\b/gi, "large"],
  [/\bpetit(e)?s?\b/gi, "small"],
  [/\bbon(ne)?s? (marché|rapport)\b/gi, "good value"],
  [/\binsolite\b/gi, "unusual"],
  [/\bunique\b/gi, "unique"],
  [/\boriginale?\b/gi, "original"],
  [/\b(très )?intimiste\b/gi, "intimate"],
  // Materials / design elements
  [/\brideaux velours rouges?\b/gi, "red velvet curtains"],
  [/\bvelours\b/gi, "velvet"],
  [/\bmiroirs?\b/gi, "mirrors"],
  [/\blumières? tamisées?\b/gi, "dim lighting"],
  [/\bnéons?\b/gi, "neon lights"],
  [/\bbois sombre\b/gi, "dark wood"],
  [/\bboiseries?\b/gi, "woodwork"],
  [/\bbriques?\b/gi, "brick"],
  [/\bfauteuils? en cuir\b/gi, "leather armchairs"],
  [/\bbanquettes? mordorées?\b/gi, "golden banquettes"],
  [/\bmurs? vert émeraude\b/gi, "emerald green walls"],
  [/\bdôme orné de moulures\b/gi, "dome adorned with moldings"],
  [/\bmoulures?\b/gi, "moldings"],
  // Times
  [/\ben journée\b/gi, "during the day"],
  [/\ble soir\b/gi, "in the evening"],
  [/\blend(i|emain)\b/gi, "monday"],
  [/\bmardi\b/gi, "Tuesday"],
  [/\bmercredi\b/gi, "Wednesday"],
  [/\bjeudi\b/gi, "Thursday"],
  [/\bvendredi\b/gi, "Friday"],
  [/\bsamedi\b/gi, "Saturday"],
  [/\bdimanche\b/gi, "Sunday"],
  [/\bweek-?end\b/gi, "weekend"],
  [/\bsemaine\b/gi, "weekdays"],
  [/\bce soir\b/gi, "tonight"],
  // Other
  [/\bslogan:\s*/gi, "motto: "],
  [/\bcommunauté LGBT\b/gi, "LGBT community"],
  [/\bclientèle mixte\b/gi, "mixed clientele"],
  [/\bplacesde parking\b/gi, "parking spots"],
  [/\bplaces? de parking\b/gi, "parking spots"],
  [/\bréférences? de vins\b/gi, "wine references"],
  [/\bétage\b/gi, "floor"],
  [/\bniveaux?\b/gi, "levels"],
  [/\bmicro-club\b/gi, "micro-club"],
  [/\bfoie gras\b/gi, "foie gras"],
  [/\bfleuriste\b/gi, "florist"],
  [/\bcafé botanique\b/gi, "botanical café"],
  [/\bconcept store\b/gi, "concept store"],
  [/\bjungle urbaine\b/gi, "urban jungle"],
  [/\bmezzanine\b/gi, "mezzanine"],
  [/\bplaid\b/gi, "blanket"],
  [/\bvegan\b/gi, "vegan"],
  [/\bcafé-cantine\b/gi, "café-canteen"],
  [/\bbistrot de quartier\b/gi, "neighborhood bistro"],
  [/\bsans chichi\b/gi, "unpretentious"],
  [/\bcomme chez un ami\b/gi, "like at a friend's"],
  [/\bpéniche\b/gi, "barge"],
  [/\bcale de bateau pirate\b/gi, "pirate ship hold"],
  [/\bchoix de\b/gi, "selection of"],
  [/\ble Vieux Lyon\b/gi, "Old Lyon"],
  [/\bLyon\b/g, "Lyon"],
  [/\bhors du temps\b/gi, "timeless"],
  [/\bexclusivement sur vinyles\b/gi, "exclusively on vinyl"],
  [/\bdiffusion de musique\b/gi, "music played"],
  [/\bqui crépite\b/gi, "crackling"],
  [/\bvéritable\b/gi, "real"],
  [/\bfêter\b/gi, "celebrate"],
  [/\bévènement\b/gi, "event"],
  [/\bcomité\b/gi, "group"],
  [/\bun des\b/gi, "one of the"],
  [/\bréférence\b/gi, "benchmark"],
  [/\bcréatif\b/gi, "creative"],
  [/\binnovant\b/gi, "innovative"],
  [/\bsignature\b/gi, "signature"],
  [/\bstorytelling\b/gi, "storytelling"],
  [/\bbar de quartier\b/gi, "neighborhood bar"],
  [/\brooftop\b/gi, "rooftop"],
  [/\bpanoramique\b/gi, "panoramic"],
  [/\bvue\b/gi, "view"],
  [/\bouvert(e)? (jusqu'à|tard)\b/gi, "open late"],
  [/\bjusqu'à\b/gi, "until"],
  [/\btard\b/gi, "late"],
  [/\bprix (très )?abordables?\b/gi, "affordable prices"],
  [/\bprix doux\b/gi, "gentle prices"],
  [/\bprix\b/gi, "prices"],
  [/\bgourmand(e)?s?\b/gi, "gourmet"],
  [/\bconfortable\b/gi, "comfortable"],
  [/\bétonnant(e)?s?\b/gi, "surprising"],
  [/\bsecrèt(e)?s?\b/gi, "secret"],
  [/\bsérénité\b/gi, "serenity"],
  [/\bbulle de\b/gi, "bubble of"],
  [/\bdécoré(e)?s? comme\b/gi, "decorated like"],
  [/\bconcept\b/gi, "concept"],
  [/\bmixant\b/gi, "mixing"],
  [/\bparfait(e)?s? pour\b/gi, "perfect for"],
  [/\bs'installer\b/gi, "settle in"],
  [/\bse retrouver\b/gi, "gather"],
  [/\bidéal(e)?s? pour\b/gi, "ideal for"],
  [/\bavec\b/gi, "with"],
  [/\bet\b/gi, "and"],
  [/\bou\b/gi, "or"],
  [/\bsur\b/gi, "on"],
  [/\bdans\b/gi, "in"],
  [/\bun(e)?\b/gi, "a"],
  [/\bdu\b/gi, "of the"],
  [/\bde la\b/gi, "of the"],
  [/\bdes\b/gi, "of"],
  [/\bau fond de\b/gi, "at the back of"],
  [/\bau\b/gi, "at the"],
  [/\ble\b/gi, "the"],
  [/\bla\b/gi, "the"],
  [/\bles\b/gi, "the"],
  [/\btrès\b/gi, "very"],
  [/\bplus\b/gi, "more"],
  [/\bpas\b/gi, "not"],
  [/\bse\b/gi, ""],
  [/\bpour\b/gi, "for"],
  [/\ben\b/gi, "in"],
];

/** Clientele translations */
const CLIENTELE: Record<string, string> = {
  "18-30 ans, étudiants": "18-30, students",
  "18-35 ans, gamers": "18-35, gamers",
  "18-35 ans, étudiants": "18-35, students",
  "18-40 ans": "18-40",
  "18-45 ans": "18-45",
  "20-35 ans": "20-35",
  "20-40 ans": "20-40",
  "20-40 ans, amateurs de salsa/latino": "20-40, salsa/Latin lovers",
  "20-40 ans, artistes": "20-40, artists",
  "20-40 ans, communauté LGBT": "20-40, LGBT community",
  "20-40 ans, éclectique": "20-40, eclectic",
  "20-45 ans": "20-45",
  "20-45 ans, anglophones": "20-45, English speakers",
  "20-45 ans, cosmopolite": "20-45, cosmopolitan",
  "20-50 ans, anglophones, expats": "20-50, English speakers, expats",
  "22-35 ans": "22-35",
  "22-40 ans": "22-40",
  "25-35 ans": "25-35",
  "25-40 ans": "25-40",
  "25-45 ans": "25-45",
  "25-45 ans, mixte": "25-45, mixed",
  "25-50 ans": "25-50",
  "25-60 ans, amateurs de vins": "25-60, wine lovers",
  "30-50 ans": "30-50",
  "30-55 ans, haut de gamme": "30-55, upscale",
  "30-60 ans, haut de gamme": "30-60, upscale",
  "Bears, communauté LGBT": "Bears, LGBT community",
  "Tous âges, communauté LGBT": "All ages, LGBT community",
  "Tous âges, mixte": "All ages, mixed",
};

/** Translate a category */
export function translateCategory(fr: string): string {
  return CATEGORIES[fr] ?? fr;
}

/** Translate a sous-category */
export function translateSousCategory(fr: string): string {
  return SOUS_CATEGORIES[fr.toLowerCase()] ?? SOUS_CATEGORIES[fr] ?? fr;
}

/** Translate a music genre */
export function translateMusique(fr: string): string {
  return MUSIQUE[fr] ?? MUSIQUE[fr.toLowerCase()] ?? fr;
}

/** Translate a quartier */
export function translateQuartier(fr: string): string {
  return QUARTIERS[fr] ?? fr;
}

/** Translate a clientele descriptor */
export function translateClientele(fr: string): string {
  return CLIENTELE[fr] ?? fr.replace(/\bans\b/g, "y/o");
}

/** Translate a free-text description using phrase-based approach */
export function translateDescription(fr: string): string {
  if (!fr) return fr;
  let text = fr;
  for (const [pattern, replacement] of DESC_PHRASES) {
    text = text.replace(pattern, replacement);
  }
  // Clean up multiple spaces and normalize
  return text.replace(/\s{2,}/g, " ").trim();
}

/** Translate a specificite (uses same phrase engine as descriptions) */
export function translateSpecificite(fr: string): string {
  return translateDescription(fr);
}

/** Horaires day keys */
const HORAIRES_DAYS: Record<string, string> = {
  lundi: "Monday",
  mardi: "Tuesday",
  mercredi: "Wednesday",
  jeudi: "Thursday",
  vendredi: "Friday",
  samedi: "Saturday",
  dimanche: "Sunday",
};

/** Translate horaires key (day name) */
export function translateHoraireDay(fr: string): string {
  return HORAIRES_DAYS[fr.toLowerCase()] ?? fr;
}

/** Common time-related French → English for horaires text */
export function translateHoraireText(fr: string): string {
  if (!fr) return fr;
  return fr
    .replace(/\bFermé\b/gi, "Closed")
    .replace(/\bOuvert\b/gi, "Open")
    .replace(/\bjusqu'à\b/gi, "until")
    .replace(/\bet\b/gi, "and");
}

// ============================================================
// High-level translators for full Lieu / Evenement objects
// ============================================================
import type { Lieu, Evenement, Horaires } from "@/types";

/** Return a Lieu with all French text fields translated when locale is "en" */
export function translateLieu(lieu: Lieu, locale: string): Lieu {
  if (locale !== "en") return lieu;
  return {
    ...lieu,
    categorie: translateCategory(lieu.categorie),
    sous_categories: lieu.sous_categories.map(translateSousCategory),
    musique: lieu.musique.map(translateMusique),
    specificites: lieu.specificites.map(translateSpecificite),
    quartier: lieu.quartier ? translateQuartier(lieu.quartier) : null,
    clientele: lieu.clientele ? translateClientele(lieu.clientele) : null,
    description: translateDescription(lieu.description),
    resume_avis: lieu.resume_avis ? translateDescription(lieu.resume_avis) : null,
    horaires: lieu.horaires ? translateHoraires(lieu.horaires) : null,
  };
}

/** Translate all horaires fields */
function translateHoraires(h: Horaires): Horaires {
  const result: Record<string, string | undefined> = {};
  const dayKeys = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;
  for (const day of dayKeys) {
    if (h[day]) result[day] = translateHoraireText(h[day]!);
  }
  if (h.texte) result.texte = translateHoraireText(h.texte);
  return result as unknown as Horaires;
}

/** Return an Evenement with translated fields when locale is "en" */
export function translateEvent(event: Evenement, locale: string): Evenement {
  if (locale !== "en") return event;
  return {
    ...event,
    titre: translateDescription(event.titre),
    description: translateDescription(event.description),
  };
}

/** Translate a filter display label (music genres, specificites) */
export function translateFilterLabel(fr: string, locale: string): string {
  if (locale !== "en") return fr;
  return MUSIQUE[fr] ?? MUSIQUE[fr.toLowerCase()] ?? translateSpecificite(fr);
}
