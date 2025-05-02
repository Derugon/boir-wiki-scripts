declare namespace ContentFilter {
	type SiblingSearchResult = SiblingSearchResult.Found | SiblingSearchResult.NotFound;

	namespace SiblingSearchResult {
		interface Found {
			sibling: Node;
		}

		interface NotFound {
			sibling: null;
			parent: HTMLElement | null;
		}
	}
}

declare namespace mw {
	function hook( name: 'contentFilter.content.beforeRegistered' ): Hook<[ content: HTMLElement, container: HTMLElement | null ]>;
	function hook( name: 'contentFilter.content.registered' ): Hook<[ content: HTMLElement, container: HTMLElement | null ]>;
	function hook( name: 'contentFilter.content.pageFilter' ): Hook<[ pageFilter: number ]>;
	function hook( name: 'contentFilter.tag.contextInferred' ): Hook<[ tag: HTMLElement ]>;
}
