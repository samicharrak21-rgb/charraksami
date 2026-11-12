// 🎴 cardKit v21 — "Royal Noir" : نظام تصميم موحّد وفاخر لكل بطاقات البوت
// - خلفيات مصوّرة (assets/backgrounds + assets/scenes) مع تعتيم وتلوين بلون البطاقة
// - إيموجي ملوّن حقيقي (Twemoji SVG محلي في assets/emoji) داخل أي نص
// - ترتيب صحيح للنص العربي (من اليمين لليسار) حتى مع الأرقام والإيموجي
// - إطارات متدرجة، زوايا مزخرفة، توهجات، جزيئات، لوحات زجاجية، حلقات تقدم
// كل دالة بطاقة ترجع { buffer, name } أو null إن لم تتوفر مكتبة الرسم.
const path = require('path');
const fs = require('fs');

let arabicReshaper = null;
try { arabicReshaper = require('arabic-reshaper'); } catch {}

let C = null;
try {
  C = require('@napi-rs/canvas');
  const f = path.resolve(__dirname, '../../assets/fonts/cairo.ttf');
  if (fs.existsSync(f)) C.GlobalFonts.registerFromPath(f, 'Cairo');
  const e = path.resolve(__dirname, '../../assets/fonts/noto-emoji.ttf');
  if (fs.existsSync(e)) C.GlobalFonts.registerFromPath(e, 'NotoEmoji');
} catch { C = null; }

const ASSETS = path.resolve(__dirname, '../../assets');
const hasCanvas = () => !!C;
const FONT = '"Cairo", "NotoEmoji", "DejaVu Sans", Arial, sans-serif';
const font = (size, weight = 'bold') => `${weight} ${Math.round(size)}px ${FONT}`;

// ===== الألوان =====
const THEMES = {
  gold:    { a: '#ffd76a', b: '#e8891c', glow: 'rgba(255,200,90,0.38)',  deep: '#1d1405' },
  emerald: { a: '#4cf0b0', b: '#0f9e74', glow: 'rgba(76,240,176,0.32)',  deep: '#04170f' },
  crimson: { a: '#ff6b7f', b: '#c3173a', glow: 'rgba(255,90,115,0.36)',  deep: '#1a0509' },
  azure:   { a: '#6fd3ff', b: '#2b6cff', glow: 'rgba(100,190,255,0.34)', deep: '#05101f' },
  violet:  { a: '#c3a8ff', b: '#6d4aff', glow: 'rgba(170,140,255,0.34)', deep: '#0e0820' },
  slate:   { a: '#dbe2ee', b: '#7d8799', glow: 'rgba(210,220,235,0.22)', deep: '#0d1016' },
  amber:   { a: '#ffb547', b: '#ff6a00', glow: 'rgba(255,150,40,0.36)',  deep: '#1c0d02' },
  rose:    { a: '#ff9ad5', b: '#e0408f', glow: 'rgba(255,140,200,0.34)', deep: '#1a0612' },
  frost:   { a: '#bdf4ff', b: '#4aa8ff', glow: 'rgba(160,230,255,0.32)', deep: '#06121c' },
  toxic:   { a: '#b6ff5c', b: '#38b000', glow: 'rgba(170,255,90,0.30)',  deep: '#071405' },
};
const INK = { bg: '#07080c', bg2: '#11141c', text: '#f6f7fb', sub: '#a3abbd', dim: 'rgba(255,255,255,0.45)', line: 'rgba(255,255,255,0.09)', dark: '#14110a' };
const th = (t) => (typeof t === 'string' ? THEMES[t] || THEMES.gold : t || THEMES.gold);

// ===== أرقام =====
const compact = (n) => {
  n = Number(n) || 0;
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (a >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  return Math.round(n).toLocaleString('en-US');
};
const strip = (s) => String(s ?? '').replace(/\*\*|__|`|~~|\|\|/g, '').replace(/<@!?\d+>/g, '@').replace(/<a?:(\w+):\d+>/g, ':$1:');

/** متوافق مع النسخ القديمة: يعيد تشكيل الحروف فقط (الرسم الحالي يشكّل العربية تلقائياً) */
function ar(text) {
  const t = String(text ?? '');
  if (!arabicReshaper || !/[\u0600-\u06FF]/.test(t)) return t;
  try { return arabicReshaper.reshape(t); } catch { return t; }
}

// ===== الصور =====
const imgCache = new Map();
function localImage(file) {
  if (!C) return null;
  if (imgCache.has(file)) return imgCache.get(file);
  let img = null;
  try {
    if (fs.existsSync(file)) { img = new C.Image(); img.src = fs.readFileSync(file); if (!img.width) img = null; }
  } catch { img = null; }
  imgCache.set(file, img);
  return img;
}
/** صورة خلفية/مشهد محلية بالاسم: rank, levelup, wealth, arena, farm, casino, stage1..4, room */
function scene(name) {
  if (!name) return null;
  for (const dir of ['games', 'scenes', 'backgrounds']) {
    for (const ext of ['jpg', 'png']) {
      const p = path.join(ASSETS, dir, `${name}.${ext}`);
      if (fs.existsSync(p)) return localImage(p);
    }
  }
  return null;
}
const bossArt = (n) => localImage(path.join(ASSETS, 'bosses', `boss${n}.png`));
/** صورة اللعبة المربعة (assets/games/thumbs) */
const gameThumb = (game) => (game ? localImage(path.join(ASSETS, 'games', 'thumbs', `${game}.jpg`)) : null);

/** تحميل مسبق للصور المحلية (PNG تُفك بشكل غير متزامن) — كل البطاقات تنتظره قبل الرسم */
async function preloadAll() {
  if (!C) return;
  const dirs = ['games', path.join('games', 'thumbs'), 'scenes', 'backgrounds', 'bosses'];
  const jobs = [];
  for (const d of dirs) {
    const dir = path.join(ASSETS, d);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!/\.(png|jpe?g)$/i.test(f)) continue;
      const file = path.join(dir, f);
      jobs.push(C.loadImage(fs.readFileSync(file)).then((img) => imgCache.set(file, img)).catch(() => {}));
    }
  }
  await Promise.all(jobs);
}
const READY = preloadAll();
const ready = () => READY;
/** يغلّف دوال البطاقات لتنتظر التحميل المسبق */
const withReady = (obj) => {
  const o = {};
  for (const [k, v] of Object.entries(obj)) o[k] = typeof v === 'function' ? async (...a) => { await READY; return v(...a); } : v;
  return o;
};

const remoteCache = new Map();
async function loadRemote(url) {
  if (!url || !C) return null;
  if (remoteCache.has(url)) return remoteCache.get(url);
  let img = null;
  try {
    img = await Promise.race([C.loadImage(url), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000))]);
  } catch { img = null; }
  if (remoteCache.size > 300) remoteCache.clear();
  if (img) remoteCache.set(url, img);
  return img;
}

// ===== الإيموجي الملوّن =====
const EMO_RE = /\p{RGI_Emoji}/gv;
const emoCache = new Map();
function emojiCode(e, keepFe0f = false) {
  let cps = [...e].map((c) => c.codePointAt(0).toString(16));
  if (!keepFe0f && !cps.includes('200d')) cps = cps.filter((c) => c !== 'fe0f');
  return cps.join('-');
}
function emojiImage(e) {
  if (emoCache.has(e)) return emoCache.get(e);
  let img = null;
  for (const code of [emojiCode(e), emojiCode(e, true), emojiCode(e).replace(/-fe0f/g, '')]) {
    img = localImage(path.join(ASSETS, 'emoji', `${code}.svg`));
    if (img) break;
  }
  emoCache.set(e, img);
  return img;
}
/** يرسم إيموجي ملوّن في مركز (cx, cy) */
function emoji(ctx, e, cx, cy, size, { glow, alpha = 1, rotate = 0 } = {}) {
  const img = emojiImage(String(e || '').trim());
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = size * 0.35; }
  ctx.translate(cx, cy);
  if (rotate) ctx.rotate(rotate);
  if (img) ctx.drawImage(img, -size / 2, -size / 2, size, size);
  else { ctx.font = font(size * 0.8); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText(String(e || '•'), 0, 2); }
  ctx.restore();
}

// ===== النصوص (عربي صحيح + إيموجي ملوّن) =====
const AR_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;
const LAT_RE = /[A-Za-z\u00C0-\u024F]/;
function baseDir(s) {
  const plain = s.replace(EMO_RE, ' ');
  for (const ch of plain) { if (AR_RE.test(ch)) return 'rtl'; if (LAT_RE.test(ch)) return 'ltr'; }
  return 'ltr';
}
/** يقسم النص إلى عناصر: نص / إيموجي. في RTL يُقسم بالكلمات لضمان الترتيب الصحيح */
function tokenize(s, dir) {
  const out = [];
  let last = 0;
  const pushText = (str) => {
    if (!str) return;
    if (dir === 'rtl') {
      const parts = str.split(/(\s+)/);
      for (let p of parts) {
        if (!p) continue;
        if (/^\s+$/.test(p)) { out.push({ k: 'sp' }); continue; }
        // علامات الترقيم في نهاية الكلمة العربية تظهر على يسارها
        if (AR_RE.test(p)) p = p.replace(/^(.*?)([!?.:,،؛؟…]+)$/u, '$2$1');
        out.push({ k: 't', s: p });
      }
    } else out.push({ k: 't', s: str });
  };
  for (const m of s.matchAll(EMO_RE)) {
    const img = emojiImage(m[0]);
    if (!img) continue;
    pushText(s.slice(last, m.index));
    out.push({ k: 'e', s: m[0], img });
    last = m.index + m[0].length;
  }
  pushText(s.slice(last));
  // دمج المسافات المتتالية وحذفها من الأطراف
  const cleaned = [];
  for (const t of out) { if (t.k === 'sp' && (!cleaned.length || cleaned[cleaned.length - 1].k === 'sp')) continue; cleaned.push(t); }
  while (cleaned.length && cleaned[cleaned.length - 1].k === 'sp') cleaned.pop();
  return cleaned;
}
function layout(ctx, s, size, weight) {
  const dir = baseDir(s);
  const items = tokenize(s, dir);
  ctx.font = font(size, weight);
  const sp = ctx.measureText(' ').width;
  let total = 0;
  for (const it of items) {
    it.w = it.k === 'e' ? size * 1.12 : it.k === 'sp' ? sp : ctx.measureText(it.s).width;
    total += it.w;
  }
  return { dir, items, total };
}
function measure(ctx, text, size = 24, weight = 'bold') {
  return layout(ctx, String(text ?? ''), size, weight).total;
}
function fit(ctx, text, maxW, size, weight = 'bold', min = 12) {
  let s = size;
  while (s > min && measure(ctx, text, s, weight) > maxW) s -= 1;
  ctx.font = font(s, weight);
  return s;
}
/**
 * يرسم نصاً (مع إيموجي ملوّن) — align: left | right | center ، base: alphabetic | middle | top
 * خيارات إضافية: shadow (ظل خفيف) ، glow (لون توهج) ، stroke (حد خارجي)
 */
function txt(ctx, text, x, y, { size = 24, weight = 'bold', color = INK.text, align = 'left', base = 'alphabetic', maxW, min = 12, shadow = false, glow = null, stroke = null, alpha = 1 } = {}) {
  const s = String(text ?? '');
  if (!s) return 0;
  let sz = size;
  let L = layout(ctx, s, sz, weight);
  if (maxW) while (sz > min && L.total > maxW) { sz -= 1; L = layout(ctx, s, sz, weight); }
  const total = L.total;
  let start = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  const emoCy = base === 'middle' ? y : base === 'top' ? y + sz * 0.62 : y - sz * 0.36;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = font(sz, weight);
  ctx.textBaseline = base; ctx.textAlign = 'left'; ctx.fillStyle = color;
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2; }
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = sz * 0.6; ctx.shadowOffsetY = 0; }
  const seq = L.dir === 'rtl' ? [...L.items].reverse() : L.items;
  let cx = start;
  for (const it of seq) {
    if (it.k === 't') {
      if (stroke) { ctx.lineWidth = stroke.width || 4; ctx.strokeStyle = stroke.color || 'rgba(0,0,0,0.6)'; ctx.lineJoin = 'round'; ctx.strokeText(it.s, cx, y); }
      ctx.fillText(it.s, cx, y);
    } else if (it.k === 'e') {
      const es = sz * 1.02;
      ctx.drawImage(it.img, cx + (it.w - es) / 2, emoCy - es / 2, es, es);
    }
    cx += it.w;
  }
  ctx.restore();
  return total;
}
/** يلف النص على عدة أسطر (يحافظ على اتجاه العربية) */
function wrap(ctx, text, maxW, size, weight = 'normal', maxLines = 3) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (measure(ctx, test, size, weight) > maxW && cur) { lines.push(cur); cur = w; if (lines.length >= maxLines) break; }
    else cur = test;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, '') + '…';
  return lines;
}

// ===== أشكال =====
function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function grad(ctx, x0, y0, x1, y1, t) {
  t = th(t);
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, t.a); g.addColorStop(1, t.b); return g;
}
function hexPath(ctx, cx, cy, r, rot = Math.PI / 6) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = rot + (i * Math.PI) / 3; const px = cx + r * Math.cos(a), py = cy + r * Math.sin(a); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.closePath();
}
function starPath(ctx, cx, cy, r, inner = 0.45, points = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) { const rad = i % 2 ? r * inner : r; const a = rot + (i * Math.PI) / points; i ? ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad) : ctx.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); }
  ctx.closePath();
}
function sparkle(ctx, x, y, r, color = '#fff', alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = r * 2;
  ctx.beginPath(); ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.quadraticCurveTo(x, y, x, y + r); ctx.quadraticCurveTo(x, y, x - r, y); ctx.quadraticCurveTo(x, y, x, y - r); ctx.fill(); ctx.restore();
}
function rng(seed) { let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

/** يرسم صورة بحيث تغطي المستطيل بالكامل (cover) */
function cover(ctx, img, x, y, w, h, { focusX = 0.5, focusY = 0.5 } = {}) {
  if (!img) return;
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  ctx.drawImage(img, x + (w - iw) * focusX, y + (h - ih) * focusY, iw, ih);
}

/** أشعة متوهجة خلف عنصر */
function rays(ctx, cx, cy, r, t, count = 18, alpha = 0.18) {
  t = th(t);
  ctx.save(); ctx.translate(cx, cy); ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    ctx.rotate((Math.PI * 2) / count);
    const g = ctx.createLinearGradient(0, 0, r, 0); g.addColorStop(0, t.a); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r, -r * 0.07); ctx.lineTo(r, r * 0.07); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
/** قصاصات احتفالية */
function confetti(ctx, W, H, n = 60, colors = ['#ffd76a', '#ff6b7f', '#6fd3ff', '#4cf0b0', '#c3a8ff'], seed = 7) {
  const r = rng(seed * 997 + W);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, w = 6 + r() * 8, h = 3 + r() * 5;
    ctx.save(); ctx.translate(x, y); ctx.rotate(r() * Math.PI); ctx.globalAlpha = 0.35 + r() * 0.5;
    ctx.fillStyle = colors[Math.floor(r() * colors.length)]; ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
  }
  ctx.restore();
}

/** المظهر الموحّد: توهجات + جزيئات + لمعة + حواف داكنة */
function effects(ctx, W, H, t, seed = 1) {
  const r = rng(W * 31 + H * 17 + seed);
  // جزيئات / نجوم
  const n = Math.round((W * H) / 7000);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, rad = r() * 1.5 + 0.3;
    ctx.fillStyle = `rgba(255,255,255,${(0.12 + r() * 0.4).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
  }
  // بوكيه بلون البطاقة
  for (let i = 0; i < 7; i++) {
    const x = r() * W, y = r() * H, rad = 18 + r() * 46;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, t.glow); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.35 + r() * 0.3; ctx.fillStyle = g; ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2); ctx.globalAlpha = 1;
  }
  for (let i = 0; i < 5; i++) sparkle(ctx, r() * W, r() * H, 3 + r() * 5, t.a, 0.55 + r() * 0.4);
}

