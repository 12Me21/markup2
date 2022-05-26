module.exports = {
	ignorePatterns: [
		"*",
		"!parse.js", "!langs.js", "!legacy.js", "!render.js", "!helpers.js", "!runtime.js", "!static-parse.js",
	],
	env: {
		'shared-node-browser': true,
	},
	globals: {
		module: 'readonly',
	},
	extends: "eslint:recommended",
	parserOptions: {
		ecmaVersion: 6,
		sourceType: 'script',
	},
	overrides: [
		{
			files: ["render.js", "helpers.js", "runtime.js"],
			env: {'browser': true},
		},
		{
			files: ["helpers.js"],
			globals: {
				Markup_Langs: 'readonly',
				Markup_12y2: 'readonly',
				Markup_Legacy: 'readonly',
				Markup_Render_Dom: 'readonly',
			},
		}
	],
	rules: {
		'semi': ['warn', 'never'],
		'semi-style': ['warn', 'first'],
		'no-irregular-whitespace': ['off'],
		//'yoda': ['warn', 'always', {onlyEquality: true}], // exception: obj==null
		'indent': ['error', 'tab'],
		'no-mixed-spaces-and-tabs': ['error', 'smart-tabs'],
		'linebreak-style': ['error'],
		
		'no-unreachable': ['off'],
		'no-cond-assign': ['off'],
		'no-unused-vars': ['error', {args: 'none'}],
		'no-empty': ['off'],
		'no-constant-condition': ['error', {checkLoops: false}],
		'no-unsafe-finally': ['off'],
		
		'no-undef': ['error', {typeof: false}],
		
		'no-var': ['error'],
		
		'array-bracket-newline': ['warn', 'consistent'],
		'array-bracket-spacing': ['warn', 'never'],
		//'arrow-spacing': ['warn': {before: false, after: false}], // exception: (args)=>{...} and (args)=> value + 123
		'block-spacing': ['warn', 'always'],
		//'brace-style': ['warn', '1tbs', {allowSingleLine: true}], // exception: breaks `class { constuctor() {`
		'comma-dangle': ['warn', {
			arrays: 'always-multiline',
			objects: 'always-multiline',
			functions: 'never',
		}],
		'comma-spacing': ['warn'],
		'comma-style': ['warn'],
		'computed-property-spacing': ['warn'],
		'dot-location': ['error', 'property'],
		'func-call-spacing': ['error'],
		'key-spacing': ['warn'],
		'keyword-spacing': ['warn'],
		'max-len': ['error', {code: 400}],
		'new-parens': ['warn'],
		'no-extra-parens': ['warn'],
		//'no-multi-spaces': ['warn'],
		'no-trailing-spaces': ['warn', {skipBlankLines: true}],
		'no-whitespace-before-property': ['error'],
		'object-curly-newline': ['warn'],
		//'object-curly-spacing': ['warn'], // exception: pattern definitions
		'operator-linebreak': ['error'],
		
	},
}
