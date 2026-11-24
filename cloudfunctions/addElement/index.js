const cloud = require('wx-server-sdk');
const auth = require('./auth');
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV});
exports.main = async (event) => {
  const {openid, db} = await auth.member(cloud);
  const query = auth.collection(db, event.list, true);
  const title = typeof event.title === 'string' ? event.title.trim() : '';
  const desc = typeof event.desc === 'string' ? event.desc : '';
  auth.check(title.length > 0 && title.length <= 100 && desc.length <= 2000, 'INVALID_TEXT');
  return query.add({data: {
    _openid: openid, date: db.serverDate(), credit: auth.credit(event.credit),
    title, desc, available: true, star: false
  }});
};
