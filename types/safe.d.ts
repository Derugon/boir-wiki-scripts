// Utility stuff, for less "any" types and more type narrowing in the standard library.

declare interface Array<T> {
	every<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S): this is S[];
	every(predicate: (value: T, index: number, array: T[]) => unknown): boolean;
	every<S extends T, This>(predicate: (this: This, value: T, index: number, array: T[]) => value is S, thisArg: This): this is S[];
	every<This>(predicate: (this: This, value: T, index: number, array: T[]) => unknown, thisArg: This): boolean;
	some(predicate: (value: T, index: number, array: T[]) => unknown): boolean;
	some<This>(predicate: (this: This, value: T, index: number, array: T[]) => unknown, thisArg: This): boolean;
	forEach(callbackfn: (value: T, index: number, array: T[]) => void): void;
	forEach<This>(callbackfn: (this: This, value: T, index: number, array: T[]) => void, thisArg: This): void;
	map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[];
	map<U, This>(callbackfn: (this: This, value: T, index: number, array: T[]) => U, thisArg: This): U[];
	filter<S extends T>(predicate: (value: T, index: number, array: T[]) => value is S): S[];
	filter<S extends T, This>(predicate: (this: This, value: T, index: number, array: T[]) => value is S, thisArg: This): S[];
	filter(predicate: (value: T, index: number, array: T[]) => unknown): T[];
	filter<This>(predicate: (this: This, value: T, index: number, array: T[]) => unknown, thisArg: This): T[];
}

declare interface HTMLElement {
    readonly children: HTMLCollectionOf<HTMLElement>;
	readonly nextElementSibling: HTMLElement | null;
	readonly previousElementSibling: HTMLElement | null;
	readonly firstElementChild: HTMLElement | null;
	readonly lastElementChild: HTMLElement | null;
	closest<K extends keyof HTMLElementTagNameMap>(selector: K): HTMLElementTagNameMap[K] | null;
	closest<E extends HTMLElement = HTMLElement>(selectors: string): E | null;
	getElementsByClassName(classNames: string): HTMLCollectionOf<HTMLElement>;
	getElementsByTagName<K extends keyof HTMLElementTagNameMap>(qualifiedName: K): HTMLCollectionOf<HTMLElementTagNameMap[K]>;
	getElementsByTagName(qualifiedName: string): HTMLCollectionOf<HTMLElement>;
	insertAdjacentElement<T extends HTMLElement>(where: InsertPosition, element: T): T | null;
	querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
	querySelector<E extends HTMLElement = HTMLElement>(selectors: string): E | null;
	querySelectorAll<K extends keyof HTMLElementTagNameMap>(selectors: K): NodeListOf<HTMLElementTagNameMap[K]>;
	querySelectorAll<E extends HTMLElement = HTMLElement>(selectors: string): NodeListOf<E>;
}
