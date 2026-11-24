const cloud = require('wx-server-sdk');
const auth = require('./auth');
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV});
const crypto = require('crypto');
exports.main = async () => {
  const {openid, db} = await auth.member(cloud);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = crypto.randomInt(1000, 10000).toString();
    const exists = await db.collection('match_codes').where({code}).limit(1).get();
    if (exists.data.length) continue;
    await db.collection('match_codes').add({data: {
      code, users: [openid], createdAt: db.serverDate(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }});
    return {success: true, code};
  }
  return {success: false, error: 'PLEASE_RETRY'};
};
