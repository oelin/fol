class FirstOrderLanguage {

	constructor(constantSymbols, variableSymbols, functionSymbols, predicateSymbols, operatorSymbols='^v>') {

		this.constantSymbols = constantSymbols
		this.variableSymbols = variableSymbols
		this.functionSymbols = functionSymbols
		this.predicateSymbols = predicateSymbols
		this.operatorSymbols = operatorSymbols
	}
}


class FirstOrderNode {

	constructor(type, attributes) {
		Object.assign(this, { type }, attributes)
	}


	toString() {
		// TODO
	}
}


class FirstOrderParser {

	constructor(firstOrderLanguage) {

		this.firstOrderLanguage = firstOrderLanguage
		this.unconsumed = ''
	}


	use(string) {
		this.unconsumed = string
	}


	// Attempt to parse and return true if successful.

	is(parser, ...a) {

		const revertUnconsumed = this.unconsumed
		const yes = !!this.skip(parser, ...a)

		this.use(revertUnconsumed)
		return yes
	}


	// Attempt to parse and revert to previous unconsumed string on failure.

	skip(parser, ...a) {
		const revertUnconsumed = this.unconsumed

		try {
			return this[parser](...a)
		} catch {
			this.use(revertUnconsumed)
		}		
	}


	// Throw a syntax error due to a parsing failure.

	Failure(message) {
		throw new SyntaxError(message)
	}


	// Parse any of the specified characters.

	Match(characters) {
		const firstCharacter = this.unconsumed[0]

		if (this.unconsumed && characters.includes(firstCharacter)) {
			this.use(this.unconsumed.slice(1))

			return firstCharacter
		}

		return this.Failure(`Unexpected character ${firstCharacter}`)
	}


	// Parse terminals...

	LeftBrace() {
		return this.Match('(')
	}


	RightBrace() {
		return this.Match(')')
	}


	Comma() {
		return this.Match(',')
	}


	Quantifier() {
		return this.Match('AE')
	}


	UnaryOperator() {
		return this.Match('-')
	}


	Operator() {
		return this.Match(this.firstOrderLanguage.operatorSymbols)
	}


	ConstantSymbol() {
		return this.Match(this.firstOrderLanguage.constantSymbols)
	}


	VariableSymbol() {
		return this.Match(this.firstOrderLanguage.variableSymbols)
	}


	FunctionSymbol() {
		return this.Match(this.firstOrderLanguage.functionSymbols)
	}


	PredicateSymbol() {
		return this.Match(this.firstOrderLanguage.predicateSymbols)
	}


	// Parse literals...

	Constant() {
		return new FirstOrderNode('Constant', {
			constantSymbol: this.ConstantSymbol()
		})
	}


	Variable() {
		return new FirstOrderNode('Variable', {
			variableSymbol: this.VariableSymbol()
		})
	}


	Arguments() {
		const list = []

		this.LeftBrace()

		while (this.is('Literal')) {

			list.push(this.Literal())
			this.skip('Comma')
		}

		this.RightBrace()

		return new FirstOrderNode('Arguments', {
			arguments: list
		})

	}


	Function() {

		const functionSymbol = this.FunctionSymbol()
		const functionArguments = this.Arguments()		

		return new FirstOrderNode('Function', {
			functionSymbol,
			functionArguments
		})
	}


	Literal() {
		return this.skip('Constant')
			|| this.skip('Variable') 
			|| this.Function()
	}


	// Parse predicates.

	Predicate() {
		const predicateSymbol = this.PredicateSymbol()
		const predicateArguments = this.Arguments() 

		return new FirstOrderNode('Predicate', {
			predicateSymbol,
			predicateArguments
		})
	}


	// Parse primaries...

	Unary() {
		const operator = this.UnaryOperator()
		const formula = this.Formula()

		return new FirstOrderNode('Unary', {
			operator,
			formula
		})
	}


	Binary() {
		this.LeftBrace()

		const leftFormula = this.Formula()
		const operator = this.Operator()
		const rightFormula = this.Formula()

		this.RightBrace()

		return new FirstOrderNode('Binary', {
			operator,
			leftFormula,
			rightFormula
		})
	}


	Primary() {
		return this.skip('Unary') || this.Binary()
	}


	// Parse quantified formulas.

	Quantified() {
		const quantifier = this.Quantifier()
		const variable = this.Variable()
		const formula = this.Formula()

		return new FirstOrderNode('Quantified', {
			quantifier,
			variable,
			formula
		})		
	}


	// Parse formulas.

	Formula() {
		return this.skip('Predicate')
			|| this.skip('Primary')
			|| this.Quantified()
	}


