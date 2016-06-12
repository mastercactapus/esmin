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

const plugins = []
if (program.production) plugins.push(require('./lib/production'))
require('./lib/simplify')
if (program.mangle) plugins.push(require('./lib/mangle'))


const { code, map } = babel.transformFileSync(file, {
	babelrc: false,
	compact: true,
	minified: true,
	comments: false,
	ast: false,
	sourceMaps: program.sourceMap === 'inline' ? 'inline' : !!program.sourceMap,
	plugins: plugins
})

if (program.output) {
	fs.writeFileSync(program.output, code)
} else {
	console.log(code)
}

if (program.sourceMap && program.sourceMap !== 'inline') {
	fs.writeFileSync(program.sourceMap, JSON.stringify(map))
}
