declare namespace ContentFilter {
	interface TextDelimiter {
		isEnclosed: boolean;
		closedBy: RegExp;
	}
}

declare namespace mw {
	function hook( name: 'contentFilter.content.beforeRegistered' ): Hook<[ content: HTMLElement, container: HTMLElement | null ]>;
	function hook( name: 'contentFilter.content.registered' ): Hook<[ content: HTMLElement, container: HTMLElement | null ]>;
	function hook( name: 'contentFilter.content.pageFilter' ): Hook<[ pageFilter: number ]>;
	function hook( name: 'contentFilter.tag.contextInferred' ): Hook<[ tag: HTMLElement ]>;
}
