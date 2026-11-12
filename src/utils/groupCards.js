// 🎉 groupCards — بطاقات صور الألعاب الجماعية (نفس تصميم cardKit الموحّد)
// كل دالة ترجع { buffer, name } أو null إن لم تتوفر مكتبة الرسم.
const { hasCanvas, THEMES, INK, compact, _kit } = require('./cardKit');
const { txt, rr, grad, base, panel, pill, avatar, footer, out } = _kit;

/** لوبي الانضمام مع صور اللاعبين */
async function lobbyCard({ game = 'لعبة جماعية', emoji = '🎉', desc = '', host, players = [], max = 20, seconds = 30 }) {
  if (!hasCanvas()) return null;
  const per = 8, size = 84, gap = 22;
  const rows = Math.max(1, Math.ceil(players.length / per));
  const W = 1000, H = 250 + rows * (size + 50) + 40;
  const { canvas, ctx, t } = base(W, H, 'violet', { bg: 'group', dim: 0.72 });
  txt(ctx, `${emoji} ${game}`, W - 50, 76, { size: 40, align: 'right', maxW: W - 300 });
  if (desc) txt(ctx, desc, W - 50, 112, { size: 17, weight: 'normal', color: INK.sub, align: 'right', maxW: W - 100 });
  pill(ctx, `${players.length}/${max} لاعب`, 50, 50, t, {});
  pill(ctx, `⏳ ${seconds} ثانية`, 50, 96, t, { solid: false });
  if (host) txt(ctx, `👑 المضيف: ${host}`, W - 50, 160, { size: 18, color: t.a, align: 'right', maxW: 600 });
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const col = i % per, row = Math.floor(i / per);
    const rowCount = Math.min(per, players.length - row * per);
    const total = rowCount * size + (rowCount - 1) * gap;
    const x = W - (W - total) / 2 - (col + 1) * size - col * gap;
    const y = 200 + row * (size + 50);
    await avatar(ctx, p.avatarURL, x, y, size, t, p.name);
    txt(ctx, p.name || '—', x + size / 2, y + size + 28, { size: 14, weight: 'normal', align: 'center', maxW: size + 16 });
  }
  footer(ctx, W, H, 'اضغط ✅ انضمام للمشاركة');
  return out(canvas, 'lobby.png');
}

/** عجلة الروليت مع اللاعب المختار */
async function rouletteCard({ players = [], picked = null, title = 'روليت الإقصاء', subtitle = '' }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 560;
  const { canvas, ctx, t } = base(W, H, 'crimson', { bg: 'roulette', dim: 0.72 });
  const cx = 300, cy = 290, R = 220;
  const n = Math.max(1, players.length);
  const palette = [THEMES.crimson, THEMES.violet, THEMES.azure, THEMES.gold, THEMES.emerald, THEMES.slate];
  const pickedIdx = picked ? players.findIndex((p) => p.id === picked.id) : -1;
  // تدوير العجلة بحيث يكون المختار تحت المؤشر (أعلى)
  const slice = (Math.PI * 2) / n;
  const rot = pickedIdx >= 0 ? -Math.PI / 2 - (pickedIdx + 0.5) * slice : -Math.PI / 2;
  ctx.save(); ctx.shadowColor = t.glow; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.arc(cx, cy, R + 12, 0, Math.PI * 2); ctx.fillStyle = '#1a1d27'; ctx.fill(); ctx.restore();
  for (let i = 0; i < n; i++) {
    const a0 = rot + i * slice, a1 = a0 + slice;
    const th = palette[i % palette.length];
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, R); g.addColorStop(0, th.b); g.addColorStop(1, th.a);
    ctx.fillStyle = g; ctx.globalAlpha = i === pickedIdx ? 1 : 0.75; ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    const mid = a0 + slice / 2;
    if (n <= 16) {
      ctx.save(); ctx.translate(cx + Math.cos(mid) * R * 0.62, cy + Math.sin(mid) * R * 0.62); ctx.rotate(mid + Math.PI / 2);
      txt(ctx, String(players[i]?.name || '?').slice(0, 10), 0, 0, { size: n > 10 ? 12 : 16, align: 'center', base: 'middle', color: '#0c0e13', maxW: R * 0.5 });
      ctx.restore();
    }
  }
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 36, 0, Math.PI * 2); ctx.fillStyle = grad(ctx, cx - 36, cy, cx + 36, cy, t); ctx.fill(); ctx.restore();
  txt(ctx, '🎯', cx, cy + 2, { size: 30, align: 'center', base: 'middle' });
  // المؤشر
  ctx.save(); ctx.beginPath(); ctx.moveTo(cx - 18, cy - R - 26); ctx.lineTo(cx + 18, cy - R - 26); ctx.lineTo(cx, cy - R + 8); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 10; ctx.fill(); ctx.restore();
  // يمين: النتيجة
  txt(ctx, title, W - 50, 90, { size: 38, align: 'right', maxW: 420 });
  if (subtitle) txt(ctx, subtitle, W - 50, 126, { size: 17, weight: 'normal', color: INK.sub, align: 'right', maxW: 420 });
  if (picked) {
    await avatar(ctx, picked.avatarURL, W - 230, 180, 160, t, picked.name);
    txt(ctx, picked.name || '—', W - 150, 400, { size: 32, align: 'center', color: t.a, maxW: 380 });
    pill(ctx, picked.label || 'وقع عليه الاختيار', W - 150, 430, t, { align: 'center', h: 42, size: 20 });
  } else {
    txt(ctx, 'العجلة تدور...', W - 150, 300, { size: 30, align: 'center', color: t.a });
  }
  footer(ctx, W, H, `${players.length} لاعب في العجلة`);
  return out(canvas, 'roulette.png');
}

