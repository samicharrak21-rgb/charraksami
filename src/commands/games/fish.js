const { SlashCommandBuilder } = require('discord.js');
const {
  fmt, getUser, saveUser, bumpStat,
  brandedEmbed, winEmbed, loseEmbed,
  balanceFooter, playAgainRow, safeReply, errorEmbed, CURRENCY
} = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');
const { setEmbedMedia } = require('../../utils/mediaRegistry');

const FISHES = [
  { name: 'سمكة صغيرة',       emoji: '🐟', value: 40,   weight: 40, rarity: '⬜ عادي',       color: 0x95A5A6 },
  { name: 'سمكة استوائية',    emoji: '🐠', value: 120,  weight: 25, rarity: '🟩 غير عادي',   color: 0x2ECC71 },
  { name: 'سلطعون',            emoji: '🦀', value: 90,   weight: 18, rarity: '⬜ عادي',       color: 0x95A5A6 },
  { name: 'حبار',              emoji: '🦑', value: 180,  weight: 8,  rarity: '🟦 نادر',       color: 0x3498DB },
  { name: 'أخطبوط',            emoji: '🐙', value: 250,  weight: 5,  rarity: '🟦 نادر',       color: 0x3498DB },
  { name: 'سمكة ذهبية مدارية',emoji: '🐡', value: 400,  weight: 3,  rarity: '🟣 أسطوري',     color: 0x9B59B6 },
  { name: 'كنز بحري',          emoji: '🪙', value: 800,  weight: 1,  rarity: '⭐ أسطوري خالص', color: 0xF1C40F }
];
const MISS_EVENTS = [
  'ابتلعت السمكة الطُعم وهربت!',
  'انكسر الخيط في اللحظة الأخيرة!',
  'قاومت حتى انفلتت منك!',
  'الموجة أفسدت صيدتك!'
];
const TOTAL = FISHES.reduce((a, b) => a + b.weight, 0);
function pickFish() {
  let r = Math.random() * TOTAL;
  for (const f of FISHES) { if (r < f.weight) return f; r -= f.weight; }
  return FISHES[0];
}

// Water animation frames
const WATER_FRAMES = [
  '🌊〰️〰️〰️〰️',
  '〰️🌊〰️〰️〰️',
  '〰️〰️🌊〰️〰️',
  '〰️〰️〰️🌊〰️',
  '〰️〰️〰️〰️🌊'
];

const COOLDOWN_MS = 90 * 1000;

module.exports = {
  aliases: ['صيد', 'سمك', 'fish'],
  data: new SlashCommandBuilder()
    .setName('fish')
    .setDescription('🎣 صيد الأسماك — اربح جوائز عشوائية من البحر!'),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const { g, u } = getUser(guildId, userId);

    const now = Date.now();
    const last = u.last_fish || 0;
    if (now - last < COOLDOWN_MS) {
      const left = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
      return safeReply(interaction, { embeds: [errorEmbed('⏳ انتظر قليلاً', `يمكنك الصيد مجدداً بعد **${left}** ثانية.`)], ephemeral: true });
    }

    // ─── Casting Animation ──────────────────────────────
    const frame0 = WATER_FRAMES[0];
    const cast = brandedEmbed(interaction, '🎣 رميت الصنّارة...', COLORS.cyan)
      .setDescription(`${frame0}\n\n🎣 *الصنّارة تغوص في الأعماق...*\n\n${frame0}`)
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
    setEmbedMedia(cast, 'fish', 'cast');
    await safeReply(interaction, { embeds: [cast], components: [] });

    // Animate water
    for (let fi = 1; fi < 4; fi++) {
      await new Promise(r => setTimeout(r, 500));
      cast.setDescription(`${WATER_FRAMES[fi]}\n\n🎣 *${['تتحرك...','شيء تحت الماء!','حركة قوية!'][fi-1]}*\n\n${WATER_FRAMES[fi]}`);
      await interaction.editReply({ embeds: [cast] }).catch(() => {});
    }
    await new Promise(r => setTimeout(r, 600));

    // ─── Miss Chance (20%) ───────────────────────────────
    if (Math.random() < 0.20) {
      const miss = MISS_EVENTS[Math.floor(Math.random() * MISS_EVENTS.length)];
      const loseE = loseEmbed(interaction, 'فاتك الصيد!',
        `😢 ${miss}\n\n🌊 البحر لا يرحم — جرّب مرة أخرى.`
      );
      setEmbedMedia(loseE, 'fish', 'miss');
      loseE.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
      u.last_fish = now;
      saveUser(guildId, g);
      return interaction.editReply({ embeds: [loseE], components: [] }).catch(() => {});
    }

    // ─── Catch! ──────────────────────────────────────────
    const f = pickFish();
    const isLegendary = f.weight <= 1;
    const isRare      = f.weight <= 3;
    const bonusXP     = isLegendary ? 200 : isRare ? 50 : Math.floor(f.value / 4);

    u.balance  += f.value;
    u.xp       += bonusXP;
    u.last_fish = now;
    bumpStat(u, 'fish_count');
    if (isLegendary) bumpStat(u, 'fish_legendary');
    u.inventory = u.inventory || {};
    u.inventory.fishes = (u.inventory.fishes || []).concat([{ name: f.name, value: f.value, at: now }]);
    saveUser(guildId, g);

    let resultEmbed;
    if (isLegendary) {
      resultEmbed = winEmbed(interaction, `⭐ صيد أسطوري نادر! ${f.emoji}`);
      setEmbedMedia(resultEmbed, 'fish', 'legendary');
    } else if (isRare) {
      resultEmbed = winEmbed(interaction, `🎣 صيد نادر! ${f.emoji}`);
      setEmbedMedia(resultEmbed, 'fish', 'catch');
    } else {
      resultEmbed = brandedEmbed(interaction, `🎣 صيد موفّق! ${f.emoji}`, COLORS.success);
      setEmbedMedia(resultEmbed, 'fish', 'cast');
    }

    resultEmbed
      .setDescription(
        `${WATER_FRAMES[4]}\n\n` +
        `**${f.rarity} ${f.emoji} ${f.name}**\n\n` +
        `💰 القيمة: **+${fmt(f.value)}** ${CURRENCY}\n` +
        `✨ XP: **+${bonusXP}**` +
        (isLegendary ? `\n\n🌟 **سمكة أسطورية فريدة من نوعها!**` : '') +
        (isRare && !isLegendary ? `\n\n✨ **نادرة نسبياً!**` : '')
      )
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setFooter(balanceFooter(u));

    await interaction.editReply({ embeds: [resultEmbed], components: [] }).catch(() => {});
  }
};
