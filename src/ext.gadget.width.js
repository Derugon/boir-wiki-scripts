( ( mw ) => {

mw.loader.using( 'ext.themes.jsapi', ( requir ) => {
	/**
	 * @param {string} s
	 * @returns {number}
	 */
	function require( s ) { return 1; }

	///** @type {{}} */
	//const themes = require( 'ext.themes.jsapi' );

	//const themes2 = mw.loader.require( 'ext.themes.jsapi' );



	const someNumber = require('someName');

	/** @type {typeof (require('someName'))} */
	const x = "aaa";

} );

} )( mediaWiki );
