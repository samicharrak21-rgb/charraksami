const BADGES = {
  1: { emoji: '🥉', name: 'مبتدئ', url: 'https://em-content.zobj.net/thumbs/160/twitter/322/3rd-place-medal_1f949.png', desc: 'بداية الرحلة!' },
  5: { emoji: '🥈', name: 'عضو نشط', url: 'https://em-content.zobj.net/thumbs/160/twitter/322/2nd-place-medal_1f948.png', desc: 'أنت تنمو!' },
  10: { emoji: '🥇', name: 'محترف', url: 'https://em-content.zobj.net/thumbs/160/twitter/322/1st-place-medal_1f947.png', desc: 'محترف حقيقي!' },
  20: { emoji: '💎', name: 'خبير', url: 'https://em-content.zobj.net/thumbs/160/twitter/322/gem-stone_1f48e.png', desc: 'كنز نادر!' },
  35: { emoji: '👑', name: 'فخر السيرفر', url: 'https://em-content.zobj.net/thumbs/160/twitter/322/crown_1f451.png', desc: 'ملك السيرفر!' },
  50: { emoji: '🌟', name: 'أسطورة', url: 'https://em-content.zobj.net/thumbs/160/twitter/322/glowing-star_1f31f.png', desc: 'أسطورة حية!' },
  100: { emoji: '⚡', name: 'الإمبراطور', url: 'https://em-content.zobj.net/thumbs/160/twitter/322/lightning_26a1-fe0f.png', desc: 'قوة خارقة!' }
};

function getBadgeForLevel(level) {
  let badge = BADGES[1];
  for (const [lvl, b] of Object.entries(BADGES)) {
    if (level >= parseInt(lvl)) badge = b;
  }
  return badge;
}

function getNextBadge(level) {
  const levels = Object.keys(BADGES).map(Number).sort((a, b) => a - b);
  for (const lvl of levels) {
    if (level < lvl) return { level: lvl, badge: BADGES[lvl] };
  }
  return null;
}

module.exports = { getBadgeForLevel, getNextBadge, BADGES };
