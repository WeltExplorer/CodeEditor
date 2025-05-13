( function ($, mw) {
	'use strict';

	window.initializeMonacoEditor = function ( textAreaId, language, options ) {
		const vsBasePath = mw.config.get( 'wgExtensionAssetsPath' ) + '/CodeEditor/modules/lib/monaco/min/vs';
		const loaderJsPath = vsBasePath + '/loader.js';

		$.getScript( loaderJsPath )
			.done(function() {
				if (typeof window.require !== 'function' || typeof window.require.config !== 'function') {
					mw.notify('Failed to initialize Monaco editor: AMD loader missing.', {type: 'error'});
					return;
				}

				window.require.config({
					paths: { vs: vsBasePath }
				});

				window.require(['vs/editor/editor.main'], function () {
					if (typeof window.monaco === 'undefined') {
						mw.notify('Failed to load Monaco editor components.', {type: 'error'});
						return;
					}

					var editorElement = document.getElementById(textAreaId);
					if (!editorElement) {
						console.error('Textarea element not found:', textAreaId);
						return;
					}

					var $editorElement = $(editorElement);
					var editorContainer = document.createElement('div');

					var taHeight = $editorElement.height();
					var taWidth = $editorElement.width();
					editorContainer.style.height = (taHeight && taHeight > 0 ? taHeight : 400) + 'px';
					editorContainer.style.width = (taWidth && taWidth > 0 ? taWidth : '100%') + 'px';

					editorElement.parentNode.insertBefore(editorContainer, editorElement);
					$editorElement.hide();

					var editorOptions = $.extend({
						value: $editorElement.val(),
						language: language || 'javascript',
						theme: 'vs',
						automaticLayout: true
					}, options);

					var editor = window.monaco.editor.create(editorContainer, editorOptions);

					editor.getModel().onDidChangeContent(function () {
						$editorElement.val(editor.getValue());
						$editorElement.trigger('change');
					});

					$editorElement.data('monacoEditor', editor);
					$editorElement.data('monacoEditorContainer', editorContainer);
				}, function() {
					mw.notify('Failed to load Monaco editor components. Reverted to plain textarea.', {type: 'error'});
				});
			})
			.fail(function() {
				mw.notify('Failed to load Monaco editor loader script. Reverted to plain textarea.', {type: 'error'});
			});
	};

}( jQuery, mediaWiki ));
