import utils from "../utils.js"
import type {  CurrentPage } from "../main.js"
import type { Tokens } from "marked"

/** handle code */
export default async function(token:Tokens.Code | Tokens.Generic,page:CurrentPage){
    /** Code language */
    const lang = token.lang.toLowerCase().trim()

    // add copy text function to script tag
    if(!page.jsCode.includes('copyText(e:MouseEvent)')) page.jsCode+=utils.copyTextFunc()
    // warning
    if(lang==="[warning]"){      
        page.code+= `<div data-md="warning">${token.text}</div>\n`
    }
    // add js and ts code to script tag
    else if((lang==="js [code]"||lang==="ts [code]"||lang==="javascript [code]"||lang==="typescript [code]")){
        page.jsCode=token.text
    }
    // add style
    else if(lang==="css [code]"){
        page.css= `${token.text}\n`
    }
    // add svelte code to page
    else if(lang==="svelte [add]"){
        page.code+= `${token.text}\n`
    }
    // add svelte code to page and show code
    else if(lang==="svelte [all]"){
        // add page code
        page.code+= `<div data-md="code"><button on:click={copyText}>Copy</button>${await utils.codeHighLighter(token.text,"svelte")}</div>\n`
        // add code to page
        page.code+= `${token.text}\n`
    }
    // show code
    else{
        // add page code
        page.code+= `<div data-md="code"><button on:click={copyText}>Copy</button>${await utils.codeHighLighter(token.text,lang)}</div>\n`
    }
}