const cloud = require('wx-server-sdk');
const auth = require('./auth');
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV});
exports.main = async (event) => {
  const {openid, db} = await auth.member(cloud);
  auth.check(event.list === 'UserList', 'INVALID_COLLECTION');
  const value = auth.credit(event.value, true);
  auth.check(value !== 0, 'INVALID_CREDIT');
  auth.check(value > 0 ? event._openid !== openid : event._openid === openid, 'FORBIDDEN_CREDIT_DIRECTION');
  const query = db.collection('UserList').where({_openid: event._openid});
  const found = await query.limit(1).get();
  auth.check(found.data && found.data.length === 1, 'UNKNOWN_MEMBER');
  const conditions = {_openid: event._openid};
  if (value < 0) conditions.credit = db.command.gte(-value);
  const result = await db.collection('UserList').where(conditions).update({data: {credit: db.command.inc(value)}});
  auth.check(result.stats && result.stats.updated === 1, 'CREDIT_UPDATE_FAILED');
  return result;
};
