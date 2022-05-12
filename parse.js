// 📤📥doc
// todo: after parsing a block element: eat the next newline directly

// TokenType 🏷 enum
// BlockType 🏷 enum
// Text 🏷 string 📝 from input text
// ArgPattern 🏷 RegExp
// GroupNum 🏷 number - regex capturing group num
// RawArgs 🏷 Array - array with .named field
// Block 🏷 Object - has .type .args .contents
// CurrentBlock 🏷 Object - block + other fields

class Markup_12y2 { constructor() {
	// idea: maybe instead of this separate parse step, we should just do something like
	// go back to using ex: /^><args>?[{ ]/
	// have either
	// - custom post-processing regex for each token (ex /[\\](\w+)(<args>)?({)?/ )
	// - include these extra groups in the main regex, remove the () group, and find a replacement for the () indexOf("") system
	

	
	// all state is stored in these vars (and REGEX.lastIndex)
	let current, brackets
	
	const MAP = x=>Object.freeze(Object.create(null, Object.getOwnPropertyDescriptors(x)))
	
	// BlockType -> (set)
	const CAN_CANCEL = MAP({style:1, table_cell:1})
	// elements which can survive an eol (without a body)
	const SURVIVE_EOL = MAP({ROOT:1, table_cell:1})
	const IS_BLOCK = MAP({code:1, divider:1, ROOT:1, heading:1, quote:1, table:1, table_cell:1, image:1, video:1, audio:1, spoiler:1, align:1, list:1, list_item:1, error:1, youtube:1})
	
