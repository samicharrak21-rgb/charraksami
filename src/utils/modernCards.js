// ✨ modernCards v24 — "Aurora Glass": تصميم عصري موحّد لبطاقات الرصيد والبنك والمستوى
// - خلفية ليلية عميقة + هالات ملوّنة ناعمة + شبكة نقاط خفيفة + لوحات زجاجية
// - لوحة ألوان متناسقة: كل بطاقة لها تدرّج رئيسي واحد ولون إبراز واحد فقط
// - بطاقة صعود المستوى متحركة (GIF) — حلقة تمتلئ، رقم ينبض، قصاصات احتفال، لمعة ضوء
const kitAll = require('./cardKit');
const K = kitAll._kit;

const PALETTES = {
  wallet: { a: '#34f5c5', b: '#1fb6ff', glow: 'rgba(52,245,197,0.40)', deep: '#03161a', hi: '#ffd166' },
  bank:   { a: '#ffd166', b: '#ff8a3d', glow: 'rgba(255,190,90,0.40)', deep: '#1a0f03', hi: '#34f5c5' },
  rank:   { a: '#5ee7ff', b: '#7b6cff', glow: 'rgba(110,180,255,0.42)', deep: '#060b1f', hi: '#ffd166' },
  level:  { a: '#ffcf5c', b: '#ff5e8a', glow: 'rgba(255,140,120,0.45)', deep: '#1c0710', hi: '#5ee7ff' },
};
const TEXT = '#f4f7ff', SUB = '#9aa6c4', LINE = 'rgba(255,255,255,0.10)';

const n0 = (n) => Number(n) || 0;
const full = (n) => Math.round(n0(n)).toLocaleString('en-US');

function rr(ctx, x, y, w, h, r) { K.rr(ctx, x, y, w, h, r); }

function lin(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

/** الخلفية الموحدة */
function backdrop(ctx, W, H, p, { seed = 7, shift = 0 } = {}) {
  ctx.save();
  rr(ctx, 0, 0, W, H, 30); ctx.clip();
  ctx.fillStyle = lin(ctx, 0, 0, W, H, ['#070a18', '#0c1230', '#080a17']);
  ctx.fillRect(0, 0, W, H);
  const blob = (x, y, r, c) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); };
  ctx.globalAlpha = 0.55; blob(W * 0.88 + shift * 40, H * 0.1, H * 1.1, p.a);
  ctx.globalAlpha = 0.45; blob(W * 0.08 - shift * 40, H * 0.95, H * 1.0, p.b);
  ctx.globalAlpha = 0.18; blob(W * 0.5, H * 0.5, H * 0.9, p.hi);
  ctx.globalAlpha = 1;
  // شبكة نقاط
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let x = 20; x < W; x += 26) for (let y = 20; y < H; y += 26) { ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill(); }
  // نجوم
  const r = K.rng(seed);
  for (let i = 0; i < 26; i++) K.sparkle(ctx, r() * W, r() * H, 1 + r() * 2.4, '#ffffff', 0.25 + r() * 0.5);
  ctx.restore();
  // إطار متدرج
  ctx.save(); ctx.lineWidth = 2.5; ctx.strokeStyle = lin(ctx, 0, 0, W, H, [p.a, 'rgba(255,255,255,0.08)', p.b]);
  rr(ctx, 1.5, 1.5, W - 3, H - 3, 29); ctx.stroke(); ctx.restore();
}

function glass(ctx, x, y, w, h, r = 22, { tint = null, stroke = LINE } = {}) {
  ctx.save();
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = lin(ctx, x, y, x, y + h, ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.03)']);
  ctx.fill();
  if (tint) { ctx.globalAlpha = 0.12; ctx.fillStyle = tint; ctx.fill(); ctx.globalAlpha = 1; }
  ctx.lineWidth = 1.2; ctx.strokeStyle = stroke; ctx.stroke();
  // لمعة علوية
  ctx.beginPath(); ctx.moveTo(x + r, y + 1); ctx.lineTo(x + w - r, y + 1);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.stroke();
  ctx.restore();
}

function chip(ctx, text, x, y, p, { align = 'right', solid = false, size = 15 } = {}) {
  const w = K.measure(ctx, text, size) + 30, h = size + 16;
  const left = align === 'right' ? x - w : x;
  ctx.save(); rr(ctx, left, y, w, h, h / 2);
  if (solid) { ctx.fillStyle = lin(ctx, left, y, left + w, y, [p.a, p.b]); ctx.fill(); }
  else { ctx.fillStyle = 'rgba(255,255,255,0.07)'; ctx.fill(); ctx.strokeStyle = p.a; ctx.globalAlpha = 0.55; ctx.lineWidth = 1.2; ctx.stroke(); }
  ctx.restore();
  K.txt(ctx, text, left + w / 2, y + h / 2 + size * 0.36, { size, align: 'center', color: solid ? '#0b0f1e' : TEXT });
  return w;
}

