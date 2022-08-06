"use strict"
class RequestError extends Error {
	constructor(xhr) {
		let data = xhr.response
		if (data.title)
			data = data.title
		else if ('string'==typeof data && data.startsWith("Unhandled exception: "))
			data = data.replace(/^   at [^]* ---$/m, "...")
		
		super(xhr.responseURL+" "+xhr.status+" "+xhr.statusText+"\n"+data)
		
		this.stack = this.stack.replace(/^RequestError@.*\n/, "")
	}
}
RequestError.prototype.name = 'RequestError'

let server = "qcs.shsbs.xyz/api"

async function request(endpoint, data, cb) {
	let last = performance.now()
	function report(str) {
		let now = performance.now()
		let diff = now-last
		//last = now
		cb(diff, str)
		//console.log(diff.toFixed(0), str)
	}
	return await {then:y=>{
		let x = new XMLHttpRequest()
		x.open('POST', "https://"+server+"/"+endpoint)
		x.setRequestHeader('CACHE-CONTROL', "L, ratio, no-store, no-cache, must-revalidate")
		//x.setRequestHeader('AUTHORIZATION', "Bearer "+Req.auth)
		x.upload.addEventListener('progress', ev=>{
			//last_time = ev.timeStamp
			report("preflight finished")
		}, {once:true, passive:true})
		let last_size = 0
		let last_time = 0
		x.onprogress = ev=>{
			let size_change = ev.loaded-last_size
			let time_change = ev.timeStamp-last_time
			let speed = (size_change*8/1000)/(time_change/1000)
			last_size = ev.loaded
			last_time = ev.timeStamp
			report("downloaded "+(ev.loaded/1000).toFixed(1)+"kB ("+speed.toFixed(0)+" kbps)")
		}
		x.onreadystatechange = ev=>{
			switch (x.readyState) {
			case XMLHttpRequest.HEADERS_RECEIVED:
				report("got headers")
				let type = x.getResponseHeader('Content-Type')
				if (/[\/+]json(;| |$)/i.test(type))
					x.responseType = 'json'
				break
			case XMLHttpRequest.DONE:
				report("finished")
				if (x.status==200)
					y(x.response)
				else
					throw new RequestError(x)
				break
			default:
				//report("state change "+x.readyState)
			}
		}
		report("starting request")
		x.send(new Blob([JSON.stringify(data)], {type: "application/json;charset=UTF-8"}))
	}}
}

async function load_data(requests) {
	$xhr_time.textContent = ""
	let data = await request('request', {requests}, (t,m)=>{
		$xhr_time.textContent += "\n"+(t/1000).toFixed(2)+"sec: "+m
	})
	console.log('got', data)
	let lmm = data.objects
	return lmm
}
