/**
 * Monaco Editor initialization script for MediaWiki CodeEditor extension.
 */
( function () {
	// Store reference to monaco for use in other components
	window.monaco = window.monaco || {};
	
	// This file expects that loader.js (monaco's AMD loader) is loaded before this script
	
	// Configure the AMD module loader to load Monaco from the extensions path
	require.config( {
		paths: {
			'vs': mw.config.get( 'wgExtensionAssetsPath' ) + '/CodeEditor/modules/lib/monaco/min/vs'
		}
	} );

	// Define language mappings
	var languageMap = {
		'javascript': 'javascript',
		'json': 'json',
		'css': 'css',
		'lua': 'lua', // for Scribunto
		'php': 'php',
		'html': 'html',
		'xml': 'xml',
		'csharp': 'csharp',
		'java': 'java',
		'python': 'python',
		'ruby': 'ruby',
		'go': 'go',
		'typescript': 'typescript'
	};

	// Define theme mappings
	var themeMap = {
		'light': 'vs',
		'dark': 'vs-dark',
		'high-contrast': 'hc-black'
	};

	/**
	 * Initialize Monaco editor with given options
	 * @param {Element} container - DOM element to mount the editor
	 * @param {Object} options - Configuration options
	 * @return {Promise} Promise that resolves to monaco editor instance
	 */
	window.monaco.init = function ( container, options ) {
		options = options || {};
		var language = options.language || 'text';
		var theme = options.theme || 'light';
		var value = options.value || '';
		
		return new Promise( function ( resolve, reject ) {
			require( ['vs/editor/editor.main'], function () {
				// Create the editor
				var editor = monaco.editor.create( container, {
					value: value,
					language: languageMap[ language ] || language,
					theme: themeMap[ theme ] || 'vs',
					lineNumbers: 'on',
					scrollBeyondLastLine: false,
					minimap: { enabled: false },
					automaticLayout: true,
					folding: true,
					renderWhitespace: options.showInvisibles ? 'all' : 'none',
					wordWrap: options.wordWrap ? 'on' : 'off',
					readOnly: options.readOnly || false
				} );
				
				// Set up resize handler
				window.addEventListener( 'resize', function () {
					editor.layout();
				} );
				
				resolve( editor );
			} );
		} );
	};
} )();