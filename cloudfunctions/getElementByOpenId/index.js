const cloud = require('wx-server-sdk');
const auth = require('./auth');
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV});
exports.main = async (event) => {
  const {openid, db} = await auth.member(cloud);
  auth.check(typeof event._openid === 'string' && event._openid.length > 0, 'INVALID_OPENID');
  const query = auth.collection(db, event.list);
  if (event.list === 'StorageList') auth.check(event._openid === openid, 'FORBIDDEN_OWNER');
  return query.where({_openid: event._openid}).get();
};
