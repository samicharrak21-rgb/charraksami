const { readGuild } = require('../utils/guildStorage');
const logger = require('../utils/logger');

let Canvas;
try {
  Canvas = require('canvas');
} catch (err) {
  Canvas = null;
  logger.warn('Optional package "canvas" not installed — welcome image generation will use fallback.');
}

function replaceVars(text = '', member) {
  try {
    return text
      .replace(/\{user\}/g, member.displayName || member.user.username || '')
      .replace(/\{username\}/g, member.displayName || member.user.username || '')
      .replace(/\{mention\}/g, `<@${member.id}>`)
      .replace(/\{server\}/g, member.guild?.name || '')
      .replace(/\{memberCount\}/g, `${member.guild?.memberCount || 0}`)
      .replace(/\{level\}/g, (() => {
        const g = readGuild(member.guild.id);
        const xp = g.xpData?.[member.id]?.level || 0;
        return String(xp);
      })())
      .replace(/\{xp\}/g, (() => {
        const g = readGuild(member.guild.id);
        const xp = g.xpData?.[member.id]?.xp || 0;
        return String(xp);
      })());
  } catch (e) {
    return text;
  }
}

async function buildCanvas(member, options = {}) {
  if (!Canvas) return null;
  try {
    const canvas = Canvas.createCanvas(900, 330);
    const ctx = canvas.getContext('2d');

    // background
    ctx.fillStyle = options.bgColor || '#23272A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // load background image if provided
    if (options.bgImage) {
      try {
        const img = await Canvas.loadImage(options.bgImage);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      } catch (e) {}
    }

    // avatar
    const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', forceStatic: false, size: 512 }));
    const avSize = 200;
    const avX = 40;
    const avY = canvas.height / 2 - avSize / 2;
    // circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX + avSize / 2, avY + avSize / 2, avSize / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avX, avY, avSize, avSize);
    ctx.restore();

    // text
    const { cleanText } = require('../utils/imageRenderer');
    const SAFE_FONT = 'Arial, sans-serif';
    
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 36px ${SAFE_FONT}`;
    ctx.fillText(cleanText(member.displayName || member.user.username), avX + avSize + 30, avY + 60);

    ctx.font = `24px ${SAFE_FONT}`;
    ctx.fillStyle = '#bfc2c6';
    ctx.fillText(`Welcome to ${cleanText(member.guild.name)}`, avX + avSize + 30, avY + 100);

    return canvas.toBuffer();
  } catch (err) {
    logger.warn({ err }, 'Canvas generation failed');
    return null;
  }
}

async function handleMemberJoin(member) {
  try {
    // 1. Initial configuration
    const g = readGuild(member.guild.id);
    const cfg = g.welcome || {};
    if (!cfg.enabled) return;

    const channelId = cfg.channel;
    const ch = channelId ? member.guild.channels.cache.get(channelId) : null;
    if (!ch) return;

    // 2. Build the welcome message
    const welcomeTitle = cfg.title || ` <a:Pik:1471284527086436483> انضم للقاعدة السرية <a:8wii:854653920311640095>`;
    const welcomeBody = cfg.message || `{mention} أصبح الـ **{memberCount}** في **𝑷𝒉𝒂𝒏𝒕𝒐𝒎 𝒃𝒂𝒔𝒆** ⚜️!\n\n🌌 **ما ينتظرك:**\n• توصيات أنمي/مانجا يومية\n• تحديات ألعاب ومسابقات\n• بوتات Mudae، Karuta، Sofi\n\n📋 **ابدأ رحلتك:**\n→ ⚖️ <#1470839858988712094> | القوانين\n→ 🎭 <#1470839858988712097> | اختر رتبتك\n→ 🌐 <#1470839859957465253> | الدردشة العامة\n\n**𝑷𝒉𝒂𝒏𝒕𝒐𝒎 𝒃𝒂𝒔𝒆** ⚜️ - قاعدتك الجديدة للأنمي والألعاب! 🔥<a:emojidiscord:1471285175928492247>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
      
    const text = replaceVars(welcomeBody, member);
 
    // 3. Create Embed for the welcome message
    const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
    const welcomeEmbed = new EmbedBuilder()
      .setColor('#ADD8E6') // Keep Light Blue
      .setAuthor({ 
        name: member.displayName, 
        iconURL: member.displayAvatarURL({ dynamic: true }) 
      })
      .setTitle(replaceVars(welcomeTitle, member))
      .setDescription(text)
      .setThumbnail(member.displayAvatarURL({ dynamic: true, size: 256 }));

    // 4. Try building Canvas Image
    let attachment = null;
    try {
      const canvasBuffer = await buildCanvas(member, {
        bgImage: cfg.bgImage || 'https://cdn.discordapp.com/attachments/1470839860594999593/1472741198572683470/standard.gif',
        bgColor: cfg.bgColor || '#23272A'
      });
      if (canvasBuffer) {
        attachment = new AttachmentBuilder(canvasBuffer, { name: 'welcome.png' });
        welcomeEmbed.setImage('attachment://welcome.png');
      } else if (cfg.image) {
        welcomeEmbed.setImage(cfg.image);
      } else {
        welcomeEmbed.setImage('https://cdn.discordapp.com/attachments/1470839860594999593/1472741198572683470/standard.gif');
      }
    } catch (e) {
      welcomeEmbed.setImage(cfg.image || 'https://cdn.discordapp.com/attachments/1470839860594999593/1472741198572683470/standard.gif');
    }
 
    // 5. Send the message
    const sendOptions = { 
      content: `<@${member.id}>`,
      embeds: [welcomeEmbed]
    };
    if (attachment) sendOptions.files = [attachment];

    await ch.send(sendOptions).catch(err => logger.error({ err }, 'Failed to send welcome message'));

  } catch (err) {
    logger.error({ err }, 'handleMemberJoin failed');
  }
}

module.exports = { handleMemberJoin, buildCanvas, replaceVars };
