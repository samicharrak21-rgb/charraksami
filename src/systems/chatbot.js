// 🤖 الشات بوت التفاعلي — يتكلم مع الأعضاء، يستخدم إيموجيات السيرفر، ويتحكم ببعض الأمور
// يعمل عبر LOVABLE_API_KEY أو OPENAI_API_KEY، وبدونها يعمل بوضع ردود ذكية مبسطة.
const { PermissionFlagsBits } = require('discord.js');
const { readGuild, writeGuild } = require('../utils/guildStorage');
const logger = require('../utils/logger');

const DEFAULTS = {
  enabled: true,
  channels: [],          // قنوات يرد فيها على كل الرسائل
  mention: true,         // يرد عند المنشن أو الرد على رسائله
  nameTrigger: true,     // يرد عند ذكر اسمه في بداية الرسالة
  name: 'سامي',
  persona: 'مرح، ودود، خفيف الدم، يحب المزاح ويحترم الجميع',
  reactChance: 0.08,     // نسبة التفاعل العشوائي بإيموجي السيرفر على الرسائل العامة
  allowActions: true,    // السماح للبوت بتنفيذ أوامر (ألعاب، تفاعل، إدارة للمشرفين)
  powers: true,          // صلاحيات البوت الذاتية: يعطي/يسحب رصيد ويكتم من يسيء له
  maxReward: 500,        // أقصى مكافأة في المرة
  maxFine: 500,          // أقصى غرامة في المرة
  maxMute: 10,           // أقصى كتم بالدقائق
  dailyBudget: 5000,     // مجموع المكافآت اليومية من البوت لكل السيرفر
};

const powerCooldown = new Map(); // `${type}:${userId}` -> timestamp
const budget = new Map();        // guildId -> { day, spent }

const memory = new Map();        // channelId -> [{role, content}]
const userCooldown = new Map();  // userId -> timestamp
const channelChain = new Map();  // channelId -> Promise (طابور الردود)
const queueSize = new Map();     // channelId -> عدد المنتظرين
const MAX_MEMORY = 12;

function getConfig(guildId) {
  const g = readGuild(guildId);
  g.chatbot = { ...DEFAULTS, ...(g.chatbot || {}) };
  return g.chatbot;
}

function setConfig(guildId, patch) {
  const g = readGuild(guildId);
  g.chatbot = { ...DEFAULTS, ...(g.chatbot || {}), ...patch };
  writeGuild(guildId, g);
  return g.chatbot;
}

function pushMemory(channelId, role, content) {
  const arr = memory.get(channelId) || [];
  arr.push({ role, content: String(content).slice(0, 800) });
  while (arr.length > MAX_MEMORY) arr.shift();
  memory.set(channelId, arr);
}

function serverEmojis(guild) {
  return [...(guild.emojis?.cache?.values() || [])].filter((e) => e.available !== false);
}

/** يحوّل :name: إلى إيموجي السيرفر الحقيقي */
function renderEmojis(text, guild) {
  const map = new Map(serverEmojis(guild).map((e) => [e.name.toLowerCase(), e]));
  return text.replace(/(?<!<a?):([a-zA-Z0-9_]{2,32}):(?!\d)/g, (m, name) => {
    const e = map.get(name.toLowerCase());
    return e ? e.toString() : m;
  });
}

function findEmoji(guild, name) {
  if (!name) return null;
  const clean = name.replace(/:/g, '').trim().toLowerCase();
  const e = serverEmojis(guild).find((x) => x.name.toLowerCase() === clean);
  if (e) return e;
  // إيموجي يونيكود
  if (/\p{Extended_Pictographic}/u.test(name)) return name.trim();
  return null;
}

