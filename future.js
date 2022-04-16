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


class FirstOrderStructure {

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

	constructor(firstOrderStructure, firstOrderAssignment) {

		this.firstOrderStructure = firstOrderStructure
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
		return this.firstOrderStructure.interpret(node.constantSymbol)
	}


	evaluateVariable(node) {
		return this.firstOrderAssignment.get(node.variableSymbol)
	}


	evaluateArguments(node) {
		return node.arguments.map(this.evaluate.bind(this))
	}

	
	evaluateFunction(node) {

		const evaluatedFunction = this.firstOrderStructure.interpret(node.functionSymbol)
		const evaluatedArguments = this.evaluateArguments(node.functionArguments)

		return evaluatedFunction(...evaluatedArguments)
	}


	evaluatePredicate(node) {
		
		const evaluatedPredicate = this.firstOrderStructure.interpret(node.predicateSymbol)
		const evaluatedArguments = this.evaluateArguments(node.predicateArguments)

		return evaluatedPredicate(...evaluatedArguments)
	}


	evaluateUnary(node) {
		return !this.evaluate(node.formula)
	}

	
	evaluateBinary(node) {

		const { operator, leftFormula, rightFormula } = node
		const { operatorSymbols } = this.firstOrderStructure.firstOrderLanguage
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

		for (let value of this.firstOrderStructure.domain) {
			
			this.firstOrderAssignment.set(node.variable.variableSymbol, value)
			
			if (this.evaluate(node.formula)) {
		
				this.existentialAssignment = {...this.firstOrderAssignment.variableMap}
				return true

			}
		}

		return false
	}


	evaluateUniversal(node) {

		for (let value of this.firstOrderStructure.domain) {

			this.firstOrderAssignment.set(node.variable.variableSymbol, value)

			if (! this.evaluate(node.formula)) {
		
				this.universalAssignment = {...this.firstOrderAssignment.variableMap}
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
		const structure = new FirstOrderStructure(language, domain, constantsMap, functionsMap, predicatesMap)
		const parser = new FirstOrderParser(language)

		this.language = language
		this.structure = structure
		this.parser = parser
	}


	evaluate(string, assignment) {

		const evaluator = new FirstOrderEvaluator(this.structure, assignment)
		const node = this.parser.parse(string)

		return [evaluator.evaluate(node), evaluator]
	}
}


function mapDomain(domain) {
	return Object.fromEntries(domain.map(element => [element, element]))
}


folExample = new FirstOrderLogic(domain=[0,1,2,3,4], variableSymbols='xyz', constants=mapDomain([0,1,2,3,4]), functions={

    P(x, y) {
        return x + y
    },
    D(x, y) {
        return x - y
    },
    S(x) {
        return x + 1
    },
    N(x) {
        return x
    },
    I(x) {
        return -x
    }
},
predicates={
    L(x,y) {
        return x < y
    },
    G(x,y) {
        return x > y
    },
    M(x,y) {
        return x === y
    }
}
)


// graphs

class Graph {

	constructor() {
		this.nodes = {}
	}


	addNode(key, value=null) {

		this.nodes[key] = {
			value,
			edges: new Set()			
		}
	}


	removeNode(key) {
		delete this.nodes[key]
	}


	addEdge(leftKey, rightKey) {
		this.nodes[leftKey].edges.add(rightKey)
	}


	removeEdge(leftKey, rightKey) {
		this.nodes[leftKey].edges.delete(rightKey)
	}

	hasEdge(leftKey, rightKey) {
		return !!this.nodes[leftKey]?.edges.has(rightKey)
	}


	get keys() {
		return Object.keys(this.nodes)
	}
}


function createGraph(nodes, edges) {
	const graph = new Graph()

	nodes.forEach(key => graph.addNode(key))
	edges.forEach(keys => graph.addEdge(...keys))

	return graph
}


function createGraphFirstOrderModel(graph, predicatesMap={}, functionsMap={}, constantsMap={}, variables='abcdefgxyz') {

	// add the edge relation

	predicatesMap.C = function(x, y) {
		return graph.hasEdge(x, y)
	}

	// add the equality relation

	predicatesMap.M = function(x, y) {
		return x === y
	}


	// make the domain the set of graph nodes.

	const domain = graph.keys


	// create the model.

	const system = new FirstOrderLogic(domain, variables, constantsMap, functionsMap, predicatesMap)

	return system
}

Parsers.graphFromTuples = function(tuples) {

	const edges = tuples.split(/\)\s*,\s*/).map(pairString => pairString.replace('(', '').replace(')', ''))
		.map(pairString => pairString.split(/\s*,\s*/))
		.map(pair => [pair[0].replaceAll(/\W/g,''), pair[1].replaceAll(/\W/g, '')])

	const nodes = new Set(edges.join('').replaceAll(/\W/g, ''))

	return createGraph(nodes, edges)
}














// propositional logic

class PropositionalLanguage {

