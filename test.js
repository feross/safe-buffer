var test = require('tape')
var SafeBuffer = require('./').Buffer

test('safe usage continues to work as before', function (t) {
  t.deepEqual(new SafeBuffer('hey'), new Buffer('hey'))
  t.deepEqual(new SafeBuffer('hey', 'utf8'), new Buffer('hey', 'utf8'))
  t.deepEqual(new SafeBuffer([1, 2, 3]), new Buffer([1, 2, 3]))
  t.equal(typeof SafeBuffer.isBuffer, 'function')
  t.equal(SafeBuffer.isBuffer(new SafeBuffer('hey')), true)
  t.equal(Buffer.isBuffer(new SafeBuffer('hey')), true)
  t.notOk(Buffer.isBuffer({}))
  t.end()
})

test('new Buffer(number) always returns zeroed out memory', function (t) {
  for (var i = 0; i < 10; i++) {
    t.deepEqual(new SafeBuffer(1000), new Buffer(1000).fill(0))
    t.deepEqual(new SafeBuffer(1000 * 1000), new Buffer(1000 * 1000).fill(0))
  }
  t.end()
})

test('Buffer.alloc(number)', function (t) {
  var buf = SafeBuffer.alloc(100) // unitialized memory
  t.equal(buf.length, 100)
  t.equal(SafeBuffer.isBuffer(buf), true)
  t.equal(Buffer.isBuffer(buf), true)
  t.end()
})

test('Buffer.alloc() throws with other types', function (t) {
  t.plan(4)
  t.throws(function () {
    SafeBuffer.alloc('hey')
  })
  t.throws(function () {
    SafeBuffer.alloc('hey', 'utf8')
  })
  t.throws(function () {
    SafeBuffer.alloc([1, 2, 3])
  })
  t.throws(function () {
    SafeBuffer.alloc({})
  })
})
