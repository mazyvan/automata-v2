let express = require('express')
let router = express.Router()
let Sequelize = require('sequelize')

const sequelize = new Sequelize('check_uni_automata', 'uni_automata', 'uni_automata123', {
  host: 'localhost',
  dialect: 'mysql',
  pool: {
    max: 5,
    min: 0,
    idle: 10000
  },
  logging: false
})

sequelize.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.\n')
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err)
    process.exit(1)
  })


/** 
 * MODEL: WORDS 
 */
const Word = sequelize.define('word', {
  name: {
    type: Sequelize.STRING(30),
    primaryKey: true
  },
  number: Sequelize.BOOLEAN,
  gender: Sequelize.BOOLEAN,
})

/** 
 * MODEL: TYPES
 */
const Type = sequelize.define('type', {
  name: Sequelize.STRING(15),
})

/**
 * DEFINE ASSOCIATIONS
 */
Word.belongsToMany(Type, { through: 'wordtype' })
Type.belongsToMany(Word, { through: 'wordtype' })

/**
 * RUN SYNC
 */
sequelize.sync()

/**
 * @param {Object} sentence 
 * @param {Object} startAt 
 * @return {Object} Regresa un objeto de este tipo {start: pos, end: pos}
 */
function tryToGetSintagmaVerbalPositions(sentence, startAt = 0) {
  if (!sentence[startAt].hasData()) return
  if (sentence[startAt].types.some(type => type == 'verb')) return { start: startAt, end: startAt + 1 }

  if (!sentence[startAt + 1] || !sentence[startAt + 1].hasData()) return
  if (sentence[startAt].types.some(type => type == 'negation') && sentence[startAt + 1].types.some(type => type == 'verb')) return { start: startAt, end: startAt + 2 }

}

/**
 * @param {Object} sentence
 * @param {Object} startAt 
 * @return {Object} Regresa un objeto de este tipo {start: pos, end: pos}
 */
function tryToGetSintagmaNominalPositions(sentence, startAt = 0) {
  if (!sentence[startAt] || !sentence[startAt].hasData()) return
  if (sentence[startAt].types.some(type => type == 'pronoun' || type == 'propernoun')) return { start: startAt, end: startAt + 1 }

  if (!sentence[startAt + 1] || !sentence[startAt + 1].hasData()) return
  if (
    (sentence[startAt].types.some(type => type == 'determiner')) &&
    (sentence[startAt + 1].types.some(type => type == 'noun')) &&
    (sentence[startAt].isSingular() == sentence[startAt + 1].isSingular()) &&
    (sentence[startAt].isMasculine() == sentence[startAt + 1].isMasculine())
  ) {
    return { start: startAt, end: startAt + 2 }
  }
  if (
    (sentence[startAt].types.some(type => type == 'numeral')) &&
    (sentence[startAt + 1].types.some(type => type == 'noun')) &&
    (sentence[startAt].isSingular() == sentence[startAt + 1].isSingular()) &&
    (sentence[startAt].isMasculine() == sentence[startAt + 1].isMasculine())
  ) {
    return { start: startAt, end: startAt + 2 }
  }
  if (
    (sentence[startAt].types.some(type => type == 'possessive')) &&
    (sentence[startAt + 1].types.some(type => type == 'noun')) &&
    (sentence[startAt].isSingular() == sentence[startAt + 1].isSingular()) &&
    (sentence[startAt].isMasculine() == sentence[startAt + 1].isMasculine())
  ) {
    return { start: startAt, end: startAt + 2 }
  }
}

/**
 * @param {Object} sentence
 * @param {Object} startAt 
 * @return {Object} Regresa un objeto de este tipo {start: pos, end: pos}
 */
