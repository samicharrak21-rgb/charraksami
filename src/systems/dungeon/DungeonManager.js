const { Game, Party, Player } = require('./Classes');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { COLORS } = require('../../utils/embeds');
const { readGuild, writeGuild } = require('../../utils/guildStorage');

class DungeonManager {
    constructor() {
        this.games = new Map(); // guildId -> Game
    }

    getGame(guildId) {
        if (!this.games.has(guildId)) {
            this.games.set(guildId, new Game(guildId));
        }
        return this.games.get(guildId);
    }

    createParty(guildId, leaderId, username) {
        const game = this.getGame(guildId);
        const partyId = 'p' + Date.now().toString();
        const party = new Party(leaderId, partyId);
        game.parties.set(partyId, party);
        
        const player = game.players.get(leaderId);
        if (player) player.partyId = partyId;
        
        return partyId;
    }

    joinParty(guildId, userId, partyId) {
        const game = this.getGame(guildId);
        const party = game.parties.get(partyId);
        if (!party) return { success: false, error: '❌ لم يتم العثور على هذا الحزب.' };
        if (party.members.size >= 6) return { success: false, error: '❌ الحزب ممتلئ (الحد الأقصى 6 لاعبين).' };
        
        party.addMember(userId);
        const player = game.players.get(userId);
        if (player) player.partyId = partyId;
        
        return { success: true };
    }

    leaveParty(guildId, userId) {
        const game = this.getGame(guildId);
        const player = game.players.get(userId);
        if (!player || !player.partyId) return { success: false, error: '❌ أنت لست في حزب حالياً.' };
        
        const party = game.parties.get(player.partyId);
        if (party) {
            const isEmpty = party.removeMember(userId);
            if (isEmpty) game.parties.delete(player.partyId);
        }
        
        player.partyId = null;
        return { success: true };
    }

    listParties(guildId) {
        const game = this.getGame(guildId);
        if (game.parties.size === 0) return '❌ لا توجد أحزاب نشطة حالياً.';
        
        let list = '📜 **الأحزاب المتاحة:**\n';
        for (const [id, party] of game.parties) {
            const leader = game.players.get(party.leaderId);
            list += `🔹 **ID:** \`${id}\` | **القائد:** ${leader?.username || 'مجهول'} | **الأعضاء:** ${party.members.size}/6\n`;
        }
        return list;
    }

    getLeaderboard(guildId) {
        const game = this.getGame(guildId);
        const players = Array.from(game.players.values())
            .sort((a, b) => b.level - a.level || b.exp - a.exp)
            .slice(0, 10);
            
        if (players.length === 0) return '❌ لا يوجد متصدرين حالياً.';
        
        let board = '🏆 **أعلى 10 مغامرين في السيرفر:**\n';
        players.forEach((p, i) => {
            board += `${i + 1}. **${p.username}** | مستوى ${p.level} | خبرة ${p.exp}\n`;
        });
        return board;
    }

    savePlayer(guildId, userId) {
        const game = this.getGame(guildId);
        const player = game.players.get(userId);
        if (!player) return;
        
        const g = readGuild(guildId);
        g.users = g.users || {};
        g.users[userId] = {
            ...(g.users[userId] || {}),
            hp: player.hp,
            maxHp: player.maxHp,
            atk: player.atk,
            def: player.def,
            gold: player.gold,
            level: player.level,
            exp: player.exp,
            expToNext: player.expToNext,
            potions: player.potions,
            class: player.class,
            x: player.x,
            y: player.y
        };
        writeGuild(guildId, g);
    }

