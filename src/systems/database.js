const { readUser, writeUser, readGuild, writeGuild } = require('../utils/guildStorage');

function getUser(userId) {
  return readUser(userId);
}

function setUser(userId, data) {
  writeUser(userId, data);
}

function getGuildSettings(guildId) {
  return readGuild(guildId);
}

function setGuildSettings(guildId, data) {
  writeGuild(guildId, data);
}

function addBalance(userId, amount) {
  const user = readUser(userId);
  user.balance = (user.balance || 0) + amount;
  writeUser(userId, user);
  return user.balance;
}

function setBalance(userId, amount) {
  const user = readUser(userId);
  user.balance = amount;
  writeUser(userId, user);
}

function addXP(userId, amount) {
  const user = readUser(userId);
  const oldLevel = user.level || 1;
  user.xp = (user.xp || 0) + amount;
  
  const newLevel = Math.floor(user.xp / 100) + 1;
  const leveledUp = newLevel > oldLevel;
  if (leveledUp) user.level = newLevel;
  
  writeUser(userId, user);
  return { leveledUp, newLevel: user.level };
}

function getUserStats(userId) {
  const user = readUser(userId);
  return user.stats || {};
}

function incrementStat(userId, statName) {
  const user = readUser(userId);
  user.stats = user.stats || {};
  user.stats[statName] = (user.stats[statName] || 0) + 1;
  writeUser(userId, user);
}

function getAFK(userId, guildId) {
  const user = readUser(userId);
  if (user.afk && user.afk.guildId === guildId) {
    return user.afk;
  }
  return null;
}

function setAFK(userId, guildId, reason, originalNick) {
  const user = readUser(userId);
  user.afk = {
    guildId,
    reason,
    original_nickname: originalNick,
    set_at: Date.now()
  };
  writeUser(userId, user);
}

function removeAFK(userId, guildId) {
  const user = readUser(userId);
  if (user.afk && user.afk.guildId === guildId) {
    user.afk = null;
    writeUser(userId, user);
  }
}

module.exports = {
  getUser,
  setUser,
  getGuildSettings,
  setGuildSettings,
  addBalance,
  setBalance,
  addXP,
  getUserStats,
  incrementStat,
  getAFK,
  setAFK,
  removeAFK
};
