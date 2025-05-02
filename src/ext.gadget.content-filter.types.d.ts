declare namespace mw {
	function hook( name: 'contentFilter.filter' ): Hook<[ index: number | null ]>;
	function hook( name: 'contentFilter.filter.menuPlaced' ): Hook<[ menu: HTMLElement ]>;
	function hook( name: 'contentFilter.filter.viewUpdated' ): Hook<[]>;
}
