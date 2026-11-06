# Sami Bot - Advanced Discord Bot System

> A fully modular, MongoDB-free Discord bot with advanced systems for XP, roles, welcome messages, announcements, and guild management.

**Version:** 2.0 | **Discord.js:** v14 | **Database:** JSON (Local)

---

## 🎯 Features Completed

### ✅ Core Infrastructure
- **Modular Architecture:** Commands, events, and systems in separate files
- **Per-Guild JSON Storage:** Each guild has its own `src/data/<guildId>.json` file
- **Global Error Handling:** Unhandled rejections and exceptions logged via Pino
- **Command & Event Loaders:** Automatic discovery and registration
- **Lazy Loading:** All systems load on demand, no bloat on startup

### ✅ 1. Embed Builder (`/embedbuilder`)
- Modal UI to create custom embeds
- Fields: Title, Description, Color, Image, Thumbnail, Footer, Author, Timestamp
- Preview with Send/Save buttons
- Save templates to guild data
- Manage templates with `/templates list|delete|apply`

### ✅ 2. Welcome System (`/welcomesettings`)
- Embed message with variables: `{user}`, `{username}`, `{mention}`, `{server}`, `{memberCount}`, `{level}`, `{xp}`
- Optional Canvas image generation
- Optional DM to new members
- Customizable channel, message, title
- Auto-send on member join

### ✅ 3. Announcements (`/announce`)
- Send announcements immediately or schedule for future
- Per-guild scheduling with automatic persistence
- Mention support: `@here`, `@everyone`, or role mentions
- List and cancel scheduled announcements

### ✅ 4. XP & Levels System
- **Random XP per message:** 5-15 XP (configurable)
- **Anti-spam cooldown:** 5 seconds per user (configurable)
- **Prestige System:** Reset XP, increase prestige count
- **Prestige eligibility:** Configurable level threshold
- **Canvas Rank Card:** `/rank` shows player level, prestige, XP progress bar (with fallback)
- **Leaderboard:** `/leaderboard [limit]`
- **Channel Gating:** Allow/block XP in specific channels

#### XP Commands
- `/rank [user]` — Show rank card
- `/leaderboard [limit]` — Top players leaderboard
- `/prestige` — Prestige with confirmation button

### ✅ 5. Level Roles (`/levelroles`)
- Map levels to Discord roles
- Auto-assign roles when member reaches level
- Option to remove previous level roles
- List current mappings

### ✅ 6. Rules & Verification (`/rules`)
- Post rules message with "أوافق" button
- Auto-assign role on acceptance
- Track accepted users
- Permission checks before assignment
- List accepted members

#### Rules Commands
- `/rules enable|disable` — Toggle system
- `/rules setrole <role>` — Set acceptance role
- `/rules setchannel <channel>` — Set rules channel
- `/rules setmessage <message>` — Set rules text
- `/rules post` — Post message to channel
- `/rules list` — List accepted users

### ✅ 7. Auto-Role & Timed Roles (`/autorole`)
- **Immediate auto-role:** Assigned on join
- **Timed roles:** Assigned after X days in server
- Tracks join timestamps per member
- Periodic scanner (~10 min intervals) processes timed roles
- Permission checks before assignment

#### Auto-Role Commands
- `/autorole set <role>` — Set join role
- `/autorole enable|disable` — Toggle
- `/autorole timed-add <role> <days>` — Add timed role
- `/autorole timed-remove <role>` — Remove timed role
- `/autorole timed-list` — Show timed role schedule
- `/autorole timed-clean [days]` — Remove old join timestamps

### ✅ 8. Channel Settings (`/channelsettings`)
- Assign channels to systems: welcome, announce, levels, rules, logs
- **XP Gating:**
  - `/channelsettings xp-allow <channel>` — Whitelist channel for XP
  - `/channelsettings xp-block <channel>` — Blacklist channel from XP
  - `/channelsettings xp-clear` — Clear all lists (reverts to allow-all)
- Display current channel configuration

### ✅ 9. Permission System (Minimal)
- Check `cmd.requiredRoles` before execution
- Per-guild command blocklist support (foundation)
- Default: respects Discord role permissions

