/**
 * Name:         TODO
 * Description:  TODO
 *
 * Module:       ext.gadget.content-filter-highlight
 * Dependencies: ext.gadget.content-filter-core
 */

// <nowiki>
( ( mw ) => {

if ( !window.cf ) {
	// Something went wrong.
	return;
}
const cf = window.cf;

const css = {
	contextHoverClass: 'cf-context-hover'
};

/**
 * TODO
 * @param {HTMLElement} content
 */
const setTagEventsInContent = ( content ) => {
	for ( const tag of Array.from( cf.getTags( content ) ) ) {
		tag.removeEventListener( 'mouseenter', onTagEnter );
		tag.removeEventListener( 'mouseleave', onTagLeave );
		tag.addEventListener( 'mouseenter', onTagEnter );
		tag.addEventListener( 'mouseleave', onTagLeave );
	}
};

/**
 * TODO
 * @this {HTMLElement}
 */
const onTagEnter = function() {
	const context = cf.getContext( this );
	if ( context === null ) {
		return;
	}

	for ( const contextElement of context ) {
		contextElement.classList.add( css.contextHoverClass );
	}
};

/**
 * TODO
 * @this {HTMLElement}
 */
const onTagLeave = function () {
	const context = cf.getContext( this );
	if ( context === null ) {
		return;
	}

	for ( const contextElement of context ) {
		contextElement.classList.remove( css.contextHoverClass );
	}
};

for ( const container of cf.containers ) {
	setTagEventsInContent( container );
}
mw.hook( 'contentFilter.content.registered' ).add( setTagEventsInContent );

} )( mediaWiki );
// </nowiki>
