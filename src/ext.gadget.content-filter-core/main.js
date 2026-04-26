/**
 * Name:        TODO
 * Description: TODO
 *
 * Module:      ext.gadget.content-filter-core
 */

// <nowiki>
( ( mw, document ) => mw.loader.using( [
	'site', 'mediawiki.Title', 'ext.gadget.logger', 'ext.gadget.polyfills-weakref'
], ( require ) => {

const Logger = require( 'ext.gadget.logger' );
/** @type {Logger} */
const log = new Logger( 'content-filter-core' );

log.info( 'Loading.' );

/**
 * MediaWiki configuration values.
 */
const config = mw.config.get( [ 'skin', 'wgAction', 'wgIsRedirect', 'wgPageName' ] );

/**
 * The number of filtering layers (bits) used on pages.
 *
 * @type {number}
 */
const filterCount = 5; // filterM = 31 (0b11111)

/**
 * Sequence delimiters used to split paragraphs.
 *
 * @type {Record<string, ContentFilter.TextDelimiter>}
 */
const textDelimiters = {
	'(': { isEnclosed: true, closedBy: /\)/ },
	',': { isEnclosed: false, closedBy: /(?:[.?!]+|,)/ },
	'.': { isEnclosed: false, closedBy: /[.?!]+/ },
	'!': { isEnclosed: false, closedBy: /[.?!]+/ },
	'?': { isEnclosed: false, closedBy: /[.?!]+/ }
};

const css = {
	/**
	 * The classes used on the page content.
	 */
	mainContentClasses: [ 'mw-content-ltr', 'mw-content-rtl', 'mw-body-content' ],

	/**
	 * If an element on a page has this class (directly on the page or
	 * transcluded), the filtering becomes available, even if the page is not
	 * from a namespace in filteredNamespaces or in filteredSpecialTitles.
	 */
	filterEnableClass: 'cf-enable',

	/**
	 * If an element on a page has this class (directly on the page or
	 * transcluded), the filtering becomes unavailable, even if the page is
	 * from a namespace in filteredNamespaces or in filteredSpecialTitles.
	 */
	filterDisableClass: 'cf-disable',

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
	sectionScopeClass: 'cf-scope-section',

	/**
	 * If an element with a filter bitmask class is inside an element with this
	 * class, the corresponding bitmask is applied to the entire page:
	 * the filter buttons not matching the bitmask are disabled.
	 */
	pageScopeClass: 'cf-scope-page',

	altScopeClass: 'cf-scope-alt',
	contextAltClass: 'cf-context-alt',

	wrappedScopeClass: 'cf-scope-wrapped',
	contextWrapperClass: 'cf-context-wrapper',

	/**
	 * This class can be used on elements to make them invisible to filtering:
	 * the script will go through them when trying to remove elements. For
	 * instance, the button used to collapse tables (.mw-collapsible-toggle) is
	 * skipped by default.
	 */
	skipClass: 'cf-skip',

	solidClass: 'cf-solid',

	/**
	 * If a page has navigation bars or elements considered out of the page
	 * content at the bottom of the page, using this class on at least the first
	 * one will prevent these elements from being removed with a previous
	 * section (see sectionScopeClass).
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
 *
 * @type {mw.Title}
 */
const currentTitle = new mw.Title( config.wgPageName );

/**
 * The maximum allowed numeric filter, preventing content from being removed
 * with any filter.
 *
 * @type {number}
 */
const filterMax = Math.pow( 2, filterCount ) - 1;

/**
 * TODO
 * @type {boolean?}
 */
let filteringForced = null;

/**
 * Reigstry for managed containers. Reclaimed objects are freed from the registry when retrieved.
 */
const ContainerRegistry = {
	/**
	 * Managed containers.
	 *
	 * @type {WeakRef<HTMLElement>[]}
	 */
	containers: [],

	/**
	 * Registers a container.
	 *
	 * @param {HTMLElement} container Container.
	 */
	add: ( container ) => {
		ContainerRegistry.containers.push( new WeakRef( container ) );
	},

	/**
	 * Retrieves an array of all registered containers, excluding the reclaimed ones.
	 *
	 * @returns {HTMLElement[]} An array of registered containers.
	 */
	getAll: () => {
		const containers = [];

		let i = 0, j = 0;
		for ( ; i < ContainerRegistry.containers.length; ++i ) {
			const value = ContainerRegistry.containers[ i ].deref();
			if ( value !== undefined && value.isConnected ) {
				ContainerRegistry.containers[ j++ ] = ContainerRegistry.containers[ i ];
				containers.push( value );
			}
		}

		ContainerRegistry.containers.length = j;
		return containers;
	}
};

/**
 * Generate a context identifier, supposedly not used by any other element on the page.
 *
 * @returns {number}
 */
const newUniqueContextId = () => {
	return newUniqueContextId.next++;
};
newUniqueContextId.next = 0;

/**
 * Get the element wrapping the main page content.
 *
 * @param {HTMLElement} [root] The root element to search from.
 * @returns {HTMLElement?}
 */
const getMainContent = ( root = document.body ) => {
	for ( const mainContentClass of css.mainContentClasses ) {
		if ( root.classList.contains( mainContentClass ) ) {
			return root;
		}

		const mainContent = root.getElementsByClassName( mainContentClass )[ 0 ];
		if ( mainContent !== undefined ) {
			return mainContent;
		}
	}

	return null;
};

/**
 * Check whether the filters should be used on a page because of the use of
 * in-content specific markers.
 *
 * @param {HTMLElement} [root] The page content.
 * @returns {boolean?} True if the filters should be used, false if they should not,
 *                     null if there is no evidence.
 */
const isFilteringForced = ( root = document.body ) => {
	if ( root.getElementsByClassName( css.filterEnableClass )[ 0 ] ) {
		return true;
	}

	if ( root.getElementsByClassName( css.filterDisableClass )[ 0 ] ) {
		return false;
	}

	return null;
};

/**
 * Checks if the entire page is limited to some versions then sets the page
 * global filter accordingly.
 *
 * @param {HTMLElement} [root] The page content.
 * @returns {number}
 */
const getPageFilter = ( root = document.body ) => {
	const pageContextBox = root.getElementsByClassName( css.pageScopeClass )[ 0 ];
	if ( pageContextBox === undefined ) {
		return filterMax;
	}

	if ( pageContextBox.classList.contains( css.tagClass ) ) {
		return getFilter( pageContextBox );
	}

	const tagChild = pageContextBox.getElementsByClassName( css.tagClass )[ 0 ];
	if ( tagChild === undefined ) {
		log.error(
			'Neither the page context and any of its children have a ' +
			'filter value property.'
		);
		return filterMax;
	}

	return getFilter( tagChild );
};

/**
 * TODO
 * @param {HTMLElement} container
 */
const parseFilter = ( container ) => {
	if (
		container.classList.contains( css.containerClass ) ||
		container.getElementsByClassName( 'mw-editnotice' )[ 0 ] !== undefined
	) {
		return;
	}

	if ( container.getElementsByClassName( css.containerClass )[ 0 ] !== undefined ) {
		log.error(
			'The newly added content contains elements which are already ' +
			'managed by this script. The filtering has been disabled ' +
			'on the newly added content.'
		);
		// TODO: handle this case properly, by only registering new tags and
		//       regenerating the associated view fragments, or log.panic().
		return;
	}

	const parentContainer = getParentContainer( container );

	const mainContent = getMainContent( container );
	if ( mainContent !== null ) {
		container = mainContent;
		filteringForced = isFilteringForced( mainContent );
	}

	if ( filteringAvailable ? filteringForced === false : filteringForced !== true ) {
		return;
	}

	mw.hook( 'contentFilter.content.beforeRegistered' ).fire( container, parentContainer );

	container.classList.add( css.containerClass );

	if ( mainContent !== null ) {
		log.info( 'Initializing state.' );
		mw.hook( 'contentFilter.content.pageFilter' ).fire( getPageFilter( mainContent ) );
	}

	const contextualizer = new Contextualizer( container );
	for ( const tag of queryElementsByClassName( css.tagClass, container ).reverse() ) {
		getContext( tag, contextualizer );
	}

	if ( parentContainer === null ) {
		ContainerRegistry.add( container );
	}

	mw.hook( 'contentFilter.content.registered' ).fire( container, parentContainer );
};

/**
 * Finds whether the given node is inside a managed container.
 *
 * @param {Node} node Node to search from.
 * @returns The parent container if there is one, null otherwise.
 */
const getParentContainer = ( node ) => {
	let parent = node.parentElement;
	while ( parent ) {
		if ( parent.classList.contains( css.containerClass ) ) {
			return parent;
		}

		parent = parent.parentElement;
	}

	return null;
};

/**
 * Get the context elements of a tag.
 *
 * @param {HTMLElement} tag Tag element to get the context of.
 * @param {HTMLElement|Contextualizer} [contextualizer] Contextualizer to use for inference.
 * @returns {HTMLElement[]}
 */
const getContext = ( tag, contextualizer = document.body ) => {
	if ( tag.dataset.cfContext !== undefined ) {
		return queryElementsByClassName( `${css.contextClassPrefix}${tag.dataset.cfContext}` );
	}

	if ( contextualizer instanceof HTMLElement ) {
		contextualizer = new Contextualizer( contextualizer );
	}

	const filter = getFilter( tag );
	const context = contextualizer.infer( tag );
	const id = newUniqueContextId();

	let i = 0;
	for ( const contextElement of context ) {
		const tagChild = findInvalidTag( filter, contextElement );
		if ( tagChild !== null ) {
			log.warn( 'Context element fully contradicts an inner tag:', contextElement, tagChild );
		} else {
			contextElement.classList.add( css.contextClass, `${css.contextClassPrefix}${id}` );
			context[ i++ ] = contextElement;
		}
	}
	context.length = i;

	if ( context.length === 0 ) {
		log.warn( 'No valid context found for the following tag:', tag );
	} else {
		tag.dataset.cfContext = `${id}`;
	}

	return context;
};

/**
 * Find an invalid tag against a given filter.
 *
 * @param {number} filter Filter to check tag elements against.
 * @param {HTMLElement} [root] Root element to look for tags in.
 * @returns {HTMLElement?} An invalid child tag element, null if there is none.
 */
const findInvalidTag = ( filter, root = document.body ) => {
	const tagChildren = root.getElementsByClassName( css.tagClass );

	for (
		let i = 0, tagChild = tagChildren[ i ];
		tagChild !== undefined;
		tagChild = tagChildren[ ++i ]
	) {
		if ( ( getFilter( tagChild ) & filter ) === 0 ) {
			return tagChild;
		}
	}

	return null;
};

/**
 * Check whether the filters can be used on a page.
 *
 * @param {mw.Title} pageTitle The page title.
 * @returns {boolean} True if the filters can be used, false otherwise.
 */
const isFilteringAvailable = ( pageTitle ) => {
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
};

/**
 * Get the numeric filter of an element.
 *
 * @param {HTMLElement} tag The element.
 * @returns {number} The numeric filter of the given element.
 */
const getFilter = ( tag ) => {
	if ( tag.dataset.cfVal ) {
		return +tag.dataset.cfVal;
	}

	if ( !tag.classList.contains( css.tagClass ) ) {
		return filterMax;
	}

	const classList = tag.classList;
	for ( let i = 0; i < classList.length; ++i ) {
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
};

/**
 * @classdesc
 * Context inference inside a container.
 *
 * DOM information is cached, meaning this object can break if the DOM has been rearranged since it was created.
 */
class Contextualizer {
	/**
	 * @param {HTMLElement} root Root container.
	 */
	constructor( root ) {
		/**
		 * Root container.
		 *
		 * @type {HTMLElement}
		 */
		this.root = root;
		/**
		 * Row/column layout of observed tables within the root container.
		 *
		 * @type {WeakMap<HTMLTableElement, HTMLTableLayout>}
		 */
		this.tableLayouts = new WeakMap();
	}

	/**
	 * Infers the context of a tag.
	 *
	 * @param {HTMLElement} tag
	 * @returns {HTMLElement[]}
	 */
	infer( tag ) {
		const explicitContext = this.inferExplicitScope( tag );
		if ( explicitContext !== null ) {
			return explicitContext;
		}

		const previousSibling = DOMTraversal.previousSibling( tag );
		if ( previousSibling instanceof HTMLBRElement ) {
			return this.inferLine( previousSibling.nextSibling || tag ) || [];
		} else if ( previousSibling instanceof Text ) {
			const previousText = previousSibling.textContent.trim();
			const textDelimiter = textDelimiters[ previousText[ previousText.length - 1 ] ];
			if ( textDelimiter !== undefined ) {
				return this.inferTextSequence( textDelimiter, previousSibling.nextSibling || tag );
			}
			return [];
		} else if ( previousSibling !== null ) {
			// <A> ... (tag) ... </A>
			return [];
		}

		const headLineContext = this.inferLine( tag );
		if ( headLineContext !== null ) {
			return headLineContext;
		}

		const scope = DOMTraversal.parent( tag );
		if ( scope === null ) {
			// (tag) is alone
			return [ tag ];
		}

		switch ( scope.tagName ) {
			case 'A':
				return [ scope ];
			case 'DD':
				return [ scope ];
			case 'DT':
				return this.inferDefinition( scope );
			case 'H2':
			case 'H3':
			case 'H4':
			case 'H5':
			case 'H6':
				if ( scope instanceof HTMLHeadingElement ) {
					return this.inferSection( scope );
				}
				break;
			case 'LI':
				return [ scope ];
			case 'P':
				return [ scope ];
			case 'TD':
			case 'TH':
				if ( scope instanceof HTMLTableCellElement ) {
					const direction = getTableHeaderDirection( scope );
					if ( direction !== null ) {
						return this.inferTableHeader( scope, direction );
					} else {
						return this.inferTableCell( scope );
					}
				}
				break;
		}

		return [];
	}

	/**
	 * Find an explicit inference strategy specified on the element or one of its
	 * wrappers. Multiple strategies may be specified, in which case the best one
	 * is chosen, with the following priority ordering:
	 *  - strategies on the element itself, then its wrappers ordered by distance.
	 *  - on a single element/wrapper, strategy order depends on the strategy type,
	 *    the greedier ones come first (e.g. "page" > "section" > "alt" > "wrapped" ).
	 *
	 * @param {HTMLElement?} element
	 * @returns {HTMLElement[]?}
	 */
	inferExplicitScope( element ) {
		while ( element !== null ) {
			if ( element.classList.contains( css.pageScopeClass ) ) {
				const context = this.inferExplicitPageScope();
				if ( context !== null ) {
					return context;
				}
			} else if ( element.classList.contains( css.sectionScopeClass ) ) {
				const context = this.inferExplicitSectionScope( element );
				if ( context !== null ) {
					return context;
				}
			} else if ( element.classList.contains( css.altScopeClass ) ) {
				const context = this.inferExplicitAltScope( element );
				if ( context !== null ) {
					return context;
				}
			} else if ( element.classList.contains( css.wrappedScopeClass ) ) {
				const context = this.inferExplicitWrappedScope( element );
				if ( context !== null ) {
					return context;
				}
			}

			element = DOMTraversal.wrapper( element );
		}

		return null;
	}

	/**
	 * Select the entire page, hinted by an explicit inference strategy specified on an element.
	 *
	 * @returns {HTMLElement[]?}
	 */
	inferExplicitPageScope() {
		// We should have already took the page filter into account,
		// so there is nothing else to select (than the whole page content).
		const mainContent = getMainContent();
		if ( mainContent === null ) {
			return null;
		} else {
			return [ mainContent ];
		}
	}

	/**
	 * Select a section, hinted by an explicit inference strategy specified on an element.
	 *
	 * @param {HTMLElement} element
	 * @returns {HTMLElement[]?}
	 */
	inferExplicitSectionScope( element ) {
		let heading = element.previousElementSibling || element.parentElement;
		while ( heading !== null && !( heading instanceof HTMLHeadingElement ) ) {
			heading = heading.previousElementSibling || heading.parentElement;
		}

		if ( heading === null ) {
			return null;
		} else {
			return this.inferSection( heading );
		}
	}

	/**
	 * Select an alternative clause, hinted by an explicit inference strategy specified on an element.
	 *
	 * @param {HTMLElement} element
	 * @returns {HTMLElement[]?}
	 */
	inferExplicitAltScope( element ) {
		let altWrapper = element.parentElement;
		while ( altWrapper !== null && !altWrapper.classList.contains( css.contextAltClass ) ) {
			altWrapper = altWrapper.parentElement;
		}

		if ( altWrapper === null ) {
			return null;
		} else {
			return [ altWrapper ];
		}
	}

	/**
	 * Select a wrapper, hinted by an explicit inference strategy specified on an element.
	 *
	 * @param {HTMLElement} element
	 * @returns {HTMLElement[]?}
	 */
	inferExplicitWrappedScope( element ) {
		let wrapper = element.parentElement;
		while ( wrapper !== null && !wrapper.classList.contains( css.contextWrapperClass ) ) {
			wrapper = wrapper.parentElement;
		}

		if ( wrapper === null ) {
			return null;
		}

		wrapper = this.wrapNonEnclosingDelimiter( wrapper ) || wrapper;
		return [ wrapper ];
	}

	/**
	 * Wrap any (non-enclosing) text delimiter found after a node.
	 *
	 * @param {Node} node
	 * @returns {HTMLElement?}
	 */
	wrapNonEnclosingDelimiter( node ) {
		const previousSibling = DOMTraversal.previousSibling( node );
		if ( !( previousSibling instanceof Text ) ) {
			return null;
		}

		const previousText = previousSibling.textContent.trim();
		const textDelimiter = textDelimiters[ previousText[ previousText.length - 1 ] ];
		if ( textDelimiter === undefined || textDelimiter.isEnclosed ) {
			return null;
		}

		const nextSibling = DOMTraversal.nextSibling( node );
		if ( !( nextSibling instanceof Text ) ) {
			return null;
		}

		const nextMatch = nextSibling.textContent.match( `(.*?${textDelimiter.closedBy.source})(.*)` );
		if ( nextMatch === null ) {
			return null;
		}

		if ( nextMatch[2] !== '' ) {
			const parent = nextSibling.parentElement || log.panic();
			parent.insertBefore( document.createTextNode( nextMatch[2] ), nextSibling.nextSibling );
			nextSibling.textContent = nextMatch[1];
		}

		const range = new Range();
		range.setStartBefore( node );
		range.setEndAfter( nextSibling );

		const wrapper = document.createElement( 'span' );
		range.surroundContents( wrapper );
		return wrapper;
	}

	/**
	 * Select a text line (following a node).
	 *
	 * @param {ChildNode} node
	 * @returns {HTMLElement[]?}
	 */
	inferLine( node ) {
		let endNode = DOMTraversal.directNextSibling( node.nextSibling );
		if ( endNode === null ) {
			return null;
		}

		let preEndNode;
		do {
			preEndNode = endNode;
			endNode = DOMTraversal.directNextSibling( endNode.nextSibling );
		} while ( endNode !== null && !isOrHasBr( endNode ) );

		const range = new Range();
		if ( endNode instanceof HTMLBRElement ) {
			range.setStartBefore( node );
			range.setEndAfter( endNode );
		} else if ( endNode !== null || node.previousSibling !== null ) {
			range.setStartBefore( node );
			range.setEndAfter( preEndNode );
		} else {
			return null;
		}

		const wrapper = document.createElement( 'span' );
		range.surroundContents( wrapper );
		return [ wrapper ];
	}

	/**
	 * Select a delimited character sequence (following a node) in a line.
	 *
	 * @param {ContentFilter.TextDelimiter} delimiter Sequence delimiter.
	 * @param {ChildNode} node
	 * @returns {HTMLElement[]}
	 */
	inferTextSequence( delimiter, node ) {
		const range = new Range();

		if ( delimiter.isEnclosed && node.previousSibling instanceof Text ) {
			const startNode = node.previousSibling;
			const i = startNode.textContent.substring( 0, startNode.textContent.trimEnd().length - 1 ).trimEnd().length;
			if ( i > 0 ) {
				const parent = startNode.parentElement || log.panic();
				parent.insertBefore( document.createTextNode( startNode.textContent.substring( 0, i ) ), startNode );
				startNode.textContent = startNode.textContent.substring( i );
			}
			range.setStartBefore( startNode );
		} else {
			range.setStartBefore( node );
		}

		let endNode = node;
		let endMatch = null;
		while ( endMatch === null && endNode.nextSibling !== null && !isOrHasBr( endNode.nextSibling ) ) {
			endNode = endNode.nextSibling;
			if ( endNode instanceof Text ) {
				endMatch = endNode.textContent.match( `(.*?${delimiter.closedBy.source})(.*)` );
			}
		}

		if ( endMatch === null ) {
			return [];
		} else if ( endNode.nextSibling instanceof HTMLBRElement && endMatch[2].trim() === '' ) {
			range.setEndAfter( endNode.nextSibling );
		} else if ( endMatch[2] === '' ) {
			range.setEndAfter( endNode );
		} else {
			const parent = endNode.parentElement || log.panic();
			parent.insertBefore( document.createTextNode( endMatch[2] ), endNode.nextSibling );
			endNode.textContent = endMatch[1];
			range.setEndAfter( endNode );
		}

		const wrapper = document.createElement( 'span' );
		range.surroundContents( wrapper );
		return [ wrapper ];
	}

	/**
	 * [ <hI/> ] ... <hI+1/> ... <hI/>
	 *     ==>  [ <hI/> ... <hI+1/> ... ] <hI/>
	 *
	 * @param {HTMLHeadingElement} heading
	 * @returns {HTMLElement[]}
	 */
	inferSection( heading ) {
		const level = DOMTraversal.headingLevel( heading );

		/** @type {ChildNode} */
		let lastSectionNode = heading;
		for (
			let sibling = DOMTraversal.directNextSibling( lastSectionNode.nextSibling );
			!( sibling === null || sibling instanceof HTMLHeadingElement && DOMTraversal.headingLevel( sibling ) <= level );
			sibling = DOMTraversal.directNextSibling( sibling.nextSibling )
		) {
			lastSectionNode = sibling;
		}

		// Section is empty:
		// [ <hI/> ] <hI/>
		//     ==>  [ <hI/> ] <hI/>
		if ( lastSectionNode === heading ) {
			return [ heading ];
		}

		// Section has only one element:
		// [ <hI/> ] <A/> <hI/>
		//     ==>  [ <hI/> <A/> ] <hI/>
		if ( lastSectionNode instanceof HTMLElement && heading.nextSibling === lastSectionNode ) {
			return [ heading, lastSectionNode ];
		}

		const wrapper = document.createElement( 'div' );
		const range = new Range();
		range.setStartAfter( heading );
		range.setEndAfter( lastSectionNode );
		range.surroundContents( wrapper );
		heading.after( wrapper );

		return [ heading, wrapper ];
	}

	/**
	 * [ <dt/> ] <dd/> <dd/> <dt/>
	 *     ==>   [ <dt/> <dd/> <dd/> ] <dt/>
	 *
	 * @param {HTMLElement} term
	 * @returns {HTMLElement[]}
	 */
	inferDefinition( term ) {
		const ddElements = [];
		let nextElement = term.nextElementSibling;
		while ( nextElement !== null ) {
			if ( nextElement.tagName === 'DT' ) {
				break;
			}

			if ( nextElement.tagName === 'DD' ) {
				ddElements.push( nextElement );
			}

			if ( nextElement instanceof HTMLDivElement && nextElement.firstElementChild !== null ) {
				nextElement = nextElement.firstElementChild;
				continue;
			}

			while (
				nextElement.nextElementSibling === null &&
				nextElement.parentElement !== null &&
				DOMTraversal.isGhostContainer( nextElement.parentElement )
			) {
				nextElement = nextElement.parentElement;
			}
			nextElement = nextElement.nextElementSibling;
		}

		if ( ddElements.length > 0 ) {
			ddElements.unshift( term );
			return ddElements;
		} else {
			return [];
		}
	}

	/**
	 * <tr> ... [ <th/> ] ... </tr>
	 *     ==>   [ <tr> ... <th/> ... </tr> ]
	 * (or by column ...)
	 *
	 * @param {HTMLTableCellElement} headingCell
	 * @param {'col' | 'row'} direction
	 * @returns {HTMLElement[]}
	 */
	inferTableHeader( headingCell, direction ) {
		const row = headingCell.parentElement;
		if ( row === null ) {
			return [];
		}

		let table = row.parentElement;
		if ( table instanceof HTMLTableSectionElement ) {
			table = table.parentElement;
		}
		if ( table === null ) {
			return [];
		}

		let tableLayout = this.tableLayouts.get( table );
		if ( tableLayout === undefined ) {
			tableLayout = new HTMLTableLayout( table );
			this.tableLayouts.set( table, tableLayout );
		}

		/** @type {Set<HTMLTableCellElement>} */
		const cells = new Set();

		switch ( direction ) {
			case 'col':
				const j = tableLayout.getBaseColumn( headingCell );
				for ( let jSpan = headingCell.colSpan - 1; jSpan >= 0; --jSpan ) {
					for ( const cell of tableLayout.getColumnCells( j + jSpan ) ) {
						cells.add( cell );
					}
				}
				break;
			case 'row':
				const i = tableLayout.getBaseRow( headingCell );
				for ( let iSpan = headingCell.rowSpan - 1; iSpan >= 0; --iSpan ) {
					for ( const cell of tableLayout.getRowCells( i + iSpan ) ) {
						cells.add( cell );
					}
				}
		}

		return Array.from( cells );
	}

	/**
	 * [ <td> ... </td> ]
	 *     ==>   <td> [ ... ] </td>
	 *
	 * @param {HTMLTableCellElement} cell
	 * @returns {HTMLElement[]}
	 */
	inferTableCell( cell ) {
		const wrapper = document.createElement( 'div' );

		const range = new Range();
		range.selectNodeContents( cell );
		range.surroundContents( wrapper );
		cell.append( wrapper );

		return [ wrapper ];
	}
}

class HTMLTableLayout {
	/**
	 * @param {HTMLTableElement} table Table element.
	 */
	constructor( table ) {
		/**
		 * @type {HTMLTableElement}
		 */
		this.table = table;
		/**
		 * @type {HTMLTableCellElement[][]}
		 */
		this.content = [];

		for ( let i = 0, row = table.rows[ i ]; row; ++i, row = table.rows[ i ] ) {
			if ( this.content[ i ] === undefined ) {
				this.content[ i ] = [];
			}

			for ( let j = 0, k = 0, cell = row.cells[ k ]; cell; ++j, ++k, cell = row.cells[ k ] ) {
				// Skip cells covered by a rowspan from a previous row
				while ( this.content[ i ][ j ] !== undefined ) {
					++j;
				}

				for ( let iSpan = cell.rowSpan - 1; iSpan >= 0; --iSpan ) {
					if ( this.content[ i + iSpan ] === undefined ) {
						this.content[ i + iSpan ] = [];
					}

					for ( let jSpan = cell.colSpan - 1; jSpan >= 0; --jSpan ) {
						this.content[ i + iSpan ][ j + jSpan ] = cell;
					}
				}
			}
		}
	}

	/**
	 * Get the index of the first row covered by a table cell.
	 *
	 * @param {HTMLTableCellElement} cell Table cell.
	 * @returns {number} The base row index.
	 */
	getBaseRow( cell ) {
		const row = cell.parentElement || log.panic();
		return row.rowIndex;
	}

	/**
	 * Get the index of the first column covered by a table cell.
	 *
	 * @param {HTMLTableCellElement} cell Table cell.
	 * @returns {number} The base column index.
	 */
	getBaseColumn( cell ) {
		const row = cell.parentElement || log.panic();
		const rowContent = this.content[ row.rowIndex ];
		for ( let i = cell.cellIndex; i < rowContent.length; ++i ) {
			if ( cell === rowContent[ i ] ) {
				return i;
			}
		}
		log.panic();
	}

	/**
	 * Get the set of cells on a column.
	 *
	 * @param {number} j Column index.
	 * @returns {Set<HTMLTableCellElement>}
	 */
	getColumnCells( j ) {
		const cells = new Set();
		for ( const row of this.content ) {
			const cell = row[ j ];
			if ( cell !== undefined ) {
				cells.add( cell );
			}
		}
		return cells;
	}

	/**
	 * Get the set of cells on a row.
	 *
	 * @param {number} i Row index.
	 * @returns {Set<HTMLTableCellElement>}
	 */
	getRowCells( i ) {
		const cells = new Set();
		const row = this.content[ i ];
		if ( row !== undefined ) {
			for ( const cell of row ) {
				cells.add( cell );
			}
		}
		return cells;
	}
}

/**
 * Determine whether an HTML table cell covers columns or rows.
 * 
 * For a <td>, based on:
 * - whether the cell is the first one of its row.
 *
 * For a <th>, based on:
 * - the cell scope attribute, otherwise
 * - whether the cell is in <thead>, otherwise
 * - whether there are <td>s in the row.
 *
 * @param {HTMLTableCellElement} cell Table header cell element.
 * @returns {'col' | 'row' | null} Whether the header covers columns or rows.
 */
const getTableHeaderDirection = ( cell ) => {
	if ( cell.tagName === 'TD' ) {
		if ( cell.previousElementSibling === null ) {
			return 'row';
		}

		return null;
	}

	switch ( cell.scope ) {
		case 'col':
		case 'colgroup':
			return 'col';
		case 'row':
		case 'rowgroup':
			return 'row';
	}

	const row = cell.parentElement;
	if ( row === null ) {
		return 'row';
	}

	const section = row.parentElement;
	if ( section !== null && section.tagName === 'THEAD' ) {
		return 'col';
	}

	// From here on, set the scope attribute to not traverse the DOM twice.

	for ( let i = 0, siblingCell = row.cells[ i ]; siblingCell; ++i, siblingCell = row.cells[ i ] ) {
		if ( siblingCell.nodeName === 'TD' ) {
			cell.scope = 'row';
			return 'row';
		}
	}

	cell.scope = 'col';
	return 'col';
};

/**
 * Check if a node is or contains a line break.
 *
 * @param {ChildNode} node
 */
const isOrHasBr = ( node ) => {
	if ( node instanceof HTMLBRElement ) {
		return true;
	}
	if ( node instanceof HTMLElement && node.getElementsByTagName( 'br' )[ 0 ] ) {
		return true;
	}
	return false;
};

const DOMTraversal = {
	/**
	 * TODO
	 * @param {Node} node
	 */
	wrapper: ( node ) => {
		let sibling = node.previousSibling;
		while ( sibling !== null && DOMTraversal.isEmptyNode( sibling ) ) {
			sibling = sibling.previousSibling;
		}

		if ( sibling !== null ) {
			return null;
		}

		sibling = node.previousSibling;
		while ( sibling !== null && DOMTraversal.isEmptyNode( sibling ) ) {
			sibling = sibling.previousSibling;
		}

		if ( sibling !== null ) {
			return null;
		}

		return node.parentElement;
	},

	/**
	 * Get the non-ghost parent of a node.
	 *
	 * @param {Node} node Node.
	 * @returns {HTMLElement?}
	 */
	parent: ( node ) => {
		let parent = node.parentElement;
		while ( parent !== null && DOMTraversal.isGhostContainer( parent ) ) {
			parent = parent.parentElement;
		}

		return parent;
	},

	/**
	 * Get the non-ghost previous sibling of a node.
	 *
	 * @param {Node} node Node.
	 * @returns {ChildNode?}
	 */
	previousSibling: ( node ) => {
		let sibling = node.previousSibling;

		while ( true ) {
			sibling = DOMTraversal.directPreviousSibling( sibling );

			if ( sibling === null ) {
				if ( node.parentElement === null || !DOMTraversal.isGhostContainer( node.parentElement ) ) {
					break;
				}

				node = node.parentElement;
				sibling = node.previousSibling;
				continue;
			}

			if ( sibling instanceof HTMLElement && DOMTraversal.isGhostContainer( sibling ) ) {
				sibling = sibling.lastChild;
			} else {
				break;
			}
		}

		return sibling;
	},

	/**
	 * Get the non-ghost next sibling of a node.
	 *
	 * @param {Node} node Node.
	 * @returns {ChildNode?}
	 */
	nextSibling: ( node ) => {
		let sibling = node.nextSibling;

		while ( true ) {
			sibling = DOMTraversal.directNextSibling( sibling );

			if ( sibling === null ) {
				if ( node.parentElement === null || !DOMTraversal.isGhostContainer( node.parentElement ) ) {
					break;
				}

				node = node.parentElement;
				sibling = node.nextSibling;
				continue;
			}

			if ( sibling instanceof HTMLElement && DOMTraversal.isGhostContainer( sibling ) ) {
				sibling = sibling.firstChild;
			} else {
				break;
			}
		}

		return sibling;
	},

	/**
	 * Get the non-ghost previous sibling of a node.
	 *
	 * @param {ChildNode?} node Node.
	 * @returns {ChildNode?}
	 */
	directPreviousSibling: ( node ) => {
		let sibling;

		for ( sibling = node; sibling !== null; sibling = sibling.previousSibling ) {
			if ( sibling instanceof HTMLElement && sibling.classList.contains( css.contentEndClass ) ) {
				return null;
			}

			if ( !DOMTraversal.isGhostNode( sibling ) ) {
				break;
			}
		}

		return sibling;
	},

	/**
	 * Get the non-ghost next sibling of a node.
	 *
	 * @param {ChildNode?} node Node.
	 * @returns {ChildNode?}
	 */
	directNextSibling: ( node ) => {
		let sibling;

		for ( sibling = node; sibling !== null; sibling = sibling.nextSibling ) {
			if ( sibling instanceof HTMLElement && sibling.classList.contains( css.contentEndClass ) ) {
				return null;
			}

			if ( !DOMTraversal.isGhostNode( sibling ) ) {
				break;
			}
		}

		return sibling;
	},

	/**
	 * Indicates whether a node should be considered as an additional non-essential node.
	 *
	 * @param {Node} node The node.
	 */
	isEmptyNode: ( node ) => {
		if ( node instanceof Comment ) {
			return true;
		} else if ( node instanceof Text ) {
			return node.textContent === null || node.textContent.trim() === '';
		} else {
			return false;
		}
	},

	/**
	 * Check whether an element should not be considered as a container,
	 * and its children should then be considered being part of its parent.
	 *
	 * @param {HTMLElement} element The container element.
	 * @returns {boolean} True if the element is not an actual container, false otherwise.
	 */
	isGhostContainer: ( element ) => {
		if ( !( element instanceof HTMLSpanElement || element instanceof HTMLDivElement ) ) {
			return false;
		}

		if (
			element.classList.contains( css.containerClass ) ||
			element.classList.contains( css.contextWrapperClass ) ||
			element.classList.contains( css.solidClass )
		) {
			return false;
		}

		return true;
	},

	/**
	 * Check whether a node should be considered as an additional non-essential node.
	 *
	 * @param {Node} node The node.
	 */
	isGhostNode: ( node ) => {
		if ( DOMTraversal.isEmptyNode( node ) ) {
			return true;
		}

		if ( !( node instanceof HTMLElement ) ) {
			return false;
		}

		if (
			node.classList.contains( 'mw-collapsible-toggle' ) ||
			node.classList.contains( 'thumb' ) ||
			node.classList.contains( css.skipClass )
		) {
			return true;
		}

		if ( !DOMTraversal.isGhostContainer( node ) ) {
			return false;
		}

		for ( const child of node.childNodes ) {
			if ( !DOMTraversal.isGhostNode( child ) ) {
				return false;
			}
		}

		return true;
	},

	/**
	 * Get the level of a heading element.
	 *
	 * @param {HTMLHeadingElement} heading Heading element.
	 * @returns {number} The (1-based) heading element level.
	 */
	headingLevel: ( heading ) => {
		return +heading.tagName.substring( 1 );
	}
};

/**
 * Whether the filters can be used on the current page.
 *
 * @type {boolean}
 */
const filteringAvailable = isFilteringAvailable( currentTitle );

module.exports = {
	css, filterMax, isFilteringAvailable, getFilter, getContext, DOMTraversal,
	/**
	 * @param {Document | HTMLElement} [root]
	 */
	getTags: ( root ) => queryElementsByClassName( css.tagClass, root ),
	getContainers: ContainerRegistry.getAll
};

safeAddContentHook( ( $content ) => {
	const content = $content[ 0 ];
	if ( content ) {
		parseFilter( content );
	}
} );

} ) )( mediaWiki, document );
// </nowiki>
