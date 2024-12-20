/**
 * Name:        TODO
 * Description: TODO
 *
 * Module:      ext.gadget.content-filter-core
 */

// <nowiki>

( function ( mw, document, console ) {

if ( window.cf ) {
	// Already loaded, or something went wrong.
	return;
}

/** @this {( ...msg: string[] ) => void} */
function logger() {
	const args = Array.from( arguments );
	args.unshift( '[content-filter-core]' );
	this.apply( null, args );
}
const log   = logger.bind( console.log );
const warn  = logger.bind( mw.log.warn );
const error = logger.bind( mw.log.error );

log( 'Loading.' );

/**
 * MediaWiki configuration values.
 */
const config = mw.config.get( [ 'skin', 'wgAction', 'wgIsRedirect', 'wgPageName' ] );

/**
 * The number of filtering layers (bits) used on pages.
 * @type {number}
 */
const filterCount = 5; // filterM = 31 (0b11111)

const css = {
	/**
	 * The class used on the page content.
	 */
	bodyContentClass: 'mw-body-content',

	/**
	 * If an element on a page has this class (directly on the page or
	 * transcluded), the filtering becomes available, even if the page is not
	 * from a namespace in filteredNamespaces or in filteredSpecialTitles.
	 */
	filterEnableClass: 'cf-enable',

	/**
	 * TODO
	 */
	tagClass: 'cf-tag',

	/**
	 * To indicate with which filters some content should be visible or hidden,
	 * the corresponding elements have to use a specific filtering class:
	 * 
	 *     <filterClassIntro><mask>
	 * 
	 * (<filterClassIntro> being the value of this parameter and <mask>
	 *  the bitmask of the filters the associated content should be available
	 *  with)
	 * 
	 * Each element also has to use a filtering type class (either
	 * blockFilterClass, wrapperFilterClass, or inlineFilterClass).
	 * 
	 * For instance, if the available filters were previously defined as:
	 * 
	 *     filters: [
	 *         { filter: 1, ... }, // 01
	 *         { filter: 2, ... }, // 10
	 *     ],
	 * 
	 * using "0" (00) as <mask> will hide the content while any of the filters
	 * are enabled, using "1" (01) as <mask> will hide the content while the
	 * second filter is enabled, using "2" (10) as <mask> will hide the content
	 * while the first filter is enabled, using "3" (11) as <mask> will have no
	 * effect (the content will be shown with any filter enabled). If the value
	 * of this parameter is 'cf-value-', then the following tags are valid uses:
	 * 
	 *     <span class="cf-val-2 ..."> ... </span>
	 *     <img class="cf-val-1 ..." />
	 */
	filterClassIntro: 'cf-val-',

	containerClass: 'cf-container',

	/**
	 * If an element with a filter bitmask class is inside an element with this
	 * class, the corresponding bitmask is applied to the surrounding section.
	 */
	contextFilterClass: 'cf-scope-section',

	/**
	 * If an element with a filter bitmask class is inside an element with the
	 * `contextFilterClass` class and this id, the corresponding bitmask is applied
	 * to the entire page: the filter buttons not matching the bitmask are disabled.
	 */
	pageContextFilterId: 'cf-scope-page',

	/**
	 * This class can be used on elements to make them invisible to filtering:
	 * the script will go through them when trying to remove elements. For
	 * instance, the button used to collapse tables (.mw-collapsible-toggle) is
	 * skipped by default.
	 */
	skipClass: 'cf-skip',

	/**
	 * If a page has navigation bars or elements considered out of the page
	 * content at the bottom of the page, using this class on at least the first
	 * one will prevent these elements from being removed with a previous
	 * section (see contextFilterClass).
	 */
	contentEndClass: 'cf-end',

	/**
	 * By default, a row is removed from a table if its first cell is removed.
	 * If the title cell of a table is not the first one, then a class with the
	 * following format can be used to indicate which cell should be considered
	 * the main one:
	 * 
	 *     <mainColumnClassIntro><index>
	 * 
	 * (<mainColumnClassIntro> being the value of this parameter and <index>
	 *  the index of the main cell, the first one being 1)
	 * 
	 * For instance, if the value of this parameter is 'main-column-', then the
	 * following classes can be used to respectively make the second and third
	 * columns the main ones:
	 * 
	 *     {| class="main-column-2"
	 *      ! Column 1
	 *      ! Main column 2
	 *      ! Column 3
	 *      ...
	 *      |}
	 *     {| class="main-column-3"
	 *      ! Column 1
	 *      ! Column 2
	 *      ! Main column 3
	 *      ...
	 *      |}
	 */
	mainColumnClassIntro: 'cf-table-col-',

	/**
	 * If a table has this class, its cells can be removed (instead of being
	 * only cleared), the following cells on the column will then be shifted.
	 */
	listTableClass: 'cf-list',

	/**
	 * This class works the same way as skipClass, except that the element will
	 * be put back on the page somewhere else if it has to be removed.
	 */
	inContentAdClass: 'gpt-ad',

	contextClass: 'cf-context',
	contextClassPrefix: 'cf-context-',
};

/**
 * The current page title.
 * @type {mw.Title}
 */
const currentTitle = new mw.Title( config.wgPageName );

/**
 * The maximum allowed numeric filter, preventing content from being removed
 * with any filter.
 * @type {number}
 */
const filterMax = Math.pow( 2, filterCount ) - 1;

/**
 * TODO
 * @type {boolean}
 */
var filteringForced = false;

/**
 * TODO
 * @type {HTMLElement[]}
 */
const containers = [];

/**
 * TODO
 * @type {number}
 */
var pageFilter = filterMax;

/**
 * TODO
 * @type {number}
 */
var nextTagIndex = 0;

/**
 * Called when some text should be processed by the content filter.
 * @param {JQuery} $content The content element to process.
 */
function onContentLoaded( $content ) {
	const content = $content[ 0 ];
	if ( !content ) {
		return;
	}

	parseFilter( content );
}

/**
 * TODO
 * @param {HTMLElement} content
 * @returns {boolean}
 */
function isMainContent( content ) {
	return content.classList.contains( css.bodyContentClass );
}

/**
 * Indicates whether the filters should be used on a page because of the use of
 * in-content specific markers.
 * @param {Document} content The page content.
 * @returns {boolean} True if the filters should be used, false otherwise.
 */
function isFilteringForced( content ) {
	if ( content.getElementsByClassName( css.filterEnableClass ).length ) {
		return true;
	}

	return false;
}

/**
 * Checks if the entire page is limited to some versions then sets the page
 * global filter accordingly.
 * @returns {number}
 */
function getPageFilter() {
	const pageContextBox = document.getElementById( css.pageContextFilterId );
	if ( !pageContextBox ) {
		return filterMax;
	}

	if ( isTag( pageContextBox ) ) {
		return getFilter( pageContextBox );
	}

	const tagChild = getTags( pageContextBox )[ 0 ];
	if ( !tagChild ) {
		error(
			"Neither the page context and any of its children have a " +
			"filter value property."
		);
		return filterMax;
	}

	return getFilter( tagChild );
}
/**
 * TODO
 * @param {Document | HTMLElement} [root]
 */
function getTags( root ) {
	if ( root instanceof HTMLElement ) {
		return root.getElementsByClassName( css.tagClass );
	} else {
		return ( root || document ).getElementsByClassName( css.tagClass );
	}
}

/**
 * TODO
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isTag( element ) {
	return element.classList.contains( css.tagClass );
}

/**
 * TODO
 * @param {HTMLElement} container
 */
function parseFilter( container ) {
	if ( container.classList.contains( css.containerClass ) ) {
		return;
	}

	if ( getContainers( container )[ 0 ] ) {
		error(
			'The newly added content contains elements which are already ' +
			'managed by this script. The filtering has been disabled ' +
			'on the newly added content.'
		);
		// TODO: handle this case properly, by only registering new tags and
		//       regenerating the associated view fragments, or domPanic().
		return;
	}

	const parentContainer = getParentContainer( container );

	if ( isMainContent( container ) ) {
		filteringForced   = isFilteringForced( document );
		containers.length = 0;
	}

	if ( !filteringAvailable && !filteringForced ) {
		return;
	}

	mw.hook( 'contentFilter.content.beforeRegistered' ).fire( container, parentContainer );

	container.classList.add( css.containerClass );

	if ( isMainContent( container ) ) {
		log( 'Initializing state.' );
		pageFilter = getPageFilter();
		mw.hook( 'contentFilter.content.pageFilter' ).fire( pageFilter );
	}

	Array.from( getTags( container ), parseTag );

	if ( parentContainer === null ) {
		containers.push( container );
	}

	mw.hook( 'contentFilter.content.registered' ).fire( container, parentContainer );
}

/**
 * TODO
 * @param {Document | HTMLElement} [root]
 */
function getContainers( root ) {
	if ( root instanceof HTMLElement ) {
		return root.getElementsByClassName( css.containerClass );
	} else {
		return ( root || document ).getElementsByClassName( css.containerClass );
	}
}

/**
 * Finds whether the given node is inside a managed container.
 * @param {Node} node Node to search from.
 * @returns The parent container if there is one, null otherwise.
 */
function getParentContainer( node ) {
	var parent = node.parentElement;
	while ( parent ) {
		if ( parent.classList.contains( css.containerClass ) ) {
			return parent;
		}

		parent = parent.parentElement;
	}

	return null;
}

/**
 * TODO
 * @param {HTMLElement} tag
 */
function parseTag( tag ) {
	if ( tag.dataset.cfContext !== undefined ) {
		return;
	}

	const context = getContext( tag );
	if ( context === null ) {
		warn( 'No context found for the following tag:', tag );
		return;
	}

	tag.dataset.cfContext = '' + nextTagIndex;
	context.forEach( parseTag.addToContext );
	nextTagIndex++;
}

/**
 * @param {HTMLElement} element
 */
parseTag.addToContext = function ( element ) {
	element.classList.add( css.contextClass );
	element.classList.add( css.contextClassPrefix + nextTagIndex );
}

/**
 * Indicates whether the filters can be used on a page.
 * @param {mw.Title} pageTitle The page title.
 * @returns {boolean} True if the filters can be used, false otherwise.
 */
function isFilteringAvailable( pageTitle ) {
	if ( config.wgIsRedirect || ![ 'view', 'edit' ].includes( config.wgAction ) ) {
		return false;
	}

	const namespace = pageTitle.getNamespaceId();
	if ( [ 0, 2 ].includes( namespace ) ) {
		return true;
	}

	const pageName = pageTitle.getPrefixedText();
	if ( pageName === 'Special:Random' ) {
		return true;
	}

	return false;
}

/**
 * Gets the numeric filter of an element.
 * @param {HTMLElement} tag The element.
 * @returns {number} The numeric filter of the given element.
 */
function getFilter( tag ) {
	if ( tag.dataset.cfVal ) {
		return +tag.dataset.cfVal;
	}

	if ( !isTag( tag ) ) {
		return filterMax;
	}

	const classList = tag.classList;
	for ( var i = 0; i < classList.length; ++i ) {
		const className = classList[ i ];
		if ( !className || !className.startsWith( css.filterClassIntro ) ) {
			continue;
		}

		const filterClass = className.substring( css.filterClassIntro.length );
		const filter      = +filterClass;
		if ( filter < 0 ) {
			continue;
		}

		tag.dataset.cfVal = filterClass;
		return filter;
	}

	return filterMax;
}

/**
 * TODO
 * @param {HTMLElement} tag
 */
function getContext( tag ) {
	if ( tag.dataset.cfContext !== undefined ) {
		return Array.from( document.getElementsByClassName( css.contextClassPrefix + tag.dataset.cfContext ) );
	}

	const result = (
		getTagContext_firstChild( tag ) ||
		null
	);

	// TODO: other rules

	return result;
}

/**
 * TODO
 * <A> (tag) ... </A>
 *     ==>   [ <A> (tag) ... </A> ]
 * @param {HTMLElement} tag
 */
function getTagContext_firstChild( tag ) {
	const result = getPreviousSibling( tag );
	if ( result.sibling !== null ) {
		return null;
	}

	if ( result.parent === null ) {
		return null;
	}

	return [ result.parent ];
}

/**
 * TODO
 * @param {Node} node The node.
 * @returns {{ sibling: Node } | { sibling: null, parent: HTMLElement | null }}
 */
function getPreviousSibling( node ) {
	while ( true ) {
		var sibling = node.previousSibling;
		while ( isGhostNode( sibling ) ) {
			sibling = sibling.previousSibling;
		}

		if ( sibling ) {
			return { sibling: sibling };
		}

		const parent = node.parentElement;
		if ( !isGhostContainer( parent ) ) {
			return { sibling: null, parent: parent };
		}

		node = parent;
	}
}

/**
 * TODO
 * @param {Node} node The node.
 * @returns {{ sibling: Node } | { sibling: null, parent: HTMLElement? }}
 */
function getNextSibling( node ) {
	while ( true ) {
		var sibling = node.nextSibling;
		while ( isGhostNode( sibling ) ) {
			sibling = sibling.nextSibling;
		}

		if ( sibling ) {
			return { sibling: sibling };
		}

		const parent = node.parentElement;
		if ( !isGhostContainer( parent ) ) {
			return { sibling: null, parent: parent };
		}

		node = parent;
	}
}

/**
 * Indicates whether a node should be considered as an additional non-essential node.
 * @template {Node} T
 * @param {T?} node The node.
 * @returns {node is T} True if the node is non-essential, false otherwise.
 */
function isGhostNode( node ) {
	if ( !node ) {
		return false;
	}

	switch ( node.nodeType ) {
	case Node.COMMENT_NODE:
		return true;

	case Node.TEXT_NODE:
		return !node.textContent || !node.textContent.trim();

	case Node.ELEMENT_NODE:
		/** @type {HTMLElement} */ // @ts-ignore
		const element = node;

		if (
			element.classList.contains( 'mw-collapsible-toggle' ) ||
			element.classList.contains( css.skipClass )
		) {
			return true;
		}

		// TODO: if isGhostContainer( element ), we need to find some non-ghost thing in it.

		return false;

	default:
		return false;
	}
}

/**
 * Indicates whether an element should not be considered as a container,
 * and its children should then be considered being part of its parent.
 * @param {HTMLElement?} element The container element.
 * @returns {element is HTMLElement} True if the element is not an actual container, false otherwise.
 */
function isGhostContainer( element ) {
	if ( !element ) {
		return false;
	}

	if ( element.tagName === 'SPAN' ) {
		return true;
	}

	return false;
}

/**
 * Whether the filters can be used on the current page.
 * @type {boolean}
 */
const filteringAvailable = isFilteringAvailable( currentTitle );

window.contentFilter =
window.cf = {
	filterMax: filterMax,
	containers: containers,
	isFilteringAvailable: isFilteringAvailable,
	getTags: getTags,
	getContainers: getContainers,
	getFilter: getFilter,
	getContext: getContext,
	getPreviousSibling: getPreviousSibling,
	getNextSibling: getNextSibling
};

safeAddContentHook( onContentLoaded );

} )( mediaWiki, document, console );
// </nowiki>
