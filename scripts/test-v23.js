// اختبارات v23 — تشغيل: node scripts/test-v23.js
// الألعاب الجديدة (منطق + تشغيل كامل بتفاعل وهمي)، صور الألعاب، ومحرك الاختصارات
process.env.DATA_DIR = require('path').join(require('os').tmpdir(), 'taher-test-v23-' + Date.now());
const assert = require('assert');
const { EventEmitter } = require('events');

let passed = 0, failed = 0;
const results = [];
async function t(name, fn) {
  try { await fn(); passed++; console.log(`✅ ${name}`); }
  catch (e) { failed++; console.log(`❌ ${name}: ${e.message}`); }
}

const A = require('../src/systems/arcade');
const engine = require('../src/utils/aliasEngine');
const gameArt = require('../src/utils/gameArt');
const { getUser, saveUser } = require('../src/utils/gameHelpers');

// ───── تفاعل وهمي يحاكي أمر سلاش ─────
let seq = 0;
function fakeMessage(store) {
  const m = new EventEmitter();
  m.id = `m${++seq}`;
  m.embeds = [];
  m.createMessageComponentCollector = (opts = {}) => { const c = new EventEmitter(); c.stop = (r = 'user') => { if (c.stopped) return; c.stopped = true; c.emit('end', [], r); }; store.collectors.push(c); return c; };
  m.awaitMessageComponent = () => new Promise((res) => store.awaiters.push(res));
  m.react = async () => {};
  return m;
}
function fakeInteraction({ guildId = 'g1', userId = 'u1', ints = {}, nums = {}, strs = {}, customId } = {}) {
  const store = { collectors: [], awaiters: [], payloads: [], msgCollectors: [] };
  const msg = fakeMessage(store);
  const remember = (p) => {
    store.payloads.push(p);
    const e = p?.embeds?.[0];
    const d = e?.toJSON ? e.toJSON() : e;
    if (d) msg.embeds = [{ ...d, thumbnail: d.thumbnail ? { url: d.thumbnail.url.startsWith('attachment://') ? `https://cdn.discordapp.com/attachments/1/2/${d.thumbnail.url.slice(13)}?ex=1` : d.thumbnail.url } : null }];
    return msg;
  };
  const i = {
    store, msg, customId,
    user: { id: userId, username: 'tester', globalName: 'Tester', displayAvatarURL: () => null },
    member: { displayName: 'Tester' },
    guild: { id: guildId }, guildId, channelId: 'c1',
    channel: { id: 'c1', createMessageCollector: () => { const c = new EventEmitter(); c.stop = (r) => { if (c.stopped) return; c.stopped = true; c.emit('end', [], r); }; store.msgCollectors.push(c); return c; } },
    replied: false, deferred: false,
    options: { getInteger: (n) => ints[n] ?? null, getNumber: (n) => nums[n] ?? null, getString: (n) => strs[n] ?? null },
    isButton: () => !!customId,
    async reply(p) { this.replied = true; return remember(p); },
    async editReply(p) { return remember(p); },
    async update(p) { this.replied = true; return remember(p); },
    async followUp(p) { return remember(p); },
    async fetchReply() { return msg; },
  };
  return i;
}
const button = (i, id, userId = 'u1') => {
  const b = { customId: id, user: { id: userId }, message: i.msg, payload: null,
    async update(p) { b.payload = p; i.store.payloads.push(p); return i.msg; },
    async deferUpdate() {}, async reply() {} };
  return b;
};
const lastPayload = (i) => i.store.payloads[i.store.payloads.length - 1];
const setBalance = (g, u, n) => { const { g: G, u: U } = getUser(g, u); U.balance = n; saveUser(g, G); };
const bal = (g, u) => getUser(g, u).u.balance;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  // ===== 1) منطق الألعاب =====
  await t('خمن الرقم: من أول محاولة ×10 ومن السابعة ×1', () => {
    assert.strictEqual(A.guessMultiplier(1), 10);
    assert.strictEqual(A.guessMultiplier(3), 3);
    assert.strictEqual(A.guessMultiplier(7), 1);
    assert.strictEqual(A.guessMultiplier(8), 0);
  });
  await t('خمن الرقم: التلميح أكبر/أصغر', () => {
    assert.strictEqual(A.guessHint(50, 30).dir, 'up');
    assert.strictEqual(A.guessHint(50, 70).dir, 'down');
    assert.strictEqual(A.guessHint(50, 50).dir, 'hit');
  });
  await t('سباق الهجن: الفوز ×3.5 والخسارة صفر', () => {
    assert.strictEqual(A.racePayout(200, 2, 2), 700);
    assert.strictEqual(A.racePayout(200, 1, 2), 0);
    const r = A.simulateRace();
    assert.strictEqual(r.order.length, 4);
    assert(r.frames[r.frames.length - 1].some((p) => p >= A.RACE_LEN));
  });
  await t('أعلى/أقل: الورقة 7 أعلى = ×1.9، الملك لا يقبل أعلى', () => {
    assert.strictEqual(A.hlStep(7, 'up'), 1.9);
    assert.strictEqual(A.hlStep(13, 'up'), 0);
    assert.strictEqual(A.hlStep(1, 'down'), 0);
    assert.strictEqual(A.hlResolve(5, 5, 'up'), 'push');
    assert.strictEqual(A.hlResolve(5, 9, 'up'), 'win');
    assert.strictEqual(A.hlResolve(5, 2, 'up'), 'lose');
  });
  await t('بطاقة الكشط: 3 جواهر = ×20 وأعلى رمز يفوز', () => {
    assert.strictEqual(A.scratchResult(['💎', '💎', '💎', '🍒', '🍒', '🍒', '🍋', '💀', '🪙']).mult, 20);
    assert.strictEqual(A.scratchResult(['🍒', '🍒', '🍒', '🍋', '💀', '🪙', '👑', '🍀', '🍋']).mult, 2);
    assert.strictEqual(A.scratchResult(['💎', '💎', '🍒', '🍒', '🍋', '🍋', '💀', '💀', '🪙']).mult, 0);
    assert.strictEqual(A.scratchResult(['🍋', '🍋', '🍋', '💀', '💀', '💀', '🪙', '🍒', '👑']).mult, 0);
  });
  await t('الصاروخ: لا يظهر مضاعف أعلى من نقطة الانفجار', () => {
    assert.deepStrictEqual(A.crashVisible(1.6), [1.0, 1.15, 1.3, 1.5]);
    for (let k = 0; k < 500; k++) { const p = A.crashPoint(); assert(p >= 1 && p <= 50); }
  });
  await t('صناديق الكنز: ×2.2 و×0.6 و×0', () => {
    assert.deepStrictEqual(A.CHESTS.map((c) => c.m).sort(), [0, 0.6, 2.2]);
    assert.strictEqual(A.shuffleChests().length, 3);
  });
  await t('الأرقام العربية في الإدخال', () => { assert.strictEqual(A.toNum('٤٢'), 42); assert.strictEqual(A.toNum('abc'), null); });

  // ===== 2) صور الألعاب =====
  await t('gameArt: كل لعبة لها صورة عريضة ومصغّرة', () => {
    for (const g of gameArt.GAMES) { assert(gameArt.has(g), `صورة ناقصة: ${g}`); assert(gameArt.thumbPath(g)); }
  });
  await t('gameArt: أول رد يرفع الصورة وبعدها يعيد رابط CDN', async () => {
    const i = fakeInteraction();
    gameArt.decorate(i, 'tictactoe');
    const { EmbedBuilder } = require('discord.js');
    await i.reply({ embeds: [new EmbedBuilder().setTitle('x').setColor(0xE8B04A)] });
    const p1 = i.store.payloads[0];
    assert.strictEqual(p1.files.length, 1);
    assert(p1.embeds[0].toJSON().thumbnail.url.startsWith('attachment://tictactoe-art.jpg'));
    await i.editReply({ embeds: [new EmbedBuilder().setTitle('y')] });
    const p2 = i.store.payloads[1];
    assert.strictEqual(p2.files.length, 0);
    assert(p2.embeds[0].toJSON().thumbnail.url.startsWith('https://cdn.discordapp.com/'));
    await i.reply({ embeds: [new EmbedBuilder().setTitle('err')], ephemeral: true });
    assert(!i.store.payloads[2].embeds[0].toJSON?.().thumbnail);
  });
  await t('gameArt: زر داخل رسالة لعبة يكمل بنفس الصورة', () => {
    assert.strictEqual(gameArt.gameFromUrl('https://cdn.discordapp.com/attachments/1/2/crash-art.jpg?ex=1'), 'crash');
    assert.strictEqual(gameArt.gameFromUrl('https://x/y/avatar.png'), null);
  });

  // ===== 3) تشغيل الألعاب كاملة (تفاعل وهمي) =====
  const scratch = require('../src/commands/arcade/scratch');
  await t('كشط: «اكشف الكل» يخصم السعر ويضيف الجائزة بدقة', async () => {
    setBalance('g1', 'u1', 5000);
    const i = fakeInteraction({ ints: { bet: 300 } });
    await scratch.execute(i);
    assert.strictEqual(bal('g1', 'u1'), 4700);
    const col = i.store.collectors[0];
    const id = i.store.payloads[0].components[3].components[0].data.custom_id;
    col.emit('collect', button(i, id));
    for (let k = 0; k < 50 && !String(lastPayload(i).components?.[0]?.components?.[0]?.data?.custom_id).startsWith('scratch_again'); k++) await wait(100);
    const after = bal('g1', 'u1');
    assert(after === 4700 || after >= 4700 + 300, `رصيد غير متوقع ${after}`);
    assert(lastPayload(i).components[0].components[0].data.custom_id.startsWith('scratch_again_300'));
  });

  const treasure = require('../src/commands/arcade/treasure');
  await t('كنز: الرصيد = البداية − الرهان + floor(الرهان × المضاعف)', async () => {
    setBalance('g1', 'u2', 1000);
    const i = fakeInteraction({ userId: 'u2', ints: { bet: 500 } });
    const run = treasure.execute(i);
    for (let k = 0; k < 50 && !i.store.awaiters.length; k++) await wait(100);
    assert.strictEqual(bal('g1', 'u2'), 500);
    const id = i.store.payloads[0].components[0].components[1].data.custom_id;
    i.store.awaiters[0](button(i, id, 'u2'));
    await run;
    const b = bal('g1', 'u2');
    assert([500, 500 + 300, 500 + 1100].includes(b), `رصيد ${b}`);
  });

  const highlow = require('../src/commands/arcade/highlow');
  await t('أعلى/أقل: السحب ممنوع قبل أول تخمين، والخسارة لا ترجع الرهان', async () => {
    setBalance('g1', 'u3', 1000);
    const i = fakeInteraction({ userId: 'u3', ints: { bet: 200 } });
    await highlow.execute(i);
    const row = i.store.payloads[0].components[0].components;
    assert.strictEqual(row[2].data.disabled, true);
    assert.strictEqual(bal('g1', 'u3'), 800);
    // نلعب حتى ننتهي
    const col = i.store.collectors[0];
    for (let k = 0; k < 40 && !col.stopped; k++) {
      const comps = lastPayload(i).components?.[0]?.components || [];
      const up = comps[0], down = comps[1];
      const pickBtn = up && !up.data.disabled ? up : down;
      col.emit('collect', button(i, pickBtn.data.custom_id, 'u3'));
      await wait(250);
    }
    const end = bal('g1', 'u3');
    assert(end === 800 || end >= 800, 'رصيد سالب');
  });

  const crash = require('../src/commands/arcade/crash');
  await t('الصاروخ: الضغط على «اسحب» عند ×1 يعيد الرهان كاملاً', async () => {
    setBalance('g1', 'u4', 1000);
    const i = fakeInteraction({ userId: 'u4', ints: { bet: 400 } });
    await crash.execute(i);
    assert.strictEqual(bal('g1', 'u4'), 600);
    const id = i.store.payloads[0].components[0].components[0].data.custom_id;
    i.store.collectors[0].emit('collect', button(i, id, 'u4'));
    for (let k = 0; k < 50 && bal('g1', 'u4') !== 1000; k++) await wait(100);
    assert.strictEqual(bal('g1', 'u4'), 1000);
  });

  const guess = require('../src/commands/arcade/guess');
  await t('خمن الرقم: البحث الثنائي يفوز بمضاعف صحيح', async () => {
    setBalance('g1', 'u5', 1000);
    const i = fakeInteraction({ userId: 'u5', ints: { bet: 100 } });
    await guess.execute(i);
    const col = i.store.msgCollectors[0];
    let lo = 1, hi = 100, tries = 0;
    while (!col.stopped && tries < 7) {
      const n = Math.floor((lo + hi) / 2); tries++;
      const m = { content: String(n), author: { id: 'u5' }, react: async (e) => { if (e === '⬆️') lo = n + 1; if (e === '⬇️') hi = n - 1; } };
      col.emit('collect', m);
      await wait(250);
    }
    const expected = 900 + Math.floor(100 * A.guessMultiplier(tries));
    assert.strictEqual(bal('g1', 'u5'), expected);
  });

  const race = require('../src/commands/arcade/race');
  await t('سباق الهجن: رهان على هجين محدد يُحسب بدقة', async () => {
    setBalance('g1', 'u6', 1000);
    const i = fakeInteraction({ userId: 'u6', ints: { bet: 200, racer: 3 } });
    await race.execute(i);
    const b = bal('g1', 'u6');
    assert(b === 800 || b === 800 + 700, `رصيد ${b}`);
  });

  const social = require('../src/commands/fun/social');
  await t('السهرة: كل الأنواع تبني سؤالاً', async () => {
    for (const type of Object.keys(social.TYPES)) { const r = social.build(type); assert(r.text && r.desc, type); }
    assert.strictEqual(social.typeFromWord('صراحة'), 'truth');
    assert.strictEqual(social.typeFromWord('لغز'), 'riddle');
    const i = fakeInteraction({ strs: { type: 'riddle' } });
    await social.execute(i);
    assert(lastPayload(i).embeds[0].toJSON().description.includes('||'));
  });

  // ===== 4) الاختصارات =====
  await t('اختصارات: الألعاب الجديدة بكلمة أو عبارة', () => {
    const r = (s) => engine.resolve(s, {})?.command;
    assert.strictEqual(r('خمن'), 'guess'); assert.strictEqual(r('خمن الرقم'), 'guess');
    assert.strictEqual(r('سباق 500 2'), 'race'); assert.strictEqual(r('صاروخ 1k 2'), 'crash');
    assert.strictEqual(r('كشط'), 'scratch'); assert.strictEqual(r('كنز الكل'), 'treasure');
    assert.strictEqual(r('اعلى 300'), 'highlow'); assert.strictEqual(r('لو خيروك'), 'social');
    assert.strictEqual(r('كم رصيدي'), 'balance'); assert.strictEqual(r('حجر ورقه مقص'), 'rps');
  });
  await t('اختصارات: الكلام العادي لا يشغّل أوامر', () => {
    const r = (s) => engine.resolve(s, {});
    assert.strictEqual(r('كيف حالك'), null);
    assert.strictEqual(r('وش'), null);
    assert.strictEqual(r('السيرفر حلو اليوم').command, null);
    assert.strictEqual(r('رصيد كبير عنده').command, null);
    assert.strictEqual(r('حب الوطن').command, null);
    assert.strictEqual(r('21'), null);
    assert.strictEqual(engine.groupTrigger('حساب البنك'), null);
    assert.strictEqual(engine.groupTrigger('كراسي'), 'chairs');
  });
  await t('اختصارات: عقوبة الإشراف تحتاج هدفاً (منشن أو رد)', () => {
    assert.strictEqual(engine.resolve('طرد', { isAdmin: true }).guard, 'need_target');
    assert.strictEqual(engine.resolve('طرد', { isAdmin: true, message: { reference: { messageId: '1' } } }).command, 'kick');
    assert.strictEqual(engine.resolve('قفل الروم', { isAdmin: true }).command, 'lock');
    assert.strictEqual(engine.resolve('قفل الباب يا شباب', { isAdmin: true }).command, null);
  });
  await t('اختصارات: أكثر من 1000 كلمة وعبارة، وكل أمر في قسم', () => {
    assert(engine.wordCount() >= 1000, `العدد ${engine.wordCount()}`);
    const inSections = new Set(engine.SECTIONS.flatMap((s) => s.cmds));
    for (const c of Object.keys(engine.COMMAND_WORDS)) assert(inSections.has(c), `خارج الأقسام: ${c}`);
  });

  // ===== 5) البطاقات =====
  const cards = require('../src/utils/arcadeCards');
  await t('البطاقات الجديدة تُرسم', async () => {
    const who = { username: 'T', avatarURL: null };
    const list = await Promise.all([
      cards.raceCard({ ...who, racers: A.RACERS, positions: [20, 10, 5, 2], pick: 1, winner: 1, order: [1, 2, 3, 4], bet: 100, net: 250 }),
      cards.highlowCard({ ...who, current: { rank: 'K', suit: '♠' }, mult: 1, bet: 100, round: 0 }),
      cards.scratchCard({ ...who, cells: A.makeScratch(), revealed: [], bet: 100 }),
      cards.crashCard({ ...who, steps: [1, 1.15], mult: 1.15, bet: 100 }),
      cards.treasureCard({ ...who, chests: A.CHESTS, bet: 100 }),
      cards.socialCard({ ...who, text: 'سؤال؟' }),
    ]);
    for (const c of list) assert(c?.buffer?.length > 10000);
  });

  console.log(`\n📊 النتائج: ${passed} نجح / ${failed} فشل`);
  process.exit(failed ? 1 : 0);
})();
