const { SlashCommandBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { canAct, resolveTarget, targetName, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['مسح_تحذيرات'],
  requiredPermissions: [FLAGS.ModerateMembers],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('clearwarns')
    .setDescription('🧹 مسح تحذيرات عضو')
    .addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true)),
  async execute(interaction) {
    const check = canAct(interaction, { perm: FLAGS.ModerateMembers, needTarget: false });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });
    const target = await resolveTarget(interaction);
    if (!target?.id) return interaction.reply({ content: '❌ حدّد العضو.', ephemeral: true });

    const g = readGuild(interaction.guild.id);
    const count = (g.mod?.warns?.[target.id] || []).length;
    if (g.mod?.warns) delete g.mod.warns[target.id];
    writeGuild(interaction.guild.id, g);
    await interaction.reply({ content: `🧹 تم مسح **${count}** تحذير/تحذيرات لـ **${targetName(target)}**.` });
  }
};
