require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const config = require('./config');

const token = config.TOKEN || process.env.TOKEN;
const clientId = '1470925891944058912'; 
const guildId = '1470839856996421737';

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('--- 🛡️ EMERGENCY COMMAND SYNC ---');
        console.log(`📡 Bot ID: ${clientId}`);
        console.log(`📡 Server ID: ${guildId}`);

        // 1. مسح أوامر السيرفر
        console.log('Step 1: Clearing Guild Commands...');
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
        
        // 2. مسح الأوامر العالمية
        console.log('Step 2: Clearing Global Commands...');
        await rest.put(Routes.applicationCommands(clientId), { body: [] });

        console.log('⏳ Waiting 10 seconds for Discord to process deletions...');
        await new Promise(r => setTimeout(r, 10000));

        // 3. تسجيل أمر تجريبي واحد فقط للتأكد
        console.log('Step 3: Registering a single test command (ping)...');
        const testCommand = new SlashCommandBuilder()
            .setName('ping_test')
            .setDescription('اختبار فوري لظهور الأوامر')
            .toJSON();

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: [testCommand] }
        );

        console.log('✅ SUCCESS! "ping_test" registered.');
        console.log('💡 ACTION: Restart Discord (Ctrl+R) and check for "/ping_test".');
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR:', error);
        process.exit(1);
    }
})();
