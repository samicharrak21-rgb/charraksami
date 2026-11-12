// 🛡️ modUtils v22 — أدوات مشتركة لأوامر الإشراف: صلاحيات، استهداف، سجل، خاص
const { PermissionsBitField } = require('discord.js');
const { readGuild, writeGuild } = require('./guildStorage');
const logger = require('./logger');

const FLAGS = PermissionsBitField.Flags;

/** التحقق من صلاحيات المنفّذ والبوت وتسلسل الرتب */
function canAct(interaction, { perm, targetMember, needTarget = true }) {
  const member = interaction.member;
  const me = interaction.guild?.members?.me;
  if (!member) return { ok: false, msg: '❌ تعذر التحقق من عضويتك.' };
  if (perm && !member.permissions.has(perm)) return { ok: false, msg: '❌ ليس لديك صلاحية كافية لتنفيذ هذا الإجراء.' };
  if (!me) return { ok: false, msg: '❌ تعذر الوصول لعضوية البوت.' };
  const botPerm = BOT_PERM[perm] || perm;
  if (botPerm && !me.permissions.has(botPerm)) return { ok: false, msg: '❌ البوت يحتاج صلاحية أعلى لتنفيذ هذا الإجراء.' };
  if (needTarget && targetMember) {
    if (targetMember.id === interaction.user.id) return { ok: false, msg: '❌ لا يمكنك تنفيذ هذا الإجراء على نفسك!' };
    if (targetMember.id === interaction.client?.user?.id) return { ok: false, msg: '❌ لا يمكنك تنفيذ هذا الإجراء على البوت!' };
    if (targetMember.id === interaction.guild.ownerId) return { ok: false, msg: '❌ لا يمكنك تنفيذ هذا الإجراء على مالك السيرفر!' };
    if (member.id !== interaction.guild.ownerId && targetMember.roles?.highest?.position >= member.roles?.highest?.position)
      return { ok: false, msg: '❌ لا يمكنك تنفيذ إجراء على عضو رتبته أعلى منك أو مساوية لك.' };
    if (targetMember.roles?.highest?.position >= me.roles?.highest?.position)
      return { ok: false, msg: '❌ رتبة العضو أعلى من رتبة البوت — ارفع رتبة البوت أولاً.' };
  }
  return { ok: true };
}

const BOT_PERM = {
  [FLAGS.BanMembers]: FLAGS.BanMembers,
  [FLAGS.KickMembers]: FLAGS.KickMembers,
  [FLAGS.ModerateMembers]: FLAGS.ModerateMembers,
  [FLAGS.ManageMessages]: FLAGS.ManageMessages,
  [FLAGS.ManageChannels]: FLAGS.ManageChannels,
  [FLAGS.ManageRoles]: FLAGS.ManageRoles,
  [FLAGS.ManageNicknames]: FLAGS.ManageNicknames,
};

/**
 * استهداف العضو: خيار user، أو أول منشن، أو الرد على رسالة العضو («تعاقبه لو رديت على رسالته»)
 */
async function resolveTarget(interaction) {
  // 1) خيار slash أو منشن من الشات
  let target = interaction.options?.getMember?.('user') || interaction.options?.getUser?.('user') || null;
  // 2) الشات النصي: المنشن من الوسائط
  if (!target && interaction.isMessage?.()) {
    const msg = interaction._originalMessage || interaction.message;
    const first = msg?.mentions?.members?.first?.() || null;
    if (first) target = first;
    // 3) الرد على رسالة العضو المخالف
    if (!target && msg?.reference?.messageId) {
      try {
        const replied = await msg.channel.messages.fetch(msg.reference.messageId).catch(() => null);
        const author = replied?.author;
        if (author && !author.bot) {
          target = msg.guild.members.cache.get(author.id) || { id: author.id, user: author, displayName: author.username };
        }
      } catch {}
    }
  }
  if (!target) return null;
  if (target.user) return target; // GuildMember
  return interaction.guild.members.cache.get(target.id) || { id: target.id, user: target, displayName: target.username };
}

