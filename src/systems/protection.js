const { readGuild, writeGuild } = require('../utils/guildStorage');
const logger = require('../utils/logger');

const SPAM_COOLDOWN = 3000; // 3 seconds
const MAX_MESSAGES = 5;
const userMessages = new Map();

/**
 * Checks if a message is spam or contains forbidden links
 */
async function checkProtection(message) {
  if (!message.guild || message.author.bot || message.member?.permissions.has('ManageMessages')) return false;

  const guildId = message.guild.id;
  const g = readGuild(guildId);
  const protection = g.protection || { antiLink: false, antiSpam: false };

  // 1. Anti-Link
  if (protection.antiLink) {
    const linkRegex = /(https?:\/\/[^\s]+)|(discord\.gg\/[^\s]+)/gi;
    if (linkRegex.test(message.content)) {
      try {
        await message.delete();
        const warn = await message.channel.send({ content: `⚠️ <@${message.author.id}>، الروابط ممنوعة هنا.` });
        setTimeout(() => warn.delete().catch(() => {}), 5000);
        return true;
      } catch (err) {
        logger.error('Failed to delete link message');
      }
    }
  }

  // 2. Anti-Spam
  if (protection.antiSpam) {
    const userId = message.author.id;
    const now = Date.now();
    const userKey = `${guildId}_${userId}`;
    
    let messages = userMessages.get(userKey) || [];
    messages = messages.filter(m => now - m < SPAM_COOLDOWN);
    messages.push(now);
    userMessages.set(userKey, messages);

    if (messages.length > MAX_MESSAGES) {
      try {
        await message.delete();
        // Mute or warn user logic could go here
        return true;
      } catch (err) {
        logger.error('Failed to delete spam message');
      }
    }
  }

  // 3. Clean System Messages (Join/Boost/Leave)
  if (protection.cleanSystem) {
    const systemTypes = [
      7, 8, 9, 10, 11, // Join/Boost
      18, 19, 20, 21 // Thread/Stage/Link
    ];
    if (systemTypes.includes(message.type)) {
      try {
        await message.delete();
        return true;
      } catch (e) {}
    }
  }

  return false;
}

module.exports = { checkProtection };
