const cooldowns = new Map();

/**
 * Check if a command is on cooldown for a user
 * @param {object} interaction The interaction or message object
 * @param {string} cmdName The name of the command
 * @param {number} cmdCooldown The default cooldown in seconds
 * @returns {Promise<boolean>} True if on cooldown, false if okay
 */
async function checkCooldown(interaction, cmdName, cmdCooldown = 3) {
  const now = Date.now();
  // Comprehensive list of ALL casino/rpg/money games
  const gameCooldownSet = new Set([
    'rps', 'guess', 'roulette', 'emoji', 'sort', 'challenge', 'race', 
    'fish', 'memory', 'minesweeper', 'slots', 'blackjack', 'snake', 
    'tod', 'dungeon', 'farm', 'work', 'daily', 'rob', 'shop'
  ]);
  
  const userId = interaction.user?.id || interaction.author?.id;
  const cooldownKey = `${userId}:${cmdName}`;
  let cooldownAmount = cmdCooldown * 1000;
  
  // Apply 1-hour cooldown to ALL games (except daily which is 24h)
  if (gameCooldownSet.has(cmdName)) {
    if (cmdName === 'daily') {
      cooldownAmount = 24 * 60 * 60 * 1000; // 24 hours
    } else if (['work', 'daily', 'rob'].includes(cmdName)) {
      cooldownAmount = Math.max(cooldownAmount, 60 * 60 * 1000); 
    } else {
      cooldownAmount = 60 * 60 * 1000; // 1 hour for all casino/rpg games
    }
  }

  if (cooldowns.has(cooldownKey)) {
    const expirationTime = cooldowns.get(cooldownKey) + cooldownAmount;

    if (now < expirationTime) {
      const timeLeftMs = expirationTime - now;
      const hours = Math.floor(timeLeftMs / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);
      
      let timeStr = "";
      if (hours > 0) timeStr += `**${hours}** ساعة و `;
      if (minutes > 0 || hours > 0) timeStr += `**${minutes}** دقيقة و `;
      timeStr += `**${seconds}** ثانية`;

      const replyContent = `❌ يرجى الانتظار ${timeStr} قبل استخدام أمر \`${cmdName}\` مجدداً.`;
      
      if (interaction.reply) {
        await interaction.reply({ content: replyContent, ephemeral: true }).catch(() => {});
      } else if (interaction.channel?.send) {
        await interaction.channel.send({ content: replyContent }).catch(() => {});
      }
      return true;
    }
  }

  cooldowns.set(cooldownKey, now);
  setTimeout(() => cooldowns.delete(cooldownKey), cooldownAmount);
  return false;
}

module.exports = { checkCooldown, cooldowns };
