import type { ApiResponse as MwApiResponse } from "types-mediawiki/mw/Api";
import type { Hook } from "types-mediawiki/mw/hook";
import type { QueryParams as MwQueryParams } from "types-mediawiki/mw/Uri";

declare global {
	namespace InterwikiMapping {
		interface Mapping {
			local: mw.Title;
			foreign: string | number;
		}

		interface Data {
			mappings: Record<string, Data.Mapping>;
			pages: Record<string, Data.Page>;
			revisions: Record<number, Data.Revision>;
			callbacks: Record<string, [HTMLElement, Data.Callback][]>;
		}

		namespace Data {
			interface Mapping {
				localTitle: mw.Title;
				foreignPage?: Page;
				foreignRevision?: Revision;
			}

			interface Page {
				title: string;
				lastRevision: Revision;
			}

			interface Revision {
				page: Page;
				id: number;
				size: number;
			}

			interface Callback<T extends HTMLElement = HTMLElement> {
				( element: T, mapping: InterwikiMapping.Data.Mapping ): void;
			}
		}

		interface QueryParams extends MwQueryParams {
			title?: string;
			action?: 'view' | 'edit';
		}

		interface ApiResponse extends MwApiResponse {
			query: Response.Query;
		}

		namespace Response {
			interface Query {
				pages: Record<string, Query.Page>;
			}

			namespace Query {
				interface Page {
					pageid: number;
					ns: number;
					title: string;
					contentmodel: string;
					pagelanguage: string;
					pagelanguagehtmlcode: string;
					pagelanguagedir: string;
					touched: string;
					lastrevid: number;
					length: number;
					revisions: Page.Revision[];
				}

				namespace Page {
					interface Revision {
						revid: number;
						parentid: number;
						size: number;
					}
				}
			}
		}
	}
}
