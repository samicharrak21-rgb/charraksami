// 🎨 arcadeCards v23 — بطاقات الألعاب الجديدة بنفس منظومة «رويال نوار» (cardKit)
// كل بطاقة تستخدم صورة اللعبة الخاصة بها كخلفية (assets/games/<game>.jpg)
const { hasCanvas, THEMES, INK, compact, _kit } = require('./cardKit');
const { txt, rr, grad, base, panel, pill, bar, avatar, footer, out, emoji, ribbon, title, confetti, rays, playingCard, measure, withReady } = _kit;

const themeOf = (status) => ({ win: 'emerald', cashout: 'emerald', jackpot: 'gold', lose: 'crimson', crash: 'crimson', push: 'slate' }[status] || 'gold');

/** شريط علوي موحّد: اسم اللعبة + اللاعب + الرهان */
async function header(ctx, W, t, { game, icon, username, avatarURL, bet }) {
  await avatar(ctx, avatarURL, W - 116, 34, 74, t, username);
  txt(ctx, `${icon} ${game}`, W - 140, 66, { size: 30, align: 'right', shadow: true, maxW: 420 });
  txt(ctx, username || '', W - 140, 96, { size: 16, weight: 'normal', color: INK.sub, align: 'right', maxW: 300 });
  if (bet) pill(ctx, `الرهان ${compact(bet)} 💎`, 40, 44, THEMES.gold, { h: 38, size: 17 });
}
function resultBanner(ctx, W, H, t, status, text) {
  if (!text) return;
  if (status === 'win' || status === 'jackpot' || status === 'cashout') confetti(ctx, W, H, 36);
  ribbon(ctx, text, W / 2, H - 92, t, { size: 24, h: 50 });
}

/** 🐪 سباق الهجن */
async function raceCard({ racers, positions, length = 20, pick, winner, order = [], bet, net, username, avatarURL }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 520;
  const status = winner ? (Number(pick) === Number(winner) ? 'win' : 'lose') : null;
  const { canvas, ctx, t } = base(W, H, status ? themeOf(status) : 'gold', { bg: 'race', dim: 0.6 });
  await header(ctx, W, t, { game: 'سباق الهجن', icon: '🏁', username, avatarURL, bet });
  const laneY = 140, laneH = 66, x0 = 60, x1 = W - 140;
  racers.forEach((r, i) => {
    const y = laneY + i * (laneH + 8);
    const rt = THEMES[r.theme] || t;
    const mine = Number(pick) === r.id;
    panel(ctx, x0 - 20, y, W - 80, laneH, 16, mine ? 'rgba(255,215,106,0.10)' : null, { stroke: mine ? rt.a : INK.line, glow: mine ? rt.glow : null });
    // خط النهاية
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x1 + 30, y + 8); ctx.lineTo(x1 + 30, y + laneH - 8); ctx.stroke(); ctx.restore();
    const ratio = Math.min(1, (positions?.[i] || 0) / length);
    bar(ctx, x0, y + laneH / 2 - 5, x1 - x0, 10, ratio, rt);
    const ex = x0 + (x1 - x0) * ratio;
    emoji(ctx, r.emoji, Math.max(x0 + 20, ex), y + laneH / 2 - 4, 44, { glow: rt.glow });
    const place = order.indexOf(r.id);
    txt(ctx, `${r.id}. ${r.name}${mine ? ' ⭐' : ''}`, W - 60, y + 26, { size: 17, align: 'right', color: rt.a });
    if (winner && place >= 0) txt(ctx, ['🥇', '🥈', '🥉', '4️⃣'][place], W - 60, y + 54, { size: 18, align: 'right' });
  });
  if (winner) {
    const w = racers.find((r) => r.id === Number(winner));
    resultBanner(ctx, W, H, t, status, status === 'win' ? `فاز ${w?.name}! +${compact(net)} 💎` : `الفائز ${w?.name} — حظ أوفر`);
  }
  footer(ctx, W, H, 'سباق 500 2 · اختر هجيناً من 1 إلى 4 · الفوز ×3.5');
  return out(canvas, 'race.png');
}

