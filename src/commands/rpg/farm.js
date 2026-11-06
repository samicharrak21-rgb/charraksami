const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, StringSelectMenuBuilder
} = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS, DESIGN, createStyledEmbed } = require('../../utils/embeds');
const { getFarmMedia } = require('../../utils/mediaRegistry');
const config = require('../../config');

// ======== WEATHER IMAGE MAP ========
const WEATHER_IMAGES = {
  sunny:   'https://media0.giphy.com/media/3o7TKAe6Xt9RIjsGIE/giphy.gif',
  rainy:   'https://media1.giphy.com/media/26n6xBpxNXExDfuKc/giphy.gif',
  storm:   'https://media4.giphy.com/media/3o6Zt8tD3m0U3xNJEY/giphy.gif',
  golden:  'https://media0.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif',
  frozen:  'https://media3.giphy.com/media/KffdTQfewxHjfCpFbW/giphy.gif',
  harvest: 'https://i.postimg.cc/65VKKCdP/dp2kuk914o9y_gif_1731_560.gif'
};

// ======== ACTION IMAGES ========
const ACTION_GIFS = {
  harvest: 'https://i.postimg.cc/65VKKCdP/dp2kuk914o9y_gif_1731_560.gif',
  water:   'https://media2.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif',
  plant:   'https://media1.giphy.com/media/9Y5BbDSkSTiY8/giphy.gif',
  craft:   'https://media2.giphy.com/media/IG6UnfQjFcFXEBzGGg/giphy.gif',
  barn:    'https://media3.giphy.com/media/xT1XGzAnABSXy8DPCU/giphy.gif',
  pest:    'https://media3.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
  levelup: 'https://media4.giphy.com/media/3oz8xKaR836UJOYeOc/giphy.gif'
};

// ======== CROP CATALOGUE ========
const CROPS = {
  carrots:    { emoji: '🥕', name: 'جزر',              cost: 30,    sell: 150,    grow: 2*60_000,   xp: 5,   tier: 1 },
  wheat:      { emoji: '🌾', name: 'قمح',              cost: 80,    sell: 350,    grow: 5*60_000,   xp: 10,  tier: 1 },
  tomatoes:   { emoji: '🍅', name: 'طماطم',             cost: 200,   sell: 850,    grow: 10*60_000,  xp: 18,  tier: 2 },
  potatoes:   { emoji: '🥔', name: 'بطاطس',             cost: 450,   sell: 1800,   grow: 18*60_000,  xp: 28,  tier: 2 },
  corn:       { emoji: '🌽', name: 'ذرة ذهبية',         cost: 700,   sell: 2800,   grow: 25*60_000,  xp: 38,  tier: 3, levelReq: 3 },
  pumpkin:    { emoji: '🎃', name: 'يقطين السحرة',      cost: 1000,  sell: 4200,   grow: 35*60_000,  xp: 50,  tier: 3, levelReq: 4 },
  grapes:     { emoji: '🍇', name: 'عنب أسطوري',        cost: 1200,  sell: 5000,   grow: 45*60_000,  xp: 65,  tier: 4, levelReq: 5 },
  strawberry: { emoji: '🍓', name: 'فراولة الجنة',      cost: 2200,  sell: 9500,   grow: 60*60_000,  xp: 100, tier: 4, levelReq: 7 },
  dragonfruit:{ emoji: '🐲', name: 'فاكهة التنين',      cost: 4500,  sell: 18000,  grow: 90*60_000,  xp: 180, tier: 5, levelReq: 10 },
  starfruit:  { emoji: '⭐', name: 'فاكهة النجوم',       cost: 10000, sell: 42000,  grow: 180*60_000, xp: 400, tier: 5, levelReq: 15 },
  moonberry:  { emoji: '🌙', name: 'توت القمر الأسطوري', cost: 25000, sell: 120000, grow: 360*60_000, xp: 1000, tier: 6, levelReq: 20, rare: true },
};

// ======== ANIMALS ========
const ANIMALS = {
  chicken: { emoji: '🐓', name: 'دجاجة', cost: 500,  produce: { name: 'بيض', emoji: '🥚', sell: 200 }, cooldown: 30*60_000, feedCost: 50, tier: 1 },
  cow:     { emoji: '🐄', name: 'بقرة',  cost: 2000, produce: { name: 'حليب', emoji: '🥛', sell: 800 }, cooldown: 60*60_000, feedCost: 150, tier: 2, levelReq: 5 },
  bee:     { emoji: '🐝', name: 'نحلة',  cost: 3000, produce: { name: 'عسل', emoji: '🍯', sell: 2000 }, cooldown: 120*60_000, feedCost: 80, tier: 3, levelReq: 8 },
  dragon:  { emoji: '🐉', name: 'تنين صغير', cost: 50000, produce: { name: 'كريستال', emoji: '💎', sell: 25000 }, cooldown: 720*60_000, feedCost: 5000, tier: 5, levelReq: 20, rare: true },
};

