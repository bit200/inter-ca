const http = require('http')
const path = require('path')
const accessTokenTtl = require('./lib/accessTokenTtl')
const refreshTokenStore = require('./lib/refreshTokenStore')
const logout = require('./lib/logout')
const {createRouter} = require('./lib/adminApi')
const {ClientRegistry} = require('./lib/clients')
const {TokenLog} = require('./lib/tokenLog')

// Всё, что каркас сервиса (node-oidc-provider, задача #1945) подключает к себе:
// логаут через отзыв refresh token, реестр OAuth-клиентов и журнал токенов.
module.exports = {
    ...accessTokenTtl,
    ...refreshTokenStore,
    ...logout,
    createRouter,
    ClientRegistry,
    TokenLog,
}

// Пока каркаса нет, админку реестра можно поднять отдельным процессом:
//   PORT=6070 SSO_DATA_DIR=./data node itk-sso/index.js
if (require.main === module) {
    let port = Number(process.env.PORT || process.env.SSO_ADMIN_PORT || 6070)
    let dataDir = process.env.SSO_DATA_DIR || path.join(__dirname, 'data')
    let handler = createRouter({
        registry: new ClientRegistry({file: path.join(dataDir, 'clients.json')}),
        log: new TokenLog({file: path.join(dataDir, 'token-log.json')}),
    })
    http.createServer(handler).listen(port, () => {
        console.log('itk-sso admin: http://localhost:' + port + ' (данные: ' + dataDir + ')')
    })
}
