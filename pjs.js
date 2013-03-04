(function() {
    var fs = require('fs');

    function loadFile(module, filename) {
        var raw = fs.readFileSync(filename, 'utf8');
        // Strip UTF BOM
        raw = raw.charCodeAt(0) === 0xFEFF ? raw.substring(1) : raw;
        
        return module._compile(compile(raw), filename);
    }

    exports.compile = compile = function(code) {
        console.log('----------------------------')
        console.log(code.split('\n'))
        console.log('----------------------------')
        return code;
    }

    require.extensions['.pjs'] = loadFile;

    exports.VERSION = '0.1';
}).call(this);