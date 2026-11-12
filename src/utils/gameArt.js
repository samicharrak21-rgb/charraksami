// 🖼️ gameArt v23 — صورة غلاف لكل لعبة (assets/games) + صورة مصغّرة ثابتة طوال اللعبة
// - كل لعبة لها صورة عريضة (خلفية البطاقات المرسومة) ومربعة (thumbnail في الإمبد)
// - decorate(interaction, game): يضيف الصورة المصغّرة تلقائياً لكل رد/تعديل بدون تعديل كود اللعبة
// - أول رد يرفع الملف، وبعدها يُعاد استخدام رابط CDN نفسه (لا رفع مكرر ولا اختفاء للصورة)
const path = require('path');
const fs = require('fs');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');

const DIR = path.resolve(__dirname, '../../assets/games');
const THUMBS = path.join(DIR, 'thumbs');
const SUFFIX = '-art.jpg';

/** كل الألعاب التي لها صورة — المفتاح = اسم الملف */
const GAMES = [
  'slots', 'roulette', 'blackjack', 'coinflip', 'rps', 'dice', 'fish', 'tictactoe', 'connect4',
  'hangman', 'wordle', 'trivia', 'minesweeper', 'guess', 'race', 'highlow', 'scratch', 'crash',
  'treasure', 'wheel', 'group', 'social',
];

const has = (game) => !!game && fs.existsSync(path.join(DIR, `${game}.jpg`));
const widePath = (game) => (has(game) ? path.join(DIR, `${game}.jpg`) : null);
const thumbPath = (game) => {
  const p = path.join(THUMBS, `${game}.jpg`);
  return fs.existsSync(p) ? p : widePath(game);
};

/** ملف الصورة المربعة كمرفق: { file, name, url } */
function thumb(game) {
  const p = thumbPath(game);
  if (!p) return null;
  const name = `${game}${SUFFIX}`;
  return { file: new AttachmentBuilder(p, { name }), name, url: `attachment://${name}` };
}
/** ملف الصورة العريضة كمرفق (للبطاقات الترحيبية) */
function wide(game) {
  const p = widePath(game);
  if (!p) return null;
  const name = `${game}-cover.jpg`;
  return { file: new AttachmentBuilder(p, { name }), name, url: `attachment://${name}` };
}

/** هل الرابط صورة لعبة رفعناها سابقاً؟ يعيد اسم اللعبة */
function gameFromUrl(url) {
  const m = String(url || '').match(/\/([a-z0-9]+)-art\.jpg/i);
  return m && GAMES.includes(m[1]) ? m[1] : null;
}

const toData = (e) => (e && typeof e.toJSON === 'function' ? e.toJSON() : e);

/**
 * يلف دوال الرد في التفاعل لإضافة صورة اللعبة المصغّرة تلقائياً لأول إمبد.
 * يعمل مع أوامر السلاش، الأوامر النصية (textShim)، والأزرار داخل اللعبة.
 */
function decorate(interaction, game, { cdnUrl = null } = {}) {
  if (!interaction || !has(game) || interaction.__gameArt) return interaction;
  const state = { url: cdnUrl };
  interaction.__gameArt = state;

  const patch = (payload) => {
    if (!payload || typeof payload !== 'object' || payload.ephemeral) return { payload, attached: false };
    const embeds = Array.isArray(payload.embeds) ? payload.embeds : null;
    if (!embeds || !embeds.length) return { payload, attached: false };
    const first = toData(embeds[0]);
    if (!first || first.thumbnail?.url) return { payload, attached: false };
    // رسائل الأخطاء الحمراء بدون صورة (تبقى نظيفة)
    if (first.color === 0xE8455F || first.color === 0xE8455F) return { payload, attached: false };
    const clearing = Array.isArray(payload.attachments);
    let url = state.url;
    let files = Array.isArray(payload.files) ? [...payload.files] : [];
    let attached = false;
    if (!url || clearing) {
      const t = thumb(game);
      if (!t) return { payload, attached: false };
      if (!files.some((f) => (f?.name || f?.attachment?.name) === t.name)) files.push(t.file);
      url = t.url; attached = true;
    }
    const e0 = new EmbedBuilder(first).setThumbnail(url);
    return { payload: { ...payload, embeds: [e0, ...embeds.slice(1)], files }, attached };
  };

  const remember = async (res) => {
    try {
      let msg = res && res.embeds ? res : null;
      if (!msg && typeof interaction.fetchReply === 'function') msg = await interaction.fetchReply().catch(() => null);
      const u = msg?.embeds?.[0]?.thumbnail?.url;
      if (u && /^https?:/.test(u)) state.url = u;
    } catch {}
  };

  for (const fn of ['reply', 'editReply', 'update']) {
    const orig = interaction[fn];
    if (typeof orig !== 'function') continue;
    interaction[fn] = async function wrapped(payload, ...rest) {
      if (typeof payload === 'string') payload = { content: payload };
      const { payload: p, attached } = patch(payload);
      const res = await orig.call(this, p, ...rest);
      if (attached) await remember(res);
      return res;
    };
  }
  return interaction;
}

/** لأزرار داخل الرسائل: لو الرسالة فيها صورة لعبة، نكمل بنفس الصورة */
function decorateFromMessage(interaction) {
  try {
    const url = interaction?.message?.embeds?.[0]?.thumbnail?.url;
    const game = gameFromUrl(url);
    if (game) decorate(interaction, game, { cdnUrl: url });
  } catch {}
  return interaction;
}

module.exports = { GAMES, DIR, has, widePath, thumbPath, thumb, wide, decorate, decorateFromMessage, gameFromUrl };
