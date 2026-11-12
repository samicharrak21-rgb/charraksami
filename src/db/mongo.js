const mongoose = require('mongoose');
let connected = false;
async function connectMongo(uri) {
  if (connected) return mongoose;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  connected = true;
  return mongoose;
}
function isMongoEnabled() {
  return false; // تم تعطيل MongoDB بناءً على طلب المستخدم
}
module.exports = { connectMongo, isMongoEnabled, mongoose };
