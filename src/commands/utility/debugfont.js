const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { renderFarmCard } = require('../../utils/imageRenderer');

module.exports = {
  aliases: ['debugfont', 'فحص_الخط', 'dbgf'],
  data: new SlashCommandBuilder()
    .setName('debugfont')
    .setDescription('Debug command to test Arabic font rendering'),
  ownerOnly: true,
  async execute(interaction) {
    await interaction.deferReply();
    
    try {
      const data = {
        username: 'Sami Charrak سامي شراق',
        balance: 1234567,
        planted: [
          { type: 'carrots', readyAt: Date.now() - 1000 },
          { type: 'wheat', readyAt: Date.now() + 100000 }
        ],
        crops: {
          carrots: { emoji: '🥕', name: 'جزر' },
          wheat: { emoji: '🌾', name: 'قمح' }
        }
      };
      
      const result = await renderFarmCard(data);
      if (!result) throw new Error('Render failed');
      
      const attachment = new AttachmentBuilder(result.buffer, { name: 'debug.png' });
      await interaction.editReply({ content: '✅ Test rendering result:', files: [attachment] });
    } catch (err) {
      await interaction.editReply(`❌ Render failed: ${err.message}`);
    }
  }
};
