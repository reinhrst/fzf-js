async function load() {
  try {
    // @ts-ignore -- it will complain it cannot find this module at compile time
    await import("./fzf-js.js")
  } catch (e) {
    // No fzf-js.js file, assuming WebAssembly module
    // @ts-ignore -- it will complain it cannot find this module at compile time
    await import("./wasm_exec.js")
    let fetchAsArrayBuffer: (filename: string) => Promise<ArrayBuffer>
    if (globalThis.fetch === undefined) {
      // node
    // @ts-ignore -- it will complain it cannot find this module at compile time
      var fs = await import('fs');
      fetchAsArrayBuffer = fs.promises.readFile
    } else {
      // browser
      fetchAsArrayBuffer = async (url: string) => await (await fetch(url)).arrayBuffer()
    }
    const go = new Go();
    const result = await WebAssembly.instantiate(
      await fetchAsArrayBuffer("main.wasm"), go.importObject)
    go.run(result.instance)
  }
}

await load()


class Fzf {
  static optionConstants = fzfExposeConstants()
  _fzf: GoFzf | undefined

  constructor(hayStack: string[], options?: Partial<FzfOptions>) {
    this._fzf = fzfNew(
      hayStack,
      options || {}
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
    this._fzf.search(needle)
  }

  end() {
    if (this._fzf == undefined) {
      throw new Error("Fzf object already ended")
    }
    this._fzf.end()
    this._fzf = undefined
  }
}


export {Fzf}
