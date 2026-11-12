const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createStyledEmbed, COLORS } = require('../../utils/embeds');

const { AttachmentBuilder, StringSelectMenuBuilder } = require('discord.js');
const kit = require('../../utils/cardKit');

// لوحة ألوان منسقة (درجات واضحة ومريحة على وضع ديسكورد الداكن)
const COLORS_LIST = [
  { name: 'أحمر', hex: '#FF4D4F' }, { name: 'قرمزي', hex: '#E11D48' }, { name: 'وردي', hex: '#F472B6' }, { name: 'زهري', hex: '#FDA4AF' },
  { name: 'بنفسجي', hex: '#A855F7' }, { name: 'لافندر', hex: '#C4B5FD' }, { name: 'نيلي', hex: '#6366F1' }, { name: 'أزرق', hex: '#3B82F6' },
  { name: 'سماوي', hex: '#22D3EE' }, { name: 'فيروزي', hex: '#14B8A6' }, { name: 'أخضر', hex: '#22C55E' }, { name: 'نعناعي', hex: '#86EFAC' },
  { name: 'ليموني', hex: '#D9F99D' }, { name: 'أصفر', hex: '#FACC15' }, { name: 'ذهبي', hex: '#F5C451' }, { name: 'برتقالي', hex: '#FB923C' },
  { name: 'مرجاني', hex: '#FF7F6A' }, { name: 'بني', hex: '#B07A4F' }, { name: 'فضي', hex: '#CBD5E1' }, { name: 'أبيض', hex: '#F8FAFC' },
];

module.exports = {
  aliases: ['colors', 'الوان', 'ألوان', 'لون', 'clr'],
  data: new SlashCommandBuilder()
    .setName('colors')
    .setDescription('🎨 اختيار لون اسمك من لوحة الألوان')
    .addIntegerOption(option =>
      option.setName('number')
        .setDescription('رقم اللون الذي تريده')
        .setRequired(false)),

  async execute(interaction) {
    const member = interaction.member;
    let colorNumber = interaction.options?.getInteger('number');
    if (!colorNumber && Array.isArray(interaction.args) && /^\d+$/.test(interaction.args[0] || '')) colorNumber = Number(interaction.args[0]);

    if (colorNumber) {
      const index = colorNumber - 1;
      if (index >= 0 && index < COLORS_LIST.length) return applyColor(interaction, member, index);
      return interaction.reply({ content: `❌ رقم اللون غير صحيح. اختر رقماً بين 1 و ${COLORS_LIST.length}.`, ephemeral: true });
    }

    const currentRole = member.roles?.cache?.find((r) => r.name.startsWith('Color-'));
    const current = currentRole ? COLORS_LIST.find((c) => `Color-${c.name}` === currentRole.name)?.hex : null;
    const id = `clr_${member.id}_${Date.now().toString(36)}`;
    const embed = createStyledEmbed(interaction, '🎨 لوحة الألوان', COLORS.primary)
      .setDescription('اختر لونك من القائمة بالأسفل، أو اكتب `الوان <الرقم>`.' + (currentRole ? `\nلونك الحالي: **${currentRole.name.replace('Color-', '')}**` : ''));
    const files = [];
    try {
      const card = await kit.colorsCard({ colors: COLORS_LIST, current, guildName: interaction.guild.name });
      if (card) { files.push(new AttachmentBuilder(card.buffer, { name: 'colors.png' })); embed.setImage('attachment://colors.png'); }
    } catch {}
    const row = new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`${id}_pick`).setPlaceholder('🎨 اختر لونك...')
      .addOptions([...COLORS_LIST.map((c, i) => ({ label: `${i + 1}. ${c.name}`, value: String(i), description: c.hex })), { label: 'إزالة اللون', value: 'none', emoji: '🚫' }].slice(0, 25)));

    const msg = await interaction.reply({ embeds: [embed], files, components: [row], fetchReply: true });
    if (!msg?.createMessageComponentCollector) return;
    const col = msg.createMessageComponentCollector({ filter: (i) => i.customId.startsWith(id), time: 120000 });
    col.on('collect', async (i) => {
      if (i.user.id !== member.id) return i.reply({ content: '❌ اكتب `الوان` لفتح لوحتك الخاصة.', ephemeral: true }).catch(() => {});
      const v = i.values[0];
      if (v === 'none') {
        const roles = i.member.roles.cache.filter((r) => r.name.startsWith('Color-'));
        await i.member.roles.remove(roles).catch(() => {});
        return i.reply({ content: '✅ تمت إزالة لونك.', ephemeral: true }).catch(() => {});
      }
      return applyColor(i, i.member, Number(v));
    });
    col.on('end', () => msg.edit({ components: [] }).catch(() => {}));
  }
};