/**
 * الخلفية الأساسية لكل البطاقات
 * @param {object} o  fx: مؤثرات ، bg: اسم صورة خلفية ، dim: قوة التعتيم ، pattern: hex|lines|none
 */
function base(W, H, theme = 'gold', { fx = true, bg = null, dim = 0.62, pattern = 'hex', seed = 1, focusY = 0.5 } = {}) {
  const t = th(theme);
  const canvas = C.createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const R = 28;
  ctx.save();
  rr(ctx, 0, 0, W, H, R); ctx.clip();
  // طبقة اللون العميق
  const bgG = ctx.createLinearGradient(0, 0, W, H);
  bgG.addColorStop(0, t.deep || INK.bg2); bgG.addColorStop(0.55, INK.bg2); bgG.addColorStop(1, INK.bg);
  ctx.fillStyle = bgG; ctx.fillRect(0, 0, W, H);
  // صورة الخلفية
  const img = typeof bg === 'string' ? scene(bg) : bg;
  if (img) {
    ctx.save(); ctx.globalAlpha = 1; cover(ctx, img, 0, 0, W, H, { focusY }); ctx.restore();
    const ov = ctx.createLinearGradient(0, 0, 0, H);
    ov.addColorStop(0, `rgba(5,6,10,${Math.min(0.95, dim * 0.85)})`); ov.addColorStop(0.5, `rgba(5,6,10,${dim})`); ov.addColorStop(1, `rgba(5,6,10,${Math.min(0.97, dim + 0.22)})`);
    ctx.fillStyle = ov; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = t.b; ctx.globalAlpha = 0.25; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // توهجات "أورورا"
  const orb = (x, y, rad, col, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; };
  orb(W * 0.88, -H * 0.15, Math.max(W, H) * 0.75, t.glow, 1);
  orb(W * 0.05, H * 1.1, Math.max(W, H) * 0.6, t.glow, 0.7);
  // نقش
  if (pattern === 'hex') {
    ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.028)'; ctx.lineWidth = 1;
    const s = 26, hh = s * Math.sqrt(3);
    for (let y = 0, row = 0; y < H + hh; y += hh / 2, row++) for (let x = (row % 2) * s * 1.5; x < W + s * 3; x += s * 3) { hexPath(ctx, x, y, s, 0); ctx.stroke(); }
    ctx.restore();
  } else if (pattern === 'lines') {
    ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 1;
    for (let i = -H; i < W; i += 22) { ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke(); }
  }
  // لمعة قطرية
  ctx.save(); ctx.translate(W * 0.62, 0); ctx.rotate(0.42);
  const sh = ctx.createLinearGradient(-90, 0, 90, 0); sh.addColorStop(0, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,0.045)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(-90, -H, 180, H * 3); ctx.restore();
  if (fx) effects(ctx, W, H, t, seed);
  // حواف داكنة
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  // شريط علوي متوهج
  ctx.save(); ctx.shadowColor = t.a; ctx.shadowBlur = 18; ctx.fillStyle = grad(ctx, 0, 0, W, 0, t); ctx.fillRect(W * 0.08, 0, W * 0.84, 4); ctx.restore();
  ctx.restore();
  // إطار متدرج مزدوج
  ctx.save();
  const fg = ctx.createLinearGradient(0, 0, W, H);
  fg.addColorStop(0, t.a); fg.addColorStop(0.35, 'rgba(255,255,255,0.10)'); fg.addColorStop(0.65, 'rgba(255,255,255,0.06)'); fg.addColorStop(1, t.b);
  ctx.strokeStyle = fg; ctx.lineWidth = 2.5; rr(ctx, 1.5, 1.5, W - 3, H - 3, R); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1; rr(ctx, 9, 9, W - 18, H - 18, R - 7); ctx.stroke();
  // زوايا مزخرفة
  ctx.strokeStyle = t.a; ctx.lineWidth = 2.5; ctx.shadowColor = t.glow; ctx.shadowBlur = 10; ctx.lineCap = 'round';
  const L = 26, o = 16;
  [[o, o, 1, 1], [W - o, o, -1, 1], [o, H - o, 1, -1], [W - o, H - o, -1, -1]].forEach(([x, y, dx, dy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + dy * L); ctx.lineTo(x, y + dy * 6); ctx.quadraticCurveTo(x, y, x + dx * 6, y); ctx.lineTo(x + dx * L, y); ctx.stroke();
  });
  ctx.restore();
  return { canvas, ctx, t };
}

