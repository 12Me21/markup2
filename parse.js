const Markup = {
	set INJECT(fn) { fn(this) },
	parse: null,
	render: null,
	convert(text) {
		let tree = this.parse(text)
		return this.render(tree)
	},
}

Markup.INJECT = Markup=>{
	"use strict"
	
	let current, brackets
	
	// maybe instead of this separate parse step, we should just do something like
	// go back to using ex: /^><args>?[{ ]/
	// have either
	// - custom post-processing regex for each token (ex /[\\](\w+)(<args>)?({)?/ )
	// - include these extra groups in the main regex, remove the () group, and find a replacement for the () indexOf("") system
	

	
	Markup.IS_BLOCK = {code:1, divider:1, ROOT:1, heading:1, quote:1, table:1, table_cell:1}
	
	// if cancelled, will be completed instead:
	const AUTO_CLOSE = {heading:1, quote:1, ROOT:1}
	// will be cancelled at the end of a block, if open:
	const WEAK = {style:1}
	// cancelled at end of a line (or completed if auto_close is set):
	const END_AT_EOL = {heading:1, style:1, quote:1}
	
	const envs_body_type = {
		// either
		// - must be \env
		// - must be \env{ or \env word
		// - must be \env{ maybe
		// etc.
	}
	const envs = {
		sup: 'superscript',
		sub: 'subscript',
	}
	
	// argtype
	const ARGS_NORMAL   = /(?:\[([^\]\n]*)\])?({)?/y      // [...]?{?
	const ARGS_WORD     = /(?:\[([^\]\n]*)\])?({|( [\w+]*))/y // [...]?{ or [...]? <word>
	const ARGS_HEADING  = /(?:\[([^\]\n]*)\])?(?:({)| )/y // [...]?( |{)
	const ARGS_BODYLESS = /(?:\[([^\]\n]*)\])?/y          // [...]?
	const ARGS_TABLE    = /(?:\[([^\]\n]*)\])? */y        // [...]? *
	
	/* NOTE:
		/^/ matches after a <newline> or <env> token
		/$/ matches end of string
		/(?![^\n])/ matches end of line
		/()/ empty tags are used to mark token types
	*/
	// ⚠ The order of these is important!
	const [regex, groups] = process_def([[
		// 💎 NEWLINE 💎
		/\n/,
		{newline:true, do(tag) {
			while (!current.body && END_AT_EOL[current.type])
				CANCEL()
			return TEXT(true)
		}},
	],[// 💎 HEADING 💎
		/^#{1,4}/,
		{argtype:ARGS_HEADING, do(tag, rargs, body) {
			let level = /#*/.exec(tag)[0].length // hhhhh
			let args = {level}
			// todo: anchor name (and, can this be chosen automatically based on contents?)
			return OPEN('heading', tag, args, body)
		}},
	],[// 💎 DIVIDER 💎
		/^---+(?![^\n])/,
		{do(tag) {
			return TAG('divider', tag)
		}},
	],[// 💎💎 STYLE
		/(?:[*][*]|__|~~|[/])(?=\w()|)/, //todo: improve start/end detect
		// 💎 STYLE START 💎
		{do(tag) {
			return OPEN('style', tag)
		}},
		// 💎 STYLE END 💎
		{do(tag) {
			// todo: should be checking for WEAK here?
			while (current.type=='style') { 
				if (current.tag == tag) { // found opening
					current.type = {
						"**": 'bold',
						"__": 'underline',
						"~~": 'strikethrough',
						"/": 'italic',
					}[current.tag]
					return CLOSE()
				}
				CANCEL() // different style (kill)
			}
			return TEXT(tag)
		}},
	],[// 💎 ENV 💎
		/[\\]\w+/,
		// 1, ← just put a dummy value here instead of...
		{argtype:ARGS_WORD, do(tag, rargs, body) {
			let envtype = /^[\\](\w+)/.exec(tag)[1] //todo: use this
			let e = envs[envtype]
			let type, args
			if (!e)
				return TEXT(TAG) //todo: reject the tag earlier, before parsing args. we need to process these there anyway, since it has to decide which arg regex to use based on the tag name.
			
			//if (typeof e == 'string')
			type = e
			if (body)
				return OPEN(type, tag, args, body)
			return TAG(type, tag, args)
		}},
	],[// 💎 BLOCK END 💎
		//[/{/, {token:''}], // maybe
		/}/,
		{do(tag) {
			if (brackets<=0)
				return TEXT(tag)
			while (!current.body)
				CANCEL()
			return CLOSE()
		}},
	],[// 💎 NULL ENV 💎
		/[\\]{/,
		{body:true, do(tag) {
			return OPEN('null_env', tag, null, true)
		}},
	],[// 💎 ESCAPED CHAR 💎
		/[\\][^]/, //todo: match surrogate pairs
		{do(tag) {
			if (tag=="\\\n")
				return TEXT(true)
			return TEXT(tag.substr(1))
		}},
	],[// 💎 QUOTE 💎
		/^>/,
		{argtype:ARGS_HEADING, do(tag, rargs, body) {
			return OPEN('quote', tag, {cite: rargs[0]}, body)
		}},
	],[// 💎 CODE BLOCK 💎
		/^```[^]*?\n(?:```|$)/,
		{do(tag) {
			return TAG('code', tag, {text: tag.replace(/^```\n?|\n?```$/g,"")}) // hack...
		}},
	],[// 💎 INLINE CODE 💎
		/`[^`\n]+`?/,
		{do(tag) {
			return TAG('icode', tag, {text: tag.replace(/^`|`$/g,"")})
		}},
	],[// 💎💎 URL
		/(?:!())?(?:https?:[/][/]|sbs:)[-\w./%?&=#+~@:$*',;!)(]*[-\w/%&=#+~@$*';)(]/,
		// 💎 EMBED 💎
		{argtype:ARGS_BODYLESS, do(tag, rargs, body) {
			let url = /^!([^[{]*)/.exec(tag)[1]
			let type = embed_type(rargs, url)
			let args = {
				url: filter_url(url),
				alt: rargs.named.alt,
			}
			if (type=='image' || type=='video') {
				match_args(rargs, [
					[/^(\d+)x(\d+)$/, ([,x,y])=>{
						args.width = +x
						args.height = +y
					}]
				])
			}
			return TAG(type, tag, args)
		}},
		// 💎 LINK 💎
		{argtype:ARGS_NORMAL, do(tag, rargs, body) {
			let url = /^([^[{]*)/.exec(tag)[1] //todo: this is a hack
			let args = {url: filter_url(url)}
			if (body)
				return OPEN('link', tag, args, true)
			args.text = rargs.length>0 ? rargs[0] : url
			return TAG('simple_link', tag, args)
		}},
	],[// 💎 TABLE - NEXT ROW 💎
		/ *[|] *\n[|]/,
		{argtype:ARGS_TABLE, do(tag, rargs, body) {
			kill_weak()
			if (current.type!='table_cell')
				return TEXT(tag)
			let args = table_args(rargs)
			return (
				CLOSE(), // cell
				CLOSE(), // row
				OPEN('table_row', ""),
				OPEN('table_cell', tag.replace(/^ *\n/, ""), args, body))
		}},
	],[// 💎 TABLE - END 💎
		/ *[|] *(?![^\n])/,
		{do(tag) {
			kill_weak()
			if (current.type!='table_cell')
				return TEXT(tag) // todo: wait, if this happens, we just killed all those blocks even though this tag isn't valid ??
			return (
				CLOSE(),
				CLOSE(),
				CLOSE())
		}},
	],[// 💎 TABLE - START 💎
		/^ *[|]/,
		{argtype:ARGS_TABLE, do(tag, rargs, body) {
			let args = table_args(rargs)
			return (
				OPEN('table', ""),
				OPEN('table_row', ""),
				OPEN('table_cell', tag, args, body))
		}},
	],[// 💎 TABLE - NEXT CELL 💎
		/ *[|]/,
		{argtype:ARGS_TABLE, do(tag, rargs, body) {
			kill_weak()
			if (current.type!='table_cell')
				return TEXT(tag)
			let args = table_args(rargs)
			return (
				CLOSE(), // cell
				OPEN('table_cell', tag.replace(/^ *[|]/, ""), args, body))
		}},
	]]) // todo: we can probably merge a few table types, to save on match count / complexity..
	// and, maybe instead of using ^ and truncating the string on newline,
	// we can just filter the match results and retry if a match is in an invalid location (similar to how results are rejected if arg parsing fails)
	
	//[/^ *- /, 'list'], TODO
	

	
	function process_def(table) {
		let regi = []
		let groups = []
		for (let [regex, ...matches] of table) {
			regi.push(regex.source+"()")
			groups.push(...matches)
		}
		let r = new RegExp(regi.join("|"), 'g')
		return [r, groups]
	}
	
	const null_args = []
	null_args.named = Object.freeze({})
	Object.freeze(null_args)
	function parse_args(arglist) {
		if (!arglist) // note: tests for undefined (\tag) AND "" (\tag[])
			return null_args
		
		let map = {}, list = []
		for (let arg of arglist.split(";")) {
			let [, name, value] = /^(?:([^=]*)=)?(.*)$/.exec(arg)
			if (!name) // value OR =value (this is to allow values to contain =. ex: [=1=2] is "1=2"
				list.push(value)
			else // name=value
				map[name] = value
		}
		list.named = map
		return list
	}
	function filter_url(url) {
		if (/^ *javascript:/i.test(url))
			return ""
		return url
	}
	function embed_type(rargs, url) {
		let type
		for (let arg of rargs)
			if (arg=='video' || arg=='audio' || arg=='image')
				type = arg
		if (type)
			return type
		if (/[.](mp3|ogg|wav)(?!\w)/i.test(url))
			return 'audio'
		if (/[.](mp4|mkv|mov)(?!\w)/i.test(url))
			return 'video'
		if (/^(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/.test(url))
			return 'youtube'
		return 'image'
	}
	function match_args(rargs, defs) {
		for (let arg of rargs)
			for (let [regex, func] of defs) {
				let m = regex.exec(arg)
				if (m) {
					func(m)
					break
				}
			}
	}
	function table_args(rargs) {
		let ret = {}
		match_args(rargs, [
			// should this be * or # or h ?  // perhaps # = heading applied to entire row?
			[/^[*]$/, ()=>{
				ret.header = true
			}],
			[/^(?:red|orange|yellow|green|blue|purple|gray)$/, ([color])=>{
				ret.color = color
			}],
			[/^(\d*)x(\d*)$/, ([,w,h])=>{
				if (+w > 1) ret.colspan = +w
				if (+h > 1) ret.rowspan = +h
			}]
		])
		return ret
	}
	
	// start a new block
	function OPEN(type, tag, args, body) {
		current = {type, tag, content: [], parent: current}
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
	// complete current block
	function CLOSE() {
		// push the block + move up
		let o = pop()
		if (o.type=='null_env') // special case: merge
			current.content.push(...o.content)
		else {
			delete o.parent // remove cyclical reference before adding to tree
			current.content.push(o)
		}
	}
	// cancel current block (flatten)
	function CANCEL() {
		if (current.body || AUTO_CLOSE[current.type])
			return CLOSE()
		let o = pop()
		// if we just cancelled a table cell,
		// we don't want to insert text into the table row/body,
		// so we close the table/row first.
		if (o.type=='table_cell') {
			current.content.length ? CLOSE() : CANCEL() // row
			current.content.length ? CLOSE() : CANCEL() // table
		}
		// push the start tag (as text)
		TEXT(o.tag) // todo: merge with surrounding text nodes?
		// push the contents of the block
		current.content.push(...o.content)
	}
	// push text
	function TEXT(text) {
		if (text)
			current.content.push(text)
	}
	// push empty tag
	function TAG(type, tag, args) {
		current.content.push({type, tag, args})
	}
	function kill_weak() {
		while (WEAK[current.type])
			CANCEL()
	}
	
	Markup.parse = function(text) {
		let tree = {type:'ROOT', tag:"", content:[]}
		current = tree
		brackets = 0
		
		let last = regex.lastIndex = 0
		for (let match; match=regex.exec(text); ) {
			// text before token
			TEXT(text.substring(last, match.index))
			// get token
			let group = match.indexOf("", 1)-1
			let thing = groups[group]
			// parse args and {
			let body
			let argregex = thing.argtype
			if (argregex) {
				argregex.lastIndex = regex.lastIndex
				let argmatch = argregex.exec(text)
				if (!argmatch) { // INVALID! skip 1 char, try again
					regex.lastIndex = match.index+1
					last = match.index
					continue
				}
				body = argmatch[2]
				thing.do(match[0]+argmatch[0], parse_args(argmatch[1]), body)
				if (argmatch[3]) {
					TEXT(argmatch[3].substr(1))
					CLOSE()
				}
				last = regex.lastIndex = argregex.lastIndex
			} else {
				body = thing.body
				thing.do(match[0])
				last = regex.lastIndex
			}
			// start of line
			if (thing.newline || body) {
				text = text.substring(last)
				last = regex.lastIndex = 0
			}
		}
		TEXT(text.substring(last)) // text after last token
		
		while (current.type!='ROOT')
			CANCEL()
		return tree // technically we could return `current` here and get rid of `tree` entirely
	}
	
	// what if you want to write like, "{...}". well that's fine
	// BUT if you are inside a tag, the } will close it.
	// maybe closing tags should need some kind of special syntax?
	// \tag{ ... \}  >{...\} idk..
	// or match paired {}s :  
	// \tag{ ...  {heck} ... } <- closes here
	
}
