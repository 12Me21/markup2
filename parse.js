"use strict"

// auto_cancel - will be cancelled at the end of a block, if open
// auto_close - if cancelled, will be completed instead
// end_at_eol - cancelled at the end of a line (or completed if auto_close is set)

let blocks = {
	// simple tags
	newline: {},
	link: {},
	code: {block:true},
	icode: {},
	line: {block:true},
	// with contents:
	ROOT: {block: true},
	heading: {block:true, auto_close:true, end_at_eol:true},
	style: {auto_cancel: true, end_at_eol:true},
	env: {auto_close:true},
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
						if (+m[1]) ret.colspan = +m[1]
						if (+m[2]) ret.rowspan = +m[2]
					} else { //...
					}
				}
			}
			return ret
		},
	},
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
	function newlevel(type, text) {
		current = {
			type: type,
			tag: text,
			content: [],
			parent: current,
		}
	}
	// move up
	function up() {
		let o = current
		current = current.parent
		delete o.parent
		if (o.type=='env')
			envs--
		return o
	}
	// complete current block
	function complete() {
		// push the block + move up
		let o = up()
		if (o.type=='env' && o.tag=="\\{") // special case: merge
			current.content.push(...o.content)
		else
			current.content.push(o)
	}
	// cancel current block (flatten)
	function cancel() {
		if (blocks[current.type].auto_close)
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
		if (text!="")
			current.content.push(text)
	}
	// push empty tag
	function push_tag(type, text) {
		current.content.push({type: type, tag: text})
	}
	
	function kill_styles() {
		while (blocks[current.type].auto_cancel)
			cancel()
	}
	
	// extract the [...] arglist from `current.tag` using `pattern`
	// then parse the contents and store the result in `current.args`
	function parse_args(pattern) {
		let match = pattern.exec(current.tag)
		if (!match)
			return
		let type = current.type
		let arglist = match[1]
		
		let map = {}
		let list = []
		for (let arg of arglist.split(";")) {
			let [, name, value] = /^(?:([^=]*)=)?(.*)$/.exec(arg)
			if (name==undefined) // value
				list.push(value)
			else if (name!="") // name=value
				map[name] = value
			else // =value (this is to allow values to contain =. ex: [=1=2] is "1=2"
				list.push(value)
		}
		current.args = blocks[type].arg_process(list, map)
	}
	
	function process(type, text) {
		switch (type) {
		default: // SHOULD NEVER HAPPEN
			console.error('unknown node', type, text)
			push_text(text)
		case 'newline':
			while (blocks[current.type].end_at_eol)
				cancel()
			push_tag('newline')
		break;case 'heading': newlevel(type, text)
		break;case 'line': case 'link': case 'env1':
			push_tag(type, text)
		break;case 'icode':
			push_tag(type, text.slice(1,-1))
		break;case 'code':
			push_tag(type, text.slice(3,-3))
		break;case 'style':
			newlevel(type, text)
		break;case 'style_end':
			while (1) {
				if (current.type=='style') {
					if (current.tag == text) { // found opening
						current.type = {
							'**': 'bold',
							'__': 'underline',
							'~~': 'strikethrough',
							'/': 'italic',
						}[current.tag]
						complete()
						break
					} else { // different style (kill)
						cancel()
					}
				} else { // another block
					push_text(text)
					break
				}
			}
		break;case 'env':
			envs++
			newlevel(type, text)
		break;case 'env_end':
			if (envs<=0)
				push_text(text)
			else {
				while (current.type!='env')
					cancel()
				let tag = current.tag
				if (tag!="\\{") {
					// real tag: \name or \name[args]
					current.envtype = /^[\\](\w+)/.exec(tag)[1] // what if we just set .type to like, "env_<type>"
					parse_args(/\[(.*?)\]{?$/)
				}
				complete()
			}
		break;case 'escape':
			let c = text.substr(1)
			if (c=='\n')
				push_tag('newline')
			else
				push_text(text.substr(1))
		break;case 'table':
			newlevel('table', "") // table
			newlevel('table_row', "") // row
			newlevel('table_cell', text) // cell
		break;case 'table_cell':
			kill_styles()
			if (current.type=='table_cell') {
				parse_args(/\[(.*?)\] *$/)
				complete() // cell
				newlevel(type, text.replace(/^ *[|]/,"")) // cell // remove the | because it was used to "close" the previous cell. we may need to do this in other places...
			} else
				push_text(text)
		break;case 'table_row':
			kill_styles()
			if (current.type=='table_cell') {
				parse_args(/\[(.*?)\] *$/)
				complete() // cell
				complete() // row
				newlevel('table_row', "") // row
				newlevel('table_cell', text.split("\n")[1]) // cell
			} else
				push_text(text)
		break;case 'table_end':
			kill_styles()
			if (current.type=='table_cell') {
				parse_args(/\[(.*?)\] *$/)
				complete() // cell
				complete() // row
				complete() // table
			} else
				push_text(text)
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
