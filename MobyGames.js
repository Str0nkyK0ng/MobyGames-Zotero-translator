{
	"translatorID": "7ae00dde-0d55-4302-8e98-683db1a34e93",
	"label": "MobyGames",
	"creator": "Forked from the Steam translator by Constantinos Miltiadis",
	"target": "^https?://(www\\.)?mobygames\\.com/",
	"minVersion": "5.0",
	"maxVersion": "",
	"priority": 100,
	"inRepository": false,
	"translatorType": 4,
	"browserSupport": "gcsibv",
	"lastUpdated": "2026-06-01 07:16:03"
}

/*
	***** BEGIN LICENSE BLOCK *****

	This file is a fork of the Steam translator (© 2023 Constantinos Miltiadis),
	adapted for https://www.mobygames.com/.

	Zotero is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	Zotero is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
	GNU Affero General Public License for more details.

	***** END LICENSE BLOCK *****
*/

/*
DESIGN NOTES
------------
Like the Steam translator, MobyGames items are saved as 'computerProgram'.
Developers  -> creators (programmer, institutional/single-field names)
Publishers  -> "company" field (comma separated)
Genres      -> tags
Platforms   -> "system"
MobyGames ID -> "extra"

This translator prefers STABLE metadata that does not depend on the page's
CSS classes, in this order, falling back as needed:
  1. Open Graph / <meta> tags   (title, description, canonical URL, cover image)
  2. JSON-LD ("application/ld+json"), if MobyGames emits a VideoGame/Product object
  3. The visible info panel, located by LABEL TEXT ("Developed by", "Published
     by", "Released", "Genre"), not by class name, so it survives redesigns.

WHAT TO VERIFY IN SCAFFOLD
--------------------------
The meta-tag fields (title / abstract / url / cover / Moby ID) should work as
is. The label-driven fields (developer, publisher, platform, genre, date) are a
best-effort reconstruction made without access to the live DOM. Open a game
page in Scaffold, run the translator, and adjust the label regexes / href
patterns in the helpers below if any field comes back empty. The console
one-liners in the chat message make it quick to see the real labels and links.
*/

/*
Tests (open each in Scaffold; use "Save to testCases" to capture expected items):
- Single game:        https://www.mobygames.com/game/53619/dark-souls/
- Single game:        https://www.mobygames.com/game/1290/half-life/
- Search results:     https://www.mobygames.com/search/?q=dark+souls
- Company (dev/pub):  https://www.mobygames.com/company/<id>/<slug>/
- Group (curated):    https://www.mobygames.com/group/<id>/<slug>/

Coding refs:
- Zotero Translator overview: https://www.zotero.org/support/dev/translators
- Zotero coding reference:    https://www.zotero.org/support/dev/translators/coding
- ZoteroUtilities:            https://github.com/zotero/utilities/blob/master/utilities.js
*/

/* ============================ URL pattern helpers ============================ */

// search results page
function isSearch(url) {
	return url.includes('/search/');
}

// developer/publisher pages live under /company/; curated lists under /group/
function isDevPub(url) {
	return url.includes('/company/') || url.includes('/group/');
}

// any page that yields a list of games
function isMultiple(url) {
	return isSearch(url) || isDevPub(url);
}

function detectWeb(doc, url) {
	if (/\/game\/\d+/.test(url)) { // individual game pages look like /game/<id>/<slug>/
		return 'computerProgram';
	}
	if (isMultiple(url)) {
		if (getSearchResults(doc, true)) {
			return 'multiple';
		}
	}
	return false;
}

