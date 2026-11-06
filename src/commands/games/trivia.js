// تريفيا — 50+ سؤال متنوع
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { fmt, getUser, saveUser, bumpStat, brandedEmbed, winEmbed, loseEmbed, balanceFooter, safeReply, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');

const Q = [
  { q:'ما هي عاصمة أستراليا؟', a:['سيدني','كانبيرا','ملبورن','بيرث'], c:1 },
  { q:'كم عدد كواكب المجموعة الشمسية؟', a:['7','8','9','10'], c:1 },
  { q:'في أي عام بدأت الحرب العالمية الأولى؟', a:['1912','1914','1918','1939'], c:1 },
  { q:'ما أكبر محيط في العالم؟', a:['الأطلسي','الهندي','الهادئ','المتجمد'], c:2 },
  { q:'من رسم لوحة الموناليزا؟', a:['فان جوخ','بيكاسو','دافنشي','مايكل أنجلو'], c:2 },
  { q:'ما هي عملة اليابان؟', a:['يوان','ين','وون','رينغت'], c:1 },
  { q:'كم عدد قلوب الأخطبوط؟', a:['1','2','3','5'], c:2 },
  { q:'أطول نهر في العالم؟', a:['النيل','الأمازون','المسيسبي','اليانغتسي'], c:1 },
  { q:'من اخترع المصباح الكهربائي؟', a:['نيوتن','أديسون','تسلا','أينشتاين'], c:1 },
  { q:'ما أصغر دولة في العالم؟', a:['موناكو','الفاتيكان','مالطا','سان مارينو'], c:1 },
  { q:'الدولة المضيفة لكأس العالم 2022؟', a:['روسيا','قطر','البرازيل','الإمارات'], c:1 },
  { q:'كم عدد أركان الإسلام؟', a:['4','5','6','7'], c:1 },
  { q:'في أي قارة تقع مصر؟', a:['آسيا','أفريقيا','أوروبا','بين قارتين'], c:1 },
  { q:'ما هو عنصر الذهب الكيميائي؟', a:['Ag','Au','Gd','Go'], c:1 },
  { q:'سرعة الضوء بالكم/ث؟', a:['150,000','300,000','500,000','1,000,000'], c:1 },
  { q:'من مؤلف "البخلاء"؟', a:['المتنبي','الجاحظ','المعري','ابن رشد'], c:1 },
  { q:'أكبر صحراء في العالم؟', a:['الكبرى','جوبي','أتاكاما','القطبية الجنوبية'], c:3 },
  { q:'كم لاعباً في فريق كرة القدم؟', a:['9','10','11','12'], c:2 },
  { q:'ما أطول جبل في العالم؟', a:['ك2','إيفرست','كانشنجونغا','ماكينلي'], c:1 },
  { q:'من أول من مشى على القمر؟', a:['أرمسترونغ','غاغارين','ألدرين','كولينز'], c:0 }
];

module.exports = {
  aliases: ['تريفيا','trivia'],
  data: new SlashCommandBuilder().setName('trivia').setDescription('🧠 تريفيا — أجب على أسئلة معلومات عامة')
    .addIntegerOption(o => o.setName('rounds').setDescription('عدد الجولات (1-10)').setMinValue(1).setMaxValue(10)),

  async execute(interaction) {
    const userId = interaction.user.id, guildId = interaction.guild.id;
    const rounds = interaction.options.getInteger('rounds') || 5;
    const pool = [...Q].sort(()=>Math.random()-0.5).slice(0, rounds);
    let i = 0, score = 0;
    const next = async (msg) => {
      if (i >= pool.length) return finish();
      const cur = pool[i];
      const row = new ActionRowBuilder().addComponents(
        ...cur.a.map((opt, idx) => new ButtonBuilder().setCustomId(`tv_${idx}_${cur.c}`).setLabel(`${['🇦','🇧','🇨','🇩'][idx]} ${opt}`.slice(0,80)).setStyle(ButtonStyle.Secondary))
      );
      const e = brandedEmbed(interaction, `🧠 السؤال ${i+1}/${pool.length}`, COLORS.info)
        .setDescription(`**${cur.q}**\n\n✅ نقاط: **${score}**\n⏱️ 15 ثانية`);
      const m = msg ? await interaction.editReply({ embeds:[e], components:[row] }) : await safeReply(interaction, { embeds:[e], components:[row] });
      const col = m.createMessageComponentCollector({ filter: x => x.user.id === userId, time: 15000, max: 1 });
      col.on('collect', async x => {
        const [_, picked, correct] = x.customId.split('_');
        if (picked === correct) score++;
        i++; await x.deferUpdate(); next(m);
      });
      col.on('end', async (c, reason) => { if (reason === 'time' && c.size === 0) { i++; next(m); } });
    };
    const finish = async () => {
      const { g, u } = getUser(guildId, userId);
      const reward = score * 200;
      u.balance += reward; u.xp += score * 20;
      bumpStat(u, 'trivia_count'); saveUser(guildId, g);
      const fn = score >= pool.length / 2 ? winEmbed : loseEmbed;
      await interaction.editReply({ embeds:[fn(interaction, 'انتهت', `🏆 **${score}/${pool.length}**\n💰 +${fmt(reward)} ${CURRENCY} • ✨ +${score*20} XP`).setFooter(balanceFooter(u))], components: [] }).catch(()=>{});
    };
    next(null);
  }
};
