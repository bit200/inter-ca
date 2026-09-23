'use strict';

const path = require('path');
const accessTokenTtl = require('./lib/accessTokenTtl');
const refreshTokenStore = require('./lib/refreshTokenStore');
const logout = require('./lib/logout');
const { createRouter } = require('./lib/adminApi');
const { ClientRegistry } = require('./lib/clients');
const { TokenLog } = require('./lib/tokenLog');
const { createApp } = require('./src/server');

// Наружу — и каркас провайдера, и то, что к нему подключается:
// реестр OAuth-клиентов, журнал токенов, логаут через отзыв refresh token.
module.exports = {
    createApp,
    ...accessTokenTtl,
    ...refreshTokenStore,
    ...logout,
    createRouter,
    ClientRegistry,
    TokenLog,
};

if (require.main === module) {
    const dataDir = process.env.SSO_DATA_DIR || path.join(__dirname, 'data');

    createApp({
        // Админка реестра живёт внутри того же процесса: /admin — страница, /admin/api/* — ручки.
        adminRouter: createRouter({
            registry: new ClientRegistry({ file: path.join(dataDir, 'clients.json') }),
            log: new TokenLog({ file: path.join(dataDir, 'token-log.json') }),
        }),
    })
        .then(({ app, config, store, keys }) => {
            app.listen(config.port, () => {
                console.log(`itk-sso слушает ${config.issuer} (порт ${config.port}, хранилище ${store.driver})`);
                console.log(`админка реестра: ${config.issuer}/admin (данные: ${dataDir})`);
                if (keys.generated) {
                    console.warn('Ключ RS256 сгенерирован на старте: задайте SSO_JWT_PRIVATE_KEY, иначе токены умрут вместе с процессом');
                }
            });
        })
        .catch((err) => {
            console.error('itk-sso не поднялся:', err);
            process.exit(1);
        });
}