// ======== WEATHER ========
const WEATHERS = {
  sunny:  { emoji: '☀️', name: 'مشمس',      growMul: 1.0, yieldMul: 1.0 },
  rainy:  { emoji: '🌧️', name: 'ممطر',      growMul: 0.7, yieldMul: 1.1 },
  storm:  { emoji: '⛈️', name: 'عاصف',      growMul: 1.0, yieldMul: 0.8, pestRisk: 0.25 },
  golden: { emoji: '🌈', name: 'موسم ذهبي', growMul: 0.5, yieldMul: 1.5 },
  frozen: { emoji: '❄️', name: 'صقيع',      growMul: 2.0, yieldMul: 0.6, freezeRisk: 0.2 },
  harvest:{ emoji: '🌾', name: 'موسم الحصاد', growMul: 0.6, yieldMul: 2.0 },
};

// ======== SEASONS ========
const SEASONS = ['🌸 ربيع', '☀️ صيف', '🍂 خريف', '❄️ شتاء'];

// ======== CRAFTING RECIPES ========
const RECIPES = {
  veggie_soup:    { name: '🍲 حساء الخضار', ingredients: { carrots: 3, tomatoes: 2 }, sell: 3000, xp: 50 },
  bread:          { name: '🍞 خبز محلي', ingredients: { wheat: 5 }, sell: 2000, xp: 30 },
  fruit_basket:   { name: '🧺 سلة فواكه فاخرة', ingredients: { grapes: 2, strawberry: 1 }, sell: 25000, xp: 200 },
  dragon_elixir:  { name: '⚗️ إكسير التنين', ingredients: { dragonfruit: 2, starfruit: 1 }, sell: 100000, xp: 800 },
  star_wine:      { name: '🍷 نبيذ النجوم الأسطوري', ingredients: { starfruit: 3, moonberry: 1 }, sell: 500000, xp: 3000, rare: true },
};

const FERTILIZER_COST = 500;
const WATER_BOOST = 0.85;
const PEST_LOSS = 0.5;

// ======== HELPERS ========
function getUser(g, uid) {
  g.users = g.users || {};
  if (!g.users[uid]) g.users[uid] = { balance: config.DEFAULT_BALANCE || 1000, xp: 0, level: 1 };
  const u = g.users[uid];
  u.farm = u.farm || {
    plots: Array.from({ length: 6 }, () => ({})),
    barn: [],
    inventory: {},
    streak: 0, totalHarvested: 0, level: 1, xp: 0,
    weather: { type: 'sunny', until: Date.now() + 30 * 60_000 },
    season: 0, day: 1
  };
  if (!u.farm.plots) u.farm.plots = Array.from({ length: 6 }, () => ({}));
  if (!u.farm.barn) u.farm.barn = [];
  if (!u.farm.inventory) u.farm.inventory = {};
  // Tick weather
  if (!u.farm.weather || u.farm.weather.until < Date.now()) {
    const keys = Object.keys(WEATHERS);
    const t = keys[Math.floor(Math.random() * keys.length)];
    u.farm.weather = { type: t, until: Date.now() + (20 + Math.floor(Math.random() * 40)) * 60_000 };
  }
  return u;
}

function farmLevelXp(level) { return Math.floor(50 * Math.pow(level, 1.7)); }

function maybeLevelUp(farm) {
  let leveled = false;
  while (farm.xp >= farmLevelXp(farm.level)) {
    farm.xp -= farmLevelXp(farm.level);
    farm.level++;
    leveled = true;
    if (farm.level % 2 === 0 && farm.plots.length < 16) farm.plots.push({});
  }
  return leveled;
}

function plotState(plot, weather) {
  if (!plot.type) return { state: 'empty', icon: '🟫', label: 'فارغة' };
  const data = CROPS[plot.type];
  const now = Date.now();
  if (plot.frozen) return { state: 'frozen', icon: '❄️', label: `${data.emoji} متجمد` };
  if (plot.pest) return { state: 'pest', icon: '🐛', label: `${data.emoji} مصاب` };
  if (now >= plot.readyAt) return { state: 'ready', icon: '✅', label: `${data.emoji} جاهز` };
  const total = plot.readyAt - plot.plantedAt;
  const done = now - plot.plantedAt;
  const pct = Math.max(0, Math.min(1, done / total));
  const stages = ['🌱', '🌿', '🌾', '🌺'];
  const idx = Math.min(3, Math.floor(pct * 4));
  return { state: 'growing', icon: stages[idx], label: `${data.emoji} ${Math.floor(pct * 100)}%` };
}

function renderField(farm) {
  const w = WEATHERS[farm.weather.type] || WEATHERS.sunny;
  const cells = farm.plots.map((p, i) => {
    const s = plotState(p, w);
    return `\`${String(i + 1).padStart(2, ' ')}\` ${s.icon} ${s.label}`;
  });
  const lines = [];
  for (let i = 0; i < cells.length; i += 3) lines.push(cells.slice(i, i + 3).join('  •  '));
  return lines.join('\n');
}

