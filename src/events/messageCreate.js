const { readGuild, writeGuild } = require('../utils/guildStorage');
const { EmbedBuilder } = require('discord.js');
const { COLORS, createStyledEmbed } = require('../utils/embeds');
const { handleAFKReturn, checkMentions } = require('../systems/afk');
const { checkProtection } = require('../systems/protection');
const { handleMessageXP } = require('../systems/levels');
const { getCommand } = require('../handlers/commandHandler');
const logger = require('../utils/logger');
const config = require('../config');
const { checkCooldown } = require('../utils/cooldowns');
const chatbot = require('../systems/chatbot');
const { createTextInteraction } = require('../utils/textShim');
const aliasEngine = require('../utils/aliasEngine');
const gameArt = require('../utils/gameArt');

const DISBOARD_ID = '302050872383242240';

// 5. Command Parsing & Arabic Shortcuts
const prefix = config.prefix || '!';

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (message.author.bot && message.author.id !== DISBOARD_ID) return;
    if (!message.guild) return;

    const content = message.content.trim();
    const lowerContent = content.toLowerCase();

    // 0. Protection System (Anti-Link, Anti-Spam, System Message Cleaner)
    if (await checkProtection(message)) return;

    // 1. AFK System
    const returned = await handleAFKReturn(message);
    if (!returned) {
      await checkMentions(message);
    }

    // 2. XP System
    await handleMessageXP(message);

    const guildId = message.guild.id;
    
    // 3. Handle Disboard Success Message (Bump)
    if (message.author.id === DISBOARD_ID) {
      if (message.embeds.length > 0 && message.embeds[0].description && message.embeds[0].description.includes('Bump done')) {
        const g = readGuild(guildId);
        let bumperId = message.interaction?.user?.id || g.last_bump_user;
        if (!bumperId && message.embeds[0].description) {
          const mentionMatch = message.embeds[0].description.match(/<@!?(\d+)>/);
          if (mentionMatch) bumperId = mentionMatch[1];
        }
        if (!bumperId) return;

        g.users = g.users || {};
        const u = g.users[bumperId] || { balance: 0, xp: 0 };
        const reward = 1000;
        const xpReward = 500;
        u.balance += reward;
        u.xp += xpReward;
        g.users[bumperId] = u;
        g.last_bump_time = Date.now();
        g.last_bump_user = null;
        writeGuild(guildId, g);

        const thanksEmbed = createStyledEmbed(message, '🚀 شكرًا على الـ Bump!', COLORS.success)
          .setDescription(`شكراً لك <@${bumperId}> على دعم السيرفر!\n\n🎁 لقد حصلت على:\n💰 **${reward.toLocaleString()}** جواهر\n⭐ **${xpReward.toLocaleString()}** خبرة (XP)`)
          .setImage('https://cdn.discordapp.com/attachments/1470839860594999593/1472741198572683470/standard.gif');

        return message.channel.send({ content: `✅ شكرًا <@${bumperId}>!`, embeds: [thanksEmbed] });
      }
    }

    // 4. Automatic Chat Responses
    const AUTO_RESPONSES = {
      'السلام عليكم': 'وعليكم السلام ورحمة الله وبركاته! نورت السيرفر يا بطل 🌟',
      'السلام عليكم ورحمة الله': 'وعليكم السلام ورحمة الله وبركاته! أهلاً بك يا غالي 🌹',
      'صباح الخير': 'صباح النور والسرور! يومك سعيد بإذن الله ☀️',
      'مساء الخير': 'مساء الورد والجمال! كيف حالك اليوم؟ ✨',
      'مع السلامة': 'في أمان الله وحفظه! ننتظر عودتك قريباً 👋',
      'باي': 'باي باي! انتبه لنفسك ✋',
      'تصبح على خير': 'وأنت من أهل الخير! أحلام سعيدة 💤',
      'منور': 'النور نورك يا عسل! تسلم 💎',
      'شكرا': 'العفو! هذا واجبي دائماً ❤️',
      'كيفك': 'الحمد لله بخير وعافية، أنت كيف حالك؟ 😊',
      'صلوا على النبي': 'اللهم صل وسلم وبارك على نبينا محمد ﷺ ✨'
    };

    const trimmedLower = lowerContent.trim();
    if (!message.mentions.users.has(client.user.id)) for (const [key, response] of Object.entries(AUTO_RESPONSES)) {
      if (trimmedLower === key || (trimmedLower.includes(key) && trimmedLower.length < key.length + 5)) {
        return message.reply(response);
      }
    }

    // 4.5 لعبة تنتظر إدخالاً من هذا العضو (خمن الرقم...) — الأرقام لها فقط
    if (require('../utils/inputLock').isLocked(message.channel.id, message.author.id) && /^[\d٠-٩]{1,4}$/.test(content)) return;

    // 5. Command Parsing — بادئة أو اختصارات العربية الموحّدة (v22)
    let commandName = '';
    let args = [];
    let isPrefixCommand = false;
    let resolvedWord = null;

    if (lowerContent.startsWith(prefix)) {
      const parts = content.slice(prefix.length).trim().split(/ +/);
      commandName = parts.shift().toLowerCase();
      args = parts;
      isPrefixCommand = true;
    } else {
      // 🎉 الألعاب الجماعية مباشرة من الشات: كراسي، اقصاء، اسئلة، اسرع، فكك، حساب، ايموجي
      // (الكلمة وحدها أو معها أرقام فقط — «حساب البنك» يبقى كلاماً عادياً)
      const groupType = aliasEngine.groupTrigger(content);
      if (groupType && message.guild) {
        const { startGroupGame } = require('../systems/groupGames');
        if (await checkCooldown(message, `group_${groupType}`, 10)) return;
        const res = await startGroupGame(message.channel, message.author, groupType, { rounds: 5, prize: 1500 });
        if (!res.ok && res.error && res.error !== 'not enough players') message.reply(`❌ ${res.error}`).catch(() => {});
        return;
      }

      // 🔤 محرك الاختصارات الموحّد v23 (+1000 كلمة وعبارة + اختصارات السيرفر)
      const isAdmin = message.member?.permissions?.has?.('ManageMessages') || message.member?.permissions?.has?.('Administrator') || false;
      const resolved = aliasEngine.resolve(content, { guildId, message, isAdmin });

      if (resolved?.guard === 'mod_noperm') {
        // عضو بدون صلاحية كتب أمر إشراف — البوت يتجاهله تماماً (لا يرد)
        return;
      }
      if (resolved?.command) {
        commandName = resolved.command;
        resolvedWord = resolved.word || null;
        args = resolved.args;
        isPrefixCommand = false;
      } else if (resolved?.guard) {
        // كلمة معروفة لكن ناقصها منشن/رقم — عاملها ككلام عادي (الشات بوت يرد)
        await chatbot.handleMessage(message).catch((e) => logger.warn(`chatbot: ${e.message}`));
        return;
      } else {
        // Not a command: hand the message to the interactive chatbot
        await chatbot.handleMessage(message).catch((e) => logger.warn(`chatbot: ${e.message}`));
        return;
      }
    }

    let cmd = getCommand(commandName);
    let finalCommandName = commandName;
    
    if (!cmd) {
      // محاولة بالاسم بعد التطبيع (أ/إ/آ، ة/ه، ى/ي)
      const retry = aliasEngine.WORD_INDEX[aliasEngine.norm(commandName)];
      if (retry) {
        cmd = getCommand(retry);
        finalCommandName = retry;
      }
    } else {
      finalCommandName = cmd.data?.name || cmd.name || commandName;
    }

    if (!cmd) {
      if (!isPrefixCommand) await chatbot.handleMessage(message).catch(() => {});
      return; // Exit if not a command
    }

    // Check Cooldown
    if (await checkCooldown(message, finalCommandName, cmd.cooldown || 3)) return;

    // Execute Command — كائن تفاعل نصي متكامل (منشن/أرقام 1k/الكل/نصوص)
    const interactionShim = createTextInteraction({
      message, client, commandName: finalCommandName, args, isPrefixCommand, cmd, trigger: isPrefixCommand ? commandName : (resolvedWord || commandName),
      balanceOf: () => Number(readGuild(guildId).users?.[message.author.id]?.balance) || 0,
    });

    try {
      gameArt.decorate(interactionShim, cmd.art || cmd.data?.name);
      require('../utils/gameMedia').attachIntroGif(interactionShim, cmd.gif || cmd.art || cmd.data?.name);
      await cmd.execute(interactionShim);
    } catch (error) {
      logger.error(`Error executing text command ${finalCommandName}: ${error.message}`);
    }
  }
};
