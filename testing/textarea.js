{
	let style = document.createElement('style')
	style.textContent = `
textarea-container, textarea-container > textarea {
	display: block;
	box-sizing: content-box;
	min-height: 5em;
	height: 0;
	font: 1em monospace;
}

textarea-container {
	padding: 2px;
	border: 2px solid #00C8B4;
	border-radius: 2px;
}

textarea-container > textarea {
	resize: none;
	overflow-y: scroll;
	margin: 0;
	border: none;
	padding: 0;
	width: 100%;
	
	appearance: none;
	outline-offset: 2px;
}
`
	document.head.append(style)
	
	let resize = (t)=>{
		t.style.height = "0"
		t.parentNode.style.height = `${t.scrollHeight+1}px`
		t.style.height = "100%"
	}
	
	function setup_textarea(textarea, callback) {
		resize(textarea)
		
		let lock = false
		textarea.addEventListener('input', e=>{
			resize(textarea)
			if (lock)
				return
			lock = true
			window.setTimeout(()=>{
				lock = false
				callback(e)
			})
		}, {passive: true, capture: true})
	}
}
