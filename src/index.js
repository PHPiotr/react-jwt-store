'use strict'

import extend from 'xtend'
import cookie from 'cookie-monster'
import decode from 'jwt-decode'
import events from 'events'

const EventEmitter = events.EventEmitter

const canWarn = () => console && console.warn && typeof console.warn === 'function'

module.exports = (options) => {
  options = extend({ cookie: 'XSRF-TOKEN' }, options)

  let token = cookie.get(options.cookie)
  let user

  if (token) {
    try {
      user = decode(token)
    } catch (e) {
      user = void 0
      canWarn() && console.warn(`Invalid JWT: ${token}`)
    }
  }

  return extend({
    getToken () {
      return token
    },

    getUser () {
      return user
    },

    getUserId () {
      return user ? user.id : void 0
    }
  }, EventEmitter.prototype)
}
