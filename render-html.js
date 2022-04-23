class Markup_Render_Html {constructor(){
	"use strict"
	
	const IS_BLOCK = {code:1, divider:1, ROOT:1, heading:1, quote:1, table:1, table_cell:1, image:1, video:1, audio:1, spoiler:1, align:1, list:1, list_item:1, error:1}
	
	let URL_SCHEME = {
		"sbs:"(url) {
			return "#"+url.pathname+url.search+url.hash
		},
		"no-scheme:"(url) {
			url.protocol = "https:"
			return url.href
		},
		"javascript:"(url) {
			return "about:blank"
		}
	}
	
	function filter_url(url) {
		try {
			let u = new URL(url, "no-scheme:/")
			let f = URL_SCHEME[u.protocol]
			return f ? f(u) : u.href
		} catch(e) {
			return "about:blank"
		}
	}
	
	// todo: catch mistakes like `<a href=${url}>` (unquoted attr)
	function html([str, ...strs], ...values) {
		strs.forEach((s,i)=>{
			str += values[i].replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "&apos;")+s
		})
		return str
	}
	
	let CREATE = {
		newline() { return "<br>" },
		
		divider() { return "<hr>" },
		
		code({text, lang}) {
			return html`<pre>${text}</pre>`
		},
		
		icode({text}) {
			return html`<code>${text.replace(/ /g, " ")}</code>`
		},
		
		simple_link({url, text}) {
			return html`<a href='${filter_url(url)}' target=_blank>${text}</a>`
		},
		
		image({url, alt, width, height}) {
			let x = html`<img data-loading data-shrink tabindex=-1 src='${filter_url(url)}' onerror='delete this.dataset.loading' onload='delete this.dataset.loading'`
			if (alt!=null) x += html` alt='${alt}'`
			if (width) x += html` width='${width}'`
			if (height) x += html` height='${height}'`
			return x + ">"
		},
		
		error() { return `<div class='error'><code>🕯error🕯</code>🕯message🕯<pre>🕯stack🕯` }, 
		
		audio({url}) {
			return html`<audio controls preload=none src='${filter_url(url)}'></audio>`
		},
		
		video({url}) {
			return html`<video controls preload=none src='${filter_url(url)}' data-shrink></video>`
		},
		
		italic(a, inner_html) { return "<i>"+inner_html+"</i>" },
		
		bold(a, inner_html) { return "<b>"+inner_html+"</b>" },
		
		strikethrough(args, inner_html) { return "<s>"+inner_html+"</s>" },
		
		underline(a, inner_html) { return "<u>"+inner_html+"</u>" },
		
		heading({level}, inner_html) {
			let tag = ["h2", "h3", "h4", "h5"][level-1]
			return "<"+tag+">"+inner_html+"</"+tag+">"
		},
		
		quote({cite}, inner_html) {
			if (cite==null)
				return "<blockquote>"+inner_html+"</blockquote>"
			return html`<blockquote><cite>${cite}</cite>:<div>`+inner_html+"</div></blockquote>"
		},
		
		table(a, inner_html) {
			return "<table><tbody>"+inner_html+"</table></tbody>"
		},
		
		table_row(a, inner_html) {
			return "<tr>"+inner_html+"</tr>"
		},
		
		table_cell({header, color, truecolor, colspan, rowspan, align}, inner_html) {
			let x = header ? "<th" : "<td"
			if (color) x += html` data-color='${color}'`
			if (colspan) x += html` colspan='${colspan}'`
			if (rowspan) x += html` rowspan='${rowspan}'`
			let style = ""
			if (truecolor) style += `background-color:${truecolor};` //todo: escape css?
			if (align) style += `text-align:${align};`
			if (style) x += html` style='${style}'`
			return x+">"+inner_html+(header?"</th>":"</td>")
		},
		
		youtube({id, url}) {
			// uhhh
			return "[youtube]"
		},
		
		link({url}, inner_html) {
			return html`<a target=_blank href='${filter_url(url)}'>`+inner_html+"</a>"
		},
		
		list({style}, inner_html) {
			if (style==null)
				return "<ul>"+inner_html+"</ul>"
			return "<ol>"+inner_html+"</ol>"
		},
		
		list_item(a, inner_html) { return "<li>"+inner_html+"</li>" },
		
		align({align}, inner_html) {
			return html`<div style='${`text-align:${align};`}' >`+inner_html+"</div>"
		},
		
		subscript(a, inner_html) { return "<sub>"+inner_html+"</sub>" },
		
		superscript(a, inner_html) { return "<sup>"+inner_html+"</sup>" },
		
		anchor({name}, inner_html) {
			return html`<a name='${"_anchor_"+name}'>`+inner_html+"</a>"
		},
		
		ruby({text}, inner_html) {
			return html`<ruby><span>${text}</span><rp>(</rp><rt>`+inner_html+"</rt><rp>)</rp></ruby>"
		},
		
		spoiler({label}, inner_html) {
			return html`<details><summary>${label}</summary><div>`+inner_html+"</div></details>"
		},
		
		background_color({color}, inner_html) {
			return html`<span data-bgcolor='${color}'>`+inner_html+"</span>"
		},
		
		invalid({text, reason}) {
			return html`<span class='invalid' title='${reason}'>${text}</span>`
		},
		
		key(a, inner_html) { return "<kbd>"+inner_html+"</kbd>" },
	}
	
	function fill_branch(leaves) {
		let html = ""
		// children
		let prev = 'newline'
		let all_newline = true
		for (let leaf of leaves) {
			if (typeof leaf == 'string') {
				all_newline = false
				html += leaf.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "&apos;")
				prev = 'text'
			} else if (leaf === true) {
				if (prev!='block')
					html += CREATE.newline()
				prev = 'newline'
			} else {
				all_newline = false
				let inner_html = ""
				if (leaf.content)
					[prev, inner_html] = fill_branch(leaf.content)
				else
					prev = 'text'
				html += CREATE[leaf.type](leaf.args, inner_html)
				prev = IS_BLOCK[leaf.type] ? 'block' : prev
			}
		}
		if (prev=='newline' && !all_newline)
			html += CREATE.newline()
		
		return [prev, html]
	}
	
	this.render = function({args, content}) {
		let [prev, html] = fill_branch(content)
		return html
	}
	
	this.create = CREATE
	
	this.url_scheme = URL_SCHEME
}}

if ('object'==typeof module) module.exports = Markup_Render_Html
