#!/usr/bin/env nodejs

'use strict';

//nodejs dependencies
const fs = require('fs');
const process = require('process');
const path = require('path');
//external dependencies
const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const mustache = require('mustache');
const expressValidator = require('express-validator');
var exphbs = require('express-handlebars');
//local dependencies
const engines = require('consolidate');
const https = require('https');
const user = require('./user/user');
const options = require('./options').options;

const TOKEN_COOKIE = 'token';
const MAIL_COOKIE = 'id';
/*************************** Route Handling ****************************/

function setupRoutes(app) {
  app.get('/', home(app));
  app.get('/user/register', registerUser(app));
  app.post('/user/login', enterUser(app));
  app.post('/user/register', addUser(app));
  app.get('/user/login', loginUser(app));
  app.get('/user/:id/info', getUser(app));
  app.post('/user/logout', logOut(app));
}

function logOut(app){
  return function(req,res){
    // res.clearCookie[TOKEN_COOKIE];
    res.cookie(TOKEN_COOKIE, "cookie", {
      maxAge: 100
    });
    res.redirect(301, '/');
  }
}

function enterUser(app) {
  return function(req, res) {
    let email = req.body.email;
    let password = req.body.password;
    req.checkBody('email', 'Email is required. :(').notEmpty();
    req.checkBody('password', 'Password is required. :(').notEmpty();

    var errors = req.validationErrors();

    if (errors) {
      res.render('login.hbs', {
        errors: errors,
        email: email
      });
    }else {
      // console.log("Passed");

      app.user.authUser(password, email).then(function(cookie) {
          res.cookie(TOKEN_COOKIE, cookie, {
            maxAge: 86400 * 1000
          });
          res.cookie(MAIL_COOKIE, email, {
            maxAge: 86400 * 1000
          });
          // console.log("cookie set");
          // console.log(cookie);
          res.redirect(301, '/user/'+email+ '/info');
          // res.render('userInfo.hbs', {
          //   success: "Login successfully. :)"
          // });
        })
        .catch((err) => {
          console.log(err);
          res.render('login.hbs', {
            err: "Invalid email or password.",
            email: email
          });
        });



    }
  }
}

  function getUser(app) {
    return function(req, res) {
      let token = req.cookies[TOKEN_COOKIE];
      let email = req.cookies[MAIL_COOKIE];
      // console.log("getting user...");
      // console.log("token geliyo");
      // console.log(token);

      if(token === undefined){
        res.render('login.hbs', {
          err: "You need to login to see the secret :("
        });
      }
      else{
        app.user.getUser(token, email).then(function(results) {

            // console.log(results);
            var id, name;
            var i = 0;
            for (i in results.data._id) {
              id += results.data["_id"][i];
            }
            var pw = results.data.hashedPassword;
            var firstname = results.data.firstname;
            var lastname = results.data.lastname;
            // var id = JSON.stringify(results.data._id);
            // console.log(results.data._id);
            res.render('userInfo.hbs', {
              id: id,
              pw: pw,
              firstname: firstname,
              lastname: lastname
            });
          })
          .catch((err) => {
            // console.log(err.response.status);

              res.render('login.hbs', {
                err: err.response.data.status
              });

          });
      }

    }
  }

  function loginUser(app) {
    return function(req, res) {
      res.render('login.hbs');
    };
  }

  function home(app) {
    return function(req, res) {
      res.render('home.hbs');
    };
  }

  function addUser(app) {
    return function(req, res) {
      let name = req.body.name
      let lastName = req.body.lastname
      let email = req.body.email;
      let password = req.body.password;
      let passwordConfirm = req.body.passwordConfirm;

      // console.log(name);
      // console.log(lastName);
      // console.log(email);
      // console.log(password);
      // console.log(passwordConfirm);

      //validation
      req.checkBody('name', 'Name is required. :(').notEmpty();
      req.checkBody('lastname', 'Lastname is required. :(').notEmpty();
      req.checkBody('email', 'Email is required. :(').notEmpty().matches(/([\S]+@[\S]+)/);
      req.checkBody('password', 'The password should consist of at least 8 characters none of which is a whitespace character and at least one of which is a digit:(').len(8,20).matches(/[^\s\\](\d)+(\w)+|[^\s\\](\w)+(\d)+/);
      req.checkBody('passwordConfirm', 'Passwords are not match. :(').equals(req.body.password);

      var errors = req.validationErrors();

      if (errors) {
        // console.log(errors);
         console.log(errors);

        res.render('register', {
          errors: errors,
          // msg: errors[0]["msg"],
          name: name,
          lastName: lastName,
          email: email
        });

      } else {
        // console.log("Passed");

        app.user.newUser(name, lastName, password, email).then(function(results) {
            res.cookie(TOKEN_COOKIE, results, {
              maxAge: 86400 * 1000
            });
            res.cookie(MAIL_COOKIE, email, {
              maxAge: 86400 * 1000
            });

            // res.render('register.hbs', {
            //   success: "Registered successfully. :)"
            // });
            res.redirect(301, '/user/'+email+ '/info');
            // res.render('register.hbs', {
            //   success: "Registered successfully. :)"
            // });
          })
          .catch((err) => {

            console.log(err.response.data);
            res.render('register', {
              msg: "Email already being used.",
              name: name,
              lastName: lastName,
              email: email
            });
          });



      }

    };
  }

  function registerUser(app) {
    return function(req, res) {
      res.render('register.hbs');

    };
  }

  /************************ Utility functions ****************************/

  function getPort(argv) {
    let port = null;
    if (argv.length !== 3 || !(port = Number(argv[2]))) {
      console.error(`usage: ${argv[1]} PORT`);
      process.exit(1);
    }
    return port;
  }

  /*************************** Initialization ****************************/



  function setup() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const dir=options.sslDir;

    var sslOptions = {


      key: fs.readFileSync(dir + '/key.pem'),
      cert: fs.readFileSync(dir + '/cert.pem')
    };
    process.chdir(__dirname);
    // const port = getPort(process.argv);
    const port = options.port
    const app = express();
    app.use(expressValidator())
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({
      extended: true
    }));
    setupRoutes(app);

    app.engine('.hbs', exphbs({
      extname: '.hbs',
      layoutsDir: __dirname + '/views'
    }));
    app.set('views', path.join(__dirname + '/views'));
    app.set('view engine', '.hbs');
    app.user = user
    https.createServer(sslOptions, app).listen(port, function() {
    console.log(`listening on port ${port}`);
  });
  }

  setup();
