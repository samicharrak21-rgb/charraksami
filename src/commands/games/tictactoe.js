// XO — PvP حقيقي + ذكاء اصطناعي (Minimax) لا يُهزم على الصعب
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { fmt, validateBet, getUser, saveUser, bumpStat, brandedEmbed, winEmbed, loseEmbed, tieEmbed, balanceFooter, safeReply, errorEmbed, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const winner = b => { for (const [a,b2,c] of LINES) if (b[a] && b[a]===b[b2] && b[a]===b[c]) return b[a]; return b.includes(null)?null:'tie'; };

function minimax(b, p, ai, depth=0) {
  const w = winner(b);
  if (w === ai) return { score: 10 - depth };
  if (w && w !== 'tie') return { score: depth - 10 };
  if (w === 'tie') return { score: 0 };
  const moves = [];
  for (let i = 0; i < 9; i++) if (!b[i]) {
    b[i] = p;
    const { score } = minimax(b, p === 'X' ? 'O' : 'X', ai, depth + 1);
    moves.push({ i, score });
    b[i] = null;
  }
  return p === ai ? moves.reduce((a,b)=>b.score>a.score?b:a) : moves.reduce((a,b)=>b.score<a.score?b:a);
}

function render(b, turn, p1, p2, bet) {
  const cells = b.map(c => c === 'X' ? '❌' : c === 'O' ? '⭕' : '⬜');
  const grid = `${cells[0]}${cells[1]}${cells[2]}\n${cells[3]}${cells[4]}${cells[5]}\n${cells[6]}${cells[7]}${cells[8]}`;
  return `${grid}\n\n❌ ${p1}\n⭕ ${p2}\n\n🎯 الدور: **${turn === 'X' ? p1 : p2}**\n💰 الرهان: **${fmt(bet)}** ${CURRENCY}`;
}

function rows(b, disabled = false) {
  const out = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      const v = b[i];
      row.addComponents(new ButtonBuilder()
        .setCustomId(`xo_${i}`)
        .setLabel(v ? (v === 'X' ? '❌' : '⭕') : '\u200b')
        .setStyle(v === 'X' ? ButtonStyle.Danger : v === 'O' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(disabled || !!v));
    }
    out.push(row);
  }
  return out;
}

