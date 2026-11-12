// 🕌 الأذكار v24 — بطاقات مصممة للصباح والمساء والنوم + أزرار تنقل + قناة تلقائية
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS, DESIGN, createStyledEmbed } = require('../../utils/embeds');
const { SETS, kindForHour } = require('../../data/adhkar');
const { cardMessage } = require('../../utils/cardEmbed');

const KIND_WORDS = { 'صباح': 'morning', 'الصباح': 'morning', 'مساء': 'evening', 'المساء': 'evening', 'نوم': 'sleep', 'النوم': 'sleep' };
const COLOR = { morning: 0xffb547, evening: 0x6d8bff, sleep: 0x8f7bff, general: 0x2fd69b };

/** يبني رسالة ذكر رقم i من نوع kind */
async function buildDhikr(kind, i, userId) {
  const set = SETS[kind] || SETS.general;
  const n = set.list.length;
  const idx = ((i % n) + n) % n;
  const d = set.list[idx];
  const nav = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`dhikr:${kind}:${idx - 1}:${userId}`).setLabel('السابق').setEmoji('➡️').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`dhikr:${kind}:${idx + 1}:${userId}`).setLabel('التالي').setEmoji('⬅️').setStyle(ButtonStyle.Primary),
  );
  const kinds = new ActionRowBuilder().addComponents(
    ...[['morning', '🌅', 'الصباح'], ['evening', '🌙', 'المساء'], ['sleep', '😴', 'النوم'], ['general', '📿', 'متنوعة']].map(([k, e, l]) =>
      new ButtonBuilder().setCustomId(`dhikr:${k}:0:${userId}`).setLabel(l).setEmoji(e).setStyle(k === kind ? ButtonStyle.Success : ButtonStyle.Secondary)),
  );
  try {
    const { adhkarCard } = require('../../utils/modernCards');
    const card = await adhkarCard({ title: set.title, text: d.text, count: d.count, source: d.source, virtue: d.virtue, kind, index: idx + 1, total: n });
    if (card?.buffer) return { ...cardMessage(card, { color: COLOR[kind] }), components: [nav, kinds], attachments: [] };
  } catch (e) { console.error('dhikr card:', e.message); }
  const e = new EmbedBuilder().setColor(COLOR[kind]).setTitle(`📿 ${set.title} (${idx + 1}/${n})`)
    .setDescription(`**${d.text}**\n\n🔁 ${d.count > 1 ? `${d.count} مرات` : 'مرة'}${d.virtue ? `\n✨ ${d.virtue}` : ''}${d.source ? `\n📖 ${d.source}` : ''}`);
  return { embeds: [e], components: [nav, kinds], files: [], attachments: [] };
}

module.exports = {
  aliases: ['اذكار', 'ذكر', 'adhkar', 'dhikr', 'اذكار_الصباح', 'اذكار_المساء', 'اذكار_النوم'],
  defaultSub: 'random',
  subAliases: { 'صباح': 'morning', 'الصباح': 'morning', 'مساء': 'evening', 'المساء': 'evening', 'نوم': 'sleep', 'النوم': 'sleep', 'عشوائي': 'random', 'قناه': 'channel', 'عرض': 'show' },
  gif: false,
  buildDhikr,
  data: new SlashCommandBuilder()
    .setName('adhkar')
    .setDescription('🕌 الأذكار ببطاقات مصممة — صباح، مساء، نوم')
    .addSubcommand((s) => s.setName('random').setDescription('📿 ذكر مناسب للوقت الحالي'))
    .addSubcommand((s) => s.setName('morning').setDescription('🌅 أذكار الصباح'))
    .addSubcommand((s) => s.setName('evening').setDescription('🌙 أذكار المساء'))
    .addSubcommand((s) => s.setName('sleep').setDescription('😴 أذكار النوم'))
    .addSubcommand((s) => s.setName('channel').setDescription('⚙️ تحديد قناة الأذكار التلقائية (للمشرفين)')
      .addChannelOption((o) => o.setName('channel').setDescription('القناة').setRequired(true).addChannelTypes(ChannelType.GuildText)))
    .addSubcommand((s) => s.setName('show').setDescription('📊 عرض قناة الأذكار الحالية')),

  async execute(interaction) {
    // أزرار التنقل
    if (interaction.isButton?.() && interaction.customId?.startsWith('dhikr:')) {
      const [, kind, i, owner] = interaction.customId.split(':');
      if (owner && owner !== interaction.user.id) {
        return interaction.reply({ ...(await buildDhikr(kind, Number(i) || 0, interaction.user.id)), ephemeral: true }).catch(() => {});
      }
      await interaction.deferUpdate().catch(() => {});
      return interaction.editReply(await buildDhikr(kind, Number(i) || 0, interaction.user.id)).catch(() => {});
    }

    const guildId = interaction.guildId;
    const g = readGuild(guildId);
    g.channels = g.channels || {};
    let sub = interaction.options?.getSubcommand(false) || 'random';
    // «اذكار الصباح» من الشات
    const word = (interaction.options?._args || [])[0];
    if (sub === 'random' && word && KIND_WORDS[word.replace(/[أإآ]/g, 'ا')]) sub = KIND_WORDS[word.replace(/[أإآ]/g, 'ا')];
    const trig = String(interaction.options?._trigger || '');
    if (sub === 'random') for (const [w, k] of Object.entries(KIND_WORDS)) if (trig.includes(w)) sub = k;

    if (['random', 'morning', 'evening', 'sleep'].includes(sub)) {
      const kind = sub === 'random' ? kindForHour((new Date().getUTCHours() + (Number(process.env.TZ_OFFSET) || 3)) % 24) : sub;
      const start = sub === 'random' ? Math.floor(Math.random() * SETS[kind].list.length) : 0;
      if (interaction.deferReply && !interaction.deferred && !interaction.replied) await interaction.deferReply().catch(() => {});
      return interaction.editReply(await buildDhikr(kind, start, interaction.user.id));
    }

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ هذه الإعدادات مخصصة للمشرفين فقط!', ephemeral: true });
    }
    const embed = createStyledEmbed(interaction, ' ', COLORS.primary);
    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      if (!channel) return interaction.reply({ content: '❌ منشن القناة: `اذكار قناة #القناة`', ephemeral: true });
      g.channels.adhkar = channel.id;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success).setTitle('✅ تم تحديد قناة الأذكار')
        .setDescription(`ستُرسل الأذكار تلقائياً إلى: ${channel}\n\n${DESIGN.arrow} ذكر مصمم كل 30 دقيقة مناسب لوقت اليوم.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    const ch = g.channels.adhkar ? `<#${g.channels.adhkar}>` : 'غير محددة';
    embed.setTitle('🕌 إعدادات الأذكار الحالية')
      .setDescription(`${DESIGN.bullet} القناة المحددة: ${ch}\n${DESIGN.bullet} الحالة: ${g.channels.adhkar ? '✅ تعمل' : '❌ معطلة'}`);
    return interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
