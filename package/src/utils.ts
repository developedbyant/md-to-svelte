import { createCssVariablesTheme, getHighlighter } from "shiki"

// Create a custom CSS variables theme, the following are the default values
const myTheme = createCssVariablesTheme({ 
    name: 'css-variables',
    variablePrefix: '--shiki-',
    variableDefaults: {},
    fontStyle: true
})
const highlighter = await getHighlighter({ themes:[myTheme],langs:[] })


export default new class {
    /** Convert string to url slug */
    slug(data:string){
        // replace multiple spaces to a single space
        data = data.replace(/\s+/g, ' ')
        // remove any character or number from text, make text lower case and trim it
        data = data.replace(/[^\w\s]/g, '').toLowerCase().trim().replace(/\s+/g, '-')
        return data
    }

    /** Capitalize string */
    capitalize = (data:string) => data.charAt(0).toUpperCase()+data.slice(1)

    /** Return copy text function */
    copyTextFunc(){
    return `\n    /** Copy text to clipboard (Added by kitdocs) */
    async function copyText(e:MouseEvent){
        const copyButton = e.target as HTMLButtonElement
        const code = copyButton.parentElement?.querySelector("code")?.innerText as string
        await navigator.clipboard.writeText(code)
        copyButton.innerText = "Copied"
        // Set button text back to copy after 5 milliseconds
        setTimeout(()=>copyButton.innerText = "Copy",1000)
    }`
    }

    /** highlight code
     * @param code - code to highLight
     * @param theme - theme color from shiki
     * @link https://shiki.style/guide/theme-colors
     * @param lang - code to highLight
     * @link https://shiki.style/guide/load-lang */
    async codeHighLighter(code:string,lang:any="svelte"){
        await highlighter.loadLanguage(lang)
        let htmlCode = highlighter.codeToHtml(code,{lang,theme:"css-variables"})
        const result = this.lineHighlight(this.lineHighlight(htmlCode,"//[H]"),"//[R]")
        return result
    }

    /** highlight code line */
    lineHighlight(htmlCode:string,specialTag:"//[H]"|"//[R]"){
        specialTag = specialTag.toUpperCase() as any // covert tag to upperCase
        const highlightCode = htmlCode.indexOf(specialTag)
        if(highlightCode>0){
            let loopNum = 0
            const dataToReplace = `<span class="line">${this.reverseString(this.reverseString(htmlCode.slice(0,highlightCode+5)).split(this.reverseString('<span class="line">'))[0])}`
            const dataToReplaceWith = `<span class="line ${specialTag==="//[H]"?"added":"removed"}">${this.reverseString(this.reverseString(htmlCode.slice(0,highlightCode+5)).split(this.reverseString('<span class="line">'))[0])}`
            htmlCode = htmlCode.replace(dataToReplace,dataToReplaceWith).replace(specialTag,"")
            while(true){
                const nextIndex = htmlCode.indexOf(specialTag)
                // break out of the loop
                if(nextIndex<0) break
                // highlight line
                const dataToReplace = `<span class="line">${this.reverseString(this.reverseString(htmlCode.slice(0,nextIndex+5)).split(this.reverseString('<span class="line">'))[0])}`
                const dataToReplaceWith = `<span class="line ${specialTag==="//[H]"?"added":"removed"}">${this.reverseString(this.reverseString(htmlCode.slice(0,nextIndex+5)).split(this.reverseString('<span class="line">'))[0])}`
                htmlCode = htmlCode.replace(dataToReplace,dataToReplaceWith).replace(specialTag,"")
                loopNum++
            }
        }
        return htmlCode.replace('tabindex="0"','tabindex="-1"').replace(/{/g,"&#123;")
    }

    /** reverse string */
    reverseString = (data:string)=>data.split('').reverse().join('')
}