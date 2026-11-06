// 🎴 cardKit v19 — نظام تصميم موحّد لكل بطاقات البوت
// تصميم "Noir": خلفية داكنة أنيقة + لون مميز واحد لكل بطاقة + خطوط واضحة + لوحات زجاجية رفيعة
// كل دالة ترجع { buffer, name } أو null إن لم تتوفر مكتبة الرسم.
const path = require('path');
const fs = require('fs');
const arabicReshaper = require('arabic-reshaper');

let bidi = null;
try {
  const m = require('bidi-js');
  bidi = typeof m === 'function' ? m() : typeof m?.default === 'function' ? m.default() : m;
} catch {}

let C = null;
try {
  C = require('@napi-rs/canvas');
  const f = path.resolve(__dirname, '../../assets/fonts/cairo.ttf');
  if (fs.existsSync(f)) C.GlobalFonts.registerFromPath(f, 'Cairo');
  const e = path.resolve(__dirname, '../../assets/fonts/noto-emoji.ttf');
  if (fs.existsSync(e)) C.GlobalFonts.registerFromPath(e, 'NotoEmoji');
} catch { C = null; }

const hasCanvas = () => !!C;
const FONT = '"Cairo", "NotoEmoji", "DejaVu Sans", Arial, sans-serif';
const font = (size, weight = 'bold') => `${weight} ${size}px ${FONT}`;

// ===== الألوان =====
const THEMES = {
  gold:    { a: '#f5c451', b: '#e08a1e', glow: 'rgba(245,196,81,0.35)' },
  emerald: { a: '#3ee6a0', b: '#0fa47a', glow: 'rgba(62,230,160,0.30)' },
  crimson: { a: '#ff5d73', b: '#c3173a', glow: 'rgba(255,93,115,0.32)' },
  azure:   { a: '#5cc8ff', b: '#2b6cff', glow: 'rgba(92,200,255,0.32)' },
  violet:  { a: '#b69cff', b: '#6d4aff', glow: 'rgba(182,156,255,0.30)' },
  slate:   { a: '#c9d1e0', b: '#7d8799', glow: 'rgba(201,209,224,0.22)' },
};
const INK = { bg: '#0c0e13', bg2: '#141821', text: '#f4f6fb', sub: '#9aa3b5', line: 'rgba(255,255,255,0.08)' };

// ===== نصوص =====
function ar(text) {
  const t = String(text ?? '');
  if (!/[\u0600-\u06FF]/.test(t)) return t;
  try {
    const r = arabicReshaper.reshape(t);
    return bidi?.getReorderedProposed ? bidi.getReorderedProposed(r) : r;
  } catch { return t; }
}
function fit(ctx, text, maxW, size, weight = 'bold', min = 14) {
  let s = size;
  ctx.font = font(s, weight);
  while (s > min && ctx.measureText(text).width > maxW) { s -= 1; ctx.font = font(s, weight); }
  return s;
}
function txt(ctx, text, x, y, { size = 24, weight = 'bold', color = INK.text, align = 'left', base = 'alphabetic', maxW } = {}) {
  const t = ar(text);
  ctx.save();
  ctx.textAlign = align; ctx.textBaseline = base; ctx.fillStyle = color;
  if (maxW) fit(ctx, t, maxW, size, weight); else ctx.font = font(size, weight);
  ctx.fillText(t, x, y);
  ctx.restore();
}
const compact = (n) => {
  n = Number(n) || 0;
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('en-US');
};

// ===== أشكال =====
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function grad(ctx, x0, y0, x1, y1, t) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, t.a); g.addColorStop(1, t.b); return g;
}

