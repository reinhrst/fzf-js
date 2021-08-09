declare function fzfExposeConstants(): FzfConstants
declare function fzfNew(hayStackJson: string,
                        options: Partial<FzfOptions>): GoFzf

declare type Case = { readonly __tag: unique symbol }
declare type SortCriterion = { readonly __tag: unique symbol }

declare type FzfConstants = {
  CaseSmart: Case
  CaseIgnore: Case
  CaseRespect: Case
  ByScore: SortCriterion
  ByBegin: SortCriterion
  ByEnd: SortCriterion
  ByLength: SortCriterion
}

declare type FzfOptions = {
  extended: boolean
  fuzzy: boolean
  caseMode: Case
  normalize: boolean
  sort: SortCriterion[]
}

declare type GoFzf = {
  addResultListener: (listener: (result: string) => void) => void,
  search: (string: string) => void,
  end: () => void,
}

declare type SearchResult = {
  needle: string
  matches: MatchResult[]
}

declare type MatchResult = {
  key: string
  hayIndex: number
  score: number
  positions: number[]
}
