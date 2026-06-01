# Zotero Translator for Moby Games

This repo is forked from https://github.com/cmiltiadis/Steam-Zotero-translator

This is a citation metadata scraper for Moby Game entries, for [Zotero](https://www.zotero.org/) (a free and open-source reference manager). It will scrape the necessary metadata required to reference/cite a given game listend on MobyGames.

Jump to section: [Citing videogames](#citing-videogames), [In use](#in-use), [Metadata](#metadata), [Installation](#installation), [Sample references in 'Chicago'](#sample-references), [References in BibTeX format](#bibtex-format), [Notes](#notes).

Issues: 
- It does not differentiate soundtracks or films as non-games, since these are not clearly marked as non-games. However, this is a trivial problem given that (a) this is primarily aiming videogame citations, (b) soundtracks and films are not that many on Steam, and more importantly (c) Steam does not even provide the appropriate metadata to cite such artifacts (i.e. composer, director, etc.).
- Hardware items (e.g. Valve Index), which feature the same URL pattern as videogame pages (`https://store.steampowered.com/app/....`) will be detected as valid items, but the Translator will escape before saving them (as they don't have Developer/Publisher fields). 
- Release dates such as 'coming soon' will be saved as such.

# Citing videogames 

The matter of referencing videogames in literature is neither trivial nor standardized [(Gualeni et al. 2019)](#notes). Some (older) cases include videogame references in separate "*Ludography*" sections following different conventions than standard citations. Others include them in a standard bibliography/reference section following distinct conventions (see for example game studies publications such as [Game Studies Journal](https://gamestudies.org/2301/submission_guidelines#GSCitation) and [DiGRA (2023)](http://www.digra.org/call-for-papers-digra-2023-international-conference/)). This tool supports the latter case and should work for most applications. However, given that the abovementioned venues do not provide a precise citation style (as in a [CSL file](https://github.com/citation-style-language/styles)), one might need to adapt their game references in their text document. 
Furthermore, depending on referencing instructions additional fields might be required, which can be added manually in Zotero. For example: 
-  the precise version of the game played,
-  the platform that the game was played, or the platforms for which the game is available (depending on what is required). 

# In use 
- Install translator ([instructions below](#installation)). 
- Upon entering a website of a Moby games entry (URL pattern: `https://www.mobygames.com/game/...`), the Zotero connector will detect the game as 'software' and its icon will change to one resembling code. Clicking that icon will automatically download the metadata required to reference the game (title, developers, publisher, release date, platforms, URL, also description, and user-contributed keywords) -- see [metadata](#metadata) and [sample references](#sample-references) below. 
# Metadata 

| Metadata field | Status |
|-|-|
| itemType | "computerProgram" (software) | 
| title |  manually scraped (`#appHubAppName`)|
| date (release date) | manually scraped (`div.date`) |   
| creators (developers) | manually scraped (`#developers_list > a`) | 
| company (publishers) | manually scraped (`.glance_ctn_responsive_left > .dev_row [1]`) | 
| abstractNote (description) | manually scraped (`div.game_description_snippet`) |
| tags | manually scraped from user-submitted tags (`a.app_tag`)| 
| system (platforms) | manually scraped (`div.sysreq_tab` if it exists, else "Windows") | 
| version | N/A |
| place | N/A|
| programming language | N/A |
| ISBN | N/A |
| url |automatically scraped |
| libraryCatalog | "store.steampowered.com" | 
| Website snapshot (HTML) | omitted | 
| accessDate |automatically generated |

# Installation 

Requirements: 
- [Zotero](https://www.zotero.org/) (free, open-source, cross platform). 
- [Zotero connector](https://www.zotero.org/download/connectors) (browser plugin for Firefox, Chrome, Safari, Edge). 

Install: 
- Place `Steam.js` inside the Zotero translators folder: 
  - In Zotero go to  Edit > Preferences > Advanced > Files and Folders, and click Show Data Directory.
  - A file explorer will pop up. Open the folder `translators`, and paste the included Javascript file (`MobyGames.js`) inside.
- Refresh Zotero translators:
  - On your browser, right-click on the Zotero Connector icon, and select Options, or Manage Extension/Options. In the pop-up tab go to Advanced > Translators > Update Translators (in the same dialog you can remove this translator by selecting reset translators). 
- The translator should now work!
  - If you visit a MobyGames game page, the Zotero connector icon should now resemble code.
  - If you search MobyGames, or visit a Developer's or a Publisher's page, the icon will turn into a folder, indicating that there are multiple games available to scrape from such websites. If you click on the icon, a new 


# Notes 
- Gualeni, Stefano, Riccardo Fassone, and Jonas Linderoth. ‘How to Reference a Digital Game’. In Proceedings of DiGRA 2019: Game, Play and the Emerging Ludo-Mix, 17. Kyoto: DiGRA, 2019. http://www.digra.org/digital-library/publications/how-to-reference-a-digital-game/.

