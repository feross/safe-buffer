module.exports = SafeBuffer
module.exports.Buffer = SafeBuffer

function SafeBuffer (arg1, arg2) {
  var buffer = new Buffer(arg1, arg2)
  if (typeof arg1 === 'number') {
    buffer.fill(0)
  }
  return buffer
}

// Copy static methods and properties from Buffer
Object.keys(Buffer).forEach(function (prop) {
  SafeBuffer[prop] = Buffer[prop]
})

SafeBuffer.alloc = function (len) {
  if (typeof len !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return new Buffer(len)
}