	// ArgPattern
	const ARGS_NORMAL   = /(?:\[([^\]\n]*)\])?({)?/y      // [...]?{?
	const ARGS_WORD     = /(?:\[([^\]\n]*)\])?({| (\w*) ?)/y // [...]?{ or [...]? <word> // todo: more complex rule for word parsing //TODO: does this set the body flag right?
	const ARGS_LINE     = /(?:\[([^\]\n]*)\])?(?:({)| ?)/y      // [...]?{? probably dont need this, we can strip space after { in all cases instead.
	const ARGS_HEADING  = /(?:\[([^\]\n]*)\])?(?:({)| )/y // [...]?( |{)
	const ARGS_BODYLESS = /(?:\[([^\]\n]*)\])?/y          // [...]?
	const ARGS_TABLE    = /(?:\[([^\]\n]*)\])? */y        // [...]? *
	
	const ARGS_ICODE    = /(){0}([^\n`]+)`?/y
	ARGS_ICODE._raw = true
	const ARGS_CODE     = /(?: *([-\w.+#$ ]+?)? *(?:\n|$))?([^]*?)(?:```|$)/y
	ARGS_CODE._raw = true
	
	const GROUPS = [] // GroupNum -> TokenType
	const ARGTYPES = [] // GroupNum -> ArgPattern
	const SPECIAL = [] // ??
	
	let regi = []
	function T({raw}, ...groups) {
		let part = raw.join("()").replace("\\`", "`")
		// replace "(" with "(?:" - except for "(?" and "()"
			.replace(/[(](?![?)])/g, "(?:")
		// replace {TAG}s
			.replace(/[{]([A-Z_]+)[}]/g, (m, tag)=>({
				EOL: "(?![^\\n])",
				BOL: "^",
				URL_TEXT: "[-\\w/%&=#+~@$*')(!?,.;:]*[-\\w/%&=#+~@$*')(]"
			}[tag]))
		regi.push(part)
		for (let g of groups) {
			let [key, arg] = Object.entries(g)[0]
			let special = 0
			if (g.raw)
				special |= 1
			GROUPS.push(key)
			ARGTYPES.push(arg)
			SPECIAL.push(special)
		}
	}
	
	T`\n${{ NEWLINE :0}}`
	T`{BOL}#{1,4}${{ HEADING :ARGS_HEADING}}`
	T`{BOL}---+{EOL}${{ DIVIDER :0}}`
	T`([*][*]|__|~~|[/])(?=\w${{ STYLE_START :0}}|${{ STYLE_END :0}})`
	T`[\\]\w+${{ TAG :0}}`
	T`\}${{ BLOCK_END :0}}`
	T`[\\]\{${{ NULL_ENV :0}}`
	T`[\\][^]${{ ESCAPED :0}}`
	T`{BOL}>${{ QUOTE :ARGS_HEADING}}`
	T`{BOL}\`\`\`${{ CODE_BLOCK :ARGS_CODE}}`
	T`\`${{ INLINE_CODE :ARGS_ICODE}}`
	T`(!${{ EMBED :ARGS_BODYLESS}})?(https?:[/][/]|sbs:){URL_TEXT}${{ LINK :ARGS_NORMAL}}`
	T` *[|] *\n[|]${{ TABLE_ROW :ARGS_TABLE}}`
	T` *[|] *{EOL}${{ TABLE_END :0}}`
	T`{BOL} *[|]${{ TABLE_START :ARGS_TABLE}}`
	T` *[|]${{ TABLE_CELL :ARGS_TABLE}}`
	
	Object.freeze(GROUPS)
	Object.freeze(ARGTYPES)
	Object.freeze(SPECIAL)
	const REGEX = new RegExp(regi.join("|"), 'g')
	
	// TokenType -> ArgRegex
	const TAGS = MAP({
		'\\sub': ARGS_WORD, '\\sup': ARGS_WORD,
		'\\b': ARGS_WORD, '\\i': ARGS_WORD,
		'\\u': ARGS_WORD, '\\s': ARGS_WORD,
		'\\quote': ARGS_LINE,
		'\\align': ARGS_LINE,
		'\\spoiler': ARGS_LINE,
		'\\ruby': ARGS_WORD,
		'\\key': ARGS_WORD,
	})
	
	// process a token
	// 📥 _token_type 🏷 TokenType 📝
	// 📥 token 🏷 Text 📝 token text, including arguments
	// 📥 rarys 🏷 RawArgs 📝 raw arguments
	// 📥 body 🏷 Text 📝 argmatch[2] (varies)
	// 📥 base_token 🏷 Text 📝 token text, without arguments 
	function PROCESS(_token_type, token, rargs, body, base_token) {
		//console.log('process', arguments)
		switch(_token_type) { default: {
			throw new TypeError("unknown token type: "+_token_type)
			// error
		} break; case 'NEWLINE': {
			while (!current.body && !SURVIVE_EOL[current.type])
				CLOSE(true)
			NEWLINE()
		} break; case 'HEADING': {
			let level = base_token.length
			let args = {level}
			// todo: anchor name (and, can this be chosen automatically based on contents?)
			OPEN('heading', token, args, body)
		} break; case 'DIVIDER': {
			BLOCK('divider')
		} break; case 'STYLE_START': {
			OPEN('style', token)
		} break; case 'STYLE_END': {
			while ('style'===current.type) { 
				if (token===current.token) { // found opening
					current.type = {
						'**': 'bold', '__': 'underline',
						'~~': 'strikethrough', '/': 'italic',
					}[current.token]
					CLOSE()
					return
				}
				CLOSE(true) // different style (kill)
			}
			TEXT(token)
		} break; case 'BLOCK_END': {
			if (brackets<=0) {
				TEXT(token)
				return
			}
			// only runs if at least 1 element has a body, so this won't fail:
			while (!current.body)
				CLOSE(true)
			if ('invalid'===current.type)
				TEXT("}")
			CLOSE()
		} break; case 'NULL_ENV': {
			OPEN('null_env', token, null, true)
		} break; case 'ESCAPED': {
			if ("\\\n"===token)
				NEWLINE()
			else
				TEXT(token.substr(1))
		} break; case 'QUOTE': {
			OPEN('quote', token, {cite: rargs[0]}, body)
		} break; case 'CODE_BLOCK': {
			let lang = rargs
			// idea: strip leading indent from code?
			BLOCK('code', {text:body, lang})
		} break; case 'INLINE_CODE': {
			BLOCK('icode', {text:body})
		} break; case 'EMBED': {
			let url = base_token.substr(1) // ehh better
			let [type, args] = process_embed(url, rargs)
			BLOCK(type, args)
		} break; case 'LINK': {
			let url = base_token
			let args = {url}
			if (body) {
				OPEN('link', token, args, body)
			} else {
				args.text = rargs[0]
				BLOCK('simple_link', args)
			}
		} break; case 'TABLE_ROW': {
			if (!REACH_CELL()) {
				TEXT(token)
				return
			}
			let args = table_args(rargs)
			CLOSE() // cell
			CLOSE() // row
			OPEN('table_row', "")
			OPEN('table_cell', token.replace(/^ *\n/, ""), args, body)
		} break; case 'TABLE_END': {
			if (REACH_CELL()) {
				CLOSE()
				CLOSE()
				CLOSE()
				return
			}
			TEXT(token)
		} break; case 'TABLE_START': {
			let args = table_args(rargs)
			OPEN('table', "")
			OPEN('table_row', "")
			OPEN('table_cell', token, args, body)
		} break; case 'TABLE_CELL': {
			if (!REACH_CELL()) {
				TEXT(token)
				return
			}
			let args = table_args(rargs)
			CLOSE() // cell
			OPEN('table_cell', token.replace(/^ *[|]/, ""), args, body)
		} break; case 'INVALID_TAG': {
			if (body)
				OPEN('invalid', token, {text: token, reason:"invalid tag"}, body)
			else
				BLOCK('invalid', {text: token, reason:"invalid tag"})

		} break; case '\\sub': {
			OPEN('subscript', token, null, body)
		} break; case '\\sup': {
			OPEN('superscript', token, null, body)
		} break; case '\\b': {
			OPEN('bold', token, null, body)
		} break; case '\\i': {
			OPEN('italic', token, null, body)
		} break; case '\\u': {
			OPEN('underline', token, null, body)
		} break; case '\\s': {
			OPEN('strikethrough', token, null, body)
		} break; case '\\quote': {
			OPEN('quote', token, {cite: rargs[0]}, body)
		} break; case '\\align': {
			let a = rargs[0]
			if (!(a==='left' || a==='right' || a==='center'))
				a = 'center'
			OPEN('align', token, {align: a}, body)
		} break; case '\\spoiler': {
			let label = arg0(rargs, "spoiler") // todo: handle this default value in the renderer
			OPEN('spoiler', token, {label}, body)
		} break; case '\\ruby': {
			let text = arg0(rargs, "true")
			OPEN('ruby', token, {text}, body)
		} break; case '\\key': {
			OPEN('key', token, null, body)
		}}
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
		for (let arg of arglist.split(";")) {
			let [, name, value] = /^(?:([^=]*)=)?(.*)$/.exec(arg)
			// value OR =value
			// (this is to allow values to contain =. ex: [=1=2] is "1=2")
			if (!name)
				list.push(value)
			else // name=value
				named[name] = value
		}
		list.named = named
		return list
	}
	// process an embed url: !https://example.com/image.png[alt=balls]
	// returns [type: String, args: Object]
	function process_embed(url, rargs) {
		let type
		let args = {url, alt:rargs.named.alt}
		for (let arg of rargs)
			if ('video'===arg || 'audio'===arg || 'image'===arg)
				type = arg
		// todo: improve this
		if (!type) {
			//let u = new URL(url, "x-relative:/")
			//let ext = /[.]([a-z0-9A-Z]{3,4})(?!\w)[^.]*$/.exec(url)
			let m
			if (/[.](mp3|ogg|wav|m4a)(?!\w)/i.test(url))
				type = 'audio'
			else if (/[.](mp4|mkv|mov)(?!\w)/i.test(url))
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

	function table_args(rargs) {
		let ret = {}
		for (let arg of rargs) {
			let m
			if ('*'===arg)
				ret.header = true
			else if (['red','orange','yellow','green','blue','purple','gray'].includes(arg))
				ret.color = arg
			else if (m = /^(\d*)x(\d*)$/.exec(arg)) {
				let [, w, h] = m
				if (+w > 1) ret.colspan = +w
				if (+h > 1) ret.rowspan = +h
			}
		}
		return ret
	}
	
	// start a new block
	function OPEN(type, token, args, body) {
		current = Object.seal({
			type, args, content: [],
			token, body, parent: current,
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
	// sketchy...
	function merge(content, prev, token) {
		if (token)
			current.content.push(token)
		else if ('block'===current.prev && "\n"===content[0])
			content.shift() // strip newline
		
		current.content.push(...content)
		current.prev = prev
	}
	// complete current block
	function CLOSE(cancel) {
		// push the block + move up
		let o = pop()
		
		if (cancel && !o.body && o.type in CAN_CANCEL) {
			// todo: maybe instead of THIS, we could open a temporary table cell block, then turn it into a real one if the table ends up having more content
			if ('table_cell'===o.type) {
				// close table row (cancel if empty)
				current.content.length ? CLOSE() : pop()
				// close table (cancel if empty)
				current.content.length ? CLOSE() : TEXT(pop().token)
			}
			merge(o.content, o.prev, o.token)
		} else if ('null_env'===o.type) {
			merge(o.content, o.prev)
		} else {
			// otherwise, we have a normal block:
			if ('newline'===o.prev)
				o.content.push("\n")
			current.content.push({
				type:o.type, args:o.args, content:o.content
			})
			current.prev = o.type in IS_BLOCK ? 'block' : o.prev
		}
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
	function NEWLINE() {
		if ('block'!==current.prev)
			current.content.push("\n")
		if ('all_newline'!==current.prev)
			current.prev = 'newline'
	}
	function REACH_CELL() {
		while ('style'===current.type)
			CLOSE(true)
		return 'table_cell'===current.type
		// todo: wait, we don't find a cell, we just killed all those blocks even though this tag isn't valid ??
	}
	
	// idea: consider a message like "hello\nabc"
	// we don't even need to parse the newline here
	
	function parse(text, ext) {
		let cursor
		if (ext)
			cursor = ext.cursor
		let tree = {type:'ROOT', token:"", content:[], prev:'all_newline'}
		current = tree
		brackets = 0
		
		let adjust = 0
		function mark(x) {
			if (cursor)
				current.content.push(+x+adjust)
		}
		
		// MAIN LOOP //
		let prev = -1
		let last = REGEX.lastIndex = 0
		for (let match; match=REGEX.exec(text); ) {
			// check for infinite loops
			if (match.index===prev)
				throw ["INFINITE LOOP", match]
			prev = match.index
			// 1: insert the text from after previous token
			mark(last)
			TEXT(text.substring(last, match.index))
			// 2: figure out which token type was matched
			let token_text = match[0]
			let group_num = match.indexOf("", 1)-1
			
			// 3: get type + argument pattern
			let type = GROUPS[group_num]
			let argregex
			if ('TAG'!==type) {
				argregex = ARGTYPES[group_num]
			} else if (token_text in TAGS) {
				type = token_text
				argregex = TAGS[type]
			} else {
				// when an unknown \tag is encountered, we create a block
				// rather than just ignoring it, so in the future,
				// we can add a new tag without changing the parsing (much)
				type = 'INVALID_TAG'
				argregex = ARGS_NORMAL
			}
			
			// 4: parse args and {
			let start_line = false
			if (!argregex) {
				let body = 'NULL_ENV'===type //h
				PROCESS(type, token_text, null, body, token_text)
				last = REGEX.lastIndex
				if (body || 'NEWLINE'===type)
					start_line = true
			} else {
				// try to match arguments
				argregex.lastIndex = REGEX.lastIndex
				let argmatch = argregex.exec(text)
				if (null===argmatch) { // INVALID! skip 1 char
					REGEX.lastIndex = match.index+1
					last = match.index
					continue
				}
				let full_token = token_text+argmatch[0]
				let args = argmatch[1]
				let body = argmatch[2] // the {, or contents of raw tags
				let word = argmatch[3] // only for syntax like \sub word
				
				if (!argregex._raw) {
					args = parse_args(args)
					start_line = body
				}
				mark(match.index)
				PROCESS(type, full_token, args, body, token_text)
				// word
				if (undefined!==word) {
					mark(match.index) //todo
					TEXT(word.replace(/\\([^])/g, "$1"))
					CLOSE()
					start_line = false
				}
				last = REGEX.lastIndex = argregex.lastIndex
			}
			// 5: handle start-of-line
			if (start_line) {
				adjust += last
				text = text.substring(last)
				last = REGEX.lastIndex = 0
				prev = -1
			}
		} // end of main loop
		
		mark(last)
		TEXT(text.substring(last)) // text after last token
		
		while ('ROOT'!==current.type)
			CLOSE(true)
		if ('newline'===current.prev) //todo: this is repeated
			current.content.push("\n")
		
		return tree // technically we could return `current` here and get rid of `tree` entirely
	}
	//this.regex = REGEX
	/**
		parser
		@instance
		@type {Parser_Function}
	*/
	this.parse = parse
	/**
		@instance
		@type {Object}
		@property {Parser_Function} 12y2 - same as .parse
	*/
	this.langs = {'12y2': parse}
	
	// what if you want to write like, "{...}". well that's fine
	// BUT if you are inside a tag, the } will close it.
	// maybe closing tags should need some kind of special syntax?
	// \tag{ ... \}  >{...\} idk..
	// or match paired {}s :  
	// \tag{ ...  {heck} ... } <- closes here
	
}}
