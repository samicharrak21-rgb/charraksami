// 🥷 سرقة v22 — اسرق @فلان: تسرق من محفظته فقط (البنك محمي)، والضحية محمية ساعتين بعد كل سرقة
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const config = require('../../config');

const STEAL_COOLDOWN = 2 * 60 * 60 * 1000; // حماية الضحية ساعتين
const ATTEMPT_COOLDOWN = 10 * 60 * 1000;   // مهلة بين محاولات السارق
const SUCCESS_RATE = 0.55;
const FINE_RATE = 0.25; // غرامة من رصيد السارق عند الفشل

function fmt(n) { return (Number(n) || 0).toLocaleString(); }

module.exports = {
  gif: false,
  aliases: ['اسرق', 'سرقه', 'نشل'],
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('steal')
    .setDescription('🥷 سرقة جواهر من محفظة عضو (البنك محمي)')
    .addUserOption(o => o.setName('user').setDescription('الضحية').setRequired(true)),
  async execute(interaction) {
    const target = interaction.options?.getUser?.('user') || interaction.options?.getMember?.('user');
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    if (!target) return interaction.reply({ content: '❌ حدّد الضحية بمنشن. مثال: `اسرق @فلان`', ephemeral: true });
    if (target.bot) return interaction.reply({ content: '❌ لا يمكن سرقة البوتات!', ephemeral: true });
    if (target.id === userId) return interaction.reply({ content: '❌ لا يمكنك سرقة نفسك!', ephemeral: true });

    const g = readGuild(guildId);
    g.users = g.users || {};
    g.steals = g.steals || {};
    const now = Date.now();
    const me = g.users[userId] || { balance: config.DEFAULT_BALANCE || 1000 };
    const victim = g.users[target.id] || { balance: config.DEFAULT_BALANCE || 1000 };

    // محفظة الضحية فقط — البنك محمي 100%
    const wallet = Math.max(0, Number(victim.balance) || 0);
    const victimBank = Math.max(0, Number(victim.bank?.balance ?? victim.bank) || 0);
    if (wallet < 50) {
      return interaction.reply({ content: `🛡️ <@${target.id}> فقير — محفظته فيها **${fmt(wallet)}** ${config.CURRENCY} فقط${victimBank ? ` (و**${fmt(victimBank)}** محفوظة بالبنك)` : ''}. لا تستحق المخاطرة!`, ephemeral: true });
    }

    // حماية الضحية: ما ينسرق مرتين خلال ساعتين
    const lastVictim = g.steals.victims?.[target.id] || 0;
    if (now - lastVictim < STEAL_COOLDOWN) {
      const left = Math.ceil((STEAL_COOLDOWN - (now - lastVictim)) / 60000);
      return interaction.reply({ content: `🛡️ <@${target.id}> مُؤمَّن حديثاً — جرّب بعد **${left} دقيقة**. (المحفظة لا تُسرق مرتين خلال ساعتين)`, ephemeral: true });
    }

    // مهلة السارق بين المحاولات
    const lastTry = g.steals.thieves?.[userId] || 0;
    if (now - lastTry < ATTEMPT_COOLDOWN) {
      const left = Math.ceil((ATTEMPT_COOLDOWN - (now - lastTry)) / 60000);
      return interaction.reply({ content: `⏳ الشرطة تراقبك! انتظر **${left} دقيقة** قبل سرقة جديدة.`, ephemeral: true });
    }

    g.steals.thieves = g.steals.thieves || {};
    g.steals.victims = g.steals.victims || {};
    g.steals.thieves[userId] = now;

    const success = Math.random() < SUCCESS_RATE;
    let amount;
    if (success) {
      // يسرق بين 10% و30% من المحفظة
      amount = Math.max(10, Math.floor(wallet * (0.1 + Math.random() * 0.2)));
      amount = Math.min(amount, wallet);
      victim.balance = wallet - amount;
      me.balance = (Number(me.balance) || 0) + amount;
      g.steals.victims[target.id] = now; // حماية الضحية
    } else {
      // انكشف! غرامة من رصيد السارق تذهب للضحية
      const fineBase = Math.max(10, Math.floor(Math.min(Number(me.balance) || 0, 5000) * FINE_RATE));
      amount = -fineBase;
      me.balance = Math.max(0, (Number(me.balance) || 0) - fineBase);
      victim.balance = wallet + fineBase;
    }

    me.stats = me.stats || {};
    me.stats.steals = (me.stats.steals || 0) + (success ? 1 : 0);
    me.stats.failed_steals = (me.stats.failed_steals || 0) + (success ? 0 : 1);
    g.users[userId] = me;
    g.users[target.id] = victim;
    writeGuild(guildId, g);

    const embed = new EmbedBuilder()
      .setTitle(success ? '🥷 سرقة ناجحة!' : '🚨 انكشفت!')
      .setDescription(success
        ? `سرقت **${fmt(amount)}** ${config.CURRENCY} من محفظة <@${target.id}>!\n💰 رصيدك الآن: **${fmt(me.balance)}**\n\n🛡️ محفظته محمية الآن لمدة ساعتين.`
        : `فشلت السرقة وأُبلغت الإدارة! دفعت غرامة **${fmt(Math.abs(amount))}** ${config.CURRENCY} لـ <@${target.id}>.\n💰 رصيدك الآن: **${fmt(me.balance)}**`)
      .setColor(success ? 0x2FD69B : 0xE8455F)
      .setFooter({ text: `نسبة النجاح 55% • البنك محمي دائماً • مهلة المحاولة 10 دقائق` })
      .setTimestamp();
    let payload = { embeds: [embed] };
    try {
      const { stealCard } = require('../../utils/modernCards');
      const { cardMessage } = require('../../utils/cardEmbed');
      const mName = (id, u) => interaction.guild.members.cache.get(id)?.displayName || u.globalName || u.username;
      const card = await stealCard({
        thief: mName(userId, interaction.user), victim: mName(target.id, target),
        thiefAvatar: interaction.user.displayAvatarURL?.({ extension: 'png', size: 256 }),
        victimAvatar: target.displayAvatarURL?.({ extension: 'png', size: 256 }),
        success, amount: Math.abs(amount), balance: me.balance, chance: Math.round(SUCCESS_RATE * 100),
      });
      if (card?.buffer) payload = cardMessage(card, { color: success ? 0x2FD69B : 0xE8455F, content: `<@${target.id}>`, description: success ? `🥷 <@${userId}> سرق **${fmt(amount)}** ${config.CURRENCY} من <@${target.id}>` : `🚨 <@${userId}> انكشف ودفع غرامة **${fmt(Math.abs(amount))}** ${config.CURRENCY} لـ <@${target.id}>`, footer: '💡 احمِ أموالك: ايداع الكل' });
    } catch {}
    await interaction.reply(payload);

    // تنبيه الضحية برسالة خاصة
    try {
      await target.send({
        embeds: [new EmbedBuilder().setTitle(success ? '🥷 تمت سرقتك!' : '🚨 محاولة سرقة فاشلة')
          .setDescription(success
            ? `سرق <@${userId}> **${fmt(amount)}** ${config.CURRENCY} من محفظتك في **${interaction.guild.name}**.\nمحفظتك الآن: **${fmt(victim.balance)}** (بنكك آمن: ${fmt(victimBank)})\n\n🛡️ أنت محمي من السرقة لمدة ساعتين.`
            : `حاول <@${userId}> سرقتك وفشل! حصلت على غرامة **${fmt(Math.abs(amount))}** ${config.CURRENCY}.`)
          .setColor(success ? 0xE8455F : 0x2FD69B).setTimestamp()],
      });
    } catch {}
  }
};
