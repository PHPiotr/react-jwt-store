'use strict';

let extend = require('xtend'),
  cookie = require('cookie-monster'),
  decode = require('jwt-decode'),
  EventEmitter = require('events').EventEmitter;

module.exports = (options) => {
  options = extend({ cookie: 'XSRF-TOKEN' }, options);

  let token = cookie.get(options.cookie),
    user = decode(token);

  return extend({
    getToken() {
      return token;
    },

    getUser() {
      return user;
    }
  }, EventEmitter.prototype);
};
