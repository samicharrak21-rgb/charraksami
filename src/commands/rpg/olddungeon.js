const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  aliases: ['دانجن_قديم', 'olddungeon', 'olddg'],
  data: new SlashCommandBuilder()
    .setName('olddungeon')
    .setDescription('🏰 نظام الدانجن القديم (كلاسيك)'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const g = readGuild(guildId);
    
    g.users = g.users || {};
    if (!g.users[userId]) g.users[userId] = { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1 };
    const u = g.users[userId];

    // Old Dungeon Logic: Random Adventure with simple results
    const outcomes = [
      { msg: 'لقد وجدت كنزاً مدفوناً! 💰', gold: 500, xp: 50, type: 'win' },
      { msg: 'هاجمك وحش مفترس وهربت بأعجوبة! 👹', gold: -100, xp: 20, type: 'loss' },
      { msg: 'وجدت غرفة سرية مليئة بالجواهر! ✨', gold: 1000, xp: 100, type: 'win' },
      { msg: 'لقد ضللت الطريق وخسرت بعض الذهب.. 🌲', gold: -200, xp: 10, type: 'loss' },
      { msg: 'ساعدت مغامراً تائهاً وأعطاك مكافأة! 🤝', gold: 300, xp: 40, type: 'win' }
    ];

    const result = outcomes[Math.floor(Math.random() * outcomes.length)];
    u.balance += result.gold;
    if (u.balance < 0) u.balance = 0;
    u.xp += result.xp;
    
    writeGuild(guildId, g);

    const embed = new EmbedBuilder()
      .setColor(result.type === 'win' ? COLORS.success : COLORS.error)
      .setTitle('🏰 مغامرة الدانجن الكلاسيكية')
      .setAuthor({ name: interaction.member.displayName, iconURL: interaction.user.displayAvatarURL() })
      .setDescription(`${result.msg}\n\n💰 **الذهب:** ${result.gold > 0 ? '+' : ''}${result.gold}\n✨ **الخبرة:** +${result.xp}`)
      .setFooter({ text: `رصيدك الحالي: ${u.balance.toLocaleString()} 💎` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};