module.exports = {
    start: {
        next: false
    },
    define: {
        parse: function (text) {
            //#define TABLE_SIZE 100 * 5 / 20
            //#define TABLE_SIZE Test
            var matches = text.match(/^\/\/\#(define) ([a-zA-Z_]+) ([a-zA-Z_0-9 '"+\-\*\/]+)$/);
            if (matches) {
                return [matches[1], matches[2], matches[3]];
            }
            return false;
        },
        change: false,
        next: false
    },
    undef: {
        parse: function (text) {
            //#undef TABLE_SIZE
            var matches = text.match(/^\/\/\#(undef) ([a-zA-Z_]+)([a-zA-Z_0-9 '"+\-\*\/]+)?$/);
            if (matches) {
                if (matches.length == 4) {
                    return [matches[1], matches[2], matches[3]];
                }
                return [matches[1], matches[2]];
            }
            return false;
        },
        change: false,
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
        next: ['elif', '_else', 'endif']
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
        next: ['elif', '_else', 'endif']
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
        next: ['elif', '_else', 'endif']
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
        next: ['elif', '_else', 'endif']
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
        change: true,
        next: ['macro_end']
    },
    macro_end: {
        parse: function (text) {
            if (text == '}#*/') {
                return ['endMacro'];
            }
            return false;
        },
        change: true,
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
        next: false
    }
};