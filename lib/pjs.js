var fs = require('fs'),
    preprocessor = require('./preprocessor');

exports.VERSION = '0.1';

exports.compile = preprocessor.compile;

exports.PreprocessorError = preprocessor.PreprocessorError;

exports.install = function(options) {
    function loadFile(module, filename) {
        var raw = fs.readFileSync(filename, 'utf8');
        // Strip UTF BOM
        raw = raw.charCodeAt(0) === 0xFEFF ? raw.substring(1) : raw;
        return module._compile(preprocessor.compile(raw, {
            filename: filename
        }), filename);
    }

    require.extensions['.pjs'] = loadFile;
}
