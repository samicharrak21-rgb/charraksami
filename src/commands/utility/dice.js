// 🎲 نرد — رمي حجر نرد مرسوم
const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const kit = require('../../utils/cardKit');

function drawDie(ctx, x, y, size, value) {
  const k = kit._kit;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6;
  const g = ctx.createLinearGradient(x, y, x, y + size);
  g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e4e7ee');
  ctx.fillStyle = g;
  k.rr(ctx, x, y, size, size, size * 0.2); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(20,22,30,0.15)'; ctx.lineWidth = 1.5;
  k.rr(ctx, x + 0.5, y + 0.5, size - 1, size - 1, size * 0.2); ctx.stroke();
  // النقاط
  const p = size / 4.4;
  const c = size / 2;
  const o = size / 4;
  const spots = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
    5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
    6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  }[value] || [];
  ctx.fillStyle = '#23262f';
  for (const [dx, dy] of spots) {
    ctx.beginPath();
    ctx.arc(x + c + dx * o, y + c + dy * o, p / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

module.exports = {
  aliases: ['نرد', 'زهر', 'دحي'],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('🎲 ارمِ حجر النرد')
    .addIntegerOption(o => o.setName('count').setDescription('عدد الأحجار (1-3)').setMinValue(1).setMaxValue(3)),
  async execute(interaction) {
    const count = Math.min(3, Math.max(1, interaction.options?.getInteger?.('count') || 1));
    const rolls = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6));
    const total = rolls.reduce((a, b) => a + b, 0);
    const username = interaction.member?.displayName || interaction.user.username;
    const avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });

    try {
      const C = kit._kit.C();
      if (C) {
        await kit.ready();
        const k = kit._kit;
        const W = 900, H = 360;
        const { canvas, ctx, t } = k.base(W, H, 'amber', { bg: 'casino', dim: 0.7, seed: total });
        k.emoji(ctx, '🎲', W - 84, 76, 50, { glow: t.glow });
        k.title(ctx, 'رمية النرد', W - 124, 88, t, { size: 38, align: 'right' });
        k.txt(ctx, username, W - 124, 124, { size: 18, weight: 'normal', color: '#a3abbd', align: 'right' });
        // الأحجار المرسومة
        const size = 120, gap = 30;
        const totalW = rolls.length * size + (rolls.length - 1) * gap;
        let x = (W - totalW) / 2;
        for (const r of rolls) {
          k.panel(ctx, x, 150, size, size, 22, null, { stroke: t.a + '88', glow: t.glow });
          drawDie(ctx, x + 10, 160, size - 20, r);
          x += size + gap;
        }
        k.ribbon(ctx, count > 1 ? `المجموع: ${total}` : `طلع ${total}`, W / 2, H - 70, t, { size: 22, h: 46, icon: '🎲' });
        const card = await k.out(canvas, 'dice.png');
        if (card?.buffer) return interaction.reply({ files: [new AttachmentBuilder(card.buffer, { name: 'dice.png' })] });
      }
    } catch {}
    await interaction.reply({ content: `🎲 **${username}**: [${rolls.join('] [')}] = **${total}**` });
  }
};
