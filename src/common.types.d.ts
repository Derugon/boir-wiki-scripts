declare function safeAddContentHook( ...callbacks: ( ( $e: JQuery ) => void )[] ): void;
declare function hookFiredOnce( hook: string ): mw.Api.PromiseBase<mw.Api.ArgTuple, never, never>;

declare function queryElementsByClassName( classNames: string, container?: Document | HTMLElement ): HTMLElement[];
declare function queryElementsByClassName( classNames: string, container: Element ): Element[];
declare function queryElementsByTagName<K extends keyof HTMLElementTagNameMap>( qualifiedName: K, container?: Document | Element ): HTMLElementTagNameMap[K][];
declare function queryElementsByTagName( qualifiedName: string, container?: Document | HTMLElement ): HTMLElement[];
declare function queryElementsByTagName( qualifiedName: string, container: Element ): Element[];
