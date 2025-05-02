// <nowiki>
( ( mw ) => mw.loader.using( [ 'ext.gadget.logger' ], ( require ) => {

const Logger = require( 'ext.gadget.logger' );
/** @type {Logger} */
const log = new Logger( 'slideshows' );

/**
 * Delay between two automatic cycling frames.
 * @type {number}
 */
const autoInterval = 1500;

const css = {
	slideshowClass: 'boir-slideshow',
	slideClass: 'boir-slide',
	titleClass: 'boir-slide-title',
	titlePlaceholderClass: 'boir-slide-title-placeholder',
	titlebarClass: 'boir-slideshow-titlebar',

	enabledSlideshowClass: 'boir-slideshow-enabled',
	disabledSlideshowClass: 'boir-slideshow-disabled',
	hiddenSlideshowClass: 'boir-slideshow-hidden',
	autoSlideshowClass: 'boir-slideshow-auto',
	dlcSlideshowClass: 'dlc-slideshow',

	activeSlideClass: 'boir-slide-active',
	activeTitleClass: 'boir-slide-title-active'
};

/**
 * Whether automatic cycling has been enabled, i.e. at least one automatic
 * slideshow is enabled or was enabled before the last slide update.
 * @type {boolean}
 */
let cyclingEnabled = false;

/**
 * The click events added to elements in a slideshow.
 * @typedef ClickEvents
 * @property {EventListener}                   [slide] On all slides.
 * @property {Map<HTMLElement, EventListener>} titles  On each slide title.
 */

/**
 * The click events added to each slideshow.
 * @type {Map<HTMLElement, ClickEvents>}
 */
const clickEvents = new Map();

/**
 * The list of enabled slideshows cycling automatically.
 * @type {HTMLElement[]}
 */
const auto = [];

/**
 * Enables all slideshows in a container.
 * @param {HTMLElement} container The container.
 * @returns {HTMLElement[]} The enabled slideshows in the container.
 */
const init = ( container ) => queryElementsByClassName( css.slideshowClass, container )
	.filter( enable );

/**
 * Enables a slideshow.
 * @param {HTMLElement} slideshow The slideshow to enable.
 * @returns {boolean} True if the slideshow is now enabled,
 *                    false if it is now disabled.
 */
const enable = ( slideshow ) => {
	if ( slideshow.classList.contains( css.disabledSlideshowClass ) ) {
		return false;
	}

	if ( isEnabled( slideshow ) ) {
		return true;
	}

	const slides = getSlides( slideshow );
	if ( slides.length < 2 ) {
		disable( slideshow );
		return false;
	}

	/** @type {ClickEvents} */
	const newClickEvents = { titles: new Map() };

	slideshow.classList.add( css.enabledSlideshowClass );

	const titlebar = document.createElement( 'div' );
	titlebar.classList.add( css.titlebarClass );

	const titles = [];
	for ( const slide of slides ) {
		const title = getSlideTitle( slide );
		if ( !title ) {
			log.panic();
		}

		const onClick = () => {
			if ( title.classList.contains( css.activeTitleClass ) ) {
				return;
			}

			const slide = getTitleSlide( title );
			if ( !slide ) {
				log.panic();
			}

			setActiveSlide( slide, title );
		};

		newClickEvents.titles.set( title, onClick );
		title.addEventListener( 'click', onClick );

		titles.push( title );
	}

	if ( newClickEvents.titles.size > 0 ) {
		for ( const anchor of queryElementsByTagName( 'a', titlebar ) ) {
			unwrap( anchor );
		}
	}

	const activeIndex = slideshow.classList.contains( css.dlcSlideshowClass ) ? slides.length - 1 : 0;
	const activeSlide = slides[ activeIndex ];
	const activeTitle = titles[ activeIndex ];
	if ( !activeSlide || !activeTitle ) {
		log.panic();
	}

	activeSlide.classList.add( css.activeSlideClass );
	if ( activeTitle.classList.contains( css.titleClass ) ) {
		activeTitle.classList.add( css.activeTitleClass );
	}

	if (
		!slideshow.classList.contains( css.hiddenSlideshowClass ) &&
		!slideshow.getElementsByClassName( css.slideshowClass )[ 0 ]
	) {
		newClickEvents.slide = () => { /* cycle( slideshow ); */ };
		for ( const slide of slides ) {
			slide.addEventListener( 'click', newClickEvents.slide );
		}
	}

	// Duplicate titles in the titlebar
	for ( const title of titles ) {
		if ( !title ) {
			titlebar.appendChild( document.createElement( 'span' ) );
			continue;
		}

		const titlePlaceholder = title.cloneNode( true );
		const parent = title.parentElement || log.panic();

		parent.replaceChild( titlePlaceholder, title );
		titlebar.appendChild( title );
	
		titlePlaceholder.classList.remove( css.activeTitleClass, css.titleClass );
		titlePlaceholder.classList.add( css.titlePlaceholderClass );
	}

	if ( slideshow.classList.contains( css.autoSlideshowClass ) ) {
		makeAuto( slideshow );
	}

	clickEvents.set( slideshow, newClickEvents );

	if ( newClickEvents.titles.size > 0 ) {
		slideshow.insertBefore( titlebar, slideshow.firstChild );
		mw.hook( 'wikipage.content' ).fire( $( titlebar ) );
	}

	setMinHeight( slideshow );

	return true;
};

/**
 * Makes a slideshow cycle slides automatically.
 * @param {HTMLElement} slideshow The slideshow.
 */
const makeAuto = ( slideshow ) => {
	slideshow.classList.add( css.autoSlideshowClass );
	if ( !isEnabled( slideshow ) || auto.indexOf( slideshow ) !== -1 ) {
		return;
	}

	auto.push( slideshow );
	if ( cyclingEnabled ) {
		return;
	}

	cyclingEnabled = true;
	setTimeout( runAutoInterval, autoInterval );
};

/**
 * Disables a slideshow.
 * @param {HTMLElement} slideshow The slideshow to disable.
 */
const disable = ( slideshow ) => {
	if ( slideshow.classList.contains( css.disabledSlideshowClass ) ) {
		return;
	}

	const slides = getSlides( slideshow );

	slideshow.classList.add( css.disabledSlideshowClass );

	if ( !isEnabled( slideshow ) ) {
		return;
	}

	const titleBar         = getTitleBar( slideshow );
	const localClickEvents = clickEvents.get( slideshow );
	if ( !localClickEvents ) {
		log.panic();
	}

	clickEvents.delete( slideshow );
	slideshow.style.minHeight = '';
	slideshow.classList.remove( css.enabledSlideshowClass );

	for ( const slide of slides ) {
		slide.classList.remove( css.activeSlideClass );
		if ( localClickEvents.slide ) {
			slide.removeEventListener( 'click', localClickEvents.slide );
		}

		if ( !titleBar ) {
			return;
		}

		const title = getSlideTitle( slide );
		if ( !title ) {
			log.panic();
		}

		const titleEvent = localClickEvents.titles.get( title );
		if ( titleEvent ) {
			title.removeEventListener( 'click', titleEvent );
		}

		title.classList.remove( css.activeTitleClass );

		const titlePlaceholder = slide.getElementsByClassName( css.titlePlaceholderClass )[ 0 ];
		if ( titlePlaceholder ) {
			titlePlaceholder.classList.remove( css.titlePlaceholderClass );
			titlePlaceholder.classList.add( css.titleClass );
		}
	}

	if ( titleBar ) {
		titleBar.remove();
	}
};

/**
 * Sets a slide as the active one of a slideshow.
 * @param {HTMLElement} slide   The slide to set as active one.
 * @param {HTMLElement} [title] The title of the slide.
 */
const setActiveSlide = ( slide, title ) => {
	const slideshow = slide.parentElement;
	if ( !slideshow ) {
		log.panic();
	}

	const activeSlide = getActiveSlide( slideshow );
	if ( !activeSlide ) {
		log.panic();
	}

	activeSlide.classList.remove( css.activeSlideClass );
	slide.classList.add( css.activeSlideClass );

	const titlebar = getTitleBar( slideshow );
	if ( !titlebar ) {
		return;
	}

	let activeTitle = getSlideTitle( activeSlide );
	if ( activeTitle ) {
		activeTitle.classList.remove( css.activeTitleClass );
	}

	const slideTitle = title || getSlideTitle( slide );
	if ( slideTitle && slideTitle.classList.contains( css.titleClass ) ) {
		slideTitle.classList.add( css.activeTitleClass );
	}
};

/**
 * Sets the next slide as the active one of a slideshow.
 * @param {HTMLElement} slideshow The slideshow.
 */
const cycle = ( slideshow ) => {
	const activeSlide = getActiveSlide( slideshow );
	if ( !activeSlide ) {
		log.panic();
	}

	setActiveSlide(
		getNextSiblingByClassName( activeSlide, css.slideClass ) ||
		getChildByClassName( slideshow, css.slideClass ) ||
		log.panic()
	);
};

/**
 * Removes a slide from a slideshow.
 * @param {HTMLElement} slide The slide to remove.
 */
const removeSlide = ( slide ) => {
	const title = getSlideTitle( slide );
	slide.remove();

	if ( title ) {
		title.remove();
	}

	const slideshow = slide.parentElement;
	if ( slideshow && getSlides( slideshow ).length < 2 ) {
		disable( slideshow );
	}
};

/**
 * Indicates whether a slideshow is enabled.
 * @param {HTMLElement} slideshow The slideshow.
 * @returns {boolean} True if the slideshow is enabled, false otherwise.
 */
const isEnabled = ( slideshow ) => slideshow.classList.contains( css.enabledSlideshowClass );

/**
 * Gets all slides of a slideshow.
 * @param {HTMLElement} slideshow The slideshow to enable.
 * @returns {HTMLElement[]} An array of all slides of the slideshow.
 */
const getSlides = ( slideshow ) => Array.from( slideshow.children ).filter( isSlide );

/**
 * Gets the currently active slide of a slideshow.
 * @param {HTMLElement} slideshow The slideshow to enable.
 * @returns {HTMLElement?} The currently active slide of the slideshow,
 *                         null if there is not any.
 */
const getActiveSlide = ( slideshow ) => Array.from( slideshow.children ).find( isActiveSlide ) || null;

/**
 * Gets the title bar of a slideshow.
 * @param {HTMLElement} slideshow The slideshow.
 * @returns {HTMLElement?} The title bar of the slideshow,
 *                         null if it does not have any.
 */
const getTitleBar = ( slideshow ) => Array.from( slideshow.children ).find( isTitleBar ) || null;

/**
 * Indicates whether an element is a slide.
 * @param {HTMLElement} element The element.
 * @returns {boolean} True if the element is a slide, false otherwise.
 */
const isSlide = ( element ) => element.classList.contains( css.slideClass );

/**
 * Indicates whether an element is the active slide of a slideshow.
 * @param {HTMLElement} element The element.
 * @returns {boolean} True if the element is a slide and the active one of its
 *                    slideshow, false otherwise.
 */
const isActiveSlide = ( element ) => element.classList.contains( css.activeSlideClass );

/**
 * Indicates whether an element is the title bar of a slideshow.
 * @param {HTMLElement} element The element.
 * @returns {boolean} True if the element is the title bar of a slideshow,
 *                    false otherwise.
 */
const isTitleBar = ( element ) => element.classList.contains( css.titlebarClass );

/**
 * Gets the title of a slide.
 * @param {HTMLElement} slide The slide.
 * @returns {HTMLElement?} The title of the slide, null if it does not have any.
 */
const getSlideTitle = ( slide ) => {
	const slideshow = slide.parentElement;
	if ( !slideshow ) {
		return log.panic();
	}

	const titlebar = getTitleBar( slideshow );
	if ( titlebar ) {
		return titlebar.children[ getSlides( slideshow ).indexOf( slide ) ] || log.panic();
	}

	return slide.getElementsByClassName( css.titleClass )[ 0 ] || null;
};

/**
 * Gets a slide from its title.
 * @param {HTMLElement} title The title.
 * @returns {HTMLElement?} The associated slide, null if there is not any.
 */
const getTitleSlide = ( title ) => {
	for ( let parent = title.parentElement; parent; parent = parent.parentElement ) {
		if ( isTitleBar( parent ) ) {
			const slideshow = parent.parentElement;
			if ( !slideshow ) {
				log.panic();
			}
	
			const index = Array.from( parent.children ).indexOf( title );
			return getSlides( slideshow )[ index ] || null;
		}
	
		if ( isSlide( parent ) ) {
			return parent;
		}
	}

	return null;
};

/**
 * Cycles slides of all enabled slideshows.
 */
const runAutoInterval = () => {
	if ( !auto.length ) {
		cyclingEnabled = false;
		return;
	}

	for ( const slideshow of auto ) {
		cycle( slideshow );
	}

	setTimeout( runAutoInterval, autoInterval );
};

/**
 * Sets a minimum height to a slideshow to prevent other elements from
 * moving on the page while switching slides.
 * @param {HTMLElement} slideshow The slideshow.
 */
const setMinHeight = ( slideshow ) => {
	const activeSlide = getActiveSlide( slideshow );
	if ( !activeSlide ) {
		log.panic();
	}

	activeSlide.classList.remove( css.activeSlideClass );

	let minHeight = 0;
	for ( const slide of getSlides( slideshow ) ) {
		slide.classList.add( css.activeSlideClass );
		const height = slideshow.getBoundingClientRect().height;
		minHeight = Math.max( minHeight, height );
		slide.classList.remove( css.activeSlideClass );
	}

	activeSlide.classList.add( css.activeSlideClass );

	slideshow.style.minHeight = `${minHeight}px`;
};

/**
 * Updates the minimum height of a slideshow after a slide change.
 * @param {HTMLElement} slideshow The slideshow.
 */
const updateMinHeight = ( slideshow ) => {
	slideshow.style.minHeight = '';
	setMinHeight( slideshow );
};

/**
 * Gets the first element following an element which has a given class.
 * @param {HTMLElement} element   The element.
 * @param {string}      className The class name.
 * @returns {HTMLElement?} An element following the given element which has
 *                         the given class, null if there is not any.
 */
const getNextSiblingByClassName = ( element, className ) => {
	for ( let sibling = element.nextElementSibling; sibling; sibling = sibling.nextElementSibling ) {
		if ( sibling.classList.contains( className ) ) {
			return sibling;
		}
	}

	return null;
};

/**
 * Gets the first element within a container which has a given class.
 * @param {HTMLElement} container The container.
 * @param {string}      className The class name.
 * @returns {HTMLElement?} An element from the container which has the given class,
 *                         null if there is not any.
 */
const getChildByClassName = ( container, className ) => {
	for ( const element of queryElementsByClassName( className, container ) ) {
		if ( element.parentElement === container ) {
			return element;
		}
	}
	return null;
};

/**
 * Removes an element, leaving its content in place.
 * @param {HTMLElement} element The element to remove.
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
	init, enable, makeAuto, disable, setActiveSlide, cycle, removeSlide, isEnabled, getSlides,
	getActiveSlide, getTitleBar, getSlideTitle, getTitleSlide
};

mw.hook( 'wikipage.content' ).add( ( $content ) => {
	const content = $content[ 0 ];
	if ( content ) {
		init( content );
	}
} );

mw.hook( 'contentFilter.filter.viewUpdated' ).add( () => {
	for ( const slideshow of queryElementsByClassName( css.enabledSlideshowClass ) ) {
		updateMinHeight( slideshow );
	}
} );

} ) )( mediaWiki );
// </nowiki>