function progress(ctx, x, y, w, h, ratio, p) {
  const r = Math.max(0, Math.min(1, n0(ratio)));
  ctx.save();
  rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  if (r > 0) {
    const fw = Math.max(h, w * r);
    // RTL: يمتلئ من اليمين
    rr(ctx, x + w - fw, y, fw, h, h / 2);
    ctx.shadowColor = p.glow; ctx.shadowBlur = 18;
    ctx.fillStyle = lin(ctx, x + w - fw, 0, x + w, 0, [p.b, p.a]); ctx.fill();
    ctx.shadowBlur = 0; ctx.globalAlpha = 0.35;
    rr(ctx, x + w - fw + 4, y + 2, fw - 8, h * 0.38, h / 4); ctx.fillStyle = '#ffffff'; ctx.fill();
  }
  ctx.restore();
}

async function avatarRing(ctx, url, cx, cy, size, p, name) {
  ctx.save();
  ctx.shadowColor = p.glow; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 7, 0, Math.PI * 2);
  ctx.strokeStyle = lin(ctx, cx - size, cy - size, cx + size, cy + size, [p.a, p.b]); ctx.lineWidth = 5; ctx.stroke();
  ctx.restore();
  await K.avatar(ctx, url, cx - size / 2, cy - size / 2, size, { a: p.a, b: p.b, glow: p.glow, deep: p.deep }, name, { ring: false });
}

function statTile(ctx, x, y, w, h, icon, label, value, p, { accent } = {}) {
  glass(ctx, x, y, w, h, 20);
  ctx.save(); rr(ctx, x + w - 58, y + h / 2 - 22, 44, 44, 14);
  ctx.fillStyle = lin(ctx, x + w - 58, y, x + w - 14, y + h, [p.a, p.b]); ctx.globalAlpha = 0.22; ctx.fill(); ctx.restore();
  K.emoji(ctx, icon, x + w - 36, y + h / 2, 26);
  K.txt(ctx, label, x + w - 72, y + h / 2 - 8, { size: 14, weight: 'normal', color: SUB, align: 'right', maxW: w - 90 });
  K.txt(ctx, value, x + w - 72, y + h / 2 + 22, { size: 24, color: accent || TEXT, align: 'right', maxW: w - 90 });
}

function out(canvas, name) { return { buffer: canvas.toBuffer('image/png'), name }; }

