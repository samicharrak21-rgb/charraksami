const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const COLORS = {
  primary: 0x5865F2,      // Discord Blurple
  success: 0x2ECC71,      // Emerald Green
  warning: 0xF1C40F,      // Sunflower Yellow
  error: 0xE74C3C,        // Alizarin Red
  phantom: 0x9B59B6,      // Amethyst Purple
  gold: 0xF1C40F,         // Gold/Yellow
  cyan: 0x1ABC9C,         // Turquoise
  info: 0x3498DB,         // Peter River Blue
  dark: 0x2B2D31,         // Dark Mode Gray
  royal: 0x6C5CE7,        // Royal Purple
  neon: 0x00FF00,         // Neon Green
  premium: 0xF39C12        // Orange/Premium
};

const DESIGN = {
  separator: '▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
  thin_separator: '────────────────────────────',
  bullet: '•',
  arrow: '❯',
  double_arrow: '»',
  crown: '👑',
  star: '⭐',
  diamond: '💎',
  sparkles: '✨',
  locked: '🔒',
  unlocked: '🔓',
  info: 'ℹ️',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  clock: '🕒',
  calendar: '📅',
  trophy: '🏆',
  money: '💰',
  shield: '🛡️',
  sword: '⚔️',
  heart: '❤️',
  level: '📊'
};

const BAR_STYLES = {
  classic: { full: '▰', empty: '▱' },
  modern: { full: '█', empty: '░' },
  blocks: { full: '▓', empty: '░' },
  rounded: { full: '●', empty: '○' }
};

function createProgressBar(current, max, length = 10, style = 'modern') {
  const progress = Math.min(Math.max(current / max, 0), 1);
  const fullCount = Math.round(progress * length);
  const emptyCount = length - fullCount;
  const { full, empty } = BAR_STYLES[style] || BAR_STYLES.modern;
  return full.repeat(fullCount) + empty.repeat(emptyCount);
}

