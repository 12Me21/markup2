"use strict"

let regi = []
let types = []
;[
	/\n/, 'newline',
	
	/^#{1,3} /, 'heading',
	/^---+$/, 'line',
	
	/(?:[*][*]|__|~~|[/])(?=\w()|\W|$)/, 'style', 'style_end', 
	
	/[\\](?:{|\w+(?:\[.*?\])?{?)/, 'env',
	/}/, 'env_end',
	/^>(?:\[.*?\])?[{ ]/, 'quote',
	/[\\][^]/, 'escape',
	
	/`.*?`/, 'icode',
	/^```[^]*?^```/, 'code',
	
	/!?(?:https?:[/][/]|sbs:)[-\w./%?&=#+~@:$*',;!)(]*[-\w/%&=#+~@$*';)(](?:\[.*?\])?/, 'link',
	
	/ *[|] *$(?!\n[|])/, 'table_end',
	/ *(?:[|] *\n()|^()|)[|](?:\[.*?\])? */, 'table_row', 'table', 'table_cell',
	
	///^ *- /, 'list',
].forEach(item=>{
	if (item instanceof RegExp)
		regi.push(item.source+"()")
	else
		types.push(item)
})
let r = new RegExp("("+regi.join("|")+")", 'm')
let step = types.length+2

// later we'll leave these as numbers
function check_tag(text, tag, type) {
	return types[type]
}

function parse(text) {
	let tokens = "*glass shattering noises*".split.call(text, r)
	
	let tree = {type:'ROOT',tag:"",content:[]}
	let current = tree
	let envs = 0 // number of open envs
	
	// filter tags
	let bac = ""
	let i;
	for (i=0; i<tokens.length-1; i+=step) {
		let text = tokens[i], tag_text = tokens[i+1]
		let type = tokens.indexOf("", i+2) - (i+2)
		type = check_tag(text, tag_text, type)
		if (type==null) {
			bac += text+tag_text
		} else {
			push_text(bac+text)
			bac = ""
			process(type, tag_text)
		}
	}
	// last piece of text
	push_text(bac+tokens[i])
	
	// finalize tree
	while (current.type!='ROOT')
		cancel()
	
	return tree
	
	// start a new block
	function newlevel(type, text) {
		current = {
			type:type,
			tag:text,
			content:[],
			parent:current,
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
			current.content.push({type: null, content: text})
	}
	// push empty tag
	function push_tag(type) {
		current.content.push({type: type, content: null})
	}
	
	function kill_styles() {
		while (current.type=='style')
			cancel()
	}
	
	function process(type, text) {
		switch (type) {
		case 'newline':
			while (1)
				if (current.type=='heading')
					complete()
				else if (current.type=='style')
					cancel()
				else
					break
			push_tag(type)
		break;case 'heading':
			newlevel(type, text)
		break;case 'line': case 'icode': case 'code': case 'link':
			push_tag(type)
		break;case 'style':
			newlevel(type, text)
		break;case 'style_end':
			while (1) {
				if (current.type=='style') {
					if (current.tag == text) { // found opening
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
				complete()
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
				complete() // cell
				newlevel(type, text) // cell
			} else
				push_text(text)
		break;case 'table_row':
			kill_styles()
			if (current.type=='table_cell') {
				complete() // cell
				complete() // row
				newlevel('table_row', "") // row
				newlevel('table_cell', text.split("\n")[1]) // cell
			} else
				push_text(text)
		break;case 'table_end':
			kill_styles()
			if (current.type=='table_cell') {
				complete() // cell
				complete() // row
				complete() // table
			} else
				push_text(text)
		}
	}
}

let elems = {
	newline: 'br',
	heading: 'h1',
	line: 'hr',
	style: 'i',
	env: 'b', //todo
	env1: 'input',
	quote: 'blockquote',
	icode: 'code',
	code: 'pre',
	link: 'a',
	table: 'table',
	table_row: 'tr',
	table_cell: 'td'
}

function render(tree) {
	let elem
	if (!tree.type) {
		elem = document.createTextNode(tree.content)
	} else {
		if (tree.type=='ROOT')
			elem = document.createDocumentFragment()
		else
			elem = document.createElement(elems[tree.type])	
		if (tree.content)
			for (let i of tree.content)
				elem.append(render(i))
	}
	return elem
}

///(?<![^\s({'"])[/](?![\s,'"])/

//tODO: kill newlines around things

// hey we can stream parse now?
