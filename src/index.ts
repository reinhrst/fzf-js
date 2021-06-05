interface HayStraw<T> {
  key: string
  item: T
}

interface FindResponse<T> extends HayStraw<T> {
  score: number
  positions: [number, number][]
}

interface MatchResult {
  score: number
  positions: number[]
}


function range(a: number, b?: number): number[] {
  const start = b == undefined ? 0: b
  const end = b == undefined ? a: b
  return [...Array(end-start).map((_, i) => i + start)]
}

function matchStart(needle: string, haystack: string): MatchResult {
  if (needle == "") {
    throw new Error("needle should not be empty")
  }
  if (!haystack.startsWith(needle)) {
    return {
      score: 0,
      positions: []
    }
  }
  return {
    score: /^.\b/.test(haystack.slice(needle.length - 1)) ? 2 : 1,
    positions: range(needle.length)
  }
}

function matchEnd(needle: string, haystack: string): MatchResult {
  if (needle == "") {
    throw new Error("needle should not be empty")
  }
  if (!haystack.endsWith(needle)) {
    return {
      score: 0,
      positions: []
    }
  }
  return {
    score: /\b.$/.test(haystack.slice(0, -(needle.length - 1))) ? 2 : 1,
    positions: range(haystack.length - needle.length, haystack.length)
  }
}

function matchFull(needle: string, haystack: string): MatchResult {
  if (haystack != needle) {
    return {
      score: 0,
      positions: []
    }
  }
  return {
    score: 1,
    positions: range(haystack.length),
  }
}

function matchExact(needle: string, haystack: string): MatchResult {
  if (needle == "") {
    throw new Error("needle should not be empty")
  }
  const search = haystack.indexOf(needle) 
  if (search == -1) {
    return {
      score: 0,
      positions: []
    }
  }
  return {
    score: 1 * (
      /\b.$/.test(haystack.slice(0, search + 1)) ? 2 : 1) * (
      /^.\b/.test(haystack.slice(search + needle.length - 1)) ? 2 : 1),
    positions: range(search, search + needle.length)
  }
}

function matchFuzzy(needle: string, haystack: string): MatchResult {
  if (needle == "") {
    throw new Error("needle should not be empty")
  }
  let bestResult: MatchResult = {
    score: 0,
    positions: []
  }
  // TODO: fix score for start and end of word
  let positions: number[] = []
  for (let haystackStart = 0;
       haystackStart < haystack.length;
       haystackStart = positions[0] + 1) {
    let score = 1
    positions = []

    for (let pn=0, ph=haystackStart;
         pn < needle.length;
         pn++) {
           const newPh = haystack.indexOf(needle[pn], ph)
           if (newPh == -1) {
             return bestResult;
           }
           if (ph > 0 && newPh - ph > 0) {
             // gap between the letters
             score *= 1/2 * Math.pow(1/(newPh - ph + 1), 1 / 5)
           }
           positions.push(newPh)
           ph = newPh + 1
         }
      if (score > bestResult.score) {
        bestResult = {score, positions}
      }
  }
  return bestResult;
}

type MatchFunction = (haystack: string) => MatchResult

function inverseMatch(matchFunction: MatchFunction): MatchFunction {
  return (haystack: string) => {
    return {score: matchFunction(haystack).score > 0 ? 0 : 1, positions: []}
  }
}

function searchStringToMatchFunctions(searchString: string) : MatchFunction[] {
  let matchFunctions: MatchFunction[] = []
  const words = searchString.split(" ")
  for (let i = 0; i < words.length; i++) {

    // deal with literal spaces
    let word = words[i]
    while (word.endsWith("\\")) {
      if (++i < words.length) {
        word = word.slice(0, -1) + " " + words[i]
      }
    }
    let fuzzy = true
    let inverse = false
    let mustMatchStart = false
    let mustMatchEnd = false

    if (word == "" || word == "!" || word == "^")  {
      // (empty) or ! or ^ by itself means nothing (in fzf) -- $ on the other hand does...
      continue
    }

    if (word.startsWith("'")) {
      fuzzy = false
      word = word.slice(1)
    } else {
      if (word.startsWith("!")) {
        inverse = true
        fuzzy = false
        word = word.slice(1)
      }
      if (word.startsWith("^")) {
        mustMatchStart = true
        fuzzy = false
        word = word.slice(1)
      }
      if (word.endsWith("$") && word.length > 1) {
        mustMatchEnd = true
        fuzzy = false
        word = word.slice(0, -1)
      }
    }
    if (word == "") {
      // nothing interesting to match
      continue
    }

    const matchPartial = (unPartialMatchFunction: (needle: string, haystack: string) => MatchResult): MatchFunction  => {
      return (haystack: string) => unPartialMatchFunction(word, haystack)
    }

    let matchFunction: MatchFunction =
      (mustMatchStart && mustMatchEnd ? matchPartial(matchFull) :
       mustMatchStart ? matchPartial(matchStart) :
       mustMatchEnd ? matchPartial(matchEnd) :
       fuzzy ? matchPartial(matchFuzzy) :
       matchPartial(matchExact))

    if (inverse) {
      matchFunctions.push(inverseMatch(matchFunction))
    } else {
      matchFunctions.push(matchFunction)
    }
  }
  return matchFunctions
}


function find<T>(items: HayStraw<T>[], searchString: string): FindResponse<T>[] {
  let matchFunctions = searchStringToMatchFunctions(searchString)
  let results: FindResponse<T>[] = items.map(item => {
    const matchResults = matchFunctions.map(mf => mf(item.key))
    return {
      ...item,
      score: matchResults.reduce((a, b) => a * b.score, 1),
      positions: matchResults.reduce(
        (a: number[], b) => [...a, ...b.positions], [])
        .sort((a, b) => a - b)
        .reduce((a: [number, number][], b) => {
          if (a.length > 0 && a[a.length - 1][1] >= b) {
            a[a.length - 1][1] = b + 1
          } else {
            a.push([b, b + 1])
          }
          return a
        }, [])
    }
  })
  results = results.filter(result => result.score > 0)
  return results.sort((a, b) => b.score - a.score)
}

export {find, HayStraw}
