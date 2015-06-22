# react-jwt-store

React JWT user store

## Usage

```javascript
let React = require('react'),
  userStore = require('react-jwt-store')();

class someComponent extends React.Component {
  constructor() {
    super(props);

    this.state = {
      user: userStore.getUser(),
      token: userStore.getToken()
    };
  }
  render() {
    let user = this.state.user,
      token = this.state.token;

    return (
      <div>
        <h1>{user}</h1>
        <h2>{token}</h1>
  }
}
```

### Override Cookie Key

By default, the JWT assumes the cookie key is `XSRF-TOKEN`. This can be overridden
by passing `cookie` on the `options` hash:

```javascript
  let userStore = require('react-jwt-store')({ cookie: 'NOT-XSRF-TOKEN'});
```
