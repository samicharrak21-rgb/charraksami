const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS, createStyledEmbed } = require('../../utils/embeds');
const config = require('../../config');
const logger = require('../../utils/logger');

// Normalization function for Arabic text (copied from messageCreate.js)
const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[ً-ْ]/g, ''); // Remove Tashkeel
};

// Arabic Shortcuts (copied from messageCreate.js, only relevant ones for afk)
const ARABIC_SHORTCUTS = {
  'afk': 'afk',
  'افك': 'afk',
};
const NORMALIZED_SHORTCUTS = {};
for (const [key, value] of Object.entries(ARABIC_SHORTCUTS)) {
  NORMALIZED_SHORTCUTS[normalizeArabic(key)] = value;
}

// Helper function to send a reply and schedule its deletion
async function sendReplyAndDelete(source, options, { deleteOriginalImmediate = false, deleteOriginalAfterReply = false } = {}) {
  let reply;
  if (source.isMessage && source.isMessage()) {
    reply = await source.reply(options).catch(logger.error);
    if (deleteOriginalImmediate) {
      source.delete().catch(logger.error); // حذف رسالة المستخدم الأصلية فوراً
    } else if (deleteOriginalAfterReply) {
      setTimeout(() => source.delete().catch(logger.error), 15 * 1000); // حذف رسالة المستخدم الأصلية بعد 15 ثانية
    }
  } else { // Assume it's an interaction
    if (source.deferred || source.replied) {
      reply = await source.followUp({ ...options, fetchReply: true }).catch(logger.error);
    } else {
      reply = await source.reply({ ...options, fetchReply: true }).catch(logger.error);
    }
  }

  if (reply) {
    setTimeout(() => reply.delete().catch(logger.error), 15 * 1000);
  }
}

