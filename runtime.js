function template([html]) {
	let temp = document.createElement('template')
	temp.innerHTML = html.replace(/\s*\n\s*/g, "")
	return temp.content.cloneNode.bind(temp.content, true)
}

class YoutubeEmbedElement extends HTMLElement {
	constructor() {
		super()
		this.attachShadow({mode: 'open'})
		let e = this.constructor.template()
		for (let elem of e.querySelectorAll("[id]"))
			this["_"+elem.id] = elem
		this._link.onclick = e=>{
			e.preventDefault()
			this.show_youtube(true)
		}
		this._close.onclick = e=>{
			this.show_youtube(false)
		}
		this.shadowRoot.append(e)
	}
	show_youtube(state) {
		this._close.hidden = !state
		this.toggleAttribute('data-big', state)
		if (!this._iframe == !state)
			return
		if (state) {
			this._iframe = document.createElement('iframe')
			let src = `https://www.youtube-nocookie.com/embed/${this._id}?autoplay=1`
			if (this._query)
				src += `&${this._query}`
			this._iframe.src = src
			this._link.replaceWith(this._iframe)
		} else {
			this._iframe.replaceWith(this._link)
			this._iframe.src = "about:blank"
			this._iframe = null
		}
	}
	connectedCallback() {
		this.update_href(this.getAttribute('href'))
	}
	disconnectedCallback() {
		this._id = null
	}
	async update_href(url) {
		url = url.replace("/shorts/", "/watch?v=") // 🤮
		if (this._href == url)
			return
		this._href = url
		this._title.textContent = url
		this._author.textContent = ""
		this._link.href = url
		
		let [, id, query] = /^https?:[/][/](?:www[.])?(?:youtube.com[/]watch[?]v=|youtu[.]be[/])([\w-]{11,})(?:[&?](.*))?$/.exec(url)
		this._query = query && query.replace(/\b[st]=/, "start=")
		
		// display video info
		if (this._id == id)
			return
		this._link.style.backgroundImage = `url(https://i.ytimg.com/vi/${id}/mqdefault.jpg)`
		this._id = id
		// only do one at a time
		let f = YoutubeEmbedElement.requests[id]
		if (!f) {
			console.log('fetch')
			YoutubeEmbedElement.requests[id] = f = fetch(`https://www.youtube.com/oembed?url=https%3A//youtube.com/watch%3Fv%3D${id}&format=json`).then(x=>x.json()).catch(x=>null)
		}
		let data = await f
		if (this._id != id)
			return // if the video changed
		if (!data)
			data = {title: "unknown video"}
		this._title.textContent = data.title
		this._author.textContent = data.author_name
	}
	attributeChangedCallback(name, old, value) {
		if (name=='data-href')
			this.update_href(value)
	}
}
// intern these?
YoutubeEmbedElement.requests = {}
YoutubeEmbedElement.observedAttributes = ['href']
YoutubeEmbedElement.template = template`
<a target=_blank id=link>
	<cite id=caption>
		<span id=title></span>
		<div></div>
		<span id=author></span>
	</cite>
</a>
<button hidden id=close>❌</button>
<style>
	:host {
		border: 2px solid gray;
		display: flex !important;
		--height: 135px;
flex-direction: column;
	}
	:host([data-big]) {
		--height: 270px;
	}
	#close {
		width: 25px
		flex-shrink: 0;
	}
	iframe {
		min-width:0;
		flex-grow:1;
		border: none;
		height: var(--height);
	}
	#link {
		height: var(--height);
		padding: 4px;
		overflow-y: auto;
		background-repeat: no-repeat;
		background-size: contain;
		overflow-wrap: break-word;
		white-space: pre-wrap;
		flex-grow: 1;
		box-sizing: border-box;
	}
	#caption {
		background: #0008;
		color: #FFF;
		font-family: sans-serif;
		display: inline;
	}
	#caption > div {
		height: 5px;
	}
	#author {
		font-style: normal;
		font-weight: bold;
	}
</style>
`

customElements.define('youtube-embed', YoutubeEmbedElement)