function renderBarn(farm) {
  if (!farm.barn.length) return '🏚️ *لا حيوانات في الحظيرة*';
  return farm.barn.map((a, i) => {
    const def = ANIMALS[a.type];
    const ready = Date.now() >= a.readyAt;
    const timeR = ready ? '✅ جاهز' : timeLeft(a.readyAt - Date.now());
    return `\`${i+1}\` ${def.emoji} **${def.name}** — ${ready ? '✅ منتج جاهز!' : `⏳ ${timeR}`}`;
  }).join('\n');
}

function timeLeft(ms) {
  if (ms <= 0) return 'الآن';
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  if (h > 0) return `${h}س ${m}د`;
  if (m > 0) return `${m}د ${s}ث`;
  return `${s}ث`;
}

// ======== MAIN EMBED ========
async function getPayload(interaction, u) {
  const farm = u.farm;
  const w = WEATHERS[farm.weather.type] || WEATHERS.sunny;
  const ready = farm.plots.filter(p => p.type && Date.now() >= p.readyAt && !p.pest && !p.frozen).length;
  const growing = farm.plots.filter(p => p.type && Date.now() < p.readyAt).length;
  const empty = farm.plots.filter(p => !p.type).length;
  const pests = farm.plots.filter(p => p.pest).length;
  const frozen = farm.plots.filter(p => p.frozen).length;
  const barnReady = farm.barn.filter(a => Date.now() >= a.readyAt).length;
  const xpNext = farmLevelXp(farm.level);
  const xpBar = '▰'.repeat(Math.floor((farm.xp / xpNext) * 10)).padEnd(10, '▱');
  const season = SEASONS[farm.season || 0];

  const nextReady = farm.plots.filter(p => p.type && Date.now() < p.readyAt).sort((a, b) => a.readyAt - b.readyAt)[0];

  const weatherImg = WEATHER_IMAGES[farm.weather.type] || WEATHER_IMAGES.sunny;
  const embed = new EmbedBuilder()
    .setColor(COLORS.success)
    .setTitle(`🌾 مزرعة ${interaction.member?.displayName || interaction.user.username}`)
    .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
    .setImage(weatherImg)
    .setDescription([
      `${DESIGN.thin_separator}`,
      `${w.emoji} **الطقس:** ${w.name} • ينتهي: **${timeLeft(farm.weather.until - Date.now())}**`,
      `${season} • **يوم ${farm.day || 1}** من الموسم`,
      `🌱 **مستوى المزرعة:** \`${farm.level}\` • \`${xpBar}\` ${farm.xp}/${xpNext} XP`,
      `🔥 **سلسلة:** x${farm.streak || 0} | 💰 **الرصيد:** ${(u.balance || 0).toLocaleString()} 💎`,
      `${DESIGN.thin_separator}`,
      `**🏡 الحقل (${farm.plots.length} قطعة):**`,
      renderField(farm),
      `${DESIGN.thin_separator}`,
      `✅ **جاهزة:** ${ready} | 🌿 تنمو: ${growing} | 🟫 فارغة: ${empty}${pests > 0 ? ` | 🐛 مصابة: ${pests}` : ''}${frozen > 0 ? ` | ❄️ متجمدة: ${frozen}` : ''}`,
      barnReady > 0 ? `\n🐄 **${barnReady} حيوان** لديهم منتج جاهز في الحظيرة!` : '',
      nextReady ? `⏳ التالي: **${CROPS[nextReady.type].emoji} ${CROPS[nextReady.type].name}** خلال **${timeLeft(nextReady.readyAt - Date.now())}**` : ''
    ].filter(Boolean).join('\n'))
    .setFooter({ text: `مستوى مزرعتك ${farm.level} • استخدم القائمة للتفاعل` });

  const plotSelector = new StringSelectMenuBuilder()
    .setCustomId('farm_plot')
    .setPlaceholder('🪴 اختر قطعة من حقلك...')
    .addOptions(farm.plots.map((p, i) => {
      const s = plotState(p, w);
      let desc = s.state === 'empty' ? 'قطعة فارغة جاهزة للزراعة'
        : s.state === 'ready' ? `جاهز — ${CROPS[p.type].sell.toLocaleString()} 💎`
        : s.state === 'pest' ? 'مصاب بحشرات!'
        : s.state === 'frozen' ? 'محصول متجمد!'
        : `${CROPS[p.type].name} • ${timeLeft(p.readyAt - Date.now())} للنضج`;
      return { label: `قطعة ${i + 1} — ${s.label}`, value: String(i), description: desc.slice(0, 90), emoji: s.icon };
    }).slice(0, 25));

  const row1 = new ActionRowBuilder().addComponents(plotSelector);
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('farm_harvest_all').setLabel('حصاد الكل 🧺').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('farm_water_all').setLabel('سقاية الكل 💧').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('farm_pesticide').setLabel('مبيد 🧴').setStyle(ButtonStyle.Danger).setDisabled(pests === 0),
    new ButtonBuilder().setCustomId('farm_barn').setLabel('الحظيرة 🐄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('farm_refresh').setLabel('🔄').setStyle(ButtonStyle.Secondary)
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('farm_craft_menu').setLabel('صنع 🍳').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('farm_market').setLabel('السوق 📊').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('farm_expand').setLabel(`توسيع +1 (${(farm.plots.length * 5000).toLocaleString()} 💎)`).setStyle(ButtonStyle.Secondary).setDisabled(farm.plots.length >= 16)
  );

  return { embeds: [embed], components: [row1, row2, row3] };
}

