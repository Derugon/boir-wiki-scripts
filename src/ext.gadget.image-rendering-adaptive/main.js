/**
 * Name:        Image rendering – Adaptive
 * Description: Dynamically changes the rendering mode of images depending on their size.
 *
 * Module:      ext.gadget.image-rendering-adaptive
 */

// <nowiki>
( ( document ) => {

const threshold = 3 / 4;

const css = {
	smoothClass: 'tb-image-rendering-smooth',
	pixelatedClass: 'tb-image-rendering-pixelated'
};

/**
 * @param {HTMLImageElement} image
 */
const checkImage = ( image ) => {
	const computedHeight = parseInt( window.getComputedStyle( image ).getPropertyValue( 'height' ) );
	if ( computedHeight < threshold * image.naturalHeight ) {
		image.classList.remove( css.pixelatedClass );
		image.classList.add( css.smoothClass );
	} else {
		image.classList.remove( css.smoothClass );
		image.classList.add( css.pixelatedClass );
	}
};

const resizeObserver = new ResizeObserver( ( entries ) => {
	for ( const entry of entries ) {
		// @ts-ignore
		checkImage( entry.target );
	}
} );

/**
 * @param {Document | HTMLElement} container
 */
const observeImages = ( container ) => {
	for ( const image of Array.from( container.getElementsByTagName( 'img' ) ) ) {
		resizeObserver.observe( image );
		if ( !image.complete || image.naturalHeight === 0 ) {
			image.addEventListener( 'load', () => checkImage( image ) );
		} else if ( !image.classList.contains( css.smoothClass ) && !image.classList.contains( css.pixelatedClass ) ) {
			checkImage( image );
		}
	}
};

$( () => observeImages( document ) );
mw.hook( 'wikipage.content' ).add( ( $content ) => observeImages( $content[ 0 ] ) );

} )( document );
// </nowiki>
