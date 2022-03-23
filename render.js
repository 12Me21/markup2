Markup.render = (function(){
	"use strict"
	
	function creator(type) {
		return document.createElement.bind(document, type)
	}
	let elem = document.createElement.bind(document)
	let frag = document.createDocumentFragment.bind(document)
	
	let blocks = {
		ROOT: frag,
		newline() {
			let f = frag()
			f.append(elem('br'), document.createTextNode(""))
			return f
		},
		heading: creator('h2'),
		line: creator('hr'),
		italic: creator('i'),
		bold: creator('b'),
		strikethrough: creator('s'),
		underline: creator('u'),
		quote(args) {
			let x = elem('blockquote')
			return x
		},
		table(args) {
			let x = elem('table')
			let y = elem('tbody')
			x.append(y)
			return [x, y]
		},
		table_row: creator('tr'),
		table_cell({header, color, colspan, rowspan}) {
			let e = elem(header ? 'th' : 'td')
			if (color) e.dataset.bgcolor = color
			if (colspan) e.colSpan = colspan
			if (rowspan) e.rowSpan = rowspan
			return e
		},
		code(args) {
			let x = elem('pre')
			x.textContent = args
			return x
		},
		icode(args) {
			let x = elem('code')
			x.textContent = args.replace(/ /g, " ")
			return x
		},
		simple_link({url, text}) {
			let x = elem('a')
			x.textContent = text
			x.href = url
			return x
		},
		link({url}) {
			let x = elem('a')
			x.href = url
			return x
		},
		embed({url}) {
			let x = elem('img')
			x.src = url
			return x
		},
		env() {
			let x = elem('input')
			return x
		}
	}
	
	function render_branch(tree) {
		// text
		if (typeof tree == 'string')
			return document.createTextNode(tree)
		
		// element
		let elem = blocks[tree.type](tree.args, tree.tag)
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
	
	return function(tree) {
		return render_branch(tree)
	}
}())
