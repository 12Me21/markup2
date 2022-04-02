🔸🔶🟧 INSTRUCTIONS 🟧🔶🔸

Example:

<script src=parse.js></script>
<script src=render.js></script>
 ...

	let element = document.createElement('div') // (any block element)
	element.classList.add('MARKUP') // (whatever css class you use)
	
	element.append(Markup.convert(text))


🔸🔶🟧 FUNCTIONS 🟧🔶🔸

🔸Markup.parse(‹String›) ⤑ ‹tree›

🔸Markup.render(‹tree›) ⤑ ‹DocumentFragment›

🔸Markup.convert(‹String›) ⤑ ‹DocumentFragment›
  - equivalent to Markup.render(Markup.parse(...))


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
