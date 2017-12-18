'use strict';

const axios = require('axios');

const options = require('../options').options;
const WS_URL = options.ws_url;

function User() {
  this.baseUrl = WS_URL;
}

User.prototype.newUser = function(firstname,lastname,pw,email) {

  return axios.put(WS_URL +'/users/'+email +'?pw=' + pw ,
  {firstname:firstname,
  lastname:lastname
    })
    .then((response) => {
      var body = response;
      var token = body.data.authToken;
      return token;
    });
}

User.prototype.getUser = function(token,email) {
  // console.log("Getting user...");
  return axios.get(WS_URL + '/users/' + email, { headers: { Authorization: "Bearer " + token }})
    .then((response) => response);
}

User.prototype.authUser = function(pw,email) {
  console.log("Auth user...");
  console.log('https://localhost:1234/users/' + email + '/auth');
  return axios.put(WS_URL +'/users/' + email + '/auth', {pw:pw})
    .then((response) => {
      var token = response.data.authToken;
      return token;
    });
}


module.exports = new User();
