const RPG_CLASSES = {
  warrior: { name: 'فارس', emoji: '⚔️', bonus: { gold: 1.2, xp: 1.0, hp: 1.5, atk: 1.3 }, desc: 'قوة جسدية ودفاع عالٍ (+50% HP, +30% ATK)', color: 0xE74C3C },
  mage:    { name: 'ساحر', emoji: '🔮', bonus: { gold: 1.0, xp: 1.3, hp: 0.8, atk: 2.0 }, desc: 'هجوم سحري فتاك (+100% ATK, +30% XP)', color: 0x9B59B6 },
  hunter:  { name: 'قناص', emoji: '🏹', bonus: { gold: 1.3, xp: 1.1, hp: 1.0, atk: 1.6 }, desc: 'رشاقة وسرعة (+60% ATK, +30% Gold)', color: 0x2ECC71 },
  healer:  { name: 'معالج', emoji: '✨', bonus: { gold: 1.0, xp: 1.5, hp: 1.2, heal: 2.0 }, desc: 'قوة شفاء هائلة (+100% Heal, +50% XP)', color: 0x1ABC9C },
  assassin:{ name: 'سفاح', emoji: '🗡️', bonus: { gold: 1.5, xp: 1.2, hp: 0.9, atk: 2.5, critChance: 0.3 }, desc: 'ضرر حرج هائل (+150% ATK, +30% Crit)', color: 0x2C3E50 }
};

const RPG_RACES = {
  human: {
    name: 'بشري', emoji: '🧑', bonus: { hp: 1.1, atk: 1.1, gold: 1.1 },
    desc: 'متوازن وطموح في كسب المال',
    skills: [{ id: 'focus', name: 'التركيز الذهني', desc: 'زيادة الضرر القادم بنسبة 60%', type: 'buff', multiplier: 1.6, emoji: '🧘' }]
  },
  elf: {
    name: 'إلف', emoji: '🧝', bonus: { hp: 1.0, atk: 1.4, xp: 1.2 },
    desc: 'ذكاء حاد وسرعة تعلم',
    skills: [{ id: 'wind_arrow', name: 'سهم الرياح', desc: 'ضربة سريعة تتجاهل 30% من دفاع الوحش (1.8x)', type: 'attack', multiplier: 1.8, emoji: '🏹' }]
  },
  orc: {
    name: 'أورك', emoji: '💪', bonus: { hp: 1.8, atk: 1.2, gold: 0.9 },
    desc: 'تحمل جبار وصحة عالية جداً',
    skills: [{ id: 'berserk', name: 'الغضب العارم', desc: 'تضحية 10% صحة مقابل ضربة (2.5x)', type: 'attack', multiplier: 2.5, selfDamage: 0.1, emoji: '💢' }]
  },
  demon: {
    name: 'شيطان', emoji: '😈', bonus: { hp: 0.9, atk: 1.8, xp: 1.1 },
    desc: 'قوة تدميرية مستمدة من الظلام',
    skills: [{ id: 'soul_drain', name: 'امتصاص الأرواح', desc: 'سحب صحة من الوحش وتحويلها لك (1.5x + 20% lifesteal)', type: 'lifesteal', multiplier: 1.5, heal: 0.2, emoji: '🩸' }]
  },
  dwarf: {
    name: 'قزم', emoji: '🧔', bonus: { hp: 1.4, atk: 1.3, gold: 1.5 },
    desc: 'خبير في المعادن والكنوز',
    skills: [{ id: 'gold_strike', name: 'ضربة الثراء', desc: 'ضربة قوية (1.4x) تزيد الذهب المكتسب 50%', type: 'attack', multiplier: 1.4, goldBonus: 0.5, emoji: '💰' }]
  },
  shadow: {
    name: 'ظلام (مستيقظ)', emoji: '🌑', bonus: { hp: 1.2, atk: 2.2, xp: 1.3 },
    desc: '⭐ جنس نادر — قوة جيش الظلال + استخلاص الظلال تلقائياً',
    skills: [
      { id: 'shadow_extraction', name: 'استخلاص الظل', desc: 'استخلص ظل الوحش المهزوم فوراً (نجاح 80%)', type: 'shadow_extract', emoji: '🌑' },
      { id: 'arise', name: 'قُمْ!', desc: 'استدعِ ظلاً من جيشك لضربة مزدوجة (2x)', type: 'attack', multiplier: 2.0, emoji: '⚫' }
    ],
    rare: true
  }
};