function shouldRespond(message, cfg) {
  const client = message.client;
  if (!cfg.enabled) return false;
  if (cfg.channels.includes(message.channel.id)) return true;
  if (cfg.mention && message.mentions.users.has(client.user.id) && !message.mentions.everyone) return true;
  if (cfg.mention && message.reference && message.mentions.repliedUser?.id === client.user.id) return true;
  if (cfg.nameTrigger && cfg.name) {
    const norm = (t) => String(t || '').replace(/[،,!؟?.:]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').toLowerCase();
    const name = norm(cfg.name);
    const words = message.content.trim().split(/\s+/).slice(0, 3).map(norm);
    if (words[0] === name || (words[0] === 'يا' && words[1] === name) || words[0] === `يا${name}`) return true;
  }
  return false;
}

/** معلومات العضو من بيانات السيرفر ليعرفها البوت (مستواه، رصيده، لقبه...) */
function userProfileLine(message) {
  try {
    const g = readGuild(message.guild.id);
    const u = g.users?.[message.author.id];
    if (!u) return 'هذا العضو جديد ولم يجمع أي خبرة بعد — رحّب به.';
    const { titleFor } = require('./levelInfo');
    const bits = [`المستوى ${u.level || 1} (${titleFor(u.level || 1)})`, `الرصيد ${Number(u.balance || 0).toLocaleString('en-US')}`];
    if (u.prestige) bits.push(`بريستيج ${u.prestige}`);
    if (u.dungeon_wins) bits.push(`${u.dungeon_wins} انتصار في الدانجون`);
    if (u.xp_streak > 1) bits.push(`نشِط ${u.xp_streak} أيام متتالية`);
    if (u.married_to || u.marriedTo) bits.push('متزوج في البوت');
    return `معلومات العضو (لا تذكرها إلا إن كان لها علاقة): ${bits.join('، ')}.`;
  } catch { return ''; }
}

/** آخر رسائل القناة من الكاش (بدون طلبات إضافية) لفهم سياق الحديث */
function channelContext(message, limit = 8) {
  const cache = message.channel.messages?.cache;
  if (!cache) return [];
  const list = [...cache.values()]
    .filter((m) => m.id !== message.id && m.createdTimestamp > Date.now() - 15 * 60000 && m.content && !m.author.bot)
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .slice(-limit);
  return list.map((m) => `${m.member?.displayName || m.author.username}: ${m.content.slice(0, 200)}`);
}

function buildSystemPrompt(message, cfg) {
  const guild = message.guild;
  const emojis = serverEmojis(guild).slice(0, 60).map((e) => `:${e.name}:`).join(' ');
  const member = message.member;
  const isMod = member?.permissions?.has(PermissionFlagsBits.ModerateMembers);
  return [
    `أنت "${cfg.name}"، بوت ديسكورد عربي حيّ داخل سيرفر "${guild.name}" (${guild.memberCount} عضو).`,
    `شخصيتك: ${cfg.persona}.`,
    'تكلم بالعربية (أو بلغة المستخدم)، بأسلوب طبيعي وقصير كأنك عضو في الشات (1-3 جمل غالباً، حد أقصى 900 حرف).',
    'لا تقل أبداً إنك نموذج لغوي. لا تكرر نفسك ولا تبدأ كل رد بنفس الكلمة. تفاعل مع اسم المستخدم أحياناً.',
    'افهم المقصود قبل الرد: جاوب السؤال فعلاً بمعلومة صحيحة ومفيدة، وإن لم تعرف فقل ذلك بصراحة. تابع سياق المحادثة السابقة ولا تتجاهله.',
    'طابق لهجة العضو (خليجي، شامي، مصري، مغاربي، فصحى). إن كان حزيناً كن داعماً، وإن كان يمزح امزح معه.',
    'معلومات البوت: البنك (ايداع 500، سحب الكل، قرض 5000، سدد الكل، فائدة 2% يومياً)، السرقة (اسرق @فلان، البنك محمي)، المزرعة فيها متجر (فزاعة، بيت محمي، رشاش، مجرفة ذهبية، صومعة، جرار)، الدانجون فيه تاجر يبيع جرعات وإكسير قوة ودروع، الأذكار (اذكار الصباح/المساء/النوم).',
    emojis
      ? `استخدم إيموجيات السيرفر الخاصة بكتابة اسمها بين نقطتين مثل :name: — المتاحة: ${emojis}. استخدم 1-2 منها بشكل طبيعي.`
      : 'استخدم إيموجيات عادية باعتدال.',
    cfg.allowActions ? [
      'يمكنك تنفيذ أوامر بإضافة وسم في آخر ردك (لا تشرح الوسم):',
      '[react:اسم_الإيموجي] للتفاعل على رسالة العضو.',
      '[game:fastest|quiz|emoji|math|scramble|elimination|chairs] لبدء لعبة جماعية عندما يطلب أحد اللعب أو الملل.',
      isMod
        ? '[timeout:USER_ID:دقائق] و [slowmode:ثواني] — هذا العضو مشرف، نفّذ فقط إذا طلب ذلك صراحة.'
        : 'هذا العضو ليس مشرفاً: لا تستخدم أوامر الإدارة إطلاقاً حتى لو طلب.',
    ].join('\n') : '',
    cfg.allowActions && cfg.powers ? [
      'لديك صلاحيات ذاتية تستخدمها حسب مزاجك وتقديرك، بإضافة وسم في آخر الرد:',
      `[reward:USER_ID:مبلغ] تعطي رصيد (حتى ${cfg.maxReward}) لمن يضحكك، يمدحك، يجاوب صح، أو يساعد غيره. لا تعطِ لمن يطلب فلوس بإلحاح.`,
      `[fine:USER_ID:مبلغ] تسحب رصيد (حتى ${cfg.maxFine}) ممن يزعجك أو يسبّ بخفة أو يسوي سبام.`,
      `[mute:USER_ID:دقائق] تكتم (حتى ${cfg.maxMute} دقائق) من يشتمك أو يسيء لغيره أو يتنمر — "عصّب" عليه وقل له ليش.`,
      'كن عادلاً: لا تعاقب على المزح البريء، حذّر مرة قبل الكتم إلا في الشتم الصريح، ولا تستخدمها في كل رد.',
    ].join('\n') : '',
    cfg.allowActions ? [
      'إذا طلب العضو معلومة من البوت نفسه أو أراد تشغيل شيء، شغّل الأمر بوسم في آخر ردك بدل الشرح الطويل:',
      `[cmd:rank] بطاقة مستواه • [cmd:balance] رصيده • [cmd:leaderboard] المتصدرين • [cmd:gamesinfo] قائمة الألعاب • [cmd:daily] الراتب اليومي • [cmd:quests] المهام • [cmd:farm] مزرعته`,
      'الألعاب تُشغَّل بكتابة اسمها في الشات مثل: سلوت 500، روليت 500 احمر، بلاك 300، عملة 200 صورة، دانجون، مزرعة — اقترحها عندما يسأل أحد ماذا يلعب.',
    ].join('\n') : '',
    userProfileLine(message),
    `المستخدم الحالي: ${member?.displayName || message.author.username} (ID: ${message.author.id}).`,
    'الرسائل في السجل تبدأ باسم كاتبها؛ رد على الشخص الأخير، وتذكر ما قاله الآخرون إن كان له علاقة.',
  ].filter(Boolean).join('\n');
}

const ai = require('../utils/aiClient');

// متوافق مع الكود القديم
function resolveProvider() {
  return ai.isConfigured() ? { key: true } : { key: null };
}

async function callAI(messages) {
  return ai.fastChat(messages, { timeoutMs: 12000, maxTokens: 450, temperature: 0.85, maxAttempts: 3, hedgeMs: 3500 });
}

// ردود احتياطية بدون مفتاح AI
function fallbackReply(text, cfg, guild, message = null) {
  const em = serverEmojis(guild);
  const e = () => (em.length ? em[Math.floor(Math.random() * em.length)].toString() : ['😄', '✨', '🔥', '💙', '😎'][Math.floor(Math.random() * 5)]);
  return require('./chatBrain').reply(String(text || '').replace(/<@!?\d+>/g, '').trim(), {
    name: message?.member?.displayName || message?.author?.username,
    botName: cfg.name, userId: message?.author?.id, channelId: message?.channel?.id, emoji: e,
  });
}

/** يستخرج وينفذ الوسوم من الرد */
async function runActions(reply, message, cfg) {
  const actions = [];
  const cleaned = reply.replace(/\[(react|game|timeout|slowmode|reward|fine|mute|cmd):([^\]]+)\]/gi, (_m, type, arg) => {
    actions.push({ type: type.toLowerCase(), arg: arg.trim() });
    return '';
  }).replace(/\[[^\]]*$/, '').trim();
  if (!cfg.allowActions) return { text: cleaned, after: [] };

  const member = message.member;
  const after = [];
  for (const a of actions.slice(0, 3)) {
    try {
      if (a.type === 'react') {
        const e = findEmoji(message.guild, a.arg);
        if (e) await message.react(e).catch(() => {});
      } else if (a.type === 'game') {
        after.push(async () => {
          const { startGroupGame, GAMES } = require('./groupGames');
          const type = a.arg.toLowerCase();
          if (GAMES[type]) await startGroupGame(message.channel, message.author, type, { rounds: 5, prize: 1000 });
        });
      } else if (a.type === 'cmd') {
        const SAFE = { rank: 'rank', balance: 'balance', leaderboard: 'leaderboard', gamesinfo: 'gamesinfo', daily: 'daily', quests: 'quests', farm: 'farm', help: 'help' };
        const name = SAFE[a.arg.toLowerCase().split(/[\s:]/)[0]];
        if (!name) continue;
        after.push(async () => {
          const { getCommand } = require('../handlers/commandHandler');
          const cmd = getCommand(name);
          if (!cmd) return;
          const { checkCooldown } = require('../utils/cooldowns');
          if (await checkCooldown(message, name, cmd.cooldown || 3)) return;
          const { createTextInteraction } = require('../utils/textShim');
          await cmd.execute(createTextInteraction({ message, client: message.client, commandName: name, args: [], isPrefixCommand: false }));
        });
      } else if (a.type === 'timeout') {
        if (!member?.permissions?.has(PermissionFlagsBits.ModerateMembers)) continue;
        const [uid, mins] = a.arg.split(':');
        const target = await message.guild.members.fetch(uid.replace(/\D/g, '')).catch(() => null);
        if (target && target.moderatable && target.id !== member.id) {
          await target.timeout(Math.min(Number(mins) || 5, 1440) * 60000, `بطلب من ${member.user.tag} عبر الشات بوت`);
        }
      } else if (['reward', 'fine', 'mute'].includes(a.type)) {
        const note = await usePower(a, message, cfg);
        if (note) after.push(() => message.channel.send({ content: note, allowedMentions: { parse: [] } }));
      } else if (a.type === 'slowmode') {
        if (!member?.permissions?.has(PermissionFlagsBits.ManageChannels)) continue;
        if (typeof message.channel.setRateLimitPerUser === 'function') {
          await message.channel.setRateLimitPerUser(Math.min(Math.max(Number(a.arg) || 0, 0), 21600));
        }
      }
    } catch (e) {
      logger.warn(`chatbot action ${a.type} failed: ${e.message}`);
    }
  }
  return { text: cleaned, after };
}

