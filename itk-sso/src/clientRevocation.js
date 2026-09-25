'use strict';

/**
 * Выключение и удаление клиента в админке действуют сразу и на уже выданное (#1947):
 * реестр кричит 'revoke', а здесь из хранилища провайдера уходят refresh token'ы,
 * opaque access token'ы, неиспользованные коды и гранты этого клиента. Выключенный
 * клиент и так не проходит /token, но без этого после обратного включения его
 * старые refresh token'ы ожили бы, будто выключения не было.
 *
 * JWT access token уже у потребителя, отозвать его нельзя — он доживает свой
 * короткий TTL (5–15 минут), как и при обычном логауте.
 */
const MODELS = ['RefreshToken', 'AccessToken', 'ClientCredentials', 'AuthorizationCode', 'Grant'];

async function revokeClientTokens(store, clientId) {
    let refresh = 0;
    if (typeof store.list === 'function') {
        refresh = (await store.list('RefreshToken')).filter((t) => t.clientId === clientId).length;
    }
    for (const model of MODELS) {
        await store.destroyBy(model, 'clientId', clientId);
    }
    return { refresh };
}

/** Подписка сервиса на реестр. Возвращает функцию ожидания текущих отзывов — для тестов и ручек. */
function attachClientRevocation(registry, store, { tokenLog = null, onError = (err) => console.error('itk-sso revoke', err) } = {}) {
    const pending = new Set();
    if (!registry || typeof registry.on !== 'function') return { settled: async () => {} };

    registry.on('revoke', (event) => {
        const job = revokeClientTokens(store, event.clientId)
            .then(({ refresh }) => {
                if (tokenLog) {
                    tokenLog.revoked({
                        clientId: event.clientId,
                        clientName: event.clientName || '',
                        tokenType: 'refresh',
                        reason: event.reason === 'removed'
                            ? `клиент удалён, погашено refresh: ${refresh}`
                            : `клиент выключен, погашено refresh: ${refresh}`,
                    });
                }
            })
            .catch(onError)
            .finally(() => pending.delete(job));
        pending.add(job);
    });

    return {
        async settled() {
            await Promise.all([...pending]);
        },
    };
}

module.exports = { attachClientRevocation, revokeClientTokens, MODELS };
