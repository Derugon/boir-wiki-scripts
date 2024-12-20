declare namespace ContentFilter {
	interface Map {
		view: View;
	}

	interface View extends Core {
		parseView( index: number ): void;
	}
}