/** 🃏 أعلى أو أقل */
async function highlowCard({ current, previous, history = [], mult = 1, bet, potential, status, round = 0, maxRounds = 10, chances = {}, username, avatarURL, net }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 520;
  const { canvas, ctx, t } = base(W, H, status ? themeOf(status) : 'gold', { bg: 'highlow', dim: 0.66 });
  await header(ctx, W, t, { game: 'أعلى أو أقل', icon: '🃏', username, avatarURL, bet });
  // الورقة السابقة صغيرة + الحالية كبيرة
  if (previous) { ctx.save(); ctx.globalAlpha = 0.7; playingCard(ctx, 590, 190, 100, 142, previous); ctx.restore(); txt(ctx, 'السابقة', 640, 360, { size: 14, weight: 'normal', color: INK.sub, align: 'center' }); }
  if (current) playingCard(ctx, 720, 150, 150, 214, current);
  // اللوحة اليسرى
  panel(ctx, 40, 140, 500, 240, 20);
  txt(ctx, 'المضاعف الحالي', 510, 184, { size: 16, weight: 'normal', color: INK.sub, align: 'right' });
  txt(ctx, `×${mult.toFixed(2)}`, 510, 250, { size: 58, color: t.a, align: 'right', glow: t.glow });
  txt(ctx, `الربح المحتمل: ${compact(potential ?? Math.floor((bet || 0) * mult))} 💎`, 510, 290, { size: 18, align: 'right' });
  bar(ctx, 70, 318, 440, 12, round / maxRounds, t, { ticks: true });
  txt(ctx, `الجولة ${round}/${maxRounds}`, 510, 358, { size: 14, weight: 'normal', color: INK.sub, align: 'right' });
  if (!status && (chances.up || chances.down)) {
    pill(ctx, `⬆️ أعلى ${Math.round((chances.up || 0) * 100)}%`, 70, 190, THEMES.emerald, { solid: false, h: 32, size: 15 });
    pill(ctx, `⬇️ أقل ${Math.round((chances.down || 0) * 100)}%`, 70, 232, THEMES.azure, { solid: false, h: 32, size: 15 });
  }
  // السجل
  history.slice(-8).forEach((h, i) => pill(ctx, h, 40 + i * 76, 404, i === Math.min(history.length, 8) - 1 ? t : THEMES.slate, { solid: false, h: 34, size: 17 }));
  const label = { win: `سحبت +${compact(net)} 💎`, cashout: `سحبت +${compact(net)} 💎`, lose: 'خسرت الرهان', push: 'تعادل' }[status];
  resultBanner(ctx, W, H, t, status, label);
  footer(ctx, W, H, 'كل تخمين صحيح يرفع المضاعف — اسحب أرباحك قبل أن تخسر');
  return out(canvas, 'highlow.png');
}

