/* Monaco syntax-highlighting code editor extension for wikiEditor */
/* global monaco, initializeMonacoEditor */
/* eslint-disable no-jquery/no-global-selector */
( function () {
	$.wikiEditor.modules.codeEditor = {
		/**
		 * Core Requirements
		 */
		req: [ 'codeEditor' ],
		/**
		 * Configuration
		 */
		cfg: {
			// Removed Ace-specific configurations
		},
		/**
		 * API accessible functions
		 */
		api: {
			//
		},
		/**
		 * Event handlers
		 */
		evt: {
			//
		},
		/**
		 * Internally used functions
		 */
		fn: {
		}

	};

	$.wikiEditor.extensions.codeEditor = function ( context ) {
		let hasErrorsOnSave = false,
			selectedLine = 0;
		const returnFalse = function () {
				return false;
			},
			api = new mw.Api();

		// Initialize state
		let cookieEnabled = parseInt( mw.cookie.get( 'codeEditor-' + context.instance + '-showInvisibleChars' ), 10 );
		context.showInvisibleChars = ( cookieEnabled === 1 );
		cookieEnabled = parseInt( mw.cookie.get( 'codeEditor-' + context.instance + '-lineWrappingActive' ), 10 );
		context.lineWrappingActive = ( cookieEnabled === 1 );

		/*
		 * Event Handlers
		 *
		 * WikiEditor inspects the 'evt' object for event names and uses them if present as additional
		 * event handlers that fire before the default handling.
		 * To prevent WikiEditor from running its own handling, handlers should return false.
		 *
		 * This is also where we can attach some extra information to the events.
		 */
		context.evt = Object.assign( context.evt, {
			keydown: returnFalse,
			change: returnFalse,
			delayedChange: returnFalse,
			cut: returnFalse,
			paste: returnFalse,
			ready: returnFalse,
			codeEditorSubmit: function () {
				const form = this;
				context.evt.codeEditorSync();
				if ( hasErrorsOnSave ) {
					hasErrorsOnSave = false;
					OO.ui.confirm( mw.msg( 'codeeditor-save-with-errors' ) ).then( ( confirmed ) => {
						if ( confirmed ) {
							// Programmatic submit doesn't retrigger this event listener
							form.submit();
						}
					} );
					return false;
				}
				return true;
			},
			codeEditorSave: function () {
				// Check for errors in the Monaco editor model
				hasErrorsOnSave = false; // Reset
				if ( context.codeEditor && context.codeEditor.getModel && monaco && monaco.editor && monaco.MarkerSeverity ) {
					var model = context.codeEditor.getModel();
					if (model) {
						// Get markers for the specific model URI
						var markers = monaco.editor.getModelMarkers({ resource: model.uri });
						if ( markers.some( function(marker) { return marker.severity === monaco.MarkerSeverity.Error; } ) ) {
							hasErrorsOnSave = true;
						}
					}
				}
			},
			codeEditorSync: function () {
				if ( context.codeEditor && typeof context.codeEditor.getValue === 'function' ) {
					context.$textarea.val( context.codeEditor.getValue() );
				}
			}
		} );

		// Make sure to cast '0' to false
		context.codeEditorActive = !!Number( mw.user.options.get( 'usecodeeditor' ) );

		let textSelectionFn = { // Define textSelectionFn for Monaco
			getContents: function () {
				return context.codeEditor ? context.codeEditor.getValue() : context.$textarea.val();
			},
			setContents: function ( content ) {
				if ( context.codeEditor ) {
					context.codeEditor.setValue( content );
				} else {
					context.$textarea.val( content );
				}
			},
			getSelection: function () {
				if ( context.codeEditor ) {
					var selection = context.codeEditor.getSelection();
					var model = context.codeEditor.getModel();
					if ( selection && model ) {
						return model.getValueInRange( selection );
					}
				}
				return context.$textarea.textSelection( 'getSelection' );
			},
			setSelection: function ( options ) {
				if ( context.codeEditor && options.start !== undefined && options.end !== undefined && monaco && monaco.Range) {
					var model = context.codeEditor.getModel();
					if (model) {
						var startPosition = model.getPositionAt( options.start );
						var endPosition = model.getPositionAt( options.end );
						var range = new monaco.Range(
							startPosition.lineNumber,
							startPosition.column,
							endPosition.lineNumber,
							endPosition.column
						);
						context.codeEditor.setSelection(range);
						context.codeEditor.revealRange(range, monaco.editor.ScrollType.Smooth);
					}
				} else {
					context.$textarea.textSelection( 'setSelection', options );
				}
			},
			replaceSelection: function ( newText ) {
				if ( context.codeEditor ) {
					var selection = context.codeEditor.getSelection();
					if (selection) {
						context.codeEditor.executeEdits('jquery.codeEditor.replaceSelection', [{
							range: selection,
							text: newText,
							forceMoveMarkers: true
						}]);
					} else {
						var position = context.codeEditor.getPosition();
						if (position) {
							var range = new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column);
							context.codeEditor.executeEdits('jquery.codeEditor.insertText', [{
								range: range,
								text: newText,
								forceMoveMarkers: true
							}]);
						}
					}
				} else {
					context.$textarea.textSelection( 'replaceSelection', newText );
				}
			},
			getCaretPosition: function( options ) {
				if ( context.codeEditor ) {
					var position = context.codeEditor.getPosition();
					var model = context.codeEditor.getModel();
					if (position && model) {
						return model.getOffsetAt(position);
					}
				}
				return context.$textarea.textSelection('getCaretPosition', options);
			},
			scrollToCaretPosition: function () {
				if (context.codeEditor) {
					var position = context.codeEditor.getPosition();
					if (position) {
						context.codeEditor.revealPosition(position, monaco.editor.ScrollType.Smooth);
					}
				} else {
					context.$textarea.textSelection('scrollToCaretPosition');
				}
			}
		};

		/**
		 * Internally used functions
		 */
		context.fn = Object.assign( context.fn, {
			isCodeEditorActive: function () {
				return context.codeEditorActive;
			},
			isShowInvisibleChars: function () {
				return context.showInvisibleChars;
			},
			isLineWrappingActive: function () {
				return context.lineWrappingActive;
			},
			changeCookieValue: function ( cookieName, value ) {
				mw.cookie.set(
					'codeEditor-' + context.instance + '-' + cookieName,
					value
				);
			},
			monacoGotoLineColumn: function () {
				OO.ui.prompt( mw.msg( 'codeeditor-gotoline-prompt' ), {
					textInput: { placeholder: mw.msg( 'codeeditor-gotoline-placeholder' ) }
				} ).then( function ( result ) {
					if ( !result ) {
						return;
					}

					const matches = result.split( ':' );
					let line = 0;
					let column = 0;

					if ( matches.length > 0 ) {
						line = +matches[ 0 ];
						if ( isNaN( line ) ) {
							return;
						} else {
							line = Math.max(1, line);
						}
					}
					if ( matches.length > 1 ) {
						column = +matches[ 1 ];
						if ( isNaN( column ) ) {
							column = 1;
						} else {
							column = Math.max(1, column);
						}
					}

					if ( context.codeEditor ) {
						context.codeEditor.revealPositionInCenter({ lineNumber: line, column: column }, monaco.editor.ScrollType.Smooth);
						context.codeEditor.setPosition({ lineNumber: line, column: column });
						context.codeEditor.focus();
					}
				} );
			},
			setupCodeEditorToolbar: function () {
				const toggleEditor = function ( ctx ) {
					ctx.codeEditorActive = !ctx.codeEditorActive;

					ctx.fn.setCodeEditorPreference( ctx.codeEditorActive );
					ctx.fn.updateCodeEditorToolbarButton();

					if ( ctx.codeEditorActive ) {
						ctx.fn.setupCodeEditor();
					} else {
						ctx.fn.disableCodeEditor();
					}
				};
				const toggleInvisibleChars = function ( ctx ) {
					ctx.showInvisibleChars = !ctx.showInvisibleChars;

					ctx.fn.changeCookieValue( 'showInvisibleChars', ctx.showInvisibleChars ? 1 : 0 );
					ctx.fn.updateInvisibleCharsButton();

					if ( ctx.codeEditor ) {
						ctx.codeEditor.updateOptions({
							renderWhitespace: ctx.showInvisibleChars ? 'all' : 'none'
						});
					}
				};
				const toggleSearchReplace = function ( ctx ) {
					if ( ctx.codeEditor ) {
						var findAction = ctx.codeEditor.getAction('editor.action.startFindReplaceAction');
						if (findAction) {
							findAction.run();
						} else {
							ctx.codeEditor.getAction('actions.find').run();
						}
					}
				};
				const toggleLineWrapping = function ( ctx ) {
					ctx.lineWrappingActive = !ctx.lineWrappingActive;

					ctx.fn.changeCookieValue( 'lineWrappingActive', ctx.lineWrappingActive ? 1 : 0 );
					ctx.fn.updateLineWrappingButton();

					if ( ctx.codeEditor ) {
						ctx.codeEditor.updateOptions({
							wordWrap: ctx.lineWrappingActive ? 'on' : 'off'
						});
					}
				};
				const indent = function ( ctx ) {
					if ( ctx.codeEditor ) {
						ctx.codeEditor.trigger('toolbar', 'editor.action.indentLines');
					}
				};
				const outdent = function ( ctx ) {
					if ( ctx.codeEditor ) {
						ctx.codeEditor.trigger('toolbar', 'editor.action.outdentLines');
					}
				};
				const gotoLine = function ( ctx ) {
					ctx.fn.monacoGotoLineColumn();
				};

				context.api.addToToolbar( context, {
					section: 'main',
					groups: {
						'codeeditor-main': {
							tools: {
								codeEditor: {
									label: mw.msg( 'codeeditor-toolbar-toggle' ),
									type: 'toggle',
									oouiIcon: 'markup',
									action: {
										type: 'callback',
										execute: function() { toggleEditor(context); }
									}
								}
							}
						},
						'codeeditor-format': {
							tools: {
								indent: {
									label: mw.msg( 'codeeditor-indent' ),
									type: 'button',
									oouiIcon: 'indent',
									action: {
										type: 'callback',
										execute: function() { indent(context); }
									}
								},
								outdent: {
									label: mw.msg( 'codeeditor-outdent' ),
									type: 'button',
									oouiIcon: 'outdent',
									action: {
										type: 'callback',
										execute: function() { outdent(context); }
									}
								}

							}
						},
						'codeeditor-style': {
							tools: {
								invisibleChars: {
									label: mw.msg( 'codeeditor-invisibleChars-toggle' ),
									type: 'toggle',
									oouiIcon: 'pilcrow',
									action: {
										type: 'callback',
										execute: function() { toggleInvisibleChars(context); }
									}
								},
								lineWrapping: {
									label: mw.msg( 'codeeditor-lineWrapping-toggle' ),
									type: 'toggle',
									oouiIcon: 'wrapping',
									action: {
										type: 'callback',
										execute: function() { toggleLineWrapping(context); }
									}
								},
								gotoLine: {
									label: mw.msg( 'codeeditor-gotoline' ),
									type: 'button',
									oouiIcon: 'gotoLine',
									action: {
										type: 'callback',
										execute: function() { gotoLine(context); }
									}
								},
								toggleSearchReplace: {
									label: mw.msg( 'codeeditor-searchReplace-toggle' ),
									type: 'button',
									oouiIcon: 'articleSearch',
									action: {
										type: 'callback',
										execute: function() { toggleSearchReplace(context); }
									}
								}
							}
						}
					}
				} );
				context.fn.updateCodeEditorToolbarButton();
				context.fn.updateInvisibleCharsButton();
				context.fn.updateLineWrappingButton();
				$( '.group-codeeditor-style' ).prependTo( '.section-main' );
				$( '.group-codeeditor-format' ).prependTo( '.section-main' );
				$( '.group-codeeditor-main' ).prependTo( '.section-main' );
			},
			updateButtonIcon: function ( targetName, iconFn ) {
				const target = '.tool[rel=' + targetName + ']',
					$button = context.modules.toolbar.$toolbar.find( target );

				$button.data( 'setActive' )( iconFn() );
			},
			updateCodeEditorToolbarButton: function () {
				context.fn.updateButtonIcon( 'codeEditor', context.fn.isCodeEditorActive );
			},
			updateInvisibleCharsButton: function () {
				context.fn.updateButtonIcon( 'invisibleChars', context.fn.isShowInvisibleChars );
			},
			updateLineWrappingButton: function () {
				context.fn.updateButtonIcon( 'lineWrapping', context.fn.isLineWrappingActive );
			},
			setCodeEditorPreference: function ( prefValue ) {
				// Abort any previous request
				api.abort();

				api.saveOption( 'usecodeeditor', prefValue ? 1 : 0 )
					.catch( ( code, result ) => {
						if ( code === 'http' && result.textStatus === 'abort' ) {
							// Request was aborted. Ignore error
							return;
						}
						if ( code === 'notloggedin' ) {
							// Expected for non-registered users
							return;
						}

						let message = 'Failed to set code editor preference: ' + code;
						if ( result.error && result.error.info ) {
							message += '\n' + result.error.info;
						}
						mw.log.warn( message );
					} );
			},
			/**
			 * Sets up Monaco editor in place of the textarea
			 */
			setupCodeEditor: function () {
				const $box = context.$textarea;
				let lang = mw.config.get( 'wgCodeEditorCurrentLanguage' );

				document.body.classList.add( 'codeeditor-loading' );

				if ( lang && typeof initializeMonacoEditor === 'function' ) {
					var textAreaId = $box.attr('id');
					if (!textAreaId) {
						textAreaId = 'monaco-editor-textarea-' + mw.now();
						$box.attr('id', textAreaId);
					}

					const languageMap = {
						'javascript': 'javascript',
						'json': 'json',
						'css': 'css',
						'less': 'less',
						'lua': 'lua',
						'html': 'html',
						'xml': 'xml',
						'php': 'php',
						'python': 'python',
						'sql': 'sql',
						'yaml': 'yaml',
						'markdown': 'markdown',
						'java': 'java',
						'csharp': 'csharp',
						'cpp': 'cpp',
						'objective-c': 'objective-c',
						'swift': 'swift',
						'ruby': 'ruby',
						'go': 'go',
						'perl': 'perl',
						'shell': 'shell',
						'plaintext': 'plaintext',
						'wikitext': 'plaintext'
					};

					const monacoLang = languageMap[lang.toLowerCase()] || 'plaintext';

					const htmlClasses = document.documentElement.classList;
					const inDarkMode = htmlClasses.contains( 'skin-theme-clientpref-night' ) || (
						htmlClasses.contains( 'skin-theme-clientpref-os' ) &&
						window.matchMedia && window.matchMedia( '(prefers-color-scheme: dark)' ).matches
					);

					initializeMonacoEditor( textAreaId, monacoLang, {
						theme: inDarkMode ? 'vs-dark' : 'vs',
						renderWhitespace: context.showInvisibleChars ? 'all' : 'none',
						wordWrap: context.lineWrappingActive ? 'on' : 'off',
						readOnly: $box.prop( 'readonly' ),
						automaticLayout: true
					});

					var checkEditorInterval = setInterval(function() {
						var editor = $box.data('monacoEditor');
						if (editor) {
							clearInterval(checkEditorInterval);
							context.codeEditor = editor;
							context.$codeEditorContainer = $(editor.getDomNode()).parent();

							context.$textarea.textSelection( 'register', textSelectionFn );

							$box.closest( 'form' )
								.off( '.codeEditor' )
								.on( 'submit.codeEditor', context.evt.codeEditorSubmit )
								.find( '#wpSave' ).off( '.codeEditor' ).on( 'click.codeEditor', context.evt.codeEditorSave );

							if (monaco && monaco.KeyMod && monaco.KeyCode) {
								editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyL, function() {
									context.fn.monacoGotoLineColumn();
								});
							}

							const model = editor.getModel();
							if (model) {
								model.onDidChangeContent(function () {
									context.evt.codeEditorSync();
								});

								if (mw.hook && mw.hook( 'editRecovery.loadEnd' ).add) {
									mw.hook( 'editRecovery.loadEnd' ).add( function ( data ) {
										model.onDidChangeContent(function () {
											if (data && typeof data.fieldChangeHandler === 'function') {
												data.fieldChangeHandler();
											}
										});
									});
								}
							}

							// if (context.$codeEditorContainer && typeof context.$codeEditorContainer.resizable === 'function') {
							// 	context.$codeEditorContainer.resizable( {
							// 		handles: 's',
							// 		minHeight: $box.height() || 200,
							// 		resize: function () {
							// 		}
							// 	} );
							// }
							$( '.wikiEditor-ui-toolbar' ).addClass( 'codeEditor-ui-toolbar' );

							if ( selectedLine > 0 ) {
								editor.revealLineInCenter(selectedLine, monaco.editor.ScrollType.Smooth);
								editor.setPosition({ lineNumber: selectedLine, column: 1 });
							}

							context.fn.setupStatusBar();
							document.body.classList.remove( 'codeeditor-loading' );
							context.fn.trigger( 'ready' );
							editor.focus();
						} else if (Date.now() - startTime > 10000) {
							clearInterval(checkEditorInterval);
							document.body.classList.remove( 'codeeditor-loading' );
							console.error("CodeEditor: Monaco editor instance not found after 10 seconds. Check monaco-init.js.");
							context.fn.disableCodeEditor();
							mw.notify("Failed to load code editor. Reverted to plain textarea.", {type: "error"});
						}
					}, 100);
					var startTime = Date.now();

				} else {
					document.body.classList.remove( 'codeeditor-loading' );
					if (typeof initializeMonacoEditor !== 'function') {
						console.error("CodeEditor: initializeMonacoEditor function not found. Ensure monaco-init.js is loaded.");
					}
					if (!lang) {
						console.warn("CodeEditor: No language specified (wgCodeEditorCurrentLanguage is not set). Monaco will use plaintext.");
					}
				}
			},

			/**
			 * Turn off the code editor view and return to the plain textarea.
			 * May be needed by some folks with funky browsers, or just to compare.
			 */
			disableCodeEditor: function () {
				// Clean up event handlers
				context.$textarea.closest( 'form' )
					.off( '.codeEditor' );
				context.$textarea.closest( 'form' ).find( '#wpSave' ).off( '.codeEditor' );

				// Save contents before destroying
				if (context.codeEditor && typeof context.codeEditor.getValue === 'function') {
					context.$textarea.val( context.codeEditor.getValue() );
				}
				context.$textarea.textSelection( 'unregister' );

				// Drop the editor widget
				context.fn.removeStatusBar();
				if (context.codeEditor && typeof context.codeEditor.dispose === 'function') {
					context.codeEditor.dispose();
				}
				if (context.$codeEditorContainer) {
					// if (typeof context.$codeEditorContainer.resizable === 'function') {
					// 	context.$codeEditorContainer.resizable( 'destroy' );
					// }
					context.$codeEditorContainer.remove();
				}
				context.$codeEditorContainer = undefined;
				context.codeEditor = undefined;
				context.$textarea.removeData('monacoEditor');

				// Restore textarea
				context.$textarea.show();

				// Restore toolbar
				$( '.wikiEditor-ui-toolbar' ).removeClass( 'codeEditor-ui-toolbar' );
				document.body.classList.remove( 'codeeditor-loading' );
			},

			/**
			 * Start monitoring the fragment of the current window for hash change
			 * events. If the hash is already set, handle it as a new event.
			 */
			codeEditorMonitorFragment: function () {
				function onHashChange() {
					const regexp = /#mw-ce-l(\d+)/;
					const result = regexp.exec( window.location.hash );

					if ( result === null ) {
						return;
					}

					selectedLine = parseInt( result[ 1 ], 10 );
					if ( context.codeEditor && selectedLine > 0 ) {
						context.codeEditor.revealLineInCenter(selectedLine);
						context.codeEditor.setPosition({ lineNumber: selectedLine, column: 1 });
						context.codeEditor.focus();
					}
				}

				onHashChange();
				$( window ).on( 'hashchange', onHashChange );
			},
			/**
			 * This creates a Statusbar, that allows you to see a count of the
			 * errors, warnings and the warning of the current line, as well as
			 * the position of the cursor.
			 */
			setupStatusBar: function () {
				// Remove any existing status bar
				context.fn.removeStatusBar();

				if ( !context.codeEditor || !context.codeEditor.getModel ) {
					return;
				}

				const $bar = $( '<div>' ).addClass( 'wikiEditor-ui-bottomInfo codeeditor-statusbar' );
				const $pos = $( '<a>' )
					.attr( 'href', '#' )
					.addClass( 'codeeditor-statusbar-position' )
					.attr( 'role', 'button' )
					.attr( 'title', mw.msg('codeeditor-gotoline') )
					.on( 'click', function ( e ) {
						e.preventDefault();
						context.fn.monacoGotoLineColumn();
					} );
				const $info = $( '<span>' ).addClass( 'codeeditor-statusbar-info' );

				$bar.append( $pos, $info );
				if (context.$codeEditorContainer) {
					context.$codeEditorContainer.after($bar);
				} else {
					context.modules.toolbar.$toolbar.after( $bar );
				}
				context.$statusBar = $bar;

				const editor = context.codeEditor;
				const model = editor.getModel();

				function updateStatusBar() {
					if (!editor || !model || !editor.getPosition) { return; }

					const position = editor.getPosition();
					if (position) {
						$pos.text( mw.msg( 'codeeditor-statusbar-line', position.lineNumber ) + ', ' + mw.msg( 'codeeditor-statusbar-column', position.column ) );
					} else {
						$pos.text('');
					}

					let errors = 0;
					let warnings = 0;
					if (monaco && monaco.editor && monaco.MarkerSeverity && model.uri) {
						const markers = monaco.editor.getModelMarkers({ resource: model.uri });
						markers.forEach(function(marker) {
							if (marker.severity === monaco.MarkerSeverity.Error) {
								errors++;
							} else if (marker.severity === monaco.MarkerSeverity.Warning) {
								warnings++;
							}
						});
					}

					let infoText = '';
					if (errors > 0) {
						infoText += mw.msg( 'codeeditor-statusbar-errors', errors ) + ' ';
					}
					if (warnings > 0) {
						infoText += mw.msg( 'codeeditor-statusbar-warnings', warnings );
					}
					$info.text( infoText.trim() );
				}

				if (context.monacoCursorListener) context.monacoCursorListener.dispose();
				context.monacoCursorListener = editor.onDidChangeCursorPosition( updateStatusBar );

				if (model) {
					if (context.monacoMarkerListener) context.monacoMarkerListener.dispose();
					if (monaco && monaco.editor && typeof monaco.editor.onDidChangeMarkers === 'function') {
						context.monacoMarkerListener = monaco.editor.onDidChangeMarkers(function(uris) {
							if (uris.some(function(uri) { return uri.toString() === model.uri.toString(); })) {
								updateStatusBar();
							}
						});
					} else {
						if (context.monacoContentListenerForStatusBar) context.monacoContentListenerForStatusBar.dispose();
						context.monacoContentListenerForStatusBar = model.onDidChangeContent( updateStatusBar );
					}
				}
				updateStatusBar();
			},

			removeStatusBar: function () {
				if ( context.$statusBar ) {
					context.$statusBar.remove();
					context.$statusBar = undefined;
				}
				if (context.monacoCursorListener) {
					context.monacoCursorListener.dispose();
					context.monacoCursorListener = undefined;
				}
				if (context.monacoMarkerListener) {
					context.monacoMarkerListener.dispose();
					context.monacoMarkerListener = undefined;
				}
				if (context.monacoContentListenerForStatusBar) {
					context.monacoContentListenerForStatusBar.dispose();
					context.monacoContentListenerForStatusBar = undefined;
				}
			}
		} );

		/**
		 * Override the base functions in a way that lets
		 * us fall back to the originals when we turn off.
		 *
		 * @param {Object} base
		 * @param {Object} extended
		 */
		const saveAndExtend = function ( base, extended ) {
			// eslint-disable-next-line no-jquery/no-map-util
			$.map( extended, ( func, name ) => {
				if ( name in base ) {
					const orig = base[ name ];
					base[ name ] = function () {
						if ( context.codeEditorActive ) {
							return func.apply( this, arguments );
						}
						if ( orig ) {
							return orig.apply( this, arguments );
						}
						throw new Error( 'CodeEditor: no original function to call for ' + name );
					};
				} else {
					base[ name ] = func;
				}
			} );
		};

		saveAndExtend( context.fn, {
			saveSelection: function () {
				mw.log( 'codeEditor stub function saveSelection called' );
			},
			restoreSelection: function () {
				mw.log( 'codeEditor stub function restoreSelection called' );
			},

			/**
			 * Scroll an element to the top of the iframe
			 */
			scrollToTop: function () {
				mw.log( 'codeEditor stub function scrollToTop called' );
			}
		} );

		/**
		 * Compatibility with the $.textSelection jQuery plug-in. When the editor is in use, these functions provide
		 * equivalent functionality to the otherwise textarea-based functionality.
		 */
		textSelectionFn = {
			/* Needed for search/replace */
			getContents: function () {
				if (context.codeEditor && context.codeEditor.getModel()) {
					return context.codeEditor.getModel().getValue();
				}
				return '';
			},

			setContents: function ( newContents ) {
				if (context.codeEditor && context.codeEditor.getModel()) {
					context.codeEditor.getModel().setValue(newContents);
				}
				return context.$textarea;
			},

			/**
			 * Gets the currently selected text in the content
			 * DO NOT CALL THIS DIRECTLY, use $.textSelection( 'functionname', options ) instead
			 *
			 * @return {string}
			 */
			getSelection: function () {
				if (context.codeEditor) {
					const selection = context.codeEditor.getSelection();
					if (selection) {
						return context.codeEditor.getModel().getValueInRange(selection);
					}
				}
				return '';
			},

			/**
			 * Replace the current selection with the given text.
			 * DO NOT CALL THIS DIRECTLY, use $.textSelection( 'functionname', options ) instead
			 *
			 * @param {string} text
			 * @return {jQuery}
			 */
			replaceSelection: function ( text ) {
				if (context.codeEditor) {
					const selection = context.codeEditor.getSelection();
					if (selection) {
						const model = context.codeEditor.getModel();

						context.codeEditor.executeEdits('textSelection', [{
							range: selection,
							text: text,
							forceMoveMarkers: true
						}]);
					} else {
						context.codeEditor.trigger('keyboard', 'type', { text: text });
					}
				}
				return context.$textarea;
			},

			/**
			 * Inserts text at the beginning and end of a text selection, optionally inserting text at the caret when
			 * selection is empty.
			 * DO NOT CALL THIS DIRECTLY, use $.textSelection( 'functionname', options ) instead
			 *
			 * @param {Object} options
			 * @return {jQuery}
			 */
			encapsulateSelection: function ( options ) {
				if (!context.codeEditor) {
					return context.$textarea;
				}

				const editor = context.codeEditor;
				const selection = editor.getSelection();
				const model = editor.getModel();

				if (!selection || !model) {
					return context.$textarea;
				}

				let selText = model.getValueInRange(selection);
				let isSample = false;

				if (!selText) {
					selText = options.peri;
					isSample = true;
				} else if (options.replace) {
					selText = options.peri;
				}

				let text = options.pre + selText + options.post;

				editor.executeEdits('textSelection', [{
					range: selection,
					text: text,
					forceMoveMarkers: true
				}]);

				if (isSample && options.selectPeri && !options.splitlines) {
					const insertEndPosition = editor.getPosition();
					if (insertEndPosition) {
						const startLine = insertEndPosition.lineNumber;
						const startCol = insertEndPosition.column - options.post.length - selText.length;
						const endCol = startCol + selText.length;

						editor.setSelection(new monaco.Range(
							startLine,
							startCol,
							endCol
						));
					}
				}

				return context.$textarea;
			},

			/**
			 * Gets the position (in characters) in a text area
			 * DO NOT CALL THIS DIRECTLY, use $.textSelection( 'functionname', options ) instead
			 *
			 * @param {Object} options
			 * @param {Object} [options.startAndEnd=false] Return range of the selection rather than just start
			 * @return {number|number[]} If options.startAndEnd is true, returns an array holding the start and
			 * end of the selection, else returns only the start of the selection as a single number.
			 */
			getCaretPosition: function ( options ) {
				if (!context.codeEditor || !context.codeEditor.getModel()) {
					return options.startAndEnd ? [0, 0] : 0;
				}

				const model = context.codeEditor.getModel();
				const selection = context.codeEditor.getSelection();

				if (!selection) {
					return options.startAndEnd ? [0, 0] : 0;
				}

				const startOffset = model.getOffsetAt({
					lineNumber: selection.startLineNumber,
					column: selection.startColumn
				});

				if (options.startAndEnd) {
					const endOffset = model.getOffsetAt({
						lineNumber: selection.endLineNumber,
						column: selection.endColumn
					});
					return [startOffset, endOffset];
				}

				return startOffset;
			},

			/**
			 * Sets the selection of the content
			 * DO NOT CALL THIS DIRECTLY, use $.textSelection( 'functionname', options ) instead
			 *
			 * @param {Object} options
			 * @return {jQuery}
			 */
			setSelection: function ( options ) {
				if (!context.codeEditor || !context.codeEditor.getModel()) {
					return context.$textarea;
				}

				const model = context.codeEditor.getModel();

				const start = model.getPositionAt(options.start);
				const end = model.getPositionAt(options.end);

				context.codeEditor.setSelection(new monaco.Range(
					start.lineNumber,
					start.column,
					end.lineNumber,
					end.column
				));

				return context.$textarea;
			},

			/**
			 * Scroll a textarea to the current cursor position. You can set the cursor position with setSelection()
			 * DO NOT CALL THIS DIRECTLY, use $.textSelection( 'functionname', options ) instead
			 *
			 * @return {jQuery}
			 */
			scrollToCaretPosition: function () {
				if (context.codeEditor) {
					const selection = context.codeEditor.getSelection();
					if (selection) {
						context.codeEditor.revealPositionInCenter({
							lineNumber: selection.startLineNumber,
							column: selection.startColumn
						});
					}
				}
				return context.$textarea;
			}
		};

		/* Setup the editor */
		context.fn.setupCodeEditorToolbar();
		if ( context.codeEditorActive ) {
			context.fn.setupCodeEditor();
		}

	};
}() );
