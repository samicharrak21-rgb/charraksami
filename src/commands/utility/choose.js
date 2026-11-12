// 🎯 اختيار عشوائي بين خيارات
const { SlashCommandBuilder } = require('discord.js');
const kit = require('../../utils/cardKit');
const { AttachmentBuilder } = require('discord.js');

module.exports = {
  aliases: ['اختار', 'اختر', 'قرعه'],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('🎯 اختيار عشوائي بين خيارين أو أكثر')
    .addStringOption(o => o.setName('options').setDescription('الخيارات مفصولة بـ «او»').setRequired(true).setMaxLength(200)),
  async execute(interaction) {
    let raw = interaction.options?.getString?.('options') || '';
    // الشات: «اختار شاي او قهوة» — تجاهل كلمة «او» الزائدة في الوسائط
    const args = interaction.options?._args || [];
    if (interaction.isMessage?.() && args.length) raw = args.join(' ').replace(/\s+او\s+/g, ' | ').replace(/\s+أو\s+/g, ' | ');
    const parts = String(raw).split(/\s*(?:\||او|أو)\s*/).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) return interaction.reply({ content: '❌ اكتب خيارين على الأقل. مثال: `اختار شاي او قهوة`', ephemeral: true });

    const pick = parts[Math.floor(Math.random() * parts.length)];
    const username = interaction.member?.displayName || interaction.user.username;
    const avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });

    try {
      const card = await kit.gameResultCard({
        game: 'اختيار عشوائي',
        outcome: 'win',
        title: pick.slice(0, 40),
        subtitle: `من بين: ${parts.join(' · ')}`.slice(0, 80),
        username, avatarURL,
        icon: '🎯', bg: 'casino',
      });
      if (card?.buffer) {
        return interaction.reply({ files: [new AttachmentBuilder(card.buffer, { name: 'choose.png' })] });
      }
    } catch {}
    await interaction.reply({ content: `🎯 **${username}** اخترت لك: **${pick}** (من بين ${parts.length} خيارات)` });
  }
};