/** الكراسي الموسيقية */
async function chairsCard({ players = [], seated = [], round = 1, phase = 'music' }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 460;
  const { canvas, ctx, t } = base(W, H, phase === 'stop' ? 'crimson' : 'azure', { bg: 'group', dim: 0.72 });
  txt(ctx, '🪑 الكراسي الموسيقية', W - 50, 76, { size: 38, align: 'right' });
  txt(ctx, phase === 'stop' ? 'توقفت الموسيقى! اجلس بسرعة' : phase === 'result' ? 'نتيجة الجولة' : '🎵 الموسيقى تعزف...', W - 50, 112, { size: 18, weight: 'normal', color: t.a, align: 'right' });
  pill(ctx, `الجولة ${round}`, 50, 50, t, {});
  pill(ctx, `${Math.max(0, players.length - 1)} كرسي`, 50, 96, t, { solid: false });
  const n = players.length, cx = W / 2, cy = 300, R = Math.min(130, 40 + n * 12);
  const chairs = Math.max(1, n - 1);
  for (let i = 0; i < chairs; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / chairs;
    txt(ctx, '🪑', cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55, { size: 26, align: 'center', base: 'middle' });
  }
  const size = n > 10 ? 44 : 60;
  for (let i = 0; i < n; i++) {
    const p = players[i];
    const a = -Math.PI / 2 + (i * Math.PI * 2) / n;
    const x = cx + Math.cos(a) * (R + 60) - size / 2, y = cy + Math.sin(a) * (R * 0.75 + 30) - size / 2;
    const sat = seated.includes(p.id);
    const th = phase === 'result' ? (sat ? THEMES.emerald : THEMES.crimson) : t;
    await avatar(ctx, p.avatarURL, x, y, size, th, p.name);
  }
  return out(canvas, 'chairs.png');
}

/** بطاقة سؤال (معلومات) */
async function questionCard({ question = '', answers = [], index = 1, total = 1, seconds = 15, correct = -1 }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 480;
  const { canvas, ctx, t } = base(W, H, 'violet', { bg: 'trivia', dim: 0.72 });
  pill(ctx, `السؤال ${index}/${total}`, W - 50, 40, t, { align: 'right' });
  pill(ctx, `⏳ ${seconds} ث`, 50, 40, t, { solid: false });
  txt(ctx, question, W / 2, 140, { size: 36, align: 'center', maxW: W - 100 });
  const letters = ['A', 'B', 'C', 'D'];
  const bw = (W - 100 - 20) / 2, bh = 96;
  answers.slice(0, 4).forEach((a, i) => {
    const x = W - 50 - ((i % 2) + 1) * bw - (i % 2) * 20, y = 200 + Math.floor(i / 2) * (bh + 20);
    const th = correct === i ? THEMES.emerald : t;
    panel(ctx, x, y, bw, bh, 18, correct === i ? 'rgba(62,230,160,0.15)' : 'rgba(255,255,255,0.05)');
    ctx.save(); ctx.fillStyle = grad(ctx, x, y, x + 56, y + 56, th); rr(ctx, x + bw - 74, y + 20, 56, 56, 14); ctx.fill(); ctx.restore();
    txt(ctx, letters[i], x + bw - 46, y + 50, { size: 26, align: 'center', base: 'middle', color: '#0c0e13' });
    txt(ctx, a, x + bw - 92, y + 58, { size: 24, align: 'right', maxW: bw - 120 });
  });
  return out(canvas, 'question.png');
}