// Solo Leveling inspired rank system
const HUNTER_RANKS = [
  { rank: 'E', name: 'صائد مبتدئ', minWins: 0,   minLevel: 1,  emoji: '⬜', color: 0x95A5A6 },
  { rank: 'D', name: 'صائد ضعيف',  minWins: 5,   minLevel: 10, emoji: '🟩', color: 0x2ECC71 },
  { rank: 'C', name: 'صائد متوسط', minWins: 15,  minLevel: 25, emoji: '🟦', color: 0x3498DB },
  { rank: 'B', name: 'صائد متقدم', minWins: 30,  minLevel: 40, emoji: '🟪', color: 0x9B59B6 },
  { rank: 'A', name: 'صائد قوي',   minWins: 60,  minLevel: 60, emoji: '🟨', color: 0xF1C40F },
  { rank: 'S', name: 'صائد نخبة',  minWins: 100, minLevel: 80, emoji: '🟧', color: 0xE67E22 },
  { rank: 'SS','name': 'أسطوري',   minWins: 200, minLevel: 90, emoji: '🔴', color: 0xE74C3C },
  { rank: 'SSS', name: 'ملك الظلام', minWins: 500, minLevel: 100, emoji: '⭐', color: 0x8E44AD }
];

function getHunterRank(wins, level) {
  let best = HUNTER_RANKS[0];
  for (const r of HUNTER_RANKS) {
    if (wins >= r.minWins && level >= r.minLevel) best = r;
  }
  return best;
}

// ===== STAGE IMAGES (Solo Leveling Inspired) — using wikia CDN =====
const STAGE_IMAGES = {
  1: 'https://static.wikia.nocookie.net/sololeveling/images/e/ef/Casaka.png',
  2: 'https://static.wikia.nocookie.net/sololeveling/images/d/df/Cerberus.png',
  3: 'https://static.wikia.nocookie.net/sololeveling/images/3/38/Flame_Giant.png',
  4: 'https://static.wikia.nocookie.net/sololeveling/images/d/d0/Kamish.png',
  5: 'https://static.wikia.nocookie.net/sololeveling/images/7/72/Antares.png',
};

// ===== MONSTER IMAGES (Anime RPG Style) =====
const MONSTER_IMAGES = {
  // Stage 1 - Spider / Weak monsters
  spider:     'https://static.wikia.nocookie.net/sololeveling/images/e/ef/Casaka.png',
  goblin:     'https://static.wikia.nocookie.net/sololeveling/images/8/8c/High_Goblin.png',
  shadow_elf: 'https://static.wikia.nocookie.net/sololeveling/images/3/36/Iron.png',
  beast:      'https://static.wikia.nocookie.net/sololeveling/images/5/5a/Lizard_Man.png',
  // Stage 2
  orc:        'https://static.wikia.nocookie.net/sololeveling/images/d/df/Cerberus.png',
  ghoul:      'https://static.wikia.nocookie.net/sololeveling/images/2/27/Sand_Giant.png',
  // Stage 3
  dragon:     'https://static.wikia.nocookie.net/sololeveling/images/3/38/Flame_Giant.png',
  guardian:   'https://static.wikia.nocookie.net/sololeveling/images/8/84/Ice_Elf_Archer.png',
  // Stage 4
  titan:      'https://static.wikia.nocookie.net/sololeveling/images/d/d0/Kamish.png',
  colossus:   'https://static.wikia.nocookie.net/sololeveling/images/6/68/Demon_Marshal_Baruka.png',
  // Stage 5
  void:       'https://static.wikia.nocookie.net/sololeveling/images/f/f8/Ant_King.png',
  demon:      'https://static.wikia.nocookie.net/sololeveling/images/7/7d/Querehsha.png',
  // Fallback
  generic:    'https://static.wikia.nocookie.net/sololeveling/images/b/bc/Baruka.png'
};