// ───────────────────────── 💰 الرصيد ─────────────────────────
async function balanceCard({ username = 'عضو', avatarURL, wallet = 0, bank = 0, rank = null, totalUsers = 0, level = 1, currency = 'جواهر', loan = 0 }) {
  const C = K.C(); if (!C) return null;
  await kitAll.ready();
  const W = 1000, H = 440, p = PALETTES.wallet;
  const canvas = C.createCanvas(W, H), ctx = canvas.getContext('2d');
  backdrop(ctx, W, H, p, { seed: 11 });
  const total = n0(wallet) + n0(bank);

  await avatarRing(ctx, avatarURL, W - 110, 110, 120, p, username);
  K.txt(ctx, 'المحفظة', W - 196, 78, { size: 16, weight: 'normal', color: p.a, align: 'right' });
  K.txt(ctx, username, W - 196, 122, { size: 38, align: 'right', maxW: 360, shadow: true });
  chip(ctx, `⭐ المستوى ${level}`, W - 196, 140, p);
  if (rank) chip(ctx, `🏆 #${rank}${totalUsers ? ` من ${totalUsers}` : ''}`, W - 196 - K.measure(ctx, `⭐ المستوى ${level}`, 15) - 44, 140, p);

  // بطاقة مصرفية زجاجية
  const cx = 44, cy = 40, cw = 420, ch = 250;
  ctx.save(); ctx.shadowColor = p.glow; ctx.shadowBlur = 40; rr(ctx, cx, cy, cw, ch, 26);
  ctx.fillStyle = lin(ctx, cx, cy, cx + cw, cy + ch, [p.a, p.b, '#3a2dff']); ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, cx, cy, cw, ch, 26); ctx.clip();
  ctx.globalAlpha = 0.18; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(cx + cw + 30, cy - 30, 70 + i * 34, 0, Math.PI * 2); ctx.stroke(); }
  ctx.globalAlpha = 0.25; ctx.fillStyle = lin(ctx, cx, cy, cx + cw, cy, ['rgba(255,255,255,0)', '#ffffff', 'rgba(255,255,255,0)']);
  ctx.translate(cx + cw * 0.3, cy); ctx.rotate(0.5); ctx.fillRect(0, -40, 50, ch * 2); ctx.restore();
  // شريحة
  ctx.save(); rr(ctx, cx + 30, cy + 34, 58, 44, 9); ctx.fillStyle = lin(ctx, 0, cy + 34, 0, cy + 78, ['#ffe9a8', '#d7a43a']); ctx.fill();
  ctx.strokeStyle = 'rgba(80,50,0,0.5)'; ctx.lineWidth = 1; for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx + 30, cy + 34 + i * 14.6); ctx.lineTo(cx + 88, cy + 34 + i * 14.6); ctx.stroke(); } ctx.restore();
  K.emoji(ctx, '💎', cx + cw - 46, cy + 56, 40);
  K.txt(ctx, 'إجمالي الثروة', cx + cw - 30, cy + 128, { size: 16, weight: 'normal', color: 'rgba(10,15,30,0.75)', align: 'right' });
  K.txt(ctx, kitAll.compact(total), cx + cw - 30, cy + 186, { size: 56, color: '#0a0f1e', align: 'right' });
  K.txt(ctx, currency, cx + 30, cy + ch - 26, { size: 18, color: '#0a0f1e' });
  K.txt(ctx, '•••• •••• ' + String(total).slice(-4).padStart(4, '0'), cx + cw - 30, cy + ch - 26, { size: 16, weight: 'normal', color: 'rgba(10,15,30,0.7)', align: 'right' });

  // نسبة المحفظة/البنك
  const share = total ? n0(bank) / total : 0;
  K.txt(ctx, `${Math.round(share * 100)}% من ثروتك آمنة في البنك`, W - 44, 236, { size: 15, weight: 'normal', color: SUB, align: 'right' });
  progress(ctx, 500, 252, W - 544, 14, share, PALETTES.bank);

  const ty = 312, th = 92, gap = 18, tw = (W - 88 - gap * 2) / 3;
  statTile(ctx, W - 44 - tw, ty, tw, th, '👛', 'في المحفظة', full(wallet), p);
  statTile(ctx, W - 44 - tw * 2 - gap, ty, tw, th, '🏦', 'في البنك', full(bank), PALETTES.bank, { accent: PALETTES.bank.a });
  statTile(ctx, 44, ty, tw, th, loan ? '🔴' : '🛡️', loan ? 'قرض مستحق' : 'حالة الحساب', loan ? full(loan) : 'ممتاز', p, { accent: loan ? '#ff6b7f' : p.a });
  return out(canvas, 'balance.png');
}

