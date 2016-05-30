module.exports = SafeBuffer
module.exports.Buffer = SafeBuffer

var SlowBuffer = require('buffer').SlowBuffer

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

// Copy static functions
Object.keys(Buffer).forEach(function (prop) {
  SafeBuffer[prop] = Buffer[prop]
})

if (!SafeBuffer.from) {
  SafeBuffer.from = function (arg, encodingOrOffset, length) {
    if (typeof value === 'number') {
      throw new TypeError('Argument must not be a number')
    }
    return Buffer(arg, encodingOrOffset, length)
  }
}

if (!SafeBuffer.alloc) {
  SafeBuffer.alloc = function (size, fill, encoding) {
    if (typeof size !== 'number') {
      throw new TypeError('Argument must be a number')
    }
    var buf = Buffer(size)
    if (fill !== undefined) {
      if (typeof encoding === 'string') {
        buf.fill(fill, encoding)
      } else {
        buf.fill(fill)
      }
    } else {
      buf.fill(0)
    }
    return buf
  }
}

if (!SafeBuffer.allocUnsafe) {
  SafeBuffer.allocUnsafe = function (size) {
    if (typeof size !== 'number') {
      throw new TypeError('Argument must be a number')
    }
    return Buffer(size)
  }
}

if (!SafeBuffer.allocUnsafeSlow) {
  SafeBuffer.allocUnsafeSlow = function (size) {
    if (typeof size !== 'number') {
      throw new TypeError('Argument must be a number')
    }
    return SlowBuffer(size)
  }
}
