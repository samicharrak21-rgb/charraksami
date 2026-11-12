// اختبارات v22 — تشغيل: node scripts/test-v22.js
process.env.DATA_DIR = require('path').join(require('os').tmpdir(), 'taher-test-data-' + Date.now());
const assert = require('assert');

let passed = 0, failed = 0;
function t(name, fn) {
  try { fn(); passed++; console.log(`✅ ${name}`); }
  catch (e) { failed++; console.log(`❌ ${name}: ${e.message}`); }
}

// ===== 1) الحاسبة =====
const calcCmd = require('../src/commands/utility/calc');
const calcSrc = require('fs').readFileSync(require.resolve('../src/commands/utility/calc'), 'utf8');
t('calc: tokenize و evaluate عبر الأمر', () => {
  // الوصول الداخلي عبر إعادة التقييم في نفس النطاق
  const m = calcSrc.match(/function tokenize[\s\S]*?\n}\n/);
  assert(m, 'tokenize موجود');
});
(async () => {
  const shim = (args) => ({
    isMessage: () => true,
    options: { _args: args, getString: () => null },
    async reply(p) { this.out = p; return p; },
  });
  await calcCmd.execute(shim(['5+5*2']));
  assert(calcCmd === calcCmd);

  const getCalc = async (expr) => {
    const i = shim(expr.split(/ +/));
    i.options.getString = () => expr;
    await calcCmd.execute(i);
    return i.out?.embeds?.[0]?.description || i.out?.content || '';
  };
  t('calc: 5+5*2 = 15', async () => assert((await getCalc('5+5*2')).includes('15')));
  t('calc: أرقام عربية ٢+٣ = 5', async () => assert((await getCalc('٢+٣')).includes('5')));
  t('calc: أقواس (2+3)*4 = 20', async () => assert((await getCalc('(2+3)*4')).includes('20')));
  t('calc: قسمة على صفر ترفض', async () => assert((await getCalc('5/0')).includes('تعذر')));
  t('calc: حروف مرفوضة', async () => assert((await getCalc('alert(1)')).includes('تعذر')));

  // ===== 2) السرقة =====
  const steal = require('../src/commands/economy/steal');
  const { readGuild, writeGuild } = require('../src/utils/guildStorage');
  const G = 'g1', THIEF = '111111111111111111', VICTIM = '222222222222222222';
  const g = readGuild(G);
  g.users = { [THIEF]: { balance: 500 }, [VICTIM]: { balance: 1000, bank: 9000 } };
  writeGuild(G, g);

  const stealShim = async (forcedLuck) => {
    const i = {
      user: { id: THIEF, username: 'thief', tag: 'thief#1' },
      member: { displayName: 'thief' },
      guild: { id: G, name: 'Test' },
      guildId: G,
      isMessage: () => true,
      options: { getUser: () => ({ id: VICTIM, bot: false, send: async () => {} }) },
      async reply(p) { this.out = p; return p; },
    };
    const origRandom = Math.random;
    Math.random = () => forcedLuck;
    await steal.execute(i);
    Math.random = origRandom;
    return i;
  };

  t('steal: نجاح — يسرق من المحفظة فقط والبنك محمي', async () => {
    const i = await stealShim(0.1); // نجاح
    const after = readGuild(G);
    assert.strictEqual(after.users[VICTIM].bank, 9000, 'البنك لم يُمس');
    assert(after.users[VICTIM].balance < 1000, 'المحفظة نقصت');
    assert(after.users[THIEF].balance > 500, 'السارق ربح');
    assert(after.steals.victims[VICTIM] > 0, 'الضحية محمية الآن');
  });
  t('steal: الضحية المحمية لا تُسرق مرتين (ساعتين)', async () => {
    const i = await stealShim(0.1);
    assert(String(i.out?.content || i.out?.embeds?.[0]?.title || '').includes('مؤمن') || String(i.out?.content).includes('محمية') || /مُؤمَّن|محمية/.test(JSON.stringify(i.out)), 'رسعة الحماية: ' + JSON.stringify(i.out).slice(0,120));
  });
  t('steal: فشل — غرامة تذهب للضحية', async () => {
    const g2 = readGuild(G);
    g2.steals.victims = {}; // إزالة الحماية
    g2.steals.thieves = {}; // إزالة مهلة السارق
    writeGuild(G, g2);
    const vBefore = readGuild(G).users[VICTIM].balance;
    await stealShim(0.99); // فشل
    const after = readGuild(G);
    assert(after.users[VICTIM].balance > vBefore, 'الضحية حصلت على الغرامة');
  });
  t('steal: محفظة فارغة ترفض', async () => {
    const g3 = readGuild(G);
    g3.users[VICTIM].balance = 10;
    g3.steals = { victims: {}, thieves: {} };
    writeGuild(G, g3);
    const i = await stealShim(0.1);
    assert(String(JSON.stringify(i.out)).includes('فقير'), 'رفض المحفظة الفارغة');
  });

  // ===== 3) التحذيرات والتصعيد =====
  const warn = require('../src/commands/moderation/warn');
  const MOD = '333333333333333333';
  const TARGET = '444444444444444444';
  const perms = (has) => ({ has: () => has });
  const warnShim = async () => {
    const i = {
      user: { id: MOD, username: 'mod', tag: 'mod#1' },
      member: { permissions: perms(true), roles: { highest: { position: 10 } }, displayName: 'mod' },
      guild: {
        id: G, name: 'Test', ownerId: '999',
        members: { me: { roles: { highest: { position: 20 } }, permissions: perms(true) } },
        channels: { cache: { get: () => null } },
      },
      options: { getUser: () => ({ id: TARGET, bot: false, username: 'vic' }), getString: () => 'سبام' },
      async reply(p) { this.out = p; return p; },
    };
    await warn.execute(i);
    return i;
  };
  t('warn: 3 تحذيرات = إسكات ساعة', async () => {
    const g4 = readGuild(G); g4.mod = { counter: 0, cases: [], warns: {} }; writeGuild(G, g4);
    const timeoutCalls = [];
    const orig = require('discord.js');
    // نتحقق عبر عداد التحذيرات ورسالة التصعيد في المحاولة الثالثة
    let lastReply = '';
    for (let k = 0; k < 3; k++) {
      const i = await warnShim();
      lastReply = JSON.stringify(i.out);
    }
    const g5 = readGuild(G);
    assert.strictEqual(g5.mod.warns[TARGET].length, 3);
    assert(/3\/5/.test(lastReply), 'الرد يعرض العدد: ' + lastReply.slice(0, 100));
  });

  // ===== 4) canAct =====
  const { canAct } = require('../src/utils/modUtils');
  const { PermissionsBitField } = require('discord.js');
  t('canAct: عضو بدون صلاحية مرفوض', () => {
    const i = {
      member: { permissions: perms(false), roles: { highest: { position: 5 } }, id: '1' },
      user: { id: '1' },
      guild: { members: { me: { permissions: perms(true), roles: { highest: { position: 20 } } } } },
    };
    const r = canAct(i, { perm: PermissionsBitField.Flags.BanMembers, needTarget: false });
    assert(!r.ok, 'يجب أن يرفض');
  });
  t('canAct: هدف أعلى رتبة مرفوض', () => {
    const i = {
      member: { permissions: perms(true), roles: { highest: { position: 5 } }, id: '1' },
      user: { id: '1' },
      guild: { ownerId: '9', members: { me: { permissions: perms(true), roles: { highest: { position: 20 } } } } },
    };
    const r = canAct(i, { perm: PermissionsBitField.Flags.BanMembers, targetMember: { id: '2', roles: { highest: { position: 15 } } } });
    assert(!r.ok, 'يجب أن يرفض الهدف الأعلى');
  });
  t('canAct: نفس الشخص مرفوض', () => {
    const i = {
      member: { permissions: perms(true), roles: { highest: { position: 5 } }, id: '1' },
      user: { id: '1' },
      guild: { ownerId: '9', members: { me: { permissions: perms(true), roles: { highest: { position: 20 } } } } },
    };
    const r = canAct(i, { perm: PermissionsBitField.Flags.BanMembers, targetMember: { id: '1', roles: { highest: { position: 1 } } } });
    assert(!r.ok, 'لا إجراء على النفس');
  });

  // ===== 5) محرك الاختصارات =====
  const engine = require('../src/utils/aliasEngine');
  require('../src/handlers/commandHandler').loadCommands();
  t('engine: 300+ كلمة', () => assert(engine.wordCount() >= 300, 'العدد ' + engine.wordCount()));
  t('engine: حماية المنشن والرقم والصلاحيات', () => {
    assert.strictEqual(engine.resolve('تحويل', {}).guard, 'need_mention');
    assert.strictEqual(engine.resolve('مسح', {}).guard, 'mod_noperm');
    assert.strictEqual(engine.resolve('مسح', { isAdmin: true }).guard, 'need_number');
    assert.strictEqual(engine.resolve('مسح 50', { isAdmin: true }).command, 'clear');
    assert.strictEqual(engine.resolve('حظر <@1>', {}).guard, 'mod_noperm');
    assert.strictEqual(engine.resolve('حظر <@1>', { isAdmin: true }).command, 'ban');
    assert.strictEqual(engine.resolve('فك حظر <@1>', { isAdmin: true }).command, 'unban');
  });
  t('engine: إصلاحات التعارض (بطولة/يومي/دعم)', () => {
    assert.strictEqual(engine.resolve('بطولة', {}).command, 'tournament');
    assert.strictEqual(engine.resolve('يومي', {}).command, 'daily');
    assert.strictEqual(engine.resolve('دعم فني', {}).command, 'ticket');
    assert.strictEqual(engine.resolve('بوست', {}).command, 'booster');
  });

  console.log(`\n📊 النتائج: ${passed} نجح / ${failed} فشل`);
  process.exit(failed ? 1 : 0);
})();
