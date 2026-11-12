// 🏰 dungeonCards — بطاقات الدانجن المصوّرة (البوابة، الخريطة، القتال، الأحداث، النهاية)
const { hasCanvas, THEMES, INK, compact, strip, _kit } = require('./cardKit');
const { txt, rr, grad, base, panel, pill, bar, hpBar, avatar, stat, out, emoji, iconTile, hexBadge, ribbon, title, rays, sparkle, scene, bossArt, wrap, confetti } = _kit;

const STAGE_LOOK = {
  1: { bg: 'stage1', theme: 'violet' },
  2: { bg: 'stage2', theme: 'toxic' },
  3: { bg: 'stage3', theme: 'amber' },
  4: { bg: 'stage4', theme: 'frost' },
  5: { bg: 'stage3', theme: 'crimson' },
};
/** شكل المرحلة (المراحل الأعلى من 5 تدور على الصور بلون ذهبي) */
function stageLook(id = 1) {
  if (STAGE_LOOK[id]) return { ...STAGE_LOOK[id], boss: id };
  const k = ((id - 1) % 4) + 1;
  return { bg: `stage${k}`, theme: id >= 31 ? 'rose' : id >= 16 ? 'amber' : 'gold', boss: ((id - 1) % 5) + 1 };
}
const RANK_THEME = { E: 'slate', D: 'emerald', C: 'azure', B: 'violet', A: 'crimson', S: 'gold', SS: 'amber', SSS: 'rose' };

/** صورة/أيقونة العدو */
function drawEnemy(ctx, e, cx, cy, size, look, t) {
  const art = e.isBoss ? bossArt(look.boss) : null;
  // هالة
  const g = ctx.createRadialGradient(cx, cy, 10, cx, cy, size * 0.75);
  g.addColorStop(0, e.isBoss ? 'rgba(255,60,80,0.45)' : t.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
  // ظل على الأرض
  ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.48, size * 0.42, size * 0.08, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  if (art) {
    const s = Math.min(size * 1.15 / art.height, size * 1.15 / art.width) * 1.0;
    const w = art.width * s, h = art.height * s;
    ctx.save(); ctx.shadowColor = 'rgba(255,60,80,0.6)'; ctx.shadowBlur = 30; ctx.drawImage(art, cx - w / 2, cy + size * 0.5 - h, w, h); ctx.restore();
  } else {
    const disc = ctx.createRadialGradient(cx, cy - size * 0.1, 4, cx, cy, size * 0.48);
    disc.addColorStop(0, 'rgba(255,255,255,0.42)'); disc.addColorStop(0.6, t.glow); disc.addColorStop(1, 'rgba(255,255,255,0.04)');
    ctx.save(); ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(cx, cy, size * 0.48, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = t.a; ctx.globalAlpha = 0.6; ctx.lineWidth = 2.5; ctx.setLineDash([4, 8]); ctx.stroke(); ctx.restore();
    emoji(ctx, e.emoji || '👾', cx, cy, size * 0.6, { glow: 'rgba(255,255,255,0.7)' });
  }
  if (e.status) emoji(ctx, e.status.emoji, cx + size * 0.42, cy - size * 0.38, 40);
}

/** شريط تقدم الغرف */
function track(ctx, W, y, roomIndex, totalRooms, t) {
  const n = totalRooms + 1, x0 = 90, x1 = W - 90;
  const step = (x1 - x0) / Math.max(1, n - 1);
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  const done = Math.min(roomIndex, n - 1);
  ctx.strokeStyle = grad(ctx, x1, 0, x1 - done * step, 0, t); ctx.shadowColor = t.glow; ctx.shadowBlur = 10; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x1 - done * step, y); ctx.stroke(); ctx.restore();
  for (let i = 0; i < n; i++) {
    const x = x1 - i * step; // من اليمين إلى اليسار
    const boss = i === n - 1;
    if (boss) { emoji(ctx, '💀', x, y, 34, { glow: 'rgba(255,60,80,0.8)' }); continue; }
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, i === roomIndex ? 10 : 6, 0, Math.PI * 2);
    if (i < roomIndex) { ctx.fillStyle = t.a; ctx.fill(); }
    else if (i === roomIndex) { ctx.fillStyle = '#fff'; ctx.shadowColor = t.a; ctx.shadowBlur = 18; ctx.fill(); }
    else { ctx.fillStyle = 'rgba(10,12,18,0.9)'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
  }
}

/** لوحة السجل */
function logPanel(ctx, x, y, w, h, log) {
  panel(ctx, x, y, w, h, 18, 'rgba(6,7,12,0.72)');
  txt(ctx, '📜 آخر الأحداث', x + w - 20, y + 30, { size: 15, color: INK.sub, align: 'right' });
  const lines = log.slice(-3).map(strip);
  lines.forEach((l, i) => {
    const last = i === lines.length - 1;
    txt(ctx, l, x + w - 20, y + 62 + i * 30, { size: last ? 17 : 15, weight: last ? 'bold' : 'normal', color: last ? INK.text : INK.sub, align: 'right', maxW: w - 40, min: 11 });
  });
}

/** لوحة حالة اللاعب */
function playerPanel(ctx, x, y, w, h, p, t) {
  panel(ctx, x, y, w, h, 18, 'rgba(6,7,12,0.72)');
  const r = Math.max(0, p.hp) / Math.max(1, p.maxHp);
  txt(ctx, `❤️ ${compact(Math.max(0, p.hp))} / ${compact(p.maxHp)}`, x + w - 20, y + 32, { size: 17, align: 'right' });
  if (p.status) txt(ctx, `${p.status.emoji} ${p.status.name}`, x + 20, y + 32, { size: 14, color: THEMES.crimson.a });
  hpBar(ctx, x + 20, y + 44, w - 40, 14, r);
  const items = [['⚔️', compact(p.atk)], ['🧪', p.potions], ['💰', compact(p.gold)], ['🔥', `x${p.comboCount || 0}`]];
  const cw = (w - 40) / items.length;
  items.forEach(([ic, v], i) => {
    const cx = x + w - 20 - i * cw - cw / 2;
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.05)'; rr(ctx, cx - cw / 2 + 4, y + 70, cw - 8, h - 84, 12); ctx.fill(); ctx.restore();
    txt(ctx, `${ic} ${v}`, cx, y + 70 + (h - 84) / 2 + 1, { size: 17, align: 'center', base: 'middle' });
  });
}

