const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
var moment = require('moment');
var request = require('request');
var crypto = require('crypto');
var urlencode = require('urlencode');
const config = require('./config')
const app = new Koa();
app.use(bodyParser())

app.use(async (ctx, next) => {
  let jsonObj = ctx.request.body
  let projectKey = jsonObj.issue.fields.project.key;
  let accessToken = config[projectKey].accessToken;
  let secret = config[projectKey].secret;
  let timestamp = new Date().getTime();
  let sign = hmacSHA256(secret, timestamp);
  let msgJson = initMsg(jsonObj)
  request.post({
    url: `${config.dingTalk.api}?access_token=${accessToken}&timestamp=${timestamp}&sign=${sign}`,
    method: "POST",
    json: true,
    encoding: "utf-8",
    body: msgJson
  }, function (error, response, body) {
    console.log(body)

  });
  await next();
});

app.use(async ctx => {
  ctx.response.status = 200;
  ctx.response.body = 'OK';
});

app.listen(3000, () => {
  console.log("server is running at 3000 port");
})

/**
 * 钉钉接口加签
 * @param {密钥} secret 
 * @param {时间戳} timestamp 
 */
function hmacSHA256(secret, timestamp) {
  let signBase64 = crypto.createHmac('sha256', secret)
    .update(timestamp + "\n" + secret)
    .digest('base64')
  return urlencode(signBase64);
}

/**
 * 初始化发送给钉钉的消息
 * @param {jira发送过来的json数据} jsonObj 
 */
function initMsg(jsonObj) {
  let title = jsonObj.issue.key;
  let projectName = jsonObj.issue.fields.project.name;
  let summary = jsonObj.issue.fields.summary;
  let level = jsonObj.issue.fields.priority.name;
  let createdTime = moment().format('YYYY-MM-DD HH:mm:ss');
  let atMobile = jsonObj.issue.fields.assignee.name;
  let markdown = `#### [${title}](${config.jira.host}/browse/${title})\n\n
   **项目：** ${projectName}\n\n
   **概述：** ${summary}\n\n
   **等级：** ${level}\n\n
   **时间：** ${createdTime}\n\n
   @${atMobile}\n`;

  return msgTemplate = {
    "msgtype": "markdown",
    "markdown": {
      "title": "您有一个新任务",
      "text": markdown
    },
    "at": {
      "atMobiles": [
        atMobile
      ],
      "isAtAll": false
    }
  };
}