/** لوحة زجاجية */
function panel(ctx, x, y, w, h, r = 18, fill = null, { stroke = INK.line, glow = null } = {}) {
  ctx.save();
  if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 24; }
  rr(ctx, x, y, w, h, r);
  if (fill) ctx.fillStyle = fill;
  else { const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, 'rgba(255,255,255,0.085)'); g.addColorStop(1, 'rgba(255,255,255,0.025)'); ctx.fillStyle = g; }
  ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke();
  // خط لمعة علوي
  ctx.beginPath(); ctx.moveTo(x + r, y + 1.5); ctx.lineTo(x + w - r, y + 1.5);
  const hl = ctx.createLinearGradient(x, 0, x + w, 0); hl.addColorStop(0, 'rgba(255,255,255,0)'); hl.addColorStop(0.5, 'rgba(255,255,255,0.22)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.strokeStyle = hl; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}
/** شارة نصية — ترجع العرض */
function pill(ctx, text, x, y, t, { h = 36, size = 18, solid = true, align = 'left', color, icon } = {}) {
  t = th(t);
  const label = icon ? `${icon} ${text}` : String(text ?? '');
  const w = measure(ctx, label, size) + h * 0.95;
  const px = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  ctx.save();
  rr(ctx, px, y, w, h, h / 2);
  if (solid) {
    ctx.shadowColor = t.glow; ctx.shadowBlur = 14; ctx.fillStyle = grad(ctx, px, 0, px + w, 0, t); ctx.fill(); ctx.shadowBlur = 0;
    const gl = ctx.createLinearGradient(0, y, 0, y + h); gl.addColorStop(0, 'rgba(255,255,255,0.35)'); gl.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; rr(ctx, px + 2, y + 2, w - 4, h / 2, h / 2 - 2); ctx.fill();
  } else { ctx.fillStyle = 'rgba(10,12,18,0.55)'; ctx.fill(); ctx.strokeStyle = t.a; ctx.lineWidth = 1.5; rr(ctx, px, y, w, h, h / 2); ctx.stroke(); }
  ctx.restore();
  txt(ctx, label, px + w / 2, y + h / 2 + 1, { size, align: 'center', base: 'middle', color: color || (solid ? INK.dark : t.a) });
  return w;
}
/** شريط تقدم لامع */
function bar(ctx, x, y, w, h, ratio, t, { ticks = false, track = 'rgba(255,255,255,0.08)' } = {}) {
  t = th(t);
  const rt = Math.max(0, Math.min(1, Number(ratio) || 0));
  ctx.save();
  rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = track; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1; ctx.stroke();
  if (rt > 0) {
    const fw = Math.max(h, w * rt);
    ctx.shadowColor = t.glow; ctx.shadowBlur = 16;
    ctx.fillStyle = grad(ctx, x, 0, x + fw, 0, t); rr(ctx, x, y, fw, h, h / 2); ctx.fill(); ctx.shadowBlur = 0;
    const gl = ctx.createLinearGradient(0, y, 0, y + h); gl.addColorStop(0, 'rgba(255,255,255,0.45)'); gl.addColorStop(0.55, 'rgba(255,255,255,0)');
    ctx.fillStyle = gl; rr(ctx, x + 2, y + 1.5, fw - 4, h * 0.5, h / 3); ctx.fill();
    // نقطة متوهجة في النهاية
    ctx.fillStyle = '#fff'; ctx.shadowColor = t.a; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(x + fw - h / 2, y + h / 2, h * 0.22, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  if (ticks) { ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; for (let i = 1; i < 10; i++) { const tx = x + (w * i) / 10; ctx.beginPath(); ctx.moveTo(tx, y + 3); ctx.lineTo(tx, y + h - 3); ctx.stroke(); } ctx.restore(); }
}
/** شريط صحة بثلاثة ألوان حسب النسبة */
function hpBar(ctx, x, y, w, h, ratio, opts = {}) {
  const t = ratio > 0.5 ? THEMES.emerald : ratio > 0.25 ? THEMES.gold : THEMES.crimson;
  bar(ctx, x, y, w, h, ratio, t, { ticks: true, ...opts });
}
/** حلقة تقدم دائرية */
function ring(ctx, cx, cy, r, lw, ratio, t, { track = 'rgba(255,255,255,0.10)', start = -Math.PI / 2 } = {}) {
  t = th(t);
  const rt = Math.max(0, Math.min(1, Number(ratio) || 0));
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = lw;
  ctx.strokeStyle = track; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  if (rt > 0) {
    let stroke;
    try { stroke = ctx.createConicGradient(start, cx, cy); stroke.addColorStop(0, t.b); stroke.addColorStop(Math.max(0.01, rt), t.a); stroke.addColorStop(1, t.b); }
    catch { stroke = grad(ctx, cx - r, cy, cx + r, cy, t); }
    ctx.strokeStyle = stroke; ctx.shadowColor = t.glow; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(cx, cy, r, start, start + Math.PI * 2 * rt); ctx.stroke();
  }
  ctx.restore();
}
/** صورة رمزية دائرية بحلقة متدرجة + توهج */
async function avatar(ctx, url, x, y, size, t, name = '?', { shape = 'circle', ring: withRing = true } = {}) {
  t = th(t);
  const cx = x + size / 2, cy = y + size / 2;
  ctx.save();
  ctx.shadowColor = t.glow; ctx.shadowBlur = 30;
  if (withRing) {
    let rg; try { rg = ctx.createConicGradient(0, cx, cy); rg.addColorStop(0, t.a); rg.addColorStop(0.5, t.b); rg.addColorStop(1, t.a); } catch { rg = grad(ctx, x, y, x + size, y + size, t); }
    ctx.fillStyle = rg;
    if (shape === 'circle') { ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 6, 0, Math.PI * 2); ctx.fill(); }
    else { rr(ctx, x - 6, y - 6, size + 12, size + 12, size * 0.3); ctx.fill(); }
  }
  ctx.restore();
  ctx.save();
  ctx.fillStyle = '#0b0d13';
  if (shape === 'circle') { ctx.beginPath(); ctx.arc(cx, cy, size / 2 + 1.5, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(cx, cy, size / 2 - 1, 0, Math.PI * 2); }
  else { rr(ctx, x - 1.5, y - 1.5, size + 3, size + 3, size * 0.28); ctx.fill(); rr(ctx, x, y, size, size, size * 0.27); }
  ctx.clip();
  const img = url ? await loadRemote(url) : null;
  if (img) ctx.drawImage(img, x, y, size, size);
  else {
    const g = ctx.createLinearGradient(x, y, x + size, y + size); g.addColorStop(0, '#1d2230'); g.addColorStop(1, '#0d1018');
    ctx.fillStyle = g; ctx.fillRect(x, y, size, size);
    txt(ctx, String(name || '?').trim().charAt(0).toUpperCase() || '?', cx, cy + 2, { size: size * 0.45, color: t.a, align: 'center', base: 'middle' });
  }
  ctx.restore();
}
/** مربع إحصائية مع أيقونة اختيارية */
function stat(ctx, x, y, w, h, label, value, t, icon = null) {
  t = th(t);
  panel(ctx, x, y, w, h, 16);
  ctx.save(); ctx.fillStyle = grad(ctx, x, y, x, y + h, t); ctx.shadowColor = t.glow; ctx.shadowBlur = 10; rr(ctx, x + w - 5, y + 14, 3.5, h - 28, 2); ctx.fill(); ctx.restore();
  let tx = x + w - 20;
  if (icon) {
    const s = Math.min(h - 26, 46);
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.06)'; rr(ctx, tx - s - 6, y + (h - s - 12) / 2, s + 12, s + 12, 12); ctx.fill(); ctx.restore();
    emoji(ctx, icon, tx - s / 2, y + h / 2, s * 0.78);
    tx -= s + 22;
  }
  const avail = tx - x - 16;
  txt(ctx, label, tx, y + h * 0.38, { size: Math.min(16, h * 0.2), weight: 'normal', color: INK.sub, align: 'right', maxW: avail });
  txt(ctx, value, tx, y + h * 0.78, { size: Math.min(30, h * 0.34), align: 'right', maxW: avail });
}
/** مربع أيقونة متوهج */
function iconTile(ctx, e, cx, cy, size, t, { solid = false } = {}) {
  t = th(t);
  ctx.save(); ctx.shadowColor = t.glow; ctx.shadowBlur = 20;
  rr(ctx, cx - size / 2, cy - size / 2, size, size, size * 0.28);
  ctx.fillStyle = solid ? grad(ctx, cx - size / 2, cy - size / 2, cx + size / 2, cy + size / 2, t) : 'rgba(255,255,255,0.07)'; ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = solid ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
  emoji(ctx, e, cx, cy, size * 0.62);
}
/** مربع صورة لعبة بإطار متدرج (يرجع لـ iconTile لو الصورة غير موجودة) */
function artTile(ctx, game, cx, cy, size, t, fallbackEmoji = '🎮') {
  t = th(t);
  const img = gameThumb(game);
  if (!img) return iconTile(ctx, fallbackEmoji, cx, cy, size, t);
  const x = cx - size / 2, y = cy - size / 2, r = size * 0.26;
  ctx.save(); ctx.shadowColor = t.glow; ctx.shadowBlur = 18;
  rr(ctx, x - 2.5, y - 2.5, size + 5, size + 5, r + 2); ctx.fillStyle = grad(ctx, x, y, x + size, y + size, t); ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, x, y, size, size, r); ctx.clip(); cover(ctx, img, x, y, size, size);
  const sh = ctx.createLinearGradient(x, y, x, y + size); sh.addColorStop(0, 'rgba(255,255,255,0.10)'); sh.addColorStop(0.5, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = sh; ctx.fillRect(x, y, size, size); ctx.restore();
}
/** شارة سداسية برقم */
function hexBadge(ctx, cx, cy, r, t, text, { size } = {}) {
  t = th(t);
  ctx.save(); ctx.shadowColor = t.glow; ctx.shadowBlur = 30;
  hexPath(ctx, cx, cy, r); ctx.fillStyle = grad(ctx, cx - r, cy - r, cx + r, cy + r, t); ctx.fill();
  ctx.shadowBlur = 0; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.stroke();
  hexPath(ctx, cx, cy, r * 0.82); ctx.fillStyle = 'rgba(10,10,16,0.88)'; ctx.fill(); ctx.strokeStyle = t.a; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  txt(ctx, text, cx, cy + 3, { size: size || r * 0.78, align: 'center', base: 'middle', color: t.a, glow: t.glow, maxW: r * 1.5 });
}
/** شريط عنوان (ربن) */
function ribbon(ctx, text, cx, y, t, { size = 22, h = 44, icon } = {}) {
  t = th(t);
  const label = icon ? `${icon} ${text}` : text;
  const w = measure(ctx, label, size) + 80;
  const x = cx - w / 2;
  ctx.save(); ctx.shadowColor = t.glow; ctx.shadowBlur = 22; ctx.fillStyle = grad(ctx, x, 0, x + w, 0, t);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 18, y + h / 2); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x + 18, y + h / 2); ctx.closePath(); ctx.fill(); ctx.restore();
  txt(ctx, label, cx, y + h / 2 + 1, { size, align: 'center', base: 'middle', color: INK.dark });
  return w;
}
/** عنوان رئيسي بخط كبير متوهج */
function title(ctx, text, x, y, t, { size = 40, align = 'right', maxW, color = INK.text } = {}) {
  t = th(t);
  return txt(ctx, text, x, y, { size, align, maxW, color, shadow: true });
}
function footer(ctx, W, H, text) {
  ctx.save(); const g = ctx.createLinearGradient(W * 0.3, 0, W * 0.7, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(W * 0.3, H - 38, W * 0.4, 1); ctx.restore();
  txt(ctx, text, W / 2, H - 16, { size: 13, weight: 'normal', color: 'rgba(255,255,255,0.45)', align: 'center', maxW: W - 120 });
}
const out = async (canvas, name) => ({ buffer: await canvas.encode('png'), name });

// ================= البطاقات =================

/** بطاقة الملف الشخصي / الرتبة */
async function profileCard({ username, level = 0, xp = 0, nextXP = 1, balance = 0, avatarURL, stats = {}, rpgClass, rank, totalUsers, prestige = 0, totalXP, title: subtitle, hunterRank, nextReward, badges = [], theme = 'violet' }) {
  if (!C) return null;
  const W = 1000, H = 580;
  const { canvas, ctx, t } = base(W, H, theme, { bg: 'rank', dim: 0.58 });
  const ratio = xp / Math.max(1, nextXP);
  // الصورة + حلقة التقدم
  const AS = 160, ax = W - 78 - AS, ay = 46;
  ring(ctx, ax + AS / 2, ay + AS / 2, AS / 2 + 18, 9, ratio, t);
  await avatar(ctx, avatarURL, ax, ay, AS, t, username);
  hexBadge(ctx, ax + AS / 2, ay + AS + 10, 30, t, String(level), { size: level >= 100 ? 20 : 26 });
  // الاسم والعنوان
  const nx = ax - 40;
  title(ctx, username || 'Player', nx, 98, t, { size: 46, maxW: 520 });
  txt(ctx, subtitle || (hunterRank ? `صائد رتبة ${hunterRank}` : 'عضو مميز'), nx, 132, { size: 18, weight: 'normal', color: t.a, align: 'right', maxW: 520 });
  let px = nx;
  px -= pill(ctx, `المستوى ${level}`, px, 154, t, { align: 'right', icon: '⭐' }) + 10;
  if (rank) px -= pill(ctx, `#${rank}${totalUsers ? ` من ${totalUsers}` : ''}`, px, 154, t, { solid: false, align: 'right', icon: '🏆' }) + 10;
  if (prestige) px -= pill(ctx, `بريستيج ${prestige}`, px, 154, THEMES.gold, { solid: false, align: 'right', icon: '👑' }) + 10;
  if (rpgClass && px > 300) pill(ctx, rpgClass, px, 154, t, { solid: false, align: 'right', icon: '⚔️' });
  // شريط الخبرة
  const pH = nextReward ? 108 : 92;
  panel(ctx, 50, 254, W - 100, pH, 20);
  txt(ctx, `الخبرة نحو المستوى ${level + 1}`, W - 76, 286, { size: 16, weight: 'normal', color: INK.sub, align: 'right' });
  txt(ctx, `${Math.floor(ratio * 100)}%`, 76, 288, { size: 22, color: t.a, glow: t.glow });
  txt(ctx, `${compact(xp)} / ${compact(nextXP)} XP`, 140, 287, { size: 15, weight: 'normal', color: INK.text });
  bar(ctx, 76, 302, W - 152, 22, ratio, t, { ticks: true });
  if (nextReward) txt(ctx, `🎁 مكافأة المستوى القادم: ${nextReward}`, W - 76, 348, { size: 14, weight: 'normal', color: INK.sub, align: 'right', maxW: W - 160 });
  // الإحصائيات
  const items = [
    ['الرصيد', compact(balance), '💎'], ['الرسائل', compact(stats.messages_count), '💬'], ['الخبرة الكلية', compact(totalXP ?? xp), '✨'],
    ['انتصارات الدانجن', compact(stats.dungeon_wins ?? stats.dungeon_runs ?? stats.dungeon_count), '⚔️'], ['حصاد المزرعة', compact(stats.farm_count ?? stats.harvests), '🌾'], ['الألعاب', compact(stats.games_played ?? ((stats.slots_count || 0) + (stats.bj_count || 0) + (stats.roulette_count || 0) + (stats.coinflip_count || 0) + (stats.rps_count || 0))), '🎮'],
  ];
  const cw = (W - 100 - 40) / 3;
  items.forEach(([l, v, ic], i) => stat(ctx, 50 + (2 - (i % 3)) * (cw + 20), 254 + pH + 16 + Math.floor(i / 3) * 88, cw, 76, l, v, t, ic));
  if (badges.length) badges.slice(0, 8).forEach((b, i) => emoji(ctx, b, 70 + i * 40, 120, 30));
  return out(canvas, 'profile.png');
}

/** بطاقة الرصيد — تصميم بطاقة بنكية فاخرة */
async function balanceCard({ username, balance = 0, bank = 0, level, currency = 'جوهرة', avatarURL, rank, totalUsers }) {
  if (!C) return null;
  const W = 1000, H = 440;
  const { canvas, ctx, t } = base(W, H, 'gold', { bg: 'wealth', dim: 0.5 });
  await avatar(ctx, avatarURL, W - 196, 48, 140, t, username);
  txt(ctx, 'المحفظة الملكية', W - 236, 82, { size: 18, weight: 'normal', color: t.a, align: 'right' });
  title(ctx, username || 'Player', W - 236, 130, t, { size: 40, maxW: 420 });
  if (level) pill(ctx, `المستوى ${level}`, W - 236, 148, t, { align: 'right', solid: false, icon: '⭐', h: 32, size: 15 });
  // البطاقة البنكية
  const cx = 50, cy = 46, cw = 400, ch = 230;
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
  rr(ctx, cx, cy, cw, ch, 22);
  const cg = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch); cg.addColorStop(0, '#3a2a08'); cg.addColorStop(0.45, '#8a6414'); cg.addColorStop(1, '#2a1c05');
  ctx.fillStyle = cg; ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, cx, cy, cw, ch, 22); ctx.clip();
  const sh = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch); sh.addColorStop(0.3, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,240,200,0.22)'); sh.addColorStop(0.7, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(cx, cy, cw, ch);
  ctx.strokeStyle = 'rgba(255,230,160,0.12)'; ctx.lineWidth = 1;
  for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.arc(cx + cw + 30, cy - 20, 60 + i * 26, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(255,220,140,0.55)'; ctx.lineWidth = 1.5; rr(ctx, cx, cy, cw, ch, 22); ctx.stroke(); ctx.restore();
  // شريحة
  ctx.save(); const chip = ctx.createLinearGradient(cx + 30, cy + 40, cx + 90, cy + 85); chip.addColorStop(0, '#f8e3a1'); chip.addColorStop(1, '#b8892e');
  ctx.fillStyle = chip; rr(ctx, cx + 30, cy + 38, 58, 44, 9); ctx.fill(); ctx.strokeStyle = 'rgba(90,60,10,0.6)'; ctx.lineWidth = 1.2;
  for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx + 30, cy + 38 + i * 14.6); ctx.lineTo(cx + 88, cy + 38 + i * 14.6); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(cx + 59, cy + 38); ctx.lineTo(cx + 59, cy + 82); ctx.stroke(); ctx.restore();
  emoji(ctx, '💎', cx + cw - 50, cy + 58, 44, { glow: 'rgba(120,220,255,0.7)' });
  txt(ctx, 'إجمالي الثروة', cx + 30, cy + 130, { size: 15, weight: 'normal', color: 'rgba(255,240,210,0.8)' });
  txt(ctx, compact(balance + bank), cx + 30, cy + 184, { size: 58, color: '#fff3d0', glow: 'rgba(255,210,120,0.6)' });
  txt(ctx, currency, cx + cw - 30, cy + ch - 22, { size: 15, color: 'rgba(255,240,210,0.85)', align: 'right' });
  txt(ctx, (username || '').toUpperCase().slice(0, 18), cx + 30, cy + ch - 22, { size: 13, weight: 'normal', color: 'rgba(255,240,210,0.7)', maxW: 220 });
  // إحصائيات
  const sw = (W - 100 - 40) / 3, sy = 312;
  stat(ctx, 50 + 2 * (sw + 20), sy, sw, 92, 'في اليد', compact(balance), t, '👛');
  stat(ctx, 50 + (sw + 20), sy, sw, 92, 'في البنك', compact(bank), t, '🏦');
  stat(ctx, 50, sy, sw, 92, rank ? 'ترتيب الثروة' : 'المستوى', rank ? `#${rank}${totalUsers ? ' / ' + totalUsers : ''}` : String(level ?? 0), t, rank ? '🏆' : '⭐');
  return out(canvas, 'balance.png');
}

