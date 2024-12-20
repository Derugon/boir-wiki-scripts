/**
 * Name:         TODO
 * Description:  TODO
 *
 * Module:       ext.gadget.content-filter
 * Dependencies: ext.gadget.content-filter-view
 */

// <nowiki>

( function ( mw, document, console ) {

if ( !window.cf || !( 'parseView' in window.cf ) || 'buttons' in window.cf ) {
	// Already loaded, or something went wrong.
	return;
}
const cf = window.cf;

/** @this {( ...msg: string[] ) => void} */
function logger() {
	const args = Array.from( arguments );
	args.unshift( '[content-filter]' );
	this.apply( null, args );
}
const log   = logger.bind( console.log );
const warn  = logger.bind( mw.log.warn );
const error = logger.bind( mw.log.error );

log( 'Loading.' );

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
	activeButtonClass: 'cf-button-active'
};

/**
 * MediaWiki configuration values.
 */
const config = mw.config.get( [ 'skin', 'wgAction', 'wgArticlePath' ] );

if ( config.skin !== 'vector' ) {
	warn(
		'This gadget has been written to be used with the vector skin only.' +
		'Some things may not be displayed properly with the current skin.'
	);
}

// No filtering in edit mode, it would require reloading the page.
if ( config.wgAction !== 'view' ) {
	return;
}

/**
 * The index of the currently selected filter form item.
 * @type {number?}
 */
var selectedIndex = null;

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
 * Gets the value of the URL parameter used to store the selected filter from an URL.
 * @param {string} [url] The URL, the current page one otherwise.
 * @returns {number?} The selected filter index, null if none has been specified.
 */
function getFilterParamValue( url ) {
	const value = mw.util.getParamValue( urlParam, url );
	return value ? parseInt( value, 10 ) : null;
}

/**
 * Either sets the value of, or removes, the URL parameter used to store the
 * selected filter from an URL.
 * @param {number?} value The selected filter index, null if none has been specified.
 * @param {string}  [url] The URL, the current page one otherwise.
 * @returns {string} The updated URL.
 */
function setFilterParamValue( value, url ) {
	const uri = new mw.Uri( url || document.location.href );

	if ( value === null ) {
		delete uri.query[ urlParam ];
	} else {
		uri.query[ urlParam ] = value;
	}

	return uri.toString();
}

/**
 * Updates the index of the currently selected filter.
 * @param {number?} index TODO
 */
function setSelectedIndex( index ) {
	selectedIndex = index;
	if ( selectedIndex === null ) {
		log( 'No filter used.' );
	} else {
		log( 'Using ' + Math.pow( 2, selectedIndex ) + ' as active filter.' );
	}
}

/**
 * Inserts the filter menu on the page, if it isn't already there.
 */
function insertMenu() {
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
}

/**
 * Inserts the filter menu at the end of an element.
 *
 * @param {HTMLElement} parent
 */
function insertMenuInContent( parent ) {
	parent.appendChild( menu );
	parent.style.removeProperty( 'display' );
}

/**
 * Inserts the filter menu in the page interface.
 * Currently puts it next to the page title.
 */
function insertMenuInInterface() {
	const pageTitle = document.getElementsByClassName( 'mw-page-title-main' )[ 0 ];
	if ( !pageTitle ) {
		// Panicking here simply means that we couldn't place the buttons on the page.
		// If this happens, we should either add a fallback location,
		// or place the buttons somewhere other than in the page title.
		domPanic( 'Page title not found.' );
	}

	pageTitle.insertAdjacentElement( 'afterend', menu );
}

/**
 * TODO
 * @this {number}
 * @param {HTMLLIElement} button
 */
function checkPageContext( button ) {
	const filterIndex = button.dataset.cfFilter;
	if ( !filterIndex ) {
		return;
	}

	if ( this & Math.pow( 2, +filterIndex ) ) {
		button.classList.remove( css.deactivatedButtonClass );
	} else {
		button.classList.add( css.deactivatedButtonClass );
	}
}

/**
 * TODO
 * @param {HTMLLIElement} button
 * @returns {boolean}
 */
function isButtonActivated( button ) {
	return !button.classList.contains( css.deactivatedButtonClass );
}

/**
 * TODO
 */
function createMenu() {
	const ul = document.createElement( 'ul' );
	ul.classList.add( css.menuListClass );
	buttons.forEach( ul.appendChild, ul );

	const content = document.createElement( 'div' );
	content.classList.add( css.menuContentClass );
	content.appendChild( ul );

	const dropdown = document.createElement( 'div' );
	dropdown.classList.add( css.menuClass );
	dropdown.append( toggle, content );
	return dropdown;
}

/**
 * TODO
 */
function createToggle() {
	const toggle = document.createElement( 'div' );
	toggle.classList.add( css.menuToggleClass );
	return toggle;
}

/**
 * Generates a filter menu button.
 * @returns {HTMLLIElement}
 */
function createBaseButton() {
	const a = document.createElement( 'a' );
	a.href = setFilterParamValue( null );
	a.textContent = 'All versions';
	a.addEventListener( 'click', onButtonClick );

	const li = document.createElement( 'li' );
	li.id = css.buttonWildcardId;
	li.classList.add( css.buttonClass );
	li.appendChild( a );

	return li;
}

/**
 * TODO
 * @param {number} index
 * @param {string} title
 * @returns {HTMLLIElement}
 */
function createFilterButton( index, title ) {
	const titleSpan = document.createElement( 'span' );
	titleSpan.classList.add( css.buttonTitleClass );
	titleSpan.textContent = title;

	const a = document.createElement( 'a' );
	a.href = setFilterParamValue( index );
	a.append( titleSpan, ' only' );
	a.addEventListener( 'click', onButtonClick );

	const li = document.createElement( 'li' );
	li.id = css.buttonClassPrefix + index;
	li.classList.add( css.buttonClass );
	li.dataset.cfFilter = '' + index;
	li.appendChild( a );

	return li;
}

/**
 * TODO
 * @this {HTMLElement}
 * @param {MouseEvent} event
 */
function onButtonClick( event ) {
	const li          = this.parentElement || domPanic();
	const filterIndex = li.dataset.cfFilter || null;

	const filterValue = filterIndex ? +filterIndex : null;
	mw.hook( 'contentFilter.filter' ).fire( filterValue );

	window.history.replaceState( {}, '', setFilterParamValue( filterValue ) );
	event.preventDefault();
}

/**
 * Updates the selected filter button.
 * @param {number?} index The filter index.
 */
function updateActiveButton( index ) {
	const buttonIndex  = index === null ? 0 : index + 1;
	const activeButton = buttons[ buttonIndex ];
	if ( !activeButton ) {
		domPanic( 'Unregistrered button ' + buttonIndex + '.' );
	}

	buttons.forEach( unsetActiveButton );
	setActiveButton( activeButton );
}

/**
 * TODO
 * @param {HTMLLIElement} button
 */
function unsetActiveButton( button ) {
	button.classList.remove( css.activeButtonClass );
}

/**
 * TODO
 * @param {HTMLLIElement} button
 */
function setActiveButton( button ) {
	button.classList.add( css.activeButtonClass );
	const a = button.firstElementChild || domPanic();
	toggle.innerHTML = a.innerHTML;
}

/**
 * TODO
 * @param {number?} index
 */
function updateView( index ) {
	const activeViewFragments = document.getElementsByClassName( 'cf-view-active' );
	while ( activeViewFragments[ 0 ] ) {
		removeViewFragmentVisibility( activeViewFragments[ 0 ] );
	}

	Array.from( document.getElementsByTagName( 'a' ), updateAnchorFilter );

	if ( index !== null ) {
		cf.parseView( index );
	
		Array.from(
			document.getElementsByClassName( 'cf-view-' + index ),
			addViewFragmentVisibility
		);
	}

	mw.hook( 'contentFilter.filter.viewUpdated' ).fire();
}

/**
 * TODO
 * @param {HTMLElement} viewFragment
 */
function addViewFragmentVisibility( viewFragment ) {
	viewFragment.classList.add( 'cf-view-active' );
}

/**
 * TODO
 * @param {HTMLElement} viewFragment
 */
function removeViewFragmentVisibility( viewFragment ) {
	viewFragment.classList.remove( 'cf-view-active' );
}

/**
 * Adds a corresponding filter URL parameter to an anchor if none is used.
 * @param {HTMLAnchorElement} a The anchor.
 */
function updateAnchorFilter( a ) {
	if ( !a.parentElement ) {
		domPanic();
	}

	if ( !a.href || a.parentElement.classList.contains( css.buttonClass ) ) {
		return;
	}

	var uri;
	try {
		uri = new mw.Uri( a.href );
	} catch ( _ ) {
		// If it is not an URL, then it probably is some javascript code,
		// so we just ignore it.
		return;
	}

	const match = uri.path.match(
		mw.util
			.escapeRegExp( config.wgArticlePath )
			.replace( '\\$1', '(.*)' )
	);

	if ( !match || !match[ 1 ] ) {
		return;
	}

	const pageTitle = new mw.Title( mw.Uri.decode( match[ 1 ] ) );
	if ( !cf.isFilteringAvailable( pageTitle ) ) {
		return;
	}

	a.href = setFilterParamValue( selectedIndex, a.href );
}

/**
 * TODO
 * @type {HTMLLIElement[]}
 */
const buttons = [
	createBaseButton(),
	createFilterButton( 0, 'Rebirth' ),
	createFilterButton( 1, 'Afterbirth' ),
	createFilterButton( 2, 'Afterbirth+' ),
	createFilterButton( 3, 'Repentance' ),
	createFilterButton( 4, 'Repentance+' )
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

mw.hook( 'contentFilter.filter' ).add( setSelectedIndex ).fire( paramValue );

mw.hook( 'contentFilter.content.pageFilter' ).add( function ( pageFilter ) {
	buttons.forEach( checkPageContext, pageFilter );
} );

mw.hook( 'contentFilter.content.registered' ).add( insertMenu );

hookFiredOnce( 'contentFilter.content.registered' ).then( function () {
	mw.hook( 'contentFilter.filter' ).add( updateActiveButton, updateView );
} );

$.extend( window.cf, {
	paramValue: paramValue,
	buttons: buttons
} );

} )( mediaWiki, document, console );
// </nowiki>
