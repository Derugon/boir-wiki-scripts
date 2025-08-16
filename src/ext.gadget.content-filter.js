/**
 * Name:         TODO
 * Description:  TODO
 *
 * Module:       ext.gadget.content-filter
 * Dependencies: ext.gadget.content-filter-view
 */

// <nowiki>
( ( mw, document ) => mw.loader.using( [
	'mediawiki.api', 'mediawiki.Uri', 'ext.gadget.content-filter-view', 'ext.gadget.logger'
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

	menuId: 'cf-menu',
	menuHeadingId: 'cf-menu-heading',
	menuCheckboxId: 'cf-menu-checkbox',
	menuContentId: 'cf-menu-content',
	menuListId: 'cf-menu-list',

	buttonClass: 'cf-button',
	buttonClassPrefix: 'cf-button-',
	buttonWildcardId: 'cf-button-all',
	buttonTitleClass: 'cf-button-title',
	deactivatedButtonClass: 'cf-button-deactivated',
	activeButtonClass: 'cf-button-active',

	activeViewClass: 'cf-view-active'
};

const messages = {
	base: 'content-filter-list',
	toggle: 'content-filter-list-toggle',
	title: 'content-filter-list-title',
	name: 'content-filter-list-name'
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
 * @constructor
 */
function FilterParameter() {
	/**
	 * @type {number?}
	 */
	this.index = null;

	this.update( this.getURL() );
}

FilterParameter.prototype = {
	constructor: FilterParameter,

	/**
	 * Get the value of the URL parameter used to store the selected filter from an URL.
	 *
	 * @param {string} [url] URL, the current page one otherwise.
	 * @returns {number?} The selected filter index, null if none has been specified.
	 */
	getURL: ( url ) => {
		const rawValue = mw.util.getParamValue( urlParam, url );
		return rawValue ? parseInt( rawValue, 10 ) : null;
	},

	/**
	 * Either set the value of, or remove, the URL parameter used to store the
	 * selected filter from an URL.
	 *
	 * @param {number?} index Selected filter index, null if none has been specified.
	 * @param {URL} [url] URL, the current page one otherwise.
	 * @returns {URL} The updated URL.
	 */
	setURL: ( index, url ) => {
		url = new URL( url || document.location.href );

		if ( index === null ) {
			url.searchParams.delete( urlParam );
		} else {
			url.searchParams.set( urlParam, `${index}` );
		}

		return url;
	},

	/**
	 * Update the index of the currently selected filter.
	 *
	 * @param {number?} index Selected filter index, null if none has been specified.
	 */
	update( index ) {
		this.index = index;
		if ( this.getURL() !== index ) {
			window.history.replaceState( {}, '', this.setURL( index ) );
		}

		if ( index === null ) {
			log.info( 'No filter used.' );
		} else {
			log.info( `Using ${Math.pow( 2, index )} as active filter.` );
		}

		mw.hook( 'contentFilter.filter' ).fire( index );
	}
};

/**
 * 
 * @param {DocumentFragment} title Dropdown title.
 * @param {DocumentFragment[]} buttonTitles Button titles.
 */
function Navigation( title, buttonTitles ) {
	const menu = document.createElement( 'ul' );
	menu.id = css.menuListId;
	menu.classList.add( 'menu', 'vector-menu-content-list' );
	this.menu = menu;

	/**
	 * @type {NavigationButton[]}
	 */
	this.buttons = [];
	let index = null;
	for ( const buttonTitle of buttonTitles ) {
		const button = new NavigationButton( buttonTitle, index );
		this.buttons.push( button );
		menu.append( button.item );
		if ( index === null ) {
			index = 0;
		} else {
			++index;
		}
	}

	const body = document.createElement( 'div' );
	body.id = css.menuContentId;
	body.classList.add( 'body', 'vector-menu-content' );
	body.append( menu );

	const label = document.createElement( 'span' );
	label.classList.add( 'vector-menu-heading-label' );
	label.append( title );

	const heading = document.createElement( 'h3' );
	heading.id = 'cf-label';
	heading.classList.add( 'vector-menu-heading' );
	heading.append( label );

	const checkbox = document.createElement( 'input' );
	checkbox.role = 'checkbox';
	checkbox.id = css.menuCheckboxId;
	checkbox.classList.add( 'vector-menu-checkbox' );
	checkbox.ariaHasPopup = 'true';
	checkbox.ariaLabelledByElements = [ heading ];

	const dropdown = document.createElement( 'div' );
	dropdown.id = css.menuId;
	dropdown.classList.add( 'portal', 'vector-menu', 'vector-menu-dropdown' );
	dropdown.append( checkbox, heading, body );
	this.dropdown = dropdown;
}

Navigation.prototype = {
	constructor: Navigation,

	/**
	 * Inserts the filter navigation on the page, if it isn't already there.
	 */
	insert() {
		let activeCount = 0;
		for ( const button of this.buttons ) {
			if ( button.isActivated() ) {
				++activeCount;
			}
		}

		if ( activeCount < 2 ) {
			this.dropdown.remove();
			return;
		}

		const info = document.getElementById( css.infoId );
		if ( info !== null ) {
			info.append( this.dropdown );
			info.style.removeProperty( 'display' );
			mw.hook( 'contentFilter.filter.menuPlaced' ).fire( this.dropdown );
			return;
		}

		const leftNavigation = document.getElementById( 'left-navigation' );
		if ( leftNavigation !== null ) {
			leftNavigation.append( this.dropdown );
			mw.hook( 'contentFilter.filter.menuPlaced' ).fire( this.dropdown );
			return;
		}

		// Panicking here simply means that we couldn't place the buttons on the page.
		// If this happens, we should either add a fallback location,
		// or place the buttons somewhere other than in the left navigation.
		log.panic( 'Could not find a valid location in the page navigation.' );
	},

	/**
	 * Updates the selected filter button.
	 *
	 * @param {number?} index The filter index.
	 */
	updateActiveButton( index ) {
		const buttonIndex  = index === null ? 0 : index + 1;
		const activeButton = this.buttons[ buttonIndex ];
		if ( !activeButton ) {
			log.panic( `Unregistrered button ${buttonIndex}.` );
		}

		for ( const button of this.buttons ) {
			button.unsetActive();
		}

		activeButton.setActive();
	},

	/**
	 * Update the button element in case the global page filter has been changed.
	 *
	 * @param {number?} pageFilter The new page filter.
	 */
	updateState( pageFilter ) {
		for ( const button of this.buttons ) {
			button.updateState( pageFilter );
		}
	}
};

/**
 * @param {DocumentFragment} title
 * @param {number?} index
 */
function NavigationButton( title, index ) {
	this.index = index;

	const anchor = document.createElement( 'a' );
	anchor.href = filterParameter.setURL( index ).href;
	anchor.addEventListener( 'click', NavigationButton.prototype.onClick.bind( this ) );

	const label = document.createElement( 'span' );
	label.append( title );
	anchor.append( label );

	this.item = document.createElement( 'li' );
	this.item.classList.add( css.buttonClass, 'mw-list-item' );
	this.item.append( anchor );

	if ( index === null ) {
		this.item.id = css.buttonWildcardId;
	} else {
		this.item.id = `${css.buttonClassPrefix}${index}`;
	}
}

NavigationButton.prototype = {
	constructor: NavigationButton,

	/**
	 * @param {MouseEvent} event
	 */
	onClick( event ) {
		filterParameter.update( this.index );
		event.preventDefault();
	},

	setActive() {
		this.item.classList.add( css.activeButtonClass );
	},

	unsetActive() {
		this.item.classList.remove( css.activeButtonClass );
	},

	/**
	 * @returns {boolean}
	 */
	isActivated() {
		return !this.item.classList.contains( css.deactivatedButtonClass );
	},

	/**
	 * @param {number?} pageFilter
	 */
	updateState( pageFilter ) {
		if ( this.index === null ) {
			return;
		}

		if ( pageFilter === null || pageFilter & Math.pow( 2, this.index ) ) {
			this.item.classList.remove( css.deactivatedButtonClass );
		} else {
			this.item.classList.add( css.deactivatedButtonClass );
		}
	}
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

	mw.hook( 'contentFilter.filter.viewUpdated' ).fire( index );
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

	a.href = filterParameter.setURL( filterParameter.index, new URL( a.href ) ).href;
};

const filterParameter = new FilterParameter();

/**
 * @param {string} text
 * @returns {DocumentFragment}
 */
const parseDocumentFragment = ( text ) => {
	const template = document.createElement( 'template' );
	template.innerHTML = text.trim();
	return template.content;
};

/**
 * @param {string} text
 * @returns {string[]}
 */
const parseList = ( text ) => {
	const items = ( '\n' + text ).split( '\n*' );
	items.shift();
	return items;
};

module.exports = { filterParameter };

new mw.Api().loadMessagesIfMissing( Object.values( messages ) ).then( () => {
	const navigationTitle = parseDocumentFragment( mw.message( messages.base ).text() );
	const buttonTitles = parseList( mw.message( messages.toggle ).text() ).map( parseDocumentFragment );
	const names = parseList( mw.message( messages.name ).text() );

	const navigation = new Navigation( navigationTitle, buttonTitles );

	mw.hook( 'contentFilter.content.pageFilter' ).add( ( pageFilter ) => {
		navigation.updateState( pageFilter );
	} );

	mw.hook( 'contentFilter.content.registered' ).add( () => {
		navigation.insert();
	} );

	hookFiredOnce( 'contentFilter.content.registered' ).then( () => {
		mw.hook( 'contentFilter.filter' ).add( ( index ) => {
			navigation.updateActiveButton( index );
			updateView( index );
		} );
	} );
} );

} ) )( mediaWiki, document );
// </nowiki>