function tryToGetSintagmaAdjetivalPositions(sentence, startAt = 0) {
  if (!sentence[startAt] || !sentence[startAt].hasData()) return { start: startAt, end: startAt }
  if (
    (sentence[startAt].types.some(type => type == 'adj')) &&
    (sentence[startAt - 1].types.some(type => type == 'copular')) &&
    (sentence[startAt - 1].isSingular() == sentence[startAt].isSingular()) &&
    (sentence[startAt - 1].isMasculine() == sentence[startAt].isMasculine())
  ) {
    return { start: startAt, end: startAt + 1 }
  }

  if (!sentence[startAt + 1] || !sentence[startAt + 1].hasData()) return { start: startAt, end: startAt }
  if (
    (sentence[startAt].types.some(type => type == 'quantifier')) &&
    (sentence[startAt + 1].types.some(type => type == 'adj')) &&
    (sentence[startAt].isSingular() == sentence[startAt + 1].isSingular()) &&
    (sentence[startAt].isMasculine() == sentence[startAt + 1].isMasculine())
  ) {
    return { start: startAt, end: startAt + 2 }
  }

  return { start: startAt, end: startAt }
}

/**
 * @param {Object} sentence
 * @param {Object} startAt 
 * @return {Object} Regresa un objeto de este tipo {start: pos, end: pos}
 */
function tryToGetSintagmaAdverbialPositions(sentence, startAt = 0) {
  if (!sentence[startAt] || !sentence[startAt].hasData()) return { start: startAt, end: startAt }
  if (
    (sentence[startAt].types.some(type => type == 'adv')) &&
    (sentence[startAt - 1].isSingular() == sentence[startAt].isSingular()) &&
    (sentence[startAt - 1].isMasculine() == sentence[startAt].isMasculine())
  ) {
    return { start: startAt, end: startAt + 1 }
  }

  if (!sentence[startAt + 1] || !sentence[startAt + 1].hasData()) return { start: startAt, end: startAt }
  if (sentence[startAt].types.some(type => type == 'quantifier') && sentence[startAt + 1].types.some(type => type == 'adv')) return { start: startAt, end: startAt + 2 }

  return { start: startAt, end: startAt }
}

/**
 * @param {Object} sentence
 * @param {Object} startAt 
 * @return {Object} Regresa un objeto de este tipo {start: pos, end: pos}
 */
function tryToGetSintagmaPreposicionalPositions(sentence, startAt = 0) {
  if (!sentence[startAt] || !sentence[startAt].hasData()) return { start: startAt, end: startAt }

  if (!sentence[startAt + 1] || !sentence[startAt + 1].hasData()) return { start: startAt, end: startAt }
  if (sentence[startAt].types.some(type => type == 'preposition')) {
    if (result = tryToGetSintagmaNominalPositions(sentence, startAt + 1)) return { start: startAt, end: result.end }
    if ((result = tryToGetSintagmaAdverbialPositions(sentence, startAt + 1)).end > startAt) return { start: startAt, end: result.end }
    if ((result = tryToGetSintagmaAdjetivalPositions(sentence, startAt + 1)).end > startAt) return { start: startAt, end: result.end }
    if ((result = tryToGetSintagmaPreposicionalPositions(sentence, startAt + 1)).end > startAt) return { start: startAt, end: result.end }
  }

  return { start: startAt, end: startAt }
}

/**
 * @param {Object} sentence
 * @param {Object} startAt 
 * @return {Object} Regresa un objeto de este tipo {start: pos, end: pos}
 */
function tryToGetAdyacentePositions(sentence, startAt = 0) {
  if (!sentence[startAt] || !sentence[startAt].hasData()) return { start: startAt, end: startAt }
  if (
    (sentence[startAt].types.some(type => type == 'adj')) &&
    (sentence[startAt - 1].isSingular() == sentence[startAt].isSingular()) &&
    (sentence[startAt - 1].isMasculine() == sentence[startAt].isMasculine())
  ) {
    return { start: startAt, end: startAt + 1 }
  }

  if (!sentence[startAt + 1] || !sentence[startAt + 1].hasData()) return { start: startAt, end: startAt }
  if (sentence[startAt].types.some(type => type == 'preposition') && sentence[startAt + 1].types.some(type => type == 'noun')) return { start: startAt, end: startAt + 2 }

  return { start: startAt, end: startAt }
}




/**
 * @param {String} sentence 
 * @return Compara y regresa un array de sintagmas
 */
