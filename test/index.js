'use strict'

import assert from 'assert'
import token from './data/token'
import ls from 'local-storage'
import bluebird from 'bluebird'

describe('Token Store', () => {
  beforeEach(() => {
    // HACK around https://github.com/auth0/jwt-decode/issues/5
    GLOBAL.window = GLOBAL

    // HACK around cookie monster returning undefined when document isn't there
    GLOBAL.document = {}
  })

  afterEach(() => {
    delete GLOBAL.window
    delete GLOBAL.document
  })

  it('should set user after no token is present', () => {
    const tokenStore = require('../src')()
    tokenStore.setToken(token)
    let user = tokenStore.getUser()

    assert.equal(user.first_name, 'Mike')
    assert.equal(user.last_name, 'Atkins')
  })

  it('should get the token out of local storage', () => {
    ls.set('coolKey', token)
    const tokenStore = require('../src')({localStorageKey: 'coolKey'})
    const user = tokenStore.getUser()

    assert.equal(user.first_name, 'Mike')
    assert.equal(user.last_name, 'Atkins')
  })

  it('if no token call refresh & set token', done => {
    const tokenStore = require('../src')({refresh: () =>
      bluebird.resolve(token)
    })
    tokenStore.on('Token received', () => {
      const user = tokenStore.getUser()

      assert.equal(user.first_name, 'Mike')
      assert.equal(user.last_name, 'Atkins')
      done()
    })
  })

  it('if token is expired, call refresh & set token', () => {
    const tokenStore = require('../src')({refresh: () =>
      bluebird.resolve(token)
    })
    const user = tokenStore.getUser()

    assert.equal(user.first_name, 'Mike')
    assert.equal(user.last_name, 'Atkins')
  })

  it('if token valid, leave as is')

  it('it token to expire soon, refresh after interval')

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
