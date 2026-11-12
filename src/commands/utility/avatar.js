const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  aliases: ['صوره', 'صورتي', 'افاتار', 'افتار'],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('🖼️ عرض صورة عضو')
    .addUserOption(o => o.setName('user').setDescription('العضو (افتراضياً أنت)')),
  async execute(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.user;
    const url = target.displayAvatarURL({ extension: 'png', size: 1024 });
    const embed = new EmbedBuilder()
      .setTitle(`🖼️ صورة ${target.username}`)
      .setImage(url)
      .setColor(0xE8B04A)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};
