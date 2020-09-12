const models = require('../models');
const Promise = require('bluebird');

module.exports.createSession = (req, res, next) => {
  // if no cookies or cookies not in db, create new session unassociated with a user
  // attach cookies to response with session info (Set-Cookie), shortlyid: hash
  // else if there are cookies matching the db, retrieve session obj from db
  if (!req.cookies.shortlyid) {
    return models.Sessions.create()
      .then((result) => {
        return models.Sessions.get({ id: result.insertId });
      })
      .then((session) => {
        req.session = session;
        res.cookies = { shortlyid: { value: session.hash } };
        res.set('Set-Cookie', `shortlyid=${session.hash}`);
        next();
      });
  }

  return models.Sessions.get({ hash: req.cookies.shortlyid.value })
    .then((session) => {
      if (!session) {
        return models.Sessions.create()
          .then((result) => {
            return models.Sessions.get({ id: result.insertId });
          })
          .then((session) => {
            req.session = session;
            res.cookies = { shortlyid: { value: session.hash } };
            res.set('Set-Cookie', `shortlyid=${session.hash}`);
            next();
          });
      }
      req.session = session;
      next();
    });

  // return models.Sessions.get({ hash: req.cookies.shortlyid })

};

/************************************************************/
// Add additional authentication middleware functions below
/************************************************************/
