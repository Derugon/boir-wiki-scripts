import type { Hook } from "types-mediawiki/mw/hook";

declare global {
	namespace ContentFilter {
		interface Map {
			filter: Filter;
		}

		interface Filter extends View {
			readonly paramValue: number | null;
			readonly buttons: HTMLElement[]
		}
	}

	namespace mw {
		function hook( name: 'contentFilter.filter' ): Hook<[ index: number | null ]>;
		function hook( name: 'contentFilter.filter.menuPlaced' ): Hook<[ menu: HTMLElement ]>;
		function hook( name: 'contentFilter.filter.viewUpdated' ): Hook<[]>;
	}
}
