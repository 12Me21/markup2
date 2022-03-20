🔸🔶🟧 INSTRUCTIONS 🟧🔶🔸

Script files: ❲parser.js❳ and ❲render.js❳

To render an element:

/**/ var tree = parse(text)
/**/ var content = render(tree)
/**/
/**/ var element = document.createElement('div') // (any block element)
/**/ element.classList.add('MARKUP')
/**/ element.append(content)

🔸🔶🟧 FILES 🟧🔶🔸

📚❲./❳
 ┃
 ┣📕❲test.html❳
 ┃    test page
 ┃
 ┣📔❲README.txt❳
 ┃    readme
 ┣📔❲LICENSE.txt❳
 ┃    license
 ┃
 ┣📒❲parser.js❳
 ┃    parsing (text -> tree)
 ┃
 ┣📒❲render.js❳
 ┃    rendering (tree -> html (DocumentFragment))
 ┃
 ┗📘❲markup.css❳
      example styles
