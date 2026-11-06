const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { COLORS, createStyledEmbed } = require('../../utils/embeds');

const GAMES = [
  { name: 'راتب', cmd: 'daily', cooldown: '20 ساعة' },
  { name: 'عمل', cmd: 'work', cooldown: '10 دقائق' },
  { name: 'حجرة', cmd: 'rps', cooldown: 'ساعة واحدة' },
  { name: 'روليت', cmd: 'roulette', cooldown: 'ساعة واحدة' },
  { name: 'صيد', cmd: 'fish', cooldown: 'ساعة واحدة' },
  { name: 'بلاك جاك', cmd: 'blackjack', cooldown: 'ساعة واحدة' },
  { name: 'سلوتس', cmd: 'slots', cooldown: 'ساعة واحدة' },
  { name: 'هدية يومية', cmd: 'daily', cooldown: '24 ساعة' },
  { name: 'مزرعة', cmd: 'farm', cooldown: 'ساعة واحدة' },
  { name: 'متجر', cmd: 'shop', cooldown: 'تفاعلي' },
  { name: 'دانجون', cmd: 'dungeon', cooldown: 'ساعة واحدة' }
];

module.exports = {
  aliases: ['العاب', 'الألعاب', 'معلومات_الألعاب', 'معلومات_الالعاب'],
  data: new SlashCommandBuilder()
    .setName('gamesinfo')
    .setDescription('🎮 معلومات الألعاب المتاحة والمهلات'),
  async execute(interaction) {
    const lines = GAMES.map(g => `- ${g.name} • الأمر: \`/${g.cmd}\` • المهلة: ${g.cooldown}`);
    const embed = createStyledEmbed(interaction, '🎮 الألعاب المتاحة', COLORS.info)
      .setDescription(lines.join('\n'));
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
