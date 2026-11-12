// 🎞️ يولّد صور GIF متحركة لكل لعبة وأمر (assets/gifs/cmd_*.gif) — تشغيل: node scripts/build-gifs.js
const fs = require('fs');
const path = require('path');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');
const kit = require('../src/utils/cardKit');
const K = kit._kit;
const M = require('../src/utils/modernCards');

const OUT = path.resolve(__dirname, '../assets/gifs');
const P = (a, b, hi = '#ffffff') => ({ a, b, hi, glow: a + '88' });
// key: [emoji, title, subtitle, palette, motion]
const LIST = {
  daily:    ['🎁', 'المكافأة اليومية', 'عُد كل يوم لتكبر السلسلة', P('#ffd166', '#ff5e8a'), 'bounce'],
  work:     ['💼', 'وقت العمل', 'اجمع راتبك بعرق جبينك', P('#34f5c5', '#1fb6ff'), 'swing'],
  bank:     ['🏦', 'البنك المركزي', 'إيداع · سحب · فائدة · قروض', P('#ffd166', '#ff8a3d'), 'pulse'],
  steal:    ['🥷', 'عملية سرقة', 'تسلّل بهدوء...', P('#ff6b7f', '#7b6cff'), 'sneak'],
  pay:      ['💸', 'تحويل الأموال', 'تم إرسال الحوالة', P('#34f5c5', '#5ee7ff'), 'fly'],
  coinflip: ['🪙', 'رمي العملة', 'ملك أم كتابة؟', P('#ffd166', '#ffb547'), 'flip'],
  dice:     ['🎲', 'رمي النرد', 'الحظ يقرر', P('#5ee7ff', '#7b6cff'), 'spin'],
  slots:    ['🎰', 'ماكينة الحظ', 'ثلاثة متطابقة = جائزة', P('#ff5e8a', '#ffd166'), 'shake'],
  roulette: ['🎡', 'الروليت', 'أحمر أم أسود؟', P('#ff6b7f', '#1fb6ff'), 'spin'],
  wheel:    ['🎡', 'عجلة الحظ', 'لف واربح', P('#ffd166', '#34f5c5'), 'spin'],
  crash:    ['🚀', 'الصاروخ', 'اسحب قبل الانفجار', P('#ff8a3d', '#ff5e8a'), 'rocket'],
  treasure: ['💰', 'صناديق الكنز', 'اختر صندوقك', P('#ffd166', '#34f5c5'), 'bounce'],
  scratch:  ['🎟️', 'بطاقة الكشط', 'اكشط واربح', P('#5ee7ff', '#ff5e8a'), 'shake'],
  race:     ['🐪', 'سباق الهجن', 'راهن على البطل', P('#ffb547', '#ff8a3d'), 'run'],
  highlow:  ['🃏', 'أعلى أو أقل', 'توقّع البطاقة التالية', P('#7b6cff', '#5ee7ff'), 'flip'],
  guess:    ['🔢', 'خمّن الرقم', 'كم الرقم السري؟', P('#34f5c5', '#7b6cff'), 'pulse'],
  fish:     ['🎣', 'صيد السمك', 'ارمِ الصنارة', P('#1fb6ff', '#34f5c5'), 'swing'],
  blackjack:['🂡', 'بلاك جاك', 'اقترب من 21', P('#34f5c5', '#ff5e8a'), 'flip'],
  rps:      ['✊', 'حجرة ورقة مقص', 'واحد · اثنان · ثلاثة!', P('#ff5e8a', '#5ee7ff'), 'shake'],
  trivia:   ['🧠', 'سؤال وجواب', 'اختبر معلوماتك', P('#7b6cff', '#34f5c5'), 'pulse'],
  lottery:  ['🎫', 'اليانصيب', 'تذكرة واحدة قد تغير حياتك', P('#ffd166', '#7b6cff'), 'bounce'],
  hangman:  ['🪢', 'المشنقة', 'خمّن الكلمة حرفاً حرفاً', P('#ff6b7f', '#ffb547'), 'swing'],
  wordle:   ['🔤', 'وردل', 'خمس محاولات فقط', P('#34f5c5', '#ffd166'), 'pulse'],
  minesweeper:['💣', 'كاسحة الألغام', 'احذر من الانفجار', P('#ff5e8a', '#ff8a3d'), 'shake'],
  tictactoe:['❌', 'إكس أو', 'ثلاثة في صف', P('#5ee7ff', '#ff5e8a'), 'flip'],
  connect4: ['🔴', 'أربعة في صف', 'أسقط القطع بذكاء', P('#ff6b7f', '#ffd166'), 'bounce'],
  marry:    ['💍', 'طلب زواج', 'هل تقبل؟', P('#ff9ad5', '#ff5e8a'), 'pulse'],
  pet:      ['🐾', 'حيوانك الأليف', 'اطعمه والعب معه', P('#34f5c5', '#ffd166'), 'bounce'],
  stocks:   ['📈', 'سوق الأسهم', 'اشترِ بسعر منخفض', P('#34f5c5', '#1fb6ff'), 'rocket'],
  farm:     ['🌾', 'المزرعة', 'ازرع واحصد', P('#b6ff5c', '#34f5c5'), 'swing'],
  dungeon:  ['⚔️', 'الدانجون', 'واجه الوحوش', P('#ff6b7f', '#7b6cff'), 'shake'],
  shop:     ['🛒', 'المتجر', 'تسوّق بجواهرك', P('#ffd166', '#5ee7ff'), 'bounce'],
  social:   ['💬', 'السهرة', 'لو خيروك · صراحة · كت تويت', P('#ff9ad5', '#7b6cff'), 'pulse'],
  fun:      ['🎉', 'وقت المرح', 'ضحك ولعب', P('#ffd166', '#ff5e8a'), 'bounce'],
};

