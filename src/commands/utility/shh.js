const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS, DESIGN } = require('../../utils/embeds');

function toFxTwitter(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.includes('twitter.com') || host.includes('x.com')) {
      u.hostname = 'fixupx.com';
      return u.toString();
    }
  } catch (_) {}
  return url;
}

module.exports = {
  aliases: ['shh', 'اخبار', 'ميمز'],
  data: new SlashCommandBuilder()
    .setName('shh')
    .setDescription('نظام الأخبار والميمز المنظم')
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('إعداد قنوات الأخبار والميمز (للمسؤولين فقط)')
        .addChannelOption(o => o.setName('news_channel').setDescription('قناة أخبار الأنمي').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(o => o.setName('memes_channel').setDescription('قناة الميمز').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(o => o.setName('manhwa_channel').setDescription('قناة فصول المانهوا').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(o => o.setName('episodes_channel').setDescription('قناة حلقات الأنمي').addChannelTypes(ChannelType.GuildText))
        .addStringOption(o => o.setName('twitter').setDescription('رابط حساب تويتر (اختياري)'))
        .addStringOption(o => o.setName('telegram').setDescription('رابط/اسم قناة تلغرام (اختياري)'))
    )
    .addSubcommand(sub =>
      sub.setName('news')
        .setDescription('نشر خبر جديد يدوياً')
        .addStringOption(o => o.setName('content').setDescription('محتوى الخبر').setRequired(true))
        .addStringOption(o => o.setName('image').setDescription('رابط صورة للخبر (اختياري)').setRequired(false))
        .addStringOption(o => o.setName('source').setDescription('رابط المصدر (تويتر/تلغرام/أخرى)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('meme')
        .setDescription('نشر ميم جديد يدوياً')
        .addStringOption(o => o.setName('url').setDescription('رابط الميم (صورة أو GIF)').setRequired(true))
        .addStringOption(o => o.setName('caption').setDescription('وصف للميم (اختياري)').setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName('follow')
        .setDescription('متابعة قناة تلقائياً (تويتر، تلغرام، أو ريديت)')
        .addStringOption(o => o.setName('type').setDescription('نوع المنصة').setRequired(true).addChoices(
          { name: 'تويتر (Twitter)', value: 'twitter' },
          { name: 'ريديت (Reddit)', value: 'reddit' },
          { name: 'تلغرام (Telegram)', value: 'telegram' },
          { name: 'RSS Feed', value: 'rss' }
        ))
        .addStringOption(o => o.setName('handle').setDescription('الاسم أو الرابط (لـRSS: ضع رابط الـfeed)').setRequired(true))
        .addStringOption(o => o.setName('category').setDescription('تصنيف المحتوى لسهولة التوجيه').setRequired(true).addChoices(
          { name: 'أخبار الأنمي', value: 'news' },
          { name: 'الميمز', value: 'memes' },
          { name: 'فصول المانهوا', value: 'manhwa' },
          { name: 'حلقات الأنمي', value: 'episodes' }
        ))
        .addChannelOption(o => o.setName('target_channel').setDescription('القناة التي سيتم النشر فيها (اختياري، يتجاوز الافتراضي)').addChannelTypes(ChannelType.GuildText))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('عرض القنوات التي يتم متابعتها تلقائياً')
    )
    .addSubcommand(sub =>
      sub.setName('unfollow')
        .setDescription('إلغاء متابعة قناة تلقائية')
        .addStringOption(o => o.setName('id').setDescription('معرف المتابعة (من قائمة list)').setRequired(true))
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const subcommand = interaction.options.getSubcommand();
    const g = readGuild(guildId);
    g.channels = g.channels || {};

    if (subcommand === 'setup') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ هذا الأمر مخصص للمسؤولين فقط.', ephemeral: true });
      }

      const newsChan = interaction.options.getChannel('news_channel');
      const memesChan = interaction.options.getChannel('memes_channel');
      const manhwaChan = interaction.options.getChannel('manhwa_channel');
      const episodesChan = interaction.options.getChannel('episodes_channel');
      const twitter = interaction.options.getString('twitter');
      const telegram = interaction.options.getString('telegram');

      if (newsChan) g.channels.shh_news = newsChan.id;
      if (memesChan) g.channels.shh_memes = memesChan.id;
      if (manhwaChan) g.channels.shh_manhwa = manhwaChan.id;
      if (episodesChan) g.channels.shh_episodes = episodesChan.id;
      if (twitter) g.shh_twitter = twitter;

      writeGuild(guildId, g);

      const embed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('✅ تم تحديث الإعدادات')
        .setDescription(`تم ضبط الإعدادات بنجاح:\n\n📢 الأخبار: ${newsChan ? newsChan : (g.channels.shh_news ? `<#${g.channels.shh_news}>` : 'غير محددة')}\n🖼️ الميمز: ${memesChan ? memesChan : (g.channels.shh_memes ? `<#${g.channels.shh_memes}>` : 'غير محددة')}\n📖 المانهوا: ${manhwaChan ? manhwaChan : (g.channels.shh_manhwa ? `<#${g.channels.shh_manhwa}>` : 'غير محددة')}\n🎬 الحلقات: ${episodesChan ? episodesChan : (g.channels.shh_episodes ? `<#${g.channels.shh_episodes}>` : 'غير محددة')}\n🐦 تويتر: ${twitter || g.shh_twitter || 'غير محدد'}`)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'news') {
      const channelId = g.channels.shh_news;
      if (!channelId) return interaction.reply({ content: '❌ لم يتم إعداد قناة الأخبار بعد. استخدم `/shh setup`.', ephemeral: true });

      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) return interaction.reply({ content: '❌ قناة الأخبار المحددة غير موجودة أو لا يمكنني رؤيتها.', ephemeral: true });

      const content = interaction.options.getString('content');
      const image = interaction.options.getString('image');
      let source = interaction.options.getString('source');
      if (source && (source.includes('twitter.com') || source.includes('x.com'))) {
        source = toFxTwitter(source);
      }

      const isVideo = image && (image.endsWith('.mp4') || image.endsWith('.webm') || image.endsWith('.mov'));

      const embed = require('../../utils/embeds').createStyledEmbed(interaction, '📢 خبر عاجل ومميز', COLORS.info)
        .setDescription(`${DESIGN.separator}\n\n${content}\n\n${DESIGN.separator}`)
        .setFooter({ 
          text: `بواسطة: ${interaction.user.username} • سامي بوت`, 
          iconURL: interaction.user.displayAvatarURL() 
        });

      if (source) {
        let sourceEmoji = '🔗';
        let sourceName = 'المصدر الخارجي';
        if (source.includes('fixupx.com') || source.includes('twitter.com') || source.includes('x.com')) {
          sourceEmoji = '🐦';
          sourceName = 'تويتر (X)';
        }
        embed.addFields({ name: `${sourceEmoji} ${sourceName}`, value: `[اضغط هنا لمشاهدة التفاصيل](${source})` });
        embed.setURL(source);
      } else if (g.shh_twitter || g.shh_telegram) {
        const sources = [];
        if (g.shh_twitter) {
          const tw = toFxTwitter(g.shh_twitter);
          sources.push(`🐦 [تويتر](${tw})`);
        }
        embed.addFields({ name: '✨ تابعنا للمزيد', value: sources.join(' • ') });
      }

      if (image && image.startsWith('http')) {
        if (!isVideo) {
          embed.setImage(image);
        }
      } else {
        // Default stylish image if none provided
        embed.setThumbnail('https://cdn-icons-png.flaticon.com/512/2540/2540832.png');
      }

      await channel.send({ 
        content: isVideo ? image : null,
        embeds: [embed] 
      });
      return interaction.reply({ content: '✅ تم نشر الخبر بنجاح!', ephemeral: true });
    }

    if (subcommand === 'meme') {
      const channelId = g.channels.shh_memes;
      if (!channelId) return interaction.reply({ content: '❌ لم يتم إعداد قناة الميمز بعد. استخدم `/shh setup`.', ephemeral: true });

      const channel = interaction.guild.channels.cache.get(channelId);
      if (!channel) return interaction.reply({ content: '❌ قناة الميمز المحددة غير موجودة أو لا يمكنني رؤيتها.', ephemeral: true });

      const url = interaction.options.getString('url');
      const caption = interaction.options.getString('caption');

      if (!url.startsWith('http')) {
        return interaction.reply({ content: '❌ الرجاء تزويد رابط صحيح للمحتوى.', ephemeral: true });
      }

      const isTwitter = url.includes('twitter.com') || url.includes('x.com') || url.includes('mobile.twitter.com');
      const rewrittenUrl = isTwitter ? toFxTwitter(url) : url;
      const isVideo = isTwitter || url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.mov') || url.includes('youtube.com') || url.includes('youtu.be') || url.includes('tiktok.com');

      const embed = require('../../utils/embeds').createStyledEmbed(interaction, caption || '🖼️ محتوى جديد!', COLORS.premium)
        .setFooter({ text: `من: ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
      if (isTwitter) embed.setURL(rewrittenUrl);

      if (!isVideo) {
        embed.setImage(rewrittenUrl);
      }

      await channel.send({ 
        content: isVideo ? rewrittenUrl : null,
        embeds: [embed] 
      });
      return interaction.reply({ content: '✅ تم نشر المحتوى بنجاح!', ephemeral: true });
    }

    if (subcommand === 'follow') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ للمسؤولين فقط.', ephemeral: true });
      }

      const type = interaction.options.getString('type');
      const handle = interaction.options.getString('handle').replace('@', '');
      const category = interaction.options.getString('category');
      const targetChannel = interaction.options.getChannel('target_channel');

      g.shh_follows = g.shh_follows || [];
      const id = Math.random().toString(36).substring(7);
      
      g.shh_follows.push({ id, type, handle, category, channelId: targetChannel ? targetChannel.id : null, lastPost: null });
      writeGuild(guildId, g);

      const chanDisplay = targetChannel ? `<#${targetChannel.id}>` : `القناة الافتراضية لـ ${category}`;
      return interaction.reply({ content: `✅ يتم الآن متابعة **${handle}** على **${type}** تلقائياً في ${chanDisplay}.` });
    }

    if (subcommand === 'list') {
      const follows = g.shh_follows || [];
      const globalSources = [
        { type: 'twitter', handle: 'AnimeTherapy', category: 'news', label: 'أخبار الأنمي' },
        { type: 'twitter', handle: 'iconarabmemes', category: 'memes', label: 'الميمز' },
      ];

      const activeGlobals = globalSources.filter(s => {
        const catChan = {
          news: g.channels?.shh_news,
          memes: g.channels?.shh_memes,
          manhwa: g.channels?.shh_manhwa,
          episodes: g.channels?.shh_episodes
        }[s.category];
        return !!catChan;
      });

      if (follows.length === 0 && activeGlobals.length === 0) {
        return interaction.reply({ content: 'لا توجد قنوات متابعة حالياً. استخدم `/shh setup` لتفعيل المصادر العالمية أو `/shh follow` لمتابعة قنوات جديدة.' });
      }

      const embed = require('../../utils/embeds').createStyledEmbed(interaction, '📺 القنوات المتابعة تلقائياً', COLORS.info);

      const descriptions = [];

      if (activeGlobals.length > 0) {
        descriptions.push('**🌟 المصادر العالمية (Default):**');
        activeGlobals.forEach(s => {
          const chanId = {
            news: g.channels.shh_news,
            memes: g.channels.shh_memes,
            manhwa: g.channels.shh_manhwa,
            episodes: g.channels.shh_episodes
          }[s.category];
          descriptions.push(`- ${s.type === 'twitter' ? '🐦' : ''} **${s.handle}** (${s.label}) → <#${chanId}>`);
        });
      }

      if (follows.length > 0) {
        descriptions.push('\n**👤 المصادر المضافة يدوياً:**');
        follows.forEach(f => {
          const chanId = f.channelId || {
            news: g.channels?.shh_news,
            memes: g.channels?.shh_memes,
            manhwa: g.channels?.shh_manhwa,
            episodes: g.channels?.shh_episodes
          }[f.category];
          descriptions.push(`- \`${f.id}\` | ${f.type === 'twitter' ? '🐦' : ''} **${f.handle}** → ${chanId ? `<#${chanId}>` : 'غير محددة'}`);
        });
      }

      embed.setDescription(descriptions.join('\n'));
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'unfollow') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: '❌ للمسؤولين فقط.', ephemeral: true });
      }

      const id = interaction.options.getString('id');
      g.shh_follows = (g.shh_follows || []).filter(f => f.id !== id);
      writeGuild(guildId, g);

      return interaction.reply({ content: `✅ تم إلغاء المتابعة بنجاح.` });
    }
  }
};
