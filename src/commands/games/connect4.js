// كونكت 4 — PvP + AI بحث Alpha-Beta
const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { fmt, getUser, saveUser, bumpStat, brandedEmbed, winEmbed, loseEmbed, tieEmbed, balanceFooter, safeReply, errorEmbed, CURRENCY } = require('../../utils/gameHelpers');
const { COLORS } = require('../../utils/embeds');

const W = 7, H = 6;
const newBoard = () => Array.from({ length: H }, () => Array(W).fill(0));
const drop = (b, c, p) => { for (let r = H-1; r >= 0; r--) if (!b[r][c]) { b[r][c] = p; return r; } return -1; };
const undrop = (b, c) => { for (let r = 0; r < H; r++) if (b[r][c]) { b[r][c] = 0; return; } };

function checkWin(b, p) {
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (b[r][c] !== p) continue;
    for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
      let k = 1;
      while (k < 4) { const rr = r+dr*k, cc = c+dc*k; if (rr<0||rr>=H||cc<0||cc>=W||b[rr][cc]!==p) break; k++; }
      if (k === 4) return true;
    }
  }
  return false;
}
const isFull = b => b[0].every(v => v);

function score(b, p) {
  // simple heuristic: count center + threats
  let s = 0; const o = p === 1 ? 2 : 1;
  for (let r = 0; r < H; r++) if (b[r][3] === p) s += 3;
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    if (b[r][c] !== p) continue;
    for (const [dr, dc] of [[0,1],[1,0],[1,1],[1,-1]]) {
      let me = 0, op = 0;
      for (let k = 0; k < 4; k++) { const rr=r+dr*k, cc=c+dc*k; if (rr<0||rr>=H||cc<0||cc>=W) { me=-1; break; } if (b[rr][cc]===p) me++; else if (b[rr][cc]===o) op++; }
      if (me >= 0 && op === 0) s += me*me;
    }
  }
  return s;
}

function alphabeta(b, depth, a, beta, max, p) {
  const o = p === 1 ? 2 : 1;
  if (checkWin(b, p)) return max ? 10000 - (4-depth) : -10000 + (4-depth);
  if (checkWin(b, o)) return max ? -10000 + (4-depth) : 10000 - (4-depth);
  if (depth === 0 || isFull(b)) return score(b, p) - score(b, o);
  let best = max ? -Infinity : Infinity;
  for (const c of [3,2,4,1,5,0,6]) {
    if (b[0][c]) continue;
    const r = drop(b, c, max ? p : o);
    const v = alphabeta(b, depth-1, a, beta, !max, p);
    b[r][c] = 0;
    if (max) { best = Math.max(best, v); a = Math.max(a, v); } else { best = Math.min(best, v); beta = Math.min(beta, v); }
    if (beta <= a) break;
  }
  return best;
}

function bestMove(b, p, depth = 5) {
  let best = -Infinity, mv = 3;
  for (const c of [3,2,4,1,5,0,6]) {
    if (b[0][c]) continue;
    const r = drop(b, c, p);
    const v = alphabeta(b, depth-1, -Infinity, Infinity, false, p);
    b[r][c] = 0;
    if (v > best) { best = v; mv = c; }
  }
  return mv;
}

function render(b, turn, p1, p2, bet) {
  const sym = [' ⚪ ', ' 🔴 ', ' 🟡 '];
  let g = '';
  for (let r = 0; r < H; r++) { for (let c = 0; c < W; c++) g += b[r][c] === 1 ? '🔴' : b[r][c] === 2 ? '🟡' : '⚫'; g += '\n'; }
  g += '1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣';
  return `${g}\n\n🔴 ${p1}\n🟡 ${p2}\n\n🎯 الدور: **${turn === 1 ? p1 : p2}**` + (bet ? `\n💰 الرهان: **${fmt(bet)}** ${CURRENCY}` : '');
}

function btnRows(b, disabled = false) {
  const r1 = new ActionRowBuilder(), r2 = new ActionRowBuilder();
  for (let c = 0; c < 4; c++) r1.addComponents(new ButtonBuilder().setCustomId(`c4_${c}`).setLabel(`${c+1}`).setStyle(ButtonStyle.Primary).setDisabled(disabled || !!b[0][c]));
  for (let c = 4; c < 7; c++) r2.addComponents(new ButtonBuilder().setCustomId(`c4_${c}`).setLabel(`${c+1}`).setStyle(ButtonStyle.Primary).setDisabled(disabled || !!b[0][c]));
  r2.addComponents(new ButtonBuilder().setCustomId('c4_quit').setLabel('🛑').setStyle(ButtonStyle.Danger));
  return [r1, r2];
}