// ───────────────────────── 🏦 البنك ─────────────────────────
async function bankCard({ username = 'عضو', avatarURL, wallet = 0, bank = 0, max = 1, rate = 0.02, loan = 0, loanDue = 0, action = null, amount = 0, interest = 0, nextInterestMs = 0 }) {
  const C = K.C(); if (!C) return null;
  await kitAll.ready();
  const W = 1000, H = 420, p = PALETTES.bank;
  const canvas = C.createCanvas(W, H), ctx = canvas.getContext('2d');
  backdrop(ctx, W, H, p, { seed: 23 });

  await avatarRing(ctx, avatarURL, W - 100, 100, 104, p, username);
  K.txt(ctx, '🏦 البنك المركزي', W - 172, 74, { size: 16, weight: 'normal', color: p.a, align: 'right' });
  K.txt(ctx, username, W - 172, 116, { size: 34, align: 'right', maxW: 340, shadow: true });
  const ACT = { deposit: ['✅ تم الإيداع', '#34f5c5'], withdraw: ['💵 تم السحب', '#5ee7ff'], loan: ['📝 تم منح القرض', '#ffd166'], repay: ['✔️ تم التسديد', '#34f5c5'] };
  if (action && ACT[action]) chip(ctx, `${ACT[action][0]}  ${full(amount)}`, W - 172, 134, { ...p, a: ACT[action][1], b: p.b }, { solid: true });
  else chip(ctx, `📈 فائدة يومية ${(rate * 100).toFixed(0)}%`, W - 172, 134, p);

  // حلقة السقف
  const cx = 190, cy = 160, r = 112;
  const ratio = max ? n0(bank) / max : 0;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 20;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.stroke();
  ctx.shadowColor = p.glow; ctx.shadowBlur = 24;
  ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.01, Math.min(1, ratio)));
  ctx.strokeStyle = lin(ctx, cx - r, cy - r, cx + r, cy + r, [p.a, p.b]); ctx.stroke(); ctx.restore();
  K.txt(ctx, kitAll.compact(bank), cx, cy + 10, { size: 44, align: 'center' });
  K.txt(ctx, `من ${kitAll.compact(max)}`, cx, cy + 44, { size: 15, weight: 'normal', color: SUB, align: 'center' });
  K.txt(ctx, `${(ratio * 100).toFixed(1)}%`, cx, cy - 40, { size: 16, color: p.a, align: 'center' });

  // معلومات
  const hrs = Math.max(0, Math.ceil(nextInterestMs / 3600000));
  const tw = 300, th = 84, x2 = W - 44 - tw, x1 = x2 - 18 - tw;
  statTile(ctx, x2, 196, tw, th, '👛', 'المحفظة', full(wallet), PALETTES.wallet, { accent: PALETTES.wallet.a });
  statTile(ctx, x1, 196, tw, th, '✨', interest ? 'فائدة أضيفت الآن' : `الفائدة القادمة · بعد ${hrs} ساعة`, `+${full(interest || Math.floor(n0(bank) * rate))}`, p, { accent: p.a });
  const days = loanDue ? Math.max(0, Math.ceil((loanDue - Date.now()) / 86400000)) : 0;
  statTile(ctx, x2, 296, tw, th, loan ? '🔴' : '🟢', loan ? 'قرض مستحق' : 'القروض', loan ? full(loan) : 'لا يوجد', p, { accent: loan ? '#ff6b7f' : '#34f5c5' });
  statTile(ctx, x1, 296, tw, th, '⏳', loan ? 'مهلة السداد' : 'الحد الأقصى للقرض', loan ? `${days} يوم` : '50,000', p);
  K.txt(ctx, 'ايداع 500 · سحب الكل · قرض 5000 · سدد الكل', 190, H - 40, { size: 14, weight: 'normal', color: SUB, align: 'center' });
  return out(canvas, 'bank.png');
}

// ───────────────────────── 📊 المستوى ─────────────────────────
async function rankCard({ username = 'عضو', avatarURL, level = 1, xp = 0, nextXP = 100, totalXP = 0, rank = null, totalUsers = 0, title = '', balance = 0, prestige = 0, nextReward = null, streak = 0, messages = 0 }) {
  const C = K.C(); if (!C) return null;
  await kitAll.ready();
  const W = 1000, H = 380, p = PALETTES.rank;
  const canvas = C.createCanvas(W, H), ctx = canvas.getContext('2d');
  backdrop(ctx, W, H, p, { seed: 5 });

  // حلقة المستوى حول الصورة
  const acx = W - 150, acy = 160, ar = 98;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(acx, acy, ar, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.stroke();
  ctx.shadowColor = p.glow; ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.arc(acx, acy, ar, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.01, Math.min(1, n0(xp) / Math.max(1, n0(nextXP)))));
  ctx.strokeStyle = lin(ctx, acx - ar, acy - ar, acx + ar, acy + ar, [p.a, p.b]); ctx.stroke(); ctx.restore();
  await K.avatar(ctx, avatarURL, acx - 78, acy - 78, 156, { a: p.a, b: p.b, glow: p.glow, deep: p.deep }, username, { ring: false });
  // شارة المستوى
  ctx.save(); ctx.shadowColor = p.glow; ctx.shadowBlur = 16; rr(ctx, acx - 46, acy + ar - 16, 92, 36, 18);
  ctx.fillStyle = lin(ctx, acx - 46, 0, acx + 46, 0, [p.a, p.b]); ctx.fill(); ctx.restore();
  K.txt(ctx, `LVL ${level}`, acx, acy + ar + 9, { size: 18, color: '#0a0f1e', align: 'center' });

  const rx = W - 290;
  K.txt(ctx, title || 'عضو نشيط', rx, 76, { size: 16, weight: 'normal', color: p.a, align: 'right', maxW: 420 });
  K.txt(ctx, username, rx, 124, { size: 42, align: 'right', maxW: 520, shadow: true });
  let cxp = rx; cxp -= chip(ctx, `🏆 #${rank || '—'}${totalUsers ? ` / ${totalUsers}` : ''}`, cxp, 144, p, { solid: true }) + 10;
  if (prestige) cxp -= chip(ctx, `🌟 بريستيج ${prestige}`, cxp, 144, p) + 10;
  if (streak > 1) chip(ctx, `🔥 ${streak} يوم`, cxp, 144, p);

  // الرقم الكبير على اليسار
  K.txt(ctx, String(level), 140, 170, { size: 110, align: 'center', glow: p.glow });
  K.txt(ctx, 'المستوى', 140, 206, { size: 16, weight: 'normal', color: SUB, align: 'center' });

  K.txt(ctx, `${full(xp)} / ${full(nextXP)} XP`, 290, 232, { size: 17, color: TEXT });
  K.txt(ctx, `${Math.floor((n0(xp) / Math.max(1, n0(nextXP))) * 100)}% نحو المستوى ${level + 1}`, rx, 232, { size: 16, weight: 'normal', color: SUB, align: 'right' });
  progress(ctx, 290, 248, rx - 290, 20, n0(xp) / Math.max(1, n0(nextXP)), p);

  const ty = 292, th = 66, gap = 14, tw = (W - 88 - gap * 2) / 3;
  const tile = (x, icon, label, val, acc) => {
    glass(ctx, x, ty, tw, th, 18);
    K.emoji(ctx, icon, x + tw - 32, ty + th / 2, 24);
    K.txt(ctx, label, x + tw - 56, ty + 27, { size: 13, weight: 'normal', color: SUB, align: 'right', maxW: tw - 70 });
    K.txt(ctx, val, x + tw - 56, ty + 52, { size: 18, color: acc || TEXT, align: 'right', maxW: tw - 70 });
  };
  tile(W - 44 - tw, '✨', 'إجمالي الخبرة', full(totalXP || xp), p.a);
  tile(W - 44 - tw * 2 - gap, '💎', 'الرصيد', full(balance), p.hi);
  tile(44, '🎁', 'المكافأة القادمة', nextReward ? String(nextReward).replace(/\*\*/g, '') : 'استمر بالتفاعل', TEXT);
  return out(canvas, 'rank.png');
}

