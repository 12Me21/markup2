Test.prototype.draw_result = function() {
	let d = document.createElement('test-result')
	if (this.status < 0)
		d.classList.add('failed')
	else if (this.status > 0)
		d.classList.add('passed')
	d.textContent = this.name
	return d
}
