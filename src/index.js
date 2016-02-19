'use strict'

import extend from 'xtend'
import cookie from 'cookie-monster'
import decode from 'jwt-decode'
import events from 'events'
import ls from 'local-storage'

const EventEmitter = events.EventEmitter

const canWarn = () => console && console.warn && typeof console.warn === 'function'

const decodeToken = token => {
  if (token) {
    try {
      return decode(token)
    } catch (e) {
      canWarn() && console.warn(`Invalid JWT: ${token}`)
      return void 0
    }
  }
}

module.exports = (options) => {
  options = extend({ cookie: 'XSRF-TOKEN' }, options)

  let token
  if ('localStorageKey' in options) {
    token = ls.get(options.localStorageKey)
  } else {
    token = cookie.get && cookie.get(options.cookie)
  }

  let user
  const refreshToken = (result) => {
    token = result
    user = decodeToken(token)
  }
  if (!token && options.refresh) {
    options.refresh()
    .then(refreshToken)
  } else {
    user = decodeToken(token)
  }

  let expDate = user ? new Date(user.exp * 1000) : null

  if (expDate < new Date() && options.refresh) {
    options.refresh()
    .then(refreshToken)
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
    },

    setToken (newToken) {
      token = newToken
      user = decodeToken(token)
    }
  }, EventEmitter.prototype)
}
