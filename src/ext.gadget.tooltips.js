/**
 * Name:        Tooltips script
 * Description: Add custom tooltips to the page content.
 */

// <nowiki>
( ( $, mw ) => mw.loader.using( [ 'mediawiki.api', 'ext.gadget.logger' ], () => {

const Logger = require( 'ext.gadget.logger' );
/** @type {Logger} */
const log = new Logger( 'tooltips' );

const css = {
	tooltipClass: 'tooltip',
	contentClass: 'tooltip-content',
	wrapperId: 'tooltip-wrapper',

	activeContentClass: 'tooltip-content-active',
	activeWrapperClass: 'tooltip-wrapper-active',

	invalidTooltipClass: 'tooltip-invalid'
};

/**
 * The MediaWiki API.
 */
const api = new mw.Api();

/**
 * Initializes all tooltips in a container.
 * @param {HTMLElement} container The container.
 */
const init = ( container ) => {
	for ( const source of queryElementsByClassName( css.tooltipClass, container ) ) {
		source.addEventListener( 'mouseenter', createTooltipOnEvent );
	}
};

/**
 * Generates the tooltip used on an element from its corresponding data.
 * @this {HTMLElement}
 * @param {Event} event
 */
const createTooltipOnEvent = function ( event ) {
	const source = this;
	source.removeEventListener( event.type, createTooltipOnEvent );

	const template = source.dataset.tooltip;
	if ( template ) {
		if ( document.getElementById( template ) ) {
			bindSourceEvents( source );
		} else {
			api.parse( `{{${template}}}` ).then( ( output ) => {
				createTooltip( source, stringToElements( output ) || log.panic() );
			} );
		}
	} else if ( source.title ) {
		const title = source.title;
		source.title = '';
		source.dataset.tooltip = title;

		if ( document.getElementById( title ) ) {
			bindSourceEvents( source );
		} else {
			const target = document.createElement( 'div' );
			target.textContent = title;
			createTooltip( source, target );
		}
	} else {
		source.classList.remove( css.tooltipClass );
		source.classList.add( css.invalidTooltipClass );
	}
};

/**
 * Creates a tooltip from a target element. The tooltip is linked to a source element,
 * that may or may not currently be in the DOM.
 * @param {HTMLElement} source The source element.
 * @param {HTMLElement} target The tooltip target element.
 */
const createTooltip = ( source, target ) => {
	for ( const anchor of queryElementsByClassName( 'a', source ) ) {
		removeTitle( anchor );
	}

	if ( source.dataset.tooltip !== undefined ) {
		target.id = source.dataset.tooltip;
	}
	target.classList.add( css.contentClass );
	for ( const slideshow of queryElementsByClassName( 'boir-slideshow', target ) ) {
		makeSlideshowAuto( slideshow );
	}

	if ( !document.contains( wrapper ) ) {
		placeWrapper();
	}

	wrapper.appendChild( target );
	mw.hook( 'wikipage.content' ).fire( $( target ) );

	bindSourceEvents( source );
};

/**
 * Removes the title of an element within a tooltip text, to prevent showing
 * both the tooltip and the title.
 * @param {HTMLElement} element The element to remove the title of.
 */
const removeTitle = ( element ) => {
	element.title = '';
};

/**
 * Add event listeners to a source element, asusming the target tooltip element
 * is properly defined and in the DOM.
 * @param {HTMLElement} source
 */
const bindSourceEvents = ( source ) => {
	source.addEventListener( 'mouseenter', showTooltip );
	source.addEventListener( 'mouseleave', hideTooltip );
	if ( source.matches( ':hover' ) ) {
		showTooltip.call( source );
	}
};

/**
 * Shows a tooltip.
 * @this {HTMLElement}
 */
const showTooltip = function () {
	wrapper.classList.add( css.activeWrapperClass );
	const target = document.getElementById( this.dataset.tooltip ) || log.panic();
	target.classList.add( css.activeContentClass );
};

/**
 * Hides a tooltip.
 * @this {HTMLElement}
 */
const hideTooltip = function() {
	wrapper.classList.remove( css.activeWrapperClass );
	const target = document.getElementById( this.dataset.tooltip ) || log.panic();
	target.classList.remove( css.activeContentClass );
};

/**
 * Creates the tooltip wrapper.
 */
const createWrapper = () => {
	const wrapper = document.createElement( 'div' );
	wrapper.id = css.wrapperId;
	document.addEventListener( 'mousemove', updateWrapper );

	return wrapper;
};

/**
 * Places the tooltip wrapper on the page.
 */
const placeWrapper = () => {
	const content = document.getElementById( 'mw-content-text' );
	if ( content === null ) {
		log.panic( 'No page content found, could not place the tooltip wrapper.' );
	}

	content.appendChild( wrapper );
};

/**
 * Updates the position of the tooltip wrapper.
 * @param {MouseEvent} event The mouse moving event.
 */
const updateWrapper = ( event ) => {
	wrapper.style.left = `${event.clientX}px`;
	wrapper.style.top  = `${event.clientY}px`;
};

/**
 * Generates DOM elements from a string.
 * @param {string} str The DOM string.
 * @returns {HTMLElement | null} The generated DOM elements.
 */
const stringToElements = ( str ) => {
	const template = document.createElement( 'template' );
	template.innerHTML = str;
	// @ts-ignore
	return template.content.firstElementChild;
};

/**
 * Makes a slideshow cycle automatically.
 * @param {HTMLElement} slideshow Slideshow.
 */
const makeSlideshowAuto = ( slideshow ) => {
	slideshow.classList.add( 'boir-slideshow-auto' );
};

/**
 * The tooltip wrapper.
 * @type {HTMLElement}
 */
const wrapper = createWrapper();

safeAddContentHook( ( $content ) => {
	const content = $content[ 0 ];
	if ( content ) {
		init( content );
	}
} );

} ) )( jQuery, mediaWiki );
// </nowiki>
