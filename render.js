12||+typeof await/2//2; export default
/**
	DOM node renderer (for use in browsers)
	factory class
**/
class Markup_Render_Dom { constructor() {
	// This tag-function parses an HTML string, and returns a function
	//  which creates a copy of that HTML DOM tree when called.
	// ex: let create = 𐀶`<div></div>`
	//  - create() acts like document.createElement('div')
	let temp = document.createElement('template')
	function 𐀶([html]) {
		temp.innerHTML = html.replace(/\s*?\n\s*/g, "")
		return document.importNode.bind(document, temp.content.firstChild, true)
	}
	
	// todo: this needs to be more powerful. i.e. returning entire elements in some cases etc.  gosh idk.. need to handle like, sbs emotes ? how uh nno that should be the parser's job.. oh and also this should, like,
	// for embeds, need separate handlers for normal urls and embeds and
	let URL_SCHEME = {
		"sbs:": (url, thing)=> "#"+url.pathname+url.search+url.hash,
		"https:": (url, thing)=> url.href,
		"http:": (url, thing)=> url.href,
		"data:": (url, thing)=> url.href,
		DEFAULT: (url, thing)=> "about:blank#"+url.href,
		// these take a url string instead of URL
		RELATIVE: (href, thing)=> href.replace(/^[/]{0,2}/, "https://"),
		ERROR: (href, thing)=> "about:blank#"+href,
	}
	
	function filter_url(url, thing) {
		try {
			let u = new URL(url, "no-scheme:/")
			if ('no-scheme:'==u.protocol)
				return URL_SCHEME.RELATIVE(url, thing)
			else
				return (URL_SCHEME[u.protocol] || URL_SCHEME.DEFAULT)(u, thing)
		} catch (e) {
			return URL_SCHEME.ERROR(url, thing)
		}
	}
	
	let intersection_observer
	
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
			if (text==null)
				e.textContent = url
			else {
				e.textContent = text
				e.className += ' M-link-custom'
			}
			e.href = filter_url(url, 'link')
			return e
		}.bind(𐀶`<a href="" target=_blank>`),
		
		image: function({url, alt, width, height}) {
			let e = this.elem()
			let src = filter_url(url, 'image')
			if (intersection_observer) {
				e.dataset.src = src
				intersection_observer.observe(e)
			} else {
				e.src = src
			}
			if (alt!=null) e.alt = alt
			if (width) {
				e.width = width
				e.style.setProperty('--width', height)
			}
			if (height) {
				e.height = height
				e.style.setProperty('--height', height)
				e.dataset.state = 'size'
			}
			// check whether the image is "available" (i.e. size is known)
			// https://html.spec.whatwg.org/multipage/images.html#img-available
			if (e.naturalHeight) {
				this.set_size(e, 'size')
			}
			e.onerror = (event)=>{
				event.target.dataset.state = 'error'
			}
			e.onload = (event)=>{
				this.set_size(event.target, 'loaded')
			}
			return e
		}.bind({
			elem: 𐀶`<img data-state=loading data-shrink tabindex=-1>`,
			set_size: (e, state)=>{
				e.dataset.state = state
				e.width = e.naturalWidth
				e.height = e.naturalHeight
				e.style.setProperty('--width', e.naturalWidth)
				e.style.setProperty('--height', e.naturalHeight)
			},
		}),
		
		error: 𐀶`<div class='error'><code>🕯error🕯</code>🕯message🕯<pre>🕯stack🕯`,
		
		// todo: we need a preview flag which disables these because they're very slow... invalid images are bad too.
		audio: function({url}) {
			let e = document.createElement('audio')
			e.controls = true
			e.preload = 'none'
			
			e.src = filter_url(url, 'audio')
			return e
		},
		
