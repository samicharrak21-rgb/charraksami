const { readGuild } = require('../utils/guildStorage');
const { EmbedBuilder } = require('discord.js');

const EMPRESS_GIFS = {
  love: ['https://cdn.discordapp.com/attachments/1470839860594999593/1472755483982041149/metal-gear-big-boss.gif?ex=699eeead&is=699d9d2d&hm=8e40c5151620d1fead4f08cfbdc1bd8404c6473ad607fd3346eec0ff7f7b6d52&'],
  happy: ['https://cdn.discordapp.com/attachments/1470839860594999593/1472755483982041149/metal-gear-big-boss.gif?ex=699eeead&is=699d9d2d&hm=8e40c5151620d1fead4f08cfbdc1bd8404c6473ad607fd3346eec0ff7f7b6d52&'],
  think: ['https://cdn.discordapp.com/attachments/1470839860594999593/1472755483982041149/metal-gear-big-boss.gif?ex=699eeead&is=699d9d2d&hm=8e40c5151620d1fead4f08cfbdc1bd8404c6473ad607fd3346eec0ff7f7b6d52&'],
  wave: ['https://cdn.discordapp.com/attachments/1470839860594999593/1472755483982041149/metal-gear-big-boss.gif?ex=699eeead&is=699d9d2d&hm=8e40c5151620d1fead4f08cfbdc1bd8404c6473ad607fd3346eec0ff7f7b6d52&'],
  default: ['https://cdn.discordapp.com/attachments/1470839860594999593/1472755483982041149/metal-gear-big-boss.gif?ex=699eeead&is=699d9d2d&hm=8e40c5151620d1fead4f08cfbdc1bd8404c6473ad607fd3346eec0ff7f7b6d52&']
};

const recentResponses = new Map();
const MAX_RECENT = 15;

function getRandomGif(mood = 'default') {
  const arr = EMPRESS_GIFS[mood] || EMPRESS_GIFS.default;
  return arr[Math.floor(Math.random() * arr.length)];
}

function avoidRepeat(channelId, response) {
  if (!channelId) return response;
  let recent = recentResponses.get(channelId) || [];
  const normalized = response.substring(0, 80).toLowerCase();
  if (recent.includes(normalized)) return null;
  recent = [normalized, ...recent].slice(0, MAX_RECENT);
  recentResponses.set(channelId, recent);
  return response;
}

function pickDifferent(arr, exclude) {
  const filtered = arr.filter(r => !exclude || !exclude.includes(r));
  return filtered[Math.floor(Math.random() * filtered.length)] || arr[0];
}

const ADHKAR = [
  'صلوا على النبي ﷺ',
  'سبحان الله وبحمده، سبحان الله العظيم',
  'لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير',
  'الحمد لله رب العالمين',
  'الله أكبر كبيراً، والحمد لله كثيراً، وسبحان الله بكرة وأصيلاً',
  'لا حول ولا قوة إلا بالله العلي العظيم',
  'أستغفر الله العظيم وأتوب إليه',
  'اللهم صل وسلم على نبينا محمد',
  'سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر',
  'اللهم إنك عفو كريم تحب العفو فاعف عنا',
  'حسبي الله ونعم الوكيل',
  'لا إله إلا أنت سبحانك إني كنت من الظالمين',
  'يا حي يا قيوم برحمتك أستغيث',
  'رضيت بالله رباً، وبالإسلام ديناً، وبمحمد ﷺ نبياً',
  'اللهم اغفر لي ولوالدي وللمؤمنين والمؤمنات'
];

function getEmpressResponse(messageContent, userId, ownerId, channelId) {
  const response = ADHKAR[Math.floor(Math.random() * ADHKAR.length)];
  return { response, mood: 'happy' };
}

function findAutoResponse(text) {
  // Always return true to trigger an Adhkar response when the bot is called
  return true;
}

/**
 * Sends a random Adhkar to all guilds periodically
 */
async function startAutoAdhkar(client, intervalMs = 30 * 60 * 1000) {
  const sendAdhkar = async () => {
    for (const guild of client.guilds.cache.values()) {
      try {
        const g = readGuild(guild.id);
        const channelId = g.channels?.adhkar || g.channels?.levels || g.channels?.announce || g.channels?.welcome;
        const channel = guild.channels.cache.get(channelId) || 
                        guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));

        if (channel) {
          const response = ADHKAR[Math.floor(Math.random() * ADHKAR.length)];
          
          const autoAdhkarEmbed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('ذِكر 💚')
            .setDescription(`**${response}**`);

          await channel.send({ embeds: [autoAdhkarEmbed] });
        }
      } catch (err) {
      }
    }
  };

  // Run once after 5 minutes, then every interval
  setTimeout(sendAdhkar, 5 * 60 * 1000);
  setInterval(sendAdhkar, intervalMs);
}

module.exports = {
  getEmpressResponse,
  findAutoResponse,
  startAutoAdhkar,
  ADHKAR
};
