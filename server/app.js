const express = require('express');
const path = require('path');
const utils = require('./lib/hashUtils');
const partials = require('express-partials');
const bodyParser = require('body-parser');
const Auth = require('./middleware/auth');
const models = require('./models');
const cookieParser = require('./middleware/cookieParser');

const app = express();

app.set('views', `${__dirname}/views`);
app.set('view engine', 'ejs');
app.use(partials());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(cookieParser, Auth.createSession);


app.get('/',
  (req, res) => {
    res.render('index');
  });

app.get('/create',
  (req, res) => {
    // res.render('index');
    if (models.Sessions.isLoggedIn(req.session)) { // issue here
      return res.render('index');
    }
    return res.redirect('/login');
  });

app.get('/links',
  (req, res, next) => {
    // if (!models.Sessions.isLoggedIn(req.session)) {
    //   return res.redirect('/login');
    // }
    return models.Links.getAll()
      .then(links => {
        res.status(200).send(links);
      })
      .error(error => {
        res.status(500).send(error);
      });
  });

app.post('/links',
  (req, res, next) => {
    // if (!models.Sessions.isLoggedIn(req.session)) {
    //   console.log('not logged in');
    //   return res.redirect('/login');
    // }
    var url = req.body.url;
    if (!models.Links.isValidUrl(url)) {
    // send back a 404 if link is not valid
      return res.sendStatus(404);
    }

    return models.Links.get({ url })
      .then(link => {
        if (link) {
          throw link;
        }
        return models.Links.getUrlTitle(url);
      })
      .then(title => {
        return models.Links.create({
          url: url,
          title: title,
          baseUrl: req.headers.origin
        });
      })
      .then(results => {
        return models.Links.get({ id: results.insertId });
      })
      .then(link => {
        throw link;
      })
      .error(error => {
        res.status(500).send(error);
      })
      .catch(link => {
        res.status(200).send(link);
      });
  });

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/signup', (req, res) => {
  res.render('signup');
});

app.get('/login', (req, res) => {
  res.render('login');
});

var loginHelper = (req, res, next) => {
  return models.Users.get({ username: req.body.username })
    .then((result) => {
      if (!result) {
        throw ('Username does not exist');
      }
      console.log('checked username');
      return models.Users.compare(req.body.password, result.password, result.salt);
    })
    .then((result) => {
      if (!result) {
        throw ('Password is incorrect');
      }
      console.log('checked password');
      return models.Users.get({ username: req.body.username });
    })
    .then((user)=> {
      console.log('about to update session');
      console.log(req.session.hash);
      return models.Sessions.update({ hash: req.session.hash }, { userId: user.id });
    })
    .then(() => {
      console.log('should redirect you to homepage');
      res.redirect('/');
    })
    .error((err) => {
      console.log('there was an error');
      res.status(500).send(err);
    })
    .catch((string) => {
      console.log('something was caught');
      console.log(string);
      res.redirect('/login'); // yell at user with the string somehow (later)
      // res.status(500).send(string);
    });
};

app.post('/signup', (req, res, next) => {
  return models.Users.get({ username: req.body.username })
    .then((results) => {
      if (results) {
        throw ('Username is taken');
      }
      return models.Users.create({ username: req.body.username, password: req.body.password});
    })
    .then(() => {
      // res.redirect('/'); // handle automatic login later
      return loginHelper(req, res, next);
    })
    .error((err) => {
      res.status(500).send(err);
    })
    .catch(() => {
      res.redirect('/signup'); // Reload signup page with thrown string
    });
});

app.post('/login', loginHelper);

/************************************************************/
// Handle the code parameter route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/:code', (req, res, next) => {

  return models.Links.get({ code: req.params.code })
    .tap(link => {

      if (!link) {
        throw new Error('Link does not exist');
      }
      return models.Clicks.create({ linkId: link.id });
    })
    .tap(link => {
      return models.Links.update(link, { visits: link.visits + 1 });
    })
    .then(({ url }) => {
      res.redirect(url);
    })
    .error(error => {
      res.status(500).send(error);
    })
    .catch(() => {
      res.redirect('/');
    });
});

module.exports = app;
