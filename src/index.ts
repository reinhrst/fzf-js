type Interval = [number, number]
type Intervals = Interval[]

interface HayStraw<T> {
  key: string
  item: T
}

interface FindResponse<T> extends HayStraw<T> {
  score: number
  positions: Intervals
}


function range(a: number, b?: number): number[] {
  const start = b == undefined ? 0: b
  const end = b == undefined ? a: b
  return [...Array(end-start).map((_, i) => i + start)]
}


function createNumberIntervals(items: number[]): Intervals {
  /**
   * Assumes items[] to be an increasing list of integers
   * returns the minimum number of [start, end] intervals to describe this list
   * Start is inclusive, end exclusive, so [1, 2, 4, 5, 6] will become
   * [[1, 3], [4, 7]]
   */
  return items.reduce((acc, cur) => {
    if (acc.length === 0 || acc[acc.length - 1][1] != cur) {
      acc.push([cur, cur + 1])
    } else {
      acc[acc.length - 1][1] = cur + 1
    }
    return acc
  }, [] as Intervals)
}

/**
 * Word is a WordWithModifiers without the modifiers
 */
type Word = string

interface MatchResultMatch {
  score: number
  positions: Intervals
}

type MatchResult = MatchResultMatch | "NO_MATCH"



enum MatchLocation {
  START,
  END,
  START_AND_END,
  ANY
}


function findAllMatchIndices(str: string, regex: RegExp): number[] {
  // TODO maybe a sticky flag is better?
  console.assert(regex.global, "Use a regex with a global flag")
  const oldLastIndex = regex.lastIndex
  let indices = []
  let match
  while ((match = regex.exec(str)) != null) {
    indices.push(match.index);
    if (match[0].length == 0) {
      regex.lastIndex++
    }
  }
  regex.lastIndex = oldLastIndex
  return indices
}

function stringAllIndexOf(haystack: string, needle: string): number[] {
  /**
   * Finds all indices where a needle matches a haystack
   * Note that matches may overlap
   */
  let indices: number[] = []
  let index = 0
  while ((index = haystack.indexOf(needle, index)) != -1) {
    indices.push(index)
    index++;
  }
  return indices
}

function objectFromEntries<K extends PropertyKey, V>(keyValues: readonly [K, V][]): Record<K, V> {
  let result = {} as Record<K, V>
  keyValues.forEach(([key, value]) => {
    result[key] = value
  })
  return result
}

class Finder<T> {
  START_OF_STRING_BONUS = 2
  START_OF_WORD_BONUS = 2
  WHOLE_WORD_BONUS = 2
  FUZZY_MATCH_BREAK_PENALTY = 9
  CASE_PENALTY = 2
  WORD_BOUNDARY_REGEXPS: [RegExp, number][] = [
    [/\b/gu, 0],  // regex standard word boundaries
    [/\p{Ll}\p{Lu}/gu, 1], // lowercase followed by uppercase, offset 1
    [/\p{Lu}\p{Ll}/gu, 0], // uppercase followed by lowercase
  ]
  private BASE_SCORE: number


  haystack: HayStraw<T>[]
  private haystackKeysLower: string[]
  private wordBoundaryByKey: {[key: string]: boolean[]}
  private originalLetterIndices_s: {[key: string]: number[]}[]
  private lowercaseLetterIndices_s: {[key: string]: number[]}[]

  constructor(haystack: HayStraw<T>[]) {
    this.haystack = haystack
    this.haystackKeysLower = this.haystack.map(
      hayStraw => hayStraw.key.toLocaleLowerCase())
    this.wordBoundaryByKey =objectFromEntries(this.haystack.map(
      hayStraw => {
        // boundaries[i] means a boundary before char[i]. That is why we need
        // one more at the end of the string, for fzf 
        let boundaries = [...Array(hayStraw.key.length).fill(false), true]
        this.WORD_BOUNDARY_REGEXPS.forEach(([re, offset]) => {
          findAllMatchIndices(hayStraw.key, re).forEach(
            index => {boundaries[index + offset] = true}
          )
        })
        return [hayStraw.key, boundaries]
      }))
    this.originalLetterIndices_s = []
    this.lowercaseLetterIndices_s = []
    this.haystack.forEach((hayStraw, hayStrawIndex) => {
      this.originalLetterIndices_s.push({})
      this.lowercaseLetterIndices_s.push({})
      hayStraw.key.split("").forEach((originalLetter, i) => {
        const lowerCaseLetter = originalLetter.toLocaleLowerCase()
        const letterTargets: [string, {[key: string]: number[]}][] = [
            [originalLetter, this.originalLetterIndices_s[hayStrawIndex]],
            [lowerCaseLetter, this.lowercaseLetterIndices_s[hayStrawIndex]]]
        for (let [letter, target] of letterTargets){
          if (target[letter] == undefined) {
            target[letter] = []
          }
          target[letter].push(i)
        }
      })
    })

    this.BASE_SCORE = 1 / (
      this.START_OF_STRING_BONUS * this.START_OF_WORD_BONUS * this.WHOLE_WORD_BONUS)
  }

