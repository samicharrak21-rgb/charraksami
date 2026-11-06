// ===== DAILY GATE SYSTEM — Solo Leveling Inspired =====
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS, DESIGN } = require('../../utils/embeds');
const { getHunterRank, ENEMIES, BOSSES, STAGES } = require('../../data/rpg');
const config = require('../../config');

const GATE_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours

const GATE_TYPES = [
  {
    rank: 'E', name: 'بوابة E', emoji: '⬜', color: 0x95A5A6,
    desc: 'بوابة ضعيفة — وحوش المستوى الأول',
    image: 'https://static.wikia.nocookie.net/sololeveling/images/8/8c/High_Goblin.png',
    stage: 1, difficulty: 0.8, reward: { min: 200, max: 500 }, xp: 50
  },
  {
    rank: 'D', name: 'بوابة D', emoji: '🟩', color: 0x2ECC71,
    desc: 'بوابة متوسطة — وحوش من المستوى الثاني',
    image: 'https://static.wikia.nocookie.net/sololeveling/images/5/5a/Lizard_Man.png',
    stage: 2, difficulty: 1.2, reward: { min: 800, max: 2000 }, xp: 150
  },
  {
    rank: 'C', name: 'بوابة C', emoji: '🟦', color: 0x3498DB,
    desc: 'بوابة خطيرة — تنانين وحراس',
    image: 'https://static.wikia.nocookie.net/sololeveling/images/3/38/Flame_Giant.png',
    stage: 3, difficulty: 2.0, reward: { min: 3000, max: 8000 }, xp: 400
  },
  {
    rank: 'B', name: 'بوابة B', emoji: '🟪', color: 0x9B59B6,
    desc: 'بوابة شديدة — عمالقة وشياطين',
    image: 'https://static.wikia.nocookie.net/sololeveling/images/6/68/Demon_Marshal_Baruka.png',
    stage: 4, difficulty: 3.5, reward: { min: 10000, max: 30000 }, xp: 1000
  },
  {
    rank: 'A', name: 'بوابة A', emoji: '🟨', color: 0xF1C40F,
    desc: 'بوابة قاتلة — كيانات من عالم أعلى',
    image: 'https://static.wikia.nocookie.net/sololeveling/images/f/f8/Ant_King.png',
    stage: 5, difficulty: 6.0, reward: { min: 50000, max: 150000 }, xp: 3000
  },
  {
    rank: 'S', name: 'بوابة S 🔴', emoji: '🔴', color: 0xE74C3C,
    desc: '⭐ بوابة S النادرة — زعيم أسطوري يحتاج صائداً S-class',
    image: 'https://static.wikia.nocookie.net/sololeveling/images/7/72/Antares.png',
    stage: 5, difficulty: 10.0, reward: { min: 200000, max: 500000 }, xp: 10000, rare: true, minRank: 'S'
  }
];

function pickGate(hunterRank) {
  const eligibleGates = GATE_TYPES.filter(g => {
    if (!g.minRank) return true;
    const rankOrder = ['E','D','C','B','A','S','SS','SSS'];
    return rankOrder.indexOf(hunterRank.rank) >= rankOrder.indexOf(g.minRank);
  });
  // Weighted random: lower ranks more common
  const weights = eligibleGates.map((_, i) => Math.max(1, 10 - i * 1.5));
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < eligibleGates.length; i++) {
    r -= weights[i];
    if (r <= 0) return eligibleGates[i];
  }
  return eligibleGates[0];
}

function simulateBattle(player, gateType) {
  const stageEnemies = ENEMIES.filter(e => e.stage === gateType.stage);
  const boss = BOSSES.find(b => b.stage === gateType.stage);

  const enemyPool = stageEnemies.length ? stageEnemies : [{ name: 'وحش البوابة', hp: 100, atk: 20 }];
  const numEnemies = 3 + Math.floor(Math.random() * 4);
  const enemies = Array.from({ length: numEnemies }, () => {
    const base = enemyPool[Math.floor(Math.random() * enemyPool.length)];
    return { ...base, hp: Math.floor(base.hp * gateType.difficulty), atk: Math.floor((base.atk || 10) * gateType.difficulty) };
  });
  if (boss) enemies.push({ ...boss, hp: Math.floor(boss.hp * gateType.difficulty * 0.5), atk: Math.floor((boss.atk || 50) * gateType.difficulty * 0.5), isBoss: true });

  let playerHp = player.hp;
  const log = [];
  let survived = true;

  for (const enemy of enemies) {
    const rounds = [];
    let eHp = enemy.hp;
    let round = 0;
    while (eHp > 0 && playerHp > 0 && round < 50) {
      round++;
      const isCrit = Math.random() < (player.critChance || 0.1);
      const pDmg = Math.floor(player.atk * (isCrit ? 2 : 1) * (0.8 + Math.random() * 0.4));
      eHp -= pDmg;
      if (eHp <= 0) break;
      const eDmg = Math.floor(enemy.atk * (0.8 + Math.random() * 0.4));
      playerHp -= eDmg;
    }
    if (playerHp <= 0) { survived = false; break; }
    log.push(`${enemy.isBoss ? '👑' : enemy.emoji || '👾'} **${enemy.name}** هُزم${enemy.isBoss ? ' — الزعيم سقط!' : ''}`);
  }

  return { survived, playerHpLeft: Math.max(0, playerHp), log };
}

