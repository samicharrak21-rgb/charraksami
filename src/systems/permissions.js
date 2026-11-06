const { readGuild } = require('../utils/guildStorage');

function canExecute(interaction, cmd) {
  // cmd may have a `requiredRoles` array of role IDs
  try {
    const member = interaction.member;
    if (!member) return { ok: false, reason: 'no_member' };
    const g = readGuild(interaction.guildId) || {};

    if (cmd.requiredRoles && Array.isArray(cmd.requiredRoles) && cmd.requiredRoles.length > 0) {
      const has = member.roles.cache.some(r => cmd.requiredRoles.includes(r.id));
      if (!has) return { ok: false, reason: 'missing_role' };
    }

    // per-guild command blocklist/allowlist (future)
    const overrides = g.commandPermissions || {};
    const deny = overrides.deniedCommands || [];
    if (deny.includes(cmd.data?.name)) return { ok: false, reason: 'command_denied' };

    return { ok: true };
  } catch (e) {
    return { ok: true };
  }
}

module.exports = { canExecute };
