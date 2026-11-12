// 🔤 AliasEngine v23 — محرك الاختصارات العربية الموحّد
// ─────────────────────────────────────────────────────────────
// • COMMAND_WORDS: كل أمر وكلماته مرتبة حسب الأقسام (فصحى + لهجات خليجية/شامية/مصرية/مغاربية)
// • الكلمات التي فيها «_» تعمل أيضاً بمسافة: «خمن_الرقم» = «خمن الرقم» (عبارات حتى 3 كلمات)
// • PHRASES: عبارات طبيعية مثل «كم رصيدي»، «لو خيروك»، «قفل الروم»
// • حماية المحادثة:
//   - SOLO: أوامر لا تقبل كلاماً إضافياً («رصيد» يشتغل، «رصيد البنك خربان» يبقى كلاماً عادياً)
//   - NEED_MENTION / NEED_TARGET / NEED_NUMBER: لا تشتغل بدون منشن/رد/رقم
//   - أوامر الإشراف تُتجاهل بصمت لغير المخوّلين
// • اختصارات خاصة بالسيرفر يضيفها الإداري: «اختصار اضف ف رصيد»
const { readGuild } = require('./guildStorage');

const norm = (t) => String(t || '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/ى/g, 'ي')
  .replace(/ؤ/g, 'و')
  .replace(/[\u064B-\u0652\u0640]/g, '') // تشكيل + تطويل
  .replace(/[\u200C\u200D]/g, '')
  .replace(/[؟?!.,،]+$/g, '')
  .toLowerCase()
  .trim();

// ============ كلمات كل أمر (مرتبة حسب الأقسام) ============
const COMMAND_WORDS = {
  // 📚 المساعدة والمعلومات
  help: ['مساعده', 'اوامر', 'دليل', 'شرح', 'الاوامر', 'الدليل', 'هيلب', 'help', 'اوامري', 'المساعده'],
  aliases: ['اختصارات', 'اختصار', 'الاختصارات', 'اختصاراتي', 'قائمه_الاختصارات'],
  info: ['معلومات', 'معلومه', 'انفو', 'عن_السيرفر', 'معلوماتي', 'ملفي'],
  features: ['مميزات', 'مزايا', 'خصائص', 'ميزات', 'الميزات'],
  botstats: ['احصائيات', 'بوت', 'الحاله', 'ستاتس', 'حاله_البوت', 'البوت'],
  ping: ['بنق', 'اتصال', 'سرعه', 'سلامه', 'بينغ', 'بنج', 'لاق', 'تاخير'],

  // 💰 الاقتصاد
  balance: ['رصيد', 'فلوس', 'فلوسي', 'جواهر', 'رصيدي', 'مالي', 'ثروتي', 'بلانس', 'محفظه', 'فلوسك', 'ديناري', 'كاش', 'كم_معي', 'فلوسي_كم', 'رصيده', 'ميزانيتي', 'ثروه', 'نقودي', 'دراهمي', 'فلوسه'],
  bank: ['بنك', 'حسابي', 'ايداع', 'سحب', 'البنك', 'مصرف', 'حساب_بنكي', 'خزنه', 'ودائع', 'اودع', 'اسحب', 'قرض', 'اقترض', 'سلفه', 'سدد', 'تسديد'],
  daily: ['يومي', 'راتب', 'هديه', 'مكافاه', 'يوميه', 'قبض', 'يلا_خذ', 'هديتي', 'عيديه', 'الراتب', 'الهديه', 'مكافاتي', 'راتبي', 'يوميتي', 'عطيه'],
  work: ['عمل', 'شغل', 'اشتغل', 'وظيفه', 'وظايف', 'اشتغل_يا', 'العمل', 'اشتغال', 'دوامي', 'وظيفتي', 'كسب', 'اكسب'],
  shop: ['متجر', 'سوق', 'شراء', 'بيع', 'مشتريات', 'سوق_الحصص', 'متجري', 'المتجر', 'السوق', 'دكان', 'محل', 'تسوق'],
  pay: ['دفع', 'تحويل', 'اعطي', 'حواله', 'ارسل', 'ابعت', 'حول', 'ادفع', 'تحويله'],
  steal: ['سرقه', 'اسرق', 'نشل', 'نصب', 'حرامي', 'اسرق_من', 'خطف', 'اسرقه', 'سارق', 'لص', 'نهب'],
  stocks: ['بورصه', 'اسهم', 'استثمار', 'تداول', 'الاسهم', 'البورصه', 'سهم'],
  lottery: ['يانصيب', 'لوتر', 'قرعه', 'حظ', 'اليانصيب', 'لوتو', 'سحب_الحظ', 'تذكره_حظ'],
  marry: ['زواج', 'خطبه', 'ارتباط', 'تزوج', 'زواجي', 'عرس'],
  pet: ['حيوان', 'حيواني', 'قط', 'كلب', 'حيواناتي', 'اليف', 'حيوان_اليف'],
  prestige: ['بريستيج', 'تطوير', 'برستيج', 'ترقيه_كبري'],

  // 📊 المستويات
  rank: ['مستواي', 'مستوي', 'رتبتي', 'بروفايل', 'لفل', 'لفلي', 'رانك', 'كرتي', 'مستواك', 'مستوايا', 'لفلك', 'مستواه', 'بروفايلي_المستوي'],
  leaderboard: ['توب', 'متصدرين', 'ترتيب', 'افضل', 'صداره', 'قمه', 'المتصدرين', 'الترتيب', 'التوب', 'توب_10', 'الاوائل', 'لوحه_الشرف'],
  achievements: ['انجازات', 'اوسمه', 'انجازي', 'الانجازات', 'شاراتي', 'ميدالياتي'],

  // 🎰 الكازينو
  slots: ['سلوت', 'سلوتس', 'ماكينه', 'جاكبوت', 'قمار', 'ماكينه_الحظ', 'سلوتات', 'سبين'],
  roulette: ['روليت', 'عجله', 'دولاب', 'الروليت', 'رولت'],
  blackjack: ['بلاك', 'بلاكجاك', 'واحد_وعشرين', 'ضارب', 'ضربه', 'كوتشينه', 'بلاك_جاك', 'بلاكجك', 'واحد_و_عشرين'],
  coinflip: ['عمله', 'كوين', 'كوينفليب', 'قلب_العمله', 'وجه_ولا_كتابه', 'طره'],
  crash: ['صاروخ', 'الصاروخ', 'كراش', 'صواريخ', 'اطلاق', 'طياره'],
  scratch: ['كشط', 'اكشط', 'سكراتش', 'كاشط', 'بطاقه_كشط', 'كرت_حظ', 'بطاقه_حظ'],
  treasure: ['كنز', 'الكنز', 'كنوز', 'صندوق', 'صناديق', 'صندوق_الكنز', 'غنيمه'],
  highlow: ['اعلى', 'اعلى_اقل', 'فوق_تحت', 'هاي_لو', 'هايلو', 'كبير_صغير'],

  // 🎮 الألعاب
  gamesinfo: ['العاب', 'الالعاب', 'كازينو', 'قائمه_الالعاب', 'صاله_الالعاب', 'ارکید', 'اركيد', 'العابي'],
  guess: ['خمن', 'خمن_الرقم', 'تخمين_الرقم', 'رقم_سري', 'الرقم_السري', 'حزر', 'احزر', 'توقع_الرقم'],
  race: ['سباق', 'هجن', 'هجين', 'سباق_الهجن', 'سباق_جمال', 'مضمار', 'سباقات'],
  rps: ['حجر', 'ورقه', 'مقص', 'حجاره_ورقه_مقص', 'حجار', 'ورق_مقص', 'حجره', 'حجر_ورقه_مقص', 'ورقه_مقص', 'مقصات'],
  tictactoe: ['اكسو', 'xo', 'تيك', 'إكس_أو', 'لعب_الصليب', 'تيك_تاك'],
  connect4: ['كونكت', 'اربعه', 'وصله', 'اربعه_في_صف', 'كونكت4', 'ربط'],
  hangman: ['مشنقه', 'حرافه', 'تخمين', 'شنقه', 'المشنقه', 'شنق'],
  wordle: ['وردل', 'قاموس', 'خمس_حروف', 'احرف', 'ووردل', 'كلمه_السر'],
  trivia: ['تريفيا', 'اسئله', 'معارف', 'ثقافه', 'ثقافه_عامه', 'مسابقه_ثقافيه', 'معلومات_عامه', 'اسئله_عامه', 'كويز', 'اختبار'],
  minesweeper: ['الغام', 'كنس', 'افخاخ', 'فخ', 'لغم', 'كاسح', 'كاسحه', 'كاسحه_الغام', 'الالغام', 'قنابل'],
  fish: ['صيد', 'سمك', 'صياد', 'شصيت', 'صياد_سمك', 'قارب', 'شبكه', 'صيديه', 'اصطياد', 'صنارة', 'بحر'],
  dice: ['نرد', 'زهر', 'حجر_نرد', 'دحي', 'زهره', 'نردي', 'ديس', 'النرد', 'زهر_النرد'],
  group: ['جماعي', 'جماعيه', 'بارتي', 'حفله', 'فريق', 'فريقي', 'تيم', 'سكواد', 'كروب', 'العاب_جماعيه', 'لمه'],

  // 🎉 الترفيه والسهرة
  fun: ['مرح', 'ترفيه', 'لعب', 'وناسه', 'فله', 'تحدي', 'نزال', 'مبارزه', 'عجله_الحظ', 'نسبه_الحب', 'توافق', 'حب', 'قيم', 'تقييم'],
  social: ['صراحه', 'جراه', 'لغز', 'الغاز', 'حزوره', 'فزوره', 'نكته', 'نكت', 'ضحكني', 'حكمه', 'حكم', 'امثال', 'كت', 'كت_تويت', 'خيروك', 'لو_خيروك', 'سهره'],
  choose: ['اختار', 'اختر', 'قرار', 'فكر_لنا', 'ورقه_او_عجله', 'عشوائي', 'صدفه', 'رندوم', 'عشوائيه', 'اختارلي', 'اختر_لي', 'خيرني_بين'],

  // ⚔️ المغامرة RPG
  dungeon: ['دانجون', 'دانجن', 'مغامره', 'دالجن', 'dg', 'مغامرات', 'سجن', 'دنجن', 'زنزانه', 'قبو', 'قلعه', 'الدانجون', 'غزو'],
  farm: ['مزرعه', 'زرع', 'حصاد', 'مزرعتي', 'ارض', 'فلاحه', 'حقل', 'محصول', 'بذور', 'فلاح', 'ضيعه', 'المزرعه', 'زراعه', 'حصادي'],
  gate: ['بوابه', 'ابواب', 'بوابات', 'البوابه', 'بوابات_الصيد'],
  shadow: ['ظل', 'ظلال', 'جيش', 'اسود', 'الظل', 'جيش_الظلال', 'ظلالي'],

  // 🛠️ أدوات عامة
  adhkar: ['اذكار', 'ذكر', 'اذكاري', 'ادعيه', 'دعاء', 'تسابيح', 'استغفار', 'تكبير', 'اذكار_الصباح', 'الاذكار', 'اذكار_المساء', 'سبحان_الله', 'حصن'],
  afk: ['افك', 'غياب'],
  ai: ['اسأل', 'سوال', 'سؤال', 'ذكاء', 'gpt', 'فكر_لي', 'جاوبني', 'جاوب', 'ذكاء_اصطناعي', 'بوت_ذكي', 'شات_جي_بي_تي', 'اسال_البوت'],
  colors: ['الوان', 'لون', 'تلوين', 'الواني', 'الوان_الرتب', 'لوني', 'صباغه', 'صبغ', 'اللوان', 'الوان_السيرفر', 'غير_لوني'],
  reminder: ['تذكير', 'ذكرني', 'فكرني', 'منبه', 'ذكرني_ب', 'لاحقا', 'تذكير_لي', 'نبهني', 'تذكيري'],
  quests: ['مهام', 'طلبات', 'تحديات', 'المهام', 'مهماتي', 'مهمه', 'مهام_يوميه'],
  ticket: ['تذكره', 'دعم_فني', 'مساعده_فنيه', 'مشكله', 'شكوى', 'بلاغ', 'ابلاغ', 'تكت', 'فتح_تذكره'],
  tournament: ['بطوله', 'بطولات', 'مسابقه', 'سباق_بطولات', 'منصه', 'تحدي_البطولات', 'البطوله', 'دوري', 'كاس'],
  embedbuilder: ['قوالب', 'قالب', 'تصميم', 'امبد', 'تصميم_امبد', 'امبيد', 'صانع_الامبد'],
  shh: ['اخبار', 'شبكات', 'ميمز', 'بوستات', 'منشورات', 'منشور', 'خبر', 'ترند', 'تويتر', 'الاخبار', 'ميم'],
  booster: ['بوستر', 'بوست', 'تعزيز', 'nitro', 'دعم_السيرفر', 'بوستات_السيرفر', 'البوست', 'داعم'],
  avatar: ['صوره', 'صورتي', 'افاتار', 'افتار', 'صورته', 'بروفايلي', 'صوره_العضو', 'افتاري', 'افاتاري', 'صورتك', 'بروفايل_صوره', 'الصوره'],
  banner: ['بنر', 'بانر', 'غلاف', 'خلفيه', 'غلافي', 'بروفايل_غلاف', 'بنرات', 'البنر', 'بانري', 'بنري', 'غلافه'],
  membercard: ['بطاقه', 'بطاقتي', 'كرت', 'كروت', 'كارت', 'هويه', 'بطاقه_عضو', 'ايدي_كرت', 'بطاقتك', 'هويتي', 'كرتي_الشخصي'],
  servercard: ['سيرفركرت', 'هويه_السيرفر', 'بطاقه_سيرفر', 'شعار', 'السيرفر', 'معلومات_السيرفر', 'سيرفر', 'احصائيات_السيرفر'],
  poll: ['تصويت', 'استفتاء', 'رايكم', 'صوت', 'صوتوا', 'استطلاع', 'اقتراع', 'رأي', 'تصويتات', 'استبيان'],
  translate: ['ترجمه', 'ترجم', 'ترجم_لي', 'الترجمه', 'ترجمي', 'ترجملي'],
  calc: ['حاسبه', 'احسب', 'رياضيات', 'اله_حاسبه', 'حاسوب', 'احسب_لي', 'ناتج', 'معادله', 'الحاسبه', 'حسبه', 'كم_يساوي'],

  // 🛡️ الإشراف
  ban: ['حظر', 'باند', 'بن', 'بان', 'حظرت', 'مانع', 'تبنيد', 'احظر', 'بانده'],
  kick: ['طرد', 'كيك', 'اخراج', 'طردت', 'اطرد', 'كك'],
  mute: ['كتم', 'اسكات', 'سكوت', 'صامت', 'ميوت', 'ساكت', 'اكتام', 'سكات', 'خلك_ساكت', 'تسكيت', 'اكتم', 'اسكت', 'تايم', 'تايم_اوت', 'timeout'],
  unmute: ['فك_الكتم', 'فك_الاسكات'],
  warn: ['تحذير', 'انذار', 'تنبيه', 'ورن', 'ورنينج', 'تحذر', 'حذر', 'انذره'],
  warnings: ['تحذيرات', 'انذارات', 'سجل_التحذيرات', 'تحذيراته', 'انذاراته'],
  clearwarns: ['مسح_التحذيرات', 'مسح_انذارات', 'صفر_التحذيرات'],
  clear: ['مسح', 'نظف', 'حذف', 'تنظيف', 'مسح_رسائل', 'امسح', 'احذف', 'كنس_الشات', 'مسح_الشات', 'حذف_رسائل', 'purge'],
  lock: ['قفل', 'اغلاق', 'اقفل', 'اقفال', 'مغلق', 'مقفل', 'قفل_الروم'],
  unlock: ['فتح', 'افتح', 'فك_القفل', 'فتح_الروم', 'فك_قفل'],
  slowmode: ['بطيء', 'وضع_بطيء', 'سلومود', 'تهدئه', 'رويه', 'بطيئ', 'سلو'],
  nickname: ['لقب', 'كنيه', 'اسم_مستعار', 'غيّر_لقبي', 'نك', 'نيك', 'غير_اسمه'],
  role: ['رتبه_عضو', 'اعطاء_رتبه', 'سحب_رتبه', 'رول', 'رتبه'],
  say: ['قول', 'كرر', 'انطق', 'ردد'],
  modlog: ['سجل', 'عقوبات', 'سجل_العقوبات', 'محاضر', 'سجل_الجزاءات', 'قرارات', 'تاريخ_العقوبات', 'اللوق', 'لوق', 'سجلات'],

  // ⚙️ الإدارة
  admin: ['ادمن', 'اداري'],
  settings: ['اعدادات', 'ستينق'],
  rules: ['قوانين', 'قانون', 'rules'],
  welcomesettings: ['ترحيب', 'ولكم'],
  levelroles: ['رتب_المستويات', 'رتب_التلقائيه'],
  setlevelchannel: ['قناه_المستويات', 'قناه_الترقيه'],
  levelsettings: ['اعدادات_المستويات', 'ضبط_المستويات'],
  autorole: ['ترتيب_تلقائي', 'رتبه_تلقائيه', 'اوتورول'],
  channelsettings: ['قنوات', 'ضبط_القنوات'],
  gameschannel: ['قناه_الالعاب'],
  chatbot: ['شاتبوت', 'شات_بوت', 'ردود', 'رد_تلقائي'],
  restoredata: ['استعاده', 'استرجاع', 'تصدير'],
  announce: ['اعلان', 'برودكاست', 'نشر'],
};


// ============ الأقسام (لعرض قائمة الاختصارات) ============
const SECTIONS = [
  { key: 'info', title: '📚 المساعدة والمعلومات', cmds: ['help', 'aliases', 'info', 'features', 'botstats', 'ping'] },
  { key: 'economy', title: '💰 الاقتصاد', cmds: ['balance', 'bank', 'daily', 'work', 'shop', 'pay', 'steal', 'stocks', 'lottery', 'marry', 'pet', 'prestige'] },
  { key: 'levels', title: '📊 المستويات', cmds: ['rank', 'leaderboard', 'achievements'] },
  { key: 'casino', title: '🎰 الكازينو', cmds: ['slots', 'roulette', 'blackjack', 'coinflip', 'crash', 'scratch', 'treasure', 'highlow'] },
  { key: 'games', title: '🎮 الألعاب', cmds: ['gamesinfo', 'guess', 'race', 'rps', 'tictactoe', 'connect4', 'hangman', 'wordle', 'trivia', 'minesweeper', 'fish', 'dice', 'group'] },
  { key: 'party', title: '🎉 الترفيه والسهرة', cmds: ['fun', 'social', 'choose'] },
  { key: 'rpg', title: '⚔️ المغامرة RPG', cmds: ['dungeon', 'farm', 'gate', 'shadow'] },
  { key: 'tools', title: '🛠️ أدوات عامة', cmds: ['adhkar', 'afk', 'ai', 'colors', 'reminder', 'quests', 'ticket', 'tournament', 'embedbuilder', 'shh', 'booster', 'avatar', 'banner', 'membercard', 'servercard', 'poll', 'translate', 'calc'] },
  { key: 'mod', title: '🛡️ الإشراف', cmds: ['ban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'clearwarns', 'clear', 'lock', 'unlock', 'slowmode', 'nickname', 'role', 'say', 'modlog', 'unban'] },
  { key: 'admin', title: '⚙️ الإدارة', cmds: ['admin', 'settings', 'rules', 'welcomesettings', 'levelroles', 'setlevelchannel', 'levelsettings', 'autorole', 'channelsettings', 'gameschannel', 'chatbot', 'restoredata', 'announce'] },
];

// ============ عبارات طبيعية (2-3 كلمات) ============
const PHRASES = {
  // 🛡️ الإشراف
  'فك حظر': 'unban', 'شيل حظر': 'unban', 'الغاء حظر': 'unban', 'فك الباند': 'unban', 'رفع الحظر': 'unban',
  'فك اسكات': 'unmute', 'فك كتم': 'unmute', 'فك الميوت': 'unmute', 'شيل كتم': 'unmute', 'الغاء كتم': 'unmute',
  'شيل اسكات': 'unmute', 'فك سكوت': 'unmute', 'رجع صوته': 'unmute', 'فك التايم': 'unmute',
  'قفل الروم': 'lock', 'قفل القناه': 'lock', 'اقفل الروم': 'lock', 'اغلق الروم': 'lock', 'سكر الروم': 'lock', 'قفل الشات': 'lock',
  'فتح الروم': 'unlock', 'فك القفل': 'unlock', 'افتح القناه': 'unlock', 'فتح القناه': 'unlock', 'افتح الروم': 'unlock', 'فتح الشات': 'unlock',
  'مسح التحذيرات': 'clearwarns', 'شيل التحذيرات': 'clearwarns', 'مسح الانذارات': 'clearwarns', 'تصفير التحذيرات': 'clearwarns',
  'اعطاء رتبه': 'role', 'سحب رتبه': 'role', 'خذ رتبه': 'role', 'اعطي رتبه': 'role', 'ضيف رتبه': 'role', 'شيل رتبه': 'role',
  'تغيير لقب': 'nickname', 'غير لقب': 'nickname', 'غير لقبه': 'nickname', 'غير اسمه': 'nickname',
  'الوضع البطيء': 'slowmode', 'شغل البطيء': 'slowmode', 'خل البطيء': 'slowmode', 'وضع بطيء': 'slowmode',
  'سجل العقوبات': 'modlog', 'سجل الجزاءات': 'modlog', 'عرض العقوبات': 'modlog', 'قناه السجلات': 'modlog',
  'طرد عضو': 'kick', 'حظر عضو': 'ban', 'اسكات عضو': 'mute', 'كتم عضو': 'mute', 'تحذير عضو': 'warn',
  'مسح الرسائل': 'clear', 'نظف الشات': 'clear', 'امسح الشات': 'clear', 'حذف الرسائل': 'clear',
  // 💰 الاقتصاد
  'كم رصيدي': 'balance', 'رصيدي كم': 'balance', 'كم فلوسي': 'balance', 'وش رصيدي': 'balance', 'شو رصيدي': 'balance', 'كم معي': 'balance', 'ايش رصيدي': 'balance',
  'راتب يومي': 'daily', 'هديه يوميه': 'daily', 'الهديه اليوميه': 'daily', 'خذ راتبي': 'daily', 'المكافاه اليوميه': 'daily',
  'ابي اشتغل': 'work', 'روح اشتغل': 'work', 'ابغى اشتغل': 'work',
  'ايداع الكل': 'bank', 'سحب الكل': 'bank', 'حساب البنك': 'bank', 'رصيد البنك': 'bank',
  'توب الفلوس': 'leaderboard', 'توب اللفل': 'leaderboard', 'توب المستويات': 'leaderboard', 'اغنى الاعضاء': 'leaderboard', 'قائمه المتصدرين': 'leaderboard',
  'وش مستواي': 'rank', 'كم لفلي': 'rank', 'كم مستواي': 'rank', 'شو مستواي': 'rank',
  // 🎮 الألعاب
  'قائمه الالعاب': 'gamesinfo', 'وش الالعاب': 'gamesinfo', 'شو الالعاب': 'gamesinfo', 'كل الالعاب': 'gamesinfo', 'صاله الالعاب': 'gamesinfo',
  'الالعاب الجماعيه': 'group', 'العاب جماعيه': 'group', 'لعبه جماعيه': 'group',
  'خمن الرقم': 'guess', 'الرقم السري': 'guess', 'توقع الرقم': 'guess',
  'سباق الهجن': 'race', 'سباق جمال': 'race', 'سباق الجمال': 'race',
  'اعلى اقل': 'highlow', 'اعلى او اقل': 'highlow', 'فوق تحت': 'highlow', 'كبير صغير': 'highlow',
  'بطاقه كشط': 'scratch', 'كرت كشط': 'scratch', 'بطاقه الكشط': 'scratch',
  'صندوق الكنز': 'treasure', 'صناديق الكنز': 'treasure', 'افتح صندوق': 'treasure',
  'اطلق الصاروخ': 'crash', 'لعبه الصاروخ': 'crash',
  'ماكينه الحظ': 'slots', 'رمي العمله': 'coinflip', 'وجه كتابه': 'coinflip',
  'رمي النرد': 'dice', 'ارمي النرد': 'dice', 'ارمي زهر': 'dice',
  'حجره ورقه': 'rps', 'حجر ورقه': 'rps', 'حجره ورقه مقص': 'rps', 'حجر ورقه مقص': 'rps',
  'اكس او': 'tictactoe', 'اربعه بصف': 'connect4', 'اربعه في صف': 'connect4', 'صيد سمك': 'fish', 'كاسحه الالغام': 'minesweeper',
  // 🎉 السهرة
  'لو خيروك': 'social', 'كت تويت': 'social', 'صراحه ولا جراه': 'social', 'سؤال صراحه': 'social', 'تحدي جراه': 'social',
  'عجله الحظ': 'fun', 'نسبه الحب': 'fun', 'نسبه التوافق': 'fun',
  // 🛠️ أدوات
  'دليل الاوامر': 'help', 'قائمه الاوامر': 'help', 'وش الاوامر': 'help', 'كل الاوامر': 'help', 'شو الاوامر': 'help', 'ايش الاوامر': 'help',
  'الاختصارات العربيه': 'aliases', 'كل الاختصارات': 'aliases',
  'سرعه البوت': 'ping', 'حاله البوت': 'botstats', 'معلومات البوت': 'botstats',
  'معلومات السيرفر': 'servercard', 'بطاقه السيرفر': 'servercard', 'احصائيات السيرفر': 'servercard',
  'بطاقتي الشخصيه': 'membercard', 'هويتي الشخصيه': 'membercard', 'صورتي الشخصيه': 'avatar',
  'اذكار الصباح': 'adhkar', 'اذكار المساء': 'adhkar', 'اذكار النوم': 'adhkar',
  'ذكرني بعد': 'reminder', 'نبهني بعد': 'reminder',
  'اسال الذكاء': 'ai', 'سؤال للذكاء': 'ai', 'يا ذكاء': 'ai',
  'ترجم لي': 'translate', 'ترجم هذا': 'translate', 'ترجم للانجليزي': 'translate', 'ترجم للعربي': 'translate',
  'افتح تذكره': 'ticket', 'فتح تذكره': 'ticket', 'دعم فني': 'ticket',
  'تصويت سريع': 'poll', 'اعمل تصويت': 'poll', 'سوي تصويت': 'poll',
  'كم يساوي': 'calc', 'احسب لي': 'calc', 'اختار لي': 'choose', 'اختر لي': 'choose',
};

// ============ ألعاب جماعية مباشرة من الشات ============
const GROUP_TRIGGERS = {
  'كراسي': 'chairs', 'اقصاء': 'elimination', 'اسئله': 'quiz', 'اسرع': 'fastest',
  'فكك': 'scramble', 'حساب': 'math', 'ايموجي': 'emoji',
};

// ============ الحماية ============
/** أوامر لا تقبل كلاماً حراً بعدها (يُسمح فقط بأرقام/منشن/آيدي/«الكل») */
const SOLO = new Set(['help', 'info', 'features', 'botstats', 'ping', 'balance', 'daily', 'work', 'rank', 'achievements',
  'gamesinfo', 'avatar', 'banner', 'membercard', 'servercard', 'lock', 'unlock', 'quests', 'booster', 'fish',
  'guess', 'race', 'highlow', 'scratch', 'crash', 'treasure', 'slots', 'blackjack', 'minesweeper', 'hangman', 'wordle',
  'trivia', 'dice', 'social', 'tictactoe', 'connect4', 'prestige', 'colors']);
/** كلمات أصلها كلام يومي — تحتاج منشن لتعمل («حب @فلان») */
const WORD_NEED_MENTION = new Set(['حب', 'توافق', 'قيم', 'تقييم', 'نزال', 'مبارزه'].map(norm));
/** أوامر تحتاج منشن */
const NEED_MENTION = new Set(['pay', 'steal', 'marry', 'pet']);
/** أوامر إشراف تحتاج هدفاً: منشن، آيدي، أو رد على رسالة */
const NEED_TARGET = new Set(['ban', 'unban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'clearwarns', 'nickname', 'role']);
/** أوامر تحتاج رقماً (مسح 50) */
const NEED_NUMBER = new Set(['clear', 'slowmode', 'calc']);
/** أوامر تحتاج نصاً بعدها */
const NEED_TEXT = new Set(['poll', 'ai', 'translate', 'say', 'choose']);
/** أوامر الإشراف — تُتجاهل لو كتبها عضو بدون صلاحية */
const MOD_COMMANDS = new Set(['ban', 'unban', 'kick', 'mute', 'unmute', 'warn', 'warnings', 'clearwarns',
  'clear', 'lock', 'unlock', 'slowmode', 'nickname', 'role', 'say', 'modlog']);

// ============ بناء الفهارس بعد التطبيع ============
const WORD_INDEX = {};
const PHRASE_INDEX = {};
for (const [cmd, words] of Object.entries(COMMAND_WORDS)) {
  for (const w of words) {
    const n = norm(w);
    if (!WORD_INDEX[n]) WORD_INDEX[n] = cmd;
    // «خمن_الرقم» يعمل أيضاً كعبارة «خمن الرقم»
    if (n.includes('_')) {
      const parts = n.split('_').filter(Boolean);
      if (parts.length >= 2 && parts.length <= 3) { const ph = parts.join(' '); if (!PHRASE_INDEX[ph]) PHRASE_INDEX[ph] = cmd; }
    }
  }
}
for (const [k, v] of Object.entries(PHRASES)) PHRASE_INDEX[norm(k)] = v;
const GROUP_INDEX = {};
for (const [k, v] of Object.entries(GROUP_TRIGGERS)) GROUP_INDEX[norm(k)] = v;

// ============ أدوات الفحص ============
const NEUTRAL_WORDS = new Set(['الكل', 'كل', 'all', 'max', 'نص', 'نصف', 'half', 'ربع'].map(norm));
const isNum = (p) => /[\d٠-٩]/.test(p) && /^[\d٠-٩.,+\-*x×÷%()kmbKMB]+$/.test(p);
const isMention = (p) => /^<[@#]!?&?\d+>$/.test(p) || /^\d{17,21}$/.test(p);
const isNeutral = (p) => isNum(p) || isMention(p) || NEUTRAL_WORDS.has(norm(p));
function hasNumber(parts) { return parts.some((p) => /[\d٠-٩]/.test(p) && /^[\d٠-٩.,+\-*x×÷%()\s]+$/.test(p)); }
function hasMention(parts, message) {
  if (parts.some((p) => /^<@!?\d+>$/.test(p) || /^\d{17,21}$/.test(p))) return true;
  return message?.mentions?.users?.size > 0;
}
const hasTarget = (parts, message) => hasMention(parts, message) || !!message?.reference?.messageId;

/**
 * يحلّل محتوى الرسالة إلى أمر.
 * @returns {{command:string|null, args:string[], guard:string|null}|null}
 */
function resolve(content, { guildId = null, message = null, isAdmin = false } = {}) {
  const parts = String(content || '').split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const n = parts.map(norm);

  // 1) عبارات من 3 ثم 2 كلمات («حجر ورقه مقص»، «فك حظر @فلان»)
  if (parts.length >= 3 && PHRASE_INDEX[`${n[0]} ${n[1]} ${n[2]}`]) return finish(PHRASE_INDEX[`${n[0]} ${n[1]} ${n[2]}`], parts.slice(3), n[0]);
  if (parts.length >= 2 && PHRASE_INDEX[`${n[0]} ${n[1]}`]) return finish(PHRASE_INDEX[`${n[0]} ${n[1]}`], parts.slice(2), n[0]);

  // 2) كلمة مخصصة للسيرفر (يضيفها الإداري)
  const first = n[0];
  if (guildId) {
    try {
      const custom = readGuild(guildId)?.customAliases || {};
      if (custom[first]) return finish(custom[first], parts.slice(1), first, true);
    } catch {}
  }

  // 3) الكلمة الأساسية
  if (WORD_INDEX[first]) return finish(WORD_INDEX[first], parts.slice(1), first);

  // 4) الاختصارات العربية المعرفة داخل ملفات الأوامر
  const fromCmd = commandAliasOf(first);
  if (fromCmd) return finish(fromCmd, parts.slice(1), first);

  return null;

  function finish(command, args, word, custom = false) {
    if (!isAdmin && MOD_COMMANDS.has(command)) return { command: null, args, guard: 'mod_noperm' };
    if (!custom && SOLO.has(command) && args.some((a) => !isNeutral(a))) return { command: null, args, guard: 'solo' };
    if (WORD_NEED_MENTION.has(word) && !hasMention(args, message)) return { command: null, args, guard: 'need_mention' };
    if (NEED_MENTION.has(command) && !hasMention(args, message)) return { command: null, args, guard: 'need_mention' };
    if (NEED_TARGET.has(command) && !hasTarget(args, message)) return { command: null, args, guard: 'need_target' };
    if (NEED_NUMBER.has(command) && !hasNumber(args)) return { command: null, args, guard: 'need_number' };
    if (NEED_TEXT.has(command) && !args.length) return { command: null, args, guard: 'need_text' };
    return { command, args, guard: null, word };
  }
}

/** هل الرسالة تشغّل لعبة جماعية؟ (الكلمة وحدها أو معها أرقام فقط) */
function groupTrigger(content) {
  const parts = String(content || '').split(/\s+/).filter(Boolean);
  if (!parts.length) return null;
  const n0 = norm(parts[0]);
  let type = GROUP_INDEX[n0] || null;
  let rest = parts.slice(1);
  if (!type && n0 === 'روليت' && norm(parts[1] || '').startsWith('جماعي')) { type = 'elimination'; rest = parts.slice(2); }
  if (!type || rest.length > 2 || !rest.every(isNum)) return null;
  return type;
}

/** عدد كلمات التشغيل الكلية (للإحصاءات) */
function wordCount() {
  return Object.keys(WORD_INDEX).length + Object.keys(PHRASE_INDEX).length + Object.keys(GROUP_INDEX).length;
}

/** كلمات أمر معيّن (للمساعدة) */
function wordsFor(command) {
  const single = Object.entries(WORD_INDEX).filter(([, c]) => c === command).map(([w]) => w);
  const phr = Object.entries(PHRASE_INDEX).filter(([, c]) => c === command).map(([w]) => w);
  return [...new Set([...single, ...phr])];
}

// فهرس اختصارات الأوامر الداخلية — يُبنى كسولاً لتجنب دورات الاستيراد
let CMD_ALIAS_INDEX = null;
function commandAliasOf(word) {
  if (CMD_ALIAS_INDEX === null) {
    CMD_ALIAS_INDEX = {};
    try {
      const { commands } = require('../handlers/commandHandler');
      for (const cmd of new Set(commands.values())) {
        if (cmd.ownerOnly || cmd.category === 'admin') continue;
        for (const a of cmd.aliases || []) if (/[\u0600-\u06FF]/.test(a)) CMD_ALIAS_INDEX[norm(a)] = cmd.data?.name;
      }
    } catch { CMD_ALIAS_INDEX = {}; }
  }
  return CMD_ALIAS_INDEX[word] || null;
}

/** عرض كلمات سيرفر مخصصة للإداريين */
function listCustom(guildId) {
  try { return readGuild(guildId)?.customAliases || {}; } catch { return {}; }
}

// توافق مع الإصدارات السابقة
const BASE_MAP = Object.fromEntries(Object.entries(WORD_INDEX));
const TWO_WORD_MAP = PHRASES;

module.exports = {
  norm, resolve, groupTrigger, wordCount, wordsFor, listCustom,
  COMMAND_WORDS, PHRASES, SECTIONS, GROUP_INDEX, MOD_COMMANDS, NEED_MENTION, NEED_TARGET, NEED_NUMBER, NEED_TEXT, SOLO,
  WORD_INDEX, PHRASE_INDEX, BASE_MAP, TWO_WORD_MAP,
};
