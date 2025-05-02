// To include if we know we are always managing HTML documents.

declare interface Document {
	readonly firstElementChild: HTMLElement | null;
	readonly lastElementChild: HTMLElement | null;
	getElementsByClassName(classNames: string): HTMLCollectionOf<HTMLElement>;
	getElementsByTagName<K extends keyof HTMLElementTagNameMap>(qualifiedName: K): HTMLCollectionOf<HTMLElementTagNameMap[K]>;
	getElementsByTagName(qualifiedName: string): HTMLCollectionOf<HTMLElement>;
	getElementsByTagNameNS(namespace: string | null, localName: string): HTMLCollectionOf<HTMLElement>;
	querySelector<K extends keyof HTMLElementTagNameMap>(selectors: K): HTMLElementTagNameMap[K] | null;
	querySelector<E extends HTMLElement = HTMLElement>(selectors: string): E | null;
	querySelectorAll<K extends keyof HTMLElementTagNameMap>(selectors: K): NodeListOf<HTMLElementTagNameMap[K]>;
	querySelectorAll<E extends HTMLElement = HTMLElement>(selectors: string): NodeListOf<E>;
}
