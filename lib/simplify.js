module.exports = options => function ({types: t}) {

  function simplify(path) {
    if (path.isLiteral()) return path;
    if (path.isBinaryExpression()) return simplifyBinaryExpression(path)
    if (path.isConditionalExpression()) return simplifyConditionalExpression(path)
    if (path.isIfStatement()) return simplifyIfStatement(path)
    if (path.isUnaryExpression()) return simplifyUnaryExpression(path)
    if (path.isMemberExpression()) return simplifyMemberExpression(path)
    return path;
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
              if (path.get("consequent").isBlock()) path.replaceWithMultiple(path.get("consequent").node.body)
              else path.replaceWith(path.node.consequent)
          } else { // always false
            if (path.has("alternate")) {
              if (path.get("alternate").isBlock()) path.replaceWithMultiple(path.node.alternate.body)
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
      ExpressionStatement(path) {
        var exp = simplify(path.get("expression"))
        if (!path.parentPath.isBlock()) return
        if (exp.isLiteral() || exp.isIdentifier()) path.remove()
      },
      BinaryExpression(path) {
        simplify(path)
        if (isUseless(path)) path.remove()
      },
      MemberExpression(path) {
        simplify(path)
        if (isUseless(path)) path.remove()
      },
      UnaryExpression(path) {
        simplify(path)
        if (isUseless(path)) path.remove()
      },
      ConditionalExpression(path) {
        simplify(path)
        if (isUseless(path)) path.remove()
      },
      IfStatement(path) {
        simplify(path)
        if (isUseless(path)) path.remove()
      }
    }
  };
}
