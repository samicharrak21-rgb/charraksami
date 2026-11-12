const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readGuild } = require('../../utils/guildStorage');
const { COLORS, createModernEmbed, createProgressBar, DESIGN } = require('../../utils/embeds');
const { calculateLevel } = require('../../systems/levels');

module.exports = {
  aliases: ['معلومات', 'info', 'me', 'id'],
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('👤 عرض معلوماتك الشخصية وإحصائياتك')
    .addUserOption(o => o.setName('user').setDescription('المستخدم المراد عرض معلوماته')),

  async execute(interaction) {
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
    const target = interaction.options.getUser('user') || interaction.user;
    const g = readGuild(interaction.guildId);
    
    const u = g.users?.[target.id];
    if (!u) {
      return interaction.editReply({ 
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.error)
            .setDescription(`${DESIGN.error} عذراً، لا يوجد سجل بيانات لهذا المستخدم في قاعدة البيانات حالياً.`)
        ] 
      });
    }

    const member = interaction.guild.members.cache.get(target.id);
    const display = member?.displayName || target.displayName || target.username;
    
    const currentLevel = u.level || 1;
    const currentXp = u.xp || 0;
    const nextLevelXp = currentLevel * 1000;
    const xpProgress = createProgressBar(currentXp % 1000, 1000, 12, 'modern');

    const embed = createModernEmbed(interaction, `👤 ملف التعريف: ${display}`, null, COLORS.cyan)
      .setAuthor({ name: display, iconURL: target.displayAvatarURL({ dynamic: true }) })
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: `${DESIGN.level} المستوى الحالي`, value: `**${currentLevel}**`, inline: true },
        { name: `${DESIGN.diamond} الرصيد المالي`, value: `**${(u.balance || 0).toLocaleString()}** جواهر`, inline: true },
        { name: `${DESIGN.shield} الفئة القتالية`, value: `**${u.rpg?.class || 'محارب'}**`, inline: true },
        { 
          name: `${DESIGN.star} التقدم للمستوى التالي`, 
          value: `**${(currentXp % 1000).toLocaleString()}** / **1,000** XP\n${xpProgress}`, 
          inline: false 
        },
        { 
          name: `${DESIGN.trophy} إحصائيات النشاط`, 
          value: `💬 الرسائل: \`${(u.stats?.messages_count || 0).toLocaleString()}\`\n💼 العمل: \`${(u.stats?.work_count || 0).toLocaleString()}\`\n🎰 السلوتس: \`${(u.stats?.slots_count || 0).toLocaleString()}\`\n🏰 الدانجون: \`${(u.stats?.dungeon_count || 0).toLocaleString()}\``, 
          inline: false 
        }
      )
      .setFooter({ text: `ID: ${target.id} • انضم: ${member?.joinedAt ? member.joinedAt.toLocaleDateString('ar-EG') : 'غير معروف'}` });

    return interaction.editReply({ embeds: [embed] });
  }
};
