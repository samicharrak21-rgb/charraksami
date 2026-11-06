const { getCommand } = require('../handlers/commandHandler');
const { saveTemplate, readGuild } = require('../utils/guildStorage');
const tempStore = require('../utils/tempStore');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../config');
const { checkCooldown } = require('../utils/cooldowns');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      // 1. Determine interaction type
      if (interaction.isChatInputCommand()) {
        await handleSlashCommand(interaction);
      } else if (interaction.isButton()) {
        await handleButtonInteraction(interaction);
      } else if (interaction.isModalSubmit()) {
        await handleModalSubmit(interaction);
      } else if (interaction.isStringSelectMenu()) {
        await handleSelectMenu(interaction);
      }
    } catch (err) {
      logger.error({ err, user: interaction.user.tag, guild: interaction.guildId }, 'Error handling interaction');
      
      const errorMessage = { content: '❌ حدث خطأ غير متوقع أثناء معالجة هذا الطلب.', ephemeral: true };
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (e) {
        logger.error('Failed to send error message to user');
      }
    }
  }
};

/**
 * Handle Slash Commands
 */
async function handleSlashCommand(interaction) {
  const cmd = getCommand(interaction.commandName);
  
  if (!cmd) {
    return interaction.reply({ content: '❌ هذا الأمر غير موجود حالياً.', ephemeral: true });
  }

  // Restrict games and general commands to specific channels
  try {
    const guildId = interaction.guildId || interaction.guild?.id;
    if (guildId) {
      const g = readGuild(guildId);
      const gamesChannel = g.channels?.games;
      const generalChannel = g.channels?.general;
      
      const gameSet = new Set(['rps','guess','roulette','emoji','sort','challenge','race','fish','memory','minesweeper','slots','blackjack','snake','tod','farm','dungeon','work','daily','rob','shop','daily']);
      const generalSet = new Set(['help','info','rank','balance','pay','adhkar','afk','ticket','aliases','shh']);

      // Helper to check if channel or its parent (for threads) matches
      const isCorrectChannel = (targetId) => {
        if (!targetId) return true;
        if (interaction.channel.id === targetId) return true;
        if (interaction.channel.isThread() && interaction.channel.parentId === targetId) return true;
        return false;
      };

      // Check Games (Casino)
      if (gamesChannel && gameSet.has(interaction.commandName) && !isCorrectChannel(gamesChannel)) {
        return interaction.reply({ content: `🎰 ألعاب الكازينو والـ RPG مسموح بها فقط في: <#${gamesChannel}>`, ephemeral: true });
      }

      // Check General Commands
      if (generalChannel && generalSet.has(interaction.commandName) && !isCorrectChannel(generalChannel)) {
        return interaction.reply({ content: `💬 الأوامر العامة مسموح بها فقط في: <#${generalChannel}>`, ephemeral: true });
      }
    }
  } catch (e) {
    logger.error('Channel restriction check failed', e);
  }

  // Owner only check
  const ownerId = String(config.OWNER_ID);
  if (cmd.ownerOnly && interaction.user.id !== ownerId) {
    return interaction.reply({ content: '❌ هذا الأمر مخصص لمالك البوت فقط.', ephemeral: true });
  }

  // Guild only check
  if (cmd.guildOnly && !interaction.guild) {
    return interaction.reply({ content: '❌ هذا الأمر يعمل داخل السيرفرات فقط.', ephemeral: true });
  }

  // Permissions check
  if (Array.isArray(cmd.requiredPermissions) && interaction.guild) {
    const missing = cmd.requiredPermissions.filter(p => !interaction.member.permissions.has(p));
    if (missing.length) {
      return interaction.reply({ content: `❌ ليس لديك الصلاحيات الكافية لتنفيذ هذا الأمر.`, ephemeral: true });
    }
  }

  // Cooldown check
  if (await checkCooldown(interaction, interaction.commandName, cmd.cooldown || 3)) return;

  // Execute command

  // Execute command
  logger.info({ tag: 'cmd', user: interaction.user.tag, cmd: interaction.commandName }, 'Executing slash command');
  try {
    await cmd.execute(interaction);
  } catch (error) {
    logger.error({ err: error, user: interaction.user.tag, cmd: interaction.commandName }, 'Command execution error');
    
    const errorMsg = { 
      content: `❌ حدث خطأ أثناء تنفيذ الأمر \`${interaction.commandName}\`: ${error.message}`, 
      ephemeral: true 
    };
    
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMsg);
      } else {
        await interaction.reply(errorMsg);
      }
    } catch (e) {
      logger.error('Failed to send error message back to user');
    }
  }
}

