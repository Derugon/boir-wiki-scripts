/**
 * Name:         TODO
 * Description:  TODO
 *
 * Module:       ext.gadget.content-filter-view
 * Dependencies: ext.gadget.content-filter-core
 */

// <nowiki>

( ( mw, console ) => {

if ( !window.cf || 'parseView' in window.cf ) {
	// Already loaded, or something went wrong.
	return;
}
const cf = window.cf;

/**
 * @this {( ...msg: string[] ) => void}
 * @param {...string} msgs
 */
const logger = function ( ...msgs ) {
	msgs.unshift( '[content-filter-view]' );
	this.apply( null, msgs );
};
const log   = logger.bind( console.log );
const warn  = logger.bind( mw.log.warn );
const error = logger.bind( mw.log.error );

const css = {
	viewClass: 'cf-view',
	viewClassPrefix: 'cf-view-',
	containerViewClassPrefix: 'cf-container-view-',
};

/**
 * Handles an "impossible" case, supposedly caused by other scripts breaking the
 * expected DOM elements.
 * @param {string} [note] Some information about the missing or invalid elements.
 * @returns {never}
 */
const domPanic = ( note ) => {
	let message = (
		'Something went wrong, either DOM elements have been modified in an ' +
		'unexpected way, or they have been disconnected from the document.'
	);

	if ( note ) {
		message += `\nAdditional note: ${note}`;
	}

	throw message;
};

/**
 * TODO
 * @param {number} index
 */
const parseView = ( index ) => {
	for ( const container of cf.getContainers() ) {
		addContainerToView( container, index );
	}
};

/**
 * TODO
 * @param {HTMLElement} container
 * @param {number} view
 */
const addContainerToView = ( container, view ) => {
	if ( container.classList.contains( `${css.containerViewClassPrefix}${view}` ) ) {
		return;
	}

	parseViewStackContainer( container, view );
	container.classList.add( `${css.containerViewClassPrefix}${view}` );
};

/**
 * TODO
 * @param {HTMLElement} container
 */
const getContainerViews = ( container ) => {
	/** @type {number[]} */
	const views = [];
	for ( const className of container.classList ) {
		if ( className.startsWith( css.containerViewClassPrefix ) ) {
			views.push( +className.substring( css.containerViewClassPrefix.length ) );
		}
	}
	return views;
};

/**
 * TODO
 * @param {HTMLElement} container
 * @param {number} view
 */
const parseViewStackContainer = ( container, view ) => {
	const filter = Math.pow( 2, view );
	/** @type {Set<HTMLElement>} */
	const elementSet = new Set();
	for ( const tag of cf.getTags( container ) ) {
		if ( cf.getFilter( tag ) & filter ) {
			// Full match: select the tag.
			elementSet.add( tag );
			continue;
		}

		// No match: select the tag and its context.
		const context = cf.getContext( tag );
		if ( context === null || context.length === 0 ) {
			continue;
		}

		elementSet.add( tag );
		for ( const contextElement of context ) {
			elementSet.add( contextElement );
		}
	}

	/** @type {HTMLElement[]} */
	const stack = [];
	for ( const context of Array.from( elementSet ).sort( nodePostOrder ) ) {
		/** @type {HTMLElement?} */
		let element = context;
		do {
			element = applyViewRule( element, stack );
		} while ( element );
	}

	for ( const element of stack ) {
		element.classList.add( css.viewClass, `${css.viewClassPrefix}${view}` );
	}
};

/**
 * TODO
 * @param {HTMLElement} content
 * @param {HTMLElement | null} container
 */
const cleanupViewContainer = ( content, container ) => {
	if ( container === null ) {
		return;
	}

	const views = getContainerViews( content );

	// TODO: disable active view

	for ( const element of queryElementsByClassName( css.viewClass, content ) ) {
		element.classList.remove( css.viewClass );
		for ( const view of views ) {
			element.classList.remove( `${css.viewClassPrefix}${view}` );
		}
	}

	for ( const view of views ) {
		content.classList.remove( `${css.containerViewClassPrefix}${view}` );
	}
};

/**
 * TODO
 * @param {Node} n1
 * @param {Node} n2
 */
const nodePostOrder = ( n1, n2 ) => {
	if ( n1 === n2 ) {
		return 0;
	}

	const cmp = n1.compareDocumentPosition( n2 );
	if ( cmp & Node.DOCUMENT_POSITION_CONTAINED_BY ) {
		return 1;
	} else if ( cmp & Node.DOCUMENT_POSITION_CONTAINS ) {
		return -1;
	} else if ( cmp & Node.DOCUMENT_POSITION_PRECEDING ) {
		return 1;
	} else {
		return -1;
	}
};

/**
 * TODO
 * @param {HTMLElement} element
 * @param {HTMLElement[]} stack
 * @returns {HTMLElement?}
 */
const applyViewRule = ( element, stack ) => {
	const result = (
		applyViewRule_parentInView( element, stack ) ||
		applyViewRule_allChildren( element, stack ) ||
		applyViewRule_allHeaderElements( element, stack ) ||
		null
	);

	// TODO: other rules

	if ( !result ) {
		stack.push( element );
	}

	return result;
};

/**
 * Remove child fragment.
 * [ <A> ... [ <X/> ] ... </A> ]
 *     ==>   [ <A> ... <X/> ... </A> ]
 * @param {HTMLElement} element
 * @param {HTMLElement[]} stack
 * @returns {HTMLElement?}
 */
const applyViewRule_parentInView = ( element, stack ) => {
	const previousElement = stack.pop();
	if ( !previousElement ) {
		return null;
	}

	if ( isChildOf( previousElement, element ) ) {
		return element;
	} else if ( isChildOf( element, previousElement ) ) {
		return previousElement;
	}

	stack.push( previousElement );
	return null;
};

/**
 * Merge adjacent fragments.
 * <A> [ <B1/> ] ... [ <Bn/> ] [ <X/> ] </A>
 *     ==>   [ <A> <B1/> ... <Bn/> <X/> </A> ]
 * @param {HTMLElement} element
 * @param {HTMLElement[]} stack
 * @returns {HTMLElement?}
 */
const applyViewRule_allChildren = ( element, stack ) => {
	let parent = element.parentElement;
	while ( parent !== null && parent instanceof HTMLDivElement ) {
		parent = parent.parentElement;
	}

	if ( parent === null ) {
		return null;
	}

	if ( element instanceof HTMLDivElement || element instanceof HTMLSpanElement ) {
		// ok
	} else if ( element instanceof HTMLLIElement ) {
		if (
			!( parent instanceof HTMLUListElement ) &&
			!( parent instanceof HTMLMenuElement )
		) {
			return null;
		}
	} else if ( [ 'DT', 'DD' ].includes( element.tagName ) ) {
		if ( !( parent instanceof HTMLDListElement ) ) {
			return null;
		}
	} else {
		return null;
	}

	if ( cf.getNextSibling( element ).sibling ) {
		return null;
	}

	let i = stack.length - 1;
	let previousInfo = cf.getPreviousSibling( element );
	while ( previousInfo.sibling !== null && i >= 0 ) {
		const previousSibling = previousInfo.sibling;
		const previousElement = stack[ i ];

		if (
			!previousSibling.isSameNode( previousElement ) &&
			!isChildOf( previousSibling, previousElement )
		) {
			// Previous element not in view.
			return null;
		}

		--i;
		previousInfo = cf.getPreviousSibling( previousElement );
	}

	if ( previousInfo.sibling !== null ) {
		// No previous element in view.
		return null;
	}

	stack.length = i + 1;
	return previousInfo.parent;
};

/**
 * TODO
 * Merge adjacent fragments.
 * <hi/> [ <B1/> ] ... [ <Bn/> ] [ <X/> ] <hi/>
 *     ==>   [ <hi/> <B1/> ... <Bn/> <X/> ] <hi/>
 * @param {HTMLElement} element
 * @param {HTMLElement[]} stack
 * @returns {HTMLElement?}
 */
const applyViewRule_allHeaderElements = ( element, stack ) => {
	// TODO
	return null;
};

/**
 * TODO
 * @param {Node} child
 * @param {Node} parent
 * @returns {boolean}
 */
const isChildOf = ( child, parent ) => {
	const cmp = child.compareDocumentPosition( parent );
	return ( cmp & Node.DOCUMENT_POSITION_CONTAINS ) > 0;
};

mw.hook( 'contentFilter.content.beforeRegistered' ).add( ( content, container ) => {
	cleanupViewContainer( content, container );
} );

mw.hook( 'contentFilter.content.registered' ).add( ( content, container ) => {
	if ( container === null ) {
		return;
	}
	for ( const view of getContainerViews( container ) ) {
		parseViewStackContainer( content, view );
	}
	// TODO: re-enable active view
} );

Object.assign( window.cf, {
	parseView: parseView
} );

} )( mediaWiki, console );
// </nowiki>
