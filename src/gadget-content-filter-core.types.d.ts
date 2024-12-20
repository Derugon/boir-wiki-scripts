import type { Hook } from "types-mediawiki/mw/hook";

declare global {
	var contentFilter: ContentFilter;
	var cf: ContentFilter;

	type ContentFilter = undefined | ContentFilter.Map[keyof ContentFilter.Map];

	namespace ContentFilter {
		interface Map {
			core: Core;
		}

		interface Core {
			readonly filterMax: number;
			readonly containers: HTMLElement[];
			isFilteringAvailable( pageTitle: mw.Title ): boolean;
			getTags( root?: Document | HTMLElement ): HTMLCollectionOf<HTMLElement>;
			getContainers( root?: Document | HTMLElement ): HTMLCollectionOf<HTMLElement>;
			getFilter( tag: HTMLElement ): number;
			getContext( tag: HTMLElement ): HTMLElement[] | null;
			getPreviousSibling( node: Node ): SiblingSearchResult;
			getNextSibling( node: Node ): SiblingSearchResult;
		}

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

	namespace mw {
		function hook( name: 'contentFilter.content.beforeRegistered' ): Hook<[ content: HTMLElement, container: HTMLElement | null ]>;
		function hook( name: 'contentFilter.content.registered' ): Hook<[ content: HTMLElement, container: HTMLElement | null ]>;
		function hook( name: 'contentFilter.content.pageFilter' ): Hook<[ pageFilter: number ]>;
		function hook( name: 'contentFilter.tag.contextInferred' ): Hook<[ tag: HTMLElement ]>;
	}
}
