# 🚀 إعداد البوت على Railway - دليل شامل

## 📋 المتطلبات الأساسية

1. **حساب GitHub** - [github.com](https://github.com)
2. **حساب Railway** - [railway.app](https://railway.app)
3. **بطاقة ائتمانية** - للاشتراك (خطة مجانية متوفرة)

## 🔧 الخطوات بالتفصيل

### الخطوة 1: إعداد المتغيرات البيئية

في Railway Dashboard → Variables، أضف:

```env
TOKEN=توكن_البوت_الحقيقي
CLIENT_ID=ايدي_البوت_الحقيقي
OWNER_ID=ايدي_حسابك_في_ديسكورد
CLIENT_SECRET=السكرت_كود_من_ديفيلوبر_بورتال
NODE_ENV=production
```

### الخطوة 2: إعداد بوت Discord

1. اذهب إلى [Discord Developer Portal](https://discord.com/developers/applications)
2. اختر تطبيق البوت
3. في **Bot → Privileged Gateway Intents**:
   - ✅ MESSAGE CONTENT INTENT
   - ✅ SERVER MEMBERS INTENT
4. في **OAuth2 → URL Generator**:
   - اختر `bot` و `applications.commands`
   - انسخ الرابط وأضف البوت للسيرفر

### الخطوة 3: رفع الكود إلى GitHub

```bash
git init
git add .
git commit -m "Ready for Railway deployment"
git branch -M main
git remote add origin https://github.com/username/sami-bot.git
git push -u origin main
```

### الخطوة 4: إنشاء مشروع Railway

1. سجل في [railway.app](https://railway.app)
2. اختر "New Project"
3. اختر "Deploy from GitHub repo"
4. اختر الريبو الخاص بك
5. اختر "Add Variables" وأضف المتغيرات

### الخطوة 5: نشر الأوامر

شغل هذا الأمر محلياً مرة واحدة:

```bash
node src/deploy-commands.js
```

## 📁 الملفات المضافة

### **railway.json**
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm install",
    "watchPatterns": ["src/**", "package.json"]
  },
  "deploy": {
    "startCommand": "node src/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10,
    "healthcheckPath": "/",
    "healthcheckTimeout": 100,
    "healthcheckInterval": 30
  }
}
```

### **nixpacks.toml**
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "npm", "git"]

[phases.build]
cmds = ["npm ci --only=production"]

[start]
cmd = "node src/index.js"

[variables]
NODE_ENV = "production"
```

### **Procfile**
```
worker: node src/index.js
```

### **Dockerfile (للاستخدام المستقبلي)**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
RUN addgroup -g 1001 -S nodejs
RUN adduser -S sami -u 1001
RUN chown -R sami:nodejs /app
USER sami
CMD ["node", "src/index.js"]
```

### **src/health.js**
- خادم health check للمراقبة
- يعمل على المنفذ 3000
- يعرض حالة البوت

## 🔍 المراقبة والتحقق

### **Health Check**
زور: `https://your-app.railway.app/health`

الرد:
```json
{
  "status": "healthy",
  "timestamp": "2024-02-25T02:25:00.000Z",
  "uptime": 3600,
  "memory": {...},
  "bot": "Sami Bot - Discord RPG Bot"
}
```

### **Logs في Railway**
- اذهب إلى مشروعك في Railway
- اختر "View Logs"
- شاهد Logs مباشرة
- ابحث عن أخطاء أو تحذيرات

## 🚨 استكشاف الأخطاء

### **مشكلة: البوت لا يبدأ**
```bash
# تحقق من الـ Logs
# أضف هذا للـ Variables:
DEBUG=*
```

### **مشكلة: الأوامر لا تعمل**
1. شغل `node src/deploy-commands.js` محلياً
2. تأكد من صحة CLIENT_ID
3. أعد تشغيل البوت في Railway

### **مشكلة: خطأ في TOKEN**
1. تحقق من التوكن في Discord Developer Portal
2. تأكد من إضافته في Railway Variables
3. أعد تشغيل البوت

## 📊 الموارد والتكاليف

### **خطة Railway المجانية:**
- ✅ 512MB RAM
- ✅ 1GB Storage
- ✅ 500 ساعة شهرياً
- ✅ كافي للبوت الصغير

### **تحسين الموارد:**
```javascript
// في config.js
module.exports = {
  // تقليل استخدام الذاكرة
  CACHE_SIZE: 100,
  // تنظيف دوري
  CLEANUP_INTERVAL: 300000
};
```

## 🔄 النشر التلقائي

عند رفع تحديثات إلى GitHub:
1. Railway يكتشف التغييرات
2. يعيد بناء المشروع
3. ينشر التحديث تلقائياً
4. يعيد تشغيل البوت

## 🎯 أفضل الممارسات

### **1. استخدام Environment Variables**
```javascript
// بدلاً من القيم الثابتة
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
```

### **2. معالجة الأخطاء**
```javascript
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});
```

### **3. Graceful Shutdown**
```javascript
process.on('SIGTERM', () => {
  console.log('SIGTERM received');
  // تنظيف الموارد
  process.exit(0);
});
```

## 📱 التحقق من النشر

### **قائمة التحقق:**
- [ ] المتغيرات البيئية مضافة
- [ ] الكود مرفوع إلى GitHub
- [ ] المشروع منشور على Railway
- [ ] البوت متصل بالسيرفر
- [ ] الأوامر تعمل
- [ ] Health check يعمل
- [ ] Logs نظيفة

### **اختبار سريع:**
1. `/farm` - يجب أن يعمل
2. `!مزرعة` - يجب أن يعمل
3. `/dungeon` - يجب أن يعمل
4. `/balance` - يجب أن يعرض الرصيد

## 🎉 النتيجة النهائية

**البوت يعمل 24/7 على Railway!** 🚀

- 🔄 **نشر تلقائي** مع كل تحديث
- 📊 **مراقبة مستمرة** عبر health check
- 🛠️ **Logs تفصيلية** للتشخيص
- 💾 **بيانات محفوظة** بشكل آمن
- ⚡ **أداء محسن** للبيئة الإنتاجية

---

**للمساعدة:** تحقق من `RAILWAY.md` أو تواصل مع الدعم الفني!
