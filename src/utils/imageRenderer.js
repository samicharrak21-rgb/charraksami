// ============= Image Renderer (v2) =============
// أعيدت كتابة هذا الملف لإصلاح مشكلة عدم ظهور النصوص في بطاقات الرصيد والمستوى.
// التغييرات الرئيسية:
//   1) تسجيل خط Cairo + خط احتياطي للأرقام/اللاتيني (DejaVu/Arial) مع تحقق من نجاح التحميل.
//   2) حماية النصوص: لا نمسح الإيموجي/الرموز التي كانت تختفي بسبب فلتر صارم.
//   3) ضبط baseline بدقة + ظلال خفيفة لزيادة وضوح النص فوق الخلفيات الملوّنة.
//   4) كشف نوع الخط المُحمّل ديناميكياً واستخدام stack مرن كـ fallback.

const path = require('path');
const fs = require('fs');
const arabicReshaper = require('arabic-reshaper');

let bidi = null;
try {
  const bidiModule = require('bidi-js');
  if (typeof bidiModule === 'function') bidi = bidiModule();
  else if (bidiModule && typeof bidiModule.getReorderedProposed === 'function') bidi = bidiModule;
  else if (bidiModule && typeof bidiModule.default === 'function') bidi = bidiModule.default();
} catch (e) { /* ignore */ }

let createCanvas = null;
let loadImage = null;
let GlobalFonts = null;
let FONT_NAME = 'sans-serif';
let FONT_OK = false;

try {
  const c = require('@napi-rs/canvas');
  createCanvas = c.createCanvas;
  loadImage = c.loadImage;
  GlobalFonts = c.GlobalFonts;

  // تسجيل خط Cairo (يدعم العربية + اللاتيني + الأرقام)
  const fontCandidates = [
    path.resolve(__dirname, '../../assets/fonts/cairo.ttf'),
    path.resolve(__dirname, '../../assets/fonts/Cairo-Regular.ttf'),
  ];
  for (const fp of fontCandidates) {
    if (fs.existsSync(fp) && GlobalFonts && typeof GlobalFonts.registerFromPath === 'function') {
      try {
        const ok = GlobalFonts.registerFromPath(fp, 'Cairo');
        if (ok !== false) {
          FONT_NAME = 'Cairo';
          FONT_OK = true;
          console.log('✅ [ImageRenderer] Cairo font registered from', fp);
          break;
        }
      } catch (e) {
        console.warn('⚠️ [ImageRenderer] register failed for', fp, e.message);
      }
    }
  }

  // تسجيل خط الإيموجي إن وُجد
  try {
    const emojiPath = path.resolve(__dirname, '../../assets/fonts/noto-emoji.ttf');
    if (fs.existsSync(emojiPath)) {
      GlobalFonts.registerFromPath(emojiPath, 'NotoEmoji');
      console.log('✅ [ImageRenderer] Emoji font registered');
    }
  } catch {}

  if (!FONT_OK) {
    // محاولة تحميل أي خط نظام كاحتياط لمنع اختفاء النصوص
    try {
      const sysFonts = ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
                        '/usr/share/fonts/dejavu/DejaVuSans.ttf'];
      for (const sf of sysFonts) {
        if (fs.existsSync(sf)) {
          GlobalFonts.registerFromPath(sf, 'Fallback');
          FONT_NAME = 'Fallback';
          FONT_OK = true;
          console.log('ℹ️ [ImageRenderer] Using system fallback font:', sf);
          break;
        }
      }
    } catch {}
  }

  if (!FONT_OK) {
    console.warn('⚠️ [ImageRenderer] No font registered — text may not render. Place a valid TTF at assets/fonts/cairo.ttf');
  }
} catch (e) {
  console.warn('⚠️ [ImageRenderer] @napi-rs/canvas not available; falling back to embeds. ' + e.message);
}

const FONT_STACK = `"${FONT_NAME}", "Cairo", "NotoEmoji", "DejaVu Sans", "Noto Sans Arabic", Arial, sans-serif`;
const hasCanvas = () => !!createCanvas;

function cleanText(text) {
  if (text === null || text === undefined) return '';
  // حافظ على العربية + الحروف اللاتينية + الأرقام + الرموز الأساسية + الإيموجي
  return String(text).trim() || 'Player';
}

