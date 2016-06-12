# esmin

Utility to minify code targeting ES2015+

Currently joins literals and tries to eliminate unreachable code, using babel to
output without whitespace and comments..

## Usage

Usage info is available with the `-h` or `--help` flags.

```bash
# basic usage
esmin input.js -o input.min.js

# to replace process.env.NODE_ENV with "production" add the `-p` flag
esmin input.js -p -o input.min.js
```

## Before and After

Here's an example that shows off what is currently implemented.

`test.js`

```javascript
// hello world

var m = 3*5*6*8

var b = +"234"

var c = +"234" + 5

if ( 3*5*8 ? false : false ) {
  doSomething()

} else if (true) {
  thisOne()
} else {
  notHappening()
}

if ( (3*5?4:6) < 5) woot()

if (process.env.NODE_ENV !== "production") {
  debug()
}

```

`test.min.js`

```javascript
var m=720;var b=234;var c=239;thisOne();woot();
```
