const { readGuild, writeGuild } = require('../utils/guildStorage');

const AVAILABLE_FEATURES = [
  'welcome', 'announce', 'xp', 'levelroles', 'embedbuilder', 'rules', 'autorole'
];

function getAllSettings(guildId) {
  const g = readGuild(guildId) || {};
  g.settings = g.settings || {};
  // ensure defaults for available features
  for (const f of AVAILABLE_FEATURES) {
    if (typeof g.settings[f] === 'undefined') g.settings[f] = true;
  }
  // persist defaulted settings
  writeGuild(guildId, g);
  return g.settings;
}

function isEnabled(guildId, feature) {
  const settings = getAllSettings(guildId);
  return !!settings[feature];
}

function setFeature(guildId, feature, value) {
  const g = readGuild(guildId) || {};
  g.settings = g.settings || {};
  g.settings[feature] = !!value;
  writeGuild(guildId, g);
  return g.settings[feature];
}

function toggleFeature(guildId, feature) {
  const cur = !!isEnabled(guildId, feature);
  return setFeature(guildId, feature, !cur);
}

module.exports = { AVAILABLE_FEATURES, getAllSettings, isEnabled, setFeature, toggleFeature };
