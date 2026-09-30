# Editing the website text

All text on the website lives in the files in this folder. Each page has its own file:

- `home.md` is the home page.
- `projects/*.md` are the project pages. Each file also holds the title, category and short summary shown on that project's card on the home page.
- `projects/template.md` is an example to copy when you add a new project.

You can open these files in any text editor. [Typora](https://typora.io) or [Obsidian](https://obsidian.md) show them like a Word document.

## The three rules

1. **Do not touch the `---` lines** at the top of a file.
2. **Do not change anything to the left of a colon** in the part between the `---` lines. Only change the text after the colon. Keep each value on one line.
3. **Do not rename the `##` headings.** They tell the website where the text goes. You can change the text under them freely.

Lines between the `---` lines that start with `#` are notes for you. The website ignores them.

## Formatting

| You type                          | You get                  |
| --------------------------------- | ------------------------ |
| `**bold**`                        | **bold**                 |
| `*italic*`                        | *italic*                 |
| `[link text](https://example.com)`| a link                   |
| a line starting with `- `         | a bullet point           |
| an empty line                     | a new paragraph          |

## Lists of cards

Some sections contain several cards, for example "My Contributions" or "Strengths". Each card starts with a `###` heading. The heading is the card title, and the text under it is the card text. To add a card, add a new `###` heading with text under it. To remove a card, delete its heading and its text.
