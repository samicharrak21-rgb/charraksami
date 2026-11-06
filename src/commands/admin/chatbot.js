// ⚙️ /chatbot — إعدادات الشات بوت التفاعلي
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const { getConfig, setConfig, clearMemory } = require('../../systems/chatbot');
const { COLORS } = require('../../utils/embeds');

function statusEmbed(guild, cfg) {
  const hasKey = !!(process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEYS || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY || process.env.LOVABLE_API_KEY || process.env.OPENAI_API_KEY);
  const emojis = guild.emojis.cache.size;
  return new EmbedBuilder().setColor(COLORS.cyan).setTitle(`🤖 إعدادات الشات بوت — ${cfg.name}`)
    .addFields(
      { name: 'الحالة', value: cfg.enabled ? '🟢 مفعّل' : '🔴 معطّل', inline: true },
      { name: 'الذكاء الاصطناعي', value: hasKey ? '🧠 متصل' : '💬 وضع الردود البسيطة', inline: true },
      { name: 'إيموجيات السيرفر', value: `${emojis} إيموجي`, inline: true },
      { name: 'الرد على المنشن', value: cfg.mention ? '✅' : '❌', inline: true },
      { name: 'الرد عند ذكر الاسم', value: cfg.nameTrigger ? '✅' : '❌', inline: true },
      { name: 'تنفيذ الأوامر', value: cfg.allowActions ? '✅' : '❌', inline: true },
      { name: 'صلاحيات البوت (رصيد/كتم)', value: cfg.powers ? `✅ مكافأة حتى ${cfg.maxReward} • غرامة حتى ${cfg.maxFine} • كتم حتى ${cfg.maxMute}د • ميزانية يومية ${cfg.dailyBudget}` : '❌', inline: false },
      { name: 'نسبة التفاعل العشوائي', value: `${Math.round(cfg.reactChance * 100)}%`, inline: true },
      { name: 'قنوات الدردشة الحرة', value: cfg.channels.length ? cfg.channels.map((c) => `<#${c}>`).join(' ') : '— لا يوجد —' },
      { name: 'الشخصية', value: cfg.persona.slice(0, 1000) },
    );
}

module.exports = {
  aliases: ['شات', 'شاتبوت'],
  data: new SlashCommandBuilder()
    .setName('chatbot')
    .setDescription('🤖 إعدادات الشات بوت التفاعلي')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) => s.setName('status').setDescription('عرض الإعدادات الحالية'))
    .addSubcommand((s) => s.setName('toggle').setDescription('تشغيل / إيقاف الشات بوت')
      .addBooleanOption((o) => o.setName('enabled').setDescription('مفعّل؟').setRequired(true)))
    .addSubcommand((s) => s.setName('channel').setDescription('إضافة/إزالة قناة دردشة حرة يرد فيها على كل رسالة')
      .addChannelOption((o) => o.setName('channel').setDescription('القناة').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand((s) => s.setName('name').setDescription('تغيير اسم البوت في الشات')
      .addStringOption((o) => o.setName('name').setDescription('الاسم').setRequired(true).setMaxLength(32)))
    .addSubcommand((s) => s.setName('persona').setDescription('تغيير شخصية البوت')
      .addStringOption((o) => o.setName('text').setDescription('وصف الشخصية').setRequired(true).setMaxLength(500)))
    .addSubcommand((s) => s.setName('react').setDescription('نسبة التفاعل العشوائي بإيموجيات السيرفر')
      .addIntegerOption((o) => o.setName('percent').setDescription('0 - 50').setMinValue(0).setMaxValue(50).setRequired(true)))
    .addSubcommand((s) => s.setName('options').setDescription('خيارات متقدمة')
      .addBooleanOption((o) => o.setName('mention').setDescription('الرد عند المنشن'))
      .addBooleanOption((o) => o.setName('name_trigger').setDescription('الرد عند ذكر الاسم'))
      .addBooleanOption((o) => o.setName('actions').setDescription('السماح بتنفيذ الأوامر (ألعاب/تفاعل/إدارة)')))
    .addSubcommand((s) => s.setName('powers').setDescription('صلاحيات البوت: يعطي ويسحب رصيد ويكتم من يسيء')
      .addBooleanOption((o) => o.setName('enabled').setDescription('مفعّلة؟'))
      .addIntegerOption((o) => o.setName('max_reward').setDescription('أقصى مكافأة').setMinValue(0).setMaxValue(100000))
      .addIntegerOption((o) => o.setName('max_fine').setDescription('أقصى غرامة').setMinValue(0).setMaxValue(100000))
      .addIntegerOption((o) => o.setName('max_mute').setDescription('أقصى كتم بالدقائق').setMinValue(1).setMaxValue(60))
      .addIntegerOption((o) => o.setName('daily_budget').setDescription('ميزانية المكافآت اليومية').setMinValue(0).setMaxValue(1000000)))
    .addSubcommand((s) => s.setName('reset').setDescription('مسح ذاكرة المحادثة في هذه القناة')),

  async execute(interaction) {
    if (!interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ تحتاج صلاحية **إدارة السيرفر**.', ephemeral: true });
    }
    const gid = interaction.guild.id;
    const sub = interaction.options.getSubcommand?.() || 'status';
    let cfg = getConfig(gid);

    switch (sub) {
      case 'toggle': cfg = setConfig(gid, { enabled: interaction.options.getBoolean('enabled') }); break;
      case 'channel': {
        const ch = interaction.options.getChannel('channel');
        if (!ch) return interaction.reply({ content: '❌ حدد قناة.', ephemeral: true });
        const set = new Set(cfg.channels);
        set.has(ch.id) ? set.delete(ch.id) : set.add(ch.id);
        cfg = setConfig(gid, { channels: [...set] });
        break;
      }
      case 'name': cfg = setConfig(gid, { name: interaction.options.getString('name') }); break;
      case 'persona': cfg = setConfig(gid, { persona: interaction.options.getString('text') }); break;
      case 'react': cfg = setConfig(gid, { reactChance: (interaction.options.getInteger('percent') || 0) / 100 }); break;
      case 'options': {
        const patch = {};
        const m = interaction.options.getBoolean('mention'); if (m !== null && m !== undefined) patch.mention = m;
        const n = interaction.options.getBoolean('name_trigger'); if (n !== null && n !== undefined) patch.nameTrigger = n;
        const a = interaction.options.getBoolean('actions'); if (a !== null && a !== undefined) patch.allowActions = a;
        cfg = setConfig(gid, patch);
        break;
      }
      case 'powers': {
        const patch = {}; const o = interaction.options;
        const map = { enabled: ['powers', 'getBoolean'], max_reward: ['maxReward', 'getInteger'], max_fine: ['maxFine', 'getInteger'], max_mute: ['maxMute', 'getInteger'], daily_budget: ['dailyBudget', 'getInteger'] };
        for (const [opt, [k, fn]] of Object.entries(map)) { const v = o[fn](opt); if (v !== null && v !== undefined) patch[k] = v; }
        cfg = setConfig(gid, patch);
        break;
      }
      case 'reset': clearMemory(interaction.channel.id);
        return interaction.reply({ content: '🧹 تم مسح ذاكرة المحادثة في هذه القناة.', ephemeral: true });
      default: break;
    }
    return interaction.reply({ embeds: [statusEmbed(interaction.guild, cfg)], ephemeral: sub !== 'status' });
  },
};
