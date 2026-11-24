Page({
  data: {loading: false},
  async handleLogin() {
    if (this.data.loading) return;
    this.setData({loading: true});
    try {
      // 身份由云端 getWXContext 读取，服务端 UserList 决定是否允许访问。
      const response = await getApp().cloud().callFunction({name: 'login'});
      if (!response.result || !response.result.openid) throw new Error('LOGIN_FAILED');
      getApp().globalData.currentOpenid = response.result.openid;
      await wx.switchTab({url: '/pages/MainPage/index'});
    } catch (error) {
      wx.showToast({title: '登录失败，请检查云配置及用户授权', icon: 'none'});
    } finally { this.setData({loading: false}); }
  }
});
