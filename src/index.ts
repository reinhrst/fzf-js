import "./fzf-js.js"

let fzfConstants: FzfConstants

enum Case {
  CaseRespect,
  CaseIgnore,
  CaseSmart
}

enum SortCriterion {
  ByScore,
  ByLength,
  ByBegin,
  ByEnd
}

type Options = {
  extended: boolean
  fuzzy: boolean
  caseMode: Case
  normalize: boolean
  sort: SortCriterion[]
}

function optionsToFzfOptions(options: Partial<Options>): Partial<FzfOptions> {
  let fzfOptions: Partial<FzfOptions> = {}
  if (options.extended !== undefined) {
    fzfOptions.Extended = options.extended
  }
  if (options.fuzzy !== undefined) {
    fzfOptions.Fuzzy = options.fuzzy
  }
  if (options.caseMode !== undefined) {
    fzfOptions.CaseMode = (
      options.caseMode == Case.CaseSmart ? fzfConstants.CaseSmart :
      options.caseMode == Case.CaseIgnore ? fzfConstants.CaseIgnore :
      options.caseMode == Case.CaseRespect ? fzfConstants.CaseRespect :
      options.caseMode as never
    )

  }
  if (options.sort !== undefined) {
    fzfOptions.Sort = options.sort.map(s => (
      s == SortCriterion.ByScore ? fzfConstants.ByScore :
      s == SortCriterion.ByLength ? fzfConstants.ByLength :
      s == SortCriterion.ByBegin ? fzfConstants.ByBegin :
      s == SortCriterion.ByEnd ? fzfConstants.ByEnd :
      s as never
    ))
  }
  if (options.normalize !== undefined) {
    fzfOptions.Normalize = options.normalize
  }
  return fzfOptions
}

class Fzf {
  static _inited: boolean = false
  static _initPromise: Promise<void>

  _fzf: GoFzf | undefined
  lastNeedle: string | undefined

  constructor(hayStack: string[], options?: Partial<Options>) {
    if (!Fzf._inited) {
      throw new Error("Call `await Fzf.init()` first")
    }
    this._fzf = fzfNew(
      hayStack,
      optionsToFzfOptions(options || {})
    )
  }

  addResultListener(listener: (result: SearchResult) => void): void {
    if (this._fzf == undefined) {
      throw new Error("Fzf object already ended")
    }
    this._fzf.addResultListener(listener)
  }

  search(needle: string): void {
    if (this._fzf == undefined) {
      throw new Error("Fzf object already ended")
    }
    this.lastNeedle = needle
    this._fzf.search(needle)
  }

  end() {
    if (this._fzf == undefined) {
      throw new Error("Fzf object already ended")
    }
    this._fzf.end()
    this._fzf = undefined
  }

  static init(): Promise<void> {
    if (globalThis.fzfNew !== undefined) {
      // gopherjs path -- no need to load wasm
      this._inited = true
      return Promise.resolve()
    }

    if (this._initPromise !== undefined) {
      return this._initPromise
    }
    if (!WebAssembly.instantiateStreaming) { // polyfill
      WebAssembly.instantiateStreaming = async (resp, importObject) => {
        const source = await (await resp).arrayBuffer();
        return await WebAssembly.instantiate(source, importObject);
      };
    }

    let initResolve: () => void
    this._initPromise = new Promise(resolve => {initResolve = () => resolve()})
    const go = new Go();
    WebAssembly.instantiateStreaming(fetch("main.wasm"), go.importObject).then((result) => {
      go.run(result.instance)
      fzfConstants = fzfExposeConstants()
      this._inited = true
      initResolve()
    }).catch((err) => {
      console.error(err);
    });
    return this._initPromise
  }
}


export {Fzf}
