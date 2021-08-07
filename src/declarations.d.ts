declare module '*.go' {
    const promise: Promise<Response>;
    export default promise;
}

declare type FzfConstants = {
  CaseSmart: number
  CaseIgnore: number
  CaseRespect: number
  ByScore: number
  ByBegin: number
  ByEnd: number
  ByLength: number
}

declare type FzfOptions = {
  // options with capitalization as used in Fzf
  Extended: boolean
  Fuzzy: boolean
  CaseMode: number
  Normalize: boolean
  Sort: number[]
}

declare type MatchResult = {
  key: string
  hayIndex: number
  score: number
  positions: number[]
}

declare type SearchResult = {
  needle: string
  matches: MatchResult[]
}

declare type GoFzf = {
  addResultListener: (listener: (result: SearchResult) => void) => void,
  search: (string: string) => void,
  end: () => void,
}

declare function fzfExposeConstants(): FzfConstants
declare function fzfNew(hayStack: string[],
                        options: Partial<FzfOptions>): GoFzf
