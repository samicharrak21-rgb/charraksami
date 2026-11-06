// حيوان أليف — تبني، إطعام، تطور
const { SlashCommandBuilder } = require('discord.js');
const { fmt, getUser, saveUser, brandedEmbed, errorEmbed, balanceFooter, safeReply, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');

const PETS = {
  cat: { emoji:'🐱', name:'قطة', cost:500 },
  dog: { emoji:'🐶', name:'كلب', cost:500 },
  dragon: { emoji:'🐲', name:'تنين', cost:5000 },
  phoenix: { emoji:'🔥', name:'عنقاء', cost:10000 }
};
const STAGES = ['🥚 بيضة', '🐣 صغير', '🦅 شاب', '👑 ناضج', '✨ أسطوري'];
const FEED_COST = 50;

function ensure(u) {
  u.pet = u.pet || null;
  return u.pet;
}

module.exports = {
  aliases: ['حيوان','pet'],
  data: new SlashCommandBuilder().setName('pet').setDescription('🐾 الحيوان الأليف')
    .addSubcommand(s => s.setName('adopt').setDescription('تبنى').addStringOption(o => o.setName('type').setDescription('نوع الحيوان').setRequired(true).addChoices(...Object.entries(PETS).map(([k,v])=>({name:`${v.emoji} ${v.name} (${v.cost})`, value:k}))))
      .addStringOption(o => o.setName('name').setDescription('الاسم').setRequired(true)))
    .addSubcommand(s => s.setName('view').setDescription('عرض حيواني'))
    .addSubcommand(s => s.setName('feed').setDescription('إطعام'))
    .addSubcommand(s => s.setName('train').setDescription('تدريب')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id, guildId = interaction.guild.id;
    const { g, u } = getUser(guildId, userId);
    let pet = ensure(u);

    if (sub === 'adopt') {
      if (pet) return safeReply(interaction, { embeds:[errorEmbed('لديك حيوان','')], ephemeral:true });
      const type = interaction.options.getString('type');
      const name = interaction.options.getString('name').slice(0, 20);
      const cost = PETS[type].cost;
      if (u.balance < cost) return safeReply(interaction, { embeds:[errorEmbed('رصيد غير كافٍ', `${fmt(cost)} ${CURRENCY}`)], ephemeral:true });
      u.balance -= cost;
      u.pet = { type, name, xp: 0, level: 0, hunger: 100, lastFeed: Date.now(), happiness: 100 };
      saveUser(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,`${PETS[type].emoji} مرحباً ${name}!`, COLORS.success).setDescription(`تبنّيت ${PETS[type].name} جديداً!`).setFooter(balanceFooter(u))] });
    }
    if (!pet) return safeReply(interaction, { embeds:[errorEmbed('لا يوجد حيوان','استخدم /pet adopt')], ephemeral:true });

    // decay hunger
    const hours = Math.floor((Date.now() - pet.lastFeed) / (3600*1000));
    pet.hunger = Math.max(0, pet.hunger - hours * 5);

    if (sub === 'view') {
      const stage = STAGES[Math.min(pet.level, STAGES.length-1)];
      saveUser(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction, `${PETS[pet.type].emoji} ${pet.name}`, COLORS.info).setDescription(
        `🧬 النوع: **${PETS[pet.type].name}**\n` +
        `📊 المرحلة: **${stage}** (Lv.${pet.level})\n` +
        `✨ XP: **${pet.xp}** / ${(pet.level+1)*100}\n` +
        `🍖 الجوع: **${pet.hunger}%**\n` +
        `❤️ السعادة: **${pet.happiness}%**`
      )] });
    }
    if (sub === 'feed') {
      if (u.balance < FEED_COST) return safeReply(interaction, { embeds:[errorEmbed('رصيد', `${FEED_COST} ${CURRENCY}`)], ephemeral:true });
      u.balance -= FEED_COST; pet.hunger = Math.min(100, pet.hunger + 30); pet.lastFeed = Date.now(); pet.happiness = Math.min(100, pet.happiness + 5);
      saveUser(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'🍖 أطعمت', COLORS.success).setDescription(`${pet.name} سعيد! الجوع: ${pet.hunger}%`).setFooter(balanceFooter(u))] });
    }
    if (sub === 'train') {
      if (pet.hunger < 30) return safeReply(interaction, { embeds:[errorEmbed('جائع', `${pet.name} جائع لا يستطيع التدريب.`)], ephemeral:true });
      const gained = 20 + Math.floor(Math.random()*30);
      pet.xp += gained; pet.hunger -= 15; pet.happiness = Math.max(0, pet.happiness - 5);
      let leveled = false;
      while (pet.xp >= (pet.level+1)*100 && pet.level < STAGES.length-1) { pet.xp -= (pet.level+1)*100; pet.level++; leveled = true; }
      saveUser(guildId, g);
      return safeReply(interaction, { embeds:[brandedEmbed(interaction,'🏋️ تدريب', COLORS.primary).setDescription(`+${gained} XP\n${leveled?`🎉 ارتقى إلى ${STAGES[pet.level]}!`:''}`).setFooter(balanceFooter(u))] });
    }
  }
};
