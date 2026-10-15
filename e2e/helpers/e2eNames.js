// Имена сущностей, которые заводят сквозные тесты: `<prefix>-<timestamp> …`.
// По метке времени в имени уборка решает, что запись старая и её можно удалить,
// не трогая ничего, что создано руками (у таких записей этого префикса нет).

function e2eName(prefix, ts, suffix) {
  return `${prefix}-${ts}${suffix ? ' ' + suffix : ''}`;
}

// Метка времени из имени или null, если имя не наше. Имя вопроса — markdown,
// поэтому допускаем ведущие пробелы/символы разметки перед префиксом.
function e2eNameTs(prefix, name) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = String(name || '').match(new RegExp(`^[\\s#*_>\`-]*${escaped}-(\\d{13})(?!\\d)`));
  return m ? Number(m[1]) : null;
}

function isStaleE2eName(prefix, name, now, maxAgeMs) {
  const ts = e2eNameTs(prefix, name);
  return ts !== null && now - ts > maxAgeMs;
}

module.exports = { e2eName, e2eNameTs, isStaleE2eName };
