// 🧮 حاسبة آمنة — بدون eval
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function tokenize(expr) {
  const toks = [];
  let i = 0;
  const s = expr.replace(/[٠-٩]/g, (d) => AR_DIGITS.indexOf(d)).replace(/×/g, '*').replace(/÷/g, '/').replace(/،/g, '.').replace(/\s+/g, '');
  while (i < s.length) {
    const ch = s[i];
    if (/[\d.]/.test(ch)) {
      let num = '';
      while (i < s.length && /[\d.]/.test(s[i])) num += s[i++];
      toks.push({ t: 'n', v: parseFloat(num) });
    } else if ('+-*/()%'.includes(ch)) {
      toks.push({ t: 'o', v: ch });
      i++;
    } else return null; // حرف غير مسموح
  }
  return toks;
}

function evaluate(toks) {
  // shunting-yard
  const out = [], ops = [];
  const prec = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, 'u-': 3 };
  let prev = null;
  for (const tk of toks) {
    if (tk.t === 'n') { out.push(tk.v); prev = tk; continue; }
    if (tk.v === '(') { ops.push(tk.v); prev = tk; continue; }
    if (tk.v === ')') {
      while (ops.length && ops[ops.length - 1] !== '(') out.push(ops.pop());
      if (!ops.length) return null;
      ops.pop(); prev = tk; continue;
    }
    if (tk.v === '-' && (!prev || prev.t === 'o' || prev.v === '(')) { ops.push('u-'); prev = tk; continue; }
    while (ops.length && prec[ops[ops.length - 1]] >= prec[tk.v]) out.push(ops.pop());
    ops.push(tk.v); prev = tk;
  }
  while (ops.length) { const op = ops.pop(); if (op === '(') return null; out.push(op); }
  const st = [];
  for (const item of out) {
    if (typeof item === 'number') { st.push(item); continue; }
    if (item === 'u-') { if (!st.length) return null; st.push(-st.pop()); continue; }
    if (st.length < 2) return null;
    const b = st.pop(), a = st.pop();
    let r;
    switch (item) {
      case '+': r = a + b; break;
      case '-': r = a - b; break;
      case '*': r = a * b; break;
      case '/': if (b === 0) return null; r = a / b; break;
      case '%': r = a % b; break;
      default: return null;
    }
    if (!isFinite(r)) return null;
    st.push(r);
  }
  return st.length === 1 ? st[0] : null;
}

function calc(expr) {
  const toks = tokenize(expr);
  if (!toks) return null;
  return evaluate(toks);
}

module.exports = {
  aliases: ['حاسبه', 'احسب', 'رياضيات'],
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('calc')
    .setDescription('🧮 حاسبة — اكتب عملية حسابية')
    .addStringOption(o => o.setName('expression').setDescription('مثال: 5+5*2').setRequired(true).setMaxLength(100)),
  async execute(interaction) {
    const raw = interaction.options?.getString?.('expression') || interaction.options?._args?.join(' ') || '';
    if (!raw.trim()) return interaction.reply({ content: '❌ اكتب العملية. مثال: `حاسبة 5+5*2`', ephemeral: true });
    const result = calc(raw);
    if (result === null) return interaction.reply({ content: '❌ تعذر حساب هذا — استخدم أرقاماً و (+ - * / % وأقواس) فقط.', ephemeral: true });
    const pretty = Math.abs(result) >= 1e15 ? result.toExponential(6) : String(Math.round(result * 1e10) / 1e10);
    const embed = new EmbedBuilder()
      .setTitle('🧮 الحاسبة')
      .setDescription(`\`${raw.trim()}\` = **${pretty}**`)
      .setColor(0x4CC9F0)
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};
