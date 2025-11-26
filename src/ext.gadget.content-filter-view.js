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

/**
 * @param {HTMLElement} container
 */
function ViewContainer( container ) {
	this.container = container;
}

ViewContainer.prototype = {
	constructor: ViewContainer,

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
	},

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
};

/**
 * @param {HTMLElement} container
 * @param {number} view
 */
function Visualizer( container, view ) {
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

Visualizer.prototype = {
	constructor: Visualizer,

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
	},

	getElements() {
		return [ ...this.tocSectionStack, ...this.stack ];
	},

	getMarkerElements() {
		return this.tabStack;
	},

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
	},

	/**
	 * @param {HTMLElement} element
	 * @returns {HTMLElement?}
	 */
	merge( element ) {
		const mergedElement = (
			this.mergeParentInView( element ) ||
			this.mergeGhostParents( element ) ||
			this.mergeAllChildren( element ) ||
			this.mergeAllHeaderElements( element ) ||
			null
		);

		return mergedElement;
	},

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
	},

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
			DOMTraversal.previousSibling( element, parent ).sibling === null &&
			DOMTraversal.nextSibling( element, parent ).sibling === null
		) {
			ghostParent = element = parent;
			parent = element.parentElement;
		}

		return ghostParent;
	},

	/**
	 * Merge adjacent fragments.
	 * <A> [ <B1/> ] ... [ <Bn/> ] [ <X/> ] </A>
	 *     ==>   [ <A> <B1/> ... <Bn/> <X/> </A> ]
	 *
	 * @param {HTMLElement} element
	 * @returns {HTMLElement?}
	 */
	mergeAllChildren( element ) {
		if ( [ 'TD', 'TH' ].includes( element.tagName ) ) {
			return null;
		}

		const parent = DOMTraversal.parent( element );
		if ( parent === null ) {
			return null;
		}

		// Select tab list even if 1 tab is not in view.
		let allowSiblingOutOfView = element.role === 'tab' && parent.role === 'tablist';

		let nextInfo = DOMTraversal.nextSibling( element, parent );
		while ( nextInfo.sibling !== null ) {
			if ( allowSiblingOutOfView ) {
				allowSiblingOutOfView = false;
				if ( nextInfo.sibling instanceof HTMLElement ) {
					this.tabStack.push( nextInfo.sibling );
				}
				nextInfo = DOMTraversal.nextSibling( nextInfo.sibling, parent );
			} else {
				return null;
			}
		}

		let i = this.stack.length - 1;
		let previousInfo = DOMTraversal.previousSibling( element, parent );
		let previousElement = this.stack[ i ];
		while ( previousInfo.sibling !== null && i >= 0 ) {
			if (
				previousInfo.sibling === previousElement ||
				isChildOf( previousInfo.sibling, previousElement )
			) {
				// Previous element in view.
				previousElement = this.stack[ --i ];
				previousInfo = DOMTraversal.previousSibling( previousInfo.sibling, parent );
			} else if ( allowSiblingOutOfView ) {
				// Previous element not in view, but allowed.
				allowSiblingOutOfView = false;
				if ( previousInfo.sibling instanceof HTMLElement ) {
					this.tabStack.push( previousInfo.sibling );
				}
				previousInfo = DOMTraversal.previousSibling( previousInfo.sibling, parent );
			} else {
				// Previous element not in view.
				return null;
			}
		}

		if ( previousInfo.sibling !== null ) {
			// No previous element in view.
			return null;
		}

		this.stack.length = i + 1;
		return previousInfo.parent;
	},

	/**
	 * Select heading along with its section content.
	 * <hi/> [ <B1/> ] ... [ <Bn/> ] [ <X/> ] <hi/>
	 *     ==>   [ <hi/> <B1/> ... <Bn/> <X/> ] <hi/>
	 *
	 * @param {HTMLElement} element
	 * @returns {HTMLElement?}
	 */
	mergeAllHeaderElements( element ) {
		console.log( 'mergeHeader', element )
		const parent = element.parentElement || log.panic();
		const nextInfo = DOMTraversal.nextSibling( element, parent );

		let headingLevel;
		if ( nextInfo.sibling === null ) {
			headingLevel = 1;
		} else if ( nextInfo.sibling instanceof HTMLHeadingElement ) {
			headingLevel = DOMTraversal.headingLevel( nextInfo.sibling );
		} else {
			return null;
		}

		let i = this.stack.length - 1;
		let previousInfo = DOMTraversal.previousSibling( element, parent );
		while ( previousInfo.sibling !== null && i >= 0 ) {
			const previousSibling = previousInfo.sibling;
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
					previousSibling.insertAdjacentElement( 'afterend', wrapper );

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
			previousInfo = DOMTraversal.previousSibling( previousElement, parent );
		}

		return null;
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

	const viewContainer = new ViewContainer( content );
	viewContainer.cleanup( views );

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
 * @param {Node} child
 * @param {Node} parent
 * @returns {boolean}
 */
const isChildOf = ( child, parent ) => {
	const cmp = child.compareDocumentPosition( parent );
	return ( cmp & Node.DOCUMENT_POSITION_CONTAINS ) > 0;
};

module.exports = { parseView };

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
