declare function safeAddContentHook( ...callbacks: ( ( $e: JQuery ) => void )[] ): void;
declare function hookFiredOnce( hook: string ): mw.Api.PromiseBase<mw.Api.ArgTuple, never, never>;

declare function queryElementsByClassName( classNames: string, container?: Document | HTMLElement ): HTMLElement[];
declare function queryElementsByClassName( classNames: string, container: Element ): Element[];
