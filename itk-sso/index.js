const accessTokenTtl = require('./lib/accessTokenTtl');
const refreshTokenStore = require('./lib/refreshTokenStore');
const logout = require('./lib/logout');

module.exports = {...accessTokenTtl, ...refreshTokenStore, ...logout};