const GIFS = {
  welcome: [
    'https://cdn.discordapp.com/attachments/1470839860594999593/1472741198572683470/standard.gif?ex=69b2a7df&is=69b1565f&hm=df729c870d6004d37b59baeea0c1ae3cc2594844f2f6ee636fdb1171990a01ce&'
  ],
  levelUp: [
    'https://cdn.discordapp.com/attachments/1470839860594999593/1472755483982041149/metal-gear-big-boss.gif?ex=69a8292d&is=69a6d7ad&hm=5522c25156dc3411172e7425fd5d24ed0fd00d1737a334989c426106dd5ca20f&'
  ],
  daily: [
    'https://img.itch.zone/aW1nLzE1MjA3MDg5LmdpZg==/originalm/kSgtey.gif'
  ],
  taskComplete: [
    'https://img.itch.zone/aW1nLzIyMzcxNzA1LmdpZg==/originalm/5Umx6Q.gif'
  ],
  afkReturn: [
    'https://cdn.discordapp.com/attachments/1470839860594999593/1472755483982041149/metal-gear-big-boss.gif?ex=69a8292d&is=69a6d7ad&hm=5522c25156dc3411172e7425fd5d24ed0fd00d1737a334989c426106dd5ca20f&'
  ],
  dungeon_intro: [
    'https://image.tmdb.org/t/p/original/foLRVFCsbm8Y3cbanU1D1YOzrC6.jpg'
  ],
  dungeon_wait: [
    'https://a.storyblok.com/f/178900/960x540/dab7e26e52/frieren.jpg/m/filters:quality(95)format(webp)'
  ],
  dungeon: [
    'https://image.tmdb.org/t/p/original/foLRVFCsbm8Y3cbanU1D1YOzrC6.jpg'
  ],
  monster: [
    'https://media.craiyon.com/2025-10-03/2wo0CjN2TO6SYD1ia8GXeg.webp',
    'https://img.craftpix.net/2023/09/Top-Down-Pixel-Monster-Sprites-for-Tower-Defense.jpg',
    'https://img.craftpix.net/2025/01/Imp-Mobs-Pixel-Art-Character-Sprite-Pack.jpg',
    'https://img.craftpix.net/2025/02/Top-Down-Pixel-Skeletons-Character-Sprite-Pack4-720x480.webp',
    'https://img.craftpix.net/2025/02/Top-Down-Pixel-Skeletons-Character-Sprite-Pack.jpg',
    'https://img.craftpix.net/2023/08/Undead-Enemies-Pixel-Art-for-Tower-Defense.webp',
    'https://opengameart.org/sites/default/files/composite_preview.png',
    'https://img.craftpix.net/2022/08/Undead-Warriors-Pixel-Art-Asset-Pack2.webp',
    'https://img.craftpix.net/2022/09/Undead-Avatar-Icons-64x64-Pixel-Art1.webp',
    'https://img.itch.zone/aW1hZ2UvMTg4Mjc3Mi8xMTA2MjMxOC5wbmc=/original/RwsxOK.png',
    'https://img.itch.zone/aW1hZ2UvMTE5Mzg3OC85MDc0NTAyLnBuZw==/original/RBhfM6.png',
    'https://img.itch.zone/aW1nLzE1MjA3MDg5LmdpZg==/originalm/kSgtey.gif',
    'https://img.itch.zone/aW1hZ2UvMTE5Mzg3OC85MDc0NTA2LmpwZw==/original/uyUx93.jpg',
    'https://img.itch.zone/aW1hZ2UvMTY5MzM5My8xNTU1MDExMi5qcGVn/original/tJB47L.jpeg',
    'https://img.craftpix.net/2024/11/Golem-Pixel-Art-Top-Down-Sprite-Pack4-720x480.webp'
  ],
  boss: [
    'https://i.redd.it/n3rgndyp6g421.png',
    'https://www.shutterstock.com/shutterstock/photos/2140669287/display_1500/stock-vector-pixel-art-knight-and-fire-breathing-dragon-on-lava-dungeon-rpg-game-location-bit-adventure-2140669287.jpg',
    'https://darkrpgs.home.blog/wp-content/uploads/2023/08/frail1.png?w=1024',
    'https://img.itch.zone/aW1hZ2UvMjUyNTIwOS8xNTAxNzE2MC5qcGc=/original/8J1sul.jpg',
    'https://img.itch.zone/aW1hZ2UvMjUyNTIwOS8xNTAxNzE2MS5qcGc=/original/AEcKbU.jpg',
    'https://www.shutterstock.com/shutterstock/photos/2672196377/display_1500/stock-vector-a-pixel-art-depiction-of-an-bit-skeleton-king-boss-character-2672196377.jpg',
    'https://media.craiyon.com/2025-08-18/XexEJ56RSiS7vww_eAFOPA.webp',
    'https://p7.hiclipart.com/preview/544/972/858/darkest-dungeon-pixel-dungeon-pig-boss-dungeon-crawl-dark-souls.jpg',
    'https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/d8f9008f-6797-4e25-b678-bdcd8bc7b515/dcsb149-004180a9-f05f-43f7-997e-4ea1559b361a.png/v1/fill/w_1200,h_628,q_80,strp/undead_castle_battle___pixel_art_game_mockup_by_rgbfumes_dcsb149-fullview.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9NjI4IiwicGF0aCI6Ii9mL2Q4ZjkwMDhmLTY3OTctNGUyNS1iNjc4LWJkY2Q4YmM3YjUxNS9kY3NiMTQ5LTAwNDE4MGE5LWYwNWYtNDNmNy05OTdlLTRlYTE1NTliMzYxYS5wbmciLCJ3aWR0aCI6Ijw9MTIwMCJ9XV0sImF1ZCI6WyJ1cm46c2VydmljZTppbWFnZS5vcGVyYXRpb25zIl19.WPbPxLvYoGhEQKPotDZeQ9vw1MWPy1r5CYEaBFmm5hE',
    'https://external-preview.redd.it/i-made-a-boss-fight-for-my-monster-taming-metroidvania-rpg-v0-cml2ZGpxMmY2c3hlMZFzZcUsjDHE2FryJDw0h8tZYyTm1-T9q0WZxN2sK2al.png?format=pjpg&auto=webp&s=58dffa3903f1e52cb2f531aee6676deafddcaaf3',
    'https://i.redd.it/khisam3z1odf1.jpeg',
    'https://img.craftpix.net/2022/06/Undead-Characters-Full-Length-Pixel-Art.jpg',
    'https://litrpgreads.com/wp-content/uploads/2018/10/slimedungeongamelitrpg.jpg',
    'https://img.itch.zone/aW1hZ2UvMzIzNjA5OC8xOTU5NTY4MC5wbmc=/original/ECi82m.png'
  ],
  defeat: [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRW-101jYrQ-3zH_r9Q6pHOz82oti5b_O0RAw&s'
  ],
  casino: [
    'https://cdn.discordapp.com/attachments/1470839860594999593/1472748838665060362/standard.gif?ex=69aeba7d&is=69ad68fd&hm=28bb9b76388fff5df30b9cd82cb25cb8191f5a4262df476de073f82666b51062&'
  ],
  farm: [
    'https://i.postimg.cc/65VKKCdP/dp2kuk914o9y_gif_1731_560.gif'
  ],
  ticket: [
    'https://cdn.discordapp.com/attachments/1470839860594999593/1472748838665060362/standard.gif?ex=69aeba7d&is=69ad68fd&hm=28bb9b76388fff5df30b9cd82cb25cb8191f5a4262df476de073f82666b51062&'
  ],
  rank: [
    'https://cdn.discordapp.com/attachments/1470839860594999593/1472741198572683470/standard.gif'
  ],
  balance: [
    'https://cdn.discordapp.com/attachments/1470839860594999593/1472748838665060362/standard.gif?ex=69aeba7d&is=69ad68fd&hm=28bb9b76388fff5df30b9cd82cb25cb8191f5a4262df476de073f82666b51062&'
  ],
  info: [
    'https://cdn.discordapp.com/attachments/1470839860594999593/1472748838665060362/standard.gif?ex=69aeba7d&is=69ad68fd&hm=28bb9b76388fff5df30b9cd82cb25cb8191f5a4262df476de073f82666b51062&'
  ]
};

