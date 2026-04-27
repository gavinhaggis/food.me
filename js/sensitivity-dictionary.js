'use strict';

const SENSITIVITY_DICTIONARY = {
  // ── EU 14 allergens ────────────────────────────────────────────────────────
  milk: {
    displayName: 'Dairy & Milk',
    emoji: '🥛',
    tier: 'eu14',
    keywords: [
      'milk', 'dairy', 'lactose', 'casein', 'whey', 'lactalbumin',
      'lactoglobulin', 'ghee', 'butter', 'cream', 'cheese', 'yogurt',
      'yoghurt', 'kefir', 'quark', 'paneer', 'fromage', 'curd',
      'skimmed milk', 'whole milk', 'milk powder', 'milk solids',
      'milk fat', 'lac', 'lacto', 'E270', 'E325', 'E326', 'E327',
      'rennet', 'custard', 'ganache', 'nougat', 'lactis', 'lactalbumin',
      'lactulose', 'lacto', 'milch', 'lait', 'leche', 'buttermilk',
      'condensed milk', 'evaporated milk', 'milk protein', 'calcium caseinate',
      'sodium caseinate', 'potassium caseinate', 'hydrolysed milk protein',
      'half-fat', 'crème', 'crema', 'mascarpone', 'ricotta', 'brie',
      'camembert', 'cheddar', 'mozzarella', 'parmesan', 'parmigiano',
      'gruyère', 'gouda', 'emmental', 'stilton', 'beurre'
    ]
  },
  eggs: {
    displayName: 'Eggs',
    emoji: '🥚',
    tier: 'eu14',
    keywords: [
      'egg', 'eggs', 'albumin', 'ovalbumin', 'ovomucin', 'lysozyme',
      'mayonnaise', 'mayo', 'meringue', 'lecithin', 'egg white', 'egg yolk',
      'egg powder', 'dried egg', 'egg solids', 'globulin', 'livetin',
      'E1105', 'ovum', 'egg white powder', 'whole egg powder',
      'egg lecithin', 'egg white lysozyme', 'dried whole egg',
      'frozen egg', 'liquid egg', 'pasteurised egg', 'free-range egg',
      'oeufs', 'uova', 'huevo'
    ]
  },
  wheat: {
    displayName: 'Wheat & Gluten',
    emoji: '🌾',
    tier: 'eu14',
    keywords: [
      'wheat', 'gluten', 'flour', 'semolina', 'spelt', 'kamut', 'durum',
      'farro', 'einkorn', 'triticale', 'fu', 'seitan', 'wheat starch',
      'wheat germ', 'wheat bran', 'breadcrumbs', 'rusk', 'bulgur',
      'couscous', 'wheat protein', 'hydrolysed wheat', 'wheat flour',
      'bread flour', 'plain flour', 'self-raising flour', 'strong flour',
      'wholemeal flour', 'white flour', 'pasta', 'noodles', 'rye',
      'barley', 'oats', 'malt', 'malted', 'wheat extract',
      'modified wheat starch', 'vital wheat gluten', 'wheat fibre',
      'biscuit', 'cracker', 'crouton', 'bread', 'roll', 'bun',
      'cake', 'pastry', 'wheat maltodextrin'
    ]
  },
  peanuts: {
    displayName: 'Peanuts',
    emoji: '🥜',
    tier: 'eu14',
    keywords: [
      'peanut', 'peanuts', 'groundnut', 'groundnuts', 'arachis',
      'monkey nut', 'beer nut', 'peanut oil', 'peanut butter',
      'peanut flour', 'peanut protein', 'peanut extract',
      'arachis oil', 'mixed nuts', 'cacahuète', 'erdnuss'
    ]
  },
  tree_nuts: {
    displayName: 'Tree Nuts',
    emoji: '🌰',
    tier: 'eu14',
    keywords: [
      'almond', 'almonds', 'hazelnut', 'hazelnuts', 'walnut', 'walnuts',
      'cashew', 'cashews', 'pecan', 'pecans', 'brazil nut', 'brazil nuts',
      'pistachio', 'pistachios', 'macadamia', 'macadamias',
      'nut', 'nuts', 'marzipan', 'praline', 'frangipane', 'frangipani',
      'nut oil', 'mixed nuts', 'nut paste', 'almond milk', 'almond flour',
      'almond extract', 'almond oil', 'hazelnut paste', 'hazelnut oil',
      'walnut oil', 'pecan oil', 'pistachio paste', 'nut butter',
      'chestnut', 'chestnuts', 'pine nut', 'pine nuts', 'pinenut',
      'pinenuts', 'coconut', 'coconut oil', 'coconut milk', 'coconut cream',
      'desiccated coconut', 'shredded coconut', 'coconut flour',
      'gianduja', 'noisette', 'noix', 'mandel', 'nuss'
    ]
  },
  fish: {
    displayName: 'Fish',
    emoji: '🐟',
    tier: 'eu14',
    keywords: [
      'fish', 'cod', 'haddock', 'salmon', 'tuna', 'trout', 'bass',
      'plaice', 'anchovy', 'anchovies', 'sardine', 'sardines', 'pisces',
      'fish sauce', 'worcestershire sauce', 'fish stock', 'fish oil',
      'caviar', 'roe', 'herring', 'mackerel', 'halibut', 'flounder',
      'sole', 'tilapia', 'pollock', 'sea bass', 'snapper', 'swordfish',
      'mahi-mahi', 'carp', 'pike', 'perch', 'catfish', 'fish extract',
      'fish gelatin', 'fish powder', 'fish protein', 'fish broth',
      'hydrolysed fish protein', 'omega-3 fish oil', 'E471 (fish)',
      'poisson', 'pesce', 'fisch'
    ]
  },
  shellfish: {
    displayName: 'Shellfish & Crustaceans',
    emoji: '🦐',
    tier: 'eu14',
    keywords: [
      'prawn', 'prawns', 'shrimp', 'shrimps', 'crab', 'lobster',
      'crayfish', 'langoustine', 'langoustines', 'scampi', 'crustacean',
      'crustaceans', 'shellfish', 'barnacle', 'krill', 'langosta',
      'crevette', 'gambas', 'gamberetti'
    ]
  },
  molluscs: {
    displayName: 'Molluscs',
    emoji: '🦑',
    tier: 'eu14',
    keywords: [
      'squid', 'octopus', 'mussel', 'mussels', 'oyster', 'oysters',
      'scallop', 'scallops', 'clam', 'clams', 'snail', 'snails',
      'abalone', 'mollusc', 'molluscs', 'mollusk', 'mollusks',
      'cephalopod', 'bivalve', 'whelk', 'cockle', 'limpet', 'periwinkle',
      'calamari', 'calamar', 'ink', 'squid ink', 'cuttlefish',
      'palourde', 'coquille'
    ]
  },
  soy: {
    displayName: 'Soy & Soya',
    emoji: '🫘',
    tier: 'eu14',
    keywords: [
      'soy', 'soya', 'soybean', 'soybeans', 'tofu', 'miso', 'tempeh',
      'edamame', 'soy sauce', 'tamari', 'textured vegetable protein',
      'TVP', 'soy lecithin', 'soya lecithin', 'soy milk', 'soya milk',
      'soy protein', 'soya protein', 'hydrolysed soy protein',
      'hydrolysed soya protein', 'soy flour', 'soya flour',
      'soy oil', 'soya oil', 'soybean oil', 'soy extract', 'soya extract',
      'soy concentrate', 'soy isolate', 'natto', 'okara', 'doenjang',
      'gochujang', 'hoisin', 'shoyu', 'soja', 'sojabohne'
    ]
  },
  celery: {
    displayName: 'Celery',
    emoji: '🥬',
    tier: 'eu14',
    keywords: [
      'celery', 'celeriac', 'celery seed', 'celery seeds', 'celery salt',
      'celery oil', 'celery extract', 'celery powder', 'celery root',
      'celery leaf', 'celery juice', 'céleri', 'sellerie'
    ]
  },
  mustard: {
    displayName: 'Mustard',
    emoji: '🌿',
    tier: 'eu14',
    keywords: [
      'mustard', 'mustard seed', 'mustard seeds', 'mustard oil',
      'mustard powder', 'mustard leaf', 'mustard flour', 'mustard extract',
      'mustard greens', 'mustard plant', 'yellow mustard', 'dijon',
      'wholegrain mustard', 'french mustard', 'english mustard',
      'moutarde', 'senf', 'sinapis'
    ]
  },
  sesame: {
    displayName: 'Sesame',
    emoji: '🫙',
    tier: 'eu14',
    keywords: [
      'sesame', 'sesame seed', 'sesame seeds', 'sesame oil', 'tahini',
      'til', 'gingelly', 'benne', 'sesame paste', 'sesame flour',
      'sesame extract', 'sesame powder', 'black sesame', 'white sesame',
      'sésame', 'sésamo', 'sesam'
    ]
  },
  sulphites: {
    displayName: 'Sulphites',
    emoji: '⚗️',
    tier: 'eu14',
    keywords: [
      'sulphite', 'sulphites', 'sulfite', 'sulfites', 'sulphur dioxide',
      'sulfur dioxide', 'E220', 'E221', 'E222', 'E223', 'E224', 'E225',
      'E226', 'E227', 'E228', 'metabisulphite', 'metabisulfite',
      'sodium metabisulphite', 'potassium metabisulphite',
      'sodium bisulphite', 'potassium bisulphite', 'calcium sulphite',
      'sulphurous acid', 'sulfurous acid', 'sulfuring agent'
    ]
  },
  lupin: {
    displayName: 'Lupin',
    emoji: '🌸',
    tier: 'eu14',
    keywords: [
      'lupin', 'lupine', 'lupin flour', 'lupine flour', 'lupin seed',
      'lupin seeds', 'lupin bean', 'lupin beans', 'lupin protein',
      'lupin extract', 'lupin flakes', 'lupinus', 'lupin meal'
    ]
  },

  // ── Custom sensitivities ───────────────────────────────────────────────────
  apple: {
    displayName: 'Apple',
    emoji: '🍎',
    tier: 'custom',
    keywords: [
      'apple', 'malus domestica', 'apple juice', 'apple cider',
      'cider vinegar', 'apple extract', 'apple powder', 'applesauce',
      'dried apple', 'apple concentrate', 'malic acid', 'E296',
      'apple flavour', 'apple flavoring', 'apple pieces', 'diced apple',
      'apple puree', 'apple peel', 'toffee apple', 'pomme'
    ]
  },
  citrus: {
    displayName: 'Citrus',
    emoji: '🍋',
    tier: 'custom',
    keywords: [
      'orange', 'lemon', 'lime', 'grapefruit', 'citrus', 'citric acid',
      'E330', 'limonene', 'orange peel', 'lemon juice', 'orange juice',
      'citrus extract', 'bergamot', 'mandarin', 'clementine', 'tangerine',
      'yuzu', 'citrus oil', 'lemon zest', 'orange zest', 'lemon peel',
      'lime juice', 'grapefruit juice', 'lemon oil', 'orange oil',
      'lime oil', 'citrus fibre', 'citrus fiber', 'orange extract',
      'lemon extract', 'lime extract', 'citrus flavour', 'lemon flavour',
      'orange flavour', 'pomelo', 'kumquat', 'ugli fruit',
      'acide citrique', 'Zitrone', 'naranja'
    ]
  },
  tomato: {
    displayName: 'Tomato',
    emoji: '🍅',
    tier: 'custom',
    keywords: [
      'tomato', 'tomatoes', 'tomato paste', 'tomato puree', 'tomato sauce',
      'tomato powder', 'tomato extract', 'tomato juice', 'sun-dried tomato',
      'sundried tomato', 'passata', 'ketchup', 'lycopene', 'E160d',
      'tomato concentrate', 'tomato flavour', 'tomato flakes',
      'tomato pieces', 'tomato solids', 'crushed tomato', 'cherry tomato',
      'plum tomato', 'tinned tomato', 'canned tomato', 'tomate', 'pomodoro'
    ]
  },
  potato: {
    displayName: 'Potato',
    emoji: '🥔',
    tier: 'custom',
    keywords: [
      'potato', 'potatoes', 'potato starch', 'potato flour', 'potato protein',
      'potato extract', 'potato flakes', 'potato powder', 'potato granules',
      'potato chips', 'crisps', 'mashed potato', 'modified starch',
      'starch', 'solanum tuberosum', 'dehydrated potato', 'instant potato',
      'potato peel', 'potato fibre', 'kartoffel', 'patata'
    ]
  },
  pepper: {
    displayName: 'Peppers & Chilli',
    emoji: '🌶️',
    tier: 'custom',
    keywords: [
      'pepper', 'peppers', 'bell pepper', 'capsicum', 'chilli', 'chili',
      'paprika', 'cayenne', 'jalapeño', 'jalapeno', 'habanero', 'capsaicin',
      'E160c', 'chilli powder', 'chili powder', 'red pepper', 'green pepper',
      'yellow pepper', 'hot sauce', 'tabasco', 'sriracha', 'chipotle',
      'ancho', 'guajillo', 'pasilla', 'serrano', 'scotch bonnet',
      'pepper flakes', 'dried chilli', 'chilli flakes', 'pimiento',
      'piment', 'peperone', 'paprika extract', 'pepper extract',
      'sweet pepper', 'chilli extract'
    ]
  },
  aubergine: {
    displayName: 'Aubergine',
    emoji: '🍆',
    tier: 'custom',
    keywords: [
      'aubergine', 'eggplant', 'brinjal', 'solanum melongena',
      'melanzane', 'baingan', 'berenjena', 'aubergine extract'
    ]
  },
  onion: {
    displayName: 'Onion',
    emoji: '🧅',
    tier: 'custom',
    keywords: [
      'onion', 'onions', 'onion powder', 'onion salt', 'onion extract',
      'onion flakes', 'onion juice', 'dried onion', 'fried onion',
      'caramelised onion', 'caramelized onion', 'roasted onion',
      'shallot', 'shallots', 'spring onion', 'green onion', 'scallion',
      'cipolla', 'oignon', 'Zwiebel', 'onion granules', 'onion pieces'
    ]
  },
  garlic: {
    displayName: 'Garlic',
    emoji: '🧄',
    tier: 'custom',
    keywords: [
      'garlic', 'garlic powder', 'garlic salt', 'garlic extract',
      'garlic oil', 'dried garlic', 'roasted garlic', 'allicin',
      'garlic granules', 'garlic flakes', 'garlic puree', 'garlic paste',
      'garlic butter', 'garlic juice', 'black garlic', 'smoked garlic',
      'allium sativum', 'ail', 'aglio', 'Knoblauch'
    ]
  },
  leek: {
    displayName: 'Leek',
    emoji: '🥬',
    tier: 'custom',
    keywords: [
      'leek', 'leeks', 'wild leek', 'ramp', 'ramps', 'allium porrum',
      'poireau', 'porro', 'Lauch', 'leek extract', 'leek powder'
    ]
  },
  broccoli: {
    displayName: 'Broccoli',
    emoji: '🥦',
    tier: 'custom',
    keywords: [
      'broccoli', 'calabrese', 'broccoli extract', 'broccoli powder',
      'tenderstem', 'broccolini', 'sprouting broccoli', 'brócoli',
      'brocoli', 'broccoletti'
    ]
  },
  cabbage: {
    displayName: 'Cabbage',
    emoji: '🥬',
    tier: 'custom',
    keywords: [
      'cabbage', 'white cabbage', 'red cabbage', 'savoy', 'savoy cabbage',
      'coleslaw', 'sauerkraut', 'kimchi', 'pointed cabbage', 'hispi',
      'spring cabbage', 'sweetheart cabbage', 'brassica oleracea',
      'chou', 'cavolo', 'Kohl'
    ]
  },
  cauliflower: {
    displayName: 'Cauliflower',
    emoji: '🥦',
    tier: 'custom',
    keywords: [
      'cauliflower', 'cauliflower rice', 'cauliflower powder',
      'cauliflower flour', 'cauli', 'coliflor', 'chou-fleur', 'cavolfiore'
    ]
  },
  kale: {
    displayName: 'Kale',
    emoji: '🥬',
    tier: 'custom',
    keywords: [
      'kale', 'curly kale', 'cavolo nero', 'lacinato kale', 'tuscan kale',
      'dinosaur kale', 'black kale', 'kale powder', 'kale extract',
      'kale chips', 'kale crisp', 'brassica napus'
    ]
  },
  banana: {
    displayName: 'Banana',
    emoji: '🍌',
    tier: 'custom',
    keywords: [
      'banana', 'banana powder', 'banana extract', 'banana flour',
      'musa', 'plantain', 'banana chips', 'dried banana', 'banana flakes',
      'banana flavour', 'banana oil', 'banana peel', 'green banana',
      'platano', 'banane'
    ]
  },
  avocado: {
    displayName: 'Avocado',
    emoji: '🥑',
    tier: 'custom',
    keywords: [
      'avocado', 'avocado oil', 'guacamole', 'persea americana',
      'avocado extract', 'avocado powder', 'aguacate', 'avocat'
    ]
  },
  kiwi: {
    displayName: 'Kiwi',
    emoji: '🥝',
    tier: 'custom',
    keywords: [
      'kiwi', 'kiwifruit', 'actinidia', 'chinese gooseberry',
      'kiwi extract', 'kiwi powder', 'kiwi juice', 'actinidia deliciosa'
    ]
  },
  peach: {
    displayName: 'Peach',
    emoji: '🍑',
    tier: 'custom',
    keywords: [
      'peach', 'nectarine', 'prunus persica', 'peach extract',
      'peach juice', 'peach flavour', 'peach powder', 'dried peach',
      'white peach', 'yellow peach', 'peche', 'pesca'
    ]
  },
  plum: {
    displayName: 'Plum',
    emoji: '🍑',
    tier: 'custom',
    keywords: [
      'plum', 'plums', 'prune', 'prunes', 'prunus domestica',
      'plum juice', 'plum extract', 'plum sauce', 'dried plum',
      'plum powder', 'damson', 'greengage', 'mirabelle', 'quetsche'
    ]
  },
  cherry: {
    displayName: 'Cherry',
    emoji: '🍒',
    tier: 'custom',
    keywords: [
      'cherry', 'cherries', 'prunus avium', 'prunus cerasus',
      'maraschino', 'black cherry', 'sour cherry', 'morello cherry',
      'cherry juice', 'cherry extract', 'cherry flavour', 'glacé cherry',
      'cerise', 'ciliegia', 'Kirsche'
    ]
  },
  apricot: {
    displayName: 'Apricot',
    emoji: '🍑',
    tier: 'custom',
    keywords: [
      'apricot', 'apricots', 'prunus armeniaca', 'apricot juice',
      'apricot extract', 'dried apricot', 'apricot jam', 'apricot kernel',
      'apricot powder', 'abricot', 'albicocca'
    ]
  },
  strawberry: {
    displayName: 'Strawberry',
    emoji: '🍓',
    tier: 'custom',
    keywords: [
      'strawberry', 'strawberries', 'strawberry extract', 'fragaria',
      'strawberry juice', 'strawberry flavour', 'strawberry powder',
      'dried strawberry', 'freeze-dried strawberry', 'strawberry puree',
      'fraise', 'fragola', 'Erdbeere'
    ]
  },
  mango: {
    displayName: 'Mango',
    emoji: '🥭',
    tier: 'custom',
    keywords: [
      'mango', 'mango powder', 'mango extract', 'mangifera indica', 'amchur',
      'amchoor', 'dried mango', 'mango juice', 'mango puree',
      'mango flavour', 'mango pieces', 'mangue', 'mango chutney'
    ]
  },
  pineapple: {
    displayName: 'Pineapple',
    emoji: '🍍',
    tier: 'custom',
    keywords: [
      'pineapple', 'ananas', 'pineapple juice', 'pineapple extract',
      'bromelain', 'pineapple powder', 'dried pineapple', 'pineapple puree',
      'pineapple flavour', 'pineapple pieces', 'ananas comosus'
    ]
  },
  cinnamon: {
    displayName: 'Cinnamon',
    emoji: '🌿',
    tier: 'custom',
    keywords: [
      'cinnamon', 'cassia', 'cinnamomum', 'cinnamon extract', 'cinnamon oil',
      'cinnamon powder', 'cinnamon stick', 'ground cinnamon', 'cinnamon bark',
      'true cinnamon', 'ceylon cinnamon', 'cannelle', 'zimt', 'canela'
    ]
  },
  ginger: {
    displayName: 'Ginger',
    emoji: '🫚',
    tier: 'custom',
    keywords: [
      'ginger', 'ginger root', 'ginger powder', 'ginger extract',
      'zingiber', 'ginger oil', 'ground ginger', 'fresh ginger',
      'dried ginger', 'crystallised ginger', 'stem ginger', 'pickled ginger',
      'ginger beer', 'ginger ale', 'ginger juice', 'galangal', 'Ingwer',
      'gingembre', 'jengibre', 'zenzero'
    ]
  },
  caffeine: {
    displayName: 'Caffeine',
    emoji: '☕',
    tier: 'custom',
    keywords: [
      'caffeine', 'coffee', 'espresso', 'guarana', 'matcha', 'green tea',
      'black tea', 'yerba mate', 'cola nut', 'kola nut', 'tea extract',
      'coffee extract', 'coffee flavour', 'coffee beans', 'instant coffee',
      'decaf', 'decaffeinated', 'café', 'caffè', 'koffein',
      'coffeina', 'theine', 'theophylline', 'theobromine',
      'chocolate', 'dark chocolate', 'milk chocolate', 'cocoa',
      'cacao', 'energy drink'
    ]
  },
  alcohol: {
    displayName: 'Alcohol',
    emoji: '🍷',
    tier: 'custom',
    keywords: [
      'alcohol', 'ethanol', 'wine', 'beer', 'spirits', 'fermented',
      'malt', 'ale', 'lager', 'cider', 'whisky', 'whiskey', 'vodka',
      'rum', 'gin', 'brandy', 'champagne', 'prosecco', 'sherry',
      'port', 'sake', 'mead', 'stout', 'porter', 'liqueur',
      'wine vinegar', 'red wine vinegar', 'white wine vinegar',
      'balsamic', 'marsala', 'madeira', 'vermouth', 'absinthe',
      'ethyl alcohol', 'grain alcohol', 'may contain alcohol'
    ]
  },
  corn: {
    displayName: 'Corn & Maize',
    emoji: '🌽',
    tier: 'custom',
    keywords: [
      'corn', 'maize', 'cornstarch', 'corn starch', 'corn flour',
      'cornmeal', 'corn syrup', 'high fructose corn syrup', 'dextrose',
      'polenta', 'hominy', 'grits', 'popcorn', 'zea mays',
      'corn extract', 'corn protein', 'corn oil', 'corn germ',
      'corn bran', 'corn fibre', 'corn fiber', 'modified corn starch',
      'waxy corn starch', 'maize starch', 'maize flour', 'cornflour',
      'masa', 'tortilla', 'corn chip', 'corn crisp', 'mais', 'maíz'
    ]
  },
  chestnut: {
    displayName: 'Chestnut',
    emoji: '🌰',
    tier: 'custom',
    keywords: [
      'chestnut', 'chestnuts', 'castanea', 'chestnut flour', 'chestnut puree',
      'marron', 'marrons glacés', 'roasted chestnut', 'chestnut extract',
      'sweet chestnut', 'châtaigne'
    ]
  },
  aged_cheese: {
    displayName: 'Aged Cheese',
    emoji: '🧀',
    tier: 'custom',
    keywords: [
      'aged cheese', 'parmesan', 'parmigiano', 'cheddar', 'gruyère',
      'emmental', 'gouda', 'manchego', 'pecorino', 'comté',
      'camembert', 'brie', 'stilton', 'roquefort', 'gorgonzola',
      'blue cheese', 'mature cheese', 'hard cheese', 'ripened cheese'
    ]
  },
  vinegar: {
    displayName: 'Vinegar',
    emoji: '🫙',
    tier: 'custom',
    keywords: [
      'vinegar', 'acetic acid', 'E260', 'wine vinegar', 'malt vinegar',
      'cider vinegar', 'white vinegar', 'rice vinegar', 'balsamic vinegar',
      'sherry vinegar', 'red wine vinegar', 'white wine vinegar',
      'spirit vinegar', 'distilled vinegar', 'aceto', 'vinaigre', 'essig'
    ]
  },
  fig: {
    displayName: 'Fig',
    emoji: '🫐',
    tier: 'custom',
    keywords: [
      'fig', 'figs', 'ficus carica', 'dried fig', 'fig extract',
      'fig juice', 'fig paste', 'fig jam', 'figue', 'fico'
    ]
  },
  papaya: {
    displayName: 'Papaya',
    emoji: '🥭',
    tier: 'custom',
    keywords: [
      'papaya', 'pawpaw', 'carica papaya', 'papain', 'papaya extract',
      'papaya juice', 'papaya powder', 'dried papaya', 'papaye'
    ]
  },
  passion_fruit: {
    displayName: 'Passion Fruit',
    emoji: '🍈',
    tier: 'custom',
    keywords: [
      'passion fruit', 'passionfruit', 'passiflora', 'maracuya',
      'granadilla', 'passion flower', 'passion fruit extract',
      'passion fruit juice', 'fruit de la passion'
    ]
  }
};

