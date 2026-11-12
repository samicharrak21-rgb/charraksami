// اختبارات v24 — البنك بالأوامر العربية، اختيار الأمر الفرعي، البطاقات العصرية والـ GIF
process.env.DATA_DIR = require('path').join(require('os').tmpdir(), 'taher-test-v24-' + Date.now());
const assert = require('assert');
let passed = 0, failed = 0;
async function t(name, fn) { try { await fn(); passed++; console.log(`✅ ${name}`); } catch (e) { failed++; console.log(`❌ ${name}: ${e.stack}`); } }

const { createTextInteraction } = require('../src/utils/textShim');
const engine = require('../src/utils/aliasEngine');
const bank = require('../src/commands/economy/bank');
const { getUser, saveUser } = require('../src/utils/gameHelpers');
const M = require('../src/utils/modernCards');
const media = require('../src/utils/gameMedia');

function run(text, { guildId = 'g1', userId = 'u1' } = {}) {
  const r = engine.resolve(text, { guildId });
  assert.strictEqual(r?.command, 'bank', `«${text}» should open bank, got ${r?.command}/${r?.guard}`);
  const sent = [];
  const message = {
    author: { id: userId, username: 'sami', displayAvatarURL: () => null }, member: null,
    guild: { id: guildId, members: { cache: new Map() } }, channel: { id: 'c1', send: async (p) => (sent.push(p), {}) },
    mentions: { users: new Map(), channels: new Map(), roles: new Map() }, attachments: new Map(), createdTimestamp: Date.now(),
    reply: async (p) => { sent.push(p); return { edit: async (q) => sent.push(q), delete: async () => {} }; },
  };
  message.mentions.channels.first = () => null; message.mentions.roles.first = () => null; message.attachments.first = () => null;
  const client = { user: { id: 'bot' }, users: { cache: new Map() } };
  const shim = createTextInteraction({ message, client, commandName: 'bank', args: r.args, isPrefixCommand: false, cmd: bank, trigger: r.word,
    balanceOf: () => getUser(guildId, userId).u.balance });
  return bank.execute(shim).then(() => sent);
}
const set = (wallet, bankBal = 0, extra = {}) => { const { g, u } = getUser('g1', 'u1'); u.balance = wallet; u.bank = { balance: bankBal, lastInterest: Date.now(), loan: 0, loanDue: 0, ...extra }; saveUser('g1', g); };
const st = () => getUser('g1', 'u1').u;

