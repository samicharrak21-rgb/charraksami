// 💬 textShim v21 — يحوّل رسالة نصية («سلوت 500»، «حجرة @فلان») إلى كائن يشبه Slash Interaction
// يقرأ الخيارات حسب نوعها: المستخدم من المنشن/الآيدي، الأرقام (مع 1k/2m/الكل)، والنصوص.
const SUBCOMMANDS = {
  top: 'top', 'توب': 'top', 'متصدرين': 'top',
  start: 'start', 'بدء': 'start', 'بدا': 'start', 'ابدا': 'start',
  random: 'random', 'عشوائي': 'random',
  channel: 'channel', 'قناه': 'channel', 'قناة': 'channel',
  show: 'show', 'عرض': 'show',
  send: 'send', 'ارسل': 'send',
  schedule: 'schedule', 'جدوله': 'schedule', 'جدولة': 'schedule',
  list: 'list', 'قائمه': 'list', 'قائمة': 'list',
  cancel: 'cancel', 'الغاء': 'cancel', 'إلغاء': 'cancel',
  set: 'set', status: 'status',
  profile: 'profile', 'ملف': 'profile', 'ملفي': 'profile', 'بروفايل': 'profile',
  add: 'add', 'اضف': 'add', 'اضافة': 'add', 'اعطاء': 'add', 'ضيف': 'add', 'امنح': 'add', 'اتيح': 'add',
  remove: 'remove', 'شيل': 'remove', 'سحب': 'remove', 'ازاله': 'remove', 'احذف': 'remove', 'انزع': 'remove',
};

const norm = (t) => String(t || '')
  .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[\u064B-\u0652]/g, '').toLowerCase();

const TEXT_OPTIONS = new Set(['reason', 'text', 'message', 'content', 'question', 'msg', 'description', 'title', 'say', 'word', 'note']);
const ALL_WORDS = new Set(['all', 'الكل', 'كل', 'max', 'كامل']);

/** يحوّل «500» «1k» «2.5m» «١٠٠٠» إلى رقم */
function parseAmount(tok) {
  if (tok == null) return null;
  const s = String(tok).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/,/g, '').toLowerCase();
  const m = s.match(/^(\d+(?:\.\d+)?)(k|m|b|ك|ألف|الف)?$/);
  if (!m) return null;
  const mult = { k: 1e3, 'ك': 1e3, 'ألف': 1e3, 'الف': 1e3, m: 1e6, b: 1e9 }[m[2]] || 1;
  return Math.floor(parseFloat(m[1]) * mult);
}

function subcommandsOf(cmd) {
  try {
    const json = cmd?.data?.toJSON ? cmd.data.toJSON() : cmd?.data;
    return (json?.options || []).filter((o) => o.type === 1).map((o) => o.name);
  } catch { return []; }
}

/** يحدد الأمر الفرعي: من الكلمة الأولى، أو من كلمة التشغيل («ايداع»)، أو الافتراضي */
function pickSub(cmd, first, trigger) {
  const names = subcommandsOf(cmd);
  if (!names.length) return { sub: first ? SUBCOMMANDS[norm(first)] || null : null, shift: !!(first && SUBCOMMANDS[norm(first)]) };
  const local = {};
  for (const [k, v] of Object.entries(cmd.subAliases || {})) local[norm(k)] = v;
  const f = first ? norm(first) : null;
  if (f && local[f] && names.includes(local[f])) return { sub: local[f], shift: true };
  if (f && names.includes(f)) return { sub: f, shift: true };
  if (f && SUBCOMMANDS[f] && names.includes(SUBCOMMANDS[f])) return { sub: SUBCOMMANDS[f], shift: true };
  const tw = trigger ? norm(String(trigger).split(/\s+/)[0]) : null;
  if (tw && local[tw] && names.includes(local[tw])) return { sub: local[tw], shift: false };
  const def = cmd.defaultSub && names.includes(cmd.defaultSub) ? cmd.defaultSub : names[0];
  return { sub: def, shift: false };
}

