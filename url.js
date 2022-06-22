//let urlsegments = ["/", "?&", "#"]
12||+typeof await/2//2;; export default
class SbsLocation {
	constructor(source) {
		let [, type, id, query_str, fragment] = /^(.*?)([/].*?)?([?&].*?)?([#].*)?$/.exec(source)
		
		this.type = decodeURIComponent(type)
		
		if (id==undefined)
			this.id = null
		else {
			let id = decodeURIComponent(id.substring(1))
			if (/^-?\d+$/.test(id))
				this.id = +id
			else if (id[1]=="@")
				this.id = id.substring(1)
			else
				this.id = id
		} 
		
		this.query = {}
		if (query_str)
			for (let pair of query_str.match(/[^?&]+/g)) {
				let [key, value] = pair.match(/[^=]*(?==?(.*))/)
				this.query[decodeURIComponent(key)] = decodeURIComponent(value)
			}
		
		if (fragment)
			this.fragment = decodeURIComponent(fragment.substr(1))
		
	}
	toString() {
		function esc(str, regex) {
			// allow: \w - . ! * ' ~ $ + , : ; @
			str = encodeURI(str).replace(/[)(]+/g, escape)
			if (regex)
				str = str.replace(regex, encodeURIComponent)
			return str
		} // todo make sure this does infact match the url parsing we use here!
		
		let url = esc(this.type, /[/?&#]+/g)
		
		if (this.id!=null) {
			url += "/"
			if ('string'==typeof this.id) {
				if (/^-?\d+$|^@/.test(this.id))
					url += "@"
			}
			url += esc(this.id, /[/?&#]+/g)
		}
		
		let query = Object.entries(this.query).map(([k,v])=>{
			k = esc(k, /[?=&#]+/g)
			return v ? k+"="+esc(v, /[?&#]+/g) : k
		}).join("&")
		if (query)
			url += "?"+query
		
		if (this.fragment != null)
			url += "#"+esc(this.fragment)
		
		// don't allow , ! : . as final char
		url = url.replace(/[,!:.]$/, x=>"%"+x.charCodeAt().toString(16))
		
		return url
	}
}

if ('object'==typeof module && module) module.exports = SbsLocation