// ======== BARN PAYLOAD ========
function getBarnPayload(interaction, u) {
  const farm = u.farm;
  const availAnimals = Object.entries(ANIMALS)
    .filter(([_, a]) => (a.levelReq || 1) <= farm.level)
    .map(([k, a]) => ({ key: k, ...a }));

  const embed = new EmbedBuilder()
    .setColor(0xE67E22)
    .setTitle('🐄 الحظيرة')
    .setImage(ACTION_GIFS.barn)
    .setDescription([
      `${DESIGN.thin_separator}`,
      `**حيواناتك (${farm.barn.length}/6):**`,
      renderBarn(farm),
      `${DESIGN.thin_separator}`,
      `اشترِ حيوانات جديدة من القائمة أو احصد منتجاتها.`
    ].join('\n'));

  const components = [];

  if (farm.barn.length < 6) {
    const buyOpts = availAnimals.map(a => ({
      label: `شراء ${a.name} (${a.cost.toLocaleString()} 💎)`,
      value: `buy_animal:${a.key}`,
      description: `يُنتج ${a.produce.emoji} ${a.produce.name} كل ${Math.round(a.cooldown / 60_000)} دقيقة | ${a.produce.sell} 💎`,
      emoji: a.emoji
    }));
    if (buyOpts.length) components.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('farm_barn_action').setPlaceholder('🐾 اشترِ حيواناً جديداً...').addOptions(buyOpts.slice(0, 25))
    ));
  }

  const barnActions = new ActionRowBuilder();
  barnActions.addComponents(
    new ButtonBuilder().setCustomId('farm_barn_collect_all').setLabel('جمع كل المنتجات 🛒').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('farm_back').setLabel('رجوع ↩️').setStyle(ButtonStyle.Secondary)
  );
  components.push(barnActions);
  return { embeds: [embed], components };
}

// ======== CRAFT MENU ========
function getCraftPayload(u) {
  const farm = u.farm;
  const embed = new EmbedBuilder()
    .setColor(0x9B59B6)
    .setTitle('🍳 قائمة الصنع')
    .setImage(ACTION_GIFS.craft)
    .setDescription([
      `${DESIGN.thin_separator}`,
      Object.entries(RECIPES).map(([k, r]) => {
        const ing = Object.entries(r.ingredients).map(([crop, qty]) => `${CROPS[crop]?.emoji} ${CROPS[crop]?.name} x${qty}`).join(', ');
        const inv = farm.inventory || {};
        const canMake = Object.entries(r.ingredients).every(([c, qty]) => (inv[c] || 0) >= qty);
        return `${canMake ? '✅' : '❌'} **${r.name}** — ${ing} → 💰 ${r.sell.toLocaleString()} 💎 (+${r.xp} XP)`;
      }).join('\n'),
      `${DESIGN.thin_separator}`,
      `**مخزونك:** ${Object.entries(farm.inventory || {}).map(([k, v]) => `${CROPS[k]?.emoji} x${v}`).join(' ') || '*لا يوجد*'}`
    ].join('\n'));

  const opts = Object.entries(RECIPES).map(([k, r]) => ({
    label: r.name,
    value: `craft:${k}`,
    description: `${r.sell.toLocaleString()} 💎 | +${r.xp} XP`,
    emoji: r.name.split(' ')[0]
  }));

  const components = [];
  if (opts.length) components.push(new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('farm_craft_do').setPlaceholder('🍳 اختر وصفة...').addOptions(opts.slice(0, 25))
  ));
  components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('farm_back').setLabel('رجوع ↩️').setStyle(ButtonStyle.Secondary)
  ));
  return { embeds: [embed], components };
}

// ======== MARKET ========
function getMarketPayload(u) {
  const embed = new EmbedBuilder()
    .setColor(0x3498DB)
    .setTitle('📊 سوق المزرعة')
    .setImage('https://media1.giphy.com/media/3oKIPEqDGUULpEU0aQ/giphy.gif')
    .setDescription([
      `${DESIGN.thin_separator}`,
      `**أسعار السوق اليوم:**`,
      Object.entries(CROPS).map(([k, c]) => `${c.emoji} **${c.name}** — شراء: ${c.cost.toLocaleString()} | بيع: ${c.sell.toLocaleString()} 💎`).join('\n'),
      `${DESIGN.thin_separator}`,
      `**وصفات الصنع:**`,
      Object.values(RECIPES).map(r => `• ${r.name} → ${r.sell.toLocaleString()} 💎`).join('\n')
    ].join('\n'));

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('farm_back').setLabel('رجوع ↩️').setStyle(ButtonStyle.Secondary)
  )] };
}

