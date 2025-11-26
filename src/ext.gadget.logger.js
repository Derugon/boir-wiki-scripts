/**
 * Name:        Logger
 * Description: Client-side logging utilities.
 *
 * Module:      ext.gadget.logger
 */

// <nowiki>
( ( console, mw ) => {

/**
 * @classdesc
 * Class for logging messages, with a little more control than what {@link mw.log} provides.
 *
 * @constructor
 * Construct a logger.
 *
 * @param {string} name Logger name.
 */
const Logger = function ( name ) {
	this.name = name;
	Logger.registry[name] = this;
};

/**
 * Registered loggers.
 *
 * @type {Record<string, Logger>}
 */
Logger.registry = {};

Logger.prototype = {
	constructor: Logger,

	/**
	 * Log an information-level message.
	 *
	 * @param  {...unknown} msgs Message parts.
	 */
	info( ...msgs ) {
		console.log( `[${this.name}]`, ...msgs );
	},

	/**
	 * Log a warning-level message.
	 *
	 * @param  {...unknown} msgs Message parts.
	 */
	warn( ...msgs ) {
		mw.log.warn( `[${this.name}]`, ...msgs );
	},

	/**
	 * Log an error-level message.
	 *
	 * @param  {...unknown} msgs Message parts.
	 */
	error( ...msgs ) {
		mw.log.error( `[${this.name}]`, ...msgs );
	},

	/**
	 * Log an error-level message, and throws an error.
	 * To use when something strange happened in the DOM, for debugging purpose.
	 *
	 * @param  {...unknown} msgs Message parts.
	 * @returns {never}
	 */
	panic( ...msgs ) {
		let message = (
			`[${this.name}] Something went wrong, either DOM elements have been modified in an ` +
			'unexpected way, or they have been disconnected from the document.'
		);
	
		if ( msgs ) {
			message += `\nAdditional note: ${msgs.join( ' ' )}`;
		}
	
		throw message;
	}
};

module.exports = Logger;

} )( console, mediaWiki );
// </nowiki>
