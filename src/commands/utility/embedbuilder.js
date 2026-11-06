const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
  aliases: ['تصميم', 'قالب', 'قوالب', 'embed'],
  data: new SlashCommandBuilder()
    .setName('embedbuilder')
    .setDescription('🎨 منشئ الإمبد المتقدم - صمم رسائلك باحترافية'),
  async execute(interaction) {
    const modal = new ModalBuilder()
      .setCustomId('embedbuilder_modal')
      .setTitle('🎨 منشئ الإمبد المتقدم');

    const titleInput = new TextInputBuilder()
      .setCustomId('title')
      .setLabel('العنوان (Title)')
      .setPlaceholder('اكتب عنوان الرسالة هنا...')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const descInput = new TextInputBuilder()
      .setCustomId('description')
      .setLabel('الوصف (Description)')
      .setPlaceholder('اكتب محتوى الرسالة هنا... يمكنك استخدام المتغيرات {user}, {server} الخ')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const colorInput = new TextInputBuilder()
      .setCustomId('color')
      .setLabel('اللون (Color Hex)')
      .setPlaceholder('#5865F2')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const imageInput = new TextInputBuilder()
      .setCustomId('image')
      .setLabel('رابط الصورة (Image URL)')
      .setPlaceholder('https://example.com/image.png')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    const footerInput = new TextInputBuilder()
      .setCustomId('footer')
      .setLabel('التذييل (Footer text)')
      .setPlaceholder('نص صغير يظهر أسفل الرسالة')
      .setStyle(TextInputStyle.Short)
      .setRequired(false);

    // Discord limits modals to 5 ActionRows (each with 1 text input)
    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(descInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(imageInput),
      new ActionRowBuilder().addComponents(footerInput)
    );

    await interaction.showModal(modal);
  }
};
