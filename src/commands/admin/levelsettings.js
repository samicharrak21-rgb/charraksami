const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  aliases: ['levelsettings', 'اعدادات_المستويات', 'إعدادات_المستويات', 'ls'],
  data: new SlashCommandBuilder()
    .setName('levelsettings')
    .setDescription('⭐ إعدادات نظام المستويات والـ XP')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('status').setDescription('عرض إعدادات المستويات الحالية'))
    .addSubcommand(s => s.setName('toggle').setDescription('تفعيل أو تعطيل نظام الـ XP'))
    .addSubcommand(s => s.setName('message').setDescription('تخصيص رسالة الترقية').addStringOption(o => o.setName('text').setDescription('نص الرسالة').setRequired(true)))
    .addSubcommand(s => s.setName('channel').setDescription('تحديد قناة الترقية').addChannelOption(o => o.setName('channel').setDescription('القناة').setRequired(true)))
    .addSubcommand(s => s.setName('rewards').setDescription('🎁 ضبط مكافآت العملات عند صعود المستوى')
      .addBooleanOption(o => o.setName('enabled').setDescription('تشغيل/إيقاف المكافآت'))
      .addIntegerOption(o => o.setName('base').setDescription('المكافأة الأساسية لكل مستوى').setMinValue(0).setMaxValue(10000000))
      .addIntegerOption(o => o.setName('perlevel').setDescription('زيادة المكافأة مع كل مستوى').setMinValue(0).setMaxValue(1000000)))
    .addSubcommand(s => s.setName('reward-level').setDescription('🎯 مكافأة مخصصة لمستوى معين (اكتب -1 للحذف)')
      .addIntegerOption(o => o.setName('level').setDescription('المستوى').setRequired(true).setMinValue(2).setMaxValue(1000))
      .addIntegerOption(o => o.setName('amount').setDescription('المبلغ (-1 لحذف المخصص)').setRequired(true).setMinValue(-1).setMaxValue(100000000)))
    .addSubcommand(s => s.setName('reset').setDescription('إعادة ضبط الإعدادات')),
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const g = readGuild(guildId);

    if (!g.xp) g.xp = { enabled: true, min: 5, max: 15, cooldown: 5000 };
    if (!g.channels) g.channels = { levels: null };

    const embed = new EmbedBuilder().setTimestamp();

    if (sub === 'status') {
      embed.setColor(COLORS.primary)
        .setTitle('⭐ إعدادات نظام المستويات')
        .addFields(
          { name: 'الحالة', value: g.xp.enabled ? '✅ مفعل' : '❌ معطل', inline: true },
          { name: 'قناة الترقية', value: g.channels.levels ? `<#${g.channels.levels}>` : 'نفس القناة', inline: true },
          { name: 'رسالة الترقية', value: g.levels?.messageTemplate || 'الافتراضية', inline: false },
          { name: '🎁 المكافآت', value: (() => { const c = require('../../systems/levelRewards').getRewardConfig(g); return c.enabled ? `${c.base} + ${c.perLevel} × (المستوى - 1)` : '❌ معطلة'; })(), inline: false }
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'toggle') {
      g.xp.enabled = !g.xp.enabled;
      writeGuild(guildId, g);
      embed.setColor(g.xp.enabled ? COLORS.success : COLORS.error)
        .setDescription(`تم ${g.xp.enabled ? 'تفعيل' : 'تعطيل'} نظام الـ XP بنجاح.`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'channel') {
      const channel = interaction.options.getChannel('channel');
      g.channels.levels = channel.id;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success)
        .setDescription(`✅ تم تحديد قناة رسائل الترقية: ${channel}`);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'message') {
      const text = interaction.options.getString('text');
      if (!g.levels) g.levels = {};
      g.levels.messageTemplate = text;
      writeGuild(guildId, g);
      embed.setColor(COLORS.success)
        .setTitle('✅ تم تحديث رسالة الترقية')
        .setDescription(`**الرسالة الجديدة:**\n${text}\n\n**المتغيرات:** \`{user}\`, \`{level}\`, \`{oldLevel}\`, \`{xp}\`, \`{nextXP}\``);
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'rewards' || sub === 'reward-level') {
      const R = require('../../systems/levelRewards');
      const config = require('../../config');
      const cur = config.CURRENCY || '💎';
      if (sub === 'rewards') {
        const patch = {};
        const en = interaction.options.getBoolean('enabled');
        const base = interaction.options.getInteger('base');
        const per = interaction.options.getInteger('perlevel');
        if (en !== null && en !== undefined) patch.enabled = en;
        if (base !== null && base !== undefined) patch.base = base;
        if (per !== null && per !== undefined) patch.perLevel = per;
        R.setRewardConfig(g, patch);
      } else {
        const level = interaction.options.getInteger('level');
        const amount = interaction.options.getInteger('amount');
        const cfg = R.getRewardConfig(g);
        if (amount < 0) delete cfg.custom[String(level)]; else cfg.custom[String(level)] = amount;
        R.setRewardConfig(g, { custom: cfg.custom });
      }
      writeGuild(guildId, g);
      const cfg = R.getRewardConfig(g);
      const preview = [2, 5, 10, 20, 50].map(L => `Lv ${L}: **${R.rewardForLevel(cfg, L).toLocaleString()}** ${cur}`).join('\n');
      const custom = Object.entries(cfg.custom).sort((a, b) => a[0] - b[0]).map(([L, v]) => `Lv ${L}: **${Number(v).toLocaleString()}**`).join('\n') || '—';
      embed.setColor(cfg.enabled ? COLORS.success : COLORS.error)
        .setTitle('🎁 مكافآت صعود المستوى')
        .setDescription(`الحالة: ${cfg.enabled ? '✅ مفعلة' : '❌ معطلة'}\nالمعادلة: \`${cfg.base} + ${cfg.perLevel} × (المستوى - 1)\``)
        .addFields({ name: '📊 أمثلة', value: preview, inline: true }, { name: '🎯 مخصصة', value: custom.slice(0, 1000), inline: true });
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'reset') {
      g.xp = { enabled: true, min: 5, max: 15, cooldown: 5000 };
      if (g.levels) delete g.levels;
      if (g.channels) g.channels.levels = null;
      writeGuild(guildId, g);
      embed.setColor(COLORS.warning)
        .setDescription('♻️ تم إعادة ضبط إعدادات المستويات للوضع الافتراضي.');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
