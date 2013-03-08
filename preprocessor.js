var path = require('path');

exports.compile = function (code, options) {
    options.node = typeof options.node == 'undefined' ? true : false;
    var preprocessor = new Preprocessor(options.node, options.filename || '');

    var _code = preprocessor.compile(code);

    console.log('>>>>>>>>>>>>>>>>>>>>>')
    console.log(_code)
    console.log('<<<<<<<<<<<<<<<<<<<<<')

    return _code;
};

function Preprocessor(node, filename) {
    var datetime = (new Date()).toUTCString()
            .split(', ')[1]
            .replace(/^(\d{2}) (\w{3}) (\d{4}) (\d{2}:\d{2}:\d{2}).* GMT$/, '$2 $1 $3,$4')
            .split(',');

    this.filename = filename;
    this.code = null;
    this.parsedCode = [];
    //current token
    this.current = 'start';
    //skip to next control token
    this.skipNext = false;
    //one of blocks in if statemant is true 
    this.choosed = false;
    
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

Preprocessor.prototype = {
    constructor: Preprocessor,
    allTrim: function (str) {
        return str.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g, '').replace(/\s+/g, ' ');
    },
    getToken: function (line) {
        for (var i = 0, tname, token, result; i < this.allTokens.length; i++) {
            tname = this.allTokens[i];
            token = this.tokens[tname];
            result = token.parse(this.allTrim(line));
            if (result) {
                var next = this.tokens[this.current].next;

                if (token.change && next && next.indexOf(tname) == -1) {
                    this.error('Unexpected toket "' + tname + '", expected one of ' + next.join(', ') + '.');
                }
                
                if (!token.change && this.skipNext) {
                    return null;
                }

                if (token.change) {
                    this.current = tname;
                }
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
                if (!this.skipNext) {
                    this.parsedCode.push(line);
                }
                continue;
            }

            var token = this.getToken(line);
            if (!token) {
                if (!this.skipNext) {
                    this.parsedCode.push(line);
                }
                continue;
            }
            
            token.push(line);
            try {
                line = this[token[0]].apply(this, token.slice(1));
            } catch (e) {
                this.error('Unknown token "#' + token[0] + '".');
            }

            if (line !== false) {
                this.parsedCode.push(line);
            }
        }
        return this.parsedCode.join("\n");
    },
    _has: function (varName) {
        return varName in this.simbols;
    },
    // directives
    define: function (varName, value) {
        if (varName in this.simbols) {
            this.error('Cannot redeclare constant ' + varName + '.');
        }

        this.simbols[varName] = parseType(value);
        return false;
    },
    undef: function (varName, params) {
        if (this.predefined.indexOf(varName) != -1) {
            this.error('Cannot undeclare predefined constant ' + varName + '.');
        } else if (params) {
            this.error('Unexpected clause "' + this.simbols[varName] + '" after #undef.');
        }

        delete this.simbols[varName];
        return false;
    },
    _const: function (varName, line) {
        if (!(varName in this.simbols)) {
            this.error('Trying to get undeclared constant ' + varName + '.');
        }

        var val = typeof this.simbols[varName] == 'string' ? '"' + this.simbols[varName].replace(/"/g, '\\"') + '"' : this.simbols[varName];

        return line.replace('/*#' + varName + '*/', val);
    },
    error: function (message) {
        try {
            throw new Error();
        } catch (e) {
            console.log('\n>>> Error ' + this.allTrim(e.stack.split('\n')[2]) + '\n');
        }
        console.log("\033[1;31mPREPROCESSOR:\033[00m\ Error at line " + (this.simbols.__LINE__ + 1) + ' in ' + this.filename + '. ' + message);
        process.exit(1);
    },
    ifdef: function (varName) {
        if (this._has(varName)) {
            this.choosed = true;
            return false;
        }
        this.skipNext = true;
        return false;
    },
    ifndef: function (varName) {
        if (!this._has(varName)) {
            this.choosed = true;
            return false;
        }
        this.skipNext = true;
        return false;
    },
    endif: function () {
        this.choosed = false;
        this.skipNext = false;
        return false;
    }
};