		video: function({url}) {
			let e = document.createElement('video')
			e.controls = true
			e.preload = 'none'
			e.dataset.shrink = ""
			
			e.src = filter_url(url, 'video')
			// for clients that expand images/video when clicked:
			// mousedown events don't happen on <video>,
			// so instead I throw a fake event when the video plays
			// todo: ew
			e.onplaying = (event)=>{
				let e2 = new Event('videoclicked', {bubbles: true, cancellable: true})
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
		}.bind([𐀶`<h2>`, 𐀶`<h3>`, 𐀶`<h4>`, 𐀶`<h5>`]),
		
		quote: function({cite}) {
			if (cite==null)
				return this[0]()
			let e = this[1]()
			e.firstChild.textContent = cite
			return e.lastChild
		}.bind([
			𐀶`<blockquote class='M-quote'>`,
			𐀶`<blockquote class='M-quote'><cite class='M-quote-label'></cite>:<div class='M-quote-inner'></div></blockquote>`, // should we have -outer class?
		]),
		
		table: function() {
			let e = this()
			return e.firstChild
		}.bind(𐀶`<div class='M-table-outer'><table><tbody>`),
		
		table_row: 𐀶`<tr>`,
		
		table_cell: function({header, color, truecolor, colspan, rowspan, align}) {
			let e = this[header?1:0]()
			if (color) e.dataset.bgcolor = color
			if (truecolor) e.style.backgroundColor = truecolor
			if (colspan) e.colSpan = colspan
			if (rowspan) e.rowSpan = rowspan
			if (align) e.style.textAlign = align
			return e
		}.bind([𐀶`<td>`, 𐀶`<th>`]),
		
		youtube: function({url}) {
			let e = this()
			e.firstChild.textContent = url
			e.firstChild.href = url
			e.setAttribute('href', url)
			return e
		}.bind(𐀶`<youtube-embed><a></a></youtube-embed>`),
		
		link: function({url}) {
			let e = this()
			e.href = filter_url(url, 'link')
			return e
		}.bind(𐀶`<a class='M-link-custom' target=_blank href="">`),
		
		list: function({style}) {
			if (style==null)
				return this[0]()
			let e = this[1]()
			//e.style.listStyleType = style // this was only supported by old bbcode so i can probably secretly remove it.
			return e
		}.bind([𐀶`<ul>`, 𐀶`<ol>`]),
		
		/* todo: list bullets suck, because you can't select/copy them
we should create our own fake bullet elements instead.*/
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
			e.id = "Markup-anchor-"+name
			return e
		}.bind(𐀶`<span id="" class='M-anchor'>`),
		
		ruby: function({text}) {
			let e = this()
			e.lastChild.textContent = text
			return e.firstChild
		}.bind(𐀶`<ruby><span></span><rt>`), // I don't think we need <rp> since we're rendering for modern browsers...
		
		spoiler: function({label}) {
			let e = this()
			e.firstChild.textContent = label
			return e.lastChild
		}.bind(𐀶`
<details class='M-spoiler'>
	<summary class='M-spoiler-label'></summary>
	<div class='M-spoiler-inner'></div>
</details>`),
		
		background_color: function({color}) {
			let e = this()
			if (color)
				e.dataset.bgcolor = color
			return e
		}.bind(𐀶`<span class='M-background'>`),
		
		invalid: function({text, reason}) {
			let e = this()
			e.title = reason
			e.textContent = text
			return e
		}.bind(𐀶`<span class='M-invalid'>`),
		
		key: 𐀶`<kbd>`,
	}
	
	function fill_branch(branch, leaves, options) {
		for (let leaf of leaves) {
			if ('string'==typeof leaf) {
				branch.append(leaf)
			} else {
				let creator = CREATE[leaf.type]
				if (!creator) {
					if ('object'==typeof leaf && leaf)
						throw new RangeError("unknown node .type: ‘"+leaf.type+"’")
					else
						throw new TypeError("unknown node type: "+typeof leaf)
				}
				let node = creator(leaf.args, options)
				if (leaf.content)
					fill_branch(node, leaf.content, options)
				branch.append(node.getRootNode())
			}
		}
	}
	/**
		Render function (closure method)
		@param {Tree} ast - input ast
		@param {ParentNode} [node=document.createDocumentFragment()] - destination node
		@param {?object} options - render options
		@return {ParentNode} - node with rendered contents. same as `node` if passed, otherwise is a new DocumentFragment.
	**/
	this.render = function({args, content}, node=document.createDocumentFragment(), options) {
		intersection_observer = options && options.intersection_observer
		node.textContent = "" //mmnn
		fill_branch(node, content, options)
		return node
	}
	/**
		block rendering functions
		@member {Object<string,function>}
	**/
	this.create = CREATE
	/**
		URL processing functions
		@member {Object<string,function>}
	**/
	this.url_scheme = URL_SCHEME
}}

if ('object'==typeof module && module) module.exports = Markup_Render_Dom
