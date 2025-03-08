/**
 * Name:        TODO
 * Description: TODO
 *
 * Module:      ext.gadget.content-filter-preview
 */

// <nowiki>

( ( document ) => {

/**
 * TODO
 * @this {HTMLElement}
 */
const onButtonEnter = function () {
	const filterIndex = cf.getButtonFilterIndex( this );
	if ( filterIndex === null ) {
		return;
	}

	// We do not know whether the view is computed when the page is loaded
	// or lazily when the associated filter is activated.
	cf.parseView( filterIndex );

	for ( const viewFragment of document.querySelectorAll( `.cf-view-${filterIndex}` ) ) {
		viewFragment.classList.add( 'cf-view-hover' );
	}
};

/**
 * TODO
 * @this {HTMLElement}
 */
const onButtonLeave = function () {
	const filterIndex = cf.getButtonFilterIndex( this );
	if ( filterIndex === null ) {
		return;
	}

	for ( const viewFragment of document.querySelectorAll( `.cf-view-${filterIndex}` ) ) {
		viewFragment.classList.remove( 'cf-view-hover' );
	}
};

hookFiredOnce( 'contentFilter.filter.menuPlaced' ).then( () => {
	for ( const button of cf.buttons ) {
		button.addEventListener( 'mouseenter', onButtonEnter );
		button.addEventListener( 'mouseleave', onButtonLeave );
	}
} );

} )( document );
// </nowiki>