/** 🎟️ بطاقة الكشط */
async function scratchCard({ cells = [], revealed = [], bet, result, done = false, username, avatarURL, net }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 560;
  const status = done ? (result?.mult > 0 ? (result.mult >= 8 ? 'jackpot' : 'win') : 'lose') : null;
  const { canvas, ctx, t } = base(W, H, status ? themeOf(status) : 'gold', { bg: 'scratch', dim: 0.66 });
  await header(ctx, W, t, { game: 'بطاقة الكشط', icon: '🎟️', username, avatarURL, bet });
  const size = 100, gap = 12, gx = 80, gy = 128;
  cells.forEach((c, i) => {
    const x = gx + (i % 3) * (size + gap), y = gy + Math.floor(i / 3) * (size + gap);
    const open = done || revealed.includes(i);
    const hit = done && result?.symbol === c;
    if (!open) {
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 12;
      const g = ctx.createLinearGradient(x, y, x + size, y + size); g.addColorStop(0, '#f5d27a'); g.addColorStop(0.5, '#b8862e'); g.addColorStop(1, '#f0c766');
      rr(ctx, x, y, size, size, 18); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      ctx.save(); rr(ctx, x, y, size, size, 18); ctx.clip(); ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 2;
      for (let k = -size; k < size * 2; k += 14) { ctx.beginPath(); ctx.moveTo(x + k, y); ctx.lineTo(x + k - size, y + size); ctx.stroke(); }
      ctx.restore();
      txt(ctx, String(i + 1), x + size / 2, y + size / 2 + 2, { size: 34, align: 'center', base: 'middle', color: INK.dark });
    } else {
      panel(ctx, x, y, size, size, 18, hit ? 'rgba(255,215,106,0.18)' : 'rgba(10,12,18,0.7)', { stroke: hit ? t.a : INK.line, glow: hit ? t.glow : null });
      emoji(ctx, c, x + size / 2, y + size / 2, 64, { glow: hit ? t.glow : null, alpha: done && !hit && result?.symbol ? 0.45 : 1 });
    }
  });
  // جدول الجوائز
  const table = [['💎', '×20'], ['👑', '×8'], ['🍀', '×4'], ['🍒', '×2'], ['🪙', '×1']];
  panel(ctx, 520, 130, 440, 250, 20);
  txt(ctx, '3 رموز متطابقة = فوز', 930, 170, { size: 19, align: 'right', color: t.a });
  table.forEach(([s, m], i) => { emoji(ctx, s, 900, 210 + i * 36, 28); txt(ctx, `${s === '💎' ? 'الجوهرة' : s === '👑' ? 'التاج' : s === '🍀' ? 'البرسيم' : s === '🍒' ? 'الكرز' : 'العملة'}  ${m}`, 870, 218 + i * 36, { size: 17, weight: 'normal', align: 'right' }); });
  if (done) resultBanner(ctx, W, H, t, status, result?.mult > 0 ? `${result.symbol} ${result.name} ×${result.mult} — +${compact(net)} 💎` : 'لا يوجد تطابق — حظ أوفر');
  else txt(ctx, `مكشوف ${revealed.length}/9`, 740, 420, { size: 18, align: 'center', color: INK.sub, weight: 'normal' });
  footer(ctx, W, H, 'اكشط الخانات بالأزرار أو اضغط «اكشف الكل»');
  return out(canvas, 'scratch.png');
}

/** 🚀 الصاروخ */
async function crashCard({ steps = [], mult = 1, crashed = false, cashed = null, point, bet, username, avatarURL, net }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 520;
  const status = cashed ? 'cashout' : crashed ? 'crash' : null;
  const { canvas, ctx, t } = base(W, H, status ? themeOf(status) : 'amber', { bg: 'crash', dim: 0.6 });
  await header(ctx, W, t, { game: 'الصاروخ', icon: '🚀', username, avatarURL, bet });
  // الرسم البياني
  const gx = 60, gy = 140, gw = 600, gh = 270;
  panel(ctx, gx - 20, gy - 10, gw + 40, gh + 30, 18, 'rgba(5,6,10,0.55)');
  const maxM = Math.max(2, ...steps, mult);
  const pts = steps.map((m, i) => [gx + (gw * (i + 1)) / Math.max(steps.length, 1), gy + gh - (gh * (m - 1)) / (maxM - 1)]);
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) { const y = gy + (gh * i) / 5; ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke(); }
  ctx.restore();
  if (pts.length) {
    ctx.save(); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = t.glow; ctx.shadowBlur = 18;
    ctx.strokeStyle = grad(ctx, gx, 0, gx + gw, 0, t); ctx.beginPath(); ctx.moveTo(gx, gy + gh);
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.stroke();
    const fill = ctx.createLinearGradient(0, gy, 0, gy + gh); fill.addColorStop(0, t.glow); fill.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.lineTo(pts[pts.length - 1][0], gy + gh); ctx.closePath(); ctx.globalAlpha = 0.35; ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
    const [lx, ly] = pts[pts.length - 1];
    emoji(ctx, crashed && !cashed ? '💥' : '🚀', lx, ly, 52, { glow: t.glow });
  }
  // اللوحة اليمنى
  panel(ctx, 700, 140, 260, 270, 20);
  txt(ctx, crashed ? 'انفجر عند' : cashed ? 'سحبت عند' : 'المضاعف', 930, 182, { size: 16, weight: 'normal', color: INK.sub, align: 'right' });
  txt(ctx, `×${(cashed || (crashed ? point : mult)).toFixed(2)}`, 930, 252, { size: 54, color: t.a, align: 'right', glow: t.glow, maxW: 220 });
  if (cashed && point) txt(ctx, `الانفجار كان عند ×${point.toFixed(2)}`, 930, 292, { size: 15, weight: 'normal', color: INK.sub, align: 'right' });
  txt(ctx, `الربح المحتمل`, 930, 340, { size: 14, weight: 'normal', color: INK.sub, align: 'right' });
  txt(ctx, `${compact(Math.floor((bet || 0) * (cashed || mult)))} 💎`, 930, 376, { size: 26, align: 'right' });
  resultBanner(ctx, W, H, t, status, cashed ? `نجوت! +${compact(net)} 💎` : crashed ? 'انفجر الصاروخ 💥' : null);
  footer(ctx, W, H, 'اضغط «اسحب» قبل أن ينفجر الصاروخ · صاروخ 500 2 = سحب تلقائي عند ×2');
  return out(canvas, 'crash.png');
}

