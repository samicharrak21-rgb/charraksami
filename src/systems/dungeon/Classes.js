const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embeds');

class Player {
    constructor(userId, username, data = {}) {
        this.userId = userId;
        this.username = username;
        this.class = data.class || 'warrior';
        this.classEmoji = this.getClassEmoji(this.class);
        this.hp = data.hp || 100;
        this.maxHp = data.maxHp || 100;
        this.atk = data.atk || 15;
        this.def = data.def || 5;
        this.gold = data.gold || 0;
        this.level = data.level || 1;
        this.exp = data.exp || 0;
        this.expToNext = data.expToNext || 100;
        this.potions = data.potions || 3;
        this.x = data.x || 0;
        this.y = data.y || 0;
        this.partyId = data.partyId || null;
        this.achievements = data.achievements || [];
    }

    getClassEmoji(cls) {
        const emojis = {
            warrior: '⚔️',
            mage: '🧙‍♂️',
            healer: '🧑‍⚕️',
            rogue: '🗡️'
        };
        return emojis[cls] || '👤';
    }

    levelUp() {
        this.level++;
        this.maxHp += 20;
        this.hp = this.maxHp;
        this.atk += 5;
        this.def += 2;
        this.expToNext = Math.floor(this.expToNext * 1.5);
        this.achievements.push(`Level ${this.level}`);
        return `🎉 تهانينا! صعد **${this.username}** للمستوى **${this.level}**!`;
    }

    heal(amount) {
        const oldHp = this.hp;
        this.hp = Math.min(this.maxHp, this.hp + amount);
        return this.hp - oldHp;
    }

    takeDamage(amount) {
        const actualDamage = Math.max(1, amount - this.def);
        this.hp = Math.max(0, this.hp - actualDamage);
        return actualDamage;
    }
}

class Party {
    constructor(leaderId, partyId) {
        this.leaderId = leaderId;
        this.partyId = partyId;
        this.members = new Set([leaderId]);
        this.sharedGold = 0;
        this.chatHistory = [];
    }

    addMember(userId) {
        if (this.members.size >= 6) return false;
        this.members.add(userId);
        return true;
    }

    removeMember(userId) {
        this.members.delete(userId);
        if (this.leaderId === userId && this.members.size > 0) {
            this.leaderId = Array.from(this.members)[0];
        }
        return this.members.size === 0;
    }

    addChatMessage(msg) {
        this.chatHistory.push(msg);
        if (this.chatHistory.length > 10) this.chatHistory.shift();
    }
}

class Dungeon {
    constructor(floor = 1, width = 20, height = 10) {
        this.floor = floor;
        this.width = width;
        this.height = height;
        this.map = [];
        this.rooms = [];
        this.stairsX = 0;
        this.stairsY = 0;
        this.playerStartX = 0;
        this.playerStartY = 0;
        this.generate();
    }

    generate() {
        // Initialize map with walls
        this.map = Array(this.height).fill().map(() => Array(this.width).fill('▓'));
        
        const roomCount = Math.floor(Math.random() * 3) + 4; // 4-6 rooms
        this.rooms = [];

        for (let i = 0; i < roomCount; i++) {
            const w = Math.floor(Math.random() * 5) + 4; // 4-8 width
            const h = Math.floor(Math.random() * 3) + 3; // 3-5 height
            const x = Math.floor(Math.random() * (this.width - w - 2)) + 1;
            const y = Math.floor(Math.random() * (this.height - h - 2)) + 1;

            const newRoom = { x, y, w, h };
            let intersects = false;
            for (const r of this.rooms) {
                if (x < r.x + r.w + 2 && x + w + 2 > r.x && y < r.y + r.h + 2 && y + h + 2 > r.y) {
                    intersects = true;
                    break;
                }
            }

            if (!intersects) {
                for (let ry = y; ry < y + h; ry++) {
                    for (let rx = x; rx < x + w; rx++) {
                        this.map[ry][rx] = ' ';
                    }
                }
                
                if (this.rooms.length > 0) {
                    const prevRoom = this.rooms[this.rooms.length - 1];
                    this.carvePath(
                        Math.floor(prevRoom.x + prevRoom.w / 2),
                        Math.floor(prevRoom.y + prevRoom.h / 2),
                        Math.floor(x + w / 2),
                        Math.floor(y + h / 2)
                    );
                } else {
                    this.playerStartX = Math.floor(x + w / 2);
                    this.playerStartY = Math.floor(y + h / 2);
                }
                this.rooms.push(newRoom);
            }
        }

        // Place stairs in the last room
        const lastRoom = this.rooms[this.rooms.length - 1];
        this.stairsX = Math.floor(lastRoom.x + lastRoom.w / 2);
        this.stairsY = Math.floor(lastRoom.y + lastRoom.h / 2);
        this.map[this.stairsY][this.stairsX] = '🏁'; // Goal emoji instead of >

        // Add some monsters and loot
        for (let ry = 1; ry < this.height - 1; ry++) {
            for (let rx = 1; rx < this.width - 1; rx++) {
                if (this.map[ry][rx] === ' ' && (rx !== this.playerStartX || ry !== this.playerStartY) && (rx !== this.stairsX || ry !== this.stairsY)) {
                    const rand = Math.random();
                    if (rand < 0.06) this.map[ry][rx] = '👾'; // Monster
                    else if (rand < 0.10) this.map[ry][rx] = '💰'; // Gold
                    else if (rand < 0.13) this.map[ry][rx] = '🧪'; // Potion
                }
            }
        }
    }

    carvePath(x1, y1, x2, y2) {
        let cx = x1;
        let cy = y1;
        while (cx !== x2) {
            this.map[cy][cx] = ' ';
            cx += (x2 > cx ? 1 : -1);
        }
        while (cy !== y2) {
            this.map[cy][cx] = ' ';
            cy += (y2 > cy ? 1 : -1);
        }
    }
}

class Game {
    constructor(guildId) {
        this.guildId = guildId;
        this.floor = 1;
        this.dungeon = new Dungeon(this.floor);
        this.players = new Map(); // userId -> Player
        this.parties = new Map(); // partyId -> Party
        this.currentCombat = null; // { monster: {}, floor: 1, partyId: null, playerIds: [], logs: [] }
        this.leaderboard = [];
    }

    addPlayer(userId, username, data) {
        const player = new Player(userId, username, data);
        player.x = this.dungeon.playerStartX;
        player.y = this.dungeon.playerStartY;
        this.players.set(userId, player);
        return player;
    }

    nextFloor() {
        this.floor++;
        this.dungeon = new Dungeon(this.floor);
        for (const player of this.players.values()) {
            player.x = this.dungeon.playerStartX;
            player.y = this.dungeon.playerStartY;
        }
        return this.floor;
    }
}

module.exports = { Player, Party, Dungeon, Game };