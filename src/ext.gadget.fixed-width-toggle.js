/**
 * Name:        Fixed width
 * Description: TODO
 *
 * Module:      ext.gadget.fixed-width-toggle
 */

// <nowiki>
( ( mw ) => mw.loader.using( [ 'ext.gadget.portlet-toggle' ], ( require ) => {

const PortletToggle = require( 'ext.gadget.portlet-toggle' );

mw.user.isNamed() && $( () => {
	new PortletToggle( 'fixed-width', { id: 'pt-width', class: 'tb-width', title: 'screen width' }, [
		{ class: 'full', title: 'Full' },
		{ class: 'reduced', title: 'Reduced' }
	] );
} );

} ) )( mediaWiki );
// </nowiki>
