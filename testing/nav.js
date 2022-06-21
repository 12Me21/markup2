//let base = new URL("./", document.baseURI)
let pages = [
	["Demo", 'index.html'],
	["Tests", 'testing/index.html'],
]
function make_link([title, url]) {
	let a = document.createElement('a')
	a.href = new URL("../"+url, document.currentScript.src)
	a.textContent = title
	if (a.pathname == window.location.pathname)
		a.classList.add('current')
	return a
}
let nav = document.createElement('nav')
nav.append(...pages.map(make_link))
document.currentScript.replaceWith(nav)

let style = document.createElement('style')
style.textContent = `
nav {
	display: flex;
	gap: 0.5em;
	font: 1em sans-serif;
	align-items: start;
	margin-bottom: 8px;
}
nav > a {
	border: 3px solid;
	border-color: currentColor transparent;
	text-decoration: none;
	padding: 0 0.5em;
	font-weight: bold;
}
nav > a.current {
	color: gray;
	border: 3px dotted gray;
}
`
document.head.append(style)
