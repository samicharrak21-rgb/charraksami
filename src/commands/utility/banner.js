const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  aliases: ['بنر', 'بانر', 'غلاف'],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription('🎨 عرض بنر عضو')
    .addUserOption(o => o.setName('user').setDescription('العضو (افتراضياً أنت)')),
  async execute(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.user;
    let user = target;
    try { user = await target.fetch(); } catch {}
    const url = user.bannerURL?.({ extension: 'png', size: 1024 });
    if (!url) {
      return interaction.reply({ content: `❌ **${target.username}** لا يملك بنراً مخصصاً.`, ephemeral: true });
    }
    const embed = new EmbedBuilder()
      .setTitle(`🎨 بنر ${user.username}`)
      .setImage(url)
      .setColor(0x8E6CFF)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};
