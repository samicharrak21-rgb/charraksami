const { readGuild, writeGuild } = require('../utils/guildStorage');
const { EmbedBuilder } = require('discord.js');
const { COLORS, createStyledEmbed } = require('../utils/embeds');
const { handleAFKReturn, checkMentions } = require('../systems/afk');
const { checkProtection } = require('../systems/protection');
const { handleMessageXP } = require('../systems/levels');
const { getCommand } = require('../handlers/commandHandler');
const logger = require('../utils/logger');
const config = require('../config');
const dungeonManager = require('../systems/dungeon/DungeonManager');
const { checkCooldown } = require('../utils/cooldowns');
const chatbot = require('../systems/chatbot');

const DISBOARD_ID = '302050872383242240';

// 5. Command Parsing & Arabic Shortcuts
const prefix = config.prefix || '!';

// Normalization function for Arabic text
const normalizeArabic = (text) => {
  if (!text) return '';
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u0652]/g, ''); // Remove Tashkeel
};

const ARABIC_SHORTCUTS = {
  'جماعي': 'group',
  'جماعيه': 'group',
  'جماعية': 'group',
  'بارتي': 'group',
  'روليت': 'roulette',
  'مزرعة': 'farm',
  'زرع': 'farm',
  'حصاد': 'farm',
  'مزرعتي': 'farm',
  'دانجن': 'dungeon',
  'دانجون': 'dungeon',
  'مغامرة': 'dungeon',
  'دالجن': 'dungeon',
  'dg': 'dungeon',
  'تذكرة': 'ticket',
  'دعم': 'ticket',
  'فلوس': 'balance',
  'رصيد': 'balance',
  'جواهر': 'balance',
  'راتب': 'daily',
  'العاب': 'gamesinfo',
  'الألعاب': 'gamesinfo',
  'ألعاب': 'gamesinfo',
  'معلومات': 'info',
  'مساعدة': 'help',
  'مساعده': 'help',
  'أوامر': 'help',
  'اوامر': 'help',
  'عمل': 'work',
  'شغل': 'work',
  'يومي': 'daily',
  'هدية': 'daily',
  'هديه': 'daily',
  'مميزات': 'features',
  'مزايا': 'features',
  'توب': 'leaderboard',
  'متصدرين': 'leaderboard',
  'بروفايل': 'rank',
  'بروفايلي': 'rank',
  'رتبة': 'rank',
  'رتبه': 'rank',
  'رتبتي': 'rank',
  'مستوى': 'rank',
  'مستوي': 'rank',
  'مستواي': 'rank',
  'بلاك': 'blackjack',
  'بلاكجاك': 'blackjack',
  'سلوتس': 'slots',
  'قمار': 'slots',
  'afk': 'afk',
  'افك': 'afk',
  'AFK': 'afk',
  'الوان': 'colors',
  'ألوان': 'colors',
  'رتب': 'levelroles',
  'ترحيب': 'welcomesettings',
  'shh': 'shh',
  'اخبار': 'shh',
  'ميمز': 'shh',
  'اذكار': 'adhkar',
  'أذكار': 'adhkar',
  'ذكر': 'adhkar',
  'الغام': 'minesweeper',
  'كنس': 'minesweeper',
  'ألغام': 'minesweeper',
  'متجر': 'shop',
  'سوق': 'shop',
  'دفع': 'pay',
  'تحويل': 'pay',
  'بريستيج': 'prestige',
  'صيد': 'fish',
  'سمك': 'fish',
  'حجرة': 'rps',
  'حجر': 'rps',
  'ورقة': 'rps',
  'مقص': 'rps',
  'بنق': 'ping',
  'ping': 'ping',
  'بوت': 'botstats',
  'احصاء': 'botstats',
  'بطولة': 'rank'
};

