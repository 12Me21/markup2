//let urlsegments = ["/", "?&", "#"]

class SbsLocation {
	constructor(source) {
		let [, type, id, query_str, fragment] = /^(.*?)([/].*?)?([?&].*?)?([#].*)?$/.exec(source)
		
		this.type = decodeURIComponent(type)
		
		if (id) {
			this.id = decodeURIComponent(id.substr(1))
			if (/^-?\d+$/.test(this.id))
				this.id = +this.id
		}
		
		this.query = query_str ? Object.fromEntries(query_str.match(/[^?&]+/g).map(pair=>pair.match(/[^=]*(?==?(.*))/).map(decodeURIComponent))) : {}
		
		if (fragment)
			this.fragment = decodeURIComponent(fragment.substr(1))
		
	}
	toString() {
		function esc(str, regex) {
			// allow: \w - . ! * ' ~ $ + , : ; @
			str = encodeURI(str).replace(/[)(]+/g, escape)
			if (regex)
				str = str.replace(regex, encodeURIComponent)
			return str
		} // todo make sure this does infact match the url parsing we use here!
		
		let url = esc(this.type, /[/?&#]+/g)
		
		if (this.id != null)
			url += "/"+esc(this.id, /[/?&#]+/g)
		
		let query = Object.entries(this.query).map(([k,v])=>{
			k = esc(k, /[?=&#]+/g)
			return v ? k+"="+esc(v, /[?&#]+/g) : k
		}).join("&")
		if (query)
			url += "?"+query
		
		if (this.fragment != null)
			url += "#"+esc(this.fragment)
		
		// don't allow , ! : . as final char
		url = url.replace(/[,!:.]$/, x=>"%"+x.charCodeAt().toString(16))
		
		return url
	}
}

let Markup = new class extends Markup_Render {
	constructor() {
		"use strict"
		super()
		this.langs = new Markup_Langs()
		this.css_class = "🍂"
	}
	parse(text, lang) {
		"use strict"
		if (typeof text != 'string')
			throw new TypeError("Markup.parse: text is not a string")
		let parser = ('string'==typeof lang && this.langs[lang]) || this.langs.plaintext
		return parser(text)
	}
	convert_lang(text, lang, element, options) {
		"use strict"
		if (element instanceof Element)
			element.classList.add(this.css_class)
		else if (element!=undefined)
			throw new TypeError("Markup.message: element is not an Element")
		
		let tree, err
		try {
			tree = this.parse(text, lang)
			element = this.render(tree, element)
		} catch (error) {
			if (!element)
				element = document.createDocumentFragment()
			let d = document.createElement('pre')
			let type = !tree ? "PARSE ERROR" : "RENDER ERROR"
			d.textContent = `${type}: ${error ? error.message : "unknown error"}`
			d.style.border = "4px inset red"
			element.append(d, text)
		} finally {
			return element
		}
	}
}
