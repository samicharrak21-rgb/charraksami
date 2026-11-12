// نظام الأحداث العشوائية للدانجون - يُستدعى أثناء الجولات لإضافة عمق
const EVENTS = [
  { id: 'treasure',  weight: 12, title: '💰 صندوق كنز', desc: 'وجدت صندوقاً مخفياً!', effect: { gold: [50, 200] } },
  { id: 'fountain',  weight: 10, title: '⛲ نافورة الحياة', desc: 'مياه مقدسة تُعيد جزءاً من صحتك.', effect: { hpPct: 0.3 } },
  { id: 'merchant',  weight: 8,  title: '🧙 تاجر متجوّل', desc: 'يعرض عليك جرعة بثلث السعر.', effect: { discount: 0.66 } },
  { id: 'trap',      weight: 8,  title: '🪤 فخ مخفي', desc: 'سقطت في فخ! تخسر بعض الصحة.', effect: { hpPct: -0.15 } },
  { id: 'shrine',    weight: 6,  title: '🕯️ مذبح غامض', desc: '+10% ضرر لباقي الجولة.', effect: { atkBuff: 0.1, duration: 3 } },
  { id: 'rare_mob',  weight: 5,  title: '👹 وحش نادر', desc: 'يظهر فجأة! مكافأة مضاعفة عند هزيمته.', effect: { lootMul: 2 } },
  { id: 'goldsack',  weight: 4,  title: '💎 كيس جواهر', desc: 'كيس مليء بالجواهر!', effect: { gold: [200, 500] } },
  { id: 'curse',     weight: 3,  title: '☠️ لعنة قديمة', desc: '-10% ضرر لباقي الجولة.', effect: { atkBuff: -0.1, duration: 3 } },
  { id: 'blessing',  weight: 2,  title: '✨ بركة الإلهة', desc: 'الجولة القادمة بدون ضرر.', effect: { invuln: 1 } }
];

function pickEvent() {
  const total = EVENTS.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of EVENTS) {
    if ((r -= e.weight) <= 0) return e;
  }
  return EVENTS[0];
}

const LOOT_TIERS = [
  { tier: 'common',    chance: 0.55, color: 0x9aa0a6, mul: 1.0 },
  { tier: 'rare',      chance: 0.25, color: 0x4f7cff, mul: 1.6 },
  { tier: 'epic',      chance: 0.13, color: 0xa45cff, mul: 2.4 },
  { tier: 'legendary', chance: 0.06, color: 0xffb547, mul: 4.0 },
  { tier: 'mythic',    chance: 0.01, color: 0xff5577, mul: 8.0 }
];

function rollLoot() {
  let r = Math.random();
  for (const t of LOOT_TIERS) {
    if (r < t.chance) return t;
    r -= t.chance;
  }
  return LOOT_TIERS[0];
}

module.exports = { EVENTS, pickEvent, LOOT_TIERS, rollLoot };
