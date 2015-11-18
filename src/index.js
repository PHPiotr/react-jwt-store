'use strict'

import extend from 'xtend'
import cookie from 'cookie-monster'
import decode from 'jwt-decode'
import events from 'events'

const EventEmitter = events.EventEmitter

module.exports = (options) => {
  options = extend({ cookie: 'XSRF-TOKEN' }, options)

  let token = cookie.get(options.cookie)
  let user = decode(token)

  return extend({
    getToken () {
      return token
    },

    getUser () {
      return user
    },

    getUserId () {
      return user.id
    }
  }, EventEmitter.prototype)
}
