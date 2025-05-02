/* Any JavaScript here will be loaded for all users on every page load. */

// <nowiki>

/* DRUID */
$(function () {
  $(".druid-title-tab").off("click")
    .on('click', function () {
      var $parent = $(this).closest(".druid-container");
      $parent.find(".druid-toggleable").removeClass("focused");
      var i = $(this).attr("data-druid");
      $parent.find(".druid-toggleable[data-druid=" + i + "]").addClass("focused");
  });
    
  $(".druid-section-tab").off("click")
    .on('click', function () {
      var $parent = $(this).closest(".druid-section-container");
      $parent.find(".druid-toggleable").removeClass("focused");
      var i = $(this).attr("data-druid");
      $parent.find(".druid-toggleable[data-druid=" + i + "]").addClass("focused");
  });

  $(".druid-collapsible").off("click")
    .on('click', function () {
      var kind = $(this).attr("data-druid-section");
      $(this).toggleClass("druid-collapsible-collapsed");
      $(this)
        .closest(".druid-container")
        .find("[data-druid-section-row=" + kind + "]")
        .toggleClass("druid-collapsed");
  });
});
/* End DRUID */

/* [[Template:Spoiler]] */
$(function () {
	$('.spoiler-content')
	.off('click') // in case this code is loaded twice
	.on('click', function(e){
		$(this).toggleClass('show');
	}).find('a').on('click', function(e){
		e.stopPropagation();
	});

});
/* End Template:Spoiler */


/* Link to imported modules from Lua code */
$(function() {
    var config = mw.config.get([
        'wgCanonicalNamespace',
        'wgFormattedNamespaces'
    ]);
    if (config.wgCanonicalNamespace !== 'Module') {
        return;
    }
    var localizedNamespace = config.wgFormattedNamespaces[828];
    $('.s1, .s2, .s').each(function() {
        var $this = $(this);
        var html = $this.html();
        var quote = html[0];
        var isLongStringQuote = quote === '[';
        var quoteRE = new RegExp('^\\' + quote + '|\\' + quote + '$', 'g');
        if (isLongStringQuote) {
            quoteRE = /^\[\[|\]\]$/g;
        }
        var name = html.replace(quoteRE, '');
        var isEnglishPrefix = name.startsWith('Module:');
        var isLocalizedPrefix = name.startsWith(localizedNamespace + ':');
        var isDevPrefix = name.startsWith('Dev:');
        if (isEnglishPrefix || isLocalizedPrefix || isDevPrefix) {
            var attrs = {
                href: mw.util.getUrl(name)
            };
            if (isDevPrefix) {
                attrs.href = 'https://commons.wiki.gg/wiki/Module:' + mw.util.wikiUrlencode(name.replace('Dev:', ''));
                attrs.target = '_blank';
                attrs.rel = 'noopener';
            }
            var link = mw.html.element('a', attrs, name);
            var str = quote + link + quote;
            if (isLongStringQuote) {
                str = '[[' + link + ']]';
            }
            $this.html(str);
        }
    });
});


/* CharInserts */

$(function() {
	$('.mw-charinsert-item').each(function() {
		$(this).text($(this).closest('div').attr('data-ci-label'));
		$(this).css('display', 'inline-block');
	});
	$('.ci-loading-text').css('display','none');
});


// [START: module]
( ( $, mw ) => {

	/********************
	/* queryElementsBy_ *
	/********************/

	// Clearer (and faster) alternative to querySelectorAll.

	// @ts-ignore
	window.queryElementsByClassName = ( classNames, root ) =>
		Array.from( ( root || document ).getElementsByClassName( classNames ) );
	// @ts-ignore
	window.queryElementsByTagName = ( qualifiedName, root ) =>
		Array.from( ( root || document ).getElementsByTagName( qualifiedName ) );

	/**********************
	/* safeAddContentHook *
	/**********************/

	// Alternative to "mw.hook( 'wikipage.content' ).add()"
	// that fires with all previously given event data.

	const contentHook     = mw.hook( 'wikipage.content' );
	/** @type {JQuery[]} */
	const contentMemories = [];
	contentHook.add( ( $element ) => {
		if ( !contentMemories.includes( $element ) ) {
			contentMemories.push( $element );
		}
	} );
	window.safeAddContentHook = ( ...args ) => {
		for ( let j = 0; j < contentMemories.length - 1; ) {
			const contentMemory = contentMemories[ j ];
			if ( document.contains( contentMemory[ 0 ] ) ) {
				for ( const arg of args ) {
					arg( contentMemory );
				}
				j++;
			} else {
				contentMemories.splice( j, 1 );
			}
		}
		contentHook.add.apply( contentHook, args );
	};

	/*****************
	/* hookFiredOnce *
	/*****************/

	// Alternative to "mw.hook( ... ).add()" that acts as a promise
	// and removes the callback once the hook has been fired once.

	window.hookFiredOnce = ( name ) => {
		const deferred = $.Deferred();
		const callback = ( ...args ) => {
			mw.hook( name ).remove( callback );
			deferred.resolve( ...args );
		};
		mw.hook( name ).add( callback );
		return deferred.promise();
	};

// [START: DOM ready]
$( () => {

	// HTML attribute removal
	$( '.notitle a' ).removeAttr( 'title' );
	$( 'img.no-alt' ).removeAttr( 'alt' );

	// Annotate empty TemplateData tables.
    for ( const table of queryElementsByClassName( 'mw-templatedata-doc-params' ) ) {
        for ( const e of queryElementsByClassName( 'mw-templatedata-doc-muted', table ) ) {
            if ( e.textContent === 'No parameters specified' ) {
                table.classList.add( 'mw-templatedata-doc-params-empty' );
                break;
            }
        }
    }

	// Negative
    
    $("[data-image-name='Collectible Teleport! icon.png'").addClass("teleportation")
    $(".teleportation").click(function(){
	    location.href = "https://bindingofisaacrebirth.fandom.com/fr/wiki/Spécial:Random";
	})

} );
// [END: DOM ready]

} )( jQuery, mediaWiki );
// [END: module]

// </nowiki>