module.exports = {
  aliases: ['افك', 'afk', 'AFK'],
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('إدارة حالة AFK الخاصة بك')
    .addSubcommand(sub =>
      sub.setName('set')
        .setDescription('تعيين حالتك كـ AFK - سيتم تغيير اسمك وستحصل على هدية عند العودة')
        .addStringOption(o => o.setName('reason').setDescription('السبب (مثال: نايم، شغل)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('status')
        .setDescription('فحص حالة AFK لمستخدم معين')
        .addUserOption(o => o.setName('target').setDescription('المستخدم المراد فحصه').setRequired(true))
    ),
  async execute(input) {
    let interaction;
    let message;
    let isSlashCommand = false;
    let isPrefixCommand = false;
    let source = input; // This will be the object we use for replying and deleting

    if (input.type && input.type === InteractionType.ApplicationCommand) {
      interaction = input;
      isSlashCommand = true;
      source = interaction;
    } else if (input.isMessage && input.isMessage()) {
      message = input;
      isPrefixCommand = true;
      source = message;
    } else {
      // This is for button/modal interactions, where 'input' is an Interaction
      interaction = input;
      source = interaction;
    }
    // Button: Leave AFK (simulate sending a message)
    if (interaction.isButton && typeof interaction.isButton === 'function' ? interaction.isButton() : interaction.isButton) {
      if (interaction.customId === 'afk_leave') {
        try {
          const guildId = source.guild.id;
          const userId = source.user.id;
          const g = readGuild(guildId);
          const afkUsers = g.afkUsers || {};
          if (!afkUsers[userId]) {
          await sendReplyAndDelete(source, { content: 'ℹ️ لست في وضع AFK حالياً.' });
          return;
          }
          const afkData = afkUsers[userId];
          
          // Check if user was AFK for at least 1 hour (3600000 ms)
          const durationMs = Date.now() - afkData.timestamp;
          const isEligibleForGift = durationMs >= 3600000;
          
          delete afkUsers[userId];
          g.afkUsers = afkUsers;
          g.users = g.users || {};
          g.users[userId] = g.users[userId] || { balance: 0, xp: 0, level: 1 };
          
          let giftMsg = "";
          if (isEligibleForGift) {
            g.users[userId].balance += (config.AFK_GIFT || 100);
            giftMsg = `وحصلت على هدية 💎 ${config.AFK_GIFT}`;
          } else {
            giftMsg = "(لم تحصل على هدية لأن مدة الغياب أقل من ساعة)";
          }
          
          writeGuild(guildId, g);
          try {
            const { updateMemberNickname } = require('../../utils/nicknameManager');
            await updateMemberNickname(source.member, null, false);
          } catch (e) {}
          const minutes = Math.floor(durationMs / 60000);
          await sendReplyAndDelete(source, { content: `✅ تم الخروج من AFK ${giftMsg}.\n⏱️ كنت بعيداً لمدة ${minutes} دقيقة.` });
        } catch (e) {
          try {
            await sendReplyAndDelete(source, { content: '❌ حدث خطأ أثناء محاولة الخروج من AFK.' });
          } catch (_) {}
        }
        return;
      } else if (interaction.customId === 'afk_leave_msg') {
        try {
          const modal = new ModalBuilder()
            .setCustomId('afk_leave_modal')
            .setTitle('ترك رسالة');
          const input = new TextInputBuilder()
            .setCustomId('afk_message')
            .setLabel('اكتب رسالتك')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
            .setMaxLength(400);
          modal.addComponents(new ActionRowBuilder().addComponents(input));
          await interaction.showModal(modal);
        } catch (e) {
          try {
            await sendReplyAndDelete(source, { content: '❌ تعذر فتح نافذة الرسالة.' });
          } catch (_) {}
        }
        return;
      }
    }
    // Modal submit: post leave message
    if (interaction.isModalSubmit && (typeof interaction.isModalSubmit === 'function' ? interaction.isModalSubmit() : interaction.isModalSubmit)) {
      if (interaction.customId === 'afk_leave_modal') {
        try {
          const guildId = interaction.guild.id;
          const userId = interaction.user.id;
          const msgText = interaction.fields.getTextInputValue('afk_message') || '';
          if (!msgText.trim()) {
            await sendReplyAndDelete(source, { content: 'ℹ️ الرجاء كتابة رسالة.' });
            return;
          }
          await sendReplyAndDelete(source, { content: `💬 رسالة من **${interaction.member.displayName}**: ${msgText}` });
        } catch (e) {
          try {
            await sendReplyAndDelete(source, { content: '❌ حدث خطأ أثناء إرسال الرسالة.' });
          } catch (_) {}
        }
        return;
      }
    }
    let subcommand = 'set';
    let reason = 'بعيد عن الشاشة';
    let targetUser = null;

    if (isSlashCommand) {
      subcommand = interaction.options.getSubcommand();
      reason = interaction.options.getString('reason') || 'بعيد عن الشاشة';
      targetUser = interaction.options.getUser('target');
    } else if (isPrefixCommand) {
      const args = message.content.slice(config.prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();
      const normalizedCommandName = normalizeArabic(commandName);
      const baseCommandName = NORMALIZED_SHORTCUTS[normalizedCommandName] || commandName;

      if (baseCommandName === 'afk') {
          const potentialSubcommand = args.shift()?.toLowerCase();

          if (potentialSubcommand === 'set') {
              subcommand = 'set';
              reason = args.join(' ') || 'بعيد عن الشاشة';
          } else if (potentialSubcommand === 'status') {
              subcommand = 'status';
              const mentionMatch = message.mentions.users.first();
              if (mentionMatch) {
                  targetUser = mentionMatch;
              } else {
                  targetUser = message.author; // Default to sender if no mention
              }
          } else {
              // Default to 'set' if no valid subcommand given for prefix, use everything as reason
              subcommand = 'set';
              reason = [potentialSubcommand, ...args].filter(Boolean).join(' ') || 'بعيد عن الشاشة';
          }
      }
    }
    
    const guildId = source.guild.id;
    const userId = source.user.id;

    if (subcommand === 'status' || (targetUser && subcommand !== 'set')) {
      const target = targetUser || source.user;
      const targetMember = source.guild.members.cache.get(target.id);
      const displayName = targetMember?.displayName || target.username;
      const g = readGuild(guildId);
      const afkData = g.afkUsers?.[target.id];

      if (!afkData) {
          await sendReplyAndDelete(source, { content: `❌ **${displayName}** ليس في وضع AFK حالياً.` }, { deleteOriginalAfterReply: isPrefixCommand });
          return;
      }

      const duration = Math.floor((Date.now() - afkData.timestamp) / 60000);
      const embed = createStyledEmbed(source, 'حالة AFK', COLORS.info)
        .setDescription(`**${displayName}** في وضع AFK حالياً.\n\n**السبب:** ${afkData.reason}\n**منذ:** ${duration} دقيقة`);

      await sendReplyAndDelete(source, { embeds: [embed] }, { deleteOriginalAfterReply: isPrefixCommand });
      return;
    } else {
      // reason is already extracted based on command type (slash/prefix)
      // No need for old prefix reason parsing logic
      
      const g = readGuild(guildId);
      
      g.afkUsers = g.afkUsers || {};
      if (g.afkUsers[userId]) {
        await sendReplyAndDelete(source, { content: '❌ أنت بالفعل في وضع AFK!' }, { deleteOriginalAfterReply: isPrefixCommand });
        return;
      }

      const { stripDecoration } = require('../../utils/nicknameManager');
      const originalNick = stripDecoration(source.member.nickname || source.member.displayName);
      g.afkUsers[userId] = {
        reason,
        originalNick,
        timestamp: Date.now()
      };
      writeGuild(guildId, g);

      // Try changing nickname using modern manager
      try {
        const { updateMemberNickname } = require('../../utils/nicknameManager');
        await updateMemberNickname(source.member, null, true);
      } catch (e) {}

      const embed = createStyledEmbed(source, '💤 وضع الغياب (AFK)', COLORS.warning)
        .setAuthor({ 
          name: source.member.displayName, 
          iconURL: source.user.displayAvatarURL({ dynamic: true }) 
        })
        .setThumbnail(source.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(`**السبب:** ${reason}\n🎁 الهدية: **💎 ${config.AFK_GIFT}**`)
        .setImage('https://i.postimg.cc/mD8RzG1L/welcome.gif');

      await sendReplyAndDelete(source, { embeds: [embed] }, { deleteOriginalAfterReply: isPrefixCommand });
    }
  }
};
