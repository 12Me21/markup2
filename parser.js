"use strict"

let regi = []
let types = []
;[
	/\n/, 'newline',
	
	/^#{1,3} /, 'heading',
	/^---+$/, 'line',
	
	/(?:[*][*]|__|~~|[/])(?!\W()|\w)/, 'style_start', 'style_end',
	
	/[\\](?:{|\w+(?:\[.*?\])?{?)/, 'env_start',
	/}/, 'env_end',
	/^>(?:\[.*?\])?[{ ]/, 'quote_start',
	/[\\][^]/, 'escape',
	
	/`.*?`/, 'icode',
	/^```[^]*?^```/, 'code',
	
	/!?(?:https?:[/][/]|sbs:)[-\w./%?&=#+~@:$*',;!)(]*[-\w/%&=#+~@$*';)(](?:\[.*?\])?/, 'link',
	
	/ *[|] *$(?!\n[|])/, 'table_end',
	/ *(?:[|] *\n()|^()|)[|](?:\[.*?\])? */, 'table_row', 'table_start', 'table_cell',
	
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

function lex(text) {
	let tokens = String.prototype.split.call(text, r)
	
	// filter tags
	let list = []
	let bac = ""
	let i;
	for (i=0; i<tokens.length-1; i+=step) {
		let text = tokens[i], tag_text = tokens[i+1]
		let type = tokens.indexOf("", i+2) - (i+2)
		type = check_tag(text, tag_text, type)
		if (type!=null) {
			bac += text
			if (bac)
				list.push([null,bac])
			list.push([type,tag_text])
			bac = ""
		} else {
			bac += text+tag_text
		}
	}
	bac += tokens[i]
	if (bac)
		list.push([null,bac])
	
	return list
}

// text <i> more text </i>

let open = {
	heading: true, style_start: true, env_start: true,
	quote_start: true,
	table_start: true,
	
}

function prune(tokens) {
	let tree = []
	let current = tree
	tree.type = null
	tree.tag = ""
	
	// start a new block
	function newlevel(token) {
		let n = []
		n.parent = current
		n.type = token[0]
		n.tag = token[1]
		current = n
	}
	// complete current block
	function complete() {
		let p = current.parent
		delete current.parent
		p.push([current.type, current])
		current = p
	}
	// cancel current block (flatten)
	function cancel() {
		let p = current.parent
		p.push([null,current.tag]) // insert the start tag as text
		p.push(...current) // insert the contents of the failed block
		current = p // move up
	}
	// push a tag
	function push(token) {
		current.push([token[0], null])
	}
	function push_text(text) {
		current.push([null, text])
	}
	
	for (let token of tokens) {
		let [type,text] = token
		if (type==null) {
			push_text(token)
		} else if (type=='heading') {
			newlevel(token)
		} else if (type=='newline') {
			while (1) {
				if (current.type=='heading')
					complete()
				else if (current.type=='style_start')
					cancel()
				else
					break
			}
		} else if (type=='line' || type=='icode' || type=='code' || type=='link') {
			push(token)
		} else if (type=='style_start') {
			newlevel(token)
		} else if (type=='style_end') {
			while (1) {
				if (current.type=='style_start') {
					if (current.tag == text) {
						complete()
						break
					} else
						cancel()
				} else {
					push_text(text)
					break
				}
			}
		} else if (type=='env_start') {
			newlevel(token)
		} else if (type=='env_end') {
			while (1) {
				if (current.type=='env_start') {
					complete()
					break
				} else if (!current.type) { // todo: we need to CHECK if an env is open before starting this loop
					complete()
					break
				} else {
					cancel()
				}
			}
		} else if (type=='escape') {
			push_text(text.substr(1))
		} else if (type=='table_start') {
			newlevel(['table', ""]) // table
			newlevel(['table_row', ""]) // row
			newlevel(['table_cell', text]) // cell
		} else if (type=='table_cell') {
			while (1) {
				if (current.type=='style_start') {
					cancel()
				} else if (current.type=='table_cell') {
					complete()
					newlevel(token) // cell
					break
				} else {
					push_text(text)
					break
				}
			}
		} else if (type=='table_row') {
			while (1) {
				if (current.type=='style_start') {
					cancel()
				} else if (current.type=='table_cell') {
					complete() // cell
					complete() // row
					newlevel(['table_row', ""]) // row
					newlevel(['table_cell', text]) // cell
					break
				} else {
					push_text(text)
					break
				}
			}
		} else if (type=='table_end') {
			while (1) {
				if (current.type=='style_start') {
					cancel()
				} else if (current.type=='table_cell') {
					complete() // cell
					complete() // row
					complete() // table
					break
				} else {
					push_text(text)
					break
				}
			}
		}
	}
	while (1) {
		if (current.type)
			cancel()
		else
			break
	}
	
	return tree
}

///(?<![^\s({'"])[/](?![\s,'"])/
