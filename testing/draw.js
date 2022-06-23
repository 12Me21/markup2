function 𐀶([html]) {
	let temp = document.createElement('template')
	temp.innerHTML = html.replace(/\s*?\n\s*/g, "")
	let node = temp.content.firstChild
	return document.importNode.bind(document, node, true)
}

let RESULT = 𐀶`
<test- class=Row>
	<div class=Col>
		<name-></name->
		<result-></result->
	</div>
	<col2- class='fill Col'>
		<input- class='fill'></input->
	</col2->
</test->
` // p autoclose select by id?

Test.prototype.draw_result = function() {
	let d = RESULT()
	if (this.status < 0)
		d.classList.add('failed')
	else if (this.status > 0)
		d.classList.add('passed')
	
	d.querySelector('name-').textContent = this.name
	d.querySelector('input-').textContent = this.input
	let result = this.result
	if (this.status > 0) {
		result += " ["+(+this.parse_time).toFixed(1)+" ms]"
		d.querySelector('div').className = "Row"
	}
	d.querySelector('result-').textContent = result
	//d.querySelector('time-').textContent = 
	
	return d
}

Test.draw_results = function() {
	let f = document.createDocumentFragment()
	let good = []
	for (let test of this.all) {
		if (test.status > 0)
			good.push(test.draw_result())
		else
			f.append(test.draw_result())
	}
	f.append(...good)
	return f
}
