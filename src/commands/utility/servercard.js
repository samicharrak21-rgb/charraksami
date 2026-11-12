// 🏰 بطاقة السيرفر v22 — بطاقة معلومات مرسومة
const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const kit = require('../../utils/cardKit');

module.exports = {
  aliases: ['بطاقه_السيرفر', 'هويه_السيرفر'],
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('servercard')
    .setDescription('🏰 بطاقة معلومات السيرفر مرسومة'),
  async execute(interaction) {
    await interaction.deferReply?.().catch(() => {});
    const guild = interaction.guild;
    const owner = await guild.fetchOwner?.().catch(() => null) || null;
    const stats = [
      ['الأعضاء', guild.memberCount?.toLocaleString() || '—', '👥'],
      ['القنوات', guild.channels?.cache?.size?.toLocaleString() || '—', '📁'],
      ['الرتب', guild.roles?.cache?.size?.toLocaleString() || '—', '🎖️'],
      ['الإيموجي', guild.emojis?.cache?.size?.toLocaleString() || '—', '😀'],
      ['البوست', `مستوى ${guild.premiumTier || 0} • ${guild.premiumSubscriptionCount || 0}`, '🚀'],
      ['الإنشاء', `<t:${Math.floor((guild.createdTimestamp || Date.now()) / 1000)}:D>`, '📅'],
    ];
    try {
      const C = kit._kit.C();
      if (C) {
        await kit.ready();
        const k = kit._kit;
        const W = 1000, H = 560;
        const { canvas, ctx, t } = k.base(W, H, 'azure', { bg: 'rank', dim: 0.66 });
        // الأيقونة والعنوان
        k.emoji(ctx, '🏰', W - 90, 80, 56, { glow: t.glow });
        k.title(ctx, guild.name, W - 130, 96, t, { size: 42, maxW: 620, align: 'right' });
        k.txt(ctx, `آيدي السيرفر: ${guild.id}`, W - 130, 132, { size: 15, weight: 'normal', color: '#a3abbd', align: 'right' });
        // المالك
        k.panel(ctx, 50, 180, W - 100, 110, 20);
        if (owner) await k.avatar(ctx, owner.user.displayAvatarURL({ extension: 'png', size: 256 }), W - 170, 192, 84, t, owner.displayName);
        k.txt(ctx, 'المالك', W - 196, 212, { size: 15, weight: 'normal', color: '#a3abbd', align: 'right' });
        k.txt(ctx, owner?.displayName || '—', W - 196, 242, { size: 26, align: 'right', maxW: 420 });
        k.txt(ctx, `👥 ${guild.memberCount?.toLocaleString()} عضو`, 76, 240, { size: 22, color: t.a });
        // الإحصائيات
        const cw = (W - 100 - 40) / 3;
        stats.forEach(([l, v, ic], i) => k.stat(ctx, 50 + (2 - (i % 3)) * (cw + 20), 314 + Math.floor(i / 3) * 108, cw, 92, l, String(v), t, ic));
        const card = await k.out(canvas, 'server.png');
        if (card?.buffer) {
          return interaction.editReply({ files: [new AttachmentBuilder(card.buffer, { name: 'server.png' })] });
        }
      }
    } catch {}
    const embed = new EmbedBuilder().setTitle(`🏰 ${guild.name}`).setColor(0xE8B04A)
      .addFields(stats.map(([l, v]) => ({ name: l, value: String(v), inline: true })));
    return interaction.editReply({ embeds: [embed] });
  }
};
