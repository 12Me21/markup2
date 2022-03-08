function render(tree) {
	let d = document.createDocumentFragment()
	for (let x of tree) {
		if (typeof x == 'string') {
			d.append(document.createTextNode(x))
		} else if (x instanceof Array) {
			d.append(render(x))
		} else {
			//let t = x.type
			let e = document.createElement('i')
			e.append(render(x.contents))
			d.append(e)
		}
	}
	return d
}
