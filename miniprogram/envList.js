const config = require('./config.local.js');
module.exports = {envList: config.cloudEnvId ? [{envId: config.cloudEnvId}] : []};
