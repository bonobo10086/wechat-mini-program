const cloud = require('wx-server-sdk');
const auth = require('./auth');
cloud.init({env: cloud.DYNAMIC_CURRENT_ENV});
exports.main = async () => {
  const {openid, db} = await auth.member(cloud);
  const templateId = process.env.SUBSCRIBE_TEMPLATE_ID;
  if (!templateId) return {success: false, skipped: true, reason: 'TEMPLATE_NOT_CONFIGURED'};
  const users = await db.collection('UserList').where({_openid: db.command.neq(openid)}).limit(1).get();
  if (!users.data.length) return {success: false, skipped: true, reason: 'PARTNER_NOT_CONFIGURED'};
  const partner = users.data[0]._openid;
  const tasks = await db.collection('MissionList').where({_openid: partner}).orderBy('date', 'desc').limit(1).get();
  const title = tasks.data.length ? tasks.data[0].title : '任务更新提醒';
  try {
    await cloud.openapi.subscribeMessage.send({
      touser: partner, templateId, miniprogramState: 'developer',
      page: 'pages/MainPage/index',
      data: {thing6: {value: String(title).slice(0, 20)}, thing9: {value: '有新的任务更新'}}
    });
    return {success: true};
  } catch (error) { return {success: false, error: 'SEND_FAILED'}; }
};