function prepareText(text) {
  if (!text) return '';
  if (!/[\u0600-\u06FF]/.test(text)) return text;
  try {
    const reshaped = arabicReshaper.reshape(text);
    if (bidi && typeof bidi.getReorderedProposed === 'function') return bidi.getReorderedProposed(reshaped);
    return reshaped;
  } catch (e) { return text; }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function withShadow(ctx, fn) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  fn();
  ctx.restore();
}

async function drawAvatarCircle(ctx, url, x, y, size, ringColor) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  try {
    const img = await loadImage(url);
    ctx.drawImage(img, x, y, size, size);
  } catch (e) {
    ctx.fillStyle = '#5865f2';
    ctx.fillRect(x, y, size, size);
  }
  ctx.restore();
  if (ringColor) {
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 + 4, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 5;
    ctx.stroke();
  }
}

// ============== Vector Icons (no emoji needed) ==============
function iconDiamond(ctx, cx, cy, size, color = '#7ee8fa') {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size;
  const grad = ctx.createLinearGradient(0, -s, 0, s);
  grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, color); grad.addColorStop(1, '#1f8eaa');
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.85, -s * 0.25);
  ctx.lineTo(0, s);
  ctx.lineTo(-s * 0.85, -s * 0.25);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // facet lines
  ctx.beginPath();
  ctx.moveTo(-s * 0.85, -s * 0.25); ctx.lineTo(s * 0.85, -s * 0.25);
  ctx.moveTo(-s * 0.5, -s * 0.25); ctx.lineTo(0, -s);
  ctx.moveTo(s * 0.5, -s * 0.25); ctx.lineTo(0, -s);
  ctx.moveTo(-s * 0.5, -s * 0.25); ctx.lineTo(0, s);
  ctx.moveTo(s * 0.5, -s * 0.25); ctx.lineTo(0, s);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

function iconStar(ctx, cx, cy, r, color = '#f1c40f') {
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
  }
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

