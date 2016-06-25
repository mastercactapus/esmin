#!/bin/env node

const program = require('commander')
const fs = require('fs')
const babel = require('babel-core')

program
	.version(require('./package').version)
	.option('-o, --output <file>', 'Output to file instead of stdout')
	.option('--input-map <file>', 'Use an existing source map with the input')
	.option('-s, --source-map <file|inline>', 'Output a source map with the operation. Can be set to "inline"')
	// .option('-m, --mangle', 'Mangle all identifiers')
	.option('-p, --production', 'Replace all `process.env.NODE_ENV` instances with `"production"`')
	.parse(process.argv)

if (program.args.length!==1) {
	console.error('expected exactly 1 argument, but got', program.args.length)
	process.exit(1)
}

const file = program.args[0]

const plugins = [require('./lib/simplify')(program)]
// if (program.mangle) plugins.push(require('./lib/mangle'))


const { code, map, ast } = babel.transformFileSync(file, {
	babelrc: false,
	compact: true,
	minified: true,
	comments: false,
	ast: true,
	sourceMaps: program.sourceMap === 'inline' ? 'inline' : !!program.sourceMap,
	plugins: plugins
})

var comments = ast.comments.filter(c=>c.value.includes("@license")||c.value.includes("@preserve"));
const data = comments.map(c=>"/" + "*" + c.value + "*/\n").join("") + code;

if (program.output) {
	fs.writeFileSync(program.output, data)
} else {
	console.log(data)
}

if (program.sourceMap && program.sourceMap !== 'inline') {
	fs.writeFileSync(program.sourceMap, JSON.stringify(map))
}
