const { SlashCommandBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS, createStyledEmbed } = require('../../utils/embeds');
const config = require('../../config');
const { calculateLevel } = require('../../systems/levels');

// Streak-based gift images
const STREAK_IMAGES = [
  // 1-3 days
  'https://media0.giphy.com/media/3o7TKAe6Xt9RIjsGIE/giphy.gif',
  // 4-7 days
  'https://media2.giphy.com/media/IG6UnfQjFcFXEBzGGg/giphy.gif',
  // 8-14 days — fire streak!
  'https://media4.giphy.com/media/3oz8xKaR836UJOYeOc/giphy.gif',
  // 15+ — legendary streak
  'https://media4.giphy.com/media/3oz8xKaR836UJOYeOc/giphy.gif'
];

// Streak-based colors
function streakColor(streak) {
  if (streak >= 15) return 0xF1C40F;
  if (streak >= 8)  return 0xE67E22;
  if (streak >= 4)  return 0x2ECC71;
  return COLORS.gold;
}

// Streak image picker
function streakImage(streak) {
  if (streak >= 15) return STREAK_IMAGES[3];
  if (streak >= 8)  return STREAK_IMAGES[2];
  if (streak >= 4)  return STREAK_IMAGES[1];
  return STREAK_IMAGES[0];
}

// Animated streak bar
function streakBar(streak) {
  const fire   = '🔥'.repeat(Math.min(streak, 7));
  const empty  = '▫️'.repeat(Math.max(0, 7 - streak));
  const label  = streak >= 7 ? ' 🌟 **أسبوع كامل!**' : '';
  return `${fire}${empty}${label}`;
}

// Streak title
function streakTitle(streak) {
  if (streak >= 30) return '🌟 أسطورة الأيام!';
  if (streak >= 14) return '👑 محارب الأيام!';
  if (streak >= 7)  return '🔥 أسبوع من النار!';
  if (streak >= 3)  return '✨ سلسلة متصاعدة!';
  return '🎁 الهدية اليومية';
}

module.exports = {
  aliases: ['يومي', 'راتب', 'هدية', 'daily'],
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('🎁 احصل على هديتك اليومية وبني سلسلة الأيام!'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId  = interaction.user.id;
    const g = readGuild(guildId);
    g.users = g.users || {};
    const u = g.users[userId] || { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1, stats: {} };

    const now = Date.now();
    const COOLDOWN = 24 * 60 * 60 * 1000;
    const lastDaily = u.last_daily || 0;

    if (now - lastDaily < COOLDOWN) {
      const left    = COOLDOWN - (now - lastDaily);
      const hours   = Math.floor(left / (1000 * 60 * 60));
      const minutes = Math.floor((left % (1000 * 60 * 60)) / (1000 * 60));
      return interaction.reply({
        embeds: [
          createStyledEmbed(interaction, '⏳ لقد أخذت هديتك!', COLORS.warning)
            .setDescription(
              `عُد بعد **${hours} ساعة و ${minutes} دقيقة**.\n\n` +
              `🔥 سلسلتك الحالية: **${u.daily_streak || 1} يوم**\n` +
              streakBar(u.daily_streak || 1)
            )
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        ],
        ephemeral: true
      });
    }

    // ─── Streak Calculation ───────────────────────────────
    const twoDay = 2 * COOLDOWN;
    u.daily_streak = (lastDaily && (now - lastDaily) < twoDay) ? (u.daily_streak || 1) + 1 : 1;
    const streak      = u.daily_streak;
    const streakBonus = Math.min(streak - 1, 14) * 100;
    const xpGain      = 50 + Math.min(streak - 1, 14) * 5;
    const goldReward  = (config.DAILY_REWARD || 500) + streakBonus;

    u.balance = (u.balance || 0) + goldReward;
    u.xp      = (u.xp || 0) + xpGain;
    u.last_daily = now;
    u.stats = u.stats || {};
    u.stats.daily_count = (u.stats.daily_count || 0) + 1;

    const oldLevel = u.level || 1;
    const newLevel = calculateLevel(u.xp);
    const leveledUp = newLevel > oldLevel;
    if (leveledUp) u.level = newLevel;

    g.users[userId] = u;
    writeGuild(guildId, g);

    // ─── Daily Embed ──────────────────────────────────────
    const embed = createStyledEmbed(interaction, streakTitle(streak), streakColor(streak))
      .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(
        `> *خذ هديتك اليومية واحتفظ بالسلسلة!*\n\n` +
        `**🔥 سلسلة الأيام**\n${streakBar(streak)}\n**${streak} يوم متتالي**`
      )
      .addFields(
        { name: '💰 الجواهر',   value: `\`+${goldReward.toLocaleString()}\``, inline: true },
        { name: '⭐ الخبرة',    value: `\`+${xpGain}\``, inline: true },
        { name: '🎁 مكافأة السلسلة', value: `\`+${streakBonus.toLocaleString()}\``, inline: true }
      )
      .setImage(streakImage(streak))
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `💎 الرصيد: ${u.balance.toLocaleString()} • ⭐ XP: ${u.xp.toLocaleString()} • الحد الأقصى للمكافأة: 14 يوم` });

    // Milestone announcements
    if ([7, 14, 30].includes(streak)) {
      embed.addFields({ name: '🏆 إنجاز سلسلة!', value: `وصلت لـ **${streak} يوم متتالي**! مبروك!`, inline: false });
    }

    await interaction.reply({ embeds: [embed] });

    try {
      const { checkAchievements } = require('../../systems/achievements');
      await checkAchievements(guildId, userId, interaction.channel);
    } catch {}

    if (leveledUp) {
      try {
        const lvlChanId = g.channels?.levels;
        const targetChannel = (lvlChanId ? interaction.guild.channels.cache.get(lvlChanId) : null) || interaction.channel;
        if (targetChannel) {
          const lvlEmbed = createStyledEmbed(interaction, '🎉 مستوى جديد!', 0x5865F2)
            .setDescription(`<@${userId}> وصل للمستوى **${u.level}** 🎊`)
            .setImage('https://media1.giphy.com/media/lp5K5ypNRhPmLRmX91/giphy.gif')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
          await targetChannel.send({ embeds: [lvlEmbed] });
        }
      } catch {}
    }
  }
};
