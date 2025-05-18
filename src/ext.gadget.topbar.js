// <nowiki>
( ( mw, $ ) => mw.loader.using( [
	'mediawiki.Title', 'skins.vector.legacy.js', 'ext.gadget.logger', 'ext.gadget.topbarCSS'
], () => {

const Logger = require( 'ext.gadget.logger' );
const log = new Logger( 'topbar' );

const config = mw.config.get( [ 'wgAction', 'wgActionPaths', 'wgPageName' ] );

/**
 * Add an anchor on the page title when not simply viewing it.
 */
const addPageLink = () => {
	const firstHeadingTitle = document.getElementById( 'firstHeadingTitle' );
	if ( firstHeadingTitle === null ) {
		addPageLinkToText( document.getElementById( 'firstHeading' ) );
	} else {
		const parent = firstHeadingTitle.parentElement || log.panic();
		const anchor = createPageLink();
		parent.replaceChild( anchor, firstHeadingTitle );
		anchor.appendChild( firstHeadingTitle );
	}
};

/**
 * Add an anchor on the page title text.
 *
 * @param {Node | null} node Node to check the content of.
 * @param {boolean} [acceptWhole] Whether an anchor can be added if the page title covers the whole node content.
 */
const addPageLinkToText = ( node, acceptWhole ) => {
	if ( node === null ) {
		return false;
	}

	if ( !acceptWhole ) {
		let solidChildNodes = 0;
		for ( const childNode of node.childNodes ) {
			if (
				childNode instanceof Text &&
				childNode.textContent !== null &&
				childNode.textContent.trim() !== '' ||
				childNode instanceof HTMLElement &&
				!childNode.classList.contains( 'cf-menu' )
			) {
				++solidChildNodes;
				if ( solidChildNodes > 1 ) {
					acceptWhole = true;
					break;
				}
			}
		}
	}

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

			const anchor = createPageLink();
			anchor.text = toReplace;

			node.textContent = parts[0];
			node.appendChild( anchor );
			node.appendChild( document.createTextNode( parts[1] ) );

			return true;
		} else if ( addPageLinkToText( childNode, acceptWhole ) ) {
			return true;
		}
	}

	return false;
};

const createPageLink = () => {
	const anchor = document.createElement( 'a' );
	anchor.href = config.wgActionPaths.view.replace( '$1', encodeURIComponent( config.wgPageName ) );
	return anchor;
};

$( () => {
	if ( $.collapsibleTabs ) {
		$.collapsibleTabs.calculateTabDistance = () => Infinity;
		$.collapsibleTabs.handleResize();
	}

	$( '#ca-history, #ca-watch, #ca-unwatch' )
		.prependTo( '#p-cactions .menu' )
		.removeClass( 'collapsible' );

	mw.hook( 'wikipage.content' ).add( addPageLink );
} );

} ) )( mediaWiki, jQuery );
// </nowiki>
