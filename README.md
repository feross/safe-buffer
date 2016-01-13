# safe-buffer [![travis][travis-image]][travis-url] [![npm][npm-image]][npm-url] [![downloads][downloads-image]][npm-url]

#### Safer Node.js Buffer API

[travis-image]: https://img.shields.io/travis/feross/safe-buffer.svg
[travis-url]: https://travis-ci.org/feross/safe-buffer
[npm-image]: https://img.shields.io/npm/v/safe-buffer.svg
[npm-url]: https://npmjs.org/package/safe-buffer
[downloads-image]: https://img.shields.io/npm/dm/safe-buffer.svg

## install

```
npm install safe-buffer
```

## usage

The goal of this package is to make the node.js `Buffer` safer to use.

It's a drop-in replacement for `Buffer`. You can use it by adding one `require` line to
the top of your node.js modules:

```js
var Buffer = require('safe-buffer')

// Existing buffer code will continue to work without issues:

new Buffer('hey', 'utf8')
new Buffer([1, 2, 3], 'utf8')
new Buffer(obj)

// But this potentially unsafe operation returns zeroed out memory:

new Buffer(16) // this is safe now!

// Create uninitialized buffers explicitly, when required for performance:

Buffer.alloc(16) // potentially unsafe
```

## Why is `Buffer` unsafe?

Today, the node.js `Buffer` constructor is overloaded to handle many different argument
types like `String`, `Array`, `Object`, `TypedArrayView` (`Uint8Array`, etc.),
`ArrayBuffer`, and also `Number`.

The API is optimized for convenience: you can throw any type at it, and it will try to do
what you want.

Because the Buffer constructor is so powerful, you often see code like this:

```js
// Convert UTF-8 strings to hex
function toHex (str) {
  return new Buffer(str).toString('hex')
}
```

***But what happens if `toHex` is called with a `Number` argument?***

### Remote Memory Disclosure

If an attacker can make your program call the `Buffer` constructor with a `Number`
argument, then they can make it allocate uninitialized memory from the node.js process.
This could potentially disclose TLS private keys, user data, or database passwords.

When the `Buffer` constructor is passed a `Number` argument, it returns an
**UNINITIALIZED** block of memory of the specified `size`. When you create a `Buffer` like
this, you **MUST** overwrite the contents before returning it to the user.

