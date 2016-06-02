'use strict'

import extend from 'xtend'
import cookie from 'cookie-monster'
import decode from 'jwt-decode'
import events from 'events'
import ls from 'local-storage'

const EventEmitter = events.EventEmitter
const noop = function () { }

module.exports = (options) => {
  let user
  let token

  options = extend({ cookie: 'XSRF-TOKEN' }, options)

  const logger = options.logger || {
    info: noop,
    warn: noop
  }

  const decodeToken = token => {
    if (token) {
      try {
        return decode(token)
      } catch (e) {
        logger.warn(`[JWT store] Invalid JWT: ${token}`)
        return void 0
      }
    }
  }

  if (options.localStorageKey) {
    try {
      token = ls.get(options.localStorageKey)
    } catch (e) {
      logger.warn('[JWT store] Unable to get token', e)
    }
  } else {
    token = cookie.get && cookie.get(options.cookie)
  }
  logger.info('[JWT store] created store with token', token)

  const tokenStore = extend({
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
      logger.info('[JWT store] setting new token', newToken)
      token = newToken
      user = decodeToken(token)
      this.emit('Token received')
    },

    refreshToken () {
      logger.info('[JWT store] refreshing token', token)
      options.refresh(token)
      .then(tokenStore.setToken.bind(tokenStore))
    }
  }, EventEmitter.prototype)

  const refreshToken = () => {
    if (!token && options.refresh) {
      tokenStore.refreshToken()
    } else {
      user = decodeToken(token)
    }

    let expDate = user ? new Date(user.exp * 1000 - 2 * refreshInterval) : null
    if (expDate && expDate < new Date() && options.refresh) {
      tokenStore.refreshToken()
    }
  }

  const refreshInterval = options.refreshInterval
    ? options.refreshInterval
    : (60000)
  refreshToken()

  setInterval(refreshToken, refreshInterval)

  return tokenStore
}