// ===== BOSS IMAGES (Solo Leveling Style) =====
const BOSS_IMAGES = {
  1: 'https://static.wikia.nocookie.net/sololeveling/images/4/4d/Architect.png',
  2: 'https://static.wikia.nocookie.net/sololeveling/images/f/f8/Ant_King.png',
  3: 'https://static.wikia.nocookie.net/sololeveling/images/d/d0/Kamish.png',
  4: 'https://static.wikia.nocookie.net/sololeveling/images/6/68/Demon_Marshal_Baruka.png',
  5: 'https://static.wikia.nocookie.net/sololeveling/images/7/72/Antares.png',
  generic: 'https://static.wikia.nocookie.net/sololeveling/images/4/4d/Architect.png'
};

// ===== STAGES =====
const STAGES = [
  { id: 1, name: '🕷️ كهف العناكب المظلم', minLevel: 0,  multiplier: 1.2,  image: STAGE_IMAGES[1], gateRank: 'E', bgColor: 0x2C3E50 },
  { id: 2, name: '👹 مغارة الغيلان الممسوسة', minLevel: 10, multiplier: 1.8, image: STAGE_IMAGES[2], gateRank: 'D', bgColor: 0x1A5276 },
  { id: 3, name: '🐉 وادي التنانين القديمة',  minLevel: 25, multiplier: 3.0, image: STAGE_IMAGES[3], gateRank: 'C', bgColor: 0x7B241C },
  { id: 4, name: '🦁 عرين الوحوش العملاقة',  minLevel: 50, multiplier: 5.0, image: STAGE_IMAGES[4], gateRank: 'B', bgColor: 0x4A235A },
  { id: 5, name: '🌑 بوابة الجحيم المستعر',  minLevel: 80, multiplier: 8.5, image: STAGE_IMAGES[5], gateRank: 'A', bgColor: 0x1C2833 },
  ...Array.from({ length: 45 }, (_, i) => ({
    id: i + 6,
    name: `⭐ البوابة الأسطورية ${i + 6}`,
    minLevel: (i + 5) * 10,
    multiplier: 10 + (i * 2),
    image: STAGE_IMAGES[5],
    gateRank: i < 10 ? 'S' : i < 25 ? 'SS' : 'SSS',
    bgColor: 0x1C2833
  }))
];

