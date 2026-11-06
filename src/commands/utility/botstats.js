const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createStyledEmbed } = require('../../utils/embeds');

function formatBytes(bytes) {
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  seconds %= 86400;
  const h = Math.floor(seconds / 3600);
  seconds %= 3600;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (s || parts.length === 0) parts.push(`${s}s`);
  return parts.join(' ');
}

module.exports = {
  aliases: ['احصائيات', 'إحصائيات', 'stats'],
  data: new SlashCommandBuilder()
    .setName('botstats')
    .setDescription('📊 عرض إحصاءات البوت والأداء'),
  cooldown: 10,
  async execute(interaction) {
    const client = interaction.client;
    const mem = process.memoryUsage();
    const totalMembers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
    const embed = createStyledEmbed(interaction, 'إحصاءات البوت', 0x0984e3)
      .addFields(
        { name: 'الخوادم', value: `${client.guilds.cache.size}`, inline: true },
        { name: 'الأعضاء', value: `${totalMembers}`, inline: true },
        { name: 'القنوات', value: `${client.channels.cache.size}`, inline: true },
        { name: 'الذاكرة', value: `${formatBytes(mem.rss)} RSS\n${formatBytes(mem.heapUsed)} Heap`, inline: true },
        { name: 'المدة التشغيلية', value: formatUptime(process.uptime()), inline: true },
        { name: 'زمن الاستجابة', value: `${client.ws.ping}ms`, inline: true }
      )
      ;
    await interaction.reply({ embeds: [embed] });
  }
};