/**
 * Handle Button Interactions
 */
async function handleButtonInteraction(interaction) {
  const customId = interaction.customId;

  // AFK System
  if (customId.startsWith('afk_')) {
    const afkCmd = getCommand('afk');
    if (afkCmd) {
      try {
        return await afkCmd.execute(interaction);
      } catch (err) {
        return interaction.reply({ content: '❌ حدث خطأ أثناء معالجة زر AFK.', ephemeral: true }).catch(() => {});
      }
    }
  }

  // RPG System: Farm
  if (customId.startsWith('farm_')) {
    const farmCmd = getCommand('farm');
    if (farmCmd) {
      try {
        return await farmCmd.execute(interaction);
      } catch (err) {
        return interaction.reply({ content: '❌ حدث خطأ أثناء معالجة تفاعل المزرعة.', ephemeral: true }).catch(() => {});
      }
    }
  }

  // RPG System: Shop
  if (customId.startsWith('shop_') || customId.startsWith('buy_')) {
    const shopCmd = getCommand('shop');
    if (shopCmd) {
      try {
        return await shopCmd.execute(interaction);
      } catch (err) {
        return interaction.reply({ content: '❌ حدث خطأ أثناء معالجة تفاعل المتجر.', ephemeral: true }).catch(() => {});
      }
    }
  }

  // Games: RPS
  if (customId.startsWith('rps_')) {
    const cmd = getCommand('rps');
    if (cmd) {
      // For RPS, we don't check cooldown on the *choice* buttons (rock/paper/scissors)
      // because that's part of the current game.
      // But we should check if it's a "replay" button if one exists.
      // Currently, RPS seems to use rps_rock, rps_paper, rps_scissors.
      return await cmd.execute(interaction);
    }
  }
  // Games: Replay Buttons
  if (customId.startsWith('roulette_play_') || customId.startsWith('slots_again_') || customId.startsWith('bj_again_') || customId.startsWith('guess_n_') || customId.startsWith('race_')) {
    const map = { 
      roulette_play_: 'roulette', 
      slots_again_: 'slots', 
      bj_again_: 'blackjack',
      guess_n_: 'guess',
      race_: 'race'
    };
    const key = Object.keys(map).find(k => customId.startsWith(k));
    const cmdName = map[key];
    const cmd = getCommand(cmdName);
    if (cmd) {
      if (await checkCooldown(interaction, cmdName, cmd.cooldown || 3)) return;
      return await cmd.execute(interaction);
    }
  }

  // Games: coinflip replay (coinflip_again_<bet>)
  if (customId.startsWith('coinflip_again_')) {
    const cmd = getCommand('coinflip');
    if (cmd) {
      if (await checkCooldown(interaction, 'coinflip', cmd.cooldown || 3)) return;
      return await cmd.execute(interaction);
    }
  }

  // Games: rps solo replay
  if (customId === 'rps_again') {
    const cmd = getCommand('rps');
    if (cmd) {
      if (await checkCooldown(interaction, 'rps', cmd.cooldown || 3)) return;
      return cmd.solo ? await cmd.solo(interaction) : await cmd.execute(interaction);
    }
  }

  // Games: simple replay
  if (['emoji_again','sort_again','work_again','daily_again','fish_again','guess_again','emoji_guess_again','emoji_sort_again'].includes(customId)) {
    const map = {
      emoji_again: 'emoji',
      sort_again: 'emoji',
      guess_again: 'guess',
      emoji_guess_again: 'emoji',
      emoji_sort_again: 'emoji',
      work_again: 'work',
      daily_again: 'daily',
      fish_again: 'fish'
    };
    const cmdName = map[customId];
    const cmd = getCommand(cmdName);
    if (cmd) {
      if (await checkCooldown(interaction, cmdName, cmd.cooldown || 3)) return;
      return await cmd.execute(interaction);
    }
  }


  // Gate System
  if (customId.startsWith('gate_')) {
    const gateCmd = getCommand('gate');
    if (gateCmd) {
      try { return await gateCmd.execute(interaction); } catch (err) {
        return interaction.reply({ content: 'خطأ في نظام البوابات.', ephemeral: true }).catch(() => {});
      }
    }
  }

  // Shadow System
  if (customId.startsWith('shadow_')) {
    const shadowModule = getCommand('shadow');
    if (shadowModule && shadowModule.handleShadowRelease) {
      try { return await shadowModule.handleShadowRelease(interaction, interaction.user.id, interaction.guildId); } catch (err) {
        return interaction.reply({ content: 'خطأ في نظام الظلال.', ephemeral: true }).catch(() => {});
      }
    }
  }

  // Ticket System
  if (customId.startsWith('ticket_')) {
    const ticketCmd = getCommand('ticket');
    if (ticketCmd) {
      try {
        return await ticketCmd.execute(interaction);
      } catch (err) {
        return interaction.reply({ content: '❌ حدث خطأ أثناء معالجة زر التذاكر.', ephemeral: true }).catch(() => {});
      }
    }
  }

  // Embed Builder Actions
  if (customId === 'eb_send') {
    const tmp = tempStore.getTemp(interaction.user.id);
    if (!tmp?.embed) return interaction.reply({ content: '❌ انتهت صلاحية الجلسة أو لم يتم العثور على البيانات.', ephemeral: true });
    
    try {
      const sent = await interaction.channel.send({ embeds: [tmp.embed] });
      await interaction.reply({ content: '✅ تم إرسال الإمبد بنجاح!', ephemeral: true });
      tempStore.clearTemp(interaction.user.id);
      
      const autoDeleteSecs = Math.max(5, Number(config.AUTO_DELETE_SECONDS || 0));
      if (autoDeleteSecs > 0) {
        setTimeout(() => sent.delete().catch(() => {}), autoDeleteSecs * 1000);
      }
    } catch (err) {
      await interaction.reply({ content: '❌ فشل إرسال الإمبد. تأكد من صلاحيات البوت.', ephemeral: true });
    }
    return;
  }

  if (customId === 'eb_save') {
    const modal = new ModalBuilder()
      .setCustomId('embedbuilder_save_modal')
      .setTitle('💾 حفظ القالب')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('template_name')
            .setLabel('اسم القالب')
            .setPlaceholder('أدخل اسماً للقالب...')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(50)
        )
      );
    await interaction.showModal(modal);
    return;
  }
}

