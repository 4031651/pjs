var assert = require('assert'),
    preprocessor = require('./lib/preprocessor'),
    compile = preprocessor.compile,
    PreprocessorError = preprocessor.PreprocessorError;

function pad(str, symbol, length) {
    while (str.length < length) {
        str += symbol;
    }
    return str;
}

function test(name, fn) {
    var padding = 48 - name.length;
    try {
        fn();
    } catch (e) {
        console.log('\033[31m' + name + ' \033[4;31m' + pad('', ' ', padding) + "\033[00m \033[1;31m[Fali]\033[00m");
        console.log('   \033[31m' + pad('', '─', 53) + '\033[00m');
        console.log('   ' + e.stack);
        console.log('   \033[31m' + pad('', '─', 53) + '\033[00m');
        return;
    }
    console.log('\033[40m' + name + ' \033[4;40m' + pad('', ' ', padding) + "\033[00m \033[1;40m[Pass]\033[00m");
}

function testDefine() {
    var code = '//#define TABLE_SIZE Te"s"t\n/*#TABLE_SIZE*/';
    assert.equal(compile(code), '"Te\\"s\\"t"');
    code = '//#define TABLE_SIZE 100\n/*#TABLE_SIZE*/';
    assert.equal(compile(code), 100);
    code = '//#define TABLE_SIZE';
    assert.throws(
        function () {
            compile(code, {throwError: true});
        },
        function (err) {
            return (err instanceof PreprocessorError) && err.message == 'Invalid expression "".';
        }
    );
    code += '    ';
    assert.throws(
        function () {
            compile(code, {throwError: true});
        },
        function (err) {
            return (err instanceof PreprocessorError) && err.message == 'Invalid expression "".';
        }
    );
}

function testConstUndef() {
    var code = '/*#TABLE_SIZE*/';
    assert.throws(
        function () {
            compile(code, {throwError: true});
        },
        function (err) {
            return (err instanceof PreprocessorError) && err.message == 'Trying to get undeclared constant TABLE_SIZE.';
        }
    );
}

function testUndef() {
    var code = '//#define TABLE_SIZE 100\n' +
               '//#undef TABLE_SIZE\n' +
               '/*#TABLE_SIZE*/';

    assert.throws(
        function () {
            compile(code, {throwError: true});
        },
        function (err) {
            return (err instanceof PreprocessorError) && err.message == 'Trying to get undeclared constant TABLE_SIZE.';
        }
    );
}

function testWrongUndef() {
    var code = '//#define TABLE_SIZE 100\n' +
               '//#undef TABLE_SIZE 50';

    assert.throws(
        function () {
            compile(code, {throwError: true});
        },
        function (err) {
            return (err instanceof PreprocessorError) && err.message == 'Unexpected clause " 50" after #undef.';
        }
    );
}

function testError() {
    var code = '//#error';
    assert.throws(
        function () {
            compile(code, {throwError: true});
        },
        function (err) {
            return (err instanceof PreprocessorError) && err.message == 'PreprocessorError';
        }
    );
    code = '//#error Some error message.';
    assert.throws(
        function () {
            compile(code, {throwError: true});
        },
        function (err) {
            return (err instanceof PreprocessorError) && err.message == 'Some error message.';
        }
    );
}

function testIfdef() {
    var code = '//#define TABLE_SIZE 100\n' +
               '//#ifdef TABLE_SIZE\n' +
               '    /*#TABLE_SIZE*/\n' +
               '//#endif';

    assert.equal(compile(code), 100);
}

function testIfdefUndef() {
    var code = '//#ifdef TABLE_SIZE\n' +
               '    /*#TABLE_SIZE*/\n' +
               '//#endif\n' +
               '"after ifdef"';

    assert.equal(compile(code), '"after ifdef"');
}

function testIfndef() {
    var code = '//#ifndef TABLE_SIZE\n' +
               '    "in ifndef"\n' +
               '//#endif';

    assert.equal(compile(code), '    "in ifndef"');
}

function testIfndefDef() {
    var code = '//#define TABLE_SIZE 100\n' +
               '//#ifndef TABLE_SIZE\n' +
               '    "in ifndef"\n' +
               '//#endif\n' +
               '"after ifndef"';

    assert.equal(compile(code), '"after ifndef"');
}

function testElse() {
    var code = '//#ifndef TABLE_SIZE\n' +
               '    "in ifndef"\n' +
               '//#else\n' +
               '    "in else"\n' +
               '//#endif';

    assert.equal(compile(code), '    "in ifndef"');
    code = '//#define TABLE_SIZE 100\n' + code;
    assert.equal(compile(code), '    "in else"');
}

