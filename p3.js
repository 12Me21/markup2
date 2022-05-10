// 📤📥doc
// todo: after parsing a block element: eat the next newline directly

class Markup_12y2 { constructor() {
	// all state is stored in these vars (and REGEX.lastIndex)
	let current, brackets
	
	// idea: maybe instead of this separate parse step, we should just do something like
	// go back to using ex: /^><args>?[{ ]/
	// have either
	// - custom post-processing regex for each token (ex /[\\](\w+)(<args>)?({)?/ )
	// - include these extra groups in the main regex, remove the () group, and find a replacement for the () indexOf("") system
	

	
	const MAP = x=>Object.freeze(Object.create(null, Object.getOwnPropertyDescriptors(x)))
	
	const CAN_CANCEL = MAP({style:1, table_cell:1})
	// elements which can survive an eol (without a body)
	const SURVIVE_EOL = MAP({ROOT:1, table_cell:1})
	const IS_BLOCK = MAP({code:1, divider:1, ROOT:1, heading:1, quote:1, table:1, table_cell:1, image:1, video:1, audio:1, spoiler:1, align:1, list:1, list_item:1, error:1, youtube:1})
	
	// argtype
	const ARGS_NORMAL   = /(?:\[([^\]\n]*)\])?({)?/y      // [...]?{?
	const ARGS_WORD     = /(?:\[([^\]\n]*)\])?({| (\w*) ?)/y // [...]?{ or [...]? <word> // todo: more complex rule for word parsing //TODO: does this set the body flag right?
	const ARGS_LINE     = /(?:\[([^\]\n]*)\])?(?:({)| ?)/y      // [...]?{? probably dont need this, we can strip space after { in all cases instead.
	const ARGS_HEADING  = /(?:\[([^\]\n]*)\])?(?:({)| )/y // [...]?( |{)
	const ARGS_BODYLESS = /(?:\[([^\]\n]*)\])?/y          // [...]?
	const ARGS_TABLE    = /(?:\[([^\]\n]*)\])? */y        // [...]? *
	
	const ARGS_ICODE    = /(){0}([^\n`]+)`?/y
	const ARGS_CODE     = /(?: *([-\w.+#$ ]+?)? *(?:\n|$))?([^]*?)(?:```|$)/y
	const ARGS_ICODE_TAG = /(){0}{([^\n`]*)}/y // todo
	const ARGS_CODE_TAG = /(){0}{([^\n`]*)}/y // todo
	
	function arg0(rargs, def) {
		if (rargs.length<1)
			return def
		return rargs[0]
	}
	
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
	
	const GROUPS = []
	const ARGTYPES = []
	const SPECIAL = []
	
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
	
	/**
		process a token
		@param {string} _token_type - 
		@param {string} token - token text, including arguments
		@param {Array} rargs - raw arguments
		@param body - varies depending on token type:
		- truthy if `{` is present
		- raw contents (of icode, code, etc.)
		@param {string} base_token - token text, without arguments
	*/
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
			while (current.type==='style') { 
				if (current.token === token) { // found opening
					current.type = {
						"**": 'bold', "__": 'underline',
						"~~": 'strikethrough', "/": 'italic',
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
			if (current.type==='invalid')
				TEXT("}")
			CLOSE()
		} break; case 'NULL_ENV': {
			OPEN('null_env', token, null, true)
		} break; case 'ESCAPED': {
			if (token==="\\\n")
				NEWLINE()
			else
				TEXT(token.substr(1))
		} break; case 'QUOTE': {
			OPEN('quote', token, {cite: rargs[0]}, body)
		} break; case 'CODE_BLOCK': {
			let lang = rargs[0]
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
			if (arg==='video' || arg==='audio' || arg==='image')
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
		if (type==='image' || type==='video') {
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
			if (arg==="*")
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
		else if (current.prev==='block' && content[0]==="\n")
			content.shift() // strip newline
		
		current.content.push(...content)
		current.prev = prev
	}
	// complete current block
	function CLOSE(cancel) {
		// push the block + move up
		let o = pop()
		
		if (cancel && !o.body && o.type in CAN_CANCEL) {
			if (o.type==='table_cell') {
				// close table row (cancel if empty)
				current.content.length ? CLOSE() : pop()
				// close table (cancel if empty)
				current.content.length ? CLOSE() : TEXT(pop().token)
			}
			merge(o.content, o.prev, o.token)
		} else if (o.type==='null_env') {
			merge(o.content, o.prev)
		} else {
			// otherwise, we have a normal block:
			if (o.prev==='newline')
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
		if (current.prev !== 'block')
			current.content.push("\n")
		if (current.prev !== 'all_newline')
			current.prev = 'newline'
	}
	function REACH_CELL() {
		kill_weak()
		return current.type==='table_cell'
		// todo: wait, we don't find a cell, we just killed all those blocks even though this tag isn't valid ??
	}
	function kill_weak() {
		while (current.type==='style')
			CLOSE(true)
	}
	
	function parse(text) {
		let tree = {type:'ROOT', token:"", content:[], prev:'all_newline'}
		current = tree
		brackets = 0
		
		let prev = -1
		let last = REGEX.lastIndex = 0
		for (let match; match=REGEX.exec(text); ) {
			if (match.index===prev)
				throw ["INFINITE LOOP",match]
			prev = match.index
			// text before token
			TEXT(text.substring(last, match.index))
			
			let group = match.indexOf("", 1)-1
			let type = GROUPS[group]
			let token_text = match[0]
			
			let argregex
			if (type==='TAG') {
				type = token_text
				if (type in TAGS)
					argregex = TAGS[type]
				else {
					// when an unknown \tag is encountered, we create a block
					// rather than just ignoring it, so in the future,
					// we can add a new tag without changing the parsing (much)
					type = 'INVALID_TAG'
					argregex = ARGS_NORMAL
				}
			} else {
				argregex = ARGTYPES[group]
			}
			
			let has_body
			// parse args and {
			if (argregex) {
				// try to match arguments
				argregex.lastIndex = REGEX.lastIndex
				let argmatch = argregex.exec(text)
				if (!argmatch) { // INVALID! skip 1 char
					REGEX.lastIndex = match.index+1
					last = match.index
					continue
				}
				let full_token = token_text+argmatch[0]
				if (argregex._raw) {
					// raw argtype
					// should we call parse_args here?
					PROCESS(type, full_token, argmatch[1], argmatch[2], token_text)
				} else {
					// normal args
					has_body = argmatch[2]
					PROCESS(type, full_token, parse_args(argmatch[1]), has_body, token_text)
					// args that take word token
					if (argmatch[3]!==undefined) {
						let text = argmatch[3]
						TEXT(text.replace(/\\([^])/g, "$1"))
						CLOSE()
						has_body = false
					}
				}
				last = REGEX.lastIndex = argregex.lastIndex
			} else {
				has_body = type==='NULL_ENV'
				PROCESS(type, token_text, null, has_body, token_text)
				last = REGEX.lastIndex
			}
			// "start of line"
			if (has_body || type==='NEWLINE') {
				text = text.substring(last)
				last = REGEX.lastIndex = 0
				prev = -1
			}
		}
		TEXT(text.substring(last)) // text after last token
		
		while (current.type!=='ROOT')
			CLOSE(true)
		if (current.prev==='newline') // todo: this is repeated
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