/** باب */
function door(ctx, cx, y, w, h, label, t, n) {
  ctx.save();
  ctx.beginPath(); ctx.moveTo(cx - w / 2, y + h); ctx.lineTo(cx - w / 2, y + w / 2); ctx.arc(cx, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(cx + w / 2, y + h); ctx.closePath();
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(20,14,10,0.92)'); g.addColorStop(1, 'rgba(50,32,18,0.95)');
  ctx.fillStyle = g; ctx.shadowColor = t.glow; ctx.shadowBlur = 30; ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = t.a; ctx.lineWidth = 3; ctx.stroke();
  // ضوء غامض في الداخل
  const lg = ctx.createRadialGradient(cx, y + h * 0.55, 4, cx, y + h * 0.55, w * 0.6); lg.addColorStop(0, t.glow.replace(/[\d.]+\)$/, '0.9)')); lg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lg; ctx.fill();
  ctx.restore();
  txt(ctx, '?', cx, y + h * 0.55, { size: 44, align: 'center', base: 'middle', color: t.a, glow: t.glow });
  pill(ctx, label, cx, y + h + 12, t, { align: 'center', h: 34, size: 16, solid: false, icon: '🚪' });
}

/**
 * بطاقة الدانجن الشاملة
 * s: { phase, stage, dungeonLevel, roomIndex, totalRooms, player, enemy, room, log, party, avatarURL, result }
 */
