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
	'ext.gadget.logger', 'ext.gadget.mouse-tracker', 'ext.gadget.polyfills-weakref'
], () => {

const Logger = require( 'ext.gadget.logger' );
/** @type {Logger} */
const log = new Logger( 'tooltips' );
const MouseTracker = require( 'ext.gadget.mouse-tracker' );

/**
 * Name of the template to call when setting the DLC context.
 *
 * @type {string}
 */
const contextTemplate = '#vardefine:page context';

/**
 * Number of seconds a parsed tooltip is kept in the client's local storage.
 *
 * @type {number}
 */
const storageExpiry = 86400; // 24 hours

const css = {
	tooltipClass: 'tooltip',
	contentClass: 'tooltip-content',
	wrapperId: 'tooltip-wrapper',

	loadingContentClass: 'tooltip-content-loading',

	activeContentClass: 'tooltip-content-active',
	activeWrapperClass: 'tooltip-wrapper-active',

	invalidTooltipClass: 'tooltip-invalid'
};

class Tooltip {
	/**
	 * @param {HTMLElement} source
	 */
	constructor( source ) {
		this.source = source;

		// Remove titles inside the tooltip text, to prevent showing both the tooltip and the title.
		for ( const anchor of queryElementsByTagName( 'a', source ) ) {
			anchor.title = '';
		}

		this.onMouseEnter = this.show.bind( this );
		this.onMouseLeave = this.hide.bind( this );
	}

	/**
	 * Enable the tooltip hover events.
	 */
	enable() {
		if ( this.source.classList.contains( css.invalidTooltipClass ) ) {
			return false;
		}

		this.source.classList.add( css.tooltipClass );
		this.source.addEventListener( 'mouseenter', this.onMouseEnter );
		this.source.addEventListener( 'mouseleave', this.onMouseLeave );
		if ( this.source.matches( ':hover' ) ) {
			this.show();
		}
		return true;
	}

	/**
	 * Disable the tooltip hover events.
	 */
	disable() {
		this.source.classList.remove( css.tooltipClass );
		this.source.removeEventListener( 'mouseenter', this.onMouseEnter );
		this.source.removeEventListener( 'mouseenter', this.onMouseLeave );
		if ( this.source.matches( ':hover' ) ) {
			this.hide();
		}
	}

	/**
	 * Get the storage key of the tooltip target.
	 */
	getStorageKey() {
		let key = `tb-tooltip-${this.source.dataset.tooltip || log.panic()}`;
		if ( this.source.dataset.tooltipDlc !== undefined ) {
			key += `-${this.source.dataset.tooltipDlc}`;
		}
		return key;
	}

	getWikitext() {
		let wikitext = this.source.dataset.tooltip || log.panic();
		wikitext = `{{${decodeURIComponent( wikitext.split( '+' ).join( ' ' ) )}}}`;
		if ( this.source.dataset.tooltipDlc !== undefined ) {
			wikitext = `{{${contextTemplate}|${this.source.dataset.tooltipDlc}}}${wikitext}`;
		}
		return wikitext;
	}

	/**
	 * Get the ID of the tooltip target.
	 */
	getTargetId() {
		let targetId = this.source.dataset.tooltip;
		if ( targetId === undefined ) {
			return null;
		}
		
		if ( this.source.dataset.tooltipDlc !== undefined ) {
			targetId += `-${this.source.dataset.tooltipDlc}`;
		}

		return targetId;
	}

	/**
	 * Get the tooltip target if it exists.
	 */
	getTarget() {
		const targetId = this.getTargetId();
		if ( targetId === null ) {
			// No content specified.
			return null;
		}

		const targetRef = Tooltip.loadedTargets[targetId];
		if ( targetRef === undefined ) {
			// Target not created yet.
			return null;
		}

		const target = targetRef.deref();
		if ( target === undefined ) {
			// Target deleted?
			log.warn( 'Missing tooltip target.' );
			return null;
		}

		return target;
	}

	/**
	 * Initialize the tooltip target if it has not already been created.
	 */
	initTarget() {
		let target = this.getTarget();
		if ( target !== null ) {
			return $.Deferred().resolve( target ).promise();
		}

		let targetPromise = null;

		let targetId = this.getTargetId();
		if ( targetId !== null ) {
			const storageKey = this.getStorageKey();
			const storedOutput = mw.storage.get( storageKey );
			if ( storedOutput !== null && storedOutput !== false ) {
				target = stringToElements( storedOutput ) || log.panic();
				targetPromise = $.Deferred().resolve( target ).promise();
			} else {
				targetPromise = Tooltip.api.parse( this.getWikitext() ).then( ( output ) => {
					mw.storage.set( storageKey, output, storageExpiry );
					return stringToElements( output ) || log.panic();
				} );
			}
		} else {
			// Use title as target content & key
			const title = this.source.title;
			this.source.title = '';
			this.source.dataset.tooltip = title;

			// Maybe this one exists?
			target = this.getTarget();
			if ( target !== null ) {
				return $.Deferred().resolve( target ).promise();
			}

			targetId = this.getTargetId();
			if ( targetId !== null ) {
				target = document.createElement( 'div' );
				target.textContent = title;
				targetPromise = $.Deferred().resolve( target ).promise();
			}
		}

		if ( targetPromise !== null && targetId !== null ) {
			Tooltip.prepareTarget( targetId );
			return targetPromise.then( ( target ) => Tooltip.prepareTarget( targetId, target ) );
		} else {
			this.source.classList.add( css.invalidTooltipClass );
			this.disable();
			return $.Deferred().reject().promise();
		}
	}

	/**
	 * Show the tooltip.
	 */
	show() {
		let target = this.getTarget();
		if ( target === null ) {
			this.initTarget().then( ( target ) => {
				if ( this.source.matches( ':hover' ) ) {
					target.classList.add( css.activeContentClass );
				}
			} );
			target = this.getTarget() || log.panic();
		}

		target.classList.add( css.activeContentClass );
		TooltipWrapper.show();
	}

	/**
	 * Hide the tooltip.
	 */
	hide() {
		TooltipWrapper.hide();

		const target = this.getTarget();
		if ( target === null || !target.classList.contains( css.activeContentClass ) ) {
			return;
		}

		target.classList.remove( css.activeContentClass );
	}

	/**
	 * Creates a tooltip from a target element. The tooltip is linked to a source element,
	 * that may or may not currently be in the DOM.
	 *
	 * @param {string} targetId Target identifier.
	 * @param {HTMLElement} [target] Tooltip target element.
	 */
	static prepareTarget( targetId, target ) {
		if ( target === undefined ) {
			target = document.createElement( 'div' );
			target.classList.add( css.loadingContentClass );
		} else {
			for ( const slideshow of queryElementsByClassName( 'boir-slideshow', target ) ) {
				slideshow.classList.add( 'boir-slideshow-auto' );
			}
		}

		target.classList.add( css.contentClass );

		const oldTargetRef = Tooltip.loadedTargets[targetId];
		if ( oldTargetRef !== undefined ) {
			const oldTarget = oldTargetRef.deref();
			if ( oldTarget !== undefined ) {
				oldTarget.remove();
			}
		}

		Tooltip.loadedTargets[targetId] = new WeakRef( target );
		TooltipWrapper.add( target );
		mw.hook( 'wikipage.content' ).fire( $( target ) );
		return target;
	}
}

/**
 * MediaWiki API.
 */
Tooltip.api = new mw.Api();

/**
 * @type {Record<string, WeakRef<HTMLElement>>}
 */
Tooltip.loadedTargets = {};

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
		TooltipWrapper.element.append( target );

		if ( document.contains( TooltipWrapper.element ) ) {
			return;
		}

		const content = document.getElementById( 'mw-content-text' );
		if ( content === null ) {
			log.panic( 'No page content found, could not place the tooltip wrapper.' );
		}

		content.append( TooltipWrapper.element );
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
		for ( const source of queryElementsByClassName( css.tooltipClass, content ) ) {
			const tooltip = new Tooltip( source );
			tooltip.enable();
		}
	}
} );

} ) )( jQuery, mediaWiki );
// </nowiki>
