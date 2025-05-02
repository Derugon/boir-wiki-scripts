// <nowiki>
( ( $, mw ) => mw.loader.using( [ 'site', 'mediawiki.util' ], () => {

/**
 * Name of the template that manages interwiki links.
 */
const template = 'nav'; // {{nav}}

/**
 * Names of the URL parameters used to pre-load language link edits.
 */
const urlParams = {
	lang: 'iwmlang',
	link: 'iwmlink'
};

/**
 * Updates a language link in a text.
 *
 * @param {string} text Text.
 * @param {string} langCode Language code.
 * @param {string} foreignTitle Foreign title.
 * @returns The text with the language link correctly set.
 */
const replaceInText = ( text, langCode, foreignTitle ) => {
	const templateIntro = `\\{\\{[${template[0].toUpperCase()}${template[0].toLowerCase()}]${template.slice( 1 )}[^}]*?`;

	// (1) Try to replace an already specified language link:
	//
	// {{nav | ... | fr = bla | ... }}
	// -------------------***--
	const replaceRegExp = new RegExp( `(${templateIntro}\\|\\s*${langCode}\\s*=\\s*)[^}|]*?(\\s*[}|])` );
	if ( replaceRegExp.test( text ) ) {
		return text.replace( replaceRegExp, `$1${foreignTitle}$2` );
	}

	// (2) Otherwise, try to add a new language link:
	//
	// {{nav | ... }}
	// ------------*
	const appendRegExp = new RegExp( `(${templateIntro})\\}` );
	if ( appendRegExp.test( text ) ) {
		return text.replace( appendRegExp, `$1|${langCode}=${foreignTitle}}` );
	}

	// (3) Otherwise, add a new template with language link.
	return `${text.trimEnd()}\n\n{{${template}|${langCode}=${foreignTitle}}}`;
};

/**
 * Pre-loads a language link replacement edit:
 * - when in edit mode and
 * - if the URL arguments are correctly set.
 */
const preloadEdit = () => {
	const $textarea = $( '#wpTextbox1' );
	if ( $textarea.length === 0 ) {
		return;
	}

	const langCode = mw.util.getParamValue( urlParams.lang );
	let foreignTitle = mw.util.getParamValue( urlParams.link );
	if ( langCode === null || foreignTitle === null ) {
		return;
	}

	foreignTitle = decodeURIComponent( foreignTitle );

	// (1) Update text content.
	let contents = $textarea.textSelection( 'getContents' );
	contents = replaceInText( contents, langCode, foreignTitle );
	$textarea.textSelection( 'setContents', contents );

	// (2) Check as minor edit.
	const minorEdit = document.getElementById( 'wpMinoredit' );
	if ( minorEdit !== null ) {
		minorEdit.checked = true;
	}

	// (3) Update summary.
	const summary = document.getElementById( 'wpSummary' );
	if ( summary !== null ) {
		summary.value = `${langCode.toUpperCase()} link`;
	}

	// (4) Show changes.
	const diff = document.getElementById( 'wpDiff' );
	if ( diff !== null ) {
		diff.click();
	}
};

hookFiredOnce( 'wikipage.editform' ).then( preloadEdit );

} ) )( jQuery, mediaWiki );
// </nowiki>
