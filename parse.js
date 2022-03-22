"use strict"

// auto_cancel - will be cancelled at the end of a block, if open
// auto_close - if cancelled, will be completed instead
//   any tag with a {...} body  - also counts as auto_close
// end_at_eol - cancelled at the end of a line (or completed if auto_close is set)

let envs = {
	spoiler: {},
}

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
	heading: {block:true, auto_close:true, end_at_eol:true},
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

function parser() {
	let tree = {type:'ROOT',tag:"",content:[]}
	let current = tree
	let envs = 0 // number of open envs
	
	return {
		finish() {
			while (current.type!='ROOT')
				cancel()
			return tree
		},
		push_tag: process,
		push_text: push_text,
	}
	
	// start a new block
	function newlevel(type, text, args, body) {
		current = {
			type: type,
			tag: text,
			content: [],
			parent: current,
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
		delete o.parent
		if (o.body)
			envs--
		return o
	}
	// complete current block
	function complete() {
		// push the block + move up
		let o = up()
		if (o.type=='null_env') // special case: merge
			current.content.push(...o.content)
		else
			current.content.push(o)
	}
	// cancel current block (flatten)
	function cancel() {
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
	function push_text(text) {
		if (text!="") current.content.push(text)
	}
	// push empty tag
	function push_tag(type, text, args) {
		current.content.push({type: type, tag: text, args: args})
	}
	function kill_styles() {
		while (blocks[current.type].auto_cancel)
			cancel()
	}
	
	function process(token, tag, args, body) {
		switch (token) {
		default: // SHOULD NEVER HAPPEN
			console.error('unknown node', token, tag, args, body)
			return push_text(info.tag)
		case 'newline':
			while (blocks[current.type].end_at_eol)
				cancel()
			return push_tag('newline', tag)
		case 'heading':
			args = parse_args('heading', args)
			return newlevel('heading', tag, args, body)
		case 'line':
			return push_tag('line', tag)
		case 'link':
			//todo: this is a hack
			// see note in lex.js about extra parse step...
			let url = /^([^[{]*)/.exec(tag)[1]
			if (body) {
				args = parse_args('link', args, url)
				return newlevel('link', tag, args, true)
			}
			args = parse_args('simple_link', args, url)
			return push_tag('simple_link', tag, args)
		case 'embed':
			args = parse_args('embed', args, /^!([^[{]*)/.exec(tag)[1])
			return push_tag('embed', tag, args)
		case 'icode':
			return push_tag('icode', tag, tag.slice(1,-1))
			case 'code':
			return push_tag('code', tag, tag.slice(3,-3))
		case 'style':
			return newlevel('style', tag, tag)
		case 'style_end':
			while (current.type=='style') { // should be checking for WEAK here?
				if (current.args == tag) { // found opening
					current.type = {
						'**': 'bold',
						'__': 'underline',
						'~~': 'strikethrough',
						'/': 'italic',
					}[current.args]
					return complete()
				}
				cancel() // different style (kill)
			}
			return push_text(tag)
		case 'null_env':
			return newlevel('null_env', tag, null, body)
		case 'env':
			let envtype = /^[\\](\w+)/.exec(tag)[1] //todo: use this
			args = parse_args('env', args)
			return newlevel('env', tag, args, body)
		case 'block_end':
			if (envs<=0)
				return push_text(tag)
			while (!current.body)
				cancel()
			return complete()
		case 'escape':
			if (tag=='\\\n')
				return push_tag('newline')
			return push_text(tag.substr(1))
		case 'table':
			args = parse_args('table_cell', args)
			newlevel('table', "") // table
			newlevel('table_row', "") // row
			return newlevel('table_cell', tag, args, body) // cell
		case 'table_cell':
			kill_styles()
			if (current.type!='table_cell')
				return push_text(tag)
			args = parse_args('table_cell', args)
			complete() // cell
			return newlevel('table_cell', tag.replace(/^ *[|]/,""), args, body) // cell // remove the | because it was used to "close" the previous cell. we may need to do this in other places...
		case 'table_row':
			kill_styles()
			if (current.type!='table_cell')
				return push_text(tag)
			args = parse_args('table_cell', args)
			complete();complete() // cell/row
			newlevel('table_row', "") // row
			return newlevel('table_cell', tag.split("\n")[1], args, body) // cell
		case 'table_end':
			kill_styles()
			if (current.type!='table_cell')
				return push_text(tag) // todo: wait, if this happens, we just killed all those blocks even though this tag isn't valid ??
			complete();
			complete();
			return complete();
		}
	}
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
