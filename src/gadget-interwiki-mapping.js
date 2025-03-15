// <nowiki>
( ( $, mw ) => {

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

const actions = {
	// Actions that make buttons act as in view mode
	view: new Set( [ 'view' ] ),
	// Actions that make buttons act as in edit mode
	edit: new Set( [ 'edit', 'submit' ] )
}

/** @type {InterwikiMapping.Data} */
const data = {
	mappings: {},
	pages: {},
	revisions: {},
	callbacks: {}
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
 * @param {InterwikiMapping.Data.Callback} callback
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

	if ( data.callbacks[mapping.local.getPrefixedText()] === undefined ) {
		data.callbacks[mapping.local.getPrefixedText()] = [];
	}
	data.callbacks[mapping.local.getPrefixedText()].push( [ element, callback ] );
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
			loadMappings.mappingsPerTitle[title] = new Set();
		}
		loadMappings.mappingsPerTitle[title].add( localTitle.getPrefixedText() );
		loadMappings.titlesToLoad.add( title );
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
			loadMappings.mappingsPerRevid[revid] = new Set();
		}
		loadMappings.mappingsPerRevid[revid].add( localTitle.getPrefixedText() );
		loadMappings.revidsToLoad.add( revid );
	}

	return true;
};

/**
 * @param {Set<string | number>} [queried]
 * @returns {Promise<void>}
 */
const loadMappings = ( queried ) => {
	if ( queried === undefined ) {
		if ( loadMappings.running ) {
			return Promise.resolve();
		}
		queried = new Set();
	}
	loadMappings.running = true;

	if ( loadMappings.revidsToLoad.size > 0 ) {
		const revids = Array.from( loadMappings.revidsToLoad );
		loadMappings.revidsToLoad.clear();

		return loadMappings.queryByBatch( 'revids', revids, revidBatchSize ).then( ( newlyQueried ) => {
			newlyQueried.forEach( queried.add, queried );
			return loadMappings( queried );
		} );
	}

	if ( loadMappings.titlesToLoad.size > 0 ) {
		const titles = Array.from( loadMappings.titlesToLoad );
		loadMappings.titlesToLoad.clear();

		return loadMappings.queryByBatch( 'titles', titles, titleBatchSize ).then( ( newlyQueried ) => {
			newlyQueried.forEach( queried.add, queried );
			return loadMappings( queried );
		} );
	}

	// Resolve mappings only once everything has been loaded.
	for ( const foreign of queried ) {
		let mappings;
		if ( typeof foreign === 'string' ) {
			mappings = loadMappings.mappingsPerTitle[foreign];
			delete loadMappings.mappingsPerTitle[foreign];
		} else {
			mappings = loadMappings.mappingsPerRevid[foreign];
			delete loadMappings.mappingsPerRevid[foreign];
		}

		if ( mappings !== undefined ) {
			for ( const local of mappings ) {
				setMapping( foreign, new mw.Title( local ) );
			}
		}
	}

	loadMappings.running = false;
	return Promise.resolve();
};

/** @type {boolean} */
loadMappings.running = false;
/** @type {Set<string>} */
loadMappings.titlesToLoad = new Set();
/** @type {Set<number>} */
loadMappings.revidsToLoad = new Set();
/** @type {Record<string, Set<string>>} */
loadMappings.mappingsPerTitle = {};
/** @type {Record<number, Set<string>>} */
loadMappings.mappingsPerRevid = {};

/**
 * @param {string} param
 * @param {string[] | number[]} inputs
 * @param {number} batchSize
 */
loadMappings.queryByBatch = ( param, inputs, batchSize ) => {
	/** @type {import("types-mediawiki/api_params").ApiQueryInfoParams & import("types-mediawiki/api_params").ApiQueryRevisionsParams} */
	const params = {
		action: 'query',
		prop: [ 'info', 'revisions' ],
		rvprop: [ 'ids', 'size' ]
	};

	const batchPromises = [];
	const queried = new Set();
	for ( let i = 0; i < inputs.length; i += batchSize ) {
		params[param] = inputs.slice( i, i + batchSize );
		batchPromises.push( foreignApi.get( params ).then( ( response ) => {
			loadMappings.onResponse( response ).forEach( queried.add, queried );
		} ) );
	}

	return Promise.all( batchPromises ).then( () => queried );
};

/**
 * @param {InterwikiMapping.ApiResponse} response
 */