/** بطاقة المتصدرين — منصة لأفضل 3 + قائمة */
async function leaderboardCard({ title: ttl = 'المتصدرون', entries = [], guildName = '', theme = 'gold', icon = '🏆' }) {
  if (!C) return null;
  const W = 1000, rowH = 70;
  const top = entries.slice(0, 3), rest = entries.slice(3);
  const POD = 390;
  const H = 150 + (top.length ? POD : 0) + rest.length * rowH + 40;
  const { canvas, ctx, t } = base(W, H, theme, { bg: 'rank', dim: 0.7 });
  emoji(ctx, icon, W / 2, 56, 50, { glow: t.glow });
  txt(ctx, ttl, W / 2, 118, { size: 36, align: 'center', maxW: W - 120, shadow: true });
  if (guildName) txt(ctx, guildName, W / 2, 146, { size: 16, weight: 'normal', color: INK.sub, align: 'center' });
  const medals = [THEMES.gold, THEMES.slate, { a: '#f0b27a', b: '#a8582a', glow: 'rgba(233,160,107,.35)', deep: '#1a0d05' }];
  const crowns = ['👑', '🥈', '🥉'];
  // المنصة
  const slots = [{ i: 1, x: W / 2 - 260, h: 120, s: 104 }, { i: 0, x: W / 2, h: 160, s: 128 }, { i: 2, x: W / 2 + 260, h: 96, s: 96 }];
  for (const sl of slots) {
    const e = top[sl.i]; if (!e) continue;
    const mt = medals[sl.i];
    const baseY = 150 + POD;
    // العمود
    ctx.save(); const pg = ctx.createLinearGradient(0, baseY - sl.h, 0, baseY); pg.addColorStop(0, mt.glow.replace(/[\d.]+\)$/, '0.55)')); pg.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = pg; rr(ctx, sl.x - 105, baseY - sl.h, 210, sl.h, 14); ctx.fill(); ctx.strokeStyle = mt.a; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
    txt(ctx, String(sl.i + 1), sl.x, baseY - sl.h / 2 + 18, { size: 54, align: 'center', base: 'middle', color: mt.a, glow: mt.glow, alpha: 0.85 });
    const ay = baseY - sl.h - sl.s - 64;
    if (sl.i === 0) rays(ctx, sl.x, ay + sl.s / 2, 150, mt, 16, 0.16);
    await avatar(ctx, e.avatarURL, sl.x - sl.s / 2, ay, sl.s, mt, e.name);
    emoji(ctx, crowns[sl.i], sl.x + sl.s / 2 - 8, ay + 6, sl.i === 0 ? 46 : 36, { rotate: 0.35 });
    txt(ctx, e.name || '—', sl.x, ay + sl.s + 32, { size: 20, align: 'center', maxW: 200, shadow: true });
    txt(ctx, String(e.value ?? ''), sl.x, ay + sl.s + 56, { size: 16, align: 'center', color: mt.a, maxW: 200 });
  }
  // البقية
  for (let k = 0; k < rest.length; k++) {
    const e = rest[k]; const y = 150 + (top.length ? POD : 0) + 14 + k * rowH;
    panel(ctx, 50, y, W - 100, rowH - 12, 16);
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.08)'; rr(ctx, W - 116, y + 9, 46, 40, 12); ctx.fill(); ctx.restore();
    txt(ctx, String(k + 4), W - 93, y + 30, { size: 20, align: 'center', base: 'middle' });
    await avatar(ctx, e.avatarURL, W - 176, y + 8, 42, t, e.name);
    txt(ctx, e.name || '—', W - 196, y + (e.subtitle ? 26 : 36), { size: 20, align: 'right', maxW: 420 });
    if (e.subtitle) txt(ctx, e.subtitle, W - 196, y + 48, { size: 13, weight: 'normal', color: INK.sub, align: 'right', maxW: 420 });
    txt(ctx, String(e.value ?? ''), 76, y + 37, { size: 20, color: t.a, maxW: 280 });
  }
  return out(canvas, 'leaderboard.png');
}

