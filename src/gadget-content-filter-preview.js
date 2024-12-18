/**
 * Name:        TODO
 * Description: TODO
 */

// <nowiki>

( function ( mw, document ) {

/**
 * TODO
 * @param {HTMLLIElement} button
 */
function setButtonEvents( button ) {
	button.addEventListener( 'mouseenter', onButtonEnter );
	button.addEventListener( 'mouseleave', onButtonLeave );
}

/**
 * TODO
 * @this {HTMLElement}
 */
function onButtonEnter() {
	const filterIndex = this.dataset.cfFilter;
	if ( !filterIndex ) {
		return;
	}

	// we do not know whether the view is computed when the page is loaded
	// or lazily when the associated filter is activated.
	cf.parseView( +filterIndex );

	const viewFragments = document.getElementsByClassName( 'cf-view-' + filterIndex );
	Array.from( viewFragments, addViewFragmentHighlighting );
}

/**
 * TODO
 * @this {HTMLElement}
 */
function onButtonLeave() {
	const filterIndex = this.dataset.cfFilter;
	if ( filterIndex ) {
		const viewFragments = document.getElementsByClassName( 'cf-view-' + filterIndex );
		Array.from( viewFragments, removeViewFragmentHighlighting );
	}
}

/**
 * TODO
 * @param {HTMLElement} viewFragment
 */
function addViewFragmentHighlighting( viewFragment ) {
	viewFragment.classList.add( 'cf-view-hover' );
}

/**
 * TODO
 * @param {HTMLElement} viewFragment
 */
function removeViewFragmentHighlighting( viewFragment ) {
	viewFragment.classList.remove( 'cf-view-hover' );
}

mw.hook( 'contentFilter.loadEnd' ).add( function onContentSet() {
	mw.hook( 'contentFilter.loadEnd' ).remove( onContentSet );
	cf.buttons.forEach( setButtonEvents );
} );

} )( mediaWiki, document );
// </nowiki>
