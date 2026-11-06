const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  aliases: ['ادمن', 'admen', 'مدير'],
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('🛡️ لوحة تحكم الإدارة لإدارة الأعضاء والبيانات')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('stats').setDescription('عرض إحصاءات مستخدم مفصلة')
      .addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true)))
    .addSubcommand(s => s.setName('give').setDescription('إضافة رصيد جواهر لمستخدم')
      .addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true))
      .addIntegerOption(o => o.setName('amount').setDescription('المبلغ').setRequired(true)))
    .addSubcommand(s => s.setName('setlevel').setDescription('تعديل مستوى مستخدم')
      .addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true))
      .addIntegerOption(o => o.setName('level').setDescription('المستوى الجديد').setRequired(true)))
    .addSubcommand(s => s.setName('reset').setDescription('إعادة تعيين كامل بيانات مستخدم')
      .addUserOption(o => o.setName('user').setDescription('العضو').setRequired(true)))
    .addSubcommand(s => s.setName('setchannel').setDescription('تخصيص قنوات النظام (Bump/Booster)')
      .addStringOption(o => o.setName('type').setDescription('نوع القناة').setRequired(true).addChoices(
        { name: '🚀 Bump Channel', value: 'bump' },
        { name: '💎 Booster Channel', value: 'booster' }
      ))
      .addChannelOption(o => o.setName('channel').setDescription('القناة').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const g = readGuild(guildId);
    
    g.users = g.users || {};
    const embed = new EmbedBuilder().setTimestamp();

    if (sub === 'stats') {
      const target = interaction.options.getUser('user');
      const targetMember = interaction.guild.members.cache.get(target.id);
      const displayName = targetMember?.displayName || target.username;
      const u = g.users[target.id] || { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1, stats: {} };
      const st = u.stats || {};
      embed.setColor(COLORS.cyan)
        .setAuthor({ name: `إحصاءات ${displayName}`, iconURL: target.displayAvatarURL() })
        .setTitle('📊 تقرير المستخدم الإداري')
        .addFields(
          { name: '💰 الرصيد', value: `\`${u.balance.toLocaleString()}\` جوهرة`, inline: true },
          { name: '⭐ المستوى', value: `\`${u.level}\` (XP: \`${u.xp}\`)`, inline: true },
          { name: '💬 الرسائل', value: `\`${st.messages_count || 0}\``, inline: true },
          { name: '⚒️ مرات العمل', value: `\`${st.work_count || 0}\``, inline: true },
          { name: '🎰 السلوتس', value: `\`${st.slots_count || 0}\``, inline: true },
          { name: '🃏 بلاك جاك', value: `\`${st.blackjack_count || 0}\``, inline: true }
        )
        .setThumbnail(target.displayAvatarURL());
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'give') {
      const target = interaction.options.getUser('user');
      const targetMember = interaction.guild.members.cache.get(target.id);
      const displayName = targetMember?.displayName || target.username;
      const amount = interaction.options.getInteger('amount');
      const u = g.users[target.id] || { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1, stats: {} };
      u.balance = (u.balance || 0) + amount;
      g.users[target.id] = u;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success).setDescription(`✅ تم إضافة **${amount.toLocaleString()}** جوهرة إلى رصيد **${displayName}**.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'setlevel') {
      const target = interaction.options.getUser('user');
      const targetMember = interaction.guild.members.cache.get(target.id);
      const displayName = targetMember?.displayName || target.username;
      const level = interaction.options.getInteger('level');
      const u = g.users[target.id] || { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1, stats: {} };
      u.level = level;
      u.xp = 0;
      g.users[target.id] = u;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success).setDescription(`✅ تم تعديل مستوى **${displayName}** إلى **${level}**.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'reset') {
      const target = interaction.options.getUser('user');
      const targetMember = interaction.guild.members.cache.get(target.id);
      const displayName = targetMember?.displayName || target.username;
      g.users[target.id] = { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1, stats: {} };
      writeGuild(guildId, g);
      embed.setColor(COLORS.warning).setDescription(`♻️ تمت إعادة تعيين كافة بيانات **${displayName}** للوضع الافتراضي.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'setchannel') {
      const type = interaction.options.getString('type');
      const channel = interaction.options.getChannel('channel');
      
      g.channels = g.channels || {};
      g.channels[type] = channel.id;
      writeGuild(guildId, g);
      
      embed.setColor(COLORS.success)
        .setDescription(`✅ تم تعيين قناة **${type === 'bump' ? 'Bump' : 'Booster'}** لتكون <#${channel.id}>.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
