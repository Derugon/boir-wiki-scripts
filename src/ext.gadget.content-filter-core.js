/**
 * Name:        TODO
 * Description: TODO
 *
 * Module:      ext.gadget.content-filter-core
 */

// <nowiki>
( ( mw, document ) => mw.loader.using( [
	'site', 'mediawiki.Title', 'ext.gadget.logger'
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
	sectionScopeClass: 'cf-scope-section',

	/**
	 * If an element with a filter bitmask class is inside an element with the
	 * `sectionScopeClass` class and this id, the corresponding bitmask is applied
	 * to the entire page: the filter buttons not matching the bitmask are disabled.
	 */
	pageScopeId: 'cf-scope-page',

	wrappedScopeClass: 'cf-scope-wrapped',
	contextWrapperClass: 'cf-context-wrapper',

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
 * @type {boolean}
 */
let filteringForced = false;

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
			if ( value !== undefined ) {
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
 * Check whether an element wraps the main page content.
 *
 * @param {HTMLElement} content The element to check.
 * @returns {boolean}
 */
const isMainContent = ( content ) => content.classList.contains( css.bodyContentClass );

/**
 * Check whether the filters should be used on a page because of the use of
 * in-content specific markers.
 *
 * @param {Document} content The page content.
 * @returns {boolean} True if the filters should be used, false otherwise.
 */
const isFilteringForced = ( content ) => {
	if ( content.getElementsByClassName( css.filterEnableClass ).length > 0 ) {
		return true;
	}

	return false;
};

/**
 * Checks if the entire page is limited to some versions then sets the page
 * global filter accordingly.
 *
 * @returns {number}
 */
const getPageFilter = () => {
	const pageContextBox = document.getElementById( css.pageScopeId );
	if ( pageContextBox === null ) {
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
	if ( container.classList.contains( css.containerClass ) ) {
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

	if ( isMainContent( container ) ) {
		filteringForced = isFilteringForced( document );
	}

	if ( !filteringAvailable && !filteringForced ) {
		return;
	}

	mw.hook( 'contentFilter.content.beforeRegistered' ).fire( container, parentContainer );

	container.classList.add( css.containerClass );

	if ( isMainContent( container ) ) {
		log.info( 'Initializing state.' );
		mw.hook( 'contentFilter.content.pageFilter' ).fire( getPageFilter() );
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
 * TODO
 * @param {HTMLElement} tag
 * @param {HTMLElement|Contextualizer} [contextualizer]
 * @returns {HTMLElement[]}
 */
const getContext = ( tag, contextualizer ) => {
	if ( tag.dataset.cfContext !== undefined ) {
		return queryElementsByClassName( `${css.contextClassPrefix}${tag.dataset.cfContext}` );
	}

	if ( contextualizer === undefined ) {
		contextualizer = new Contextualizer( document.body );
	} else if ( contextualizer instanceof HTMLElement ) {
		contextualizer = new Contextualizer( contextualizer );
	}

	const context = contextualizer.infer( tag );

	if ( context.length === 0 ) {
		log.warn( 'No context found for the following tag:', tag );
		return context;
	}

	const id = newUniqueContextId();
	tag.dataset.cfContext = `${id}`;
	for ( const contextElement of context ) {
		contextElement.classList.add( css.contextClass, `${css.contextClassPrefix}${id}` );
	}

	return context;
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
 *
 * @param {HTMLElement} root Root container.
 */
function Contextualizer( root ) {
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

Contextualizer.prototype = {
	constructor: Contextualizer,

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

		const previousInfo = DOMTraversal.previousSibling( tag );
		if ( previousInfo.sibling instanceof HTMLBRElement ) {
			// Select the next line.
			const range = new Range();
			range.setStartBefore( previousInfo.sibling );
			/** @type {ChildNode?} */
			let e = tag;
			while ( e.nextSibling !== null && !( e.nextSibling instanceof HTMLBRElement ) ) {
				e = e.nextSibling;
			}
			range.setEndAfter( e );

			const wrapper = document.createElement( 'span' );
			range.surroundContents( wrapper );
			return [ wrapper ];
		} else if ( previousInfo.sibling !== null ) {
			// <A> ... (tag) ... </A>
			return [];
		}

		const scope = previousInfo.parent;
		if ( scope === null ) {
			// (tag) is alone
			return [ tag ];
		}

		switch ( scope.tagName ) {
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
	},

	/**
	 * Find an explicit inference strategy specified on the element or one of its
	 * wrappers. Multiple strategies may be specified, in which case the best one
	 * is chosen, with the following priority ordering:
	 *  - strategies on the element itself, then its wrappers ordered by distance.
	 *  - on a single element/wrapper, strategy order depends on the strategy type,
	 *    the greedier ones come first (e.g. "page" > "section" > "wrapped" ).
	 *
	 * @param {HTMLElement?} element
	 * @returns {HTMLElement[]?}
	 */
	inferExplicitScope( element ) {
		while ( element !== null ) {
			if ( element.id === css.pageScopeId ) {
				// We should have already took the page filter into account,
				// so there is nothing else to select (than the whole page content).
				const mainContent = document.getElementsByClassName( css.bodyContentClass )[ 0 ];
				if ( mainContent !== null ) {
					return [ mainContent ];
				}
			} else if ( element.classList.contains( css.wrappedScopeClass ) ) {
				for ( let wrapper = element.parentElement; wrapper !== null; wrapper = wrapper.parentElement ) {
					if ( wrapper.classList.contains( css.contextWrapperClass ) ) {
						return [ wrapper ];
					}
				}
			}

			element = DOMTraversal.wrapper( element );
		}

		return null;
	},

	/**
	 * [ <hI/> ] ... <hI+1/> ... <hI/>
	 *     ==>  [ <hI/> ... <hI+1/> ... ] <hI/>
	 *
	 * @param {HTMLHeadingElement} heading
	 * @returns {HTMLElement[]}
	 */
	inferSection( heading ) {
		const parent = heading.parentElement;
		if ( parent === null ) {
			return [];
		}

		const level = getHeadingLevel( heading );

		/** @type {ChildNode} */
		let lastSectionNode = heading;
		for (
			let sibling = lastSectionNode.nextSibling;
			!( sibling === null || sibling instanceof HTMLHeadingElement && getHeadingLevel( sibling ) <= level );
			sibling = sibling.nextSibling
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
		heading.insertAdjacentElement( 'afterend', wrapper );

		return [ heading, wrapper ];
	},

	/**
	 * [ <dt/> ] <dd/> <dd/> <dt/>
	 *     ==>   [ <dt/> <dd/> <dd/> ] <dt/>
	 *
	 * @param {HTMLElement} term
	 * @returns {HTMLElement[]}
	 */
	inferDefinition( term ) {
		const scopeParentElement = term.parentElement;
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
				nextElement.parentElement !== scopeParentElement
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
	},

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
	},

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
};

/**
 * @param {HTMLTableElement} table Table element.
 */
function HTMLTableLayout( table ) {
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

HTMLTableLayout.prototype = {
	constructor: HTMLTableLayout,

	/**
	 * Get the index of the first row covered by a table cell.
	 *
	 * @param {HTMLTableCellElement} cell Table cell.
	 * @returns {number} The base row index.
	 */
	getBaseRow( cell ) {
		const row = cell.parentElement || log.panic();
		return row.rowIndex;
	},

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
	},

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
	},

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
};

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
 * Get the level of a heading element.
 *
 * @param {HTMLHeadingElement} heading Heading element.
 * @returns {number} The (1-based) heading element level.
 */
const getHeadingLevel = ( heading ) => {
	return +heading.tagName.substring( 1 );
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
	 * If no sibling is found, the non-ghost parent it stopped searching at is given instead.
	 *
	 * @param {Node} node Node.
	 * @param {HTMLElement} [container] Container assumed to be the non-ghost parent of the node.
	 * @returns {ContentFilter.SiblingSearchResult}
	 */
	previousSibling: ( node, container ) => {
		while ( true ) {
			/** @type {Node?} */
			let sibling = node;
			do {
				sibling = sibling.previousSibling;
				if ( sibling instanceof HTMLElement && sibling.classList.contains( css.contentEndClass ) ) {
					sibling = null;
				}
			} while ( sibling !== null && DOMTraversal.isGhostNode( sibling ) );

			if ( sibling !== null ) {
				return { sibling: sibling };
			}

			const parent = node.parentElement;
			if ( parent === null || parent === container || !DOMTraversal.isGhostContainer( parent ) ) {
				return { sibling: null, parent: parent };
			}

			node = parent;
		}
	},

	/**
	 * Get the non-ghost next sibling of a node.
	 * If no sibling is found, the non-ghost parent it stopped searching at is given instead.
	 *
	 * @param {Node} node Node.
	 * @param {HTMLElement} [container] Container assumed to be the non-ghost parent of the node.
	 * @returns {ContentFilter.SiblingSearchResult}
	 */
	nextSibling: ( node, container ) => {
		while ( true ) {
			/** @type {Node?} */
			let sibling = node;
			do {
				sibling = sibling.nextSibling;
				if ( sibling instanceof HTMLElement && sibling.classList.contains( css.contentEndClass ) ) {
					sibling = null;
				}
			} while ( sibling !== null && DOMTraversal.isGhostNode( sibling ) );

			if ( sibling !== null ) {
				return { sibling: sibling };
			}

			const parent = node.parentElement;
			if ( parent === null || parent === container || !DOMTraversal.isGhostContainer( parent ) ) {
				return { sibling: null, parent: parent };
			}

			node = parent;
		}
	},

	/**
	 * Indicates whether a node should be considered as an additional non-essential node.
	 *
	 * @param {Node} node The node.
	 */
	isEmptyNode: ( node ) => {
		switch ( node.nodeType ) {
		case Node.COMMENT_NODE:
			return true;

		case Node.TEXT_NODE:
			return !node.textContent || !node.textContent.trim();

		default:
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

		if ( element.classList.contains( css.containerClass ) ) {
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

		switch ( node.nodeType ) {
		case Node.ELEMENT_NODE:
			/** @type {HTMLElement} */ // @ts-ignore
			const element = node;

			if (
				element.classList.contains( 'mw-collapsible-toggle' ) ||
				element.classList.contains( 'thumb' ) ||
				element.classList.contains( css.skipClass )
			) {
				return true;
			}

			if ( !DOMTraversal.isGhostContainer( element ) ) {
				return false;
			}

			for ( const child of element.childNodes ) {
				if ( !DOMTraversal.isGhostNode( child ) ) {
					return false;
				}
			}

			return true;

		default:
			return false;
		}
	}
};

/**
 * Whether the filters can be used on the current page.
 *
 * @type {boolean}
 */
const filteringAvailable = isFilteringAvailable( currentTitle );

module.exports = {
	filterMax, isFilteringAvailable, getFilter, getContext, DOMTraversal,
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
