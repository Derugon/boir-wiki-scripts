/**
 * Name:         TODO
 * Description:  TODO
 *
 * Module:       ext.gadget.content-filter
 * Dependencies: ext.gadget.content-filter-view
 */

// <nowiki>
( ( mw, document ) => mw.loader.using( [
	'mediawiki.Uri', 'ext.gadget.content-filter-view', 'ext.gadget.logger'
], ( require ) => {

const cf = require( 'ext.gadget.content-filter-core' );
const cfView = require( 'ext.gadget.content-filter-view' );

const Logger = require( 'ext.gadget.logger' );
/** @type {Logger} */
const log = new Logger( 'content-filter' );

log.info( 'Loading.' );

/**
 * The name of the URL parameter used to store the selected filter.
 * @type {string}
 */
const urlParam = 'cfval';

const css = {
	/**
	 * If an element with this ID is on a page (directly on the page or
	 * transcluded), the filter buttons will be inserted in it. These will
	 * then not appear on the page header.
	 */
	infoId: 'cf-info',

	menuClass: 'cf-menu',
	menuToggleClass: 'cf-toggle',
	menuContentClass: 'cf-menu-content',
	menuListClass: 'cf-menu-list',

	buttonClass: 'cf-button',
	buttonClassPrefix: 'cf-button-',
	buttonWildcardId: 'cf-button-all',
	buttonTitleClass: 'cf-button-title',
	deactivatedButtonClass: 'cf-button-deactivated',
	activeButtonClass: 'cf-button-active',

	activeViewClass: 'cf-view-active'
};

/**
 * MediaWiki configuration values.
 */
const config = mw.config.get( [ 'skin', 'wgAction', 'wgArticlePath' ] );

if ( config.skin !== 'vector' ) {
	log.warn(
		'This gadget has been written to be used with the vector skin only.' +
		'Some things may not be displayed properly with the current skin.'
	);
}

// No filtering in edit mode, it would require reloading the page.
if ( config.wgAction !== 'view' ) {
	return;
}

/**
 * Gets the value of the URL parameter used to store the selected filter from an URL.
 * @param {string} [url] The URL, the current page one otherwise.
 * @returns {number?} The selected filter index, null if none has been specified.
 */
const getFilterParamValue = ( url ) => {
	const value = mw.util.getParamValue( urlParam, url );
	return value ? parseInt( value, 10 ) : null;
};

/**
 * Either sets the value of, or removes, the URL parameter used to store the
 * selected filter from an URL.
 * @param {number?} value The selected filter index, null if none has been specified.
 * @param {URL}  [url] The URL, the current page one otherwise.
 * @returns {URL} The updated URL.
 */
const setFilterParamValue = ( value, url ) => {
	url = new URL( url || document.location.href );

	if ( value === null ) {
		url.searchParams.delete( urlParam );
	} else {
		url.searchParams.set( urlParam, `${value}` );
	}

	return url;
};

/**
 * Updates the index of the currently selected filter.
 *
 * @param {number?} index
 */
const setSelectedIndex = ( index ) => {
	if ( index === null ) {
		log.info( 'No filter used.' );
	} else {
		log.info( `Using ${Math.pow( 2, index )} as active filter.` );
		lastSelectedIndex = index;
	}
	selectedIndex = index;
};

/**
 * Inserts the filter menu on the page, if it isn't already there.
 */
const insertMenu = () => {
	if ( buttons.filter( isButtonActivated ).length < 2 ) {
		menu.remove();
		return;
	}

	const info = document.getElementById( css.infoId );
	if ( info === null ) {
		insertMenuInInterface();
		mw.hook( 'contentFilter.filter.menuPlaced' ).fire( menu );
	} else if ( !info.isSameNode( menu.parentElement ) ) {
		insertMenuInContent( info );
		mw.hook( 'contentFilter.filter.menuPlaced' ).fire( menu );
	}
};

/**
 * Inserts the filter menu at the end of an element.
 *
 * @param {HTMLElement} parent
 */
const insertMenuInContent = ( parent ) => {
	parent.appendChild( menu );
	parent.style.removeProperty( 'display' );
};

/**
 * Inserts the filter menu in the page interface.
 * Currently puts it next to the page title.
 */
const insertMenuInInterface = () => {
	const pageTitle = document.getElementsByClassName( 'mw-page-title-main' )[ 0 ];
	if ( !pageTitle ) {
		// Panicking here simply means that we couldn't place the buttons on the page.
		// If this happens, we should either add a fallback location,
		// or place the buttons somewhere other than in the page title.
		log.panic( 'Page title not found.' );
	}

	pageTitle.insertAdjacentElement( 'afterend', menu );
};

/**
 * Updates the button element in case the global page filter has been changed.
 *
 * @param {number?} pageFilter The new page filter.
 */
const updateButtonsForPageContext = ( pageFilter ) => {
	for ( const button of buttons ) {
		const filterIndex = getButtonFilterIndex( button );
		if ( filterIndex === null ) {
			continue;
		}

		if ( pageFilter === null || pageFilter & Math.pow( 2, filterIndex ) ) {
			button.classList.remove( css.deactivatedButtonClass );
		} else {
			button.classList.add( css.deactivatedButtonClass );
		}
	}
};

/**
 * TODO
 * @param {HTMLLIElement} button
 * @returns {boolean}
 */
const isButtonActivated = ( button ) => {
	return !button.classList.contains( css.deactivatedButtonClass );
};

/**
 * TODO
 */
const createMenu = () => {
	const ul = document.createElement( 'ul' );
	ul.classList.add( css.menuListClass );
	for ( const button of buttons ) {
		ul.appendChild( button );
	}

	const content = document.createElement( 'div' );
	content.classList.add( css.menuContentClass );
	content.appendChild( ul );

	const dropdown = document.createElement( 'div' );
	dropdown.classList.add( css.menuClass );
	dropdown.append( toggle, content );
	return dropdown;
};

/**
 * TODO
 */
const createToggle = () => {
	const toggle = document.createElement( 'div' );
	toggle.classList.add( css.menuToggleClass );
	toggle.addEventListener( 'click', createToggle.onClick );

	return toggle;
};

/**
 * @param {MouseEvent} event
 */
createToggle.onClick = ( event ) => {
	triggerFilterUpdate( selectedIndex === null ? lastSelectedIndex : null );
	event.preventDefault();
};

/**
 * Generates a filter menu button.
 *
 * @param {string} title
 * @param {number?} index
 * @returns {HTMLLIElement}
 */
const createButton = ( title, index ) => {
	const a = document.createElement( 'a' );
	a.href = setFilterParamValue( index ).href;
	a.addEventListener( 'click', createButton.onClick );

	if ( index === null ) {
		a.textContent = title;
	} else {
		const titleSpan = document.createElement( 'span' );
		titleSpan.classList.add( css.buttonTitleClass );
		titleSpan.textContent = title;
		a.appendChild( titleSpan );
		a.appendChild( document.createTextNode( ' only' ) );
	}

	const li = document.createElement( 'li' );
	li.classList.add( css.buttonClass );
	li.appendChild( a );

	if ( index === null ) {
		li.id = css.buttonWildcardId;
	} else {
		li.id = `${css.buttonClassPrefix}${index}`;
		li.dataset.cfFilter = `${index}`;
	}

	return li;
};

/**
 * @this {HTMLElement}
 * @param {MouseEvent} event
 */
createButton.onClick = function ( event ) {
	const li = this.parentElement || log.panic();
	triggerFilterUpdate( getButtonFilterIndex( li ) );
	event.preventDefault();
};

/**
 * Triggers the event of changing the filter index.
 *
 * @param {number?} index
 */
const triggerFilterUpdate = ( index ) => {
	mw.hook( 'contentFilter.filter' ).fire( index );
	window.history.replaceState( {}, '', setFilterParamValue( index ) );
};

/**
 * Returns the filter a button is controlling.
 *
 * @param {HTMLElement} button
 * @returns {number | null}
 */
const getButtonFilterIndex = ( button ) => {
	if ( !button.dataset.cfFilter ) {
		return null;
	}
	return +button.dataset.cfFilter;
};

/**
 * Updates the selected filter button.
 *
 * @param {number?} index The filter index.
 */
const updateActiveButton = ( index ) => {
	const buttonIndex  = index === null ? 0 : index + 1;
	const activeButton = buttons[ buttonIndex ];
	if ( !activeButton ) {
		log.panic( `Unregistrered button ${buttonIndex}.` );
	}

	for ( const button of buttons ) {
		button.classList.remove( css.activeButtonClass );
	}

	activeButton.classList.add( css.activeButtonClass );
	const a = activeButton.firstElementChild || log.panic();
	toggle.innerHTML = a.innerHTML;
};

/**
 * TODO
 * @param {number?} index
 */
const updateView = ( index ) => {
	for ( const activeViewFragment of queryElementsByClassName( css.activeViewClass ) ) {
		activeViewFragment.classList.remove( css.activeViewClass );
	}

	for ( const anchor of queryElementsByTagName( 'a' ) ) {
		updateAnchorFilter( anchor );
	}

	if ( index !== null ) {
		cfView.parseView( index );

		for ( const viewFragment of queryElementsByClassName( `cf-view-${index}` ) ) {
			viewFragment.classList.add( css.activeViewClass );
		}
	}

	mw.hook( 'contentFilter.filter.viewUpdated' ).fire();
};

/**
 * Adds a corresponding filter URL parameter to an anchor if none is used.
 *
 * @param {HTMLAnchorElement} a The anchor.
 */
const updateAnchorFilter = ( a ) => {
	if ( !a.parentElement ) {
		log.panic();
	}

	if ( !a.href || a.parentElement.classList.contains( css.buttonClass ) ) {
		return;
	}

	let url;
	try {
		url = new URL( a.href );
	} catch ( _ ) {
		// If it is not an URL, then it probably is some javascript code,
		// so we just ignore it.
		return;
	}

	const match = url.pathname.match(
		mw.util
			.escapeRegExp( config.wgArticlePath )
			.replace( '\\$1', '(.*)' )
	);

	if ( !match || !match[ 1 ] ) {
		return;
	}

	const pageTitle = new mw.Title( decodeURIComponent( match[ 1 ] ) );
	if ( !cf.isFilteringAvailable( pageTitle ) ) {
		return;
	}

	a.href = setFilterParamValue( selectedIndex, new URL( a.href ) ).href;
};

/**
 * TODO
 * @type {HTMLLIElement[]}
 */
const buttons = [
	createButton( 'All versions', null ),
	createButton( 'Rebirth', 0 ),
	createButton( 'Afterbirth', 1 ),
	createButton( 'Afterbirth+', 2 ),
	createButton( 'Repentance', 3 ),
	createButton( 'Repentance+', 4 )
];

/**
 * TODO
 * @type {HTMLDivElement}
 */
const toggle = createToggle();

/**
 * TODO
 * @type {HTMLDivElement}
 */
const menu = createMenu();

/**
 * TODO
 * @type {number | null}
 */
const paramValue = getFilterParamValue();

/**
 * The index of the currently selected filter form item.
 * @type {number?}
 */
let selectedIndex = null;

/**
 * The index of the previously selected filter form item.
 * If the page has been loaded with any filter active, defaults to the last one.
 * Used to easily disable or re-enable a filter.
 *
 * @type {number}
 */
let lastSelectedIndex = 4;

module.exports = { paramValue, buttons, getButtonFilterIndex };

mw.hook( 'contentFilter.filter' ).add( setSelectedIndex ).fire( paramValue );
mw.hook( 'contentFilter.content.pageFilter' ).add( updateButtonsForPageContext );
mw.hook( 'contentFilter.content.registered' ).add( insertMenu );

hookFiredOnce( 'contentFilter.content.registered' ).then( () => {
	mw.hook( 'contentFilter.filter' ).add( updateActiveButton, updateView );
} );

} ) )( mediaWiki, document );
// </nowiki>
