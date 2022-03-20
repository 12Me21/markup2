"use strict"

function creator(type) {
	return document.createElement.bind(document, type)
}
let elem = document.createElement.bind(document)

let blocks = {
	ROOT: document.createDocumentFragment.bind(document),
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
		let e
		if (args['*']!=undefined)
			e = elem('th')
		else
			e = elem('td')
		let color = ['red','orange','yellow','green','blue','purple','gray'].find(col=>args[col]!=undefined)
		if (color)
			e.dataset.bgcolor = color
		for (let a in args) {
			let m = /^(\d*)x(\d*)$/.exec(a)
			if (m) {
				if (m[1])
					e.colSpan = m[1]
				if (m[2])
					e.rowSpan = m[2]
			}
		}
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

function render_branch(tree) {
	// text
	if (typeof tree == 'string')
		return document.createTextNode(tree)
	
	// element
	let elem = blocks[tree.type](tree.args||{}, tree.tag)
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

function render(tree) {
	return render_branch(tree)
}
