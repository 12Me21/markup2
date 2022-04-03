function 𐀶([html]) {
	let temp = document.createElement('template')
	temp.innerHTML = html
	let elem = temp.content.firstChild
	return elem.cloneNode.bind(elem, true)
}

let RESULT = 𐀶`<test-><p id=name><p id=input><p id=result><p id=time>` // p autoclose select by id?

Test.prototype.draw_result = function() {
	let d = RESULT()
	console.log(d)
	if (this.status < 0)
		d.classList.add('failed')
	else if (this.status > 0)
		d.classList.add('passed')
	
	d.children.name.textContent = this.name
	d.children.input.textContent = this.input
	d.children.result.textContent = this.result
	d.children.time.textContent = (+this.parse_time).toFixed(1)+" ms"
	
	return d
}

Test.draw_results = function() {
	let f = document.createDocumentFragment()
	for (let test of this.all) {
		f.append(test.draw_result())
	}
	return f
}
