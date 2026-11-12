// 🛡️ modCards v22 — بطاقة عقوبة مرسومة لقناة سجل الإشراف (بتصميم cardKit)
const kit = require('./cardKit');

const TYPE_THEME = {
  'حظر': 'crimson', 'فك حظر': 'emerald', 'طرد': 'amber', 'إسكات': 'gold', 'فك إسكات': 'emerald',
  'تحذير': 'amber', 'مسح رسائل': 'azure', 'قفل قناة': 'slate', 'فتح قناة': 'emerald',
  'وضع بطيء': 'azure', 'تغيير لقب': 'violet', 'إعطاء رتبة': 'violet', 'سحب رتبة': 'crimson',
  'إرسال رسالة': 'slate',
};
const TYPE_ICON = {
  'حظر': '🔨', 'فك حظر': '🔓', 'طرد': '👢', 'إسكات': '🔇', 'فك إسكات': '🔊',
  'تحذير': '⚠️', 'مسح رسائل': '🧹', 'قفل قناة': '🔒', 'فتح قناة': '🔓',
  'وضع بطيء': '🐌', 'تغيير لقب': '✏️', 'إعطاء رتبة': '🎖️', 'سحب رتبة': '📉', 'إرسال رسالة': '📢',
};

async function modCaseCard({ caseId, type, targetName, targetAvatar, modName, modAvatar, reason, guildName }) {
  const C = kit._kit.C();
  if (!C) return null;
  await kit.ready();
  const k = kit._kit;
  const W = 1000, H = 360;
  const theme = TYPE_THEME[type] || 'crimson';
  const { canvas, ctx, t } = k.base(W, H, theme, { bg: 'arena', dim: 0.72, seed: caseId });

  // الأيقونة الكبيرة + أشعة
  const icon = TYPE_ICON[type] || '🛡️';
  k.rays(ctx, 130, 180, 170, t, 16, 0.16);
  k.iconTile(ctx, icon, 130, 180, 96, t, { solid: true });

  // شارة رقم الحالة
  k.pill(ctx, `الحالة #${caseId}`, W - 60, 44, t, { align: 'right', solid: false, icon: '📋', h: 36, size: 16 });
  k.title(ctx, type || 'عقوبة', W - 60, 118, t, { size: 46, maxW: 560, align: 'right' });
  if (guildName) k.txt(ctx, guildName, W - 60, 152, { size: 16, weight: 'normal', color: k.INK?.sub || '#a3abbd', align: 'right' });

  // العضو المُعاقب
  k.panel(ctx, 380, 190, W - 430, 130, 20);
  await k.avatar(ctx, targetAvatar, W - 60 - 110, 205, 84, t, targetName);
  k.txt(ctx, 'العضو', W - 196, 222, { size: 14, weight: 'normal', color: '#a3abbd', align: 'right' });
  k.txt(ctx, targetName || '—', W - 196, 252, { size: 26, align: 'right', maxW: 380 });
  k.txt(ctx, `السبب: ${reason || 'بدون سبب'}`, W - 196, 292, { size: 15, weight: 'normal', color: '#e8eaed', align: 'right', maxW: 380 });

  // المُنفِّذ
  k.panel(ctx, 60, 190, 300, 130, 20, null, { stroke: 'rgba(255,255,255,0.09)' });
  await k.avatar(ctx, modAvatar, 260, 212, 64, kit.THEMES.slate, modName);
  k.txt(ctx, 'المُنفِّذ', 244, 228, { size: 14, weight: 'normal', color: '#a3abbd', align: 'right' });
  k.txt(ctx, modName || '—', 244, 256, { size: 22, align: 'right', maxW: 160 });
  k.txt(ctx, `🛡️ ${type || ''}`, 244, 292, { size: 13, weight: 'normal', color: t.a, align: 'right', maxW: 160 });

  return k.out(canvas, 'modcase.png');
}

module.exports = { modCaseCard };
