// 🤖 /ai — اسأل الذكاء الاصطناعي (مع إعادة المحاولة وتدوير المفاتيح والنماذج)
const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { brandedEmbed, errorEmbed, safeReply } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');
const ai = require('../../utils/aiClient');

const SYSTEM = 'أنت مساعد ذكي ودود في بوت ديسكورد عربي اسمه "سامي". أجب بإيجاز ووضوح بالعربية، ولا تتجاوز 1500 حرف.';
const cooldown = new Map();

module.exports = {
  aliases: ['اسأل', 'ask'],
  data: new SlashCommandBuilder().setName('ai').setDescription('🤖 الذكاء الاصطناعي')
    .addSubcommand((s) => s.setName('ask').setDescription('اسأل الذكاء الاصطناعي')
      .addStringOption((o) => o.setName('prompt').setDescription('سؤالك').setRequired(true).setMaxLength(1000)))
    .addSubcommand((s) => s.setName('status').setDescription('حالة اتصال الذكاء الاصطناعي (للإدارة)'))
    .addSubcommand((s) => s.setName('reset').setDescription('إعادة تفعيل المفاتيح والنماذج المعطلة (للإدارة)')),

  async execute(interaction) {
    const raw = interaction._originalMessage?.content || null; // أمر نصي
    let sub = 'ask';
    try { sub = interaction.options.getSubcommand?.(false) || 'ask'; } catch {}
    if (!['ask', 'status', 'reset'].includes(sub)) sub = 'ask';
    const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.ManageGuild);

    if (sub === 'status' || sub === 'reset') {
      if (!isAdmin) return safeReply(interaction, { embeds: [errorEmbed('غير مسموح', 'هذا الأمر للإدارة فقط.')], ephemeral: true });
      if (sub === 'reset') ai.reset();
      const s = ai.getStats();
      const lines = s.providers.length
        ? s.providers.map((p) => `**${p.name}** — مفاتيح: ${p.keysAvailable}/${p.keys}\n${p.models.map((m) => `${m.blocked ? '🔴' : '🟢'} \`${m.model}\``).join('\n')}`).join('\n\n')
        : '❌ لا يوجد أي مفتاح. أضف `GEMINI_API_KEY` أو `GROQ_API_KEY`.';
      const e = brandedEmbed(interaction, sub === 'reset' ? '♻️ تمت إعادة التفعيل' : '📡 حالة الذكاء الاصطناعي', COLORS.cyan)
        .setDescription(lines)
        .addFields(
          { name: '✅ ناجح', value: String(s.ok), inline: true },
          { name: '❌ فاشل', value: String(s.fail), inline: true },
          { name: '⏱ متوسط', value: `${s.avgMs || 0}ms`, inline: true },
          { name: 'آخر نموذج', value: s.lastModel || '—', inline: true },
          { name: 'آخر خطأ', value: (s.lastError || '—').slice(0, 200) },
        );
      return safeReply(interaction, { embeds: [e], ephemeral: true });
    }

    if (!ai.isConfigured()) return safeReply(interaction, { embeds: [errorEmbed('غير مفعّل', 'أضف `GEMINI_API_KEY` و/أو `GROQ_API_KEY` في متغيرات الاستضافة.')], ephemeral: true });

    const last = cooldown.get(interaction.user.id) || 0;
    if (Date.now() - last < 5000) return safeReply(interaction, { embeds: [errorEmbed('مهلاً', 'انتظر ثوانٍ قبل السؤال التالي.')], ephemeral: true });
    cooldown.set(interaction.user.id, Date.now());

    let prompt = interaction.options.getString('prompt');
    if (raw) prompt = raw.trim().split(/\s+/).slice(1).join(' ').replace(/^ask\s+/i, '');
    if (!prompt) return safeReply(interaction, { embeds: [errorEmbed('اكتب سؤالك', 'مثال: `اسأل ما هي عاصمة اليابان؟`')], ephemeral: true });
    if (!interaction.deferred && !interaction.replied) await interaction.deferReply();
    const reply = await ai.fastChat([{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }], { temperature: 0.7, maxTokens: 1200, timeoutMs: 20000, maxAttempts: 4, hedgeMs: 5000 });
    if (!reply) {
      return interaction.editReply({ embeds: [errorEmbed('الخدمة مشغولة', 'حاولت عدة مرات بنماذج ومفاتيح مختلفة ولم أحصل على رد. جرّب بعد دقيقة.')] });
    }
    await interaction.editReply({ embeds: [brandedEmbed(interaction, '🤖 إجابة الذكاء', COLORS.cyan).setDescription(`**سؤال:** ${prompt.slice(0, 300)}\n\n${reply.slice(0, 3500)}`)] });
  },
};