    movePlayer(guildId, userId, direction) {
        const game = this.getGame(guildId);
        const player = game.players.get(userId);
        if (!player) return { success: false, error: '❌ يرجى البدء باللعب أولاً باستخدام !play' };
        
        const moves = {
            'w': { dx: 0, dy: -1 },
            'a': { dx: -1, dy: 0 },
            's': { dx: 0, dy: 1 },
            'd': { dx: 1, dy: 0 }
        };
        
        const move = moves[direction.toLowerCase()];
        if (!move) return { success: false, error: '❌ اتجاه غير معروف. استخدم w, a, s, d.' };
        
        const nx = player.x + move.dx;
        const ny = player.y + move.dy;
        
        if (nx < 0 || nx >= game.dungeon.width || ny < 0 || ny >= game.dungeon.height) {
            return { success: false, error: '🚧 لا يمكنك الخروج من حدود الدانجن.' };
        }
        
        const cell = game.dungeon.map[ny][nx];
        if (cell === '▓') return { success: false, error: '🧱 جدار صلب!' };
        
        player.x = nx;
        player.y = ny;
        this.savePlayer(guildId, userId);
        
        let result = { success: true, event: null };
        
        if (cell === '💰') {
            const gold = Math.floor(Math.random() * 50) + 10;
            player.gold += gold;
            game.dungeon.map[ny][nx] = ' ';
            result.event = `💰 وجدت **${gold}** ذهب!`;
        } else if (cell === '🧪') {
            player.potions++;
            game.dungeon.map[ny][nx] = ' ';
            result.event = `🧪 وجدت **جرعة شفاء**!`;
        } else if (cell === '👾') {
            result.event = 'monster'; 
        } else if (cell === '🏁') {
            result.event = 'stairs';
        }
        
        return result;
    }

    renderMap(guildId, userId) {
        const game = this.getGame(guildId);
        const player = game.players.get(userId);
        if (!player) return '❌ يرجى البدء باللعب أولاً.';
        
        let mapStr = '';
        for (let y = 0; y < game.dungeon.height; y++) {
            for (let x = 0; x < game.dungeon.width; x++) {
                let char = game.dungeon.map[y][x];
                
                // Check if any party member is here
                let partyMemberHere = false;
                if (player.partyId) {
                    const party = game.parties.get(player.partyId);
                    for (const pid of party.members) {
                        const p = game.players.get(pid);
                        if (p && p.x === x && p.y === y) {
                            if (pid === userId) char = '👤'; // Main player
                            else char = '👥'; // Party member
                            partyMemberHere = true;
                            break;
                        }
                    }
                } else if (player.x === x && player.y === y) {
                    char = '👤';
                }
                
                mapStr += char;
            }
            mapStr += '\n';
        }
        
        return '```\n' + mapStr + '```';
    }

