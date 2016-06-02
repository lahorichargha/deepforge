/*globals define */
/*jshint browser: true*/

/**
 * Generated by VisualizerGenerator 1.7.0 from webgme on Wed May 18 2016 12:00:46 GMT-0500 (CDT).
 */

define([
    'widgets/TextEditor/TextEditorWidget',
    'underscore',
    'css!./styles/OperationCodeEditorWidget.css'
], function (
    TextEditorWidget,
    _
) {
    'use strict';

    var OperationCodeEditorWidget;
        //WIDGET_CLASS = 'operation-editor';

    OperationCodeEditorWidget = function (logger, container) {
        TextEditorWidget.call(this, logger, container);
    };

    _.extend(OperationCodeEditorWidget.prototype, TextEditorWidget.prototype);

    OperationCodeEditorWidget.prototype.getHeader = function (desc) {
        // Add comment about the inputs, attributes and references
        var inputs = desc.inputs.map(pair => `-- ${pair[0]} (${pair[1]})`).join('\n'),
            refs = desc.references.map(name => `-- ${name}`).join('\n'),
            outputs,
            header = [
                `-- Editing "${desc.name}"`,
                '-- '
            ];

        if (inputs.length) {
            header.push('-- Defined variables:');
            header.push(inputs);
        }
        if (refs) {
            header.push(refs);
        }
        header.push('--');

        // Add info about outputs
        outputs = desc.outputs.map(pair => `--   ${pair[0]} = <some ${pair[1]}>`)
            .join('\n');

        if (outputs.length) {
            header.push('-- Returning something like:');
            header.push('-- {');
            header.push(outputs);
            header.push('-- }');
        }

        return header.join('\n');
    };

    return OperationCodeEditorWidget;
});