function targetName(target) {
  return target?.displayName || target?.user?.username || target?.username || 'عضو';
}
function targetAvatar(target) {
  return target?.user?.displayAvatarURL?.({ extension: 'png', size: 256 }) || target?.displayAvatarURL?.({ extension: 'png', size: 256 }) || null;
}

// ============ التخزين ============
function ensureMod(g) {
  g.mod = g.mod || {};
  g.mod.counter = g.mod.counter || 0;
  g.mod.cases = g.mod.cases || [];
  g.mod.warns = g.mod.warns || {};
  return g.mod;
}

const AR_TYPES = {
  ban: 'حظر', unban: 'فك حظر', kick: 'طرد', mute: 'إسكات', unmute: 'فك إسكات',
  warn: 'تحذير', clear: 'مسح رسائل', lock: 'قفل قناة', unlock: 'فتح قناة',
  slowmode: 'وضع بطيء', nickname: 'تغيير لقب', role_add: 'إعطاء رتبة', role_remove: 'سحب رتبة', say: 'إرسال رسالة',
};

/** تسجيل عقوبة في سجل السيرفر + إرسال بطاقة مرسومة لقناة السجل إن ضُبطت */
async function logCase(interaction, type, target, reason) {
  const guildId = interaction.guild.id;
  const g = readGuild(guildId);
  const mod = ensureMod(g);
  mod.counter += 1;
  const caseId = mod.counter;
  const entry = {
    id: caseId, type,
    userId: target?.id || null,
    userTag: targetName(target),
    modId: interaction.user.id,
    modTag: interaction.user.username || interaction.user.tag,
    reason: reason || 'بدون سبب',
    at: Date.now(),
  };
  mod.cases.push(entry);
  if (mod.cases.length > 500) mod.cases = mod.cases.slice(-500);
  writeGuild(guildId, g);

  // بطاقة مرسومة في قناة السجل
  const chanId = mod.channelId;
  if (chanId) {
    try {
      const channel = interaction.guild.channels.cache.get(chanId);
      if (channel?.isTextBased()) {
        const modCards = require('./modCards');
        const card = await modCards.modCaseCard({
          caseId, type: AR_TYPES[type] || type,
          targetName: entry.userTag, targetAvatar: targetAvatar(target),
          modName: entry.modTag, modAvatar: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
          reason: entry.reason,
          guildName: interaction.guild.name,
        });
        if (card?.buffer) {
          const { cardMessage } = require('./cardEmbed');
          await channel.send(cardMessage(card, {
            title: '🛡️ عقوبة جديدة',
            description: `**${entry.modTag}** نفّذ: **${AR_TYPES[type] || type}** على **${entry.userTag}**`,
            color: 0xE8455F,
            footer: `الحالة #${caseId} • ${interaction.guild.name}`,
          })).catch(() => {});
        } else {
          await channel.send({ embeds: [{
            title: `🛡️ ${AR_TYPES[type] || type} — الحالة #${caseId}`,
            description: `**المُنفِّذ:** ${entry.modTag}\n**العضو:** ${entry.userTag}\n**السبب:** ${entry.reason}`,
            color: 0xE8455F, timestamp: new Date().toISOString(),
          }] }).catch(() => {});
        }
      }
    } catch (e) { logger.warn({ err: e.message }, 'modlog card send failed'); }
  }
  return entry;
}

/** رسالة خاصة للعضو المُعاقب */
async function dmPunishment(target, payload) {
  try {
    const user = target.user || target;
    await user.send(payload);
  } catch {}
}

function dmEmbed(typeLabel, guildName, reason, extra = '') {
  return {
    title: `🛡️ تم تطبيق عقوبة: ${typeLabel}`,
    description: [`تم تنفيذ إجراء **${typeLabel}** عليك في سيرفر **${guildName}**.`, '', `📋 **السبب:** ${reason || 'بدون سبب'}`, extra].filter(Boolean).join('\n'),
    color: 0xE8455F,
    timestamp: new Date().toISOString(),
    footer: { text: 'إذا كان هذا خطأ، تواصل مع إدارة السيرفر.' },
  };
}

module.exports = { FLAGS, canAct, resolveTarget, targetName, targetAvatar, ensureMod, logCase, dmPunishment, dmEmbed, AR_TYPES };
