declare function fzfExposeConstants(): FzfConstants
declare function fzfNew(hayStack: string[],
                        options: Partial<FzfOptions>): GoFzf

declare type Case = number;
declare type SortCriterion = number;

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
  addResultListener: (listener: (result: SearchResult) => void) => void,
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
