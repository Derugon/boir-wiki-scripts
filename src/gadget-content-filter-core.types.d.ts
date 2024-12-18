declare var cf: ContentFilter;
declare var contentFilter: ContentFilter;

type ContentFilter = undefined | ContentFilter.Map[keyof ContentFilter.Map];

declare namespace ContentFilter {
    interface Map {
        "core": Core;
    }

    interface Core {
        // core
        filterMax: number;
        isFilteringAvailable( pageTitle: mw.Title ): boolean;
        parseView( index: number ): void;
    }
}
