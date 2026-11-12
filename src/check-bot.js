require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log('--- BOT INFO ---');
  console.log(`Bot Tag: ${client.user.tag}`);
  console.log(`Bot ID: ${client.user.id}`);
  console.log('--- GUILD INFO ---');
  client.guilds.cache.forEach(guild => {
    console.log(`Guild: ${guild.name} (${guild.id})`);
  });
  process.exit(0);
});

client.login(config.TOKEN || process.env.TOKEN);
