/**
 * MediaWiki:Gadget-codeeditor.js
 * (c) 2011 Brion Vibber <brion @ pobox.com>
 * GPLv2 or later
 *
 * Syntax highlighting code editor based on Monaco Editor.
 */

( function () {
	'use strict';

	$( function () {
		var map = mw.config.get( 'wgCodeEditorCurrentLanguage' );
		if ( map ) {
			// Add the module and initialize the editor.
			mw.loader.using( 'jquery.codeEditor' ).then( function () {
				// Initialize the editor after the text area has been created by WikiEditor.
				// eslint-disable-next-line no-jquery/no-global-selector
				$( '#wpTextbox1' ).wikiEditor(
					'addModule', 'codeEditor'
				);
			} );
		}
	} );

}() );
