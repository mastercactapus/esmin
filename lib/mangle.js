
const chars = "abcdefghijklmnopqrstuvwxyzABCDEF"
const replaced = Symbol("replaced")

function getID(num) {
  var name = "$"
  for (var i=5;i>=0;i--) {
    var div = (1<<(i*5))
    if (num >= div) {
      name += chars[((num/div)|0)-1]
      num = num % div
    }
  }
  return name
}

module.exports = function ({types: t}) {
  const lookupTable = {}
  var num = 0

  return {
    visitor: {
      Identifier(path) {
        if (path.node[replaced]) return

        var id = t.identifier(lookupTable[path.node.name] || (lookupTable[path.node.name]=getID(num++)))
        Object.defineProperty(id, replaced, {value: true})
        path.replaceWith(id)
      }
    }
  }
}
