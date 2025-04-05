/* All JavaScript here will be loaded for users of the Vector skin */
/* Last DLW update: [https://defaultloadout.wiki.gg/wiki/MediaWiki:Gadgets/vectorScripts/main.js?diff=latest&oldid=2232] */

/*** Mobile navigation toggle button ***/
$( function () {
	const BUTTON_CLASS = 'mobile-nav-toggle'

	if (document.querySelector('button.' + BUTTON_CLASS)){return;} // early return to avoid double button if this runs twice
	
	let mobileSidebarButton = document.createElement( 'button' );
	mobileSidebarButton.className = BUTTON_CLASS;
	mobileSidebarButton.addEventListener( 'click', function () {
			mobileSidebarButton.classList.toggle( 'nav--expanded' );
	} );
	document.body.classList.add( 'has-vector-mobile-menu' );
	document.getElementById( 'mw-panel' ).prepend( mobileSidebarButton );
} );
/*** End mobile navigation toggle button ***/