module.exports = {
  aliases: ['xo', 'إكس', 'تيك'],
  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('❌⭕ XO — العب ضد البوت أو ضد لاعب آخر')
    .addUserOption(o => o.setName('opponent').setDescription('خصم بشري (اتركه فارغاً للعب ضد البوت)'))
    .addStringOption(o => o.setName('difficulty').setDescription('صعوبة البوت').addChoices(
      { name: 'سهل', value: 'easy' }, { name: 'متوسط', value: 'medium' }, { name: 'مستحيل', value: 'hard' }
    ))
    .addIntegerOption(o => o.setName('bet').setDescription('رهان').setMinValue(0)),

  async execute(interaction) {
    const opp = interaction.options.getUser('opponent');
    const diff = interaction.options.getString('difficulty') || 'hard';
    const bet = interaction.options.getInteger('bet') || 0;
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    if (opp && opp.bot) return safeReply(interaction, { embeds: [errorEmbed('خصم غير صالح', 'لا يمكنك تحدي بوت آخر.')], ephemeral: true });
    if (opp && opp.id === userId) return safeReply(interaction, { embeds: [errorEmbed('خصم غير صالح', 'لا يمكنك تحدي نفسك.')], ephemeral: true });

    const { g, u } = getUser(guildId, userId);
    if (bet > 0 && u.balance < bet) return safeReply(interaction, { embeds: [errorEmbed('رصيد غير كافٍ', `تحتاج ${fmt(bet)} ${CURRENCY}.`)], ephemeral: true });

    let oppData = null;
    if (opp) {
      const r = getUser(guildId, opp.id);
      if (bet > 0 && r.u.balance < bet) return safeReply(interaction, { embeds: [errorEmbed('رصيد الخصم', `${opp.username} لا يملك رصيداً كافياً.`)], ephemeral: true });
      oppData = r;
    }

    if (bet > 0) { u.balance -= bet; if (oppData) oppData.u.balance -= bet; saveUser(guildId, g); }

    const board = Array(9).fill(null);
    let turn = 'X';
    const p1Name = interaction.member?.displayName || interaction.user.username;
    const p2Name = opp ? (opp.username) : `🤖 البوت (${diff})`;
    const players = { X: userId, O: opp ? opp.id : 'BOT' };

    const embed = () => brandedEmbed(interaction, '❌⭕ XO', COLORS.primary).setDescription(render(board, turn, p1Name, p2Name, bet));
    const msg = await safeReply(interaction, { embeds: [embed()], components: rows(board) });

    const aiMove = () => {
      if (diff === 'easy') {
        const empty = board.map((v,i)=>v?null:i).filter(v=>v!==null);
        return empty[Math.floor(Math.random()*empty.length)];
      }
      if (diff === 'medium' && Math.random() < 0.4) {
        const empty = board.map((v,i)=>v?null:i).filter(v=>v!==null);
        return empty[Math.floor(Math.random()*empty.length)];
      }
      return minimax(board, 'O', 'O').i;
    };

    const finish = async (result) => {
      let title, desc, fn;
      const stake = bet * 2;
      if (result === 'tie') {
        if (bet > 0) { u.balance += bet; if (oppData) oppData.u.balance += bet; }
        fn = tieEmbed; title = 'تعادل'; desc = 'استرجعتم رهاناتكم.';
      } else {
        const winnerId = players[result];
        if (winnerId === userId) {
          if (bet > 0) u.balance += stake;
          fn = winEmbed; title = `فاز ${p1Name}`; desc = bet > 0 ? `💰 +${fmt(stake-bet)} ${CURRENCY}` : '🎉 مبروك!';
          bumpStat(u, 'xo_wins');
        } else if (winnerId === 'BOT') {
          fn = loseEmbed; title = 'البوت فاز'; desc = bet > 0 ? `💸 -${fmt(bet)} ${CURRENCY}` : 'حظ أوفر!';
        } else {
          if (bet > 0) oppData.u.balance += stake;
          fn = loseEmbed; title = `فاز ${p2Name}`; desc = bet > 0 ? `💸 -${fmt(bet)} ${CURRENCY}` : '';
        }
      }
      bumpStat(u, 'xo_count'); saveUser(guildId, g);
      if (oppData) saveUser(guildId, oppData.g);
      await interaction.editReply({ embeds: [fn(interaction, title, render(board, turn, p1Name, p2Name, bet) + '\n\n' + desc).setFooter(balanceFooter(u))], components: rows(board, true) }).catch(()=>{});
    };

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 5*60*1000 });
    collector.on('collect', async i => {
      const expectedId = players[turn];
      if (expectedId !== 'BOT' && i.user.id !== expectedId) return i.reply({ content: '❌ ليس دورك.', ephemeral: true });
      const idx = parseInt(i.customId.split('_')[1], 10);
      if (board[idx]) return i.deferUpdate();
      board[idx] = turn;
      turn = turn === 'X' ? 'O' : 'X';
      let w = winner(board);
      if (w) { collector.stop(); await i.update({ embeds: [embed()], components: rows(board, true) }).catch(()=>{}); return finish(w); }
      // Bot move
      if (!opp && turn === 'O') {
        await i.update({ embeds: [embed()], components: rows(board, true) }).catch(()=>{});
        await new Promise(r => setTimeout(r, 700));
        const m = aiMove();
        board[m] = 'O'; turn = 'X';
        w = winner(board);
        if (w) { collector.stop(); await interaction.editReply({ embeds: [embed()], components: rows(board, true) }).catch(()=>{}); return finish(w); }
        await interaction.editReply({ embeds: [embed()], components: rows(board) }).catch(()=>{});
      } else {
        await i.update({ embeds: [embed()], components: rows(board) }).catch(()=>{});
      }
    });
    collector.on('end', async (_c, reason) => {
      if (reason === 'time') {
        if (bet > 0) { u.balance += bet; if (oppData) oppData.u.balance += bet; saveUser(guildId, g); if (oppData) saveUser(guildId, oppData.g); }
        await interaction.editReply({ components: rows(board, true) }).catch(()=>{});
      }
    });
  }
};