module.exports = {
  aliases: ['gate', 'بوابة', 'bwaba', 'يومي', 'daily_gate'],
  data: new SlashCommandBuilder()
    .setName('gate')
    .setDescription('🌀 نظام البوابات اليومية — Solo Leveling Style')
    .addSubcommand(sub => sub.setName('open').setDescription('🌀 افتح بوابة عشوائية وقاتل'))
    .addSubcommand(sub => sub.setName('status').setDescription('📊 حالة بواباتك اليوم')),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const sub = interaction.options.getSubcommand();
    const g = readGuild(guildId);
    g.users = g.users || {};
    if (!g.users[userId]) g.users[userId] = { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1 };
    const u = g.users[userId];
    const hunterRank = getHunterRank(u.dungeon_wins || 0, u.level || 1);

    if (sub === 'status') {
      const lastGate = u.last_gate_time || 0;
      const remaining = GATE_COOLDOWN - (Date.now() - lastGate);
      const gatesToday = u.gates_today || 0;
      const embed = new EmbedBuilder()
        .setColor(hunterRank.color || COLORS.info)
        .setTitle('📊 حالة البوابات')
        .addFields(
          { name: '🏅 رتبتك', value: `${hunterRank.emoji} **${hunterRank.rank}** — ${hunterRank.name}`, inline: true },
          { name: '🌀 بوابات اليوم', value: `**${gatesToday}**`, inline: true },
          { name: '⏳ الكول داون', value: remaining > 0 ? `${Math.ceil(remaining / 60000)} دقيقة` : '✅ جاهز!', inline: true },
          { name: '💎 مجموع المكافآت', value: `${(u.gate_total_gold || 0).toLocaleString()} 💎`, inline: true },
          { name: '🏆 أعلى رتبة بوابة', value: u.highest_gate || 'E', inline: true }
        );
      return interaction.reply({ embeds: [embed] });
    }

    // ===== OPEN GATE =====
    if (sub === 'open') {
      const lastGate = u.last_gate_time || 0;
      const remaining = GATE_COOLDOWN - (Date.now() - lastGate);
      if (remaining > 0) {
        return interaction.reply({
          embeds: [new EmbedBuilder()
            .setColor(COLORS.error)
            .setTitle('⏳ البوابات مغلقة')
            .setDescription(`البوابة التالية تفتح خلال **${Math.ceil(remaining / 60000)}** دقيقة.`)],
          ephemeral: true
        });
      }

      const gate = pickGate(hunterRank);
      const playerAtk = 15 + (u.level || 1) * 6 + (u.atk_bonus || 0) + (u.equipment?.weapons?.atk || 0);
      const playerHp = 100 + (u.level || 1) * 25 + (u.hp_bonus || 0) + (u.equipment?.armor?.hp || 0);
      const shadows = u.shadow_army || [];
      const shadowBonus = Math.floor(shadows.reduce((s, sh) => s + (sh.power || 0), 0) * 0.1);

      const gateEmbed = new EmbedBuilder()
        .setColor(gate.color)
        .setTitle(`🌀 ${gate.name} تفتح أمامك!`)
        .setDescription([
          `${DESIGN.thin_separator}`,
          `${gate.emoji} **${gate.name}** — ${gate.desc}`,
          ``,
          `**إحصائياتك:**`,
          `⚔️ هجوم: **${playerAtk + shadowBonus}** (بونص ظلال: +${shadowBonus})`,
          `❤️ صحة: **${playerHp}**`,
          `🏅 رتبتك: **${hunterRank.rank}**`,
          ``,
          `💰 مكافأة متوقعة: **${gate.reward.min.toLocaleString()} — ${gate.reward.max.toLocaleString()}** 💎`,
          `⭐ XP: **${gate.xp.toLocaleString()}**`,
          `${DESIGN.thin_separator}`,
          `هل تدخل البوابة؟`
        ].join('\n'))
        .setImage(gate.image);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('gate_enter').setLabel('دخول البوابة ⚔️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('gate_skip').setLabel('تجاهل 🚶').setStyle(ButtonStyle.Secondary)
      );

      const msg = await interaction.reply({ embeds: [gateEmbed], components: [row], fetchReply: true });
      const collector = msg.createMessageComponentCollector({ time: 60000 });

      collector.on('collect', async i => {
        if (i.user.id !== userId) return i.reply({ content: '❌', ephemeral: true });
        if (i.customId === 'gate_skip') {
          collector.stop();
          return i.update({ content: '🚶 تجاهلت البوابة.', embeds: [], components: [] });
        }
        if (i.customId === 'gate_enter') {
          collector.stop();
          await i.update({ content: '⚔️ تدخل البوابة...', embeds: [], components: [] });

          // Simulate battle
          const player = { hp: playerHp, atk: playerAtk + shadowBonus, critChance: 0.1 + (hunterRank.rank === 'S' ? 0.2 : 0) };
          const result = simulateBattle(player, gate);

          const gold = result.survived
            ? Math.floor(gate.reward.min + Math.random() * (gate.reward.max - gate.reward.min))
            : Math.floor((gate.reward.min + Math.random() * (gate.reward.max - gate.reward.min)) * 0.1);

          const xp = result.survived ? gate.xp : Math.floor(gate.xp * 0.1);

          // Update user data
          const g2 = readGuild(guildId);
          const u2 = g2.users[userId];
          u2.balance = (u2.balance || 0) + gold;
          u2.xp = (u2.xp || 0) + xp;
          u2.last_gate_time = Date.now();
          u2.gates_today = (u2.gates_today || 0) + 1;
          u2.gate_total_gold = (u2.gate_total_gold || 0) + gold;

          // Track highest gate rank
          const rankOrder = ['E','D','C','B','A','S','SS','SSS'];
          const currentHighestIdx = rankOrder.indexOf(u2.highest_gate || 'E');
          const thisGateIdx = rankOrder.indexOf(gate.rank.replace(' 🔴', ''));
          if (result.survived && thisGateIdx > currentHighestIdx) u2.highest_gate = gate.rank;

          // Random shadow extraction from gate
          if (result.survived && Math.random() < 0.2) {
            u2.shadow_army = u2.shadow_army || [];
            if (u2.shadow_army.length < 50) {
              const shadowName = `ظل بوابة ${gate.rank}`;
              const shadowPower = Math.floor(50 * gate.difficulty);
              u2.shadow_army.push({ name: shadowName, rank: gate.rank.replace(' 🔴', '') || 'E', power: shadowPower, emoji: gate.emoji });
              writeGuild(guildId, g2);
              await i.followUp({ content: `🌑 استُخلص **${shadowName}** — قوة: ${shadowPower} — جيشك: ${u2.shadow_army.length} ظل`, ephemeral: true });
            }
          }

          writeGuild(guildId, g2);

          const resultEmbed = new EmbedBuilder()
            .setColor(result.survived ? gate.color : COLORS.error)
            .setTitle(result.survived ? `🏆 أتممت ${gate.name} بنجاح!` : `💀 هُزمت في ${gate.name}`)
            .setDescription([
              `${DESIGN.thin_separator}`,
              ...result.log.slice(0, 8),
              `${DESIGN.thin_separator}`,
              result.survived
                ? `✅ **انتصرت!** — صحة متبقية: **${result.playerHpLeft}**`
                : `❌ **سقطت!** — تلقيت 10% من المكافأة فقط.`,
              ``,
              `💰 مكافأة: **${gold.toLocaleString()}** 💎`,
              `⭐ XP: **+${xp.toLocaleString()}**`,
              ``,
              `⏳ البوابة التالية خلال **4 ساعات**.`
            ].join('\n'))
            .setImage(result.survived ? gate.image : 'https://static.wikia.nocookie.net/sololeveling/images/b/bc/Baruka.png');

          return i.followUp({ embeds: [resultEmbed] });
        }
      });
    }
  }
};
