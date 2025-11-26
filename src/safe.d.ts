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

declare interface Node {
    cloneNode(deep?: boolean): this;
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

declare namespace HTMLTableCellElement {
	type ParentElement = HTMLTableRowElement;
}

declare interface HTMLTableCellElement {
	readonly parentElement: HTMLTableCellElement.ParentElement | null;
}

declare namespace HTMLTableRowElement {
	type ParentElement = HTMLTableElement | HTMLTableSectionElement;
	type SiblingElement = HTMLTableRowElement | HTMLTableSectionElement;
	type ChildElement = HTMLScriptElement | HTMLTableCellElement | HTMLTemplateElement;
}

declare interface HTMLTableRowElement {
	readonly parentElement: HTMLTableRowElement.ParentElement | null;
    readonly children: HTMLCollectionOf<HTMLTableRowElement.ChildElement>;
	readonly nextElementSibling: HTMLTableRowElement.SiblingElement | null;
	readonly previousElementSibling: HTMLTableRowElement.SiblingElement | null;
	readonly firstElementChild: HTMLTableRowElement.ChildElement;
	readonly lastElementChild: HTMLTableRowElement.ChildElement;
}

declare interface HTMLTableSectionElement {
	readonly parentElement: HTMLTableElement | null;
}

declare interface HTMLTemplateElement {
	readonly content: HTMLDocumentFragment;
}

declare interface HTMLDocumentFragment extends DocumentFragment {
    getElementById(elementId: string): HTMLElement | null;
}

declare interface DOMTokenList {
    [Symbol.iterator](): Iterator<string>;
}

declare interface NodeList {
    [Symbol.iterator](): Iterator<Node>;
}

declare interface NodeListOf<TNode extends Node> {
    [Symbol.iterator](): Iterator<TNode>;
}
