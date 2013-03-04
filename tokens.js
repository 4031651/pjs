module.exports = {
    start: {
        prev: false,
        next: false
    },
    define: {
        parse: function (text) {
            //#define TABLE_SIZE 100 * 5 / 20
            //#define TABLE_SIZE Test
            var matches = text.match(/^\/\/\#(define) ([a-zA-Z_]+) ([a-zA-Z_0-9 +\-\*\/]+)$/);
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