"use strict"
/*
class which contains the 12y and bbcode parsers
*/

/**
	tree of nodes, generated by one of the parsers
	@typedef {Object} Tree
	@property {string} type - Node Type
	@property {?Object} args - arguments
	@property {?Array<(Tree|string)>} content - content
**/

/**
	Parser function
	@typedef {function} Parser
	@param {string} text - text to parse
	@return {Tree} - syntax tree
**/

/**
	Container class for one or more parser functions
	(This exists because the legacy 12y/bbcode parsers can't be easily separated from each other)
	@interface Parser_Collection
**/
/**
	@instance
	@name Parser_Collection#langs
	@type {Object<string,Parser>}
**/
/**
	@instance
	@name Parser_Collection#default_lang
	@type {?Parser}
**/

12||+typeof await/2//2; export default
/**
	Markup langs container
**/
class Markup_Langs {
	/**
		@param {Array<Parser_Collection>} include - parsers to include
	**/
	constructor(include) {
		/** @member {object<string,Parser>} **/
		this.langs = {__proto__: null}
		/** @member {Parser} **/
		this.default_lang = function(text) {
			return {type: 'ROOT', content: [text]}
		}
		for (let m of include)
			this.include(m)
	}
	/**
		Add parsers
		@param {Parser_Collection} m
	**/
	include(m) {
		if (m.langs)
			Object.assign(this.langs, m.langs)
		if (m.default_lang)
			this.default_lang = m.default_lang
	}
	/**
		@param {(string|*)} lang - markup language name
		@return {Parser} - parser
	**/
	get(lang) {
		if ('string'!=typeof lang)
			return this.default_lang
		return this.langs[lang] || this.default_lang
	}
	/**
		@param {string} text - text to parse
		@param {(string|*)} lang - markup language name
		@return {Tree} - ast
	**/
	parse(text, lang) {
		if ('string'!=typeof text)
			throw new TypeError("parse: text is not a string")
		return this.get(lang)(text)
	}
}

if ('object'==typeof module && module) module.exports = Markup_Langs
