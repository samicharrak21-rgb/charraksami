require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Sami Bot Command Deployment Script
 * Robust version with rate limit handling and better logging.
 */

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
        if (command.data && command.data.name && typeof command.data.toJSON === 'function') {
          const base = command.data.toJSON();
          commands.push(base);
          console.log(`✅ Loaded command: ${command.data.name}`);
        }
      } catch (err) {
        console.error(`❌ Failed to load command ${item.name}: ${err.message}`);
      }
    }
  }
}

console.log('🔍 Scanning for commands...');
loadCommands(commandsPath);

// Deduplicate commands by name and enforce Discord name constraints (lowercase, 1-32, a-z0-9-_)
const nameSet = new Set();
const validName = (n) => typeof n === 'string' && /^[a-z0-9_-]{1,32}$/.test(n);
const uniqueCommands = [];
for (const cmd of commands) {
  const nm = cmd.name;
  if (!validName(nm)) {
    console.warn(`⚠️ Skipping invalid command name: ${nm}`);
    continue;
  }
  if (nameSet.has(nm)) continue;
  nameSet.add(nm);
  uniqueCommands.push(cmd);
}
commands.length = 0;
commands.push(...uniqueCommands);

const token = process.env.TOKEN || process.env.DISCORD_TOKEN || config.TOKEN;
const clientId = process.env.CLIENT_ID || config.CLIENT_ID;
const guildId = process.env.GUILD_ID;

// Parse CLI Arguments
const argv = process.argv.slice(2);
const has = (name) => argv.includes(`--${name}`);
const argValue = (name) => {
  const found = argv.find(a => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : null;
};

const useGlobal = has('global') || !guildId;
const targetGuildId = argValue('guild') || guildId;
const clearCommands = has('clear');

if (!token || !clientId) {
  console.error('❌ ERROR: DISCORD_TOKEN or CLIENT_ID is missing from environment/config.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

async function deploy() {
  try {
    const route = useGlobal 
      ? Routes.applicationCommands(clientId) 
      : Routes.applicationGuildCommands(clientId, targetGuildId);

    if (clearCommands) {
      console.log(`🗑️ Clearing existing commands from ${useGlobal ? 'GLOBAL' : `Guild: ${targetGuildId}`}...`);
      await rest.put(route, { body: [] });
      console.log('⏳ Deletion request sent. Waiting 3 seconds...');
      await new Promise(r => setTimeout(r, 3000));
    }

    console.log(`🚀 Starting deployment of ${commands.length} commands to ${useGlobal ? 'GLOBAL' : `Guild: ${targetGuildId}`}...`);
    
    const data = await rest.put(route, { body: commands });
    
    console.log(`✅ SUCCESS: Successfully registered ${data.length} commands.`);
    process.exit(0);
  } catch (error) {
    // Handle Rate Limits (429)
    if (error.status === 429) {
      const retryAfter = Math.ceil(error.retry_after * 1000) || 5000;
      console.warn(`⏳ Rate Limited! Retrying in ${Math.ceil(retryAfter / 1000)} seconds...`);
      await new Promise(r => setTimeout(r, retryAfter));
      return deploy(); // Recursive retry
    }

    console.error('❌ CRITICAL ERROR during deployment:');
    if (error.code === 50001) {
      console.error('   - Missing Permissions: The bot is missing "applications.commands" scope in this server.');
    } else {
      console.error(`   - Status: ${error.status || 'unknown'}`);
      console.error(`   - Message: ${error.message}`);
    }
    process.exit(1);
  }
}

deploy();