/** بطاقة رفع المستوى — احتفالية أنيقة بألوان هادئة (v22) */
async function levelUpCard({ username, level = 1, oldLevel, avatarURL, xp = 0, nextXP = 0, reward, role, rankTitle }) {
  if (!C) return null;
  const W = 1000, H = 400;
  const champagne = { a: '#f0d9a8', b: '#c9a05e', glow: 'rgba(240,217,168,0.30)', deep: '#12100a' };
  const { canvas, ctx, t } = base(W, H, champagne, { bg: 'levelup', dim: 0.8, seed: level, pattern: 'lines' });
  confetti(ctx, W, H, 26, ['#f0d9a8', '#ffffff', '#d9b98c', '#c3a8ff'], level);

  // الشارة السداسية الكبيرة في المنتصف
  const bx = 500, by = 165;
  rays(ctx, bx, by, 200, t, 20, 0.10);
  hexBadge(ctx, bx, by, 96, t, String(level), { size: level >= 100 ? 62 : 80 });
  txt(ctx, 'LEVEL', bx, by - 78, { size: 15, align: 'center', color: t.a, alpha: 0.85 });
  const from = oldLevel ?? level - 1;
  txt(ctx, `من المستوى ${from} إلى ${level}`, bx, by + 118, { size: 17, weight: 'normal', align: 'center', color: '#e8e4d8', alpha: 0.9 });

  // الجهة اليمنى: الصورة والتهنئة
  await avatar(ctx, avatarURL, W - 210, 66, 130, t, username);
  ribbon(ctx, 'مستوى جديد', W - 145, 214, t, { size: 16, h: 34, icon: '🎉' });
  const nx = W - 250;
  txt(ctx, 'تهانينا', nx, 96, { size: 16, weight: 'normal', color: t.a, align: 'right' });
  title(ctx, username || 'Player', nx, 138, t, { size: 38, maxW: 360 });
  let py = 258, px = nx;
  if (reward) { px -= pill(ctx, reward, px, py, t, { align: 'right', icon: '🎁', h: 34, size: 15 }) + 10; }
  if (role) pill(ctx, role, px, py, THEMES.violet, { align: 'right', solid: false, icon: '🏅', h: 34, size: 15 });
  if (rankTitle) txt(ctx, rankTitle, nx, 238, { size: 14, weight: 'normal', color: INK.sub, align: 'right' });

  // الجهة اليسرى: رسالة تحفيزية هادئة
  panel(ctx, 60, 100, 210, 170, 20);
  emoji(ctx, '✨', 165, 148, 40, { glow: t.glow });
  txt(ctx, 'استمر بالتفاعل', 165, 196, { size: 19, align: 'center', color: '#f6f7fb' });
  txt(ctx, `كل رسالة تقرّبك\nمن المستوى ${level + 1}`, 165, 224, { size: 14, weight: 'normal', color: INK.sub, align: 'center', maxW: 180 });

  // التقدم للمستوى التالي
  panel(ctx, 350, 318, W - 400, 56, 16);
  txt(ctx, `التقدم نحو المستوى ${level + 1}`, W - 74, 338, { size: 13, weight: 'normal', color: INK.sub, align: 'right' });
  if (nextXP) txt(ctx, `${compact(xp)} / ${compact(nextXP)} XP`, 374, 338, { size: 13, color: INK.text });
  bar(ctx, 374, 350, W - 448, 12, nextXP ? Math.min(1, xp / nextXP) : 0.02, t);
  return out(canvas, 'levelup.png');
}

/** بطاقة لوحة الألوان (أمر الألوان) */
async function colorsCard({ colors = [], current = null, guildName = '' }) {
  if (!C) return null;
  const cols = 5, cell = 172, gap = 18, W = 60 + cols * cell + (cols - 1) * gap + 40;
  const rows = Math.ceil(colors.length / cols);
  const H = 150 + rows * (cell * 0.78 + gap) + 50;
  const { canvas, ctx, t } = base(W, H, 'azure');
  emoji(ctx, '🎨', W - 76, 74, 46);
  title(ctx, 'لوحة الألوان', W - 112, 88, t, { size: 40 });
  txt(ctx, guildName ? `${guildName} · اختر رقم لونك` : 'اختر رقم لونك', W - 112, 120, { size: 17, weight: 'normal', color: INK.sub, align: 'right' });
  colors.forEach((c, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = W - 50 - (col + 1) * cell - col * gap, y = 150 + row * (cell * 0.78 + gap), h = cell * 0.78;
    const sel = current && current.toLowerCase() === String(c.hex).toLowerCase();
    panel(ctx, x, y, cell, h, 18, null, { glow: sel ? c.hex : null, stroke: sel ? c.hex : INK.line });
    ctx.save(); ctx.shadowColor = c.hex; ctx.shadowBlur = sel ? 30 : 14;
    const sw = ctx.createLinearGradient(x, y, x + cell, y + h); sw.addColorStop(0, c.hex); sw.addColorStop(1, c.hex + 'aa');
    ctx.fillStyle = sw; rr(ctx, x + 12, y + 12, cell - 24, h * 0.52, 12); ctx.fill(); ctx.restore();
    if (sel) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; rr(ctx, x + 12, y + 12, cell - 24, h * 0.52, 12); ctx.stroke(); ctx.restore(); emoji(ctx, '✅', x + cell - 32, y + 32, 26); }
    ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.55)'; rr(ctx, x + 20, y + 20, 38, 28, 9); ctx.fill(); ctx.restore();
    txt(ctx, String(i + 1), x + 39, y + 35, { size: 16, align: 'center', base: 'middle' });
    txt(ctx, c.name, x + cell - 16, y + h - 32, { size: 19, align: 'right', maxW: cell - 30 });
    txt(ctx, String(c.hex).toUpperCase(), x + 16, y + h - 14, { size: 12, weight: 'normal', color: INK.sub });
  });
  footer(ctx, W, H, 'اكتب: الوان <الرقم> · أو اضغط زر اللون');
  return out(canvas, 'colors.png');
}

