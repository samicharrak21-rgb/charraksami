// node scripts/test-level-rewards.js
const assert = require('assert');
const R = require('../src/systems/levelRewards');

// الافتراضي: 100 + 50 × (L-1)
assert.strictEqual(R.rewardForLevel(R.getRewardConfig({}), 2), 150);
assert.strictEqual(R.rewardForLevel(R.getRewardConfig({}), 10), 550);
// مخصص لمستوى معين يستبدل المعادلة
const g = {}; R.setRewardConfig(g, { custom: { 10: 5000 } });
assert.strictEqual(R.rewardForLevel(R.getRewardConfig(g), 10), 5000);
// تخطي عدة مستويات يجمع مكافآتها ويضيفها للرصيد
const u = { balance: 1000 };
assert.strictEqual(R.grantLevelReward({}, u, 1, 3), 150 + 200);
assert.strictEqual(u.balance, 1350);
// الإيقاف = لا مكافأة
const off = {}; R.setRewardConfig(off, { enabled: false });
const u2 = { balance: 10 };
assert.strictEqual(R.grantLevelReward(off, u2, 1, 5), 0);
assert.strictEqual(u2.balance, 10);
console.log('✅ level rewards tests passed');
