interface Array<T> {
	every<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): this is S[];
	every(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
	some(predicate: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean;
	forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
	forEach<This>(callbackfn: (this: This, value: T, index: number, array: T[]) => void, thisArg: This): void;
	map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
	map<U, This>(callbackfn: (this: This, value: T, index: number, array: T[]) => U, thisArg: This): U[];
	filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
	filter<This = never>(predicate: (this: This, value: T, index: number, array: T[]) => unknown, thisArg?: This): T[];
}

interface HTMLElement {
	readonly children: HTMLCollectionOf<HTMLElement>;
	readonly nextElementSibling: HTMLElement | null;
	readonly previousElementSibling: HTMLElement | null;
	getElementsByClassName(classNames: string): HTMLCollectionOf<HTMLElement>;
}

interface Document {
	getElementsByClassName(classNames: string): HTMLCollectionOf<HTMLElement>;
}
