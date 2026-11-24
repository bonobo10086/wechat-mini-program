const config = require('./config.local.js');
App({
  globalData: {
    _openidA: config.openidA || '', _openidB: config.openidB || '',
    userA: config.userA || '用户A', userB: config.userB || '用户B',
    subscribeTemplateId: config.subscribeTemplateId || '',
    collectionMissionList: 'MissionList', collectionMarketList: 'MarketList',
    collectionStorageList: 'StorageList', collectionUserList: 'UserList',
    maxCredit: 500, currentOpenid: ''
  },
  onLaunch() {
    this.cloudReady = false;
    if (!wx.cloud || !config.cloudEnvId) {
      console.warn('请按 README 配置本机 config.local.js 和微信云开发环境');
      return;
    }
    wx.cloud.init({env: config.cloudEnvId, traceUser: true});
    this.cloudReady = true;
  },
  cloud() {
    if (!this.cloudReady) throw new Error('请先配置云环境并使用支持云开发的微信基础库');
    return wx.cloud;
  },
  async database() { return this.cloud().database(); }
});
