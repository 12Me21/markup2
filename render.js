"use strict"
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
	const H=([html])=>{
		let temp = document.createElement('template')
		temp.innerHTML = html.replace(/\s*?\n\s*/g, "")
		return document.importNode.bind(document, temp.content.firstChild, true)
	}
	
	// todo: this needs to be more powerful. i.e. returning entire elements in some cases etc.  gosh idk.. need to handle like, sbs emotes ? how uh nno that should be the parser's job.. oh and also this should, like,
	// for embeds, need separate handlers for normal urls and embeds and
	let URL_SCHEME = {
		__proto__: null,
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
	
	let intersection_observer, preview
	
	let CREATE = {
		__proto__: null,
		
		newline: H`<br>`,
		divider: H`<hr>`,
		
		bold: H`<b>`,
		italic: H`<i>`,
		underline: H`<u>`,
		strikethrough: H`<s>`,
		
		subscript: H`<sub>`,
		superscript: H`<sup>`,
		
		align: function({align}) {
			let e = this()
			e.style.textAlign = align
			return e
		}.bind(H`<div class='M-align'>`),
		// .bind(value) makes that value accessible as `this` inside the function, when it's called. (note that the value is only evaluated once)
		// I'm just using this as a simple trick to store the html templates with their init functions, but there's no special reason to do it this way
		
		background_color: function({color}) {
			let e = this()
			if (color)
				e.dataset.bgcolor = color
			return e
		}.bind(H`<span class='M-background'>`),
		
		key: H`<kbd>`,
		
		ruby: function({text}) {
			let e = this()
			e.lastChild.textContent = text
			return e.firstChild
		}.bind(H`<ruby><span></span><rt>`),
		
		icode: function({text}) {
			let e = this()
			e.textContent = text.replace(/ /g, " ") // non breaking space..
			return e
		}.bind(H`<code>`),
		
		code: function({text, lang}) { // <tt>?
			let e = this()
			e.textContent = text
			return e
		}.bind(H`<pre>`),
		
		heading: function({level, id}) {
			let e = document.createElement("h"+(level- -1))
			if (id) {
				let e2 = this()
				e2.name = id
				e2.appendChild(e)
			}
			return e
		}.bind(H`<a name="" class='M-anchor'>`),
		
		// what if instead of the \a tag, we just supported
		// an [id=...] attribute on every tag? just need to set id, so...
		// well except <a name=...> is safer than id...
		anchor: function({id}) {
			let e = this()
			if (id)
				e.name = id
			return e
		}.bind(H`<a name="" class='M-anchor'>`),
		
		spoiler: function({label}) {
			let e = this()
			e.firstChild.textContent = label
			return e.lastChild
		}.bind(H`
<details class='M-spoiler'>
	<summary class='M-spoiler-label'></summary>
	<div class='M-spoiler-inner'>
`),
		
		quote: function({cite}) {
			if (cite==null)
				return this[0]()
			let e = this[1]()
			e.firstChild.textContent = cite
			return e.lastChild
		}.bind([
			H`<blockquote class='M-quote'>`,
			H`<blockquote class='M-quote'><cite class='M-quote-label'></cite>:<div class='M-quote-inner'>`, // should we have -outer class?
		]),
		
		list: function({style}) {
			if (style==null)
				return this[0]()
			let e = this[1]()
			//e.style.listStyleType = style // this was only supported by old bbcode so i can probably secretly remove it.
			return e
		}.bind([H`<ul>`, H`<ol>`]),
		
		/* todo: list bullets suck, because you can't select/copy them
we should create our own fake bullet elements instead.*/
		list_item: H`<li>`,
		
		table: function() {
			let e = this()
			return e.firstChild.firstChild
		}.bind(H`<div class='M-table-outer'><table><tbody>`),
		
		table_row: H`<tr>`,
		
		table_cell: function({header, color, truecolor, colspan, rowspan, align}, row_args) {
			let e = this[header||row_args.header ? 1 : 0]()
			if (color) e.dataset.bgcolor = color
			if (truecolor) e.style.backgroundColor = truecolor
			if (colspan) e.colSpan = colspan
			if (rowspan) e.rowSpan = rowspan
			if (align) e.style.textAlign = align
			return e
		}.bind([H`<td>`, H`<th>`]),
		
		simple_link: function({url, text}) {
			let e = this()
			if (text==null) {
				e.textContent = url
			} else {
				e.textContent = text
				e.classList.add('M-link-custom')
			}
			e.href = filter_url(url, 'link')
			return e
		}.bind(H`<a class='M-link' target=_blank href="">`),
		
		link: function({url}) {
			let e = this()
			e.href = filter_url(url, 'link')
			return e
		}.bind(H`<a class='M-link M-link-custom' target=_blank href="">`),
		
		image: function({url, alt, width, height}) {
			let e = this.elem()
			let src = filter_url(url, 'image')
			if (intersection_observer) {
				e.dataset.src = src
				intersection_observer.observe(e)
			} else {
				e.src = src
			}
			if (alt!=null) e.alt = e.title = alt
			if (width) {
				e.width = width
				e.style.setProperty('--width', width)
			}
			if (height) {
				e.height = height
				e.style.setProperty('--height', height)
				e.dataset.state = 'size'
			}
			// check whether the image is "available" (i.e. size is known)
			// https://html.spec.whatwg.org/multipage/images.html#img-available
			if (e.naturalHeight)
				this.set_size(e, 'size')
			e.onerror = ev=>{
				ev.target.dataset.state = 'error'
			}
			e.onload = ev=>{
				this.set_size(ev.target, 'loaded')
			}
			return e
		}.bind({
			elem: H`<img data-state=loading data-shrink tabindex=0>`,
			set_size: (e, state)=>{
				e.height = e.naturalHeight
				e.width = e.naturalWidth
				e.dataset.state = state
				e.style.setProperty('--width', e.naturalWidth)
				e.style.setProperty('--height', e.naturalHeight)
			},
		}),
		
		audio: function({url}) {
			url = filter_url(url, 'audio')
			let e = this()
			e.dataset.src = url
			e.onclick = ev=>{
				ev.preventDefault()
				let e = ev.currentTarget
				let audio = document.createElement('audio')
				audio.controls = true
				audio.autoplay = true
				audio.src = e.dataset.src
				e.replaceChildren(audio)
				e.onclick = null
			}
			let link = e.firstChild
			link.href = url
			link.title = url
			link.lastChild.textContent = url.replace(/.*[/]/, "…/")
			return e
		}.bind(H`<y12-audio><a>🎵️<span>`),
		
		video: function({url}) {
			let e = this()
			let cl = e.lastChild
			let [play, progress, time] = cl.childNodes
			
			let media = document.createElement('video')
			media.setAttribute('tabindex', 0)
			media.preload = 'none'
			media.dataset.shrink = "video"
			media.src = filter_url(url, 'video')
			e.firstChild.append(media)
			
			play.onclick = ev=>{
				if (media.paused)
					media.play()
				else
					media.pause()
				ev.stopPropagation()
			}
			progress.onchange = ev=>{
				media.currentTime = progress.value
			}
			
			media.onpause = ev=>{
				play.textContent = "▶️"
			}
			media.onplay = ev=>{
				play.textContent = "⏸️"
			}
			media.addEventListener('resize', ev=>{
				media.parentNode.style.aspectRatio = media.videoWidth+"/"+media.videoHeight
				media.parentNode.style.height = media.videoHeight+"px"
				media.parentNode.style.width = media.videoWidth+"px"
			}, {once: true})
			media.onerror = ev=>{
				time.textContent = 'Error'
			}
			media.ondurationchange = ev=>{
				let s = media.duration
				progress.disabled = false
				progress.max = s
				let m = Math.floor(s / 60)
				s = s % 60
				time.textContent = m+":"+(s+100).toFixed(2).substring(1)
			}
			media.ontimeupdate = ev=>{
				progress.value = media.currentTime
			}
			return e
		}.bind(H`
<y12-video>
	<figure class='M-image-wrapper'></figure>
	<div class='M-media-controls'>
		<button>▶️</button>
		<input type=range min=0 max=1 step=any value=0 disabled>
		<span>not loaded</span>
`),
		
		youtube: function({url}) {
			let e = this()
			e.firstChild.textContent = url
			e.firstChild.href = url
			e.dataset.href = url
			return e
		}.bind(H`<youtube-embed><a target=_blank>`),
		
		preview: function(node) {
			let e = this()
			e.textContent = node.type
			return e
		}.bind(H`<div class='M-preview'>`),
		
		invalid: function({text, reason}) {
			let e = this()
			e.title = reason
			e.textContent = text
			return e
		}.bind(H`<span class='M-invalid'>`),
	}
	
	function fill_branch(branch, leaves) {
		for (let leaf of leaves) {
			if ('string'==typeof leaf) {
				branch.append(leaf)
			} else {
				let node
				if (preview && (leaf.type=='audio' || leaf.type=='video' || leaf.type=='youtube')) {
					node = CREATE.preview(leaf)
				} else {
					let creator = CREATE[leaf.type]
					if (!creator) {
						if ('object'==typeof leaf && leaf)
							throw new RangeError("unknown node .type: ‘"+leaf.type+"’")
						else
							throw new TypeError("unknown node type: "+typeof leaf)
					}
					node = creator(leaf.args)
				}
				if (leaf.content) {
					if ('table_row'===leaf.type) {
						for (let cell of leaf.content) {
							if ('table_cell'!==cell.type)
								continue
							let c = CREATE.table_cell(cell.args, leaf.args||{})
							if (cell.content)
								fill_branch(c, cell.content)
							node.append(c)
						}
					} else {
						fill_branch(node, leaf.content)
					}
				}
				branch.append(node.getRootNode()) // recursion order?
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
		preview = options && options.preview
		node.textContent = "" //mmnn
		fill_branch(node, content)
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
