/*! 𝦗𖹭
*/

12||+typeof await/2//2; export default
/**
	12y2 markup parser factory
	@implements Parser_Collection
**/
class Markup_12y2 { constructor() {

	// TokenType 🏷 enum
	// BlockType 🏷 enum
	// Text 🏷 string 📝 from input text
	// ArgPattern 🏷 RegExp
	// GroupNum 🏷 number - regex capturing group num
	// RawArgs 🏷 Array - array with .named field
	// Block 🏷 Object - has .type .args .content
	// CurrentBlock 🏷 Object - block + other fields
	
	// all state is stored in these vars (and REGEX.lastIndex)
	let current, brackets
	
	// About __proto__ in object literals:
	// https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-runtime-semantics-propertydefinitionevaluation
	
	// elements which can survive an eol (without a body)
	const IS_BLOCK = {__proto__:null, code:1, divider:1, ROOT:1, heading:1, quote:1, table:1, table_cell:1, image:1, video:1, audio:1, spoiler:1, align:1, list:1, list_item:1, youtube:1}
	
	// RegExp
	// GroupNum -> TokenType
	// GroupNum -> ArgPattern
	const MACROS = {
		'{EOL}': "(?![^\\n])",
		'{BOL}': "^",
		'{ANY}': "[^]",
		'{URL_CHARS}': "[-\\w/%&=#+~@$*'!?,.;:]*",
		'{URL_FINAL}': "[-\\w/%&=#+~@$*']",
	}
	const GROUPS = [], ARGTYPES = []
	let regi = []
	function PAT({raw}, ...groups) {
		regi.push(
			raw.join("()")
				.replace(/\\`/g, "`")
				.replace(/[(](?![?)])/g, "(?:")
				.replace(/[{][A-Z_]+[}]/g, match=>MACROS[match])
		)
		for (let g of groups) {
			GROUPS.push(Object.keys(g)[0])
			ARGTYPES.push(Object.values(g)[0])
		}
	}
	
	// ArgPattern
	const ARGS_NORMAL = // /[...]?{?/
	/(?:\[([^\]\n]*)\])?({\n?)?/y
	
	const ARGS_WORD = // /[...]?{/ or /[...] ?<word>/ or / <word>/
	/(?:\[([^\]\n]*)\]|(?=[ {]))({\n?| ?([^\s`^()+=\[\]{}\\|"';:,.<>/?!*]*))/y // todo: more complex rule for word parsing //TODO: does this set the body flag right? //(what did i mean by this?)
	const ARGS_LINE = // /[...]?{/ or /[...] ?/ or / /
	/(?:\[([^\]\n]*)\]|(?=[ {]))(?:({\n?)| ?)/y // probably dont need this, we can strip space after { in all cases instead.
	const ARGS_HEADING = // /[...]?{/ or /[...] ?/ or / /
	/(?:\[([^\]\n]*)\]|(?=[ {]))(?:({\n?)| ?)/y
	
	const ARGS_BODYLESS = // /[...]?/
	/(?:\[([^\]\n]*)\])?/y
	const ARGS_TABLE = // /[...]? */
	/(?:\[([^\]\n]*)\])? */y
	
	const ARGS_CODE = // ... ```
	/(?: *([-\w.+#$ ]+?) *(?![^\n]))?\n?([^]*?)(?:```|$)/y
	
	PAT`[\n]?[}]${{ BLOCK_END: 0}}`
	PAT`[\n]${{ NEWLINE: 0}}`
	PAT`{BOL}[#]{1,4}${{ HEADING: ARGS_HEADING}}`
	PAT`{BOL}[-]{3,}{EOL}${{ DIVIDER: 0}}`
	PAT`([*][*]|[_][_]|[~][~]|[/])${{ STYLE: true}}`
	PAT`[\\][a-z]+(?![a-zA-Z0-9])${{ TAG: true}}`
	PAT`[\\][{][\n]?${{ NULL_ENV: 0}}`
	PAT`[\\]{ANY}${{ ESCAPED: 0}}`
	PAT`{BOL}[>]${{ QUOTE: ARGS_HEADING}}`
	PAT`{BOL}[\`]{3}(?=[^\n\`]*?{EOL})${{ CODE_BLOCK: ARGS_CODE}}`
	PAT`[\`][^\`\n]*([\`]{2}[^\`\n]*)*[\`]?${{ INLINE_CODE: 0}}`
	PAT`([!]${{ EMBED: ARGS_BODYLESS}})?\b(https?://|sbs:){URL_CHARS}({URL_FINAL}|[(]{URL_CHARS}[)]({URL_CHARS}{URL_FINAL})?)${{ LINK: ARGS_NORMAL}}`
	PAT`{BOL} *[|]${{ TABLE_START: ARGS_TABLE}}`
	PAT` *[|]${{ TABLE_CELL: ARGS_TABLE}}`
	PAT`{BOL} *[-]${{ LIST_ITEM: ARGS_HEADING}}`
	
	const REGEX = new RegExp(regi.join("|"), 'g')
	regi = null
	
	//todo: org tables separators?
	
	// TokenType -> ArgRegex
	const TAGS = {
		__proto__:null,
		'\\sub': ARGS_WORD,
		'\\sup': ARGS_WORD,
		'\\b': ARGS_WORD,
		'\\i': ARGS_WORD,
		'\\u': ARGS_WORD,
		'\\s': ARGS_WORD,
		'\\quote': ARGS_LINE,
		'\\align': ARGS_LINE,
		'\\spoiler': ARGS_LINE,
		'\\ruby': ARGS_WORD,
		'\\key': ARGS_WORD,
	}
	
	// process a token
	// 📥 _token_type 🏷 TokenType 📝
	// 📥 token 🏷 Text 📝 token text, including arguments
	// 📥 rarys 🏷 RawArgs 📝 raw arguments
	// 📥 body 🏷 Text 📝 argmatch[2] (varies)
	// 📥 base_token 🏷 Text 📝 token text, without arguments
	function PROCESS(_token_type, token, rargs, body, args_token) {
		switch (_token_type) { default: {
			throw new TypeError("unknown token type: "+_token_type)
			// error
		} break; case 'NEWLINE': {
			NEWLINE(true)
		} break; case 'HEADING': {
			let level = token.length
			let args = {level}
			// todo: anchor name (and, can this be chosen automatically based on contents?)
			OPEN('heading', args, body)
		} break; case 'DIVIDER': {
			BLOCK('divider')
		} break; case 'BLOCK_END': {
			if (brackets>0) {
				while (!current.body)
					CANCEL()
				if ('invalid'===current.type) {
					if ("\n}"==token)
						NEWLINE(false) // false since we already closed everything
					TEXT("}")
				}
				CLOSE()
			} else {
				// hack:
				if ("\n}"==token)
					NEWLINE(true)
				TEXT("}")
			}
		} break; case 'NULL_ENV': {
			OPEN('null_env', null, true)
			current.prev = current.parent.prev
		} break; case 'ESCAPED': {
			if ("\\\n"===token)
				NEWLINE(false)
			else if ("\\."===token) { // \. is a no-op
				// todo: close lists too
				//current.content.push("")
				current.prev = 'block'
			} else
				TEXT(token.substr(1))
		} break; case 'QUOTE': {
			OPEN('quote', {cite: rargs[0]}, body)
		} break; case 'CODE_BLOCK': {
			let lang = rargs
			BLOCK('code', {text: body, lang})
		} break; case 'INLINE_CODE': {
			BLOCK('icode', {text: token.replace(/`(`)?/g, "$1")})
		} break; case 'EMBED': {
			let url = token.substr(1) // ehh better
			let [type, args] = process_embed(url, rargs)
			BLOCK(type, args)
		} break; case 'LINK': {
			let url = token
			let args = {url}
			if (body) {
				OPEN('link', args, body)
			} else {
				args.text = rargs[0]
				BLOCK('simple_link', args)
			}
		} break; case 'TABLE_START': {
			OPEN('table_row', token+args_token) // special OPEN call
			OPEN('table_cell', rargs, body)
		} break; case 'TABLE_CELL': {
			while (current.type!=='table_cell')
				CANCEL()
			CLOSE() // cell
			// we don't know whether these are row args or cell args,
			// so just pass the raw args directly, and parse them later.
			OPEN('table_cell', rargs, body)
		} break; case 'INVALID_TAG': {
			if (body)
				OPEN('invalid', {text: token+args_token, reason: "invalid tag"}, body)
			else
				BLOCK('invalid', {text: token+args_token, reason: "invalid tag"})
		} break; case 'LIST_ITEM': {
			let indent = token.indexOf("-")
			OPEN('list_item', {indent}, body)

		} break; case '\\sub': {
			OPEN('subscript', null, body)
		} break; case '\\sup': {
			OPEN('superscript', null, body)
		} break; case '\\b': {
			OPEN('bold', null, body)
		} break; case '\\i': {
			OPEN('italic', null, body)
		} break; case '\\u': {
			OPEN('underline', null, body)
		} break; case '\\s': {
			OPEN('strikethrough', null, body)
		} break; case '\\quote': {
			OPEN('quote', {cite: rargs[0]}, body)
		} break; case '\\align': {
			let a = rargs[0]
			if (!['left', 'right', 'center'].includes(a))
				a = 'center'
			OPEN('align', {align: a}, body)
		} break; case '\\spoiler': case '\\h': {
			let label = arg0(rargs, "spoiler")
			OPEN('spoiler', {label}, body)
		} break; case '\\ruby': {
			let text = arg0(rargs, "true")
			OPEN('ruby', {text}, body)
		} break; case '\\key': {
			OPEN('key', null, body)
		} }
	}
	
	function arg0(rargs, def) {
		if (rargs.length<1)
			return def
		return rargs[0]
	}
	

	
	const null_args = []
	null_args.named = Object.freeze({})
	Object.freeze(null_args)
	// todo: do we even need named args?
	function parse_args(arglist) {
		// note: checks undefined AND "" (\tag AND \tag[])
		if (!arglist)
			return null_args
		let list = [], named = {}
		list.named = named
		for (let arg of arglist.split(";")) {
			let [, name, value] = /^(?:([^=]*)=)?(.*)$/.exec(arg)
			// value OR =value
			// (this is to allow values to contain =. ex: [=1=2] is "1=2")
			if (!name)
				list.push(value)
			else // name=value
				named[name] = value
		}
		return list
	}
	// process an embed url: !https://example.com/image.png[alt=balls]
	// returns [type: String, args: Object]
	function process_embed(url, rargs) {
		let type
		let args = {url, alt: rargs.named.alt}
		for (let arg of rargs)
			if ('video'===arg || 'audio'===arg || 'image'===arg)
				type = arg
		// todo: improve this
		if (!type) {
			//let u = new URL(url, "x-relative:/")
			//let ext = /[.]([a-z0-9A-Z]{3,4})(?!\w)[^.]*$/.exec(url)
			if (/[.](mp3|ogg|wav|m4a)\b/i.test(url))
				type = 'audio'
			else if (/[.](mp4|mkv|mov)\b/i.test(url))
				type = 'video'
			else if (/^https?:[/][/](?:www[.])?(?:youtube.com[/]watch[?]v=|youtu[.]be[/]|youtube.com[/]shorts[/])[\w-]{11}/.test(url)) {
				// todo: accept [start-end] args maybe?
				type = 'youtube'
			}
		}
		if (!type)
			type = 'image'
		// process args
		if ('image'===type || 'video'===type) {
			for (let arg of rargs) {
				let m
				if (m = /^(\d+)x(\d+)$/.exec(arg)) {
					args.width = +m[1]
					args.height = +m[2]
				}
			}
		}
		return [type, args]
	}
	
	// start a new block
	function OPEN(type, args, body) {
		current = Object.seal({
			type, args, content: [],
			body, parent: current,
			prev: 'all_newline',
		})
		if (body)
			brackets++
	}
	// move up
	function pop() {
		if (current.body)
			brackets--
		let o = current
		current = current.parent
		return o
	}
	
	function CANCEL() {
		if ('style'===current.type) {
			let o = pop()
			current.content.push(o.args, ...o.content)
			current.prev = o.prev
			return
		}
		if ('table_cell'===current.type) {
			if (current.content.length) {
				CLOSE() // table_cell
				current.args = {}
			} else {
				// cancelling an empty table cell means:
				// it's the end of the row, so discard the cell
				let o = pop()
				// if the ROW is empty (i.e. we just have a single | )
				if (!current.content.length) {
					let o = pop() // discard the row
					TEXT(o.args)
					return
					// todo: maybe also cancel rows with 1 unclosed cell?
					// like `| abc` -> text
				}
				// transfer args to the row, and parse as table row args:
				let ret = current.args = {}
				for (let arg of o.args) {
					if ("*"===arg || "#"===arg) {
						ret.header = true
					}
				}
			}
			// fallthrough to close the table_row
		}
		CLOSE()
	}
	
	function get_last(block) {
		return block.content[block.content.length-1]
	}
	
	function CLOSE() {
		let o = pop()
		
		if ('null_env'===o.type) {
			current.content.push(...o.content)
			current.prev = o.prev
			return
		}
		
		if ('newline'===o.prev)
			o.content.push("\n")
		let node = {type: o.type, args: o.args, content: o.content}
		let dest = current
		
		// merge list_item with preceeding list
		if ('list_item'===o.type) {
			node.args = null
			let indent = o.args.indent
			while (1) {
				let curr = dest
				dest = get_last(curr)
				if (!dest || dest.type!=='list' || dest.args.indent>indent) {
					// create a new level in the list
					dest = {type:'list', args:{indent}, content:[]}
					// safe because there's no newline
					curr.content.push(dest)
					break
				}
				if (dest.args.indent == indent)
					break
			}
		}
		// merge table_row with preceeding table
		else if ('table_row'===o.type) {
			dest = get_last(current)
			if (!dest || 'table'!==dest.type) {
				dest = {type:'table', args:null, content:[]}
				current.content.push(dest)
			}
		}
		// table cell
		else if ('table_cell'===o.type) {
			let ret = node.args = {}
			for (let arg of o.args) {
				let m
				if ("*"===arg || "#"===arg)
					ret.header = true
				else if (['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'gray'].includes(arg))
					ret.color = arg
				else if (m = /^(\d*)x(\d*)$/.exec(arg)) {
					let [, w, h] = m
					if (+w > 1) ret.colspan = +w
					if (+h > 1) ret.rowspan = +h
				}
			}
		} else if ('style'===o.type) {
			node.type = {
				__proto__:null,
				'**': 'bold', '__': 'underline',
				'~~': 'strikethrough', '/': 'italic',
			}[o.args]
			node.args = null
		}
		
		dest.content.push(node)
		current.prev = o.type in IS_BLOCK ? 'block' : o.prev
	}
	// push text
	function TEXT(text) {
		if (text!=="") {
			current.content.push(text) // todo: merge with surrounding textnodes?
			current.prev = 'text'
		}
	}
	// push empty tag
	function BLOCK(type, args) {
		current.content.push({type, args})
		current.prev = type in IS_BLOCK ? 'block' : 'text'
	}
	
	function NEWLINE(real) {
		if (real)
			while (!current.body && 'ROOT'!=current.type)
				CANCEL()
		if ('block'!==current.prev)
			current.content.push("\n")
		if ('all_newline'!==current.prev)
			current.prev = 'newline'
	}
	
	function in_table() {
		for (let c=current; ; c=c.parent) {
			if ('table_cell'===c.type)
				return true
			if ('style'!==c.type)
				return false
		}
	}
	// todo: this should check for body
	function find_style(token) {
		for (let c=current; 'style'===c.type; c=c.parent)
			if (c.args===token)
				return c
	}

	function parse(text) {
		let tree = {type: 'ROOT', content: [], prev: 'all_newline'}
		current = tree
		brackets = 0
		
		// MAIN LOOP //
		let prev = -1
		let last = REGEX.lastIndex = 0
		let match
		function nevermind() {
			REGEX.lastIndex = match.index+1
		}
		function accept() {
			TEXT(text.substring(last, match.index))
			last = REGEX.lastIndex
		}
		function start_line() {
			text = text.substring(last)
			last = REGEX.lastIndex = 0
			prev = -1
		}
		main: while (match = REGEX.exec(text)) {
			// check for infinite loops
			if (match.index===prev)
				throw ["INFINITE LOOP", match]
			prev = match.index
			// 2: figure out which token type was matched
			let token_text = match[0]
			let group_num = match.indexOf("", 1)-1
			
			// 3: get type + argument pattern
			let type = GROUPS[group_num]
			let argregex
			// 4: special cases:
			if ('TAG'===type) {
				if (token_text in TAGS) {
					type = token_text
					argregex = TAGS[type]
				} else {
					type = 'INVALID_TAG'
					argregex = ARGS_NORMAL
				}
			} else if ('STYLE'===type) {
				let before = text.charAt(match.index-1)
				let after = text.charAt(REGEX.lastIndex)
				// try close?
				if ('style'===current.type && !` \t\n,'"`.includes(before) && `- \t\n.,:;!?'")}`.includes(after)) {
					let c = find_style(token_text)
					if (c) {
						accept()
						while (current != c)
							CANCEL()
						CLOSE()
						continue main
					}
				}
				// open?
				if (` \t\n({'"`.includes(before) && !` \t\n,'"`.includes(after)) {
					accept()
					OPEN('style', token_text)
					continue main
				}
				nevermind()
				continue main
			} else if ('TABLE_CELL'===type && !in_table()) {
				nevermind()
				continue main
			} else {
				argregex = ARGTYPES[group_num]
			}
			// 5: parse args and {
			if (!argregex) {
				accept()
				let body = 'NULL_ENV'===type //h
				PROCESS(type, token_text, null, body, token_text)
				if (body || 'NEWLINE'===type)
					start_line()
			} else {
				// try to match arguments
				argregex.lastIndex = REGEX.lastIndex
				let argmatch = argregex.exec(text)
				if (null===argmatch) {
					nevermind()
					continue main
				}
				REGEX.lastIndex = argregex.lastIndex
				accept()
				
				let args = argmatch[1]
				let body = argmatch[2] // flag: args with {, or word args
				let word = argmatch[3] // contents: word args & code block
				if (ARGS_CODE!==argregex)
					args = parse_args(args)
				
				PROCESS(type, token_text, args, body, argmatch[0])
				// word tags
				if (undefined!==word) {
					// escaping in word args? idk. todo
					TEXT(word.replace(/\\([^])/g, "$1"))
					CLOSE()
				}
				// tags with { body
				else if (body && ARGS_CODE!==argregex) {
					start_line()
				}
			}
		} // end of main loop
		
		TEXT(text.substring(last)) // text after last token
		
		while ('ROOT'!==current.type)
			CANCEL()
		if ('newline'===current.prev) //todo: this is repeated
			current.content.push("\n")
		
		return tree // technically we could return `current` here and get rid of `tree` entirely
	}
	
	/**
		Parser function
		(closure method)
		@type {Parser}
		@kind function
	**/
	this.parse = parse
	/**
		@type {Object<string,Parser>}
		@property {Parser} 12y2 - same as .parse
	**/
	this.langs = {'12y2': parse}
	
	// what if you want to write like, "{...}". well that's fine
	// BUT if you are inside a tag, the } will close it.
	// maybe closing tags should need some kind of special syntax?
	// \tag{ ... \}  >{...\} idk..
	// or match paired {}s :
	// \tag{ ...  {heck} ... } <- closes here
	
	// todo: after parsing a block element: eat the next newline directly
} }

if ('object'==typeof module && module) module.exports = Markup_12y2
