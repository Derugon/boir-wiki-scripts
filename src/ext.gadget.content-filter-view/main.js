/**
 * Name:         TODO
 * Description:  TODO
 *
 * Module:       ext.gadget.content-filter-view
 * Dependencies: ext.gadget.content-filter-core
 */

// <nowiki>
( ( mw ) => mw.loader.using( [
	'ext.gadget.content-filter-core', 'ext.gadget.logger'
], ( require ) => {

const cf = require( 'ext.gadget.content-filter-core' );
const DOMTraversal = cf.DOMTraversal;

const Logger = require( 'ext.gadget.logger' );
const log = new Logger( 'content-filter-view' );

/**
 * Maximum number of rules applied to a base context element.
 * May get lowered down to improve performance.
 */
const maxVisualizerIterationCount = 100;

const css = {
	viewClass: 'cf-view',
	viewClassPrefix: 'cf-view-',
	viewMarkerClassPrefix: 'cf-view-marker-',
	containerViewClassPrefix: 'cf-container-view-',
};

/**
 * TODO
 * @param {number} index
 */
const parseView = ( index ) => {
	for ( const container of cf.getContainers() ) {
		if ( container.classList.contains( `${css.containerViewClassPrefix}${index}` ) ) {
			return;
		}

		new ViewContainer( container ).prepare( index );
		container.classList.add( `${css.containerViewClassPrefix}${index}` );
	}
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

class ViewContainer {
	/**
	 * @param {HTMLElement} container
	 */
	constructor( container ) {
		this.container = container;
	}

	/**
	 * @param {number} view
	 */
	prepare( view ) {
		const filter = Math.pow( 2, view );
		/** @type {Set<HTMLElement>} */
		const elementSet = new Set();
		for ( const tag of cf.getTags( this.container ) ) {
			if ( cf.getFilter( tag ) & filter ) {
				// Full match: select the tag.
				elementSet.add( tag );
				continue;
			}

			// No match: select the tag and its context.
			const context = cf.getContext( tag );
			if ( context.length === 0 ) {
				continue;
			}

			elementSet.add( tag );
			for ( const contextElement of context ) {
				elementSet.add( contextElement );
			}
		}

		const visualizer = new Visualizer( this.container, view );
		for ( const context of Array.from( elementSet ).sort( nodePostOrder ) ) {
			visualizer.add( context );
		}

		for ( const element of visualizer.getElements() ) {
			element.classList.add( css.viewClass, `${css.viewClassPrefix}${view}` );
		}

		for ( const element of visualizer.getMarkerElements() ) {
			element.classList.add( `${css.viewMarkerClassPrefix}${view}` );
		}
	}

	/**
	 * @param {number[]} views
	 */
	cleanup( views ) {
		for ( const element of queryElementsByClassName( css.viewClass, this.container ) ) {
			element.classList.remove( css.viewClass );
			for ( const view of views ) {
				element.classList.remove( `${css.viewClassPrefix}${view}` );
			}
		}

		for ( const view of views ) {
			for ( const element of queryElementsByClassName( `${css.viewMarkerClassPrefix}${view}`, this.container ) ) {
				element.classList.remove( `${css.viewMarkerClassPrefix}${view}` );
			}
		}
	}
}

class Visualizer {
	/**
	 * @param {HTMLElement} container
	 * @param {number} view
	 */
	constructor( container, view ) {
		this.container = container;
		this.view = view;
		/** @type {HTMLElement[]} */
		this.stack = [];
		/** @type {HTMLElement[]} */
		this.tabStack = [];
		/** @type {HTMLElement[]} */
		this.tocSectionStack = [];
		this.toc = document.getElementById( 'toc' );
	}

	/**
	 * @param {HTMLElement} element
	 */
	add( element ) {
		let i = 0;
		for ( ; i < maxVisualizerIterationCount; ++i ) {
			const mergedElement = this.merge( element );

			if ( mergedElement === null ) {
				break;
			}

			element = mergedElement;
		}

		if ( i === maxVisualizerIterationCount ) {
			log.error( 'Maximum iteration count reached.', element );
		}

		this.stack.push( element );

		for ( const heading of queryElementsByClassName( 'mw-headline', element ) ) {
			this.addTocSection( heading );
		}
	}

	getElements() {
		return [ ...this.tocSectionStack, ...this.stack ];
	}

	getMarkerElements() {
		return this.tabStack;
	}

	/**
	 * @param {HTMLElement} headline
	 */
	addTocSection( headline ) {
		if ( this.toc === null ) {
			return;
		}

		const anchor = this.toc.querySelector( `a[href$="#${headline.id}"]` );
		if ( anchor === null ) {
			return;
		}

		const tocSection = anchor.closest( 'li' ) || log.panic();
		this.tocSectionStack.push( tocSection );
	}

	/**
	 * @param {HTMLElement} element
	 * @returns {HTMLElement?}
	 */
	merge( element ) {
		return (
			this.mergeParentInView( element ) ||
			this.mergeGhostParents( element ) ||
			this.mergeAllChildren( element ) ||
			this.mergeAllHeaderElements( element ) ||
			this.mergeAlt( element ) ||
			null
		);
	}

	/**
	 * Remove child fragment.
	 * [ <A> ... [ <X/> ] ... </A> ]
	 *     ==>   [ <A> ... <X/> ... </A> ]
	 *
	 * @param {HTMLElement} element
	 * @returns {HTMLElement?}
	 */
	mergeParentInView( element ) {
		const previousElement = this.stack.pop();
		if ( !previousElement ) {
			return null;
		}

		if ( isChildOf( previousElement, element ) ) {
			return element;
		} else if ( isChildOf( element, previousElement ) ) {
			return previousElement;
		}

		this.stack.push( previousElement );
		return null;
	}

	/**
	 * Wrap covered ghost containers.
	 *
	 * @param {HTMLElement} element
	 * @returns {HTMLElement?}
	 */
	mergeGhostParents( element ) {
		let ghostParent = null;
		let parent = element.parentElement;

		while (
			parent !== null &&
			DOMTraversal.isGhostContainer( parent ) &&
			DOMTraversal.directPreviousSibling( element.previousSibling ) === null &&
			DOMTraversal.directNextSibling( element.nextSibling ) === null
		) {
			ghostParent = element = parent;
			parent = element.parentElement;
		}

		return ghostParent;
	}

	/**
	 * Merge adjacent fragments.
	 * <A> [ <B1/> ] ... [ <Bn/> ] [ <X/> ] </A>
	 *     ==>   [ <A> <B1/> ... <Bn/> <X/> </A> ]
	 *
	 * @param {HTMLElement} element
	 * @returns {HTMLElement?}
	 */
	mergeAllChildren( element ) {
		const parent = element.parentElement;
		if ( parent === null || [ 'TR', 'TD', 'TH' ].includes( parent.tagName ) ) {
			return null;
		}

		// Select tab list even if 1 tab is not in view.
		let allowSiblingOutOfView = element.role === 'tab' && parent.role === 'tablist';

		let nextSibling = DOMTraversal.directNextSibling( element.nextSibling );
		while ( nextSibling !== null ) {
			if ( allowSiblingOutOfView ) {
				allowSiblingOutOfView = false;
				if ( nextSibling instanceof HTMLElement ) {
					this.tabStack.push( nextSibling );
				}
				nextSibling = DOMTraversal.directNextSibling( nextSibling.nextSibling );
			} else {
				return null;
			}
		}

		let i = this.stack.length - 1;
		let previousSibling = DOMTraversal.directPreviousSibling( element.previousSibling );
		let previousElement = this.stack[ i ];
		while ( previousSibling !== null && i >= 0 ) {
			if (
				previousSibling === previousElement ||
				isChildOf( previousSibling, previousElement )
			) {
				// Previous element in view.
				previousElement = this.stack[ --i ];
				previousSibling = DOMTraversal.directPreviousSibling( previousSibling.previousSibling );
			} else if ( allowSiblingOutOfView ) {
				// Previous element not in view, but allowed.
				allowSiblingOutOfView = false;
				if ( previousSibling instanceof HTMLElement ) {
					this.tabStack.push( previousSibling );
				}
				previousSibling = DOMTraversal.directPreviousSibling( previousSibling.previousSibling );
			} else {
				// Previous element not in view.
				return null;
			}
		}

		if ( previousSibling !== null ) {
			// Previous element in view.
			return null;
		}

		this.stack.length = i + 1;
		return parent;
	}

	/**
	 * Merge alternative fragments.
	 * <altX-1/> <A1/> ... <An/> [ <altX/> ] <B1/> ... <Bn/> <altX+1/>
	 *     ==>   <altX-1/> [ <A1/> ... <An/> ] [ <altX/> ] [ <B1/> ... <Bn/> ] <altX+1/>
	 *
	 * @param {HTMLElement} element
	 * @returns {HTMLElement?}
	 */
	mergeAlt( element ) {
		if ( !element.classList.contains( cf.css.contextAltClass ) ) {
			return null;
		}

		const toPushToStack = [];

		// Absorb previous siblings up to the previous alt.
		const previousElementOnStack = this.stack[ this.stack.length - 1 ];
		let previousElement = element.previousElementSibling;
		while (
			previousElement !== null &&
			previousElement !== previousElementOnStack &&
			!previousElement.classList.contains( cf.css.contextAltClass )
		) {
			previousElement = previousElement.previousElementSibling;
		}

		if ( previousElement !== null ) {
			const previousNextSibling = previousElement.nextSibling;
			if ( previousNextSibling === null || previousNextSibling === element ) {
				// nothing
			} else if ( previousNextSibling.nextSibling === element && previousNextSibling instanceof HTMLElement ) {
				toPushToStack.push( previousNextSibling );
			} else {
				const wrapper = document.createElement( 'span' );
				const range = new Range();
				range.setStartAfter( previousElement );
				range.setEndBefore( element );
				range.surroundContents( wrapper );
				previousElement.after( wrapper );
				toPushToStack.push( wrapper );
			}
		}

		// Absorb next siblings up to the next alt.
		let nextElement = element.nextElementSibling;
		while (
			nextElement !== null &&
			!nextElement.classList.contains( cf.css.contextAltClass )
		) {
			nextElement = nextElement.nextElementSibling;
		}

		if ( nextElement !== null ) {
			const nextPreviousSibling = nextElement.previousSibling;
			if ( nextPreviousSibling === null || nextPreviousSibling === element ) {
				// nothing
			} else if ( nextPreviousSibling.previousSibling === element && nextPreviousSibling instanceof HTMLElement ) {
				toPushToStack.push( element );
				element = nextPreviousSibling;
			} else {
				const wrapper = document.createElement( 'span' );
				const range = new Range();
				range.setStartAfter( element );
				range.setEndBefore( nextElement );
				range.surroundContents( wrapper );
				nextElement.before( wrapper );
				toPushToStack.push( element );
				element = wrapper;
			}
		}

		if ( toPushToStack.length === 0 ) {
			return null;
		}

		for ( const element of toPushToStack ) {
			this.stack.push( element );
		}

		return element;
	}

	/**
	 * Select heading along with its section content.
	 * <hi/> [ <B1/> ] ... [ <Bn/> ] [ <X/> ] <hi/>
	 *     ==>   [ <hi/> <B1/> ... <Bn/> <X/> ] <hi/>
	 *
	 * @param {HTMLElement} element
	 * @returns {HTMLElement?}
	 */
	mergeAllHeaderElements( element ) {
		const nextSibling = DOMTraversal.directNextSibling( element.nextSibling );

		let headingLevel;
		if ( nextSibling === null ) {
			headingLevel = 1;
		} else if ( nextSibling instanceof HTMLHeadingElement ) {
			headingLevel = DOMTraversal.headingLevel( nextSibling );
		} else {
			return null;
		}

		let i = this.stack.length - 1;
		let previousSibling = DOMTraversal.directPreviousSibling( element.previousSibling );
		while ( previousSibling !== null && i >= 0 ) {
			const previousElement = this.stack[ i ];

			if (
				previousSibling !== previousElement &&
				!isChildOf( previousSibling, previousElement )
			) {
				if ( previousSibling instanceof HTMLHeadingElement && headingLevel <= DOMTraversal.headingLevel( previousSibling ) ) {
					const wrapper = document.createElement( 'div' );
					const range = new Range();
					range.setStartAfter( previousSibling );
					range.setEndAfter( element );
					range.surroundContents( wrapper );
					previousSibling.after( wrapper );

					this.stack.length = i + 1;
					this.stack.push( previousSibling );

					const previousHeadline = previousSibling.getElementsByClassName( 'mw-headline' )[ 0 ];
					if ( previousHeadline !== undefined ) {
						this.addTocSection( previousHeadline );
					}

					return wrapper;
				} else {
					return null;
				}
			}

			--i;
			previousSibling = DOMTraversal.directPreviousSibling( previousElement.previousSibling );
		}

		return null;
	}
}

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

	const viewContainer = new ViewContainer( content );
	viewContainer.cleanup( views );

	for ( const view of views ) {
		content.classList.remove( `${css.containerViewClassPrefix}${view}` );
	}
};

/**
 * Post-order for nodes: (previous sibling of X) < X < (child of X) < (next sibling of X)
 *
 * @param {Node} n1 1st node to compare.
 * @param {Node} n2 2nd node to compare.
 * @returns -1 if n1 < n2, 1 if n1 > n2, 0 otherwise.
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
 * @param {Node} child
 * @param {Node} parent
 * @returns {boolean}
 */
const isChildOf = ( child, parent ) => {
	const cmp = child.compareDocumentPosition( parent );
	return ( cmp & Node.DOCUMENT_POSITION_CONTAINS ) > 0;
};

module.exports = { css, parseView };

mw.hook( 'contentFilter.content.beforeRegistered' ).add( ( content, container ) => {
	cleanupViewContainer( content, container );
} );

mw.hook( 'contentFilter.content.registered' ).add( ( content, container ) => {
	if ( container === null ) {
		return;
	}

	const viewContainer = new ViewContainer( content );
	for ( const view of getContainerViews( container ) ) {
		viewContainer.prepare( view );
	}
	// TODO: re-enable active view
} );

} ) )( mediaWiki );
// </nowiki>
