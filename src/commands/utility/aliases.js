const { SlashCommandBuilder } = require('discord.js');
const { COLORS } = require('../../utils/embeds');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const config = require('../../config');
const aliasEngine = require('../../utils/aliasEngine');
const { getCommand } = require('../../handlers/commandHandler');

module.exports = {
  aliases: ['اختصارات', 'اختصار'],
  data: new SlashCommandBuilder()
    .setName('aliases')
    .setDescription('📚 الاختصارات العربية — قائمة + إضافة خاصة بالسيرفر')
    .addSubcommand(s => s.setName('list').setDescription('عرض الاختصارات'))
    .addSubcommand(s => s.setName('add').setDescription('إضافة اختصار خاص بالسيرفر (للإداريين)')
      .addStringOption(o => o.setName('word').setDescription('الكلمة المختصرة').setRequired(true).setMaxLength(30))
      .addStringOption(o => o.setName('command').setDescription('اسم الأمر').setRequired(true).setMaxLength(32)))
    .addSubcommand(s => s.setName('remove').setDescription('حذف اختصار خاص بالسيرفر (للإداريين)')
      .addStringOption(o => o.setName('word').setDescription('الكلمة').setRequired(true).setMaxLength(30))),
  async execute(interaction) {
    const sub = interaction.options?.getSubcommand?.(false) || 'list';
    const guildId = interaction.guild?.id;

    if (sub === 'add') {
      const canManage = interaction.member?.permissions?.has?.('ManageGuild') || interaction.member?.permissions?.has?.('Administrator');
      if (!canManage) return interaction.reply({ content: '❌ إضافة الاختصارات للإداريين فقط.', ephemeral: true });
      let word = interaction.options?.getString?.('word') || '';
      let cmdName = (interaction.options?.getString?.('command') || '').toLowerCase();
      // الشات: «اختصار اضف ف رصيد»
      const args = interaction.options?._args || [];
      if (interaction.isMessage?.() && args.length >= 2) { [word, cmdName] = [args[0], String(args[1]).toLowerCase()]; }
      word = aliasEngine.norm(word);
      if (!word || !cmdName) return interaction.reply({ content: '❌ الاستخدام: `اختصار اضف <الكلمة> <الأمر>` — مثال: `اختصار اضف ف رصيد`', ephemeral: true });
      if (!getCommand(cmdName)) return interaction.reply({ content: `❌ الأمر \`${cmdName}\` غير موجود. اكتب اسمه كما في /help`, ephemeral: true });
      const g = readGuild(guildId);
      g.customAliases = g.customAliases || {};
      g.customAliases[word] = cmdName;
      writeGuild(guildId, g);
      return interaction.reply({ content: `✅ تم! من الآن كتابة **${word}** في الشات تشغّل \`${cmdName}\`` });
    }

    if (sub === 'remove') {
      const canManage = interaction.member?.permissions?.has?.('ManageGuild') || interaction.member?.permissions?.has?.('Administrator');
      if (!canManage) return interaction.reply({ content: '❌ حذف الاختصارات للإداريين فقط.', ephemeral: true });
      let word = interaction.options?.getString?.('word') || (interaction.options?._args?.[0]) || '';
      word = aliasEngine.norm(word);
      const g = readGuild(guildId);
      if (!g.customAliases?.[word]) return interaction.reply({ content: `❌ لا يوجد اختصار مخصص باسم **${word}**.`, ephemeral: true });
      delete g.customAliases[word];
      writeGuild(guildId, g);
      return interaction.reply({ content: `🗑️ تم حذف الاختصار **${word}**.` });
    }

    // ===== القائمة v23: أقسام قابلة للتصفح =====
    const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
    const custom = aliasEngine.listCustom(guildId);
    const show = (w) => `\`${w.replace(/_/g, ' ')}\``;
    const home = () => {
      const e = new EmbedBuilder().setColor(COLORS.royal).setTitle('📚 الاختصارات العربية')
        .setDescription([
          `اكتب الكلمة **مباشرة في الشات** بدون \`/\` — البوت يفهم **${aliasEngine.wordCount()}** كلمة وعبارة بكل اللهجات.`,
          '',
          '> 💬 عبارات طبيعية: `كم رصيدي` · `لو خيروك` · `خمن الرقم` · `قفل الروم`',
          '> 🎯 مع رهان: `سلوت 500` · `صاروخ 1k 2` · `سباق الكل 3`',
          '> 🛡️ الكلام العادي محمي: «رصيد البنك خربان» لا يشغّل أمراً',
          '',
          '📂 اختر قسماً من القائمة لعرض كل كلماته.',
        ].join('\n'))
        .setFooter({ text: `الإداري يضيف: اختصار اضف <كلمة> <أمر> • ${config.SERVER_NAME}` });
      for (const sec of aliasEngine.SECTIONS) {
        const n = sec.cmds.reduce((a, c) => a + aliasEngine.wordsFor(c).length, 0);
        e.addFields({ name: sec.title, value: `${n} كلمة · ${sec.cmds.length} أمر`, inline: true });
      }
      const cl = Object.entries(custom).slice(0, 15).map(([w, c]) => `${show(w)} → \`${c}\``);
      if (cl.length) e.addFields({ name: '📌 اختصارات هذا السيرفر', value: cl.join('\n') });
      return e;
    };
    const section = (key) => {
      const sec = aliasEngine.SECTIONS.find((x) => x.key === key);
      const e = new EmbedBuilder().setColor(COLORS.primary).setTitle(`${sec.title} — الاختصارات`);
      let total = 0;
      for (const c of sec.cmds) {
        const ws = aliasEngine.wordsFor(c);
        if (!ws.length) continue;
        total += ws.length;
        let val = ws.slice(0, 40).map(show).join(' ');
        if (val.length > 1000) val = val.slice(0, 990).replace(/\s\S*$/, '') + ' …';
        e.addFields({ name: `/${c}`, value: val });
      }
      return e.setFooter({ text: `${total} كلمة في هذا القسم` });
    };
    const id = `aliasesv_${interaction.user.id}_${Date.now()}`;
    const menu = (cur) => new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(id).setPlaceholder('📂 اختر قسماً...')
      .addOptions([{ label: 'الرئيسية', value: 'home', emoji: '🏠', default: cur === 'home' },
        ...aliasEngine.SECTIONS.map((x) => ({ label: x.title.replace(/^\S+\s/, ''), value: x.key, emoji: x.title.split(' ')[0], default: cur === x.key }))]));
    const msg = await interaction.reply({ embeds: [home()], components: [menu('home')], fetchReply: true });
    if (!msg?.createMessageComponentCollector) return;
    const col = msg.createMessageComponentCollector({ filter: (i) => i.customId === id, time: 180000 });
    col.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ اكتب `اختصارات` لفتح قائمتك.', ephemeral: true }).catch(() => {});
      const v = i.values[0];
      await i.update({ embeds: [v === 'home' ? home() : section(v)], components: [menu(v)] }).catch(() => {});
    });
    col.on('end', () => msg.edit({ components: [] }).catch(() => {}));
  }
};
