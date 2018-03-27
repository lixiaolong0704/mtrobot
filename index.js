var axios = require('axios')
var request = require('request')
var _ = require('lodash')
var dates = require('./dates')
var config = require('./config')
var wanted = config.wanted
var Jetty = require('jetty')
  
// j.setCookie(cookie, url)
// axios.defaults.baseURL = 'https://kp.dper.com'
// request.defaults.jar =j; 
var argv = require('minimist')(process.argv.slice(2));

var logger = require('tracer').colorConsole({
  format: '{{message}}'
// level:'warn'
})

var query = function () {
  axios.request({
    url: '/rocshops/shopInfo/list?cityId=2&keyword=&pageIndex=1&pageSize=50&regionList=&sortType=3',
    method: 'get',
    withCredentials: true
  }).then(function (rst) {

    console.log(rst.data.data.list)
  })
}
var ckIndex =argv.c? parseInt(argv.c):0;
function importShop (id, callback) {
  request({
    method: 'post',
    headers: {
      Cookie: config.cookie[ckIndex]
    },
    uri: config.uri + '/rocshop/shopInfo/importShop',
    formData: {shopId: id},
    // transformRequest: [function (data, headers) {
    //     // Do whatever you want to transform the data
    //     var bodyFormData = new FormData()
    //     for(var a  in data){
    //         bodyFormData.set(a,data[a])
    //     }
    //     return bodyFormData
    // }],
    withCredentials: true
  }, function (error, response, body) {
    if (error) {
      return console.error('upload failed:', error)
    }
    callback && callback(body)
  })
}


var importAll = function (msg, hasPost) {
  var current = new Date()
  logger.info('[%s]==[%s] %s', current.toStringOfMe(), wanted.join('-'), msg)
  var wper = _.map(wanted, (shopid) => {
    return {
      shopid: shopid,
      status: 0
    }
  })
  _.map(wper, (shop) => {
    if (shop.status === 1) {
      return
    }
    importShop(shop.shopid, function (bd) {
      try {
        var d = JSON.parse(bd)
        if (d.code === 200) {
          shop.status = 1
        }
        var n = new Date()
        logger.warn('[%s]%s==> 批次 %s,用时: %s 结果[%s]', n.toStringOfMe(), shop.shopid, hasPost, n - current, d.msg)
      } catch(e) {
        console.log(bd)
      }
    })
  })
}

// var hd=setInterval(importAll,100)

var ccc = new Date()
var aaa = new Date(ccc.getFullYear(), ccc.getMonth(), ccc.getDate(),
  config.postTime[0], config.postTime[1], config.postTime[2],
  config.postTime[3])
if (config.isDebug) {
    // aaa = new Date(ccc.getFullYear(), ccc.getMonth(), ccc.getDate(), ccc.getHours(), ccc.getMinutes(), 50, 0)
  aaa = new Date(ccc.getFullYear(), ccc.getMonth(), ccc.getDate(), ccc.getHours(), ccc.getMinutes(), ccc.getSeconds() + 10, 0)
}

var hasPost = 1,hhh = 0
var jetty = new Jetty(process.stdout)
const aheadTime = config.aheadTime

Date.prototype.toStringOfMe = function () {
  return this.format('yyyy:mm:dd HH:MM:ss l')
}

var delayPostCount=config.delayPostCount, curentCount=0;
function autoPost () {
  var fun = function () {

    var isFuck = hasPost % config.frequencyLimit ===0;
    if(isFuck){
        if(delayPostCount===curentCount){
            importAll(`批请求次数${hasPost}`, hasPost)
            hasPost++
            curentCount=0;
        }else{
            curentCount++;
        }
  
    }else{
        importAll(`批请求次数${hasPost}`, hasPost)
        hasPost++
    }
  
  }
  hhh = setInterval(fun, config.frequency)
  fun()
}
// /"{\"code\":200,\"data\":null,\"msg\":\"导入门店成功\"}"
// "{\"msg\":\"请求次数太多，请稍后再试\",\"code\":\"429\",\"data\":null}"
// /"{\"code\":500,\"data\":null,\"msg\":\"门店组被[董新]持有了\"}"
// > "{\"msg\":\"请求次数太多，请稍后再试\",\"code\":\"429\",\"data\":null}"
// "{\"code\":500,\"data\":null,\"msg\":\"门店组被[张博]持有了\"}"
function setClock () {
  var clock = setInterval(function () {
    var current = new Date()
    jetty.text(aaa.toStringOfMe() + `[导入时间] cookie索引:${ckIndex}\n`)
    var ml = current.getMilliseconds()
    jetty.text(current.toStringOfMe() + '[当前时间]\n')
    current.setMilliseconds(ml + aheadTime)
    // curren
    if (dates.compare(current, aaa) === 1) {

      // 时间到
      autoPost()
      clearInterval(clock)
    }else {
      jetty.moveTo([0, 0])
    }
  }, 2)
}
jetty.clear()
// console.log(argv);
setClock()

// 98090440 ==> 请求次数太多，请稍后再试==> 批次10
// var current= new Date()
// var mm =current.getMilliseconds()
// console.log(current.toString()+';'+mm+"[当前时间]\n")

//  current.setMilliseconds(mm-124)
// console.log(current.toString()+';'+current.getMilliseconds()+"[当前时间]\n")
// https://kp.dper.com/rocshops/shopInfo/list?cityId=2&keyword=&pageIndex=1&pageSize=50&regionList=&sortType=3
