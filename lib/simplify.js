module.exports = options => function ({types: t}) {
  const endBodyTypes = [
    "BreakStatement",
    "ContinueStatement",
    "ReturnStatement",
    "ThrowStatement"
  ]

  function simplify(path) {
    if (path.isLiteral()) return path;
    if (path.isBinaryExpression()) return simplifyBinaryExpression(path)
    if (path.isConditionalExpression()) return simplifyConditionalExpression(path)
    if (path.isIfStatement()) return simplifyIfStatement(path)
    if (path.isUnaryExpression()) return simplifyUnaryExpression(path)
    if (path.isMemberExpression()) return simplifyMemberExpression(path)
    if (path.isBlockStatement()) return simplifyBlockStatement(path)
    return path;
  }
  
  function simplifyBlockStatement(path) {
    for (let i=0;i<path.node.body.length-1;i++) {
      if (endBodyTypes.includes(path.node.body[i].type)) {
        path.replaceWith(
          t.blockStatement(
            path.node.body.slice(0,i+1)
          )
        )
        return path
      }
    }
    return path
  }

  function simplifyMemberExpression(path) {
    if (options.production && path.matchesPattern("process.env.NODE_ENV")) {
      path.replaceWith(t.stringLiteral("production"))
    }
    return path
  }

  function simplifyUnaryExpression(path) {
    var arg = simplify(path.get("argument"))
 	  if (!arg.isLiteral()) return path;
    var lit;
    switch(path.node.operator) {
      case "+":
        lit = t.numericLiteral(+arg.node.value)
      break
    }
    if (lit) path.replaceWith(lit)
    return path
  }


  function simplifyConditionalExpression(path) {
    if (simplify(path.get("test")).isLiteral()) {
      if (path.get("test").node.value) {
        path.replaceWith(simplify(path.get("consequent")))
      } else {
        path.replaceWith(simplify(path.get("alternate")))
      }
    }
    return path
  }

  function simplifyIfStatement(path) {
    if (simplify(path.get("test")).isLiteral()) {
          if (path.get("test").node.value) { // always true
              if (path.get("consequent").isBlock()) path.replaceWithMultiple(simplify(path.get("consequent")).node.body)
              else path.replaceWith(path.node.consequent)
          } else { // always false
            if (path.has("alternate")) {
              if (path.get("alternate").isBlock()) path.replaceWithMultiple(simplify(path.get("alternate")).node.body)
              else path.replaceWith(path.node.alternate)
            } else path.remove()
          }
        }
    return path;
  }

  function simplifyBinaryExpression(path) {
    var left = simplify(path.get("left"));
    var right = simplify(path.get("right"));
    if (!left.isLiteral() || !right.isLiteral()) return path;
    var leftVal = left.isRegExpLiteral() ? new RegExp(left.node.pattern, left.node.flags) : left.node.value;
    var rightVal = right.isRegExpLiteral() ? new RegExp(right.node.pattern, right.node.flags) : right.node.value;
    var lit = path;

    switch (path.node.operator) {
      case "+":
        if (left.isTemplateLiteral() || right.isTemplateLiteral()) break;
        if (left.isStringLiteral() || right.isStringLiteral() || left.isRegExpLiteral() || right.isRegExpLiteral()) {
          lit = t.stringLiteral(leftVal + rightVal);
        } else if (left.isNumericLiteral() && right.isNumericLiteral()) {
          lit = t.numericLiteral(leftVal + rightVal);
        }

        break;
        // number stuffs
      case "-":
        lit = t.numericLiteral(leftVal - rightVal);
        break;
      case "*":
        lit = t.numericLiteral(leftVal * rightVal);
        break;
      case "/":
        lit = t.numericLiteral(leftVal / rightVal);
        break;

        // bool stuffs
      case "==":
        lit = t.booleanLiteral(leftVal == rightVal);
        break;
      case "!=":
        lit = t.booleanLiteral(leftVal != rightVal);
        break;
      case "===":
        lit = t.booleanLiteral(leftVal === rightVal);
        break;
      case "!==":
        lit = t.booleanLiteral(leftVal !== rightVal);
        break;
      case ">":
        lit = t.booleanLiteral(leftVal > rightVal);
        break;
      case ">=":
        lit = t.booleanLiteral(leftVal >= rightVal);
        break;
      case "<":
        lit = t.booleanLiteral(leftVal < rightVal);
        break;
      case "<=":
        lit = t.booleanLiteral(leftVal <= rightVal);
        break;
    }
    if (lit !== path) {
      path.replaceWith(lit);
    }

    return path;
  }

  function isUseless(path) {
    return path.parentPath.isBlock() && (path.isLiteral() || path.isIdentifier())
  }

  return {
    visitor: {
      BlockStatement(path) {
        simplify(path)
      },
      ExpressionStatement(path) {
        var exp = simplify(path.get("expression"))
        if (!path.parentPath.isBlock()) return
        if (exp.isLiteral() || exp.isIdentifier()) path.remove()
        if (path.parentPath.isBlock()) simplify(path.parentPath)
      },
      BinaryExpression(path) {
        simplify(path)
        if (isUseless(path)) path.remove()
        if (path.parentPath.isBlock()) simplify(path.parentPath)
      },
      MemberExpression(path) {
        simplify(path)
        if (isUseless(path)) path.remove()
        if (path.parentPath.isBlock()) simplify(path.parentPath)
      },
      UnaryExpression(path) {
        simplify(path)
        if (isUseless(path)) path.remove()
        if (path.parentPath.isBlock()) simplify(path.parentPath)
      },
      ConditionalExpression(path) {
        simplify(path)
        if (isUseless(path)) path.remove()
        if (path.parentPath.isBlock()) simplify(path.parentPath)
      },
      IfStatement(path) {
        simplify(path)
        if (isUseless(path)) path.remove()
        if (path.parentPath.isBlock()) simplify(path.parentPath)
      }
    }
  }
}
