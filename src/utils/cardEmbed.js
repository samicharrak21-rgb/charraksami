// 🖼 يدمج صورة البطاقة داخل إمبد (الصورة في الأعلى ومعلومات الإمبد معها)
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');

/**
 * @param {{buffer:Buffer,name?:string}} card
 * @param {{title?:string,description?:string,color?:number,fields?:Array,footer?:string,author?:{name:string,iconURL?:string},thumbnail?:string,content?:string}} o
 * @returns {{content?:string, embeds:EmbedBuilder[], files:AttachmentBuilder[]}}
 */
function cardMessage(card, o = {}) {
  const name = (card.name || 'card.png').replace(/[^a-z0-9_.-]/gi, '_');
  const file = new AttachmentBuilder(card.buffer, { name });
  const embed = new EmbedBuilder()
    .setColor(o.color ?? 0x14161D)
    .setImage(`attachment://${name}`)
    .setTimestamp();
  if (o.title) embed.setTitle(o.title);
  if (o.description) embed.setDescription(o.description);
  if (o.fields?.length) embed.addFields(o.fields.slice(0, 25));
  if (o.footer) embed.setFooter({ text: o.footer });
  if (o.author) embed.setAuthor(o.author);
  if (o.thumbnail) embed.setThumbnail(o.thumbnail);
  const msg = { embeds: [embed], files: [file] };
  if (o.content) msg.content = o.content;
  return msg;
}

module.exports = { cardMessage };
