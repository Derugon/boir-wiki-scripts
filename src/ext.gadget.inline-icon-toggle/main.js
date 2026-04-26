/**
 * Name:        Inline icon toggle
 * Description: TODO
 *
 * Module:      ext.gadget.inline-icon-toggle
 */

// <nowiki>
( ( mw ) => mw.loader.using( [ 'ext.gadget.portlet-toggle' ], ( require ) => {

const PortletToggle = require( 'ext.gadget.portlet-toggle' );

mw.user.isNamed() && $( () => {
	new PortletToggle( { id: 'pt-inline-icon', class: 'tb-icon', title: 'content format' }, [
		{ gadget: 'inline-icon', class: 'visible', title: 'Icon and text' },
		{ gadget: 'inline-icon-hide', class: 'hidden', title: 'Text only' }
	] );
} );

} ) )( mediaWiki );
// </nowiki>
