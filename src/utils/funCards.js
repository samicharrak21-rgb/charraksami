// 💘 funCards — بطاقات أمر /fun (نفس تصميم cardKit الموحّد)
const { hasCanvas, THEMES, INK, _kit } = require('./cardKit');
const { txt, rr, grad, base, panel, pill, bar, avatar, footer, out } = _kit;

/** توافق الحب بين عضوين */
async function loveCard({ a, b, percent = 50, verdict = '' }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 400;
  const { canvas, ctx, t } = base(W, H, 'crimson');
  await avatar(ctx, a.avatarURL, 80, 80, 170, t, a.name);
  await avatar(ctx, b.avatarURL, W - 250, 80, 170, t, b.name);
  txt(ctx, a.name, 165, 300, { size: 22, align: 'center', maxW: 240 });
  txt(ctx, b.name, W - 165, 300, { size: 22, align: 'center', maxW: 240 });
  ctx.save(); ctx.shadowColor = t.glow; ctx.shadowBlur = 40;
  txt(ctx, '❤', W / 2, 150, { size: 120, align: 'center', base: 'middle', color: t.a }); ctx.restore();
  txt(ctx, `${percent}%`, W / 2, 158, { size: 40, align: 'center', base: 'middle', color: '#fff' });
  if (verdict) txt(ctx, verdict, W / 2, 262, { size: 22, align: 'center', color: t.a, maxW: 380 });
  bar(ctx, 80, 340, W - 160, 18, percent / 100, t);
  return out(canvas, 'love.png');
}

/** تقييم عضو */
async function rateCard({ user, score = 5, label = '' }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 330;
  const { canvas, ctx, t } = base(W, H, 'gold');
  await avatar(ctx, user.avatarURL, W - 210, 70, 160, t, user.name);
  txt(ctx, 'تقييم العضو', W - 250, 100, { size: 18, weight: 'normal', color: INK.sub, align: 'right' });
  txt(ctx, user.name, W - 250, 150, { size: 40, align: 'right', maxW: 450 });
  if (label) txt(ctx, label, W - 250, 190, { size: 20, weight: 'normal', color: t.a, align: 'right', maxW: 450 });
  txt(ctx, `${score}/10`, 70, 150, { size: 80, color: t.a });
  for (let i = 0; i < 10; i++) txt(ctx, '★', 70 + i * 40, 240, { size: 34, color: i < score ? t.a : 'rgba(255,255,255,0.15)' });
  return out(canvas, 'rate.png');
}

/** مبارزة سريعة */
async function duelCard({ a, b, hpA = 100, hpB = 100, winner = null, log = [] }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 440;
  const { canvas, ctx, t } = base(W, H, 'azure', { bg: 'rps', dim: 0.74 });
  const ta = winner && winner === b.id ? THEMES.slate : THEMES.azure;
  const tb = winner && winner === a.id ? THEMES.slate : THEMES.crimson;
  await avatar(ctx, a.avatarURL, 70, 60, 140, ta, a.name);
  await avatar(ctx, b.avatarURL, W - 210, 60, 140, tb, b.name);
  txt(ctx, a.name, 140, 245, { size: 22, align: 'center', maxW: 240 });
  txt(ctx, b.name, W - 140, 245, { size: 22, align: 'center', maxW: 240 });
  bar(ctx, 50, 265, 280, 16, hpA / 100, ta); bar(ctx, W - 330, 265, 280, 16, hpB / 100, tb);
  txt(ctx, 'VS', W / 2, 140, { size: 80, align: 'center', base: 'middle', color: t.a });
  panel(ctx, 50, 300, W - 100, 110, 16);
  log.slice(-3).forEach((l, i) => txt(ctx, l, W - 70, 334 + i * 30, { size: 17, weight: 'normal', align: 'right', maxW: W - 140 }));
  if (winner) pill(ctx, `🏆 ${winner === a.id ? a.name : b.name}`, W / 2, 200, THEMES.gold, { align: 'center', h: 44, size: 22 });
  return out(canvas, 'duel.png');
}

/** عجلة الحظ */
async function luckyWheelCard({ user, prizes = [], index = 0, prizeText = '' }) {
  if (!hasCanvas()) return null;
  const W = 1000, H = 520;
  const { canvas, ctx, t } = base(W, H, 'emerald', { bg: 'wheel', dim: 0.7 });
  const cx = 290, cy = 270, R = 210, n = prizes.length || 1, slice = (Math.PI * 2) / n;
  const rot = -Math.PI / 2 - (index + 0.5) * slice;
  const pal = [THEMES.emerald, THEMES.gold, THEMES.azure, THEMES.violet, THEMES.crimson, THEMES.slate];
  for (let i = 0; i < n; i++) {
    const a0 = rot + i * slice;
    ctx.save(); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a0 + slice); ctx.closePath();
    ctx.fillStyle = grad(ctx, cx - R, cy, cx + R, cy, pal[i % pal.length]); ctx.globalAlpha = i === index ? 1 : 0.7; ctx.fill();
    ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    const mid = a0 + slice / 2;
    ctx.save(); ctx.translate(cx + Math.cos(mid) * R * 0.62, cy + Math.sin(mid) * R * 0.62); ctx.rotate(mid + Math.PI / 2);
    txt(ctx, prizes[i].label, 0, 0, { size: 16, align: 'center', base: 'middle', color: '#0c0e13', maxW: R * 0.5 }); ctx.restore();
  }
  ctx.save(); ctx.beginPath(); ctx.moveTo(cx - 18, cy - R - 26); ctx.lineTo(cx + 18, cy - R - 26); ctx.lineTo(cx, cy - R + 8); ctx.closePath();
  ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
  await avatar(ctx, user.avatarURL, W - 210, 80, 140, t, user.name);
  txt(ctx, 'عجلة الحظ', W - 50, 280, { size: 22, weight: 'normal', color: INK.sub, align: 'right' });
  txt(ctx, user.name, W - 50, 320, { size: 30, align: 'right', maxW: 400 });
  pill(ctx, prizeText || prizes[index]?.label || '', W - 50, 350, t, { align: 'right', h: 48, size: 24 });
  footer(ctx, W, H, 'يمكنك التدوير مرة كل ساعة');
  return out(canvas, 'wheel.png');
}

module.exports = _kit.withReady({ loveCard, rateCard, duelCard, luckyWheelCard });
