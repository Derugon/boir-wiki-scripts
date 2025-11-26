/**
 * Name:        User option
 * Description: Client-side user option management utilities.
 *
 * Module:      ext.gadget.user-option
 */

// <nowiki>
( ( $, mw ) => mw.loader.using( 'mediawiki.api', () => {

/**
 * @classdesc
 * Class for storing or retrieving a user option.
 * 
 * Local storage is used for anonymous users.
 * 
 * @constructor
 * Constructs a user option manager.
 * 
 * @param {string} key User option key.
 * @param {number} [defaultValue] Default option value.
 */
const UserOption = function ( key, defaultValue ) {
	this.key = key;
	this.defaultValue = defaultValue || 0;
};

/**
 * MediaWiki API used to store user options.
 */
UserOption.api = new mw.Api();

UserOption.prototype = {
	constructor: UserOption,

	/**
	 * Get the user option value.
	 * 
	 * @returns {number}
	 */
	get() {
		let value = null;
		if ( mw.user.isAnon() ) {
			value = mw.storage.get( this.key );
			if ( value === false ) {
				value = null;
			}
		} else {
			value = mw.user.options.get( this.key );
		}

		if ( value === null ) {
			return this.defaultValue;
		} else {
			return +value;
		}
	},

	/**
	 * Set the user option value.
	 *
	 * @param {number} value Value to store.
	 */
	set( value ) {
		if ( mw.user.isAnon() ) {
			mw.storage.set( this.key, `${value}` );
			return $.Deferred().resolve();
		} else {
			mw.user.options.set( this.key, value );
			return UserOption.api.saveOption( this.key, `${value}` );
		}
	}
};

module.exports = UserOption;

} ) )( jQuery, mediaWiki );
// </nowiki>
