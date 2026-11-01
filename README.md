# 印象 · 个人记录站

日常生活、学习记录、绘画作品和生活照片。响应式中文界面，真实管理登录、草稿、发布、图片上传与排序、独立分享链接。公开访客无需账号；草稿只对管理员可见。初始站点为空，不含虚构的个人经历或照片。

## 启动与部署

需要 Node.js 24 或更高版本，无第三方依赖。设置服务端环境变量 `ADMIN_PASSWORD` 后运行 `npm start`，浏览 http://localhost:3000 。管理账号为 `yin2164933041@outlook.com`，使用密码登录，不再发送邮箱验证码。密码不写入仓库或前端。本机也支持读取已忽略的 `data/admin-credential.json`（salt 与 scrypt 散列）。

部署到支持 Node.js 和持久磁盘的服务器，启动命令 `npm start`，设置 `ADMIN_PASSWORD`、`DATA_DIR`（持久磁盘目录）、`PUBLIC_ORIGIN`（HTTPS站点来源，不带末尾斜杠），可选 `PORT`（默认3000）。生产开启 HTTPS，使用单实例，备份整个数据目录。不能仅部署到 GitHub Pages。

登录失败5次后暂停15分钟；会话24小时有效，退出或服务器重启后失效。草稿仅管理员可见。图片按原文件保存，上传前自行去除敏感位置元数据。删除记录不自动删除图片，避免误删其他记录引用素材。

## 自定义

`public/index.html` 修改昵称、介绍与页脚；`public/style.css` 调整颜色和版式。`server.mjs` 管理数据库与接口。数据目录已被 Git 忽略。

## 验证

`npm test` 运行实际 HTTP 集成测试，覆盖管理员登录、草稿隔离、发布后访客浏览、权限验证、跨来源拒绝、删除和退出。

## 静态托管

本机继续用 npm start 编辑。执行 npm run export，将已发布内容和引用图片导出到 static-site/。草稿、数据库、管理员凭据和编辑接口均不进入公开版。将 static-site/ 上传静态托管即可。仓库附 GitHub Pages 工作流：在仓库 Settings → Pages 将 Source 设置为 GitHub Actions，之后提交 static-site/ 更新即可发布。公开页面分享链接使用 ?post=编号，兼容子目录和刷新。数据库与原图请独立备份，静态快照不能替代完整备份。

