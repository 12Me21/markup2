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
	
	// when an unknown \tag is encountered, we create a block
	// rather than just ignoring it, so in the future,
	// we can add a new tag without changing the parsing (much)
	const ENV_INVALID = {
		argtype:ARGS_NORMAL, do(token, rargs, body) {
			if (body)
				return OPEN('invalid', token, {text: token, reason:"invalid tag"}, body)
			else
				return TAG('invalid', {text: token, reason:"invalid tag"})
		}
	}
	
	function arg0(rargs, def) {
		if (rargs.length<1)
			return def
		return rargs[0]
	}
	
	function simple_word_tag(name) {
		// nnnnn closure
		return {argtype:ARGS_WORD, do(token, rargs, body) {
			return OPEN(name, token, null, body)
		}}
	}
	
	const ENVS = MAP({
		sub: simple_word_tag('subscript'),
		sup: simple_word_tag('superscript'),
		b: simple_word_tag('bold'),
		i: simple_word_tag('italic'),
		u: simple_word_tag('underline'),
		s: simple_word_tag('strikethrough'),
		// todo:
//		icode: {argtype:ARGS_ICODE_TAG, raw:true, do(token, rargs, text) {
//			return TAG('icode', {text})
//		}},
		/*code: {argtype:ARGS_CODE_TAG, raw:true, do(token, rargs, text) {
			let lang = rargs[0]
			return TAG('code', {text, lang})
		}},
		link: {argtype:ARGS_WORD, do(token, rargs, body) {
			let args = {url: rargs[0]}
			return OPEN('link', token, args, body)
		}},
		list: {argtype:ARGS_LINE, do(token, rargs, body) {
			return OPEN('list', token, {style:rargs[0]<}, body)
		}},
		li: {argtype:ARGS_LINE, do(token, rargs, body) {
			return OPEN('list_item', token, null, body)
		}},*/
		quote: {argtype:ARGS_LINE, do(token, rargs, body) {
			// todo: this feels very repetitive...
			return OPEN('quote', token, {cite: rargs[0]}, body)
		}},
		align: {argtype:ARGS_LINE, do(token, rargs, body) {
			let a = rargs[0]
			if (!(a=='left' || a=='right' || a=='center'))
				a = 'center'
			return OPEN('align', token, {align: a}, body)
		}},
		spoiler: {argtype:ARGS_LINE, do(token, rargs, body) {
			let label = arg0(rargs, "spoiler")
			return OPEN('spoiler', token, {label}, body)
		}},
		ruby: {argtype:ARGS_WORD, do(token, rargs, body) {
			let text = arg0(rargs, "true")
			return OPEN('ruby', token, {text}, body)
		}},
		key: {argtype:ARGS_WORD, do(token, rargs, body) {
			return OPEN('key', token, null, body)
		}},
	})
	
	const GROUPS = []
	const ARGTYPES = []
	const SPECIAL = []
	
	let regi = []
	function T({raw}, ...groups) {
		console.log(raw.length)
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
	T`[\\]\w+${{ ENV :0}}`
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
	
	console.log(GROUPS)
	
	Object.freeze(GROUPS)
	Object.freeze(ARGTYPES)
	Object.freeze(SPECIAL)
	const REGEX = new RegExp(regi.join("|"), 'g')
	
	function PROCESS(token_type, token, rargs, body, base_token) {
		//console.log('process', arguments)
		switch(token_type) { default: {
			throw "unknown token type: "+token_type
			// error
		} case 'NEWLINE': {
			while (!current.body && !SURVIVE_EOL[current.type])
				CLOSE(true)
			return NEWLINE()
		} break; case 'HEADING': {
			let level = base_token.length
			let args = {level}
			// todo: anchor name (and, can this be chosen automatically based on contents?)
			return OPEN('heading', token, args, body)
		} break; case 'DIVIDER': {
			return TAG('divider')
		} break; case 'STYLE_START': {
			return OPEN('style', token)
		} break; case 'STYLE_END': {
			while (current.type=='style') { 
				if (current.token == token) { // found opening
					current.type = {
						"**": 'bold', "__": 'underline',
						"~~": 'strikethrough', "/": 'italic',
					}[current.token]
					return CLOSE()
				}
				CLOSE(true) // different style (kill)
			}
			return TEXT(token)
		} break; case 'ENV': {
			// env
		} break; case 'BLOCK_END': {
			if (brackets<=0)
				return TEXT(token)
			// only runs if at least 1 element has a body, so this won't fail:
			while (!current.body)
				CLOSE(true)
			if (current.type=='invalid')
				TEXT("}")
			return CLOSE()
		} break; case 'NULL_ENV': {
			return OPEN('null_env', token, null, true)
		} break; case 'ESCAPED': {
			if (token=="\\\n")
				return NEWLINE()
			return TEXT(token.substr(1))
		} break; case 'QUOTE': {
			return OPEN('quote', token, {cite: rargs[0]}, body)
		} break; case 'CODE_BLOCK': {
			let lang = rargs[0]
			// idea: strip leading indent from code?
			return TAG('code', {text:body, lang})
		} break; case 'INLINE_CODE': {
			return TAG('icode', {text:body})
		} break; case 'EMBED': {
			let url = base_token.substr(1) // ehh better
			let [type, args] = process_embed(url, rargs)
			return TAG(type, args)
		} break; case 'LINK': {
			let url = base_token
			let args = {url}
			if (body)
				return OPEN('link', token, args, body)
			args.text = rargs[0]
			return TAG('simple_link', args)
		} break; case 'TABLE_ROW': {
			if (!REACH_CELL())
				return TEXT(token)
			let args = table_args(rargs)
			CLOSE() // cell
			CLOSE() // row
			OPEN('table_row', "")
			return OPEN('table_cell', token.replace(/^ *\n/, ""), args, body)
		} break; case 'TABLE_END': {
			if (REACH_CELL()) {
				CLOSE()
				CLOSE()
				return CLOSE()
			}
			return TEXT(token)
		} break; case 'TABLE_START': {
			let args = table_args(rargs)
			OPEN('table', "")
			OPEN('table_row', "")
			return OPEN('table_cell', token, args, body)
		} break; case 'TABLE_CELL': {
			if (!REACH_CELL())
				return TEXT(token)
			let args = table_args(rargs)
			CLOSE() // cell
			return OPEN('table_cell', token.replace(/^ *[|]/, ""), args, body)
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
		
		let list = []
		list.named = {}
		for (let arg of arglist.split(";")) {
			let [, name, value] = /^(?:([^=]*)=)?(.*)$/.exec(arg)
			// value OR =value
			// (this is to allow values to contain =. ex: [=1=2] is "1=2")
			if (!name)
				list.push(value)
			else // name=value
				list.named[name] = value
		}
		return list
	}
	// process an embed url: !https://example.com/image.png[alt=balls]
	// returns [type: String, args: Object]
	function process_embed(url, rargs) {
		let type
		let args = {url, alt:rargs.named.alt}
		for (let arg of rargs)
			if (arg=='video' || arg=='audio' || arg=='image')
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
		if (type=='image' || type=='video') {
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
			if (arg=="*")
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
		// todo: anything with a body doesn't need a tag, i think
		// since body items can never be cancelled.
		// so perhaps we can specify the body flag by setting tag = true
		current = {type, token, content: [], parent: current, prev: 'all_newline'}
		if (body) {
			brackets++
			current.body = true
		}
		if (args)
			current.args = args
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
		else if (current.prev=='block' && content[0]==="\n")
			content.shift() // strip newline
		
		current.content.push(...content)
		current.prev = prev
	}
	// complete current block
	function CLOSE(cancel) {
		// push the block + move up
		let o = pop()
		
		if (cancel && !o.body && CAN_CANCEL[o.type]) {
			if (o.type=='table_cell') {
				// close table row (cancel if empty)
				current.content.length ? CLOSE() : pop()
				// close table (cancel if empty)
				current.content.length ? CLOSE() : TEXT(pop().token)
			}
			merge(o.content, o.prev, o.token)
		} else if (o.type=='null_env') {
			merge(o.content, o.prev)
		} else {
			// otherwise, we have a normal block:
			if (o.prev=='newline')
				o.content.push("\n")
			delete o.parent // remove cyclical reference before adding to tree. TODO: for some reason this line causes the code to run like 20% slower lol
			current.content.push(o)
			current.prev = IS_BLOCK[o.type] ? 'block' : o.prev
		}
	}
	// push text
	function TEXT(text) {
		if (text) {
			current.content.push(text) // todo: merge with surrounding textnodes?
			current.prev = 'text'
		}
	}
	// push empty tag
	function TAG(type, args) {
		current.content.push({type, args})
		current.prev = IS_BLOCK[type] ? 'block' : 'text'
	}
	function NEWLINE() {
		if (current.prev != 'block')
			current.content.push("\n")
		if (current.prev != 'all_newline')
			current.prev = 'newline'
	}
	function REACH_CELL() {
		kill_weak()
		return current.type=='table_cell'
		// todo: wait, we don't find a cell, we just killed all those blocks even though this tag isn't valid ??
	}
	function kill_weak() {
		while (current.type=='style')
			CLOSE(true)
	}
	
	function parse(text) {
		let tree = {type:'ROOT', token:"", content:[], prev:'all_newline'}
		current = tree
		brackets = 0
		
		let prev = -1
		let last = REGEX.lastIndex = 0
		for (let match; match=REGEX.exec(text); ) {
			// text before token
			if (match.index==prev)
				throw ["INFINITE LOOP",match]
			prev = match.index
			TEXT(text.substring(last, match.index))
			let group = match.indexOf("", 1)-1
			let type = GROUPS[group]
			let token = match[0]
			console.log('got token', token, type)
//			console.log(type, group, match)
			// is a \tag
			//if (type=='ENV') {
			//let name = token.substr(1)
			//thing = ENVS[name] || ENV_INVALID
			//}
			// parse args and {
			let body
			let argregex = ARGTYPES[group]
			if (argregex) {
				argregex.lastIndex = REGEX.lastIndex
				let argmatch = argregex.exec(text)
				if (!argmatch) { // INVALID! skip 1 char
					REGEX.lastIndex = match.index+1
					last = match.index
					continue
				}
				console.log('got arg match', argregex, argmatch)
				token += argmatch[0]
				if (argregex.raw) {
					// should we call parse_args here?
					PROCESS(type, token, parse_args(argmatch[1]), argmatch[2], match[0])
				} else {
					body = argmatch[2]
					PROCESS(type, token, parse_args(argmatch[1]), body, match[0])
					if (argmatch[3]!==undefined) {
						let text = argmatch[3]
						TEXT(text.replace(/\\([^])/g, "$1"))
						CLOSE()
						body = false
					}
				}
				last = REGEX.lastIndex = argregex.lastIndex
			} else {
				body = type=='NULL_ENV'
				PROCESS(type, token)
				last = REGEX.lastIndex
			}
			// "start of line"
			if (body || type=='NEWLINE') {
				text = text.substring(last)
				last = REGEX.lastIndex = 0
				prev = -1
			}
		}
		TEXT(text.substring(last)) // text after last token
		
		while (current.type!='ROOT')
			CLOSE(true)
		if (current.prev=='newline') // todo: this is repeated
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
