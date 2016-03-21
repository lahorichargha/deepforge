/*jshint node:true, mocha:true*/
/**
 * Generated by PluginGenerator 0.14.0 from webgme on Sun Mar 20 2016 16:49:12 GMT-0500 (CDT).
 */

'use strict';
var testFixture = require('../../globals'),
    path = testFixture.path,
    jszip = require('jszip'),
    fs = require('fs'),
    TEST_CASE_DIR = path.join(__dirname, '..', 'test-cases'),
    SEED_DIR = path.join(testFixture.SEED_DIR, '..', 'devTests');

describe('GenerateArchitecture', function () {
    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        logger = testFixture.logger.fork('GenerateArchitecture'),
        PluginCliManager = testFixture.WebGME.PluginCliManager,
        BlobClient = require('webgme/src/server/middleware/blob/BlobClientWithFSBackend'),
        projectName = 'testProject',
        pluginName = 'GenerateArchitecture',
        project,
        gmeAuth,
        storage,
        commitHash;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig, projectName)
            .then(function (gmeAuth_) {
                gmeAuth = gmeAuth_;
                // This uses in memory storage. Use testFixture.getMongoStorage to persist test to database.
                storage = testFixture.getMemoryStorage(logger, gmeConfig, gmeAuth);
                return storage.openDatabase();
            })
            .then(function () {
                var importParam = {
                    projectSeed: testFixture.path.join(SEED_DIR, 'devTests.zip'),
                    projectName: projectName,
                    branchName: 'master',
                    logger: logger,
                    gmeConfig: gmeConfig
                };

                return testFixture.importProject(storage, importParam);
            })
            .then(function (importResult) {
                project = importResult.project;
                commitHash = importResult.commitHash;
                return project.createBranch('test', commitHash);
            })
            .nodeify(done);
    });

    after(function (done) {
        storage.closeDatabase()
            .then(function () {
                return gmeAuth.unload();
            })
            .nodeify(done);
    });

    it('should run plugin and not update the branch', function (done) {
        var manager = new PluginCliManager(null, logger, gmeConfig),
            pluginConfig = {
            },
            context = {
                project: project,
                commitHash: commitHash,
                branchName: 'test',
                activeNode: '/960660211',
            };

        manager.executePlugin(pluginName, pluginConfig, context, function (err, pluginResult) {
            expect(err).to.equal(null);
            expect(typeof pluginResult).to.equal('object');
            expect(pluginResult.success).to.equal(true);

            project.getBranchHash('test')
                .then(function (branchHash) {
                    expect(branchHash).to.equal(commitHash);
                })
                .nodeify(done);
        });
    });

    describe('test cases', function() {
        var cases = [
            ['/R', 'basic.lua'],
            ['/e', 'basic-transfers.lua']
        ];

        var runTest = function(pair, done) {
            var id = pair[0],
                name = pair[1],
                manager = new PluginCliManager(null, logger, gmeConfig),
                pluginConfig = {
                },
                context = {
                    project: project,
                    commitHash: commitHash,
                    branchName: 'test',
                    activeNode: id,
                },
                expected = fs.readFileSync(path.join(TEST_CASE_DIR, name), 'utf8');

            manager.executePlugin(pluginName, pluginConfig, context, function (err, pluginResult) {
                var codeHash = pluginResult.artifacts[0];
                expect(err).to.equal(null);
                expect(typeof pluginResult).to.equal('object');
                expect(pluginResult.success).to.equal(true);

                // Retrieve the code from the blob and check it!
                var blobClient = new BlobClient(gmeConfig, logger);

                blobClient.getObject(codeHash, (err, obj) => {
                    // Unzip first...
                    var zip = new jszip(),
                        filename,
                        actual;

                    zip.load(obj);
                    filename = Object.keys(zip.files)
                        .filter(name => name.indexOf('.lua') > -1)[0];

                    actual = zip.files[filename].asText();
                    expect(actual).to.equal(expected);
                    done();
                });
            });
        };

        cases.forEach(pair => {
            it(`should correctly evaluate ${pair[0]} (${pair[1]})`,
                runTest.bind(this, pair));
        });
    });
});
