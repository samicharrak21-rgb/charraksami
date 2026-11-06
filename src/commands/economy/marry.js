// نظام الزواج — اقتران بين مستخدمين
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fmt, getUser, saveUser, brandedEmbed, errorEmbed, balanceFooter, safeReply, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');

const RING_COST = 5000;

module.exports = {
  aliases: ['زواج','marry'],
  data: new SlashCommandBuilder().setName('marry').setDescription('💍 نظام الزواج')
    .addSubcommand(s => s.setName('propose').setDescription('عرض زواج').addUserOption(o => o.setName('user').setDescription('الشخص').setRequired(true)))
    .addSubcommand(s => s.setName('divorce').setDescription('طلاق'))
    .addSubcommand(s => s.setName('status').setDescription('حالتي الزوجية')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id, guildId = interaction.guild.id;
    const { g, u } = getUser(guildId, userId);

    if (sub === 'status') {
      if (!u.spouse) return safeReply(interaction, { embeds:[brandedEmbed(interaction,'💔 أعزب', COLORS.muted || COLORS.dark).setDescription('لست متزوجاً.')] });
      const since = new Date(u.spouse.since).toLocaleDateString('ar');
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'💍 حالتي', COLORS.gold).setDescription(`الزوج/ة: <@${u.spouse.userId}>\n📅 منذ: ${since}`)] });
    }

    if (sub === 'divorce') {
      if (!u.spouse) return safeReply(interaction, { embeds:[errorEmbed('غير متزوج','')], ephemeral:true });
      const partnerId = u.spouse.userId;
      const partner = getUser(guildId, partnerId);
      partner.u.spouse = null; u.spouse = null;
      saveUser(guildId, g); saveUser(guildId, partner.g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'💔 طلاق', COLORS.error).setDescription(`انتهى زواجك من <@${partnerId}>.`)] });
    }

    const target = interaction.options.getUser('user');
    if (target.bot || target.id === userId) return safeReply(interaction, { embeds:[errorEmbed('شخص غير صالح','')], ephemeral:true });
    if (u.spouse) return safeReply(interaction, { embeds:[errorEmbed('متزوج بالفعل', `أنت متزوج من <@${u.spouse.userId}>`)], ephemeral:true });
    const tg = getUser(guildId, target.id);
    if (tg.u.spouse) return safeReply(interaction, { embeds:[errorEmbed('متزوج', `${target.username} متزوج بالفعل.`)], ephemeral:true });
    if (u.balance < RING_COST) return safeReply(interaction, { embeds:[errorEmbed('رصيد غير كافٍ', `الخاتم يكلف ${fmt(RING_COST)} ${CURRENCY}`)], ephemeral:true });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('mr_yes').setLabel('💍 قبول').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('mr_no').setLabel('💔 رفض').setStyle(ButtonStyle.Danger)
    );
    const msg = await safeReply(interaction, {
      content: `<@${target.id}>`,
      embeds: [brandedEmbed(interaction,'💍 عرض زواج', COLORS.gold).setDescription(`<@${userId}> يطلب يدك للزواج!\n💎 خاتم بقيمة **${fmt(RING_COST)}** ${CURRENCY}`)],
      components: [row]
    });
    const col = msg.createMessageComponentCollector({ filter: i => i.user.id === target.id, time: 60000, max: 1 });
    col.on('collect', async i => {
      if (i.customId === 'mr_no') return i.update({ embeds:[brandedEmbed(interaction,'💔 رفض', COLORS.error).setDescription(`<@${target.id}> رفض العرض.`)], components:[] });
      u.balance -= RING_COST;
      const since = Date.now();
      u.spouse = { userId: target.id, since };
      tg.u.spouse = { userId, since };
      saveUser(guildId, g); saveUser(guildId, tg.g);
      await i.update({ embeds:[brandedEmbed(interaction,'🎉 مبروك الزواج!', COLORS.success).setDescription(`<@${userId}> 💍 <@${target.id}>\nمبارك الاقتران!`).setFooter(balanceFooter(u))], components:[] });
    });
    col.on('end', async (c, reason) => { if (reason === 'time' && c.size === 0) await msg.edit({ embeds:[brandedEmbed(interaction,'⌛ انتهى الوقت', COLORS.warning).setDescription('لم يتم الرد على العرض.')], components:[] }).catch(()=>{}); });
  }
};
