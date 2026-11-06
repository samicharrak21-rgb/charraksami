const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS, createStyledEmbed } = require('../../utils/embeds');
const { setEmbedMedia } = require('../../utils/mediaRegistry');
const config = require('../../config');
const { calculateLevel } = require('../../systems/levels');

const JOBS = [
  {
    name: 'مغامر',    emoji: '⚔️', min: 60,  max: 180, type: 'warrior',
    desc: 'استكشفت دهاليز خطرة ووجدت كنوزاً مدفونة!',
    gif: 'https://media4.giphy.com/media/l4FGt6g4KDGVB4OhW/giphy.gif'
  },
  {
    name: 'صائغ جواهر', emoji: '💎', min: 80,  max: 220, type: 'miner',
    desc: 'صقلت الجواهر النادرة وبعتها بسعر ممتاز.',
    gif: 'https://media2.giphy.com/media/IG6UnfQjFcFXEBzGGg/giphy.gif'
  },
  {
    name: 'تاجر ماهر', emoji: '🏪', min: 50,  max: 160, type: 'trader',
    desc: 'أتممت صفقات رابحة في السوق الكبير.',
    gif: 'https://media1.giphy.com/media/3oKIPEqDGUULpEU0aQ/giphy.gif'
  },
  {
    name: 'صياد محترف', emoji: '🏹', min: 70,  max: 200, type: 'hunter',
    desc: 'صدت وحوشاً نادرة وبعت غنائمها.',
    gif: 'https://media3.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif'
  },
  {
    name: 'مزارع خبير', emoji: '🌾', min: 55,  max: 175, type: 'farmer',
    desc: 'حصدت محاصيل وفيرة من أرضك الخضراء.',
    gif: 'https://i.postimg.cc/65VKKCdP/dp2kuk914o9y_gif_1731_560.gif'
  },
  {
    name: 'حارس مدينة', emoji: '🛡️', min: 90,  max: 240, type: 'warrior',
    desc: 'دافعت عن المدينة وحصلت على مكافأة السلطان!',
    gif: 'https://media4.giphy.com/media/l4FGt6g4KDGVB4OhW/giphy.gif'
  },
  {
    name: 'مستكشف آثار', emoji: '🏺', min: 100, max: 280, type: 'general',
    desc: 'عثرت على قطع أثرية ثمينة في الخرائب!',
    gif: 'https://media0.giphy.com/media/3o7TKAe6Xt9RIjsGIE/giphy.gif'
  }
];

function cooldownBar(elapsed, total, size = 10) {
  const pct = Math.min(1, elapsed / total);
  const filled = Math.round(pct * size);
  return '🟩'.repeat(filled) + '⬜'.repeat(size - filled) + ` ${Math.round(pct * 100)}%`;
}

