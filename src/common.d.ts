import { Hook } from "types-mediawiki/mw/hook";

declare global {
	function safeAddContentHook( ...callbacks: ( ( $e: JQuery ) => void )[] ): void;

	namespace mw {
		function hook( name: 'contentFilter.content' ): Hook<[ containers: HTMLElement[], pageFilter: number ]>;
		function hook( name: 'contentFilter.filter' ): Hook<[ index: number | null ]>;
		function hook( name: 'contentFilter.loadEnd' ): Hook<[]>;
	}
}
