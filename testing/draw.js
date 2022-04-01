Test.prototype.draw_result = function() {
	let d = document.createElement('test-')
	if (this.status < 0)
		d.classList.add('failed')
	else if (this.status > 0)
		d.classList.add('passed')
	
	let e = document.createElement('test-name')
	e.textContent = this.name
	d.append(e)
	
	e = document.createElement('test-input')
	e.textContent = this.input
	d.append(e)
	
	let f = document.createElement('test-result')
	f.textContent = this.result
	d.append(f)
	
	let g = document.createElement('test-time')
	g.textContent = (+this.parse_time).toFixed(1)+" ms"
	d.append(g)
	
	return d
}

Test.draw_results = function() {
	let f = document.createDocumentFragment()
	for (let test of this.all) {
		f.append(test.draw_result())
	}
	return f
}
