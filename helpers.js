let Markup = {
	css_class: "🍂",
	langs: new Markup_Langs({'12y2': new Markup_Parse_12y2().parse}),
	renderer: new Markup_Render_Html(),
	convert_lang(text, lang, element, options) {
		if (element instanceof Element)
			element.classList.add(this.css_class)
		else if (element!=undefined)
			throw new TypeError("Markup.message: element is not an Element")
		
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
