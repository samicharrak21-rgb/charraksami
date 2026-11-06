const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

const commands = new Collection();

function loadCommands(dir = path.join(__dirname, '..', 'commands')) {
  if (!fs.existsSync(dir)) {
    console.log(`Directory does not exist: ${dir}`);
    return;
  }
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      loadCommands(fullPath);
    } else if (item.name.endsWith('.js')) {
      try {
        // Clear require cache for the command file to allow reloading
        if (require.cache[require.resolve(fullPath)]) {
          delete require.cache[require.resolve(fullPath)];
        }
        const cmd = require(fullPath);
        if (cmd && cmd.data && cmd.execute) {
          const commandName = cmd.data.name || (typeof cmd.data.toJSON === 'function' ? cmd.data.toJSON().name : null);
          if (!commandName) {
            console.log(`Skipping ${item.name}: could not determine command name`);
            continue;
          }
          cmd.category = cmd.category || path.basename(path.dirname(fullPath));
          commands.set(commandName, cmd);
          
          // دعم الاختصارات (Aliases) للأوامر
          if (cmd.aliases && Array.isArray(cmd.aliases)) {
            for (const alias of cmd.aliases) {
              const lowerAlias = alias.toLowerCase();
              if (!commands.has(lowerAlias)) {
                commands.set(lowerAlias, cmd);
              }
            }
          }
        } else {
          console.log(`Skipping ${item.name}: missing data or execute`);
        }
      } catch (err) {
        console.error('Failed loading command', item.name, err);
      }
    }
  }
  if (dir.endsWith('commands')) console.log(`✅ Commands loaded: ${new Set(commands.values()).size} (with aliases: ${commands.size})`);
}

function getCommand(name) {
  if (!name) return null;
  const lowerName = name.toLowerCase();
  
  // Try exact match in commands collection
  let cmd = commands.get(lowerName);
  
  // If not found, search through aliases
  if (!cmd) {
    cmd = commands.find(c => (c.aliases && c.aliases.includes(lowerName)));
  }
  
  return cmd;
}

module.exports = { loadCommands, getCommand, commands };