function getSearchResults(doc, checkOnly) {
	var items = {};
	var found = false;

	// On search/company/group pages the result rows are links to individual games.
	// Scope to <main> when present to avoid nav/footer/"related games" noise.
	var root = doc.querySelector('main') || doc;
	var rows = root.querySelectorAll('a[href*="/game/"]');

	for (let row of rows) {
		let href = row.href;
		if (!/\/game\/\d+\//.test(href)) continue; // canonical game links only

		// Normalise to /game/<id>/<slug>/ so platform/credits subpaths dedupe together
		let m = href.match(/(.*\/game\/\d+\/[^/?#]+\/?)/);
		if (m) href = m[1];

		let title = ZU.trimInternal(row.textContent || '');
		if (!title || !href) continue;     // skip cover-image links (no text)
		if (href in items) continue;       // omit duplicates
		if (checkOnly) return true;
		found = true;
		items[href] = title;
	}

	return found ? items : false;
}

function doWeb(doc, url) {
	if (detectWeb(doc, url) == 'multiple') {
		Zotero.selectItems(getSearchResults(doc, false), (items) => {
			if (!items) {
				return true;
			}
			const articles = [];
			for (const i in items) {
				articles.push(i);
			}
			ZU.processDocuments(articles, scrape);
			return true;
		});
	}
	else {
		scrape(doc, url);
	}
}

/* ====================== field helpers (layout-independent) ==================== */

// Open Graph / <meta> content, checking both property= and name=
function meta(doc, prop) {
	return attr(doc, 'meta[property="' + prop + '"]', 'content')
		|| attr(doc, 'meta[name="' + prop + '"]', 'content');
}

// Text owned directly by an element (excluding descendant elements' text)
function ownText(el) {
	let t = '';
	for (let n of el.childNodes) {
		if (n.nodeType === 3) t += n.textContent; // 3 = text node
	}
	return ZU.trimInternal(t);
}

// Find the element holding the VALUE for a spec whose LABEL matches labelRe.
// Keys off human-readable label text, so it survives CSS/class changes.
function valueNodeForLabel(root, labelRe) {
	// (a) definition-list layout: <dt>Label</dt><dd>value</dd>
	for (let dt of root.querySelectorAll('dt')) {
		if (labelRe.test(ownText(dt))) {
			let dd = dt.nextElementSibling;
			if (dd) return dd;
		}
	}
	// (b) "Label: value" rows where the label is the element's own text
	for (let el of root.querySelectorAll('li, div, p, tr, span, th')) {
		if (el.closest('nav, header, footer')) continue; // ignore site chrome
		let own = ownText(el).replace(/:$/, '');
		if (own && own.length <= 30 && labelRe.test(own)) {
			return el; // value links are usually children of, or next to, the label
		}
	}
	return null;
}

// Collect anchor texts near a value node, trying the node, its next sibling,
// then its parent. Optionally filter anchors by an href substring.
function collectLinks(node, hrefIncludes) {
	if (!node) return [];
	let sel = hrefIncludes ? 'a[href*="' + hrefIncludes + '"]' : 'a';
	let scopes = [node, node.nextElementSibling, node.parentElement];
	let out = [];
	for (let scope of scopes) {
		if (!scope) continue;
		for (let a of scope.querySelectorAll(sel)) {
			let name = ZU.trimInternal(a.textContent);
			if (name && !out.includes(name)) out.push(name);
		}
		if (out.length) break; // first scope that yields links wins
	}
	return out;
}

// Company names (developer or publisher) for a given label.
function companiesForLabel(root, labelRe) {
	let node = valueNodeForLabel(root, labelRe);
	if (!node) return [];
	let names = collectLinks(node, '/company/');
	if (names.length) return names;
	// text fallback when companies are not links
	let valueEl = (node.tagName === 'DD') ? node : (node.nextElementSibling || node);
	let raw = ZU.trimInternal(valueEl.textContent || '').replace(labelRe, '').replace(/^[:\s]+/, '');
	return raw ? raw.split(/\s*[,;]\s*|\s+and\s+/).filter(Boolean) : [];
}

// Normalise JSON-LD name fields (string | object | array) to an array of names
function ldNames(val) {
	if (!val) return [];
	let arr = Array.isArray(val) ? val : [val];
	let out = [];
	for (let v of arr) {
		let name = (typeof v === 'string') ? v : (v && v.name ? v.name : '');
		if (name) out.push(ZU.trimInternal(name));
	}
	return out;
}

// First JSON-LD object that looks like a game/product, or {} if none
function jsonLD(doc) {
	for (let s of doc.querySelectorAll('script[type="application/ld+json"]')) {
		let parsed;
		try {
			parsed = JSON.parse(s.textContent);
		}
		catch (e) {
			continue;
		}
		let arr = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
		for (let obj of arr) {
			if (!obj || typeof obj !== 'object') continue;
			let type = obj['@type'];
			let types = Array.isArray(type) ? type : [type];
			for (let t of types) {
				if (t && /VideoGame|Product|CreativeWork|Game/i.test(t)) {
					return obj;
				}
			}
		}
	}
	return {};
}

/* ================================== scrape ================================== */

function scrape(doc, url) {
	var ld = jsonLD(doc);
	var root = doc.querySelector('main') || doc;
	var item = new Z.Item('computerProgram');

	// --- Title (og:title -> JSON-LD -> <h1>) ---
	item.title = ZU.trimInternal(meta(doc, 'og:title') || ld.name || text(doc, 'h1') || '');

	// --- Abstract / description ---
	item.abstractNote = ZU.trimInternal(
		meta(doc, 'og:description') || ld.description || meta(doc, 'description') || ''
	);

	// --- Canonical URL ---
	item.url = attr(doc, 'link[rel="canonical"]', 'href') || meta(doc, 'og:url') || url;

	// --- Developers -> creators (institutional / single-field names) ---
	var devs = ldNames(ld.author).concat(ldNames(ld.creator));
	if (!devs.length) {
		devs = companiesForLabel(root, /^develop(ed by|er|ers)?:?$/i);
	}
	for (let name of devs) {
		item.creators.push({ lastName: name, creatorType: 'programmer', fieldMode: 1 });
	}

	// --- Publishers -> company (comma separated, like the Steam translator) ---
	var pubs = ldNames(ld.publisher);
	if (!pubs.length) {
		pubs = companiesForLabel(root, /^publish(ed by|er|ers)?:?$/i);
	}
	if (pubs.length) {
		item.company = pubs.join(', ');
	}

	// --- Release date (JSON-LD datePublished -> "Released" label) ---
	var date = (ld.datePublished || '').toString().trim();
	if (!date) {
		let rel = valueNodeForLabel(root, /^release(d| date)?:?$/i);
		if (rel) {
			let valueEl = (rel.tagName === 'DD') ? rel : (rel.nextElementSibling || rel);
			date = ZU.trimInternal(valueEl.textContent || '')
				.replace(/^release(d| date)?:?\s*/i, '');
		}
	}
	if (date) {
		item.date = date;
	}

	// --- Platforms -> system ---
	var platforms = ldNames(ld.gamePlatform);
	if (!platforms.length) {
		for (let a of root.querySelectorAll('a[href*="/platform/"]')) {
			let p = ZU.trimInternal(a.textContent);
			if (p && !platforms.includes(p)) platforms.push(p);
		}
	}
	if (platforms.length) {
		item.system = platforms.join(', ');
	}

	// --- Genres -> tags ---
	var genres = [];
	for (let g of ldNames(ld.genre)) {
		for (let part of g.split(/\s*,\s*/)) {
			if (part) genres.push(part);
		}
	}
	if (!genres.length) {
		for (let a of root.querySelectorAll('a[href*="/genre/"]')) {
			let g = ZU.trimInternal(a.textContent);
			if (g && !genres.includes(g)) genres.push(g);
		}
	}
	for (let g of genres) {
		item.tags.push(g);
	}

	// --- Cover image as a linked attachment (optional) ---
	var cover = meta(doc, 'og:image');
	if (cover) {
		item.attachments.push({
			title: 'Cover Image',
			url: cover,
			mimeType: 'image/jpeg',
			snapshot: false
		});
	}

	// --- MobyGames ID -> Extra ---
	var mobyId = (url.match(/\/game\/(\d+)/) || [])[1];
	if (mobyId) {
		item.extra = 'MobyGames ID: ' + mobyId;
	}

	item.libraryCatalog = 'MobyGames';

	if (!item.title) {
		Z.debug('MobyGames: no title found — not a game page, or the page structure changed.');
		return;
	}
	item.complete();
}

/** BEGIN TEST CASES **/
var testCases = [
	{
		// Detection works as is. Run in Scaffold and "Save to testCases"
		// to capture the expected item once selectors are confirmed.
		"type": "web",
		"url": "https://www.mobygames.com/game/53619/dark-souls/",
		"detectedItemType": "computerProgram",
		"items": []
	},
	{
		"type": "web",
		"url": "https://www.mobygames.com/search/?q=dark+souls",
		"detectedItemType": "multiple",
		"items": "multiple"
	}
]
/** END TEST CASES **/