/** الخلفية الأساسية لكل البطاقات */
function base(W, H, theme = 'gold') {
  const t = THEMES[theme] || THEMES.gold;
  const canvas = C.createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.save();
  rr(ctx, 0, 0, W, H, 26); ctx.clip();
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, INK.bg2); bg.addColorStop(1, INK.bg);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // توهج ناعم بلون البطاقة
  const g1 = ctx.createRadialGradient(W * 0.85, -H * 0.1, 10, W * 0.85, -H * 0.1, Math.max(W, H) * 0.8);
  g1.addColorStop(0, t.glow); g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  // نقش خطوط قطرية خفيفة
  ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 1;
  for (let i = -H; i < W; i += 22) { ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke(); }
  // شريط علوي رفيع
  ctx.fillStyle = grad(ctx, 0, 0, W, 0, t); ctx.fillRect(0, 0, W, 5);
  ctx.restore();
  // إطار رفيع
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2; rr(ctx, 1, 1, W - 2, H - 2, 26); ctx.stroke(); ctx.restore();
  return { canvas, ctx, t };
}
function panel(ctx, x, y, w, h, r = 18, fill = 'rgba(255,255,255,0.045)') {
  ctx.save(); ctx.fillStyle = fill; rr(ctx, x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = INK.line; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
}
function pill(ctx, text, x, y, t, { h = 36, size = 18, solid = true, align = 'left' } = {}) {
  ctx.save(); ctx.font = font(size); const s = ar(text);
  const w = ctx.measureText(s).width + h * 0.9;
  const px = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  rr(ctx, px, y, w, h, h / 2);
  if (solid) { ctx.fillStyle = grad(ctx, px, 0, px + w, 0, t); ctx.fill(); }
  else { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fill(); ctx.strokeStyle = t.a; ctx.lineWidth = 1.5; ctx.stroke(); }
  ctx.fillStyle = solid ? '#14110a' : t.a; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(s, px + w / 2, y + h / 2 + 1); ctx.restore();
  return w;
}
function bar(ctx, x, y, w, h, ratio, t) {
  ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.07)'; rr(ctx, x, y, w, h, h / 2); ctx.fill();
  const fw = Math.max(h, w * Math.max(0, Math.min(1, ratio)));
  ctx.shadowColor = t.glow; ctx.shadowBlur = 14;
  ctx.fillStyle = grad(ctx, x, 0, x + fw, 0, t); rr(ctx, x, y, fw, h, h / 2); ctx.fill(); ctx.restore();
}
const imgCache = new Map();
async function avatar(ctx, url, x, y, size, t, name = '?') {
  ctx.save();
  ctx.shadowColor = t.glow; ctx.shadowBlur = 24;
  ctx.fillStyle = grad(ctx, x, y, x + size, y + size, t);
  rr(ctx, x - 5, y - 5, size + 10, size + 10, size * 0.3); ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, x, y, size, size, size * 0.27); ctx.clip();
  let img = null;
  if (url) {
    try {
      img = imgCache.get(url) || await C.loadImage(url);
      if (imgCache.size > 200) imgCache.clear();
      imgCache.set(url, img);
    } catch {}
  }
  if (img) ctx.drawImage(img, x, y, size, size);
  else {
    ctx.fillStyle = '#1d2230'; ctx.fillRect(x, y, size, size);
    txt(ctx, String(name).trim().charAt(0).toUpperCase() || '?', x + size / 2, y + size / 2 + 2, { size: size * 0.45, color: t.a, align: 'center', base: 'middle' });
  }
  ctx.restore();
}
function stat(ctx, x, y, w, h, label, value, t) {
  panel(ctx, x, y, w, h, 16);
  ctx.save(); ctx.fillStyle = grad(ctx, x, y, x, y + h, t); rr(ctx, x + w - 6, y + 16, 4, h - 32, 2); ctx.fill(); ctx.restore();
  txt(ctx, label, x + w - 22, y + 34, { size: 16, weight: 'normal', color: INK.sub, align: 'right' });
  txt(ctx, value, x + w - 22, y + h - 22, { size: 30, align: 'right', maxW: w - 40 });
}
function footer(ctx, W, H, text) {
  txt(ctx, text, W / 2, H - 16, { size: 13, weight: 'normal', color: 'rgba(255,255,255,0.35)', align: 'center' });
}
const out = async (canvas, name) => ({ buffer: await canvas.encode('png'), name });

