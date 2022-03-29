Markup.IMPORT = EXPORT=>{
	"use strict"
	
	let creator = document.createElement.bind.bind(document.createElement, document)
	let elem = document.createElement.bind(document)
	let frag = document.createDocumentFragment.bind(document)
	
	let is_block = {
		code:'block', line:'block', ROOT:'block', heading:'block', quote:'block', table:'block',
		table_cell:'block',
	}
	
	function 𐀶([html]) {
		let t = document.createElement('template')
		t.innerHTML = html
		return t.content
	}
	
	let TEMPLATES = {
		newline: 𐀶`<br>`,
		divider: 𐀶`<hr>`,
		code: 𐀶`<pre>`,
		icode: 𐀶`<icode>`,
		simple_link: 𐀶`<a>`,
		image: 𐀶`<img data-loading data-shrink tabindex=-1>`,
		error: 𐀶`<div class='error'><code>🌱error🌱</code><br id=message><pre><br id=stack>`,
		audio: 𐀶`<audio controls preload=none>`,
		italic: 𐀶`<i>`,
		bold: 𐀶`<b>`,
		strikethrough: 𐀶`<s>`,
		underline: 𐀶`<u>`,
		heading: null, // how are we... maybe have an override or
		quote: 𐀶`<blockquote><cite>🌱cite🌱`,
		table: 𐀶`<table><tbody>`,
		table_row: 𐀶`<tr>`,
		table_cell: null,
		link: 𐀶`<a>`,
		list: null,
		list_item: 𐀶`<li>`,
		align: 𐀶`<div>`,
		subscript: 𐀶`<sub>`,
		superscript: 𐀶`<sup>`,
		anchor: 𐀶`<a>`,
		ruby: 𐀶`<ruby><br id=inside><rp>(<rt><br id=top><rp>(`,
		spoiler: 𐀶`<button class=spoilerButton><br id=button></button><div class=spoiler><br id=inside>`,
		background_color: 𐀶`<span>`,
	}
	
	let CREATE = {
		// blocks without children:
		newline: creator('br'),
		divider: creator('hr'),
		code({text, lang}) {
			let x = elem('pre')
			x.textContent = args
			return x
		},
		icode({text}) {
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
		image({url, alt, width, height}) {
			let e = elem('img')
			e.src = url
			e.dataset.loading = ""
			e.dataset.shrink = ""
			e.onerror = e.onload = ()=>{
				delete e.dataset.loading
			}
			e.tabIndex = -1
			if (alt!=null) e.alt = alt
			if (width) e.width = width
			if (height) e.height = height
			return e
		},
		error({error, stack}) {
			let node = elem('div')
			node.className = "error"
			let err = elem('code')
			err.textContent = error
			node.append("Markup parsing error: ", err, "\nPlease report this!")
			if (stack) {
				let pre = elem('pre')
				pre.textContent = stack
				node.append(pre)
			}
			return node
		},
		audio({url}) {
			let node = elem('audio')
			node.controls = true
			node.src = url
			node.preload = 'none'
			return node
		},
		// blocks with children:
		ROOT: frag,
		italic: creator('i'),
		bold: creator('b'),
		strikethrough: creator('s'),
		underline: creator('u'),
		heading({level}) {
			return elem("h"+level)
		},
		quote({cite}) {
			let x = elem('blockquote')
			if (cite!=null) {
				let c = elem('cite')
				c.textContent = cite
				x.append(c)
			}
			return x
		},
		table() {
			let x = elem('table')
			let y = elem('tbody')
			x.append(y)
			x.B = y
			return x
		},
		table_row: creator('tr'),
		table_cell({header, color, truecolor, colspan, rowspan, align}) {
			let e = elem(header ? 'th' : 'td')
			if (color) e.dataset.bgcolor = color
			if (truecolor) e.style.backgroundColor = truecolor
			if (colspan) e.colSpan = colspan
			if (rowspan) e.rowSpan = rowspan
			if (align) e.style.textAlign = align
			return e
		},
		link({url}) {
			let x = elem('a')
			x.href = url
			return x
		},
		list({style}) {
			if (style==null)
				return elem('ul')
			let list = elem('ol')
			list.style.listStyleType = style
			return list
		},
		list_item: creator('li'),
		align({align}) {
			let e = elem('div')
			e.style.textAlign = align
			return e
		},
		subscript: creator('sub'),
		superscript: creator('sup'),
		anchor({name}) {
			let e = elem('a')
			e.name = "_anchor_"+name
			return e
		},
		ruby({text}) {
			let e = elem('ruby')
			let first = elem('span')
			let x1 = elem('rp')
			x1.textContent = "("
			let x2 = elem('rt')
			x2.textContent = text
			let x3 = elem('rp')
			x3.textContent = ")"
			e.append(first, x1, x2, x3)
			e.B = first
			return e
		},
		spoiler({label}) {
			let button = elem('button')
			button.className = 'spoilerButton'
			button.onclick = ()=>{
				if (button.dataset.show == null)
					button.dataset.show = ""
				else
					delete button.dataset.show
			}
			button.textContent = label
			
			let box = elem('div')
			box.className = "spoiler"
			
			let node = frag()
			node.append(button, box)
			node.B = box
			
			return node
		},
		background_color({color}) {
			let e = elem('span')
			if (color)
				e.dataset.bgcolor = color
			return e
		},
	}
	
	function fill_branch(branch, leaves) {
		// children
		let prev = 'newline'
		let all_newline = true
		for (let leaf of leaves) {
			if (typeof leaf == 'string') {
				all_newline = false
				branch.append(leaf)
				prev = 'text'
			} else if (leaf == true) {
				if (prev!='block')
					branch.append(CREATE.newline())
				prev = 'newline'
			} else {
				all_newline = false
				let node = CREATE[leaf.type](leaf.args, leaf.tag)
				branch.append(node)
				if (leaf.content)
					prev = fill_branch(node.B||node, leaf.content)
				else
					prev = 'text'
				prev = is_block[leaf.type] || prev
			}
		}
		if (prev=='newline' && !all_newline)
			branch.append(CREATE.newline())
		
		return prev
	}
	
	EXPORT.render = function(tree) {
		let root = frag()
		fill_branch(root, tree.content)
		return root
	}
	
	EXPORT.TEMPLATES = TEMPLATES
	
	EXPORT.create = CREATE
}

//let append = Node.appendChild.call
