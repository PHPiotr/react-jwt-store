# react-jwt-store

React JWT user store

## Usage

```javascript
const userStore = require('react-jwt-store')()

userStore.on('Token received', (token, user) => {
  console.log(token, user)
})

userStore.init()
```

### Initialize
In order to trigger the store's refresh mechanism and send data to any event
handlers, you must call the `init` method.
```javascript
userStore.init()
```

### Set the token
You can set the token without interacting with cookies via the following.
```javascript
userStore.setToken('jwt')
```

### Refresh the token
You can force a refresh of the token via the following.
```javascript
userStore.refreshToken()
```

### Override Cookie Key

By default, the JWT assumes the cookie key is `XSRF-TOKEN`. This can be overridden
by passing `cookie` on the `options` hash:

```javascript
  let userStore = require('react-jwt-store')({ cookie: 'NOT-XSRF-TOKEN'});
```

### Set a logger

By default, the store does not log anything, but if you pass in a `console`
compatible logger, the store will log the state of the token as it changes.

### Terminate

By default, if you set token to null:
```javascript
userStore.setToken(null)
```
...an interval responsible for refreshing tokens (the one set up on init) will not be cleared.
If you want to clear it explicitly, then you can do it with:
```javascript
userStore.terminate()
```
