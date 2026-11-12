const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function getEnv(name, def = undefined) {
  const val = process.env[name];
  if (val === undefined || val === '') return def;
  return val;
}

module.exports = {
  TOKEN: getEnv('TOKEN', ''),
  CLIENT_ID: getEnv('CLIENT_ID', ''),
  OWNER_ID: getEnv('OWNER_ID', ''),
  prefix: getEnv('PREFIX', '!'),
  TICKET_MENTION_ROLE_ID: getEnv('TICKET_MENTION_ROLE_ID', ''),
  AUTO_DELETE_SECONDS: Number(getEnv('AUTO_DELETE_SECONDS', '120')),
  AFK_DELETE_SECONDS: Number(getEnv('AFK_DELETE_SECONDS', '60')),
  DATA_DIR,
  CURRENCY: getEnv('CURRENCY', '💎'),
  CURRENCY_NAME: getEnv('CURRENCY_NAME', 'جواهر'),
  DEFAULT_BALANCE: Number(getEnv('DEFAULT_BALANCE', '1000')),
  DEFAULT_USER_DATA: {
    balance: Number(getEnv('DEFAULT_BALANCE', '1000')),
    xp: 0,
    level: 1,
    stats: {
      messages_count: 0,
      work_count: 0,
      daily_count: 0,
      slots_count: 0,
      dungeon_count: 0,
      farm_plant_count: 0,
      farm_harvest_count: 0,
      pay_count: 0,
      messages_today: 0,
      work_today: 0,
      daily_today: 0,
      game_today: 0
    },
    inventory: [],
    afk: null,
    rpg: {
      class: 'warrior',
      dungeon_wins: 0,
      farm_xp: 0
    }
  },
  DAILY_REWARD: Number(getEnv('DAILY_REWARD', '500')),
  AFK_GIFT: Number(getEnv('AFK_GIFT', '100')),
  SERVER_INVITE: getEnv('SERVER_INVITE', 'https://discord.gg/YOUR_INVITE'),
  SERVER_NAME: getEnv('SERVER_NAME', 'سيرفرك'),
  WELCOME_CHANNEL_ID: getEnv('WELCOME_CHANNEL_ID', ''),
  TICKET_CATEGORY_ID: getEnv('TICKET_CATEGORY_ID', ''),
  EMPRESS_ENABLED: getEnv('EMPRESS_ENABLED', 'true') === 'true',
  DEFAULTS: {
    prefix: '/',
    users: {},
    xpData: {},
    xp: {
      enabled: true,
      min: 15,
      max: 25,
      cooldown: 60000
    },
    welcome: {
      enabled: false,
      channel: null,
      message: '**أهلًا وسهلًا {user} في {server}!**\n\n✨ نتمنى لك وقتاً ممتعاً معنا\n📌 اطلع على القوانين واختر رتبتك\n🔗 ادعُ أصدقاءك: {invite}'
    },
    settings: {}
  }
};
