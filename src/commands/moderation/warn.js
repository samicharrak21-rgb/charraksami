const { SlashCommandBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { canAct, resolveTarget, targetName, logCase, ensureMod, dmPunishment, dmEmbed, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['تحذير', 'انذار'],
  requiredPermissions: [FLAGS.ModerateMembers],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('⚠️ تحذير عضو (3 تحذيرات = إسكات ساعة، 5 = إسكات يوم)')
    .addUserOption(o => o.setName('user').setDescription('العضو المراد تحذيره').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('سبب التحذير')),
  async execute(interaction) {
    const target = await resolveTarget(interaction);
    if (!target?.id) return interaction.reply({ content: '❌ حدّد العضو: منشن، أو رد على رسالته.', ephemeral: true });
    const check = canAct(interaction, { perm: FLAGS.ModerateMembers, targetMember: target.roles ? target : null });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });
    const reason = interaction.options?.getString?.('reason') || 'بدون سبب';
    const guildId = interaction.guild.id;

    const g = readGuild(guildId);
    const mod = ensureMod(g);
    mod.warns[target.id] = mod.warns[target.id] || [];
    mod.warns[target.id].push({ id: mod.warns[target.id].length + 1, reason, by: interaction.user.id, at: Date.now() });
    const count = mod.warns[target.id].length;
    writeGuild(guildId, g);

    await logCase(interaction, 'warn', target, `${reason} (التحذير #${count})`);
    await dmPunishment(target, dmEmbed('تحذير', interaction.guild.name, reason, `🔢 **عدد تحذيراتك:** ${count}/5`));

    // التصعيد التلقائي: 3 تحذيرات = إسكات ساعة، 5 = إسكات يوم
    let escalation = '';
    if (count >= 5 && count % 5 === 0) escalation = { min: 24 * 60, label: 'يوم كامل (5 تحذيرات)' };
    else if (count >= 3 && count % 3 === 0) escalation = { min: 60, label: 'ساعة (3 تحذيرات)' };
    if (escalation && target.manageable) {
      try {
        await target.timeout(escalation.min * 60 * 1000, `تصعيد تلقائي: ${count} تحذيرات`);
        await dmPunishment(target, dmEmbed(`إسكات ${escalation.label}`, interaction.guild.name, 'تجاوز عدد التحذيرات'));
        escalation = `\n🔇 **تصعيد تلقائي:** تم إسكاته ${escalation.label}`;
      } catch { escalation = ''; }
    } else escalation = '';

    await interaction.reply({ content: `⚠️ تم تحذير **${targetName(target)}** (${count}/5) | السبب: ${reason}${escalation}` });
  }
};
