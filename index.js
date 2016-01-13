module.exports = SafeBuffer
module.exports.Buffer = SafeBuffer

function SafeBuffer (arg1, arg2) {
  var buffer = new Buffer(arg1, arg2)

  if (typeof arg1 === 'number') {
    for (var i = 0; i < arg1; i++) {
      buffer[i] = 0
    }
  }

  return buffer
}

Buffer.alloc = function (len) {
  if (typeof len !== 'number') {
    throw new TypeError('Argument must be a number')
  }

  return new Buffer(len)
}
