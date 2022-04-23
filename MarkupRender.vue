<script setup lang="ts">
import { ref, watchEffect } from "vue";

import { Markup_Parse_12y2 } from "./parse";
import { Markup_Langs } from "./langs";
import { Markup_Render_Html } from "./render";

const parse = new Markup_Parse_12y2();
const langs = new Markup_Langs({ "12y2": parse.parse });
const render = new Markup_Render_Html();

const props = defineProps({
	content: String,
	lang: String,
	render: Function,
});

let $el = ref<HTMLDivElement | null>(null);

watchEffect(() => {
	if ($el.value !== null) {
		if (props.content) {
			try {
				const tree = langs.parse(props.content, props.lang || "plaintext");
				let el: DocumentFragment
				if (props.render) {
					el =  props.render(tree);
				} else {
					el =  render.render(tree);
				}
				$el.value.replaceChildren(el);
			} catch (e) {
				console.error(e);
				if ($el.value) {
					$el.value.textContent = props.content;
				}
			}
		}
	}
});
</script>

<template>
	<span ref="$el" class="🍂"></span>
</template>

<style>
@import "./markup.css";
</style>
