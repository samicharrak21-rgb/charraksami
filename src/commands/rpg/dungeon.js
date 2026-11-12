const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ComponentType, ThreadAutoArchiveDuration, StringSelectMenuBuilder, AttachmentBuilder
} = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { hunterCard } = require('../../utils/rpgCards');
const { dungeonCard, gateCard } = require('../../utils/dungeonCards');
const { COLORS, DESIGN, getRandomGif, createStyledEmbed, createProgressBar } = require('../../utils/embeds');

// ===== ROOM IMAGES =====
const ROOM_IMAGES = {
  treasure: 'https://media0.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif',
  fountain: 'https://media2.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif',
  shrine:   'https://media3.giphy.com/media/3oEjI6hkM8YEdxFT44/giphy.gif',
  trap:     'https://media3.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
  merchant: 'https://media1.giphy.com/media/3oKIPEqDGUULpEU0aQ/giphy.gif',
  victory:  'https://media0.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif',
  defeat:   'https://media3.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
  boss:     'https://media4.giphy.com/media/l4FGt6g4KDGVB4OhW/giphy.gif',
  crit:     'https://media4.giphy.com/media/3oz8xKaR836UJOYeOc/giphy.gif',
  levelup:  'https://media1.giphy.com/media/lp5K5ypNRhPmLRmX91/giphy.gif'
};
const { ENEMIES, BOSSES, STAGES, RPG_CLASSES, RPG_RACES, SHOP_ITEMS, HUNTER_RANKS, getHunterRank, SHADOW_RANKS } = require('../../data/rpg');
const config = require('../../config');

// ===== STATUS EFFECTS =====
const STATUS_EFFECTS = {
  poison:  { name: 'مسموم', emoji: '💚', color: 0x2FD69B, tickDamage: 0.05, duration: 3, desc: 'يفقد 5% من الصحة كل جولة' },
  burn:    { name: 'محترق', emoji: '🔥', color: 0xE8455F, tickDamage: 0.08, duration: 2, desc: 'يفقد 8% من الصحة كل جولة' },
  stun:    { name: 'مذهول', emoji: '⚡', color: 0xFFD76A, skipTurn: true, duration: 1, desc: 'يتخطى دوره' },
  freeze:  { name: 'مجمد',  emoji: '❄️', color: 0x4FA3FF, atkReduce: 0.5, duration: 2, desc: 'هجومه مخفض 50%' },
  weaken:  { name: 'موهن',  emoji: '🌑', color: 0x8E44AD, atkReduce: 0.3, duration: 3, desc: 'هجومه مخفض 30%' }
};

// ===== LOOT RARITY =====
const LOOT_RARITY = {
  common:    { name: 'عادي',    emoji: '⬜', chance: 0.50, goldMul: 1.0 },
  uncommon:  { name: 'غير عادي', emoji: '🟩', chance: 0.30, goldMul: 1.5 },
  rare:      { name: 'نادر',    emoji: '🟦', chance: 0.15, goldMul: 2.5 },
  epic:      { name: 'أسطوري',  emoji: '🟣', chance: 0.04, goldMul: 5.0 },
  legendary: { name: 'أسطوري خالص', emoji: '🌟', chance: 0.01, goldMul: 10.0 }
};

function rollLootRarity() {
  const r = Math.random();
  let cum = 0;
  for (const [k, v] of Object.entries(LOOT_RARITY)) {
    cum += v.chance;
    if (r < cum) return { key: k, ...v };
  }
  return { key: 'common', ...LOOT_RARITY.common };
}

function rollCrit(player) {
  const critChance = (player.critChance || 0.1) + (player.class === 'assassin' ? 0.2 : 0);
  return Math.random() < critChance;
}

function applyStatusTick(entity, log) {
  if (!entity.status) return;
  const s = entity.status;
  if (!s.remaining || s.remaining <= 0) { entity.status = null; return; }
  if (s.tickDamage) {
    const dmg = Math.floor(entity.maxHp * s.tickDamage);
    entity.hp -= dmg;
    log.push(`${s.emoji} **${entity.name}** تضرر من **${s.name}**: -${dmg} HP`);
  }
  s.remaining--;
  if (s.remaining <= 0) {
    log.push(`✅ انتهى تأثير **${s.name}** على **${entity.name}**.`);
    entity.status = null;
  }
}

