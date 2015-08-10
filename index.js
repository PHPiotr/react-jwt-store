'use strict';

const extend = require('xtend'),
  cookie = require('cookie-monster'),
  decode = require('jwt-decode'),
  EventEmitter = require('events').EventEmitter,
  Immutable = require('immutable');

module.exports = (options) => {
  options = extend({ cookie: 'XSRF-TOKEN' }, options);

  const token = Immutable.fromJS(cookie.get(options.cookie)),
    user = Immutable.fromJS(decode(token));

  return extend({
    getToken() {
      return token;
    },

    getUser() {
      return user;
    },

    getUserId() {
      return user.id;
    }
  }, EventEmitter.prototype);
};
