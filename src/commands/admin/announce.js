const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { sendAnnouncement, scheduleAnnouncement, addScheduledAnnouncement, buildEmbedFromData } = require('../../systems/announce');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  aliases: ['announce', 'إعلان', 'اعلان', 'ann'],
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('📢 إنشاء أو جدولة الإعلانات الرسمية بالسيرفر')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sc => sc.setName('send').setDescription('إرسال إعلان فوري')
      .addChannelOption(o => o.setName('channel').setDescription('القناة').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('العنوان').setRequired(false))
      .addStringOption(o => o.setName('description').setDescription('الوصف').setRequired(false))
      .addStringOption(o => o.setName('mention').setDescription('المنشن (none|here|everyone|role:ID)').setRequired(false)))
    .addSubcommand(sc => sc.setName('schedule').setDescription('جدولة إعلان لوقت لاحق')
      .addChannelOption(o => o.setName('channel').setDescription('القناة').setRequired(true))
      .addStringOption(o => o.setName('time').setDescription('الوقت (مثال: 2024-12-31T20:00:00)').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('العنوان').setRequired(false))
      .addStringOption(o => o.setName('description').setDescription('الوصف').setRequired(false))
      .addStringOption(o => o.setName('mention').setDescription('المنشن').setRequired(false)))
    .addSubcommand(sc => sc.setName('list').setDescription('عرض قائمة الإعلانات المجدولة'))
    .addSubcommand(sc => sc.setName('cancel').setDescription('إلغاء إعلان مجدول').addStringOption(o => o.setName('id').setDescription('معرف الإعلان (ID)').setRequired(true))),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const g = readGuild(guildId);
    if (!g) return interaction.reply({ content: '❌ خطأ في تحميل بيانات السيرفر!', ephemeral: true });

    const embed = new EmbedBuilder().setTimestamp();

    if (sub === 'send') {
      const ch = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title') || 'إعلان رسمي';
      const description = interaction.options.getString('description') || '';
      const mention = interaction.options.getString('mention') || null;
      
      const annEmbed = buildEmbedFromData({ title, description });
      await sendAnnouncement(interaction.client, guildId, { id: `instant_${Date.now()}`, channelId: ch.id, embed: annEmbed, mention });
      
      embed.setColor(COLORS.success).setDescription(`✅ تم إرسال الإعلان بنجاح في ${ch}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'schedule') {
      const ch = interaction.options.getChannel('channel');
      const title = interaction.options.getString('title') || 'إعلان مجدول';
      const description = interaction.options.getString('description') || '';
      const time = interaction.options.getString('time');
      const mention = interaction.options.getString('mention') || null;
      
      const ts = Number(time) || Date.parse(time);
      if (!ts || Number.isNaN(ts)) return interaction.reply({ content: '❌ تنسيق الوقت غير صحيح! استخدم ISO datetime أو timestamp.', ephemeral: true });
      
      const ann = { id: `sch_${Date.now()}`, channelId: ch.id, embed: { title, description }, mention, timestamp: new Date(ts).toISOString(), scheduled: true };
      addScheduledAnnouncement(guildId, ann);
      scheduleAnnouncement(interaction.client, guildId, ann);
      
      embed.setColor(COLORS.success).setDescription(`✅ تم جدولة الإعلان بنجاح.\n\n**المعرف:** \`${ann.id}\`\n**الوقت:** <t:${Math.floor(ts/1000)}:F>`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'list') {
      const anns = g.announcements || [];
      if (anns.length === 0) {
        embed.setColor(COLORS.error).setDescription('❌ لا توجد إعلانات مجدولة حالياً.');
      } else {
        const list = anns.map(a => `🆔 \`${a.id}\` | 📅 <t:${Math.floor(new Date(a.timestamp).getTime()/1000)}:R> | 📍 <#${a.channelId}>`).join('\n');
        embed.setColor(COLORS.primary).setTitle('📅 الإعلانات المجدولة').setDescription(list);
      }
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'cancel') {
      const id = interaction.options.getString('id');
      const originalCount = (g.announcements || []).length;
      g.announcements = (g.announcements || []).filter(a => a.id !== id);
      
      if (g.announcements.length < originalCount) {
        writeGuild(guildId, g);
        embed.setColor(COLORS.success).setDescription(`✅ تم إلغاء الإعلان صاحب المعرف \`${id}\` بنجاح.`);
      } else {
        embed.setColor(COLORS.error).setDescription(`❌ لم يتم العثور على إعلان بهذا المعرف: \`${id}\``);
      }
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