module.exports = {
  aliases: ['دانجون', 'مغامرة', 'دالجن', 'dg', 'dungeon'],
  data: new SlashCommandBuilder()
    .setName('dungeon')
    .setDescription('🏰 نظام الدانجون المتقدم — Solo Leveling Style')
    .addSubcommand(sub =>
      sub.setName('start')
        .setDescription('⚔️ ادخل البوابة وابدأ مغامرتك')
        .addIntegerOption(opt => opt.setName('level').setDescription('مستوى الدانجون (1-100)').setMinValue(1).setMaxValue(100)))
    .addSubcommand(sub =>
      sub.setName('top')
        .setDescription('🏆 قائمة أقوى الصائدين'))
    .addSubcommand(sub =>
      sub.setName('profile')
        .setDescription('📊 ملف صائدك الشخصي')),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const userId = interaction.user.id;
    const sub = interaction.options?.getSubcommand(false) || 'start';
    const g = readGuild(guildId);
    g.users = g.users || {};
    if (!g.users[userId]) g.users[userId] = { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1 };
    const u = g.users[userId];

    // ===== TOP =====
    if (sub === 'top') {
      const topPlayers = Object.entries(g.users)
        .sort(([, a], [, b]) => (b.dungeon_wins || 0) - (a.dungeon_wins || 0))
        .slice(0, 10);
      const embed = new EmbedBuilder()
        .setColor(COLORS.gold)
        .setTitle(`${DESIGN.crown} لوحة شرف الصائدين`)
        .setThumbnail('https://static.wikia.nocookie.net/sololeveling/images/7/72/Antares.png')
        .setDescription(topPlayers.length > 0
          ? topPlayers.map(([id, data], i) => {
              const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i+1}.**`;
              const hunterRank = getHunterRank(data.dungeon_wins || 0, data.level || 1);
              return `${rankEmoji} <@${id}> ${hunterRank.emoji} **${hunterRank.rank}** — **${data.dungeon_wins || 0}** انتصار`;
            }).join('\n')
          : 'لا يوجد صائدون في القائمة بعد!')
        .setFooter({ text: 'ارتقِ في الرتب E→D→C→B→A→S→SS→SSS' });
      return interaction.reply({ embeds: [embed] });
    }

    // ===== PROFILE =====
    if (sub === 'profile') {
      const hunterRank = getHunterRank(u.dungeon_wins || 0, u.level || 1);
      const shadows = u.shadow_army || [];
      const totalShadowPower = shadows.reduce((s, sh) => s + (sh.power || 0), 0);
      const embed = new EmbedBuilder()
        .setColor(hunterRank.color || COLORS.primary)
        .setTitle(`${hunterRank.emoji} ملف الصائد: ${interaction.user.username}`)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🏅 الرتبة', value: `${hunterRank.emoji} **${hunterRank.rank}** — ${hunterRank.name}`, inline: true },
          { name: '📊 المستوى', value: `**${u.level || 1}**`, inline: true },
          { name: '🏆 الانتصارات', value: `**${u.dungeon_wins || 0}**`, inline: true },
          { name: '⚔️ قوة الهجوم', value: `**${u.atk_bonus ? '+'+u.atk_bonus : '0'}** إضافي`, inline: true },
          { name: '❤️ قوة الصحة', value: `**${u.hp_bonus ? '+'+u.hp_bonus : '0'}** إضافي`, inline: true },
          { name: '🌑 جيش الظلال', value: `**${shadows.length}** ظل • قوة: **${totalShadowPower}**`, inline: true },
          { name: '⚔️ السلاح', value: u.equipment?.weapons?.name ? `${u.equipment.weapons.emoji || ''} ${u.equipment.weapons.name}` : 'بلا سلاح', inline: true },
          { name: '🛡️ الدرع', value: u.equipment?.armor?.name ? `${u.equipment.armor.emoji || ''} ${u.equipment.armor.name}` : 'بلا درع', inline: true },
          { name: '🎭 الفصيل', value: RPG_CLASSES[u.class || 'warrior']?.name || 'فارس', inline: true }
        );
      let files = [];
      try {
        const card = await hunterCard({
          username: interaction.member?.displayName || interaction.user.username,
          avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
          rank: hunterRank.rank, rankName: hunterRank.name, level: u.level || 1, wins: u.dungeon_wins || 0,
          atk: u.atk_bonus || 0, hp: u.hp_bonus || 0, shadows: shadows.length, shadowPower: totalShadowPower,
          weapon: u.equipment?.weapons?.name || '', armor: u.equipment?.armor?.name || '', cls: RPG_CLASSES[u.class || 'warrior']?.name || '',
          runs: u.dungeon_runs || 0, bestStage: u.best_dungeon || u.last_dungeon_level || 0,
        });
        if (card) { embed.setImage(`attachment://${card.name}`).setThumbnail(null); files = [new AttachmentBuilder(card.buffer, { name: card.name })]; }
      } catch {}
      return interaction.reply({ embeds: [embed], files });
    }

    // ===== START =====
    const dungeonLevel = Math.max(1, Math.min(100, interaction.options?.getInteger?.('level') || u.last_dungeon_level || 1));
    const stage = stageFor(dungeonLevel);
    const hunterRank = getHunterRank(u.dungeon_wins || 0, u.level || 1);
    const difficultyName = dungeonLevel < 20 ? '🟩 سهل' : dungeonLevel < 50 ? '🟦 متوسط' : dungeonLevel < 80 ? '🟧 صعب' : '🔴 أسطوري';
    const rooms = 10 + Math.floor(dungeonLevel / 5);

    if ((u.level || 1) < Math.ceil(dungeonLevel * 0.8)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.error)
          .setTitle(`${DESIGN.locked} دخول البوابة مرفوض`)
          .setDescription(`مستواك الحالي **${u.level || 1}** لا يكفي لبوابة مستوى **${dungeonLevel}**.\n${DESIGN.arrow} المستوى المطلوب: **${Math.ceil(dungeonLevel * 0.8)}**\n\n💡 جرّب: \`دانجون ${Math.max(1, Math.floor((u.level || 1) / 0.8))}\``)],
        ephemeral: true
      });
    }
    if (ACTIVE_RUNS.has(`${guildId}:${userId}`)) {
      return interaction.reply({ content: '⚔️ لديك مغامرة جارية بالفعل! أكملها داخل خيط البوابة.', ephemeral: true });
    }

    const entryEmbed = new EmbedBuilder()
      .setColor(stageColor(stage))
      .setTitle(`🌀 بوابة مستوى ${dungeonLevel} — ${stage.gateRank} Rank`)
      .setDescription(`📍 **${stage.name}** • ${difficultyName} • 🚪 ${rooms} غرفة + زعيم\n${hunterRank.emoji} رتبتك: **${hunterRank.rank}** — ${hunterRank.name}`);
    const files = await attachCard(entryEmbed, () => gateCard({
      stage, dungeonLevel, difficulty: difficultyName, hunterRank, rooms,
      username: interaction.member?.displayName || interaction.user.username,
      avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
    }), stage.image);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dg_solo').setLabel('مغامرة فردية').setEmoji('👤').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('dg_party').setLabel('فريق (حتى 4)').setEmoji('👥').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('dg_cancel').setLabel('إلغاء').setEmoji('✖️').setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.reply({ embeds: [entryEmbed], components: [row], files, fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 60000 });
    let chosen = false;

    collector.on('collect', async i => {
      if (i.user.id !== userId) return i.reply({ content: '❌ هذه ليست بوابتك! افتح بوابتك بكتابة `دانجون`.', ephemeral: true });
      chosen = true;
      collector.stop();
      if (i.customId === 'dg_cancel') return i.update({ content: '🌀 أُغلقت البوابة.', embeds: [], components: [], files: [], attachments: [] });
      if (i.customId === 'dg_solo') return this.openRun(i, userId, guildId, stage, dungeonLevel, [userId]);
      if (i.customId === 'dg_party') return this.runPartyLobby(i, userId, guildId, stage, dungeonLevel, difficultyName, rooms);
    });
    collector.on('end', () => { if (!chosen) msg.edit({ components: [] }).catch(() => {}); });
  },

  /** فتح خيط البوابة وبدء المغامرة */
  async openRun(i, leaderId, guildId, stage, dungeonLevel, partyIds) {
    await i.update({ content: '⚙️ تنفتح البوابة...', embeds: [], components: [], files: [], attachments: [] }).catch(() => {});
    const leader = i.user;
    const base = i.channel?.isThread?.() ? i.channel.parent : i.channel;
    const thread = await base?.threads?.create({
      name: `🌀 بوابة ${dungeonLevel} • ${partyIds.length > 1 ? 'فريق ' : ''}${leader.username}`.slice(0, 90),
      autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
      reason: 'Dungeon run'
    })?.catch(() => null);
    if (!thread) return i.editReply({ content: '❌ فشل في فتح البوابة! يحتاج البوت صلاحية إنشاء الخيوط (Threads).' }).catch(() => {});
    for (const mid of partyIds) await thread.members.add(mid).catch(() => {});
    await i.editReply({ content: `🌀 انفتحت البوابة: <#${thread.id}> — ${partyIds.map((id) => `<@${id}>`).join(' ')}` }).catch(() => {});
    return this.runSoloDungeon(thread, leaderId, guildId, stage, leader, dungeonLevel, partyIds);
  },

  async runPartyLobby(interaction, userId, guildId, stage, dungeonLevel, difficultyName, rooms) {
    const party = [userId];
    const render = async (note = '') => {
      const embed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle(`👥 غرفة انتظار الفريق — مستوى ${dungeonLevel}`)
        .setDescription(`${party.map((id) => `<@${id}>`).join(' • ')} — **${party.length}/4**\nكل عضو يزيد قوة الفريق ويقسم الغنائم بمكافأة إضافية.${note ? `\n${note}` : ''}\n⏱️ تنتهي الدعوة خلال **90 ثانية**.`);
      const members = party.map((id) => {
        const m = interaction.guild.members.cache.get(id);
        const usr = m?.user || interaction.client.users.cache.get(id);
        return { name: m?.displayName || usr?.username || 'صائد', avatarURL: usr?.displayAvatarURL({ extension: 'png', size: 128 }) };
      });
      const files = await attachCard(embed, () => gateCard({ stage, dungeonLevel, difficulty: difficultyName, rooms, mode: 'party', party: members }), stage.image);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('dg_join').setLabel('انضمام').setEmoji('🙋').setStyle(ButtonStyle.Success).setDisabled(party.length >= 4),
        new ButtonBuilder().setCustomId('dg_leave').setLabel('مغادرة').setEmoji('🚶').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('dg_start_party').setLabel('ابدأ').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('dg_cancel').setLabel('إلغاء').setEmoji('✖️').setStyle(ButtonStyle.Secondary)
      );
      return { content: null, embeds: [embed], components: [row], files, attachments: [] };
    };

    await interaction.update(await render());
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ time: 90000 });
    let started = false;

    collector.on('collect', async i => {
      if (i.customId === 'dg_cancel') {
        if (i.user.id !== userId) return i.reply({ content: '❌ فقط قائد الفريق يمكنه الإلغاء.', ephemeral: true });
        collector.stop('cancel');
        return i.update({ content: '❌ أُلغيت البوابة الجماعية.', embeds: [], components: [], files: [], attachments: [] });
      }
      if (i.customId === 'dg_join') {
        if (party.includes(i.user.id)) return i.reply({ content: '✅ أنت بالفعل في الفريق.', ephemeral: true });
        if (party.length >= 4) return i.reply({ content: '❌ الفريق ممتلئ (4 لاعبين).', ephemeral: true });
        if (ACTIVE_RUNS.has(`${guildId}:${i.user.id}`)) return i.reply({ content: '❌ لديك مغامرة جارية بالفعل.', ephemeral: true });
        party.push(i.user.id);
        await i.deferUpdate();
        return msg.edit(await render(`🙋 انضم <@${i.user.id}>!`)).catch(() => {});
      }
      if (i.customId === 'dg_leave') {
        if (i.user.id === userId) return i.reply({ content: 'ℹ️ أنت القائد — استخدم «إلغاء».', ephemeral: true });
        if (!party.includes(i.user.id)) return i.reply({ content: 'ℹ️ لست في الفريق.', ephemeral: true });
        party.splice(party.indexOf(i.user.id), 1);
        await i.deferUpdate();
        return msg.edit(await render()).catch(() => {});
      }
      if (i.customId === 'dg_start_party') {
        if (i.user.id !== userId) return i.reply({ content: '❌ فقط قائد الفريق يبدأ المغامرة.', ephemeral: true });
        started = true;
        collector.stop('start');
        return this.openRun(i, userId, guildId, stage, dungeonLevel, party);
      }
    });
    collector.on('end', (_c, reason) => {
      if (!started && reason === 'time') msg.edit({ content: '⌛ انتهى وقت الانتظار.', embeds: [], components: [], files: [], attachments: [] }).catch(() => {});
    });
  },

  async runSoloDungeon(thread, userId, guildId, stage, userObj, dungeonLevel, partyIds = null) {
    const party = partyIds && partyIds.length ? [...new Set(partyIds)] : [userId];
    for (const id of party) ACTIVE_RUNS.add(`${guildId}:${id}`);
    const g = readGuild(guildId);
    const u = g.users[userId];
    const playerClass = RPG_CLASSES[u.class || 'warrior'] || RPG_CLASSES.warrior;
    const weaponBonus = u.equipment?.weapons?.atk || 0;
    const armorBonus = u.equipment?.armor?.hp || 0;
    const purchasedSkills = u.inventory?.skills || [];
    const playerRace = RPG_RACES[u.race || 'human'] || RPG_RACES.human;
    const raceSkills = playerRace.skills || [];
    const shadows = u.shadow_army || [];
    const shadowBonusAtk = Math.floor(shadows.reduce((s, sh) => s + (sh.power || 0), 0) * 0.1);

    // قوة الفريق: كل عضو إضافي يضيف جزءاً من قوته الفعلية للصائد القائد
    const allies = party.filter((id) => id !== userId).map((id) => g.users[id] || { level: 1 });
    const allyHp = allies.reduce((s, a) => s + Math.floor((100 + (a.level || 1) * 25 + (a.hp_bonus || 0)) * 0.45), 0);
    const allyAtk = allies.reduce((s, a) => s + Math.floor((15 + (a.level || 1) * 6 + (a.atk_bonus || 0) + (a.equipment?.weapons?.atk || 0)) * 0.45), 0);
    const nameOf = (id) => thread.guild.members.cache.get(id)?.displayName || thread.client.users.cache.get(id)?.username || 'صائد';
    const partyNames = party.map(nameOf);

    let player = {
      name: thread.guild.members.cache.get(userId)?.displayName || userObj.username,
      hp: 100 + ((u.level || 1) * 25) + (u.hp_bonus || 0) + armorBonus + allyHp,
      maxHp: 100 + ((u.level || 1) * 25) + (u.hp_bonus || 0) + armorBonus + allyHp,
      atk: 15 + ((u.level || 1) * 6) + (u.atk_bonus || 0) + weaponBonus + shadowBonusAtk + allyAtk,
      potions: 3 + allies.length, gold: 0, keys: 0, tempBuff: 1, nextReduction: 0,
      critChance: playerClass.bonus?.critChance || 0.1,
      comboCount: 0, status: null, domainActive: false,
      class: u.class || 'warrior',
      skills: [
        ...raceSkills,
        ...purchasedSkills.map(id => SHOP_ITEMS.skills.find(s => s.id === id)).filter(Boolean)
      ]
    };

    if (playerClass.bonus) {
      player.maxHp = Math.floor(player.maxHp * (playerClass.bonus.hp || 1));
      player.hp = player.maxHp;
      player.atk = Math.floor(player.atk * (playerClass.bonus.atk || 1));
    }

    const stageEnemies = ENEMIES.filter(e => e.stage === stage.id);
    const dungeonScale = 1 + (dungeonLevel - 1) * 0.15;
    const ROOM_TYPES = ['combat', 'combat', 'combat', 'combat', 'treasure', 'fountain', 'shrine', 'trap', 'merchant', 'mystery'];
    let roomIndex = 0;
    let totalRooms = 10 + Math.floor(dungeonLevel / 5);
    let currentRoom = null;
    let phase = 'map';
    let result = null;
    let enemiesKilled = 0;
    const startedAt = Date.now();
    let log = [`🌀 دخلت **${stage.name}** — مستوى **${dungeonLevel}** — **${totalRooms}** غرفة + الزعيم`];
    if (shadowBonusAtk) log.push(`🌑 جيش الظلال يمنحك **+${shadowBonusAtk}** ⚔️`);
    if (allies.length) log.push(`👥 الفريق: ${partyNames.join('، ')} — قوة إضافية **+${allyAtk}** ⚔️ **+${allyHp}** ❤️`);
    let busy = false;

    // ===== توازن القتال =====
    // بيانات الوحوش ترتفع أُسّياً بينما قوة اللاعب خطية، فكانت البوابات من المرحلة 3 مستحيلة.
    // القوة الآن تُحسب من مستوى البوابة (صائد بنفس المستوى): الوحش يحتاج ~3 ضربات ويضرب ~8% من الصحة،
    // والزعيم ~10 ضربات و~10%. بيانات الوحش تحدد الفروق النسبية فقط داخل المرحلة.
    const refAtk = 15 + dungeonLevel * 6, refHp = 100 + dungeonLevel * 25;
    const avgOf = (arr, k) => arr.length ? arr.reduce((a, x) => a + (x[k] || 0), 0) / arr.length : 0;
    const avgHp = avgOf(stageEnemies, 'hp') || 1, avgAtk = avgOf(stageEnemies, 'atk') || 1;
    const clampN = (v, a, b) => Math.max(a, Math.min(b, v || 1));
    const enemyStats = (base, boss) => {
      const roomMul = 1 + roomIndex * 0.04;
      const hpVar = boss ? 1 : clampN(base.hp / avgHp, 0.8, 1.25);
      const atkVar = boss ? 1 : clampN((base.atk || avgAtk) / avgAtk, 0.8, 1.25);
      const partyHp = 1 + allies.length * 0.6, partyAtk = 1 + allies.length * 0.3;
      return {
        hp: Math.max(20, Math.floor(refAtk * (boss ? 9 : 3) * hpVar * roomMul * partyHp * (0.9 + Math.random() * 0.2))),
        atk: Math.max(4, Math.floor(refHp * (boss ? 0.085 : 0.08) * atkVar * roomMul * partyAtk)),
      };
    };

    const generateRoom = () => {
      if (roomIndex >= totalRooms) return { kind: 'boss' };
      const kind = ROOM_TYPES[Math.floor(Math.random() * ROOM_TYPES.length)];
      if (kind === 'combat' || kind === 'mystery') {
        const base = stageEnemies.length
          ? stageEnemies[Math.floor(Math.random() * stageEnemies.length)]
          : { name: 'وحش مجهول', emoji: '👾', hp: 60, atk: 12, image: null, shadowRank: 'E' };
        const st = enemyStats(base, false);
        return {
          kind: 'combat',
          enemy: { ...base, maxHp: st.hp, hp: st.hp, atk: st.atk, status: null, lootRarity: rollLootRarity() }
        };
      }
      if (kind === 'treasure') return { kind, gold: Math.floor((100 + roomIndex * 80) * dungeonScale * (1 + Math.random())) };
      if (kind === 'fountain') return { kind };
      if (kind === 'shrine') {
        const buffs = [{ k: 'atk', amt: 5 + dungeonLevel }, { k: 'maxHp', amt: 20 + dungeonLevel * 3 }, { k: 'crit', amt: 0.05 }];
        return { kind, buff: buffs[Math.floor(Math.random() * buffs.length)] };
      }
      if (kind === 'trap') return { kind, dmg: Math.floor(player.maxHp * (0.08 + Math.random() * 0.12)) };
      if (kind === 'merchant') return { kind };
      return { kind: 'combat' };
    };

    // ===== العرض: بطاقة مرسومة + أزرار =====
    const components = () => {
      const rows = [];
      if (phase === 'map') {
        const r = new ActionRowBuilder();
        if (roomIndex >= totalRooms) {
          r.addComponents(new ButtonBuilder().setCustomId('dr_boss').setLabel('دخول غرفة الزعيم').setEmoji('💀').setStyle(ButtonStyle.Danger));
        } else {
          r.addComponents(
            new ButtonBuilder().setCustomId('dr_door:0').setLabel('يمين').setEmoji('🚪').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('dr_door:1').setLabel('وسط').setEmoji('🚪').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('dr_door:2').setLabel('يسار').setEmoji('🚪').setStyle(ButtonStyle.Primary)
          );
        }
        rows.push(r);
        rows.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('dr_rest').setLabel(`استراحة (${player.potions})`).setEmoji('⛺').setStyle(ButtonStyle.Success).setDisabled(player.potions <= 0 || player.hp >= player.maxHp),
          new ButtonBuilder().setCustomId('dr_withdraw').setLabel('انسحاب (تحتفظ بنصف الغنائم)').setEmoji('🏳️').setStyle(ButtonStyle.Secondary)
        ));
      } else if (phase === 'combat') {
        const e = currentRoom?.enemy;
        rows.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('dr_atk').setLabel('هجوم').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('dr_skills').setLabel('مهارات').setEmoji('✨').setStyle(ButtonStyle.Primary).setDisabled(player.skills.length === 0),
          new ButtonBuilder().setCustomId('dr_heal').setLabel(`شفاء (${player.potions})`).setEmoji('🧪').setStyle(ButtonStyle.Success).setDisabled(player.potions <= 0),
          new ButtonBuilder().setCustomId('dr_flee').setLabel('فرار').setEmoji('🏃').setStyle(ButtonStyle.Secondary).setDisabled(!!(e?.isBoss))
        ));
      } else if (phase === 'event') {
        const r = new ActionRowBuilder();
        const k = currentRoom.kind;
        if (k === 'treasure') r.addComponents(new ButtonBuilder().setCustomId('dr_take').setLabel('أخذ الكنز').setEmoji('💰').setStyle(ButtonStyle.Success));
        if (k === 'fountain') r.addComponents(new ButtonBuilder().setCustomId('dr_drink').setLabel('اشرب').setEmoji('💧').setStyle(ButtonStyle.Success));
        if (k === 'shrine') r.addComponents(new ButtonBuilder().setCustomId('dr_pray').setLabel('قربان 200💎').setEmoji('🛐').setStyle(ButtonStyle.Primary).setDisabled(player.gold < 200));
        if (k === 'merchant') r.addComponents(
          new ButtonBuilder().setCustomId('dr_buy_potion').setLabel('جرعة 300').setEmoji('🧪').setStyle(ButtonStyle.Primary).setDisabled(player.gold < 300),
          new ButtonBuilder().setCustomId('dr_buy_elixir').setLabel('إكسير قوة 600').setEmoji('⚗️').setStyle(ButtonStyle.Danger).setDisabled(player.gold < 600 || player._elixirs >= 3),
          new ButtonBuilder().setCustomId('dr_buy_shield').setLabel('درع 500').setEmoji('🛡️').setStyle(ButtonStyle.Success).setDisabled(player.gold < 500 || player._shields >= 3),
        );
        r.addComponents(new ButtonBuilder().setCustomId('dr_continue').setLabel(k === 'treasure' || k === 'fountain' ? 'تجاهل ومتابعة' : 'متابعة').setEmoji('↪️').setStyle(ButtonStyle.Secondary));
        rows.push(r);
      }
      return rows;
    };

    const build = async () => {
      const isBoss = currentRoom?.enemy?.isBoss;
      const color = phase === 'gameover' ? COLORS.error : phase === 'victory' ? 0xFFD76A : isBoss ? 0x8E44AD : phase === 'combat' ? COLORS.error : phase === 'event' ? COLORS.gold : stageColor(stage);
      const embed = new EmbedBuilder().setColor(color);
      const e = currentRoom?.enemy;
      const titles = { treasure: '💰 صندوق كنز', fountain: '⛲ نافورة شفاء', shrine: '🛐 ضريح قديم', trap: '⚠️ فخ مفاجئ', merchant: '🧙 تاجر متجول' };
      if (phase === 'combat' && e) embed.setTitle(e.isBoss ? `👑 زعيم البوابة: ${e.name}` : `⚔️ مواجهة: ${e.name}`);
      else if (phase === 'event') embed.setTitle(titles[currentRoom.kind] || '🚪 حدث');
      else if (phase === 'map') embed.setTitle(roomIndex >= totalRooms ? '💀 بوابة الزعيم النهائي أمامك!' : `🗺️ الغرفة ${roomIndex + 1} من ${totalRooms} — اختر باباً`);
      else if (phase === 'victory') embed.setTitle('🏆 انتصار أسطوري!');
      else if (phase === 'gameover') embed.setTitle('💀 سقطت في البوابة');
      else if (phase === 'withdraw') embed.setTitle('🏳️ انسحاب آمن');
      embed.setDescription(log.slice(-2).join('\n').slice(0, 900) || null);
      if (party.length > 1 && phase !== 'victory') embed.setFooter({ text: `👥 ${partyNames.join(' • ')} — أي عضو يمكنه الضغط على الأزرار` });

      const files = await attachCard(embed, () => dungeonCard({
        phase, stage, dungeonLevel, roomIndex, totalRooms, player, enemy: e, room: currentRoom, log,
        party, partyNames, result,
        avatarURL: userObj.displayAvatarURL({ extension: 'png', size: 256 }),
      }), null);
      if (!files.length) {
        // بدون canvas: عرض نصي مختصر
        embed.addFields({ name: `👤 ${player.name}`, value: `${createHPBar(Math.max(0, player.hp) / player.maxHp)} \`${Math.max(0, player.hp)}/${player.maxHp}\` ❤️ • ⚔️ ${player.atk} • 🧪 ${player.potions} • 💰 ${player.gold}` });
        if (phase === 'combat' && e) embed.addFields({ name: `${e.emoji || '👾'} ${e.name}`, value: `${createHPBar(Math.max(0, e.hp) / e.maxHp)} \`${Math.max(0, e.hp)}/${e.maxHp}\`` });
        if (e?.image && phase === 'combat') embed.setImage(e.image); else if (stage.image) embed.setImage(stage.image);
      }
      const ended = ['victory', 'gameover', 'withdraw'].includes(phase);
      return { content: null, embeds: [embed], components: ended ? [] : components(), files, attachments: [] };
    };

    const msg = await thread.send(await build());
    const collector = msg.createMessageComponentCollector({ time: 30 * 60 * 1000, idle: 10 * 60 * 1000 });
    const refresh = async () => msg.edit(await build()).catch(() => {});

    // ===== Enemy attack logic =====
    const enemyAttack = () => {
      const e = currentRoom.enemy;
      applyStatusTick(e, log);
      if (e.status?.skipTurn && e.status.remaining > 0) {
        log.push(`⚡ **${e.name}** مذهول ولم يستطع الهجوم!`);
        return;
      }
      let dmg = Math.max(1, Math.floor(e.atk * (0.85 + Math.random() * 0.3)));
      if (e.status?.atkReduce) dmg = Math.floor(dmg * (1 - e.status.atkReduce));
      let moveLog = null;
      if (e.moves && e.moves.length && Math.random() > 0.6) {
        const mv = e.moves[Math.floor(Math.random() * e.moves.length)];
        dmg = Math.floor(dmg * (mv.damage || 1.2));
        moveLog = `${mv.log || `${e.emoji || '👾'} **${e.name}** استخدم هجوماً خاصاً!`} — **${dmg}** ضرر`;
      }
      if (player.nextReduction) {
        dmg = Math.floor(dmg * (1 - player.nextReduction));
        player.nextReduction = 0;
      }
      player.hp -= dmg;
      log.push(moveLog || `${e.emoji || '👾'} **${e.name}** ضربك بـ **${dmg}** ضرر.`);
    };

    // ===== نهاية المغامرة (فوز/خسارة/انسحاب): حفظ المكافآت، بطاقة نتيجة، إعلان في القناة الأم =====
    const finish = async (kind, extra = {}) => {
      phase = kind;
      const n = party.length;
      const g2 = readGuild(guildId);
      g2.users = g2.users || {};
      const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      let perGold = 0, perXp = 0;
      if (kind === 'victory') {
        const totalGold = player.gold + (extra.reward || 0);
        perGold = Math.floor(totalGold / n * (1 + 0.25 * (n - 1)));   // مكافأة تعاون للفريق
        perXp = extra.xp || 500;
      } else if (kind === 'withdraw') {
        perGold = Math.floor(player.gold * 0.5 / n);
        perXp = roomIndex * 15;
      } else {
        perXp = roomIndex * 10;
      }
      for (const id of party) {
        const m = g2.users[id] = g2.users[id] || { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1 };
        m.balance = (m.balance || 0) + perGold;
        m.xp = (m.xp || 0) + perXp;
        m.dungeon_runs = (m.dungeon_runs || 0) + 1;
        if (kind === 'victory') {
          m.dungeon_wins = (m.dungeon_wins || 0) + 1;
          m.last_dungeon_level = Math.max(m.last_dungeon_level || 1, dungeonLevel);
          m.best_dungeon = Math.max(m.best_dungeon || 0, dungeonLevel);
        }
      }
      if (kind === 'victory' && extra.shadow) {
        const lu = g2.users[userId];
        lu.shadow_army = lu.shadow_army || [];
        if (lu.shadow_army.length < 50) { lu.shadow_army.push(extra.shadow); log.push(`🌑 **قُمْ!** — انضم ظل **${extra.shadow.name}** لجيشك!`); }
      }
      writeGuild(guildId, g2);

      const lu = g2.users[userId];
      const newRank = getHunterRank(lu.dungeon_wins || 0, lu.level || 1);
      const items = kind === 'victory'
        ? [[n > 1 ? 'لكل عضو' : 'المكافأة', `${compactNum(perGold)} 💎`, '💰'], ['الخبرة', `+${compactNum(perXp)}`, '✨'], ['الرتبة', newRank.rank, '🏅'], ['الوقت', `${minutes}د`, '⏱️']]
        : kind === 'withdraw'
          ? [['غنائم محفوظة', `${compactNum(perGold)} 💎`, '💰'], ['الغرف', `${roomIndex}/${totalRooms}`, '🚪'], ['الخبرة', `+${perXp}`, '✨']]
          : [['الغرف', `${roomIndex}/${totalRooms}`, '🚪'], ['ذهب ضائع', `${compactNum(player.gold)} 💎`, '💸'], ['وحوش', String(enemiesKilled), '⚔️'], ['الخبرة', `+${perXp}`, '✨']];
      result = {
        subtitle: kind === 'victory' ? `هزمت ${currentRoom?.enemy?.name || 'الزعيم'}!` : kind === 'withdraw' ? 'خرجت من البوابة بنصف الغنائم' : `سقطت في الغرفة ${roomIndex + 1} — تدرّب وعد أقوى`,
        items,
      };
      const payload = await build();
      await msg.edit(payload).catch(() => {});
      collector.stop(kind);

      // إعلان النتيجة في القناة الأصلية (الخيط سيُغلق)
      try {
        const parent = thread.parent;
        if (parent?.send) {
          const ann = EmbedBuilder.from(payload.embeds[0]).setDescription(
            `${party.map((id) => `<@${id}>`).join(' ')}\n${kind === 'victory' ? `🏆 أنهى بوابة **${stage.name}** (مستوى ${dungeonLevel})` : kind === 'withdraw' ? `🏳️ انسحب من **${stage.name}**` : `💀 سقط في **${stage.name}**`}`
          );
          const files = payload.files.map((f) => new AttachmentBuilder(f.attachment, { name: f.name }));
          await parent.send({ embeds: [ann], files, allowedMentions: { users: [] } });
        }
      } catch {}
      await thread.send('🔒 سيُغلق هذا الخيط خلال دقيقتين.').catch(() => {});
      setTimeout(async () => {
        await thread.setLocked?.(true).catch(() => {});
        await thread.setArchived?.(true).catch(() => {});
      }, 120000);
    };

    const handleVictory = async () => {
      const e = currentRoom.enemy;
      const loot = e.lootRarity || { emoji: '⬜', name: 'عادي', goldMul: 1.0 };
      const goldBase = e.goldReward
        ? Math.floor(e.goldReward[0] + Math.random() * (e.goldReward[1] - e.goldReward[0]))
        : Math.floor((80 + roomIndex * 60) * dungeonScale);
      const gold = Math.floor(goldBase * loot.goldMul * (player.comboCount > 2 ? 1.25 : 1));
      player.gold += gold;
      player.comboCount++;
      enemiesKilled++;
      log.push(`✅ هزمت **${e.name}**! ${loot.emoji} +**${gold}** 💎 ${player.comboCount > 2 ? `🔥 Combo x${player.comboCount}!` : ''}`);

      const g2 = readGuild(guildId);
      const u2 = g2.users[userId];
      if (e.shadowRank && (u2.race === 'shadow' || Math.random() < 0.15)) {
        const extractChance = u2.race === 'shadow' ? 0.80 : 0.15;
        if (Math.random() < extractChance) {
          u2.shadow_army = u2.shadow_army || [];
          if (u2.shadow_army.length < 50) {
            const shadowPower = Math.floor((e.atk || 10) * 0.5 + (e.hp || 100) * 0.02);
            u2.shadow_army.push({ name: `ظل ${e.name}`, rank: e.shadowRank || 'E', power: shadowPower, emoji: e.emoji || '🌑' });
            log.push(`🌑 **استُخلص ظل ${e.name}** — قوة: **${shadowPower}**`);
            writeGuild(guildId, g2);
          }
        }
      }
      roomIndex++;
      currentRoom = null;
      phase = 'map';
      return refresh();
    };

    const checkDeath = async () => {
      if (player.hp > 0) return false;
      player.hp = 0;
      log.push(`💀 سقطت في الغرفة ${roomIndex + 1}.`);
      await finish('gameover');
      return true;
    };

    collector.on('collect', async i => {
      if (!party.includes(i.user.id)) return i.reply({ content: '❌ هذه ليست بوابتك. افتح بوابتك بكتابة `دانجون`.', ephemeral: true }).catch(() => {});
      if (busy || ['victory', 'gameover', 'withdraw'].includes(phase)) return i.deferUpdate().catch(() => {});
      busy = true;
      const warn = (content) => i.followUp({ content, ephemeral: true }).catch(() => {});
      try {
        await i.deferUpdate().catch(() => {});
        const id = i.customId;
        const actor = party.length > 1 ? `**${nameOf(i.user.id)}**: ` : '';

        // ===== MAP PHASE =====
        if (phase === 'map') {
          if (id === 'dr_withdraw') {
            log.push(`🏳️ ${actor}انسحب الفريق من البوابة.`);
            return finish('withdraw');
          }
          if (id === 'dr_rest') {
            if (player.potions <= 0) return warn('❌ لا جرعات متبقية.');
            player.potions--;
            const heal = Math.floor(player.maxHp * 0.4);
            player.hp = Math.min(player.maxHp, player.hp + heal);
            log.push(`⛺ ${actor}استراحة: +**${heal}** ❤️`);
            return refresh();
          }
          if (id === 'dr_boss') {
            const bossData = BOSSES.find(b => b.stage === stage.id) || BOSSES[Math.min(BOSSES.length - 1, Math.floor((stage.id - 1) / 2))] || BOSSES[0];
            const st = enemyStats(bossData, true);
            currentRoom = {
              kind: 'boss',
              enemy: {
                ...bossData, isBoss: true,
                maxHp: st.hp, hp: st.hp, atk: st.atk,
                status: null, lootRarity: { key: 'legendary', emoji: '🌟', name: 'أسطوري خالص', goldMul: 10.0 }
              }
            };
            phase = 'combat';
            log.push(`💀 ظهر الزعيم **${currentRoom.enemy.name}**!`);
            return refresh();
          }
          if (id.startsWith('dr_door:')) {
            currentRoom = generateRoom();
            if (currentRoom.kind === 'combat') {
              phase = 'combat';
              log.push(`⚔️ ${actor}فتح باباً — **${currentRoom.enemy.name}** يعترض الطريق!`);
            } else {
              phase = 'event';
              const names = { treasure: '💰 كنز', fountain: '⛲ نافورة', shrine: '🛐 ضريح', trap: '⚠️ فخ', merchant: '🧙 تاجر' };
              log.push(`🚪 الغرفة ${roomIndex + 1}: ${names[currentRoom.kind] || currentRoom.kind}`);
              if (currentRoom.kind === 'trap') { player.hp = Math.max(1, player.hp - currentRoom.dmg); log.push(`⚠️ تلقيت **${currentRoom.dmg}** ضرر من الفخ!`); }
            }
            return refresh();
          }
          return;
        }

        // ===== EVENT PHASE =====
        if (phase === 'event') {
          const next = () => { roomIndex++; currentRoom = null; phase = 'map'; };
          if (id === 'dr_take' && currentRoom.kind === 'treasure') {
            player.gold += currentRoom.gold;
            log.push(`💰 ${actor}+${currentRoom.gold} 💎`);
            next();
          } else if (id === 'dr_drink' && currentRoom.kind === 'fountain') {
            player.hp = player.maxHp;
            log.push(`⛲ استعدت كامل الصحة!`);
            next();
          } else if (id === 'dr_pray' && currentRoom.kind === 'shrine') {
            if (player.gold < 200) return warn('❌ تحتاج 200 💎.');
            player.gold -= 200;
            const b = currentRoom.buff;
            if (b.k === 'atk') player.atk += b.amt;
            else if (b.k === 'crit') player.critChance = (player.critChance || 0.1) + b.amt;
            else { player.maxHp += b.amt; player.hp += b.amt; }
            log.push(`🛐 تعزيز دائم: +${b.k === 'crit' ? Math.round(b.amt * 100) + '%' : b.amt} ${b.k === 'atk' ? '⚔️' : b.k === 'crit' ? '🎯' : '❤️'}`);
            next();
          } else if (id === 'dr_buy_potion' && currentRoom.kind === 'merchant') {
            if (player.gold < 300) return warn('❌ رصيد الرحلة لا يكفي.');
            player.gold -= 300; player.potions++;
            log.push(`🛒 اشتريت جرعة شفاء (${player.potions} 🧪)`);
          } else if (id === 'dr_buy_elixir' && currentRoom.kind === 'merchant') {
            if (player.gold < 600 || (player._elixirs || 0) >= 3) return warn('❌ لا يمكنك الشراء الآن.');
            player.gold -= 600; player._elixirs = (player._elixirs || 0) + 1;
            const add = Math.max(3, Math.floor(player.atk * 0.2)); player.atk += add;
            log.push(`⚗️ شربت إكسير القوة: +${add} هجوم (⚔️ ${player.atk})`);
          } else if (id === 'dr_buy_shield' && currentRoom.kind === 'merchant') {
            if (player.gold < 500 || (player._shields || 0) >= 3) return warn('❌ لا يمكنك الشراء الآن.');
            player.gold -= 500; player._shields = (player._shields || 0) + 1;
            const add = Math.floor(player.maxHp * 0.15); player.maxHp += add; player.hp = Math.min(player.maxHp, player.hp + add);
            log.push(`🛡️ ارتديت درعاً: +${add} صحة قصوى (❤️ ${player.hp}/${player.maxHp})`);
          } else if (id === 'dr_continue') {
            next();
          }
          return refresh();
        }

        // ===== COMBAT PHASE =====
        if (phase === 'combat') {
          const e = currentRoom.enemy;

          if (id === 'dr_flee') {
            if (Math.random() < 0.5) {
              player.comboCount = 0;
              log.push(`🏃 فررت من **${e.name}**!`);
              currentRoom = null; phase = 'map'; roomIndex++;
              return refresh();
            }
            log.push(`🏃 فشل الفرار!`);
            enemyAttack();
            if (await checkDeath()) return;
            return refresh();
          }

          if (id === 'dr_skills') {
            if (player.skills.length === 0) return warn('❌ لا مهارات — اشترِها من `متجر`.');
            const menu = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder().setCustomId('dr_use_skill').setPlaceholder('✨ اختر مهارة...')
                .addOptions(player.skills.slice(0, 25).map(s => ({
                  label: String(s.name).slice(0, 100), value: s.id,
                  description: (s.desc || '').slice(0, 90) || undefined,
                  emoji: s.emoji || undefined
                })))
            );
            const back = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('dr_back').setLabel('رجوع').setEmoji('🔙').setStyle(ButtonStyle.Secondary));
            return msg.edit({ components: [menu, back] }).catch(() => {});
          }
          if (id === 'dr_back') return msg.edit({ components: components() }).catch(() => {});

          applyStatusTick(player, log);

          let didAttack = false;
          if (id === 'dr_atk') {
            const isCrit = rollCrit(player);
            let dmg = Math.floor((player.atk + Math.floor(Math.random() * 10)) * (player.tempBuff || 1) * (isCrit ? 2.0 : 1));
            if (player.domainActive) dmg = Math.floor(dmg * 1.5);
            player.tempBuff = 1;
            e.hp -= dmg;
            log.push(`⚔️ ${actor}ضربت **${e.name}** بـ **${dmg}** ضرر${isCrit ? ' — 💥 **ضربة حرجة!**' : ''}`);
            didAttack = true;
          } else if (id === 'dr_heal') {
            if (player.potions <= 0) return warn('❌ لا جرعات.');
            player.potions--;
            const h = Math.floor(player.maxHp * 0.35);
            player.hp = Math.min(player.maxHp, player.hp + h);
            log.push(`🧪 ${actor}استعدت **${h}** ❤️`);
            didAttack = true;
          } else if (i.isStringSelectMenu?.() && id === 'dr_use_skill') {
            const sk = player.skills.find(x => x.id === i.values[0]);
            if (!sk) return refresh();
            let m = `${sk.emoji || '✨'} ${actor}استخدمت **${sk.name}**`;
            if (sk.type === 'buff') {
              player.tempBuff = (player.tempBuff || 1) * (sk.multiplier || 1.5);
              player.nextReduction = sk.reduction || 0;
              m += ` — تعزيز جاهز!`;
            } else if (sk.type === 'heal') {
              const h = Math.floor(player.maxHp * (sk.percentage || 0.4));
              player.hp = Math.min(player.maxHp, player.hp + h);
              m += ` واستعدت **${h}** ❤️.`;
            } else if (sk.type === 'lifesteal') {
              const dmg = Math.floor(player.atk * (sk.multiplier || 1.5));
              const heal = Math.floor(dmg * (sk.heal || 0.2));
              e.hp -= dmg; player.hp = Math.min(player.maxHp, player.hp + heal);
              m += ` — ضرر **${dmg}** + شفاء **${heal}** ❤️.`;
            } else if (sk.type === 'attack') {
              const isCrit = rollCrit(player);
              const dmg = Math.floor(player.atk * (sk.multiplier || 1) * (isCrit ? 1.5 : 1));
              e.hp -= dmg;
              m += ` — ضرر **${dmg}**${isCrit ? ' 💥 حرج!' : ''}`;
              if (sk.id === 'ice_spike' && !e.status) { e.status = { ...STATUS_EFFECTS.freeze, remaining: STATUS_EFFECTS.freeze.duration }; m += ` ❄️ جُمِّد!`; }
              if (sk.id === 'lava_burst' && !e.status) { e.status = { ...STATUS_EFFECTS.burn, remaining: STATUS_EFFECTS.burn.duration }; m += ` 🔥 احترق!`; }
            } else if (sk.type === 'shadow_extract') {
              if (Math.random() < 0.8) {
                const g2 = readGuild(guildId); const u2 = g2.users[userId];
                u2.shadow_army = u2.shadow_army || [];
                u2.shadow_army.push({ name: `ظل ${e.name}`, rank: e.shadowRank || 'E', power: Math.floor((e.atk || 10) * 0.5), emoji: e.emoji || '🌑' });
                writeGuild(guildId, g2);
                m += ` — 🌑 استُخلص ظل **${e.name}**!`;
              } else { m += ` — فشل الاستخلاص.`; }
            } else if (sk.type === 'domain') {
              player.domainActive = true;
              m += ` — 🌐 المجال المطلق نشط!`;
            }
            log.push(m);
            didAttack = true;
          }

          if (!didAttack) return;

          if (e.isBoss && e.hp < e.maxHp * 0.5 && !e._phase2) {
            e._phase2 = true;
            e.atk = Math.floor(e.atk * 1.3);
            log.push(`👑 **${e.name}** غاضب — **المرحلة الثانية!** هجومه زاد!`);
          }

          if (e.hp <= 0) {
            e.hp = 0;
            if (e.isBoss) {
              const reward = e.reward ? Math.floor(e.reward.min + Math.random() * (e.reward.max - e.reward.min)) : 5000;
              const u2 = readGuild(guildId).users[userId] || {};
              const shadow = e.shadowName && (u2.race === 'shadow' || Math.random() < 0.4)
                ? { name: e.shadowName, rank: e.shadowRank || 'S', power: e.shadowPower || 1000, emoji: e.emoji || '👑', isBoss: true } : null;
              log.push(`🏆 سقط الزعيم **${e.name}**! +**${reward.toLocaleString()}** 💎`);
              enemiesKilled++;
              return finish('victory', { reward, xp: e.xpReward || 500, shadow });
            }
            return handleVictory();
          }

          enemyAttack();
          if (await checkDeath()) return;
          player.domainActive = false;
          return refresh();
        }
      } catch (err) {
        console.error('[dungeon]', err);
      } finally {
        busy = false;
      }
    });

    collector.on('end', async (_c, reason) => {
      for (const id of party) ACTIVE_RUNS.delete(`${guildId}:${id}`);
      if (reason === 'time' || reason === 'idle') {
        if (!['victory', 'gameover', 'withdraw'].includes(phase)) {
          log.push('⏰ انتهى وقت المغامرة — خرجت بنصف الغنائم.');
          await finish('withdraw').catch(() => {});
        }
      }
    });
  }
};

