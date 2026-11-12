// 🗳️ pollSystem v22 — تصويت بأزرار + بطاقة نتائج مرسومة
// الأصوات محفوظة داخل الإمبد نفسه: تتحمل إعادة التشغيل ولا تتعارض مع أزرار البوت الأخرى (بادئة poll_ حصرية)
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const kit = require('../utils/cardKit');

const OPT_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
const OPT_STYLE = [ButtonStyle.Primary, ButtonStyle.Success, ButtonStyle.Danger, ButtonStyle.Secondary];

function countsFromEmbed(embed) {
  const lines = (embed.description || '').split('\n');
  return lines.map((l) => {
    const m = l.match(/^([1-4])️⃣\s+(.*?)\s+—\s+(\d+)\s+صوت/);
    return m ? { i: Number(m[1]) - 1, label: m[2], votes: Number(m[3]) } : null;
  }).filter(Boolean);
}

function pollEmbed(question, opts, counts, authorName) {
  const total = counts.reduce((a, b) => a + b, 0);
  const lines = opts.map((o, i) => {
    const bar = '█'.repeat(Math.min(10, counts[i])) + '░'.repeat(Math.max(0, 10 - counts[i]));
    return `${OPT_EMOJI[i]} ${o} — **${counts[i]}** صوت ${bar}`;
  });
  return new EmbedBuilder()
    .setTitle(`🗳️ ${question}`)
    .setDescription(lines.join('\n'))
    .setColor(0xE8B04A)
    .setFooter({ text: `${authorName} • ${total} صوت — اضغط زراً للتصويت ثم «النتائج» للبطاقة` })
    .setTimestamp();
}

function pollRows(messageId, opts) {
  const rows = [];
  const buttons = opts.map((o, i) => new ButtonBuilder()
    .setCustomId(`poll_${messageId}_${i}`)
    .setLabel(`${i + 1}. ${o.slice(0, 70)}`)
    .setEmoji(OPT_EMOJI[i])
    .setStyle(OPT_STYLE[i]));
  for (let i = 0; i < buttons.length; i += 2) rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 2)));
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`pollres_${messageId}`).setLabel('📊 عرض النتائج').setStyle(ButtonStyle.Secondary)));
  return rows;
}

async function resultsCard({ question, opts, counts, authorName, avatarURL }) {
  const C = kit._kit.C();
  if (!C) return null;
  await kit.ready();
  const k = kit._kit;
  const W = 1000;
  const rowH = 74;
  const H = 220 + opts.length * (rowH + 14) + 40;
  const { canvas, ctx, t } = k.base(W, H, 'azure', { bg: 'rank', dim: 0.7, seed: question.length });
  k.emoji(ctx, '🗳️', W - 84, 74, 48, { glow: t.glow });
  k.title(ctx, 'نتائج التصويت', W - 124, 88, t, { size: 38, align: 'right' });
  k.txt(ctx, question, W - 124, 124, { size: 20, weight: 'normal', color: '#e8eaed', align: 'right', maxW: W - 260 });
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  opts.forEach((o, i) => {
    const y = 180 + i * (rowH + 14);
    const ratio = counts[i] / total;
    k.panel(ctx, 50, y, W - 100, rowH, 16);
    k.emoji(ctx, OPT_EMOJI[i], W - 92, y + rowH / 2, 34);
    k.txt(ctx, o, W - 126, y + 24, { size: 20, align: 'right', maxW: 420 });
    k.bar(ctx, 76, y + rowH - 24, W - 240, 12, ratio, t);
    k.txt(ctx, `${counts[i]} صوت (${Math.round(ratio * 100)}%)`, 76, y + 20, { size: 17, color: t.a, maxW: 200 });
  });
  k.footer(ctx, W, H, `بواسطة ${authorName} • ${total} صوتاً`);
  void avatarURL;
  return k.out(canvas, 'poll.png');
}

async function handlePollButton(interaction) {
  const id = interaction.customId;
  const messageId = id.split('_')[1];
  const message = interaction.message;
  if (!message || message.id !== messageId) return false;
  const embed = message.embeds?.[0];
  if (!embed) return false;

  const opts = [];
  const counts = [];
  for (const c of countsFromEmbed(embed)) { opts[c.i] = c.label; counts[c.i] = c.votes; }
  if (!opts.length) return false;

  if (id.startsWith('pollres_')) {
    const card = await resultsCard({
      question: embed.title?.replace(/^🗳️\s*/, '') || 'تصويت',
      opts, counts,
      authorName: embed.footer?.text?.split('•')?.[0]?.trim() || interaction.guild.name,
      avatarURL: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
    });
    if (card?.buffer) {
      await interaction.reply({ files: [new AttachmentBuilder(card.buffer, { name: 'poll.png' })], ephemeral: false }).catch(() => {});
    } else {
      await interaction.reply({ content: '📊 النتائج محدّثة في الإمبد بالأعلى.', ephemeral: true }).catch(() => {});
    }
    return true;
  }

  const idx = Number(id.split('_')[2]);
  if (Number.isNaN(idx) || !opts[idx]) return false;
  counts[idx] = (counts[idx] || 0) + 1;
  const authorName = embed.footer?.text?.split('•')?.[0]?.trim() || interaction.guild.name;
  await interaction.update({ embeds: [pollEmbed(embed.title?.replace(/^🗳️\s*/, '') || 'تصويت', opts, counts, authorName)] }).catch(() => {});
  return true;
}

module.exports = { pollEmbed, pollRows, countsFromEmbed, resultsCard, handlePollButton };
