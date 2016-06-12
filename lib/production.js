module.exports = function ({types: t}) {
  return {
    visitor: {
      MemberExpression(path) {
        if (path.matchesPattern("process.env.NODE_ENV")) path.replaceWith(t.stringLiteral("production"))
      }
    }
  }
}