async function dungeonCard(s) {
  if (!hasCanvas()) return null;
  const look = stageLook(s.stage?.id || 1);
  const phase = s.phase;
  const W = 1000, H = 640;
  const bg = phase === 'event' ? 'room' : look.bg;
  const theme = phase === 'gameover' ? 'crimson' : phase === 'victory' ? 'gold' : s.enemy?.isBoss ? 'crimson' : look.theme;
  const { canvas, ctx, t } = base(W, H, theme, { bg, dim: phase === 'combat' ? 0.38 : 0.45, fx: phase !== 'combat' });
  // الترويسة
  hexBadge(ctx, 84, 74, 40, THEMES[RANK_THEME[s.stage?.gateRank] || 'violet'], s.stage?.gateRank || 'E', { size: (s.stage?.gateRank || 'E').length > 2 ? 18 : 28 });
  title(ctx, strip(s.stage?.name || 'بوابة'), W - 50, 72, t, { size: 30, maxW: 640 });
  const roomTxt = s.roomIndex >= s.totalRooms ? 'غرفة الزعيم' : `الغرفة ${s.roomIndex + 1} من ${s.totalRooms}`;
  txt(ctx, `مستوى البوابة ${s.dungeonLevel} · ${roomTxt}${s.party?.length > 1 ? ` · فريق ${s.party.length}` : ''}`, W - 50, 104, { size: 16, weight: 'normal', color: INK.sub, align: 'right' });
  track(ctx, W, 140, s.roomIndex, s.totalRooms, t);
  const p = s.player || {};
  const midTop = 172, midH = 270;

  if (phase === 'combat' && s.enemy) {
    const e = s.enemy;
    drawEnemy(ctx, e, 250, midTop + 120, e.isBoss ? 250 : 200, look, t);
    // اسم العدو و صحته
    panel(ctx, 70, midTop + 222, 360, 66, 16, 'rgba(6,7,12,0.78)', { stroke: e.isBoss ? 'rgba(255,90,115,0.6)' : INK.line });
    txt(ctx, strip(e.name), 410, midTop + 248, { size: 18, align: 'right', maxW: 250 });
    txt(ctx, `${compact(Math.max(0, e.hp))}/${compact(e.maxHp)} · ⚔️ ${compact(e.atk)}`, 90, midTop + 248, { size: 13, weight: 'normal', color: INK.sub });
    hpBar(ctx, 90, midTop + 262, 320, 12, Math.max(0, e.hp) / Math.max(1, e.maxHp));
    if (e.isBoss) ribbon(ctx, e._phase2 ? 'المرحلة الثانية' : 'زعيم البوابة', 250, midTop - 18, THEMES.crimson, { size: 16, h: 34, icon: '👑' });
    else if (e.lootRarity) pill(ctx, e.lootRarity.name, 250, midTop - 14, THEMES.gold, { align: 'center', icon: e.lootRarity.emoji, h: 30, size: 13, solid: false });
    // VS
    hexBadge(ctx, W / 2, midTop + 110, 44, t, 'VS', { size: 28 });
    // اللاعب
    await avatar(ctx, s.avatarURL, W - 260, midTop + 20, 150, THEMES.azure, p.name);
    txt(ctx, p.name || 'الصائد', W - 185, midTop + 206, { size: 22, align: 'center', maxW: 260, shadow: true });
    if (s.partyNames?.length > 1) txt(ctx, `👥 ${s.partyNames.slice(1).join(' · ')}`, W - 185, midTop + 236, { size: 14, weight: 'normal', color: INK.sub, align: 'center', maxW: 300 });
    if (e.description) {
      const lines = wrap(ctx, strip(e.description), 230, 14, 'normal', 3);
      lines.forEach((l, i) => txt(ctx, l, W / 2, midTop + 190 + i * 22, { size: 14, weight: 'normal', color: INK.sub, align: 'center' }));
    }
  } else if (phase === 'map') {
    if (s.roomIndex >= s.totalRooms) {
      const art = bossArt(look.boss);
      if (art) { ctx.save(); ctx.globalAlpha = 0.5; ctx.filter = 'brightness(0.25)'; const hh = 260, ww = art.width * hh / art.height; ctx.drawImage(art, W / 2 - ww / 2, midTop + 10, ww, hh); ctx.restore(); }
      rays(ctx, W / 2, midTop + 140, 260, THEMES.crimson, 20, 0.2);
      title(ctx, 'بوابة الزعيم النهائي', W / 2, midTop + 140, THEMES.crimson, { size: 40, align: 'center', color: THEMES.crimson.a });
      txt(ctx, 'استعد جيداً — لا يمكن الفرار من الزعيم', W / 2, midTop + 180, { size: 17, weight: 'normal', align: 'center' });
    } else {
      const labels = ['يمين', 'وسط', 'يسار'];
      [W / 2 + 230, W / 2, W / 2 - 230].forEach((cx, i) => door(ctx, cx, midTop + 4, 130, 200, labels[i], t, i));
    }
  } else if (phase === 'event' && s.room) {
    const R = { treasure: ['💰', 'صندوق كنز', THEMES.gold], fountain: ['⛲', 'نافورة الشفاء', THEMES.azure], shrine: ['🛐', 'ضريح قديم', THEMES.violet], trap: ['⚠️', 'فخ مفاجئ', THEMES.crimson], merchant: ['🧙', 'تاجر متجول', THEMES.emerald] }[s.room.kind] || ['🚪', 'غرفة غامضة', t];
    rays(ctx, 260, midTop + 120, 200, R[2], 18, 0.25);
    emoji(ctx, R[0], 260, midTop + 120, 170, { glow: R[2].glow });
    title(ctx, R[1], W - 60, midTop + 70, R[2], { size: 44, color: R[2].a });
    const msg = {
      treasure: `وجدت كنزاً يحوي ${compact(s.room.gold)} 💎`,
      fountain: 'مياه سحرية تتلألأ — اشرب لاستعادة كامل صحتك',
      shrine: `قدّم 200 💎 لتحصل على تعزيز دائم: +${s.room.buff?.amt} ${s.room.buff?.k === 'atk' ? '⚔️ هجوم' : s.room.buff?.k === 'crit' ? '🎯 حظ حرج' : '❤️ صحة'}`,
      trap: `انطلقت الأشواك! تلقيت ${compact(s.room.dmg)} ضرر`,
      merchant: 'يبيع جرعات الشفاء بـ 300 💎 للجرعة',
    }[s.room.kind] || '';
    wrap(ctx, msg, 480, 22, 'normal', 3).forEach((l, i) => txt(ctx, l, W - 60, midTop + 120 + i * 34, { size: 22, weight: 'normal', align: 'right' }));
  } else if (['gameover', 'victory', 'withdraw'].includes(phase)) {
    const R = s.result || {};
    if (phase === 'victory') { confetti(ctx, W, H, 80); }
    const ic = phase === 'victory' ? '🏆' : phase === 'gameover' ? '💀' : '🏳️';
    rays(ctx, 230, midTop + 120, 220, t, 20, 0.25);
    if (phase === 'victory' && s.enemy?.isBoss) {
      const art = bossArt(look.boss);
      if (art) { ctx.save(); ctx.globalAlpha = 0.35; ctx.filter = 'grayscale(1) brightness(0.5)'; const hh = 250, ww = art.width * hh / art.height; ctx.drawImage(art, 230 - ww / 2, midTop, ww, hh); ctx.restore(); }
    }
    emoji(ctx, ic, 230, midTop + 120, 150, { glow: t.glow });
    title(ctx, phase === 'victory' ? 'انتصار أسطوري!' : phase === 'gameover' ? 'سقطت في البوابة' : 'انسحاب آمن', W - 60, midTop + 64, t, { size: 46, color: t.a });
    txt(ctx, R.subtitle || '', W - 60, midTop + 102, { size: 18, weight: 'normal', align: 'right', maxW: 520 });
    const items = (R.items || []).slice(0, 4);
    const cw = (W - 480 - (items.length - 1) * 14) / Math.max(1, items.length);
    items.forEach(([l, v, ic2], i) => stat(ctx, W - 60 - (i + 1) * cw - i * 14, midTop + 130, cw, 92, l, String(v), t, ic2));
  }

  // الشريط السفلي
  logPanel(ctx, 380, 460, W - 430, 150, s.log || []);
  playerPanel(ctx, 50, 460, 316, 150, p, phase === 'gameover' ? THEMES.crimson : THEMES.emerald);
  return out(canvas, 'dungeon.png');
}

