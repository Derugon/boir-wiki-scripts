/* All JavaScript here will be loaded for users of the Vector skin */
/* Last DLW update: [https://defaultloadout.wiki.gg/wiki/MediaWiki:Gadgets/vectorScripts/main.js?diff=latest&oldid=2717] */

/*
	This is the wiki.gg default loadout,
	please do not modify it inline. To add your own skin customizations,
	scroll down to the end of the default loadout (or search for "[END]" to jump there).
	If you modify the sheet above that point, your changes may be overwritten in updates without warning!!!

	DLW VERSION: 2.2.6.6
*/

/*** Mobile navigation toggle button ***/
( function () {
	const BUTTON_CLASS = 'mobile-nav-toggle';
	const EXPANDED_CLASS = 'nav--expanded';
	if (document.querySelector('button.' + BUTTON_CLASS)){return;} // early return to avoid double button if this runs twice
	
	let mobileSidebarButton = document.createElement( 'button' );
	let sidebar = document.getElementById( 'mw-panel' );
	mobileSidebarButton.className = BUTTON_CLASS;
	mobileSidebarButton.addEventListener( 'click', function () {
		mobileSidebarButton.classList.toggle( EXPANDED_CLASS );
		sidebar.classList.toggle( EXPANDED_CLASS );
	} );
	sidebar.prepend( mobileSidebarButton );
	document.body.classList.add( 'has-vector-mobile-menu' );
} )();
/*** End mobile navigation toggle button ***/

/*** #mw-head collapsing fix ***/
/*** IMPORTANT: Do not copy this code if your wiki is not updated to default loadout 2.0 (May 22, 2025) or later, or your navigation tabs will break ***/
mw.loader.using('skins.vector.legacy.js', function() {
	$.collapsibleTabs.calculateTabDistance = function(){
		return parseInt(window.getComputedStyle(document.getElementById( 'right-navigation' ), '::before').width ) - 1;
	}
});
/*** END #mw-head collapsing fix ***/

/******************************************************/
/*                                                    */
/* [END] OF WIKI.GG DEFAULT LOADOUT                   */
/* ALL LOCAL SKIN CUSTOMIZATIONS SHOULD GO BELOW HERE */
/* DO NOT EDIT OR DELETE THIS COMMENT BLOCK           */
/*                                                    */
/******************************************************/