loadMappings.onResponse = ( response ) => {
	/** @type {Set<string | number>} */
	const queried = new Set();

	for ( const pageid in response.query.pages ) {
		const pageRes = response.query.pages[pageid];

		if ( +pageid < 0 ) {
			console.error( `IWM: Page "${pageRes.title}" inexistante.` );
			continue;
		}

		loadMappings.titlesToLoad.delete( pageRes.title );
		if ( data.pages[pageRes.title] === undefined ) {
			// @ts-ignore: need to create revisions before setting page.lastRevision
			data.pages[pageRes.title] = { title: pageRes.title };
			queried.add( pageRes.title );
		}
		const page = data.pages[pageRes.title];

		for ( const revisionRes of pageRes.revisions ) {
			loadMappings.revidsToLoad.delete( revisionRes.revid );
			if ( data.revisions[revisionRes.revid] === undefined ) {
				data.revisions[revisionRes.revid] = {
					page: page,
					id: revisionRes.revid,
					size: revisionRes.size
				};
				queried.add( revisionRes.revid );
			}
		}

		page.lastRevision = data.revisions[pageRes.lastrevid];
		if ( page.lastRevision === undefined ) {
			loadMappings.revidsToLoad.add( pageRes.lastrevid );
		}
	}

	return queried;
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
		if ( mapping.foreignPage === undefined ) {
			// No data retrieved yet.
			return;
		}
	} else if ( typeof foreign === 'number' ) {
		mapping.foreignRevision = data.revisions[foreign];
		if ( mapping.foreignRevision === undefined ) {
			// No data retrieved yet.
			return;
		}
		mapping.foreignPage = mapping.foreignRevision.page;
	}

	const localText = local.getPrefixedText();
	data.mappings[localText] = mapping;
	for ( const [ element, callback ] of data.callbacks[local.getPrefixedText()] ) {
		callback( element, data.mappings[localText] );
	}
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
	const newTemplate = `{{${args.join( ' | ' )} }}`;

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
		if ( actions.edit.has( config.wgAction ) ) {
			createActionLink( element, 'lier' ).addEventListener( 'click', setRevisionWithDOM.bind( null, title, page.lastRevision.id ) );
		} else if ( actions.view.has( config.wgAction ) ) {
			/** @type {InterwikiMapping.QueryParams} */
			const params = { action: 'edit' };
			params[urlParams.title] = title.getPrefixedText();
			params[urlParams.revid] = page.lastRevision.id;
			createActionLink( element, 'lier', new mw.Title( config.wgPageName ).getUrl( params ) );
		}
	} else if ( revision.id !== page.lastRevision.id ) {
		const diffUrl = new URL( foreignIndexUrl );
		diffUrl.searchParams.set( 'oldid', `${revision.id}` );
		diffUrl.searchParams.set( 'diff', 'current' );
		createActionLink( element, 'diff', diffUrl.href );

		if ( actions.edit.has( config.wgAction ) ) {
			createActionLink( element, 'synchroniser' ).addEventListener( 'click', setRevisionWithDOM.bind( null, title, page.lastRevision.id ) );
		} else if ( actions.view.has( config.wgAction ) ) {
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
		return;
	}

	const minorEdit = document.getElementById( 'wpMinoredit' );
	if ( minorEdit !== null ) {
		minorEdit.checked = true;
	}

	const title = new mw.Title( decodeURIComponent( titleText ) );
	setRevisionWithDOM( title, +revid );
};

hookFiredOnce( 'wikipage.editform' ).then( preloadEdit );

safeAddContentHook( ( $content ) => {
	// We are only interested in elements generated by the parser
	if ( !$content.is( '.mw-parser-output' ) ) {
		$content = $content.children( '.mw-parser-output' );
		if ( $content.length === 0 ) {
			return;
		}
	}

	// Do not run in real time preview!
	if ( $content.parents( '.ext-WikiEditor-realtimepreview-preview' ).length > 0 ) {
		return;
	}

	data.mappings  = {};
	data.pages     = {};
	data.revisions = {};
	data.callbacks = {};

	$content.find( `.${css.foreignClass}` ).filter( ( _, e ) => prepareLoadMapping( e, fillForeign ) );
	$content.find( `.${css.diffClass   }` ).filter( ( _, e ) => prepareLoadMapping( e, fillDiff    ) );
	$content.find( `.${css.actionsClass}` ).filter( ( _, e ) => prepareLoadMapping( e, fillActions ) );
	loadMappings();
} );

} )( jQuery, mediaWiki );
// </nowiki>