/** 🧰 صناديق الكنز */
async function treasureCard({ chests = [], picked = null, bet, username, avatarURL, net }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 500;
  const done = picked !== null && picked !== undefined;
  const prize = done ? chests[picked] : null;
  const status = done ? (prize.m >= 1 ? 'win' : prize.m > 0 ? 'push' : 'lose') : null;
  const { canvas, ctx, t } = base(W, H, status ? themeOf(status) : 'gold', { bg: 'treasure', dim: 0.62 });
  await header(ctx, W, t, { game: 'صناديق الكنز', icon: '🧰', username, avatarURL, bet });
  const cw = 260, ch = 230, gap = 30, x0 = (W - (cw * 3 + gap * 2)) / 2, y0 = 140;
  for (let i = 0; i < 3; i++) {
    const x = x0 + i * (cw + gap);
    const c = chests[i];
    const isPick = done && i === picked;
    panel(ctx, x, y0, cw, ch, 22, isPick ? 'rgba(255,215,106,0.14)' : null, { stroke: isPick ? t.a : INK.line, glow: isPick ? t.glow : null });
    if (isPick) rays(ctx, x + cw / 2, y0 + 100, 110, t, 12, 0.2);
    emoji(ctx, done ? c.emoji : '🧰', x + cw / 2, y0 + 100, done ? 92 : 110, { glow: isPick ? t.glow : null, alpha: done && !isPick ? 0.5 : 1 });
    txt(ctx, done ? `${c.label} ×${c.m}` : `الصندوق ${i + 1}`, x + cw / 2, y0 + 196, { size: 20, align: 'center', color: isPick ? t.a : INK.text, maxW: cw - 30 });
  }
  if (done) resultBanner(ctx, W, H, t, status, prize.m > 0 ? `${prize.label} — ${net >= 0 ? '+' : '−'}${compact(Math.abs(net))} 💎` : 'صندوق فارغ — حظ أوفر');
  footer(ctx, W, H, 'كنز ملكي ×2.2 · عملات ×0.6 · فارغ ×0');
  return out(canvas, 'treasure.png');
}

/** 💬 بطاقة الأسئلة الاجتماعية (صراحة، جرأة، لو خيروك، لغز...) */
async function socialCard({ kind = 'صراحة', icon = '💬', text = '', theme = 'gold', username, avatarURL, extra }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 420;
  const { canvas, ctx, t } = base(W, H, theme, { bg: 'social', dim: 0.7 });
  await avatar(ctx, avatarURL, W - 116, 34, 74, t, username);
  txt(ctx, `${icon} ${kind}`, W - 140, 72, { size: 32, align: 'right', color: t.a, shadow: true });
  txt(ctx, username ? `لـ ${username}` : '', W - 140, 100, { size: 15, weight: 'normal', color: INK.sub, align: 'right', maxW: 300 });
  panel(ctx, 50, 140, W - 100, extra ? 170 : 210, 22);
  const lines = _kit.wrap(ctx, text, W - 160, 28, 'bold', 4);
  const y0 = 140 + (extra ? 170 : 210) / 2 - ((lines.length - 1) * 42) / 2 + 8;
  lines.forEach((l, i) => txt(ctx, l, W / 2, y0 + i * 42, { size: 28, align: 'center', maxW: W - 160 }));
  if (extra) txt(ctx, extra, W / 2, 350, { size: 18, align: 'center', color: t.a, weight: 'normal', maxW: W - 140 });
  footer(ctx, W, H, 'صراحه · جرأه · لو خيروك · لغز · نكته · حكمه · كت');
  return out(canvas, 'social.png');
}

module.exports = withReady({ raceCard, highlowCard, scratchCard, crashCard, treasureCard, socialCard });
