interface T {
	a: boolean;
	[k: string]: boolean;
}

const t = { a: true } as T;

type X = Record<string, boolean>;

const api = new mw.Api();

api.get( t )