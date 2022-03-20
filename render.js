"use strict"

function creator(type) {
	return document.createElement.bind(document, type)
}
let elem = document.createElement.bind(document)
let frag = document.createDocumentFragment.bind(document)

let db = {
	ROOT:1,line:1,quote:1,table:1,code:1
}
let dbi = {
	ROOT:1,line:1,quote:1,table_cell:1,code:1
}

let blocks = {
	ROOT: frag,
	newline: creator('br'),
	line: creator('hr'),
	italic: creator('i'),
	bold: creator('b'),
	strikethrough: creator('s'),
	underline: creator('u'),
	quote(args) {
		let x = elem('blockquote')
		return x
	},
	table() {
		let x = elem('table')
		let y = elem('tbody')
		x.append(y)
		return [x, y]
	},
	table_row: creator('tr'),
	table_cell(args) {
		let header, color, cs, rs
		// TODO:
		// arg processing should be a separate step, perhaps
		// then we just pass {header,color,cs,rs} to the render function.
		for (let a of args) {
			if (a=="*") // should this be * or # or h ?  // perhaps # = heading applied to entire row?
				header = true
			else if (/^(red|orange|yellow|green|blue|purple|gray)$/.test(a))
				color = a
			else {
				let m = /^(\d*)x(\d*)$/.exec(a)
				if (m) {
					cs = +m[1]
					rs = +m[2]
				} else {
					//...
				}
			}
		}
		let e = elem(header ? 'th' : 'td')
		if (color)
			e.dataset.bgcolor = color
		if (cs)
			e.colSpan = cs
		if (rs)
			e.rowSpan = rs
		return e
	},
	code(args, contents) {
		let x = elem('pre')
		x.textContent = contents
		return x
	},
	icode(args, contents) {
		let x = elem('code')
		x.textContent = contents
		return x
	},
	link(args, contents) {
		let x = elem('a')
		x.textContent = contents
		
		let url = contents
		if (/^ *javascript:/i.test(url))
			url = ""
		x.href = url
		
		return x
	},
}

let no_args = []
no_args.k = {}

function render_branch(tree) {
	// text
	if (typeof tree == 'string')
		return document.createTextNode(tree)
	
	// element
	let elem = blocks[tree.type](tree.args||no_args, tree.tag)
	let branch
	if (elem instanceof Array)
		([elem, branch] = elem)
	else
		branch = elem
	
	if (tree.content!=undefined) {
		for (let i of tree.content)
			branch.append(render_branch(i))
	}
	return elem
}

// todo: .normalize to combine text nodes? or is it better if we do that ourselves... normalize also kills empty nodes which is.. idk
function render(tree) {
	let f = render_branch(tree)
	f.normalize()
	return f
}


//TODO : ENOUGH OF_THIS!
// we just need to strip the newlines after block elements to match the symmetery
