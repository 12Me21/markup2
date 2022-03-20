"use strict"

let regi = []
let types = []
;[
	/\n/, 'newline',
	
	/^#{1,3}@@@? /, 'heading',
	/^---+$/, 'line',
	
	/(?:[*][*]|__|~~|[/])(?=\w()|\W|$)/, 'style', 'style_end', 
	
	/[\\](?:{|\w+@@@?{?)/, 'env',
	/}/, 'env_end',
	/^>@@@?[{ ]/, 'quote',
	/[\\][^]/, 'escape',
	
	/^```[^]*?^```/, 'code',
	/`[^`\n]+`/, 'icode',
	
	/!?(?:https?:[/][/]|sbs:)[-\w./%?&=#+~@:$*',;!)(]*[-\w/%&=#+~@$*';)(](?:\[.*?\])?@@@?/, 'link',
	
	/ *[|] *$(?!\n[|])/, 'table_end',
	/ *(?:[|] *\n()|^()|)[|]@@@? */, 'table_row', 'table', 'table_cell',
	
	///^ *- /, 'list',
].forEach(item=>{
	if (item instanceof RegExp)
		regi.push(item.source.replace(/@@@/g,/(?:\[[^\]\n]*\])/.source)+"()")
	else
		types.push(item)
})
let r = new RegExp("("+regi.join("|")+")", 'm')
let step = types.length+2

let envs = {
//	'key', 'anchor', 'spoiler'
}

function parse(text) {
	let tokens = "*glass shattering noises*".split.call(text, r)
	
	let tree = {type:'ROOT',tag:"",content:[]}
	let current = tree
	let envs = 0 // number of open envs
	
	// for each match:
	let i;
	for (i=0; i<tokens.length-1; i+=step) {
		let group = tokens.indexOf("", i+2) - (i+2)
		push_text(tokens[i])
		process(types[group], tokens[i+1])
	}
	push_text(tokens[i])
	
	// finalize tree
	while (current.type!='ROOT')
		cancel()
	
	return tree
	
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
		if (o.type=='env')
			envs--
		return o
	}
	// complete current block
	function complete() {
		// push the block + move up
		let o = up()
		current.content.push(o)
	}
	// cancel current block (flatten)
	function cancel() {
		let o = up()
		// push the start tag (as text)
		push_text(o.tag) // todo: merge with surrounding text nodes?
		// push the contents of the block
		current.content.push(...o.content)
	}
	// push text
	function push_text(text) {
		if (text)
			current.content.push(text)
	}
	// push empty tag
	function push_tag(type, text) {
		current.content.push({type: type, tag: text})
	}
	
	function kill_styles() {
		while (current.type=='style')
			cancel()
	}
	
	function parse_args(str) {
		let map = {}
		let list = []
		if (str!=undefined)
			for (let arg of str.split(";")) {
				let [, name, value] = /^(?:([^=]*)=)?(.*)$/.exec(arg)
				if (name==undefined) // value
					list.push(value)
				else if (name!="") // name=value
					map[name] = value
				else // =value (this is to allow values to contain =. ex: [=1=2] is "1=2"
					list.push(value)
			}
		list.k = map
		return list
	}
	
	function process(type, text) {
		switch (type) {
		default:
			push_text(text)
		case 'newline':
			while (1)
				if (current.type=='heading')
					complete()
				else if (current.type=='style')
					cancel()
				else
					break
			push_text("\n")
		break;case 'heading':
			newlevel(type, text)
		break;case 'line': case 'icode': case 'code': case 'link':
			push_tag(type, text)
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
			if (text.endsWith('{')) {
				envs++
				newlevel(type, text)
			} else
				push_tag('env1')
		break;case 'env_end':
			if (envs<=0)
				push_text(text)
			else {
				while (current.type!='env')
					cancel()
				let tag = current.tag
				// null tag: merge directly into tree
				if (tag=="\\{") {
					current.tag = ""
					cancel()
				} else {
					// real tag: \name or \name[args]
					let [, name, args] = /^[\\](\w+)(?:\[(.*?)\])?/.exec(tag)
					current.envtype = name
					current.args = parse_args(args)
				}
			}
		break;case 'escape':
			push_text(text.substr(1))
		break;case 'table':
			newlevel('table', "") // table
			newlevel('table_row', "") // row
			newlevel('table_cell', text) // cell
		break;case 'table_cell':
			kill_styles()
			if (current.type=='table_cell') {
				let m = /[|]\[(.*?)\] *$/.exec(current.tag)
				if (m)
					current.args = parse_args(m[1])
				complete() // cell
				newlevel(type, text) // cell
			} else
				push_text(text)
		break;case 'table_row':
			kill_styles()
			if (current.type=='table_cell') {
				let m = /[|]\[(.*?)\] *$/.exec(current.tag)
				if (m)
					current.args = parse_args(m[1])
				complete() // cell
				complete() // row
				newlevel('table_row', "") // row
				newlevel('table_cell', text.split("\n")[1]) // cell
			} else
				push_text(text)
		break;case 'table_end':
			kill_styles()
			if (current.type=='table_cell') {
				let m = /[|]\[(.*?)\] *$/.exec(current.tag)
				if (m)
					current.args = parse_args(m[1])
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

// what if we parse arglists as something like:
// just scan for [...] everywhere, and
// then later in the tree building step, we can check like
// if the previous thing was something which takes arguments, then we apply those args
// otherwise just insert the block literally
// the one issue is like, how to handle \env[...]{
// where the { goes after...
// perhaps we can parse for [...]{? and then uh
// handle that later...
// oh except...
// this won't work, because if there's a [...] which is NOT an arg list,
// now the parser is going to skip over it... yeah...
