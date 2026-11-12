const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadTemplates, writeGuild, readGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  aliases: ['templates', 'قوالب', 'قالب', 'tp'],
  data: new SlashCommandBuilder()
    .setName('templates')
    .setDescription('📋 إدارة قوالب الإمبد المحفوظة بالسيرفر')
    .addSubcommand(sc => sc.setName('list').setDescription('عرض جميع القوالب المتاحة'))
    .addSubcommand(sc => sc.setName('delete').setDescription('حذف قالب معين').addStringOption(o => o.setName('name').setDescription('اسم القالب').setRequired(true)))
    .addSubcommand(sc => sc.setName('apply').setDescription('إرسال قالب إلى قناة محددة').addStringOption(o => o.setName('name').setDescription('اسم القالب').setRequired(true)).addChannelOption(o => o.setName('channel').setDescription('القناة (اختياري)'))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const templates = loadTemplates(guildId) || {};
    const embed = new EmbedBuilder().setTimestamp();

    if (sub === 'list') {
      const names = Object.keys(templates);
      if (names.length === 0) {
        embed.setColor(COLORS.error).setDescription('❌ لا توجد قوالب محفوظة في هذا السيرفر حالياً.');
      } else {
        embed.setColor(COLORS.primary)
          .setTitle('📋 قوالب الإمبد المتاحة')
          .setDescription(names.map((n, i) => `**${i + 1}.** \`${n}\``).join('\n'))
          .setFooter({ text: 'استخدم /templates apply لإرسال قالب' });
      }
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'delete') {
      const name = interaction.options.getString('name');
      const g = readGuild(guildId);
      if (g.templates && g.templates[name]) {
        delete g.templates[name];
        writeGuild(guildId, g);
        embed.setColor(COLORS.success).setDescription(`✅ تم حذف القالب **${name}** بنجاح.`);
      } else {
        embed.setColor(COLORS.error).setDescription(`❌ القالب **${name}** غير موجود.`);
      }
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'apply') {
      const name = interaction.options.getString('name');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const tpl = templates[name];
      
      if (!tpl) {
        embed.setColor(COLORS.error).setDescription(`❌ القالب **${name}** غير موجود.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }

      try {
        await channel.send({ embeds: [tpl.embed] });
        embed.setColor(COLORS.success).setDescription(`✅ تم إرسال القالب **${name}** إلى ${channel} بنجاح.`);
        return interaction.reply({ embeds: [embed], ephemeral: true });
      } catch (e) {
        embed.setColor(COLORS.error).setDescription('❌ فشل إرسال القالب. تأكد من صلاحيات البوت في القناة.');
        return interaction.reply({ embeds: [embed], ephemeral: true });
      }
    }
  }
};
