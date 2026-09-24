'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Чтение .env рядом с сервисом. В docker файл подставляет сам compose (env_file),
 * а при обычном `node index.js` его не читал никто: заполненный .env лежал рядом,
 * но в process.env не попадал — сервис молча поднимался на дефолтах (#2000).
 *
 * Свой разбор, а не dotenv: зависимость ради двадцати строк не нужна.
 */

const ASSIGN = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/;

/** Кавычки снимаем; в двойных разворачиваем \n и \t, в одинарных значение сырое. */
function parseValue(raw) {
    if (raw.length > 1 && raw[0] === '"' && raw.endsWith('"')) {
        return raw.slice(1, -1)
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"');
    }
    if (raw.length > 1 && raw[0] === "'" && raw.endsWith("'")) return raw.slice(1, -1);
    // Без кавычек хвостовой комментарий значением не считается; нужен «#» в значении — берите в кавычки.
    return raw.replace(/\s+#.*$/, '').trim();
}

/** Разбор содержимого .env в объект: пустые строки и комментарии пропускаем. */
function parseEnv(text) {
    const out = {};
    for (const line of String(text).split(/\r?\n/)) {
        if (!line.trim() || /^\s*#/.test(line)) continue;
        const m = line.match(ASSIGN);
        if (!m) continue;
        out[m[1]] = parseValue(m[2]);
    }
    return out;
}

/**
 * Подмешивает .env в окружение. Настоящее окружение сильнее файла: `PORT=7600 node index.js`
 * обязан победить PORT из .env, иначе рядом со стендом не поднять вторую копию.
 *
 * @param {{file?: string, env?: object}} opts
 * @returns {{file: string|null, applied: string[], skipped: string[]}}
 */
function loadEnv(opts = {}) {
    const env = opts.env || process.env;
    const file = opts.file || path.join(__dirname, '..', '.env');
    const result = { file: null, applied: [], skipped: [] };

    let text;
    try {
        text = fs.readFileSync(file, 'utf8');
    } catch (err) {
        // Файла нет — штатный случай: в docker переменные приходят из compose.
        if (err.code === 'ENOENT') return result;
        throw err;
    }

    result.file = file;
    for (const [name, value] of Object.entries(parseEnv(text))) {
        if (env[name] != null) {
            result.skipped.push(name);
            continue;
        }
        env[name] = value;
        result.applied.push(name);
    }
    return result;
}

module.exports = { loadEnv, parseEnv };
