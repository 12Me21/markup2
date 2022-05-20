//export\\ default
/**
	HTML string renderer (for server-side rendering)
	Use at your own risk! May generate illegal structures which won't parse correctly.
	factory class
**/
class Markup_Render_Html { constructor() {
	let URL_SCHEME = {
		"sbs:": (url, thing)=> "#"+url.pathname+url.search+url.hash,
		"https:": (url, thing)=> url.href,
		"http:": (url, thing)=> url.href,
		DEFAULT: (url, thing)=> "about:blank#"+url.href,
		// these take a url string instead of URL
		RELATIVE: (url, thing)=> href.replace(/^[/]{0,2}/, "https://"),
		ERROR: (url, thing)=> "about:blank#"+url.href,
	}
	
	function filter_url(url, thing) {
		try {
			let u = new URL(url, "no-scheme:/")
			if (u.protocol=='no-scheme:')
				return URL_SCHEME.RELATIVE(url, thing)
			else
				return (URL_SCHEME[u.protocol] || URL_SCHEME.DEFAULT)(u, thing)
		} catch(e) {
			return URL_SCHEME.ERROR(url, thing)
		}
	}
	
	// todo: catch mistakes like `<a href=${url}>` (unquoted attr)
	function html([str, ...strs], ...values) {
		strs.forEach((s,i)=>{
			str += /&/g[Symbol.replace](values[i], "&amp;").replace(/</g, "&lt;").replace(/'/g, "&apos;")+s
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
			let href = filter_url(url, 'link')
			if (text==null)
				return html`<a href='${href}' target=_blank>${url}</a>`
			return html`<a href='${href}' class='M-link-custom' target=_blank>${text}</a>`
		},
		
		image({url, alt, width, height}) {
			let x = html`<img data-shrink tabindex=-1 src='${filter_url(url, 'image')}'`
			if (alt!=null) x += html` alt='${alt}'`
			if (width) x += html` width='${width}'`
			if (height) x += html` height='${height}'`
			return x + ">"
		},
		
		error() { return `<div class='error'><code>🕯error🕯</code>🕯message🕯<pre>🕯stack🕯` }, 
		
		audio({url}) {
			return html`<audio controls preload=none src='${filter_url(url, 'audio')}'></audio>`
		},
		
		video({url}) {
			return html`<video controls preload=none src='${filter_url(url, 'video')}' data-shrink></video>`
		},
		
		italic(a, inner_html) { return "<i>"+inner_html+"</i>" },
		
		bold(a, inner_html) { return "<b>"+inner_html+"</b>" },
		
		strikethrough(a, inner_html) { return "<s>"+inner_html+"</s>" },
		
		underline(a, inner_html) { return "<u>"+inner_html+"</u>" },
		
		heading({level}, inner_html) {
			let tag = ["h2", "h3", "h4", "h5"][level-1]
			return "<"+tag+">"+inner_html+"</"+tag+">"
		},
		
		quote({cite}, inner_html) {
			if (cite==null)
				return "<blockquote class='M-quote'>"+inner_html+"</blockquote>"
			return html`<blockquote class='M-quote'><cite class='M-quote-label'>${cite}</cite>:<div class='M-quote-inner'>`+inner_html+"</div></blockquote>"
		},
		
		table(a, inner_html) {
			return "<div class='M-table-outer'><table><tbody>"+inner_html+"</table></tbody></div>"
		},
		
		table_row(a, inner_html) {
			return "<tr>"+inner_html+"</tr>"
		},
		
		table_cell({header, color, truecolor, colspan, rowspan, align}, inner_html) {
			let tag = header ? 'th' : 'td'
			let x = "<" + tag
			if (color) x += html` data-color='${color}'`
			if (colspan) x += html` colspan='${colspan}'`
			if (rowspan) x += html` rowspan='${rowspan}'`
			let style = ""
			if (truecolor) style += `background-color:${truecolor};` //todo: escape css?
			if (align) style += `text-align:${align};`
			if (style) x += html` style='${style}'`
			return x+">"+inner_html+"</"+tag+">"
		},
		
		youtube({id, url}) {
			return html`<youtube-embed href='${url}'><a href='${url}'>${url}</a></youtube-embed>`
		},
		
		link({url}, inner_html) {
			return html`<a href='${filter_url(url, 'link')}' class='M-link-custom' target=_blank>`+inner_html+"</a>"
		},
		
		list({style}, inner_html) {
			if (style==null)
				return "<ul>"+inner_html+"</ul>"
			return "<ol>"+inner_html+"</ol>"
		},
		
		list_item(a, inner_html) { return "<li>"+inner_html+"</li>" },
		
		align({align}, inner_html) {
			return html`<div style='${`text-align:${align};`}'>`+inner_html+"</div>"
		},
		
		subscript(a, inner_html) { return "<sub>"+inner_html+"</sub>" },
		
		superscript(a, inner_html) { return "<sup>"+inner_html+"</sup>" },
		
		anchor({name}, inner_html) {
			return html`<span class='M-anchor' id='${"Markup-anchor-"+name}'>`+inner_html+"</span>"
		},
		
		ruby({text}, inner_html) {
			return html`<ruby><span>${text}</span><rp>(</rp><rt>`+inner_html+"</rt><rp>)</rp></ruby>"
		},
		
		spoiler({label}, inner_html) {
			return html`<details class='M-spoiler'><summary class='M-spoiler-label'>${label}</summary><div class='M-spoiler-inner'>`+inner_html+"</div></details>"
		},
		
		background_color({color}, inner_html) {
			return html`<span class='M-background' data-bgcolor='${color}'>`+inner_html+"</span>"
		},
		
		invalid({text, reason}) {
			return html`<span class='M-invalid' title='${reason}'>${text}</span>`
		},
		
		key(a, inner_html) { return "<kbd>"+inner_html+"</kbd>" },
	}
	
	function draw_branch(leaves) {
		let html = ""
		for (let leaf of leaves) {
			if ('string'==typeof leaf) {
				html += leaf.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "&apos;")
			} else {
				let inner_html = leaf.content ? draw_branch(leaf.content) : ""
				html += CREATE[leaf.type](leaf.args, inner_html)
			}
		}
		return html
	}
	/**
		Render function (closure method)
		@param {Tree} ast - input ast
		@return {string} - HTML string
	**/
	this.render = function({args, content}) {
		return draw_branch(content)
	}
	/**
		block rendering functions
		@member {Object<string,function>}
	**/
	this.create = CREATE
	/**
		URL processing functions
		@member {Object<string,function>}
	**/
	this.url_scheme = URL_SCHEME
}}

if ('object'==typeof module) module.exports = Markup_Render_Html