function testExpressions() {
    //[#a-zA-Z_0-9 \.'"+\-\*\/<>=]
    // add
    var code = '//#define expr 1+1\n/*#expr*/';
    assert.equal(compile(code), 2);
    code = '//#define expr 1.1+1\n/*#expr*/';
    assert.equal(compile(code), 2.1);
    code = '//#define expr hello +word\n/*#expr*/';
    assert.equal(compile(code), '\"helloword\"');
    code = '//#define expr hello w+ ord\n/*#expr*/';
    assert.throws(
        function () {
            compile(code, {throwError: true});
        },
        function (err) {
            return (err instanceof PreprocessorError) && err.message == 'Invalid expression "hello w + ord".';
        }
    );
    // sub
    code = '//#define expr 1- 1\n/*#expr*/';
    assert.equal(compile(code), 0);
    code = '//#define expr 5.3- 1.2\n/*#expr*/';
    assert.equal(compile(code), 4.1);
    // mul
    code = '//#define expr 3 * 5\n/*#expr*/';
    assert.equal(compile(code), 15);
    code = '//#define expr 3.1 * 5\n/*#expr*/';
    assert.equal(compile(code), 15.5);
    // div
    code = '//#define expr 12 / 3 \n/*#expr*/';
    assert.equal(compile(code), 4);

    // =
    code = '//#define expr 12 = 3 \n/*#expr*/';
    assert.equal(compile(code), 'false');
    code = '//#define expr a = b \n/*#expr*/';
    assert.equal(compile(code), 'false');
    code = '//#define expr 12 = 12 \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr a = a \n/*#expr*/';
    assert.equal(compile(code), 'true');
    // !=
    code = '//#define expr 12 != 3 \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr a != b \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr a != a \n/*#expr*/';
    assert.equal(compile(code), 'false');
    // <
    code = '//#define expr 1 < 3 \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr a < b \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr 3 < 1 \n/*#expr*/';
    assert.equal(compile(code), 'false');
    code = '//#define expr b < a \n/*#expr*/';
    assert.equal(compile(code), 'false');
    code = '//#define expr 3 < 3 \n/*#expr*/';
    assert.equal(compile(code), 'false');
    code = '//#define expr c < c \n/*#expr*/';
    assert.equal(compile(code), 'false');
    // >
    code = '//#define expr 3.1 > .5 \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr b > a \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr .5 > 1 \n/*#expr*/';
    assert.equal(compile(code), 'false');
    code = '//#define expr a > b \n/*#expr*/';
    assert.equal(compile(code), 'false');
    code = '//#define expr .5 > .5 \n/*#expr*/';
    assert.equal(compile(code), 'false');
    code = '//#define expr c > c \n/*#expr*/';
    assert.equal(compile(code), 'false');
    // <=
    code = '//#define expr 3 <= 5 \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr a <= b \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr 3 <= 3 \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr a <= a \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr 2 <= 1 \n/*#expr*/';
    assert.equal(compile(code), 'false');
    code = '//#define expr b <= a \n/*#expr*/';
    assert.equal(compile(code), 'false');
    // >=
    code = '//#define expr 5 >= 3 \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr b >= a \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr 5 >= 5 \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr c >= c \n/*#expr*/';
    assert.equal(compile(code), 'true');
    code = '//#define expr 1 >= 2 \n/*#expr*/';
    assert.equal(compile(code), 'false');
    code = '//#define expr b >= d \n/*#expr*/';
    assert.equal(compile(code), 'false');
    // Invalid expression
    code = '//#define isNaN(3)';
    assert.throws(
        function () {
            compile(code, {throwError: true});
        },
        function (err) {
            return (err instanceof PreprocessorError) && err.message == 'Invalid expression "(3)".';
        }
    );
}

function testIfElifElse() {
    var code = '//#if #VAR = 1\n' +
               '    1\n' +
               '//#elif #VAR = 2\n' +
               '    2\n' +
               '//#elif#VAR = 3\n' +
               '    3\n' +
               '//#else\n' +
               '    #else\n' +
               '//#endif\n';
    assert.equal(compile('//#define VAR 1\n' + code), '    1\n');
    assert.equal(compile('//#define VAR 2\n' + code), '    2\n');
    assert.equal(compile('//#define VAR 3\n' + code), '    3\n');
    assert.equal(compile('//#define VAR 4\n' + code), '    #else\n');
}

test('#define', testDefine);
test('undefined constant', testConstUndef);
test('#undef', testUndef);
test('wrong #undef', testWrongUndef);
test('#error', testError);
test('#ifdef', testIfdef);
test('#ifdef undefined', testIfdefUndef);
test('#ifndef', testIfndef);
test('#ifndef defined', testIfndefDef);
test('#else', testElse);
test('expressions', testExpressions);
test('#if #elif #else', testIfElifElse);

console.log('\n\033[00m\033[1;40mDone.\033[00m\n');
