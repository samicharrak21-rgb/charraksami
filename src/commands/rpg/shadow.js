// ===== SHADOW ARMY COMMAND — Solo Leveling Inspired =====
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS, DESIGN } = require('../../utils/embeds');
const { SHADOW_RANKS, getHunterRank, RPG_CLASSES } = require('../../data/rpg');

const SHADOW_IMAGES = {
  army:    'https://static.wikia.nocookie.net/sololeveling/images/f/f8/Ant_King.png',
  extract: 'https://static.wikia.nocookie.net/sololeveling/images/4/4d/Architect.png',
  arise:   'https://static.wikia.nocookie.net/sololeveling/images/7/72/Antares.png'
};

const MAX_SHADOWS = 50;

function getShadowArmyPower(shadows) {
  return shadows.reduce((total, s) => {
    const rank = SHADOW_RANKS[s.rank] || SHADOW_RANKS.E;
    return total + Math.floor(s.power * rank.powerMultiplier);
  }, 0);
}

function getShadowBonus(shadows) {
  const power = getShadowArmyPower(shadows);
  return {
    atkBonus: Math.floor(power * 0.1),
    hpBonus:  Math.floor(power * 0.5),
    goldBonus: Math.floor(power * 0.05)
  };
}

module.exports = {
  aliases: ['shadow', 'ظل', 'جيش', 'shadowarmy', 'arise'],
  data: new SlashCommandBuilder()
    .setName('shadow')
    .setDescription('🌑 جيش الظلال — نظام Solo Leveling الحصري')
    .addSubcommand(sub => sub.setName('army').setDescription('👁️ عرض جيشك من الظلال'))
    .addSubcommand(sub => sub.setName('info').setDescription('📊 إحصائيات جيشك ومكافآته'))
    .addSubcommand(sub => sub.setName('arise').setDescription('⭐ قُمْ! — نشر جيشك في المعركة القادمة (تعزيز مؤقت)'))
    .addSubcommand(sub => sub.setName('release').setDescription('🔓 تحرير ظل من جيشك'))
    .addSubcommand(sub =>
      sub.setName('promote')
        .setDescription('⬆️ ترقية ظل لرتبة أعلى (يتطلب تضحية ظلال أخرى)')
        .addIntegerOption(opt => opt.setName('index').setDescription('رقم الظل (1-50)').setMinValue(1).setMaxValue(50))),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const g = readGuild(guildId);
    g.users = g.users || {};
    if (!g.users[userId]) g.users[userId] = { balance: 1000, xp: 0, level: 1 };
    const u = g.users[userId];
    u.shadow_army = u.shadow_army || [];
    const shadows = u.shadow_army;
    const hunterRank = getHunterRank(u.dungeon_wins || 0, u.level || 1);

    // ===== ARMY VIEW =====
    if (sub === 'army') {
      if (shadows.length === 0) {
        const embed = new EmbedBuilder()
          .setColor(0x1C2833)
          .setTitle('🌑 جيش الظلال')
          .setImage(SHADOW_IMAGES.army)
          .setDescription([
            `${DESIGN.thin_separator}`,
            `**جيشك فارغ.**`,
            `لاستخلاص الظلال، افتح البوابات وهزم الوحوش.`,
            `إذا كنت من جنس **ظلام (مستيقظ)**، الاستخلاص يعمل تلقائياً بنسبة 80%.`,
            `وإلا، فنسبة الاستخلاص التلقائي هي 15% عند كل انتصار.`,
            `${DESIGN.thin_separator}`
          ].join('\n'));
        return interaction.reply({ embeds: [embed] });
      }

      const groupedByRank = {};
      shadows.forEach(s => { groupedByRank[s.rank] = groupedByRank[s.rank] || []; groupedByRank[s.rank].push(s); });
      const totalPower = getShadowArmyPower(shadows);
      const bonus = getShadowBonus(shadows);

      const embed = new EmbedBuilder()
        .setColor(0x8E44AD)
        .setTitle(`🌑 جيش ظلال: ${interaction.user.username}`)
        .setThumbnail(SHADOW_IMAGES.army)
        .setDescription([
          `${hunterRank.emoji} رتبتك: **${hunterRank.rank}** — ${hunterRank.name}`,
          `⚡ **قوة الجيش الإجمالية:** ${totalPower.toLocaleString()}`,
          `🔢 **عدد الظلال:** ${shadows.length}/${MAX_SHADOWS}`,
          `${DESIGN.thin_separator}`,
          Object.entries(SHADOW_RANKS)
            .filter(([r]) => groupedByRank[r])
            .map(([r, rd]) => {
              const group = groupedByRank[r] || [];
              return `${rd.emoji} **رتبة ${r}** (${group.length}): ${group.slice(0, 5).map(s => `${s.emoji || '🌑'} ${s.name}`).join(', ')}${group.length > 5 ? ` +${group.length - 5}...` : ''}`;
            }).join('\n'),
          `${DESIGN.thin_separator}`,
          `**مكافآت الجيش:**`,
          `⚔️ +${bonus.atkBonus} هجوم | ❤️ +${bonus.hpBonus} صحة | 💰 +${bonus.goldBonus} ذهب`
        ].join('\n'));

      // Top 10 strongest
      const top10 = [...shadows].sort((a, b) => {
        const ra = SHADOW_RANKS[a.rank]?.powerMultiplier || 1;
        const rb = SHADOW_RANKS[b.rank]?.powerMultiplier || 1;
        return (b.power * rb) - (a.power * ra);
      }).slice(0, 10);

      embed.addFields({
        name: '⭐ أقوى 10 ظلال',
        value: top10.map((s, i) => {
          const rank = SHADOW_RANKS[s.rank] || SHADOW_RANKS.E;
          const effectivePower = Math.floor(s.power * rank.powerMultiplier);
          return `**${i+1}.** ${s.emoji || '🌑'} **${s.name}** ${rank.emoji} — قوة: ${effectivePower.toLocaleString()}${s.isBoss ? ' 👑' : ''}`;
        }).join('\n') || '—'
      });

      return interaction.reply({ embeds: [embed] });
    }

    // ===== INFO =====
    if (sub === 'info') {
      const bonus = getShadowBonus(shadows);
      const totalPower = getShadowArmyPower(shadows);

      const rankCounts = {};
      shadows.forEach(s => { rankCounts[s.rank] = (rankCounts[s.rank] || 0) + 1; });

      const embed = new EmbedBuilder()
        .setColor(0x1C2833)
        .setTitle('📊 إحصائيات جيش الظلال')
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '⚡ القوة الإجمالية', value: `**${totalPower.toLocaleString()}**`, inline: true },
          { name: '🔢 عدد الظلال', value: `**${shadows.length}/${MAX_SHADOWS}**`, inline: true },
          { name: '👑 ظلال الزعماء', value: `**${shadows.filter(s => s.isBoss).length}**`, inline: true },
          { name: '⚔️ بونص الهجوم', value: `**+${bonus.atkBonus}**`, inline: true },
          { name: '❤️ بونص الصحة', value: `**+${bonus.hpBonus}**`, inline: true },
          { name: '💰 بونص الذهب', value: `**+${bonus.goldBonus}**`, inline: true },
          {
            name: '📊 توزيع الرتب',
            value: Object.entries(SHADOW_RANKS).map(([r, rd]) => `${rd.emoji} **${r}**: ${rankCounts[r] || 0}`).join(' | ') || '—',
            inline: false
          }
        )
        .setDescription(`*"قُمْ وخدمني يا جنود الظلام"*\n\nجيش الظلال يمنحك مكافآت دائمة في كل المعارك. كلما كان جيشك أقوى، كانت مكافآتك أضخم.`)
        .setImage(SHADOW_IMAGES.army);

      return interaction.reply({ embeds: [embed] });
    }

    // ===== ARISE =====
    if (sub === 'arise') {
      if (shadows.length === 0) return interaction.reply({ content: '❌ جيشك فارغ. افتح البوابات أولاً.', ephemeral: true });

      // Set arise buff for next dungeon
      u.arise_active = true;
      u.arise_buff = Math.min(5.0, 1.5 + (shadows.length * 0.05));
      writeGuild(guildId, g);

      const embed = new EmbedBuilder()
        .setColor(0x8E44AD)
        .setTitle('⭐ قُمْ! — جيش الظلام يستيقظ')
        .setDescription([
          `${DESIGN.thin_separator}`,
          `**قُمْ وانضموا إليّ يا جنود الظلام!**`,
          ``,
          `🌑 **${shadows.length}** ظل استجاب للنداء.`,
          `⚡ تعزيز المعركة القادمة: **×${u.arise_buff.toFixed(1)}**`,
          ``,
          `هذا التعزيز ينتهي بعد مغامرة دانجون واحدة.`,
          `${DESIGN.thin_separator}`
        ].join('\n'))
        .setImage(SHADOW_IMAGES.arise);

      return interaction.reply({ embeds: [embed] });
    }

    // ===== RELEASE =====
    if (sub === 'release') {
      if (shadows.length === 0) return interaction.reply({ content: '❌ جيشك فارغ.', ephemeral: true });

      const options = shadows.slice(0, 25).map((s, i) => {
        const rank = SHADOW_RANKS[s.rank] || SHADOW_RANKS.E;
        return {
          label: `${i+1}. ${s.name}`,
          value: String(i),
          description: `${rank.emoji} رتبة ${s.rank} — قوة: ${s.power}${s.isBoss ? ' 👑' : ''}`,
          emoji: s.emoji || '🌑'
        };
      });

      const embed = new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('🔓 تحرير ظل من جيشك')
        .setDescription('اختر ظلاً لتحريره. **لا يمكن التراجع عن هذا القرار.**');

      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId('shadow_release_pick').setPlaceholder('اختر ظلاً لتحريره...').addOptions(options)
      );

      return interaction.reply({ embeds: [embed], components: [menu], ephemeral: true });
    }

    // ===== PROMOTE =====
    if (sub === 'promote') {
      const idx = (interaction.options.getInteger('index') || 1) - 1;
      if (idx < 0 || idx >= shadows.length) return interaction.reply({ content: '❌ رقم الظل غير صحيح.', ephemeral: true });

      const target = shadows[idx];
      const currentRankKeys = Object.keys(SHADOW_RANKS);
      const rankIdx = currentRankKeys.indexOf(target.rank);
      if (rankIdx >= currentRankKeys.length - 1) return interaction.reply({ content: '❌ هذا الظل وصل أقصى رتبة (SSS).', ephemeral: true });

      const nextRank = currentRankKeys[rankIdx + 1];
      const sacrificeNeeded = 3 + rankIdx; // More sacrifices for higher ranks
      const sameTier = shadows.filter((s, i) => i !== idx && s.rank === target.rank);

      if (sameTier.length < sacrificeNeeded) {
        return interaction.reply({
          content: `❌ لترقية **${target.name}** إلى رتبة **${nextRank}**، تحتاج **${sacrificeNeeded}** ظلال من نفس رتبته (${target.rank}). لديك: ${sameTier.length}`,
          ephemeral: true
        });
      }

      // Remove sacrifice targets
      let sacrificed = 0;
      u.shadow_army = shadows.filter((s, i) => {
        if (i === idx) return true;
        if (s.rank === target.rank && sacrificed < sacrificeNeeded) { sacrificed++; return false; }
        return true;
      });

      // Promote target
      const targetInNew = u.shadow_army.find(s => s.name === target.name && s.rank === target.rank);
      if (targetInNew) {
        targetInNew.rank = nextRank;
        targetInNew.power = Math.floor(target.power * 1.5);
      }

      writeGuild(guildId, g);
      const newRankData = SHADOW_RANKS[nextRank];
      const embed = new EmbedBuilder()
        .setColor(newRankData.color)
        .setTitle(`⬆️ ترقية ناجحة!`)
        .setDescription([
          `${target.emoji || '🌑'} **${target.name}** ارتقى إلى رتبة **${newRankData.emoji} ${nextRank}**!`,
          `تم تضحية ${sacrificeNeeded} ظلال من رتبة ${target.rank}.`,
          `القوة الجديدة: **${Math.floor(target.power * 1.5).toLocaleString()}**`
        ].join('\n'))
        .setImage(SHADOW_IMAGES.arise);
      return interaction.reply({ embeds: [embed] });
    }
  }
};

// Handle release selection (interactionCreate)
module.exports.handleShadowRelease = async function(interaction, userId, guildId) {
  if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId !== 'shadow_release_pick') return;
  const g = readGuild(guildId);
  const u = g.users[userId];
  if (!u) return;
  const idx = parseInt(interaction.values[0]);
  const shadow = u.shadow_army[idx];
  if (!shadow) return interaction.reply({ content: '❌ الظل غير موجود.', ephemeral: true });
  u.shadow_army.splice(idx, 1);
  writeGuild(guildId, g);
  return interaction.update({ content: `🔓 حررت **${shadow.name}** من جيشك.`, embeds: [], components: [] });
};
