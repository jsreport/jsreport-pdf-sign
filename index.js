require('fs').writeFileSync('certbase64.txt', require('fs').readFileSync('test/certificate.p12').toString('base64'))

var main = require('./lib/main.js')
var config = require('./jsreport.config.js')

module.exports = function (options) {
  config.options = options
  config.main = main
  config.directory = __dirname
  return config
}