  private calculateScore(
    word: string,
    hayStrawIndex: number,
    positions: Intervals,
  ): number {
    /**
     * Calculates the score for a given word (needle), in a given hayStraw
     */
    const hayStraw = this.haystack[hayStrawIndex]
    const matchedLetters: string[] = positions.reduce(
      (acc, [start, end]) => [...acc, ...hayStraw.key.slice(start, end).split("")]
    , [] as string[])
    const casePenalty = word.split("").reduce(
      (acc, cur, i) => acc * (cur == matchedLetters[i] ? 1 : this.CASE_PENALTY), 1)
    const splitPenalty = this.FUZZY_MATCH_BREAK_PENALTY ** (positions.length - 1)
    const startOfStringBonus = positions[0][0] == 0 ? this.START_OF_STRING_BONUS : 1
    const wordBoundaries = this.wordBoundaryByKey[hayStraw.key]
    const wordMatchBonus = positions.reduce((acc, [start, end]) => (
      acc * (wordBoundaries[start] ? this.START_OF_WORD_BONUS * (
        wordBoundaries[end] ? this.WHOLE_WORD_BONUS : 1) : 1)), 1)
    return this.BASE_SCORE
      * startOfStringBonus
      * wordMatchBonus
      / splitPenalty
      / casePenalty
  }

  private getMatchResult(
    word: string,
    hayStrawIndex: number,
    positions: Intervals,
  ): MatchResultMatch {
    /**
     * Gets the MatchResult -- assumes that there is a match, on the named positions
     */
    return {
      score: this.calculateScore(word, hayStrawIndex, positions),
      positions,
    }
  }

  private getBestMatchResult(
    word: string,
    hayStrawIndex: number,
    positions_s: Intervals[],
    inverse: boolean,
  ): MatchResult {
    if (inverse) {
      if (positions_s.length === 0) {
        return {
          score: 1,
          positions: []
        }
      } else {
        return "NO_MATCH"
      }
    }
    const matchResults = positions_s.map(
      positions => this.getMatchResult(word, hayStrawIndex, positions))
      const result = matchResults.reduce((acc, cur) => {
        if (acc == "NO_MATCH" || acc.score < cur.score) {
          return cur
        }
        return acc
      }, "NO_MATCH" as MatchResult)
      return result
  }

  private matchAtLocation(word: Word, matchLocation: MatchLocation, inverse: boolean): MatchResult[] {
    /**
     * Matches the word either to the start, the end or at any place in the string
     */
    console.assert(word.length > 0)
    const lowercaseWord = word.toLocaleLowerCase()
    return this.haystack.map((hayStraw, hayStrawIndex) => {
      const originalKey = hayStraw.key
      const lowercaseKey = this.haystackKeysLower[hayStrawIndex]
      const matchStartOffsets: number[] = ((): number[] => {
        switch (matchLocation) {
          case MatchLocation.START:
            return lowercaseKey.startsWith(lowercaseWord) ? [0] : []
          case MatchLocation.END:
            return lowercaseKey.endsWith(lowercaseWord) ? [
            originalKey.length - word.length] : []
          case MatchLocation.START_AND_END:
            return lowercaseWord == lowercaseKey ? [0] : []
          case MatchLocation.ANY:
            return stringAllIndexOf(lowercaseKey, lowercaseWord)
          default:
            const optionsExhausted: never = matchLocation
            throw new Error(`${{optionsExhausted}}`)
        }
      })()
      const positions_s: Intervals[] = matchStartOffsets.map(
        offset => [[offset, offset + word.length]])
      return this.getBestMatchResult(word, hayStrawIndex, positions_s, inverse)
    })
  }

