// 🪪 بطاقة العضو v22 — مثل /rank لكن تستهدف أي عضو
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { readGuild } = require('../../utils/guildStorage');
const kit = require('../../utils/cardKit');
const { xpForLevel } = require('../../systems/levels');
const { levelSnapshot } = require('../../systems/levelInfo');

module.exports = {
  aliases: ['بطاقه', 'بطاقتي', 'كرت'],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('membercard')
    .setDescription('🪪 عرض بطاقة عضو في السيرفر')
    .addUserOption(o => o.setName('user').setDescription('العضو (افتراضياً أنت)')),
  async execute(interaction) {
    await interaction.deferReply?.().catch(() => {});
    const target = interaction.options?.getUser?.('user') || interaction.user;
    const guildId = interaction.guildId || interaction.guild?.id;
    const g = readGuild(guildId);
    const snap = levelSnapshot(g, interaction.guild, target.id, xpForLevel);
    const member = interaction.guild?.members?.cache?.get(target.id);
    const name = member?.displayName || target.globalName || target.username;
    try {
      const card = await kit.profileCard({
        username: name,
        level: snap.level, xp: snap.xp, nextXP: snap.nextXP, totalXP: snap.totalXP,
        balance: snap.u.balance || 0,
        avatarURL: target.displayAvatarURL({ extension: 'png', size: 256 }),
        stats: snap.u.stats || {},
        rpgClass: snap.u.rpg?.class,
        rank: snap.rank, totalUsers: snap.totalUsers, prestige: snap.prestige,
        title: snap.streak > 1 ? `${snap.title} · 🔥 ${snap.streak} يوم متتالي` : snap.title,
      });
      if (card?.buffer) {
        return interaction.editReply({ files: [new AttachmentBuilder(card.buffer, { name: 'membercard.png' })] });
      }
    } catch {}
    return interaction.editReply?.({ content: `🪪 **${name}** — مستوى ${snap.level} • ترتيب #${snap.rank}` }) || interaction.reply({ content: `🪪 **${name}** — مستوى ${snap.level}` });
  }
};
