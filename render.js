class Markup_Render_Html {constructor(){
	"use strict"
	
	// This tag-function parses an HTML string, and returns a function
	//  which creates a copy of that HTML DOM tree when called.
	// ex: let create = 𐀶`<div></div>` 
	//  - create() acts like document.createElement('div')
	
	function 𐀶([html/*‹String›*/])/*‹Node›*/ {
		let temp = document.createElement('template')
		temp.innerHTML = html
		let elem = temp.content.firstChild
		return elem.cloneNode.bind(elem, true)
	}
	
	const IS_BLOCK = {code:1, divider:1, ROOT:1, heading:1, quote:1, table:1, table_cell:1, image:1, video:1, audio:1, spoiler:1, align:1, list:1, list_item:1, error:1}
	
	let URL_SCHEME = {
		"sbs:"(url) {
			return "#"+url.pathname+url.search+url.hash
		},
		"no-scheme:"(url) {
			url.protocol = "https:"
			return url.href
		},
		"javascript:"(url) {
			return "about:blank"
		}
	}
	
	function filter_url(url) {
		try {
			let u = new URL(url, "no-scheme:/")
			let f = URL_SCHEME[u.protocol]
			return f ? f(u) : u.href
		} catch(e) {
			return "about:blank"
		}
	}
	
	let CREATE = {
		newline: 𐀶`<br>`,
		
		divider: 𐀶`<hr>`,
		
		code: function({text, lang}) { // <tt>?
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
			e.href = filter_url(url)
			return e
		}.bind(𐀶`<a href="" target=_blank>`),
		
		image: function({url, alt, width, height}) {
			let e = this()
			e.src = filter_url(url)
			e.onerror = e.onload = e.removeAttribute.bind(e, 'data-loading')
			if (alt!=null) e.alt = alt
			if (width) e.width = width
			if (height) e.height = height
			return e
		}.bind(𐀶`<img data-loading data-shrink tabindex=-1>`),
		
		error: 𐀶`<div class='error'><code>🕯error🕯</code>🕯message🕯<pre>🕯stack🕯`,
		
		// todo: we need a preview flag which disables these because they're very slow... invalid images are bad too.
		audio: function({url}) {
			let e = document.createElement('audio')
			e.controls = true
			e.preload = 'none'
			
			e.src = filter_url(url)
			return e
		},
		
		video: function({url}) {
			let e = document.createElement('video')
			e.controls = true
			e.preload = 'none'
			e.dataset.shrink = ""
			
			e.src = filter_url(url)
			// for clients that expand images/video when clicked:
			// mousedown events don't happen on <video>,
			// so instead I throw a fake event when the video plays
			// todo: maybe use a custom event instead?
			e.onplaying = (event)=>{
				let e2 = new Event('videoclicked', {bubbles:true, cancellable:true})
				event.target.dispatchEvent(e2)
			}
			return e
		},
		
		italic: 𐀶`<i>`,
		
		bold: 𐀶`<b>`,
		
		strikethrough: 𐀶`<s>`,
		
		underline: 𐀶`<u>`,
		
		heading: function({level}) {
			return this[level-1]()
		}.bind([𐀶`<h2>`,𐀶`<h3>`,𐀶`<h4>`,𐀶`<h5>`]),
		
		quote: function({cite}) {
			if (cite==null)
				return this[0]()
			let e = this[1]()
			e.firstChild.textContent = cite
			return e.lastChild
		}.bind([𐀶`<blockquote>`, 𐀶`<blockquote><cite></cite>:<div>`]),
		
		table: function() {
			let e = this()
			return e.firstChild
		}.bind(𐀶`<table><tbody>`),
		
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
		
		youtube: function({id, url}) {
			let e = this[0]()
			
			let close = e.lastChild
			let preview = e.firstChild
			
			let link = preview
			link.href = url
			
			let figure = preview.firstChild
			figure.style.background = `no-repeat center/contain url(https://i.ytimg.com/vi/${id}/mqdefault.jpg)`
			
			let caption = figure.firstChild
			caption.textContent = url
			
			let create = this[1]
			let iframe
			
			close.onclick = (event)=>{
				if (!iframe) return
				close.hidden = true
				iframe.src = 'about:blank'
				iframe.replaceWith(preview)
				iframe = null
			}
			
			preview.onclick = (event)=>{
				event.preventDefault()
				if (iframe)
					return
				close.hidden = false
				iframe = create()
				iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`
				preview.replaceWith(iframe)
			}
			
			return e
		}.bind([
			𐀶`<youtube-embed><a target=_blank><figure><figcaption></figcaption></figure></a><button hidden>❌</button>`,
			𐀶`<iframe referrerpolicy=no-referrer allowfullscreen>`,
		]),
		x:	``,
		
		link: function({url}) {
			let e = this()
			e.href = filter_url(url)
			return e
		}.bind(𐀶`<a target=_blank href="">`),
		
		list: function({style}) {
			if (style==null)
				return this[0]()
			let e = this[1]()
			//e.style.listStyleType = style // this was only supported by old bbcode so i can probably secretly remove it.
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
			e.lastChild.textContent = text
			return e.firstChild
		}.bind(𐀶`<ruby><span></span><rt>`), // I don't think we need <rp> since we're rendering for modern browsers...
		
		spoiler: function({label}) {
			let e = this()
			e.firstChild.textContent = label
			return e.lastChild
		}.bind(𐀶`<details><summary></summary><div>`),
		
		background_color: function({color}) {
			let e = this()
			if (color)
				e.dataset.bgcolor = color
			return e
		}.bind(𐀶`<span>`),
		
		invalid: function({text, reason}) {
			let e = this()
			e.title = reason
			e.textContent = text
			return e
		}.bind(𐀶`<span class='invalid'>`),
		
		key: 𐀶`<kbd>`,
	}
	
	function fill_branch(branch/*‹ParentNode›*/, leaves/*LIST(‹branch›)*/)/*ENUM(newline,block,text)*/ {
		// children
		let prev = 'newline'
		let all_newline = true
		for (let leaf of leaves) {
			if (typeof leaf == 'string') {
				all_newline = false
				branch.append(leaf)
				prev = 'text'
			} else if (leaf === true) {
				if (prev!='block')
					branch.append(CREATE.newline())
				prev = 'newline'
			} else {
				all_newline = false
				let node = CREATE[leaf.type](leaf.args)
				branch.append(node.getRootNode())
				if (leaf.content)
					prev = fill_branch(node, leaf.content)
				else
					prev = 'text'
				prev = IS_BLOCK[leaf.type] ? 'block' : prev
			}
		}
		if (prev=='newline' && !all_newline)
			branch.append(CREATE.newline())
		
		return prev
	}
	
	this.render = function({args, content}, node=document.createDocumentFragment()) {
		fill_branch(node, content)
		return node
	}
	
	this.create = CREATE
	
	this.url_scheme = URL_SCHEME
}}
