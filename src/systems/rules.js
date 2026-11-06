const { readGuild, writeGuild } = require('../utils/guildStorage');
const logger = require('../utils/logger');

async function postRulesMessage(client, guildId, channelId) {
  try {
    const guild = await client.guilds.fetch(guildId).catch(() => null);
    if (!guild) return null;
    const ch = guild.channels.cache.get(channelId);
    if (!ch || !ch.isTextBased()) return null;

    const g = readGuild(guildId);
    const cfg = g.rules || {};
    const text = cfg.message || 'Please read and agree to the server rules.';
    const roleId = cfg.role || null;

    const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
    const { createStyledEmbed } = require('../utils/embeds');
    const embed = createStyledEmbed(guild, cfg.title || 'Server Rules', cfg.color || 0x2F3136).setDescription(text);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('rules_accept').setLabel('أوافق').setStyle(ButtonStyle.Success)
    );

    const msg = await ch.send({ embeds: [embed], components: [row] });
    // save last posted message id if needed
    g.rules = g.rules || {};
    g.rules.lastMessageId = msg.id;
    writeGuild(guildId, g);
    return msg;
  } catch (err) {
    logger.error({ err }, 'postRulesMessage failed');
    return null;
  }
}

async function handleAccept(interaction) {
  try {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const g = readGuild(guildId);
    if (!g.rules || !g.rules.enabled) return interaction.reply({ content: 'Rules system is not enabled.', ephemeral: true });

    const roleId = g.rules.role;
    if (!roleId) return interaction.reply({ content: 'No role configured for rules acceptance.', ephemeral: true });

    // prevent duplicate
    g.rulesAccepted = g.rulesAccepted || [];
    if (g.rulesAccepted.includes(userId)) return interaction.reply({ content: 'You have already accepted the rules.', ephemeral: true });

    // assign role with permission checks
    const member = interaction.member;
    try {
      const { PermissionsBitField } = require('discord.js');
      const me = interaction.guild.members.me;
      if (!me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ content: 'Bot lacks Manage Roles permission to assign the role.', ephemeral: true });
      }
      const role = interaction.guild.roles.cache.get(roleId);
      if (!role) return interaction.reply({ content: 'Configured role not found on this server.', ephemeral: true });
      // role position check
      if (me.roles.highest.position <= role.position) {
        return interaction.reply({ content: 'Cannot assign role because it is equal/higher than the bot role.', ephemeral: true });
      }
      await member.roles.add(roleId);
    } catch (e) {
      logger.warn({ e }, 'Failed to add rules role');
      return interaction.reply({ content: 'Failed to assign role. Check bot permissions.', ephemeral: true });
    }

    g.rulesAccepted.push(userId);
    writeGuild(guildId, g);

    return interaction.reply({ content: 'Thank you — you have been given the role.', ephemeral: true });
  } catch (err) {
    logger.error({ err }, 'handleAccept failed');
    try { await interaction.reply({ content: 'An error occurred.', ephemeral: true }); } catch (_) {}
    return null;
  }
}

module.exports = { postRulesMessage, handleAccept };
