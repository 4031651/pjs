var path = require('path');

exports.compile = function (code, options) {
    options.node = typeof options.node == 'undefined' ? true : false;
    var parser = new Parser(options.node, options.filename || '');
    parser.compile(code);
    return code;
};

function Parser(node, filename) {
    var datetime = (new Date()).toUTCString()
            .split(', ')[1]
            .replace(/^(\d{2}) (\w{3}) (\d{4}) (\d{2}:\d{2}:\d{2}).* GMT$/, '$2 $1 $3,$4')
            .split(',');

    this.filename = filename;
    this.code = null;
    this.current = 'start';
    
    this.predefined = '__LINE__:__DIR__:__FILE__:__DATE__:__TIME__:__NODE__'.split(':');
    
    this.simbols = {
        __LINE__: 0,                       // Integer value representing the current line in the source code file being compiled.
        __DIR__ : path.dirname(filename),  // A string literal containing the presumed directory name of the source file being compiled.
        __FILE__: path.basename(filename), // A string literal containing the presumed name of the source file being compiled.
        __DATE__: datetime[0],             // A string literal in the form "Mmm dd yyyy" containing the date in which the compilation process began. (Nov 1 2005)
        __TIME__: datetime[1]              // A string literal in the form "hh:mm:ss" containing the time at which the compilation process began. (10:12:29)
    };
    if (node) {
        this.simbols.__NODE__ = 1;
    }

    this.tokens = require('./tokens');

    this.allTokens = [];
    for (var t in this.tokens) {
        if (this.tokens.hasOwnProperty(t) && t != 'start') {
            this.allTokens.push(t);
        }
    }
}

function parseType(str) {
    //float
    if (/^\d*\.\d+$/.test(str)) {
        return parseFloat(str);
    } else if (/^\d+$/.test(str)) {
        return parseInt(str, 10);
    }
    return str;
}

Parser.prototype = {
    constructor: Parser,
    allTrim: function (str) {
        return str.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g, '').replace(/\s+/g, ' ');
    },
    getToken: function (line) {
        for (var i = 0, token, result; i < this.allTokens.length; i++) {
            token = this.tokens[this.allTokens[i]];
            result = token.parse(this.allTrim(line));
            if (result) {
                return result;
            }
        }
        return null;
    },
    compile: function (code) {
        this.code = code.split('\n');
        for (var len = this.code.length; this.simbols.__LINE__ < len; this.simbols.__LINE__++) {
            var line = this.code[this.simbols.__LINE__];
            if (line.indexOf('#') == -1) {
                continue;
            }

            var token = this.getToken(line);
            if (!token) {
                continue;
            }
            console.log(this.simbols);
            console.log('--------------------------');
            this[token[0]].apply(this, token.slice(1));
            console.log(this.simbols);
            //this.error('STOP');
            console.log(this.simbols.__LINE__ + ':', line);
            console.log('##########################');
        }
    },
    // directives
    define: function (varName, value) {
        if (varName in this.simbols) {
            this.error('Cannot redeclare constant ' + varName + '.');
        }

        this.simbols[varName] = parseType(value);
        //
    },
    undef: function (varName) {
        if (this.predefined.indexOf(varName) != -1) {
            this.error('Cannot undeclare predefined constant ' + varName + '.');
        }

        delete this.simbols[varName];
    },
    _const: function (varName) {
        if (!(varName in this.simbols)) {
            this.error('Trying to get undeclared constant ' + varName + '.');
        }

        return this.simbols[varName];
    },
    error: function (message) {
        console.log('\033[1;31mPREPROCESSOR:\033[00m\ Error at line ' + (this.simbols.__LINE__ + 1) + ' in ' + this.filename + '. ' + message);
        process.exit(1);
    },
    include: function () {
        //
    },
    callMacro: function () {
        //
    }
};
