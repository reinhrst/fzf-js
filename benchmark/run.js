const console={warn: print, log: print};
load("encoding.js");
load("wasm_exec.js");

async function run() {
  const buf=read("main_go.wasm", "binary");
  const lines=read("/tmp/lines.txt").split("\n").filter(line => line != "")

  const startTime = Date.now();
  let lastTime = startTime;
  function logTime(message) {
    const now = Date.now()
    console.log(`since start ${now - startTime} ms, section ${now - lastTime} ms; ${message}`)
    lastTime = now
  }

  try {
    const go = new Go();
    const wasmresult = await WebAssembly.instantiate(buf, go.importObject)
    go.run(wasmresult.instance);
    fzfSetStartTimer(startTime)
    logTime("start")
    for (let i = 0; i < 10; i++) {
      let resolver
      let promise
      let result
      print("----- loop start -----")
      const fzfNr = fzfNew(lines, {}, (result) => {resolver(result)})
      logTime("fzfNew")
      promise = new Promise((resolve, _reject) => {resolver = resolve;})
      fzfSearch(fzfNr, "hello world")
      result = await promise
      logTime(`result: ${result.matches.length} results`)
      promise = new Promise((resolve, _reject) => {resolver = resolve;})
      fzfSearch(fzfNr, "hello world")
      result = await promise
      logTime(`result: ${result.matches.length} results`)
      fzfEnd(fzfNr)
      logTime(`delete fzf object`)
      print("----- loop end -----")
    }
    print("done")
  } catch (e) {
    print("error: " + e)
  }
}

run()
