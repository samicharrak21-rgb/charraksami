const { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const { readGuild } = require('../../utils/guildStorage');
const { doPrestige, canPrestige } = require('../../systems/levels');
const { COLORS, createStyledEmbed } = require('../../utils/embeds');

module.exports = {
  aliases: ['بريستيج', 'تطوير', 'prestige'],
  data: new SlashCommandBuilder()
    .setName('prestige')
    .setDescription('⭐ نظام البريستيج - أعد تعيين مستواك لتحصل على مكافآت دائمة'),
  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const g = readGuild(guildId);
    
    // Check XP Data for prestige eligibility
    const xpData = g.users?.[userId] || { xp: 0, level: 1, prestige: 0 };
    
    if (!canPrestige(g, xpData)) {
      const thresholdXP = g.prestige?.thresholdXP;
      const reasonTxt = thresholdXP ? `تحتاج للوصول إلى **${thresholdXP} XP** على الأقل.` : `اجمع بعض نقاط الخبرة (XP) أولاً.`;
      return interaction.reply({ 
        content: `❌ غير مؤهل للبريستيج حالياً.\n${reasonTxt}`, 
        ephemeral: true 
      });
    }

    const prestigeEmbed = createStyledEmbed(interaction, '⭐ تأكيد نظام البريستيج الأسطوري', COLORS.gold)
      .setDescription(`هل أنت مستعد للتضحية بكل خبرتك الحالية مقابل قوة دائمة؟\n\n**ما سيحدث:**\n- سيتم تصفير مستواك إلى **1**.\n- سيتم تصفير خبرتك (XP) الحالية.\n- ستحصل على **+1 بريستيج**.\n- ستحصل على شعار خاص في بطاقة مستواك.\n- ستزداد نسبة كسب الجواهر لديك بشكل دائم!`)
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3112/3112946.png')
      .setFooter({ text: 'هذا الإجراء لا يمكن التراجع عنه!' });

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`prestige_confirm_${userId}`).setLabel('تأكيد البريستيج ⭐').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`prestige_cancel_${userId}`).setLabel('تراجع 🚪').setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.reply({ embeds: [prestigeEmbed], components: [confirmRow], fetchReply: true });

    const filter = i => i.user.id === userId && i.customId.startsWith('prestige_');
    const collector = msg.createMessageComponentCollector({ filter, time: 60000, max: 1 });

    collector.on('collect', async i => {
      if (i.customId === `prestige_confirm_${userId}`) {
        const res = doPrestige(guildId, userId);
        if (res.ok) {
          await i.update({ 
            content: `🎊 **مبارك لك!** لقد صعدت لمستوى بريستيج جديد: **${res.prestige}**.\nعد الآن وابدأ رحلتك من جديد بقوة أكبر!`, 
            embeds: [], 
            components: [] 
          });
        } else {
          await i.update({ content: `❌ فشل البريستيج: ${res.reason}`, embeds: [], components: [] });
        }
      } else {
        await i.update({ content: '🏠 قررت التراجع والبقاء في مستواك الحالي.', embeds: [], components: [] });
      }
    });
    
    collector.on('end', async (collected) => {
      if (collected.size === 0) {
        try {
          await msg.edit({ content: '⌛ انتهى الوقت دون تأكيد.', embeds: [], components: [] });
        } catch {}
      }
    });
  }
};