// ======== PLOT ACTION ========
function plotActionPayload(interaction, u, plotIdx) {
  const plot = u.farm.plots[plotIdx];
  const w = WEATHERS[u.farm.weather.type];
  const s = plotState(plot, w);
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(`🪴 قطعة ${plotIdx + 1} — ${s.label}`)
    .setDescription(
      s.state === 'empty' ? 'هذه القطعة خصبة وفارغة. اختر بذرة للزراعة.' :
      s.state === 'ready' ? `**${CROPS[plot.type].name}** جاهز — متوقع: **${CROPS[plot.type].sell.toLocaleString()}** 💎` :
      s.state === 'pest'  ? `**${CROPS[plot.type].name}** مصاب! استخدم مبيداً.` :
      s.state === 'frozen'? `**${CROPS[plot.type].name}** متجمد! انتظر أو استخدم الماء الساخن.` :
      `**${CROPS[plot.type].name}** ينمو • متبقي **${timeLeft(plot.readyAt - Date.now())}**.`
    );

  const components = [];
  if (s.state === 'empty') {
    const opts = Object.entries(CROPS)
      .filter(([_, c]) => (c.levelReq || 1) <= u.farm.level)
      .map(([k, c]) => ({
        label: c.name, value: `${plotIdx}:${k}`,
        description: `${c.cost} 💎 → ${c.sell} 💎 • ${Math.round(c.grow / 60_000)}د • +${c.xp} XP${c.rare ? ' ⭐ نادر' : ''}`,
        emoji: c.emoji
      }));
    components.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('farm_plant_pick').setPlaceholder('🌱 اختر بذرة...').addOptions(opts.slice(0, 25))
    ));
  } else if (s.state === 'ready') {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`farm_harvest_one:${plotIdx}`).setLabel('حصد 🧺').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`farm_store_one:${plotIdx}`).setLabel('تخزين 📦').setStyle(ButtonStyle.Primary)
    ));
  } else if (s.state === 'pest') {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`farm_treat_one:${plotIdx}`).setLabel('علاج (300💎) 🧴').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`farm_uproot:${plotIdx}`).setLabel('اقتلاع 🗑️').setStyle(ButtonStyle.Secondary)
    ));
  } else if (s.state === 'frozen') {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`farm_thaw_one:${plotIdx}`).setLabel('ذوبان (200💎) 🔥').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`farm_uproot:${plotIdx}`).setLabel('اقتلاع 🗑️').setStyle(ButtonStyle.Secondary)
    ));
  } else {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`farm_water_one:${plotIdx}`).setLabel('سقاية (50💎) 💧').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`farm_fertilize_one:${plotIdx}`).setLabel('تسميد (500💎) ✨').setStyle(ButtonStyle.Success).setDisabled(!!plot.fertilized),
      new ButtonBuilder().setCustomId(`farm_uproot:${plotIdx}`).setLabel('اقتلاع 🗑️').setStyle(ButtonStyle.Secondary)
    ));
  }
  return { embeds: [embed], components };
}

// ======== COMMAND ========
module.exports = {
  aliases: ['farm', 'مزرعة', 'مزرعه', 'زرع', 'حصاد', 'fm'],
  data: new SlashCommandBuilder().setName('farm').setDescription('🌾 المزرعة المتطورة — زرع وحيوانات وصنع وسوق'),
  async execute(interaction) {
    if (interaction.isButton?.()) return handleButton(interaction);
    if (interaction.isStringSelectMenu?.()) return handleSelect(interaction);
    if (!interaction.deferReply) return;
    if (!interaction.replied && !interaction.deferred) await interaction.deferReply().catch(() => {});
    const guildId = interaction.guildId;
    const g = readGuild(guildId);
    const u = getUser(g, interaction.user.id);
    writeGuild(guildId, g);
    const payload = await getPayload(interaction, u);
    await interaction.editReply(payload).catch(() => {});
  }
};

