/**
 * Name:        TemplateData – Hide empty
 * Description: Hide empty TemplateData parameter tables.
 *
 * Module:      ext.gadget.templatedata-hide-empty-fallback
 */

// <nowiki>
$( () => {

try {
	if ( document.querySelector( ':has( * )' ) === null ) {
		return;
	}
} catch(e) {
	return;
}

for ( const table of queryElementsByClassName( 'mw-templatedata-doc-params' ) ) {
	const mutedCell = table.getElementsByClassName( 'mw-templatedata-doc-muted' )[ 0 ];
	if ( mutedCell !== undefined && 'colSpan' in mutedCell && mutedCell.colSpan === 7 ) {
		table.classList.add( 'mw-templatedata-doc-params-empty' );
	}
}

} );
// </nowiki>
