type RenderArgs = {
	args: any,
	content: string,
}

export class Markup_Render_Html {
	render(args: RenderArgs, node=document.createDocumentFragment()): DocumentFragment
}