	// Root parser.

	parse(string) {
		this.use(string)

		return this.Formula()
	}
}


class FirstOrderAssignment {

	constructor(variableMap={}) {
		this.variableMap = variableMap
	}

	set(variableSymbol, variableValue) {
		this.variableMap[variableSymbol] = variableValue	
	}

	get(variableSymbol) {
		return this.variableMap[variableSymbol]
	}
}


class FirstOrderModel {

	constructor(firstOrderLanguage, domain, constantsMap, functionsMap, predicatesMap) {

		this.firstOrderLanguage = firstOrderLanguage
		this.domain = new Set(domain)
		this.interpretation = {...constantsMap, ...functionsMap, ...predicatesMap}
	}


	interpret(symbol) {
		return this.interpretation[symbol]
	}

	
}


class FirstOrderEvaluator {

	constructor(firstOrderModel, firstOrderAssignment) {

		this.firstOrderModel = firstOrderModel
		this.firstOrderAssignment = firstOrderAssignment ?? new FirstOrderAssignment()
	}


	evaluate(node) {

		if (node.type === 'Constant') return this.evaluateConstant(node)
		if (node.type === 'Variable') return this.evaluateVariable(node)
		if (node.type === 'Arguments') return this.evaluateArguments(node)
		if (node.type === 'Function') return this.evaluateFunction(node)
		if (node.type === 'Predicate') return this.evaluatePredicate(node)
		if (node.type === 'Unary') return this.evaluateUnary(node)
		if (node.type === 'Binary') return this.evaluateBinary(node)
		if (node.type === 'Quantified') return this.evaluateQuantified(node)
	}


	evaluateConstant(node) {
		return this.firstOrderModel.interpret(node.constantSymbol)
	}


	evaluateVariable(node) {
		return this.firstOrderAssignment.get(node.variableSymbol)
	}


	evaluateArguments(node) {
		return node.arguments.map(this.evaluate.bind(this))
	}

	
	evaluateFunction(node) {

		const evaluatedFunction = this.firstOrderModel.interpret(node.functionSymbol)
		const evaluatedArguments = this.evaluateArguments(node.functionArguments)

		return evaluatedFunction(...evaluatedArguments)
	}


	evaluatePredicate(node) {
		
		const evaluatedPredicate = this.firstOrderModel.interpret(node.predicateSymbol)
		const evaluatedArguments = this.evaluateArguments(node.predicateArguments)

		return evaluatedPredicate(...evaluatedArguments)
	}


	evaluateUnary(node) {
		return !this.evaluate(node.formula)
	}

	
	evaluateBinary(node) {

		const { operator, leftFormula, rightFormula } = node
		const { operatorSymbols } = this.firstOrderModel.firstOrderLanguage
		const [ conjunction, disjunction, implication ] = operatorSymbols

		if (operator === conjunction) return this.evaluate(leftFormula) && this.evaluate(rightFormula)
		if (operator === disjunction) return this.evaluate(leftFormula) || this.evaluate(rightFormula)
		if (operator === implication) return !this.evaluate(leftFormula) || this.evaluate(rightFormula)	
	}


	evaluateQuantified(node) {

		if (node.quantifier === 'E') return this.evaluateExistential(node)
		if (node.quantifier === 'A') return this.evaluateUniversal(node)
	}


	evaluateExistential(node) {

		for (let value of this.firstOrderModel.domain) {
			
			this.firstOrderAssignment.set(node.variable.variableSymbol, value)
			
			if (this.evaluate(node.formula)) {
				return true
			}
		}

		return false
	}


	evaluateUniversal(node) {

		for (let value of this.firstOrderModel.domain) {

			this.firstOrderAssignment.set(node.variable.variableSymbol, value)

			if (! this.evaluate(node.formula)) {
				return false
			}
		}

		return true
	}
}


class FirstOrderLogic {

	constructor(domain, variables, constantsMap, functionsMap, predicatesMap) {

		const constants = Object.keys(constantsMap)
		const functions = Object.keys(functionsMap)
		const predicates = Object.keys(predicatesMap)

		const language = new FirstOrderLanguage(constants, variables, functions, predicates)
		const model = new FirstOrderModel(language, domain, constantsMap, functionsMap, predicatesMap)
		const parser = new FirstOrderParser(language)

		this.language = language
		this.model = model
		this.parser = parser
	}


	evaluate(string, assignment) {

		const evaluator = new FirstOrderEvaluator(this.model, assignment)
		const node = this.parser.parse(string)

		return evaluator.evaluate(node)
	}
}