module.exports = {
  aliases: ['عمل', 'اشتغل', 'شغل', 'work'],
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('💼 اعمل لكسب الجواهر والخبرة — كل ساعة'),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const userId  = interaction.user.id;
    const g = readGuild(guildId);
    g.users = g.users || {};
    const u = g.users[userId] || { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1, stats: {} };

    const now = Date.now();
    const COOLDOWN = 60 * 60 * 1000;
    const lastWork = u.last_work || 0;
    const elapsed  = now - lastWork;

    if (elapsed < COOLDOWN) {
      const left = COOLDOWN - elapsed;
      const mins = Math.ceil(left / 60000);
      const bar  = cooldownBar(elapsed, COOLDOWN);
      return interaction.reply({
        embeds: [
          createStyledEmbed(interaction, '⏳ أنت متعب!', COLORS.warning)
            .setDescription(
              `استرح قليلاً وعُد بعد **${mins} دقيقة**.\n\n` +
              `**تقدم الراحة:**\n${bar}`
            )
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        ],
        ephemeral: true
      });
    }

    const job    = JOBS[Math.floor(Math.random() * JOBS.length)];
    const earned = Math.floor(Math.random() * (job.max - job.min + 1) + job.min);
    const xpGain = 20;
    const bonus  = u.stats?.work_count > 0 && u.stats.work_count % 10 === 0 ? Math.floor(earned * 0.5) : 0;
    const total  = earned + bonus;

    u.balance = (u.balance || 0) + total;
    u.stats   = u.stats || {};
    u.stats.work_count = (u.stats.work_count || 0) + 1;
    u.last_work = now;

    const oldLevel = u.level || 1;
    u.xp = (u.xp || 0) + xpGain;
    const newLevel = calculateLevel(u.xp);
    const leveledUp = newLevel > oldLevel;
    let levelReward = 0;
    if (leveledUp) {
      u.level = newLevel;
      levelReward = require('../../systems/levelRewards').grantLevelReward(g, u, oldLevel, newLevel);
    }

    g.users[userId] = u;
    writeGuild(guildId, g);

    // ─── Work Result Embed ───────────────────────────────
    const embed = createStyledEmbed(interaction, `${job.emoji} عملت كـ ${job.name}`, COLORS.success)
      .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
      .setDescription(`*"${job.desc}"*`)
      .addFields(
        { name: '💰 الكسب',  value: `\`+${earned.toLocaleString()}\`${bonus ? ` *(+${bonus} مكافأة)*` : ''}`, inline: true },
        { name: '⭐ الخبرة', value: `\`+${xpGain}\``, inline: true },
        { name: '📊 إجمالي العمل', value: `\`${u.stats.work_count} مرة\``, inline: true }
      )
      .setImage(job.gif)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: `💎 الرصيد: ${u.balance.toLocaleString()} • ⭐ XP: ${u.xp.toLocaleString()}` });

    if (bonus > 0) {
      embed.addFields({ name: '🎉 مكافأة الولاء!', value: `كل 10 أعمال تحصل على **+50%** مكافأة!`, inline: false });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('work_again').setLabel('⏳ عمل مرة أخرى (متاح بعد ساعة)').setStyle(ButtonStyle.Primary).setDisabled(true)
    );

    if (interaction.isButton?.()) {
      await interaction.update({ embeds: [embed], components: [row] });
    } else {
      await interaction.reply({ embeds: [embed], components: [row] });
    }

    if (leveledUp) {
      try {
        const lvlChanId = g.channels?.levels;
        const targetChannel = (lvlChanId ? interaction.guild.channels.cache.get(lvlChanId) : null) || interaction.channel;
        if (targetChannel) {
          const cfgMod = require('../../config');
          const cur = cfgMod.CURRENCY || '💎';
          const fields = levelReward ? [
            { name: '🎁 المكافأة', value: `**+${levelReward.toLocaleString()}** ${cur}`, inline: true },
            { name: '💰 رصيدك الآن', value: `**${(u.balance || 0).toLocaleString()}** ${cur}`, inline: true },
          ] : [];
          const { renderLevelUpCard } = require('../../utils/imageRenderer');
          const { cardMessage } = require('../../utils/cardEmbed');
          const card = await renderLevelUpCard({
            username: interaction.member?.displayName || interaction.user.username,
            level: u.level, oldLevel,
            reward: levelReward ? `+${levelReward.toLocaleString()} ${cfgMod.CURRENCY_NAME || 'جواهر'}` : null,
            avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
          }).catch(() => null);
          if (card?.buffer) {
            await targetChannel.send(cardMessage(card, { content: `<@${userId}>`, color: 0xf9d423, title: '🎉 مستوى جديد!', description: `<@${userId}> وصل للمستوى **${u.level}** 🎊`, fields }));
          } else {
            const lvlEmbed = createStyledEmbed(interaction, '🎉 مستوى جديد!', 0x5865F2)
              .setDescription(`<@${userId}> وصل للمستوى **${u.level}** 🎊`)
              .addFields(fields)
              .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
            await targetChannel.send({ embeds: [lvlEmbed] });
          }
        }
      } catch {}
    }
  }
};
