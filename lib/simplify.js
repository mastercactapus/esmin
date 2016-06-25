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
    if (path.isFunctionExpression()) return simplifyFunctionExpression(path)
    return path;
  }
  
  function simplifyFunctionExpression(path) {
    if (path.parentPath.isMemberExpression()) return path
    if (path.has("id")) return path
    if (path.node.generator) return path
    var hasThis = false
    path.traverse({
      enter (subPath) {
        const node = subPath.node
        if (node.type === 'ThisExpression') {
          hasThis = true
          subPath.stop()
        }
        else if (subPath.isFunction() && node.type !== 'ArrowFunctionExpression') {
          subPath.skip()
        }
      }
    })
    if (hasThis) return;
    path.replaceWith(
      t.arrowFunctionExpression(
        path.node.params,
        path.node.body,
        path.node.async
      )
    )
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

  function getValueObject(path) {
    if (path.isRegExpLiteral()) return {value: new RegExp(path.node.pattern, path.node.flags)}
    if (path.isLiteral()) return {value: path.node.value}
    if (path.isIdentifier() && path.node.name === "undefined") return {value: undefined}
    if (path.isUnaryExpression() && path.node.operator === "-") return {value: -path.node.value}
  }

  function simplifyMemberExpression(path) {
    if (options.production && path.matchesPattern("process.env.NODE_ENV")) {
      path.replaceWith(t.stringLiteral("production"))
    }
    return path
  }

  function simplifyUnaryExpression(path) {
    var arg = getValueObject(simplify(path.get("argument")))
    
 	  if (!arg) return path;
    var lit;
    switch(path.node.operator) {
      case "+":
        lit = t.numericLiteral(+arg.value)
      break
      case "!":
      	lit = t.booleanLiteral(!arg.value)
      break
    }
    if (lit) path.replaceWith(lit)
    return path
  }


  function simplifyConditionalExpression(path) {
    var test = getValueObject(simplify(path.get("test")))
    if (test) {
      if (test.value) {
        path.replaceWith(simplify(path.get("consequent")))
      } else {
        path.replaceWith(simplify(path.get("alternate")))
      }
    }
    return path
  }

  function simplifyIfStatement(path) {
    var test = getValueObject(simplify(path.get("test")))
    if (test) {
          if (test.value) { // always true
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
    var leftValObj = getValueObject(left)
    var rightValObj = getValueObject(right)
    if (!leftValObj || !rightValObj) return path;
    var leftVal = leftValObj.value
    var rightVal = rightValObj.value
    var lit = path;

    switch (path.node.operator) {
      case "+":
        if (left.isTemplateLiteral() || right.isTemplateLiteral()) break;
        let newVal = leftVal + rightVal

        if (typeof newVal === "string") {
          lit = t.stringLiteral(newVal)
        } else if (typeof newVal === "number") {
          lit = t.numericLiteral(newVal)
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
      FunctionExpression(path) {
        simplify(path)
      },
      IfStatement(path) {
        simplify(path)
        if (isUseless(path)) path.remove()
        if (path.parentPath.isBlock()) simplify(path.parentPath)
      }
    }
  }
}
