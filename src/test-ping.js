require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const config = require('./config');

const token = config.TOKEN || process.env.TOKEN;
const clientId = config.CLIENT_ID || process.env.CLIENT_ID;
const guildId = '1470839856996421737';

const pingCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('🏓 عرض زمن الاستجابة وحالة الاتصال')
  .toJSON();

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🚀 Attempting to register SINGLE command (ping)...');
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: [pingCommand] }
    );
    console.log(`✅ SUCCESS! Registered ${data.length} command (ping).`);
    process.exit(0);
  } catch (error) {
    console.error('❌ FAILED!');
    console.error(error);
    process.exit(1);
  }
})();
