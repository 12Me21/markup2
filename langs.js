/**
	ast
	@typedef {Object} Tree
	@property {string} type - Node Type
	@property {?Object} args - arguments
	@property {?Array<(Tree|string)>} contents - contents
*/

/**
	parser function
	@typedef {function} Parser_Function
	@param {string} text - text to parse
	@return {Tree} - syntax tree
*/

/**
	Markup_Langs may inherit from these classes
	@interface Langs_Mixin
*/
/**
	Markup_Langs may inherit from these classes
	@typedef {Object<string,Parser_Function>} Langs_Mixin_Langs
*/

/**
	markup langs container
	@mixes {Langs_Mixin}
*/
class Markup_Langs {
	/**
		@param {Array<Langs_Mixin>} inherit - parsers to include
	*/
	constructor(inherit) {
		this.langs = Object.create(null)
		this.default_lang = function(text) {
			return {type:'ROOT', content:[text]}
		}
		for (let cls of inherit)
			cls.call(this)
	}
	/**
		@param {(string|*)} lang - markup language name
		@return {Parser_Function} - parser
	*/
	get(lang) {
		if ('string'!=typeof lang)
			return this.default_lang
		return this.langs[lang] || this.default_lang
	}
	/**
		@param {string} text - text to parse
		@param {(string|*)} lang - markup language name
		@return {Tree} - ast
	*/
	parse(text, lang) {
		if ('string'!=typeof text)
			throw new TypeError("parse: text is not a string")
		return this.get(lang)(text)
	}
}
