'use strict';

const { createApp } = require('./src/server');

createApp()
    .then(({ app, config, store, keys }) => {
        app.listen(config.port, () => {
            console.log(`itk-sso слушает ${config.issuer} (порт ${config.port}, хранилище ${store.driver})`);
            if (keys.generated) {
                console.warn('Ключ RS256 сгенерирован на старте: задайте SSO_JWT_PRIVATE_KEY, иначе токены умрут вместе с процессом');
            }
        });
    })
    .catch((err) => {
        console.error('itk-sso не поднялся:', err);
        process.exit(1);
    });
