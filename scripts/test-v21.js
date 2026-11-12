// اختبارات v21: قراءة الأوامر النصية، مهلات الألعاب، سلسلة النشاط
const assert = require('assert');
const { parseAmount } = require('../src/utils/textShim');
const { GAME_COOLDOWNS, cooldownLabel } = require('../src/utils/cooldowns');
const { touchStreak, titleFor } = require('../src/systems/levelInfo');

// المبالغ في الأوامر النصية
assert.strictEqual(parseAmount('500'), 500);
assert.strictEqual(parseAmount('1k'), 1000);
assert.strictEqual(parseAmount('2.5m'), 2500000);
assert.strictEqual(parseAmount('١٠٠٠'), 1000);
assert.strictEqual(parseAmount('احمر'), null);

// مهلات الكازينو أصبحت ثوانٍ بدل ساعة
for (const g of ['slots', 'roulette', 'blackjack', 'coinflip', 'rps']) assert.ok(GAME_COOLDOWNS[g] <= 10, `${g} cooldown too long`);
assert.ok(GAME_COOLDOWNS.farm <= 5, 'farm must stay interactive');
assert.strictEqual(cooldownLabel('slots'), '6ث');

// سلسلة النشاط: يوم جديد = +50 XP، والمضاعف يرتفع 5% يومياً حتى +50%
const day = 86_400_000;
const u = {};
let r = touchStreak(u, 10 * day);
assert.strictEqual(r.dailyBonus, 50);
assert.strictEqual(r.mult, 1);
r = touchStreak(u, 10 * day + 1000);
assert.strictEqual(r.dailyBonus, 0);
r = touchStreak(u, 11 * day);
assert.strictEqual(u.xp_streak, 2);
assert.ok(Math.abs(r.mult - 1.05) < 1e-9);
u.xp_streak = 30; u.xp_day = 11;
r = touchStreak(u, 12 * day);
assert.ok(Math.abs(r.mult - 1.5) < 1e-9, 'streak bonus capped at +50%');
touchStreak(u, 20 * day);
assert.strictEqual(u.xp_streak, 1, 'missing a day resets the streak');

assert.strictEqual(titleFor(1), '🌱 عضو جديد');
assert.strictEqual(titleFor(20), '💎 نجم السيرفر');

console.log('✅ v21 tests passed');