	constructor(variableSymbols='ABCDEFGHIJKLMNOPQRSTUVWXYZ', operatorSymbols='^v>') {

		this.variableSymbols = variableSymbols
		this.operatorSymbols = operatorSymbols
	}
}


class PropositionalNode {

	constructor(type, attributes) {
		Object.assign(this, { type }, attributes)
	}
}



class PropositionalParser {

	constructor(propositionalLanguage) {

		this.propositionalLanguage = propositionalLanguage
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


	UnaryOperator() {
		return this.Match('-')
	}


	Operator() {
		return this.Match(this.propositionalLanguage.operatorSymbols)
	}


	VariableSymbol() {
		return this.Match(this.propositionalLanguage.variableSymbols)
	}


	Proposition() {
		return new PropositionalNode('Proposition', {
			variableSymbol: this.VariableSymbol()
		})
	}


	Unary() {
		return new PropositionalNode('Unary', {
			operator: this.UnaryOperator(),
			formula: this.Formula()
		})
	}


	Binary() {
		this.LeftBrace()

		const leftFormula = this.Formula()
		const operator = this.Operator()
		const rightFormula = this.Formula()

		return new PropositionalNode('Binary', {
			operator,
			leftFormula,
			rightFormula
		})
	}


	Formula() {
		return this.skip('Proposition')
			|| this.skip('Unary')
			|| this.Binary()
	}


	parse(string) {
		this.use(string)

		return this.Formula()
	}
}


class PropositionalAssignment {

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



class PropositionalEvaluator {

	constructor(propositionalLanguage) {

		this.propositionalLanguage = propositionalLanguage
		this.propositionalAssignment = new PropositionalAssignment
	}


	assign(variableMap) {
		Object.assign(this.propositionalAssignment.variableMap, variableMap)
	}


	evaluate(node) {

		if (node.type === 'Proposition') return this.propositionalAssignment.get(node.variableSymbol)
		if (node.type === 'Unary') return !this.evaluate(node.formula)
		if (node.type === 'Binary') return this.evaluateBinary(node)
	}


	evaluateBinary({ operator, leftFormula, rightFormula }) {

		const [ conjunction, disjunction, implication ] = this.propositionalLanguage.operatorSymbols

		if (operator === conjunction) return this.evaluate(leftFormula) && this.evaluate(rightFormula)
		if (operator === disjunction) return this.evaluate(leftFormula) || this.evaluate(rightFormula)
		if (operator === implication) return !this.evaluate(leftFormula) || this.evaluate(rightFormula)
	}
}


class PropositionalLogic {

	constructor(variableSymbols) {

		const language = new PropositionalLanguage(variableSymbols)
		const parser = new PropositionalParser(language)
		const evaluator = new PropositionalEvaluator(language)

		this.langauge = language
		this.parser = parser
		this.evaluator = evaluator
	}


	evaluate(string, variableMap) {
		
		this.evaluator.assign(variableMap)

		const node = this.parser.parse(string)
		const value = this.evaluator.evaluate(node)

		return value
	}	
}


// modal logic

class ModalLanguage extends PropositionalLanguage {

	constructor(modalitySymbols='?!', variableSymbols, operatorSymbols) {

		super(variableSymbols, operatorSymbols)
		this.modalitySymbols = modalitySymbols
	}
}


class ModalParser extends PropositionalParser {

	ModalitySymbol() {
		return this.Match(this.propositionalLanguage.modalitySymbols)
	}


