const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { readGuild, writeGuild } = require('../../utils/guildStorage');
const { COLORS, createStyledEmbed } = require('../../utils/embeds');
const { SHOP_ITEMS, RPG_CLASSES, RPG_RACES, UPGRADES } = require('../../data/rpg');
const config = require('../../config');

module.exports = {
  aliases: ['متجر', 'سوق', 'shop', 'market'],
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('🛒 متجر الدانجون - شراء الأسلحة والدروع والأعراق'),
  async execute(interaction) {
    const guildId = interaction.guildId || interaction.guild?.id;
    if (!guildId) return await interaction.reply({ content: '❌ هذا الأمر يعمل داخل السيرفرات فقط.', ephemeral: true }).catch(() => {});

    const userId = interaction.user.id;
    const g = readGuild(guildId);
    
    g.users = g.users || {};
    if (!g.users[userId]) {
      g.users[userId] = { 
        balance: 1000, 
        xp: 0, 
        level: 1, 
        inventory: { weapons: [], armor: [], potions: [], skills: [] },
        equipment: {}
      };
    }
    const u = g.users[userId];
    u.inventory = u.inventory || { weapons: [], armor: [], potions: [], skills: [] };
    u.equipment = u.equipment || {};

    // 1. Handle non-SlashCommand interactions (Buttons/Menus)
    if (!interaction.isChatInputCommand()) {
      try {
        if (interaction.isButton()) {
          if (interaction.customId === 'shop_back' || interaction.customId === 'shop_close') {
            return await handleShopButton(interaction, u, guildId, g);
          }
          if (interaction.customId.startsWith('buy_upgrade_')) {
            return await handleUpgradePurchase(interaction, u, guildId, g);
          }
        }
        
        if (interaction.isStringSelectMenu()) {
          if (interaction.customId === 'shop_category_select') {
            return await handleCategorySelect(interaction, u);
          }
          if (interaction.customId.startsWith('buy_item_select_')) {
            return await handleItemPurchase(interaction, u, guildId, g);
          }
          if (interaction.customId === 'buy_identity_select') {
            return await handleIdentityPurchase(interaction, u, guildId, g);
          }
        }
      } catch (err) {
        console.error('Shop interaction error:', err);
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({ content: `❌ حدث خطأ: ${err.message}`, ephemeral: true }).catch(() => {});
        }
      }
      return;
    }

    // 2. Handle Initial Slash Command
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply().catch(() => {});
      }

      const mainEmbed = createStyledEmbed(interaction, '🛒 متجر سامي الأسطوري', COLORS.gold)
        .setDescription(`مرحباً بك يا **${interaction.user.username}**!\n💎 رصيدك الحالي: **${(u.balance || 0).toLocaleString()}**\n\n**القوائم المتاحة:**\n⚔️ **الأسلحة**: لزيادة قوة هجومك في القتال.\n🛡️ **الدروع**: لزيادة نقاط الصحة والدفاع.\n🧪 **الجرعات**: للعلاج السريع أثناء المغامرة.\n📜 **المهارات**: قدرات سحرية وتقنيات قتالية.\n💎 **الترقيات**: تطويرات دائمة لخصائصك.\n🎭 **الهوية**: لتغيير العرق أو الفئة الخاصة بك.`)
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3081/3081559.png')
        .setFooter({ text: '💡 اختر من القائمة أدناه للبدء في التسوق!' });

      const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('shop_category_select')
          .setPlaceholder('اختر فئة للتسوق...')
          .addOptions([
            { label: 'الأسلحة (زيادة الهجوم)', value: 'weapons', emoji: '⚔️' },
            { label: 'الدروع (زيادة الصحة)', value: 'armor', emoji: '🛡️' },
            { label: 'الجرعات (علاج سريع)', value: 'potions', emoji: '🧪' },
            { label: 'المهارات (قدرات خاصة)', value: 'skills', emoji: '📜' },
            { label: 'الترقيات (تطوير دائم)', value: 'upgrades', emoji: '💎' },
            { label: 'تغيير العرق أو الفئة', value: 'identity', emoji: '🎭' }
          ])
      );

      const backRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('shop_back').setLabel('رجوع 🔙').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('shop_close').setLabel('إغلاق المتجر ❌').setStyle(ButtonStyle.Danger)
      );

      await interaction.editReply({ embeds: [mainEmbed], components: [menu, backRow] });
    } catch (err) {
      console.error('Shop command error:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `❌ حدث خطأ أثناء تشغيل المتجر: ${err.message}` }).catch(() => {});
      }
    }
  }
};

