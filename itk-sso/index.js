'use strict';

const path = require('path');
const { loadEnv } = require('./src/loadEnv');
const accessTokenTtl = require('./lib/accessTokenTtl');
const refreshTokenStore = require('./lib/refreshTokenStore');
const logout = require('./lib/logout');
const { createRouter } = require('./lib/adminApi');
const { randomPassword } = require('./lib/adminAuth');
const { ClientRegistry } = require('./lib/clients');
const { TokenLog } = require('./lib/tokenLog');
const { createApp } = require('./src/server');
const { loadConfig } = require('./src/config');

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
    // .env рядом с сервисом читаем первым делом — до любого чтения окружения ниже:
    // заполненный файл лежал рядом, но вне docker его не читал никто (#2000).
    // Переменные, заданные снаружи (PORT=7600 node index.js), файл не перебивает.
    const envFile = loadEnv();

    const dataDir = process.env.SSO_DATA_DIR || path.join(__dirname, 'data');
    // Админка не бывает открытой: пароля в окружении нет - придумываем случайный
    // и печатаем его в консоль, чтобы на стенде было чем войти.
    const adminPassword = process.env.SSO_ADMIN_PASSWORD || randomPassword();
    // Один реестр на процесс: и админка, и провайдер смотрят в него же — клиент,
    // заведённый на /admin, получает токен без перезапуска сервиса.
    const registry = new ClientRegistry({ file: path.join(dataDir, 'clients.json') });
    const tokenLog = new TokenLog({ file: path.join(dataDir, 'token-log.json') });

    const config = loadConfig();

    createApp({
        config,
        registry,
        tokenLog,
        // Админка реестра живёт внутри того же процесса: /admin — страница, /admin/api/* — ручки.
        adminRouter: createRouter({
            auth: { password: adminPassword, secret: process.env.SSO_ADMIN_SECRET },
            registry,
            log: tokenLog,
            knownResources: config.resources,
            resourceScopes: config.resourceScopes,
        }),
    })
        .then(({ app, config, store, keys }) => {
            app.listen(config.port, () => {
                if (envFile.file) {
                    console.log(`.env прочитан: ${envFile.file} (применено ${envFile.applied.length}, перекрыто окружением ${envFile.skipped.length})`);
                }
                console.log(`itk-sso слушает ${config.issuer} (порт ${config.port}, хранилище ${store.driver})`);
                console.log(`админка реестра: ${config.issuer}/admin (данные: ${dataDir})`);
                if (!process.env.SSO_ADMIN_PASSWORD) {
                    console.warn(`пароль админки на этот запуск: ${adminPassword} (задайте SSO_ADMIN_PASSWORD, иначе он меняется при каждом старте)`);
                }
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
