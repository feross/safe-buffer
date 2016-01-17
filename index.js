module.exports = SafeBuffer
module.exports.Buffer = SafeBuffer

function SafeBuffer (arg1, arg2) {
  var buffer = new Buffer(arg1, arg2)
  if (typeof arg1 === 'number') {
    buffer.fill(0)
  }
  return buffer
}

Object.keys(Buffer).forEach(function (prop) {
  SafeBuffer[prop] = Buffer[prop]
})

SafeBuffer.from = function (value, encoding) {
  if (typeof value === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return new Buffer(value, encoding)
}

SafeBuffer.alloc = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return new Buffer(size)
}

SafeBuffer.zalloc = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buffer = new Buffer(size)
  buffer.fill(0)
  return buffer
}
