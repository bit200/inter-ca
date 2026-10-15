// Адреса стенда и креды для сквозных тестов. Значения — из env или e2e/.env
// (подключается в playwright.config.js), в репозитории не хранятся.

const ADMIN_URL = (process.env.E2E_ADMIN_URL || 'http://localhost:8002').replace(/\/$/, '');
const API_URL = (process.env.E2E_API_URL || 'http://localhost:6057').replace(/\/$/, '');

function creds(userKey, passKey) {
  const username = process.env[userKey];
  const password = process.env[passKey];
  if (!username || !password) {
    throw new Error(`Set ${userKey} / ${passKey} (env или e2e/.env) перед запуском теста.`);
  }
  return { username, password };
}

const adminCreds = () => creds('E2E_ADMIN_USERNAME', 'E2E_ADMIN_PASSWORD');
const candidateCreds = () => creds('E2E_USERNAME', 'E2E_PASSWORD');

module.exports = { ADMIN_URL, API_URL, adminCreds, candidateCreds };