function createTextInteraction({ message, client, commandName, args, isPrefixCommand, balanceOf, cmd = null, trigger = null }) {
  const first = args[0];
  const picked = pickSub(cmd, first, trigger);
  const sub = picked.sub;
  const rest = picked.shift ? args.slice(1) : args;

  // تصنيف الوسائط
  const users = [];
  const numbers = [];
  const words = [];
  for (const a of rest) {
    const id = a.match(/^<@!?(\d{15,21})>$/)?.[1] || (a.match(/^\d{17,21}$/) ? a : null);
    if (id) { users.push(id); continue; }
    if (/^<[#@&]/.test(a)) continue;
    const n = parseAmount(a);
    if (n !== null) { numbers.push(n); continue; }
    if (ALL_WORDS.has(norm(a)) && balanceOf) { numbers.push(balanceOf()); continue; }
    words.push(a);
  }
  for (const u of message.mentions.users.values()) if (!users.includes(u.id) && u.id !== client.user.id) users.push(u.id);
  const usedNums = new Map(); // يسمح بقراءة رقمين مختلفين (rounds/prize) بالترتيب

  const findUser = (idx = 0) => {
    const id = users[idx];
    if (!id) return null;
    return client.users.cache.get(id) || message.mentions.users.get(id) || null;
  };

  let sentMessage = null;
  const shim = {
    type: 2,
    isChatInputCommand: () => true,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
    isRepliable: () => true,
    isMessage: () => true,
    commandName,
    user: message.author,
    member: message.member,
    guild: message.guild,
    guildId: message.guild.id,
    channel: message.channel,
    channelId: message.channel.id,
    replied: false,
    deferred: false,
    client,
    createdTimestamp: message.createdTimestamp,
    _originalMessage: message,
    async reply(payload) {
      if (typeof payload === 'string') payload = { content: payload };
      const { ephemeral, fetchReply, flags, ...rest } = payload || {};
      shim.replied = true;
      if (sentMessage) { await sentMessage.edit(rest).catch(() => {}); return sentMessage; }
      sentMessage = await message.reply({ allowedMentions: { repliedUser: false }, ...rest });
      // الرسائل البسيطة/الأخطاء تُحذف تلقائياً لإبقاء القناة نظيفة
      if (ephemeral || (isPrefixCommand && !rest.files?.length && !rest.components?.length && !rest.embeds?.length)) {
        const m = sentMessage;
        setTimeout(() => m.delete().catch(() => {}), 9000);
      }
      return sentMessage;
    },
    async editReply(payload) {
      if (typeof payload === 'string') payload = { content: payload };
      const { ephemeral, fetchReply, flags, ...rest } = payload || {};
      if (sentMessage) return sentMessage.edit(rest);
      shim.replied = true;
      sentMessage = await message.reply({ allowedMentions: { repliedUser: false }, ...rest });
      return sentMessage;
    },
    update(payload) { return shim.editReply(payload); },
    async deferReply() {
      shim.deferred = true;
      message.channel.sendTyping?.().catch(() => {});
    },
    async deferUpdate() {},
    async followUp(payload) {
      if (typeof payload === 'string') payload = { content: payload };
      const { ephemeral, fetchReply, flags, ...rest } = payload || {};
      const m = await message.channel.send(rest);
      if (ephemeral) setTimeout(() => m.delete().catch(() => {}), 9000);
      return m;
    },
    async deleteReply() { if (sentMessage) await sentMessage.delete().catch(() => {}); },
    async fetchReply() { return sentMessage || message; },
    async showModal() {
      await message.reply('ℹ️ هذا الخيار يحتاج نافذة إدخال — استخدم الأمر بصيغة `/` لهذه الخطوة.').catch(() => {});
    },
    options: {
      _args: rest,
      _trigger: trigger,
      getSubcommand: (required) => sub || (required === false ? null : (first ? norm(first) : null)),
      getSubcommandGroup: () => null,
      getUser: (name) => findUser(name === 'user2' || name === 'second' ? 1 : 0),
      getMember: (name) => {
        const u = findUser(name === 'user2' ? 1 : 0);
        return u ? message.guild.members.cache.get(u.id) || null : null;
      },
      getInteger: (name) => {
        if (!numbers.length) return null;
        if (!usedNums.has(name)) usedNums.set(name, Math.min(usedNums.size, numbers.length - 1));
        return numbers[usedNums.get(name)] ?? null;
      },
      getNumber: (name) => shim.options.getInteger(name),
      getString: (name) => {
        if (TEXT_OPTIONS.has(name)) return rest.filter((a) => !/^<@!?\d+>$/.test(a)).join(' ') || null;
        return words[0] ?? null;
      },
      getBoolean: (name) => {
        const v = norm(words[0]);
        if (['on', 'true', 'yes', 'تشغيل', 'نعم', 'تفعيل'].includes(v)) return true;
        if (['off', 'false', 'no', 'ايقاف', 'لا', 'تعطيل'].includes(v)) return false;
        return null;
      },
      getChannel: () => message.mentions.channels.first() || null,
      getRole: () => message.mentions.roles.first() || null,
      getAttachment: () => message.attachments.first() || null,
      getMentionable: () => findUser(0) || message.mentions.roles.first() || null,
      get: (name) => {
        const u = findUser(0);
        if (['user', 'target', 'member', 'opponent'].includes(name) && u) return { user: u, member: message.guild.members.cache.get(u.id), value: u.id };
        const n = shim.options.getInteger(name);
        if (n !== null && ['amount', 'level', 'bet', 'coins', 'number'].includes(name)) return { value: n };
        const s = shim.options.getString(name);
        return s ? { value: s } : null;
      },
    },
  };
  return shim;
}

module.exports = { createTextInteraction, parseAmount, norm, pickSub, subcommandsOf };