// ================= البطاقات =================

/** بطاقة الملف الشخصي / الرتبة */
async function profileCard({ username, level = 0, xp = 0, nextXP = 1, balance = 0, avatarURL, stats = {}, rpgClass, rank }) {
  if (!C) return null;
  const W = 1000, H = 520;
  const { canvas, ctx, t } = base(W, H, 'violet');
  await avatar(ctx, avatarURL, W - 230, 50, 180, t, username);
  txt(ctx, username || 'Player', W - 270, 112, { size: 46, align: 'right', maxW: 560 });
  let px = W - 270;
  px -= pill(ctx, `المستوى ${level}`, px, 138, t, { align: 'right' }) + 10;
  if (rpgClass) px -= pill(ctx, rpgClass, px, 138, t, { solid: false, align: 'right' }) + 10;
  if (rank) pill(ctx, `#${rank}`, px, 138, t, { solid: false, align: 'right' });
  txt(ctx, 'الخبرة', W - 270, 218, { size: 16, weight: 'normal', color: INK.sub, align: 'right' });
  txt(ctx, `${compact(xp)} / ${compact(nextXP)} XP`, 50, 218, { size: 16, color: INK.text });
  bar(ctx, 50, 232, W - 320, 22, xp / Math.max(1, nextXP), t);
  const items = [
    ['الرصيد', compact(balance)], ['الرسائل', compact(stats.messages_count)], ['مرات العمل', compact(stats.work_count)],
    ['الدانجن', compact(stats.dungeon_runs ?? stats.dungeon_count)], ['المزرعة', compact(stats.farm_count ?? stats.harvests)], ['الألعاب', compact(stats.games_played ?? stats.slots_count)],
  ];
  const cw = (W - 100 - 40) / 3;
  items.forEach(([l, v], i) => stat(ctx, 50 + (2 - (i % 3)) * (cw + 20), 290 + Math.floor(i / 3) * 105, cw, 90, l, v, t));
  return out(canvas, 'profile.png');
}

/** بطاقة الرصيد */
async function balanceCard({ username, balance = 0, bank = 0, level, currency = 'جوهرة', avatarURL, rank, totalUsers }) {
  if (!C) return null;
  const W = 1000, H = 400;
  const { canvas, ctx, t } = base(W, H, 'gold');
  await avatar(ctx, avatarURL, W - 190, 50, 140, t, username);
  txt(ctx, 'المحفظة', W - 230, 80, { size: 18, weight: 'normal', color: INK.sub, align: 'right' });
  txt(ctx, username || 'Player', W - 230, 128, { size: 40, align: 'right', maxW: 480 });
  txt(ctx, compact(balance + bank), 50, 120, { size: 64, color: t.a });
  txt(ctx, `إجمالي الثروة · ${currency}`, 50, 152, { size: 16, weight: 'normal', color: INK.sub });
  const cw = (W - 100 - 40) / 3;
  stat(ctx, 50 + 2 * (cw + 20), 230, cw, 110, 'في اليد', compact(balance), t);
  stat(ctx, 50 + (cw + 20), 230, cw, 110, 'في البنك', compact(bank), t);
  stat(ctx, 50, 230, cw, 110, rank ? 'الترتيب' : 'المستوى', rank ? `#${rank}${totalUsers ? ' / ' + totalUsers : ''}` : String(level ?? 0), t);
  return out(canvas, 'balance.png');
}

