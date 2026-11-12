// 🌐 ترجمة فورية — عربي ↔ إنجليزي (MyMemory المجانية + قاموس احتياطي)
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const FALLBACK = {
  'hello': 'مرحباً', 'hi': 'أهلاً', 'good morning': 'صباح الخير', 'good night': 'تصبح على خير',
  'thank you': 'شكراً', 'thanks': 'شكراً', 'how are you': 'كيف حالك', 'i love you': 'أحبك',
  'welcome': 'أهلاً وسهلاً', 'goodbye': 'إلى اللقاء', 'yes': 'نعم', 'no': 'لا', 'ok': 'حسناً',
  'what is your name': 'ما اسمك', 'my name is': 'اسمي هو', 'please': 'من فضلك', 'sorry': 'عذراً',
  'مرحبا': 'Hello', 'اهلا': 'Hi', 'صباح الخير': 'Good morning', 'مساء الخير': 'Good evening',
  'شكرا': 'Thank you', 'كيف حالك': 'How are you', 'احبك': 'I love you', 'مع السلامه': 'Goodbye',
  'نعم': 'Yes', 'لا': 'No', 'من فضلك': 'Please', 'عفوا': 'Sorry / You are welcome',
  'ما اسمك': 'What is your name', 'اسمي': 'My name is', 'تصبح على خير': 'Good night',
};

function isArabic(t) { return /[\u0600-\u06FF]/.test(t); }

async function fetchTranslation(text, from, to) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    const res = await Promise.race([fetch(url), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))]);
    const data = await res.json();
    const out = data?.responseData?.translatedText;
    if (out && !/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(out)) return out;
  } catch {}
  return null;
}

module.exports = {
  aliases: ['ترجمه', 'ترجم', 'معني'],
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('🌐 ترجمة نص عربي ↔ إنجليزي')
    .addStringOption(o => o.setName('text').setDescription('النص للترجمة').setRequired(true).setMaxLength(500)),
  async execute(interaction) {
    let text = interaction.options?.getString?.('text') || '';
    if (interaction.isMessage?.()) text = (interaction.options?._args || []).join(' ');
    text = String(text || '').trim();
    if (!text) return interaction.reply({ content: '❌ اكتب النص للترجمة. مثال: `ترجمة hello` أو `ترجمة كيف حالك`', ephemeral: true });
    if (text.length > 500) text = text.slice(0, 500);

    const ar = isArabic(text);
    const from = ar ? 'ar' : 'en';
    const to = ar ? 'en' : 'ar';

    let translated = await fetchTranslation(text, from, to);
    let via = 'MyMemory';
    if (!translated) {
      const key = text.toLowerCase().trim();
      translated = FALLBACK[key] || FALLBACK[text.trim()];
      via = 'قاموس البوت';
    }
    if (!translated) return interaction.reply({ content: '❌ تعذرت الترجمة الآن — جرّب نصاً أقصر أو لاحقاً.', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🌐 الترجمة')
      .addFields(
        { name: ar ? '🇮🇶 العربية' : '🇬🇧 English', value: text.slice(0, 1024) },
        { name: ar ? '🇬🇧 English' : '🇮🇶 العربية', value: String(translated).slice(0, 1024) },
      )
      .setColor(0x4CC9F0)
      .setFooter({ text: `المصدر: ${via}` })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};