function getRandomGif(key) {
  const arr = GIFS[key] || GIFS.welcome;
  return arr[Math.floor(Math.random() * arr.length)];
}

function createBaseEmbed(title, color = COLORS.primary) {
  return new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .setTimestamp();
}

function createSuccessEmbed(title, description) {
  return createBaseEmbed(`✅ ${title}`, COLORS.success)
    .setDescription(description);
}

function createErrorEmbed(description) {
  return createBaseEmbed('❌ خطأ', COLORS.error)
    .setDescription(description);
}

function createInfoEmbed(title, description) {
  return createBaseEmbed(`ℹ️ ${title}`, COLORS.info)
    .setDescription(description);
}

function createStyledEmbed(interaction, title, color = COLORS.primary) {
  const authorName = config.SERVER_NAME || 'Sami Bot';
  const authorIcon = interaction?.client?.user?.displayAvatarURL?.() || null;
  const embed = new EmbedBuilder()
    .setTitle(`${title}`)
    .setColor(color)
    .setTimestamp();
  
  if (authorIcon) {
    embed.setAuthor({ name: authorName, iconURL: authorIcon });
  } else {
    embed.setAuthor({ name: authorName });
  }
  
  return embed;
}

function createModernEmbed(interaction, title, description, color = COLORS.primary) {
  const embed = createStyledEmbed(interaction, title, color);
  if (description) {
    embed.setDescription(`${DESIGN.thin_separator}\n${description}\n${DESIGN.thin_separator}`);
  }
  return embed;
}

function createDetailedEmbed(interaction, title, fields = [], color = COLORS.primary, thumbnail = null) {
  const embed = createStyledEmbed(interaction, title, color);
  if (thumbnail) embed.setThumbnail(thumbnail);
  
  if (fields.length > 0) {
    embed.addFields(fields.map(f => ({
      name: `${DESIGN.bullet} ${f.name}`,
      value: f.value,
      inline: f.inline ?? false
    })));
  }
  
  return embed;
}

function replaceVars(text, vars = {}) {
  if (!text) return '';
  return text
    .replace(/\{user\}/g, vars.user || '{user}')
    .replace(/\{mention\}/g, vars.mention || '{mention}')
    .replace(/\{mentione\}/g, vars.mention || '{mentione}')
    .replace(/\{username\}/g, vars.username || '{username}')
    .replace(/\{server\}/g, vars.server || config.SERVER_NAME)
    .replace(/\{memberCount\}/g, vars.memberCount ?? '0')
    .replace(/\{invite\}/g, vars.invite || config.SERVER_INVITE)
    .replace(/\{level\}/g, vars.level ?? '0')
    .replace(/\{oldLevel\}/g, vars.oldLevel ?? '0')
    .replace(/\{xp\}/g, vars.xp ?? '0')
    .replace(/\{nextXP\}/g, vars.nextXP ?? '0');
}

function getPlatformColor(type) {
  const map = {
    twitter: 0x1DA1F2,
    reddit: 0xFF4500,
    telegram: 0x0088cc,
  };
  return map[type] || COLORS.info;
}

function getCategoryColor(category) {
  const map = {
    news: 0xF1C40F,
    memes: 0x9B59B6,
    manhwa: 0x2ECC71,
    episodes: 0xE67E22,
  };
  return map[category] || null;
}

function getFollowEmbedColor(type, category) {
  return getCategoryColor(category) || getPlatformColor(type);
}

const { getBadgeForLevel } = require('../data/badges');
const { getRankForXP } = require('../data/ranks');

function createLevelUpEmbed(user, newLevel) {
  const badge = getBadgeForLevel(newLevel);
  const totalXP = newLevel * 100;
  const rank = getRankForXP(totalXP);

  const embed = createStyledEmbed(null, '🎊 تهانينا! لقد ارتفع مستواك!', COLORS.gold)
    .setDescription(`**${config.SERVER_NAME} تفخر بصعودك للنخبة!** ${user}\n\n${badge.emoji} **شعارك الجديد:** ${badge.name}\n${badge.desc}\n\n🔗 │ ${rank.emoji} **${rank.name}** → ${rank.minLevel * 100} XP`)
    .setImage(getRandomGif('levelUp'));
    
  return embed;
}

function createProgressBar(current, total, size = 15) {
  const progress = Math.min(1, Math.max(0, current / total));
  const filledChars = Math.round(progress * size);
  const emptyChars = size - filledChars;
  
  const filledBar = '▰'.repeat(filledChars);
  const emptyBar = '▱'.repeat(emptyChars);
  
  return `${filledBar}${emptyBar} **${Math.round(progress * 100)}%**`;
}

module.exports = {
  COLORS,
  DESIGN,
  GIFS,
  BAR_STYLES,
  getRandomGif,
  createBaseEmbed,
  createSuccessEmbed,
  createErrorEmbed,
  createInfoEmbed,
  createStyledEmbed,
  createModernEmbed,
  createDetailedEmbed,
  createProgressBar,
  replaceVars,
  getPlatformColor,
  getFollowEmbedColor,
  createLevelUpEmbed
};
