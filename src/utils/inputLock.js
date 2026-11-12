// 🔒 inputLock v23 — لعبة تنتظر كتابة اللاعب (مثل «خمن الرقم») تحجز رسائله الرقمية في القناة
// حتى لا تُفسَّر كأوامر أخرى (مثلاً «21» = بلاك جاك) ولا يرد عليها الشات بوت.
const locks = new Map(); // `${channelId}:${userId}` -> expiresAt

const key = (c, u) => `${c}:${u}`;
function lock(channelId, userId, ms = 3 * 60 * 1000) { locks.set(key(channelId, userId), Date.now() + ms); }
function unlock(channelId, userId) { locks.delete(key(channelId, userId)); }
function isLocked(channelId, userId) {
  const k = key(channelId, userId);
  const exp = locks.get(k);
  if (!exp) return false;
  if (Date.now() > exp) { locks.delete(k); return false; }
  return true;
}
module.exports = { lock, unlock, isLocked };
