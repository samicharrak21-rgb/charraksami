const map = new Map();

function setTemp(userId, data) {
  const k = String(userId);
  const prev = map.get(k) || {};
  const merged = { ...prev, ...data };
  map.set(k, merged);
}

function getTemp(userId) {
  return map.get(String(userId));
}

function clearTemp(userId) {
  map.delete(String(userId));
}

module.exports = { setTemp, getTemp, clearTemp };
