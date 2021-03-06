package main

import (
    "syscall/js"
    "github.com/reinhrst/fzf-lib"
    "time"
    "strconv"
    "encoding/json"
)

var startTime int64
func SetStartTime(this js.Value, args []js.Value) interface{} {
    startTime, _ = strconv.ParseInt(args[0].String(), 10, 64)
    return nil
}


func logTime(message string) {
    t := int64(time.Now().UnixNano() / 1e6)
    println(message, strconv.FormatInt(t, 10), strconv.FormatInt(t - startTime, 10))
}


func ExposeConstants(this js.Value, args []js.Value) interface{} {
    if !this.IsUndefined() {
        panic(`Expect "this" to be undefined`)
    }
    if len(args) != 0 {
        panic(`Expect no arguments`)
    }
    return map[string]interface{}{
        "ByScore": int(fzf.ByScore),
        "ByLength": int(fzf.ByLength),
        "ByBegin": int(fzf.ByBegin),
        "ByEnd": int(fzf.ByEnd),
        "CaseSmart": int(fzf.CaseSmart),
        "CaseIgnore": int(fzf.CaseIgnore),
        "CaseRespect": int(fzf.CaseRespect),
    }
}


func New(this js.Value, args []js.Value) interface{} {
    logTime("newStart")
    if !this.IsUndefined() {
        panic(`Expect "this" to be undefined`)
    }
    if len(args) != 2 {
        panic(`Expect two arguments: hayStack, options`)
    }
    jsonHayStack := args[0].String()
    jsOptions := args[1]
    var jsCallbacks []js.Value

    var hayStack []string
    err := json.Unmarshal([]byte(jsonHayStack), &hayStack)
    if err != nil {
        panic(err)
    }

    opts := parseOptions(jsOptions)
    logTime("newFinishedParse")

    myFzf := fzf.New(hayStack, opts)

    go func() {
        for {
            result, more := <- myFzf.GetResultChannel()
            if !more {
                break;
            }
            for _, jsCallback := range jsCallbacks {
                logTime("Result ready to send")
                jsonData, _ := json.Marshal(searchResultToJs(result))
                jsCallback.Invoke(string(jsonData))
                logTime("Result sent")
            }
        }
    }()

    addResultListener := func (this js.Value, args []js.Value) interface{} {
        if len(args) != 1 {
            panic(`Expect 1 arguments: result listener`)
        }
        jsCallbacks = append(jsCallbacks, args[0])
        return nil
    }

    search := func (this js.Value, args []js.Value) interface{} {
        if len(args) != 1 {
            panic(`Expect 1 arguments: needle`)
        }
        needle := args[0].String()
        myFzf.Search(needle)
        return nil
    }

    end := func (this js.Value, args []js.Value) interface{} {
        if len(args) != 0 {
            panic(`Expect no arguments`)
        }
        myFzf.End()
        return nil
    }

    logTime("newDone")
    return map[string]interface{} {
        "addResultListener": js.FuncOf(addResultListener),
        "search": js.FuncOf(search),
        "end": js.FuncOf(end),
    }
}

func parseOptions(jsOptions js.Value) fzf.Options {
    opts := fzf.DefaultOptions()
    if !jsOptions.Get("extended").IsUndefined() {
        opts.Extended = jsOptions.Get("extended").Bool()
    }
    if !jsOptions.Get("fuzzy").IsUndefined() {
        opts.Fuzzy = jsOptions.Get("fuzzy").Bool()
    }
    if !jsOptions.Get("caseMode").IsUndefined() {
        opts.CaseMode = fzf.Case(jsOptions.Get("caseMode").Int())
    }
    if !jsOptions.Get("sort").IsUndefined() {
        sort := jsOptions.Get("sort")
        opts.Sort = nil
        for i := 0; i < sort.Length(); i++ {
            opts.Sort = append(opts.Sort, fzf.Criterion(sort.Index(i).Int()))
        }
    }
    if !jsOptions.Get("normalize").IsUndefined() {
        opts.Normalize = jsOptions.Get("normalize").Bool()
    }
    return opts
}

func searchResultToJs(result fzf.SearchResult) map[string]interface{} {
    var matchResults []interface{}
    for _, match := range result.Matches {
        var positions []interface{}
        for _, pos :=  range match.Positions {
            positions = append(positions, pos)
        }
        matchResults = append(matchResults, map[string]interface{} {
            "key": match.Key,
            "hayIndex": match.HayIndex,
            "score": match.Score,
            "positions": positions,
        })
    }
    var searchResult = map[string]interface{}{
        "needle": result.Needle,
        "matches": matchResults,
    }
    return searchResult
}

func main() {
    c := make(chan struct{}, 0)
    js.Global().Set("SetStartTime", js.FuncOf(SetStartTime))
    js.Global().Set("fzfNew", js.FuncOf(New))
    js.Global().Set("fzfExposeConstants", js.FuncOf(ExposeConstants))
    <-c
}
