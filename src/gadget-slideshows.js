( function ( mw ) {

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
var cyclingEnabled = false;

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
 * Handles an "impossible" case, supposedly caused by other scripts breaking the
 * expected DOM elements.
 * @returns {never}
 */
function domPanic() {
	throw "Something went wrong, either DOM elements have been modified in " +
	      "an unexpected way, or they have been disconnected from the document.";
}

/**
 * Enables all slideshows in a container.
 * @param {HTMLElement} container The container.
 * @returns {HTMLElement[]} The enabled slideshows in the container.
 */
function init( container ) {
	return Array.from( container.getElementsByClassName( css.slideshowClass ) )
		.filter( enable );
}

/**
 * Enables a slideshow.
 * @param {HTMLElement} slideshow The slideshow to enable.
 * @returns {boolean} True if the slideshow is now enabled,
 *                    false if it is now disabled.
 */
function enable( slideshow ) {
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

	const titles = slides.map( enableTitle, newClickEvents );

	if ( newClickEvents.titles.size > 0 ) {
		const as = titlebar.getElementsByTagName( 'a' );
		while ( as[ 0 ] ) {
			unwrap( as[ 0 ] );
		}
	}

	const activeIndex = slideshow.classList.contains( css.dlcSlideshowClass ) ? slides.length - 1 : 0;
	const activeSlide = slides[ activeIndex ];
	const activeTitle = titles[ activeIndex ];
	if ( !activeSlide || !activeTitle ) {
		domPanic();
	}

	activeSlide.classList.add( css.activeSlideClass );
	if ( activeTitle.classList.contains( css.titleClass ) ) {
		activeTitle.classList.add( css.activeTitleClass );
	}

	if (
		!slideshow.classList.contains( css.hiddenSlideshowClass ) &&
		!slideshow.getElementsByClassName( css.slideshowClass )[ 0 ]
	) {
		newClickEvents.slide = function () { /* cycle( slideshow ); */ };
		slides.forEach( setSlideClickEvent, newClickEvents.slide );
	}

	titles.forEach( appendTitle, titlebar );

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
}

/**
 * Adds a title to a title bar of a slideshow.
 * @this {HTMLElement} The title bar.
 * @param {HTMLElement?} title The title to add.
 */
function appendTitle( title ) {
	if ( !title ) {
		this.appendChild( document.createElement( 'span' ) );
		return;
	}

	const titlePlaceholder = title.cloneNode( true );
	const parent = title.parentElement || domPanic();

	parent.replaceChild( titlePlaceholder, title );
	this.appendChild( title );

	titlePlaceholder.classList.remove( css.activeTitleClass );
	titlePlaceholder.classList.remove( css.titleClass );
	titlePlaceholder.classList.add( css.titlePlaceholderClass );
}

/**
 * Sets the event handler when clicking on a slide.
 * @this {EventListener} The event handler.
 * @param {HTMLElement} slide The slide whose click event should be handled.
 */
function setSlideClickEvent( slide ) {
	slide.addEventListener( 'click', this );
}

/**
 * Makes a slideshow cycle slides automatically.
 * @param {HTMLElement} slideshow The slideshow.
 */
function makeAuto( slideshow ) {
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
}

/**
 * Disables a slideshow.
 * @param {HTMLElement} slideshow The slideshow to disable.
 */
function disable( slideshow ) {
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
		domPanic();
	}

	clickEvents.delete( slideshow );
	slideshow.style.minHeight = '';
	slideshow.classList.remove( css.enabledSlideshowClass );

	slides.forEach( function ( slide ) {
		slide.classList.remove( css.activeSlideClass );
		if ( localClickEvents.slide ) {
			slide.removeEventListener( 'click', localClickEvents.slide );
		}

		if ( !titleBar ) {
			return;
		}

		const title = getSlideTitle( slide );
		if ( !title ) {
			domPanic();
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
	} );

	if ( titleBar ) {
		titleBar.remove();
	}
}

/**
 * Sets a slide as the active one of a slideshow.
 * @param {HTMLElement} slide   The slide to set as active one.
 * @param {HTMLElement} [title] The title of the slide.
 */
function setActiveSlide( slide, title ) {
	const slideshow = slide.parentElement;
	if ( !slideshow ) {
		domPanic();
	}

	const activeSlide = getActiveSlide( slideshow );
	if ( !activeSlide ) {
		domPanic();
	}

	activeSlide.classList.remove( css.activeSlideClass );
	slide.classList.add( css.activeSlideClass );

	const titlebar = getTitleBar( slideshow );
	if ( !titlebar ) {
		return;
	}

	var activeTitle = getSlideTitle( activeSlide );
	if ( activeTitle ) {
		activeTitle.classList.remove( css.activeTitleClass );
	}

	const slideTitle = title || getSlideTitle( slide );
	if ( slideTitle && slideTitle.classList.contains( css.titleClass ) ) {
		slideTitle.classList.add( css.activeTitleClass );
	}
}

/**
 * Sets the next slide as the active one of a slideshow.
 * @param {HTMLElement} slideshow The slideshow.
 */
function cycle( slideshow ) {
	const activeSlide = getActiveSlide( slideshow );
	if ( !activeSlide ) {
		domPanic();
	}

	setActiveSlide(
		getNextSiblingByClassName( activeSlide, css.slideClass ) ||
		getChildByClassName( slideshow, css.slideClass ) ||
		domPanic()
	);
}

/**
 * Removes a slide from a slideshow.
 * @param {HTMLElement} slide The slide to remove.
 */
function removeSlide( slide ) {
	const title = getSlideTitle( slide );
	slide.remove();

	if ( title ) {
		title.remove();
	}

	const slideshow = slide.parentElement;
	if ( slideshow && getSlides( slideshow ).length < 2 ) {
		disable( slideshow );
	}
}

/**
 * Indicates whether a slideshow is enabled.
 * @param {HTMLElement} slideshow The slideshow.
 * @returns {boolean} True if the slideshow is enabled, false otherwise.
 */
function isEnabled( slideshow ) {
	return slideshow.classList.contains( css.enabledSlideshowClass );
}

/**
 * Gets all slides of a slideshow.
 * @param {HTMLElement} slideshow The slideshow to enable.
 * @returns {HTMLElement[]} An array of all slides of the slideshow.
 */
function getSlides( slideshow ) {
	return Array.from( slideshow.children ).filter( isSlide );
}

/**
 * Gets the currently active slide of a slideshow.
 * @param {HTMLElement} slideshow The slideshow to enable.
 * @returns {HTMLElement?} The currently active slide of the slideshow,
 *                         null if there is not any.
 */
function getActiveSlide( slideshow ) {
	return Array.from( slideshow.children ).find( isActiveSlide ) || null;
}

/**
 * Gets the title bar of a slideshow.
 * @param {HTMLElement} slideshow The slideshow.
 * @returns {HTMLElement?} The title bar of the slideshow,
 *                         null if it does not have any.
 */
function getTitleBar( slideshow ) {
	return Array.from( slideshow.children ).find( isTitleBar ) || null;
}

/**
 * Indicates whether an element is a slide.
 * @param {HTMLElement} element The element.
 * @returns {boolean} True if the element is a slide, false otherwise.
 */
function isSlide( element ) {
	return element.classList.contains( css.slideClass );
}

/**
 * Indicates whether an element is the active slide of a slideshow.
 * @param {HTMLElement} element The element.
 * @returns {boolean} True if the element is a slide and the active one of its
 *                    slideshow, false otherwise.
 */
function isActiveSlide( element ) {
	return element.classList.contains( css.activeSlideClass );
}

/**
 * Indicates whether an element is the title bar of a slideshow.
 * @param {HTMLElement} element The element.
 * @returns {boolean} True if the element is the title bar of a slideshow,
 *                    false otherwise.
 */
function isTitleBar( element ) {
	return element.classList.contains( css.titlebarClass );
}

/**
 * Gets the title of a slide.
 * @param {HTMLElement} slide The slide.
 * @returns {HTMLElement?} The title of the slide, null if it does not have any.
 */
function getSlideTitle( slide ) {
	const slideshow = slide.parentElement;
	if ( !slideshow ) {
		return domPanic();
	}

	const titlebar = getTitleBar( slideshow );
	if ( titlebar ) {
		return titlebar.children[ getSlides( slideshow ).indexOf( slide ) ] || domPanic();
	}

	return slide.getElementsByClassName( css.titleClass )[ 0 ] || null;
}

/**
 * Gets a slide from its title.
 * @param {HTMLElement} title The title.
 * @returns {HTMLElement?} The associated slide, null if there is not any.
 */
function getTitleSlide( title ) {
	for ( var parent = title.parentElement; parent; parent = parent.parentElement ) {
		if ( isTitleBar( parent ) ) {
			const slideshow = parent.parentElement;
			if ( !slideshow ) {
				domPanic();
			}
	
			const index = Array.from( parent.children ).indexOf( title );
			return getSlides( slideshow )[ index ] || null;
		}
	
		if ( isSlide( parent ) ) {
			return parent;
		}
	}

	return null;
}

/**
 * Enables the click action from a title to its slide.
 * @this {ClickEvents} The click events of the slideshow.
 * @param {HTMLElement} slide The slide.
 * @returns {HTMLElement} The title of the slide, null if there is not any.
 */
function enableTitle( slide ) {
	const title = getSlideTitle( slide );
	if ( !title ) {
		domPanic();
	}

	const click = function () {
		if ( title.classList.contains( css.activeTitleClass ) ) {
			return;
		}

		const slide = getTitleSlide( title );
		if ( !slide ) {
			domPanic();
		}

		setActiveSlide( slide, title );
	};

	this.titles.set( title, click );
	title.addEventListener( 'click', click );

	return title;
}

/**
 * Cycles slides of all enabled slideshows.
 */
function runAutoInterval() {
	if ( !auto.length ) {
		cyclingEnabled = false;
		return;
	}

	auto.forEach( cycle );

	setTimeout( runAutoInterval, autoInterval );
}

/**
 * Sets a minimum height to a slideshow to prevent other elements from
 * moving on the page while switching slides.
 * @param {HTMLElement} slideshow The slideshow.
 */
function setMinHeight( slideshow ) {
	const activeSlide = getActiveSlide( slideshow );
	if ( !activeSlide ) {
		domPanic();
	}

	activeSlide.classList.remove( css.activeSlideClass );

	const minHeight = getSlides( slideshow ).reduce( function ( maxHeight, slide ) {
		slide.classList.add( css.activeSlideClass );
		maxHeight = Math.max(
			maxHeight,
			slideshow.getBoundingClientRect().height
		);
		slide.classList.remove( css.activeSlideClass );
		return maxHeight;
	}, 0 );

	activeSlide.classList.add( css.activeSlideClass );

	slideshow.style.minHeight = minHeight + 'px';
}

/**
 * Updates the minimum height of a slideshow after a slide change.
 * @param {HTMLElement} slideshow The slideshow.
 */
function updateMinHeight( slideshow ) {
	slideshow.style.minHeight = '';
	setMinHeight( slideshow );
}

/**
 * Gets the first element following an element which has a given class.
 * @param {HTMLElement} element   The element.
 * @param {string}      className The class name.
 * @returns {HTMLElement?} An element following the given element which has
 *                         the given class, null if there is not any.
 */
function getNextSiblingByClassName( element, className ) {
	for ( var sibling = element.nextElementSibling; sibling; sibling = sibling.nextElementSibling ) {
		if ( sibling.classList.contains( className ) ) {
			return sibling;
		}
	}

	return null;
}

/**
 * Gets the first element within a container which has a given class.
 * @param {HTMLElement} container The container.
 * @param {string}      className The class name.
 * @returns {HTMLElement?} An element from the container which has the given class,
 *                         null if there is not any.
 */
function getChildByClassName( container, className ) {
	return Array.from( container.getElementsByClassName( className ) ).find( isChild, container ) || null;
}

/**
 * Indicates whether an element is a direct child of another.
 * @this {HTMLElement} The parent element.
 * @param {HTMLElement} element The element to check.
 * @returns {boolean} True if the given element is a child of the other one,
 *                    false otherwise.
 */
function isChild( element ) {
	return element.parentElement === this;
}

/**
 * Removes an element, leaving its content in place.
 * @param {HTMLElement} element The element to remove.
 */
function unwrap( element ) {
	const parent = element.parentElement;
	if ( !parent ) {
		domPanic();
	}

	var childNode = element.firstChild;
	while ( childNode ) {
		parent.insertBefore( childNode, element );
		childNode = element.firstChild;
	}

	element.remove();
}

module.exports = {
	init: init,
	enable: enable,
	makeAuto: makeAuto,
	disable: disable,
	setActiveSlide: setActiveSlide,
	cycle: cycle,
	removeSlide: removeSlide,
	isEnabled: isEnabled,
	getSlides: getSlides,
	getActiveSlide: getActiveSlide,
	getTitleBar: getTitleBar,
	getSlideTitle: getSlideTitle,
	getTitleSlide: getTitleSlide
};

mw.hook( 'wikipage.content' ).add( function ( $content ) {
	const content = $content[ 0 ];
	if ( content ) {
		init( content );
	}
} );

mw.hook( 'contentFilter.filter.viewUpdated' ).add( function () {
	Array.from(
		document.getElementsByClassName( css.enabledSlideshowClass ),
		updateMinHeight
	);
} );

} )( mediaWiki );
