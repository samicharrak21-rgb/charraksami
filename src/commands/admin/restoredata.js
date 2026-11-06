const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { connectMongo, isMongoEnabled } = require('../../db/mongo');
const Guild = require('../../models/Guild');
const User = require('../../models/User');
const { DATA_DIR } = require('../../config');

module.exports = {
  aliases: ['استعادة'],
  data: new SlashCommandBuilder()
    .setName('restoredata')
    .setDescription('♻️ استعادة البيانات السابقة من ملفات JSON إلى قاعدة البيانات')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sc => sc
      .setName('guild')
      .setDescription('استعادة بيانات هذا السيرفر')
    )
    .addSubcommand(sc => sc
      .setName('user')
      .setDescription('استعادة بيانات مستخدم محدد')
      .addUserOption(o => o.setName('target').setDescription('المستخدم').setRequired(true))
    )
    .addSubcommand(sc => sc
      .setName('all')
      .setDescription('استعادة جميع البيانات الموجودة في المجلد (سيرفرات ومستخدمين)')
    )
    .addSubcommand(sc => sc
      .setName('status')
      .setDescription('فحص حالة ملفات البيانات المحلية')
    ),
  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });
    
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      const guildsCount = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).length : 0;
      const usersDir = path.join(DATA_DIR, 'users');
      const usersCount = fs.existsSync(usersDir) ? fs.readdirSync(usersDir).filter(f => f.endsWith('.json')).length : 0;
      
      return interaction.editReply(`📊 **حالة ملفات البيانات:**\n- سيرفرات: \`${guildsCount}\` ملف\n- مستخدمين: \`${usersCount}\` ملف\n\n⚠️ إذا كانت الأرقام 0، فهذا يعني أن الملفات غير موجودة في هذا السيرفر (Railway). يجب رفعها أو تشغيل الترحيل محلياً.`);
    }

    if (!isMongoEnabled()) {
      return interaction.editReply('❌ لم يتم ضبط MONGODB_URI. فضلاً أضفه في المتغيرات البيئية ثم أعد المحاولة.');
    }

    try {
      await connectMongo(process.env.MONGODB_URI);
    } catch (e) {
      console.error('Migration connection error:', e);
      return interaction.editReply(`❌ فشل الاتصال بقاعدة Mongo: ${e.message}`);
    }

    const guildId = interaction.guildId;

    try {
      if (sub === 'guild') {
        const filePath = path.join(DATA_DIR, `${guildId}.json`);
        if (!fs.existsSync(filePath)) {
          return interaction.editReply('⚠️ لا توجد بيانات سابقة لهذا السيرفر في الملفات المحلية لهذه الحاوية.');
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw || '{}');
        await Guild.updateOne({ guildId }, { guildId, data }, { upsert: true });

        const embed = new EmbedBuilder()
          .setColor(0x22c55e)
          .setTitle('✅ تم استعادة بيانات السيرفر')
          .setDescription(`تم نقل البيانات من \`${guildId}.json\` إلى MongoDB`);
        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === 'all') {
        let gCount = 0;
        let uCount = 0;

        // Migrate Guilds
        if (fs.existsSync(DATA_DIR)) {
          const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
          for (const file of files) {
            try {
              const gid = path.basename(file, '.json');
              if (!/^\d{17,20}$/.test(gid)) continue;
              const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
              const data = JSON.parse(raw || '{}');
              await Guild.updateOne({ guildId: gid }, { guildId: gid, data }, { upsert: true });
              gCount++;
            } catch (e) { console.error(`Error migrating guild file ${file}:`, e); }
          }
        }

        // Migrate Users
        const usersDir = path.join(DATA_DIR, 'users');
        if (fs.existsSync(usersDir)) {
          const userFiles = fs.readdirSync(usersDir).filter(f => f.endsWith('.json'));
          for (const file of userFiles) {
            try {
              const uid = path.basename(file, '.json');
              if (!/^\d{17,20}$/.test(uid)) continue;
              const raw = fs.readFileSync(path.join(usersDir, file), 'utf8');
              const data = JSON.parse(raw || '{}');
              await User.updateOne({ userId: uid }, { userId: uid, data }, { upsert: true });
              uCount++;
            } catch (e) { console.error(`Error migrating user file ${file}:`, e); }
          }
        }

        return interaction.editReply(`✅ **اكتمل الترحيل الشامل:**\n- تم نقل \`${gCount}\` سيرفر\n- تم نقل \`${uCount}\` مستخدم\nإلى قاعدة البيانات بنجاح.`);
      }

      if (sub === 'user') {
        const user = interaction.options.getUser('target');
        const usersDir = path.join(DATA_DIR, 'users');
        const filePath = path.join(usersDir, `${user.id}.json`);
        if (!fs.existsSync(filePath)) {
          return interaction.editReply(`⚠️ لا توجد بيانات سابقة للمستخدم **${user.tag}** في الملفات المحلية.`);
        }
        const raw = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(raw || '{}');
        await User.updateOne({ userId: user.id }, { userId: user.id, data }, { upsert: true });

        return interaction.editReply(`✅ تم استعادة بيانات المستخدم **${user.tag}** إلى MongoDB.`);
      }

      return interaction.editReply('⚠️ أمر غير معروف.');
    } catch (err) {
      console.error('Restore command error:', err);
      return interaction.editReply(`❌ حدث خطأ غير متوقع: ${err.message}`);
    }
  }
};
