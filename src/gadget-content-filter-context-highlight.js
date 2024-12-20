/**
 * Name:         TODO
 * Description:  TODO
 *
 * Module:       ext.gadget.content-filter-highlight
 * Dependencies: ext.gadget.content-filter-core
 */

// <nowiki>

( function ( mw ) {

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
function setTagEventsInContent( content ) {
	Array.from( cf.getTags( content ), setTagEvents );
}

/**
 * TODO
 * @param {HTMLElement} tag
 */
function setTagEvents( tag ) {
	tag.removeEventListener( 'mouseenter', onTagEnter );
	tag.removeEventListener( 'mouseleave', onTagLeave );
	tag.addEventListener( 'mouseenter', onTagEnter );
	tag.addEventListener( 'mouseleave', onTagLeave );
}

/**
 * TODO
 * @this {HTMLElement}
 */
function onTagEnter() {
	const context = cf.getContext( this );
	if ( context !== null ) {
		context.forEach( enableContextElementHovering );
	}
}

/**
 * TODO
 * @this {HTMLElement}
 */
function onTagLeave() {
	const context = cf.getContext( this );
	if ( context !== null ) {
		context.forEach( disableContextElementHovering );
	}
}

/**
 * TODO
 * @param {HTMLElement} contextElement
 */
function enableContextElementHovering( contextElement ) {
	contextElement.classList.add( css.contextHoverClass );
}

/**
 * TODO
 * @param {HTMLElement} contextElement
 */
function disableContextElementHovering( contextElement ) {
	contextElement.classList.remove( css.contextHoverClass );
}

cf.containers.forEach( setTagEventsInContent );
mw.hook( 'contentFilter.content.registered' ).add( setTagEventsInContent );

} )( mediaWiki );
// </nowiki>