// ===== ENEMIES (Solo Leveling Inspired) =====
const ENEMIES = [
  // Stage 1: كهف العناكب
  {
    name: 'عنكبوت الدم الأحمر',   emoji: '🕷️', hp: 55,  atk: 22, stage: 1,
    image: MONSTER_IMAGES.spider,   shadowRank: 'E', xpReward: 20, goldReward: [30, 60],
    description: 'مخلوق من عالم الأبعاد، يفرز سماً يشلّ الحركة.',
    moves: [
      { name: '💉 حقنة السم', damage: 1.3, log: '🕷️ أطلق العنكبوت خيطاً مسموماً ولف به ذراعك!' },
      { name: '🕸️ شبكة الفخ',  damage: 1.1, log: '🕸️ حاصرك العنكبوت بشبكته اللزجة — أبطأ حركتك!' }
    ]
  },
  {
    name: 'الغول الصغير',          emoji: '👾', hp: 65,  atk: 18, stage: 1,
    image: MONSTER_IMAGES.goblin,   shadowRank: 'E', xpReward: 15, goldReward: [20, 50],
    description: 'غول مبتدئ يسكن الكهوف الأقل خطورة.',
    moves: [
      { name: '👊 نهشة سريعة', damage: 1.2, log: '👾 هجم الغول عليك بأظافره الصدئة!' }
    ]
  },
  {
    name: 'متربص الظلال',          emoji: '👥', hp: 50,  atk: 28, stage: 1,
    image: MONSTER_IMAGES.shadow_elf, shadowRank: 'E', xpReward: 25, goldReward: [40, 80],
    description: 'كائن يتخفى بالظلام ويهاجم من الخلف.',
    moves: [
      { name: '🌑 ضربة من الخلف', damage: 1.6, log: '🌑 ظهر المتربص فجأة من خلفك ووجه ضربة غادرة!' }
    ]
  },
  {
    name: 'الوحش الحارس',          emoji: '🦎', hp: 60,  atk: 20, stage: 1,
    image: MONSTER_IMAGES.beast,    shadowRank: 'E', xpReward: 18, goldReward: [25, 55],
    description: 'حارس بوابات المستوى الأول.',
    moves: [
      { name: '⚡ نبضة طاقة', damage: 1.4, log: '⚡ أطلق الوحش نبضة كهربائية حارقة!' }
    ]
  },

  // Stage 2: كهف الغيلان
  {
    name: 'أورك النخبة',           emoji: '👹', hp: 120, atk: 35, stage: 2,
    image: MONSTER_IMAGES.orc,      shadowRank: 'D', xpReward: 50, goldReward: [100, 200],
    description: 'مقاتل أورك متمرس في قتالات البوابات.',
    moves: [
      { name: '🪓 ضربة المطرقة', damage: 1.5, log: '👹 هوى الأورك بمطرقته الحديدية على رأسك!' },
      { name: '🛡️ الاندفاع',     damage: 1.3, log: '💨 اندفع الأورك نحوك واصطدم بك بقوة هائلة!' }
    ]
  },
  {
    name: 'الشبح الجائع',          emoji: '🧟', hp: 150, atk: 30, stage: 2,
    image: MONSTER_IMAGES.ghoul,    shadowRank: 'D', xpReward: 60, goldReward: [120, 250],
    description: 'روح ضالة تبحث عن ضحيتها في الأروقة المظلمة.',
    moves: [
      { name: '💀 لمسة الموت', damage: 1.4, log: '🧟 مد الشبح يده وامتص طاقتك الحيوية!' }
    ]
  },

  // Stage 3: وادي التنانين
  {
    name: 'تنين النار اليافع',     emoji: '🐉', hp: 400, atk: 95, stage: 3,
    image: MONSTER_IMAGES.dragon,   shadowRank: 'C', xpReward: 200, goldReward: [500, 1000],
    description: 'تنين شاب لكن قوته تبشر بكارثة.',
    moves: [
      { name: '🔥 أنفاس اللهب', damage: 1.8, log: '🔥 أطلق التنين أنفاساً من النيران أحرقت كل شيء!' },
      { name: '🦷 عضة مدمرة',  damage: 1.5, log: '🦷 انقض التنين وعض بأنيابه الحادة كالسيوف!' }
    ]
  },
  {
    name: 'حارس العرين الجليدي',  emoji: '❄️', hp: 350, atk: 120, stage: 3,
    image: MONSTER_IMAGES.guardian, shadowRank: 'C', xpReward: 180, goldReward: [450, 900],
    description: 'حارس متجمد يسد مدخل وادي التنانين.',
    moves: [
      { name: '🧊 جبل الجليد', damage: 1.6, log: '❄️ رمى الحارس جبلاً جليدياً في وجهك!' }
    ]
  },

  // Stage 4: عرين الوحوش
  {
    name: 'التيتان الغاضب',        emoji: '🗿', hp: 1500, atk: 350, stage: 4,
    image: MONSTER_IMAGES.titan,    shadowRank: 'B', xpReward: 600, goldReward: [1500, 3000],
    description: 'عملاق قديم استيقظ من سباته الأبدي.',
    moves: [
      { name: '💥 سحق الأرض',   damage: 2.0, log: '💥 ضرب التيتان الأرض مسبباً هزة أرضية كسرت درعك!' },
      { name: '🌋 غضب البراكين', damage: 1.7, log: '🌋 أطلق التيتان صيحة صوتية هزت جدران الكهف!' }
    ]
  },
  {
    name: 'المارشال الشيطاني باروكا', emoji: '😈', hp: 2000, atk: 280, stage: 4,
    image: MONSTER_IMAGES.colossus, shadowRank: 'B', xpReward: 800, goldReward: [2000, 4000],
    description: 'قائد جيوش الظلام بالبوابات الضخمة.',
    moves: [
      { name: '⚔️ ضربة النخبة', damage: 1.9, log: '⚔️ شن المارشال هجوماً متطوراً من تقنيات القتال النخبوي!' }
    ]
  },

  // Stage 5: بوابة الجحيم
  {
    name: 'ملك النمل الأسود',      emoji: '🐜', hp: 5000, atk: 850, stage: 5,
    image: MONSTER_IMAGES.void,     shadowRank: 'A', xpReward: 2000, goldReward: [5000, 10000],
    description: 'الكائن الذي أوقف جميع الصائدين قبل جين وو.',
    moves: [
      { name: '🌑 انفجار الطاقة', damage: 2.5, log: '🌑 أطلق ملك النمل تفجيراً من الطاقة السوداء دمر كل شيء!' },
      { name: '💀 لكمة الفناء',   damage: 2.0, log: '💀 أطلق ملك النمل لكمة صوتية من مسافة عشرة أمتار!' }
    ]
  },
  {
    name: 'كيريشا ملكة البيض',     emoji: '🔥', hp: 4500, atk: 1000, stage: 5,
    image: MONSTER_IMAGES.demon,    shadowRank: 'A', xpReward: 2500, goldReward: [6000, 12000],
    description: 'الملكة الشيطانية التي أربكت جميع الصائدين.',
    moves: [
      { name: '🌪️ عاصفة الجحيم', damage: 2.3, log: '🌪️ أطلقت كيريشا عاصفة من الطاقة الشيطانية!' }
    ]
  },

  // Stage 6-50 (Generated with better naming)
  ...Array.from({ length: 44 }, (_, i) => {
    const stageId = i + 6;
    const names = ['وحش الفراغ الأسطوري', 'حارس البوابة النخبوي', 'مقاتل الأبعاد', 'مدمر العوالم', 'كيان الظلام المطلق'];
    const emojis = ['⭐', '🌑', '💀', '⚡', '🔥'];
    return {
      name: `${names[i % names.length]} ${stageId}`,
      emoji: emojis[i % emojis.length],
      hp: 8000 + (i * 2000),
      atk: 1500 + (i * 500),
      stage: stageId,
      image: Object.values(MONSTER_IMAGES)[i % Object.values(MONSTER_IMAGES).length],
      shadowRank: i < 10 ? 'S' : i < 25 ? 'SS' : 'SSS',
      xpReward: 3000 + i * 1000,
      goldReward: [10000 * (i + 1), 20000 * (i + 1)]
    };
  })
];

