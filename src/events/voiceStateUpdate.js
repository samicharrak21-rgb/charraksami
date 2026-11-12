const levels = require('../systems/levels');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(client, oldState, newState) {
    try {
      await levels.handleVoiceState(oldState, newState);
    } catch (err) {
      // Silently ignore errors in voice state updates
    }
  }
};
