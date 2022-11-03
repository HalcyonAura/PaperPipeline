import { resolve } from "path"
import { config } from "dotenv"
config({ path: resolve(__dirname, "../.env") })

import Airtable from 'airtable';
import axios, { AxiosRequestConfig, AxiosPromise, AxiosResponse } from 'axios';
import { AirtableBase } from 'airtable/lib/airtable_base';
Airtable.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY
  });
const base: AirtableBase = Airtable.base(process.env.AIRTABLE_BASE_ID as string);

const zoteroKey = process.env.ZOTERO_API_KEY as string
const zoteroUser = "https://api.zotero.org/users/"+ process.env.ZOTERO_USER_ID

/** 
 * Interfaces
 */
 interface Creator {
    lastName: string,
    firstName: string
}

interface ZoteroRecord {
    key: string,
    data: {
      title: string,
      creators: Creator[],
      itemType: string,
      dateAdded: Date,
      dateModified: Date,
      note: string,
      tags: string[],
      parentItem: string
    }
}

/**
 * Processing
 */ 
/**
 * 
 * @param {array of authors of entry} creators 
 * @returns string of authors separated by ;
 */
 const parseCreators = (creators: Creator[]) => {
    let creatorsString: string = ""
    if (creators.length != 0)
      creatorsString = creators[0].lastName + ", " + creators[0].firstName
    
    for (let j = 1; j < creators.length; j++){
      creatorsString+= "; " +creators[j].lastName + ", " + creators[j].firstName
    }
    return creatorsString
  } // TODO: adjust this function for eventual sorting by unique authors

/**
 * 
 * @param note 
 * @returns map of annotations
 */
 function parseAnnotations(note: string){
    //ignore first set of tags up to first entry
    let tags: string[] = note.split("<p>").slice(1)
    // clean up content
    let map: {
        blue: string[],
        green: string[],
        yellow: string[]
      } = {
       blue: [],
       green: [],
       yellow: []
      };
    for (let i = 0; i < tags.length; i++){
        let idx = tags[i].indexOf("background-color: ") + ("background-color: ".length) + 1 //for #
        let color = tags[i].substring(idx, idx+8)
        idx += 9 //jump forward to >
        let bodyIdx = tags[i].indexOf("“")
        let bodyEndIdx = tags[i].indexOf("”")
        let bodyText:string = tags[i].substring(bodyIdx+1, bodyEndIdx) // ignore weird quotation marks
        console.log(bodyText)
        console.log(color)
        if (color == "83ffed80") {
        map["blue"].push(bodyText)
        } else if (color == "00ff0080") {
        map["green"].push(bodyText)
        } else if (color == "ffff0080") {
        map["yellow"].push(bodyText)
        } 
    }
    return map
    }

function createRefField(data: ZoteroRecord) {
  return  {"fields": {
    "Key": data.key,
    "Title": data.data.title,
    "Authors": data.data.creators,
    "Type": data.data.itemType,
  }}
}
function createQuoteField(data: ZoteroRecord) {
  return  {"fields": {
    "Key": data.key,
    "Quote": data.data.note, // TODO make multiple fields
    "Color": data.data.note, // TODO adjust to mult fields above
  }}
}

/*** Zotero
 * Get recently uploaded or modified entries or children of entries
 */

/**
 * 
 * @param {number of entries to query} amt 
 */
 const getMostRecentPapersUpdated = 
  (amt: number): Promise<AxiosResponse<any, any>> => {
   try {
     let url = zoteroUser + "/items/top"
     return axios.get(url, {
         headers: {
             "Zotero-API-Key": zoteroKey,
         },
         params: {
             sort: "dateModified",
             limit: amt,
             format: "json",
             direction: "desc"
         }
     })
   } catch (error) {
     throw(error)
   }
 }

  /**
 * 
 * @param {number of entries to query} amt 
 */
   const getMostRecentPapersAdded = 
    (amt: number): Promise<AxiosResponse<any, any>> => {
     try {
       let url = zoteroUser + "/items/top"
       return axios.get(url, {
           headers: {
               "Zotero-API-Key": zoteroKey,
           },
           params: {
               sort: "dateAdded",
               limit: amt,
               format: "json",
               direction: "desc"
           }
       })
     } catch (error) {
        throw error
     }
   }

/**
 * 
 * @param key Zotero record
 * @returns promise of record's children
 */
const getItem = async(key: string) => {
  try {
    let url = zoteroUser + "/items/" + key + "/children"
    
    return await axios.get(url, {
        headers: {
            "Zotero-API-Key": zoteroKey,
        },
        params: {
            format: "json"
        }
    })
  } catch (error) {
    console.error(error)
  }
}

/*** Airtable
 * Write Zotero records to papers or quotes table(s)
 */

 const putReferences = 
 async (data: ZoteroRecord[]) => {
   try {
     let fields: any = [] // TODO figure this type out
    for (let i = 0; i < data.length; i++){
      fields.push(createRefField(data[i]))
    }
    // TODO Max 10 objects
    base('References').create(fields)
   } catch (error) {
     console.error(error)
   }
 }

/**
* 
* @param entry 
* @returns 
*/
 const putQuotes = async (data: ZoteroRecord[]) => {
  let fields: any = [] // TODO figure this type out
  // TODO Max 10 objects
  for (let i = 0; i < data.length; i++){
    // Don't process non-notes for quotes
    if (data[i].data.itemType != 'note') {
      continue
    }
    let mapQuotes = parseAnnotations(data[i].data.note);
    fields.push(createQuoteField(data[i]), mapQuotes)
  }
  base('Quotes').create([
    fields,
  ]);
  return true
}

(async () => {
    let resp = await getMostRecentPapersUpdated(2);
    //let data2 = await getMostRecentPapersAdded(2);
    /*for(let x of data) {
        console.log(x)
    }*/
    await putReferences(resp.data);
    // await putQuotes(resp.data);
})()