function checkSentence(sentence, lastCheckedPosition = 0, detectedPartsOfSentence = []) {
  if (result = tryToGetSintagmaNominalPositions(sentence, lastCheckedPosition)) {
    if (detectedPartsOfSentence.slice(-1)[0] == 'SN') return { error: 'Una oración no puede tener 2 sintagmas nominales juntos' }
    detectedPartsOfSentence.push('SN')
    result = tryToGetAdyacentePositions(sentence, result.end)
    lastCheckedPosition = result.end
    if ((result = tryToGetSintagmaPreposicionalPositions(sentence, lastCheckedPosition)).end > lastCheckedPosition) {
      detectedPartsOfSentence.push('SPrep')
      lastCheckedPosition = result.end
    }

  } else if (result = tryToGetSintagmaVerbalPositions(sentence, lastCheckedPosition)) {
    if (detectedPartsOfSentence.slice(-1)[0] == 'SV') return { error: 'Una oración no puede tener 2 sintagmas verbales juntos' }
    detectedPartsOfSentence.push('SV')
    let oldResult = result
    result = tryToGetSintagmaAdjetivalPositions(sentence, result.end)
    if (result.end > oldResult.end) detectedPartsOfSentence.push('SAdj')
    else {
      result = tryToGetSintagmaAdverbialPositions(sentence, result.end)
      if (result.end > oldResult.end) detectedPartsOfSentence.push('SAdv')
    }
    lastCheckedPosition = result.end
    if ((result = tryToGetSintagmaPreposicionalPositions(sentence, lastCheckedPosition)).end > lastCheckedPosition) {
      detectedPartsOfSentence.push('SPrep')
      lastCheckedPosition = result.end
    }

  } else if ((result = tryToGetSintagmaPreposicionalPositions(sentence, lastCheckedPosition)).end > lastCheckedPosition) {
    detectedPartsOfSentence.push('SPrep')
    lastCheckedPosition = result.end

  } else {
    return { parts: detectedPartsOfSentence, lastCheckedPosition }
  }

  if (sentence.length > lastCheckedPosition) {
    return checkSentence(sentence, lastCheckedPosition, detectedPartsOfSentence)

  } else {
    return { parts: detectedPartsOfSentence, lastCheckedPosition }
  }

}






/* GET home page. */
router.get('/', function (req, res, next) {
  let sentence = req.query.sentence
  let words = []
  if (!sentence) return res.render('index')
  let numOfWords = sentence.split(' ').length
  let foundedWords = 0
  sentence.split(' ').forEach((word, index) => {
    Word.findOne({
      where: Sequelize.or(
        { name: word.toLowerCase() },
        { name: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() }
      ), include: [{ model: Type }]
    }).then(result => {
      words.push({
        index: index,
        name: word,
        hasData: () => (result) ? true : false,

        isPlural: () => (result) ? (result.dataValues.number == null) | result.dataValues.number : undefined,
        isSingular: () => (result) ? (result.dataValues.number == null) | !result.dataValues.number : undefined,

        isMasculine: () => (result) ? (result.dataValues.gender == null) | result.dataValues.gender : undefined,
        isFeminine: () => (result) ? (result.dataValues.gender == null) | !result.dataValues.gender : undefined,

        number: (result) ? result.dataValues.number : undefined,
        gender: (result) ? result.dataValues.gender : undefined,
        types: (result) ? result.dataValues.types.map(type => type.name) : undefined
      })
      foundedWords++
      if (foundedWords == numOfWords) {
        // Ordenamos las palabras
        words.sort((a, b) => a.index - b.index)

        // Aquí hay que poner el código necesario para checar los automatas
        // la variable words es un vector de objectos (de palabras)
        // unicamente hay que recorrer cada palabra ejemplo:

        // words.forEach(word => {
        // word.types // types es otro vector así que tambien podemos recorrerlo y comparar
        // })
        console.log()
        console.log('WORDS DATA FOUND:')
        console.log(JSON.stringify(words, null, 2))

        let sentenceChecked = checkSentence(words)
        // Si no se logró analizar toda la oración
        if (sentenceChecked.lastCheckedPosition != words.length) sentenceChecked.parts = []

        res.render('index', {
          sentence: req.query.sentence,
          words: words,
          sintagmas: sentenceChecked.parts,
          error: (sentenceChecked.error) ? sentenceChecked.error : undefined
        })
      }
    })
  })
})

module.exports = router