// ───────────────────────── 🎉 صعود المستوى (متحرك) ─────────────────────────
async function levelUpFrame(C, f, F, d, avatarImg) {
  const W = 900, H = 340, p = PALETTES.level;
  const canvas = C.createCanvas(W, H), ctx = canvas.getContext('2d');
  const t = f / (F - 1);
  const ease = 1 - Math.pow(1 - Math.min(1, t * 1.6), 3);
  backdrop(ctx, W, H, p, { seed: 3, shift: Math.sin(t * Math.PI * 2) * 0.5 });
  // أشعة دوّارة
  ctx.save(); ctx.globalAlpha = 0.07; ctx.translate(200, 170); ctx.rotate(t * Math.PI / 3);
  for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(420, -26); ctx.lineTo(420, 26); ctx.closePath(); ctx.fillStyle = i % 2 ? p.a : p.b; ctx.fill(); }
  ctx.restore();
  // قصاصات
  const r = K.rng(99);
  for (let i = 0; i < 70; i++) {
    const x0 = r() * W, sp = 80 + r() * 260, y = ((r() * H + t * sp * 1.4) % (H + 40)) - 20;
    const x = x0 + Math.sin((t * 6 + i) * 1.3) * 10;
    ctx.save(); ctx.translate(x, y); ctx.rotate((t * 8 + i) % 6.28);
    ctx.fillStyle = [p.a, p.b, p.hi, '#ffffff', '#34f5c5'][i % 5]; ctx.globalAlpha = 0.85; ctx.fillRect(-4, -2, 8, 4 + (i % 3) * 2); ctx.restore();
  }
  // الحلقة + الرقم
  const cx = 200, cy = 170, rad = 100;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 14;
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.stroke();
  ctx.shadowColor = p.glow; ctx.shadowBlur = 30;
  ctx.beginPath(); ctx.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.02, ease));
  ctx.strokeStyle = lin(ctx, cx - rad, cy - rad, cx + rad, cy + rad, [p.a, p.b]); ctx.stroke(); ctx.restore();
  const pulse = 1 + (t > 0.6 ? Math.sin((t - 0.6) * Math.PI * 5) * 0.06 : 0);
  const shown = t < 0.6 ? d.oldLevel : d.level;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(pulse, pulse);
  K.txt(ctx, String(shown), 0, 30, { size: 96, align: 'center', glow: p.glow });
  ctx.restore();
  K.txt(ctx, 'LEVEL UP', cx, cy + rad + 42, { size: 20, align: 'center', color: p.a });

  // النص
  const rx = W - 44;
  if (avatarImg) {
    ctx.save(); ctx.beginPath(); ctx.arc(rx - 46, 80, 46, 0, Math.PI * 2); ctx.closePath(); ctx.clip(); ctx.drawImage(avatarImg, rx - 92, 34, 92, 92); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(rx - 46, 80, 50, 0, Math.PI * 2); ctx.strokeStyle = lin(ctx, rx - 96, 30, rx, 130, [p.a, p.b]); ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
  }
  const tx = avatarImg ? rx - 112 : rx;
  K.txt(ctx, '🎉 مستوى جديد', tx, 66, { size: 18, color: p.a, align: 'right' });
  K.txt(ctx, d.username, tx, 110, { size: 36, align: 'right', maxW: 380, shadow: true });
  K.txt(ctx, `من المستوى ${d.oldLevel} إلى ${d.level}`, rx, 170, { size: 22, align: 'right', color: TEXT });
  if (d.rankTitle) K.txt(ctx, d.rankTitle, rx, 204, { size: 16, weight: 'normal', color: SUB, align: 'right', maxW: 460 });
  let y = 236;
  if (d.reward) { chip(ctx, `🎁 ${d.reward}`, rx, y, p, { solid: true, size: 16 }); y += 46; }
  if (d.role) chip(ctx, `🎖️ ${d.role}`, rx, y, p, { size: 15 });
  // لمعة عابرة
  ctx.save(); rr(ctx, 0, 0, W, H, 30); ctx.clip();
  const sx = -300 + t * (W + 600);
  ctx.globalAlpha = 0.16; ctx.fillStyle = lin(ctx, sx, 0, sx + 160, 0, ['rgba(255,255,255,0)', '#ffffff', 'rgba(255,255,255,0)']);
  ctx.translate(sx, 0); ctx.transform(1, 0, -0.4, 1, 0, 0); ctx.fillRect(0, 0, 160, H); ctx.restore();
  return ctx.getImageData(0, 0, W, H);
}