### ✅ 10. Central Settings Dashboard (`/settings`)
- Interactive panel with toggles for all features
- Enable/disable systems per guild:
  - welcome, announce, xp, levelroles, embedbuilder, rules, autorole
- Settings persist to JSON

---

## 📋 All Available Commands

| Command | Subcommands | Purpose |
|---------|-------------|---------|
| `/embedbuilder` | — | Open embed builder modal |
| `/templates` | list, delete, apply | Manage saved embeds |
| `/welcomesettings` | enable, disable, setchannel, setmessage, test | Configure welcome |
| `/announce` | send, schedule, list, cancel | Manage announcements |
| `/rank` | [user] | Show rank card |
| `/leaderboard` | [limit] | Top players |
| `/prestige` | — | Prestige your account |
| `/levelroles` | add, remove, list, setremoveprev | Link levels to roles |
| `/rules` | enable, disable, setrole, setchannel, setmessage, post, list | Configure rules |
| `/autorole` | set, enable, disable, timed-add, timed-remove, timed-list, timed-clean | Auto-role setup |
| `/channelsettings` | set, xp-allow, xp-block, xp-clear, show | Channel config |
| `/settings` | — | Global feature toggles |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- Discord bot token
- Discord server for testing

### Installation & Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file in project root
echo TOKEN=your_bot_token_here > .env
echo CLIENT_ID=your_client_id_here >> .env
echo OWNER_ID=your_user_id_here >> .env

# 3. Deploy slash commands
node deploy-commands.js

# 4. Start the bot
npm start
```

### Environment Variables

```bash
TOKEN=<Discord bot token>
CLIENT_ID=<Bot user ID>
OWNER_ID=<Your user ID (optional)>
LOG_LEVEL=info  # or debug, warn, error
NODE_ENV=production  # or development
DATA_DIR=./src/data  # path for JSON storage (optional)
```

### Deploying to Railway

```bash
# No special setup needed. Railway will:
# 1. Read .env variables
# 2. Run: npm start
# 3. Persist src/data/ folder (configure if ephemeral)
```

---

## 📁 Project Structure

```
src/
├── commands/           # Slash command files
│   ├── embedbuilder.js
│   ├── templates.js
│   ├── welcomesettings.js
│   ├── announce.js
│   ├── rank.js
│   ├── leaderboard.js
│   ├── prestige.js
│   ├── levelroles.js
│   ├── rules.js
│   ├── autorole.js
│   ├── channelsettings.js
│   └── settings.js
├── events/             # Bot event listeners
│   ├── ready.js
│   ├── interactionCreate.js
│   ├── messageCreate.js
│   ├── guildMemberAdd.js
│   └── guildMemberRemove.js
├── systems/            # Business logic modules
│   ├── announce.js
│   ├── welcome.js
│   ├── levels.js
│   ├── rules.js
│   ├── autorole.js
│   ├── settings.js
│   └── permissions.js
├── utils/              # Utilities
│   ├── guildStorage.js # Per-guild JSON I/O
│   ├── logger.js       # Pino logger
│   ├── errorHandler.js # Global error traps
│   └── tempStore.js    # In-memory temp storage
├── handlers/           # Loader helpers
│   ├── commandHandler.js
│   └── eventHandler.js
├── data/               # Auto-created guild JSON files
│   └── <guildId>.json  # Each guild's config
├── config.js           # Central config (process.env)
└── index.js            # Main entry point

