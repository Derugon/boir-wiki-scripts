/**
 * Name:        Portlet toggle
 * Description: TODO
 *
 * Module:      ext.gadget.portlet-toggle
 */

// <nowiki>
( ( mw ) => mw.loader.using( 'mediawiki.api', () => {

const api = new mw.Api();

/**
 * @typedef PortletToggleConfig
 * @property {string} [id]
 * @property {string} [class]
 * @property {string} title
 */

/**
 * @typedef PortletToggleConfig.Value
 * @property {string} [gadget]
 * @property {string} [class]
 * @property {string} title
 */

/**
 * @typedef PortletToggle.Value
 * @property {string?} gadget
 * @property {string?} class
 * @property {string} title
 */

class PortletToggle {
	/**
	 * @param {PortletToggleConfig} config
	 * @param {PortletToggleConfig.Value[]} values
	 */
	constructor( config, values ) {
		this.class = config.class || null;
		this.title = config.title;
		/** @type {PortletToggle.Value[]} */
		this.values = [];
		for ( const value of values ) {
			this.values.push( {
				gadget: value.gadget || null,
				class: value.class || null,
				title: value.title
			} );
		}

		this.span = document.createElement( 'span' );

		this.item = document.createElement( 'li' );
		if ( config.id !== undefined ) {
			this.item.id = config.id;
		}
		this.item.classList.add( 'mw-list-item', 'mw-list-item-js', 'tb-portlet-personal-toggle' );
		this.item.append( this.span );
		this.item.addEventListener( 'click', this.toggle.bind( this ) );

		this.updateState();

		PortletToggle.insertItem( this.item );
		mw.util.showPortlet( 'p-personal' );
	}

	/**
	 * @param {HTMLLIElement} item
	 */
	static insertItem( item ) {
		const portlet = document.getElementById( 'p-personal' );
		if ( portlet === null ) {
			return;
		}

		let ul = portlet.getElementsByTagName( 'ul' )[ 0 ];
		if ( ul === undefined ) {
			ul = document.createElement( 'ul' );
			portlet.append( ul );
		}

		let leftAnchorFound = false;
		for ( let childItem = ul.firstElementChild; childItem !== null; childItem = childItem.nextElementSibling ) {
			if ( [ 'pt-editrecovery', 'pt-themes' ].includes( childItem.id ) ) {
				leftAnchorFound = true;
			} else if ( [ 'pt-preferences', 'pt-createaccount' ].includes( childItem.id ) || leftAnchorFound ) {
				childItem.before( item );
				return;
			}
		}

		ul.prepend( item );
	}

	get() {
		let defaultValue = null;
		for ( let i = 0; i < this.values.length; ++i ) {
			const value = this.values[ i ];
			if ( value.gadget !== null ) {
				const gadgetValue = mw.user.options.get( `gadget-${value.gadget}` );
				if ( gadgetValue ) {
					return i;
				}
			} else if ( defaultValue === null ) {
				defaultValue = i;
			}
		}
		return defaultValue || 0;
	}

	updateState() {
		const value = this.values[ this.get() ];
		this.span.textContent = `Current ${this.title} is "${value.title}"`;
		this.span.title = `Current ${this.title} is "${value.title}". Tap to switch.`;
		if ( this.class !== null && value.class !== null ) {
			document.documentElement.classList.add( `${this.class}-${value.class}` );
		}
	}

	/**
	 * @param {number} i
	 */
	set( i ) {
		const oldValue = this.values[ this.get() ];
		const value = this.values[ i ];

		if ( this.class !== null && oldValue.class !== null ) {
			document.documentElement.classList.remove( `${this.class}-${oldValue.class}` );
		}

		/** @type {Record<string, boolean>} */
		const gadgetsToSet = {};
		if ( oldValue.gadget !== null ) {
			gadgetsToSet[ oldValue.gadget ] = false;
		}
		if ( value.gadget !== null ) {
			gadgetsToSet[ value.gadget ] = true;
		}

		/** @type {Record<string, 0 | 1>} */
		const userOptions = {};
		/** @type {Record<string, '0' | '1'>} */
		const savedOptions = {};
		/** @type {string[]} */
		const dependencies = [];
		for ( const [ gadget, enable ] of Object.entries( gadgetsToSet ) ) {
			if ( enable ) {
				userOptions[ `gadget-${gadget}` ] = 1;
				savedOptions[ `gadget-${gadget}` ] = '1';
				dependencies.push( `ext.gadget.${gadget}` );
			} else {
				userOptions[ `gadget-${gadget}` ] = 0;
				savedOptions[ `gadget-${gadget}` ] = '0';
			}
		}

		mw.user.options.set( userOptions );
		const promises = [ api.saveOptions( savedOptions ), mw.loader.using( dependencies ) ];

		this.updateState();
		return Promise.all( promises );
	}

	toggle() {
		const nextI = this.get() + 1;
		if ( nextI < this.values.length ) {
			return this.set( nextI );
		} else {
			return this.set( 0 );
		}
	}
}

module.exports = PortletToggle;

} ) )( mediaWiki );
// </nowiki>
