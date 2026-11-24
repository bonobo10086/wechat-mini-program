const cloud = require('wx-server-sdk');
const auth = require('./auth');
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV});
exports.main = async (event) => {
  const {openid, db} = await auth.member(cloud);
  const item = await auth.record(db, event.list, event._id);
  if (event.list === 'StorageList') auth.owned(item, openid);
  return {data: [item]};
};
