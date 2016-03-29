'use strict'

import assert from 'assert'
import { btoa } from 'Base64'
import decode from 'jwt-decode'
import token from './data/token'
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
    GLOBAL.window = GLOBAL

    // HACK around cookie monster returning undefined when document isn't there
    GLOBAL.document = {}
  })

  beforeEach(() => {
    updatedToken = setTokenExp(Date.now() + 1000)
  })

  afterEach(() => {
    delete GLOBAL.window
    delete GLOBAL.document

    ls.remove(localStorageKey)
  })

  it('should set user after no token is present', () => {
    const tokenStore = require('../src')()
    tokenStore.setToken(token)
    let user = tokenStore.getUser()

    assert.equal(user.first_name, 'Mike')
    assert.equal(user.last_name, 'Atkins')
  })

  it('should get the token out of local storage', () => {
    ls.set(localStorageKey, token)
    const tokenStore = require('../src')({localStorageKey})
    const user = tokenStore.getUser()

    assert.equal(user.first_name, 'Mike')
    assert.equal(user.last_name, 'Atkins')
  })

  it('if no token call refresh & set token', done => {
    const tokenStore = require('../src')({refresh: () =>
      bluebird.resolve(updatedToken)
    })
    tokenStore.on('Token received', () => {
      const user = tokenStore.getUser()

      assert.equal(user.first_name, 'Mike')
      assert.equal(user.last_name, 'Atkins')
      done()
    })
  })

  it('if token is expired, call refresh & set token', done => {
    ls.set(localStorageKey, token)
    const tokenStore = require('../src')({
      localStorageKey,
      refresh: () =>
        bluebird.resolve(updatedToken)
    })
    tokenStore.on('Token received', () => {
      const user = tokenStore.getUser()

      assert.equal(user.first_name, 'Mike')
      assert.equal(user.last_name, 'Atkins')
      done()
    })
  })

  it('if token valid, leave as is', () => {
    ls.set(localStorageKey, setTokenExp(Date.now() + 100 * 60 * 1000))
    const tokenStore = require('../src')({
      localStorageKey,
      refresh: () => assert.fail('should not be called')
    })

    const user = tokenStore.getUser()

    assert.equal(user.first_name, 'Mike')
    assert.equal(user.last_name, 'Atkins')
  })

  it('it token to expire soon, refresh after interval', done => {
    ls.set(localStorageKey, updatedToken)
    const tokenStore = require('../src')({
      localStorageKey,
      refresh: () => bluebird.resolve(updatedToken),
      refreshInterval: 1000
    })
    tokenStore.on('Token received', () => {
      const user = tokenStore.getUser()

      assert.equal(user.first_name, 'Mike')
      assert.equal(user.last_name, 'Atkins')
      done()
    })
  })

  describe('sad path', () => {
    it('should not blow up when cookie is not present', () => {
      let tokenStore
      assert.doesNotThrow(() => tokenStore = require('../src')())
      assert.ok(tokenStore.getToken() === void 0)
      assert.ok(tokenStore.getUser() === void 0)
      assert.ok(tokenStore.getUserId() === void 0)
    })

    it('should not blow up when cookie is invalid', () => {
      const token = 'g4rBaG3'
      require('cookie-monster').set('XSRF-TOKEN', token)

      let tokenStore
      assert.doesNotThrow(() => tokenStore = require('../src')())
      assert.ok(tokenStore.getToken() === token)
      assert.ok(tokenStore.getUser() === void 0)
      assert.ok(tokenStore.getUserId() === void 0)
    })
  })

  describe('default cookie key', () => {
    let tokenStore

    beforeEach(() => {
      require('cookie-monster').set('XSRF-TOKEN', token)

      tokenStore = require('../src')()
    })

    it('should get the XSRF-TOKEN and return it', () => {
      assert.equal(tokenStore.getToken(), token)
    })

    it('should return user', () => {
      let user = tokenStore.getUser()

      assert.equal(user.first_name, 'Mike')
      assert.equal(user.last_name, 'Atkins')
    })

    it('should return user id', () => {
      let id = tokenStore.getUserId()
      assert.equal(id, 2751055)
    })

    it('should return token', () => {
      let t = tokenStore.getToken()
      assert.equal(token, t)
    })
  })

  describe('override cookie key', () => {
    let tokenStore

    beforeEach(() => {
      require('cookie-monster').set('NOT-XSRF-TOKEN', token)

      tokenStore = require('../src')({ cookie: 'NOT-XSRF-TOKEN' })
    })

    it('should get the NOT-XSRF-TOKEN and return it', () => {
      assert.equal(tokenStore.getToken(), token)
    })
  })
})
