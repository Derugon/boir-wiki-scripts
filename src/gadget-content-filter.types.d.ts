declare namespace ContentFilter {
    interface Map {
        "base": Base;
    }

    interface Base extends Core {
        paramValue: number | null;
        buttons: HTMLLIElement[]
    }
}
