Markup.render = (function(){
	"use strict"
	
	function creator(type) {
		return document.createElement.bind(document, type)
	}
	let elem = document.createElement.bind(document)
	let frag = document.createDocumentFragment.bind(document)
	
	let is_block = {
		code:1, line:1, ROOT:1, heading:1, quote:1, table:1,
		table_cell:1,
	}
	
	let blocks = {
		ROOT: frag,
		newline: creator('br'),
		heading: creator('h2'),
		divider: creator('hr'),
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
		// element
		let elem = blocks[tree.type](tree.args, tree.tag)
		let branch
		if (elem instanceof Array)
			([elem, branch] = elem)
		else
			branch = elem
		
		let last_block = false
		
		if (tree.content!=undefined) {
			let got_newline = false
			for (let i of tree.content) {
				if (typeof i == 'string') {
					if (got_newline && !last_block)
						branch.append(blocks.newline())
					got_newline = false
					branch.append(i)
					last_block = false
				} else if (i.type=='newline') {
					if (got_newline && !last_block)
						branch.append(blocks.newline())
					got_newline = true
					last_block = false
				} else {
					let [elem, is_block] = render_branch(i)
					if (got_newline) {
						if (!is_block)
							branch.append(blocks.newline())
						branch.append("")
					}
					got_newline = false
					branch.append(elem)
					last_block = is_block
				}
			}
			if (got_newline) {
				if (!last_block)
					branch.append(blocks.newline())
				branch.append("")
				last_block = false
			}
		}
		return [elem, last_block || is_block[tree.type]]
	}
	
	return function(tree) {
		return render_branch(tree)[0]
	}
}())
