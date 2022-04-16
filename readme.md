# First-order Logic

This library implements first-order logic in JavaScript, with an emphasis on semantic accuracy. It attempts to closely 
replicate the set-theoretic formalisation of first-order logic.


## Supported Concepts 

| Concept                                                                                          | Implementation                                                                                                                    |
|--------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| [First Order Language](https://en.wikipedia.org/wiki/First-order_logic#Syntax)                   | `FirstOrderLanguage(constantSymbols, variableSymbols, functionSymbols, predicateSymbols)`, `FirstOrderParser(firstOrderLanguage)` |
| [First Order Structure](https://en.wikipedia.org/wiki/First-order_logic#Semantics)               | `FirstOrderStructure(firstOrderLanguage, domain, constantsMap, functionsMap, predicatesMap)`                                      |
| [Interpreation Function](https://en.wikipedia.org/wiki/Interpretation_(logic))                   | `FirstOrderStructure.interpret(symbol)`                                                                                           |
| [Domain Of Discourse](https://en.wikipedia.org/wiki/Domain_of_discourse)                         | `FirstOrderStructure.domain`                                                                                                      |
| [Variable Binding](https://en.wikipedia.org/wiki/First-order_logic#Free_and_bound_variables)     | `FirstOrderAssignment(?variableMap)`                                                                                              |
| [Formula Evaluation](https://en.wikipedia.org/wiki/First-order_logic#Free_and_bound_variables)   | `FirstOrderEvaluator(firstOrderStructure, ?firstOrderAssignment)`                                                                 |

## Usage

### Creating a First-Order System

In this example we create a first-order logic for modulo-10 arithmetic.

```js
// The domain of discourse.

const domain = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])


// Variables.

const variables = ['x', 'y', 'z', 'a', 'b', 'c']


// Mapping between constant symbols and their interpretations.

const constantsMap = {
  0: 0,
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9
}


// Mapping between function symbols and their interpretations.

function mod10(n) {
    return ((n % 10) + 10) % 10
}


const functionsMap = {

  // Addition.
  
  F(x, y) {
    return mod10(x + y)
  },
  
  // Subtraction.
  
  G(x, y) {
    return mod10(x - y)
  },
  
  // Successor relation.
  
  S(x) {
    return mod10(x + 1)
  },
  
  // Predecessor
  
  P(x) {
    return mod10(x - 1)
  },
  
  // Additive inverse.
  
  I(x) {
    return mod10(-x)
  }
}


// Mapping between predicates and their interpretations.

const predicatesMap = {

  // Equality in the domain.
  
  M(x, y) {
    return x === y
  },
  
  // Less-than relation.
  
  L(x, y) {
    return x < y
  }
}


// Finally, create the first-order system.

const system = new FirstOrderLogic(
  domain,
  variables,
  constantsMap,
  functionsMap,
  predicatesMap
)
```

### Evaluating Formulas

For all `x`, there is a `y` such that `y` is the successor of `x`. This should be true.

```js
system.evaluate('AxEyM(y,S(x))') // true
```

There is no smallest `x`. This should be false.

```js
system.evaluate('-ExAy(-M(x,y)>L(x,y))') // false
```

The successor of the predecessor of `x` is equal to `x`. This should be true.

```js
system.evaluate('AxM(S(P(x)),x)') // true
```

The successor of the largest element of the domain is the smallest element of the domain. This should be true.

```js
system.evaluate('ExEy((Az(-M(x,y)>L(x,z))^Az(-M(y,z)>L(z,y)))>M(S(y),x))') // true
```

There is an element which when summed with its additive inverse, results in 1. This should be false.

```js
system.evaluate('ExM(1,F(x,I(x)))') // false
```

Any element summed with its additive inverse results in 0. This should be true.

```js
system.evaluate('AxM(0,F(x,I(x)))') // true
```

There is an element which is its own additive inverse. This should be true, namely on `x=0` and `x=5`.

```js
system.evaluate('ExM(x,I(x))') // true
```
