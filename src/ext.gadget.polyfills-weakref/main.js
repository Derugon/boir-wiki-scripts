/**
 * Name:        WeakRef polyfill
 * Description: WeakRef polyfill, keeping normal references to objects.
 *
 * Module:      ext.gadget.polyfills-weakref
 */

// <nowiki>
( ( window ) => {

if ( window.WeakRef !== undefined ) {
	return;
}

/**
 * @template {{}} T
 */
class WeakRef {
	/**
	 * @param {T} target
	 */
	constructor( target ) {
		this.target = target;
	}

	deref() {
		return this.target;
	}
}

// @ts-ignore
WeakRef.prototype[Symbol.toStringTag] = 'WeakRef';

// @ts-ignore
window.WeakRef = WeakRef;

} )( window );
// </nowiki>
