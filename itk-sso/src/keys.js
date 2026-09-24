'use strict';

const crypto = require('crypto');
const fs = require('fs');

/**
 * Ключи RS256. Приватный ключ берём из окружения/файла, а если его нет —
 * генерируем на старте (годится только для локального стенда, на проде ключ задаётся явно).
 */
function loadPrivateKey(keysConfig = {}, deps = {}) {
    const env = deps.env || process.env;
    const log = deps.log || console;
    let pem = keysConfig.privateKeyPem || null;
    let generated = false;

    if (!pem && keysConfig.privateKeyFile) {
        // Путь к ключу стоит в .env по умолчанию, а сам файл заводит deploy.sh на хосте.
        // Локально файла нет — раньше старт падал с ENOENT ещё до порта (#2006);
        // теперь на стенде просто генерируем временный ключ, как и без пути вовсе.
        try {
            pem = fs.readFileSync(keysConfig.privateKeyFile, 'utf8');
        } catch (err) {
            if (err.code !== 'ENOENT') throw err;
            if (env.NODE_ENV === 'production') {
                throw new Error(`Ключ подписи ${keysConfig.privateKeyFile} не найден: `
                    + 'в production он обязан быть задан явно (его заводит deploy.sh).');
            }
            log.warn(`itk-sso: ключа подписи ${keysConfig.privateKeyFile} нет — генерирую временный. `
                + 'После перезапуска все выданные токены перестанут проверяться.');
        }
    }

    if (!pem) {
        const pair = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
        pem = pair.privateKey.export({ type: 'pkcs8', format: 'pem' });
        generated = true;
    }

    const keyObject = crypto.createPrivateKey(pem);
    if (keyObject.asymmetricKeyType !== 'rsa') {
        throw new Error(`Ключ подписи должен быть RSA (RS256), получен ${keyObject.asymmetricKeyType}`);
    }

    return { pem: typeof pem === 'string' ? pem : String(pem), keyObject, generated };
}

/**
 * JWKS для node-oidc-provider: приватный JWK. Публичную часть провайдер отдаёт сам на /jwks.
 */
function toPrivateJwk(keyObject, kid = 'itk-sso-1') {
    const jwk = keyObject.export({ format: 'jwk' });
    return { ...jwk, kid, use: 'sig', alg: 'RS256' };
}

/** Публичный JWKS — то, что внешняя система скачивает, чтобы проверять подпись локально. */
function toPublicJwks(keyObject, kid = 'itk-sso-1') {
    const priv = crypto.createPublicKey(keyObject).export({ format: 'jwk' });
    return { keys: [{ kty: priv.kty, n: priv.n, e: priv.e, kid, use: 'sig', alg: 'RS256' }] };
}

function buildJwks(keysConfig = {}, deps = {}) {
    const { keyObject, generated, pem } = loadPrivateKey(keysConfig, deps);
    const kid = keysConfig.kid || 'itk-sso-1';
    return {
        kid,
        pem,
        generated,
        keyObject,
        jwks: { keys: [toPrivateJwk(keyObject, kid)] },
        publicJwks: toPublicJwks(keyObject, kid),
    };
}

module.exports = { loadPrivateKey, toPrivateJwk, toPublicJwks, buildJwks };
