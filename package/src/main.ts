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
    /** Headers founded in file */
    headers:{ id: string,text: string }[]
}
/** Data returned from function */
export type Result = {
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
        /** Headers founded in file */
        headers:{ id: string,text: string }[]
        /** All meta data from file */
        [key:string]:any
    }[]
}

/** Function options */
export type Options = {
    /** App name, so we can use to add app name after title example title here | appName */
    appName:string
    /** Website domain, it's use to add to meta data url property */
    domainUrl:string
    /** Default image to use when there was not image founded on markdown meta tag */
    defaultImage:string
    /** If set to true, it will delete everything on parent folder example /docs/ will delete everything in folder docs */
    devMode?:boolean
}

/** Create page tags */
function createPage(page:CurrentPage,options:Options){
    const domainUrl = options.domainUrl.endsWith("/") ? options.domainUrl.slice(0,-1) : options.domainUrl
    let pageCode:string = ""
    // add css
    if(page.jsCode) pageCode += `<script lang="ts">\n${page.jsCode}\n</script>\n`
    // add page code
    pageCode += `\n<svelte:head>
    <!-- Primary Meta Tags -->
    <title>${page.metaData.title} | ${options.appName}</title>
    <meta name="title" content="${page.metaData.title} | ${options.appName}" />
    <meta name="description" content="${page.metaData.description}" />
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${domainUrl+page.metaData.href}" />
    <meta property="og:title" content="${page.metaData.title} | ${options.appName}" />
    <meta property="og:description" content="${page.metaData.description}" />
    <meta property="og:image" content="${ page.metaData.image ? page.metaData.image : options.defaultImage}" />
    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${domainUrl+page.metaData.href}" />
    <meta property="twitter:title" content="${page.metaData.title} | ${options.appName}" />
    <meta property="twitter:description" content="${page.metaData.description}" />
    <meta property="twitter:image" content="${ page.metaData.image ? page.metaData.image : options.defaultImage}" />
</svelte:head>\n`+page.code
    // add custom style
    if(page.css) pageCode += `<style>\n${page.css}</style>`
    // return page code
    return pageCode
}

/** Convert markdown file to svelte
 * @param outPutDir - Directory to save converted markdown  */
export default async function mdToSvelte(outPutDir:`src/routes/${string}`,options:Options){
    /** Result to be returned */
    const result:Result = { }
    const markdowns = await globby(`${process.cwd()}/pages/`,{expandDirectories:{files: ['*.md']}})
    // delete all generated directories in docs folder
    if(options.devMode){
        const oldMarkdowns = await globby(`${outPutDir.endsWith("/") ? outPutDir.slice(0,-1) : outPutDir}/**`,{ onlyDirectories:true })
        for(const markdownPath of oldMarkdowns){ fs.rmSync(markdownPath, { recursive: true, force: true }) }
    }
    // loop all markdown files
    for(const markdownPath of markdowns){
        const page:CurrentPage = { jsCode: "", code: "", css: "", metaData: {},headers:[] }
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
        fs.writeFileSync(sveltePagePath,createPage(page,options))

        // console.log(`<<<<<<<<<<<<<< O >>>>>>>>>>>>>\n`)
        // console.log(`${cleanMarkdownPath}\n${slug}\n${sveltePagePath}\n${publicHref}`)
        // console.log(page.metaData)
        // if layout does not exists in result create it to avoid error when adding links
        const pageLayout = page.metaData.layout
        if(!result[pageLayout]) result[pageLayout] = []
        // add page link
        result[pageLayout].push({
            ...page.metaData,
            title: page.metaData.title,
            // remove last / if exists
            href:page.metaData.href.endsWith("/") ? page.metaData.href.slice(0,-1) : page.metaData.href,
            // href: slug==="" ? `/` : slug,
            description: page.metaData.description,
            new: page.metaData.new ? true : false,
            headers:page.headers
        })
    }
    // return data
    return result
}


/** Convert markdown file to svelte
 * @param outPutDir - Directory to save converted markdown  */
export async function viteMdToSvelte(outPutDir:`src/routes/${string}`,options:Options) {
	return {
		name: 'md-to-svelte',
		handleHotUpdate(data:{ file:string,server:any }) {
            const run = ( data.file.endsWith(".md") && data.server.config.mode==="development" )
			if(run) mdToSvelte(outPutDir,options)
		},
	}
}

// await mdToSvelte("src/routes/blog/",{
//     appName:"TestApp",domainUrl:"https://developedbyant.com",
//     defaultImage:"https://developedbyant.com/images/backdrop.png"
// })
// console.log(await mdToSvelte("src/routes/blog/",{
//     appName:"TestApp",domainUrl:"https://developedbyant.com",
//     defaultImage:"https://developedbyant.com/images/backdrop.png"
// }))