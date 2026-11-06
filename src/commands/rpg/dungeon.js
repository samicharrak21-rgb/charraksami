const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, ComponentType, ThreadAutoArchiveDuration, StringSelectMenuBuilder
} = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
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
  poison:  { name: 'مسموم', emoji: '💚', color: 0x2ECC71, tickDamage: 0.05, duration: 3, desc: 'يفقد 5% من الصحة كل جولة' },
  burn:    { name: 'محترق', emoji: '🔥', color: 0xE74C3C, tickDamage: 0.08, duration: 2, desc: 'يفقد 8% من الصحة كل جولة' },
  stun:    { name: 'مذهول', emoji: '⚡', color: 0xF1C40F, skipTurn: true, duration: 1, desc: 'يتخطى دوره' },
  freeze:  { name: 'مجمد',  emoji: '❄️', color: 0x3498DB, atkReduce: 0.5, duration: 2, desc: 'هجومه مخفض 50%' },
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
      return interaction.reply({ embeds: [embed] });
    }

    // ===== START =====
    const dungeonLevel = interaction.options?.getInteger('level') || u.last_dungeon_level || 1;
    const stage = STAGES.find(s => s.id === Math.ceil(dungeonLevel / 2)) || STAGES[0];
    const hunterRank = getHunterRank(u.dungeon_wins || 0, u.level || 1);
    const difficultyName = dungeonLevel < 20 ? '🟩 سهل' : dungeonLevel < 50 ? '🟦 متوسط' : dungeonLevel < 80 ? '🟧 صعب' : '🔴 أسطوري';

    if (u.level < (dungeonLevel * 0.8)) {
      return interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(COLORS.error)
          .setTitle(`${DESIGN.locked} دخول البوابة مرفوض`)
          .setDescription(`مستواك الحالي **${u.level}** لا يكفي لبوابة مستوى **${dungeonLevel}**.\n${DESIGN.arrow} المستوى المطلوب: **${Math.ceil(dungeonLevel * 0.8)}**`)],
        ephemeral: true
      });
    }

    const entryEmbed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`🌀 بوابة مستوى ${dungeonLevel} — ${stage.gateRank} Rank`)
      .setDescription([
        `${DESIGN.thin_separator}`,
        `📍 **الموقع:** ${stage.name}`,
        `🎯 **الصعوبة:** ${difficultyName}`,
        `${hunterRank.emoji} **رتبتك:** ${hunterRank.rank} — ${hunterRank.name}`,
        `${DESIGN.thin_separator}`,
        `هل تدخل البوابة بمفردك أم مع فريق؟`
      ].join('\n'))
      .setImage(stage.image)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dg_solo').setLabel('مغامرة فردية 👤').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('dg_party').setLabel('مغامرة جماعية 👥').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('dg_cancel').setLabel('إلغاء ❌').setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.reply({ embeds: [entryEmbed], components: [row], fetchReply: true });
    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.user.id !== userId) return i.reply({ content: '❌ هذه ليست بوابتك!', ephemeral: true });
      if (i.customId === 'dg_cancel') {
        await i.update({ content: '❌ غلقت البوابة.', embeds: [], components: [] });
        return collector.stop();
      }
      if (i.customId === 'dg_solo') {
        collector.stop();
        return this.runLobby(i, userId, guildId, stage, dungeonLevel);
      }
      if (i.customId === 'dg_party') {
        collector.stop();
        return this.runPartyLobby(i, userId, guildId, stage, dungeonLevel);
      }
    });
  },

  async runLobby(interaction, userId, guildId, stage, dungeonLevel) {
    const lobbyEmbed = new EmbedBuilder()
      .setColor(COLORS.info)
      .setTitle(`👤 استعداد — بوابة مستوى ${dungeonLevel}`)
      .setDescription(`${DESIGN.thin_separator}\nسيُفتح ممر خاص لك الآن.\n\n**المرحلة:** ${stage.name}\n${DESIGN.thin_separator}`)
      .setImage(stage.image);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dg_enter').setLabel('دخول البوابة 🚪').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('dg_cancel').setLabel('تراجع ❌').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [lobbyEmbed], components: [row] });
    const msg = await interaction.fetchReply();
    const collector = msg.createMessageComponentCollector({ time: 30000 });

    collector.on('collect', async i => {
      if (i.user.id !== userId) return;
      if (i.customId === 'dg_cancel') return i.update({ content: '❌ تراجعت عن دخول البوابة.', embeds: [], components: [] });
      if (i.customId === 'dg_enter') {
        await i.update({ content: '⚙️ تفتح البوابة...', embeds: [], components: [] });
        collector.stop();
        const thread = await interaction.channel.threads.create({
          name: `🌀-بوابة-${dungeonLevel}-${interaction.user.username}`,
          autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
          reason: 'Solo Dungeon'
        }).catch(() => null);
        if (!thread) return interaction.followUp({ content: '❌ فشل في فتح البوابة! تأكد من صلاحيات البوت.', ephemeral: true });
        await thread.members.add(userId);
        return this.runSoloDungeon(thread, userId, guildId, stage, interaction.user, dungeonLevel);
      }
    });
  },

  async runPartyLobby(interaction, userId, guildId, stage, dungeonLevel) {
    const partyEmbed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(`👥 غرفة انتظار الفريق — مستوى ${dungeonLevel}`)
      .setDescription(`${DESIGN.thin_separator}\n<@${userId}> يفتح بوابة جماعية!\nلديكم **60 ثانية** للانضمام.\n${DESIGN.thin_separator}`)
      .setImage(stage.image);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('dg_join').setLabel('انضمام 🙋').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('dg_start_party').setLabel('بدء المغامرة ⚔️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('dg_cancel').setLabel('إلغاء ❌').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [partyEmbed], components: [row] });
    const msg = await interaction.fetchReply();
    const partyMembers = [userId];
    const collector = msg.createMessageComponentCollector({ time: 60000 });

    collector.on('collect', async i => {
      if (i.customId === 'dg_cancel' && i.user.id === userId) {
        collector.stop();
        return i.update({ content: '❌ ألغيت البوابة الجماعية.', embeds: [], components: [] });
      }
      if (i.customId === 'dg_join') {
        if (partyMembers.includes(i.user.id)) return i.reply({ content: '✅ أنت بالفعل في الفريق.', ephemeral: true });
        if (partyMembers.length >= 4) return i.reply({ content: '❌ الفريق ممتلئ (4 لاعبين كحد أقصى).', ephemeral: true });
        partyMembers.push(i.user.id);
        partyEmbed.setDescription(`${DESIGN.thin_separator}\n${partyMembers.map(id => `<@${id}>`).join(', ')} — **${partyMembers.length}/4**\n${DESIGN.thin_separator}`);
        return i.update({ embeds: [partyEmbed] });
      }
      if (i.customId === 'dg_start_party' && i.user.id === userId) {
        collector.stop();
        await i.update({ content: '⚙️ تفتح البوابة الجماعية...', embeds: [], components: [] });
        const thread = await interaction.channel.threads.create({
          name: `🌀-بوابة-جماعية-${dungeonLevel}`,
          autoArchiveDuration: ThreadAutoArchiveDuration.OneHour
        }).catch(() => null);
        if (!thread) return interaction.followUp({ content: '❌ فشل في فتح البوابة.', ephemeral: true });
        for (const mid of partyMembers) await thread.members.add(mid).catch(() => {});
        return this.runSoloDungeon(thread, userId, guildId, stage, interaction.user, dungeonLevel, partyMembers);
      }
    });
  },

  async runSoloDungeon(thread, userId, guildId, stage, userObj, dungeonLevel, partyIds = null) {
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

    let player = {
      name: userObj.username,
      hp: 100 + (u.level * 25) + (u.hp_bonus || 0) + armorBonus,
      maxHp: 100 + (u.level * 25) + (u.hp_bonus || 0) + armorBonus,
      atk: 15 + (u.level * 6) + (u.atk_bonus || 0) + weaponBonus + shadowBonusAtk,
      potions: 3, gold: 0, keys: 0, tempBuff: 1, nextReduction: 0,
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
    let log = [`🌀 دخلت **${stage.name}** — مستوى **${dungeonLevel}** — **${totalRooms}** غرفة + الزعيم`, `💪 قوة مجنّسة إضافية من الظلال: **+${shadowBonusAtk}** ⚔️`];
    const activeInteractions = new Set();

    // ===== Render Map =====
    const mapBar = () => {
      const cells = [];
      for (let i = 0; i <= totalRooms; i++) {
        if (i < roomIndex) cells.push('🟦');
        else if (i === roomIndex) cells.push('🧍');
        else if (i === totalRooms) cells.push('💀');
        else cells.push('⬜');
      }
      return cells.join('');
    };

    const generateRoom = () => {
      if (roomIndex >= totalRooms) return { kind: 'boss' };
      const kind = ROOM_TYPES[Math.floor(Math.random() * ROOM_TYPES.length)];
      if (kind === 'combat' || kind === 'mystery') {
        const base = stageEnemies.length
          ? stageEnemies[Math.floor(Math.random() * stageEnemies.length)]
          : { name: 'وحش مجهول', emoji: '👾', hp: 60, atk: 12, image: null, shadowRank: 'E' };
        const scale = dungeonScale * (1 + roomIndex * 0.08);
        return {
          kind: 'combat',
          enemy: {
            ...base,
            maxHp: Math.floor(base.hp * scale),
            hp: Math.floor(base.hp * scale),
            atk: Math.floor((base.atk || 10) * scale),
            status: null,
            lootRarity: rollLootRarity()
          }
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

    // ===== Build Embed =====
    const buildEmbed = () => {
      const isBoss = currentRoom?.enemy?.isBoss;
      const color = phase === 'gameover' ? COLORS.error
        : isBoss ? 0x8E44AD
        : phase === 'combat' ? COLORS.error
        : phase === 'event' ? COLORS.gold
        : COLORS.info;

      const embed = new EmbedBuilder().setColor(color).setTimestamp();

      // HP bar
      const hpPct = Math.max(0, player.hp / player.maxHp);
      const hpBar = createHPBar(hpPct);
      const statusStr = player.status ? ` ${player.status.emoji} ${player.status.name}` : '';

      embed.addFields({
        name: `👤 ${player.name}${statusStr}`,
        value: `${hpBar} \`${Math.max(0, player.hp)}/${player.maxHp}\` ❤️\n⚔️ \`${player.atk}\` 🧪 \`${player.potions}\` 💰 \`${player.gold}\` ${player.comboCount > 0 ? `🔥 Combo x${player.comboCount}` : ''}`,
        inline: false
      });

      if (phase === 'combat' && currentRoom?.enemy) {
        const e = currentRoom.enemy;
        const eHpPct = Math.max(0, e.hp / e.maxHp);
        const eHpBar = createHPBar(eHpPct);
        const eStatusStr = e.status ? ` ${e.status.emoji} ${e.status.name}` : '';
        embed.setTitle(e.isBoss ? `👑 زعيم البوابة: ${e.name}` : `⚔️ مواجهة: ${e.name}`)
          .setDescription(e.description ? `*"${e.description}"*` : null)
          .addFields({
            name: `${e.emoji || '👾'} ${e.name}${eStatusStr} ${e.lootRarity ? e.lootRarity.emoji : ''}`,
            value: `${eHpBar} \`${Math.max(0, e.hp)}/${e.maxHp}\` ❤️ ⚔️ \`${e.atk}\``,
            inline: false
          });
        if (e.image) embed.setImage(e.image);
        else if (e.isBoss) embed.setImage(ROOM_IMAGES.boss);
        else embed.setImage(stage.image);
      } else if (phase === 'event' && currentRoom) {
        const titles = { treasure: '💰 صندوق كنز', fountain: '⛲ نافورة شفاء', shrine: '🛐 ضريح قديم', trap: '⚠️ فخ مفاجئ', merchant: '🧙 تاجر متجول' };
        const msgs = {
          treasure: `وجدت كنزاً يحوي **${currentRoom.gold}** 💎!`,
          fountain:  `نافورة سحرية تتلألأ — اشرب لاستعادة كامل صحتك.`,
          shrine:    `ضريح قديم يعرض تعزيزاً دائماً: **+${currentRoom.buff?.amt} ${currentRoom.buff?.k === 'atk' ? '⚔️ هجوم' : currentRoom.buff?.k === 'crit' ? '🎯 حظ حرج' : '❤️ صحة'}**.`,
          trap:      `فخ مفاجئ! تلقيت **${currentRoom.dmg}** ضرر.`,
          merchant:  `تاجر متجول لديه بضاعة نادرة.`
        };
        const roomImg = ROOM_IMAGES[currentRoom.kind] || stage.image;
        embed.setTitle(titles[currentRoom.kind] || '🚪 حدث')
          .setDescription(`${DESIGN.thin_separator}\n${msgs[currentRoom.kind]}\n${DESIGN.thin_separator}`)
          .setImage(roomImg);
      } else if (phase === 'map') {
        const roomsLeft = totalRooms - roomIndex;
        embed.setTitle(roomsLeft <= 0 ? '💀 بوابة الزعيم النهائي أمامك!' : `🗺️ الغرفة ${roomIndex + 1}/${totalRooms + 1} — ${roomsLeft} متبقية`)
          .setDescription(`${DESIGN.thin_separator}\nاختر طريقاً للمضي قدماً...\n${DESIGN.thin_separator}`)
          .setImage(stage.image)
          .setThumbnail('https://i.imgur.com/7mEo7tA.png');
      } else if (phase === 'gameover') {
        embed.setTitle('💀 سقطت في البوابة')
          .setDescription('المغامرة انتهت. ارجع وتدرب أكثر.')
          .setImage(ROOM_IMAGES.defeat)
          .setThumbnail('https://static.wikia.nocookie.net/sololeveling/images/b/bc/Baruka.png');
      }

      embed.addFields(
        { name: '🗺️ خريطة البوابة', value: mapBar(), inline: false },
        { name: '📜 آخر الأحداث', value: log.slice(-5).join('\n').slice(0, 1024) || '—', inline: false }
      );
      embed.setFooter({ text: `${stage.name} • مستوى ${dungeonLevel} • الغرفة ${roomIndex + 1}` });

      // Components
      const rows = [];
      if (phase === 'map') {
        const r = new ActionRowBuilder();
        if (roomIndex >= totalRooms) {
          r.addComponents(new ButtonBuilder().setCustomId('dr_boss').setLabel('دخول غرفة الزعيم 💀').setStyle(ButtonStyle.Danger));
        } else {
          r.addComponents(
            new ButtonBuilder().setCustomId('dr_door:0').setLabel('🚪 يسار').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('dr_door:1').setLabel('🚪 وسط').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('dr_door:2').setLabel('🚪 يمين').setStyle(ButtonStyle.Primary)
          );
        }
        rows.push(r);
        rows.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('dr_rest').setLabel(`استراحة ⛺ (${player.potions} جرعة)`).setStyle(ButtonStyle.Success).setDisabled(player.potions <= 0),
          new ButtonBuilder().setCustomId('dr_withdraw').setLabel('انسحاب 🏳️').setStyle(ButtonStyle.Secondary)
        ));
      } else if (phase === 'combat') {
        const e = currentRoom?.enemy;
        const stunned = e?.status?.skipTurn && e?.status?.remaining > 0;
        rows.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('dr_atk').setLabel('هجوم ⚔️').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('dr_skills').setLabel('مهارات ✨').setStyle(ButtonStyle.Primary).setDisabled(player.skills.length === 0),
          new ButtonBuilder().setCustomId('dr_heal').setLabel(`شفاء 🧪 (${player.potions})`).setStyle(ButtonStyle.Success).setDisabled(player.potions <= 0),
          new ButtonBuilder().setCustomId('dr_flee').setLabel('فرار 🏃').setStyle(ButtonStyle.Secondary).setDisabled(!!(e?.isBoss))
        ));
      } else if (phase === 'event') {
        const r = new ActionRowBuilder();
        if (currentRoom.kind === 'treasure') r.addComponents(new ButtonBuilder().setCustomId('dr_take').setLabel('أخذ الكنز 💰').setStyle(ButtonStyle.Success));
        if (currentRoom.kind === 'fountain') r.addComponents(new ButtonBuilder().setCustomId('dr_drink').setLabel('شرب 💧').setStyle(ButtonStyle.Success));
        if (currentRoom.kind === 'shrine') r.addComponents(
          new ButtonBuilder().setCustomId('dr_pray').setLabel(`قربان (200💎) 🛐`).setStyle(ButtonStyle.Primary).setDisabled(player.gold < 200)
        );
        if (currentRoom.kind === 'trap') r.addComponents(new ButtonBuilder().setCustomId('dr_continue').setLabel('متابعة ↪️').setStyle(ButtonStyle.Secondary));
        if (currentRoom.kind === 'merchant') {
          r.addComponents(
            new ButtonBuilder().setCustomId('dr_buy_potion').setLabel('جرعة شفاء (300💎) 🧪').setStyle(ButtonStyle.Primary).setDisabled(player.gold < 300),
            new ButtonBuilder().setCustomId('dr_continue').setLabel('تجاهل ↪️').setStyle(ButtonStyle.Secondary)
          );
        }
        if (!['trap', 'merchant'].includes(currentRoom.kind)) r.addComponents(new ButtonBuilder().setCustomId('dr_continue').setLabel('متابعة ↪️').setStyle(ButtonStyle.Secondary));
        rows.push(r);
      }

      return { embeds: [embed], components: rows };
    };

    const msg = await thread.send(buildEmbed());
    const collector = msg.createMessageComponentCollector({ time: 1800000 });

    // ===== Enemy attack logic =====
    const enemyAttack = () => {
      const e = currentRoom.enemy;
      // Apply status effects tick
      applyStatusTick(e, log);
      if (e.status?.skipTurn && e.status.remaining > 0) {
        log.push(`⚡ **${e.name}** مذهول ولم يستطع الهجوم!`);
        return;
      }
      let dmg = Math.max(1, e.atk + Math.floor(Math.random() * (5 + dungeonLevel)));
      if (e.status?.atkReduce) dmg = Math.floor(dmg * (1 - e.status.atkReduce));
      let moveLog = null;
      if (e.moves && e.moves.length && Math.random() > 0.6) {
        const mv = e.moves[Math.floor(Math.random() * e.moves.length)];
        dmg = Math.floor(dmg * (mv.damage || 1.2));
        moveLog = mv.log;
      }
      if (player.nextReduction) {
        dmg = Math.floor(dmg * (1 - player.nextReduction));
        player.nextReduction = 0;
      }
      player.hp -= dmg;
      log.push(moveLog || `${e.emoji || '👾'} **${e.name}** ضربك بـ **${dmg}** ضرر.`);
    };

    const checkDeath = async (i) => {
      if (player.hp <= 0) {
        phase = 'gameover';
        log.push(`💀 سقطت في الغرفة ${roomIndex + 1}.`);
        await i.update(buildEmbed());
        setTimeout(() => thread.delete().catch(() => {}), 30000);
        collector.stop('defeat');
        return true;
      }
      return false;
    };

    const handleVictory = async (i) => {
      const e = currentRoom.enemy;
      const loot = e.lootRarity || { emoji: '⬜', name: 'عادي', goldMul: 1.0 };
      const goldBase = e.goldReward
        ? Math.floor(e.goldReward[0] + Math.random() * (e.goldReward[1] - e.goldReward[0]))
        : Math.floor((80 + roomIndex * 60) * dungeonScale);
      const gold = Math.floor(goldBase * loot.goldMul * (player.comboCount > 2 ? 1.25 : 1));
      player.gold += gold;
      player.comboCount++;
      log.push(`✅ هزمت **${e.name}**! ${loot.emoji} +**${gold}** 💎 ${player.comboCount > 2 ? `🔥 Combo x${player.comboCount}!` : ''}`);

      // Shadow extraction chance for demons/shadow race
      const g2 = readGuild(guildId);
      const u2 = g2.users[userId];
      if (e.shadowRank && (u2.race === 'shadow' || Math.random() < 0.15)) {
        const extractChance = u2.race === 'shadow' ? 0.80 : 0.15;
        if (Math.random() < extractChance) {
          u2.shadow_army = u2.shadow_army || [];
          if (u2.shadow_army.length < 50) {
            const shadowPower = Math.floor((e.atk || 10) * 0.5 + (e.hp || 100) * 0.02);
            u2.shadow_army.push({ name: `ظل ${e.name}`, rank: e.shadowRank || 'E', power: shadowPower, emoji: e.emoji || '🌑' });
            log.push(`🌑 **استُخلص ظل ${e.name}** — قوة: **${shadowPower}** — جيشك: ${u2.shadow_army.length} ظل`);
            writeGuild(guildId, g2);
          }
        }
      }

      roomIndex++;
      currentRoom = null;
      phase = 'map';
      await i.update(buildEmbed());
    };

    collector.on('collect', async i => {
      if (i.user.id !== userId) return i.reply({ content: '❌ هذه ليست بوابتك.', ephemeral: true });
      if (activeInteractions.has(userId)) return i.deferUpdate().catch(() => {});
      activeInteractions.add(userId);
      try {
        const id = i.customId;

        // ===== MAP PHASE =====
        if (phase === 'map') {
          if (id === 'dr_withdraw') {
            log.push('🏳️ انسحبت من البوابة.');
            await i.update({ content: '🏳️ انسحبت بأمان.', embeds: [], components: [] });
            setTimeout(() => thread.delete().catch(() => {}), 10000);
            return collector.stop('withdraw');
          }
          if (id === 'dr_rest') {
            if (player.potions <= 0) return i.reply({ content: '❌ لا جرعات متبقية.', ephemeral: true });
            player.potions--;
            const heal = Math.floor(player.maxHp * 0.4);
            player.hp = Math.min(player.maxHp, player.hp + heal);
            log.push(`⛺ استرحت: +**${heal}** ❤️`);
            return i.update(buildEmbed());
          }
          if (id === 'dr_boss') {
            const bossData = BOSSES.find(b => b.stage === stage.id) || BOSSES[0];
            const scale = dungeonScale * 1.8;
            currentRoom = {
              kind: 'boss',
              enemy: {
                ...bossData, isBoss: true,
                maxHp: Math.floor(bossData.hp * scale),
                hp: Math.floor(bossData.hp * scale),
                atk: Math.floor((bossData.atk || 50) * scale),
                status: null, lootRarity: { key: 'legendary', emoji: '🌟', name: 'أسطوري خالص', goldMul: 10.0 }
              }
            };
            phase = 'combat';
            log.push(`💀 ظهر الزعيم **${currentRoom.enemy.name}**!`);
            return i.update(buildEmbed());
          }
          if (id.startsWith('dr_door:')) {
            currentRoom = generateRoom();
            if (currentRoom.kind === 'combat') {
              phase = 'combat';
              log.push(`⚔️ دخلت غرفة مواجهة: **${currentRoom.enemy.name}**!`);
            } else {
              phase = 'event';
              const names = { treasure: '💰 كنز', fountain: '⛲ نافورة', shrine: '🛐 ضريح', trap: '⚠️ فخ', merchant: '🧙 تاجر' };
              log.push(`🚪 الغرفة ${roomIndex + 1}: ${names[currentRoom.kind] || currentRoom.kind}`);
              if (currentRoom.kind === 'trap') player.hp = Math.max(1, player.hp - currentRoom.dmg);
            }
            if (await checkDeath(i)) return;
            return i.update(buildEmbed());
          }
        }

        // ===== EVENT PHASE =====
        if (phase === 'event') {
          if (id === 'dr_take' && currentRoom.kind === 'treasure') {
            player.gold += currentRoom.gold;
            log.push(`💰 +${currentRoom.gold} 💎`);
          } else if (id === 'dr_drink' && currentRoom.kind === 'fountain') {
            player.hp = player.maxHp;
            log.push(`⛲ استعدت كامل الصحة!`);
          } else if (id === 'dr_pray' && currentRoom.kind === 'shrine') {
            if (player.gold < 200) return i.reply({ content: '❌ تحتاج 200 💎.', ephemeral: true });
            player.gold -= 200;
            const b = currentRoom.buff;
            if (b.k === 'atk') player.atk += b.amt;
            else if (b.k === 'crit') player.critChance = (player.critChance || 0.1) + b.amt;
            else { player.maxHp += b.amt; player.hp += b.amt; }
            log.push(`🛐 تعزيز دائم: +${b.amt} ${b.k === 'atk' ? '⚔️' : b.k === 'crit' ? '🎯' : '❤️'}`);
            roomIndex++; currentRoom = null; phase = 'map';
            return i.update(buildEmbed());
          } else if (id === 'dr_buy_potion' && currentRoom.kind === 'merchant') {
            if (player.gold < 300) return i.reply({ content: '❌ رصيد قليل.', ephemeral: true });
            player.gold -= 300; player.potions++;
            log.push(`🛒 اشتريت جرعة.`);
            roomIndex++; currentRoom = null; phase = 'map';
            return i.update(buildEmbed());
          }
          if (id === 'dr_continue') { roomIndex++; currentRoom = null; phase = 'map'; }
          return i.update(buildEmbed());
        }

        // ===== COMBAT PHASE =====
        if (phase === 'combat') {
          const e = currentRoom.enemy;

          if (id === 'dr_flee') {
            if (Math.random() < 0.5) {
              player.comboCount = 0;
              log.push(`🏃 فررت من **${e.name}**!`);
              currentRoom = null; phase = 'map'; roomIndex++;
              return i.update(buildEmbed());
            }
            log.push(`🏃 فشل الفرار!`);
            enemyAttack();
            if (await checkDeath(i)) return;
            return i.update(buildEmbed());
          }

          if (id === 'dr_skills') {
            if (player.skills.length === 0) return i.reply({ content: '❌ لا مهارات.', ephemeral: true });
            const menu = new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder().setCustomId('dr_use_skill').setPlaceholder('✨ اختر مهارة...')
                .addOptions(player.skills.map(s => ({
                  label: s.name, value: s.id,
                  description: (s.desc || '').slice(0, 90),
                  emoji: s.emoji
                })))
            );
            const back = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('dr_back').setLabel('رجوع 🔙').setStyle(ButtonStyle.Secondary));
            return i.update({ components: [menu, back] });
          }
          if (id === 'dr_back') return i.update(buildEmbed());

          // Tick status effects on player each round
          applyStatusTick(player, log);

          let didAttack = false;
          if (id === 'dr_atk') {
            const isCrit = rollCrit(player);
            let dmg = Math.floor((player.atk + Math.floor(Math.random() * 10)) * (player.tempBuff || 1) * (isCrit ? 2.0 : 1));
            if (player.domainActive) dmg = Math.floor(dmg * 1.5);
            player.tempBuff = 1;
            e.hp -= dmg;
            log.push(`⚔️ ضربت **${e.name}** بـ **${dmg}** ضرر${isCrit ? ' — 💥 **ضربة حرجة!**' : ''}`);
            didAttack = true;
          } else if (id === 'dr_heal') {
            if (player.potions <= 0) return i.reply({ content: '❌ لا جرعات.', ephemeral: true });
            player.potions--;
            const h = Math.floor(player.maxHp * 0.35);
            player.hp = Math.min(player.maxHp, player.hp + h);
            log.push(`🧪 استعدت **${h}** ❤️`);
            didAttack = true;
          } else if (i.isStringSelectMenu?.() && id === 'dr_use_skill') {
            const sk = player.skills.find(x => x.id === i.values[0]);
            if (!sk) return i.update(buildEmbed());
            let m = `${sk.emoji} استخدمت **${sk.name}**`;

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
              // Special: apply status if skill has it
              if (sk.id === 'ice_spike' && !e.status) { e.status = { ...STATUS_EFFECTS.freeze, remaining: STATUS_EFFECTS.freeze.duration }; m += ` ❄️ جُمِّد الوحش!`; }
              if (sk.id === 'lava_burst' && !e.status) { e.status = { ...STATUS_EFFECTS.burn, remaining: STATUS_EFFECTS.burn.duration }; m += ` 🔥 أُشعل الوحش!`; }
            } else if (sk.type === 'shadow_extract') {
              const extractChance = 0.80;
              if (Math.random() < extractChance) {
                const g2 = readGuild(guildId); const u2 = g2.users[userId];
                u2.shadow_army = u2.shadow_army || [];
                const shadowPower = Math.floor((e.atk || 10) * 0.5);
                u2.shadow_army.push({ name: `ظل ${e.name}`, rank: e.shadowRank || 'E', power: shadowPower, emoji: e.emoji || '🌑' });
                writeGuild(guildId, g2);
                m += ` — 🌑 استُخلص ظل **${e.name}**!`;
              } else { m += ` — فشل الاستخلاص.`; }
            } else if (sk.type === 'domain') {
              player.domainActive = true;
              m += ` — 🌐 مجالك المطلق نشط — جميع قدراتك مضاعفة هذه الجولة!`;
            }

            log.push(m);
            didAttack = true;
          }

          if (!didAttack) return;

          // Boss phase transitions
          if (e.isBoss && e.hp < e.maxHp * 0.5 && !e._phase2) {
            e._phase2 = true;
            e.atk = Math.floor(e.atk * 1.3);
            log.push(`👑 **${e.name}** فقد أكثر من 50% من صحته — **المرحلة الثانية!** هجومه زاد!`);
          }

          if (e.hp <= 0) {
            if (e.isBoss) {
              // Boss victory
              const g2 = readGuild(guildId);
              const u2 = g2.users[userId];
              const reward = e.reward ? Math.floor(e.reward.min + Math.random() * (e.reward.max - e.reward.min)) : 5000;
              const totalGold = player.gold + reward;
              u2.balance = (u2.balance || 0) + totalGold;
              u2.dungeon_wins = (u2.dungeon_wins || 0) + 1;
              u2.last_dungeon_level = dungeonLevel;
              u2.xp = (u2.xp || 0) + (e.xpReward || 500);

              // Boss shadow extraction
              if (e.shadowName && (u2.race === 'shadow' || Math.random() < 0.4)) {
                u2.shadow_army = u2.shadow_army || [];
                if (u2.shadow_army.length < 50) {
                  u2.shadow_army.push({ name: e.shadowName, rank: e.shadowRank || 'S', power: e.shadowPower || 1000, emoji: e.emoji || '👑', isBoss: true });
                  log.push(`🌑 **قُمْ!** — استُخلص ظل الزعيم **${e.shadowName}** وانضم لجيشك!`);
                }
              }

              writeGuild(guildId, g2);
              const newRank = getHunterRank(u2.dungeon_wins, u2.level || 1);
              const victoryEmbed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle(`🏆 انتصار أسطوري!`)
                .setDescription(`هزمت **${e.name}**!\n\n💰 مكافأة: **${reward.toLocaleString()}** 💎\n💼 مجموع الرحلة: **${totalGold.toLocaleString()}** 💎\n${newRank.emoji} رتبتك: **${newRank.rank}** — ${newRank.name}\n\n**انتصارات إجمالية:** ${u2.dungeon_wins}`)
                .setImage(e.image || stage.image)
                .setThumbnail(userObj.displayAvatarURL({ dynamic: true }));
              await i.update({ embeds: [victoryEmbed], components: [] });
              setTimeout(() => thread.delete().catch(() => {}), 60000);
              return collector.stop('victory');
            }
            return handleVictory(i);
          }

          // Enemy counter-attack
          enemyAttack();
          if (await checkDeath(i)) return;
          player.domainActive = false;
          return i.update(buildEmbed());
        }

      } catch (err) {
        // Silent catch to prevent crashes
      } finally {
        activeInteractions.delete(userId);
      }
    });

    collector.on('end', (_, reason) => {
      if (reason === 'time') {
        thread.send('⏰ انتهى وقت المغامرة!').catch(() => {});
        setTimeout(() => thread.delete().catch(() => {}), 10000);
      }
    });
  }
};

// ===== HP Bar Rendering =====
function createHPBar(pct, len = 12) {
  const colors = pct > 0.5 ? '🟩' : pct > 0.25 ? '🟨' : '🟥';
  const filled = Math.round(pct * len);
  const empty = len - filled;
  return colors.repeat(filled) + '⬛'.repeat(empty);
}
