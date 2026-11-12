const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, RoleSelectMenuBuilder, ComponentType } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  aliases: ['رتب'],
  data: new SlashCommandBuilder()
    .setName('levelroles')
    .setDescription('🏆 ربط المستويات برتب Discord تلقائية')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(sc => sc.setName('add').setDescription('إضافة رتبة لمستوى معين').addIntegerOption(o => o.setName('level').setDescription('رقم المستوى').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('الرتبة').setRequired(true)))
    .addSubcommand(sc => sc.setName('remove').setDescription('إزالة رتبة من مستوى').addIntegerOption(o => o.setName('level').setDescription('رقم المستوى').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('الرتبة').setRequired(true)))
    .addSubcommand(sc => sc.setName('list').setDescription('عرض جميع الرتب المربوطة بالمستويات'))
    .addSubcommand(sc => sc.setName('setup').setDescription('⚙️ إعداد سريع للرتب للمستويات الأساسية'))
    .addSubcommand(sc => sc.setName('settings').setDescription('إعدادات إضافية لرتب المستويات').addBooleanOption(o => o.setName('remove_previous').setDescription('إزالة الرتب السابقة عند الترقية').setRequired(true)))
    .addSubcommand(sc => sc.setName('bulk').setDescription('إضافة عدة رتب لمستويات دفعة واحدة').addStringOption(o => o.setName('pairs').setDescription('صيغة: 5:@Role 10:@Role2 15:@Role3').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const g = readGuild(guildId);
    
    g.levelRoles = g.levelRoles || {};
    g.settings = g.settings || {};

    const embed = new EmbedBuilder().setTimestamp();

    if (sub === 'setup') {
      const milestones = [5, 10, 20, 50, 100];
      const setupEmbed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('⚙️ الإعداد السريع لرتب المستويات')
        .setDescription('اختر الرتبة المناسبة لكل مستوى من القوائم أدناه.\n\nسيتم حفظ الاختيارات تلقائياً بمجرد اختيار الرتبة.')
        .setFooter({ text: 'المستويات: 5، 10، 20، 50، 100' });

      const rows = milestones.map(lvl => {
        return new ActionRowBuilder().addComponents(
          new RoleSelectMenuBuilder()
            .setCustomId(`lr_setup_${lvl}`)
            .setPlaceholder(`اختر رتبة للمستوى ${lvl}`)
        );
      });

      const msg = await interaction.reply({ embeds: [setupEmbed], components: rows, ephemeral: true, fetchReply: true });

      const collector = msg.createMessageComponentCollector({ 
        componentType: ComponentType.RoleSelect, 
        time: 300000 
      });

      collector.on('collect', async i => {
        const lvl = i.customId.split('_')[2];
        const roleId = i.values[0];
        const role = i.guild.roles.cache.get(roleId);

        const guildData = readGuild(guildId);
        guildData.levelRoles = guildData.levelRoles || {};
        guildData.levelRoles[lvl] = [roleId]; // Replace with new role
        writeGuild(guildId, guildData);

        await i.reply({ content: `✅ تم ربط المستوى **${lvl}** برتبة **${role.name}** بنجاح!`, ephemeral: true });
      });

      return;
    }

    if (sub === 'add') {
      const level = interaction.options.getInteger('level');
      const role = interaction.options.getRole('role');
      
      if (!g.levelRoles[level]) g.levelRoles[level] = [];
      if (!g.levelRoles[level].includes(role.id)) g.levelRoles[level].push(role.id);
      
      writeGuild(guildId, g);
      embed.setColor(COLORS.success).setDescription(`✅ تم ربط رتبة ${role} بالمستوى **${level}**.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'remove') {
      const level = interaction.options.getInteger('level');
      const role = interaction.options.getRole('role');
      
      if (g.levelRoles[level]) {
        g.levelRoles[level] = g.levelRoles[level].filter(r => r !== role.id);
        if (g.levelRoles[level].length === 0) delete g.levelRoles[level];
        writeGuild(guildId, g);
      }
      
      embed.setColor(COLORS.success).setDescription(`✅ تم فك ارتباط رتبة ${role} بالمستوى **${level}**.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'list') {
      const entries = Object.entries(g.levelRoles).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
      if (entries.length === 0) {
        embed.setColor(COLORS.error).setDescription('❌ لا توجد رتب مربوطة بالمستويات حالياً.');
      } else {
        const list = entries.map(([lvl, roles]) => `**المستوى ${lvl}:** ${roles.map(r => `<@&${r}>`).join(', ')}`).join('\n');
        embed.setColor(COLORS.primary).setTitle('🏆 رتب المستويات المربوطة').setDescription(list);
      }
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'settings') {
      const removePrev = interaction.options.getBoolean('remove_previous');
      g.settings.removePreviousLevelRole = removePrev;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success).setDescription(`✅ تم ضبط خاصية إزالة الرتب السابقة إلى: **${removePrev ? 'نعم' : 'لا'}**.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    if (sub === 'bulk') {
      const input = interaction.options.getString('pairs');
      const tokens = input.split(/\s+/).filter(Boolean);
      const changes = [];
      
      for (const tok of tokens) {
        const m = tok.match(/^(\d+):(<@&(\d+)>|(\d+))$/);
        if (!m) continue;
        const level = parseInt(m[1], 10);
        const roleId = m[3] || m[4];
        if (!interaction.guild.roles.cache.get(roleId)) continue;
        if (!g.levelRoles[level]) g.levelRoles[level] = [];
        if (!g.levelRoles[level].includes(roleId)) {
          g.levelRoles[level].push(roleId);
          changes.push({ level, roleId });
        }
      }
      
      writeGuild(guildId, g);
      if (changes.length === 0) {
        embed.setColor(COLORS.error).setDescription('❌ لم يتم التعرف على أي أزواج صحيحة. الصيغة: `5:@Role 10:@Role2`');
      } else {
        const lines = changes.map(c => `المستوى **${c.level}** ← <@&${c.roleId}>`).join('\n');
        embed.setColor(COLORS.success).setTitle('✅ تم إضافة رتب متعددة').setDescription(lines);
      }
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
