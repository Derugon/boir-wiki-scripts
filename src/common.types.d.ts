declare function safeAddContentHook( ...callbacks: ( ( $e: JQuery ) => void )[] ): void;
declare function hookFiredOnce( hook: string ): JQuery.Promise<void, never, never>;