/**
 * Name:        Mouse tracker
 * Description: Mouse position tracking for CSS use.
 *
 * Module:      ext.gadget.mouse-tracker
 */

// <nowiki>
( () => {

const css = {
	leftVar: '--tb-cursor-left',
	topVar: '--tb-cursor-top'
};

/**
 * Mouse position tracker.
 */
class MouseTracker {

	/**
	 * Store the mouse position without updating CSS variables when unused.
	 *
	 * @param {MouseEvent} event Mouse moving event.
	 */
	static onStopped( event ) {
		MouseTracker.lastEvent = event;
	}

	/**
	 * Update the mouse position.
	 *
	 * @param {MouseEvent} event Mouse moving event.
	 */
	static onStarted( event ) {
		document.documentElement.style.setProperty( css.leftVar, `${event.clientX}px` );
		document.documentElement.style.setProperty( css.topVar, `${event.clientY}px` );
	}

	/**
	 * Start tracking the mouse position.
	 */
	start() {
		if ( MouseTracker.started.size === 0 ) {
			if ( MouseTracker.lastEvent !== null ) {
				MouseTracker.onStarted( MouseTracker.lastEvent );
			}
			document.addEventListener( 'mousemove', MouseTracker.onStarted );
		}
		MouseTracker.started.add( this );
	}

	/**
	 * Stop tracking the mouse position.
	 */
	stop() {
		MouseTracker.started.delete( this );
		if ( MouseTracker.started.size === 0 ) {
			document.removeEventListener( 'mousemove', MouseTracker.onStarted );
		}
	}
}

/**
 * Running trackers.
 *
 * @type {Set<MouseTracker>}
 */
MouseTracker.started = new Set();

/**
 * The last received mouse event.
 *
 * @type {MouseEvent?}
 */
MouseTracker.lastEvent = null;

document.addEventListener( 'mousemove', MouseTracker.onStopped );

module.exports = MouseTracker;

} )();
// </nowiki>
