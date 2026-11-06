const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS, DESIGN, createStyledEmbed } = require('../../utils/embeds');
const { ADHKAR } = require('../../systems/empress');

module.exports = {
  aliases: ['اذكار', 'ذكر', 'adhkar', 'dhikr'],
  data: new SlashCommandBuilder()
    .setName('adhkar')
    .setDescription('🕌 عرض الأذكار أو إعدادات النظام التلقائي')
    .addSubcommand(s => s
      .setName('random')
      .setDescription('🌙 الحصول على ذكر عشوائي الآن')
    )
    .addSubcommand(s => s
      .setName('channel')
      .setDescription('⚙️ تحديد قناة الأذكار التلقائية (للمشرفين)')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('القناة المختارة')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
      )
    )
    .addSubcommand(s => s
      .setName('show')
      .setDescription('📊 عرض القناة الحالية للأذكار')
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const g = readGuild(guildId);
    g.channels = g.channels || {};
    
    // Default to 'random' if no subcommand (for shortcuts)
    const sub = interaction.options?.getSubcommand(false) || 'random';
    const embed = createStyledEmbed(interaction, ' ', COLORS.primary);
    
    if (sub === 'random') {
      const randomDhikr = ADHKAR[Math.floor(Math.random() * ADHKAR.length)];
      
      const adhkarEmbed = new EmbedBuilder()
        .setColor('#00FF00') // Green color like the image
        .setAuthor({ 
          name: interaction.user.username, 
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
        })
        .setTitle('ذِكر 💚')
        .setDescription(`**${randomDhikr}**`);

      return interaction.reply({ embeds: [adhkarEmbed] });
    }
    
    // Check permissions for other subcommands
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ هذه الإعدادات مخصصة للمشرفين فقط!', ephemeral: true });
    }

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      g.channels.adhkar = channel.id;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success)
        .setTitle('✅ تم تحديد قناة الأذكار')
        .setDescription(`ستُرسل الأذكار تلقائياً إلى: ${channel}\n\n${DESIGN.arrow} سيقوم البوت بإرسال ذكر كل 30 دقيقة.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    if (sub === 'show') {
      const ch = g.channels.adhkar ? `<#${g.channels.adhkar}>` : 'غير محددة';
      embed.setTitle('🕌 إعدادات الأذكار الحالية')
        .setDescription(`${DESIGN.bullet} القناة المحددة: ${ch}\n${DESIGN.bullet} الحالة: ${g.channels.adhkar ? '✅ تعمل' : '❌ معطلة'}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
