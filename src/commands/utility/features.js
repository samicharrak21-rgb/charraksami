const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createStyledEmbed, COLORS } = require('../../utils/embeds');

module.exports = {
  name: 'features',
  aliases: ['مميزات', 'مزايا'],
  description: 'عرض شامل لمميزات وأوامر البوت',
  data: new SlashCommandBuilder()
    .setName('features')
    .setDescription('عرض شامل لمميزات وأوامر البوت'),
  
  async execute(interaction) {
    // Handle both Slash Commands and Prefix/Text Commands
    const isSlash = interaction.isChatInputCommand?.() || typeof interaction.reply === 'function' && interaction.commandName;
    const user = isSlash ? interaction.user : interaction.author;
    
    // Create a base for createStyledEmbed that works for both
    const embed = createStyledEmbed(interaction, '🌟 دليل مميزات وأوامر طاهر (Taher)', COLORS.primary)
      .setDescription('مرحباً بك! هنا تجد دليلاً شاملاً لكل ما يقدمه البوت لتجربة ممتعة ومنظمة في سيرفرك.')
      .setThumbnail(interaction.client.user.displayAvatarURL())
      .addFields(
        { 
          name: '🎮 ألعاب الكازينو (Casino)', 
          value: '• `روليت` (roulette): لعبة الحظ الشهيرة\n• `سلوتس` (slots): جرب حظك في الماكينة\n• `بلاك` (blackjack): لعبة الورق الاستراتيجية\n• `ايموجي` (emoji): خمن الإيموجي الصحيح\n• `خمن` (guess): خمن الرقم المفقود\n• `سباق` (race): سباق الحيوانات المثير\n• `حجرة` (rps): حجرة ورقة مقص\n• `ترتيب` (sort): رتب الحروف المبعثرة',
          inline: false 
        },
        { 
          name: '⚔️ مغامرات الـ RPG', 
          value: '• `دانجن` (dungeon): استكشف السراديب واهزم الوحوش\n• `مزرعة` (farm): اهتم بمحاصيلك واحصد الجوائز\n• `بروفايل` (rank): عرض بطاقة مستواك وXP الخاص بك\n• `متصدرين` (leaderboard): قائمة أقوى الأعضاء في السيرفر',
          inline: false 
        },
        { 
          name: '💰 النظام المالي (Economy)', 
          value: '• `فلوس` (balance): تفقد رصيدك من الجواهر\n• `عمل` (work): احصل على جواهر مقابل عملك\n• `يومي` (daily): استلم هديتك اليومية\n• `دفع` (pay): حول الجواهر للأعضاء الآخرين\n• `متجر` (shop): اشترِ أدوات ومعدات نادرة',
          inline: false 
        },
        { 
          name: '🛠️ أدوات وخدمات (Utility)', 
          value: '• `افك` (afk): وضع الغياب (يختفي التنبيه تلقائياً)\n• `الوان` (colors): اختر لوناً مميزاً لاسمك\n• `اذكار` (adhkar): أذكار وأدعية بتصميم جميل 💚\n• `تذكرة` (ticket): افتح تذكرة دعم فني\n• `شوو` (shh): نظام متابعة الأخبار والميمز تلقائياً\n• `اوامر` (help): قائمة الأوامر التفصيلية',
          inline: false 
        },
        { 
          name: '📜 مميزات تلقائية', 
          value: '• نظام ترحيب **Panthom Base** الفاخر\n• نظام مستويات وXP متطور\n• ردود تلقائية ذكية (السلام، منور، إلخ)\n• حماية متطورة من الرسائل المكررة',
          inline: false 
        }
      )
      .setFooter({ text: '💡 الاختصارات المتاحة: مميزات، مزايا | البوت يدعم الأوامر بدون بادئة (!)' });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('features_games')
        .setLabel('قسم الألعاب')
        .setEmoji('🎮')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('features_economy')
        .setLabel('قسم الاقتصاد')
        .setEmoji('💰')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('features_utility')
        .setLabel('قسم الخدمات')
        .setEmoji('🛠️')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({ embeds: [embed], components: [row] });
  }
};
