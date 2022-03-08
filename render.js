function render2(lines) {
	let d = document.createDocumentFragment()
	for (let line of lines) {
		p = document.createElement('p')
		p.append(render(line))
		d.append(p)
		p.append(document.createElement('br'))
	}
	return d
}

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