// ===== BOSSES =====
const BOSSES = [
  {
    name: '👑 المهندس المعماري كاسياكا',   emoji: '🕷️',
    hp: 1500, atk: 150, stage: 1,
    image: BOSS_IMAGES[1],
    description: '🔴 زعيم البوابة E — العنكبوت الضخم الذي رسخ صيت الكهف الأحمر.',
    reward: { min: 1000, max: 2000 }, xpReward: 300,
    shadowName: 'ظل كاسياكا', shadowPower: 80, shadowRank: 'D',
    moves: [
      { name: '🕸️ شبكة الموت الكبرى', damage: 1.5, log: '🕸️ غطّت شبكة الموت كامل الساحة — لا مفر!' },
      { name: '💉 حقن سم كثيف',        damage: 1.3, log: '💉 أصابك سم المهندس المعماري الذي يذوّب الدروع!' }
    ]
  },
  {
    name: '👑 إيغريت ملك الأورك',          emoji: '👹',
    hp: 4000, atk: 350, stage: 2,
    image: BOSS_IMAGES[2],
    description: '🟢 زعيم البوابة D — ملك قبيلة الأورك الأقوى في هذا المستوى.',
    reward: { min: 3000, max: 5000 }, xpReward: 800,
    shadowName: 'ظل إيغريت', shadowPower: 200, shadowRank: 'C',
    moves: [
      { name: '🪓 طوفان المطارق', damage: 1.8, log: '🪓 أطلق إيغريت طوفاناً من ضربات المطارق التي لم تتوقف!' },
      { name: '🌋 صرخة الحرب',   damage: 1.5, log: '📢 أطلق إيغريت صرخة حرب هزت أركان الكهف وشلت أطرافك!' }
    ]
  },
  {
    name: '👑 كاميش تنين الكوارث',         emoji: '🐉',
    hp: 12000, atk: 950, stage: 3,
    image: BOSS_IMAGES[3],
    description: '🔵 زعيم البوابة C — التنين الذي أفنى مئات الصائدين وأسقط مدناً كاملة.',
    reward: { min: 8000, max: 15000 }, xpReward: 2000,
    shadowName: 'ظل كاميش', shadowPower: 800, shadowRank: 'B',
    moves: [
      { name: '🔥 الجحيم الأبدي',   damage: 2.2, log: '🔥 أطلق كاميش أنفاساً من النيران الأبدية أحرقت كل شيء!' },
      { name: '🌪️ عاصفة الدمار', damage: 1.8, log: '🌪️ ضرب كاميش الأرض بذيله مسبباً عاصفة دمار هائلة!' }
    ]
  },
  {
    name: '👑 باروكا قائد البوابة الكبرى',  emoji: '😈',
    hp: 35000, atk: 2500, stage: 4,
    image: BOSS_IMAGES[4],
    description: '🟣 زعيم البوابة B — الشيطان الذي يقود جيوش الظلام بمهارة حربية لا تضاهى.',
    reward: { min: 20000, max: 40000 }, xpReward: 6000,
    shadowName: 'ظل باروكا', shadowPower: 2500, shadowRank: 'A',
    moves: [
      { name: '⚔️ مذبحة السيف', damage: 2.5, log: '⚔️ شن باروكا هجوماً بألف ضربة سيف في ثانية واحدة!' },
      { name: '💀 لعنة الجحيم', damage: 2.0, log: '💀 ألقى باروكا لعنة قديمة تستنزف حياتك ببطء!' }
    ]
  },
  {
    name: '👑 أنتاريس ملك الشياطين',        emoji: '🌑',
    hp: 100000, atk: 7500, stage: 5,
    image: BOSS_IMAGES[5],
    description: '⭐ زعيم البوابة A — ملك الشياطين الأعلى الذي يسبب نهاية العالم عند خروجه.',
    reward: { min: 50000, max: 100000 }, xpReward: 15000,
    shadowName: 'ظل أنتاريس', shadowPower: 10000, shadowRank: 'S',
    moves: [
      { name: '🌑 طوفان الظلام المطلق', damage: 3.0, log: '🌑 خلق أنتاريس موجة ظلام مطلقة مست كل ذرة في الكون!' },
      { name: '💥 انفجار البُعد',       damage: 2.5, log: '💥 مزق أنتاريس فضاء المعركة وأسقط طاقة بُعدية مدمرة!' }
    ]
  },
  ...Array.from({ length: 45 }, (_, i) => {
    const stageId = i + 6;
    return {
      name: `👑 زعيم البوابة الأسطورية ${stageId}`,
      emoji: '⭐',
      hp: 200000 + (i * 100000),
      atk: 15000 + (i * 5000),
      stage: stageId,
      image: BOSS_IMAGES[i % 5 + 1] || BOSS_IMAGES.generic,
      description: `الزعيم النهائي للبوابة المستوى ${stageId} — كيان يتجاوز فهم البشر.`,
      reward: { min: 100000 * (i + 1), max: 200000 * (i + 1) },
      xpReward: 20000 * (i + 1),
      shadowName: `ظل الزعيم ${stageId}`,
      shadowPower: 15000 + i * 5000,
      shadowRank: i < 10 ? 'S' : i < 25 ? 'SS' : 'SSS'
    };
  })
];

