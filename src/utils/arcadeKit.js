// 🧰 arcadeKit v23 — أدوات مشتركة للألعاب الجديدة
const { AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const H = require('./gameHelpers');

const who = (interaction) => ({
  username: interaction.member?.displayName || interaction.user.globalName || interaction.user.username,
  avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
});

/** يضيف بطاقة مرسومة للإمبد ويعيد payload جاهز (يستبدل المرفقات القديمة) */
function withCard(embed, card, extra = {}) {
  if (!card?.buffer) return { embeds: [embed], ...extra };
  embed.setImage(`attachment://${card.name}`);
  return { embeds: [embed], files: [new AttachmentBuilder(card.buffer, { name: card.name })], attachments: [], ...extra };
}
async function safeCard(fn) { try { return await fn(); } catch (e) { return null; } }

/** يعيد قراءة المستخدم من التخزين، يطبّق التعديل ثم يحفظ (يتجنب الكتابة فوق تغييرات حدثت أثناء اللعبة) */
function settle(guildId, userId, delta, stats = {}) {
  const { g, u } = H.getUser(guildId, userId);
  u.balance = Math.max(0, (Number(u.balance) || 0) + delta);
  for (const [k, v] of Object.entries(stats)) H.bumpStat(u, k, v);
  H.saveUser(guildId, g);
  return u;
}

function againRow(customId, label = '🔁 جولة أخرى', extra = []) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(ButtonStyle.Primary), ...extra);
}
const btn = (id, label, style = ButtonStyle.Secondary, disabled = false, emoji) => {
  const b = new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setDisabled(disabled);
  if (emoji) b.setEmoji(emoji);
  return b;
};
const notYours = (i) => i.reply({ content: '❌ هذه اللعبة ليست لك — ابدأ لعبتك الخاصة.', ephemeral: true }).catch(() => {});

module.exports = { who, withCard, safeCard, settle, againRow, btn, notYours, ButtonStyle, ActionRowBuilder };