From the [node.js docs](https://nodejs.org/api/buffer.html#buffer_new_buffer_size):

> `new Buffer(size)`
>
> - `size` Number
>
> The underlying memory for `Buffer` instances created in this way is not initialized.
> **The contents of a newly created `Buffer` are unknown and could contain sensitive
> data.** Use `buf.fill(0)` to initialize a Buffer to zeroes.

(Emphasis our own.)

Whenever the programmer intended to create an uninitialized `Buffer` you often see code
like this:

```js
var buf = new Buffer(16)

// Immediately overwrite the uninitialized buffer with data from another buffer
for (var i = 0; i < buf.length; i++) {
  buf[i] = otherBuf[i]
}
```


### Would this ever be a problem in real code?

Yes. It's surprisingly common to forget to check the type of your variables in a
dynamically-typed language like JavaScript.

Usually the consequences of assuming the wrong type is that your program crashes with an
uncaught exception. But the failure mode for forgetting to check the type of arguments to
the `Buffer` constructor is more catastrophic.

Here's an example of a vulnerable service that takes a JSON payload and converts it to
hex:

```js
// Take a JSON payload {str: "some string"} and convert it to hex
var server = http.createServer(function (req, res) {
  var buf = ''
  req.setEncoding('utf8')
  req.on('data', function (data) {
    buf += data
  })
  req.on('end', function () {
    var body = JSON.parse(buf)
    res.end(new Buffer(body.str).toString('hex'))
  })
})

server.listen(8080)
```

In this example, an http client just has to send:

```json
{
  "str": 1000
}
```

and it will get back 1,000 bytes of uninitialized memory from the server.

This is a very serious bug. It's similar in severity to the
[the Heartbleed bug](http://heartbleed.com/) that allowed disclosure of OpenSSL process
memory by remote attackers.


### Real-world packages that were vulnerable

#### [`bittorrent-dht`](https://www.npmjs.com/package/bittorrent-dht)

[Mathius Buus](https://github.com/mafintosh) and I
([Feross Aboukhadijeh](http://feross.org/)) found this issue in one of our own packages,
[`bittorrent-dht`](https://www.npmjs.com/package/bittorrent-dht). The bug would allow
anyone on the internet to send a series of messages to a user of `bittorrent-dht` and get
them to reveal 20 bytes at a time of uninitialized memory from the node.js process.

Here's
[the commit](https://github.com/feross/bittorrent-dht/commit/6c7da04025d5633699800a99ec3fbadf70ad35b8)
that fixed it. We released a new fixed version, created a
[Node Security Project disclosure](https://nodesecurity.io/advisories/68), and deprecated all
vulnerable versions on npm so users will get a warning to upgrade to a newer version.

#### [`ws`](https://www.npmjs.com/package/ws)

That got us wondering if there were other vulnerable packages. Sure enough, within a short
period of time, we found the same issue in [`ws`](https://www.npmjs.com/package/ws), the
most popular WebSocket implementation in node.js.

If certain APIs were called with `Number` parameters instead of `String` or `Buffer` as
expected, then uninitialized server memory would be disclosed to the remote peer.

These were the vulnerable methods:

```js
socket.send(number)
socket.ping(number)
socket.pong(number)
```

Here's a vulnerable socket server with some echo functionality:

```js
server.on('connection', function (socket) {
  socket.on('message', function (message) {
    message = JSON.parse(message)
    if (message.type === 'echo') {
      socket.send(message.data) // send back the user's message
    }
  })
})
```

`socket.send(number)` called on the server, will disclose server memory.

Here's [the release](https://github.com/websockets/ws/releases/tag/1.0.1) where the issue
was fixed, with a more detailed explanation. Props to
[Arnout Kazemier](https://github.com/3rd-Eden) for the quick fix. Here's the
[Node Security Project disclosure](https://nodesecurity.io/advisories/67).


### What's the solution?

It's important that node.js offers a fast way to get memory otherwise performance-critical
applications would needlessly get a lot slower.

But we need a better way to *signal our intent* as programmers.

**When we want uninitialized memory, we should request it explicitly.**

#### `Buffer.alloc(number)`

```js
var buf = Buffer.alloc(16) // careful, uninitialized memory!

// Immediately overwrite the uninitialized buffer with data from another buffer
for (var i = 0; i < buf.length; i++) {
  buf[i] = otherBuf[i]
}
```

Sensitive functionality should not be packed into a developer-friendly API that loosely
accepts many different types. This type of API encourages the lazy practice of passing
variables in without checking the type very carefully.

The functionality of creating buffers with uninitialized memory should be part of another
API. We propose `Buffer.alloc(number)`. This way, it's not part of an API that frequently
gets user input of all sorts of different types passed into it.

#### Fixing node.js core

We sent [a PR to node.js core](https://github.com/nodejs/node/pull/4514) which defends
against one case:

```js
var str = 16
new Buffer(str, 'utf8')
```

In this situation, it's implied that the programmer intended the first argument to be a
string, since they passed an encoding as a second argument. Today, node.js will allocate
uninitialized memory in the case of `new Buffer(number, encoding)`, which is probably not
what the programmer intended.

But this is only a partial solution, since if the programmer does `new Buffer(variable)`
(without an `encoding` parameter) there's no way to know what they intended. If `variable`
is sometimes a number, then uninitialized memory will sometimes be returned.

#### What's the real long-term fix?

We could deprecate and remove `new Buffer(number)` and use `Buffer.alloc(number)` when
we need uninitialized memory. But that would break 1000s of packages.

We believe the best solution is to:

1. Change `new Buffer(number)` to return safe, zeroed-out memory

2. Create a new API for creating uninitialized Buffers. We propose: `Buffer.alloc(number)`

This way, existing code continues working and the impact on the npm ecosystem will be
minimal. Over time, npm maintainers can migrate performance-critical code to use
`Buffer.alloc(number)` instead of `new Buffer(number)`.


### Conclusion

We think there's a serious design issue with the `Buffer` API as it exists today. It
promotes insecure software by putting high-risk functionality into a convenient API
with friendly "developer ergonomics".

This wasn't merely a theoretical exercise because we found the issue in some of the
most popular npm packages.

Fortunately, there's an easy fix that can be applied today. Use `safe-buffer` in place of
`buffer`.

```js
var Buffer = require('safe-buffer')
```

Eventually, we hope that node.js core can switch to this new, safer behavior. We believe
the impact on the ecosystem would be minimal since it's not a breaking change.
Well-maintained, popular packages would be updated to use `Buffer.alloc` quickly, while
older, insecure packages would magically become safe from this attack vector.


## links

- [Node.js PR: buffer: throw if both length and enc are passed](https://github.com/nodejs/node/pull/4514)
- [Node Security Project disclosure for `ws`](https://nodesecurity.io/advisories/67)
- [Node Security Project disclosure for`bittorrent-dht`](https://nodesecurity.io/advisories/68)


## credit

The original issues in `bittorrent-dht`
([disclosure](https://nodesecurity.io/advisories/68)) and
`ws` ([disclosure](https://nodesecurity.io/advisories/67)) were discovered by
[Mathias Buus](https://github.com/mafintosh) and
[Feross Aboukhadijeh](http://feross.org/).

Thanks to [Adam Baldwin](https://github.com/evilpacket) for helping disclose these issues
and for his work running the [Node Security Project](https://nodesecurity.io/).

Thanks to [John Hiesey](https://github.com/jhiesey) for proofreading this README.


## license

MIT. Copyright (C) [Feross Aboukhadijeh](http://feross.org)