deploy-commands.js      # Register slash commands
```

---

## 💾 Guild Data Structure

Each guild has a file `src/data/<guildId>.json` with this structure:

```json
{
  "prefix": "/",
  "xp": {
    "enabled": true,
    "min": 5,
    "max": 15,
    "cooldown": 5000
  },
  "welcome": {
    "enabled": false,
    "channel": "123456789",
    "message": "Welcome {mention}!",
    "title": "...",
    "useCanvas": false,
    "dm": false
  },
  "rules": {
    "enabled": false,
    "channel": "...",
    "role": "...",
    "message": "...",
    "title": "...",
    "lastMessageId": "..."
  },
  "autoRole": {
    "enabled": false,
    "roleId": "123456789"
  },
  "timedRoles": [
    { "id": "roleId", "days": 7 }
  ],
  "xpData": {
    "userId": { "xp": 150, "level": 1, "prestige": 0 }
  },
  "levelRoles": {
    "5": ["roleId1", "roleId2"],
    "10": ["roleId3"]
  },
  "rulesAccepted": ["userId1", "userId2"],
  "joinTimestamps": {
    "userId": 1708694400000
  },
  "channels": {
    "welcome": "...",
    "announce": "...",
    "levels": "...",
    "rules": "...",
    "logs": "...",
    "xpAllowed": ["ch1", "ch2"],
    "xpBlocked": ["ch3"]
  },
  "templates": {
    "templateName": { "embed": {...}, "savedAt": 1708694400000 }
  },
  "announcements": [
    { "id": "...", "channelId": "...", "embed": {...}, "timestamp": "...", "mention": "..." }
  ],
  "settings": {
    "welcome": true,
    "announce": true,
    "xp": true,
    "levelroles": true,
    "embedbuilder": true,
    "rules": true,
    "autorole": true
  },
  "lang": "en"
}
```

---

## 🔒 Permissions & Safety

- **Role Assignment:** Bot checks its own role position before assigning
- **ManageRoles Permission:** Required for level/rules/autorole assignments
- **Channel Permissions:** Verified before sending messages
- **Member Role Checks:** Prevents duplicate role assignments
- **DM Failures:** Logged but don't crash the system

---

## ⚙️ Configuration Examples

### Enable Welcome with Canvas
```
/welcomesettings setchannel #welcome
/welcomesettings setmessage Welcome {mention} to {server}! You are member #{memberCount}.
/welcomesettings enable
```

### Setup Level Roles
```
/levelroles add 5 @Member
/levelroles add 10 @Active
/levelroles add 20 @Veteran
/levelroles setremoveprev true
```

### Schedule Announcement
```
/announce schedule #announcements "Major Update" "New features coming!" 2026-02-25T18:00:00Z
```

### Auto-Role + Timed Roles
```
/autorole set @NewMember
/autorole enable
/autorole timed-add @Citizen 7
/autorole timed-add @Elder 30
```

---

## 📊 Remaining Work

### Not Yet Implemented
1. **Anti-Spam & Rate-Limits** — Global cooldowns, message spam detection
2. **Anti-Raid** — Join rate detection, mass user filters
3. **Multi-Language** — i18n system with language files per guild
4. **Economy (Stub)** — Basic balance storage + transaction log
5. **Full Railway Docs** — Deployment guide + env template
6. **Unit Tests** — Jest tests for core systems
7. **Prestige Rewards** — Role/item rewards on prestige
8. **Embed Builder Buttons** — Button editor UI in builder
9. **Settings Panel Subpages** — Quick links to each system's config
10. **Dashboard Web UI** (future) — Web-based control panel

---

## 🧪 Testing Locally

```bash
# Terminal 1: Start bot
npm start

# Terminal 2: Test a command (once bot is ready)
# Use Discord client to test:
# /rank
# /settings
# /announce send #general "Test" "Message"
# /autorole set @TestRole
```

---

## 🐛 Troubleshooting

### Bot won't login
- Check `TOKEN` in `.env`
- Verify bot is in server
- Check bot permissions (View Channels, Send Messages)

### Commands not appearing
- Run `node deploy-commands.js`
- Wait 1 minute for Discord sync
- Try `/` in chat to refresh

### Role assignment fails
- Check bot role is **above** the target role
- Verify bot has `ManageRoles` permission
- Check role isn't managed by bot itself

### XP not awarding
- Ensure `/settings` has `xp` enabled
- Check channel isn't blocked (`/channelsettings xp-block`)
- Verify cooldown hasn't triggered (5 sec default)

---

## 📝 Notes

- **No MongoDB:** All data is stored as JSON files locally
- **No config.json:** All settings are per-guild in JSON + environment variables
- **Automatic Cleanup:** Old join timestamps cleaned on member leave
- **Persistent Scheduling:** Announcements reload on bot restart
- **Modular Design:** Easy to disable/remove any system

---

## 📄 License

MIT — Use freely, modify as needed.

---

**Last Updated:** Feb 23, 2026  
**Bot Status:** Production Ready ⚡
