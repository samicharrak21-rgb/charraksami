// 🌾 rpgCards v21 — بطاقات المزرعة (الحقل/الحظيرة/الصنع/السوق) + المهام + المتجر + ملف الصائد
const { hasCanvas, THEMES, INK, compact, _kit } = require('./cardKit');
const { txt, rr, grad, base, panel, pill, bar, ring, avatar, stat, footer, out, emoji, iconTile, hexBadge, ribbon, title, rays, sparkle, rng } = _kit;

const WOOD = { a: '#c8894a', b: '#6b3f1d', glow: 'rgba(200,137,74,0.35)', deep: '#1a0f06' };

/** إطار خشبي */
function woodFrame(ctx, x, y, w, h, r = 22) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
  rr(ctx, x, y, w, h, r); const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#7a4a22'); g.addColorStop(1, '#4a2a10'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, x, y, w, h, r); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
  for (let i = 0; i < h; i += 7) { ctx.beginPath(); ctx.moveTo(x, y + i); ctx.bezierCurveTo(x + w * 0.3, y + i + 3, x + w * 0.6, y + i - 3, x + w, y + i + 1); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(255,210,150,0.35)'; ctx.lineWidth = 2; rr(ctx, x + 1, y + 1, w - 2, h - 2, r); ctx.stroke(); ctx.restore();
}
/** تربة قطعة الأرض */
function soil(ctx, x, y, w, h, { wet = false, highlight = null } = {}) {
  ctx.save();
  rr(ctx, x, y, w, h, 16);
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, wet ? '#3d2614' : '#6a4424'); g.addColorStop(1, wet ? '#24160b' : '#3e2512');
  ctx.fillStyle = g;
  if (highlight) { ctx.shadowColor = highlight; ctx.shadowBlur = 26; }
  ctx.fill(); ctx.shadowBlur = 0;
  ctx.clip();
  // أخاديد
  for (let i = 1; i < 5; i++) {
    const yy = y + (h * i) / 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + w / 2, yy + 5, x + w, yy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,170,0.08)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, yy - 4); ctx.quadraticCurveTo(x + w / 2, yy + 1, x + w, yy - 4); ctx.stroke();
  }
  const r = rng(x * 7 + y);
  for (let i = 0; i < 26; i++) { ctx.fillStyle = `rgba(${r() > 0.5 ? '255,230,190' : '0,0,0'},${(0.06 + r() * 0.12).toFixed(2)})`; ctx.beginPath(); ctx.arc(x + r() * w, y + r() * h, 1 + r() * 2, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
  ctx.save(); rr(ctx, x, y, w, h, 16); ctx.lineWidth = highlight ? 3 : 1.5; ctx.strokeStyle = highlight || 'rgba(255,220,170,0.18)'; ctx.stroke(); ctx.restore();
}

/**
 * المزرعة: الحقل الكامل
 * plots: [{ state: empty|growing|ready|pest|frozen, crop: '🥕', name, pct, timeLeft, fertilized }]
 */
async function farmCard({ username, avatarURL, level = 1, xp = 0, nextXP = 1, weather = '', weatherLeft = '', season = '', day = 1, plots = [], stats = {}, balance = 0, streak = 0, barn = [], highlight = null }) {
  if (!hasCanvas()) return null;
  const cols = 4, gap = 16, W = 1000;
  const cellW = (W - 100 - 40 - (cols - 1) * gap) / cols, cellH = 150;
  const rows = Math.max(1, Math.ceil(plots.length / cols));
  const fieldY = 262, fieldH = rows * (cellH + gap) - gap + 40;
  const H = fieldY + fieldH + (barn.length ? 112 : 30) + 20;
  const { canvas, ctx, t } = base(W, H, 'emerald', { bg: 'farm', dim: 0.32, focusY: 0.35, fx: false });
  // الترويسة
  panel(ctx, 50, 36, W - 100, 132, 24, 'rgba(8,14,10,0.62)', { stroke: 'rgba(255,255,255,0.12)' });
  await avatar(ctx, avatarURL, W - 160, 54, 96, t, username);
  title(ctx, `مزرعة ${username || ''}`, W - 184, 94, t, { size: 34, maxW: 440 });
  let px = W - 184;
  if (weather) px -= pill(ctx, weatherLeft ? `${weather} · ${weatherLeft}` : weather, px, 112, THEMES.azure, { align: 'right', solid: false, h: 34, size: 15 }) + 8;
  if (season) px -= pill(ctx, `${season} · يوم ${day}`, px, 112, THEMES.amber, { align: 'right', solid: false, h: 34, size: 15 }) + 8;
  // المستوى + الرصيد
  hexBadge(ctx, 112, 102, 46, t, String(level), { size: 34 });
  txt(ctx, 'مستوى المزرعة', 172, 76, { size: 13, weight: 'normal', color: INK.sub });
  bar(ctx, 172, 88, 210, 14, xp / Math.max(1, nextXP), t);
  txt(ctx, `${compact(xp)} / ${compact(nextXP)} XP`, 172, 124, { size: 13, weight: 'normal', color: INK.text });
  txt(ctx, `💎 ${compact(balance)}`, 172, 152, { size: 18, color: THEMES.gold.a });
  if (streak) txt(ctx, `🔥 x${streak}`, 300, 152, { size: 16, color: THEMES.amber.a });
  // شرائح الحالة
  const chips = [['✅', 'جاهزة', stats.ready, THEMES.gold], ['🌿', 'تنمو', stats.growing, THEMES.emerald], ['🟫', 'فارغة', stats.empty, THEMES.slate], ['🐛', 'مصابة', stats.pests, THEMES.crimson], ['❄️', 'متجمدة', stats.frozen, THEMES.frost]].filter((c, i) => i < 3 || c[2]);
  let cx = W - 50;
  for (const [ic, l, v, ct] of chips) cx -= pill(ctx, `${l} ${v ?? 0}`, cx, 190, ct, { align: 'right', icon: ic, solid: Number(v) > 0 && ct === THEMES.gold, h: 40, size: 17 }) + 10;
  // الحقل
  woodFrame(ctx, 50, fieldY - 20, W - 100, fieldH);
  plots.forEach((p, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = 70 + (cols - 1 - c) * (cellW + gap), y = fieldY + r * (cellH + gap);
    const ready = p.state === 'ready', pest = p.state === 'pest', frozen = p.state === 'frozen';
    const hl = highlight === i ? '#ffffff' : ready ? '#ffd76a' : pest ? '#ff5a73' : frozen ? '#9fe6ff' : null;
    soil(ctx, x, y, cellW, cellH, { wet: p.watered, highlight: hl });
    const mx = x + cellW / 2, my = y + cellH / 2 - 8;
    if (p.state === 'empty') {
      ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,230,190,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mx, my, 26, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      txt(ctx, '+', mx, my + 2, { size: 30, align: 'center', base: 'middle', color: 'rgba(255,230,190,0.6)' });
      txt(ctx, 'فارغة · ازرع', mx, y + cellH - 18, { size: 15, align: 'center', color: 'rgba(255,240,220,0.75)' });
    } else if (p.state === 'growing') {
      const pct = Math.max(0, Math.min(1, p.pct || 0));
      const stage = pct < 0.25 ? '🌱' : pct < 0.6 ? '🌿' : p.crop;
      const sz = pct < 0.25 ? 46 : pct < 0.6 ? 58 : 50 + pct * 20;
      ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(mx, my + sz * 0.42, sz * 0.4, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      emoji(ctx, stage, mx, my, sz, { alpha: pct < 0.6 ? 1 : 0.85 });
      bar(ctx, x + 14, y + cellH - 30, cellW - 28, 10, pct, THEMES.emerald, { track: 'rgba(0,0,0,0.45)' });
      txt(ctx, `${p.name || ''}`, x + cellW - 14, y + 24, { size: 13, align: 'right', color: 'rgba(255,240,220,0.9)', maxW: cellW - 70 });
      txt(ctx, `⏳ ${p.timeLeft || ''}`, x + 14, y + 24, { size: 12, weight: 'normal', color: 'rgba(255,240,220,0.85)' });
    } else {
      if (ready) { rays(ctx, mx, my, 70, THEMES.gold, 12, 0.35); }
      emoji(ctx, p.crop, mx, my, 76, { glow: ready ? 'rgba(255,215,106,0.9)' : null, alpha: frozen ? 0.75 : 1 });
      if (ready) { sparkle(ctx, mx - 40, my - 26, 6, '#fff3b0'); sparkle(ctx, mx + 38, my + 18, 5, '#fff3b0'); sparkle(ctx, mx + 30, my - 34, 4, '#ffffff'); }
      if (frozen) {
        ctx.save(); rr(ctx, x, y, cellW, cellH, 16); ctx.clip(); const ice = ctx.createLinearGradient(x, y, x + cellW, y + cellH); ice.addColorStop(0, 'rgba(190,240,255,0.42)'); ice.addColorStop(1, 'rgba(90,170,255,0.18)'); ctx.fillStyle = ice; ctx.fillRect(x, y, cellW, cellH); ctx.restore();
        emoji(ctx, '❄️', x + cellW - 26, y + 26, 30);
      }
      if (pest) { emoji(ctx, '🐛', mx + 30, my + 22, 40, { rotate: -0.3 }); emoji(ctx, '🐛', mx - 34, my - 18, 26, { rotate: 0.5 }); }
      const label = ready ? `${p.name || ''} · جاهز` : pest ? 'مصاب بالآفات' : 'متجمد';
      const lt = ready ? THEMES.gold : pest ? THEMES.crimson : THEMES.frost;
      pill(ctx, label, mx, y + cellH - 40, lt, { align: 'center', h: 30, size: 13, solid: ready });
    }
    // رقم القطعة + التسميد
    const nb = x + cellW - 22, nby = p.state === 'growing' ? y + cellH - 52 : y + 22;
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(nb, nby, 14, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(255,230,190,0.4)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    txt(ctx, String(i + 1), nb, nby + 1, { size: 13, align: 'center', base: 'middle' });
    if (p.fertilized) emoji(ctx, '✨', x + 22, p.state === 'growing' ? y + cellH - 52 : y + 22, 22);
  });
  // شريط الحظيرة
  if (barn.length) {
    const by = fieldY + fieldH - 20 + 18;
    panel(ctx, 50, by, W - 100, 82, 20, 'rgba(8,14,10,0.62)');
    txt(ctx, '🐄 الحظيرة', W - 74, by + 48, { size: 19, align: 'right' });
    barn.slice(0, 8).forEach((a, i) => {
      const ax = W - 240 - i * 96;
      iconTile(ctx, a.emoji, ax, by + 41, 60, a.ready ? THEMES.gold : THEMES.slate, { solid: a.ready });
      if (a.ready) emoji(ctx, a.produce || '✅', ax + 24, by + 18, 24);
    });
  }
  return out(canvas, 'farm.png');
}

/** الحظيرة */
async function barnCard({ username, animals = [], max = 6, balance = 0, shop = [] }) {
  if (!hasCanvas()) return null;
  const W = 1000, cols = 3, gap = 18, cw = (W - 100 - (cols - 1) * gap) / cols, ch = 170;
  const rows = Math.max(1, Math.ceil(Math.max(animals.length, 1) / cols));
  const H = 170 + rows * (ch + gap) + (shop.length ? 130 : 20) + 20;
  const { canvas, ctx, t } = base(W, H, WOOD, { bg: 'farm', dim: 0.55, focusY: 0.7, fx: false });
  emoji(ctx, '🏡', W - 84, 82, 60, { glow: t.glow });
  title(ctx, 'الحظيرة', W - 128, 92, t, { size: 40 });
  txt(ctx, `${username ? username + ' · ' : ''}${animals.length}/${max} حيوانات`, W - 128, 126, { size: 17, weight: 'normal', color: INK.sub, align: 'right' });
  pill(ctx, compact(balance), 50, 64, THEMES.gold, { icon: '💎', h: 42, size: 20 });
  if (!animals.length) {
    woodFrame(ctx, 50, 160, W - 100, ch);
    emoji(ctx, '🐾', W / 2, 160 + ch / 2 - 14, 60, { alpha: 0.8 });
    txt(ctx, 'الحظيرة فارغة — اشترِ أول حيوان من القائمة', W / 2, 160 + ch - 26, { size: 18, align: 'center', color: '#ffe9cc' });
  }
  animals.forEach((a, i) => {
    const x = W - 50 - ((i % cols) + 1) * cw - (i % cols) * gap, y = 160 + Math.floor(i / cols) * (ch + gap);
    woodFrame(ctx, x, y, cw, ch, 20);
    // قش
    ctx.save(); rr(ctx, x + 10, y + ch - 50, cw - 20, 40, 12); const hay = ctx.createLinearGradient(0, y + ch - 50, 0, y + ch - 10); hay.addColorStop(0, '#d9b45a'); hay.addColorStop(1, '#9c7a2a'); ctx.fillStyle = hay; ctx.globalAlpha = 0.55; ctx.fill(); ctx.restore();
    if (a.ready) rays(ctx, x + 70, y + 76, 80, THEMES.gold, 12, 0.3);
    emoji(ctx, a.emoji, x + 70, y + 78, 84);
    txt(ctx, a.name, x + cw - 18, y + 46, { size: 22, align: 'right', color: '#fff3e0', maxW: cw - 150 });
    if (a.ready) { pill(ctx, 'منتج جاهز', x + cw - 18, y + 66, THEMES.gold, { align: 'right', icon: a.produce, h: 32, size: 14 }); }
    else { txt(ctx, `⏳ ${a.timeLeft}`, x + cw - 18, y + 90, { size: 15, align: 'right', color: '#ffe9cc' }); bar(ctx, x + 140, y + 104, cw - 158, 10, a.pct || 0, THEMES.amber, { track: 'rgba(0,0,0,0.4)' }); }
    txt(ctx, `${a.produce} ${compact(a.value)} 💎`, x + cw - 18, y + ch - 24, { size: 15, align: 'right', color: '#3a2508' });
  });
  if (shop.length) {
    const sy = 160 + rows * (ch + gap) + 6;
    panel(ctx, 50, sy, W - 100, 110, 20, 'rgba(10,8,6,0.6)');
    txt(ctx, 'للبيع', W - 74, sy + 34, { size: 16, color: INK.sub, align: 'right' });
    shop.slice(0, 4).forEach((s, i) => {
      const x = W - 74 - (i + 1) * 205;
      iconTile(ctx, s.emoji, x + 175, sy + 64, 50, s.locked ? THEMES.slate : THEMES.gold);
      txt(ctx, s.name, x + 140, sy + 58, { size: 16, align: 'right', maxW: 130, alpha: s.locked ? 0.5 : 1 });
      txt(ctx, s.locked ? `🔒 مستوى ${s.levelReq}` : `${compact(s.cost)} 💎`, x + 140, sy + 82, { size: 13, weight: 'normal', align: 'right', color: s.locked ? INK.sub : THEMES.gold.a });
    });
  }
  return out(canvas, 'barn.png');
}

/** مطبخ الصنع */
async function craftCard({ recipes = [], inventory = [] }) {
  if (!hasCanvas()) return null;
  const W = 1000, rowH = 108, H = 170 + recipes.length * rowH + 120;
  const { canvas, ctx, t } = base(W, H, 'amber', { bg: 'farm', dim: 0.72, fx: false });
  emoji(ctx, '🍳', W - 84, 82, 58, { glow: t.glow });
  title(ctx, 'مطبخ المزرعة', W - 128, 92, t, { size: 40 });
  txt(ctx, 'اصنع أطباقاً من محاصيلك وبِعها بأضعاف السعر', W - 128, 126, { size: 17, weight: 'normal', color: INK.sub, align: 'right' });
  recipes.forEach((r, i) => {
    const y = 160 + i * rowH;
    panel(ctx, 50, y, W - 100, rowH - 14, 20, r.can ? 'rgba(76,240,176,0.08)' : null, { stroke: r.can ? 'rgba(76,240,176,0.4)' : INK.line });
    iconTile(ctx, r.icon, W - 104, y + (rowH - 14) / 2, 66, r.can ? THEMES.emerald : THEMES.slate, { solid: r.can });
    txt(ctx, r.name, W - 152, y + 38, { size: 21, align: 'right', maxW: 300 });
    let ix = W - 152;
    r.ingredients.forEach((g) => {
      const ok = g.have >= g.need;
      ix -= pill(ctx, `${Math.min(g.have, g.need)}/${g.need}`, ix, y + 52, ok ? THEMES.emerald : THEMES.crimson, { align: 'right', solid: false, icon: g.emoji, h: 30, size: 14 }) + 8;
    });
    txt(ctx, `${compact(r.sell)} 💎`, 76, y + 44, { size: 24, color: THEMES.gold.a });
    txt(ctx, `+${r.xp} XP`, 76, y + 72, { size: 14, weight: 'normal', color: INK.sub });
    if (r.can) pill(ctx, 'جاهز للصنع', 200, y + 26, THEMES.emerald, { h: 30, size: 13, icon: '✅' });
  });
  const iy = 160 + recipes.length * rowH + 4;
  panel(ctx, 50, iy, W - 100, 90, 20);
  txt(ctx, '📦 المخزون', W - 74, iy + 54, { size: 18, align: 'right' });
  if (!inventory.length) txt(ctx, 'لا يوجد — خزّن محاصيلك بدل بيعها', W - 220, iy + 54, { size: 16, weight: 'normal', color: INK.sub, align: 'right' });
  inventory.slice(0, 11).forEach((it, i) => { const x = W - 240 - i * 64; emoji(ctx, it.emoji, x, iy + 40, 40); txt(ctx, `x${it.count}`, x, iy + 78, { size: 12, align: 'center', color: INK.text }); });
  return out(canvas, 'craft.png');
}

/** سوق المزرعة */
async function marketCard({ crops = [], weather = '', yieldMul = 1 }) {
  if (!hasCanvas()) return null;
  const W = 1000, cols = 2, gap = 16, cw = (W - 100 - gap) / cols, ch = 84;
  const rows = Math.ceil(crops.length / cols);
  const H = 170 + rows * (ch + 12) + 50;
  const { canvas, ctx, t } = base(W, H, 'azure', { bg: 'farm', dim: 0.74, fx: false });
  emoji(ctx, '📊', W - 84, 82, 56, { glow: t.glow });
  title(ctx, 'سوق المزرعة', W - 128, 92, t, { size: 40 });
  txt(ctx, 'أسعار البذور والبيع اليوم', W - 128, 126, { size: 17, weight: 'normal', color: INK.sub, align: 'right' });
  if (weather) pill(ctx, `${weather} · أرباح x${yieldMul}`, 50, 66, yieldMul >= 1 ? THEMES.emerald : THEMES.crimson, { h: 40, size: 16, solid: false });
  crops.forEach((c, i) => {
    const x = W - 50 - ((i % cols) + 1) * cw - (i % cols) * gap, y = 160 + Math.floor(i / cols) * (ch + 12);
    panel(ctx, x, y, cw, ch, 18, null, { stroke: c.rare ? 'rgba(255,215,106,0.5)' : INK.line });
    emoji(ctx, c.emoji, x + cw - 46, y + ch / 2, 48, { alpha: c.locked ? 0.45 : 1 });
    txt(ctx, c.name, x + cw - 86, y + 36, { size: 19, align: 'right', maxW: 200, alpha: c.locked ? 0.6 : 1 });
    txt(ctx, c.locked ? `🔒 مستوى ${c.levelReq}` : `⏱️ ${c.time} · +${c.xp} XP`, x + cw - 86, y + 64, { size: 13, weight: 'normal', align: 'right', color: INK.sub });
    txt(ctx, `${compact(c.cost)} ← ${compact(c.sell)} 💎`, x + 20, y + 38, { size: 17, color: THEMES.gold.a });
    txt(ctx, `ربح ${compact(c.sell - c.cost)}`, x + 20, y + 64, { size: 13, weight: 'normal', color: THEMES.emerald.a });
  });
  return out(canvas, 'market.png');
}

/** المهام اليومية */
async function questsCard({ username, avatarURL, quests = [], currency = '' }) {
  if (!hasCanvas()) return null;
  const rowH = 100, W = 1000, H = 180 + quests.length * rowH + 30;
  const { canvas, ctx, t } = base(W, H, 'azure', { bg: 'rank', dim: 0.72 });
  await avatar(ctx, avatarURL, W - 150, 40, 100, t, username);
  title(ctx, 'مهام اليوم', W - 176, 86, t, { size: 38 });
  txt(ctx, username || '', W - 176, 120, { size: 17, weight: 'normal', color: INK.sub, align: 'right' });
  const done = quests.filter((q) => q.cur >= q.target).length;
  ring(ctx, 110, 92, 46, 10, done / Math.max(1, quests.length), t);
  txt(ctx, `${done}/${quests.length}`, 110, 94, { size: 22, align: 'center', base: 'middle' });
  txt(ctx, 'مكتملة', 186, 98, { size: 16, weight: 'normal', color: INK.sub });
  quests.forEach((q, i) => {
    const y = 170 + i * rowH, ok = q.cur >= q.target;
    const qt = q.claimed ? THEMES.slate : ok ? THEMES.gold : t;
    panel(ctx, 50, y, W - 100, rowH - 16, 20, ok && !q.claimed ? 'rgba(255,215,106,0.08)' : null, { stroke: ok && !q.claimed ? 'rgba(255,215,106,0.45)' : INK.line });
    iconTile(ctx, q.claimed ? '✅' : ok ? '🎁' : (q.icon || '🎯'), W - 100, y + (rowH - 16) / 2, 56, qt, { solid: ok && !q.claimed });
    txt(ctx, q.name, W - 144, y + 36, { size: 20, align: 'right', maxW: 480, alpha: q.claimed ? 0.6 : 1 });
    bar(ctx, 300, y + 52, W - 460, 12, q.cur / Math.max(1, q.target), qt);
    txt(ctx, `${Math.min(q.cur, q.target)}/${q.target}`, W - 144, y + 66, { size: 13, weight: 'normal', color: INK.sub, align: 'right' });
    txt(ctx, `${compact(q.reward)} ${currency}`, 76, y + 38, { size: 19, color: THEMES.gold.a });
    txt(ctx, q.claimed ? 'تم الاستلام' : `+${q.xp} XP`, 76, y + 64, { size: 14, weight: 'normal', color: INK.sub });
  });
  return out(canvas, 'quests.png');
}

/** المتجر */
async function shopCard({ username, avatarURL, balance = 0, categories = [], currency = '' }) {
  if (!hasCanvas()) return null;
  const W = 1000, cw = (W - 100 - 40) / 3, chh = 130, rows = Math.ceil(categories.length / 3);
  const H = 200 + rows * (chh + 20) + 40;
  const { canvas, ctx, t } = base(W, H, 'gold', { bg: 'wealth', dim: 0.68 });
  await avatar(ctx, avatarURL, W - 150, 40, 100, t, username);
  title(ctx, 'المتجر الأسطوري', W - 176, 86, t, { size: 38 });
  txt(ctx, `مرحباً ${username || ''}`, W - 176, 120, { size: 17, weight: 'normal', color: INK.sub, align: 'right', maxW: 500 });
  emoji(ctx, '💎', 82, 96, 52, { glow: 'rgba(120,220,255,0.7)' });
  txt(ctx, compact(balance), 120, 112, { size: 48, color: t.a, glow: t.glow });
  txt(ctx, `رصيدك ${currency}`, 120, 140, { size: 15, weight: 'normal', color: INK.sub });
  const themes = ['crimson', 'azure', 'emerald', 'violet', 'gold', 'rose'];
  categories.forEach((c, i) => {
    const x = W - 50 - ((i % 3) + 1) * cw - (i % 3) * 20, y = 180 + Math.floor(i / 3) * (chh + 20);
    const ct = THEMES[themes[i % themes.length]];
    panel(ctx, x, y, cw, chh, 20);
    iconTile(ctx, c.emoji, x + cw - 52, y + 52, 64, ct, { solid: true });
    txt(ctx, c.name, x + cw - 98, y + 58, { size: 22, align: 'right', maxW: cw - 110 });
    if (c.desc) txt(ctx, c.desc, x + cw - 20, y + 108, { size: 14, weight: 'normal', color: INK.sub, align: 'right', maxW: cw - 40 });
  });
  footer(ctx, W, H, 'اختر فئة من القائمة بالأسفل');
  return out(canvas, 'shop.png');
}

/** ملف الصائد (الدانجن) */
async function hunterCard({ username, avatarURL, rank = 'E', rankName = '', level = 1, wins = 0, atk = 0, hp = 0, shadows = 0, shadowPower = 0, weapon = '', armor = '', cls = '', runs, bestStage }) {
  if (!hasCanvas()) return null;
  const RT = { E: 'slate', D: 'emerald', C: 'azure', B: 'violet', A: 'crimson', S: 'gold', SS: 'gold', SSS: 'amber', National: 'amber' };
  const W = 1000, H = 500;
  const { canvas, ctx, t } = base(W, H, RT[rank] || 'violet', { bg: 'arena', dim: 0.62 });
  await avatar(ctx, avatarURL, W - 220, 50, 160, t, username);
  txt(ctx, 'ملف الصائد', W - 260, 86, { size: 18, weight: 'normal', color: t.a, align: 'right' });
  title(ctx, username || '', W - 260, 136, t, { size: 42, maxW: 430 });
  let px = W - 260;
  px -= pill(ctx, `رتبة ${rank}`, px, 160, t, { align: 'right', icon: '🏅' }) + 10;
  if (cls) pill(ctx, cls, px, 160, t, { solid: false, align: 'right', icon: '⚔️' });
  // شعار الرتبة
  rays(ctx, 150, 140, 150, t, 16, 0.22);
  hexBadge(ctx, 150, 140, 92, t, rank, { size: rank.length > 2 ? 46 : 72 });
  if (rankName) txt(ctx, rankName, 150, 262, { size: 18, align: 'center', color: INK.text, maxW: 240 });
  const items = [['المستوى', level, '⭐'], ['الانتصارات', wins, '🏆'], ['جيش الظلال', `${shadows} · ${compact(shadowPower)}`, '👤'],
    ['هجوم إضافي', `+${atk}`, '⚔️'], ['صحة إضافية', `+${hp}`, '❤️'], ['العتاد', [weapon || '—', armor || '—'].join(' · '), '🛡️']];
  const cw = (W - 100 - 40) / 3;
  items.forEach(([l, v, ic], i) => stat(ctx, 50 + (2 - (i % 3)) * (cw + 20), 290 + Math.floor(i / 3) * 96, cw, 84, l, String(v), t, ic));
  return out(canvas, 'hunter.png');
}

module.exports = _kit.withReady({ farmCard, barnCard, craftCard, marketCard, questsCard, shopCard, hunterCard });
