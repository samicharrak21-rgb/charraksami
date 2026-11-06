const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const dungeonManager = require('../../systems/dungeon/DungeonManager');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS } = require('../../utils/embeds');
const config = require('../../config');

module.exports = {
    aliases: ['دانجن_قديم', 'مغامرة_قديمة', 'dungeon_old', 'dg_old'],
    data: new SlashCommandBuilder()
        .setName('dungeon_old')
        .setDescription('🏰 لعبة الدانجن الجماعية القديمة')
        .addSubcommand(sub => sub.setName('play').setDescription('البدء باللعب أو العودة للمغامرة'))
        .addSubcommand(sub => sub.setName('party').setDescription('إدارة الحزب الجماعي')
            .addStringOption(opt => opt.setName('action').setDescription('الإجراء (create, list, join, leave)').setRequired(true))
            .addStringOption(opt => opt.setName('id').setDescription('ID الحزب (في حال الانضمام)')))
        .addSubcommand(sub => sub.setName('top').setDescription('عرض قائمة المتصدرين')),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const userId = interaction.user.id;
        const username = interaction.member?.displayName || interaction.user.username;
        const sub = interaction.options?.getSubcommand() || 'play';

        const g = readGuild(guildId);
        const game = dungeonManager.getGame(guildId);

        if (sub === 'top') {
            return interaction.reply({ content: dungeonManager.getLeaderboard(guildId) });
        }

        if (sub === 'party') {
            const action = interaction.options.getString('action');
            const partyId = interaction.options.getString('id');

            if (action === 'create') {
                const id = dungeonManager.createParty(guildId, userId, username);
                return interaction.reply({ content: `✅ تم إنشاء الحزب بنجاح! ID الحزب: \`${id}\`. يمكن لـ 5 أشخاص آخرين الانضمام باستخدام \`!join ${id}\`` });
            } else if (action === 'list') {
                return interaction.reply({ content: dungeonManager.listParties(guildId) });
            } else if (action === 'join') {
                if (!partyId) return interaction.reply({ content: '❌ يرجى إدخال ID الحزب للانضمام.', ephemeral: true });
                const res = dungeonManager.joinParty(guildId, userId, partyId);
                if (!res.success) return interaction.reply({ content: res.error, ephemeral: true });
                return interaction.reply({ content: `✅ انضممت بنجاح للحزب \`${partyId}\`!` });
            } else if (action === 'leave') {
                const res = dungeonManager.leaveParty(guildId, userId);
                if (!res.success) return interaction.reply({ content: res.error, ephemeral: true });
                return interaction.reply({ content: '✅ غادرت الحزب بنجاح.' });
            }
        }

        // Default 'play' logic
        let player = game.players.get(userId);
        if (!player) {
            const userData = g.users[userId] || {};
            
            // Class Selection if new player
            if (!userData.class) {
                const classEmbed = new EmbedBuilder()
                    .setColor(COLORS.primary)
                    .setTitle('🎭 اختر فئتك القتالية')
                    .setDescription('كل فئة لها مميزاتها الخاصة في الدانجن:\n\n' +
                        '⚔️ **Warrior (محارب):** متوازن، دفاع جيد.\n' +
                        '🧙‍♂️ **Mage (ساحر):** هجوم قوي، دفاع ضعيف.\n' +
                        '🧑‍⚕️ **Healer (معالج):** يمكنه شفاء نفسه والآخرين بكفاءة.\n' +
                        '🗡️ **Rogue (سفاح):** رشاقة عالية وفرصة ضربات حرجة.')
                    .setFooter({ text: 'اختر بحكمة، لا يمكنك التغيير لاحقاً!' });

                const classRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('dg_class_warrior').setLabel('Warrior ⚔️').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('dg_class_mage').setLabel('Mage 🧙‍♂️').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('dg_class_healer').setLabel('Healer 🧑‍⚕️').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('dg_class_rogue').setLabel('Rogue 🗡️').setStyle(ButtonStyle.Primary)
                );

                const classMsg = await interaction.reply({ embeds: [classEmbed], components: [classRow], fetchReply: true });
                const classCollector = classMsg.createMessageComponentCollector({ time: 30000, max: 1 });

                return classCollector.on('collect', async ci => {
                    const chosenClass = ci.customId.split('_')[2];
                    userData.class = chosenClass;
                    g.users[userId] = userData;
                    writeGuild(guildId, g);
                    
                    player = game.addPlayer(userId, username, userData);
                    const startEmbed = dungeonManager.getEmbed(guildId, userId);
                    const moveRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('dg_move_w').setLabel('W').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('dg_move_a').setLabel('A').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('dg_move_s').setLabel('S').setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('dg_move_d').setLabel('D').setStyle(ButtonStyle.Secondary)
                    );
                    const actionRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('dg_action_a').setLabel('هجوم ⚔️').setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId('dg_action_h').setLabel('شفاء 🧪').setStyle(ButtonStyle.Success),
                        new ButtonBuilder().setCustomId('dg_action_r').setLabel('هروب 🏃').setStyle(ButtonStyle.Primary)
                    );
                    await ci.update({ content: `✅ تم اختيار فئة **${chosenClass}**! بدأت مغامرتك الآن.`, embeds: [startEmbed], components: [moveRow, actionRow] });
                    // Start the main collector logic (recursive or separate function)
                    this.startMainCollector(ci, userId, guildId, game);
                });
            } else {
                player = game.addPlayer(userId, username, userData);
            }
        }

        const embed = dungeonManager.getEmbed(guildId, userId);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('dg_move_w').setLabel('W').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dg_move_a').setLabel('A').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dg_move_s').setLabel('S').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dg_move_d').setLabel('D').setStyle(ButtonStyle.Secondary)
        );
        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('dg_action_a').setLabel('هجوم ⚔️').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('dg_action_h').setLabel('شفاء 🧪').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('dg_action_r').setLabel('هروب 🏃').setStyle(ButtonStyle.Primary)
        );

        const msg = await interaction.reply({ embeds: [embed], components: [row, row2], fetchReply: true });
        this.startMainCollector(msg, userId, guildId, game);
    },

    async startMainCollector(msg, userId, guildId, game) {
        const collector = msg.createMessageComponentCollector ? msg.createMessageComponentCollector({ time: 300000 }) : msg.message.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            if (i.user.id !== userId) return i.reply({ content: '❌ افتح مغامرتك الخاصة باستخدام !play', ephemeral: true });

            let res;
            if (i.customId.startsWith('dg_move_')) {
                const dir = i.customId.split('_')[2];
                res = dungeonManager.movePlayer(guildId, userId, dir);
            } else if (i.customId.startsWith('dg_action_')) {
                const action = i.customId.split('_')[2];
                res = await dungeonManager.handleCombat(guildId, userId, action);
            }

            if (res && !res.success) {
                return i.reply({ content: res.error, ephemeral: true });
            }

            if (res && res.event === 'stairs') {
                game.nextFloor();
                const newEmbed = dungeonManager.getEmbed(guildId, userId);
                return i.update({ content: '✨ انتقلت للطابق التالي!', embeds: [newEmbed] });
            }

            const updatedEmbed = dungeonManager.getEmbed(guildId, userId);
            const content = res?.event && res.event !== 'monster' ? res.event : res?.log ? res.log : null;
            
            await i.update({ content: content || '', embeds: [updatedEmbed] });
        });
    }
};