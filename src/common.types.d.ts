/**
 * An instance of a hook, created via {@link mw.hook mw.hook method}.
 *
 * MediaWiki has various interface components that are extended, enhanced
 * or manipulated in some other way by extensions, gadgets and even
 * in core itself.
 *
 * This framework helps streamlining the timing of when these other
 * code paths fire their plugins (instead of using document-ready,
 * which can and should be limited to firing only once).
 *
 * Features like navigating to other wiki pages, previewing an edit
 * and editing itself – without a refresh – can then retrigger these
 * hooks accordingly to ensure everything still works as expected.
 * See {@link Hook}.
 *
 * Example usage:
 *
 * ```js
 * mw.hook( 'wikipage.content' ).add( fn ).remove( fn );
 * mw.hook( 'wikipage.content' ).fire( $content );
 * ```
 *
 * Handlers can be added and fired for arbitrary event names at any time. The same
 * event can be fired multiple times. The last run of an event is memorized
 * (similar to `$(document).ready` and `$.Deferred().done`).
 * This means if an event is fired, and a handler added afterwards, the added
 * function will be fired right away with the last given event data.
 *
 * Like Deferreds and Promises, the {@link mw.hook} object is both detachable and chainable.
 * Thus allowing flexible use and optimal maintainability and authority control.
 * You can pass around the `add` and/or `fire` method to another piece of code
 * without it having to know the event name (or {@link mw.hook} for that matter).
 *
 * ```js
 * var h = mw.hook( 'bar.ready' );
 * new mw.Foo( .. ).fetch( { callback: h.fire } );
 * ```
 *
 * The function signature for hooks can be considered {@link https://www.mediawiki.org/wiki/Special:MyLanguage/Stable_interface_policy/Frontend stable}.
 *
 * @see https://doc.wikimedia.org/mediawiki-core/master/js/Hook.html
 */
interface Hook<T extends any[] = any[]> {
    /**
     * Register a hook handler.
     *
     * @param {...Function} handler Function to bind.
     * @returns {Hook}
     * @see https://doc.wikimedia.org/mediawiki-core/master/js/Hook.html#.add
     */
    add(...handler: Array<(...data: T) => any>): this;

    /**
     * Call hook handlers with data.
     *
     * @param {...any} data
     * @returns {Hook}
     * @see https://doc.wikimedia.org/mediawiki-core/master/js/Hook.html#.fire
     */
    fire(...data: T): this;

    /**
     * Unregister a hook handler.
     *
     * @param {...Function} handler Function to unbind.
     * @returns {Hook}
     * @see https://doc.wikimedia.org/mediawiki-core/master/js/Hook.html#.remove
     */
    remove(...handler: Array<(...data: T) => any>): this;
}

declare function safeAddContentHook( ...callbacks: ( ( $e: JQuery ) => void )[] ): void;
declare function hookFiredOnce( hook: string ): mw.Api.PromiseBase<mw.Api.ArgTuple, never, never>;

declare function queryElementsByClassName( classNames: string, container?: Document | HTMLElement ): HTMLElement[];
declare function queryElementsByClassName( classNames: string, container: Element ): Element[];
declare function queryElementsByTagName<K extends keyof HTMLElementTagNameMap>( qualifiedName: K, container?: Document | Element ): HTMLElementTagNameMap[K][];
declare function queryElementsByTagName( qualifiedName: string, container?: Document | HTMLElement ): HTMLElement[];
declare function queryElementsByTagName( qualifiedName: string, container: Element ): Element[];
