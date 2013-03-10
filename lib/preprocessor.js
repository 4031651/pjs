var path = require('path'),
    vm = require('vm');

exports.compile = function (code, options) {
    var preprocessor = new Preprocessor(options);

    var _code = preprocessor.compile(code);

    /*console.log('>>>>>>>>>>>>>>>>>>>>>')
    console.log(_code)
    console.log('<<<<<<<<<<<<<<<<<<<<<')*/

    return _code;
};

function parseType(str) {
    //float
    if (/^\d*\.\d+$/.test(str)) {
        return parseFloat(str);
    } else if (/^\d+$/.test(str)) {
        return parseInt(str, 10);
    }
    return str;
}

function Preprocessor(options) {
    options = options || {};
    options.node = typeof options.node == 'undefined' ? true : false;
    this.throwError = options.throwError;
    
    if (options.throwError) {
        //throw error
        this.setError = function (message) {
            throw new PreprocessorError(message, this.simbols.__LINE__ + 1, this.filename);
        };
    } else {
        //stop
        this.setError = function (message) {
            try {
                throw new Error();
            } catch (e) {
                console.log('\n>>> Error ' + this.allTrim(e.stack.split('\n')[3]) + '\n');
            }
            console.log("\033[1;31mPREPROCESSOR:\033[00m Error at line " + (this.simbols.__LINE__ + 1) + ' in ' + this.filename + '. ' + message);
            process.exit(1);
        };
    }

    var datetime = (new Date()).toUTCString()
            .split(', ')[1]
            .replace(/^(\d{2}) (\w{3}) (\d{4}) (\d{2}:\d{2}:\d{2}).* GMT$/, '$2 $1 $3,$4')
            .split(',');

    this.filename = options.filename || '';
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
        __DIR__ : path.dirname(this.filename),  // A string literal containing the presumed directory name of the source file being compiled.
        __FILE__: path.basename(this.filename), // A string literal containing the presumed name of the source file being compiled.
        __DATE__: datetime[0],             // A string literal in the form "Mmm dd yyyy" containing the date in which the compilation process began. (Nov 1 2005)
        __TIME__: datetime[1]              // A string literal in the form "hh:mm:ss" containing the time at which the compilation process began. (10:12:29)
    };
    if (options.node) {
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
            if (typeof this[token[0]] == 'function') {
                line = this[token[0]].apply(this, token.slice(1));
            } else {
                this.error('Unknown token "#' + token[0] + '".');
            }

            if (typeof line !== 'undefined') {
                this.parsedCode.push(line);
            }
        }
        return this.parsedCode.join("\n");
    },
    _has: function (varName) {
        return varName in this.simbols;
    },
    _formatVal: function (val) {
        return typeof val == 'string' ? '"' + val.replace(/"/g, '\\"') + '"' : val;
    },
    _expr: function (str) {
        if (!/^[#a-zA-Z_0-9 !\.'"+\-\*\/<>=]+$/.test(str)) {
            this.error('Invalid expression "' + str + '".');
        }
        var self = this, idx = 0,
            expr = [], vals = [];
         
        str = this.allTrim(str.replace(/(\+|-|\*|\/|>=|<=|!=|<|>|=)/g, ' $1 '));
        str.split(' ').forEach(function (p) {
            if (/^[+\-\*\/<>=!]+$/.test(p)) {
                // operators
                if (p == '=') {
                    expr.push('==');
                } else {
                    expr.push(p);
                }
            } else if (p.charAt(0) == '#') {
                // const
                var varName = p.substring(1);
                if (!self._has(varName)) {
                    self.error('Trying to get undeclared constant ' + varName + '.');
                }

                expr.push('vals[' + idx + ']');
                vals[idx] = self.simbols[varName];
                idx++;
            } else {
                //literal
                expr.push('vals[' + idx + ']');
                vals[idx] = parseType(p);
                idx++;
            }
        });

        var context = vm.createContext({
            vals: vals
        });
        try {
            vm.runInContext('var result = ' + expr.join(' ') + ';', context);
        } catch (e) {
            this.error('Invalid expression "' + str + '".');
        }
        return context.result;
    },
    // directives
    define: function (varName, expr) {
        if (this._has(varName)) {
            this.error('Cannot redeclare constant ' + varName + '.');
        }

        this.simbols[varName] = this._expr(expr);
    },
    undef: function (varName, params, line) {
        if (this.predefined.indexOf(varName) != -1) {
            this.error('Cannot undeclare predefined constant ' + varName + '.');
        } else if (params) {
            this.error('Unexpected clause "' + params + '" after #undef.');
        }

        delete this.simbols[varName];
    },
    _const: function (varName, line) {
        if (!this._has(varName)) {
            this.error('Trying to get undeclared constant ' + varName + '.');
        }

        return line.replace('/*#' + varName + '*/', this._formatVal(this.simbols[varName]));
    },
    error: function (message) {
        this.setError(message ? message.replace(/^\s+/, '') : '');
    },
    ifdef: function (varName) {
        if (this._has(varName)) {
            this.choosed = true;
            return;
        }
        this.skipNext = true;
    },
    ifndef: function (varName) {
        if (!this._has(varName)) {
            this.choosed = true;
            return;
        }
        this.skipNext = true;
    },
    'if': function (expr) {
        if (this._expr(expr)) {
            this.choosed = true;
            return;
        }
        this.skipNext = true;
    },
    elif: function (expr) {
        // check expression syntax
        var res = this._expr(expr);

        if (this.choosed) {
            this.skipNext = true;
            return;
        } else if (res) {
            this.skipNext = false;
            this.choosed = true;
            return;
        }
        this.skipNext = true;
    },
    'else': function () {
        if (!this.choosed) {
            this.skipNext = false;
            this.choosed = true;
            return;
        }
        this.skipNext = true;
    },
    endif: function () {
        this.choosed = false;
        this.skipNext = false;
    }
};

function PreprocessorError(msg, line, filename) {
    Error.apply(this, [msg]);
    Error.captureStackTrace(this, this);

    this.message = msg || 'PreprocessorError';
    this.line = line;
    this.filename = filename;
}

require('util').inherits(PreprocessorError, Error);

PreprocessorError.prototype.name = 'PreprocessorError';

exports.PreprocessorError = PreprocessorError;