async function levelUpGif(d = {}) {
  const C = K.C(); if (!C) return null;
  let gifenc; try { gifenc = require('gifenc'); } catch { return null; }
  await kitAll.ready();
  const data = { username: d.username || 'عضو', level: n0(d.level) || 2, oldLevel: n0(d.oldLevel) || Math.max(1, (n0(d.level) || 2) - 1), reward: d.reward, role: d.role, rankTitle: d.rankTitle };
  let avatarImg = null;
  if (d.avatarURL) { try { avatarImg = await K.loadRemote(d.avatarURL); } catch {} }
  const { GIFEncoder, quantize, applyPalette } = gifenc;
  const enc = GIFEncoder();
  const F = 18;
  for (let f = 0; f < F; f++) {
    const img = await levelUpFrame(C, f, F, data, avatarImg);
    const pal = quantize(img.data, 128, { format: 'rgb444' });
    const idx = applyPalette(img.data, pal, 'rgb444');
    enc.writeFrame(idx, img.width, img.height, { palette: pal, delay: f === F - 1 ? 2500 : 70, repeat: 0 });
  }
  enc.finish();
  return { buffer: Buffer.from(enc.bytes()), name: 'levelup.gif' };
}

/** يحاول GIF أولاً ثم PNG ثابت */
async function levelUpCard(d) {
  try { const g = await levelUpGif(d); if (g?.buffer?.length) return g; } catch {}
  return kitAll.levelUpCard ? kitAll.levelUpCard(d) : null;
}

module.exports = { backdrop, glass, chip, lin, PALETTES, balanceCard, bankCard, rankCard, levelUpGif, levelUpCard, hasCanvas: kitAll.hasCanvas };

