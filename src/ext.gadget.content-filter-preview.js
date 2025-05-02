/**
 * Name:        TODO
 * Description: TODO
 *
 * Module:      ext.gadget.content-filter-preview
 */

// <nowiki>
( ( document ) => mw.loader.using( 'site', ( require ) =>
hookFiredOnce( 'contentFilter.filter.menuPlaced' ).then( () => {

const cfView = require( 'ext.gadget.content-filter-view' );
const cfSwitch = require( 'ext.gadget.content-filter' );

/**
 * TODO
 * @this {HTMLElement}
 */
const onButtonEnter = function () {
	const filterIndex = cfSwitch.getButtonFilterIndex( this );
	if ( filterIndex === null ) {
		return;
	}

	// We do not know whether the view is computed when the page is loaded
	// or lazily when the associated filter is activated.
	cfView.parseView( filterIndex );

	for ( const viewFragment of document.querySelectorAll( `.cf-view-${filterIndex}` ) ) {
		viewFragment.classList.add( 'cf-view-hover' );
	}
};

/**
 * TODO
 * @this {HTMLElement}
 */
const onButtonLeave = function () {
	const filterIndex = cfSwitch.getButtonFilterIndex( this );
	if ( filterIndex === null ) {
		return;
	}

	for ( const viewFragment of document.querySelectorAll( `.cf-view-${filterIndex}` ) ) {
		viewFragment.classList.remove( 'cf-view-hover' );
	}
};

for ( const button of cfSwitch.buttons ) {
	button.addEventListener( 'mouseenter', onButtonEnter );
	button.addEventListener( 'mouseleave', onButtonLeave );
}

} ) ) )( document );
// </nowiki>