// ======== BUTTON HANDLER ========
async function handleButton(interaction) {
  const [key, arg] = interaction.customId.split(':');
  const guildId = interaction.guild.id;
  const g = readGuild(guildId);
  const u = getUser(g, interaction.user.id);
  const farm = u.farm;
  const w = WEATHERS[farm.weather.type] || WEATHERS.sunny;

  if (key === 'farm_refresh' || key === 'farm_back') {
    writeGuild(guildId, g);
    return interaction.update(await getPayload(interaction, u)).catch(() => {});
  }

  if (key === 'farm_barn') {
    writeGuild(guildId, g);
    return interaction.update(getBarnPayload(interaction, u)).catch(() => {});
  }

  if (key === 'farm_craft_menu') {
    writeGuild(guildId, g);
    return interaction.update(getCraftPayload(u)).catch(() => {});
  }

  if (key === 'farm_market') {
    return interaction.update(getMarketPayload(u)).catch(() => {});
  }

  if (key === 'farm_barn_collect_all') {
    const readyAnimals = farm.barn.filter(a => Date.now() >= a.readyAt);
    if (readyAnimals.length === 0) {
      await interaction.update(getBarnPayload(interaction, u)).catch(() => {});
      return interaction.followUp({ content: '⏳ لا منتجات جاهزة بعد.', ephemeral: true }).catch(() => {});
    }
    let total = 0;
    readyAnimals.forEach(a => {
      const def = ANIMALS[a.type];
      total += def.produce.sell;
      a.readyAt = Date.now() + def.cooldown;
    });
    u.balance = (u.balance || 0) + total;
    writeGuild(guildId, g);
    await interaction.update(await getPayload(interaction, u)).catch(() => {});
    return interaction.followUp({ content: `🛒 جمعت منتجات بقيمة **${total.toLocaleString()}** 💎`, ephemeral: true }).catch(() => {});
  }

  if (key === 'farm_harvest_all') {
    const ready = farm.plots.filter(p => p.type && Date.now() >= p.readyAt && !p.pest && !p.frozen);
    if (ready.length === 0) {
      return interaction.update(await getPayload(interaction, u)).catch(() => {});
    }
    let gold = 0, xp = 0;
    ready.forEach(p => {
      const c = CROPS[p.type];
      let price = Math.floor(c.sell * w.yieldMul * (p.fertilized ? 1.35 : 1));
      gold += price; xp += c.xp;
      // Add to inventory for crafting
      farm.inventory = farm.inventory || {};
      farm.inventory[p.type] = (farm.inventory[p.type] || 0) + 1;
    });
    farm.streak = (farm.streak || 0) + 1;
    const streakMul = 1 + Math.min(0.5, farm.streak * 0.05);
    const bonus = Math.floor(gold * (streakMul - 1));
    gold = Math.floor(gold * streakMul);
    u.balance = (u.balance || 0) + gold;
    farm.xp = (farm.xp || 0) + xp;
    farm.totalHarvested = (farm.totalHarvested || 0) + ready.length;
    farm.day = (farm.day || 1) + 1;
    if (farm.day > 7) { farm.day = 1; farm.season = ((farm.season || 0) + 1) % 4; }
    farm.plots = farm.plots.map(p => (p.type && Date.now() >= p.readyAt && !p.pest && !p.frozen) ? {} : p);
    const leveled = maybeLevelUp(farm);
    writeGuild(guildId, g);
    await interaction.update(await getPayload(interaction, u)).catch(() => {});
    return interaction.followUp({ content: `🧺 حصدت **${ready.length}** قطعة • +${(gold - bonus).toLocaleString()} 💎${bonus > 0 ? ` + سلسلة x${farm.streak}: +${bonus.toLocaleString()} 💎` : ''} • +${xp} XP${leveled ? `\n🎉 **مزرعتك وصلت المستوى ${farm.level}!** — قطعة جديدة مفتوحة!` : ''}`, ephemeral: true });
  }

  if (key === 'farm_water_all') {
    const growing = farm.plots.filter(p => p.type && Date.now() < p.readyAt);
    const cost = growing.length * 50;
    if (u.balance < cost || growing.length === 0) {
      await interaction.update(await getPayload(interaction, u)).catch(() => {});
      const msg = growing.length === 0 ? '🌿 لا يوجد ما تسقيه.' : `❌ تحتاج ${cost} 💎 لسقاية ${growing.length} قطعة.`;
      return interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
    }
    u.balance -= cost;
    growing.forEach(p => { const remain = p.readyAt - Date.now(); p.readyAt = Date.now() + Math.floor(remain * WATER_BOOST); });
    writeGuild(guildId, g);
    return interaction.update(await getPayload(interaction, u)).catch(() => {});
  }

  if (key === 'farm_pesticide') {
    const inf = farm.plots.filter(p => p.pest);
    const cost = inf.length * 300;
    if (u.balance < cost) {
      await interaction.update(await getPayload(interaction, u)).catch(() => {});
      return interaction.followUp({ content: `❌ تحتاج ${cost} 💎 للمبيد.`, ephemeral: true }).catch(() => {});
    }
    u.balance -= cost; inf.forEach(p => { p.pest = false; });
    writeGuild(guildId, g);
    return interaction.update(await getPayload(interaction, u)).catch(() => {});
  }

  if (key === 'farm_expand') {
    const cost = farm.plots.length * 5000;
    if (farm.plots.length >= 16) {
      await interaction.update(await getPayload(interaction, u)).catch(() => {});
      return interaction.followUp({ content: '❌ وصلت الحد الأقصى للقطع (16).', ephemeral: true }).catch(() => {});
    }
    if (u.balance < cost) {
      await interaction.update(await getPayload(interaction, u)).catch(() => {});
      return interaction.followUp({ content: `❌ تحتاج ${cost.toLocaleString()} 💎 للتوسيع.`, ephemeral: true }).catch(() => {});
    }
    u.balance -= cost; farm.plots.push({});
    writeGuild(guildId, g);
    return interaction.update(await getPayload(interaction, u)).catch(() => {});
  }

  if (key === 'farm_harvest_one') {
    const idx = parseInt(arg); const p = farm.plots[idx];
    if (!p?.type || Date.now() < p.readyAt || p.pest || p.frozen) {
      return interaction.update(await getPayload(interaction, u)).catch(() => {});
    }
    const c = CROPS[p.type];
    const gold = Math.floor(c.sell * w.yieldMul * (p.fertilized ? 1.35 : 1));
    u.balance = (u.balance || 0) + gold; farm.xp = (farm.xp || 0) + c.xp;
    farm.totalHarvested = (farm.totalHarvested || 0) + 1;
    farm.inventory[p.type] = (farm.inventory[p.type] || 0) + 1;
    farm.plots[idx] = {};
    const leveled = maybeLevelUp(farm);
    writeGuild(guildId, g);
    await interaction.update(await getPayload(interaction, u)).catch(() => {});
    return interaction.followUp({ content: `🧺 حصدت ${c.emoji} **${c.name}** • +${gold.toLocaleString()} 💎 • +${c.xp} XP${leveled ? ` 🎉 مستوى ${farm.level}!` : ''}`, ephemeral: true }).catch(() => {});
  }

  if (key === 'farm_store_one') {
    const idx = parseInt(arg); const p = farm.plots[idx];
    if (!p?.type || Date.now() < p.readyAt || p.pest || p.frozen) {
      return interaction.update(await getPayload(interaction, u)).catch(() => {});
    }
    const c = CROPS[p.type];
    farm.inventory[p.type] = (farm.inventory[p.type] || 0) + 1;
    farm.xp = (farm.xp || 0) + Math.floor(c.xp * 0.5);
    farm.plots[idx] = {};
    maybeLevelUp(farm);
    writeGuild(guildId, g);
    await interaction.update(await getPayload(interaction, u)).catch(() => {});
    return interaction.followUp({ content: `📦 خزّنت ${c.emoji} **${c.name}** للصنع لاحقاً.`, ephemeral: true }).catch(() => {});
  }

  if (key === 'farm_water_one') {
    const idx = parseInt(arg); const p = farm.plots[idx];
    if (!p?.type || Date.now() >= p.readyAt || u.balance < 50) {
      await interaction.update(await getPayload(interaction, u)).catch(() => {});
      return interaction.followUp({ content: u.balance < 50 ? '❌ رصيد غير كاف.' : '❌ لا حاجة للسقاية.', ephemeral: true }).catch(() => {});
    }
    u.balance -= 50;
    const remain = p.readyAt - Date.now();
    p.readyAt = Date.now() + Math.floor(remain * WATER_BOOST);
    writeGuild(guildId, g);
    await interaction.update(await getPayload(interaction, u)).catch(() => {});
    return interaction.followUp({ content: `💧 سقيت قطعة ${idx + 1} — تسريع 15%`, ephemeral: true }).catch(() => {});
  }

  if (key === 'farm_fertilize_one') {
    const idx = parseInt(arg); const p = farm.plots[idx];
    if (!p?.type || p.fertilized || u.balance < FERTILIZER_COST) {
      await interaction.update(await getPayload(interaction, u)).catch(() => {});
      return interaction.followUp({ content: p?.fertilized ? '❌ تم التسميد مسبقاً.' : `❌ تحتاج ${FERTILIZER_COST} 💎.`, ephemeral: true }).catch(() => {});
    }
    u.balance -= FERTILIZER_COST; p.fertilized = true;
    const remain = p.readyAt - Date.now();
    p.readyAt = Date.now() + Math.floor(remain * 0.5);
    writeGuild(guildId, g);
    await interaction.update(await getPayload(interaction, u)).catch(() => {});
    return interaction.followUp({ content: `✨ سُمّدت قطعة ${idx + 1} — أسرع 50% + ربح +35% 🌟`, ephemeral: true }).catch(() => {});
  }

  if (key === 'farm_treat_one') {
    const idx = parseInt(arg); const p = farm.plots[idx];
    if (!p?.pest || u.balance < 300) {
      await interaction.update(await getPayload(interaction, u)).catch(() => {});
      return interaction.followUp({ content: u.balance < 300 ? '❌ تحتاج 300 💎.' : '❌ لا إصابة.', ephemeral: true }).catch(() => {});
    }
    u.balance -= 300; p.pest = false;
    writeGuild(guildId, g);
    await interaction.update(await getPayload(interaction, u)).catch(() => {});
    return interaction.followUp({ content: `🧴 عُولجت قطعة ${idx + 1} بنجاح.`, ephemeral: true }).catch(() => {});
  }

  if (key === 'farm_thaw_one') {
    const idx = parseInt(arg); const p = farm.plots[idx];
    if (!p?.frozen || u.balance < 200) {
      await interaction.update(await getPayload(interaction, u)).catch(() => {});
      return interaction.followUp({ content: u.balance < 200 ? '❌ تحتاج 200 💎.' : '❌ لا تجميد.', ephemeral: true }).catch(() => {});
    }
    u.balance -= 200; p.frozen = false;
    writeGuild(guildId, g);
    await interaction.update(await getPayload(interaction, u)).catch(() => {});
    return interaction.followUp({ content: `🔥 ذاب التجميد عن قطعة ${idx + 1}.`, ephemeral: true }).catch(() => {});
  }

  if (key === 'farm_uproot') {
    farm.plots[parseInt(arg)] = {};
    writeGuild(guildId, g);
    return interaction.update(await getPayload(interaction, u)).catch(() => {});
  }
}

