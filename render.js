Markup.IMPORT = EXPORT=>{
	"use strict"
	
	let is_block = {
		code:'block', line:'block', ROOT:'block', heading:'block', quote:'block', table:'block',
		table_cell:'block',
	}
	
	function 𐀶([html]) {
		let t = document.createElement('template')
		t.innerHTML = html//.replace(/🕯\w+🕯/g, "<br id=$&>").replace(/>🌿/g, " id=B>")
		let c = t.content
		if (c.childNodes.length==1)
			c = c.childNodes[0]
		return c.cloneNode.bind(c, true)
	}
	
	let CREATE = {
		newline: 𐀶`<br>`,
		
		divider: 𐀶`<hr>`,
		
		code: function({text, lang}) {
			let x = this()
			x.textContent = text
			return x
		}.bind(𐀶`<pre>`),
		
		icode: function({text}) {
			let x = this()
			x.textContent = text.replace(/ /g, " ")
			return x
		}.bind(𐀶`<code>`),
		
		simple_link: function({url, text}) {
			let x = this()
			x.textContent = text
			x.href = url
			return x
		}.bind(𐀶`<a href="">`),
		
		image: function({url, alt, width, height}) {
			let x = this()
			x.src = url
			x.onerror = x.onload = x.removeAttribute.bind(x, 'loading')
			if (alt!=null) x.alt = alt
			if (width) x.width = width
			if (height) x.height = height
			return x
		}.bind(𐀶`<img data-loading data-shrink tabindex=-1>`),
		
		error: 𐀶`<div class='error'><code>🕯error🕯</code>🕯message🕯<pre>🕯stack🕯`,
		audio: 𐀶`<audio controls preload=none>`,
		
		italic: 𐀶`<i>`,
		
		bold: 𐀶`<b>`,
		
		strikethrough: 𐀶`<s>`,
		
		underline: 𐀶`<u>`,
		
		heading: function({level}) {
			return this[level-1]()
		}.bind([𐀶`<h1>`,𐀶`<h2>`,𐀶`<h3>`,𐀶`<h4>`]),
		
		quote: function({cite}) {
			if (cite==null)
				return this[0]()
			let x = this[1]()
			let c = x.getElementById('cite')
			c.id = ""
			c.textContent = cite
			return x
		}.bind([𐀶`<blockquote>`, 𐀶`<blockquote><cite id=cite>`]),
		
		table: 𐀶`<table>`, // todo: <tbody> ?
		
		table_row: 𐀶`<tr>`,
		
		table_cell: function({header, color, truecolor, colspan, rowspan, align}) {
			let e = this[header?1:0]()
			if (color) e.dataset.bgcolor = color
			if (truecolor) e.style.backgroundColor = truecolor
			if (colspan) e.colSpan = colspan
			if (rowspan) e.rowSpan = rowspan
			if (align) e.style.textAlign = align
			return e
		}.bind([𐀶`<td>`,𐀶`<th>`]),
		
		link: function({url}) {
			let x = this()
			x.href = url
			return x
		}.bind(𐀶`<a target=_blank href=""></a>`),
		
		list: function({style}) {
			if (style==null)
				return this[0]()
			let x = this[1]()
			x.style.listStyleType = style
			return x
		}.bind([𐀶`<ul>`, 𐀶`<ol>`]),
		
		list_item: 𐀶`<li>`,
		
		align: function({align}) {
			let e = this()
			e.style.textAlign = align
			return e
		}.bind(𐀶`<div>`),
		
		subscript: 𐀶`<sub>`,
		
		superscript: 𐀶`<sup>`,
		
		anchor: function({name}) {
			let e = this()
			e.name = "_anchor_"+name
			return e
		}.bind(𐀶`<a name="">`),
		
		ruby: function({text}) {
			let e = this()
			let branch = this.getElementById('branch')
			let top = this.getElementById('top')
			this.branch.id = ""
			this.top.id = ""
			top.textContent = text
			e.B = branch
			return e
		}.bind(𐀶`<ruby><span id=branch></span><rp>(<rt id=top><rp>(`),
		
		spoiler: function({label}) {
			let x = this()
			let btn = x.getElementById('button')
			let branch = x.getElementById('branch')
			btn.id = ""
			branch.id = ""
			btn.onclick = btn.toggleAttribute.bind(btn, 'data-show') // could toggle attribute on branch instead?
			x.B = branch
			return x
		}.bind(𐀶`<button class=spoiler-button id=button></button><div id=branch>`),
		
		background_color: function({color}) {
			let e = this()
			if (color)
				e.dataset.bgcolor = color
			return e
		}.bind(𐀶`<span>`),
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
		let root = document.createDocumentFragment()
		fill_branch(root, tree.content)
		return root
	}
	
	EXPORT.create = CREATE
}
