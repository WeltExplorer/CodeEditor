( function ($, mw) {
	'use strict';

	// Initial diagnostic logs (can be removed or reduced once stable)
	console.log('[CodeEditor] At the start of monaco-init.js execution (version using $.getScript):');
	console.log('[CodeEditor] typeof window.require at this point:', typeof window.require);
	console.log('[CodeEditor] typeof local `require` in IIFE:', typeof require);

	window.initializeMonacoEditor = function ( textAreaId, language, options ) {
		// monaco-loader-shim.js should have already run via ResourceLoader and defined window.global if necessary.

		const vsBasePath = mw.config.get( 'wgExtensionAssetsPath' ) + '/CodeEditor/modules/lib/monaco/min/vs';
		const loaderJsPath = vsBasePath + '/loader.js';

		console.log('[CodeEditor] Attempting to load ' + loaderJsPath + ' via $.getScript()');

		$.getScript( loaderJsPath )
			.done(function( script, textStatus ) {
				console.log('[CodeEditor] Successfully loaded ' + loaderJsPath + ' via $.getScript(). Status: ' + textStatus);

				if (typeof window.require !== 'function' || typeof window.require.config !== 'function') {
					console.error(
						'[CodeEditor] Monaco AMD loader (window.require or window.require.config) is STILL not found or not a function ' +
						'even after loading ' + loaderJsPath + ' via $.getScript().'
					);
					if (typeof window.require !== 'undefined') {
						console.log('[CodeEditor] Post-$.getScript window.require type:', typeof window.require, 'toString:', String(window.require));
					} else {
						console.log('[CodeEditor] Post-$.getScript window.require is undefined.');
					}
					var editorElementOnError = document.getElementById( textAreaId );
					if (editorElementOnError) $(editorElementOnError).show();
					mw.notify('Failed to initialize Monaco editor: AMD loader missing after $.getScript.', {type: 'error'});
					return;
				}

				console.log('[CodeEditor] Monaco AMD loader (window.require) found. Proceeding with config.');
				window.require.config( {
					paths: {
						vs: vsBasePath
					},
					// Optional: For certain environments, might need to specify how NLS files are handled.
					// 'vs/nls': { availableLanguages: {'*': 'en'} } // or specific languages
				} );

				window.require( [ 'vs/editor/editor.main' ], function () {
					if (typeof window.monaco === 'undefined') {
						console.error('[CodeEditor] window.monaco is not defined after requiring vs/editor/editor.main.');
						var editorElementOnError = document.getElementById( textAreaId );
						if (editorElementOnError) $(editorElementOnError).show();
						var $containerOnError = $(editorElementOnError).data('monacoEditorContainer');
						if ($containerOnError) {
							$($containerOnError).remove();
							$(editorElementOnError).removeData('monacoEditorContainer').removeData('monacoEditor');
						}
						mw.notify('Failed to load Monaco editor components (window.monaco undefined).', {type: 'error'});
						return;
					}

					console.log('[CodeEditor] window.monaco is defined. Creating editor for ' + textAreaId);
					var editorElement = document.getElementById( textAreaId );
					if ( !editorElement ) {
						console.error( '[CodeEditor] Textarea element not found after Monaco load:', textAreaId );
						return;
					}

					var $editorElement = $(editorElement);
					var editorContainer = document.createElement('div');

					var taHeight = $editorElement.height();
					var taWidth = $editorElement.width();
					editorContainer.style.height = (taHeight && taHeight > 0 ? taHeight : 400) + 'px';
					editorContainer.style.width = (taWidth && taWidth > 0 ? taWidth : '100%') + 'px';
					if (taWidth === 0 && editorContainer.style.width === '0px') {
						editorContainer.style.width = '100%';
					}

					editorElement.parentNode.insertBefore(editorContainer, editorElement);
					$editorElement.hide();

					var editorOptions = $.extend( {
						value: $editorElement.val(),
						language: language || 'javascript',
						theme: 'vs',
						automaticLayout: true
					}, options );

					var editor = window.monaco.editor.create( editorContainer, editorOptions );

					editor.getModel().onDidChangeContent( function () {
						$editorElement.val( editor.getValue() );
						$editorElement.trigger('change');
					} );

					$editorElement.data( 'monacoEditor', editor );
					$editorElement.data( 'monacoEditorContainer', editorContainer );
					console.log('[CodeEditor] Monaco editor initialized successfully for ' + textAreaId);

				}, function(error) {
					console.error('[CodeEditor] Error requiring vs/editor/editor.main:', error);
					var editorElementOnError = document.getElementById( textAreaId );
					if (editorElementOnError) {
						$(editorElementOnError).show();
						var $containerOnError = $(editorElementOnError).data('monacoEditorContainer');
						if ($containerOnError) {
							$($containerOnError).remove();
							$(editorElementOnError).removeData('monacoEditorContainer').removeData('monacoEditor');
						}
					}
					mw.notify('Failed to load Monaco editor components. Reverted to plain textarea.', {type: 'error'});
				});
			})
			.fail(function( jqxhr, settings, exception ) {
				console.error('[CodeEditor] Failed to load ' + loaderJsPath + ' via $.getScript(). Exception:', exception, 'jqXHR:', jqxhr);
				var editorElementOnError = document.getElementById( textAreaId );
				if (editorElementOnError) $(editorElementOnError).show();
				mw.notify('Failed to load Monaco editor loader script ($.getScript failed). Reverted to plain textarea.', {type: 'error'});
			});
	};

}( jQuery, mediaWiki ) );