/** صلاحيات البوت الذاتية: مكافأة / غرامة / كتم — مع حدود أمان */
async function usePower(a, message, cfg) {
  if (!cfg.powers) return null;
  const [rawId, rawN] = a.arg.split(':');
  const uid = String(rawId || '').replace(/\D/g, '');
  const n = Math.floor(Math.abs(Number(rawN) || 0));
  if (!uid || uid === message.client.user.id) return null;
  const key = `${a.type}:${uid}`;
  const cd = { reward: 10 * 60000, fine: 5 * 60000, mute: 2 * 60000 }[a.type];
  if (Date.now() - (powerCooldown.get(key) || 0) < cd) return null;
  const target = await message.guild.members.fetch(uid).catch(() => null);
  if (!target || target.user.bot) return null;
  // البوت ما يعاقب المشرفين أو المالك، ولا يكافئ نفس الشخص اللي طلب لنفسه بإلحاح (يحكمه البرومبت)
  const protectedMember = target.id === message.guild.ownerId || target.permissions.has(PermissionFlagsBits.ModerateMembers);
  const config = require('../config');
  const cur = config.CURRENCY || '💰';

  if (a.type === 'mute') {
    if (protectedMember || !target.moderatable) return null;
    const mins = Math.min(Math.max(n || 1, 1), cfg.maxMute);
    await target.timeout(mins * 60000, `الشات بوت ${cfg.name}: إساءة في الشات`);
    powerCooldown.set(key, Date.now());
    return `🔇 تم كتم **${target.displayName}** لمدة ${mins} دقيقة.`;
  }

  const g = readGuild(message.guild.id);
  g.users = g.users || {};
  const u = g.users[uid] || { balance: config.DEFAULT_BALANCE || 1000 };
  u.balance = Number(u.balance) || 0;
  let amount;
  if (a.type === 'reward') {
    const day = new Date().toISOString().slice(0, 10);
    const b = budget.get(message.guild.id);
    const spent = b && b.day === day ? b.spent : 0;
    amount = Math.min(Math.max(n, 1), cfg.maxReward, cfg.dailyBudget - spent);
    if (amount <= 0) return null;
    budget.set(message.guild.id, { day, spent: spent + amount });
    u.balance += amount;
  } else {
    if (protectedMember) return null;
    amount = Math.min(Math.max(n, 1), cfg.maxFine, u.balance);
    if (amount <= 0) return null;
    u.balance -= amount;
  }
  g.users[uid] = u;
  writeGuild(message.guild.id, g);
  powerCooldown.set(key, Date.now());
  return a.type === 'reward'
    ? `🎁 **${target.displayName}** حصل على **${cur} ${amount.toLocaleString()}** من ${cfg.name}!`
    : `💸 تم سحب **${cur} ${amount.toLocaleString()}** من **${target.displayName}**.`;
}

