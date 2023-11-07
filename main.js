const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const winston = require('winston');
const vm = require('vm');
const fs = require('fs');


class DynamicChallengeExtractor {
    constructor(
        filePath,
        logLevel = "debug"
    ) {
        this.filePath = filePath;
        this.logger = winston.createLogger({
            // Define the levels with custom colors
            levels: winston.config.npm.levels,
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.timestamp({
                    format: 'HH:mm:ss:SSS'
                }),
                winston.format.printf(info => `${info.timestamp} | ${info.message}`)
            ),
            transports: [
                new winston.transports.Console({
                    level: logLevel, // Only log messages with a severity of 'info' or higher
                })
            ]
        });

        this.code = fs.readFileSync(filePath, 'utf8');
        this.ast = parser.parse(this.code, {
            sourceType: 'module'
        });
        this.sandbox = {
            result: {}
        };
        this.checkerFunctionName = null;
        this.possibleFunctions = {};
        this.variableNameToFind = null;
        this.rightIdentifier = null;
        this.rightIdentifierCode = null;
        this.decryptFunctionAssociation = null;
        this.decryptFunctionName = null;
        this.listFunctionName = null;
        this.listFunctionCode = null;
        this.finalCode = '';
        this.extractPossibleFunctions();
        this.logger.debug(`1. Extracted ${Object.keys(this.possibleFunctions).length} possible functions, and found "${this.checkerFunctionName}" as the checker function.`)
        this.extractRightIdentifierDeclaration();
        this.logger.debug(`2. Found decryption function name: ${this.decryptFunctionName}`)
        this.extractDecryptionFunctions();
        this.logger.debug(`3. Found list function name: "${this.listFunctionName}", extracted the code and shuffled`)
        this.extractFinalFunction();
        this.logger.debug(`4. Identified ${this.key} as the right builder function`);
        this.builder = null;
        eval(this.finalCode);
        this.logger.debug(`Extracted function code: \n${this.builder.toString()}`);
    }

    extractPossibleFunctions() {
        const self = this;
        traverse(this.ast, {
            FunctionDeclaration(path) {
                path.traverse({
                    BlockStatement(blockPath) {
                        blockPath.traverse({
                            TryStatement(tryPath) {
                                tryPath.traverse({
                                    BlockStatement(innerBlockPath) {
                                        innerBlockPath.traverse({
                                            IfStatement(ifPath) {
                                                const test = ifPath.node.test;
                                                if (
                                                    test.type === 'CallExpression' &&
                                                    test.arguments.length === 1
                                                ) {
                                                    let argument;
                                                    if (test.arguments[0].type === 'StringLiteral') {
                                                        argument = test.arguments[0].value;
                                                    } else if (test.arguments[0].type === 'CallExpression' && test.arguments[0].arguments.length === 1) {
                                                        const binding = ifPath.scope.getBinding(test.arguments[0].arguments[0].name);
                                                        argument = binding.path.node.init.value;

                                                        if (!self.checkerFunctionName) {
                                                            self.checkerFunctionName = ifPath.node.test.callee.name;
                                                        }
                                                    } else {
                                                        // continue with the next iteration
                                                        return;
                                                    }
                                                    const subFunction = ifPath.node.consequent.expression.arguments[0].callee.object;
                                                    const returnCode = generate(subFunction).code;
                                                    // Save it in the dictionary with the 'to' argument as the key
                                                    self.possibleFunctions[argument] = returnCode;
                                                }
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
            }
        });
    }

    extractRightIdentifierDeclaration() {
        const self = this;
        traverse(this.ast, {
            FunctionDeclaration(path) {
                if (
                    self.checkerFunctionName === path.node.id.name
                ) {
                    self.variableNameToFind = path.node.body.body[0].argument.left.name;
                }
            }
        });

        traverse(this.ast, {
            AssignmentExpression(path) {
                // We are interested in assignments to our identifier
                if (path.node.left.name === self.variableNameToFind) {
                    const right = path.node.right;
                    // Check if the right side is a CallExpression
                    if (right.type === 'CallExpression') {
                        self.sandbox[
                            right.callee.body.body[1].argument.callee.object.callee.object.callee.object.callee.name
                        ] = atob;
                        self.vm = vm.createContext(self.sandbox);
                        self.rightIdentifierCode = generate(right).code;
                        // Look for the argument that is a CallExpression with a numeric literal
                        right.arguments.forEach(arg => {
                            if (arg.type === 'CallExpression' && arg.arguments.length === 1) {
                                self.decryptFunctionAssociation = arg.callee.name;
                            }
                        });
                        // this expression is contained inside a function declaration, we need to get the
                        // full code of it and find the first variable declaration in it
                        const functionDeclaration = path.findParent(path => path.isFunctionDeclaration());

                        // get the first variable declaration
                        const variableDeclaration = functionDeclaration.node.body.body.find(statement => statement.type === 'VariableDeclaration');
                        // get the right side of the first variable declaration
                        self.decryptFunctionName = variableDeclaration.declarations[0].init.name;
                        path.stop();
                    }
                }
            }
        });


    }

    extractDecryptionFunctions() {
        const self = this;
        traverse(self.ast, {
            FunctionDeclaration(path) {
                if (
                    path.node.id.name === self.decryptFunctionName
                ) {
                    vm.runInContext(
                        generate(path.node).code,
                        self.sandbox
                    )
                    path.traverse({
                        BlockStatement(blockPath) {
                            blockPath.traverse({
                                VariableDeclarator(declaratorPath) {
                                    self.listFunctionName = declaratorPath.node.init.callee.name;
                                }
                            });
                        }
                    });
                    path.stop()
                }
            }
        });

        traverse(self.ast, {
            FunctionDeclaration(path) {
                if (
                    path.node.id.name === self.listFunctionName
                ) {
                    self.listFunctionCode = path.node;
                    vm.runInContext(generate(self.listFunctionCode).code, self.sandbox);
                }
            },
            ExpressionStatement(path) {
                if (
                    path.node.expression.type === 'UnaryExpression' &&
                    path.node.expression.operator == '!' &&
                    path.node.expression.argument.arguments.length == 1 &&
                    path.node.expression.argument.arguments[0].name == self.listFunctionName
                ) {
                    vm.runInContext(generate(path.node).code, self.sandbox);
                }
            }
        })
    }

    extractFinalFunction() {
        Object.keys(this.possibleFunctions).forEach(key => {
            if (!isNaN(key)) {
                this.possibleFunctions[
                    vm.runInContext(`${this.decryptFunctionName}(${key})`, this.sandbox)
                ] = this.possibleFunctions[key];
                delete this.possibleFunctions[key];
            }
        });

        vm.runInContext(`
        let ${this.decryptFunctionAssociation} = ${this.decryptFunctionName};
        result.mainKey = ${this.rightIdentifierCode};
        `, this.sandbox);

        this.key = this.sandbox.result.mainKey;
        this.finalCode = `this.builder = ${this.possibleFunctions[this.sandbox.result.mainKey]}`
    }


}

new DynamicChallengeExtractor(
    process.argv[2] || './script.js'
);