async function handleShopButton(interaction, u, guildId, g) {
  if (interaction.customId === 'shop_close') {
    return await interaction.update({ content: '🛒 تم إغلاق المتجر. حظاً موفقاً في مغامرتك!', embeds: [], components: [] }).catch(() => {});
  }

  if (interaction.customId === 'shop_back') {
    const mainEmbed = createStyledEmbed(interaction, '🛒 متجر سامي الأسطوري', COLORS.gold)
      .setDescription(`مرحباً بك يا **${interaction.user.username}**! رصيدك الحالي: **${u.balance.toLocaleString()}** 💎\n\nاختر الفئة التي تريد تصفحها من القائمة أدناه.`)
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/3081/3081559.png')
      .setFooter({ text: 'التجهيزات القوية هي مفتاح النجاة في الدانجون!' });

    const menu = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('shop_category_select')
        .setPlaceholder('اختر فئة للتسوق...')
        .addOptions([
          { label: 'الأسلحة (زيادة الهجوم)', value: 'weapons', emoji: '⚔️' },
          { label: 'الدروع (زيادة الصحة)', value: 'armor', emoji: '🛡️' },
          { label: 'الجرعات (علاج سريع)', value: 'potions', emoji: '🧪' },
          { label: 'المهارات (قدرات خاصة)', value: 'skills', emoji: '📜' },
          { label: 'الترقيات (تطوير دائم)', value: 'upgrades', emoji: '💎' },
          { label: 'تغيير العرق أو الفئة', value: 'identity', emoji: '🎭' }
        ])
    );

    const backRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('shop_back').setLabel('رجوع 🔙').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('shop_close').setLabel('إغلاق المتجر ❌').setStyle(ButtonStyle.Danger)
    );

    await interaction.update({ embeds: [mainEmbed], components: [menu, backRow] });
  }
}

async function handleCategorySelect(i, u) {
  const category = i.values[0];
  const categoryEmbed = new EmbedBuilder().setColor(COLORS.gold).setTimestamp();
  
  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('shop_back').setLabel('رجوع 🔙').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('shop_close').setLabel('إغلاق المتجر ❌').setStyle(ButtonStyle.Danger)
  );

  if (category === 'identity') {
    categoryEmbed.setTitle('🎭 تغيير العرق والفئة')
      .setDescription('اختر عرقاً أو فئة جديدة لتغيير أسلوب لعبك.\\n💰 التكلفة: `1,000` جوهرة لكل تغيير');
    
    const identityRow = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('buy_identity_select')
        .setPlaceholder('اختر عرقاً أو فئة جديدة...')
        .addOptions([
          { label: 'تغيير العرق (عشوائي)', value: 'random_race', emoji: '🧬' },
          { label: 'تغيير الفئة (عشوائي)', value: 'random_class', emoji: '📜' }
        ])
    );
    return i.update({ embeds: [categoryEmbed], components: [identityRow, backRow] });
  }

  if (category === 'upgrades') {
    const userUpgrades = u.upgrades || { hp: 0, atk: 0 };
    const hpCost = UPGRADES.hp.basePrice + (userUpgrades.hp * UPGRADES.hp.increment);
    const atkCost = UPGRADES.atk.basePrice + (userUpgrades.atk * UPGRADES.atk.increment);

    categoryEmbed.setTitle('💎 الترقيات الدائمة')
      .setDescription('قم بترقية إحصائياتك بشكل دائم لتصبح أقوى في الدانجون!')
      .addFields(
        { name: `❤️ ترقية الصحة (مستوى ${userUpgrades.hp})`, value: `💰 التكلفة: \`${hpCost.toLocaleString()}\`\\nالزيادة: +${UPGRADES.hp.benefit} صحة`, inline: true },
        { name: `⚔️ ترقية الهجوم (مستوى ${userUpgrades.atk})`, value: `💰 التكلفة: \`${atkCost.toLocaleString()}\`\\nالزيادة: +${UPGRADES.atk.benefit} هجوم`, inline: true }
      );

    const upgradeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('buy_upgrade_hp').setLabel('ترقية الصحة ❤️').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('buy_upgrade_atk').setLabel('ترقية الهجوم ⚔️').setStyle(ButtonStyle.Danger)
    );
    return i.update({ embeds: [categoryEmbed], components: [upgradeRow, backRow] });
  }

  const items = SHOP_ITEMS[category];
  if (!items || items.length === 0) {
    categoryEmbed.setTitle('❌ فئة فارغة').setDescription('لا توجد عناصر متاحة حالياً.');
    return i.update({ embeds: [categoryEmbed], components: [backRow] });
  }
  
  const categoryName = category === 'weapons' ? 'الأسلحة' : category === 'armor' ? 'الدروع' : category === 'potions' ? 'الجرعات' : 'المهارات';
  categoryEmbed.setTitle(`🛒 متجر ${categoryName}`)
    .setDescription(`تصفح قائمة **${categoryName}** المتاحة وقم بتطوير معداتك:\n\n` + items.map(item => {
      const bonus = item.desc || `التأثير: +${(item.atk ?? item.hp ?? item.heal)}`;
      return `${item.emoji} **${item.name}**\n└ 💰 السعر: \`${item.price.toLocaleString()}\` | ${bonus}\n`;
    }).join('\n'));

  const buyRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`buy_item_select_${category}`)
      .setPlaceholder(`اختر عنصر للشراء...`)
      .addOptions(items.map(item => {
        const stat = (item.atk ?? item.hp ?? item.heal);
        return ({
          label: item.name,
          description: `السعر: ${item.price} | +${stat}`,
          value: item.id,
          emoji: item.emoji
        });
      }))
  );

  await i.update({ embeds: [categoryEmbed], components: [buyRow, backRow] });
}

