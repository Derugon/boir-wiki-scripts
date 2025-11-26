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
 * @property {string} [class]
 * @property {string} title
 */

/**
 * @typedef PortletToggle.Value
 * @property {string?} class
 * @property {string} title
 */

/**
 * @param {string} gadget
 * @param {PortletToggleConfig} config
 * @param {PortletToggleConfig.Value[]} values
 */
const PortletToggle = function ( gadget, config, values ) {
	this.gadget = gadget;
	this.class = config.class || null;
	this.title = config.title;
	/** @type {PortletToggle.Value[]} */
	this.values = [];
	for ( const value of values ) {
		this.values.push( {
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
	this.item.appendChild( this.span );
	this.item.addEventListener( 'click', this.toggle.bind( this ) );

	this.updateState();

	PortletToggle.insertItem( this.item );
	mw.util.showPortlet( 'p-personal' );
};

/**
 * @param {HTMLLIElement} item
 */
PortletToggle.insertItem = ( item ) => {
	const portlet = document.getElementById( 'p-personal' );
	if ( portlet === null ) {
		return;
	}

	let ul = portlet.getElementsByTagName( 'ul' )[ 0 ];
	if ( ul === undefined ) {
		ul = document.createElement( 'ul' );
		portlet.appendChild( ul );
	}

	let leftAnchorFound = false;
	for ( let childItem = ul.firstElementChild; childItem !== null; childItem = childItem.nextElementSibling ) {
		if ( [ 'pt-editrecovery', 'pt-themes' ].includes( childItem.id ) ) {
			leftAnchorFound = true;
		} else if ( [ 'pt-preferences', 'pt-createaccount' ].includes( childItem.id ) || leftAnchorFound ) {
			childItem.insertAdjacentElement( 'beforebegin', item );
			return;
		}
	}

	ul.prepend( item );
};

PortletToggle.prototype = {
	constructor: PortletToggle,

	get() {
		return mw.user.options.get( `gadget-${this.gadget}` ) || 0;
	},

	updateState() {
		const value = this.values[ this.get() ];
		this.span.textContent = `Current ${this.title} is "${value.title}"`;
		this.span.title = `Current ${this.title} is "${value.title}". Tap to switch.`;
		if ( this.class !== null && value.class !== null ) {
			document.documentElement.classList.add( `${this.class}-${value.class}` );
		}
	},

	/**
	 * @param {number} i
	 */
	set( i ) {
		const oldValue = this.values[ this.get() ];
		if ( this.class !== null && oldValue.class !== null ) {
			document.documentElement.classList.remove( `${this.class}-${oldValue.class}` );
		}

		mw.user.options.set( `gadget-${this.gadget}`, i );
		const promise = Promise.all( [
			api.saveOption( `gadget-${this.gadget}`, `${i}` ),
			mw.loader.using( `ext.gadget.${this.gadget}` )
		] );

		this.updateState();
		return promise;
	},

	toggle() {
		const nextI = this.get() + 1;
		if ( nextI < this.values.length ) {
			return this.set( nextI );
		} else {
			return this.set( 0 );
		}
	}
};

module.exports = PortletToggle;

} ) )( mediaWiki );
// </nowiki>
