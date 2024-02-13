import fs from "fs"
import path from "path"
import { globby } from 'globby';
import { marked } from 'marked';
import heading from "./handlers/heading.js"
import paragraph from "./handlers/paragraph.js"
import space from "./handlers/space.js"
import code from "./handlers/code.js"
import list from "./handlers/list.js"
import html from "./handlers/html.js"
/** Page meta tags (required) */
export type MetaData = { [key:string]:string }
/** Current page being created */
export type CurrentPage = {
    /** Custom js/ts code to add to page */
    jsCode:string
    /** Current to to add to page body (content) */
    code:string
    /** Custom css code to add to page */
    css:string
    /** Page meta data tags (required) */
    metaData:MetaData
}
/** Data returned from function */
type Result = {
    /** Page layout key */
    [key:string]:{
        /** Page link (href) */
        href:string
        /** Page title */
        title:string
        /** Page description */
        description:string
        /** Indicate if it's a new feature (add badge next to link) */
        new:boolean
    }[]
}

/** Create page tags */
function createPage(page:CurrentPage,appName:string){
    let pageCode:string = ""
    // add css
    if(page.jsCode) pageCode += `<script lang="ts">\n${page.jsCode}\n</script>\n`
    // add page code
    pageCode += `\n<svelte:head>
    <!-- Primary Meta Tags -->
    <title>${page.metaData.title} | ${appName}</title>
    <meta name="title" content="${page.metaData.title} | ${appName}" />
    <meta name="description" content="${page.metaData.description}" />
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${page.metaData.href}" />
    <meta property="og:title" content="${page.metaData.title} | ${appName}" />
    <meta property="og:description" content="${page.metaData.description}" />
    <meta property="og:image" content="${ page.metaData.image ? page.metaData.image : "https://developedbyant.com/images/backdrop.png"}" />
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${page.metaData.href}" />
    <meta property="twitter:title" content="${page.metaData.title} | ${appName}" />
    <meta property="twitter:description" content="${page.metaData.description}" />
    <meta property="twitter:image" content="${ page.metaData.image ? page.metaData.image : "https://developedbyant.com/images/backdrop.png"}" />
</svelte:head>\n`+page.code
    // add custom style
    if(page.css) pageCode += `<style>\n${page.css}</style>`
    // return page code
    return pageCode
}

/** Convert markdown file to svelte
 * @param outPutDir - Directory to save converted markdown  */
export default async function mdToSvelte(outPutDir:`src/routes/${string}`,appName:string){
    /** Result to be returned */
    const result:Result = { }
    const markdowns = await globby(`${process.cwd()}/pages/`,{expandDirectories:{files: ['*.md']}})
    // delete all generated directories in docs folder
    const oldMarkdowns = await globby(`${outPutDir.endsWith("/") ? outPutDir.slice(0,-1) : outPutDir}/**`,{ onlyDirectories:true })
    for(const markdownPath of oldMarkdowns){ fs.rmSync(markdownPath, { recursive: true, force: true }) }
    // loop all markdown files
    for(const markdownPath of markdowns){
        const page:CurrentPage = { jsCode: "", code: "", css: "", metaData: {} }
        /** Clean md path after removing [..] */
        const cleanMarkdownPath = markdownPath.replace(/\[\d+\]/g, '').replace(`${process.cwd()}/pages/`,"")
        /** Slug for markdown path */
        const slug = `${cleanMarkdownPath.replace("index.md","").replace(".md","")}`
        const markdownContent = fs.readFileSync(markdownPath).toString()
        // get file tokens
        const markdownTokens = marked.lexer(markdownContent)
        for(const token of markdownTokens){
            // heading
            if(token.type==="heading") heading(token,page)
            // paragraph
            else if(token.type==="paragraph") paragraph(token,page)
            // space
            else if(token.type==="space") space(page)
            // code
            else if(token.type==="code") await code(token,page)
            // list
            else if(token.type==="list") list(token,page)
            // any other html tag
            else html(token,page)
        }
        // Skip page creation md does not contain meta data
        if(Object.keys(page.metaData).length<3) continue
        //@ts-ignore create page
        outPutDir = outPutDir.endsWith("/") ? outPutDir.slice(0,-1) : outPutDir // remove / from outPutDir if exists
        const sveltePagePath = `${outPutDir}/${slug}/+page.svelte`.replace("//","/")
        const publicHref = `${outPutDir}/${slug}`.replace("//","/").replace('src/routes',"")
        // add href to meta data
        page.metaData.href = publicHref
        // create
        fs.mkdirSync(path.dirname(sveltePagePath), { recursive: true });
        fs.writeFileSync(sveltePagePath,createPage(page,appName))

        // console.log(`<<<<<<<<<<<<<< O >>>>>>>>>>>>>\n`)
        // console.log(`${cleanMarkdownPath}\n${slug}\n${sveltePagePath}\n${publicHref}`)
        // console.log(page.metaData)
        // if layout does not exists in result create it to avoid error when adding links
        const pageLayout = page.metaData.layout
        if(!result[pageLayout]) result[pageLayout] = []
        // add page link
        result[pageLayout].push({
            title: page.metaData.title,
            href: `/docs/${slug}`,
            description: page.metaData.description,
            new: page.metaData.new ? true : false
        })
    }
    // return data
    return result
}


/** Convert markdown file to svelte
 * @param outPutDir - Directory to save converted markdown  */
export async function viteMdToSvelte(outPutDir:`src/routes/${string}`,appName:string) {
	return {
		name: 'md-to-svelte',
		handleHotUpdate(data:{ file:string,server:any }) {
            const run = ( data.file.endsWith(".md") && data.server.config.mode==="development" )
			if(run) mdToSvelte(outPutDir,appName)
		},
	}
}

// await mdToSvelte("src/routes/docs/","TestApp")
// console.log(await mdToSvelte("src/routes/docs/","TestApp"))