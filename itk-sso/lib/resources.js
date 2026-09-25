// Ресурсы (audiences), на которые itk-sso выписывает access token. У каждого
// сервиса свой aud: токен, выданный для evaluate, у external-api не пройдёт
// проверку aud, даже если подпись верна. Клиент просит ресурс параметром
// resource=<audience> (RFC 8707), а в реестре у клиента записано, какие ресурсы
// и какие scope'ы на каждом ему разрешены.

const DEFAULT_RESOURCES = [
    {
        key: 'evaluate',
        name: 'Evaluate',
        audience: 'https://evaluate.itk.academy',
        scopes: ['evaluate:run', 'evaluate:docs', 'evaluate:admin'],
    },
    {
        key: 'mesh',
        name: 'Mesh',
        audience: 'https://mesh.itk.academy',
        scopes: ['mesh:read', 'mesh:write'],
    },
    {
        key: 'external-api',
        name: 'External API',
        audience: 'https://external-api.itk.academy',
        scopes: ['mock:read', 'mock:write', 'video:upload', 'score:read'],
    },
]

// Адрес ресурса на конкретном стенде задаётся окружением:
// SSO_RESOURCE_EVALUATE, SSO_RESOURCE_MESH, SSO_RESOURCE_EXTERNAL_API.
function envName(key) {
    return 'SSO_RESOURCE_' + key.toUpperCase().replace(/[^A-Z0-9]+/g, '_')
}

function loadResources(env) {
    env = env || {}
    return DEFAULT_RESOURCES.map(r => ({
        ...r,
        audience: env[envName(r.key)] || r.audience,
        scopes: r.scopes.slice(),
    }))
}

function byKey(catalog, key) {
    return catalog.find(r => r.key === key) || null
}

function byAudience(catalog, audience) {
    return catalog.find(r => r.audience === audience) || null
}

// Приводит «разрешённые ресурсы» клиента к виду [{resource, scopes}]. Принимает
// и массив, и объект {mesh: ['mesh:read']} - так его удобнее писать руками.
function normalizeResources(value) {
    if (value === undefined || value === null) return null
    let list = Array.isArray(value)
        ? value
        : Object.keys(value).map(resource => ({resource, scopes: value[resource]}))
    let out = []
    for (let item of list) {
        let resource = String((item && item.resource) || '').trim()
        let raw = (item && item.scopes) || []
        let scopes = (Array.isArray(raw) ? raw : String(raw).split(/[\s,]+/))
            .map(s => String(s).trim())
            .filter(Boolean)
        scopes = scopes.filter((s, i) => scopes.indexOf(s) === i)
        let prev = out.find(r => r.resource === resource)
        if (prev) {
            prev.scopes = prev.scopes.concat(scopes.filter(s => prev.scopes.indexOf(s) === -1))
        } else {
            out.push({resource, scopes})
        }
    }
    return out
}

// Записи реестра, заведённые до появления поля resources, держали ресурсные
// scope'ы прямо в scopes (mesh:read). Для них выводим ресурсы из этих scope'ов,
// чтобы уже работающие сервисы не отвалились после обновления.
function effectiveResources(client, catalog) {
    if (Array.isArray(client.resources)) return client.resources
    let scopes = client.scopes || []
    return catalog
        .map(r => ({resource: r.key, scopes: r.scopes.filter(s => scopes.indexOf(s) > -1)}))
        .filter(r => r.scopes.length)
}

module.exports = {
    DEFAULT_RESOURCES,
    loadResources,
    byKey,
    byAudience,
    normalizeResources,
    effectiveResources,
    envName,
}
