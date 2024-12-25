/**
 * Name:         TODO
 * Description:  TODO
 *
 * Module:       ext.gadget.content-filter-view
 * Dependencies: ext.gadget.content-filter-core
 */

// <nowiki>

( function ( mw, console ) {

if ( !window.cf || 'parseView' in window.cf ) {
	// Already loaded, or something went wrong.
	return;
}
const cf = window.cf;

/** @this {( ...msg: string[] ) => void} */
function logger() {
	const args = Array.from( arguments );
	args.unshift( '[content-filter-core]' );
	this.apply( null, args );
}
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
function domPanic( note ) {
	var message = (
		"Something went wrong, either DOM elements have been modified in an" +
		"unexpected way, or they have been disconnected from the document."
	);

	if ( note ) {
		message += "\nAdditional note: " + note;
	}

	throw message;
}

/**
 * TODO
 * @param {number} index
 */
function parseView( index ) {
	Array.from(
		cf.getContainers(),
		parseView.eachContainer,
		index
	);
}

/**
 * @this {number}
 * @param {HTMLElement} container
 */
parseView.eachContainer = function ( container ) {
	addContainerToView( container, this );
}

/**
 * TODO
 * @param {HTMLElement} container
 * @param {number} view
 */
function addContainerToView( container, view ) {
	if ( container.classList.contains( css.containerViewClassPrefix + view ) ) {
		return;
	}

	parseViewStackContainer( container, view );
	container.classList.add( css.containerViewClassPrefix + view );
}

/**
 * TODO
 * @param {HTMLElement} container
 */
function getContainerViews( container ) {
	/** @type {number[]} */
	const views = [];
	container.classList.forEach( getContainerViews.insert, views );
	return views;
}

/**
 * @this {number[]}
 * @param {string} className
 */
getContainerViews.insert = function ( className ) {
	if ( className.startsWith( css.containerViewClassPrefix ) ) {
		this.push( +className.substring( css.containerViewClassPrefix.length ) );
	}
}

/**
 * TODO
 * @param {HTMLElement} container
 * @param {number} view
 */
function parseViewStackContainer( container, view ) {
	const elementSet = new Set();
	Array.from(
		cf.getTags( container ),
		getViewElementsFromTag,
		{ set: elementSet, filter: Math.pow( 2, view ) }
	);

	/** @type {HTMLElement[]} */
	const stack = [];
	Array.from( elementSet ).sort( nodePostOrder ).forEach( parseViewStackContext, stack );

	stack.forEach( addElementToView, view );
}

/**
 * TODO
 * @param {HTMLElement} content
 * @param {HTMLElement | null} container
 */
function cleanupViewContainer( content, container ) {
	if ( container === null ) {
		return;
	}

	const views = getContainerViews( content );

	// TODO: disable active view

	Array.from( content.getElementsByClassName( css.viewClass ), cleanupViewElement, views );

	views.forEach(
		removePrefixedClass,
		{ classList: content.classList, prefix: css.containerViewClassPrefix }
	);
}

/**
 * TODO
 * @this {{ set: Set<HTMLElement>, filter: number }}
 * @param {HTMLElement} tag
 */
function getViewElementsFromTag( tag ) {
	if ( cf.getFilter( tag ) & this.filter ) {
		// Full match: select the tag.
		this.set.add( tag );
		return;
	}

	// No match: select the tag and its context.
	const context = cf.getContext( tag );
	if ( context === null || context.length === 0 ) {
		return;
	}

	this.set.add( tag );
	Array.from( context, this.set.add.bind( this.set ) );
}

/**
 * TODO
 * @param {Node} n1
 * @param {Node} n2
 */
function nodePostOrder( n1, n2 ) {
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
}

/**
 * TODO
 * @this {HTMLElement[]}
 * @param {HTMLElement} context
 */
function parseViewStackContext( context ) {
	/** @type {HTMLElement?} */
	var element = context;
	do {
		element = applyViewRule( element, this );
	} while ( element );
}

/**
 * TODO
 * @this {number}
 * @param {HTMLElement} element
 */
function addElementToView( element ) {
	element.classList.add( css.viewClass );
	element.classList.add( css.viewClassPrefix + this );
}

/**
 * TODO
 * @this {number[]}
 * @param {HTMLElement} element
 */
function cleanupViewElement( element ) {
	element.classList.remove( css.viewClass );
	this.forEach( removePrefixedClass, { classList: element.classList, prefix: css.viewClassPrefix } );
}

/**
 * TODO
 * @param {HTMLElement} element
 * @param {HTMLElement[]} stack
 * @returns {HTMLElement?}
 */
function applyViewRule( element, stack ) {
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
}

/**
 * Remove child fragment.
 * [ <A> ... [ <X/> ] ... </A> ]
 *     ==>   [ <A> ... <X/> ... </A> ]
 * @param {HTMLElement} element
 * @param {HTMLElement[]} stack
 * @returns {HTMLElement?}
 */
function applyViewRule_parentInView( element, stack ) {
	const previousElement = stack.pop();
	if ( !previousElement ) {
		return null;
	}

	if ( !isChildOf( element, previousElement ) ) {
		stack.push( previousElement );
		return null;
	}

	return previousElement;
}

/**
 * Merge adjacent fragments.
 * <A> [ <B1/> ] ... [ <Bn/> ] [ <X/> ] </A>
 *     ==>   [ <A> <B1/> ... <Bn/> <X/> </A> ]
 * @param {HTMLElement} element
 * @param {HTMLElement[]} stack
 * @returns {HTMLElement?}
 */
function applyViewRule_allChildren( element, stack ) {
	const parent = element.parentElement;
	if ( parent === null ) {
		return null;
	}

	if ( element instanceof HTMLLIElement ) {
		if (
			!( parent instanceof HTMLUListElement ) &&
			!( parent instanceof HTMLMenuElement )
		) {
			return null;
		}
	}

	if ( cf.getNextSibling( element ).sibling ) {
		return null;
	}

	var i = stack.length - 1;
	var previousInfo = cf.getPreviousSibling( element );
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
}

/**
 * TODO
 * Merge adjacent fragments.
 * <hi/> [ <B1/> ] ... [ <Bn/> ] [ <X/> ] <hi/>
 *     ==>   [ <hi/> <B1/> ... <Bn/> <X/> ] <hi/>
 * @param {HTMLElement} element
 * @param {HTMLElement[]} stack
 * @returns {HTMLElement?}
 */
function applyViewRule_allHeaderElements( element, stack ) {
	// TODO
	return null;
}

/**
 * TODO
 * @param {HTMLElement[]} stack
 * @param {HTMLElement[]} toRestore
 */
function restoreStack( stack, toRestore ) {
	stack.push.apply( stack, toRestore.reverse() );
}

/**
 * @this {{ classList: DOMTokenList, prefix: string }}
 * @param {number} view
 */
function removePrefixedClass( view ) {
	this.classList.remove( this.prefix + '' + view );
}

/**
 * TODO
 * @param {Node} child
 * @param {Node} parent
 * @returns {boolean}
 */
function isChildOf( child, parent ) {
	const cmp = child.compareDocumentPosition( parent );
	return ( cmp & Node.DOCUMENT_POSITION_CONTAINS ) > 0;
}

mw.hook( 'contentFilter.content.beforeRegistered' ).add( function ( content, container ) {
	cleanupViewContainer( content, container );
} );

mw.hook( 'contentFilter.content.registered' ).add( function ( content, container ) {
	if ( container === null ) {
		return;
	}
	getContainerViews( container ).forEach( parseViewStackContainer.bind( null, content ) );
	// TODO: re-enable active view
} );

$.extend( window.cf, {
	parseView: parseView
} );

} )( mediaWiki, console );
// </nowiki>
