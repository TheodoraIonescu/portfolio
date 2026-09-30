# Editing the website text

All text on the website lives in the files in this folder. Each page has its own file:

- `home.md` is the home page.
- `projects/*.md` are the project pages. Each file also holds the title, category and short summary shown on that project's card on the home page.
- `projects/template.md` is an example to copy when you add a new project. All project pages share one layout. Parts of the page that have no text in the file, for example a video or a photo gallery, are not shown.

You can open these files in any text editor. [Typora](https://typora.io) or [Obsidian](https://obsidian.md) show them like a Word document.

## The three rules

1. **Do not touch the `---` lines** at the top of a file.
2. **Do not change anything to the left of a colon** in the part between the `---` lines. Only change the text after the colon. Keep each value on one line.
3. **Do not rename the `##` headings.** They tell the website where the text goes. You can change the text under them freely.

Lines between the `---` lines that start with `#` are notes for you. The website ignores them.

Some lines point to pictures, videos or documents, for example `thumbnail: images/thumbnails/dll-thumbnail.jpg`. The path starts from the main website folder.

## Formatting

| You type                          | You get                  |
| --------------------------------- | ------------------------ |
| `**bold**`                        | **bold**                 |
| `*italic*`                        | *italic*                 |
| `[link text](https://example.com)`| a link                   |
| a line starting with `- `         | a bullet point           |
| an empty line                     | a new paragraph          |
| `![description](images/photo.jpg)`| a picture (in a gallery) |

## Lists of cards

Some sections contain several cards, for example "My Contributions" or "Strengths". Each card starts with a `###` heading. The heading is the card title, and the text under it is the card text. To add a card, add a new `###` heading with text under it. To remove a card, delete its heading and its text.

## How a project page is organised

A project page shows the role, a few figures and a list of tabs next to the cover picture. Below it, one tab is open at a time:

- **Overview** shows "## Overview", the timeline, the client and the tools. Separate the tools with commas; each one becomes a small label.
- **Contributions** shows the cards of "## My Contributions".
- **Deliverable** shows the deliverable text with the video, magazine, TikToks or photo gallery. It is only there when the file has a `deliverable_heading`.
- **Reflection** shows "## What I Learned" and "## Outcomes & Impact". Each bullet point under "What I Learned" becomes its own small card. The first sentence of "Outcomes & Impact" is shown large.

The figures come from the file: a timeline that starts with a number (for example `15 Weeks`), the number of TikToks, magazine pages or photos, the length of the film, or the number of contributions.

## Extra settings

These lines are optional. Leave a line out and the page uses a default.

| Line | Where | What it does |
| --- | --- | --- |
| `accent: "#ff4d6d"` | project file | Colour of the buttons, labels and glow on that project's page and card. Keep the quotes. |
| `preview: documents/previews/clip.mp4` | project file | Short muted clip that plays when the pointer is on the home page card. |
| `magazine: images/magazines/name` | project file | Folder of page pictures for the flip book, made from the PDF by whoever maintains the site. |
| `role:` and `location:` | `home.md` | Text on the photo card and next to the clock at the top of the home page. |
| `formats_title:` and `formats_subtitle:` | `home.md` | Title of the phone, magazine and screen section on the home page. |
