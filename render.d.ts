import type { MarkupAST } from "./langs";

export type LeafFunctions = {
	[key: string]: (args: any) => HTMLElement;
};

export class Markup_Render_Html {
	render(args: MarkupAST, node: ParentNode=document.createDocumentFragment()): ParentNode;
	create: LeafFunctions;
}