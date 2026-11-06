const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { getRandomGif } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  aliases: ['تذكرة', 'دعم', 'ticket'],
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('🎟️ نظام التذاكر البسيط')
    .addSubcommand(sc => sc
      .setName('open')
      .setDescription('فتح تذكرة خاصة مع الطاقم')
      .addStringOption(o => o.setName('reason').setDescription('السبب').setRequired(false)))
    .addSubcommand(sc => sc
      .setName('close')
      .setDescription('إغلاق التذكرة الحالية'))
    .addSubcommand(sc => sc
      .setName('setup')
      .setDescription('إنشاء لوحة التذاكر في قناة محددة')
      .addChannelOption(o => o.setName('channel').setDescription('القناة التي سيظهر فيها البانل').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sc => sc
      .setName('settings')
      .setDescription('إعدادات التذاكر')
      .addRoleOption(o => o.setName('mention_role').setDescription('رتبة يتم منشنها في التذكرة').setRequired(false))
      .addChannelOption(o => o.setName('category').setDescription('قسم إنشاء التذاكر (Category)').addChannelTypes(ChannelType.GuildCategory).setRequired(false))),
  cooldown: 10,
  async execute(interaction) {
    const guild = interaction.guild;
    const user = interaction.user;
    const g = readGuild(guild.id);
    const sub = interaction.isChatInputCommand() ? interaction.options.getSubcommand() : null;
    
    if (interaction.isChatInputCommand() && sub === 'settings') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: '❌ تحتاج صلاحيات إدارة القنوات.', ephemeral: true });
      }
      const role = interaction.options.getRole('mention_role');
      const category = interaction.options.getChannel('category');
      
      if (role) {
        g.roles = g.roles || {};
        g.roles.ticketMentionRole = role.id;
      }
      
      if (category) {
        if (category.type !== ChannelType.GuildCategory) {
          return interaction.reply({ content: '❌ يجب اختيار "قسم" (Category) وليس قناة عادية.', ephemeral: true });
        }
        g.channels = g.channels || {};
        g.channels.tickets = category.id;
      }
      
      writeGuild(guild.id, g);
      return interaction.reply({ content: `✅ تم تحديث إعدادات التذاكر بنجاح.`, ephemeral: true });
    }

    if (interaction.isChatInputCommand() && sub === 'setup') {
      if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.reply({ content: '❌ تحتاج صلاحيات إدارة القنوات.', ephemeral: true });
      }
      const channel = interaction.options.getChannel('channel');
      
      const setupEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎟️ مركز الدعم والمساعدة')
        .setImage(getRandomGif('ticket'))
        .setDescription('أهلاً بك في مركز الدعم! اختر نوع التذكرة التي تود فتحها من الأزرار أدناه:\n\n' +
                        '📩 **فتح تذكرة:** للاستفسارات العامة والدعم الفني.\n' +
                        '🤝 **طلب شراكة:** لطلبات الشراكة والتعاون.')
        .setFooter({ text: 'سيرفر سامي - نحن هنا لخدمتك' })
        .setTimestamp();
        
      const setupButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_open_general').setLabel('فتح تذكرة 🎟️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ticket_open_partner').setLabel('طلب شراكة 🤝').setStyle(ButtonStyle.Success)
      );
      
      try {
        await channel.send({ embeds: [setupEmbed], components: [setupButtons] });
        return interaction.reply({ content: `✅ تم إنشاء لوحة التذاكر بنجاح في ${channel}`, ephemeral: true });
      } catch (err) {
        return interaction.reply({ content: '❌ تعذر إرسال اللوحة، تأكد من صلاحيات البوت في تلك القناة.', ephemeral: true });
      }
    }

    if ((interaction.isChatInputCommand() && sub === 'open') || (interaction.isButton() && interaction.customId.startsWith('ticket_open_'))) {
      const isPartner = interaction.isButton() ? interaction.customId === 'ticket_open_partner' : false;
      const reason = interaction.isChatInputCommand() ? (interaction.options.getString('reason') || 'لا يوجد سبب محدد') : (isPartner ? 'طلب شراكة' : 'دعم عام');
      
      if (interaction.isButton()) await interaction.deferReply({ ephemeral: true });

      const name = `${isPartner ? 'partner' : 'ticket'}-${user.username}`.toLowerCase().replace(/[^a-z0-9\-]/g, '').slice(0, 90);
      const mentionRoleId = g.roles?.ticketMentionRole || config.TICKET_MENTION_ROLE_ID || null;
      
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_partner').setLabel('شراكة 🤝').setStyle(ButtonStyle.Success).setDisabled(isPartner),
        new ButtonBuilder().setCustomId('ticket_close_btn').setLabel('إغلاق 🗑️').setStyle(ButtonStyle.Danger)
      );
      
      g.users = g.users || {};
      const { createStyledEmbed, COLORS } = require('../../utils/embeds');
      const intro = createStyledEmbed(interaction, isPartner ? '🤝 طلب شراكة جديد' : '🎟️ تذكرة دعم جديدة', isPartner ? COLORS.success : COLORS.primary)
        .setDescription(`صاحب التذكرة: ${user}\nالسبب: **${reason}**\n\nاستخدم الأزرار أدناه للتفاعل.`)
        .setThumbnail(user.displayAvatarURL())
        .setImage(getRandomGif('ticket'));
      
      const reply = async (payload) => {
        if (interaction.isButton()) return await interaction.editReply(payload);
        return await interaction.reply(payload);
      };

      // Try to create a private thread first
      if (interaction.channel && interaction.channel.threads && guild.members.me.permissions.has('CreatePrivateThreads')) {
        try {
          const th = await interaction.channel.threads.create({
            name,
            autoArchiveDuration: 1440,
            type: ChannelType.PrivateThread,
            reason: `Ticket for ${user.tag}`,
            invitable: false
          });
          await th.members.add(user.id).catch(() => {});
          const content = mentionRoleId ? `<@&${mentionRoleId}> | ${user} فتح تذكرة.` : `${user} فتح تذكرة.`;
          await th.send({ content, embeds: [intro], components: [buttons], allowedMentions: { roles: mentionRoleId ? [mentionRoleId] : [] } });
          return await reply({ content: `✅ تم فتح تذكرتك هنا: ${th}`, ephemeral: true });
        } catch (e) {
          // fallback to channel
        }
      }
      
      // Fallback: create a private text channel
      const parentId = g.channels?.tickets || config.TICKET_CATEGORY_ID || null;
      const overwrites = [
        { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        { id: guild.members.me.roles.highest, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
      ];
      
      try {
        const ch = await guild.channels.create({
          name,
          type: ChannelType.GuildText,
          parent: parentId || undefined,
          permissionOverwrites: overwrites,
          topic: `ticket:${user.id}`
        });
        const content = mentionRoleId ? `<@&${mentionRoleId}> | ${user} فتح تذكرة.` : `${user} فتح تذكرة.`;
        await ch.send({ content, embeds: [intro], components: [buttons], allowedMentions: { roles: mentionRoleId ? [mentionRoleId] : [] } });
        return await reply({ content: `✅ تم إنشاء تذكرتك: ${ch}`, ephemeral: true });
      } catch (err) {
        return await reply({ content: '❌ تعذر إنشاء التذكرة. تحقق من صلاحيات البوت!', ephemeral: true });
      }
    }
    
    if (interaction.isChatInputCommand() && sub === 'close') {
      // If in a thread, archive/delete
      const ch = interaction.channel;
      if (ch.isThread && ch.isThread()) {
        try {
          await ch.delete(`Ticket closed by ${user.tag}`).catch(async () => ch.setArchived(true));
          return interaction.reply({ content: '✅ تم إغلاق التذكرة.', ephemeral: true });
        } catch (e) {
          return interaction.reply({ content: '❌ لا أستطيع إغلاق هذه التذكرة.', ephemeral: true });
        }
      }
      // If text channel with topic marking a ticket
      if (ch.isTextBased() && typeof ch.topic === 'string' && ch.topic?.startsWith('ticket:')) {
        try {
          await ch.delete(`Ticket closed by ${user.tag}`);
          return; // cannot respond after channel deletion
        } catch (e) {
          return interaction.reply({ content: '❌ لا أستطيع حذف القناة. تحقق من الصلاحيات.', ephemeral: true });
        }
      }
      return interaction.reply({ content: '❌ هذا الأمر يجب استخدامه داخل قناة/فرع التذكرة.', ephemeral: true });
    }

    // Button interactions
    if (interaction.isButton()) {
      const id = interaction.customId;
      if (id === 'ticket_partner') {
        const mentionRoleId = g.roles?.ticketMentionRole || config.TICKET_MENTION_ROLE_ID || null;
        const content = mentionRoleId ? `🤝 طلب شراكة من ${user} — <@&${mentionRoleId}>` : `🤝 طلب شراكة من ${user}`;
        try {
          await interaction.reply({ content, allowedMentions: { roles: mentionRoleId ? [mentionRoleId] : [] } });
          // Disable the partner button to avoid spam
          if (interaction.message?.components?.length) {
            const row = ActionRowBuilder.from(interaction.message.components[0]);
            row.components = row.components.map(c => {
              if (c.customId === 'ticket_partner') c.setDisabled(true);
              return c;
            });
            await interaction.message.edit({ components: [row] }).catch(() => {});
          }
        } catch (e) {
          try { await interaction.reply({ content: '❌ تعذر إرسال منشن الشراكة.', ephemeral: true }); } catch {}
        }
        return;
      }
      if (id === 'ticket_close_btn') {
        const ch = interaction.channel;
        try {
          if (ch.isThread && ch.isThread()) {
            await ch.delete(`Ticket closed by ${user.tag}`).catch(async () => ch.setArchived(true));
          } else if (ch.isTextBased() && typeof ch.topic === 'string' && ch.topic?.startsWith('ticket:')) {
            await ch.delete(`Ticket closed by ${user.tag}`);
          } else {
            await interaction.reply({ content: '❌ هذا الزر يعمل داخل قناة/فرع تذكرة.', ephemeral: true });
            return;
          }
        } catch (e) {
          try { await interaction.reply({ content: '❌ لا أستطيع إغلاق هذه التذكرة.', ephemeral: true }); } catch {}
        }
        return;
      }
    }
  }
};
