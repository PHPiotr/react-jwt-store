'use strict'

import assert from 'assert'
import { btoa } from 'Base64'
import decode from 'jwt-decode'
import token from './data/token'
import tokenTimezone from './data/token-timezone'
import ls from 'local-storage'
import bluebird from 'bluebird'

const setTokenExp = (timestamp) => {
  // hacky adjustment of expiration of the token
  const decoded = decode(token)
  decoded.exp = timestamp / 1000
  const [head, , sig] = token.split('.')
  return `${head}.${btoa(JSON.stringify(decoded))}.${sig}`
}

describe('Token Store', () => {
  const localStorageKey = 'coolKey'
  let updatedToken

  beforeEach(() => {
    // HACK around https://github.com/auth0/jwt-decode/issues/5
    global.window = global

    // HACK around cookie monster returning undefined when document isn't there
    global.document = {}
  })

  beforeEach(() => {
    updatedToken = setTokenExp(Date.now() + 1000)
  })

  afterEach(() => {
    delete global.window
    delete global.document

    ls.remove(localStorageKey)
  })

  it('should set user after no token is present', () => {
    const tokenStore = require('../src')()
    tokenStore.on('Token received', (_, user) => {
      assert.equal(user.first_name, 'Mike')
      assert.equal(user.last_name, 'Atkins')
    })

    tokenStore.init()
    tokenStore.setToken(token)
  })

  it('should get the token out of local storage', () => {
    ls.set(localStorageKey, token)
    const tokenStore = require('../src')({localStorageKey})
    tokenStore.on('Token received', (_, user) => {
      assert.equal(user.first_name, 'Mike')
      assert.equal(user.last_name, 'Atkins')
    })
    tokenStore.init()
  })

  it('should catch an exception token is not present in local storage', () => {
    ls.set(localStorageKey, undefined)
    const tokenStore = require('../src')({localStorageKey})
    tokenStore.on('Token received', assert.fail)
    tokenStore.init()
  })

  it('if no token call refresh & set token', done => {
    const tokenStore = require('../src')({refresh: () =>
      bluebird.resolve(updatedToken)
    })
    tokenStore.on('Token received', (_, user) => {
      assert.equal(user.first_name, 'Mike')
      assert.equal(user.last_name, 'Atkins')
      done()
    })
    tokenStore.init()
  })

  it('if token is expired, call refresh with expired token', done => {
    ls.set(localStorageKey, token)
    require('../src')({
      localStorageKey,
      refresh: (t) => {
        assert.equal(t, token)
        done()
        return bluebird.resolve(updatedToken)
      }
    }).init()
  })

  it('if token is expired, call refresh & set token', done => {
    ls.set(localStorageKey, token)
    const tokenStore = require('../src')({
      localStorageKey,
      refresh: () =>
        bluebird.resolve(updatedToken)
    })
    let callCount = 0
    tokenStore.on('Token received', (_, user) => {
      assert.equal(user.first_name, 'Mike')
      assert.equal(user.last_name, 'Atkins')
      if (++callCount === 2) { done() }
    })
    tokenStore.init()
  })

  it('if token valid, leave as is', () => {
    ls.set(localStorageKey, setTokenExp(Date.now() + 100 * 60 * 1000))
    const tokenStore = require('../src')({
      localStorageKey,
      refresh: () => assert.fail('should not be called')
    })
    tokenStore.on('Token received', (_, user) => {
      assert.equal(user.first_name, 'Mike')
      assert.equal(user.last_name, 'Atkins')
    })
    tokenStore.init()
  })

  it('if token to expire soon, refresh after interval', done => {
    ls.set(localStorageKey, updatedToken)
    const tokenStore = require('../src')({
      localStorageKey,
      refresh: () => bluebird.resolve(updatedToken),
      refreshInterval: 1000
    })
    let callCount = 0
    tokenStore.on('Token received', (_, user) => {
      assert.equal(user.first_name, 'Mike')
      assert.equal(user.last_name, 'Atkins')
      if (++callCount === 2) { done() }
    })
    tokenStore.init()
  })

  it('refreshes the token and sets it', done => {
    ls.set(localStorageKey, setTokenExp(Date.now() + 100 * 60 * 1000))
    const tokenStore = require('../src')({
      localStorageKey,
      refresh: () => bluebird.resolve(tokenTimezone)
    })

    let callCount = 0
    tokenStore.on('Token received', (_, user) => {
      callCount++
      if (callCount === 1) {
        assert(!user.timezone)
      } else if (callCount === 2) {
        assert.equal(user.timezone, 'UTC')
        done()
      } else {
        assert.fail('shouldn\'t be called more than twice')
      }
    })

    tokenStore.init()
    tokenStore.refreshToken()
  })

  describe('sad path', () => {
    it('should not blow up when cookie is not present', () => {
      let tokenStore
      assert.doesNotThrow(() => tokenStore = require('../src')())
      assert.doesNotThrow(() => tokenStore.init())
    })

    it('should not blow up when cookie is invalid', () => {
      const token = 'g4rBaG3'
      require('cookie-monster').set('XSRF-TOKEN', token)

      let tokenStore
      assert.doesNotThrow(() => tokenStore = require('../src')())
      assert.doesNotThrow(() => tokenStore.init())
    })
  })

  describe('default cookie key', () => {
    let tokenFromStore
    let user

    beforeEach(() => {
      require('cookie-monster').set('XSRF-TOKEN', token)

      const tokenStore = require('../src')()
      tokenStore.on('Token received', (t, u) => {
        tokenFromStore = t
        user = u
      })
      tokenStore.init()
    })

    it('should get the XSRF-TOKEN and return it', () => {
      assert.equal(tokenFromStore, token)
    })

    it('should return user', () => {
      assert.equal(user.first_name, 'Mike')
      assert.equal(user.last_name, 'Atkins')
    })
  })

  describe('override cookie key', () => {
    let tokenFromStore

    beforeEach(() => {
      require('cookie-monster').set('NOT-XSRF-TOKEN', token)

      const tokenStore = require('../src')({ cookie: 'NOT-XSRF-TOKEN' })
      tokenStore.on('Token received', (t) => {
        tokenFromStore = t
      })
      tokenStore.init()
    })

    it('should get the NOT-XSRF-TOKEN and return it', () => {
      assert.equal(tokenFromStore, token)
    })
  })

  describe('terminate', () => {
    let cookieMonster
    beforeEach(() => {
      cookieMonster = require('cookie-monster')
      cookieMonster.set('XSRF-TOKEN', token)
    })
    it('should set token to undefined on explicit termination', done => {
      let callCount = 0
      const tokenStore = require('../src')({
        refresh: (t) => {
          if (callCount === 0) {
            cookieMonster.set('XSRF-TOKEN', token, {expires: 'Thu, 01 Jan 1970 00:00:01 GMT'})
            assert.equal(t, token)
          }
          if (callCount === 1) {
            assert.equal(t, undefined)
          }
          callCount++

          return bluebird.resolve(t)
        }
      })
      tokenStore.init()
      tokenStore.terminate()
      tokenStore.refreshToken()
      done()
    })

    it('should not set token to undefined when no explicit termination', done => {
      let callCount = 0
      const tokenStore = require('../src')({
        refresh: (t) => {
          if (!t) {
            return bluebird.resolve()
          }
          if (callCount === 0) {
            cookieMonster.set('XSRF-TOKEN', token, {expires: 'Thu, 01 Jan 1970 00:00:01 GMT'})
            assert.equal(t, token)
          }
          if (callCount === 1) {
            assert.equal(t, token)
          }
          callCount++

          return bluebird.resolve(t)
        }
      })
      tokenStore.init()
      tokenStore.refreshToken()
      done()
    })
  })
})
