function creator(tag) {
	return ()=>{
		return {node: document.createElement(tag)}
	}
}

function newEvent(name) {
	let event = document.createEvent('Event')
	event.initEvent(name, true, true)
	return event
}

function createLink(url) {
	// important, do not remove, prevents script injection
	if (/^ *javascript:/i.test(url))
		url = ""
	
	let protocol = urlProtocol(url)
	if (protocol[0] == "sbs:") {
		// put your custom local url handling code here
		let node = Nav.link(protocol[1])
	} else {
		let node = document.createElement('a')
		if (url[0] != "#")
			node.setAttribute('target', "_blank")
		if (!protocol[0]) {
			if (url[0] == "#") {
				// put your fragment link handling code here
				/*var hash1 = Nav.getPath()
				  var name = url.substr(1)
				  hash = "#"+hash1[0]+"#"+name
				  url = hash
				  node.onclick = function(e) {
				  var hash2 = Nav.getPath()
				  if (hash1[0]==hash2[0] && hash2[1]==name) {
				  var n = document.getElementsByName("_anchor_"+name)
				  if (n[0])
				  n[0].scrollIntoView()
				  e.preventDefault()
				  } else {
				  window.location.hash = hash
				  }
				  }*/
			} else {
				// urls without protocol get https:// or http:// added
				url = defaultProtocol+"//"+url
			}
		}
		node.href = url
	}
	
	return node
}

let ytk = "\x41\x49\x7A\x61\x53\x79\x43\x4E\x6D\x33\x56\x79\x41\x4D\x49\x35\x44\x36\x56\x58\x48\x39\x62\x39\x48\x37\x44\x31\x36\x63\x6D\x76\x39\x4E\x34\x7A\x70\x68\x63"
function getYoutube(id, callback) {
	let x = new XMLHttpRequest()
	x.open('GET', "https://www.googleapis.com/youtube/v3/videos?part=snippet&id="+id+"&k\x65y\x3D"+ytk)
	x.onload = ()=>{
		if (x.status != 200)
			return
		try {
			let json = JSON.parse(x.responseText)
			let video = json.items[0]
			callback(video)
		} catch(e){}
	}
	x.send()
}
function getYoutubeID(url) {
	let match = url.match(/(?:https?:\/\/)?(?:www\.)?youtu\.?be(?:\.com)?\/?.*(?:watch|embed)?(?:.*v=|v\/|\/)([\w\-_]+)\&?/)
	if (match)
		return match[1]
	return null
}
// returns [protocol, rest of url] or [null, url]
function urlProtocol(url) {
	let match = url.match(/^([-\w]+:)([^]*)$/)
	if (match)
		return [match[1].toLowerCase(), match[2]]
	return [null, url]
}
let defaultProtocol = window.location.protocol == "http:" ? "http:" : "https:"
function filterURL(url, type) {
	return url
}

