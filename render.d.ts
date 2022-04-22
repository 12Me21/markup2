import type { MarkupAST } from "./langs";

type RenderArgs = {
	args: any,
	content: MarkupAST,
}

export class Markup_Render_Html {
	render(args: RenderArgs, node=document.createDocumentFragment()): DocumentFragment
}