function iconSword(ctx, cx, cy, s, color = '#cdd6f4') {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI / 4);
  ctx.fillStyle = color;
  // blade
  ctx.beginPath();
  ctx.moveTo(0, -s); ctx.lineTo(s * 0.18, -s * 0.85);
  ctx.lineTo(s * 0.18, s * 0.3); ctx.lineTo(-s * 0.18, s * 0.3);
  ctx.lineTo(-s * 0.18, -s * 0.85); ctx.closePath(); ctx.fill();
  // crossguard
  ctx.fillStyle = '#a98d52';
  ctx.fillRect(-s * 0.55, s * 0.3, s * 1.1, s * 0.12);
  // handle
  ctx.fillStyle = '#5b3b1f';
  ctx.fillRect(-s * 0.1, s * 0.42, s * 0.2, s * 0.45);
  // pommel
  ctx.fillStyle = '#d4af37';
  ctx.beginPath(); ctx.arc(0, s * 0.92, s * 0.13, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function iconChat(ctx, cx, cy, s, color = '#5865f2') {
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = color;
  roundRect(ctx, -s, -s * 0.75, s * 2, s * 1.4, s * 0.3); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, s * 0.65); ctx.lineTo(-s * 0.15, s * 0.65); ctx.lineTo(-s * 0.4, s * 0.95); ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const dx of [-s * 0.45, 0, s * 0.45]) { ctx.beginPath(); ctx.arc(dx, 0, s * 0.13, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

function iconHammer(ctx, cx, cy, s, color = '#c0392b') {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(-Math.PI / 6);
  ctx.fillStyle = color;
  roundRect(ctx, -s * 0.85, -s * 0.4, s * 1.3, s * 0.7, 6); ctx.fill();
  ctx.fillStyle = '#5b3b1f';
  ctx.fillRect(-s * 0.1, s * 0.3, s * 0.2, s * 1.1);
  ctx.restore();
}

function iconLeaf(ctx, cx, cy, s, color = '#27ae60') {
  ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.bezierCurveTo(s, -s * 0.6, s, s * 0.6, 0, s);
  ctx.bezierCurveTo(-s, s * 0.6, -s, -s * 0.6, 0, -s);
  ctx.fill();
  ctx.strokeStyle = '#0e6b3a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke();
  ctx.restore();
}

function iconSlot(ctx, cx, cy, s, color = '#e74c3c') {
  ctx.save(); ctx.translate(cx, cy);
  ctx.fillStyle = color;
  roundRect(ctx, -s, -s * 0.9, s * 2, s * 1.8, s * 0.18); ctx.fill();
  ctx.fillStyle = '#1c1c2e';
  roundRect(ctx, -s * 0.8, -s * 0.55, s * 1.6, s * 0.9, s * 0.08); ctx.fill();
  ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-s * 0.27, -s * 0.55); ctx.lineTo(-s * 0.27, s * 0.35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(s * 0.27, -s * 0.55); ctx.lineTo(s * 0.27, s * 0.35); ctx.stroke();
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath(); ctx.arc(s * 0.85, -s * 0.65, s * 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function iconCoin(ctx, cx, cy, r, color = '#f1c40f') {
  ctx.save(); ctx.translate(cx, cy);
  const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 2, 0, 0, r);
  grad.addColorStop(0, '#fff7c0'); grad.addColorStop(0.6, color); grad.addColorStop(1, '#a87a06');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a5806'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}

// ============== Backgrounds (v18) ==============
const BG_DIR = path.resolve(__dirname, '../../assets/backgrounds');
const bgCache = new Map();
async function getBg(name) {
  if (bgCache.has(name)) return bgCache.get(name);
  let img = null;
  try { const fp = path.join(BG_DIR, name + '.jpg'); if (fs.existsSync(fp)) img = await loadImage(fs.readFileSync(fp)); } catch {}
  bgCache.set(name, img); return img;
}
/** يرسم خلفية صورة (cover) + تعتيم + إطار زجاجي بحواف دائرية */
async function drawBackground(ctx, W, H, name, { overlay = 0.45, radius = 28, tint = '#0b0f1e', accent = ['#7b2ff7', '#f107a3'] } = {}) {
  ctx.save();
  roundRect(ctx, 0, 0, W, H, radius); ctx.clip();
  ctx.fillStyle = tint; ctx.fillRect(0, 0, W, H);
  const img = await getBg(name);
  if (img) {
    const s = Math.max(W / img.width, H / img.height);
    const iw = img.width * s, ih = img.height * s;
    ctx.drawImage(img, (W - iw) / 2, (H - ih) / 2, iw, ih);
  }
  // تعتيم متدرج لوضوح النص
  const ov = ctx.createLinearGradient(0, 0, W, 0);
  ov.addColorStop(0, `rgba(5,6,18,${overlay * 0.7})`); ov.addColorStop(1, `rgba(5,6,18,${overlay})`);
  ctx.fillStyle = ov; ctx.fillRect(0, 0, W, H);
  // vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // حد متوهج
  ctx.save();
  const bd = ctx.createLinearGradient(0, 0, W, H);
  bd.addColorStop(0, accent[0]); bd.addColorStop(1, accent[1]);
  ctx.strokeStyle = bd; ctx.lineWidth = 4; ctx.shadowColor = accent[1]; ctx.shadowBlur = 18;
  roundRect(ctx, 2, 2, W - 4, H - 4, radius); ctx.stroke();
  ctx.restore();
}
/** لوحة زجاجية شفافة */
function glassPanel(ctx, x, y, w, h, r = 18, stroke = 'rgba(255,255,255,0.18)') {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 6;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = g; roundRect(ctx, x, y, w, h, r); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; roundRect(ctx, x, y, w, h, r); ctx.stroke(); ctx.restore();
}

// ============== PROFILE / RANK CARD ==============
async function renderProfileCard(data) {
  if (!hasCanvas()) return null;
  const { username, level, xp, nextXP, balance, avatarURL, stats = {}, rpgClass } = data;
  const W = 900, H = 560;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  await drawBackground(ctx, W, H, 'rank', { overlay: 0.5 });
  glassPanel(ctx, 24, 36, W - 48, 250, 24);

  // soft glows
  const glow = ctx.createRadialGradient(W - 100, 100, 20, W - 100, 100, 320);
  glow.addColorStop(0, 'rgba(241,7,163,0.30)'); glow.addColorStop(1, 'rgba(241,7,163,0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  const glow2 = ctx.createRadialGradient(80, H - 60, 10, 80, H - 60, 280);
  glow2.addColorStop(0, 'rgba(123,47,247,0.28)'); glow2.addColorStop(1, 'rgba(123,47,247,0)');
  ctx.fillStyle = glow2; ctx.fillRect(0, 0, W, H);

  // Top accent bar
  const topBar = ctx.createLinearGradient(0, 0, W, 0);
  topBar.addColorStop(0, '#7b2ff7'); topBar.addColorStop(1, '#f107a3');
  ctx.fillStyle = topBar; ctx.fillRect(0, 0, W, 8);

  // Avatar
  await drawAvatarCircle(ctx, avatarURL, 50, 60, 180, '#f107a3');

  // ---- Header text block ----
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  withShadow(ctx, () => {
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 44px ${FONT_STACK}`;
    ctx.fillText(prepareText(cleanText(username).slice(0, 16)), 260, 115);
  });

  // Level badge
  ctx.save();
  const lg = ctx.createLinearGradient(260, 0, 410, 0);
  lg.addColorStop(0, '#7b2ff7'); lg.addColorStop(1, '#f107a3');
  ctx.fillStyle = lg; roundRect(ctx, 260, 140, 140, 42, 21); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = `bold 22px ${FONT_STACK}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(`LEVEL ${level}`, 330, 161);
  ctx.restore();

  // Class chip with vector sword
  ctx.save();
  iconSword(ctx, 435, 161, 16, '#cdd6f4');
  ctx.fillStyle = '#e8eaed'; ctx.font = `22px ${FONT_STACK}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(prepareText(cleanText(rpgClass) || 'Hero'), 460, 161);
  ctx.restore();

  // XP label + bar
  const barX = 260, barY = 230, barW = 600, barH = 30;
  ctx.fillStyle = '#cdd1d6'; ctx.font = `bold 16px ${FONT_STACK}`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText('EXPERIENCE', barX, barY - 10);
  ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff';
  ctx.fillText(`${(xp || 0).toLocaleString()} / ${(nextXP || 0).toLocaleString()} XP`, barX + barW, barY - 10);

  ctx.fillStyle = 'rgba(255,255,255,0.10)'; roundRect(ctx, barX, barY, barW, barH, 15); ctx.fill();
  const ratio = Math.min(1, (xp || 0) / Math.max(1, nextXP || 1));
  const xb = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  xb.addColorStop(0, '#7b2ff7'); xb.addColorStop(1, '#f107a3');
  ctx.fillStyle = xb; roundRect(ctx, barX, barY, Math.max(barH, barW * ratio), barH, 15); ctx.fill();

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(40, 295); ctx.lineTo(W - 40, 295); ctx.stroke();

  // Stats grid (vector icons, no emoji)
  const items = [
    { draw: (x, y) => iconChat(ctx, x, y, 22, '#5865f2'),  lb: 'MESSAGES', vl: (stats.messages_count || 0).toLocaleString() },
    { draw: (x, y) => iconDiamond(ctx, x, y, 22, '#7ee8fa'), lb: 'BALANCE',  vl: (balance || 0).toLocaleString() },
    { draw: (x, y) => iconHammer(ctx, x, y, 22, '#e67e22'), lb: 'WORK',     vl: (stats.work_count || 0).toLocaleString() },
    { draw: (x, y) => iconSword(ctx, x, y, 22, '#e74c3c'),  lb: 'DUNGEON',  vl: (stats.dungeon_count || 0).toLocaleString() },
    { draw: (x, y) => iconLeaf(ctx, x, y, 22, '#27ae60'),   lb: 'FARM',     vl: (stats.farm_plant_count || 0).toLocaleString() },
    { draw: (x, y) => iconSlot(ctx, x, y, 22, '#c0392b'),   lb: 'SLOTS',    vl: (stats.slots_count || 0).toLocaleString() },
  ];
  const colW = Math.floor((W - 80) / 3);
  for (let i = 0; i < items.length; i++) {
    const c = i % 3, r = Math.floor(i / 3);
    const sx = 40 + c * colW, sy = 320 + r * 115;
    const cellW = colW - 14, cellH = 100;
    glassPanel(ctx, sx, sy, cellW, cellH, 16);

    // icon left, text right (avoids overlap)
    items[i].draw(sx + 38, sy + cellH / 2);

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#cdd1d6'; ctx.font = `bold 13px ${FONT_STACK}`;
    ctx.fillText(items[i].lb, sx + 78, sy + 38);
    ctx.fillStyle = '#ffffff'; ctx.font = `bold 24px ${FONT_STACK}`;
    ctx.fillText(items[i].vl, sx + 78, sy + 70);
  }

  return { buffer: await canvas.encode('png'), name: 'profile.png' };
}

// ============== BALANCE CARD ==============
function formatCompact(n) {
  n = Number(n) || 0;
  const abs = Math.abs(n);
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  for (const [v, u] of units) if (abs >= v) return (n / v).toFixed(abs >= v * 100 ? 0 : 1).replace(/\.0$/, '') + u;
  return n.toLocaleString('en-US');
}

async function renderBalanceCard(data) {
  if (!hasCanvas()) return null;
  const { username, balance = 0, bank = 0, level, currency = 'جوهرة', avatarURL, rank, totalUsers } = data;
  const W = 1000, H = 420;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // خلفية متدرجة داكنة
  await drawBackground(ctx, W, H, 'wealth', { overlay: 0.55, accent: ['#f9d423', '#7ee8fa'] });

  // توهجات
  for (const [x, y, r, c] of [[W - 160, 90, 320, 'rgba(255,200,60,0.28)'], [120, H, 300, 'rgba(126,232,250,0.16)']]) {
    const g = ctx.createRadialGradient(x, y, 10, x, y, r);
    g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  // نقاط زخرفية

  // شريط علوي ذهبي
  const ab = ctx.createLinearGradient(0, 0, W, 0);
  ab.addColorStop(0, '#f9d423'); ab.addColorStop(1, '#ff4e50');
  ctx.fillStyle = ab; roundRect(ctx, 0, 0, W, 8, 4); ctx.fill();

  await drawAvatarCircle(ctx, avatarURL, 50, 70, 160, '#f9d423');

  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillStyle = '#f9d423'; ctx.font = `bold 22px ${FONT_STACK}`;
  ctx.fillText(prepareText('المحفظة الرقمية'), 250, 95);
  withShadow(ctx, () => {
    ctx.fillStyle = '#ffffff'; ctx.font = `bold 40px ${FONT_STACK}`;
    ctx.fillText(prepareText(cleanText(username).slice(0, 20)), 250, 142);
  });

  // صناديق: المحفظة / البنك / الإجمالي
  const total = (Number(balance) || 0) + (Number(bank) || 0);
  const boxes = [
    { lb: 'المحفظة', vl: balance, color: '#f9d423', icon: (x, y) => iconCoin(ctx, x, y, 16, '#f9d423') },
    { lb: 'البنك', vl: bank, color: '#7ee8fa', icon: (x, y) => iconDiamond(ctx, x, y, 22, '#7ee8fa') },
    { lb: 'الثروة', vl: total, color: '#a29bfe', icon: (x, y) => iconStar(ctx, x, y, 14, '#a29bfe') },
  ];
  const bw = 230, bh = 120, gap = 20; let bx = 250; const by = 175;
  for (const b of boxes) {
    glassPanel(ctx, bx, by, bw, bh, 18, b.color + 'aa');
    b.icon(bx + 30, by + 32);
    ctx.fillStyle = '#a8b2c1'; ctx.font = `bold 18px ${FONT_STACK}`; ctx.textAlign = 'left';
    ctx.fillText(prepareText(b.lb), bx + 55, by + 39);
    withShadow(ctx, () => {
      ctx.fillStyle = '#ffffff'; ctx.font = `bold 40px ${FONT_STACK}`;
      ctx.fillText(formatCompact(b.vl), bx + 20, by + 95);
    });
    bx += bw + gap;
  }

  // أسفل: المستوى / الترتيب / العملة
  const pills = [
    { t: `LEVEL ${level || 1}`, c: '#6c5ce7' },
    { t: rank ? `RANK #${rank}${totalUsers ? ` / ${totalUsers}` : ''}` : 'RANK —', c: '#e84393' },
    { t: prepareText(`${formatCompact(total)} ${currency}`), c: '#00b894' },
  ];
  let px = 250; const py = H - 80;
  ctx.font = `bold 20px ${FONT_STACK}`;
  for (const p of pills) {
    const w = Math.max(140, ctx.measureText(p.t).width + 40);
    ctx.fillStyle = p.c; roundRect(ctx, px, py, w, 46, 23); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.t, px + w / 2, py + 24);
    px += w + 14;
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

  return { buffer: await canvas.encode('png'), name: 'balance.png' };
}


// ============== LEADERBOARD CARD ==============
async function renderLeaderboardCard(data) {
  if (!hasCanvas()) return null;
  const { title = 'Leaderboard', entries = [], guildName = '' } = data;
  const rowH = 70;
  const W = 900;
  const H = 130 + Math.max(1, entries.length) * rowH + 30;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  await drawBackground(ctx, W, H, 'rank', { overlay: 0.6, accent: ['#f1c40f', '#7b2ff7'] });

  const tb = ctx.createLinearGradient(0, 0, W, 0);
  tb.addColorStop(0, '#f1c40f'); tb.addColorStop(0.5, '#f107a3'); tb.addColorStop(1, '#7b2ff7');
  ctx.fillStyle = tb; ctx.fillRect(0, 0, W, 8);

  ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff'; ctx.font = `bold 38px ${FONT_STACK}`;
  ctx.fillText(prepareText(cleanText(title)), W / 2, 30);
  if (guildName) {
    ctx.fillStyle = '#cdd1d6'; ctx.font = `18px ${FONT_STACK}`;
    ctx.fillText(prepareText(cleanText(guildName)), W / 2, 80);
  }

  ctx.textAlign = 'left';
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const y = 130 + i * rowH;
    const isTop = i < 3;
    const medalColor = ['#f1c40f', '#d0d6de', '#e08e45'][i] || '#3b3b58';

    glassPanel(ctx, 30, y, W - 60, rowH - 10, 14, isTop ? medalColor + 'cc' : 'rgba(255,255,255,0.15)');

    const medals = ['🥇', '🥈', '🥉'];
    ctx.font = `bold 36px ${FONT_STACK}`;
    ctx.fillStyle = isTop ? medalColor : '#9aa0a6';
    void medals;
    if (i < 3) {
      ctx.beginPath(); ctx.arc(80, y + 30, 22, 0, Math.PI * 2); ctx.fillStyle = medalColor; ctx.fill();
      ctx.fillStyle = '#1a1a2e'; ctx.font = `bold 24px ${FONT_STACK}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), 80, y + 31); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    } else { ctx.font = `bold 26px ${FONT_STACK}`; ctx.fillText(`#${i + 1}`, 55, y + 14); }

    if (e.avatarURL) {
      await drawAvatarCircle(ctx, e.avatarURL, 130, y + 5, 50, medalColor);
    }

    ctx.fillStyle = '#ffffff'; ctx.font = `bold 22px ${FONT_STACK}`;
    ctx.fillText(prepareText(cleanText(e.name).slice(0, 22)), 200, y + 12);

    ctx.fillStyle = '#cdd1d6'; ctx.font = `16px ${FONT_STACK}`;
    ctx.fillText(prepareText(e.subtitle || ''), 200, y + 38);

    ctx.textAlign = 'right'; ctx.fillStyle = '#f1c40f'; ctx.font = `bold 26px ${FONT_STACK}`;
    ctx.fillText(String(e.value || ''), W - 50, y + 18);
    ctx.textAlign = 'left';
  }

  return { buffer: await canvas.encode('png'), name: 'leaderboard.png' };
}

// ============== LEVEL UP CARD ==============
async function renderLevelUpCard(data) {
  if (!hasCanvas()) return null;
  const { username, level, oldLevel, avatarURL, xp = 0, nextXP = 0, reward } = data;
  const W = 1000, H = 330;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  await drawBackground(ctx, W, H, 'levelup', { overlay: 0.35, accent: ['#f9d423', '#f107a3'] });
  glassPanel(ctx, 270, 40, W - 300, H - 80, 22);

  // قصاصات احتفالية
  const conf = ['#f9d423', '#ff4e50', '#7ee8fa', '#a29bfe', '#55efc4'];
  for (let i = 0; i < 25; i++) {
    const x = (i * 137) % W, y = (i * 89) % H;
    ctx.save(); ctx.translate(x, y); ctx.rotate(i);
    ctx.fillStyle = conf[i % conf.length] + '99'; ctx.fillRect(-4, -2, 8, 4); ctx.restore();
  }
  const ab = ctx.createLinearGradient(0, 0, W, 0);
  ab.addColorStop(0, '#f9d423'); ab.addColorStop(1, '#f107a3');
  ctx.fillStyle = ab; roundRect(ctx, 0, 0, W, 8, 4); ctx.fill();

  await drawAvatarCircle(ctx, avatarURL, 70, 80, 170, '#f9d423');

  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  withShadow(ctx, () => {
    const tg = ctx.createLinearGradient(290, 0, 700, 0);
    tg.addColorStop(0, '#f9d423'); tg.addColorStop(1, '#ff4e50');
    ctx.fillStyle = tg; ctx.font = `bold 58px ${FONT_STACK}`;
    ctx.fillText('LEVEL UP!', 290, 110);
  });
  ctx.fillStyle = '#ffffff'; ctx.font = `bold 32px ${FONT_STACK}`;
  ctx.fillText(prepareText(cleanText(username).slice(0, 22)), 290, 160);

  // المستوى القديم ← الجديد
  const from = oldLevel || Math.max(1, (level || 1) - 1);
  ctx.font = `bold 30px ${FONT_STACK}`;
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; roundRect(ctx, 290, 185, 110, 60, 16); ctx.fill();
  ctx.fillStyle = '#a8b2c1'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(from), 345, 216);
  ctx.fillStyle = '#f9d423'; ctx.fillText('➜', 435, 216);
  const lg = ctx.createLinearGradient(470, 0, 600, 0);
  lg.addColorStop(0, '#7b2ff7'); lg.addColorStop(1, '#f107a3');
  ctx.fillStyle = lg; roundRect(ctx, 470, 180, 130, 70, 18); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.font = `bold 40px ${FONT_STACK}`; ctx.fillText(String(level || 1), 535, 216);

  if (reward) {
    ctx.font = `bold 22px ${FONT_STACK}`;
    const t = prepareText(String(reward));
    const w = ctx.measureText(t).width + 40;
    ctx.fillStyle = '#00b894'; roundRect(ctx, 630, 192, w, 46, 23); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillText(t, 630 + w / 2, 216);
  }

  // شريط الخبرة للمستوى التالي
  if (nextXP > 0) {
    const bx = 290, by = 272, bw = 640, bh = 18;
    ctx.fillStyle = 'rgba(255,255,255,0.10)'; roundRect(ctx, bx, by, bw, bh, 9); ctx.fill();
    const pg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    pg.addColorStop(0, '#f9d423'); pg.addColorStop(1, '#f107a3');
    ctx.fillStyle = pg; roundRect(ctx, bx, by, Math.max(18, bw * Math.min(1, xp / nextXP)), bh, 9); ctx.fill();
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  return { buffer: await canvas.encode('png'), name: 'levelup.png' };
}

// ============== BATTLE CARD ==============
async function renderBattleCard(data) {
  if (!hasCanvas()) return null;
  const { enemyName, enemyHp, enemyMaxHp, playerName, playerHp, playerMaxHp, enemyImage, avatarURL, wave, dungeonLevel } = data;
  const W = 900, H = 480;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  await drawBackground(ctx, W, H, 'arena', { overlay: 0.4, accent: ['#e74c3c', '#5865f2'] });

  ctx.textBaseline = 'top'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff'; ctx.font = `bold 28px ${FONT_STACK}`;
  ctx.fillText(`Wave ${wave || 1}  •  Dungeon Lv.${dungeonLevel || 1}`, W / 2, 20);

  if (enemyImage) {
    try {
      const img = await loadImage(enemyImage);
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, W / 2 - 130, 70, 260, 200, 18);
      ctx.clip();
      ctx.drawImage(img, W / 2 - 130, 70, 260, 200);
      ctx.restore();
    } catch (e) {}
  }

  if (avatarURL) await drawAvatarCircle(ctx, avatarURL, 40, 90, 130, '#5865f2');

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff'; ctx.font = `bold 24px ${FONT_STACK}`;
  ctx.fillText(prepareText(cleanText(playerName || 'Hero').slice(0, 14)), 40, 230);

  ctx.textAlign = 'right';
  ctx.fillText(prepareText(cleanText(enemyName || 'Enemy').slice(0, 18)), W - 40, 280);

  const drawBar = (x, y, w, cur, max, color, label) => {
    const r = Math.max(0, Math.min(1, (cur || 0) / (max || 1)));
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(ctx, x, y, w, 26, 13); ctx.fill();
    ctx.fillStyle = color; roundRect(ctx, x, y, Math.max(26, w * r), 26, 13); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.font = `bold 14px ${FONT_STACK}`; ctx.textAlign = 'left';
    ctx.fillText(`${label}  ${cur}/${max}`, x + 12, y + 5);
  };

  drawBar(40, 350, 380, playerHp, playerMaxHp, '#2ecc71', 'HP');
  drawBar(W - 40 - 380, 400, 380, enemyHp, enemyMaxHp, '#e74c3c', 'HP');

  return { buffer: await canvas.encode('png'), name: 'battle.png' };
}

// ============== FARM CARD ==============
async function renderFarmCard(data) {
  if (!hasCanvas()) return null;
  const { username, balance, planted = [], crops = {} } = data;
  const W = 900, H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b3d2e'); bg.addColorStop(1, '#0a4f3a');
  ctx.fillStyle = bg; roundRect(ctx, 0, 0, W, H, 28); ctx.fill();
  const sun = ctx.createRadialGradient(W - 120, 60, 10, W - 120, 60, 260);
  sun.addColorStop(0, 'rgba(255,220,120,0.35)'); sun.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff'; ctx.font = `bold 32px ${FONT_STACK}`;
  iconLeaf(ctx, 48, 48, 16); ctx.fillText(prepareText(`Farm: ${cleanText(username)}`), 75, 30);
  ctx.font = `22px ${FONT_STACK}`; ctx.fillStyle = '#f1c40f';
  iconDiamond(ctx, 46, 90, 12); ctx.fillText(`${(balance || 0).toLocaleString()}`, 70, 75);

  const now = Date.now();
  const keys = Object.keys(crops);
  const boxW = 410, boxH = 160, gap = 20;
  let x = 30, y = 130;
  for (const k of keys) {
    const crop = crops[k];
    const ready = planted.filter(p => p.type === k && now >= p.readyAt).length;
    const grow = planted.filter(p => p.type === k && now < p.readyAt).length;
    glassPanel(ctx, x, y, boxW, boxH, 16, 'rgba(185,240,197,0.4)');
    ctx.fillStyle = '#ffffff'; ctx.font = `bold 24px ${FONT_STACK}`;
    ctx.fillText(prepareText(cleanText(crop.name)), x + 20, y + 18);
    ctx.font = `18px ${FONT_STACK}`; ctx.fillStyle = '#b9f0c5';
    ctx.fillText(`Ready: ${ready} | Growing: ${grow}`, x + 20, y + 60);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`Sell: ${crop.sellPrice} | Cost: ${crop.cost}`, x + 20, y + 100);
    x += boxW + gap;
    if (x + boxW > W) { x = 30; y += boxH + gap; }
  }
  return { buffer: await canvas.encode('png'), name: 'farm.png' };
}

// v19: البطاقات الرئيسية تستخدم تصميم cardKit الجديد
const kit = require('./cardKit');
module.exports = {
  formatCompact,
  renderProfileCard: (d) => kit.profileCard(d),
  renderBalanceCard: (d) => kit.balanceCard(d),
  renderLeaderboardCard: (d) => kit.leaderboardCard(d),
  renderLevelUpCard: (d) => kit.levelUpCard(d),
  renderBattleCard,
  renderFarmCard,
  drawBackground,
  glassPanel,
  cleanText,
  prepareText,
  hasCanvas,
  FONT_NAME,
  FONT_OK,
};
