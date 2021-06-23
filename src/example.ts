import {Fzf} from "./index.js"

Fzf.init().then(() => (window as any).Fzf = Fzf)
