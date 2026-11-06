const logger = require('../utils/logger');
const announcements = require('../systems/announcements');
const shhAuto = require('../systems/shh_auto');
const { startAutoAdhkar } = require('../systems/empress');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info({ tag: 'ready' }, 'Client is ready');
    logger.info({ 
      tag: 'ready',
      user: client.user.tag
    }, 'Logged in');
    
    client.user.setActivity('🌾 المزرعة | ⚔️ الدانجون', { type: 0 }); // 0 is PLAYING

    // Start background systems
    try {
      announcements.start(client);
      shhAuto.start(client);
      startAutoAdhkar(client);
      logger.info('✅ Background systems started (Announcements, SHH, Adhkar)');
    } catch (err) {
      logger.error('❌ Failed to start background systems: ' + err.message);
    }
  }
};
