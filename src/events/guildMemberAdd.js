const { handleMemberJoin } = require('../systems/welcome');
const autorole = require('../systems/autorole');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    try {
      await handleMemberJoin(member);
      // autorole: immediate assign on join and schedule checks
      try { await autorole.onMemberJoin(member); } catch (e) { logger.warn({ err: e.message }, 'autorole onMemberJoin failed'); }
    } catch (err) {
      logger.error('guildMemberAdd handler failed:', err);
    }
  }
};
