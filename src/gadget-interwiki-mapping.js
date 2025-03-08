// <nowiki>
( async ( $, mw ) => {

/**
 * Foreign wiki index URL.
 */
const foreignIndexUrl = new URL( 'https://bindingofisaacrebirth.wiki.gg/index.php' );

/**
 * Foreign wiki action API.
 */
const foreignApi = new mw.ForeignApi( 'https://bindingofisaacrebirth.wiki.gg/api.php' );

/**
 * Template arguments to use for storing revisions.
 * The tokens __LOCAL_TITLE__ and __FOREIGN_REV__ should appear (exactly) once.
 */
const templateArgs = [ 'interlangue', '__LOCAL_TITLE__', '__FOREIGN_REV__' ];
// {{revision | <fr title> | <en rev> }}

/**
 * Name of the template to insert new templates before.
 */
const closingTemplate = 'interlangue/fin';

/**
 * How many titles to retrieve data for in a single API request.
 */
const titleBatchSize = 100;
/**
 * How many revids to retrieve data for in a single API request.
 */
const revidBatchSize = 100;

// TODO: add a reload button

const urlParams = {
	title: 'iwmtitle',
	revid: 'iwmrevid'
};

const css = {
	foreignClass: 'iwm-foreign',
	diffClass: 'iwm-diff',
	actionsClass: 'iwm-actions',

	unsetDiffClass: 'iwm-diff-unset',
	uptodateDiffClass: 'iwm-diff-uptodate',
	outdatedDiffClass: 'mw-diff-bytes',
	outdatedNullDiffClass: 'mw-plusminus-null',
	outdatedPosDiffClass: 'mw-plusminus-pos',
	outdatedNegDiffClass: 'mw-plusminus-neg'
};

const config = mw.config.get( [ 'wgAction', 'wgPageName' ] );

/** @type {InterwikiMapping.Data} */
const data = {
	mappings: {},
	pages: {},
	revisions: {}
};

/**
 * @param {HTMLElement?} element
 * @returns {InterwikiMapping.Mapping?}
 */
const getMapping = ( element ) => {
	let localTitle = undefined, foreignTitle = undefined, foreignRevid = undefined;
	while ( element !== null ) {
		if ( localTitle   === undefined ) { localTitle   = element.dataset.iwmTitle;     }
		if ( foreignTitle === undefined ) { foreignTitle = element.dataset.iwmLoadTitle; }
		if ( foreignRevid === undefined ) { foreignRevid = element.dataset.iwmLoadRevid; }

		if ( localTitle !== undefined ) {
			if ( foreignRevid !== undefined ) {
				return { local: new mw.Title( localTitle ), foreign: +foreignRevid };
			} else if ( foreignTitle !== undefined ) {
				return { local: new mw.Title( localTitle ), foreign: foreignTitle };
			}
		}

		element = element.parentElement;
	}
	return null;
};

/**
 * @template {HTMLElement} T
 * @param {T} element
 * @param {( element: T, mapping: InterwikiMapping.Data.Mapping ) => void} callback
 */
const prepareLoadMapping = ( element, callback ) => {
	const mapping = getMapping( element );
	if ( mapping === null ) {
		return false;
	}

	if ( typeof mapping.foreign === 'string' ) {
		if ( !prepareLoadPageMapping( mapping.local, mapping.foreign ) ) {
			return false;
		}
	} else {
		if ( !prepareLoadRevisionMapping( mapping.local, mapping.foreign ) ) {
			return false;
		}
	}

	mw.hook( `interwikiMapping.update.${mapping.local}` ).add( ( mapping ) => callback( element, mapping ) );
	return true;
};

/**
 * @param {mw.Title} localTitle
 * @param {string} title
 */
const prepareLoadPageMapping = ( localTitle, title ) => {
	if ( data.mappings[localTitle.getPrefixedText()] !== undefined ) {
		return false;
	}

	if ( data.pages[title] === undefined ) {
		if ( loadMappings.mappingsPerTitle[title] === undefined ) {
			loadMappings.mappingsPerTitle[title] = [];
		}
		loadMappings.mappingsPerTitle[title].push( localTitle );
		loadMappings.titlesToLoad[title] = true;
	}

	return true;
};

/**
 * @param {mw.Title} localTitle
 * @param {number} revid
 */
const prepareLoadRevisionMapping = ( localTitle, revid ) => {
	if ( data.mappings[localTitle.getPrefixedText()] !== undefined ) {
		return false;
	}

	if ( data.revisions[revid] === undefined ) {
		if ( loadMappings.mappingsPerRevid[revid] === undefined ) {
			loadMappings.mappingsPerRevid[revid] = [];
		}
		loadMappings.mappingsPerRevid[revid].push( localTitle );
		loadMappings.revidsToLoad[revid] = true;
	}

	return true;
};

/**
 * @returns {Promise<void>}
 */
const loadMappings = async () => {
	if ( loadMappings.running ) {
		return;
	}

	const revids = Object.keys( loadMappings.revidsToLoad );
	if ( revids.length > 0 ) {
		loadMappings.revidsToLoad = {};
		await loadMappings.queryByBatch( 'revids', revids, revidBatchSize );
		await loadMappings();
		return;
	}

	const titles = Object.keys( loadMappings.titlesToLoad );
	if ( titles.length > 0 ) {
		loadMappings.titlesToLoad = {};
		await loadMappings.queryByBatch( 'titles', titles, titleBatchSize );
		await loadMappings();
		return;
	}
};

/** @type {boolean} */
loadMappings.running = false;
/** @type {Record<string, true>} */
loadMappings.titlesToLoad = {};
/** @type {Record<number, true>} */
loadMappings.revidsToLoad = {};
/** @type {Record<string, mw.Title[]>} */
loadMappings.mappingsPerTitle = {};
/** @type {Record<number, mw.Title[]>} */
loadMappings.mappingsPerRevid = {};

/**
 * @param {string} param
 * @param {string[] | number[]} inputs
 * @param {number} batchSize
 */
loadMappings.queryByBatch = async ( param, inputs, batchSize ) => {
	loadMappings.running = true;

	const params = {
		action: 'query',
		prop: [ 'info', 'revisions' ],
		rvprop: [ 'ids', 'size' ]
	};

	const batchPromises = [];
	for ( let i = 0; i < inputs.length; i += batchSize ) {
		params[param] = inputs.slice( i, i + batchSize );
		batchPromises.push( foreignApi.get( params ).then( loadMappings.onResponse ) );
	}
	await Promise.all( batchPromises );

	for ( const title in loadMappings.mappingsPerTitle ) {
		for ( const local of loadMappings.mappingsPerTitle[title] ) {
			setMapping( title, local );
		}
		delete loadMappings.mappingsPerTitle[title];
	}

	for ( const revid in loadMappings.mappingsPerRevid ) {
		for ( const local of loadMappings.mappingsPerRevid[revid] ) {
			setMapping( +revid, local );
		}
		delete loadMappings.mappingsPerRevid[revid];
	}

	loadMappings.running = false;
};

/**
 * @param {InterwikiMapping.ApiResponse} response
 */
loadMappings.onResponse = ( response ) => {
	for ( const pageid in response.query.pages ) {
		const pageRes = response.query.pages[pageid];

		if ( +pageid < 0 ) {
			console.error( `IWM: Page "${pageRes.title}" inexistante.` );
			continue;
		}

		delete loadMappings.titlesToLoad[pageRes.title];
		// @ts-ignore
		data.pages[pageRes.title] = { title: pageRes.title };
		const page = data.pages[pageRes.title];

		for ( const revisionRes of pageRes.revisions ) {
			delete loadMappings.revidsToLoad[revisionRes.revid];
			data.revisions[revisionRes.revid] = {
				page: page,
				id: revisionRes.revid,
				size: revisionRes.size
			};
		}

		page.lastRevision = data.revisions[pageRes.lastrevid];
		if ( page.lastRevision === undefined ) {
			loadMappings.revidsToLoad[pageRes.lastrevid] = true;
		}
	}
};

/**
 * @param {string | number | null} foreign
 * @param {mw.Title} local
 */
const setMapping = ( foreign, local ) => {
	/** @type {InterwikiMapping.Data.Mapping} */
	const mapping = { localTitle: local };
	if ( typeof foreign === 'string' ) {
		mapping.foreignPage = data.pages[foreign];
	} else if ( typeof foreign === 'number' ) {
		mapping.foreignRevision = data.revisions[foreign];
		mapping.foreignPage = mapping.foreignRevision.page;
	}

	const localText = local.getPrefixedText();
	data.mappings[localText] = mapping;
	mw.hook( `interwikiMapping.update.${local}` ).fire( data.mappings[localText] );
};

/**
 * @template T
 * @template U
 * @param {T[]} array
 * @param {U} sep
 */
const intersperse = ( array, sep ) => {
	const result = [];
	if ( array.length > 0 ) {
		result.push( array[0] );
		for ( let i = 1; i < array.length; ++i ) {
			result.push( sep, array[i] );
		}
	}
	return result;
};

/**
 * @param {string} str
 */
const ignoreFirstCase = ( str ) => {
	const fst = str[0];
	return `[${fst.toUpperCase()}${fst.toLowerCase()}]${str.slice( 1 )}`;
};

/**
 * @this {Record<string, string>}
 * @param {string} str
 */
const replaceTokens = function ( str ) {
	for ( const [ token, value ] of Object.entries( this ) ) {
		str = str.replace( token, value );
	}
	return str;
};

/**
 * @param {string} text
 * @param {mw.Title} title
 * @param {number} revid
 */
const setRevisionInText = ( text, title, revid ) => {
	const prefixedTitle = title.getPrefixedText();
	const regExpTitle = ignoreFirstCase( prefixedTitle );
	const regExpArgs = templateArgs.map( replaceTokens, {
		__LOCAL_TITLE__: regExpTitle,
		__FOREIGN_REV__: ')\\d+('
	} );
	regExpArgs[0] = ignoreFirstCase( regExpArgs[0] );

	const regExpParts = intersperse( regExpArgs, '\\|' );
	regExpParts.unshift( '(\\{\\{' );
	regExpParts.push( '\\}\\})' );

	const regExp = new RegExp( regExpParts.join( '\\s*' ) );
	if ( regExp.test( text ) ) {
		return text.replace( regExp, `$1${revid}$2` );
	}

	const args = templateArgs.map( replaceTokens, {
		__LOCAL_TITLE__: prefixedTitle,
		__FOREIGN_REV__: revid
	} );
	const newTemplate = `{{${args.join( ' | ' )}}}`;

	const closingRegExp = new RegExp( `(\\{\\{\\s*${ignoreFirstCase( closingTemplate )})` );
	if ( closingRegExp.test( text ) ) {
		return text.replace( closingRegExp, `${newTemplate}\n$1` );
	}

	return `${text.trimEnd()}\n${newTemplate}`;
};

/**
 * @param {mw.Title} title
 * @param {number} revid
 */
const setRevisionWithDOM = ( title, revid ) => {
	const $textarea = $( '#wpTextbox1' );
	if ( $textarea.length === 0 ) {
		return;
	}

	/** @type {string} */
	let contents = $textarea.textSelection( 'getContents' );
	contents = setRevisionInText( contents, title, revid );
	$textarea.textSelection( 'setContents', contents );

	// TODO: change edit summary

	setMapping( revid, title );
};

/**
 * @param {HTMLElement} element
 * @param {InterwikiMapping.Data.Mapping} mapping
 */
const fillForeign = ( element, mapping ) => {
	const page = mapping.foreignPage;

	element.textContent = '';

	if ( page !== undefined ) {
		const url = new URL( foreignIndexUrl );
		url.searchParams.set( 'title', page.title );
		url.searchParams.set( 'action', 'edit' );

		const a = document.createElement( 'a' );
		a.classList.add( 'external', 'text' );
		a.href = url.href;
		a.textContent = page.title;

		element.appendChild( a );
	} else {
		element.textContent = '(invalid)';
	}
};

/**
 * @param {HTMLElement} element
 * @param {InterwikiMapping.Data.Mapping} mapping
 */
const fillDiff = ( element, mapping ) => {
	const page = mapping.foreignPage;
	const revision = mapping.foreignRevision;

	element.classList.remove(
		css.unsetDiffClass, css.uptodateDiffClass, css.outdatedDiffClass,
		css.outdatedNullDiffClass, css.outdatedPosDiffClass, css.outdatedNegDiffClass
	);

	if ( page === undefined || revision === undefined ) {
		element.classList.add( css.unsetDiffClass );
		element.textContent = '';
	} else if ( revision.id === page.lastRevision.id ) {
		element.classList.add( css.uptodateDiffClass );
		element.textContent = '(up-to-date)';
	} else {
		element.classList.add( css.outdatedDiffClass );
		const sizeDiff = page.lastRevision.size - revision.size;
		if ( sizeDiff === 0 ) {
			element.classList.add( css.outdatedNullDiffClass );
			element.textContent = '0';
		} else if ( sizeDiff > 0 ) {
			element.classList.add( css.outdatedPosDiffClass );
			element.textContent = `+${sizeDiff}`;
		} else {
			element.classList.add( css.outdatedNegDiffClass );
			element.textContent = `-${sizeDiff}`;
		}
	}
};

/**
 * @param {HTMLElement} element
 * @param {string} text
 * @param {string} [href]
 */
const createActionLink = ( element, text, href ) => {
	if ( element.firstChild === null ) {
		element.appendChild( document.createTextNode( '[' ) );
	} else {
		element.appendChild( document.createTextNode( ' [' ) ).normalize();
	}

	const a = document.createElement( 'a' );
	if ( href !== undefined ) {
		a.href = href;
	}
	a.textContent = text;
	element.appendChild( a );

	element.appendChild( document.createTextNode( ']' ) );
	return a;
};

/**
 * @param {HTMLElement} element
 * @param {InterwikiMapping.Data.Mapping} mapping
 */
const fillActions = ( element, mapping ) => {
	const title = mapping.localTitle;
	const page = mapping.foreignPage;
	const revision = mapping.foreignRevision;

	element.textContent = '';

	if ( page === undefined ) {
		// nothing
	} else if ( revision === undefined ) {
		if ( config.wgAction === 'edit' ) {
			createActionLink( element, 'lier' ).addEventListener( 'click', setRevisionWithDOM.bind( null, title, page.lastRevision.id ) );
		} else if ( config.wgAction === 'view' ) {
			/** @type {InterwikiMapping.QueryParams} */
			const params = { action: 'edit' };
			params[urlParams.title] = title.getPrefixedText();
			params[urlParams.revid] = page.lastRevision.id;
			createActionLink( element, 'lier', new mw.Title( config.wgPageName ).getUrl( params ) );
		}
	} else if ( revision.id !== page.lastRevision.id ) {
		const diffUrl = new URL( foreignIndexUrl );
		diffUrl.searchParams.set( 'type', 'revision' );
		diffUrl.searchParams.set( 'oldid', `${revision.id}` );
		createActionLink( element, 'diff', diffUrl.href );

		if ( config.wgAction === 'edit' ) {
			createActionLink( element, 'synchroniser' ).addEventListener( 'click', setRevisionWithDOM.bind( null, title, page.lastRevision.id ) );
		} else if ( config.wgAction === 'view' ) {
			/** @type {InterwikiMapping.QueryParams} */
			const params = { action: 'edit' };
			params[urlParams.title] = title.getPrefixedText();
			params[urlParams.revid] = page.lastRevision.id;
			createActionLink( element, 'synchroniser', new mw.Title( config.wgPageName ).getUrl( params ) );
		}
	}
};

const preloadEdit = () => {
	const titleText = mw.util.getParamValue( urlParams.title );
	const revid = mw.util.getParamValue( urlParams.revid );
	if ( titleText === null || revid === null ) {
		return false;
	}

	const preview = document.getElementById( 'wpPreview' );
	if ( preview !== null ) {
		preview.click();
	}

	const minorEdit = document.getElementById( 'wpMinoredit' );
	if ( minorEdit !== null ) {
		minorEdit.checked = true;
	}

	const title = new mw.Title( decodeURIComponent( titleText ) );
	setRevisionWithDOM( title, +revid );
	return true;
};

await hookFiredOnce( 'wikipage.content' );

if ( config.wgAction === 'edit' ) {
	preloadEdit();
}

safeAddContentHook( ( $content ) => {
	$content.find( `.${css.foreignClass}` ).filter( ( _, e ) => prepareLoadMapping( e, fillForeign ) );
	$content.find( `.${css.diffClass   }` ).filter( ( _, e ) => prepareLoadMapping( e, fillDiff    ) );
	$content.find( `.${css.actionsClass}` ).filter( ( _, e ) => prepareLoadMapping( e, fillActions ) );
	loadMappings();
} );

} )( jQuery, mediaWiki );
// </nowiki>
