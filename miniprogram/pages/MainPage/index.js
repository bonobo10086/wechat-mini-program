/* Main page of the app */
Page({
  //允许接收服务通知
  async requestSubscribeMessage() {
      const templateId = getApp().globalData.subscribeTemplateId;
      if (!templateId) { wx.showToast({title: '请先配置通知模板', icon: 'none'}); return; }
      wx.requestSubscribeMessage({
      //tmplIds: [templateId,templateId2,templateId3],
      tmplIds: [templateId],
      success: (res) => {
          //if (res[templateId] === 'accept'&&res[templateId2] === 'accept'&&res[templateId3] === 'accept') {
          if (res[templateId] === 'accept') {
          this.setData({
              requestSubscribeMessageResult: '成功',
          })
          } else {
          this.setData({
              requestSubscribeMessageResult: `失败（${res[templateId]}）`,
          })
          }
      },
      fail: (err) => {
          this.setData({
          requestSubscribeMessageResult: `失败（${JSON.stringify(err)}）`,
          })
      },
      })
  },
  data: {
      creditA: 0,
      creditB: 0,

      userA: '',
      userB: '',

      showModal:false,  //控制弹出层的显示状态
      clickCount:0, //计数器，记录点击次数
      timer:null,
      isButtonActive:false,
  },

  openCodePage() { wx.navigateTo({url: '/pages/generate'}); },

  // 点击按钮的事件处理函数
  onButtonTap(){
    this.setData({
      isButtonActive:!this.data.isButtonActive,
    });
  },

  async onShow(){
      this.getCreditA()
      this.getCreditB()
      this.setData({
          userA: getApp().globalData.userA,
          userB: getApp().globalData.userB,
      })
  },

  getCreditA(){
      wx.cloud.callFunction({name: 'getElementByOpenId', data: {list: getApp().globalData.collectionUserList, _openid: getApp().globalData._openidA}})
      .then(res => {
        const rows = res.result && res.result.data || [];
        this.setData({creditA: rows.length ? Number(rows[0].credit) || 0 : 0})
      })
  },
  
  getCreditB(){
    wx.cloud.callFunction({name: 'getElementByOpenId', data: {list: getApp().globalData.collectionUserList, _openid: getApp().globalData._openidB}})
    .then(res => {
        const rows = res.result && res.result.data || [];
        this.setData({creditB: rows.length ? Number(rows[0].credit) || 0 : 0})
    })
  },


  
  //显示弹出层
  showPopup(){
    this.setData({
      showModal:true,
      clickCount:0,
      isButtonActive: false,
    });
    //清楚定时器
    clearTimeout(this.data.timer);
  },

  //隐藏弹出层
  hidePopup(){
    this.setData({
      showModal:false
    })
  },

  //点击图片的事件处理函数
  handleImageClick(){
    //增加点击次数
    this.setData({
      clickCount:this.data.clickCount+1
    });

    //如果是第一次点击，启动五秒倒计时
    if(this.data.clickCount===1){
      this.startTimer();
    }

    //判断点击次数是否达到5次
    if(this.data.clickCount>=5){
      this.showPopup();
    }
  },

  //启动五秒倒计时
  startTimer(){
    const timer=setTimeout(()=>{
      //如果五秒内未达到五次点击，重置点击次数
      this.setData({
        clickCount:0
      });
    },5000);  //五秒计时

    this.setData({timer});
  }
});
