const http = require('http')
const path = require('path')
const {createRouter} = require('./lib/adminApi')
const {ClientRegistry} = require('./lib/clients')
const {TokenLog} = require('./lib/tokenLog')

// Админка реестра OAuth-клиентов. Поднимается отдельным процессом:
//   PORT=6070 SSO_DATA_DIR=./data node itk-sso/index.js
// Когда появится каркас сервиса (node-oidc-provider, задача #1945), этот же
// router монтируется внутрь него - отдельный процесс тогда не нужен.
let port = Number(process.env.PORT || process.env.SSO_ADMIN_PORT || 6070)
let dataDir = process.env.SSO_DATA_DIR || path.join(__dirname, 'data')

let handler = createRouter({
    registry: new ClientRegistry({file: path.join(dataDir, 'clients.json')}),
    log: new TokenLog({file: path.join(dataDir, 'token-log.json')}),
})

http.createServer(handler).listen(port, () => {
    console.log('itk-sso admin: http://localhost:' + port + ' (данные: ' + dataDir + ')')
})
