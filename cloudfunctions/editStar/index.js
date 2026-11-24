const cloud = require('wx-server-sdk');
const auth = require('./auth');
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV});
exports.main = async (event) => {
  const {openid, db} = await auth.member(cloud);
  const query = auth.collection(db, event.list, true);
  auth.owned(await auth.record(db, event.list, event._id), openid);
  return query.where({_id: event._id}).update({data: {star: auth.boolean(event.value)}});
};