// ===== Helpers =====
const ACTIVE_RUNS = new Set();
function stageFor(level) {
  const id = Math.ceil(level / 2);
  return STAGES.find((s) => s.id === id) || STAGES[STAGES.length - 1] || STAGES[0];
}
function stageColor(stage) {
  const c = stage?.bgColor;
  if (typeof c === 'number') return c;
  if (typeof c === 'string' && /^#?[0-9a-f]{6}$/i.test(c)) return parseInt(c.replace('#', ''), 16);
  return COLORS.info;
}
const compactNum = (n) => {
  n = Number(n) || 0;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(n) >= 1e4) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toLocaleString('en-US');
};
/** يرسم البطاقة ويضعها صورةً للإمبد، أو يضع صورة احتياطية */
async function attachCard(embed, render, fallbackImage) {
  try {
    const card = await render();
    if (card?.buffer) {
      embed.setImage(`attachment://${card.name}`);
      return [new AttachmentBuilder(card.buffer, { name: card.name })];
    }
  } catch (e) { console.error('[dungeon card]', e.message); }
  if (fallbackImage) embed.setImage(fallbackImage);
  return [];
}

function createHPBar(pct, len = 12) {
  const colors = pct > 0.5 ? '🟩' : pct > 0.25 ? '🟨' : '🟥';
  const filled = Math.round(Math.max(0, Math.min(1, pct)) * len);
  return colors.repeat(filled) + '⬛'.repeat(len - filled);
}