  private matchFuzzy(word: string, inverse: boolean): MatchResult[] {
    // TODO: there is a huge time and memory speedup possible here.
    // The theory is that at any iteration the set of positions_s can be reduced
    // so that there is a unique last 2 positions -- the ones with the highest
    // scores.
    console.assert(word.length > 0)
    const lowercaseWord = word.toLocaleLowerCase()
    return this.haystack.map((_, hayStrawIndex) => {
      const lowercaseLetterIndices = this.lowercaseLetterIndices_s[hayStrawIndex]
      let positions_s: number[][] = [[]]
      lowercaseWord.split("").forEach(letter => {
        let newPositions_s: number[][] = []
        positions_s.forEach(positions => {
          const indicesForLetter = (lowercaseLetterIndices[letter] || []).filter(
            index => index > (positions[positions.length - 1] || -1) )
          indicesForLetter.forEach(newIndex => {
            newPositions_s.push([...positions, newIndex])
          })
        })
        positions_s = newPositions_s
      })
      return this.getBestMatchResult(
        word, hayStrawIndex, positions_s.map(createNumberIntervals), inverse)
    })
  }


  find(needle: string): FindResponse<T>[] {
    /**
     * Returns a sorted (by score) array of MatchResult for search with a
     * certain needle
     */


    // split and deal with literal spaces
    const words = needle.split(" ").reduce((acc, word) => {
      if (acc.length === 0 || acc[acc.length - 1].slice(-1) != "\\") {
        // last space is not escaped
        acc.push(word)
      } else {
        acc[acc.length - 1] = acc[acc.length - 1].slice(0, -1) + " " + word
      }
      return acc
    }, [] as string[])

    // TODO: Speedup by making it a reduce -- not doing the work for those that
    // already are noMatch?
    const matchResults_s: MatchResult[][] = words.map(word => {
      let fuzzy = true
      let inverse = false
      let mustMatchStart = false
      let mustMatchEnd = false

      if (["", "!", "^", "'"].indexOf(word) != -1) {
        // (empty) or ! or ^ or ' by itself means nothing (per spec) --
        // $ on the other hand does...
        return this.haystack.map(_ => ({
          score: 1,
          positions: []
        }))
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
      if (fuzzy) {
        return this.matchFuzzy(word, inverse)
      }
      const matchLocation = (
        mustMatchStart ? (
          mustMatchEnd ? MatchLocation.START_AND_END : MatchLocation.START) :
        mustMatchEnd ? MatchLocation.END : MatchLocation.ANY)
      return this.matchAtLocation(word, matchLocation, inverse)
    })

    const combinedResults: FindResponse<T>[] = this.haystack.map(
      (hayStraw, i) => {
        const matchResultForHayStrawWithMessedUpPositions =
          matchResults_s.map(mr => mr[i]).reduce((acc, cur) => {
          if (acc == "NO_MATCH" || cur == "NO_MATCH") {
            return "NO_MATCH"
          }
          return {
            score: acc.score * cur.score,
            positions: [...acc.positions, ...cur.positions]
          }
        }, {score: 1, positions: []} as MatchResult)
        if (matchResultForHayStrawWithMessedUpPositions == "NO_MATCH") {
          return matchResultForHayStrawWithMessedUpPositions
        }
        console.log(hayStraw.key, this.wordBoundaryByKey[hayStraw.key])
        const positions = matchResultForHayStrawWithMessedUpPositions.positions
          .sort((a, b) => a[0] - b[0] || a[1] - b[1])
          .reduce((acc, cur) => {
            if (acc.length == 0 || acc[acc.length - 1][1] < cur[0]) {
              return [...acc, cur]
            }
            const newinterval: Interval = [acc[acc.length - 1][0], cur[1]]
            return [...acc.slice(0, -1), newinterval]
          }, [] as Intervals)
        return {
          ...hayStraw,
          score: matchResultForHayStrawWithMessedUpPositions.score,
          positions
        }
      }).filter((match): match is FindResponse<T> => match != "NO_MATCH")

    return combinedResults.sort((a, b) => b.score - a.score)
  }
}

export {Finder, HayStraw}
