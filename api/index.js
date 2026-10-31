const { app } = require('../server/index');
const { getDb } = require('../server/db');

module.exports = async (req, res) => {
  await getDb();
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
};