/** بطاقة نتيجة لعبة عامة */
async function gameResultCard({ game = 'لعبة', outcome = 'win', title: ttl, subtitle, username, avatarURL, amount, balance, details = [], icon, bg = 'casino' }) {
  if (!C) return null;
  const theme = outcome === 'win' ? 'emerald' : outcome === 'lose' ? 'crimson' : outcome === 'jackpot' ? 'gold' : 'slate';
  const W = 1000, H = details.length ? 400 : 320;
  const { canvas, ctx, t } = base(W, H, theme, { bg, dim: 0.62 });
  if (outcome === 'win' || outcome === 'jackpot') confetti(ctx, W, H, 40);
  await avatar(ctx, avatarURL, W - 178, 52, 120, t, username);
  txt(ctx, game, W - 216, 82, { size: 18, weight: 'normal', color: INK.sub, align: 'right' });
  title(ctx, ttl || (outcome === 'win' ? 'فوز' : outcome === 'lose' ? 'خسارة' : 'تعادل'), W - 216, 138, t, { size: 50, color: t.a, maxW: 460 });
  if (subtitle) txt(ctx, subtitle, W - 216, 174, { size: 19, weight: 'normal', color: INK.text, align: 'right', maxW: 460 });
  // الأيقونة + المبلغ
  const ic = icon || (outcome === 'win' ? '🏆' : outcome === 'lose' ? '💸' : outcome === 'jackpot' ? '💰' : '🤝');
  rays(ctx, 110, 120, 120, t, 14, 0.18);
  emoji(ctx, ic, 110, 120, 96, { glow: t.glow });
  if (amount !== undefined && amount !== null) {
    const sign = amount > 0 ? '+' : amount < 0 ? '−' : '';
    txt(ctx, `${sign}${compact(Math.abs(amount))}`, 196, 128, { size: 56, color: t.a, glow: t.glow });
    if (balance !== undefined) txt(ctx, `الرصيد: ${compact(balance)} 💎`, 200, 166, { size: 16, weight: 'normal', color: INK.text });
  }
  if (details.length) {
    const n = Math.min(4, details.length), cw = (W - 100 - (n - 1) * 20) / n;
    details.slice(0, 4).forEach(([l, v, ic2], i) => stat(ctx, W - 50 - (i + 1) * cw - i * 20, 236, cw, 100, l, String(v), t, ic2 || null));
  }
  return out(canvas, 'result.png');
}

/** ورقة لعب */
function playingCard(ctx, x, y, w, h, card, hidden) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
  rr(ctx, x, y, w, h, 12);
  if (hidden) {
    const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#7a1428'); g.addColorStop(1, '#2a0610');
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save(); rr(ctx, x + 7, y + 7, w - 14, h - 14, 8); ctx.clip();
    ctx.strokeStyle = 'rgba(255,215,106,.35)'; ctx.lineWidth = 1.2;
    for (let i = -h; i < w + h; i += 12) { ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + h, y + h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + i + h, y); ctx.lineTo(x + i, y + h); ctx.stroke(); }
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,215,106,.7)'; ctx.lineWidth = 2; rr(ctx, x + 7, y + 7, w - 14, h - 14, 8); ctx.stroke(); ctx.restore();
    emoji(ctx, '💎', x + w / 2, y + h / 2, 34);
    return;
  }
  const g = ctx.createLinearGradient(x, y, x, y + h); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ecebe4');
  ctx.fillStyle = g; ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 12); ctx.stroke(); ctx.restore();
  const red = /[♥♦]/.test(card.suit);
  const col = red ? '#d3243b' : '#15171c';
  const corner = (cx, cy, flip) => {
    ctx.save(); ctx.translate(cx, cy); if (flip) ctx.rotate(Math.PI);
    ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.font = font(22); ctx.fillText(card.rank, 0, 0);
    ctx.font = font(18, 'normal'); ctx.fillText(card.suit, 0, 20); ctx.restore();
  };
  corner(x + 16, y + 28, false); corner(x + w - 16, y + h - 28, true);
  const face = ['J', 'Q', 'K'].includes(card.rank);
  if (face) {
    ctx.save(); ctx.strokeStyle = red ? 'rgba(211,36,59,0.35)' : 'rgba(21,23,28,0.3)'; ctx.lineWidth = 1.5; rr(ctx, x + 26, y + 34, w - 52, h - 68, 6); ctx.stroke(); ctx.restore();
    emoji(ctx, '👑', x + w / 2, y + h / 2 - 20, 30);
    ctx.save(); ctx.fillStyle = col; ctx.font = font(40); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(card.rank, x + w / 2, y + h / 2 + 18); ctx.restore();
  } else {
    ctx.save(); ctx.fillStyle = col; ctx.font = font(card.rank === 'A' ? 64 : 52, 'normal'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(card.suit, x + w / 2, y + h / 2 + 2); ctx.restore();
  }
}
/** طاولة البلاك جاك */
async function blackjackCard({ player = [], dealer = [], playerTotal, dealerTotal, hideDealer = true, status, username, bet, avatarURL }) {
  if (!C) return null;
  const W = 1000, H = 580;
  const theme = ['lose', 'bust'].includes(status) ? 'crimson' : ['win', 'blackjack'].includes(status) ? 'emerald' : 'gold';
  const { canvas, ctx, t } = base(W, H, theme, { bg: 'blackjack', dim: 0.55, fx: false });
  // الطاولة
  ctx.save(); ctx.strokeStyle = 'rgba(255,215,106,.45)'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]);
  ctx.beginPath(); ctx.ellipse(W / 2, H * 0.55, W * 0.42, H * 0.36, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  const cw = 100, ch = 142;
  const row = (cards, y, hideSecond) => {
    const n = cards.length, step = Math.min(cw + 16, (W - 200) / Math.max(1, n));
    const total = (n - 1) * step + cw; let x = (W - total) / 2;
    cards.forEach((c, i) => { playingCard(ctx, x, y, cw, ch, c, hideSecond && i === 1); x += step; });
  };
  pill(ctx, `الموزّع · ${hideDealer ? '?' : dealerTotal}`, W / 2, 34, THEMES.slate, { align: 'center', solid: false, icon: '🎩', h: 34, size: 16 });
  row(dealer, 80, hideDealer);
  pill(ctx, `${username || 'أنت'} · ${playerTotal}`, W / 2, 262, t, { align: 'center', solid: false, icon: '👤', h: 34, size: 16 });
  row(player, 306, false);
  if (avatarURL) await avatar(ctx, avatarURL, W - 120, H - 120, 72, t, username);
  const label = { win: 'فزت!', lose: 'خسرت', tie: 'تعادل', blackjack: 'بلاك جاك!', bust: 'تجاوزت 21' }[status];
  if (label) ribbon(ctx, label, W / 2, H - 92, t, { size: 24, h: 50, icon: status === 'blackjack' ? '🌟' : status === 'win' ? '🏆' : status === 'tie' ? '🤝' : '💥' });
  else if (bet) pill(ctx, `الرهان: ${compact(bet)}`, W / 2, H - 82, THEMES.gold, { align: 'center', icon: '🪙', h: 40, size: 18 });
  return out(canvas, 'blackjack.png');
}

