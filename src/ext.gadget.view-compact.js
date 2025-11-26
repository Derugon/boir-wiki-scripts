// <nowiki>
( ( mw, $ ) => mw.loader.using( [ 'mediawiki.Title', 'ext.gadget.logger' ], () => {

const Logger = require( 'ext.gadget.logger' );
const log = new Logger( 'view-compact' );

const css = {
	anchorClass: 'tb-page-title-view'
};

const config = mw.config.get( [ 'wgAction', 'wgActionPaths', 'wgPageName' ] );

/**
 * Add an anchor on the page title when not simply viewing it.
 */
const addPageLink = () => {
	const firstHeading = document.getElementById( 'firstHeading' );
	if ( firstHeading === null || firstHeading.getElementsByClassName( css.anchorClass )[ 0 ] ) {
		return;
	}

	const firstHeadingTitle = document.getElementById( 'firstHeadingTitle' );
	if ( firstHeadingTitle === null ) {
		addPageLinkToText( firstHeading );
		return;
	}

	const parent = firstHeadingTitle.parentElement || log.panic();
	const anchor = createPageLink();
	parent.replaceChild( anchor, firstHeadingTitle );
	anchor.appendChild( firstHeadingTitle );
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
				childNode.id !== 'cf-firstHeading-ext'
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
	anchor.classList.add( css.anchorClass );
	anchor.href = config.wgActionPaths.view.replace( '$1', encodeURIComponent( config.wgPageName ) );
	return anchor;
};

$( () => mw.hook( 'wikipage.content' ).add( addPageLink ) );

} ) )( mediaWiki, jQuery );
// </nowiki>
