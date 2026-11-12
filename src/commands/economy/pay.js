const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS, createStyledEmbed } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
  aliases: ['تحويل', 'اعطي', 'دفع', 'pay'],
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('تحويل عملة لعضو آخر')
    .addUserOption(o => o.setName('user').setDescription('العضو المرسل إليه').setRequired(true))
    .addIntegerOption(o => o.setName('amount').setDescription('المبلغ').setRequired(true).setMinValue(1)),
  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (target.bot) return interaction.reply({ content: '❌ لا يمكن التحويل للبوتات!', ephemeral: true });
    if (target.id === userId) return interaction.reply({ content: '❌ لا يمكن التحويل لنفسك!', ephemeral: true });

    const g = readGuild(guildId);
    g.users = g.users || {};
    const sender = g.users[userId] || { balance: config.DEFAULT_BALANCE || 1000 };
    
    if (sender.balance < amount) {
      return interaction.reply({
        content: `❌ رصيدك غير كافٍ! لديك **${config.CURRENCY} ${sender.balance.toLocaleString()}**`,
        ephemeral: true
      });
    }

    const receiver = g.users[target.id] || { balance: config.DEFAULT_BALANCE || 1000 };
    
    sender.balance -= amount;
    receiver.balance = (receiver.balance || 0) + amount;
    
    sender.stats = sender.stats || {};
    sender.stats.pay_count = (sender.stats.pay_count || 0) + 1;
    
    g.users[userId] = sender;
    g.users[target.id] = receiver;
    writeGuild(guildId, g);

    const embed = createStyledEmbed(interaction, '💸 تم التحويل!', COLORS.success)
      .setDescription(`نقل ${interaction.user} **${config.CURRENCY} ${amount.toLocaleString()}** إلى ${target}`)
      ;

    await interaction.reply({ embeds: [embed] });
  }
};
