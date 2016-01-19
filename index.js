module.exports = SafeBuffer
module.exports.Buffer = SafeBuffer

function SafeBuffer (value, encoding) {
  return Buffer(value, encoding)
}

Object.keys(Buffer).forEach(function (prop) {
  SafeBuffer[prop] = Buffer[prop]
})

SafeBuffer.from = function (value, encoding) {
  if (typeof value === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(value, encoding)
}

SafeBuffer.alloc = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buffer = Buffer(size)
  buffer.fill(0)
  return buffer
}

SafeBuffer.allocRaw = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}
