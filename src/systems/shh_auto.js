const { EmbedBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../utils/guildStorage');
const { COLORS, DESIGN, createStyledEmbed, getFollowEmbedColor } = require('../utils/embeds');
const logger = require('../utils/logger');

module.exports = {
  start(client) {
    // Check every 5 minutes (reduced from 15 for faster updates)
    setInterval(async () => {
      client.guilds.cache.forEach(async guild => {
        try {
          const g = readGuild(guild.id);
          const follows = g.shh_follows || [];
          
          // Automatic global sources from the user
          const globalSources = [
            { type: 'twitter', handle: 'AnimeTherapy', category: 'news' },
            { type: 'telegram', handle: 'animeatk_ep', category: 'episodes' },
            { type: 'twitter', handle: 'iconarabmemes', category: 'memes' },
            { type: 'telegram', handle: 'nn7on', category: 'manhwa' }
          ];

          // Merge local follows with global sources for checking
          const allToFollow = [...follows];
          
          // Helper to get target channel for a category
          const getCategoryChannel = (cat) => {
            switch(cat) {
              case 'news': return g.channels.shh_news;
              case 'memes': return g.channels.shh_memes;
              case 'manhwa': return g.channels.shh_manhwa;
              case 'episodes': return g.channels.shh_episodes;
              default: return null;
            }
          };

          // Add global sources if corresponding channels are set and not already followed locally
          globalSources.forEach(s => {
            const targetId = getCategoryChannel(s.category);
            if (targetId && !follows.find(f => f.handle === s.handle)) {
              allToFollow.push({ ...s, channelId: targetId, isGlobal: true });
            }
          });

          if (allToFollow.length === 0) return;

          for (const follow of allToFollow) {
            try {
              let latestData = null;
              if (follow.type === 'telegram') {
                latestData = await this.fetchTelegram(follow.handle);
              } else if (follow.type === 'reddit') {
                latestData = await this.fetchReddit(follow.handle);
              } else if (follow.type === 'twitter') {
                latestData = await this.fetchTwitter(follow.handle);
              } else if (follow.type === 'rss') {
                latestData = await this.fetchRSS(follow.handle);
              }

              if (latestData) {
                const lastPost = follow.isGlobal ? g.shh_global_lasts?.[follow.handle] : follow.lastPost;

                if (!lastPost) {
                  // First time: Save ID AND send the latest post to confirm it's working
                  if (follow.isGlobal) {
                    g.shh_global_lasts = g.shh_global_lasts || {};
                    g.shh_global_lasts[follow.handle] = latestData.id;
                  } else {
                    follow.lastPost = latestData.id;
                  }
                  writeGuild(guild.id, g);
                  
                  // Proceed to send the first post instead of 'continue'
                }

                if (latestData.id !== lastPost) {
                  // If channelId is null in follow (local follow), try to get it from category
                  const channelId = follow.channelId || getCategoryChannel(follow.category);
                  const channel = guild.channels.cache.get(channelId);
                  
                  if (channel) {
                    const categoryEmoji = {
                      news: '📢',
                      memes: '🖼️',
                      manhwa: '📖',
                      episodes: '🎬'
                    }[follow.category] || '📺';

                    const color = getFollowEmbedColor(follow.type, follow.category);
                    
                    if (follow.type === 'twitter') {
                      // For Twitter, send the raw fxtwitter link directly for rich preview
                      await channel.send({ content: latestData.url });
                    } else if (latestData.image) {
                      const embed = createStyledEmbed(guild, latestData.title || `${categoryEmoji} مصدر جديد`, color)
                        .setAuthor({ name: `${categoryEmoji} ${follow.type === 'twitter' ? 'Twitter' : (follow.type === 'reddit' ? 'Reddit' : 'Telegram')}: ${follow.handle}` })
                        .setDescription(`${DESIGN.thin_separator}\n\n${latestData.content}\n\n${DESIGN.thin_separator}`)
                        .setURL(latestData.url);

                      const isVideo = latestData.image.endsWith('.mp4') || latestData.image.endsWith('.webm') || latestData.image.endsWith('.mov');
                      if (isVideo) {
                        await channel.send({ content: latestData.image, embeds: [embed] });
                      } else {
                        embed.setImage(latestData.image);
                        await channel.send({ embeds: [embed] });
                      }
                    } else {
                      const embed = createStyledEmbed(guild, latestData.title || `${categoryEmoji} مصدر جديد`, color)
                        .setAuthor({ name: `${categoryEmoji} ${follow.type === 'twitter' ? 'Twitter' : (follow.type === 'reddit' ? 'Reddit' : 'Telegram')}: ${follow.handle}` })
                        .setDescription(`${DESIGN.thin_separator}\n\n${latestData.content}\n\n${DESIGN.thin_separator}`)
                        .setURL(latestData.url);
                      await channel.send({ embeds: [embed] });
                    }
                    
                    if (follow.isGlobal) {
                      g.shh_global_lasts[follow.handle] = latestData.id;
                    } else {
                      follow.lastPost = latestData.id;
                    }
                    writeGuild(guild.id, g);
                  }
                }
              }
            } catch (err) {
              logger.error(`[SHH_AUTO] Error fetching ${follow.type} for ${follow.handle}: ${err.message}`);
            }
          }
        } catch (err) {
          logger.error(`Error in shh_auto for guild ${guild.id}: ${err.message}`);
        }
      });
    }, 5 * 60 * 1000); // Check every 5 minutes
  },

  async fetchTwitter(handle) {
    try {
      // Updated list of active Nitter bridges (Nitter is unstable, multiple bridges help)
      const bridges = [
        'https://nitter.net',
        'https://xcancel.com',
        'https://lightbrd.com',
        'https://nitter.poast.org',
        'https://nitter.tiekoetter.com'
      ];
      
      let xml = null;
      let bridgeUsed = '';
      
      for (const bridge of bridges) {
        try {
          logger.info(`[SHH] Trying Twitter bridge: ${bridge} for handle: ${handle}`);
          const response = await fetch(`${bridge}/${handle}/rss`, { 
            headers: { 
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
            },
            signal: AbortSignal.timeout(15000) 
          });
          if (response.ok) {
            xml = await response.text();
            if (xml.includes('<item>')) {
              bridgeUsed = bridge;
              logger.info(`[SHH] Successfully fetched Twitter RSS from ${bridge} for ${handle}`);
              break;
            }
          }
        } catch (e) {
          logger.warn(`[SHH] Bridge ${bridge} failed for ${handle}: ${e.message}`);
          continue;
        }
      }

      if (!xml || !xml.includes('<item>')) {
        logger.error(`[SHH] Failed to fetch any Twitter posts for ${handle} from all bridges.`);
        return null;
      }

      // Basic XML parsing for RSS feed
      const items = xml.split('<item>');
      if (items.length < 2) return null;
      const lastItem = items[1];

      const idMatch = lastItem.match(/<guid[^>]*>([^<]+)<\/guid>/);
      const rawGuid = idMatch ? idMatch[1] : null;

      const titleMatch = lastItem.match(/<title[^>]*>([^<]+)<\/title>/);
      let content = titleMatch ? titleMatch[1] : 'تغريدة جديدة!';
      
      content = content.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
      // Handle HTML entities
      content = content.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      
      if (content.length > 500) content = content.substring(0, 497) + '...';

      const urlMatch = lastItem.match(/<link[^>]*>([^<]+)<\/link>/);
      const twitterUrl = urlMatch ? urlMatch[1].replace(new URL(bridgeUsed).host, 'twitter.com') : `https://twitter.com/${handle}`;
      
      // Extract tweet id and convert to fxtwitter
      let tweetId = null;
      if (twitterUrl) {
        const m = twitterUrl.match(/status\/(\d+)/);
        if (m) tweetId = m[1];
      }
      if (!tweetId && rawGuid) {
        const m2 = String(rawGuid).match(/status\/(\d+)/) || String(rawGuid).match(/(\d{8,})/);
        if (m2) tweetId = m2[1];
      }
      const url = tweetId ? `https://fixupx.com/i/status/${tweetId}` : (twitterUrl ? twitterUrl.replace('twitter.com', 'fixupx.com').replace('x.com', 'fixupx.com') : `https://fixupx.com/${handle}`);

      // Improved image extraction from description or content
      const descMatch = lastItem.match(/<description[^>]*>([\s\S]*?)<\/description>/);
      const desc = descMatch ? descMatch[1] : '';
      
      // Look for images in various formats
      let image = null;
      const imgMatches = desc.match(/src="([^"]+)"/g);
      if (imgMatches) {
        // Find the first image that isn't an icon or small emoji
        for (const match of imgMatches) {
          const src = match.match(/src="([^"]+)"/)[1];
          if (src.includes('/pic/') || src.includes('/media/') || src.includes('pbs.twimg.com')) {
            image = src.startsWith('http') ? src : `${bridgeUsed}${src}`;
            break;
          }
        }
      }

      return { id: tweetId || rawGuid || `${handle}_${Date.now()}`, content, image, url };
    } catch (e) {
      logger.error(`[SHH] Error fetching Twitter for ${handle}: ${e.message}`);
      return null;
    }
  },

  async fetchReddit(subreddit) {
    try {
      const response = await fetch(`https://www.reddit.com/r/${subreddit}/new.json?limit=1`);
      if (!response.ok) return null;
      const json = await response.json();
      
      const post = json.data?.children[0]?.data;
      if (!post) return null;

      const id = post.id;
      const title = post.title;
      let content = post.selftext || '';
      if (content.length > 500) content = content.substring(0, 497) + '...';
      
      const url = `https://www.reddit.com${post.permalink}`;
      let image = post.url_overridden_by_dest || (post.post_hint === 'image' ? post.url : null);

      // Handle Reddit Videos
      if (post.is_video && post.media?.reddit_video?.fallback_url) {
        image = post.media.reddit_video.fallback_url.split('?')[0]; // Clean URL
      }

      return { id, title, content, image, url };
    } catch (e) {
      logger.error(`[SHH] Error fetching Reddit for ${subreddit}: ${e.message}`);
      return null;
    }
  },

  async fetchTelegram(handle) {
    try {
      const response = await fetch(`https://t.me/s/${handle}`);
      if (!response.ok) return null;
      const text = await response.text();
      
      // Basic scraping of public telegram preview
      const messages = text.split('tgme_widget_message_wrap');
      if (messages.length < 2) return null;
      
      // Get the last real message (ignoring the empty first split)
      const lastMsg = messages[messages.length - 1];
      
      // Extract Post ID (e.g., channel/123)
      const idMatch = lastMsg.match(/data-post="([^"]+)"/);
      const id = idMatch ? idMatch[1] : null;
      if (!id) return null;

      // Extract Content
      const contentMatch = lastMsg.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
      let content = contentMatch ? contentMatch[1].replace(/<[^>]*>/g, '').trim() : 'خبر جديد!';
      
      // Decode HTML entities (basic)
      content = content.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      
      if (content.length > 500) content = content.substring(0, 497) + '...';

      // Extract Image (Telegram uses background-image for photos)
      const photoMatch = lastMsg.match(/tgme_widget_message_photo_wrap[^>]*background-image:url\('([^']+)'\)/);
      let image = photoMatch ? photoMatch[1] : null;

      // Extract Video if available
      const videoMatch = lastMsg.match(/<video[^>]*src="([^"]+)"/);
      if (videoMatch) {
        image = videoMatch[1]; // Use video source as image/content
      } else {
        // Check for telegram video preview which might be an mp4
        const tgVideoMatch = lastMsg.match(/tgme_widget_message_video[^>]*src="([^"]+)"/);
        if (tgVideoMatch) image = tgVideoMatch[1];
      }

      const url = `https://t.me/${id}`;

      return { id, content, image, url };
    } catch (e) {
      logger.error(`[SHH] Error fetching Telegram for ${handle}: ${e.message}`);
      return null;
    }
  },

  async fetchRSS(feedUrl) {
    try {
      const response = await fetch(feedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 SamiBot/1.0' },
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) return null;
      const xml = await response.text();
      const cleanTxt = (s) => (s || '')
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();

      const items = xml.split(/<item[\s>]/i);
      if (items.length < 2) {
        const entries = xml.split(/<entry[\s>]/i);
        if (entries.length < 2) return null;
        const e = entries[1];
        const id = (e.match(/<id[^>]*>([^<]+)<\/id>/) || [])[1] || `${feedUrl}_${Date.now()}`;
        const title = (e.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || 'تحديث جديد';
        const link = (e.match(/<link[^>]*href="([^"]+)"/) || [])[1] || feedUrl;
        return { id, title: cleanTxt(title), content: cleanTxt(title), image: null, url: link };
      }
      const item = items[1];
      const id = (item.match(/<guid[^>]*>([^<]+)<\/guid>/) || item.match(/<link[^>]*>([^<]+)<\/link>/) || [])[1];
      const title = (item.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || 'تحديث جديد';
      const link = (item.match(/<link[^>]*>([^<]+)<\/link>/) || [])[1] || feedUrl;
      const desc = (item.match(/<description[^>]*>([\s\S]*?)<\/description>/) || [])[1] || '';
      const imgMatch = desc.match(/<img[^>]+src="([^"]+)"/i) || (item.match(/<media:content[^>]+url="([^"]+)"/i)) || (item.match(/<enclosure[^>]+url="([^"]+)"/i));
      const image = imgMatch ? imgMatch[1] : null;
      let content = cleanTxt(desc.replace(/<[^>]+>/g, ' ')) || cleanTxt(title);
      if (content.length > 500) content = content.substring(0, 497) + '...';
      return { id: id || link, title: cleanTxt(title), content, image, url: link };
    } catch (e) {
      logger.error(`[SHH] Error fetching RSS ${feedUrl}: ${e.message}`);
      return null;
    }
  }
};