// ───────────────────────── 🛒 متجر عام (شبكة عناصر) ─────────────────────────
const PAL_SHOP = { a: '#b6ff5c', b: '#34f5c5', glow: 'rgba(160,255,120,0.38)', deep: '#061407', hi: '#ffd166' };
async function shopGridCard({ title = 'المتجر', subtitle = '', icon = '🛒', balance = 0, currency = 'جواهر', items = [], palette = PAL_SHOP, footer = '' }) {
  const C = K.C(); if (!C) return null;
  await kitAll.ready();
  const p = palette, cols = 3, tw = 290, th = 112, gap = 18;
  const rows = Math.ceil(items.length / cols);
  const W = 1000, H = 170 + rows * (th + gap) + 50;
  const canvas = C.createCanvas(W, H), ctx = canvas.getContext('2d');
  backdrop(ctx, W, H, p, { seed: 41 });
  K.emoji(ctx, icon, W - 80, 80, 56, { glow: p.glow });
  K.txt(ctx, title, W - 130, 92, { size: 40, align: 'right', shadow: true });
  if (subtitle) K.txt(ctx, subtitle, W - 130, 126, { size: 16, weight: 'normal', color: SUB, align: 'right', maxW: 560 });
  glass(ctx, 44, 44, 260, 86, 22);
  K.emoji(ctx, '💎', 84, 87, 34);
  K.txt(ctx, kitAll.compact(balance), 116, 96, { size: 34, color: p.hi });
  K.txt(ctx, `رصيدك ${currency}`, 116, 118, { size: 13, weight: 'normal', color: SUB });
  const x0 = W - 44;
  items.forEach((it, i) => {
    const x = x0 - ((i % cols) + 1) * tw - (i % cols) * gap, y = 160 + Math.floor(i / cols) * (th + gap);
    glass(ctx, x, y, tw, th, 20, { stroke: it.owned ? p.a : LINE });
    ctx.save(); rr(ctx, x + tw - 74, y + 18, 58, 58, 16); ctx.fillStyle = lin(ctx, x + tw - 74, y, x + tw, y + 76, [p.a, p.b]); ctx.globalAlpha = it.locked ? 0.08 : 0.25; ctx.fill(); ctx.restore();
    K.emoji(ctx, it.emoji || '•', x + tw - 45, y + 47, 34, { alpha: it.locked ? 0.4 : 1 });
    K.txt(ctx, it.name, x + tw - 88, y + 40, { size: 19, align: 'right', maxW: tw - 100, color: it.locked ? SUB : TEXT });
    K.txt(ctx, it.desc || '', x + tw - 88, y + 66, { size: 13, weight: 'normal', color: SUB, align: 'right', maxW: tw - 100 });
    const tag = it.owned ? '✅ مملوك' : it.locked ? `🔒 ${it.lockText || 'مقفل'}` : `💎 ${kitAll.compact(it.price)}`;
    chip(ctx, tag, x + 16, y + th - 40, p, { align: 'left', solid: !it.owned && !it.locked, size: 13 });
    if (it.count) K.txt(ctx, `x${it.count}`, x + tw - 20, y + th - 18, { size: 15, align: 'right', color: p.hi });
  });
  if (footer) K.txt(ctx, footer, W / 2, H - 20, { size: 13, weight: 'normal', color: SUB, align: 'center', maxW: W - 100 });
  return out(canvas, 'shop.png');
}

// ───────────────────────── 📿 بطاقة الأذكار ─────────────────────────
const PAL_DHIKR = {
  morning: { a: '#ffd166', b: '#ff9f43', glow: 'rgba(255,200,100,0.40)', deep: '#1a1003', hi: '#fff3c4' },
  evening: { a: '#8ec5ff', b: '#6d5dfc', glow: 'rgba(130,170,255,0.40)', deep: '#070a1f', hi: '#e3e9ff' },
  sleep:   { a: '#b9a7ff', b: '#3b4cca', glow: 'rgba(170,150,255,0.40)', deep: '#05061a', hi: '#e8e2ff' },
  general: { a: '#34f5c5', b: '#1fb6ff', glow: 'rgba(52,245,197,0.38)', deep: '#03161a', hi: '#e0fff6' },
};
async function adhkarCard({ title = 'ذكر', text = '', count = 1, source = '', virtue = '', kind = 'general', index = null, total = null }) {
  const C = K.C(); if (!C) return null;
  await kitAll.ready();
  const p = PAL_DHIKR[kind] || PAL_DHIKR.general;
  const W = 1000;
  const probe = C.createCanvas(10, 10).getContext('2d');
  const lines = K.wrap(probe, String(text).replace(/\s+/g, ' ').trim(), W - 180, 30, 'bold', 9);
  const vLines = virtue ? K.wrap(probe, virtue, W - 200, 17, 'normal', 3) : [];
  const H = Math.max(380, 200 + lines.length * 50 + (vLines.length ? vLines.length * 26 + 30 : 0) + 90);
  const canvas = C.createCanvas(W, H), ctx = canvas.getContext('2d');
  backdrop(ctx, W, H, p, { seed: 77 });
  // زخرفة نجمة ثمانية خلفية
  ctx.save(); ctx.globalAlpha = 0.07; ctx.strokeStyle = p.a; ctx.lineWidth = 2;
  for (const [cx, cy, r] of [[110, 110, 90], [W - 110, H - 100, 120]]) for (let k = 0; k < 2; k++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(k * Math.PI / 4); ctx.strokeRect(-r / 1.6, -r / 1.6, r * 1.25, r * 1.25); ctx.restore(); }
  ctx.restore();
  const ICON = { morning: '🌅', evening: '🌙', sleep: '😴', general: '📿' };
  K.emoji(ctx, ICON[kind] || '📿', W - 80, 74, 44, { glow: p.glow });
  K.txt(ctx, title, W - 124, 88, { size: 32, align: 'right', shadow: true, color: p.hi });
  if (index && total) chip(ctx, `${index} / ${total}`, 44, 56, p, { align: 'left' });
  // لوحة النص
  const py = 130, ph = lines.length * 50 + 40;
  glass(ctx, 44, py, W - 88, ph, 26, { stroke: 'rgba(255,255,255,0.14)' });
  ctx.save(); ctx.fillStyle = lin(ctx, 0, py, 0, py + ph, [p.a, p.b]); rr(ctx, W - 52, py + 20, 4, ph - 40, 2); ctx.fill(); ctx.restore();
  lines.forEach((l, i) => K.txt(ctx, l, W / 2, py + 52 + i * 50, { size: 30, align: 'center', color: TEXT }));
  let y = py + ph + 30;
  if (vLines.length) { vLines.forEach((l, i) => K.txt(ctx, l, W - 64, y + i * 26, { size: 17, weight: 'normal', color: SUB, align: 'right' })); y += vLines.length * 26 + 10; }
  chip(ctx, `🔁 ${count > 1 ? `يُكرر ${count} مرات` : 'مرة واحدة'}`, W - 64, H - 64, p, { solid: true });
  if (source) K.txt(ctx, `📖 ${source}`, 64, H - 40, { size: 15, weight: 'normal', color: SUB, maxW: 520 });
  return out(canvas, 'dhikr.png');
}