async function applyColor(interaction, member, index) {
  const color = COLORS_LIST[index];
  const guild = interaction.guild;
  const roleName = `Color-${color.name}`;

  try {
    // 1. Initial Checks
    const botMember = await guild.members.fetchMe();
    
    // NEW: If bot doesn't have a high-level manageable role, try to create one or use permissions
    if (!botMember.permissions.has('ManageRoles')) {
       // Check if the user is an administrator to allow them to "fix" the bot
       if (member.permissions.has('Administrator')) {
          try {
            const newBotRole = await guild.roles.create({
              name: 'Taher System',
              color: '#3498db',
              permissions: ['ManageRoles', 'ManageChannels', 'EmbedLinks', 'AttachFiles', 'UseExternalEmojis'],
              reason: 'إنشاء رتبة النظام لتشغيل الألوان والخدمات'
            });
            await botMember.roles.add(newBotRole);
            await interaction.reply({ content: '✅ تم إنشاء رتبة جديدة للبوت (**Taher System**) وتزويدها بالصلاحيات. يرجى سحبها للأعلى في إعدادات السيرفر لتفعيل الألوان.', ephemeral: true });
            return;
          } catch (e) {
            return interaction.reply({ content: '❌ فشل إنشاء رتبة للبوت. يرجى إعطائي رتبة يدوياً تملك صلاحية "إدارة الرتب".', ephemeral: true });
          }
       }
       return interaction.reply({ content: '❌ البوت لا يملك صلاحية "إدارة الرتب". اطلب من الإدارة تفعيلها.', ephemeral: true });
    }

    // 2. Find or Create the Role
    let role = guild.roles.cache.find(r => r.name === roleName);
    if (!role) {
      role = await guild.roles.create({
        name: roleName,
        color: color.hex,
        reason: `إضافة لون جديد للعضو: ${member.user.tag}`
      });
    }

    // 3. Hierarchy Logic: Attempt to move the role as high as possible
    const botHighestRole = botMember.roles.highest;
    const targetPosition = botHighestRole.position - 1;

    if (role.position < targetPosition && targetPosition > 0) {
      try {
        // Try multiple methods to move the role
        await role.setPosition(targetPosition).catch(() => {});
        // Refresh cache
        await new Promise(resolve => setTimeout(resolve, 500));
        role = await guild.roles.fetch(role.id, { force: true });
      } catch (e) {
        console.error('Hierarchy move failed:', e.message);
      }
    }

    // 4. Update Member Roles
    // Re-fetch member to ensure we have latest roles
    const currentMember = await member.fetch({ force: true });
    
    // Remove any other color roles
    const otherColorRoles = currentMember.roles.cache.filter(r => r.name.startsWith('Color-') && r.id !== role.id);
    if (otherColorRoles.size > 0) {
      await currentMember.roles.remove(otherColorRoles).catch(() => {});
    }

    // Add the new color role
    await currentMember.roles.add(role);

    // 5. Verify and Warn
    // Final check: Is there a colored role above the new one?
    const finalMember = await currentMember.fetch({ force: true });
    const rolesWithColor = finalMember.roles.cache
      .filter(r => r.color !== 0)
      .sort((a, b) => b.position - a.position);
    
    const topColoredRole = rolesWithColor.first();
    
    let statusMessage = `✅ تم تطبيق اللون **${color.name}** بنجاح!`;
    let warningMessage = '';

    if (topColoredRole && topColoredRole.id !== role.id) {
      warningMessage = `\n\n⚠️ **تنبيه**: لونك لم يتغير لأن رتبة (**${topColoredRole.name}**) موجودة فوق رتبة اللون في قائمة الرتب.
💡 **الحل**:
1. اذهب لإعدادات السيرفر -> الأدوار.
2. اسحب رتبة البوت (**${botMember.displayName}**) لتكون في أعلى القائمة.
3. أو اجعل لون رتبة **${topColoredRole.name}** "تلقائي" (بدون لون).`;
    }

    const embed = createStyledEmbed(interaction, '🎨 نظام الألوان', color.hex)
      .setDescription(`${statusMessage}${warningMessage}`)
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

    return interaction.reply({ embeds: [embed] });

  } catch (error) {
    console.error('Colors system error:', error);
    return interaction.reply({ 
      content: `❌ حدث خطأ تقني: ${error.message}\nتأكد من أن رتبة البوت أعلى من رتب الألوان التي يحاول إدارتها.`, 
      ephemeral: true 
    });
  }
}
