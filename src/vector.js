/* All JavaScript here will be loaded for users of the Vector skin */
/* Last DLW update: [https://defaultloadout.wiki.gg/wiki/MediaWiki:Vector.js?diff=latest&oldid=1548] */

/*** Mobile navigation toggle button ***/
$( function () {
		var mobileSidebarButton = document.createElement( 'button' );
		mobileSidebarButton.className = 'mobile-nav-toggle';
		mobileSidebarButton.addEventListener( 'click', function () {
				mobileSidebarButton.classList.toggle( 'nav--expanded' );
		} );
        document.body.classList.add( 'has-vector-mobile-menu' );
		document.getElementById( 'mw-panel' ).prepend( mobileSidebarButton );
} );
/*** End mobile navigation toggle button ***/