/** ماكينة السلوتس */
async function slotsCard({ reels = ['❓', '❓', '❓'], spinning = false, outcome, multiplier = 0, bet = 0, win = 0, username, avatarURL, balance, title: ttl, pool = ['🍒', '🍋', '🍊', '🍇', '🔔', '7️⃣', '💎'] }) {
  if (!C) return null;
  const W = 1000, H = 560;
  const theme = outcome === 'jackpot' ? 'gold' : outcome === 'win' ? 'emerald' : outcome === 'lose' ? 'crimson' : 'amber';
  const { canvas, ctx, t } = base(W, H, theme, { bg: 'slots', dim: 0.66 });
  if (outcome === 'jackpot') { confetti(ctx, W, H, 90); rays(ctx, W / 2, 250, 520, THEMES.gold, 26, 0.16); }
  // الهيكل
  const mx = 170, my = 70, mw = 660, mh = 330;
  ctx.save(); ctx.shadowColor = t.glow; ctx.shadowBlur = 40;
  rr(ctx, mx, my, mw, mh, 36); const cab = ctx.createLinearGradient(mx, my, mx, my + mh); cab.addColorStop(0, '#3b0d14'); cab.addColorStop(1, '#14040a'); ctx.fillStyle = cab; ctx.fill(); ctx.restore();
  ctx.save(); ctx.lineWidth = 6; ctx.strokeStyle = grad(ctx, mx, my, mx + mw, my + mh, THEMES.gold); rr(ctx, mx, my, mw, mh, 36); ctx.stroke(); ctx.restore();
  // أضواء حول الإطار
  for (let i = 0; i < 22; i++) {
    const px = mx + 26 + (i * (mw - 52)) / 21;
    for (const py of [my + 16, my + mh - 16]) { ctx.save(); const on = (i + (py > my + 50 ? 1 : 0)) % 2 === 0; ctx.fillStyle = on ? '#fff3b0' : '#7a5a10'; ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = on ? 12 : 0; ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  }
  // البكرات
  const rw = 180, rh = 220, gap = 24, rx0 = mx + (mw - (3 * rw + 2 * gap)) / 2, ry = my + 55;
  const rand = rng(Date.now() % 100000);
  for (let i = 0; i < 3; i++) {
    const rx = rx0 + i * (rw + gap);
    ctx.save(); rr(ctx, rx, ry, rw, rh, 18); ctx.clip();
    const rg = ctx.createLinearGradient(0, ry, 0, ry + rh); rg.addColorStop(0, '#9a9a9a'); rg.addColorStop(0.18, '#f4f2ea'); rg.addColorStop(0.82, '#f4f2ea'); rg.addColorStop(1, '#9a9a9a');
    ctx.fillStyle = rg; ctx.fillRect(rx, ry, rw, rh);
    const above = pool[Math.floor(rand() * pool.length)], below = pool[Math.floor(rand() * pool.length)];
    if (spinning) {
      for (let k = -1; k < 4; k++) emoji(ctx, pool[Math.floor(rand() * pool.length)], rx + rw / 2, ry + 20 + k * 62, 70, { alpha: 0.55 });
      const blur = ctx.createLinearGradient(0, ry, 0, ry + rh); blur.addColorStop(0, 'rgba(255,255,255,0.0)'); blur.addColorStop(0.5, 'rgba(255,255,255,0.35)'); blur.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = blur; ctx.fillRect(rx, ry, rw, rh);
    } else {
      emoji(ctx, above, rx + rw / 2, ry + 18, 62, { alpha: 0.35 });
      emoji(ctx, below, rx + rw / 2, ry + rh - 18, 62, { alpha: 0.35 });
      emoji(ctx, reels[i], rx + rw / 2, ry + rh / 2, 112, { glow: outcome === 'lose' ? null : 'rgba(255,215,106,0.8)' });
    }
    const sh = ctx.createLinearGradient(0, ry, 0, ry + rh); sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(0.25, 'rgba(0,0,0,0)'); sh.addColorStop(0.75, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = sh; ctx.fillRect(rx, ry, rw, rh);
    ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(255,215,106,0.8)'; ctx.lineWidth = 3; rr(ctx, rx, ry, rw, rh, 18); ctx.stroke(); ctx.restore();
  }
  // خط الربح
  ctx.save(); ctx.strokeStyle = outcome && outcome !== 'lose' ? t.a : 'rgba(255,90,115,0.7)'; ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 12; ctx.setLineDash([12, 8]);
  ctx.beginPath(); ctx.moveTo(rx0 - 14, ry + rh / 2); ctx.lineTo(rx0 + 3 * rw + 2 * gap + 14, ry + rh / 2); ctx.stroke(); ctx.restore();
  // ذراع
  ctx.save(); ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.strokeStyle = '#b0b6c2'; ctx.beginPath(); ctx.moveTo(mx + mw + 10, my + mh / 2 + 40); ctx.lineTo(mx + mw + 40, my + mh / 2 + 40); ctx.lineTo(mx + mw + 40, my + (spinning ? mh / 2 + 110 : 60)); ctx.stroke();
  ctx.fillStyle = '#ff3b55'; ctx.shadowColor = '#ff3b55'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(mx + mw + 40, my + (spinning ? mh / 2 + 120 : 50), 20, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // الشريط السفلي
  const label = ttl || (spinning ? 'تدور البكرات...' : outcome === 'jackpot' ? 'جاكبوت!' : outcome === 'win' ? 'فوز!' : 'حظاً أوفر');
  ribbon(ctx, label, W / 2, my - 32, t, { size: 22, h: 46, icon: spinning ? '🎰' : outcome === 'jackpot' ? '🌟' : outcome === 'win' ? '🏆' : '💸' });
  panel(ctx, 50, 430, W - 100, 92, 20);
  await avatar(ctx, avatarURL, W - 134, 444, 64, t, username);
  txt(ctx, username || 'لاعب', W - 152, 474, { size: 20, align: 'right', maxW: 260 });
  txt(ctx, `الرهان ${compact(bet)} 🪙`, W - 152, 502, { size: 15, weight: 'normal', color: INK.sub, align: 'right' });
  if (!spinning) {
    const net = win - bet;
    txt(ctx, `${net >= 0 ? '+' : '−'}${compact(Math.abs(net))}`, 80, 490, { size: 40, color: net >= 0 ? THEMES.emerald.a : THEMES.crimson.a, glow: net >= 0 ? THEMES.emerald.glow : THEMES.crimson.glow });
    if (multiplier) pill(ctx, `x${multiplier}`, 250, 458, t, { h: 38, size: 18 });
    if (balance !== undefined) txt(ctx, `الرصيد ${compact(balance)} 💎`, W / 2, 490, { size: 17, align: 'center', color: INK.text });
  } else txt(ctx, '⏳ لحظات...', 80, 490, { size: 22, color: t.a });
  return out(canvas, 'slots.png');
}

/** عجلة الروليت */
const WHEEL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RED_NUMS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
async function rouletteCard({ number = null, choiceLabel = '', outcome, bet = 0, net = 0, balance, username, avatarURL, spinning = false }) {
  if (!C) return null;
  const W = 1000, H = 520;
  const theme = outcome === 'win' ? 'emerald' : outcome === 'lose' ? 'crimson' : 'gold';
  const { canvas, ctx, t } = base(W, H, theme, { bg: 'roulette', dim: 0.66 });
  const cx = 250, cy = 260, R = 210;
  const idx = number === null ? 0 : WHEEL_ORDER.indexOf(number);
  const seg = (Math.PI * 2) / 37;
  const rot = number === null ? (Date.now() % 1000) / 159 : -Math.PI / 2 - idx * seg - seg / 2; // يجعل الرقم الفائز في الأعلى
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.arc(cx, cy, R + 18, 0, Math.PI * 2); const wood = ctx.createRadialGradient(cx, cy, R, cx, cy, R + 18); wood.addColorStop(0, '#5a3210'); wood.addColorStop(1, '#2a1404'); ctx.fillStyle = wood; ctx.fill(); ctx.restore();
  ctx.save(); ctx.strokeStyle = grad(ctx, cx - R, cy - R, cx + R, cy + R, THEMES.gold); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, R + 16, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  for (let i = 0; i < 37; i++) {
    const n = WHEEL_ORDER[i];
    const a0 = rot + i * seg, a1 = a0 + seg;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
    ctx.fillStyle = n === 0 ? '#0f9e4a' : RED_NUMS.has(n) ? '#c3172f' : '#15161c';
    if (number === n && !spinning) { ctx.save(); ctx.shadowColor = '#fff'; ctx.shadowBlur = 20; ctx.fill(); ctx.restore(); } else ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,106,0.55)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(a0 + seg / 2); ctx.translate(R - 22, 0); ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#fff'; ctx.font = font(15); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 0, 0); ctx.restore();
  }
  // الحلقة الداخلية والمحور
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 44, 0, Math.PI * 2); const inner = ctx.createRadialGradient(cx, cy, 10, cx, cy, R - 44); inner.addColorStop(0, '#4a2a0c'); inner.addColorStop(1, '#1e0f03'); ctx.fillStyle = inner; ctx.fill();
  ctx.strokeStyle = 'rgba(255,215,106,0.6)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  for (let i = 0; i < 8; i++) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot + (i * Math.PI) / 4); ctx.fillStyle = grad(ctx, 0, -6, 0, 6, THEMES.gold); rr(ctx, 0, -5, R - 70, 10, 5); ctx.fill(); ctx.restore(); }
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 34, 0, Math.PI * 2); ctx.fillStyle = grad(ctx, cx - 34, cy - 34, cx + 34, cy + 34, THEMES.gold); ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 20; ctx.fill(); ctx.restore();
  // الكرة والمؤشر
  if (number !== null && !spinning) {
    ctx.save(); const bg = ctx.createRadialGradient(cx - 3, cy - R + 30, 1, cx, cy - R + 33, 11); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#a9adb8');
    ctx.fillStyle = bg; ctx.shadowColor = '#fff'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(cx, cy - R + 33, 11, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  ctx.save(); ctx.fillStyle = '#ffd76a'; ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 14; ctx.beginPath(); ctx.moveTo(cx - 16, cy - R - 34); ctx.lineTo(cx + 16, cy - R - 34); ctx.lineTo(cx, cy - R - 6); ctx.closePath(); ctx.fill(); ctx.restore();
  // لوحة المعلومات
  const px = 520, pw = W - px - 50;
  await avatar(ctx, avatarURL, W - 140, 60, 84, t, username);
  txt(ctx, 'طاولة الروليت', W - 166, 92, { size: 16, weight: 'normal', color: INK.sub, align: 'right' });
  title(ctx, username || 'لاعب', W - 166, 130, t, { size: 30, maxW: 280 });
  panel(ctx, px, 180, pw, 150, 22);
  if (number !== null && !spinning) {
    const col = number === 0 ? THEMES.emerald : RED_NUMS.has(number) ? THEMES.crimson : THEMES.slate;
    ctx.save(); ctx.beginPath(); ctx.arc(px + 90, 255, 52, 0, Math.PI * 2); ctx.fillStyle = number === 0 ? '#0f9e4a' : RED_NUMS.has(number) ? '#c3172f' : '#1b1c22'; ctx.shadowColor = col.glow; ctx.shadowBlur = 26; ctx.fill(); ctx.strokeStyle = '#ffd76a'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
    txt(ctx, String(number), px + 90, 258, { size: 46, align: 'center', base: 'middle' });
    txt(ctx, 'الرقم الفائز', px + pw - 24, 222, { size: 15, weight: 'normal', color: INK.sub, align: 'right' });
    txt(ctx, number === 0 ? 'أخضر · صفر' : `${RED_NUMS.has(number) ? 'أحمر' : 'أسود'} · ${number % 2 ? 'فردي' : 'زوجي'} · ${number <= 18 ? '1-18' : '19-36'}`, px + pw - 24, 258, { size: 22, align: 'right', maxW: pw - 180 });
    txt(ctx, `رهانك: ${choiceLabel}`, px + pw - 24, 296, { size: 16, weight: 'normal', color: INK.text, align: 'right', maxW: pw - 180 });
  } else {
    emoji(ctx, '🎡', px + 80, 255, 80, { glow: t.glow });
    txt(ctx, spinning ? 'الكرة تدور...' : 'اختر رهانك من الأزرار', px + pw - 24, 246, { size: 24, align: 'right', maxW: pw - 170 });
    txt(ctx, choiceLabel ? `رهانك: ${choiceLabel}` : 'ألوان ×2 · صفر ×14 · فردي/زوجي ×2', px + pw - 24, 284, { size: 15, weight: 'normal', color: INK.sub, align: 'right', maxW: pw - 170 });
  }
  const sw = (pw - 20) / 2;
  stat(ctx, px + sw + 20, 350, sw, 86, 'الرهان', compact(bet), t, '🪙');
  if (outcome) stat(ctx, px, 350, sw, 86, outcome === 'win' ? 'ربح صافٍ' : 'خسارة', `${net >= 0 ? '+' : '−'}${compact(Math.abs(net))}`, t, outcome === 'win' ? '🏆' : '💸');
  else stat(ctx, px, 350, sw, 86, 'الرصيد', compact(balance), t, '💎');
  if (outcome && balance !== undefined) txt(ctx, `الرصيد الآن: ${compact(balance)} 💎`, px + pw / 2, 470, { size: 16, align: 'center', color: INK.sub });
  return out(canvas, 'roulette.png');
}

/** رمي العملة */
async function coinCard({ side = null, pick = 'h', outcome, amount = 0, balance, username, avatarURL, bet = 0 }) {
  if (!C) return null;
  const W = 1000, H = 420;
  const theme = outcome === 'win' ? 'emerald' : outcome === 'lose' ? 'crimson' : 'gold';
  const { canvas, ctx, t } = base(W, H, theme, { bg: 'coinflip', dim: 0.58 });
  const cx = 220, cy = 210, R = 130;
  rays(ctx, cx, cy, 240, THEMES.gold, 20, 0.2);
  // سماكة العملة
  ctx.save(); ctx.fillStyle = '#7a520c'; ctx.beginPath(); ctx.ellipse(cx, cy + 12, R, side ? R : R * 0.35, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  ctx.save(); ctx.shadowColor = 'rgba(255,200,90,0.7)'; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.ellipse(cx, cy, R, side ? R : R * 0.35, 0, 0, Math.PI * 2);
  const cg = ctx.createRadialGradient(cx - 40, cy - 40, 10, cx, cy, R); cg.addColorStop(0, '#fff2b8'); cg.addColorStop(0.55, '#f0b93a'); cg.addColorStop(1, '#a8700f');
  ctx.fillStyle = cg; ctx.fill(); ctx.restore();
  if (side) {
    ctx.save(); ctx.strokeStyle = 'rgba(120,80,10,0.6)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, R - 16, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([3, 7]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, R - 6, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    emoji(ctx, side === 'h' ? '👑' : '💰', cx, cy - 6, 120);
    txt(ctx, side === 'h' ? 'صورة' : 'كتابة', cx, cy + 82, { size: 22, align: 'center', color: '#5a3a06' });
  } else { txt(ctx, '?', cx, cy + 4, { size: 64, align: 'center', base: 'middle', color: '#7a520c' }); emoji(ctx, '💨', cx + 150, cy + 60, 60, { alpha: 0.7 }); }
  await avatar(ctx, avatarURL, W - 170, 52, 110, t, username);
  txt(ctx, 'رمي العملة', W - 200, 84, { size: 17, weight: 'normal', color: INK.sub, align: 'right' });
  title(ctx, !side ? 'العملة في الهواء...' : outcome === 'win' ? 'تطابق! فزت' : 'لم يتطابق', W - 200, 136, t, { size: 40, color: side ? t.a : INK.text, maxW: 420 });
  txt(ctx, `اخترت ${pick === 'h' ? '👑 صورة' : '💰 كتابة'}${side ? ` · ظهرت ${side === 'h' ? '👑 صورة' : '💰 كتابة'}` : ''}`, W - 200, 174, { size: 18, weight: 'normal', align: 'right', maxW: 520 });
  const sw = (W - 470 - 20) / 2;
  stat(ctx, 420 + sw + 20, 250, sw, 96, 'الرهان', compact(bet), t, '🪙');
  if (side) stat(ctx, 420, 250, sw, 96, outcome === 'win' ? 'الربح' : 'الخسارة', `${amount >= 0 ? '+' : '−'}${compact(Math.abs(amount))}`, t, outcome === 'win' ? '🏆' : '💸');
  if (side && balance !== undefined) txt(ctx, `الرصيد الآن: ${compact(balance)} 💎`, 420 + (W - 470) / 2, 380, { size: 16, align: 'center', color: INK.sub });
  return out(canvas, 'coin.png');
}

/** حجرة ورقة مقص */
async function rpsCard({ p, o, result, username, avatarURL, opponent = 'البوت', opponentAvatar, delta = 0, balance }) {
  if (!C) return null;
  const E = { rock: '🪨', paper: '📄', scissors: '✂️' }, N = { rock: 'حجرة', paper: 'ورقة', scissors: 'مقص' };
  const W = 1000, H = 420;
  const theme = result === 'win' ? 'emerald' : result === 'lose' ? 'crimson' : 'slate';
  const { canvas, ctx, t } = base(W, H, theme, { bg: 'rps', dim: 0.68 });
  const side = async (cx, name, url, pick, winner) => {
    if (winner) rays(ctx, cx, 200, 190, t, 16, 0.2);
    await avatar(ctx, url, cx - 45, 40, 90, winner ? t : THEMES.slate, name);
    txt(ctx, name, cx, 162, { size: 22, align: 'center', maxW: 300, shadow: true });
    emoji(ctx, pick ? E[pick] : '❔', cx, 248, 120, { glow: winner ? t.glow : null });
    txt(ctx, pick ? N[pick] : '', cx, 340, { size: 20, align: 'center', color: winner ? t.a : INK.sub });
  };
  await side(W - 230, username || 'أنت', avatarURL, p, result === 'win');
  await side(230, opponent, opponentAvatar, o, result === 'lose');
  hexBadge(ctx, W / 2, 210, 54, t, 'VS', { size: 34 });
  const label = result === 'win' ? 'انتصرت!' : result === 'lose' ? 'خسرت!' : result === 'tie' ? 'تعادل' : 'اختر سلاحك';
  ribbon(ctx, label, W / 2, 300, t, { size: 20, h: 42 });
  if (result && result !== 'tie' && delta) txt(ctx, `${result === 'win' ? '+' : '−'}${compact(Math.abs(delta))} 💎${balance !== undefined ? `   ·   الرصيد ${compact(balance)}` : ''}`, W / 2, 380, { size: 18, align: 'center', color: INK.text });
  return out(canvas, 'rps.png');
}

/** بطاقة قائمة الأوامر */
async function helpCard({ botName = 'البوت', categories = [] }) {
  if (!C) return null;
  const W = 1000, cardH = 150, gap = 20;
  const rows = Math.ceil(categories.length / 2);
  const H = 160 + rows * (cardH + gap) + 40;
  const { canvas, ctx, t } = base(W, H, 'azure', { bg: 'rank', dim: 0.72 });
  emoji(ctx, '📚', W - 78, 78, 50, { glow: t.glow });
  title(ctx, `أوامر ${botName}`, W - 120, 92, t, { size: 40 });
  txt(ctx, 'اختر قسماً من القائمة بالأسفل لعرض التفاصيل', W - 120, 124, { size: 17, weight: 'normal', color: INK.sub, align: 'right' });
  const cw = (W - 100 - gap) / 2;
  categories.forEach((c, i) => {
    const x = W - 50 - ((i % 2) + 1) * cw - (i % 2) * gap, y = 150 + Math.floor(i / 2) * (cardH + gap);
    const ct = THEMES[c.theme] || t;
    panel(ctx, x, y, cw, cardH, 20, null, { stroke: 'rgba(255,255,255,0.1)' });
    iconTile(ctx, c.icon || '•', x + cw - 52, y + 50, 62, ct, { solid: true });
    txt(ctx, c.name, x + cw - 98, y + 58, { size: 24, align: 'right', maxW: cw - 210 });
    pill(ctx, `${c.commands.length} أمر`, x + 22, y + 34, ct, { solid: false, h: 30, size: 14 });
    txt(ctx, c.commands.slice(0, 7).join(' · '), x + cw - 24, y + 118, { size: 15, weight: 'normal', color: INK.sub, align: 'right', maxW: cw - 48 });
  });
  return out(canvas, 'help.png');
}

/** بطاقة قائمة الألعاب */
async function gamesMenuCard({ sections = [], botName = '' }) {
  if (!C) return null;
  const W = 1000, tileH = 92, gap = 14, cols = 3;
  let y = 150; for (const s of sections) y += 44 + Math.ceil(s.games.length / cols) * (tileH + gap) + 10;
  const H = y + 50;
  const { canvas, ctx, t } = base(W, H, 'gold', { bg: 'group', dim: 0.74 });
  emoji(ctx, '🎮', W - 78, 80, 52, { glow: t.glow });
  title(ctx, 'صالة الألعاب', W - 120, 94, t, { size: 42 });
  txt(ctx, botName ? `${botName} · اكتب اسم اللعبة مباشرة في الشات` : 'اكتب اسم اللعبة مباشرة في الشات', W - 120, 126, { size: 17, weight: 'normal', color: INK.sub, align: 'right' });
  y = 160;
  const tw = (W - 100 - (cols - 1) * gap) / cols;
  for (const s of sections) {
    const st = THEMES[s.theme] || t;
    txt(ctx, s.title, W - 54, y + 26, { size: 22, color: st.a, align: 'right' });
    ctx.save(); ctx.fillStyle = grad(ctx, 50, 0, W - 50, 0, { a: 'rgba(255,255,255,0)', b: st.a }); ctx.globalAlpha = 0.4; ctx.fillRect(50, y + 36, W - 100 - measure(ctx, s.title, 22) - 20, 1.5); ctx.restore();
    y += 46;
    s.games.forEach((g, i) => {
      const x = W - 50 - ((i % cols) + 1) * tw - (i % cols) * gap, yy = y + Math.floor(i / cols) * (tileH + gap);
      panel(ctx, x, yy, tw, tileH, 18);
      if (g.art) artTile(ctx, g.art, x + tw - 46, yy + tileH / 2, 60, st, g.icon); else iconTile(ctx, g.icon, x + tw - 46, yy + tileH / 2, 56, st);
      txt(ctx, g.name, x + tw - 88, yy + 38, { size: 20, align: 'right', maxW: tw - 110 });
      txt(ctx, g.trigger, x + tw - 88, yy + 66, { size: 14, weight: 'normal', color: st.a, align: 'right', maxW: tw - 170 });
      if (g.cooldown) txt(ctx, `⏱️ ${g.cooldown}`, x + 16, yy + 66, { size: 12, weight: 'normal', color: INK.sub });
    });
    y += Math.ceil(s.games.length / cols) * (tileH + gap) + 10;
  }
  footer(ctx, W, H, 'أو استخدم أوامر السلاش / · ! قبل اسم الأمر');
  return out(canvas, 'games.png');
}

module.exports = {
  hasCanvas, THEMES, INK, compact, ar, strip, ready,
  // أدوات الرسم (تستخدمها groupCards / funCards / rpgCards / dungeonCards)
  _kit: {
    C: () => C, font, fit, txt, measure, wrap, rr, grad, base, panel, pill, bar, hpBar, ring, avatar, stat, footer, out,
    emoji, emojiImage, iconTile, artTile, gameThumb, playingCard, hexBadge, ribbon, title, rays, confetti, sparkle, starPath, hexPath, cover, scene, bossArt, loadRemote, rng, th, withReady, ready,
  },
  ...withReady({
    profileCard, balanceCard, leaderboardCard, levelUpCard,
    colorsCard, gameResultCard, blackjackCard, helpCard,
    slotsCard, rouletteCard, coinCard, rpsCard, gamesMenuCard,
  }),
};
