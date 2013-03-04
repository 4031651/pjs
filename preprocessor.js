var path = require('path');

exports.compile = function (code, options) {
    options.node = typeof options.node == 'undefined' ? true : false;
    var parser = new Parser(options.node, options.filename || '');
    console.log('----------------------------');
    parser.parse(code);
    console.log('----------------------------');
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

    this.tokens = {
        start: {
            prev: false,
            next: false
        },
        define: {
            parse: function (text) {
                //#define TABLE_SIZE 100 * 5 / 20
                var matches = text.match(/^\/\/\#(define) ([a-zA-Z_]+) ([0-9 +\-\*\/]+)$/);
                if (matches) {
                    return [matches[1], matches[2], matches[3]];
                }
                return false;
            },
            change: false,
            prev: false,
            next: false
        },
        undef: {
            parse: function (text) {
                //#undef TABLE_SIZE
                var matches = text.match(/^\/\/\#(undef) ([a-zA-Z_]+)$/);
                if (matches) {
                    return [matches[1], matches[2]];
                }
                return false;
            },
            change: false,
            prev: false,
            next: false
        },
        error: {
            parse: function (text) {
                //#error Oops. Something bad has happened!
                var matches = text.match(/^\/\/\#(error) (.+)$/);
                if (matches) {
                    return [matches[1], matches[2]];
                }
                return false;
            },
            change: false,
            prev: false,
            next: false
        },
        include: {
            parse: function (text) {
                //#include path/to/some/file.ext
                var matches = text.match(/^\/\/\#(include) ([a-zA-Z_\.\/]+)$/);
                if (matches) {
                    return [matches[1], matches[2]];
                }
                return false;
            },
            change: false,
            prev: false,
            next: false
        },
        ifdef: {
            parse: function (text) {
                //#ifdef TABLE_SIZE
                var matches = text.match(/^\/\/\#(ifdef) ([a-zA-Z_]+)$/);
                if (matches) {
                    return [matches[1], matches[2]];
                }
                return false;
            },
            change: true,
            prev: false,
            next: ['elif', 'else', 'endif']
        },
        ifndef: {
            parse: function (text) {
                //#ifndef TABLE_SIZE
                var matches = text.match(/^\/\/\#(ifndef) ([a-zA-Z_]+)$/);
                if (matches) {
                    return [matches[1], matches[2]];
                }
                return false;
            },
            change: true,
            prev: false,
            next: ['elif', 'else', 'endif']
        },
        _if: {
            parse: function (text) {
                //#if TABLE_SIZE * 2 > 100
                var matches = text.match(/^\/\/\#(if) ([a-zA-Z_0-9 +\-\*\/<>=]+)$/);
                if (matches) {
                    return [matches[1], matches[2]];
                }
                return false;
            },
            change: true,
            prev: false,
            next: ['elif', 'else', 'endif']
        },
        elif: {
            parse: function (text) {
                //#elif TABLE_SIZE * 2 > 50
                var matches = text.match(/^\/\/\#(elif) ([a-zA-Z_0-9 +\-\*\/<>=]+)$/);
                if (matches) {
                    return [matches[1], matches[2]];
                }
                return false;
            },
            change: true,
            prev: ['ifdef', 'ifndef', 'if', 'elif'],
            next: ['elif', 'else', 'endif']
        },
        _else: {
            parse: function (text) {
                //#else
                var matches = text.match(/^\/\/\#(else)$/);
                if (matches) {
                    return [matches[1]];
                }
                return false;
            },
            change: true,
            prev: ['ifdef', 'ifndef', 'if', 'elif'],
            next: ['endif']
        },
        endif: {
            parse: function (text) {
                //#endif
                var matches = text.match(/^\/\/\#(endif)$/);
                if (matches) {
                    return [matches[1]];
                }
                return false;
            },
            change: true,
            prev: ['ifdef', 'ifndef', 'if', 'elif', 'else'],
            next: false
        },
        _const: {
            parse: function (text) {
                //@TODO Multiple constants
                //console.log(/*#__LINE__*/'');
                var matches = text.match(/\/\*#([a-zA-Z_]+)\*\//);
                if (matches) {
                    return ['_const', matches[1]];
                }
                return false;
            },
            change: false,
            prev: false,
            next: false
        },
        macro: {
            parse: function (text) {
                // /*#macro getSocket ( number, second ) {
                // /*#macro getSocket(number,second){
                var matches = text.match(/^\/\*#(macro) ([a-zA-Z_]+) *\(([a-zA-Z_ ,]*)\) *\{$/);
                if (matches) {
                    return [matches[1], matches[2], matches[3]];
                }
                return false;
            },
            change: false,
            prev: false,
            next: false
        },
        macro_end: {
            parse: function (text) {
                if (text == '}#*/') {
                    return ['endMacro'];
                }
                return false;
            },
            change: false,
            prev: false,
            next: false
        },
        macro_call: {
            parse: function (text) {
                //#@getSocket ( 5 ) {
                //#@getSocket(5) {
                //#@getSocket(5){
                var matches = text.match(/^\/\/#@(getSocket) *\(([a-zA-Z0-9_ ,+\-\*\/]*)\) *\{$/);
                if (matches) {
                    return ['callMacro', matches[1], matches[2]];
                }
                return false;
            },
            change: true,
            prev: false,
            next: ['macro_end_call']
        },
        macro_end_call: {
            parse: function (text) {
                if (text == '//#}@') {
                    return ['endCallMacro'];
                }
                return false;
            },
            change: true,
            prev: 'macro_call',
            next: false
        }
    };

    this.allTokens = [];
    for (var t in this.tokens) {
        if (this.tokens.hasOwnProperty(t) && t != 'start') {
            this.allTokens.push(t);
        }
    }
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
    },
    parse: function (code) {
        this.code = code.split('\n');
        for (var len = this.code.length; this.simbols.__LINE__ < len; this.simbols.__LINE__++) {
            var line = this.code[this.simbols.__LINE__];
            if (line.indexOf('#') == -1) {
                continue;
            }

            var token = this.getToken(line);
            console.log('--------------------------');
            console.log(token);
            console.log(this.simbols.__LINE__ + ':', line);
        }
    },
    // directives
    define: function (varName, value) {
        if (varName in this.simbols) {
            this.error('Cannot redeclare constant ' + varName + '.');
        }

        this.simbols[varName] = value;
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
        console.log(message + ' Error at line ' + (this.simbols.__LINE__ + 1) + ' in ' + this.filename);
        process.exit(1);
    },
    include: function () {
        //
    },
    callMacro: function () {
        //
    }
};
