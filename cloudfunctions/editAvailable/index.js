const cloud = require('wx-server-sdk');
const auth = require('./auth');
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV});
exports.main = async (event) => {
  const {openid, db} = await auth.member(cloud);
  const query = auth.collection(db, event.list, true);
  const item = await auth.record(db, event.list, event._id);
  const value = auth.boolean(event.value);
  if (event.list === 'StorageList' || value === true) auth.owned(item, openid);
  else auth.check(item._openid !== openid, 'CANNOT_CONFIRM_OWN_TASK_OR_BUY_OWN_ITEM');
  return query.where({_id: event._id}).update({data: {available: value}});
};