const SENSITIVITY_GROUPS = {
  nightshades: {
    displayName: 'Nightshades',
    emoji: '🍆',
    description: 'Nightshade vegetables contain solanine alkaloids which some people find hard to tolerate. Common nightshades include tomato, potato, pepper, and aubergine.',
    learnMoreText: 'Solanine and other glycoalkaloids in nightshades can cause digestive discomfort in sensitive individuals. Cooking reduces but doesn\'t eliminate these compounds.',
    memberKeys: ['tomato', 'potato', 'pepper', 'aubergine'],
    suggestThreshold: 2
  },
  alliums: {
    displayName: 'Alliums',
    emoji: '🧅',
    description: 'Alliums — like onion, garlic, and leek — are high in fructans, a type of FODMAP that can cause bloating and discomfort in some people.',
    learnMoreText: 'Fructans in alliums resist digestion in the small intestine and ferment in the colon. Cooking can reduce fructan content, and garlic-infused oils are often tolerated better.',
    memberKeys: ['onion', 'garlic', 'leek'],
    suggestThreshold: 2
  },
  brassicas: {
    displayName: 'Brassicas',
    emoji: '🥦',
    description: 'Brassica vegetables — including broccoli, cabbage, cauliflower, kale, and mustard — contain glucosinolates that may cause digestive symptoms in sensitive individuals.',
    learnMoreText: 'Glucosinolates break down into compounds that can irritate the gut. Cooking, especially boiling, reduces glucosinolate content significantly.',
    memberKeys: ['broccoli', 'cabbage', 'cauliflower', 'kale', 'mustard'],
    suggestThreshold: 2
  },
  stone_fruits: {
    displayName: 'Stone Fruits',
    emoji: '🍑',
    description: 'Stone fruits — peach, plum, cherry, and apricot — are high in salicylates and can trigger cross-reactions in people sensitive to aspirin or other salicylates.',
    learnMoreText: 'Stone fruits share similar proteins that can cause oral allergy syndrome in people with pollen allergies, particularly birch pollen. Cooking often reduces reactivity.',
    memberKeys: ['peach', 'plum', 'cherry', 'apricot'],
    suggestThreshold: 2
  },
  citrus_family: {
    displayName: 'Citrus Family',
    emoji: '🍋',
    description: 'Citrus fruits — orange, lemon, lime, grapefruit — share citric acid and other compounds that some people are sensitive to.',
    learnMoreText: 'Citrus sensitivity can manifest as acid reflux, mouth ulcers, or skin reactions. The peel and zest contain higher concentrations of reactive compounds than the juice.',
    memberKeys: ['citrus'],
    suggestThreshold: 1
  },
  fodmaps: {
    displayName: 'High-FODMAP Foods',
    emoji: '🫁',
    description: 'FODMAPs are fermentable carbohydrates that can cause digestive symptoms in people with IBS or other gut sensitivities. Your flagged foods include several high-FODMAP items.',
    learnMoreText: 'FODMAP stands for Fermentable Oligosaccharides, Disaccharides, Monosaccharides And Polyols. A low-FODMAP diet is often recommended by dietitians for IBS management.',
    memberKeys: ['onion', 'garlic', 'wheat', 'apple', 'milk', 'soy'],
    suggestThreshold: 3
  },
  histamine: {
    displayName: 'Histamine-Rich Foods',
    emoji: '🧬',
    description: 'These foods are high in histamine or trigger histamine release, which can cause symptoms similar to an allergic reaction in people with histamine intolerance.',
    learnMoreText: 'Histamine intolerance differs from a true allergy — it\'s about quantity and the body\'s ability to break down histamine. DAO enzyme supplements and a low-histamine diet can help.',
    memberKeys: ['aged_cheese', 'alcohol', 'vinegar', 'tomato', 'aubergine'],
    suggestThreshold: 2
  },
  latex_fruit_syndrome: {
    displayName: 'Latex-Fruit Syndrome',
    emoji: '🌿',
    description: 'Some people with latex allergy also react to certain fruits due to cross-reactive proteins. Common cross-reactive fruits include avocado, banana, kiwi, chestnut, and mango.',
    learnMoreText: 'Latex-fruit syndrome occurs because latex and certain fruit proteins share similar structures. If you have a known latex allergy, these fruits may also cause reactions.',
    memberKeys: ['avocado', 'banana', 'kiwi', 'chestnut', 'mango'],
    suggestThreshold: 2
  }
};