const UPGRADES = {
  hp:  { name: 'ترقية الصحة القصوى', emoji: '❤️', basePrice: 1000, increment: 500, benefit: 100 },
  atk: { name: 'ترقية قوة الهجوم',   emoji: '⚔️', basePrice: 1000, increment: 500, benefit: 15 }
};

const SHOP_ITEMS = {
  weapons: [
    { id: 'iron_sword',      name: 'سيف حديدي',        price: 500,    atk: 15,  emoji: '⚔️',  desc: 'سيف بسيط للصائدين المبتدئين' },
    { id: 'magic_staff',     name: 'عصا سحرية',        price: 1500,   atk: 40,  emoji: '🪄',  desc: 'تُضاعف قوة السحر' },
    { id: 'bow_of_light',    name: 'قوس النور',         price: 3500,   atk: 85,  emoji: '🏹',  desc: 'يطلق سهاماً من الضوء الخالص' },
    { id: 'dragon_slayer',   name: 'قاتل التنانين',    price: 10000,  atk: 200, emoji: '🗡️', desc: 'صُنع لإنهاء عصر التنانين' },
    { id: 'shadow_dagger',   name: 'خنجر الظلال',      price: 7000,   atk: 130, emoji: '🗡️', desc: 'يرى الظلام ويتحرك معه' },
    { id: 'volcanic_blade',  name: 'نصل البركان',      price: 18000,  atk: 280, emoji: '🔥',  desc: 'مصنوع من معدن البراكين النشطة' },
    { id: 'frost_greatsword',name: 'السيف الجليدي العظيم', price: 25000, atk: 360, emoji: '❄️', desc: 'يجمد كل ما يلمسه' },
    { id: 'celestial_spear', name: 'الرمح السماوي',    price: 40000,  atk: 520, emoji: '🌟',  desc: 'سلاح أسطوري من عالم الآلهة' },
    { id: 'shadow_monarch',  name: 'سيف ملك الظلام',   price: 100000, atk: 1200,emoji: '⭐',  desc: '⭐ السلاح الأسطوري لملك الظلام — حصري' }
  ],
  armor: [
    { id: 'leather_armor',  name: 'درع جلدي',          price: 400,   hp: 50,   emoji: '🛡️' },
    { id: 'steel_plate',    name: 'درع فولاذي',         price: 2000,  hp: 250,  emoji: '🥋' },
    { id: 'mythril_mail',   name: 'قميص الميثريل',     price: 6000,  hp: 800,  emoji: '💎' },
    { id: 'holy_armor',     name: 'الدرع المقدس',      price: 15000, hp: 2500, emoji: '✨' },
    { id: 'obsidian_shield',name: 'درع الأوبسيدية',    price: 22000, hp: 3800, emoji: '🛡️' },
    { id: 'frozen_plate',   name: 'درع الجليد الأبدي', price: 30000, hp: 5200, emoji: '❄️' },
    { id: 'phoenix_guard',  name: 'دروع العنقاء',      price: 45000, hp: 8000, emoji: '🔥' },
    { id: 'shadow_armor',   name: 'درع ملك الظلام',    price: 100000,hp: 20000,emoji: '⭐', desc: '⭐ حصري لملك الظلام' }
  ],
  potions: [
    { id: 'hp_potion',        name: 'جرعة صحة صغرى',   price: 100,  heal: 100,  emoji: '🧪' },
    { id: 'mega_potion',      name: 'جرعة صحة كبرى',   price: 400,  heal: 500,  emoji: '⚗️' },
    { id: 'full_restore',     name: 'إعادة إحياء كاملة', price: 1500, heal: 5000, emoji: '🌟' },
    { id: 'elixir_of_power',  name: 'إكسير القوة',      price: 2000, heal: 0, atkBoost: 0.25, emoji: '💥' },
    { id: 'elixir_of_resolve',name: 'إكسير الصمود',     price: 2500, heal: 0, reduceNext: 0.5, emoji: '🛡️' }
  ],
  skills: [
    { id: 'fireball',    name: 'كرة النار',        price: 2000,  desc: 'ضرر سحري (2.2x)', multiplier: 2.2, type: 'attack', emoji: '🔥' },
    { id: 'shield_wall', name: 'جدار الدروع',      price: 2500,  desc: 'تقليل الضرر القادم 50%', type: 'buff', multiplier: 1.0, reduction: 0.5, emoji: '🛡️' },
    { id: 'divine_heal', name: 'الشفاء المقدس',   price: 3000,  desc: 'شفاء 40% من صحتك القصوى', type: 'heal', multiplier: 0, percentage: 0.4, emoji: '🕊️' },
    { id: 'ice_spike',   name: 'شوكة الجليد',      price: 3500,  desc: 'ضرر جليدي (1.6x)', multiplier: 1.6, type: 'attack', emoji: '❄️' },
    { id: 'lava_burst',  name: 'انفجار الحمم',     price: 5000,  desc: 'ضرر ناري (2.8x)', multiplier: 2.8, type: 'attack', emoji: '🌋' },
    { id: 'shadow_step', name: 'خطوة الظل',        price: 4200,  desc: 'تجنب الهجمة القادمة بالكامل', type: 'buff', multiplier: 1.0, reduction: 1.0, emoji: '🌑' },
    { id: 'holy_smite',  name: 'الضربة المقدسة',  price: 6500,  desc: 'ضرر مقدس (3.2x)', multiplier: 3.2, type: 'attack', emoji: '✨' },
    { id: 'arise',       name: '⭐ قُمْ! (Arise)',  price: 25000, desc: 'استدعي جنود الظلال لضربة مركبة (4x)', multiplier: 4.0, type: 'attack', emoji: '⭐', rare: true },
    { id: 'domain_exp',  name: '⭐ توسيع المجال',  price: 20000, desc: 'تعزيز كل إحصائياتك بنسبة 50% لجولة كاملة', type: 'domain', multiplier: 1.5, emoji: '🌐', rare: true }
  ]
};

