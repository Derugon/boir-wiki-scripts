/**
 * Name:        Text size
 * Description: TODO
 *
 * Module:      ext.gadget.text-size-toggle
 */

// <nowiki>
( ( mw ) => mw.loader.using( [ 'ext.gadget.portlet-toggle' ], ( require ) => {

const PortletToggle = require( 'ext.gadget.portlet-toggle' );

mw.user.isNamed() && $( () => {
	new PortletToggle( { id: 'pt-size', class: 'tb-size', title: 'text size' }, [
		{ gadget: 'text-size-small', class: 'small', title: 'Small' },
		{ gadget: 'text-size-medium', class: 'medium', title: 'Medium' },
		{ gadget: 'text-size-large', class: 'large', title: 'Large' }
	] );
} );

} ) )( mediaWiki );
// </nowiki>
