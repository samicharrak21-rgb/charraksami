// 💬 /social — أسئلة السهرة: صراحة · جرأة · لو خيروك · لغز · نكتة · حكمة · كت تويت
const { SlashCommandBuilder } = require('discord.js');
const tod = require('../../data/tod');
const S = require('../../data/social');
const { brandedEmbed, safeReply } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');
const K = require('../../utils/arcadeKit');
const cards = require('../../utils/arcadeCards');

const norm = (t) => String(t || '').trim().toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
const rand = (arr) => Math.floor(Math.random() * arr.length);

const TYPES = {
  truth:  { label: 'صراحة', icon: '🗣️', theme: 'azure',   color: COLORS.info,    list: () => [...tod.truth, ...S.truthExtra], words: ['صراحه', 'صراحة', 'truth', 'صدق'] },
  dare:   { label: 'جرأة',  icon: '🔥', theme: 'crimson', color: COLORS.error,   list: () => [...tod.dare, ...S.dareExtra], words: ['جراه', 'جرأه', 'جرأة', 'جراة', 'dare', 'تحدي_جرأه'] },
  wyr:    { label: 'لو خيروك', icon: '🤔', theme: 'violet', color: COLORS.phantom, list: () => S.wyr, words: ['خيروك', 'لوخيروك', 'wyr', 'خيرني'] },
  riddle: { label: 'لغز',   icon: '🧩', theme: 'emerald', color: COLORS.success, list: () => S.riddles, words: ['لغز', 'الغاز', 'حزوره', 'فزوره', 'riddle'] },
  joke:   { label: 'نكتة',  icon: '😂', theme: 'amber',   color: COLORS.warning, list: () => S.jokes, words: ['نكته', 'نكتة', 'نكت', 'ضحكني', 'joke'] },
  wisdom: { label: 'حكمة',  icon: '📜', theme: 'gold',    color: COLORS.gold,    list: () => S.wisdom, words: ['حكمه', 'حكمة', 'حكم', 'مثل', 'امثال', 'wisdom'] },
  kt:     { label: 'كت تويت', icon: '💭', theme: 'rose',  color: COLORS.rose,    list: () => S.kt, words: ['كت', 'كتويت', 'كت_تويت', 'سؤال_عشوائي', 'kt'] },
};
const typeFromWord = (w) => {
  const n = norm(w);
  return Object.keys(TYPES).find((k) => TYPES[k].words.some((x) => norm(x) === n)) || null;
};

function build(type, idx) {
  const T = TYPES[type];
  const list = T.list();
  const i = Number.isInteger(idx) && list[idx] ? idx : rand(list);
  const item = list[i];
  let text = item, extra = null, desc = item;
  if (type === 'wyr') { text = `لو خيروك بين: ${item[0]}، أو ${item[1]}؟`.replace(/\?$/, '؟'); extra = `🅰️ ${item[0]}   ·   🅱️ ${item[1]}`; desc = `🅰️ **${item[0]}**\n🅱️ **${item[1]}**\n\nصوّت بالتفاعل 👇`; }
  if (type === 'riddle') { text = item[0]; desc = `**${item[0]}**\n\n||💡 الجواب: ${item[1]}||`; }
  return { T, i, text, extra, desc };
}

async function render(interaction, type, idx) {
  const { T, i, text, extra, desc } = build(type, idx);
  const e = brandedEmbed(interaction, `${T.icon} ${T.label}`, T.color).setDescription(desc);
  const card = await K.safeCard(() => cards.socialCard({ kind: T.label, icon: T.icon, text, extra, theme: T.theme, ...K.who(interaction) }));
  const row = new K.ActionRowBuilder().addComponents(
    K.btn(`social_next_${type}`, `${T.label} أخرى`, K.ButtonStyle.Primary, false, '🔁'),
    K.btn(`social_next_${type === 'truth' ? 'dare' : 'truth'}`, type === 'truth' ? 'جرأة' : 'صراحة', K.ButtonStyle.Secondary, false, type === 'truth' ? '🔥' : '🗣️'),
  );
  return { payload: K.withCard(e, card, { components: [row] }), index: i };
}

module.exports = {
  aliases: ['صراحه', 'جرأه', 'لغز', 'نكته', 'حكمه', 'كت', 'خيروك'],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('social')
    .setDescription('💬 أسئلة السهرة: صراحة، جرأة، لو خيروك، لغز، نكتة، حكمة، كت تويت')
    .addStringOption((o) => o.setName('type').setDescription('النوع').setRequired(false)
      .addChoices(...Object.entries(TYPES).map(([value, t]) => ({ name: `${t.icon} ${t.label}`, value })))),
  TYPES,
  typeFromWord,
  build,

  async execute(interaction) {
    let type = null;
    const m = interaction.customId?.match(/^social_next_(\w+)$/);
    if (m) type = m[1];
    else if (interaction._originalMessage) {
      const words = interaction._originalMessage.content.trim().split(/\s+/);
      type = typeFromWord(words[0]) || typeFromWord(words[1]) || (norm(words[0]) === 'لو' && norm(words[1]) === 'خيروك' ? 'wyr' : null) || typeFromWord(`${words[0]}${words[1] || ''}`);
      if (!type && norm(words[0]) === 'كت') type = 'kt';
    } else type = interaction.options?.getString?.('type');
    if (!TYPES[type]) type = Object.keys(TYPES)[rand(Object.keys(TYPES))];
    const { payload } = await render(interaction, type);
    const sent = await safeReply(interaction, payload);
    if (type === 'wyr' && sent?.react && !interaction.isButton?.()) { await sent.react('🅰️').catch(() => {}); await sent.react('🅱️').catch(() => {}); }
  },
};