/** بطاقة المتصدرين */
async function leaderboardCard({ title = 'المتصدرون', entries = [], guildName = '' }) {
  if (!C) return null;
  const rowH = 76, W = 1000;
  const H = 150 + Math.max(1, entries.length) * rowH + 30;
  const { canvas, ctx, t } = base(W, H, 'gold');
  txt(ctx, title, W / 2, 70, { size: 40, align: 'center', maxW: W - 100 });
  if (guildName) txt(ctx, guildName, W / 2, 104, { size: 18, weight: 'normal', color: INK.sub, align: 'center' });
  const medals = [THEMES.gold, THEMES.slate, { a: '#e9a06b', b: '#a8582a', glow: 'rgba(233,160,107,.3)' }];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]; const y = 140 + i * rowH; const mt = medals[i] || t;
    panel(ctx, 40, y, W - 80, rowH - 12, 16, i < 3 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.035)');
    ctx.save(); ctx.fillStyle = i < 3 ? grad(ctx, 0, y, 0, y + 50, mt) : 'rgba(255,255,255,0.08)';
    rr(ctx, W - 110, y + 10, 50, 44, 12); ctx.fill(); ctx.restore();
    txt(ctx, String(i + 1), W - 85, y + 33, { size: 22, align: 'center', base: 'middle', color: i < 3 ? '#14110a' : INK.text });
    await avatar(ctx, e.avatarURL, W - 180, y + 9, 46, mt, e.name);
    txt(ctx, e.name || '—', W - 200, y + (e.subtitle ? 32 : 40), { size: 22, align: 'right', maxW: 420 });
    if (e.subtitle) txt(ctx, e.subtitle, W - 200, y + 54, { size: 14, weight: 'normal', color: INK.sub, align: 'right', maxW: 420 });
    txt(ctx, String(e.value ?? ''), 70, y + 41, { size: 24, color: i < 3 ? mt.a : INK.text, maxW: 260 });
  }
  return out(canvas, 'leaderboard.png');
}

/** بطاقة رفع المستوى */
async function levelUpCard({ username, level = 1, oldLevel, avatarURL, xp = 0, nextXP = 0, reward }) {
  if (!C) return null;
  const W = 1000, H = 330;
  const { canvas, ctx, t } = base(W, H, 'emerald');
  await avatar(ctx, avatarURL, W - 200, 60, 150, t, username);
  txt(ctx, 'ترقية مستوى', W - 240, 92, { size: 18, weight: 'normal', color: t.a, align: 'right' });
  txt(ctx, username || 'Player', W - 240, 142, { size: 40, align: 'right', maxW: 450 });
  if (reward) txt(ctx, `🎁 ${reward}`, W - 240, 182, { size: 18, weight: 'normal', color: INK.sub, align: 'right', maxW: 450 });
  txt(ctx, String(oldLevel ?? level - 1), 70, 160, { size: 54, color: INK.sub });
  txt(ctx, '←', 190, 158, { size: 44, color: t.a, align: 'center' });
  txt(ctx, String(level), 240, 168, { size: 86, color: t.a });
  if (nextXP) { bar(ctx, 50, 250, W - 100, 16, xp / nextXP, t); txt(ctx, `${compact(xp)} / ${compact(nextXP)} XP`, 50, 238, { size: 14, weight: 'normal', color: INK.sub }); }
  return out(canvas, 'levelup.png');
}

/** بطاقة لوحة الألوان (أمر الألوان) */
async function colorsCard({ colors = [], current = null, guildName = '' }) {
  if (!C) return null;
  const cols = 5, cell = 172, gap = 18, W = 60 + cols * cell + (cols - 1) * gap + 40;
  const rows = Math.ceil(colors.length / cols);
  const H = 150 + rows * (cell * 0.78 + gap) + 50;
  const { canvas, ctx, t } = base(W, H, 'azure');
  txt(ctx, 'لوحة الألوان', W - 50, 72, { size: 40, align: 'right' });
  txt(ctx, guildName ? `${guildName} · اختر رقم لونك` : 'اختر رقم لونك', W - 50, 106, { size: 17, weight: 'normal', color: INK.sub, align: 'right' });
  colors.forEach((c, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = W - 50 - (col + 1) * cell - col * gap, y = 140 + row * (cell * 0.78 + gap), h = cell * 0.78;
    const sel = current && current.toLowerCase() === String(c.hex).toLowerCase();
    panel(ctx, x, y, cell, h, 18);
    ctx.save(); ctx.shadowColor = c.hex; ctx.shadowBlur = sel ? 26 : 12;
    ctx.fillStyle = c.hex; rr(ctx, x + 12, y + 12, cell - 24, h * 0.52, 12); ctx.fill(); ctx.restore();
    if (sel) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; rr(ctx, x + 12, y + 12, cell - 24, h * 0.52, 12); ctx.stroke(); ctx.restore(); }
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(ctx, x + 20, y + 20, 38, 28, 9); ctx.fill(); ctx.restore();
    txt(ctx, String(i + 1), x + 39, y + 35, { size: 16, align: 'center', base: 'middle' });
    txt(ctx, c.name, x + cell - 16, y + h - 32, { size: 19, align: 'right', maxW: cell - 30 });
    txt(ctx, String(c.hex).toUpperCase(), x + 16, y + h - 14, { size: 12, weight: 'normal', color: INK.sub });
  });
  footer(ctx, W, H, 'اكتب: الوان <الرقم> · أو اضغط زر اللون');
  return out(canvas, 'colors.png');
}

