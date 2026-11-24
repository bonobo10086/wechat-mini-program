Page({
  data: {code: '', generating: false},
  async generateCode() {
    if (this.data.generating) return;
    this.setData({generating: true});
    try {
      const response = await getApp().cloud().callFunction({name: 'generateCode'});
      const result = response.result;
      if (!result || result.success !== true || !result.code) throw new Error('GENERATE_FAILED');
      this.setData({code: result.code});
    } catch (error) {
      wx.showToast({title: '生成失败，请检查云函数部署与授权', icon: 'none'});
    } finally { this.setData({generating: false}); }
  }
});
