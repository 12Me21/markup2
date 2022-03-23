let Markup = (function(){
	"use strict"
	
	// auto_cancel - will be cancelled at the end of a block, if open
	// auto_close - if cancelled, will be completed instead
	//   any tag with a {...} body  - also counts as auto_close
	// end_at_eol - cancelled at the end of a line (or completed if auto_close is set)
	
	function filter_url(url) {
		if (/^ *javascript:/i.test(url))
			return ""
		return url
	}
	let BLOCKS = {
		// simple tags
		newline: {},
		link: {
			arg_process(list, named, url) {
				return {url: filter_url(url)}
			}
		},
		simple_link: {
			arg_process(list, named, url) {
				return {url: filter_url(url), text: url}
			}
		},
		embed: {
			arg_process(list, named, url) {
				// todo: we need to figure out the filetype
				return {url: filter_url(url)}
			}
		},
		code: {block:true},
		icode: {},
		line: {block:true},
		// with contents:
		ROOT: {block: true},
		heading: {
			block:true, auto_close:true, end_at_eol:true,
			arg_process(list, named) {
				return {}
			},
		},
		style: {auto_cancel: true, end_at_eol:true},
		env: {},
		quote: {block:true, auto_close:true, end_at_eol:true},
		
		table: {block:true},
		table_row: {},
		table_cell: {
			block: true,
			arg_process(list, named) {
				let ret = {}
				for (let a of list) {
					if (a=="*") // should this be * or # or h ?  // perhaps # = heading applied to entire row?
						ret.header = true
					else if (/^(red|orange|yellow|green|blue|purple|gray)$/.test(a))
						ret.color = a
					else {
						let m = /^(\d*)x(\d*)$/.exec(a)
						if (m) {
							if (+(m[1])) ret.colspan = +m[1]
							if (+(m[2])) ret.rowspan = +m[2]
						} else { //...
						}
					}
				}
				return ret
			},
		},
	}
	
	let tree, current, envs
	
	// maybe instead of this separate parse step, we should just do something like
	// go back to using ex: /^><args>?[{ ]/
	// have either
	// - custom post-processing regex for each token (ex /[\\](\w+)(<args>)?({)?/ )
	// - include these extra groups in the main regex, remove the () group, and find a replacement for the () indexOf("") system
	

	// argtype
	let arg_regex = [
		null,
		/(?:\[([^\]\n]*)\])?({)?/y, // 1: [...]?{?
		/(?:\[([^\]\n]*)\])?(?:({)| )/y, // 2: [...]?{ or [...]?<space>
		/(?:\[([^\]\n]*)\])?({)? */y, // 3: [...]?{?<space>*
		/(?:\[([^\]\n]*)\])? */y, // 4: [...]?<space>*
		/(?:\[([^\]\n]*)\])?/y, // 5: [...]?
	]
	
	function newline_close() {
		while (!current.body && BLOCKS[current.type].end_at_eol)
			CANCEL()
	}
	
	/* NOTE:
		/^/ matches after a <newline> or <env> token
		/$/ matches end of string
		/(?![^\n])/ matches end of line
		/()/ empty tags are used to mark token types
	*/
	let [regex, groups] = process_def([[
		// 💎 HEADING 💎
		/(?:\n|^)#{1,3}/,
		{argtype:3, do(tag, args, body) {
			newline_close()
			args = parse_args('heading', args)
			return OPEN('heading', tag, args, body)
		}},
	],[// 💎 DIVIDER 💎
		/(?:\n|^)---+(?![^\n])/,
		{do(tag) {
			newline_close()
			return TAG('line', tag)
		}},
	],[// 💎💎 STYLE
		/(?:[*][*]|__|~~|[/])(?=\w()|)/, //todo: improve these
		// 💎 STYLE START 💎
		{do(tag) {
			return OPEN('style', tag, tag)
		}},
		// 💎 STYLE END 💎
		{do(tag) {
			// todo: should be checking for WEAK here?
			while (current.type=='style') { 
				if (current.args == tag) { // found opening
					current.type = {
						"**": 'bold',
						"__": 'underline',
						"~~": 'strikethrough',
						"/": 'italic',
					}[current.args]
					return CLOSE()
				}
				CANCEL() // different style (kill)
			}
			return TEXT(tag)
		}},
	],[// 💎 ENV 💎
		/[\\]\w+/,
		{argtype:1, do(tag, args, body) {
			let envtype = /^[\\](\w+)/.exec(tag)[1] //todo: use this
			args = parse_args('env', args)
			return OPEN('env', tag, args, body)
		}},
	],[// 💎 BLOCK END 💎
		//[/{/, {token:''}], // maybe
		/}/,
		{do(tag) {
			if (envs<=0)
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
				return TAG('newline')
			return TEXT(tag.substr(1))
		}},
	],[// 💎 QUOTE 💎
		/(?:\n|^)>/,
		{argtype:2, do(tag, args, body) {
			newline_close()
			args = parse_args('quote', args)
			return OPEN('quote', tag, args, body)
		}},
	],[// 💎 CODE BLOCK 💎
		/(?:\n|^)```[^]*?(?:```|$)(?![^\n])/,
		{do(tag) {
			newline_close()
			return TAG('code', tag, tag.replace(/^```|```$/g,"")) // hack...
		}},
	],[// 💎 INLINE CODE 💎
		/`[^`\n]+`?/,
		{do(tag) {
			return TAG('icode', tag, tag.replace(/^`|`$/g,""))
		}},
	],[// 💎💎 URL
		/(?:\n?!())?(?:https?:[/][/]|sbs:)[-\w./%?&=#+~@:$*',;!)(]*[-\w/%&=#+~@$*';)(]/,
		// 💎 EMBED 💎
		{argtype:5, do(tag, args, body) {
			newline_close()
			args = parse_args('embed', args, /^!([^[{]*)/.exec(tag)[1])
			return TAG('embed', tag, args)
		}},
		// 💎 LINK 💎
		{argtype:1, do(tag, args, body) {
			//todo: this is a hack
			let url = /^([^[{]*)/.exec(tag)[1]
			if (body) {
				args = parse_args('link', args, url)
				return OPEN('link', tag, args, true)
			}
			args = parse_args('simple_link', args, url)
			return TAG('simple_link', tag, args)
		}},
	],[// 💎 TABLE - NEXT ROW 💎
		/ *[|] *\n[|]/,
		{argtype:4, do(tag, args, body) {
			KILL_WEAK()
			if (current.type!='table_cell')
				return TEXT(tag)
			args = parse_args('table_cell', args)
			return (
				CLOSE(), // cell
				CLOSE(), // row
				OPEN('table_row', ""),
				OPEN('table_cell', tag.split("\n")[1], args, body))
		}},
	],[// 💎 TABLE - END 💎
		/ *[|] *(?:\n|$)/,
		{do(tag, args, body) {
			KILL_WEAK()
			if (current.type!='table_cell')
				return TEXT(tag) // todo: wait, if this happens, we just killed all those blocks even though this tag isn't valid ??
			return (
				CLOSE(),
				CLOSE(),
				CLOSE())
		}},
	],[// 💎 TABLE - START 💎
		/(?:\n|^) *[|]/,
		{argtype:4, do(tag, args, body) {
			newline_close()
			args = parse_args('table_cell', args)
			return (
				OPEN('table', ""),
				OPEN('table_row', ""),
				OPEN('table_cell', tag, args, body))
		}},
	],[// 💎 TABLE - NEXT CELL 💎
		/ *[|]/,
		{argtype:4, do(tag, args, body) {
			KILL_WEAK()
			if (current.type!='table_cell')
				return TEXT(tag)
			args = parse_args('table_cell', args)
			return (
				CLOSE(), // cell
				OPEN('table_cell', tag.replace(/^ *[|]/,""), args, body))
		}},
	],[// 💎 NEWLINE 💎
		/\n/,
		{newline:true, do(tag) {
			newline_close()
			return TAG('newline', tag)
		}},
	]])
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
	
	function parse_args(type, arglist, ext) {
		let map = {}
		let list = []
		if (arglist!=null)
			for (let arg of arglist.split(";")) {
				let [, name, value] = /^(?:([^=]*)=)?(.*)$/.exec(arg)
				if (name==undefined || name=="") // value or =value (this is to allow values to contain =. ex: [=1=2] is "1=2"
					list.push(value)
				else // name=value
					map[name] = value
			}
		return BLOCKS[type].arg_process(list, map, ext)
	}
	// start a new block
	function OPEN(type, text, args, body) {
		current = {
			type: type,
			tag: text,
			content: [],
			parent: current, // could just be a stack
		}
		if (body) {
			envs++
			current.body = true
		}
		if (args)
			current.args = args
	}
	// move up
	function up() {
		let o = current
		current = current.parent
		if (o.body)
			envs--
		return o
	}
	// complete current block
	function CLOSE() {
		// push the block + move up
		let o = up()
		if (o.type=='null_env') // special case: merge
			current.content.push(...o.content)
		else
			current.content.push(o)
	}
	// cancel current block (flatten)
	function CANCEL() {
		if (current.body || BLOCKS[current.type].auto_close)
			return CLOSE()
		let o = up()
		// if we just cancelled a table cell, we don't want to insert text into the table row/body,
		// so we complete the table first.
		if (o.type=='table_cell') {
			CLOSE() // todo: don't complete if empty?
			CLOSE()
		}
		// push the start tag (as text)
		if (o.tag)
			TEXT(o.tag) // todo: merge with surrounding text nodes?
		// push the contents of the block
		current.content.push(...o.content)
		let last = o.content[o.content.length-1]
	}
	// push text
	function TEXT(text) {
		if (text)
			current.content.push(text)
	}
	// push empty tag
	function TAG(type, text, args) {
		current.content.push({type: type, tag: text, args: args})
	}
	function KILL_WEAK() {
		while (BLOCKS[current.type].auto_cancel)
			CANCEL()
	}
	function START() {
		tree = {type:'ROOT',tag:"",content:[]}
		current = tree
		envs = 0
	}
	function FINISH() {
		while (current.type!='ROOT')
			CANCEL()
		return tree
	}
	
	function parse(text) {
		START()
		
		let last = regex.lastIndex = 0
		for (let match; match=regex.exec(text); ) {
			// text before token
			TEXT(text.substring(last, match.index))
			// get token
			let group = match.indexOf("", 1) - 1
			let thing = groups[group]
			let tag = match[0]
			// parse args and {
			let body = thing.body
			if (thing.argtype) {
				let ar = arg_regex[thing.argtype]
				ar.lastIndex = regex.lastIndex
				let m = ar.exec(text)
				if (m) {
					tag += m[0]
					let args = m[1]
					body = m[2]
					thing.do(tag, args, body)
					last = regex.lastIndex = ar.lastIndex
				} else { // INVALID!
					// skip 1 char, try again
					regex.lastIndex = match.index+1
					last = match.index
					continue
				}
			} else {
				thing.do(tag)
				last = regex.lastIndex
			}
			// start of line
			if (body) {
				//text = text.substring(last)
				text = RegExp["$'"]
				last = regex.lastIndex = 0
			}
		}
		TEXT(text.substring(last))
		
		return FINISH()
	}
	
	///(?<![^\s({'"])[/](?![\s,'"])/
	
	//tODO: kill newlines around things
	
	// we need to remove any newline which comes directly after a block element
	// this INCLUDES things like, potentially
	
	// <i>
	//	  <table>
	//     ..
	//   </table>
	// </i>
	// <br>
	
	// other problem: 
	
	// what if you want to write like, "{...}". well that's fine
	// BUT if you are inside a tag, the } will close it.
	// maybe closing tags should need some kind of special syntax?
	// \tag{ ... \}  >{...\} idk..
	// or match paired {}s :  
	// \tag{ ...  {heck} ... } <- closes here
	
	return Object.seal({
		parse: parse,
		render: null,
		regex, groups,
		convert(text) {
			let tree = this.parse(text)
			return this.render(tree)
		}
	})
})()