/** كلمة كصورة (أسرع كاتب / الكلمة المبعثرة / الحساب / الإيموجي) — لا يمكن نسخها */
async function wordCard({ word = '', title = '⌨️ أسرع كاتب', hint = 'اكتب الكلمة بأسرع ما يمكن', round = 1, total = 1, seconds = 20, theme = 'azure' }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 340;
  const { canvas, ctx, t } = base(W, H, theme, { bg: 'trivia', dim: 0.72 });
  txt(ctx, title, W - 50, 66, { size: 26, align: 'right' });
  pill(ctx, `${round}/${total}`, 50, 36, t, {});
  pill(ctx, `⏳ ${seconds} ث`, 150, 36, t, { solid: false });
  panel(ctx, 80, 110, W - 160, 150, 26, 'rgba(255,255,255,0.06)');
  ctx.save(); ctx.shadowColor = t.glow; ctx.shadowBlur = 30;
  txt(ctx, word, W / 2, 190, { size: 76, align: 'center', base: 'middle', color: t.a, maxW: W - 220 });
  ctx.restore();
  // خطوط تشويش خفيفة لمنع قراءة النص آلياً
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(90, 130 + i * 22); ctx.bezierCurveTo(300, 100 + i * 30, 700, 220 - i * 20, W - 90, 140 + i * 20); ctx.stroke(); }
  ctx.restore();
  txt(ctx, hint, W / 2, 300, { size: 17, weight: 'normal', color: INK.sub, align: 'center' });
  return out(canvas, 'word.png');
}

/** منصة الفائزين (أفضل 3) */
async function podiumCard({ title = 'النتائج', entries = [], prize, currency = '' }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 560;
  const { canvas, ctx, t } = base(W, H, 'gold', { bg: 'group', dim: 0.72 });
  txt(ctx, `🏆 ${title}`, W / 2, 70, { size: 38, align: 'center', maxW: W - 100 });
  const medals = [THEMES.gold, THEMES.slate, { a: '#e9a06b', b: '#a8582a', glow: 'rgba(233,160,107,.3)' }];
  const slots = [{ i: 1, x: 200, h: 150 }, { i: 0, x: 500, h: 210 }, { i: 2, x: 800, h: 110 }];
  for (const s of slots) {
    const e = entries[s.i]; const th = medals[s.i];
    const bw = 220, by = H - 50 - s.h;
    ctx.save(); ctx.fillStyle = grad(ctx, s.x - bw / 2, by, s.x + bw / 2, H, th); ctx.globalAlpha = 0.9;
    rr(ctx, s.x - bw / 2, by, bw, s.h, 16); ctx.fill(); ctx.restore();
    txt(ctx, String(s.i + 1), s.x, by + s.h / 2 + 4, { size: 54, align: 'center', base: 'middle', color: '#14110a' });
    if (!e) continue;
    const size = s.i === 0 ? 120 : 96;
    await avatar(ctx, e.avatarURL, s.x - size / 2, by - size - 70, size, th, e.name);
    txt(ctx, e.name || '—', s.x, by - 40, { size: 20, align: 'center', maxW: bw });
    txt(ctx, `${compact(e.score)} نقطة`, s.x, by - 14, { size: 15, weight: 'normal', color: th.a, align: 'center' });
  }
  if (prize) footer(ctx, W, H, `🎁 جائزة المركز الأول: ${compact(prize)} ${currency}`);
  return out(canvas, 'podium.png');
}

module.exports = _kit.withReady({ lobbyCard, rouletteCard, chairsCard, questionCard, wordCard, podiumCard });
