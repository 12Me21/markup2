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
	let blocks = {
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
	

	
	/* NOTE:
		/^/ matches after a <newline> or <env> token
		/$/ matches end of string
		/<eol>/ matches end of line (replaced with /(?![^\n])/)
		/<args>/ matches "[...]" arguments (replaced with /(?:\[[^\]\n]*\])/)
		/()/ empty tags are used to mark token types
	*/
	let [regex, groups] = process_def([
		// 💎 NEWLINE
		[/\n/, {newline:true, do(tag) {
			while (!current.body && blocks[current.type].end_at_eol)
				cancel()
			TAG('newline', tag)
		}}],
		// 💎 HEADING
		[/^#{1,3}/, {args:3, do(tag, args, body) {
			args = parse_args('heading', args)
			OPEN('heading', tag, args, body)
		}}],
		// 💎 DIVIDER
		[/^---+<eol>/, {do(tag){
			TAG('line', tag)
		}}],
		// 💎 STYLE / 💎 STYLE END
		[/(?:[*][*]|__|~~|[/])(?=\w()|)/, { //todo: improve these
			do(tag) {
				OPEN('style', tag, tag)
			},
		},{
			do(tag) {
				// todo: should be checking for WEAK here?
				while (current.type=='style') { 
					if (current.args == tag) { // found opening
						current.type = {
							'**': 'bold',
							'__': 'underline',
							'~~': 'strikethrough',
							'/': 'italic',
						}[current.args]
						CLOSE()
						return
					}
					CANCEL() // different style (kill)
				}
				TEXT(tag)
			},
		}],
		// 💎 ENV
		[/[\\]\w+/, {args:1, do(tag, args, body) {
			let envtype = /^[\\](\w+)/.exec(tag)[1] //todo: use this
			args = parse_args('env', args)
			OPEN('env', tag, args, body)
		}}],
		//[/{/, {token:''}], // maybe
		// 💎 BLOCK END
		[/}/, {token:'block_end', do(tag) {
			if (envs<=0)
				TEXT(tag)
			else {
				while (!current.body)
					CANCEL()
				CLOSE()
			}
		}}],
		// 💎 ENV
		[/[\\]{/, {body:true, do(tag) {
			OPEN('null_env', tag, null, true)
		}}],
		// 💎 ESCAPED CHAR
		[/[\\][^]/, {do(tag) {
			if (tag=='\\\n')
				TAG('newline')
			else
				TEXT(tag.substr(1))
		}}], //todo: match surrogate pairs
		// 💎 QUOTE
		[/^>/, {args:2, do(tag, args, body) {
			args = parse_args('quote', args)
			OPEN('quote', tag, args, body)
		}}],
		// 💎 CODE BLOCK
		[/^```[^]*?\n```/, {do(tag) {
			TAG('code', tag, tag.slice(3,-3))
		}}],
		// 💎 INLINE CODE
		[/`[^`\n]+`/, {do(tag) {
			TAG('icode', tag, tag.slice(1,-1))
		}}],
		// 💎 EMBED / 💎 LINK
		[/(?:!())?(?:https?:[/][/]|sbs:)<url_char>*<url_final>/, {
			args:5, do(tag, args, body) {
				args = parse_args('embed', args, /^!([^[{]*)/.exec(tag)[1])
				TAG('embed', tag, args)
			}
		},{
			args:1, do(tag, args, body) {
				//todo: this is a hack
				let url = /^([^[{]*)/.exec(tag)[1]
				if (body) {
					args = parse_args('link', args, url)
					OPEN('link', tag, args, true)
				} else {
					args = parse_args('simple_link', args, url)
					TAG('simple_link', tag, args)
				}
			}
		}],
		// 💎 TABLE - NEXT ROW
		[/ *[|] *\n[|]/, {args:4, do(tag, args, body) {
			kill_styles()
			if (current.type!='table_cell')
				push_text(tag)
			else {
				args = parse_args('table_cell', args)
				CLOSE(); // cell
				CLOSE(); // row
				OPEN('table_row', "")
				OPEN('table_cell', tag.split("\n")[1], args, body)
			}
		}}],
		// 💎 TABLE - END
		[/ *[|] *<eol>/, {do(tag, args, body) {
			kill_styles()
			if (current.type!='table_cell') {
				TEXT(tag) // todo: wait, if this happens, we just killed all those blocks even though this tag isn't valid ??
			} else {
				CLOSE();
				CLOSE();
				CLOSE();
			}
		}}],
		// 💎 TABLE - START
		[/^ *[|]/, {args:4, do(tag, args, body) {
			args = parse_args('table_cell', args)
			OPEN('table', "")
			OPEN('table_row', "")
			OPEN('table_cell', tag, args, body)
		}}],
		// 💎 TABLE - NEXT CELL
		[/ *[|]/, {args:4, do(tag, args, body) {
			kill_styles()
			if (current.type!='table_cell')
				TEXT(tag)
			else {
				args = parse_args('table_cell', args)
				CLOSE() // cell
				OPEN('table_cell', tag.replace(/^ *[|]/,""), args, body)
			}
		}}],
		//[/^ *- /, 'list'],
	])
	
	function process_def(table) {
		//([^]*)
		let regi = []
		let groups = []
		for (let [regex, ...matches] of table) {
			let r = regex.source.replace(/<(\w+)>/g, (m,name)=>({
				eol: /(?![^\n])/,
				url_char: /[-\w./%?&=#+~@:$*',;!)(]/,
				url_final: /[-\w/%&=#+~@$*';)(]/,
			}[name].source))+"()"
			regi.push(r)
			
			groups.push(...matches)
		}
		let r = new RegExp(regi.join("|"), 'g')
		return [r, groups]
	}
	
	let arg_regex = [
		/(?:\[([^\]\n]*)\])?({)?/y,
		/(?:\[([^\]\n]*)\])?(?:({)| )/y,
		/(?:\[([^\]\n]*)\])?({)? */y,
		/(?:\[([^\]\n]*)\])? */y,
		/(?:\[([^\]\n]*)\])?/y,
	]
	

	
	function parse_args(type, arglist, ext) {
		let map = {}
		let list = []
		if (arglist!=null)
			for (let arg of arglist.split(";")) {
				let [, name, value] = /^(?:([^=]*)=)?(.*)$/.exec(arg)
				if (name==undefined) // value
					list.push(value)
				else if (name!="") // name=value
					map[name] = value
				else // =value (this is to allow values to contain =. ex: [=1=2] is "1=2"
					list.push(value)
			}
		return blocks[type].arg_process(list, map, ext)
	}
	// start a new block
	function OPEN(type, text, args, body) {
		current = {
			type: type,
			tag: text,
			content: [],
			parent: current, //todo: could just be a stack
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
		if (current.body || blocks[current.type].auto_close)
			return complete()
		let o = up()
		// if we just cancelled a table cell, we don't want to insert text into the table row/body
		// so instead we complete the table first.
		if (o.type=='table_cell') {
			complete() // todo: don't complete if empty?
			complete()
		}
		// push the start tag (as text)
		if (o.tag)
			push_text(o.tag) // todo: merge with surrounding text nodes?
		// push the contents of the block
		current.content.push(...o.content)
	}
	// push text
	function TEXT(text) {
		if (text!="") current.content.push(text)
	}
	// push empty tag
	function TAG(type, text, args) {
		current.content.push({type: type, tag: text, args: args})
	}
	function kill_styles() {
		while (blocks[current.type].auto_cancel)
			cancel()
	}
	function START() {
		tree = {type:'ROOT',tag:"",content:[]}
		current = tree
		envs = 0
	}
	function FINISH() {
		while (current.type!='ROOT')
			cancel()
		return tree
	}
	
	function parse(text) {
		START()
		
		let last = regex.lastIndex = 0
		for (let match; match=regex.exec(text); ) {
			// text before token
			push_text(text.substring(last, match.index))
			// get token
			let group = match.indexOf("", 1) - 1
			let thing = groups[group]
			let tag = match[0]
			// parse args and {
			let body = thing.body
			if (thing.args) {
				let ar = arg_regex[thing.args-1]
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
			if (thing.newline || body) {
				text = text.substring(last)
				last = regex.lastIndex = 0
			}
		}
		push_text(text.substring(last))
		
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
		convert(text) {
			let tree = this.parse(text)
			return this.render(tree)
		}
	})
})()
