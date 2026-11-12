// 🎮 Arcade v23 — منطق الألعاب الجديدة (منفصل عن ديسكورد لسهولة الاختبار)
// خمن الرقم · سباق الهجن · أعلى/أقل · بطاقة الكشط · الصاروخ · صناديق الكنز

const R = () => Math.random();
const pick = (arr, rng = R) => arr[Math.floor(rng() * arr.length)];
const round2 = (n) => Math.round(n * 100) / 100;

// ───────────── 🔮 خمن الرقم ─────────────
const GUESS = { min: 1, max: 100, tries: 7 };
/** المضاعف حسب عدد المحاولات المستخدمة (1 = من أول مرة) */
const GUESS_MULT = [0, 10, 5, 3, 2, 1.5, 1.2, 1];
const guessMultiplier = (triesUsed) => GUESS_MULT[triesUsed] || 0;
function guessHint(target, n) {
  if (n === target) return { dir: 'hit', heat: '🎯 صح!' };
  const d = Math.abs(target - n);
  const heat = d <= 3 ? '🔥 حار جداً' : d <= 10 ? '♨️ حار' : d <= 20 ? '🌤️ دافئ' : d <= 35 ? '❄️ بارد' : '🧊 متجمد';
  return { dir: n < target ? 'up' : 'down', heat };
}

// ───────────── 🐪 سباق الهجن ─────────────
const RACERS = [
  { id: 1, name: 'البرق', emoji: '🐪', theme: 'gold' },
  { id: 2, name: 'الريح', emoji: '🐫', theme: 'azure' },
  { id: 3, name: 'الصقر', emoji: '🐪', theme: 'crimson' },
  { id: 4, name: 'الغزال', emoji: '🐫', theme: 'emerald' },
];
const RACE_LEN = 20;
const RACE_PAYOUT = 3.5; // احتمال 25% × 3.5 = عائد 87.5%
function simulateRace(rng = R) {
  const pos = RACERS.map(() => 0);
  const frames = [];
  let guard = 0;
  while (Math.max(...pos) < RACE_LEN && guard++ < 100) {
    for (let i = 0; i < pos.length; i++) pos[i] = Math.min(RACE_LEN, pos[i] + 1 + Math.floor(rng() * 4));
    frames.push([...pos]);
  }
  // الترتيب: الأبعد أولاً، والتعادل يُحسم عشوائياً
  const tie = RACERS.map(() => rng());
  const order = RACERS.map((r, i) => i).sort((a, b) => (pos[b] - pos[a]) || (tie[b] - tie[a])).map((i) => RACERS[i].id);
  return { frames, order, winner: order[0] };
}
const racePayout = (bet, pickId, winnerId) => (Number(pickId) === Number(winnerId) ? Math.floor(bet * RACE_PAYOUT) : 0);

// ───────────── 🃏 أعلى أو أقل ─────────────
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];
const drawCard = (rng = R) => { const v = 1 + Math.floor(rng() * 13); return { v, rank: RANKS[v - 1], suit: pick(SUITS, rng) }; };
const HL_EDGE = 0.95;
const HL_MAX_ROUNDS = 10;
/** احتمال التخمين الصحيح (التساوي = إعادة بدون خسارة، لذلك يُستبعد) */
function hlChance(v, dir) {
  const fav = dir === 'up' ? 13 - v : v - 1;
  return fav / 12;
}
/** مضاعف الخطوة: عادل مع هامش 5% وأقصى 12× */
function hlStep(v, dir) {
  const p = hlChance(v, dir);
  if (p <= 0) return 0;
  return Math.min(12, round2(HL_EDGE / p));
}
/** نتيجة سحب: win | lose | push */
function hlResolve(prev, next, dir) {
  if (next === prev) return 'push';
  return (dir === 'up' ? next > prev : next < prev) ? 'win' : 'lose';
}

// ───────────── 🎟️ بطاقة الكشط ─────────────
const SCRATCH = [
  { s: '💎', name: 'الجوهرة', w: 3, m: 20 },
  { s: '👑', name: 'التاج', w: 6, m: 8 },
  { s: '🍀', name: 'البرسيم', w: 10, m: 4 },
  { s: '🍒', name: 'الكرز', w: 15, m: 2 },
  { s: '🪙', name: 'العملة', w: 20, m: 1 },
  { s: '🍋', name: 'الليمون', w: 22, m: 0 },
  { s: '💀', name: 'الجمجمة', w: 24, m: 0 },
];
const SCRATCH_W = SCRATCH.reduce((a, b) => a + b.w, 0);
function scratchSymbol(rng = R) {
  let r = rng() * SCRATCH_W;
  for (const it of SCRATCH) { if (r < it.w) return it.s; r -= it.w; }
  return SCRATCH[SCRATCH.length - 1].s;
}
const makeScratch = (rng = R) => Array.from({ length: 9 }, () => scratchSymbol(rng));
/** أعلى مضاعف لرمز يظهر 3 مرات أو أكثر */
function scratchResult(cells) {
  const count = {};
  for (const c of cells) count[c] = (count[c] || 0) + 1;
  let best = null;
  for (const it of SCRATCH) if ((count[it.s] || 0) >= 3 && it.m > 0 && (!best || it.m > best.m)) best = it;
  return best ? { symbol: best.s, name: best.name, mult: best.m } : { symbol: null, name: null, mult: 0 };
}

// ───────────── 🚀 الصاروخ ─────────────
const CRASH_STEPS = [1.0, 1.15, 1.3, 1.5, 1.75, 2.0, 2.4, 2.8, 3.3, 4.0, 5.0, 6.5, 8.0, 10, 13, 17, 22, 30, 40, 50];
const CRASH_EDGE = 0.96;
/** نقطة الانفجار: توزيع عادل مع هامش 4% (1% ينفجر فوراً) */
function crashPoint(rng = R) {
  const r = rng();
  if (r < 0.01) return 1.0;
  return Math.min(50, Math.max(1, Math.floor((CRASH_EDGE / (1 - r)) * 100) / 100));
}
/** الخطوات التي سيراها اللاعب قبل الانفجار */
const crashVisible = (point) => CRASH_STEPS.filter((m) => m <= point);
const crashPayout = (bet, mult) => Math.floor(bet * mult);

// ───────────── 🧰 صناديق الكنز ─────────────
const CHESTS = [
  { key: 'jackpot', m: 2.2, emoji: '👑', label: 'الكنز الملكي' },
  { key: 'half', m: 0.6, emoji: '🪙', label: 'بعض العملات' },
  { key: 'empty', m: 0, emoji: '🕸️', label: 'صندوق فارغ' },
];
function shuffleChests(rng = R) {
  const a = [...CHESTS];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** قراءة رقم من نص (يدعم الأرقام العربية) */
const toNum = (s) => {
  const t = String(s ?? '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
  return /^\d+$/.test(t) ? parseInt(t, 10) : null;
};

module.exports = {
  pick, round2, toNum,
  GUESS, GUESS_MULT, guessMultiplier, guessHint,
  RACERS, RACE_LEN, RACE_PAYOUT, simulateRace, racePayout,
  RANKS, SUITS, drawCard, hlChance, hlStep, hlResolve, HL_MAX_ROUNDS,
  SCRATCH, makeScratch, scratchResult,
  CRASH_STEPS, crashPoint, crashVisible, crashPayout,
  CHESTS, shuffleChests,
};
