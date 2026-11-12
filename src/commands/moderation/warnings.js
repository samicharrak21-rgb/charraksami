const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readGuild } = require('../../utils/guildStorage');
const { canAct, resolveTarget, targetName, FLAGS } = require('../../utils/modUtils');

module.exports = {
  aliases: ['تحذيرات', 'انذارات'],
  requiredPermissions: [FLAGS.ModerateMembers],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('📋 عرض تحذيرات عضو')
    .addUserOption(o => o.setName('user').setDescription('العضو (افتراضياً أنت)')),
  async execute(interaction) {
    const check = canAct(interaction, { perm: FLAGS.ModerateMembers, needTarget: false });
    if (!check.ok) return interaction.reply({ content: check.msg, ephemeral: true });

    const target = await resolveTarget(interaction);
    const userId = target?.id || interaction.user.id;
    const name = target ? targetName(target) : interaction.user.username;

    const g = readGuild(interaction.guild.id);
    const warns = (g.mod?.warns?.[userId]) || [];
    if (!warns.length) return interaction.reply({ content: `✅ **${name}** نظيف — لا تحذيرات.`, ephemeral: true });

    const list = warns.slice(-10).reverse().map((w) =>
      `**#${w.id}** • ${w.reason}\n> بواسطة <@${w.by}> — <t:${Math.floor(w.at / 1000)}:R>`);
    const embed = new EmbedBuilder()
      .setTitle(`⚠️ تحذيرات ${name} (${warns.length})`)
      .setDescription(list.join('\n\n'))
      .setColor(0xFFD76A)
      .setFooter({ text: '3 تحذيرات = إسكات ساعة • 5 تحذيرات = إسكات يوم' });
    await interaction.reply({ embeds: [embed] });
  }
};
