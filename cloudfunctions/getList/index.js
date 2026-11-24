const cloud = require('wx-server-sdk');
const auth = require('./auth');
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV});
exports.main = async (event) => {
  const {openid, db} = await auth.member(cloud);
  const query = auth.collection(db, event.list);
  return event.list === 'StorageList' ? query.where({_openid: openid}).get() : query.get();
};
