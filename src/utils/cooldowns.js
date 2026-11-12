// ⏱️ نظام المهلات v21 — مهلة مستقلة ومعقولة لكل لعبة بدل «ساعة واحدة» للجميع
// (المهلة الطويلة كانت تجعل الألعاب تبدو معطلة: زر «جولة أخرى» يرفض لمدة ساعة)
const cooldowns = new Map();

/** المهلة بالثواني لكل أمر. يمكن للأمر أن يحدد cooldown خاصاً به وتُستخدم القيمة الأكبر. */
const GAME_COOLDOWNS = {
  // الكازينو — جولات سريعة متتالية
  slots: 6, roulette: 8, blackjack: 8, coinflip: 5, rps: 5, minesweeper: 10,
  // ألعاب
  fish: 45, hangman: 10, wordle: 10, trivia: 8, tictactoe: 10, connect4: 10, group: 10,
  // ألعاب v23
  guess: 8, race: 10, highlow: 6, scratch: 6, crash: 8, treasure: 6, social: 3,
  // RPG
  dungeon: 90, farm: 3, shop: 3, gate: 30,
  // الاقتصاد — work/daily لهما مؤقت داخلي برسالة خاصة، هنا فقط حماية من التكرار
  work: 5, daily: 5, rob: 30 * 60,
};

function formatLeft(ms) {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.ceil((ms % 60000) / 1000);
  const parts = [];
  if (h) parts.push(`**${h}** ساعة`);
  if (m) parts.push(`**${m}** دقيقة`);
  if (s || !parts.length) parts.push(`**${s}** ثانية`);
  return parts.join(' و ');
}

/**
 * @returns {Promise<boolean>} true إذا كان المستخدم في فترة انتظار
 */
async function checkCooldown(interaction, cmdName, cmdCooldown = 3) {
  const now = Date.now();
  const userId = interaction.user?.id || interaction.author?.id;
  const key = `${userId}:${cmdName}`;
  const seconds = Math.max(cmdCooldown || 0, GAME_COOLDOWNS[cmdName] || 0) || 3;
  const amount = seconds * 1000;

  const last = cooldowns.get(key);
  if (last && now < last + amount) {
    const left = last + amount - now;
    const content = `⏳ انتظر ${formatLeft(left)} قبل استخدام \`${cmdName}\` مجدداً.`;
    try {
      if (interaction.isButton?.() || interaction.isChatInputCommand?.()) {
        if (interaction.replied || interaction.deferred) await interaction.followUp({ content, ephemeral: true });
        else await interaction.reply({ content, ephemeral: true });
      } else if (interaction.reply) {
        const m = await interaction.reply({ content });
        setTimeout(() => m?.delete?.().catch(() => {}), 6000);
      }
    } catch {}
    return true;
  }
  cooldowns.set(key, now);
  setTimeout(() => { if (cooldowns.get(key) === now) cooldowns.delete(key); }, amount).unref?.();
  return false;
}

/** يلغي المهلة (مثلاً عند فشل اللعبة قبل أن تبدأ) */
function clearCooldown(userId, cmdName) { cooldowns.delete(`${userId}:${cmdName}`); }

/** نص المهلة للعرض في قوائم الألعاب */
function cooldownLabel(cmdName) {
  const s = GAME_COOLDOWNS[cmdName];
  if (!s) return 'فوري';
  if (s < 60) return `${s}ث`;
  if (s < 3600) return `${Math.round(s / 60)}د`;
  return `${Math.round(s / 3600)}س`;
}

module.exports = { checkCooldown, clearCooldown, cooldownLabel, GAME_COOLDOWNS, cooldowns };
