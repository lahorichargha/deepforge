/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Generated by PluginGenerator 0.14.0 from webgme on Tue Mar 15 2016 21:19:45 GMT-0500 (CDT).
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'deepforge/js-yaml.min',
    'text!deepforge/layers.yml'
], function (
    PluginConfig,
    PluginBase,
    yaml,
    DEFAULT_LAYERS
) {
    'use strict';

    /**
     * Initializes a new instance of CreateTorchMeta.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin CreateTorchMeta.
     * @constructor
     */
    var CreateTorchMeta = function () {
        // Call base class' constructor.
        PluginBase.call(this);
    };

    // Prototypal inheritance from PluginBase.
    CreateTorchMeta.prototype = Object.create(PluginBase.prototype);
    CreateTorchMeta.prototype.constructor = CreateTorchMeta;

    /**
     * Gets the name of the CreateTorchMeta.
     * @returns {string} The name of the plugin.
     * @public
     */
    CreateTorchMeta.prototype.getName = function () {
        return 'CreateTorchMeta';
    };

    /**
     * Gets the semantic version (semver.org) of the CreateTorchMeta.
     * @returns {string} The version of the plugin.
     * @public
     */
    CreateTorchMeta.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * Gets the configuration structure for the CreateTorchMeta.
     * The ConfigurationStructure defines the configuration for the plugin
     * and will be used to populate the GUI when invoking the plugin from webGME.
     * @returns {object} The version of the plugin.
     * @public
     */
    CreateTorchMeta.prototype.getConfigStructure = function () {
        return [
            {
                name: 'layerNameHash',
                displayName: 'Torch Layers',
                description: 'Yaml file of torch layer descriptors (optional)',
                value: '',
                valueType: 'asset',
                readOnly: false
            }
        ];
    };


    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    CreateTorchMeta.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            nodeObject;

        if (!this.META.Language) {
            callback('"Language" container required to run plugin', this.result);
        }

        // Extra layer names
        this.getYamlText((err, text) => {
            if (err) {
                return callback(err, this.result);
            }

            // The format is...
            //      - (Abstract) CategoryLayerTypes
            //          - LayerName
            //              - Attributes (if exists)
            var content,
                categories,
                nodes = {};

            try {
                content = yaml.load(text);
            } catch (e) {
                return callback('YAML parse error: ' + e, this.result);
            }
            categories = Object.keys(content);
            // Create the base class, if needed
            if (!this.META.Layer) {
                this.META.Layer = this.createMetaNode('Layer', this.META.FCO);
            }

            // Create the category nodes
            categories
                .forEach(name => nodes[name] = this.createMetaNode(name, this.META.Layer));

            // Make them abstract
            categories
                .forEach(name => this.core.setRegistry(nodes[name], 'isAbstract', true));
            

            // Create the actual nodes
            categories.forEach(cat => {
                content[cat]
                    .forEach(name => {
                        var attrs = null;
                        if (typeof name !== 'string') {
                            attrs = name[Object.keys(name)[0]];
                            name = Object.keys(name)[0];
                        }
                        nodes[name] = this.createMetaNode(name, nodes[cat], attrs);
                        // Make the node non-abstract
                        this.core.setRegistry(nodes[name], 'isAbstract', false);
                    });
            });

            self.save('CreateTorchMeta updated model.', function (err) {
                if (err) {
                    callback(err, self.result);
                    return;
                }
                self.result.setSuccess(true);
                callback(null, self.result);
            });
        });


    };

    CreateTorchMeta.prototype.getYamlText = function (callback) {
        var config = this.getCurrentConfig();

        if (config.layerNameHash) {
            this.blobClient.getObject(config.layerNameHash, (err, buffer) => {
                if (err) {
                    return callback(err, this.result);
                }
                var text = String.fromCharCode.apply(null, new Uint8Array(buffer));
                return callback(null, text);
            });
        } else {
            return callback(null, DEFAULT_LAYERS);
        }
    };

    CreateTorchMeta.prototype.createMetaNode = function (name, base, attrs) {
        var node;

        if (this.META[name]) {
            this.logger.warn('"' + name + '" already exists. skipping...');
            return this.META[name];
        }

        // Create a node
        node = this.core.createNode({
            parent: this.META.Language,
            base: base
        });
        this.core.setAttribute(node, 'name', name);

        // Add it to the meta sheet
        this.core.addMember(this.rootNode, 'MetaAspectSet', node);

        // Add it to a tab of the meta sheet
        var set = this.core.getSetNames(this.rootNode)
            .find(name => name !== 'MetaAspectSet');

        this.core.addMember(this.rootNode, set, node);
        // TODO: Position the nodes on the META
        // TODO: Put each group of nodes on their own META sheet

        if (attrs) {  // Add the attributes
            attrs.forEach(name => {
                var desc = null;
                if (typeof name !== 'string') {
                    desc = name[Object.keys(name)[0]];
                    name = Object.keys(name)[0];
                }
                if (!(desc && desc.ignore)) {
                    this.addAttribute(name, node, desc);
                }
            });
        }
        this.logger.debug(`added ${name} to the meta`);

        return node;
    };

    CreateTorchMeta.prototype.addAttribute = function (name, node, def) {
        var initial,
            schema = {};

        def = def || {};

        schema.type = def.type || 'integer';
        if (schema.type === 'list') {  // FIXME
            schema.type = 'string';
        }

        if (def.min !== undefined) {
            schema.min = +def.min;
        }

        if (def.max !== undefined) {
            // Set the min, max
            schema.max = +def.max;
        }

        // Create the attribute and set the schema
        this.core.setAttributeMeta(node, name, schema);

        // Determine a default value
        initial = def.default || def.min || null;
        if (def.type === 'boolean') {
            initial = def.default || false;
        }

        if (initial !== null) {  // optional attribute - set default value
            this.core.setAttribute(node, name, initial);
        }
    };

    return CreateTorchMeta;
});