/** بطاقة البوابة (الدخول / لوبي الفريق) */
async function gateCard({ stage, dungeonLevel = 1, difficulty = '', hunterRank, username, avatarURL, party = [], max = 4, mode = 'entry', rooms }) {
  if (!hasCanvas()) return null;
  const look = stageLook(stage?.id || 1);
  const W = 1000, H = 480;
  const { canvas, ctx, t } = base(W, H, look.theme, { bg: look.bg, dim: 0.42 });
  // بوابة دوّامة
  const cx = 230, cy = 240;
  for (let i = 8; i > 0; i--) { ctx.save(); ctx.globalAlpha = 0.12 + (8 - i) * 0.04; ctx.strokeStyle = i % 2 ? t.a : t.b; ctx.lineWidth = 6; ctx.shadowColor = t.a; ctx.shadowBlur = 20; ctx.beginPath(); ctx.ellipse(cx, cy, 40 + i * 18, 60 + i * 22, 0, 0.2 * i, Math.PI * 1.7 + 0.2 * i); ctx.stroke(); ctx.restore(); }
  const core = ctx.createRadialGradient(cx, cy, 5, cx, cy, 110); core.addColorStop(0, '#ffffff'); core.addColorStop(0.25, t.a); core.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(cx, cy, 90, 130, 0, 0, Math.PI * 2); ctx.fill();
  const art = bossArt(look.boss);
  if (art) { ctx.save(); ctx.globalAlpha = 0.85; ctx.filter = 'brightness(0.15)'; const hh = 200, ww = art.width * hh / art.height; ctx.drawImage(art, cx - ww / 2, cy - hh / 2 + 10, ww, hh); ctx.restore(); }
  hexBadge(ctx, cx, 410, 40, THEMES[RANK_THEME[stage?.gateRank] || 'violet'], stage?.gateRank || 'E', { size: 26 });
  // النص
  txt(ctx, mode === 'party' ? 'غرفة انتظار الفريق' : 'انفتحت بوابة!', W - 60, 78, { size: 18, weight: 'normal', color: t.a, align: 'right' });
  title(ctx, strip(stage?.name || ''), W - 60, 128, t, { size: 38, maxW: 560 });
  let px = W - 60;
  px -= pill(ctx, `مستوى ${dungeonLevel}`, px, 150, t, { align: 'right', icon: '🌀' }) + 10;
  if (difficulty) px -= pill(ctx, strip(difficulty), px, 150, t, { align: 'right', solid: false }) + 10;
  if (rooms) pill(ctx, `${rooms} غرفة + زعيم`, px, 150, t, { align: 'right', solid: false, icon: '🚪' });
  if (mode === 'party') {
    panel(ctx, 440, 214, W - 490, 200, 20, 'rgba(6,7,12,0.7)');
    txt(ctx, `👥 الفريق ${party.length}/${max}`, W - 80, 250, { size: 19, align: 'right' });
    for (let i = 0; i < max; i++) {
      const x = W - 170 - i * 120, y = 280;
      const m = party[i];
      if (m) { await avatar(ctx, m.avatarURL, x, y, 84, t, m.name); txt(ctx, m.name, x + 42, y + 112, { size: 14, align: 'center', maxW: 110 }); }
      else { ctx.save(); ctx.setLineDash([6, 6]); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + 42, y + 42, 42, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); txt(ctx, '+', x + 42, y + 44, { size: 30, align: 'center', base: 'middle', color: INK.sub }); }
    }
  } else {
    await avatar(ctx, avatarURL, W - 160, 222, 100, t, username);
    txt(ctx, username || '', W - 184, 262, { size: 24, align: 'right', maxW: 340 });
    if (hunterRank) txt(ctx, `${hunterRank.emoji || '🏅'} رتبتك ${hunterRank.rank} — ${strip(hunterRank.name || '')}`, W - 184, 296, { size: 16, weight: 'normal', color: INK.sub, align: 'right', maxW: 340 });
    panel(ctx, 440, 350, W - 490, 76, 18, 'rgba(6,7,12,0.7)');
    txt(ctx, 'هل تدخل البوابة بمفردك أم مع فريق؟', W - 80, 396, { size: 18, align: 'right', maxW: W - 560 });
  }
  return out(canvas, 'gate.png');
}

module.exports = { ..._kit.withReady({ dungeonCard, gateCard }), stageLook };