function frame(C, key, f, F) {
  const [emo, title, sub, p, motion] = LIST[key];
  const W = 600, H = 220, t = f / F, s = Math.sin(t * Math.PI * 2);
  const canvas = C.createCanvas(W, H), ctx = canvas.getContext('2d');
  M.backdrop(ctx, W, H, p, { seed: key.length * 13, shift: s * 0.6 });
  // دوائر نابضة خلف الإيموجي
  const cx = 120, cy = 110;
  for (let i = 0; i < 3; i++) {
    const k = (t + i / 3) % 1;
    ctx.save(); ctx.globalAlpha = (1 - k) * 0.5; ctx.strokeStyle = p.a; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, 40 + k * 70, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  ctx.save(); ctx.translate(cx, cy);
  let size = 92;
  if (motion === 'bounce') { ctx.translate(0, -Math.abs(s) * 22); ctx.scale(1 + Math.abs(s) * 0.05, 1 - Math.abs(s) * 0.03); }
  if (motion === 'pulse') { const k = 1 + s * 0.1; ctx.scale(k, k); }
  if (motion === 'swing') ctx.rotate(s * 0.35);
  if (motion === 'spin') ctx.rotate(t * Math.PI * 2);
  if (motion === 'flip') ctx.scale(Math.cos(t * Math.PI * 2) || 0.02, 1);
  if (motion === 'shake') ctx.translate(Math.sin(t * Math.PI * 12) * 6, Math.cos(t * Math.PI * 10) * 3);
  if (motion === 'sneak') { ctx.translate(s * 30, 0); ctx.globalAlpha = 0.55 + Math.abs(s) * 0.45; }
  if (motion === 'fly') { ctx.translate(-40 + t * 80, -s * 10); }
  if (motion === 'run') { ctx.translate(-30 + t * 60, -Math.abs(Math.sin(t * Math.PI * 6)) * 10); }
  if (motion === 'rocket') { ctx.translate(Math.sin(t * Math.PI * 14) * 2, -t * 20 + 10); ctx.rotate(-0.15); }
  K.emoji(ctx, emo, 0, 0, size, { glow: p.glow });
  ctx.restore();
  if (motion === 'rocket') { ctx.save(); for (let i = 0; i < 8; i++) { ctx.globalAlpha = 0.5 - i * 0.06; ctx.fillStyle = i % 2 ? p.a : p.b; ctx.beginPath(); ctx.arc(cx - 30 - i * 9, cy + 40 + i * 7 + (f % 2) * 3, 8 - i * 0.7, 0, 6.3); ctx.fill(); } ctx.restore(); }
  // النص
  K.txt(ctx, title, W - 40, 100, { size: 40, align: 'right', maxW: 360, shadow: true });
  K.txt(ctx, sub, W - 40, 140, { size: 18, weight: 'normal', color: '#b8c3e0', align: 'right', maxW: 360 });
  // شريط متحرك
  ctx.save(); K.rr(ctx, W - 300, 164, 260, 6, 3); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
  const bw = 80, bx = W - 300 + ((t * 340) % 340) - bw;
  ctx.save(); K.rr(ctx, W - 300, 164, 260, 6, 3); ctx.clip(); ctx.fillStyle = M.lin(ctx, bx, 0, bx + bw, 0, [p.b, p.a]); ctx.fillRect(bx, 164, bw, 6); ctx.restore();
  ctx.restore();
  // لمعة
  ctx.save(); K.rr(ctx, 0, 0, W, H, 30); ctx.clip();
  const sx = -200 + t * (W + 400); ctx.globalAlpha = 0.14; ctx.fillStyle = M.lin(ctx, sx, 0, sx + 120, 0, ['rgba(255,255,255,0)', '#ffffff', 'rgba(255,255,255,0)']);
  ctx.translate(sx, 0); ctx.transform(1, 0, -0.4, 1, 0, 0); ctx.fillRect(0, 0, 120, H); ctx.restore();
  return ctx.getImageData(0, 0, W, H);
}

(async () => {
  await kit.ready();
  const C = K.C();
  if (!C) throw new Error('canvas not available');
  const only = process.argv[2];
  for (const key of Object.keys(LIST)) {
    if (only && key !== only) continue;
    const enc = GIFEncoder(), F = 20;
    for (let f = 0; f < F; f++) {
      const img = frame(C, key, f, F);
      const pal = quantize(img.data, 96, { format: 'rgb444' });
      enc.writeFrame(applyPalette(img.data, pal, 'rgb444'), img.width, img.height, { palette: pal, delay: 60, repeat: 0 });
    }
    enc.finish();
    fs.writeFileSync(path.join(OUT, `cmd_${key}.gif`), Buffer.from(enc.bytes()));
    console.log('✅', key);
  }
})();
module.exports = { LIST };