Parse.options = {
	maxDepth: 10,
	append(parent, child) {
		parent = parent.branch || parent.node
		parent.append(child.node)
	},
	//========================
	// nodes without children:
	text(text) {
		return {node: document.createTextNode(text)}
	},
	lineBreak: creator('br'),
	line: creator('hr'),
	// used for displaying invalid markup
	// reason is currently unused
	invalid(text, reason) {
		let node = document.createElement('span')
		node.className = 'invalid'
		node.title = reason
		node.textContent = text
		return {node:node}
	},
	// code block
	code(args, contents) {
		let language = args[""] || 'sb'
		let node = document.createElement('pre')
		node.dataset.lang = language
		node.append(Highlight.highlight(contents, language))
		return {node:node}
	},
	// inline code
	icode(args, contents) {
		let node = document.createElement('code')
		node.textContent = contents
		return {node:node}
	},
	audio(args, contents) {
		let url = args[""]
		url = filterURL(url, 'audio')
		if (url == null)
			return simpleLink(args)
		
		let node = document.createElement('audio')
		node.setAttribute('controls', "")
		node.setAttribute('src', url)
		node.setAttribute('preload', 'none')
		if (contents != null)
			node.append(contents)
		return {node:node}
	},
	video(args, contents) {
		let url = args[""]
		url = filterURL(url, 'video')
		if (url == null)
			return simpleLink(args)
		
		let node = document.createElement('video')
		node.setAttribute('controls', "")
		node.setAttribute('src', url)
		node.setAttribute('data-shrink', "")
		if (contents != null)
			node.appendChild(contents)
		node.onplaying = ()=>{
			node.dispatchEvent(newEvent('videoclicked'))
		}
		return {node:node}
	},
	youtube(args, contents, preview) { //todo: use contents?
		let url = args[""]
		url = filterURL(url, 'youtube')
		if (url == null)
			return simpleLink(args)
		
		let match = getYoutubeID(url)
		let link = document.createElement('a')
		let div = document.createElement('div')
		div.className = "youtube"
		div.append(link)
		link.href = url
		
		if (match) {
			link.style.backgroundImage = 'url("'+defaultProtocol+"//i.ytimg.com/vi/"+match+"/mqdefault.jpg"+'")'
			let time = url.match(/[&?](?:t|start)=(\w+)/)
			let end = url.match(/[&?](?:end)=(\w+)/)
			let loop = url.match(/[&?]loop(=|&|$)/)
			if (!preview)
				getYoutube(match, (data)=>{
					let title = document.createElement('div')
					title.className = 'pre videoTitle'
					title.textContent = data.snippet.title
					link.append(title)
					link.append(document.createElement('br'))
					title = document.createElement('div')
					title.className = 'pre videoAuthor'
					title.textContent = data.snippet.channelTitle
					link.append(title)
				})
			let ifc = document.createElement('span')
			link.append(ifc)
			link.onclick = (e)=>{
				e.preventDefault()
				div.dispatchEvent(newEvent("beforeSizeChange"))
				let iframe = document.createElement('iframe')
				let src = "https://www.youtube-nocookie.com/embed/"+match+"?autoplay=1"
				if (time)
					src += "&start="+time[1]
				if (end)
					src += "&end="+end[1]
				if (loop)
					src += "&loop=1&playlist="+match
				iframe.src = src
				ifc.append(iframe)
				div.className = "youtube playingYoutube"
				div.dispatchEvent(newEvent("afterSizeChange"))
			}
			let stop = document.createElement('button')
			stop.textContent = "x"
			stop.onclick = (e)=>{
				e.preventDefault()
				div.dispatchEvent(newEvent("beforeSizeChange"))
				ifc.textContent = ""
				div.className = "youtube"
				div.dispatchEvent(newEvent("afterSizeChange"))
			}
			div.append(stop)
		}
		return {node:div}
	},
	//=====================
	// nodes with children
	root() {
		let node = document.createDocumentFragment()
		return {node:node}
	},
	bold: creator('b'),
	italic: creator('i'),
	underline: creator('u'),
	strikethrough: creator('s'),
	heading(level) { // input: 1, 2, or 3
		// output: h2-h4
		return {node:document.createElement('h'+(level+1))}
	},
	quote(args) {
		// <blockquote><cite> arg </cite><br> ... </blockquote>
		let name = args[""]
		let node = document.createElement('blockquote')
		if (name) {
			let cite = document.createElement('cite')
			cite.textContent = name
			node.append(cite, document.createElement('br'))
		}
		return {node:node}
	},
	list(args) {
		// <ul> ... </ul>
		let list
		if (args[""]!=undefined) {
			list = document.createElement('ol')
			list.style.listStyleType = args[""]
		} else
			list = document.createElement('ul')
		return {node:list}
	},
	item(index) {
		return {node:document.createElement('li')}
	},
	simpleLink(args) {
		let node = this.createLink(args[""])
		node.textContent = args[""]
		return {node:node}
	},
	customLink(args) {
		let node = this.createLink(args[""])
		node.className += " customLink"
		return {node:node}
	},
	table(opts) {
		// <div class="tableContainer"><table> ... </table></div>
		let container = document.createElement('div')
		container.className = "tableContainer"
		let node = document.createElement('table')
		container.append(node)
		return {node: container, branch: node}
	},
	row: creator('tr'),
	cell(opt) {
		// <td> ... </td> etc.
		let node = document.createElement(opt.h ? 'th' : 'td')
		if (opt.rs)
			node.rowSpan = opt.rs
		if (opt.cs)
			node.colSpan = opt.cs
		if (opt.c) {
			if (opt.c[0] == "#")
				node.style.backgroundColor = opt.c
			node.dataset.bgcolor = opt.c
		}
		if (opt.a)
			node.style.textAlign = opt.a
		node.className = "cell"
		return {node:node}
	},
	image(args, alt) {
		let url = args[""]
		url = filterURL(url, 'image')
		if (url == null)
			return simpleLink(args)
		
		let node = document.createElement('img')
		node.src = url
		node.setAttribute('tabindex', "-1")
		node.dataset.shrink = ""
		node.dataset.loading = ""
		if (alt != null)
			node.setAttribute('alt', alt)
		node.onerror = node.onload = ()=>{
			delete node.dataset.loading
		}
		// todo: add events for size change ??
		return {node:node}
	},
	// parser error message
	error(e, stack) {
		// <div class="error">Error while parsing:<pre> stack trace </pre>Please report this</div>
		let node = document.createElement('div')
		node.className = "error"
		let err = document.createElement('code')
		err.textContent = e
		node.append("Markup parsing error: ", err, "\nPlease report this!")
		if (stack) {
			let pre = document.createElement('pre')
			pre.textContent = stack
			node.append(pre)
		}
		return {node:node}
	},
	align(args) {
		let node = document.createElement('div')
		let arg = args[""]
		if (arg == 'left' || arg == 'right' || arg == 'center')
			node.style.textAlign = arg
		return {node:node}
	},
	superscript: creator('sup'),
	subscript: creator('sub'),
	anchor(args) {
		let name = args[""]
		let node = document.createElement('a')
		// put your anchor name handler here
		// I prefix the names to avoid collision with node ids
		// which use the same namespace as name
		node.name = "_anchor_"+name
		return {node:node}
	},
	ruby(args) {
		let elem = document.createElement('ruby')
		let first = document.createElement('span')
		let x1 = document.createElement('rp')
		x1.textContent = "("
		let x2 = document.createElement('rt')
		// note: arguments are set to boolean `true` if value is not present
		// for historical reasons (i.e. because it's funny) ruby should display the text "true" in this case
		x2.textContent = String(args[""])
		let x3 = document.createElement('rp')
		x3.textContent = ")"
		elem.append(first, x1, x2, x3)
		
		return {node: elem, branch: first}
	},
	spoiler(args) {
		// <button> arg </button><div class="spoiler"> ... </div>
		// I'd use <summary>/<details> but it's not widely supported
		// and impossible to style with css
		// this probably needs some aria attribute or whatever
		let button = document.createElement('button')
		button.className = 'spoilerButton'
		button.onclick = ()=>{
			if (button.dataset.show == null)
				button.dataset.show = ""
			else
				delete button.dataset.show
		}
		let name = args[""]
		if (name === true)
			name = "spoiler"
		button.textContent = name
		
		let box = document.createElement('div')
		box.className = "spoiler"
		
		let node = document.createDocumentFragment()
		node.append(button, box)
		
		return {node: node, branch: box}
	},
	bg(opt) {
		let node = document.createElement("span")
		let color = opt[""]
		if (color)
			node.setAttribute("data-bgcolor", color)
		return {node:node}
	},
}