/** بطاقة نتيجة لعبة عامة */
async function gameResultCard({ game = 'لعبة', outcome = 'win', title, subtitle, username, avatarURL, amount, balance, details = [] }) {
  if (!C) return null;
  const theme = outcome === 'win' ? 'emerald' : outcome === 'lose' ? 'crimson' : 'slate';
  const W = 1000, H = 360 + (details.length ? 0 : -60);
  const { canvas, ctx, t } = base(W, H, theme);
  await avatar(ctx, avatarURL, W - 170, 46, 120, t, username);
  txt(ctx, game, W - 205, 78, { size: 18, weight: 'normal', color: INK.sub, align: 'right' });
  txt(ctx, title || (outcome === 'win' ? 'فوز' : outcome === 'lose' ? 'خسارة' : 'تعادل'), W - 205, 132, { size: 48, color: t.a, align: 'right', maxW: 520 });
  if (subtitle) txt(ctx, subtitle, W - 205, 164, { size: 18, weight: 'normal', color: INK.text, align: 'right', maxW: 520 });
  if (amount !== undefined && amount !== null) {
    const sign = amount > 0 ? '+' : amount < 0 ? '−' : '';
    txt(ctx, `${sign}${compact(Math.abs(amount))}`, 50, 120, { size: 58, color: t.a });
    if (balance !== undefined) {
      ctx.font = font(16); const bw = ctx.measureText(compact(balance)).width;
      txt(ctx, compact(balance), 50, 152, { size: 16, color: INK.text });
      txt(ctx, 'الرصيد', 60 + bw, 152, { size: 16, weight: 'normal', color: INK.sub });
    }
  }
  if (details.length) {
    const n = Math.min(4, details.length), cw = (W - 100 - (n - 1) * 20) / n;
    details.slice(0, 4).forEach(([l, v], i) => stat(ctx, W - 50 - (i + 1) * cw - i * 20, 210, cw, 100, l, String(v), t));
  }
  return out(canvas, 'result.png');
}

