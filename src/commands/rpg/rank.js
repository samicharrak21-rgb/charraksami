const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { readGuild } = require('../../utils/guildStorage');
const { renderProfileCard } = require('../../utils/imageRenderer');
const { xpForLevel } = require('../../systems/levels');

module.exports = {
  aliases: ['مستواي', 'رتبتي', 'بروفايل', 'rank'],
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('📊 عرض بطاقة مستواك وتقدمك')
    .addUserOption(option => 
      option.setName('user')
        .setDescription('المستخدم المراد عرض مستواه')),

  async execute(interaction) {
    if (typeof interaction.deferReply === 'function') {
      await interaction.deferReply().catch(() => {});
    }
    
    const target = (interaction.options?.getUser('user')) || (interaction.user || interaction.author);
    const guildId = interaction.guildId || interaction.guild?.id;
    const g = readGuild(guildId);
    
    const u = g.users?.[target.id] || { balance: 0, xp: 0, level: 1 };
    
    const currentLevel = u.level || 1;
    const currentXP = u.xp || 0;
    const xpAtCurrentLevel = xpForLevel(currentLevel);
    const xpAtNextLevel = xpForLevel(currentLevel + 1);
    
    const relativeXP = currentXP - xpAtCurrentLevel;
    const relativeNextXP = xpAtNextLevel - xpAtCurrentLevel;

    const { createProgressBar, createStyledEmbed, COLORS, DESIGN } = require('../../utils/embeds');
    
    try {
      const card = await renderProfileCard({
        username: target.username,
        level: currentLevel,
        xp: relativeXP,
        nextXP: relativeNextXP,
        balance: u.balance || 0,
        avatarURL: target.displayAvatarURL({ extension: 'png', size: 512 }),
        stats: u.stats || {},
        rpgClass: u.rpg?.class || 'محارب'
      });

      if (card && card.buffer) {
        return await interaction.editReply({ files: [new AttachmentBuilder(card.buffer, { name: 'rank.png' })] });
      }
    } catch (err) {
      console.error('Failed to render rank card:', err);
    }

    // Fallback to Embed if canvas fails
    const xpProgress = createProgressBar(relativeXP, relativeNextXP);
    const embed = createStyledEmbed(interaction, '📊 بطاقة المستوى الشخصية', COLORS.primary)
      .setAuthor({ name: target.username, iconURL: target.displayAvatarURL({ dynamic: true }) })
      .setDescription(`${DESIGN.thin_separator}`)
      .addFields(
        { name: `${DESIGN.level} المستوى`, value: `**${currentLevel}**`, inline: true },
        { name: `${DESIGN.diamond} الرصيد`, value: `**${(u.balance || 0).toLocaleString()}**`, inline: true },
        { name: `${DESIGN.star} الخبرة`, value: `**${relativeXP.toLocaleString()}** / **${relativeNextXP.toLocaleString()}** XP\n${xpProgress}`, inline: false }
      )
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: '💡 استمر في التفاعل لرفع مستواك!' });
      
    return await interaction.editReply({ embeds: [embed] });
  }
};
