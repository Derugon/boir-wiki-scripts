/**
 * Name:        TODO
 * Description: TODO
 */

// <nowiki>

( function ( mw, document ) {

/**
 * TODO
 * @param {HTMLElement} container
 */
function setContainerEvents( container ) {
	Array.from( container.getElementsByClassName( 'cf-tag' ), setTagEvents );
}

/**
 * TODO
 * @param {HTMLElement} tag
 */
function setTagEvents( tag ) {
	tag.removeEventListener( 'mouseenter', onTagHover );
	tag.removeEventListener( 'mouseleave', onTagHover );
	tag.addEventListener( 'mouseenter', onTagHover );
	tag.addEventListener( 'mouseleave', onTagHover );
}

/**
 * TODO
 * @this {HTMLElement}
 */
function onTagHover() {
	Array.from(
		document.getElementsByClassName( 'cf-context-' + this.dataset.cfContext ),
		toggleContextFragmentHighlighting
	);
}

/**
 * TODO
 * @param {HTMLElement} contextFragment
 */
function toggleContextFragmentHighlighting( contextFragment ) {
	contextFragment.classList.toggle( 'cf-context-hover' );
}

// Note [UsingCore]:
//   All code parts requiring the use of the core module are moved behinds
//   hooks. These hooks should be fired from the core module itself,
//   so there is no point in waiting for it to load.
mw.loader.using( 'ext.gadget.content-filter-core' );

mw.hook( 'contentFilter.content' ).add( function ( containers ) {
	containers.forEach( setContainerEvents );
} );

} )( mediaWiki, document );
// </nowiki>