(async () => {
  await t('«بنك» وحدها تعرض الحساب ولا تفشل', async () => { set(1000, 0); const s = await run('بنك'); assert.ok(s.length >= 1); assert.strictEqual(st().balance, 1000); });
  await t('«ايداع 500» يودع 500', async () => { set(1000, 0); await run('ايداع 500'); assert.strictEqual(st().balance, 500); assert.strictEqual(st().bank.balance, 500); });
  await t('«ايداع الكل» يودع كل المحفظة', async () => { set(1200, 0); await run('ايداع الكل'); assert.strictEqual(st().balance, 0); assert.strictEqual(st().bank.balance, 1200); });
  await t('«سحب الكل» يسحب كل البنك (وليس قيمة المحفظة)', async () => { set(100, 900); await run('سحب الكل'); assert.strictEqual(st().balance, 1000); assert.strictEqual(st().bank.balance, 0); });
  await t('«سحب 300» يسحب 300', async () => { set(0, 900); await run('سحب 300'); assert.strictEqual(st().balance, 300); assert.strictEqual(st().bank.balance, 600); });
  await t('«بنك ايداع 2k» يودع 2000', async () => { set(5000, 0); await run('بنك ايداع 2k'); assert.strictEqual(st().bank.balance, 2000); });
  await t('«سحب نص» يسحب نصف البنك', async () => { set(0, 1000); await run('سحب نص'); assert.strictEqual(st().bank.balance, 500); });
  await t('«قرض 1000» يعطي 1000 ويسجل 1150 مستحقاً', async () => { set(0, 0); await run('قرض 1000'); assert.strictEqual(st().balance, 1000); assert.strictEqual(st().bank.loan, 1150); });
  await t('«سدد الكل» يسدد من المحفظة', async () => { set(2000, 0, { loan: 1150, loanDue: Date.now() + 1e9 }); await run('سدد الكل'); assert.strictEqual(st().bank.loan, 0); assert.strictEqual(st().balance, 850); });
  await t('لا يمكن سحب أكثر من البنك', async () => { set(0, 100); await run('سحب 500'); assert.strictEqual(st().bank.balance, 100); });
  await t('الفائدة 2% يومياً مركبة', async () => { const u = { bank: { balance: 10000, lastInterest: Date.now() - 2 * 86400000 } }; const got = bank._test.applyInterest(u); assert.strictEqual(got, 404); });
  await t('القرض المتأخر يُخصم تلقائياً', async () => { const u = { balance: 500, bank: { balance: 300, loan: 1000, loanDue: Date.now() - 1000 } }; bank._test.collectOverdue(u); assert.strictEqual(u.bank.loan, 200); assert.strictEqual(u.balance, 0); });
  await t('بطاقة الرصيد تُرسم PNG', async () => { const c = await M.balanceCard({ username: 'سامي', wallet: 10, bank: 5 }); assert.ok(c.buffer.length > 10000); });
  await t('بطاقة البنك تُرسم PNG', async () => { const c = await M.bankCard({ username: 'سامي', wallet: 10, bank: 5, max: 100 }); assert.ok(c.buffer.length > 10000); });
  await t('بطاقة المستوى تُرسم PNG', async () => { const c = await M.rankCard({ username: 'سامي', level: 3, xp: 5, nextXP: 10 }); assert.ok(c.buffer.length > 10000); });
  await t('بطاقة صعود المستوى GIF متحركة', async () => { const c = await M.levelUpCard({ username: 'سامي', level: 5, oldLevel: 4 }); assert.strictEqual(c.name, 'levelup.gif'); assert.strictEqual(c.buffer.slice(0, 3).toString(), 'GIF'); });
  await t('كل لعبة رئيسية لها GIF', async () => { for (const k of ['daily', 'work', 'coinflip', 'dice', 'slots', 'crash', 'treasure', 'race', 'steal', 'lottery']) assert.ok(media.introGif(k), k); });
  const brain = require('../src/systems/chatBrain');
  const say = (m) => brain.reply(m, { name: 'سامي', userId: 'u9', channelId: 'c9', botName: 'طاهر' });
  await t('الشات بوت يحسب «كم 12*3»', async () => { assert.ok(say('كم 12*3').includes('36')); });
  await t('الشات بوت يختار من «شاي ولا قهوة»', async () => { assert.ok(/شاي|قهوه|قهوة/.test(say('شاي ولا قهوة'))); });
  await t('الشات بوت يشرح البنك', async () => { assert.ok(say('كيف اودع في البنك').includes('ايداع')); });
  await t('الشات بوت لا يكرر نفس الرد 5 مرات متتالية', async () => { const r = new Set(); for (let i = 0; i < 5; i++) r.add(say('هلا')); assert.ok(r.size >= 3); });
  await t('اللغز: الجواب الصحيح يُقبل', async () => { say('لغز'); const a = brain._state.riddles.get('c9').a; assert.ok(say(a).includes('الجواب')); });
  const farm = require('../src/commands/rpg/farm.js')._test;
  await t('متجر المزرعة: الصومعة ترفع بيع المخزون 25%', async () => { const f = { inventory: { carrots: 2 }, items: {} }; assert.strictEqual(farm.inventoryValue(f).total, 240); f.items.silo = 1; assert.strictEqual(farm.inventoryValue(f).total, 375); });
  await t('متجر المزرعة: المجرفة الذهبية +20%', async () => { assert.strictEqual(farm.goldMul({ items: { golden_hoe: 1 } }), 1.2); assert.strictEqual(farm.goldMul({ items: {} }), 1); });
  await t('بطاقة الأذكار والسرقة ومتجر المزرعة تُرسم', async () => {
    assert.ok((await M.adhkarCard({ title: 'أذكار', text: 'سبحان الله', count: 3, kind: 'morning' })).buffer.length > 10000);
    assert.ok((await M.stealCard({ success: false, amount: 50 })).buffer.length > 10000);
    assert.ok((await M.shopGridCard({ items: [{ emoji: '🎃', name: 'فزاعة', price: 10 }] })).buffer.length > 10000);
  });
  const { SETS } = require('../src/data/adhkar');
  await t('الأذكار: صباح ومساء ونوم كلها موجودة', async () => { for (const k of ['morning', 'evening', 'sleep', 'general']) assert.ok(SETS[k].list.length >= 5, k); });
  console.log(`\n${passed} ✅ / ${failed} ❌`);
  process.exit(failed ? 1 : 0);
})();
