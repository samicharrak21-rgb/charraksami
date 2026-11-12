const { mongoose } = require('../db/mongo');
const schema = new mongoose.Schema({
  guildId: { type: String, index: true, unique: true },
  data: { type: Object, default: {} }
}, { timestamps: true });
module.exports = mongoose.model('Guild', schema);
