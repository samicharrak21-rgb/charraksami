const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const {
  fmt, validateBet, saveUser, bumpStat,
  brandedEmbed, gifEmbed, winEmbed, loseEmbed, tieEmbed,
  balanceFooter, safeReply, CURRENCY
} = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');

// 5x5 grid, 5 mines
const W = 5, H = 5, MINES = 5;

function makeGrid() {
  const cells = Array(W * H).fill(0);
  let placed = 0;
  while (placed < MINES) {
    const i = Math.floor(Math.random() * cells.length);
    if (cells[i] !== -1) { cells[i] = -1; placed++; }
  }
  return cells;
}

module.exports = {
  aliases: ['الغام', 'minesweeper', 'mines'],
  data: new SlashCommandBuilder()
    .setName('minesweeper')
    .setDescription('💣 كاسحة الألغام — افتح الخلايا الآمنة لمضاعفة رهانك')
    .addIntegerOption(o => o.setName('bet').setDescription('مبلغ الرهان').setRequired(false).setMinValue(20)),

  async execute(interaction) {
    const v = validateBet(interaction, { min: 20, defaultBet: 100 });
    if (!v.ok) return safeReply(interaction, { embeds: [v.errorEmbed], ephemeral: true });
    const { bet, g, u, guildId, userId } = v;

    u.balance -= bet;
    saveUser(guildId, g);

    const grid = makeGrid();
    const opened = Array(W * H).fill(false);
    let safeOpened = 0, gameOver = false;

    const SAFE = W * H - MINES;
    const multiplierAt = (n) => +(1 + n * 0.18 + Math.pow(n, 1.6) * 0.02).toFixed(2);

    const renderRows = (revealAll = false) => {
      const rows = [];
      for (let r = 0; r < H; r++) {
        const row = new ActionRowBuilder();
        for (let c = 0; c < W; c++) {
          const i = r * W + c;
          const open = opened[i] || revealAll;
          const isMine = grid[i] === -1;
          let label = '⬜';
          let style = ButtonStyle.Secondary;
          if (open) {
            if (isMine) { label = '💣'; style = ButtonStyle.Danger; }
            else { label = '💎'; style = ButtonStyle.Success; }
          }
          row.addComponents(
            new ButtonBuilder()
              .setCustomId(`ms_${i}`)
              .setLabel(label)
              .setStyle(style)
              .setDisabled(open || gameOver)
          );
        }
        rows.push(row);
      }
      return rows;
    };

    const renderEmbed = (status = '') => {
      const mult = multiplierAt(safeOpened);
      const cashout = Math.floor(bet * mult);
      return gifEmbed(interaction, '💣 كاسحة الألغام', '', 'minesweeper', 'play', COLORS.primary)
        .setDescription(
          `💰 الرهان: **${fmt(bet)}** ${CURRENCY}\n` +
          `💎 خلايا مفتوحة: **${safeOpened}/${SAFE}**\n` +
          `📈 المضاعف الحالي: **×${mult}**\n` +
          `🤑 سحب الآن: **${fmt(cashout)}** ${CURRENCY}` +
          (status ? `\n\n${status}` : '')
        );
    };

    const cashoutBtn = () => new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ms_cash').setLabel(`💰 سحب (${fmt(Math.floor(bet * multiplierAt(safeOpened)))})`).setStyle(ButtonStyle.Success).setDisabled(safeOpened === 0 || gameOver)
    );

    const msg = await safeReply(interaction, { embeds: [renderEmbed('اضغط على الخلايا — تجنب الألغام!')], components: [...renderRows(), cashoutBtn()] });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.Button,
      filter: i => i.user.id === userId,
      time: 3 * 60 * 1000
    });

    collector.on('collect', async i => {
      if (gameOver) return i.deferUpdate();

      if (i.customId === 'ms_cash') {
        gameOver = true;
        const win = Math.floor(bet * multiplierAt(safeOpened));
        u.balance += win; u.xp += 30 + safeOpened * 10;
        bumpStat(u, 'mines_count'); bumpStat(u, 'mines_wins');
        saveUser(guildId, g);
        const final = winEmbed(interaction, 'سحب ذكي!', `💎 خلايا: **${safeOpened}**\n📈 ×${multiplierAt(safeOpened)}\n💰 +${fmt(win)} ${CURRENCY}`, 'minesweeper').setFooter(balanceFooter(u));
        collector.stop('cash');
        return i.update({ embeds: [final], components: renderRows(true) });
      }

      const idx = parseInt(i.customId.split('_')[1], 10);
      if (opened[idx]) return i.deferUpdate();
      opened[idx] = true;

      if (grid[idx] === -1) {
        gameOver = true;
        bumpStat(u, 'mines_count');
        saveUser(guildId, g);
        const final = loseEmbed(interaction, 'انفجرت!', `💥 ضربت لغماً.\n💸 خسرت **-${fmt(bet)}** ${CURRENCY}`, 'minesweeper').setFooter(balanceFooter(u));
        collector.stop('mine');
        return i.update({ embeds: [final], components: renderRows(true) });
      }

      safeOpened++;
      if (safeOpened === SAFE) {
        gameOver = true;
        const win = Math.floor(bet * multiplierAt(safeOpened) * 1.5);
        u.balance += win; u.xp += 500;
        bumpStat(u, 'mines_count'); bumpStat(u, 'mines_perfect');
        saveUser(guildId, g);
        const final = winEmbed(interaction, 'مسحٌ كامل!', `🌟 فتحت كل الخلايا الآمنة!\n💰 +${fmt(win)} ${CURRENCY}`, 'minesweeper').setFooter(balanceFooter(u));
        collector.stop('perfect');
        return i.update({ embeds: [final], components: renderRows(true) });
      }
      await i.update({ embeds: [renderEmbed()], components: [...renderRows(), cashoutBtn()] });
    });

    collector.on('end', async (_c, reason) => {
      if (reason === 'time' && !gameOver) {
        await interaction.editReply({ embeds: [tieEmbed(interaction, 'انتهى الوقت', 'تم إنهاء اللعبة تلقائياً.', 'minesweeper')], components: renderRows(true) }).catch(()=>{});
      }
    });
  }
};