// Pre-normalize shortcuts for faster lookup
const NORMALIZED_SHORTCUTS = {};
for (const [key, value] of Object.entries(ARABIC_SHORTCUTS)) {
  NORMALIZED_SHORTCUTS[normalizeArabic(key)] = value;
}

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

    // Dungeon Text Commands (wasd, a, h, r, !say)
    const dungeonInput = lowerContent.trim();
    const isDungeonMove = ['w', 'a', 's', 'd'].includes(dungeonInput);
    const isDungeonAction = ['a', 'h', 'r'].includes(dungeonInput);
    const isDungeonSay = lowerContent.startsWith('!say');

    // Disable grid dungeon text commands in New Dungeon threads to avoid "repetition"
    const isNewDungeonThread = message.channel.isThread() && message.channel.name.includes('🏰');

    if ((isDungeonMove || isDungeonAction || isDungeonSay) && !isNewDungeonThread) {
      const game = dungeonManager.getGame(guildId);
      const player = game?.players?.get(message.author.id);
      
      if (player) {
        if (isDungeonMove && dungeonInput.length === 1) {
          const res = dungeonManager.movePlayer(guildId, message.author.id, dungeonInput);
          if (res.success) {
            const embed = dungeonManager.getEmbed(guildId, message.author.id);
            const moveContent = res.event === 'stairs' ? '✨ انتقلت للطابق التالي!' : res.event === 'monster' ? '👹 وحش ظهر أمامك!' : res.event || null;
            if (res.event === 'stairs') game.nextFloor();
            return message.reply({ content: moveContent, embeds: [embed] }).catch(() => {});
          }
        } else if (isDungeonAction && dungeonInput.length === 1) {
          const res = await dungeonManager.handleCombat(guildId, message.author.id, dungeonInput);
          if (res.success) {
            const embed = dungeonManager.getEmbed(guildId, message.author.id);
            return message.reply({ content: res.log, embeds: [embed] }).catch(() => {});
          }
        } else if (isDungeonSay) {
          const sayMsg = content.slice(5).trim();
          if (!sayMsg) return;
          const res = dungeonManager.sendPartyMessage(guildId, message.author.id, sayMsg);
          if (res.success) {
            const embed = dungeonManager.getEmbed(guildId, message.author.id);
            return message.reply({ content: '💬 تم إرسال الرسالة لفريقك.', embeds: [embed] }).catch(() => {});
          }
        }
      }
    }

    const trimmedLower = lowerContent.trim();
    if (!message.mentions.users.has(client.user.id)) for (const [key, response] of Object.entries(AUTO_RESPONSES)) {
      if (trimmedLower === key || (trimmedLower.includes(key) && trimmedLower.length < key.length + 5)) {
        return message.reply(response);
      }
    }

    // 5. Command Parsing & Arabic Shortcuts
    let commandName = '';
    let args = [];
    let isPrefixCommand = false;

    if (lowerContent.startsWith(prefix)) {
      const parts = content.slice(prefix.length).trim().split(/ +/);
      commandName = parts.shift().toLowerCase();
      args = parts;
      isPrefixCommand = true;
    } else {
      const parts = content.split(/ +/);
      const firstWord = parts.shift().toLowerCase();
      const normalizedFirstWord = normalizeArabic(firstWord);
      
      // Check if it's a known shortcut
      const shortcutValue = NORMALIZED_SHORTCUTS[normalizedFirstWord];
      
      if (shortcutValue) {
        commandName = shortcutValue; // <--- Set commandName directly to the target command!
        args = parts;
        isPrefixCommand = false;
      } else {
        // Not a command: hand the message to the interactive chatbot
        await chatbot.handleMessage(message).catch((e) => logger.warn(`chatbot: ${e.message}`));
        return;
      }
    }

    const normalizedCommandName = normalizeArabic(commandName);
    let cmd = getCommand(commandName);
    let finalCommandName = commandName;
    
    if (!cmd) {
      // One more attempt with normalization if it's not found directly
      const retryShortcut = NORMALIZED_SHORTCUTS[normalizedCommandName];
      if (retryShortcut) {
        cmd = getCommand(retryShortcut);
        finalCommandName = retryShortcut;
      }
    } else {
      finalCommandName = cmd.data?.name || cmd.name || commandName;
    }

    if (!cmd) {
      if (!isPrefixCommand) await chatbot.handleMessage(message).catch(() => {});
      // AFK and other systems already handled at the top or in their respective blocks.
      return; // Exit if not a command
    }

    // Double check it's allowed if no prefix
    if (!isPrefixCommand) {
      const isAllowed = Object.values(NORMALIZED_SHORTCUTS).includes(finalCommandName) || 
                        NORMALIZED_SHORTCUTS[normalizedCommandName];
      if (!isAllowed) return;
    }

    // Check Cooldown
    if (await checkCooldown(message, finalCommandName, cmd.cooldown || 3)) return;

    // Execute Command
    let sentMessage = null;
    const interactionShim = {
      type: 2, // InteractionType.ApplicationCommand
      isChatInputCommand: () => true,
      isButton: () => false,
      isStringSelectMenu: () => false,
      isModalSubmit: () => false,
      isMessage: () => true,
      commandName: finalCommandName,
      user: message.author,
      member: message.member,
      guild: message.guild,
      guildId: message.guild.id,
      channel: message.channel,
      replied: false,
      deferred: false,
      client: client,
      _originalMessage: message,
      reply: async (payload) => {
        if (typeof payload === 'string') payload = { content: payload };
        interactionShim.replied = true;
        sentMessage = await message.reply(payload);
        
        // Auto-delete confirmation/simple messages for prefix commands to keep channels clean
        if (isPrefixCommand && !payload.files && !payload.components) {
          setTimeout(() => {
            sentMessage.delete().catch(() => {});
            if (payload.deleteOriginal !== false) message.delete().catch(() => {});
          }, 8000);
        }
        return sentMessage;
      },
      editReply: async (payload) => {
        if (typeof payload === 'string') payload = { content: payload };
        if (sentMessage) return await sentMessage.edit(payload);
        return message.reply(payload);
      },
      update: async (payload) => {
        if (typeof payload === 'string') payload = { content: payload };
        if (sentMessage) return await sentMessage.edit(payload);
        return message.reply(payload);
      },
      deferReply: async () => {
        interactionShim.deferred = true;
        return;
      },
      followUp: async (payload) => {
        if (typeof payload === 'string') payload = { content: payload };
        return message.channel.send(payload);
      },
      fetchReply: async () => sentMessage || message,
      options: {
        get: (name) => {
          const cleanId = (str) => str?.replace(/[<@!&>]/g, '');
          
          // Determine if first arg is a subcommand
          const hasSubcommand = ['start', 'top', 'random', 'channel', 'show', 'send', 'schedule', 'list', 'cancel', 'set', 'status'].includes(args[0]?.toLowerCase()) || 
                                ['بدء', 'توب', 'متصدرين', 'عشوائي', 'قناة', 'عرض', 'ارسل', 'جدولة', 'قائمة', 'الغاء'].includes(args[0]);
          
          const effectiveArgs = hasSubcommand ? args.slice(1) : args;

          if (['user', 'target', 'member'].includes(name)) {
            const firstArg = effectiveArgs[0];
            const userId = cleanId(firstArg) || message.mentions.users.first()?.id;
            const user = client.users.cache.get(userId) || message.mentions.users.first();
            if (user) {
              const member = message.guild.members.cache.get(user.id);
              return { user, member, value: user.id };
            }
            return null;
          }
          if (['amount', 'level', 'bet', 'coins', 'number'].includes(name)) {
            const valStr = effectiveArgs.find(a => /^\d+$/.test(a));
            const val = parseInt(valStr);
            return !isNaN(val) ? { value: val } : null;
          }
          if (['reason', 'text', 'message'].includes(name)) {
            return { value: effectiveArgs.join(' ') || null };
          }
          return effectiveArgs[0] ? { value: effectiveArgs[0] } : null;
        },
        getUser: (name) => interactionShim.options.get(name)?.user || null,
        getMember: (name) => interactionShim.options.get(name)?.member || null,
        getInteger: (name) => interactionShim.options.get(name)?.value || null,
        getNumber: (name) => interactionShim.options.get(name)?.value || null,
        getString: (name) => interactionShim.options.get(name)?.value || null,
        getChannel: (name) => message.mentions.channels.first() || null,
        getRole: (name) => message.mentions.roles.first() || null,
        getBoolean: (name) => {
          const v = normalizeArabic(String(interactionShim.options.get(name)?.value || '')).toLowerCase();
          if (['on', 'true', 'yes', 'تشغيل', 'نعم', 'تفعيل'].includes(v)) return true;
          if (['off', 'false', 'no', 'ايقاف', 'لا', 'تعطيل'].includes(v)) return false;
          return null;
        },
        getSubcommand: () => {
          const raw = args[0] || null;
          if (!raw) return null;
          const normalized = normalizeArabic(raw);
          const subMap = {
            'توب': 'top',
            'متصدرين': 'top',
            'بدء': 'start',
            'بدا': 'start',
            'عشوائي': 'random',
            'قناه': 'channel',
            'قناة': 'channel',
            'عرض': 'show',
            'ارسل': 'send',
            'جدوله': 'schedule',
            'جدولة': 'schedule',
            'قائمه': 'list',
            'قائمة': 'list',
            'الغاء': 'cancel',
            'إلغاء': 'cancel'
          };
          return subMap[normalized] || raw;
        }
      }
    };

    try {
      await cmd.execute(interactionShim);
    } catch (error) {
      logger.error(`Error executing text command ${finalCommandName}: ${error.message}`);
    }
  }
};