module.exports = {
  aliases: ['c4', 'كونكت'],
  data: new SlashCommandBuilder()
    .setName('connect4')
    .setDescription('🔴🟡 اربط 4 — العب ضد البوت أو لاعب')
    .addUserOption(o => o.setName('opponent').setDescription('خصم بشري'))
    .addStringOption(o => o.setName('difficulty').setDescription('صعوبة البوت').addChoices({name:'سهل',value:'2'},{name:'متوسط',value:'4'},{name:'صعب',value:'6'}))
    .addIntegerOption(o => o.setName('bet').setDescription('رهان').setMinValue(0)),

  async execute(interaction) {
    const opp = interaction.options.getUser('opponent');
    const depth = parseInt(interaction.options.getString('difficulty') || '5', 10);
    const bet = interaction.options.getInteger('bet') || 0;
    const userId = interaction.user.id, guildId = interaction.guild.id;
    if (opp?.bot || opp?.id === userId) return safeReply(interaction, { embeds: [errorEmbed('خصم غير صالح', 'اختر لاعباً آخر.')], ephemeral: true });

    const { g, u } = getUser(guildId, userId);
    let oppData = null;
    if (opp) oppData = getUser(guildId, opp.id);
    if (bet > 0) {
      if (u.balance < bet) return safeReply(interaction, { embeds: [errorEmbed('رصيد غير كافٍ', '')], ephemeral: true });
      if (oppData && oppData.u.balance < bet) return safeReply(interaction, { embeds: [errorEmbed('رصيد الخصم', '')], ephemeral: true });
      u.balance -= bet; if (oppData) oppData.u.balance -= bet; saveUser(guildId, g); if (oppData) saveUser(guildId, oppData.g);
    }

    const board = newBoard(); let turn = 1;
    const p1 = interaction.member?.displayName || interaction.user.username;
    const p2 = opp ? opp.username : `🤖 البوت`;
    const players = { 1: userId, 2: opp ? opp.id : 'BOT' };
    const embed = () => brandedEmbed(interaction, '🔴🟡 اربط 4', COLORS.primary).setDescription(render(board, turn, p1, p2, bet));
    const msg = await safeReply(interaction, { embeds: [embed()], components: btnRows(board) });

    const finish = async (result) => {
      let fn, title, desc;
      if (result === 'tie') {
        if (bet) { u.balance += bet; if (oppData) oppData.u.balance += bet; }
        fn = tieEmbed; title = 'تعادل'; desc = 'الرهانات مستردة.';
      } else {
        const wid = players[result];
        if (wid === userId) { if (bet) u.balance += bet*2; fn = winEmbed; title = `فاز ${p1}`; desc = bet ? `+${fmt(bet)} ${CURRENCY}` : '🎉'; bumpStat(u,'c4_wins'); }
        else if (wid === 'BOT') { fn = loseEmbed; title = 'البوت فاز'; desc = bet ? `-${fmt(bet)} ${CURRENCY}` : ''; }
        else { if (bet) oppData.u.balance += bet*2; fn = loseEmbed; title = `فاز ${p2}`; desc = ''; }
      }
      bumpStat(u, 'c4_count'); saveUser(guildId, g); if (oppData) saveUser(guildId, oppData.g);
      await interaction.editReply({ embeds: [fn(interaction, title, render(board, turn, p1, p2, bet) + '\n\n' + desc).setFooter(balanceFooter(u))], components: btnRows(board, true) }).catch(()=>{});
    };

    const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 5*60*1000 });
    collector.on('collect', async i => {
      if (i.customId === 'c4_quit') { collector.stop('quit'); return finish(turn === 1 ? 2 : 1); }
      const expected = players[turn];
      if (expected !== 'BOT' && i.user.id !== expected) return i.reply({ content: '❌ ليس دورك.', ephemeral: true });
      const c = parseInt(i.customId.split('_')[1], 10);
      if (board[0][c]) return i.deferUpdate();
      drop(board, c, turn);
      if (checkWin(board, turn)) { collector.stop(); await i.update({ embeds: [embed()], components: btnRows(board, true) }).catch(()=>{}); return finish(turn); }
      if (isFull(board)) { collector.stop(); await i.update({ embeds: [embed()], components: btnRows(board, true) }).catch(()=>{}); return finish('tie'); }
      turn = turn === 1 ? 2 : 1;
      if (!opp && turn === 2) {
        await i.update({ embeds: [embed()], components: btnRows(board, true) }).catch(()=>{});
        await new Promise(r => setTimeout(r, 600));
        const mv = bestMove(board, 2, depth);
        drop(board, mv, 2);
        if (checkWin(board, 2)) { collector.stop(); await interaction.editReply({ embeds: [embed()], components: btnRows(board, true) }).catch(()=>{}); return finish(2); }
        if (isFull(board)) { collector.stop(); return finish('tie'); }
        turn = 1;
        await interaction.editReply({ embeds: [embed()], components: btnRows(board) }).catch(()=>{});
      } else {
        await i.update({ embeds: [embed()], components: btnRows(board) }).catch(()=>{});
      }
    });
  }
};