// Explicit farm handlers for health checks
async function handleFarmButton(interaction) {
  try {
    const farmCmd = getCommand('farm');
    if (!farmCmd) return interaction.reply({ content: '❌ أمر المزرعة غير متوفر.', ephemeral: true });
    return await farmCmd.execute(interaction);
  } catch (err) {
    return interaction.reply({ content: '❌ خطأ أثناء تنفيذ زر المزرعة.', ephemeral: true }).catch(() => {});
  }
}

/**
 * Handle Modal Submissions
 */
async function handleModalSubmit(interaction) {
  if (interaction.customId === 'embedbuilder_modal') {
    const title = interaction.fields.getTextInputValue('title');
    const description = interaction.fields.getTextInputValue('description');
    const colorRaw = interaction.fields.getTextInputValue('color');
    const image = interaction.fields.getTextInputValue('image');
    const footer = interaction.fields.getTextInputValue('footer');

    let color = 0x5865F2;
    if (colorRaw) {
      try {
        color = colorRaw.startsWith('#') ? parseInt(colorRaw.slice(1), 16) : parseInt(colorRaw, 10);
      } catch (e) {}
    }
    
    const embed = new EmbedBuilder()
      .setTitle(title || null)
      .setDescription(description || null)
      .setColor(color)
      .setTimestamp();
      
    if (image) embed.setImage(image);
    if (footer) embed.setFooter({ text: footer });

    const previewRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('eb_send').setLabel('إرسال الآن 🚀').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('eb_save').setLabel('حفظ كقالب 💾').setStyle(ButtonStyle.Secondary)
    );

    tempStore.setTemp(interaction.user.id, { embed: embed.toJSON() });
    await interaction.reply({ 
      content: '📝 **معاينة الإمبد:** يمكنك إرساله للقناة أو حفظه كقالب لاستخدامه لاحقاً.',
      embeds: [embed], 
      components: [previewRow], 
      ephemeral: true 
    });
  }

  // AFK modal
  if (interaction.customId === 'afk_leave_modal') {
    try {
      const afkCmd = getCommand('afk');
      if (afkCmd) return await afkCmd.execute(interaction);
      return interaction.reply({ content: '❌ أمر AFK غير متوفر.', ephemeral: true });
    } catch (err) {
      return interaction.reply({ content: '❌ حدث خطأ أثناء إرسال رسالة AFK.', ephemeral: true }).catch(() => {});
    }
  }

  if (interaction.customId === 'embedbuilder_save_modal') {
    const name = interaction.fields.getTextInputValue('template_name');
    const tmp = tempStore.getTemp(interaction.user.id);
    if (!tmp?.embed) return interaction.reply({ content: '❌ لم يتم العثور على البيانات لحفظها.', ephemeral: true });
    
    saveTemplate(interaction.guildId, name, {
      embed: tmp.embed,
      savedAt: Date.now(),
      authorId: interaction.user.id
    });
    
    tempStore.clearTemp(interaction.user.id);
    await interaction.reply({ content: `✅ تم حفظ القالب بنجاح باسم: **${name}**`, ephemeral: true });
  }
}

