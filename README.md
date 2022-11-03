# Hi I'm a PhD student...

 who refuses to type up quotes and needs to make an annotated bib(liography). 
 
# I'm also a software engineer 

and what is a developer without a pipeline?

# About
There are citation managers (Zotero, Mendeley, EndNote, etc.) and localized paper managers (Excel sheets, index cards, etc.) which involve the painstaking task of writing quotes, notes, and everything in between. Creating an annotated bibliography is often done from Excel sheets or within Word Docs and while summarizing a paper is great, it doesn't often show you the quotes you need unless you've again, typed them up (or copied them over from software readable PDFs). Also if you hate inefficency you scrap your methods over and over again leading to organized messes throughout your file storage. This project is the proof of concept to resolve a tool gap in paper annotation management. Personally, it'll help me compile papers for lit reviews and annotated bibs, but ideally it'll help other Ph.D. students as they figure out their own paper pipelines. 

Open source, use as you like, adapt as you need.

`Tldr; no solution for exporting quotes, faciliating summarization with preferred organization, tracking quotes/tagging, etc. so I built one.`


## Stack
- AirTable
- Zotero
- JS
- Zotero

## Requirements (thus far)
- Zotero
- Zotero set up with Linked Attachment Base (Google Drive)
- Zotfile

- Zotero API Key
- AirTable API Key

- Sheer disdain for tedium

### Upcoming
- update tags (airtable to zotero)
- update notes (airtable summary to zotero) (new note?)
- checking for matches to update either zotero or airtable
- make authors table to link papers
- automating using triggers (e.g. new paper added, new note)
- creating front-endUI
- make this more like an api for future proofing
- link Zotero added/modified datetime to airtable fields
- add backref/fwdref since airtable uses different values

airtable side
- put recent updates (n)
- flag to not include notes ?
- check if note exists (what if note updates, save update - how check for what updated?)

paper annotated
- call api w/ # notes added (sort through X to find notes, add papers separately if found)
- update airtable w/ quotes + link back/backref on main table?

- flag to not include notes ?
- check if paper parent key exists if not add

notes will share same key id and parent key? how differentiate? list of entries under color or other?
need to parse out citation for page number use regex though

values updated 
go to interface to add summary from filter on yellow/green colors (savable?)
