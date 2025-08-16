/**
 * Name:         TODO
 * Description:  TODO
 *
 * Module:       ext.gadget.content-filter-highlight
 * Dependencies: ext.gadget.content-filter-core
 */

// <nowiki>
( ( mw ) => mw.loader.using( 'ext.gadget.content-filter-core', ( require ) => {

const cf = require( 'ext.gadget.content-filter-core' );

const css = {
	contextHoverClass: 'cf-context-hover'
};

/**
 * TODO
 * @param {HTMLElement} content
 */
const setTagEventsInContent = ( content ) => {
	for ( const tag of cf.getTags( content ) ) {
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
	for ( const contextElement of context ) {
		contextElement.classList.remove( css.contextHoverClass );
	}
};

for ( const container of cf.getContainers() ) {
	setTagEventsInContent( container );
}
mw.hook( 'contentFilter.content.registered' ).add( setTagEventsInContent );

} ) )( mediaWiki );
// </nowiki>
