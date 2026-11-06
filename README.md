# Sami Bot - النسخة المُصلَحة

## ✅ ما تم إصلاحه

### 1. خطأ Railway: `Cannot find module '/app/src/index.js'`
كان السبب أن Railway كان يحاول تشغيل `node src/index.js` قبل أن تُنسخ ملفات `src/` بشكل صحيح، أو أن ملفات `.dockerignore` كانت تستبعدها. تم:
- تبسيط `nixpacks.toml` (حذف بناء canvas الأصلي).
- إزالة `Dockerfile`، `manual-deploy.js`، الملفات المكررة.
- التأكد من `Procfile` و `railway.json` صحيحة.
- استبدال `canvas` (يحتاج بناء أصلي معقد) بـ **`@napi-rs/canvas`** (binaries جاهزة لكل المنصات).

### 2. صور بدلاً من embeds
- 🪪 **`/balance`** و **`/رصيد`**: بطاقة صورة فاخرة بالأفاتار + المستوى + الترتيب.
- 📊 **`/rank`**: بطاقة بروفايل محسّنة.
- 🏆 **`/leaderboard`**: بطاقة قائمة متصدرين بالأفاتار + ميداليات. تدعم 3 أنواع:
  - XP/Level
  - Balance/Gold
  - Dungeon Wins
- 🎉 **Level Up**: بطاقة عند الترقية.

### 3. ميزات مضافة للبوت
- نظام `/leaderboard type:balance|dungeon|xp` (3 قوائم في واحدة).
- بطاقات قتال `renderBattleCard` جاهزة للدانجون.

## 🚀 النشر على Railway
1. ارفع المشروع (لا تتضمن `node_modules`).
2. أضف المتغيرات: `TOKEN`, `CLIENT_ID`, `OWNER_ID`.
3. Railway سيستخدم `nixpacks.toml` ويثبّت تلقائياً.

## 📦 المتطلبات
- Node.js 20+
- مذكورة في `package.json`
