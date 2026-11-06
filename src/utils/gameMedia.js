// ============= Game Media (Local GIFs) =============
// تم استبدال روابط Tenor الخارجية بملفات GIF محلية مولّدة ذاتياً
// (تعمل دائماً بدون اتصال بالإنترنت ولا تتعرض لروابط ميتة).
// كل ملف يُرسل كـ AttachmentBuilder ويُربط بالـ embed عبر attachment://name.gif

const path = require('path');
const fs = require('fs');
const { AttachmentBuilder } = require('discord.js');

const GIF_DIR = path.resolve(__dirname, '../../assets/gifs');

// خريطة: لعبة + حالة → اسم ملف GIF
const MAP = {
  slots:       { spin: 'slots_spin', win: 'win',  jackpot: 'jackpot', lose: 'lose' },
  roulette:    { spin: 'dice',       win: 'win',  lose: 'lose' },
  blackjack:   { deal: 'cards',      win: 'win',  bust: 'lose' },
  rps:         { play: 'dice',       win: 'win',  lose: 'lose', tie: 'tie' },
  race:        { start: 'loading',   win: 'win',  lose: 'lose' },
  fish:        { cast: 'loading',    catch: 'win', miss: 'lose' },
  snake:       { play: 'loading' },
  memory:      { play: 'cards' },
  sort:        { play: 'loading' },
  minesweeper: { play: 'loading',    boom: 'lose', win: 'win' },
  guess:       { think: 'dice',      win: 'win',  lose: 'lose' },
  emoji:       { play: 'loading' },
  challenge:   { play: 'dice' },
  rob:         { sneak: 'loading',   caught: 'lose', win: 'win' },
  generic:     { win: 'win', lose: 'lose', tie: 'tie', loading: 'loading' },
};

function _resolveFile(game, state) {
  const g = MAP[game] || {};
  const name = g[state] || (MAP.generic[state] || 'loading');
  const fp = path.join(GIF_DIR, `${name}.gif`);
  if (fs.existsSync(fp)) return { fp, name: `${name}.gif` };
  // fallback to loading
  const fb = path.join(GIF_DIR, 'loading.gif');
  return fs.existsSync(fb) ? { fp: fb, name: 'loading.gif' } : null;
}

/**
 * Returns an attachment URL string (attachment://name.gif) for embed.setImage(),
 * paired with the AttachmentBuilder you must include in `files: [...]`.
 *   const { url, file } = pickGifAttachment('slots','win');
 *   embed.setImage(url);
 *   await reply({ embeds:[embed], files:[file] });
 */
function pickGifAttachment(game, state) {
  const r = _resolveFile(game, state);
  if (!r) return null;
  const file = new AttachmentBuilder(r.fp, { name: r.name });
  return { url: `attachment://${r.name}`, file, name: r.name };
}

// Backwards-compatible signature used by older code paths.
// Returns just the attachment:// url; caller is responsible for adding the file.
// If you need the file too, use pickGifAttachment.
function pickGif(game, state) {
  const r = _resolveFile(game, state);
  return r ? `attachment://${r.name}` : null;
}

module.exports = { pickGif, pickGifAttachment, MAP, GIF_DIR };