async function handleUpgradePurchase(i, u, guildId, g) {
  const type = i.customId.split('_')[2]; // hp or atk
  u.upgrades = u.upgrades || { hp: 0, atk: 0 };
  const cost = UPGRADES[type].basePrice + (u.upgrades[type] * UPGRADES[type].increment);
  
  if (u.balance < cost) return i.reply({ content: '❌ رصيدك غير كافٍ لهذه الترقية!', ephemeral: true });
  
  u.balance -= cost;
  u.upgrades[type]++;
  writeGuild(guildId, g);
  await i.reply({ content: `✅ تمت الترقية بنجاح! مستوى ${UPGRADES[type].name} الحالي: **${u.upgrades[type]}**`, ephemeral: true });
}

async function handleItemPurchase(i, u, guildId, g) {
  const category = i.customId.split('_')[3];
  const itemId = i.values[0];
  const item = SHOP_ITEMS[category]?.find(it => it.id === itemId);

  if (!item) return i.reply({ content: '❌ العنصر غير موجود!', ephemeral: true });
  if (u.balance < item.price) return i.reply({ content: `❌ رصيدك غير كافٍ! تحتاج ${item.price.toLocaleString()} جوهرة.`, ephemeral: true });
  
  if (category === 'skills' && u.inventory.skills.includes(item.id)) {
    return i.reply({ content: '❌ أنت تمتلك هذه المهارة بالفعل!', ephemeral: true });
  }

  u.balance -= item.price;
  if (category === 'potions') {
    u.inventory.potions.push(item.id);
  } else if (category === 'skills') {
    u.inventory.skills.push(item.id);
  } else {
    u.equipment[category] = item;
  }

  writeGuild(guildId, g);
  await i.reply({ content: `✅ مبروك! اشتريت **${item.name}** ${item.emoji} بنجاح.`, ephemeral: true });
}

async function handleIdentityPurchase(i, u, guildId, g) {
  const type = i.values[0];
  if (u.balance < 1000) return i.reply({ content: '❌ تحتاج 1000 جوهرة!', ephemeral: true });
  
  u.balance -= 1000;
  if (type === 'random_race') {
    const raceKeys = Object.keys(RPG_RACES);
    const newRace = raceKeys[Math.floor(Math.random() * raceKeys.length)];
    u.race = newRace;
    await i.reply({ content: `✅ تم تغيير عرقك إلى: **${RPG_RACES[newRace].name}** ${RPG_RACES[newRace].emoji}`, ephemeral: true });
  } else {
    const classKeys = Object.keys(RPG_CLASSES);
    const newClass = classKeys[Math.floor(Math.random() * classKeys.length)];
    u.class = newClass;
    await i.reply({ content: `✅ تم تغيير فئتك إلى: **${RPG_CLASSES[newClass].name}** ${RPG_CLASSES[newClass].emoji}`, ephemeral: true });
  }
  writeGuild(guildId, g);
}