// ===== SHADOW ARMY SYSTEM =====
const SHADOW_RANKS = {
  E: { name: 'رتبة E', emoji: '⬜', powerMultiplier: 1.0, color: 0x95A5A6 },
  D: { name: 'رتبة D', emoji: '🟩', powerMultiplier: 1.5, color: 0x2ECC71 },
  C: { name: 'رتبة C', emoji: '🟦', powerMultiplier: 2.5, color: 0x3498DB },
  B: { name: 'رتبة B', emoji: '🟪', powerMultiplier: 4.0, color: 0x9B59B6 },
  A: { name: 'رتبة A', emoji: '🟨', powerMultiplier: 7.0, color: 0xF1C40F },
  S: { name: 'رتبة S', emoji: '🟧', powerMultiplier: 12.0, color: 0xE67E22 },
  SS: { name: 'رتبة SS', emoji: '🔴', powerMultiplier: 20.0, color: 0xE74C3C },
  SSS: { name: 'رتبة SSS', emoji: '⭐', powerMultiplier: 35.0, color: 0x8E44AD }
};

// ===== RAIDS =====
const RAIDS = [
  {
    id: 1, name: '🏜️ الصحراء القاحلة', minLevel: 10,
    image: 'https://static.wikia.nocookie.net/sololeveling/images/5/5a/Lizard_Man.png',
    enemies: [
      { name: 'العقرب العملاق', hp: 500, atk: 80, image: MONSTER_IMAGES.beast, drops: { gold: [200, 400], xp: [100, 200] } },
      { name: 'المومياء الثائرة', hp: 650, atk: 95, image: MONSTER_IMAGES.ghoul, drops: { gold: [300, 500], xp: [150, 250] } }
    ],
    boss: {
      name: '👑 ملك الرمال الملعون', hp: 3000, atk: 250,
      image: BOSS_IMAGES[1],
      reward: { gold: [1000, 2000], xp: [500, 1000] }
    }
  },
  {
    id: 2, name: '🌲 الغابة المسحورة', minLevel: 30,
    image: 'https://static.wikia.nocookie.net/sololeveling/images/8/8c/High_Goblin.png',
    enemies: [
      { name: 'الذئب المتحول', hp: 1500, atk: 220, image: MONSTER_IMAGES.orc, drops: { gold: [600, 1000], xp: [400, 600] } },
      { name: 'الغول الحجري', hp: 2000, atk: 180, image: MONSTER_IMAGES.titan, drops: { gold: [800, 1200], xp: [500, 800] } }
    ],
    boss: {
      name: '👑 حارس الغابة العظيم', hp: 8000, atk: 600,
      image: BOSS_IMAGES[3],
      reward: { gold: [3000, 6000], xp: [2000, 4000] }
    }
  }
];

module.exports = {
  RPG_CLASSES, RPG_RACES, STAGES, ENEMIES, BOSSES, UPGRADES, SHOP_ITEMS,
  HUNTER_RANKS, getHunterRank, SHADOW_RANKS, RAIDS,
  MONSTER_IMAGES, BOSS_IMAGES, STAGE_IMAGES
};
