// <nowiki>
( ( mw, $ ) => {

// Key of the message to use with the "language" button in navigation
const langButtonMessage = 'pagelang-language';

mw.loader.using( 'mediawiki.api', () => {
	const langPortlet = document.getElementById( 'p-lang' );
	if ( langPortlet === null ) {
		return;
	}

	new mw.Api().loadMessagesIfMissing( langButtonMessage ).then( () =>
		$( () => {
			langPortlet
				.getElementsByClassName( 'vector-menu-heading-label' )[ 0 ]
				.textContent = mw.message( langButtonMessage ).text();

			const input = document.createElement( 'input' );
			input.role = 'checkbox';
			input.id = 'p-lang-checkbox';
			input.classList.add( 'vector-menu-checkbox' );
			input.ariaHasPopup = 'true';
			input.ariaLabelledByElements = [ document.getElementById( 'p-lang-label' ) ];

			langPortlet.classList.add( 'vector-menu-dropdown' );
			langPortlet.classList.remove( 'vector-menu-portal' );
			langPortlet.prepend( input );

			const namespacePortal = document.getElementById( 'p-namespaces' );
			if ( namespacePortal !== null ) {
				namespacePortal.insertAdjacentElement( 'afterend', langPortlet );
				return;
			}

			const leftNavigation = document.getElementById( 'left-navigation' );
			if ( leftNavigation !== null ) {
				leftNavigation.appendChild( langPortlet );
			}
		} )
	);
} );

$( () => {
	mw.loader.using( 'skins.vector.legacy.js', () => {
		if ( $.collapsibleTabs ) {
			$.collapsibleTabs.calculateTabDistance = () => Infinity;
			$.collapsibleTabs.handleResize();
		}
	} );

	const firstHeading = document.getElementById( 'firstHeading' );
	const indicators = document.getElementsByClassName( 'mw-indicators' )[ 0 ];
	if ( firstHeading !== null && indicators !== null ) {
		firstHeading.after( indicators );
	}
} );

} )( mediaWiki, jQuery );
// </nowiki>