// ───────────────────────── 🥷 بطاقة السرقة ─────────────────────────
async function stealCard({ thief = 'السارق', victim = 'الضحية', thiefAvatar, victimAvatar, success = true, amount = 0, balance = 0, chance = 55 }) {
  const C = K.C(); if (!C) return null;
  await kitAll.ready();
  const p = success ? { a: '#34f5c5', b: '#7b6cff', glow: 'rgba(52,245,197,0.40)', deep: '#06101a', hi: '#ffd166' } : { a: '#ff6b7f', b: '#ff8a3d', glow: 'rgba(255,100,120,0.45)', deep: '#1a0509', hi: '#ffd166' };
  const W = 1000, H = 360;
  const canvas = C.createCanvas(W, H), ctx = canvas.getContext('2d');
  backdrop(ctx, W, H, p, { seed: success ? 8 : 9 });
  await avatarRing(ctx, thiefAvatar, W - 150, 150, 140, p, thief);
  await avatarRing(ctx, victimAvatar, 150, 150, 140, { ...p, a: '#9aa6c4', b: '#5b6584', glow: 'rgba(150,160,190,0.3)' }, victim);
  K.txt(ctx, thief, W - 150, 270, { size: 22, align: 'center', maxW: 240 });
  K.txt(ctx, victim, 150, 270, { size: 22, align: 'center', maxW: 240 });
  K.txt(ctx, 'السارق', W - 150, 298, { size: 13, weight: 'normal', color: SUB, align: 'center' });
  K.txt(ctx, 'الضحية', 150, 298, { size: 13, weight: 'normal', color: SUB, align: 'center' });
  K.emoji(ctx, success ? '🥷' : '🚨', W / 2, 92, 70, { glow: p.glow });
  K.txt(ctx, success ? 'سرقة ناجحة!' : 'انكشفت!', W / 2, 172, { size: 42, align: 'center', shadow: true });
  K.txt(ctx, `${success ? '+' : '−'}${full(amount)} 💎`, W / 2, 226, { size: 36, align: 'center', color: success ? p.a : p.a, glow: p.glow });
  // سهم
  ctx.save(); ctx.strokeStyle = lin(ctx, 260, 0, W - 260, 0, success ? ['#9aa6c4', p.a] : [p.a, '#9aa6c4']); ctx.lineWidth = 4; ctx.setLineDash([10, 10]);
  ctx.beginPath(); ctx.moveTo(250, 250); ctx.lineTo(W - 250, 250); ctx.stroke(); ctx.restore();
  K.txt(ctx, success ? `رصيدك الآن ${full(balance)} · محفظته محمية ساعتين` : `دفعت غرامة للضحية · رصيدك ${full(balance)}`, W / 2, 290, { size: 15, weight: 'normal', color: SUB, align: 'center' });
  K.txt(ctx, `نسبة النجاح ${chance}% · البنك محمي دائماً`, W / 2, H - 22, { size: 13, weight: 'normal', color: 'rgba(255,255,255,0.4)', align: 'center' });
  return out(canvas, 'steal.png');
}

module.exports.shopGridCard = shopGridCard;
module.exports.adhkarCard = adhkarCard;
module.exports.stealCard = stealCard;
module.exports.PAL_SHOP = PAL_SHOP;
