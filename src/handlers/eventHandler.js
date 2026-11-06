const fs = require('fs');
const path = require('path');

function loadEvents(client, dir = path.join(__dirname, '..', 'events')) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  console.log(`Loading events from ${dir}:`);
  for (const file of files) {
    try {
      const ev = require(path.join(dir, file));
      if (ev && ev.name && ev.execute) {
        if (ev.once) client.once(ev.name, (...args) => ev.execute(client, ...args));
        else client.on(ev.name, (...args) => ev.execute(client, ...args));
        console.log(`Loaded event: ${ev.name}`);
      }
    } catch (err) {
      console.error('Failed loading event', file, err);
    }
  }
  console.log(`Total events loaded: ${files.length}`);
}

module.exports = { loadEvents };
