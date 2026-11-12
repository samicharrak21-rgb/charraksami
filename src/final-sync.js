require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            loadCommands(fullPath);
        } else if (item.name.endsWith('.js')) {
            try {
                const command = require(fullPath);
                if (command.data && command.data.name) {
                    commands.push(command.data.toJSON());
                }
            } catch (err) {}
        }
    }
}

loadCommands(commandsPath);

const token = config.TOKEN || process.env.TOKEN;
const clientId = '1470925891944058912'; 
const guildId = '1470839856996421737';

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('--- 🚀 FINAL COMMAND SYNC ---');
        console.log(`📡 Registering ${commands.length} commands to Guild: ${guildId}`);

        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands }
        );

        console.log(`✅ SUCCESS! Registered ${data.length} commands.`);
        console.log('💡 IMPORTANT: Restart your Discord (Ctrl+R) to see them.');
        process.exit(0);
    } catch (error) {
        console.error('❌ FAILED:', error);
        process.exit(1);
    }
})();
