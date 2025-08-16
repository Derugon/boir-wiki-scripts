// <nowiki>
( ( mw ) => mw.loader.using( [ 'ext.gadget.logger' ], ( require ) => {

const Logger = require( 'ext.gadget.logger' );
/** @type {Logger} */
const log = new Logger( 'slideshows' );

/**
 * Delay between two automatic cycling frames.
 *
 * @type {number}
 */
const autoInterval = 1500;

const css = {
	slideshowClass: 'boir-slideshow',

	autoSlideshowClass: 'boir-slideshow-auto',
	dlcSlideshowClass: 'dlc-slideshow',

	enabledSlideshowClass: 'boir-slideshow-enabled',
	disabledSlideshowClass: 'boir-slideshow-disabled',

	activeTitleClass: 'boir-slide-active',

	minSlideWidthVar: '--boir-slide-min-width',
	minSlideHeightVar: '--boir-slide-min-height'
};

/**
 * Whether automatic cycling has been enabled, i.e. at least one automatic
 * slideshow is enabled or was enabled before the last slide update.
 *
 * @type {boolean}
 */
let cyclingEnabled = false;

/**
 * Enable all slideshows in a container.
 *
 * @param {HTMLElement} container Slideshow container.
 * @returns {HTMLElement[]} The enabled slideshows in the container.
 */
const init = ( container ) => queryElementsByClassName( css.slideshowClass, container )
	.filter( ( slideshow ) => !slideshow.classList.contains( css.disabledSlideshowClass ) && enable( slideshow ) );

/**
 * Check whether a slideshow is enabled.
 *
 * @param {HTMLElement} slideshow Slideshow.
 * @returns {boolean} True if the slideshow is enabled, false otherwise.
 */
const isEnabled = ( slideshow ) => slideshow.classList.contains( css.enabledSlideshowClass );

/**
 * Enable a slideshow.
 *
 * @param {HTMLElement} slideshow Slideshow to enable.
 * @returns {boolean} True if the slideshow is now enabled, false if it is now disabled.
 */
const enable = ( slideshow ) => {
	slideshow.classList.remove( css.disabledSlideshowClass );

	if ( isEnabled( slideshow ) ) {
		return true;
	}

	// Ensure the slideshow structure is valid.
	// Only basic layouts are supported:
	//  - contains a <dl>, with titles as <dt> and slides as <dd>.
	//  - each title is followed by a slide.
	//  - each slide can be followed by a title.
	//  - no <div> should appear directly inside the <dl>.
	//    (but may appear between the slideshow and the <dl> or inside the <dt>s/<dd>s)

	const list = slideshow.getElementsByTagName( 'dl' )[ 0 ];
	if ( list === undefined ) {
		slideshow.classList.add( css.disabledSlideshowClass );
		return false;
	}

	/** @type {HTMLElement[]} */
	let titles = [];
	/** @type {HTMLElement[]} */
	let slides = [];

	let titleFound = false;
	for (
		let child = list.firstElementChild;
		child !== null;
		child = child.nextElementSibling
	) {
		switch ( child.tagName ) {
			case 'DD':
				if ( !titleFound ) {
					return false;
				}
				slides.push( child );
				titleFound = false;
				break;
			case 'DT':
				if ( titleFound ) {
					return false;
				}
				titles.push( child );
				titleFound = true;
				break;
			default:
				return false;
		}
	}

	if ( slides.length < 2 ) {
		slideshow.classList.add( css.disabledSlideshowClass );
		return false;
	}

	slideshow.classList.add( css.enabledSlideshowClass );

	for ( const title of titles ) {
		queryElementsByTagName( 'a', title ).forEach( unwrap );
		title.addEventListener( 'click', onTitleClick );
	}

	const activeTitle = titles[ slideshow.classList.contains( css.dlcSlideshowClass ) ? titles.length - 1 : 0 ];
	activeTitle.classList.add( css.activeTitleClass );

	HeightBalancer.set( slideshow );
	if ( slideshow.classList.contains( css.autoSlideshowClass ) ) {
		AutoRunner.add( slideshow );
	}

	return true;
};

/**
 * Disable a slideshow.
 *
 * @param {HTMLElement} slideshow Slideshow to disable.
 */
const disable = ( slideshow ) => {
	if ( slideshow.classList.contains( css.disabledSlideshowClass ) ) {
		return;
	}

	slideshow.classList.add( css.disabledSlideshowClass );

	if ( !isEnabled( slideshow ) ) {
		return;
	}

	HeightBalancer.reset( slideshow );
	slideshow.classList.remove( css.enabledSlideshowClass );

	const list = slideshow.getElementsByTagName( 'dl' )[ 0 ];
	if ( list === undefined ) {
		return;
	}

	for (
		let child = list.firstElementChild;
		child !== null;
		child = child.nextElementSibling
	) {
		child.classList.remove( css.activeTitleClass );
		child.removeEventListener( 'click', onTitleClick );
	}
};

/**
 * On slide title click, make it the active one.
 *
 * @this {HTMLElement} Slide title.
 */
const onTitleClick = function () {
	if ( this.classList.contains( css.activeTitleClass ) ) {
		return;
	}

	const list = this.parentElement || log.panic();

	for (
		let child = list.firstElementChild;
		child !== null;
		child = child.nextElementSibling
	) {
		child.classList.remove( css.activeTitleClass );
	}

	this.classList.add( css.activeTitleClass );
};

/**
 * Makes enabled slideshows cycle automatically.
 */
const AutoRunner = {
	/**
	 * Auto-cycling check for slideshows.
	 *
	 * @type {WeakSet<HTMLElement>}
	 */
	slideshowSet: new WeakSet(),

	/**
	 * An (iterable) array of auto-cycling slideshows.
	 *
	 * @type {WeakRef<HTMLElement>[]}
	 */
	slideshowArray: [],

	/**
	 * Enable automatic slide cycling on a slideshow.
	 *
	 * @param {HTMLElement} slideshow Slideshow.
	 */
	add: ( slideshow ) => {
		slideshow.classList.add( css.autoSlideshowClass );
		if ( !isEnabled( slideshow ) || AutoRunner.slideshowSet.has( slideshow ) ) {
			return;
		}

		AutoRunner.slideshowSet.add( slideshow );
		AutoRunner.slideshowArray.push( new WeakRef( slideshow ) );

		if ( !cyclingEnabled ) {
			cyclingEnabled = true;
			setTimeout( AutoRunner.runInterval, autoInterval );
		}
	},

	/**
	 * Disable automatic slide cycling on a slideshow.
	 *
	 * @param {HTMLElement} slideshow Slideshow.
	 */
	remove: ( slideshow ) => {
		slideshow.classList.remove( css.autoSlideshowClass );
		AutoRunner.slideshowSet.delete( slideshow );
	},

	/**
	 * Cycle slides of all auto-cycling slideshows.
	 */
	runInterval: () => {
		const newArray = [];
		for ( const slideshowRef of AutoRunner.slideshowArray ) {
			const slideshow = slideshowRef.deref();
			if ( slideshow !== undefined ) {
				newArray.push( slideshow );
				AutoRunner.cycle( slideshow );
			}
		}

		if ( newArray.length > 0 ) {
			setTimeout( AutoRunner.runInterval, autoInterval );
		} else {
			cyclingEnabled = false;
		}
	},

	/**
	 * Set the next slide as the active one in a slideshow.
	 *
	 * @param {HTMLElement} slideshow Slideshow.
	 */
	cycle: ( slideshow ) => {
		const list = slideshow.getElementsByTagName( 'dl' )[ 0 ] || log.panic();

		let title = list.firstElementChild || log.panic();
		while ( !title.classList.contains( css.activeTitleClass ) ) {
			title = title.nextElementSibling || log.panic();
		}

		const slide = title.nextElementSibling || log.panic();
		const nextTitle = slide.nextElementSibling || list.firstElementChild || log.panic();

		title.classList.remove( css.activeTitleClass );
		nextTitle.classList.add( css.activeTitleClass );
	}
};

/**
 * Ensures a consistent slide height within a slideshow.
 */
const HeightBalancer = {
	/**
	 * Set minimum slide dimensions to a slideshow to prevent other elements from
	 * moving on the page while switching slides.
	 *
	 * @param {HTMLElement} slideshow Slideshow.
	 */
	set: ( slideshow ) => {
		const list = slideshow.getElementsByTagName( 'dl' )[ 0 ] || log.panic();

		let activeTitle = list.firstElementChild || log.panic();
		while ( !activeTitle.classList.contains( css.activeTitleClass ) ) {
			activeTitle = activeTitle.nextElementSibling || log.panic();
		}

		activeTitle.classList.remove( css.activeTitleClass );

		let minWidth = 0, minHeight = 0;
		let slide;
		for (
			let title = list.firstElementChild;
			title !== null;
			title = slide.nextElementSibling
		) {
			slide = title.nextElementSibling || log.panic();

			title.classList.add( css.activeTitleClass );

			const viewportRect = slide.getBoundingClientRect();
			minWidth = Math.max( minWidth, viewportRect.width );
			minHeight = Math.max( minHeight, viewportRect.height );

			title.classList.remove( css.activeTitleClass );
		}

		activeTitle.classList.add( css.activeTitleClass );
		slideshow.style.setProperty( css.minSlideWidthVar, `${minWidth}px` );
		slideshow.style.setProperty( css.minSlideHeightVar, `${minHeight}px` );
	},

	/**
	 * Resets minimum slide dimensions from a slideshow.
	 *
	 * @param {HTMLElement} slideshow Slideshow.
	 */
	reset: ( slideshow ) => {
		slideshow.style.removeProperty( css.minSlideWidthVar );
		slideshow.style.removeProperty( css.minSlideHeightVar );
	}
};

/**
 * Remove an element, leaving its content in place.
 *
 * @param {HTMLElement} element Element to remove.
 */
const unwrap = ( element ) => {
	const parent = element.parentElement;
	if ( !parent ) {
		log.panic();
	}

	let childNode = element.firstChild;
	while ( childNode ) {
		parent.insertBefore( childNode, element );
		childNode = element.firstChild;
	}

	element.remove();
};

module.exports = {
	init, isEnabled, enable, disable, AutoRunner, HeightBalancer
};

mw.hook( 'wikipage.content' ).add( ( $content ) => {
	const content = $content[ 0 ];
	if ( content ) {
		init( content );
	}
} );

mw.hook( 'contentFilter.filter.viewUpdated' ).add( ( index ) => {
	if ( index === null ) {
		queryElementsByClassName( css.dlcSlideshowClass ).forEach( enable );
	} else {
		queryElementsByClassName( css.dlcSlideshowClass ).forEach( disable );
	}
} );

} ) )( mediaWiki );
// </nowiki>
