🔸🔶🟧 EXAMPLE 🟧🔶🔸

═[HTML]══════════════════════════════════════
<link rel=stylesheet href=markup.css>
<script src=parse.js></script>
<script src=render.js></script>
═[JS]════════════════════════════════════════
let element = document.createElement('div')
element.classList.add('🍂')
document.body.append(element)

let text = "/test/ 123"

Markup.convert(text, element)
/* OR: */
let fragment = Markup.convert(text)
element.append(fragment)
═════════════════════════════════════════════

🔸🔶🟧 SBS CONTENTAPI EXAMPLE 🟧🔶🔸

═[HTML]═════════════════════════════════════════════
<link rel=stylesheet href=markup.css>
<script src=parse.js></script>
<script src=render.js></script>
<script src=legacy.js></script>
═[JS]═══════════════════════════════════════════════
let element = document.createElement('div')

let messageData = {
	text: "/test/ 123",
	values: {m: '12y2'}
}

Markup.render_message(messageData, element)
// result: <div class='🍂'><i>test</i> 123</div>
// (set Markup.css_class to change the class name)
/* OR: */
let fragment = Markup.render_message(messageData)
element.append(fragment)
element.classList.add('whatever')
════════════════════════════════════════════════════

🔸🔶🟧 FUNCTIONS 🟧🔶🔸

📒❲parse.js❳
 ┃
 ┣📑❲Markup.parse(‹String›) ⤑ ‹tree›❳
 ┃    ⎝parser, outputs a tree
 ┃
 ┗📑❲Markup.convert(‹String›, ?‹ParentNode›) ⤑ ‹ParentNode›❳
      ⎝equivalent to Markup.render(Markup.parse(...))

📒❲render.js❳
 ┃
 ┗📑❲Markup.render(‹tree›, ?‹ParentNode›) ⤑ ‹ParentNode›❳
      ⎜renderer, converts the parser's tree into html
	   ⎝returns the input node, or a new ‹DocumentFragment›

📒❲legacy.js❳
 ┃
 ┣📑❲Markup.render_message(‹message›, ?‹Element›) ⤑ ‹ParentNode›❳
 ┃    ⎜renders a sbs contentapi message, based on .text and .values.m
 ┃    ⎜‹message› is {text: ‹String›, values: {m: ?‹String›}}
 ┃    ⎜if an element is passed, adds `Markup.css_class` to its class list
 ┃    ⎝otherwise, creates and returns a new ‹DocumentFragment›
 ┃
 ┗📑❲Markup.langs[‹String›] ⤑ ❲‹Function›(‹String›) ⤑ ‹tree›❳❳
   ┃  ⎜table of parser functions for different markup languages
	┃  ⎝(all output the same AST format)
	┃
   ┣ Markup.langs['12y2']
   ┃  ⎝current 12y2 parser (Markup.parse)
   ┣ Markup.langs['text']
	┃  ⎝plaintext
   ┣ Markup.langs['12y']
	┃  ⎝old 12y parser
   ┣ Markup.langs['bbcode']
	┃  ⎝old bbcode parser
   ┗ Markup.langs['plaintext']
      ⎝old plaintext parser (autolinker)


🔸🔶🟧 FILES 🟧🔶🔸

📚❲./❳
 ┃
 ┣📕❲index.html❳
 ┃    demo page
 ┃
 ┣📔❲README.txt❳
 ┃    readme
 ┣📔❲LICENSE.txt❳
 ┃    license
 ┃
 ┣📒❲parse.js❳
 ┃    parsing (text -> tree)
 ┣📒❲render.js❳
 ┃    rendering (tree -> html (DocumentFragment))
 ┃
 ┣📘❲markup.css❳
 ┃    example styles for markup
 ┃
 ┣📚❲testing/❳
 ┃ ┃  tests
 ┃ ┃
 ┃ ┣📕❲index.html❳
 ┃ ┃    run tests
 ┃ ┣📕❲editor.html❳
 ┃ ┃    test editing tool
 ┃ ┃
 ┃ ┣📘❲style.css❳
 ┃ ┃    common styles for test pages
 ┃ ┣📒❲test.js❳
 ┃ ┃    test system
 ┃ ┗📒❲draw.js❳
 ┃      test output rendering
 ┃
 ┗📚❲legacy/❳
   ┃  old markup system
   ┃
   ┣📒❲legacy.js❳
   ┃    old markup parser
   ┣📒❲old-render2.js❳
   ┃    old renderer
   ┗📒❲highlight.js❳
        old syntax highlighter


🔸🔶🟧 CREDITS 🟧🔶🔸

🔸𝟷𝟸
🔸𝔂
🔸𝓬𝓱𝓮𝓻𝓻𝔂
🔸𝓷𝓲𝓬𝓸𝓵𝓮
