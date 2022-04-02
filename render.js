Markup.INJECT = Markup=>{
	"use strict"
	
	// This tag-function parses an HTML string, and returns a function
	//  which creates a copy of that HTML DOM tree when called.
	// ex: let create = 𐀶`<div></div>` 
	//  - create() acts like document.createElement('div')
	// (if there are multiple elements, it returns a DocumentFragment)
	function 𐀶([html]) {
		let temp = document.createElement('template')
		temp.innerHTML = html
		let fragment = temp.content
		let first = fragment.firstChild
		// if the fragment only has 1 node in it, use that instead
		if (!first.nextSibling && !first.firstChild)
			fragment = first
		
		return fragment.cloneNode.bind(fragment, true)
	}
	
	function id(elem, id) {
		let e = elem.getElementById(id)
		e.removeAttribute('id')
		return e
	}
	
	let CREATE = {
		newline: 𐀶`<br>`,
		
		divider: 𐀶`<hr>`,
		
		env: 𐀶`<hr>`,
		
		code: function({text, lang}) {
			let e = this()
			e.textContent = text
			return e
		}.bind(𐀶`<pre>`),
		// .bind(value) makes that value accessible as `this` inside the function, when it's called. (note that the value is only evaluated once)
		// I'm just using this as a simple trick to store the html templates with their init functions, but there's no special reason to do it this way
		
		icode: function({text}) {
			let e = this()
			e.textContent = text.replace(/ /g, " ") // non breaking space..
			return e
		}.bind(𐀶`<code>`),
		
		simple_link: function({url, text}) {
			let e = this()
			e.textContent = text
			e.href = url
			return e
		}.bind(𐀶`<a href="">`),
		
		image: function({url, alt, width, height}) {
			let e = this()
			e.src = url
			e.onerror = e.onload = e.removeAttribute.bind(e, 'data-loading')
			if (alt!=null) e.alt = alt
			if (width) e.width = width
			if (height) e.height = height
			return e
		}.bind(𐀶`<img data-loading data-shrink tabindex=-1>`),
		
		error: 𐀶`<div class='error'><code>🕯error🕯</code>🕯message🕯<pre>🕯stack🕯`,
		// todo: we need a preview flag which disables these because they're very slow... invalid images are bad too.
		audio: function({url}) {
			let e = this()
			e.src = url
			return e
		}.bind(𐀶`<audio controls preload=none>`),
		
		video: function({url}) {
			let e = this()
			e.src = url
			return e
		}.bind(𐀶`<video controls preload=none>`),
		
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
			let e = this[1]()
			id(e, 'cite').textContent = cite
			return e
		}.bind([𐀶`<blockquote>`, 𐀶`<blockquote><cite id=cite>`]),
		
		table: function() {
			let e = this()
			e.B = id(e, 'branch')
			return e
		}.bind(𐀶`<table><tbody id=branch>`),
		
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
			let e = this()
			e.href = url
			return e
		}.bind(𐀶`<a target=_blank href=""></a>`),
		
		list: function({style}) {
			if (style==null)
				return this[0]()
			let e = this[1]()
			e.style.listStyleType = style
			return e
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
			id(e, 'top').textContent = text
			e.B = id(e, 'branch')
			return e
		}.bind(𐀶`<ruby><span id=branch></span><rp>(<rt id=top><rp>(`),
		
		spoiler: function({label}) {
			e = this()
			id(e, 'btn').onclick = function() {
				this.toggleAttribute('data-show')
				// could toggle attribute on branch instead?
			}
			e.B = id(e, 'branch')
			return e
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
				let node = CREATE[leaf.type](leaf.args)
				let new_branch = node.B || node
				branch.append(node)
				if (leaf.content)
					prev = fill_branch(new_branch, leaf.content)
				else
					prev = 'text'
				prev = Markup.IS_BLOCK[leaf.type] ? 'block' : prev
			}
		}
		if (prev=='newline' && !all_newline)
			branch.append(CREATE.newline())
		
		return prev
	}
	
	Markup.render = function(tree) {
		let root = document.createDocumentFragment()
		fill_branch(root, tree.content)
		return root
	}
	
	Markup.create = CREATE
}
