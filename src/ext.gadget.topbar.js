// <nowiki>
( ( mw, $ ) => mw.loader.using( [
	'ext.gadget.topbarCSS', 'mediawiki.Title', 'skins.vector.legacy.js'
], () => {

const config = mw.config.get( [ 'wgAction', 'wgActionPaths', 'wgPageName' ] );

/**
 * Add an anchor on the page title when not simply viewing it.
 *
 * @param {Node | null} node Node to check the content of.
 * @param {boolean} [acceptWhole] Whether an anchor can be added if the page title covers the whole node content.
 */
const addPageLinkToElement = ( node, acceptWhole ) => {
	if ( node === null ) {
		return false;
	}

	acceptWhole = acceptWhole || node.childNodes.length > 1;
	for ( const childNode of node.childNodes ) {
		if ( childNode instanceof Text ) {
			const text = childNode.textContent;
			if ( text === null ) {
				continue;
			}

			const toReplace = new mw.Title( config.wgPageName ).getPrefixedText();
			if ( !acceptWhole && text === toReplace ) {
				continue;
			}

			const parts = text.split( toReplace, 2 );
			if ( parts.length < 2 ) {
				continue;
			}

			const anchor = document.createElement( 'a' );
			anchor.href = config.wgActionPaths.view.replace( '$1', encodeURIComponent( config.wgPageName ) );
			anchor.text = toReplace;

			node.textContent = parts[0];
			node.appendChild( anchor );
			node.appendChild( document.createTextNode( parts[1] ) );

			return true;
		} else if ( addPageLinkToElement( childNode, acceptWhole ) ) {
			return true;
		}
	}

	return false;
};

$( () => {
	if ( $.collapsibleTabs ) {
		$.collapsibleTabs.calculateTabDistance = () => Infinity;
		$.collapsibleTabs.handleResize();
	}

	$( '#ca-history, #ca-watch, #ca-unwatch' )
		.prependTo( '#p-cactions .menu' )
		.removeClass( 'collapsible' );

	addPageLinkToElement( document.getElementById( 'firstHeading' ) );
} );

} ) )( mediaWiki, jQuery );
// </nowiki>