    async handleCombat(guildId, userId, action, targetId = null) {
        const game = this.getGame(guildId);
        const player = game.players.get(userId);
        if (!player) return { success: false, error: '❌ اللاعب غير موجود.' };
        
        if (action === 'a') {
            const damage = player.atk + Math.floor(Math.random() * 5);
            
            // Check if there's an ongoing combat
            if (!game.currentCombat) {
                // Trigger new combat if on monster cell
                const cell = game.dungeon.map[player.y][player.x];
                if (cell === '👾') {
                    const floorMult = 1 + (game.floor * 0.2);
                    game.currentCombat = {
                        monster: { name: 'وحش الدانجن', hp: Math.floor(50 * floorMult), maxHp: Math.floor(50 * floorMult), atk: Math.floor(10 * floorMult) },
                        playerIds: player.partyId ? Array.from(game.parties.get(player.partyId).members) : [userId],
                        logs: []
                    };
                } else {
                    return { success: false, error: '❌ لا يوجد وحش هنا لمهاجمته!' };
                }
            }
            
            const combat = game.currentCombat;
            combat.monster.hp -= damage;
            combat.logs.push(`⚔️ **${player.username}** ضرب الوحش بـ **${damage}** ضرر!`);
            
            if (combat.monster.hp <= 0) {
                game.dungeon.map[player.y][player.x] = ' ';
                const gold = Math.floor(Math.random() * 100) + 50;
                const exp = 50 + (game.floor * 10);
                
                combat.playerIds.forEach(pid => {
                    const p = game.players.get(pid);
                    if (p) {
                        p.gold += gold;
                        p.exp += exp;
                        if (p.exp >= p.expToNext) p.levelUp();
                        this.savePlayer(guildId, pid);
                    }
                });
                
                game.currentCombat = null;
                return { success: true, log: `🎉 تم سحق الوحش! حصل الجميع على **${gold}** ذهب و **${exp}** خبرة.` };
            }
            
            // Monster counters
            const monsterDmg = Math.max(1, combat.monster.atk - player.def);
            player.hp -= monsterDmg;
            combat.logs.push(`👹 الوحش هاجم **${player.username}** بـ **${monsterDmg}** ضرر!`);
            this.savePlayer(guildId, userId);
            
            if (player.hp <= 0) {
                player.hp = 0;
                combat.logs.push(`💀 سقط **${player.username}** في المعركة!`);
                // Revival logic could go here
            }
            
            return { success: true, log: combat.logs.join('\n') };
        } else if (action === 'h') {
            if (player.potions <= 0) return { success: false, error: '❌ لا تملك جرعات شفاء!' };
            player.potions--;
            const healed = player.heal(30);
            this.savePlayer(guildId, userId);
            return { success: true, log: `🧪 استخدمت جرعة واستعدت **${healed}** من صحتك!` };
        } else if (action === 'r') {
            const success = Math.random() > 0.3;
            if (success) {
                player.x = game.dungeon.playerStartX;
                player.y = game.dungeon.playerStartY;
                game.currentCombat = null;
                this.savePlayer(guildId, userId);
                return { success: true, log: '🏃 هربت بنجاح إلى بداية الطابق!' };
            }
            return { success: true, log: '😰 فشلت في الهروب! الوحش يمنعك.' };
        }
        
        return { success: false, error: '❌ إجراء غير معروف.' };
    }

    sendPartyMessage(guildId, userId, message) {
        const game = this.getGame(guildId);
        const player = game.players.get(userId);
        if (!player || !player.partyId) return { success: false, error: '❌ يجب أن تكون في حزب لتستخدم هذا الأمر.' };
        
        const party = game.parties.get(player.partyId);
        if (party) {
            party.addChatMessage(`[${player.username}]: ${message}`);
            return { success: true };
        }
        return { success: false, error: '❌ الحزب غير موجود.' };
    }

    getEmbed(guildId, userId) {
        const game = this.getGame(guildId);
        const player = game.players.get(userId);
        if (!player) return null;
        
        const party = player.partyId ? game.parties.get(player.partyId) : null;
        
        const embed = new EmbedBuilder()
            .setColor(COLORS.phantom)
            .setTitle(`🏰 دانجن جماعي - الطابق ${game.floor}`)
            .setDescription(this.renderMap(guildId, userId))
            .addFields(
                { name: '👤 حالتك', value: `❤️ HP: ${player.hp}/${player.maxHp} | ⚔️ ATK: ${player.atk} | 🛡️ DEF: ${player.def}\n💰 Gold: ${player.gold} | 🧪 Potions: ${player.potions}\n⭐ Level: ${player.level} (${player.exp}/${player.expToNext})`, inline: false }
            );
            
        if (party) {
            const membersNames = Array.from(party.members).map(mid => game.players.get(mid)?.username || 'مجهول').join(', ');
            embed.addFields({ name: '👥 الحزب', value: `الأعضاء (${party.members.size}/6): ${membersNames}\nID: \`${party.partyId}\``, inline: false });
            
            if (party.chatHistory.length > 0) {
                embed.addFields({ name: '💬 شات الحزب', value: '```\n' + party.chatHistory.join('\n') + '```', inline: false });
            }
        }
        
        embed.setFooter({ text: 'wasd للتحرك | h للشفاء | a للهجوم | r للهروب | !say للدردشة' });
        
        return embed;
    }
}

module.exports = new DungeonManager();