	Modality() {
		return new PropositionalNode('Modality', {

			modalitySymbol: this.ModalitySymbol(),
			formula: this.Formula()
		})
	}


	Formula() {
		return this.skip('Modality')
			|| this.skip('Proposition')
			|| this.skip('Unary')
			|| this.Binary()
	}
}


// Kripke semantics (yes this is just a copy and paste of Graph, since that's all a Kripke frame is).

class ModalFrame {

	constructor(keys, edges) {
		this.nodes = {}

		keys?.forEach(key => this.addNode(key))
		edges?.forEach(edge => this.addEdge(...edge))
	}


	addNode(key, value=null) {
		this.nodes[key] = new Set()
	}


	removeNode(key) {
		delete this.nodes[key]
	}


	addEdge(leftKey, rightKey) {
		this.nodes[leftKey].add(rightKey)
	}


	removeEdge(leftKey, rightKey) {
		this.nodes[leftKey].delete(rightKey)
	}

	hasEdge(leftKey, rightKey) {
		return !!this.nodes[leftKey]?.has(rightKey)
	}


	get keys() {
		return Object.keys(this.nodes)
	}
}


// Declares which variables are true in which worlds.
// Takes in a node key and returns a set of variable symbols.
// It differs from regular assignments only in regard to its domain and range.

class ModalAssignment extends PropositionalAssignment {

	get(perspectiveKey, variableSymbol) {
		return this.variableMap[variableSymbol]?.has(perspectiveKey)
	}
}


class ModalEvaluator {

	constructor(modalLanguage, modalFrame, modalAssignment) {

		this.modalLanguage = modalLanguage
		this.modalFrame = modalFrame
		this.modalAssignment = modalAssignment
	}


	evaluate(node, perspective) {

		if (node.type === 'Proposition') return this.modalAssignment.get(perspective, node.variableSymbol)
		if (node.type === 'Unary') return !this.evaluate(node.formula, perspective)
		if (node.type === 'Binary') return this.evaluateBinary(node, perspective)
		if (node.type === 'Modality') return this.evaluateModality(node, perspective)
	}


	evaluateBinary({ operator, leftFormula, rightFormula }, perspective) {

		const [ conjunction, disjunction, implication ] = this.modalLanguage.operatorSymbols

		if (operator === conjunction) return this.evaluate(leftFormula, perspective) && this.evaluate(rightFormula, perspective)
		if (operator === disjunction) return this.evaluate(leftFormula, perspective) || this.evaluate(rightFormula, perspective)
		if (operator === implication) return !this.evaluate(leftFormula, perspective) || this.evaluate(rightFormula, perspective)
	}


	evaluateModality({ modalitySymbol, formula }, perspective) {
		const [ possibility, neccessity ] = this.modalLanguage.modalitySymbols

		if (modalitySymbol === possibility) return this.evaluatePossibility(formula, perspective)
		if (modalitySymbol === neccessity) return this.evaluateNeccessity(formula, perspective)
	}


	evaluatePossibility(node, perspective) {

		for (let key of this.modalFrame.keys) {

			if (this.modalFrame.hasEdge(perspective, key)) {
				
				const value = this.evaluate(node, key)
				if (value) return true
			}
		}

		return false
	}


	evaluateNeccessity(node, perspective) {

		for (let key of this.modalFrame.keys) {

			if (this.modalFrame.hasEdge(perspective, key)) {

				const value = this.evaluate(node, key)
				if (!value) return false
			}
		}

		return true
	}
}


class ModalLogic { 

	constructor(nodes, edges, variableMap={}, variableSymbols, modalitySymbols) {

		this.language = new ModalLanguage(modalitySymbols, variableSymbols)
		this.parser = new ModalParser(this.language)
		this.frame = new ModalFrame(nodes, edges)
		this.assignment = new ModalAssignment(variableMap)
		this.evaluator = new ModalEvaluator(this.language, this.frame, this.assignment)
	}


	assign(variableMap) {
		Object.assign(this.assignment.variableMap, variableMap)
	}


	evaluate(string, perspectiveKey) {

		const node = this.parser.parse(string)
		const value = this.evaluator.evaluate(node, perspectiveKey)

		return value
	}
}