// ======== SELECT HANDLER ========
async function handleSelect(interaction) {
  const guildId = interaction.guild.id;
  const g = readGuild(guildId);
  const u = getUser(g, interaction.user.id);
  const farm = u.farm;
  const w = WEATHERS[farm.weather.type] || WEATHERS.sunny;

  if (interaction.customId === 'farm_plot') {
    const idx = parseInt(interaction.values[0]);
    // Random pest / freeze tick
    farm.plots.forEach(p => {
      if (p.type && Date.now() < p.readyAt && !p.pest) {
        if ((w.pestRisk || 0) > 0 && Math.random() < w.pestRisk * 0.1) p.pest = true;
        if ((w.freezeRisk || 0) > 0 && Math.random() < w.freezeRisk * 0.1) p.frozen = true;
      }
    });
    writeGuild(guildId, g);
    return interaction.update(plotActionPayload(interaction, u, idx)).catch(() => {});
  }

  if (interaction.customId === 'farm_plant_pick') {
    const [idxStr, cropKey] = interaction.values[0].split(':');
    const idx = parseInt(idxStr); const c = CROPS[cropKey]; const plot = farm.plots[idx];
    if (!c || (c.levelReq || 1) > farm.level || plot.type || u.balance < c.cost) {
      await interaction.update(await getPayload(interaction, u)).catch(() => {});
      let errMsg = !c ? '❌ بذرة غير صحيحة.' : (c.levelReq || 1) > farm.level ? `❌ تحتاج مستوى مزرعة ${c.levelReq}.` : plot.type ? '❌ القطعة مشغولة.' : `❌ تحتاج ${c.cost} 💎 لشراء هذه البذرة.`;
      return interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => {});
    }
    u.balance -= c.cost;
    const grow = Math.floor(c.grow * w.growMul);
    farm.plots[idx] = { type: cropKey, plantedAt: Date.now(), readyAt: Date.now() + grow };
    writeGuild(guildId, g);
    await interaction.update(await getPayload(interaction, u)).catch(() => {});
    return interaction.followUp({ content: `🌱 زرعت ${c.emoji} **${c.name}** في قطعة ${idx + 1} • ينضج خلال **${timeLeft(grow)}**${c.rare ? ' ⭐' : ''}`, ephemeral: true }).catch(() => {});
  }

  if (interaction.customId === 'farm_barn_action') {
    const [action, animalKey] = interaction.values[0].split(':');
    if (action === 'buy_animal') {
      const def = ANIMALS[animalKey];
      if (!def || farm.barn.length >= 6 || u.balance < def.cost) {
        await interaction.update(getBarnPayload(interaction, u)).catch(() => {});
        const errMsg = !def ? '❌ حيوان غير صحيح.' : farm.barn.length >= 6 ? '❌ الحظيرة ممتلئة (6 حيوانات).' : `❌ تحتاج ${def.cost.toLocaleString()} 💎.`;
        return interaction.followUp({ content: errMsg, ephemeral: true }).catch(() => {});
      }
      u.balance -= def.cost;
      farm.barn.push({ type: animalKey, readyAt: Date.now() + def.cooldown });
      writeGuild(guildId, g);
      await interaction.update(getBarnPayload(interaction, u)).catch(() => {});
      return interaction.followUp({ content: `🐾 اشتريت ${def.emoji} **${def.name}** — ستنتج ${def.produce.emoji} خلال ${Math.round(def.cooldown / 60_000)} دقيقة.`, ephemeral: true }).catch(() => {});
    }
  }

  if (interaction.customId === 'farm_craft_do') {
    const [, recipeKey] = interaction.values[0].split(':');
    const recipe = RECIPES[recipeKey];
    const inv = farm.inventory || {};
    const canMake = recipe && Object.entries(recipe.ingredients).every(([c, qty]) => (inv[c] || 0) >= qty);
    if (!recipe || !canMake) {
      await interaction.update(getCraftPayload(u)).catch(() => {});
      return interaction.followUp({ content: !recipe ? '❌ وصفة غير صحيحة.' : '❌ لا تملك المكونات الكافية. احصد أولاً أو خزّن محاصيلك.', ephemeral: true }).catch(() => {});
    }
    Object.entries(recipe.ingredients).forEach(([c, qty]) => { inv[c] = (inv[c] || 0) - qty; });
    u.balance = (u.balance || 0) + recipe.sell;
    farm.xp = (farm.xp || 0) + recipe.xp;
    const leveled = maybeLevelUp(farm);
    writeGuild(guildId, g);
    await interaction.update(await getPayload(interaction, u)).catch(() => {});
    return interaction.followUp({ content: `🍳 صنعت **${recipe.name}** وبعته بـ **${recipe.sell.toLocaleString()}** 💎 • +${recipe.xp} XP${leveled ? ` 🎉 مستوى ${farm.level}!` : ''}`, ephemeral: true }).catch(() => {});
  }
}
