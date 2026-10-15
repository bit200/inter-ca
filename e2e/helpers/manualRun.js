// e2e гоняются только руками: каждый прогон заводит на стенде сущности e2e-* (VS-задачи,
// вопросы, курсы), поэтому случайный запуск (воркер, хук, чужой `npm test`) засоряет
// стенд. Явное согласие — переменная E2E_MANUAL=1.

function assertManualRun(env) {
  if (env.E2E_MANUAL === '1') {
    return;
  }
  throw new Error(
    'e2e запускаются только вручную: каждый прогон создаёт e2e-* записи на стенде.\n' +
    'Запусти осознанно: E2E_MANUAL=1 npm test (или npm run test:manual).'
  );
}

module.exports = { assertManualRun };
