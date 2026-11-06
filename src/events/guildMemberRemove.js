const { readGuild, writeGuild } = require('../utils/guildStorage');

module.exports = {
  name: 'guildMemberRemove',
  async execute(client, member) {
    try {
      const g = readGuild(member.guild.id);
      if (g && g.joinTimestamps && g.joinTimestamps[member.id]) {
        delete g.joinTimestamps[member.id];
        writeGuild(member.guild.id, g);
      }
    } catch (e) {
      console.warn('guildMemberRemove cleanup failed:', e);
    }
  }
};
