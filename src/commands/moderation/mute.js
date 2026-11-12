const { SlashCommandBuilder } = require('discord.js');
const { canAct, resolveTarget, targetName, logCase, dmPunishment, dmEmbed, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['كتم', 'اسكات', 'ميوت'],
  requiredPermissions: [FLAGS.ModerateMembers],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('🔇 إسكات عضو (Timeout)')
    .addUserOption(o => o.setName('user').setDescription('العضو المراد إسكاته').setRequired(true))
    .addIntegerOption(o => o.setName('minutes').setDescription('المدة بالدقائق (افتراضي 60)').setMinValue(1).setMaxValue(40320))
    .addStringOption(o => o.setName('reason').setDescription('السبب')),
  async execute(interaction) {
    const target = await resolveTarget(interaction);
    if (!target?.id || !target.manageable) return interaction.reply({ content: '❌ حدّد العضو: منشن، أو رد على رسالته.', ephemeral: true });
    const check = canAct(interaction, { perm: FLAGS.ModerateMembers, targetMember: target });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });

    const minutes = Math.min(40320, Math.max(1, interaction.options?.getInteger?.('minutes') || 60));
    const reason = interaction.options?.getString?.('reason') || 'بدون سبب';

    try {
      await dmPunishment(target, dmEmbed(`إسكات ${minutes} دقيقة`, interaction.guild.name, reason,
        `⏳ **المدة:** ${minutes} دقيقة`));
      await target.timeout(minutes * 60 * 1000, `${reason} | بواسطة ${interaction.user.tag}`);
    } catch (e) {
      return interaction.reply({ content: `❌ فشل الإسكات: ${e.message}`, ephemeral: true });
    }
    await logCase(interaction, 'mute', target, `${reason} (${minutes} دقيقة)`);
    await interaction.reply({ content: `🔇 تم إسكات **${targetName(target)}** لمدة **${minutes} دقيقة** | السبب: ${reason}` });
  }
};
