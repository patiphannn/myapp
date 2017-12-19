var express = require('express');
var passport = require('passport');
var jwt = require('jsonwebtoken');
var expressJwt = require('express-jwt');
var PassportLocal = require('passport-local');
var compose = require('composable-middleware');
var router = express.Router();
var User  = require('../models/user');
var LocalStrategy = PassportLocal.Strategy;

function localAuthenticate(User, username, password, done) {
  User.authenticate(username, password, function(authError, authenticated) {
    if(authError) {
      return done(authError);
    }
    if(!authenticated) {
      return done(null, false, { message: 'รหัสผ่านไม่ถูกต้อง' });
    } else {
      return done(null, authenticated);
    }
  });
}

function isAuthenticated() {
  return compose()
    // Validate jwt
    .use(function(req, res, next) {
      // allow access_token to be passed through query parameter as well
      if(req.query && req.query.hasOwnProperty('access_token')) {
        req.headers.authorization = `Bearer ${req.query.access_token}`;
      }
     // IE11 forgets to set Authorization header sometimes. Pull from cookie instead.
      if(req.query && typeof req.headers.authorization === 'undefined') {
        req.headers.authorization = `Bearer ${req.cookies.token}`;
      }
      validateJwt(req, res, next);
    })
    // Attach user to request
    .use(function(req, res, next) {
      User.findById(req.user._id).exec()
        .then(user => {
          if(!user) {
            return res.status(401).end();
          }
          req.user = user;
          next();
        })
        .catch(err => next(err));
    });
}

var validateJwt = expressJwt({
  secret: 'myappnodejs'
});

function signToken(id) {
  return jwt.sign({ _id: id }, 'myappnodejs', {
    expiresIn: 60 * 60 * 5
  });
}

passport.use(new LocalStrategy({
  usernameField: 'username',
  passwordField: 'password' // this is the virtual field on the model
}, function(username, password, done) {
  return localAuthenticate(User, username, password, done);
}));

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// signup user
router.post('/signup', function(req, res, next) {
  if (req.body.email &&
    req.body.username &&
    req.body.password &&
    req.body.passwordConf &&
    req.body.password === req.body.passwordConf) {

    var userData = {
      email: req.body.email,
      username: req.body.username,
      password: req.body.password
    }

    //use schema.create to insert data into the db
    User.create(userData, function (err, user) {
      if (err) {
        return next(err)
      } else {
        return res.json(user);
      }
    });
  } else {
    var err = new Error('All fields required.');
    err.status = 400;
    return next(err);
  }
});

// signin user
router.post('/signin', function(req, res, next) {
  if (req.body.username &&
    req.body.password) {

    passport.authenticate('local', function(err, user, info) {
      var error = err || info;
      if(error) {
        return res.status(401).json(error);
      }
      if(!user) {
        return res.status(404).json({message: 'Something went wrong, please try again.'});
      }

      req.session.userId = user._id;
      var token = signToken(user._id);
      res.json({ token });
    })(req, res, next);
  } else {
    var err = new Error('All fields required.');
    err.status = 400;
    return next(err);
  }
});

// is authenticate
router.post('/authenticate',
  isAuthenticated(),
  function(req, res, next) {
    return res.json({ authenticate: true });
  });

module.exports = router;