/** ورقة لعب */
function playingCard(ctx, x, y, w, h, card, hidden) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
  rr(ctx, x, y, w, h, 12);
  if (hidden) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#2b6cff'); g.addColorStop(1, '#122a66');
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; rr(ctx, x + 8, y + 8, w - 16, h - 16, 8); ctx.stroke();
    txt(ctx, '?', x + w / 2, y + h / 2 + 4, { size: 40, align: 'center', base: 'middle', color: 'rgba(255,255,255,.6)' }); ctx.restore();
    return;
  }
  ctx.fillStyle = '#fbfaf6'; ctx.fill(); ctx.restore();
  const red = /[♥♦]/.test(card.suit);
  const col = red ? '#d3243b' : '#15171c';
  txt(ctx, card.rank, x + 12, y + 32, { size: 24, color: col });
  txt(ctx, card.suit, x + 12, y + 56, { size: 20, color: col });
  txt(ctx, card.suit, x + w / 2, y + h / 2 + 8, { size: 48, color: col, align: 'center', base: 'middle' });
}
/** طاولة البلاك جاك */
async function blackjackCard({ player = [], dealer = [], playerTotal, dealerTotal, hideDealer = true, status, username, bet }) {
  if (!C) return null;
  const W = 1000, H = 560;
  const { canvas, ctx, t } = base(W, H, status === 'lose' ? 'crimson' : status === 'win' ? 'emerald' : 'gold');
  // طاولة خضراء
  ctx.save(); const felt = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, W * 0.6);
  felt.addColorStop(0, '#11583f'); felt.addColorStop(1, '#072a1f'); ctx.fillStyle = felt;
  rr(ctx, 30, 30, W - 60, H - 60, 22); ctx.fill(); ctx.strokeStyle = 'rgba(245,196,81,.35)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  const cw = 96, ch = 136, row = (cards, y, hideSecond) => {
    const total = cards.length * cw + (cards.length - 1) * 16; let x = (W - total) / 2;
    cards.forEach((c, i) => { playingCard(ctx, x, y, cw, ch, c, hideSecond && i === 1); x += cw + 16; });
  };
  txt(ctx, `الموزّع · ${hideDealer ? '?' : dealerTotal}`, W / 2, 72, { size: 20, align: 'center', color: '#e8f5ee' });
  row(dealer, 90, hideDealer);
  txt(ctx, `${username || 'أنت'} · ${playerTotal}`, W / 2, 290, { size: 20, align: 'center', color: '#e8f5ee' });
  row(player, 308, false);
  const label = { win: 'فزت!', lose: 'خسرت', tie: 'تعادل', blackjack: 'بلاك جاك!', bust: 'تجاوزت 21' }[status];
  if (label) pill(ctx, label, W / 2, 470, t, { align: 'center', h: 44, size: 22 });
  else if (bet) txt(ctx, `الرهان: ${compact(bet)}`, W / 2, 498, { size: 18, align: 'center', color: '#f5c451' });
  return out(canvas, 'blackjack.png');
}

/** بطاقة قائمة الأوامر */
async function helpCard({ botName = 'البوت', categories = [] }) {
  if (!C) return null;
  const cols = 2, W = 1000, cardH = 150, gap = 20;
  const rows = Math.ceil(categories.length / cols);
  const H = 150 + rows * (cardH + gap) + 40;
  const { canvas, ctx, t } = base(W, H, 'azure');
  txt(ctx, `أوامر ${botName}`, W - 50, 76, { size: 42, align: 'right' });
  txt(ctx, 'اختر قسماً من القائمة بالأسفل لعرض التفاصيل', W - 50, 110, { size: 17, weight: 'normal', color: INK.sub, align: 'right' });
  const cw = (W - 100 - gap) / 2;
  categories.forEach((c, i) => {
    const x = W - 50 - ((i % 2) + 1) * cw - (i % 2) * gap, y = 140 + Math.floor(i / 2) * (cardH + gap);
    const th = THEMES[c.theme] || t;
    panel(ctx, x, y, cw, cardH, 18);
    ctx.save(); ctx.fillStyle = grad(ctx, x, y, x + 60, y + 60, th); rr(ctx, x + cw - 76, y + 20, 56, 56, 16); ctx.fill(); ctx.restore();
    txt(ctx, c.icon || '•', x + cw - 48, y + 50, { size: 28, align: 'center', base: 'middle' });
    txt(ctx, c.name, x + cw - 92, y + 52, { size: 24, align: 'right', maxW: cw - 120 });
    txt(ctx, `${c.commands.length} أمر`, x + 24, y + 52, { size: 15, weight: 'normal', color: th.a });
    txt(ctx, c.commands.slice(0, 6).join(' · '), x + cw - 24, y + 112, { size: 15, weight: 'normal', color: INK.sub, align: 'right', maxW: cw - 48 });
  });
  return out(canvas, 'help.png');
}

module.exports = {
  hasCanvas, THEMES, compact, ar,
  profileCard, balanceCard, leaderboardCard, levelUpCard,
  colorsCard, gameResultCard, blackjackCard, helpCard,
};
