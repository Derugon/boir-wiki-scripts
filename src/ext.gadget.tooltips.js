/**
 * Name:         Tooltips
 * Description:  Add custom tooltips to the page content.
 *
 * Module:       ext.gadget.tooltips
 * Dependencies: mediawiki.api, ext.gadget.mouse-tracker
 */

// <nowiki>
( ( $, mw ) => mw.loader.using( [
	'mediawiki.api',
	'ext.gadget.logger', 'ext.gadget.mouse-tracker'
], () => {

const Logger = require( 'ext.gadget.logger' );
/** @type {Logger} */
const log = new Logger( 'tooltips' );
const MouseTracker = require( 'ext.gadget.mouse-tracker' );

const css = {
	tooltipClass: 'tooltip',
	contentClass: 'tooltip-content',
	wrapperId: 'tooltip-wrapper',

	activeContentClass: 'tooltip-content-active',
	activeWrapperClass: 'tooltip-wrapper-active',

	invalidTooltipClass: 'tooltip-invalid'
};

/**
 * MediaWiki API.
 */
const api = new mw.Api();

/**
 * Initialize all tooltips in a container.
 *
 * @param {HTMLElement} container The container.
 */
const init = ( container ) => {
	for ( const source of queryElementsByClassName( css.tooltipClass, container ) ) {
		source.addEventListener( 'mouseenter', createTooltipOnEvent );
	}
};

/**
 * Generate the tooltip used on an element from its corresponding data.
 *
 * @this {HTMLElement}
 * @param {Event} event Some event.
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
 *
 * @param {HTMLElement} source Source element.
 * @param {HTMLElement} target Tooltip target element.
 */
const createTooltip = ( source, target ) => {
	// Remove titles inside the tooltip text, to prevent showing both the tooltip and the title.
	for ( const anchor of queryElementsByClassName( 'a', source ) ) {
		anchor.title = '';
	}

	if ( source.dataset.tooltip !== undefined ) {
		target.id = source.dataset.tooltip;
	}
	target.classList.add( css.contentClass );
	for ( const slideshow of queryElementsByClassName( 'boir-slideshow', target ) ) {
		slideshow.classList.add( 'boir-slideshow-auto' );
	}

	TooltipWrapper.add( target );
	mw.hook( 'wikipage.content' ).fire( $( target ) );

	bindSourceEvents( source );
};

/**
 * Add event listeners to a source element, asusming the target tooltip element
 * is properly defined and in the DOM.
 *
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
 * Show a tooltip.
 *
 * @this {HTMLElement}
 */
const showTooltip = function () {
	TooltipWrapper.show();
	const target = document.getElementById( this.dataset.tooltip ) || log.panic();
	target.classList.add( css.activeContentClass );
};

/**
 * Hide a tooltip.
 *
 * @this {HTMLElement}
 */
const hideTooltip = function() {
	TooltipWrapper.hide();
	const target = document.getElementById( this.dataset.tooltip ) || log.panic();
	target.classList.remove( css.activeContentClass );
};

const TooltipWrapper = {
	/**
	 * Mouse position tracker.
	 *
	 * @type {MouseTracker}
	 */
	mouseTracker: new MouseTracker(),

	/**
	 * Wrapper element.
	 *
	 * @type {HTMLElement}
	 */
	element: ( () => {
		const element = document.createElement( 'div' );
		element.id = css.wrapperId;
		return element;
	} )(),

	/**
	 * Add a tooltip to the wrapper.
	 * 
	 * @param {HTMLElement} target Tooltip target element.
	 */
	add: ( target ) => {
		TooltipWrapper.element.appendChild( target );

		if ( document.contains( TooltipWrapper.element ) ) {
			return;
		}

		const content = document.getElementById( 'mw-content-text' );
		if ( content === null ) {
			log.panic( 'No page content found, could not place the tooltip wrapper.' );
		}

		content.appendChild( TooltipWrapper.element );
	},

	/**
	 * Show the tooltip wrapper.
	 */
	show: () => {
		TooltipWrapper.mouseTracker.start();
		TooltipWrapper.element.classList.add( css.activeWrapperClass );
	},

	/**
	 * Hide the tooltip wrapper.
	 */
	hide: () => {
		TooltipWrapper.element.classList.remove( css.activeWrapperClass );
		TooltipWrapper.mouseTracker.stop();
	}
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

safeAddContentHook( ( $content ) => {
	const content = $content[ 0 ];
	if ( content ) {
		init( content );
	}
} );

} ) )( jQuery, mediaWiki );
// </nowiki>
