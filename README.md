# Java Notes

A small notes app for learning core Java and data structures. It runs in the phone's browser, installs to the home screen, and works with no internet after the first open.

The app is only the reader. Notes live as plain text files in `content/`, one file per topic, so adding or fixing a note never touches the app code.

## What the reader does

- **Contents, Search, Review** tabs at the bottom.
- Each subtopic is one page: explanation, Java snippets with a Copy button, an Output drawer under each snippet, dry runs you step through, memory diagrams, trap and rule callouts.
- **Check yourself** questions end each subtopic. The answer and the reason stay closed until you open them. Mark each one Got it or Missed it.
- **Topic test** closes each topic: 12 questions, each tagged with the subtopics it covers.
- **Links between notes.** Tap a link to jump to the idea. A Back chip returns you to the exact place you left. Press and hold a link to read a short preview without leaving.
- **Revision.** Mark a subtopic revised and it returns in Review after 1, 3, 7, 14 and 30 days. Missed questions collect under Weak spots. Save pages to find them again.
- Light, dark or automatic theme, adjustable text size, progress export and import.

Progress is stored on the device only.

## Files

| Path | What it is |
| --- | --- |
| `index.html`, `style.css`, `js/` | The app |
| `content/topics.json` | Topics in reading order |
| `content/*.md` | One file per topic |
| `CONTENT.md` | The note format and writing rules |
| `tools/verify.py` | Compiles and runs every Java snippet and compares the real output with what the note shows |
| `manifest.webmanifest`, `sw.js`, `*.png` | Home screen install and offline use |

## Adding a topic

1. Write `content/tN-name.md` following `CONTENT.md`.
2. Add it to `content/topics.json`.
3. Run `python3 tools/verify.py` (needs Java 17 or newer and Python 3). It must report 0 problems.
4. Commit and push. The app picks up new notes the next time it is opened with internet.

## Publishing with GitHub Pages

In the repository, open Settings, then Pages. Set Source to Deploy from a branch, Branch to `main`, folder `/ (root)`, and save. The address is `https://USERNAME.github.io/java-notes/`.

## Install on a phone

Open the address once with internet on. Android Chrome: menu, then Install app. iPhone Safari: Share, then Add to Home Screen. Always open it from the same address, because progress is tied to it.
