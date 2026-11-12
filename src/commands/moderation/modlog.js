const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { canAct, ensureMod, resolveTarget, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['سجل', 'عقوبات', 'سجل_العقوبات'],
  requiredPermissions: [FLAGS.ModerateMembers],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('modlog')
    .setDescription('🛡️ سجل العقوبات — عرض الحالات أو ضبط قناة السجل')
    .addSubcommand(s => s.setName('view').setDescription('عرض آخر العقوبات')
      .addUserOption(o => o.setName('user').setDescription('تصفية بحسب عضو'))
      .addIntegerOption(o => o.setName('page').setDescription('رقم الصفحة').setMinValue(1)))
    .addSubcommand(s => s.setName('channel').setDescription('ضبط قناة سجل العقوبات')
      .addChannelOption(o => o.setName('channel').setDescription('القناة').setRequired(true))),
  async execute(interaction) {
    const check = canAct(interaction, { perm: FLAGS.ModerateMembers, needTarget: false });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });

    const sub = interaction.options?.getSubcommand?.(false) || 'view';

    if (sub === 'channel') {
      const chan = interaction.options?.getChannel?.('channel') || interaction.mentions?.channels?.first?.() || null;
      if (!chan?.isTextBased?.()) return interaction.reply({ content: '❌ حدّد قناة نصية.', ephemeral: true });
      const g = readGuild(interaction.guild.id);
      ensureMod(g).channelId = chan.id;
      writeGuild(interaction.guild.id, g);
      return interaction.reply({ content: `✅ تم ضبط قناة سجل العقوبات: ${chan} — كل عقوبة جديدة سترسل ببطاقة مرسومة.` });
    }

    // العرض
    const target = await resolveTarget(interaction);
    const userId = target?.id || null;
    const g = readGuild(interaction.guild.id);
    let cases = g.mod?.cases || [];
    if (userId) cases = cases.filter((c) => c.userId === userId);
    if (!cases.length) return interaction.reply({ content: userId ? '✅ لا عقوبات مسجلة لهذا العضو.' : '✅ سجل العقوبات فارغ.', ephemeral: true });

    const per = 10;
    const page = Math.max(1, interaction.options?.getInteger?.('page') || 1);
    const pages = Math.ceil(cases.length / per);
    const slice = cases.slice(-per * page).slice(0, per).reverse();
    const lines = slice.map((c) =>
      `**#${c.id}** \`${c.type}\` — **${c.userTag}**\n> بواسطة ${c.modTag} • ${c.reason} • <t:${Math.floor(c.at / 1000)}:R>`);

    const embed = new EmbedBuilder()
      .setTitle(`🛡️ سجل العقوبات${userId ? ` — ${target?.displayName || ''}` : ''}`)
      .setDescription(lines.join('\n\n'))
      .setColor(0x8E6CFF)
      .setFooter({ text: `الصفحة ${page}/${pages} • ${cases.length} حالة${g.mod?.channelId ? '' : ' • لم تُضبط قناة السجل بعد: سجل قناة #القناة'}` });
    await interaction.reply({ embeds: [embed], ephemeral: !!userId });
  }
};