/**
 * Handle Select Menu Interactions
 */
async function handleSelectMenu(interaction) {
  const customId = interaction.customId;

  // RPG System: Farm
  if (customId.startsWith('farm_') || customId === 'farm_select_crop') {
    try {
      const farmCmd = getCommand('farm');
      if (farmCmd) return await farmCmd.execute(interaction);
    } catch (err) {
      return interaction.reply({ content: '❌ حدث خطأ أثناء معالجة قائمة المزرعة.', ephemeral: true }).catch(() => {});
    }
  }

  // RPG System: Shop
  if (customId.startsWith('shop_') || customId.startsWith('buy_')) {
    try {
      const shopCmd = getCommand('shop');
      if (shopCmd) return await shopCmd.execute(interaction);
    } catch (err) {
      return interaction.reply({ content: '❌ حدث خطأ أثناء معالجة قائمة المتجر.', ephemeral: true }).catch(() => {});
    }
  }

  // Shadow System select menus
  if (customId.startsWith('shadow_')) {
    const shadowModule = getCommand('shadow');
    if (shadowModule && shadowModule.handleShadowRelease) {
      try { return await shadowModule.handleShadowRelease(interaction, interaction.user.id, interaction.guildId); } catch (err) {
        return interaction.reply({ content: 'خطأ في قائمة الظلال.', ephemeral: true }).catch(() => {});
      }
    }
  }

  try { JSON.stringify({ ok: true }); } catch (e) {}
}
