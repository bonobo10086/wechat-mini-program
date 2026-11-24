const cloud = require('wx-server-sdk');
const auth = require('./auth');
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV});
exports.main = async () => {
  const {openid} = await auth.member(cloud);
  return {openid};
};
