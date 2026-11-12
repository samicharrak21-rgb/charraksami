// 📊 بطاقة المستوى v21 — الترتيب في السيرفر، اللقب، البريستيج، المكافأة القادمة، الشارات وسلسلة النشاط
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { readGuild } = require('../../utils/guildStorage');
const kit = require('../../utils/cardKit');
const { xpForLevel } = require('../../systems/levels');
const { levelSnapshot } = require('../../systems/levelInfo');
const { getHunterRank } = require('../../data/rpg');

module.exports = {
  aliases: ['مستواي', 'رتبتي', 'بروفايل', 'لفل', 'rank'],
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('📊 عرض بطاقة مستواك وتقدمك')
    .addUserOption((option) => option.setName('user').setDescription('المستخدم المراد عرض مستواه')),

  async execute(interaction) {
    if (typeof interaction.deferReply === 'function') await interaction.deferReply().catch(() => {});

    const target = interaction.options?.getUser?.('user') || interaction.user;
    const guildId = interaction.guildId || interaction.guild?.id;
    const g = readGuild(guildId);
    const snap = levelSnapshot(g, interaction.guild, target.id, xpForLevel);
    const u = snap.u;
    const member = interaction.guild?.members?.cache?.get(target.id);
    const name = member?.displayName || target.globalName || target.username;
    let hunter = null;
    try { hunter = (u.dungeon_wins || u.level > 1) ? getHunterRank(u.dungeon_wins || 0, u.level || 1)?.rank : null; } catch {}

    try {
      const card = await require('../../utils/modernCards').rankCard({
        username: name,
        level: snap.level, xp: snap.xp, nextXP: snap.nextXP, totalXP: snap.totalXP,
        balance: u.balance || 0,
        avatarURL: target.displayAvatarURL({ extension: 'png', size: 256 }),
        stats: { ...(u.stats || {}), dungeon_wins: u.dungeon_wins || 0, harvests: u.farm?.totalHarvested || 0 },
        rpgClass: u.rpg?.class,
        rank: snap.rank, totalUsers: snap.totalUsers, prestige: snap.prestige,
        title: snap.title, streak: snap.streak,
        hunterRank: hunter, nextReward: snap.nextReward, badges: snap.badges,
      });
      if (card?.buffer) {
        return await interaction.editReply({ files: [new AttachmentBuilder(card.buffer, { name: 'rank.png' })] });
      }
    } catch (err) {
      console.error('Failed to render rank card:', err);
    }

    const { createProgressBar, createStyledEmbed, COLORS } = require('../../utils/embeds');
    const embed = createStyledEmbed(interaction, `📊 ${name}`, COLORS.primary)
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setDescription(`${snap.title}${snap.streak > 1 ? ` • 🔥 ${snap.streak} يوم` : ''}`)
      .addFields(
        { name: '⭐ المستوى', value: `**${snap.level}**${snap.prestige ? ` • 🌟 ${snap.prestige}` : ''}`, inline: true },
        { name: '🏆 الترتيب', value: `**#${snap.rank}** من ${snap.totalUsers}`, inline: true },
        { name: '💎 الرصيد', value: `**${(u.balance || 0).toLocaleString()}**`, inline: true },
        { name: '✨ الخبرة', value: `${snap.xp.toLocaleString()} / ${snap.nextXP.toLocaleString()}\n${createProgressBar(snap.xp, snap.nextXP)}` },
        ...(snap.nextReward ? [{ name: '🎁 المكافأة القادمة', value: snap.nextReward }] : []),
      );
    return interaction.editReply({ embeds: [embed] });
  },
};
