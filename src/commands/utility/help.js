// 📚 /help — دليل أوامر منظم يُبنى تلقائياً من كل الأوامر المحمّلة
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embeds');
const config = require('../../config');

const CATEGORIES = {
  games: { label: 'الألعاب', emoji: '🎮', color: COLORS.phantom, desc: 'ألعاب فردية وجماعية وتحديات' },
  economy: { label: 'الاقتصاد', emoji: '💰', color: COLORS.gold, desc: 'المال، العمل، البنك والاستثمار' },
  rpg: { label: 'RPG والمستويات', emoji: '⚔️', color: COLORS.cyan, desc: 'الدانجون، المزرعة، الرتب والمتصدرين' },
  utility: { label: 'أدوات عامة', emoji: '🛠️', color: COLORS.info, desc: 'أدوات مساعدة، AI، تذكير وغيرها' },
  admin: { label: 'الإدارة', emoji: '⚙️', color: COLORS.error, desc: 'إعدادات السيرفر والشات بوت' },
};
const PER_PAGE = 12;

function collect(client) {
  const unique = new Map();
  for (const cmd of client.commands.values()) {
    const name = cmd.data?.name;
    if (!name || unique.has(name) || name === 'test' || name === 'reload') continue;
    unique.set(name, cmd);
  }
  const byCat = {};
  for (const cmd of unique.values()) {
    const cat = CATEGORIES[cmd.category] ? cmd.category : 'utility';
    (byCat[cat] = byCat[cat] || []).push(cmd);
  }
  for (const k of Object.keys(byCat)) byCat[k].sort((a, b) => a.data.name.localeCompare(b.data.name));
  return { byCat, total: unique.size };
}

function homeEmbed(interaction, data) {
  const e = new EmbedBuilder().setColor(COLORS.royal)
    .setAuthor({ name: `${interaction.client.user.username} • دليل الأوامر`, iconURL: interaction.client.user.displayAvatarURL() })
    .setDescription([
      `أهلاً <@${interaction.user.id}> 👋`,
      `يحتوي البوت على **${data.total}** أمر مقسمة على ${Object.keys(data.byCat).length} أقسام.`,
      '',
      `> 🔹 الأوامر بالسلاش: \`/اسم_الأمر\``,
      `> 🔹 بالبادئة: \`${config.prefix || '!'}اسم_الأمر\``,
      '> 🔹 بالعربي مباشرة: `رصيد` ، `يومي` ، `جماعي كراسي` ...',
      '> 🤖 تكلم مع البوت بالمنشن أو بذكر اسمه!',
    ].join('\n'))
    .setFooter({ text: `اختر قسماً من القائمة • ${config.SERVER_NAME}` })
    .setTimestamp();
  for (const [key, c] of Object.entries(CATEGORIES)) {
    if (!data.byCat[key]) continue;
    e.addFields({ name: `${c.emoji} ${c.label} — ${data.byCat[key].length}`, value: c.desc, inline: true });
  }
  return e;
}

function categoryEmbed(cat, data, page) {
  const c = CATEGORIES[cat];
  const list = data.byCat[cat] || [];
  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const slice = list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
  const lines = slice.map((cmd) => {
    const al = (cmd.aliases || []).filter((a) => /[\u0600-\u06FF]/.test(a)).slice(0, 2);
    return `**\`/${cmd.data.name}\`** — ${cmd.data.description || ''}${al.length ? `\n> اختصار: ${al.map((a) => `\`${a}\``).join(' ')}` : ''}`;
  });
  return new EmbedBuilder().setColor(c.color).setTitle(`${c.emoji} ${c.label}`)
    .setDescription(lines.join('\n') || '—')
    .setFooter({ text: `صفحة ${page + 1}/${pages} • ${list.length} أمر` });
}

function menu(id, current) {
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`${id}_cat`).setPlaceholder('📂 اختر قسماً...')
    .addOptions([{ label: 'الرئيسية', value: 'home', emoji: '🏠', default: current === 'home' },
      ...Object.entries(CATEGORIES).map(([value, c]) => ({ label: c.label, value, emoji: c.emoji, description: c.desc, default: current === value }))]));
}

function nav(id, page, pages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`${id}_prev`).setEmoji('◀️').setStyle(ButtonStyle.Secondary).setDisabled(page <= 0),
    new ButtonBuilder().setCustomId(`${id}_next`).setEmoji('▶️').setStyle(ButtonStyle.Secondary).setDisabled(page >= pages - 1),
  );
}

module.exports = {
  aliases: ['مساعدة', 'اوامر', 'دليل'],
  data: new SlashCommandBuilder().setName('help').setDescription('📚 دليل الأوامر المنظم'),
  async execute(interaction) {
    const data = collect(interaction.client);
    const id = `help_${interaction.user.id}_${Date.now()}`;
    let cat = 'home';
    let page = 0;
    let homeFile = null;
    try {
      const kit = require('../../utils/cardKit');
      const themes = { games: 'emerald', economy: 'gold', rpg: 'violet', utility: 'azure', admin: 'crimson' };
      const card = await kit.helpCard({
        botName: interaction.client.user.username,
        categories: Object.entries(CATEGORIES).filter(([k]) => data.byCat[k]).map(([k, c]) => ({
          name: c.label, icon: c.emoji, theme: themes[k],
          commands: data.byCat[k].map((cmd) => (cmd.aliases || []).find((a) => /[\u0600-\u06FF]/.test(a)) || cmd.data.name),
        })),
      });
      if (card) homeFile = card.buffer;
    } catch {}
    const render = () => {
      if (cat === 'home') {
        const e = homeEmbed(interaction, data);
        if (!homeFile) return { embeds: [e], components: [menu(id, cat)], attachments: [] };
        e.setImage('attachment://help.png');
        return { embeds: [e], files: [new AttachmentBuilder(homeFile, { name: 'help.png' })], components: [menu(id, cat)], attachments: [] };
      }
      const pages = Math.max(1, Math.ceil((data.byCat[cat] || []).length / PER_PAGE));
      const comps = [menu(id, cat)];
      if (pages > 1) comps.push(nav(id, page, pages));
      return { embeds: [categoryEmbed(cat, data, page)], components: comps, files: [], attachments: [] };
    };

    const msg = await interaction.reply({ ...render(), fetchReply: true });
    if (!msg?.createMessageComponentCollector) return;
    const col = msg.createMessageComponentCollector({ filter: (i) => i.customId.startsWith(id), time: 180000 });
    col.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ اكتب `/help` لفتح قائمتك الخاصة.', ephemeral: true }).catch(() => {});
      if (i.customId.endsWith('_cat')) { cat = i.values[0]; page = 0; }
      else if (i.customId.endsWith('_prev')) page = Math.max(0, page - 1);
      else if (i.customId.endsWith('_next')) page += 1;
      await i.update(render()).catch(() => {});
    });
    col.on('end', () => msg.edit({ components: [] }).catch(() => {}));
  },
};
