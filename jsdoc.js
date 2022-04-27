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
	markup parser
	@interface Parser
*/
/**
	@member {Parser_Function} Parser#parse
*/



/**
	@typedef {function} Scheme_Handler
	@param {URL} - url
	@return {string} - new href
*/

/**
	@typedef Creator
	@type {function}
	@param {Object} - arguments
	@return {*} - thing
*/

/**
	markup renderers
	@interface Renderer
*/
/**
	url scheme handler map
	@member {Object<string,Scheme_Handler>} Renderer#url_scheme
*/
/**
	@member {function} Renderer#render
*/
/**
	node create function map
	@member {Object<string,Creator>} Renderer#create
*/