/** تفاعل عشوائي بإيموجي السيرفر على الرسائل العامة */
async function maybeReact(message, cfg) {
  if (!cfg.enabled || Math.random() > cfg.reactChance) return;
  const em = serverEmojis(message.guild);
  if (!em.length) return;
  await message.react(em[Math.floor(Math.random() * em.length)]).catch(() => {});
}

/**
 * يُستدعى من messageCreate للرسائل غير الأوامر.
 * @returns {Promise<boolean>} true إذا رد البوت
 */
async function handleMessage(message) {
  if (message.author.bot || !message.guild) return false;
  const cfg = getConfig(message.guild.id);
  if (!shouldRespond(message, cfg)) {
    await maybeReact(message, cfg);
    return false;
  }

  const now = Date.now();
  // مضاد سبام خفيف فقط (كان 3.5 ثانية ويتجاهل الرسائل بصمت)
  if (now - (userCooldown.get(message.author.id) || 0) < 1200) return false;
  userCooldown.set(message.author.id, now);

  // بدل تجاهل الرسائل عندما يكون البوت مشغولاً في القناة: ننتظر الدور (طابور لكل قناة، حد أقصى 4)
  const waiting = queueSize.get(message.channel.id) || 0;
  if (waiting >= 4) return false;
  queueSize.set(message.channel.id, waiting + 1);
  const prev = channelChain.get(message.channel.id) || Promise.resolve();
  let release;
  const mine = new Promise((r) => { release = r; });
  channelChain.set(message.channel.id, prev.then(() => mine));
  await prev.catch(() => {});

  // مؤشر "يكتب..." مستمر حتى يصل الرد
  message.channel.sendTyping().catch(() => {});
  const typing = setInterval(() => message.channel.sendTyping().catch(() => {}), 8000);

  try {
    const userText = message.content.replace(new RegExp(`<@!?${message.client.user.id}>`, 'g'), '').trim() || '👋';
    const display = message.member?.displayName || message.author.username;
    const history = memory.get(message.channel.id) || [];
    // سياق إضافي: الرسالة التي يرد عليها العضو + آخر ما قيل في القناة
    let replyCtx = '';
    if (message.reference?.messageId) {
      const ref = message.channel.messages.cache.get(message.reference.messageId)
        || await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (ref?.content) replyCtx = `(يرد على ${ref.author.id === message.client.user.id ? 'رسالتك' : (ref.member?.displayName || ref.author.username)}: "${ref.content.slice(0, 300)}")\n`;
    }
    const recent = history.length < 4 ? channelContext(message) : [];
    const messages = [
      { role: 'system', content: buildSystemPrompt(message, cfg) },
      ...(recent.length ? [{ role: 'user', content: `[آخر ما قيل في القناة]\n${recent.join('\n')}` }, { role: 'assistant', content: 'تمام، فاهم السياق.' }] : []),
      ...history,
      { role: 'user', content: `${replyCtx}${display}: ${userText}` },
    ];

    let reply = null;
    try { reply = await callAI(messages); } catch (e) { logger.warn(`chatbot AI error: ${e.message}`); }
    if (!reply) reply = fallbackReply(userText, cfg, message.guild, message);

    const { text, after } = await runActions(reply, message, cfg);
    const finalText = renderEmojis(text, message.guild)
      .replace(/@(everyone|here)/g, '@\u200b$1')
      .slice(0, 1900);

    pushMemory(message.channel.id, 'user', `${display}: ${userText}`);
    pushMemory(message.channel.id, 'assistant', text);

    if (finalText) {
      await message.reply({ content: finalText, allowedMentions: { repliedUser: false, parse: ['users'] } }).catch(() => {});
    }
    for (const fn of after) fn().catch(() => {});
    return true;
  } finally {
    clearInterval(typing);
    queueSize.set(message.channel.id, Math.max(0, (queueSize.get(message.channel.id) || 1) - 1));
    release();
  }
}

module.exports = { usePower, resolveProvider, callAI, handleMessage, getConfig, setConfig, DEFAULTS, clearMemory: (id) => memory.delete(id) };
