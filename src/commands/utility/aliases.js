const { SlashCommandBuilder } = require('discord.js');
const { COLORS, DESIGN, createStyledEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('aliases')
    .setDescription('📚 عرض الاختصارات العربية للأوامر بدون سلاش'),
  async execute(interaction) {
    const embed = createStyledEmbed(interaction, '📚 الاختصارات العربية للأوامر', COLORS.royal)
      .setDescription('يمكنك استخدام هذه الكلمات مباشرة بدون `/` لتشغيل الأوامر!')
      .addFields(
        { 
          name: '🎮 ألعاب وRPG', 
          value: [
            '`العاب` `ألعاب` `gamesinfo` → عرض الألعاب',
            '`مزرعة` `زرع` `حصاد` → المزرعة',
            '`دانجون` `دانجن` `مغامرة` `dg` → الدانجون',
            '`دودة` `ثعبان` → لعبة الثعبان',
            '`ذاكرة` → لعبة الذاكرة',
            '`الغام` `ألغام` `كنس` → الألغام',
            '`سباق` `حيوانات` → السباق',
            '`بلاك` `بلاكجاك` → بلاك جاك',
            '`سلوتس` `قمار` → السلوتس',
            '`تحدي` → تحدي مستخدم',
            '`صيد` `سمك` → الصيد',
            '`تود` `صراحة` `حقيقة` → صراحة أو جرأة',
          ].join('\n'), 
          inline: false 
        },
        { 
          name: '💰 الاقتصاد', 
          value: [
            '`رصيد` `فلوس` `جواهر` → الرصيد',
            '`يومي` `راتب` `هدية` → الهدية اليومية',
            '`عمل` `شغل` → العمل',
            '`متجر` `سوق` → المتجر',
            '`دفع` `تحويل` → تحويل جواهر',
            '`سرقة` `اسرق` → السرقة',
            '`بريستيج` → الـ Prestige',
          ].join('\n'), 
          inline: false 
        },
        { 
          name: '📊 المستويات والرتب', 
          value: [
            '`مستواي` `رتبتي` `بروفايل` → بطاقتي',
            '`توب` `متصدرين` → لوحة المتصدرين',
            '`رتب` → رتب المستويات (للأدمن)',
          ].join('\n'),
          inline: false 
        },
        { 
          name: '🕌 الروحانيات', 
          value: '`اذكار` `أذكار` `ذكر` → أذكار الصباح والمساء',
          inline: false 
        },
        { 
          name: '🛠️ أدوات عامة', 
          value: [
            '`افك` `AFK` → وضع الغياب',
            '`مساعدة` `اوامر` → قائمة الأوامر',
            '`بنق` `ping` → سرعة البوت',
            '`معلومات` → معلومات السيرفر',
            '`الوان` `ألوان` → ألوان الرتب',
            '`اخبار` `شبكات` `shh` → روابط المجتمع',
          ].join('\n'),
          inline: false 
        }
      )
      .setFooter({ text: `💡 استخدم الكلمة مباشرة في الشات وسيشتغل الأمر! • ${config.SERVER_NAME}` });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
