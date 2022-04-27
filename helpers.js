/**
	Markup helper functions (for browser JS)
	@namespace
*/
let Markup = {
	/**
		which css class to add
		@type {string}
	*/
	css_class: "🍂",
	/**
		@type {Markup_Langs}
	*/
	langs: new Markup_Langs([new Markup_12y2(), new Markup_Legacy()]),
	/**
		@type {Markup_Render_Dom}
	*/
	renderer: new Markup_Render_Dom(),
	/**
		function to convert text into rendered output
		note: throws a TypeError if `text` is not a string. otherwise should never throw.
		@param {string} text - input text
		@param {string|*} lang - markup language name
		@param {Element} [element=] - element to insert content into. if not specified, a new DocumentFragment is created and returned
		@param {Object} [options=] - unused currently
		@return {(Element|DocumentFragment)} - the element which was passed, or the new documentfragment
	*/
	convert_lang(text, lang, element, options) {
		if (element instanceof Element)
			element.classList.add(this.css_class)
		else if (element!=undefined)
			throw new TypeError("Markup.convert_lang: element is not an Element")
		
		let tree, err
		try {
			tree = this.langs.parse(text, lang)
			element = this.renderer.render(tree, element)
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
	},
}
