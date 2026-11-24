# 微信生活积分互动小程序

基于 [UxxHans/Rainbow-Cats-Personal-WeChat-MiniProgram](https://github.com/UxxHans/Rainbow-Cats-Personal-WeChat-MiniProgram) 的学习改造项目，使用微信小程序和云开发，实现两位用户之间的任务发布、积分记录、商品兑换和个人仓库。

本版本保留本地改造的首页交互、登录入口和匹配码生成页面，并整理了个人配置、云端成员校验和部署说明。原项目代码与许可证予以保留，不宣称基础系统全部从零原创。

## 功能与边界

- 任务与商品：发布、检索、查看详情、星标、删除和状态变更。
- 积分与仓库：查询积分、确认对方任务、兑换商品、使用仓库物品。
- 登录：不再使用前端写死的共享口令。云函数读取当前微信身份，业务接口检查管理员维护的 UserList。
- 首页：积分展示、轮播图和点击互动。
- 匹配码：可生成四位数字并写入到期时间，属于实验功能；尚未实现加入配对、限频或自动过期清理。
- 通知：可选订阅消息，需要自行配置前端模板与云函数环境变量。

这是学习原型，不是生产级账户或积分账本。购买与任务确认仍包含多次独立调用，尚未实现跨步骤事务、失败回滚和完整防重放。未进行真实微信云环境的端到端验收。

## 目录

```text
miniprogram/       页面、样式与配置示例
cloudfunctions/    独立部署的云函数
tools/            云函数校验辅助文件同步
tests/            不连接微信云的模拟测试
docs/SECURITY.md   部署要求与安全边界
LICENSE           上游 MIT 许可证
```

## 本地配置

1. 使用微信开发者工具和自己的小程序 AppID。项目根目录的 project.config.json 使用 touristappid 占位，运行云开发前必须填写自己的有效 AppID。
2. 将 miniprogram/config.example.js 复制为 miniprogram/config.local.js，填写云环境、两位用户的 OpenID、显示名称及可选通知模板。该本地文件已加入 Git 忽略，不要提交。
3. 在开发者工具导入项目根目录，而不是仅导入 miniprogram 子目录。构建前必须完成上一步复制，否则会提示缺少本地配置。
4. 先部署 getOpenId，可在已登录开发者工具的调试控制台调用 wx.cloud.callFunction({name: 'getOpenId'})，取得当前微信自身的身份。不要将真实 OpenID 发布到 GitHub。
5. 云数据库创建 MissionList、MarketList、StorageList、UserList、match_codes。在 UserList 为两位用户分别建立记录，字段为 _openid（字符串）和 credit（数字，初始为 0）。
6. 所有这些集合的客户端读写权限设为仅管理员；UserList 尤其不能允许普通客户端自行写入。业务访问经过云函数的成员与所有权校验。

AppID 和云环境 ID 本身不是密码，但仍应避免提交不必要的个人环境信息。OpenID 不能代替服务端鉴权。

## 部署云函数

先运行：

```text
node tools/sync-cloud-auth.js
```

然后在开发者工具中对 cloudfunctions 下每个实际云函数子目录执行“上传并部署：云端安装依赖”，包括新增的 login。各目录内的 auth.js 必须一并上传；不能只更新 index.js。

getOpenId 仅返回调用者自身身份，便于首次登记；login 和业务云函数根据可信云端身份检查 UserList。不要将前端界面跳转当作访问控制。

订阅消息默认不开启。若要使用，填写本地 subscribeTemplateId，并给 information 云函数配置环境变量 SUBSCRIBE_TEMPLATE_ID；模板字段应与 thing6、thing9 对应，接收方也必须先同意订阅。未配置或未授权时，通知不会发送。

## 不联网测试

使用 Node.js 18 或更新版本：

```text
node --test tests/*.test.js
```

测试使用模拟的微信和数据库接口，不部署云函数，不发送通知，不访问真实用户数据。语法检查或模拟测试通过，不代表真实部署与全部业务流程已经验收。

## 来源与许可

原始项目：[UxxHans/Rainbow-Cats-Personal-WeChat-MiniProgram](https://github.com/UxxHans/Rainbow-Cats-Personal-WeChat-MiniProgram)，原许可证保留 Copyright (c) 2022 Rainbow Cats。

本地改造包括新增登录页、首页点击互动、匹配码实验及本次配置拆分与错误修正。上游素材的单独商业使用授权未核验，不应因为仓库包含 MIT 许可证就认定所有图片均可商用。
